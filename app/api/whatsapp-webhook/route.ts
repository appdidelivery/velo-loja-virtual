import { NextResponse } from 'next/server';
import { collection, query, where, getDocs, addDoc } from 'firebase/firestore';
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
                
                // CORREÇÃO DEFINITIVA DO BRASIL: Adiciona o 9 de volta se a Meta tiver engolido
                let fromPhone = fromPhoneRaw;
                if (fromPhone.startsWith('55') && fromPhone.length === 12) {
                    fromPhone = fromPhone.slice(0, 4) + '9' + fromPhone.slice(4);
                }

                console.log(`💬 Mensagem processada do número: ${fromPhone} | Texto: ${messageText}`);

                // SPRINT 2: Verificação usando o número CORRIGIDO (com o 9)
                const tenantsRef = collection(db, 'tenants');
                const adminQuery = query(tenantsRef, where('adminPhones', 'array-contains', fromPhone));
                const querySnapshot = await getDocs(adminQuery);

                if (querySnapshot.empty) {
                    console.log(`🔒 Ignorado: O número ${fromPhone} não é admin.`);
                    return new NextResponse('EVENT_RECEIVED', { status: 200 });
                }

                const tenantDoc = querySnapshot.docs[0];
                const tenantId = tenantDoc.id;
                const tenantData = tenantDoc.data();

                console.log(`✅ Acesso Liberado para o Tenant: ${tenantData.businessName || tenantId}`);

                // SPRINT 3: IA Gemini
                const systemPrompt = `Você é a assistente de gestão da loja ${tenantData.businessName || 'Velo'}. Você só tem acesso aos dados do tenantId ${tenantId}. Seja direta, educada e curta. Se ele pedir para cadastrar um produto ou serviço, use a ferramenta disponível.`;

                const geminiPayload = {
                    system_instruction: { parts: [{ text: systemPrompt }] },
                    contents: [{ role: "user", parts: [{ text: messageText }] }],
                    tools: [{
                        function_declarations: [{
                            name: "cadastrar_produto",
                            description: "Cadastra um novo produto ou serviço no banco de dados da loja.",
                            parameters: {
                                type: "OBJECT",
                                properties: {
                                    name: { type: "STRING" },
                                    price: { type: "NUMBER" },
                                    category: { type: "STRING" }
                                },
                                required: ["name", "price"]
                            }
                        }]
                    }]
                };

                const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;
                const geminiResponse = await fetch(geminiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(geminiPayload) });
                const geminiData = await geminiResponse.json();
                
                const part = geminiData.candidates?.[0]?.content?.parts?.[0];
                let replyText = "Não consegui identificar a ação exata.";

                if (part?.functionCall?.name === 'cadastrar_produto') {
                    const args = part.functionCall.args;
                    await addDoc(collection(db, 'products'), {
                        name: args.name, price: Number(args.price), category: args.category || 'Serviços',
                        description: 'Cadastrado via IA', imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&q=80&w=600',
                        stock: 99, sku: `IA-${Date.now()}`, isActive: true, tenantId: tenantId
                    });
                    replyText = `✅ Cadastrado com sucesso! "${args.name}" por R$ ${args.price}.`;
                } else if (part?.text) {
                    replyText = part.text;
                }

                // SPRINT 4: Envio do WhatsApp com RASTREADOR DE ERRO DA META
                const metaToken = tenantData.metaApiToken;
                const metaPhoneId = tenantData.metaPhoneId;

                if (metaToken && metaPhoneId) {
                    const fbResponse = await fetch(`https://graph.facebook.com/v17.0/${metaPhoneId}/messages`, {
                        method: 'POST',
                        headers: { 'Authorization': `Bearer ${metaToken}`, 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            messaging_product: 'whatsapp',
                            to: fromPhoneRaw, // Enviamos de volta pro número cru (sem o 9) pq é assim que o FB exige a resposta!
                            type: 'text',
                            text: { body: replyText }
                        })
                    });
                    
                    const fbData = await fbResponse.json();
                    
                    // RASTREADOR DEFINITIVO: Se o Facebook bloquear, ele vai gritar o motivo no Log!
                    if (fbData.error) {
                        console.error('🚨 ERRO FATAL DO FACEBOOK AO ENVIAR MENSAGEM:', JSON.stringify(fbData.error));
                    } else {
                        console.log(`📤 Resposta REALMENTE enviada com sucesso para ${fromPhoneRaw}`);
                    }
                }
            }
        }

        return new NextResponse('EVENT_RECEIVED', { status: 200 });

    } catch (error) {
        console.error('❌ Erro Crítico:', error);
        return new NextResponse('EVENT_RECEIVED', { status: 200 });
    }
}