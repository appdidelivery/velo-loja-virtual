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

        // 1. Verificação de Segurança (Evento do WhatsApp)
        if (body.object !== 'whatsapp_business_account') {
            return new NextResponse('Not a WhatsApp event', { status: 404 });
        }

        const messages = body.entry?.[0]?.changes?.[0]?.value?.messages;

        if (messages && messages.length > 0) {
            const message = messages[0];
            const fromPhoneRaw = message.from; 
            const messageText = message.text?.body;

            if (fromPhoneRaw && messageText) {
                
                // 2. Busca Lojista no Firebase
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

                if (!tenantId || !tenantData) return new NextResponse('OK', { status: 200 });

                // 3. INJEÇÃO DE PERSONALIDADE (TONE OF VOICE)
                const agentName = tenantData.agentName || 'Velo Bot';
                const agentTone = tenantData.agentTone || 'profissional';
                const storeName = tenantData.businessName || 'loja';

                let toneInstruction = "aja de forma profissional e prestativa.";
                if (agentTone === 'descontraido') toneInstruction = "aja de forma descontraída, bem amigável e use emojis 😎.";
                if (agentTone === 'fofo') toneInstruction = "aja de forma fofa, muito entusiasmada e use emojis ✨💖.";
                if (agentTone === 'agressivo') toneInstruction = "aja com foco extremo em vendas, direto ao ponto e persuasivo 🚀.";

                const systemInstruction = `Você é o ${agentName}, assistente virtual da ${storeName}. Sua personalidade: ${toneInstruction}. Você recebe comandos do dono da loja e executa tarefas. Se ele pedir para cadastrar um produto ou serviço, acione a ferramenta cadastrar_produto. Se for apenas conversa (ex: Oi, Tudo bem), responda normalmente seguindo sua personalidade.`;

                // 4. DECLARAÇÃO DA FERRAMENTA (FUNCTION CALLING - GEMINI)
                const tools = [{
                    functionDeclarations: [{
                        name: "cadastrar_produto",
                        description: "Cadastra um novo produto ou serviço no banco de dados da loja.",
                        parameters: {
                            type: "OBJECT",
                            properties: {
                                nome: { type: "STRING", description: "Nome completo do produto" },
                                preco: { type: "NUMBER", description: "Preço numérico. Ex: 50.00" },
                                categoria: { type: "STRING", description: "Categoria do produto" },
                                descricao: { type: "STRING", description: "Descrição opcional" }
                            },
                            required: ["nome", "preco"]
                        }
                    }]
                }];

                // 🔥 CORREÇÃO DO NOME DO MODELO: Removido o "-latest" que estava causando o 404
                const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;

                // 5. PRIMEIRA CHAMADA GEMINI (Verifica a intenção)
                const geminiResponse = await fetch(geminiUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        systemInstruction: { parts: [{ text: systemInstruction }] },
                        contents: [{ role: "user", parts: [{ text: messageText }] }],
                        tools: tools
                    })
                });

                const geminiData = await geminiResponse.json();
                let replyText = "";

                if (geminiData.error) {
                    console.error("🚨 ERRO GOOGLE API:", geminiData.error);
                    replyText = `Erro na IA: ${geminiData.error.message}`;
                } else {
                    const firstPart = geminiData.candidates?.[0]?.content?.parts?.[0];
                    
                    // 6. INTERCEPTAÇÃO DA CHAMADA E EXECUÇÃO NO FIREBASE
                    if (firstPart && firstPart.functionCall) {
                        const functionName = firstPart.functionCall.name;
                        const args = firstPart.functionCall.args;

                        if (functionName === "cadastrar_produto") {
                            try {
                                // Execução cravada no Firebase (Com a injeção do TenantId correto)
                                const docRef = await addDoc(collection(db, 'products'), {
                                    name: args.nome,
                                    price: Number(args.preco),
                                    promotionalPrice: 0,
                                    category: args.categoria || 'Geral',
                                    description: args.descricao || 'Cadastrado via IA pelo WhatsApp',
                                    imageUrl: 'https://cdn-icons-png.flaticon.com/512/8636/8636813.png',
                                    stock: 999,
                                    sku: `IA-${Date.now()}`,
                                    isActive: true,
                                    tenantId: tenantId 
                                });

                                // FECHANDO O LOOP: Retorno do Resultado da Tool para o Gemini
                                // 🔥 JSON Limpo e cravado conforme a documentação oficial da v1beta
                                const funcResponse = await fetch(geminiUrl, {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                        systemInstruction: { parts: [{ text: systemInstruction }] },
                                        contents: [
                                            { role: "user", parts: [{ text: messageText }] },
                                            { role: "model", parts: [{ functionCall: firstPart.functionCall }] },
                                            { 
                                                role: "function", 
                                                parts: [{ 
                                                    functionResponse: { 
                                                        name: "cadastrar_produto", 
                                                        response: { 
                                                            status: "success", 
                                                            productId: docRef.id 
                                                        } 
                                                    } 
                                                }] 
                                            }
                                        ]
                                    })
                                });

                                const funcData = await funcResponse.json();
                                replyText = funcData.candidates?.[0]?.content?.parts?.[0]?.text || `Operação realizada! "${args.nome}" foi cadastrado com sucesso.`;

                            } catch (e) {
                                console.error("🚨 Erro Firebase IA:", e);
                                replyText = "Houve um problema técnico ao gravar o produto no banco de dados.";
                            }
                        }
                    } else {
                        // Resposta natural de chat
                        replyText = firstPart?.text || "Não consegui formular uma resposta, desculpe.";
                    }
                }

                // 7. DISPARO DA RESPOSTA (META API)
                if (tenantData.metaApiToken && tenantData.metaPhoneId) {
                    const metaRequest = await fetch(`https://graph.facebook.com/v19.0/${tenantData.metaPhoneId}/messages`, {
                        method: 'POST',
                        headers: { 
                            'Authorization': `Bearer ${tenantData.metaApiToken}`, 
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
                    
                    const metaResponseData = await metaRequest.json();
                    if (!metaRequest.ok) console.error("🚨 ERRO REJEIÇÃO META API:", metaResponseData);
                }
            }
        }
        return new NextResponse('OK', { status: 200 });
    } catch (error) {
        console.error("🚨 ERRO FATAL WEBHOOK:", error);
        return new NextResponse('OK', { status: 200 });
    }
}