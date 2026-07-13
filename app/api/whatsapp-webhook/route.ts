import { NextResponse } from 'next/server';
import { collection, getDocs, addDoc } from 'firebase/firestore';
import { db } from '../../../services/firebase';

const VERIFY_TOKEN = process.env.META_WEBHOOK_VERIFY_TOKEN || 'velo_webhook_secret';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    if (searchParams.get('hub.mode') === 'subscribe' && searchParams.get('hub.verify_token') === VERIFY_TOKEN) {
        return new NextResponse(searchParams.get('hub.challenge'), { status: 200 });
    }
    return new NextResponse('OK', { status: 200 });
}

export async function POST(request: Request) {
    try {
        const body = await request.json();

        if (body.object !== 'whatsapp_business_account') {
            return new NextResponse('Not a WhatsApp event', { status: 404 });
        }

        const messages = body.entry?.[0]?.changes?.[0]?.value?.messages;

        if (messages && messages.length > 0) {
            const message = messages[0];
            const fromPhoneRaw = message.from; 
            const messageText = message.text?.body;

            if (fromPhoneRaw && messageText) {
                
                const last8Incoming = fromPhoneRaw.slice(-8);
                const allTenantsSnap = await getDocs(collection(db, 'tenants'));
                
                let tenantId: string | null = null;
                let tenantData: any = null;
                let numeroOficialDoPainel = '';

                allTenantsSnap.forEach(doc => {
                    const data = doc.data();
                    const phones = data.adminPhones || [];
                    if (phones.some((p: string) => p.slice(-8) === last8Incoming)) {
                        tenantId = doc.id;
                        tenantData = data;
                        numeroOficialDoPainel = phones[0]; 
                    }
                });

                if (!tenantId || !tenantData) return new NextResponse('OK', { status: 200 });

                // PROMPT CRU E DIRETO
                const prompt = `Extraia os dados da mensagem. Responda APENAS com um JSON. Não escreva mais nada.
Se for cadastro: {"acao": "cadastrar", "nome": "nome", "preco": 150.00, "categoria": "Estética"}
Se não for: {"acao": "conversar", "resposta": "oi"}
Mensagem: "${messageText}"`;

                // USANDO O GEMINI-PRO (O mais antigo e estável, impossível dar erro 404)
                const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${process.env.GEMINI_API_KEY}`;

                const geminiResponse = await fetch(geminiUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
                });

                const geminiData = await geminiResponse.json();
                let replyText = "";

                if (geminiData.error) {
                    console.error("🚨 ERRO GOOGLE API:", geminiData.error);
                    replyText = `Erro no Google: ${geminiData.error.message}`;
                } else {
                    const responseText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "";
                    try {
                        const cleanedText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
                        const dados = JSON.parse(cleanedText);

                        if (dados.acao === 'cadastrar') {
                            await addDoc(collection(db, 'products'), {
                                name: dados.nome, price: Number(dados.preco), category: dados.categoria || 'Geral',
                                description: 'Cadastrado via IA', imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&q=80&w=600',
                                stock: 99, sku: `IA-${Date.now()}`, isActive: true, tenantId: tenantId
                            });
                            replyText = `✅ Sucesso! "${dados.nome}" (R$ ${dados.preco}) foi cadastrado no seu painel!`;
                        } else {
                            replyText = dados.resposta || "Comando não reconhecido.";
                        }
                    } catch (e) {
                        replyText = "A IA falhou ao gerar o formato correto.";
                    }
                }

                if (tenantData.metaApiToken && tenantData.metaPhoneId && numeroOficialDoPainel) {
                    await fetch(`https://graph.facebook.com/v17.0/${tenantData.metaPhoneId}/messages`, {
                        method: 'POST',
                        headers: { 'Authorization': `Bearer ${tenantData.metaApiToken}`, 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            messaging_product: 'whatsapp',
                            to: numeroOficialDoPainel,
                            type: 'text',
                            text: { body: replyText }
                        })
                    });
                }
            }
        }
        return new NextResponse('OK', { status: 200 });
    } catch (error) {
        return new NextResponse('OK', { status: 200 });
    }
}