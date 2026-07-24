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

               // 4. DEFINIÇÃO DE FERRAMENTAS E CHAMADA DA IA
                const tools = [];

                // Verifica se o lojista deu permissão para cadastrar produtos
                if (agentSkills.includes('cadastrar_produtos')) {
                    tools.push({
                        functionDeclarations: [{
                            name: "cadastrar_produto",
                            description: "Cadastra um novo produto no banco de dados da loja. Use esta função apenas quando o usuário pedir explicitamente para adicionar/criar um produto.",
                            parameters: {
                                type: "OBJECT",
                                properties: {
                                    nome: { type: "STRING", description: "Nome completo do produto" },
                                    preco: { type: "NUMBER", description: "Preço do produto em formato numérico. Ex: 50.00" },
                                    categoria: { type: "STRING", description: "Categoria do produto (Ex: Eletrônicos, Roupas, Estética, Geral)" }
                                },
                                required: ["nome", "preco"]
                            }
                        }]
                    });
                }

const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;
                
                const requestBody: any = {
                    contents: [{ role: "user", parts: [{ text: systemPrompt }] }]
                };

                // Só envia a ferramenta se o array não estiver vazio (evita erro da API do Google)
                if (tools.length > 0) {
                    requestBody.tools = tools;
                }

                const geminiResponse = await fetch(geminiUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(requestBody)
                });

                const geminiData = await geminiResponse.json();
                let replyText = "";

                if (geminiData.error) {
                    console.error("🚨 ERRO GOOGLE API:", geminiData.error);
                    replyText = `Erro na IA: ${geminiData.error.message}`;
                } else {
                    const firstPart = geminiData.candidates?.[0]?.content?.parts?.[0];
                    
                    // INTERCEPTAÇÃO: A IA decidiu usar alguma ferramenta?
                    if (firstPart && firstPart.functionCall) {
                        const functionName = firstPart.functionCall.name;
                        const args = firstPart.functionCall.args;

                        if (functionName === "cadastrar_produto") {
                            try {
                                const { addDoc, collection } = await import('firebase/firestore');
                                const docRef = await addDoc(collection(db, 'products'), {
                                    name: args.nome,
                                    price: Number(args.preco),
                                    category: args.categoria || 'Geral',
                                    description: 'Cadastrado pelo Agente IA (Master)',
                                    imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&q=80&w=600',
                                    stock: 99,
                                    sku: `IA-${Date.now()}`,
                                    isActive: true,
                                    tenantId: tenantId // Vinculando à loja do cliente
                                });

                                // AVISANDO A IA QUE O CADASTRO DEU CERTO
                                const funcResponse = await fetch(geminiUrl, {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                        contents: [
                                            { role: "user", parts: [{ text: systemPrompt }] },
                                            { role: "model", parts: [{ functionCall: firstPart.functionCall }] },
                                            { 
                                                role: "function", 
                                                parts: [{ 
                                                    functionResponse: { 
                                                        name: "cadastrar_produto", 
                                                        response: { name: "cadastrar_produto", content: { status: "success", productId: docRef.id } } 
                                                    } 
                                                }] 
                                            }
                                        ]
                                    })
                                });

                                const funcData = await funcResponse.json();
                                replyText = funcData.candidates?.[0]?.content?.parts?.[0]?.text || `Pronto! "${args.nome}" cadastrado com sucesso.`;

                            } catch (e) {
                                console.error("🚨 Erro Firebase IA:", e);
                                replyText = "Houve um erro no servidor ao tentar salvar o produto.";
                            }
                        }
                    } else {
                        // Se não for requisição de ferramenta, é conversa normal
                        replyText = firstPart?.text || "Desculpe, não entendi o que você quis dizer.";
                    }
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