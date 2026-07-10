import { NextResponse } from 'next/server';
import { collection, query, where, getDocs, addDoc } from 'firebase/firestore';
import { db } from '../../../services/firebase';

const VERIFY_TOKEN = process.env.META_WEBHOOK_VERIFY_TOKEN || 'velo_webhook_secret';

// Rota GET: Validação da Meta (Facebook)
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get('hub.mode');
    const token = searchParams.get('hub.verify_token');
    const challenge = searchParams.get('hub.challenge');

    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
        console.log('✅ Webhook verificado pela Meta com sucesso!');
        return new NextResponse(challenge, { status: 200 });
    }
    
    return new NextResponse('Forbidden', { status: 403 });
}

// Rota POST: Recebe as mensagens e aciona o Google Gemini
export async function POST(request: Request) {
    try {
        const body = await request.json();

        if (body.object !== 'whatsapp_business_account') {
            return new NextResponse('Not a WhatsApp event', { status: 404 });
        }

        const entry = body.entry?.[0];
        const changes = entry?.changes?.[0];
        const value = changes?.value;
        const messages = value?.messages;

        if (messages && messages.length > 0) {
            const message = messages[0];
            const fromPhone = message.from; 
            const messageText = message.text?.body;

            if (fromPhone && messageText) {
                console.log(`💬 Mensagem de ${fromPhone}: ${messageText}`);

                // SPRINT 2: Verificação de Segurança (Matriz de Permissões)
                const tenantsRef = collection(db, 'tenants');
                const adminQuery = query(tenantsRef, where('adminPhones', 'array-contains', fromPhone));
                const querySnapshot = await getDocs(adminQuery);

                if (querySnapshot.empty) {
                    console.log(`🔒 Ignorado: ${fromPhone} não é admin.`);
                    return new NextResponse('EVENT_RECEIVED', { status: 200 });
                }

                const tenantDoc = querySnapshot.docs[0];
                const tenantId = tenantDoc.id;
                const tenantData = tenantDoc.data();

                console.log(`✅ Acesso Liberado para o Tenant: ${tenantData.businessName || tenantId}. Acionando Gemini IA...`);

                // SPRINT 3: Motor da IA (Google Gemini 1.5 Flash)
                if (!process.env.GEMINI_API_KEY) {
                    console.error('❌ GEMINI_API_KEY não configurada no .env.local');
                    return new NextResponse('EVENT_RECEIVED', { status: 200 });
                }

                const systemPrompt = `Você é a assistente de gestão da loja ${tenantData.businessName || 'Velo'}. Você só tem acesso aos dados do tenantId ${tenantId}. Seja direta, educada e curta. Sua função primária é executar as tarefas de sistema solicitadas pelo administrador da loja. Se ele pedir para cadastrar um produto ou serviço, use a ferramenta disponível.`;

                // Montando o payload do Gemini com a Function "cadastrar_produto"
                const geminiPayload = {
                    system_instruction: {
                        parts: { text: systemPrompt }
                    },
                    contents: [{
                        role: "user",
                        parts: [{ text: messageText }]
                    }],
                    // SPRINT 4: A Mão da IA (Function Calling no Gemini)
                    tools: [{
                        function_declarations: [{
                            name: "cadastrar_produto",
                            description: "Cadastra um novo produto ou serviço no banco de dados da loja.",
                            parameters: {
                                type: "OBJECT",
                                properties: {
                                    name: { type: "STRING", description: "Nome do produto ou serviço (ex: Cílios Volume Russo)" },
                                    price: { type: "NUMBER", description: "Preço em reais, apenas números (ex: 150)" },
                                    category: { type: "STRING", description: "Categoria do produto/serviço (ex: Estética)" }
                                },
                                required: ["name", "price"]
                            }
                        }]
                    }]
                };

                // Disparando para a API REST do Gemini
                const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;
                
                const geminiResponse = await fetch(geminiUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(geminiPayload)
                });

                const geminiData = await geminiResponse.json();
                
                // Analisando a resposta do Gemini
                const candidate = geminiData.candidates?.[0];
                const part = candidate?.content?.parts?.[0];
                let replyText = "Entendido, mas ocorreu um erro ao processar sua solicitação.";

                if (part?.functionCall) {
                    const funcCall = part.functionCall;
                    
                    if (funcCall.name === 'cadastrar_produto') {
                        const args = funcCall.args;
                        
                        // SPRINT 4: Executando a gravação no Firebase para este Tenant específico
                        await addDoc(collection(db, 'products'), {
                            name: args.name,
                            price: Number(args.price),
                            category: args.category || 'Serviços',
                            description: 'Cadastrado rapidamente via Assistente IA (WhatsApp)',
                            imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&q=80&w=600',
                            stock: 99,
                            sku: `IA-${Date.now()}`,
                            isActive: true,
                            tenantId: tenantId // <-- GARANTIA DE ISOLAMENTO DE DADOS
                        });

                        replyText = `✅ Mágica feita! Acabei de cadastrar o serviço/produto "${args.name}" por R$ ${args.price}. Já está online na sua vitrine!`;
                    }
                } else if (part?.text) {
                    // Se não for um comando de cadastro, responde como conversa normal
                    replyText = part.text;
                }

                // SPRINT 4: Retornando a confirmação via WhatsApp usando a Meta API
                const metaToken = tenantData.metaApiToken;
                const metaPhoneId = tenantData.metaPhoneId;

                if (metaToken && metaPhoneId) {
                    await fetch(`https://graph.facebook.com/v17.0/${metaPhoneId}/messages`, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${metaToken}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            messaging_product: 'whatsapp',
                            to: fromPhone,
                            type: 'text',
                            text: { body: replyText }
                        })
                    });
                    console.log(`📤 Resposta enviada com sucesso para ${fromPhone}`);
                } else {
                    console.log('⚠️ IA (Gemini) processou com sucesso, mas os tokens da Meta não estão preenchidos no painel da loja para enviar a resposta ao WhatsApp.');
                }
            }
        }

        return new NextResponse('EVENT_RECEIVED', { status: 200 });

    } catch (error) {
        console.error('❌ Erro Crítico no Webhook:', error);
        return new NextResponse('EVENT_RECEIVED', { status: 200 });
    }
}