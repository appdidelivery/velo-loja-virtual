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

                // ATUALIZADO: Usando o gemini-1.5-flash (Obrigatório nas novas regras da API do Google para Function Calling)
                const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;

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
                    replyText = `Erro no Google: ${geminiData.error.message}`;
                } else {
                    const firstPart = geminiData.candidates?.[0]?.content?.parts?.[0];
                    
                    // 3. INTERCEPTAÇÃO DA CHAMADA (A IA DECIDIU USAR A FERRAMENTA?)
                    if (firstPart && firstPart.functionCall) {
                        const functionName = firstPart.functionCall.name;
                        const args = firstPart.functionCall.args;

                        if (functionName === "cadastrar_produto") {
                            try {
                                // 4. EXECUÇÃO NO FIREBASE VINCULANDO O TENANT ID (AÇÃO REAL)
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
                                // Devolvemos o sucesso para o modelo terminar o fluxo gerando a mensagem final
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
                                                        response: { name: "cadastrar_produto", content: { status: "success", productId: docRef.id, message: "Produto inserido no banco com sucesso." } } 
                                                    } 
                                                }] 
                                            }
                                        ]
                                    })
                                });

                                const funcData = await funcResponse.json();
                                // Captura a mensagem final natural gerada pela IA após o sucesso
                                replyText = funcData.candidates?.[0]?.content?.parts?.[0]?.text || `✅ Sucesso! "${args.nome}" (R$ ${args.preco}) foi cadastrado!`;

                            } catch (e) {
                                console.error("Erro Firebase IA:", e);
                                replyText = "Houve um problema técnico ao tentar gravar o produto no banco de dados.";
                            }
                        }
                    } else {
                        // Se não for requisição de ferramenta, é apenas texto normal (conversa)
                        replyText = firstPart?.text || "Não consegui formular uma resposta, desculpe.";
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