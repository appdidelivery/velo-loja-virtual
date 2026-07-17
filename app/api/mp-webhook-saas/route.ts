import { NextResponse } from 'next/server';
import { db } from '@/services/firebase'; 
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';

export async function POST(request: Request) {
  try {
    const url = new URL(request.url);
    const topic = url.searchParams.get('topic') || url.searchParams.get('type');
    const paymentId = url.searchParams.get('data.id') || url.searchParams.get('id');

    let body: any = {};
    try {
      body = await request.json();
    } catch (e) {
      // Ignora erro se o body vier vazio
    }

    const finalTopic = topic || body.type || body.topic;
    const finalPaymentId = paymentId || body.data?.id;

    // Apenas se for notificação de pagamento
    if (finalTopic === 'payment' && finalPaymentId) {
      const accessToken = process.env.MP_ACCESS_TOKEN;
      
      if (!accessToken) return NextResponse.json({ error: 'Token não configurado' }, { status: 500 });

      // Pergunta pro MP o status da fatura
      const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${finalPaymentId}`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      
      const paymentData = await mpResponse.json();

      // Se pagou, libera a loja
      if (paymentData.status === 'approved') {
        const tenantId = paymentData.external_reference; 

        if (tenantId) {
          const tenantRef = doc(db, 'tenants', tenantId);
          await updateDoc(tenantRef, {
            billingStatus: 'pago',
            lastPaymentId: finalPaymentId,
            lastPaymentDate: serverTimestamp()
          });
          console.log(`✅ Fatura Paga! Loja ${tenantId} liberada.`);
        }
      }
    }

    // Sempre retorna 200 pro MP parar de enviar a notificação
    return NextResponse.json({ success: true }, { status: 200 });

  } catch (error) {
    console.error("Erro no Webhook da Plataforma:", error);
    return NextResponse.json({ error: 'Falha interna' }, { status: 500 });
  }
}