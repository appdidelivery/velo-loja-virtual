import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { tenantId, planName, amount } = body;

    if (!tenantId || !amount) {
      return NextResponse.json({ error: 'Dados insuficientes.' }, { status: 400 });
    }

    // Seu token original da plataforma Velo Loja
    const accessToken = process.env.MP_MASTER_ACCESS_TOKEN; 
    
    if (!accessToken) {
      return NextResponse.json({ error: 'Credenciais não configuradas.' }, { status: 500 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

    const preferenceData = {
      items: [
        {
          id: `plano_${planName.toLowerCase().replace(/\s+/g, '_')}`,
          title: `Assinatura Velo Loja - ${planName}`,
          description: 'Acesso às ferramentas da plataforma',
          quantity: 1,
          currency_id: 'BRL',
          unit_price: Number(amount)
        }
      ],
      external_reference: tenantId, 
      
      // Aponta para o webhook novo e exclusivo da plataforma
      notification_url: `${baseUrl}/api/mp-webhook-saas`,

      back_urls: {
        success: `${baseUrl}/admin?payment_status=success`,
        failure: `${baseUrl}/admin?payment_status=failure`,
        pending: `${baseUrl}/admin?payment_status=pending`,
      },
      auto_return: "approved",
      payment_methods: {
        excluded_payment_types: [{ id: "ticket" }],
        installments: 12
      }
    };

    const mpResponse = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(preferenceData)
    });

    const mpData = await mpResponse.json();

    if (mpResponse.ok && mpData.init_point) {
      return NextResponse.json({ url: mpData.init_point });
    } else {
      return NextResponse.json({ error: 'A API do Mercado Pago recusou a transação.' }, { status: 500 });
    }

  } catch (error) {
    return NextResponse.json({ error: 'Falha de comunicação.' }, { status: 500 });
  }
}