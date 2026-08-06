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

                // 3. INJEÇÃO DE PERSONALIDADE (Sem usar SystemInstruction para não bugar o Google)
                const agentName = tenantData.agentName || 'Velo Bot';
                const agentTone = tenantData.agentTone || 'profissional';

                let toneInstruction = "aja de forma profissional e prestativa.";
                if (agentTone === 'descontraido') toneInstruction = "aja de forma descontraída, bem amigável e use emojis 😎.";
                if (agentTone === 'fofo') toneInstruction = "aja de forma fofa, muito entusiasmada e use emojis ✨💖.";
                if (agentTone === 'agressivo') toneInstruction = "aja com foco extremo em vendas, direto ao ponto e persuasivo 🚀.";

                // O Prompt embute a personalidade no papel do usuário
                const prompt = `Você é o ${agentName}, assistente virtual da loja. Sua personalidade: ${toneInstruction}
O dono da loja enviou: "${messageText}".
Aja naturalmente. Se ele pediu para cadastrar ou criar um produto, acione a ferramenta cadastrar_produto. Se for só conversa, responda amigavelmente.`;

                // 4. DECLARAÇÃO DA FERRAMENTA (FUNCTION CALLING)
                const tools = [{
                    functionDeclarations: [{
                        name: "cadastrar_produto",
                        description: "Cadastra um novo produto no banco de dados da loja.",
                        parameters: {
                            type: "OBJECT",
                            properties: {
                                nome: { type: "STRING", description: "Nome completo do produto" },
                                preco: { type: "NUMBER", description: "Preço do produto em formato numérico. Ex: 50.00" },
                                categoria: { type: "STRING", description: "Categoria do produto" },
                                descricao: { type: "STRING", description: "Descrição opcional" }
                            },
                            required: ["nome", "preco"]
                        }
                    }]
                }];

                const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;

                // 5. PRIMEIRA CHAMADA GEMINI
                const geminiResponse = await fetch(geminiUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        contents: [{ role: "user", parts: [{ text: prompt }] }],
                        tools: tools
                    })
                });

                const geminiData = await geminiResponse.json();
                let replyText = "";

                if (geminiData.error) {
                    console.error("🚨 ERRO GOOGLE API PRIMEIRA CHAMADA:", geminiData.error);
                    replyText = `Erro na IA: ${geminiData.error.message}`;
                } else {
                    const firstPart = geminiData.candidates?.[0]?.content?.parts?.[0];
                    
                    // 6. INTERCEPTAÇÃO DA FERRAMENTA (IA DECIDIU CADASTRAR)
                    if (firstPart && firstPart.functionCall) {
                        const functionName = firstPart.functionCall.name;
                        const args = firstPart.functionCall.args;

                        if (functionName === "cadastrar_produto") {
                            try {
                                // GRAVA NO FIREBASE
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

                                // 7. SEGUNDA CHAMADA (RETORNO PARA A IA)
                                // Usando EXATAMENTE a estrutura de resposta que você usava antes e que o Google aceita!
                                const funcResponse = await fetch(geminiUrl, {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                        contents: [
                                            { role: "user", parts: [{ text: prompt }] },
                                            { role: "model", parts: [{ functionCall: firstPart.functionCall }] },
                                            { 
                                                role: "function", 
                                                parts: [{ 
                                                    functionResponse: { 
                                                        name: "cadastrar_produto", 
                                                        response: { 
                                                            name: "cadastrar_produto", 
                                                            content: { status: "success", productId: docRef.id, message: "Produto salvo com sucesso." } 
                                                        } 
                                                    } 
                                                }] 
                                            }
                                        ]
                                    })
                                });

                                const funcData = await funcResponse.json();
                                
                                if (funcData.error) {
                                    console.error("🚨 ERRO GOOGLE API SEGUNDA CHAMADA:", funcData.error);
                                    replyText = `Operação realizada no banco, mas a IA falhou ao gerar a resposta. Produto: ${args.nome}`;
                                } else {
                                    replyText = funcData.candidates?.[0]?.content?.parts?.[0]?.text || `✅ Sucesso! "${args.nome}" foi cadastrado!`;
                                }

                            } catch (e) {
                                console.error("🚨 Erro Firebase IA:", e);
                                replyText = "Houve um problema técnico ao gravar o produto no banco de dados.";
                            }
                        }
                    } else {
                        // Resposta normal de chat (Ex: "Oi", "Tudo bem?")
                        replyText = firstPart?.text || "Não consegui formular uma resposta, desculpe.";
                    }
                }

                // 8. DISPARO DA RESPOSTA (META API)
                if (tenantData.metaApiToken && tenantData.metaPhoneId) {
                    const metaRequest = await fetch(`https://graph.facebook.com/v19.0/${tenantData.metaPhoneId}/messages`, {
                        method: 'POST',
                        headers: { 'Authorization': `Bearer ${tenantData.metaApiToken}`, 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            messaging_product: 'whatsapp',
                            recipient_type: 'individual',
                            to: fromPhoneRaw, 
                            type: 'text',
                            text: { body: replyText }
                        })
                    });
                    
                    if (!metaRequest.ok) {
                        const metaResponseData = await metaRequest.json();
                        console.error("🚨 ERRO REJEIÇÃO META API:", metaResponseData);
                    }
                }
            }
        }
        return new NextResponse('OK', { status: 200 });
    } catch (error) {
        console.error("🚨 ERRO FATAL WEBHOOK:", error);
        return new NextResponse('OK', { status: 200 });
    }
}