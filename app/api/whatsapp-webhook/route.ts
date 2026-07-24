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
            const fromPhoneRaw = message.from; // Pega o número exato que a Meta usou
            const messageText = message.text?.body;

            if (fromPhoneRaw && messageText) {
                
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

               // 1. DECLARAÇÃO DA FERRAMENTA (FUNCTION CALLING)
                const tools = [{
                    functionDeclarations: [{
                        name: "cadastrar_produto",
                        description: "Cadastra um novo produto no banco de dados da loja. Use esta função apenas quando o usuário solicitar a criação/adição de um produto ou serviço.",
                        parameters: {
                            type: "OBJECT",
                            properties: {
                                nome: { type: "STRING", description: "Nome completo do produto" },
                                preco: { type: "NUMBER", description: "Preço do produto em formato numérico. Ex: 50.00" },
                                categoria: { type: "STRING", description: "Categoria do produto (Ex: Eletrônicos, Roupas, Estética, Geral)" },
                                descricao: { type: "STRING", description: "Descrição opcional do produto ou serviço" }
                            },
                            required: ["nome", "preco"]
                        }
                    }]
                }];

                const prompt = `Você é o assistente virtual da loja. O usuário enviou: "${messageText}".
Aja naturalmente. Se ele pediu para cadastrar ou criar um produto, acione a ferramenta cadastrar_produto.
Se for apenas conversa, responda de forma prestativa.`;

                // ATUALIZADO: Usando o gemini-1.5-flash OBRIGATÓRIO
const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${process.env.GEMINI_API_KEY}`;

                // 2. PRIMEIRA CHAMADA (ENVIANDO O CONTEXTO E A FERRAMENTA)
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
                    console.error("🚨 ERRO GOOGLE API:", geminiData.error);
                    replyText = `Erro na IA: ${geminiData.error.message}`;
                } else {
                    const firstPart = geminiData.candidates?.[0]?.content?.parts?.[0];
                    
                    // 3. INTERCEPTAÇÃO DA CHAMADA (A IA DECIDIU USAR A FERRAMENTA?)
                    if (firstPart && firstPart.functionCall) {
                        const functionName = firstPart.functionCall.name;
                        const args = firstPart.functionCall.args;

                        if (functionName === "cadastrar_produto") {
                            try {
                                // 4. EXECUÇÃO NO FIREBASE
                                const docRef = await addDoc(collection(db, 'products'), {
                                    name: args.nome,
                                    price: Number(args.preco),
                                    category: args.categoria || 'Geral',
                                    description: args.descricao || 'Cadastrado via IA pelo WhatsApp',
                                    imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&q=80&w=600',
                                    stock: 99,
                                    sku: `IA-${Date.now()}`,
                                    isActive: true,
                                    tenantId: tenantId // Vinculando à loja correta
                                });

                                // 5. RETORNO PARA A IA (FECHANDO O LOOP)
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
                                                        response: { name: "cadastrar_produto", content: { status: "success", productId: docRef.id, message: "Produto salvo com sucesso." } } 
                                                    } 
                                                }] 
                                            }
                                        ]
                                    })
                                });

                                const funcData = await funcResponse.json();
                                replyText = funcData.candidates?.[0]?.content?.parts?.[0]?.text || `✅ Sucesso! "${args.nome}" (R$ ${args.preco}) foi cadastrado!`;

                            } catch (e) {
                                console.error("🚨 Erro Firebase IA:", e);
                                replyText = "Houve um problema técnico ao tentar gravar o produto no banco de dados.";
                            }
                        }
                    } else {
                        // Resposta normal de chat
                        replyText = firstPart?.text || "Não consegui formular uma resposta, desculpe.";
                    }
                }

                // 6. ENVIO PARA O WHATSAPP (CORRIGIDO)
                if (tenantData.metaApiToken && tenantData.metaPhoneId) {
                    const metaRequest = await fetch(`https://graph.facebook.com/v19.0/${tenantData.metaPhoneId}/messages`, {
                        method: 'POST',
                        headers: { 'Authorization': `Bearer ${tenantData.metaApiToken}`, 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            messaging_product: 'whatsapp',
                            recipient_type: 'individual',
                            to: fromPhoneRaw, // ATENÇÃO: Agora devolve EXATAMENTE para o número de onde a mensagem veio
                            type: 'text',
                            text: { body: replyText }
                        })
                    });
                    
                    const metaResponseData = await metaRequest.json();
                    
                    if (!metaRequest.ok) {
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