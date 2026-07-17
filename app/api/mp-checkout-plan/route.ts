import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { tenantId, planName, amount } = body;

    // 1. Validação básica de segurança
    if (!tenantId || !amount) {
      return NextResponse.json({ error: 'Dados insuficientes enviados pelo painel.' }, { status: 400 });
    }

    // 2. Token da Sua Conta Master (Plataforma Velo)
    const accessToken = process.env.MP_MASTER_ACCESS_TOKEN; 
    
    if (!accessToken) {
      console.error("ERRO: MP_MASTER_ACCESS_TOKEN não configurado no .env.local");
      return NextResponse.json({ error: 'Erro interno: Credenciais de pagamento não configuradas.' }, { status: 500 });
    }

    // 3. Descobre a URL do seu site dinamicamente (Localhost ou Produção)
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

    // 4. Monta a "Preference" (Intenção de Compra) para o Mercado Pago
    const preferenceData = {
      items: [
        {
          id: `plano_${planName.toLowerCase().replace(/\s+/g, '_')}`,
          title: `Assinatura Velo Loja - ${planName}`,
          description: 'Acesso às ferramentas da plataforma SaaS',
          quantity: 1,
          currency_id: 'BRL',
          unit_price: Number(amount)
        }
      ],
      // 🔥 O SEGREDO: Enviamos o ID da loja aqui. Quando o cliente pagar, 
      // o Mercado Pago vai devolver esse ID no Webhook para sabermos quem pagou!
      external_reference: tenantId, 
      
      // URLs de retorno após o cliente passar o cartão/PIX
      back_urls: {
        success: `${baseUrl}/admin?payment_status=success`,
        failure: `${baseUrl}/admin?payment_status=failure`,
        pending: `${baseUrl}/admin?payment_status=pending`,
      },
      auto_return: "approved",
      
      // Opcional: Remover boleto para ativação ser apenas na hora (Pix ou Cartão)
      payment_methods: {
        excluded_payment_types: [
          { id: "ticket" } // Boleto removido
        ],
        installments: 12 // Permite parcelamento no cartão
      }
    };

    // 5. Envia a requisição para os servidores do Mercado Pago
    const mpResponse = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(preferenceData)
    });

    const mpData = await mpResponse.json();

    // 6. Retorna a URL do Checkout de volta para o Painel do Lojista
    if (mpResponse.ok && mpData.init_point) {
      return NextResponse.json({ url: mpData.init_point });
    } else {
      console.error("Erro retornado pelo Mercado Pago:", mpData);
      return NextResponse.json({ error: 'A API do Mercado Pago recusou a transação.' }, { status: 500 });
    }

  } catch (error) {
    console.error("Erro Fatal na API de Checkout:", error);
    return NextResponse.json({ error: 'Falha de comunicação com o servidor de pagamentos.' }, { status: 500 });
  }
}