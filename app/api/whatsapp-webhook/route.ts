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
    console.log('--- 🚀 INICIANDO DIAGNÓSTICO PROFUNDO ---');
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
                console.log(`📱 1. WhatsApp enviou: [${fromPhoneRaw}] | Texto: "${messageText}"`);

                const last8Incoming = fromPhoneRaw.slice(-8);
                console.log('🔍 2. Vasculhando o Banco de Dados...');
                
                const allTenantsSnap = await getDocs(collection(db, 'tenants'));
                
                let tenantId: string | null = null;
                let tenantData: any = null;

                allTenantsSnap.forEach(doc => {
                    const data = doc.data();
                    const phones = data.adminPhones || [];
                    const matchEncontrado = phones.some((p: string) => p.slice(-8) === last8Incoming);
                    if (matchEncontrado) {
                        tenantId = doc.id;
                        tenantData = data;
                    }
                });

                if (!tenantId || !tenantData) {
                    console.error(`🚨 ERRO: Nenhuma loja tem um telefone com final [${last8Incoming}].`);
                    return new NextResponse('EVENT_RECEIVED', { status: 200 });
                }

                console.log(`✅ 3. Loja Encontrada! ID: ${tenantId}. Acionando Gemini...`);

                // PROMPT REFORÇADO: Obrigando a IA a usar a ferramenta de cadastro
                const systemPrompt = `Você é a assistente de gestão da loja ${tenantData.businessName || 'Velo'}. Você só tem acesso aos dados do tenantId ${tenantId}. REGRA ABSOLUTA: Se o usuário pedir para "cadastrar", "adicionar" ou "criar" um produto ou serviço, VOCÊ É OBRIGADA a usar a ferramenta 'cadastrar_produto'. NUNCA responda apenas em texto quando pedirem um cadastro.`;

                const geminiPayload = {
                    system_instruction: { parts: [{ text: systemPrompt }] },
                    contents: [{ role: "user", parts: [{ text: messageText }] }],
                    tools: [{
                        function_declarations: [{
                            name: "cadastrar_produto",
                            description: "Executa o cadastro de um novo produto ou serviço no sistema.",
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
                let replyText = "Entendido, mas não identifiquei os dados para cadastro (Nome e Preço).";

                if (part?.functionCall?.name === 'cadastrar_produto') {
                    const args = part.functionCall.args;
                    await addDoc(collection(db, 'products'), {
                        name: args.name, price: Number(args.price), category: args.category || 'Serviços',
                        description: 'Cadastrado automaticamente via Assistente IA', imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&q=80&w=600',
                        stock: 99, sku: `IA-${Date.now()}`, isActive: true, tenantId: tenantId
                    });
                    replyText = `✅ Sucesso! Acabei de cadastrar "${args.name}" por R$ ${args.price}. Já está na sua vitrine!`;
                    console.log(`✅ 4. IA processou e cadastrou o produto!`);
                } else if (part?.text) {
                    replyText = part.text;
                }

                // SOLUÇÃO DO PARADOXO DO NONO DÍGITO
                let recipientPhone = fromPhoneRaw;
                if (recipientPhone.startsWith('55') && recipientPhone.length === 12) {
                    recipientPhone = recipientPhone.slice(0, 4) + '9' + recipientPhone.slice(4);
                }

                console.log(`📤 5. Devolvendo resposta para a Meta no número: ${recipientPhone}`);
                
                const metaToken = tenantData.metaApiToken;
                const metaPhoneId = tenantData.metaPhoneId;

                if (metaToken && metaPhoneId) {
                    const fbResponse = await fetch(`https://graph.facebook.com/v17.0/${metaPhoneId}/messages`, {
                        method: 'POST',
                        headers: { 'Authorization': `Bearer ${metaToken}`, 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            messaging_product: 'whatsapp',
                            to: recipientPhone, // <-- AGORA VAI COM O DÍGITO 9 PARA A META ACEITAR!
                            type: 'text',
                            text: { body: replyText }
                        })
                    });
                    
                    const fbData = await fbResponse.json();
                    
                    if (fbData.error) {
                        console.error('🚨 ERRO DA META:', JSON.stringify(fbData.error));
                    } else {
                        console.log(`🚀 SUCESSO ABSOLUTO! Mensagem entregue no celular!`);
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