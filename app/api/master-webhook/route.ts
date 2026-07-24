import { NextResponse } from 'next/server';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../../services/firebase';

// Token para validação do Webhook na Meta
const VERIFY_TOKEN = process.env.META_WEBHOOK_VERIFY_TOKEN || 'velo_webhook_secret';

// Credenciais do NÚMERO MASTER DA VELO LOJA (Que conversa com os lojistas)
const MASTER_PHONE_ID = process.env.MASTER_META_PHONE_ID; 
const MASTER_API_TOKEN = process.env.MASTER_META_TOKEN;

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
                // 1. Identificar o Lojista através do Telefone
                const last8Incoming = fromPhoneRaw.slice(-8);
                const allTenantsSnap = await getDocs(collection(db, 'tenants'));
                
                let tenantId: string | null = null;
                let tenantData: any = null;

                allTenantsSnap.forEach(doc => {
                    const data = doc.data();
                    const phones = data.adminPhones || [];
                    if (phones.some((p: string) => p.slice(-8) === last8Incoming)) {
                        tenantId = doc.id;
                        tenantData = data;
                    }
                });

                // Se o telefone não for de nenhum admin de loja, ignoramos.
                if (!tenantId || !tenantData) return new NextResponse('OK', { status: 200 });

                // 2. Extração das Regras Exclusivas deste Lojista
                const agentName = tenantData.agentName || 'Velo Bot';
                const agentTone = tenantData.agentTone || 'profissional';
                const agentSkills = tenantData.agentSkills || [];

                // 3. System Prompt Dinâmico Customizado para este Lojista
                const systemPrompt = `Você é o ${agentName}, assistente virtual exclusivo do dono da loja '${tenantData.businessName}'.
O tom de voz que você deve usar nas respostas é: ${agentTone}.
Suas habilidades ativadas são: ${agentSkills.join(', ')}.
O usuário acabou de mandar a seguinte mensagem pelo WhatsApp: "${messageText}".
Atue como um assessor executivo brilhante. Se ele pedir uma ação que você não tem habilidade para fazer, informe educadamente.`;

                // 4. Chamada para a IA (Usando Gemini 1.5 Flash)
                const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;

                const geminiResponse = await fetch(geminiUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        contents: [{ role: "user", parts: [{ text: systemPrompt }] }]
                        // NOTA DO ARQUITETO: O Tool Calling (Function Calling) entrará no Sprint 3 aqui.
                    })
                });

                const geminiData = await geminiResponse.json();
                let replyText = "";

                if (geminiData.error) {
                    replyText = `Erro na IA: ${geminiData.error.message}`;
                } else {
                    replyText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "Não consegui processar, chefe.";
                }

                // 5. Devolve a resposta usando o NÚMERO MASTER DA VELO LOJA
                if (MASTER_API_TOKEN && MASTER_PHONE_ID) {
                    await fetch(`https://graph.facebook.com/v19.0/${MASTER_PHONE_ID}/messages`, {
                        method: 'POST',
                        headers: { 
                            'Authorization': `Bearer ${MASTER_API_TOKEN}`, 
                            'Content-Type': 'application/json' 
                        },
                        body: JSON.stringify({
                            messaging_product: 'whatsapp',
                            recipient_type: 'individual',
                            to: fromPhoneRaw, 
                            type: 'text',
                            text: { body: replyText }
                        })
                    });
                } else {
                    console.error("🚨 ERRO: Tokens do MASTER BOT não estão configurados no arquivo .env");
                }
            }
        }
        return new NextResponse('OK', { status: 200 });
    } catch (error) {
        console.error("🚨 ERRO FATAL MASTER WEBHOOK:", error);
        return new NextResponse('OK', { status: 200 });
    }
}