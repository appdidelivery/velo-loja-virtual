import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { toPhone, text, phoneNumberId, apiToken } = body;

    if (!toPhone || !text || !phoneNumberId || !apiToken) {
      return NextResponse.json({ error: 'Faltam dados para o envio do WhatsApp.' }, { status: 400 });
    }

    // 1. Limpa o telefone e garante o código 55 (Brasil)
    let cleanPhone = String(toPhone).replace(/\D/g, '');
    if (cleanPhone.length >= 10 && !cleanPhone.startsWith('55')) {
        cleanPhone = `55${cleanPhone}`;
    }

    // 2. Prepara o Payload da Meta (Texto Simples para o Chat/PDV)
    const payload = {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: cleanPhone,
        type: "text",
        text: { body: text }
    };

    // 3. Dispara para a Meta Graph API
    const response = await fetch(`https://graph.facebook.com/v19.0/${phoneNumberId}/messages`, {
        method: 'POST',
        headers: { 
            'Authorization': `Bearer ${apiToken}`, 
            'Content-Type': 'application/json' 
        },
        body: JSON.stringify(payload)
    });
    
    const data = await response.json();

    if (!response.ok) {
        console.error("Falha Meta API:", data);
        return NextResponse.json({ error: data.error?.message || 'Falha ao enviar mensagem.' }, { status: 400 });
    }

    return NextResponse.json({ success: true, messageId: data.messages?.[0]?.id });

  } catch (error: any) {
    console.error("Erro Fatal WhatsApp API:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}