import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { storeId, orderId, transaction_amount, payment_method_id, payer, accessToken } = body;

    if (!storeId || !payment_method_id || !payer || !accessToken) {
      return NextResponse.json({ error: 'Faltam dados ou Token do Mercado Pago.' }, { status: 400 });
    }

    // 1. Prepara o Payload para a API do Mercado Pago
    let firstName = payer.first_name || 'Cliente';
    let lastName = payer.last_name || 'Velo';
    
    // Tratamento caso o nome venha inteiro
    if (payer.first_name && payer.first_name.includes(' ')) {
        const parts = payer.first_name.split(' ');
        firstName = parts[0];
        lastName = parts.slice(1).join(' ');
    }

    const paymentPayload = {
      transaction_amount: Number(Number(transaction_amount).toFixed(2)),
      description: `Pedido #${String(orderId).slice(-5).toUpperCase()}`,
      payment_method_id: payment_method_id,
      payer: {
        email: payer.email && payer.email.includes('@') ? payer.email : `cliente_${orderId.slice(-6)}@velodelivery.com.br`,
        first_name: firstName,
        last_name: lastName
      },
      external_reference: orderId,
    };

    // 2. Chama a API Oficial do Mercado Pago
    const mpResponse = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': `velo_${orderId}_${Date.now()}` // Evita cobrança duplicada
      },
      body: JSON.stringify(paymentPayload)
    });

    const data = await mpResponse.json();

    if (!mpResponse.ok) {
      console.error("Erro MP:", data);
      return NextResponse.json({ error: "O Mercado Pago recusou a transação.", details: data }, { status: 400 });
    }

    // 3. Se for PIX, devolve o QR Code e o Copia e Cola
    if (payment_method_id === 'pix') {
      if (!data.point_of_interaction?.transaction_data?.qr_code) {
        return NextResponse.json({ error: "Falha ao gerar a chave PIX no MP." }, { status: 400 });
      }

      return NextResponse.json({ 
        success: true, 
        paymentId: data.id, 
        pixCopiaECola: data.point_of_interaction.transaction_data.qr_code,
        pixQrCodeUrl: `data:image/jpeg;base64,${data.point_of_interaction.transaction_data.qr_code_base64}`
      });
    }

    // Se for cartão, devolve o sucesso
    return NextResponse.json({ success: true, paymentId: data.id, status: data.status });

  } catch (error: any) {
    console.error("Erro Fatal MP Transparente:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}