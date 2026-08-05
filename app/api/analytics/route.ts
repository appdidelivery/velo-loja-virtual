import { NextResponse } from 'next/server';
import { BetaAnalyticsDataClient } from '@google-analytics/data';

// --- SEGURANÇA E ARQUITETURA SENIOR ---
// Este endpoint centraliza as requisições GA4. Ele usa uma Service Account
// da Velo para ler a propriedade Master, filtrando os dados apenas da loja solicitada.

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { tenantId } = body;

    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant ID ausente' }, { status: 400 });
    }

    const propertyId = process.env.GA_PROPERTY_ID;
    const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
    const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');

    // MODO FALLBACK: Se o lojista/desenvolvedor não configurou o .env, retorna dados de fallback
    if (!propertyId || !clientEmail || !privateKey) {
      console.warn("⚠️ [GA4] Chaves não configuradas no .env. Retornando Fallback seguro.");
      return NextResponse.json({
        success: true,
        mode: 'fallback',
        data: {
          engagementTime: '01m 22s',
          ctr: '4.8%',
          bounceRate: '48.5%',
          sources: [
            { name: 'Instagram', value: '55%' },
            { name: 'Direct', value: '25%' },
            { name: 'Google Organic', value: '20%' }
          ]
        }
      });
    }

    // MODO REAL: Conexão com Google Analytics 4
    const analyticsDataClient = new BetaAnalyticsDataClient({
      credentials: {
        client_email: clientEmail,
        private_key: privateKey,
      },
    });

    // Puxando dados dos últimos 30 dias filtrados pelo /tenantId (A mágica do Multi-Tenant)
    const [response] = await analyticsDataClient.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
      dimensions: [{ name: 'sessionDefaultChannelGroup' }],
      metrics: [
        { name: 'screenPageViews' },
        { name: 'averageSessionDuration' },
        { name: 'bounceRate' }
      ],
      dimensionFilter: {
        filter: {
          fieldName: 'pagePath',
          stringFilter: {
            matchType: 'BEGINS_WITH',
            value: `/${tenantId}`
          }
        }
      }
    });

    // Processando resposta do GA4
    let totalViews = 0;
    let avgDuration = 0;
    let avgBounceRate = 0;
    let count = 0;

    response.rows?.forEach(row => {
      if (row.metricValues) {
        totalViews += Number(row.metricValues[0].value);
        avgDuration += Number(row.metricValues[1].value);
        avgBounceRate += Number(row.metricValues[2].value);
        count++;
      }
    });

    const finalDuration = count > 0 ? (avgDuration / count) : 0;
    const finalBounceRate = count > 0 ? (avgBounceRate / count) : 0;

    // Formatação de Tempo (Ex: 01m 45s)
    const minutes = Math.floor(finalDuration / 60);
    const seconds = Math.floor(finalDuration % 60);
    const timeFormatted = `${minutes.toString().padStart(2, '0')}m ${seconds.toString().padStart(2, '0')}s`;

    return NextResponse.json({
      success: true,
      mode: 'real',
      data: {
        engagementTime: timeFormatted,
        ctr: 'Calculando...', // O CTR real exige cruzamento com eventos de ecommerce customizados
        bounceRate: `${(finalBounceRate * 100).toFixed(1)}%`,
        sources: response.rows?.map(r => ({
          name: r.dimensionValues?.[0].value || 'Desconhecido',
          value: r.metricValues?.[0].value || '0'
        })) || []
      }
    });

  } catch (error: any) {
    console.error("Erro interno GA4:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}