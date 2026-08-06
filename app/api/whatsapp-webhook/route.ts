import { NextResponse } from 'next/server';
import { collection, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
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
                
                // 2. Busca a Loja e as Configurações no Firebase
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

                // 3. Monta o Prompt e a Personalidade
                const agentName = tenantData.agentName || 'Velo Bot';
                const agentTone = tenantData.agentTone || 'profissional';

                let toneInstruction = "Aja de forma profissional e direta.";
                if (agentTone === 'descontraido') toneInstruction = "Aja de forma descontraída, amigável e use emojis 😎.";
                if (agentTone === 'fofo') toneInstruction = "Aja de forma fofa, entusiasmada e use emojis ✨💖.";
                if (agentTone === 'agressivo') toneInstruction = "Aja com foco em vendas, persuasivo e use emojis 🚀.";

                const prompt = `Você é o ${agentName}, assistente da loja. ${toneInstruction}
Mensagem do dono da loja: "${messageText}".
Aja naturalmente. Se ele pediu para cadastrar ou criar um produto/serviço, USE A FERRAMENTA 'cadastrar_produto'. Se for apenas uma saudação (ex: "Oi", "Tudo bem"), apenas responda amigavelmente.`;

                // 4. DECLARAÇÃO DA FERRAMENTA (FUNCTION CALLING)
                const tools = [{
                    functionDeclarations: [{
                        name: "cadastrar_produto",
                        description: "Cadastra um produto ou serviço no banco de dados da loja.",
                        parameters: {
                            type: "OBJECT",
                            properties: {
                                nome: { type: "STRING", description: "Nome do produto/serviço" },
                                preco: { type: "NUMBER", description: "Preço em formato numérico. Ex: 50.00" },
                                categoria: { type: "STRING", description: "Categoria do item" },
                                descricao: { type: "STRING", description: "Descrição opcional" }
                            },
                            required: ["nome", "preco"]
                        }
                    }]
                }];

                const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;

                // 5. ÚNICA CHAMADA PARA O GOOGLE (Super rápido e sem erros 404)
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
                    replyText = "Houve um erro de comunicação com o cérebro da IA.";
                } else {
                    const firstPart = geminiData.candidates?.[0]?.content?.parts?.[0];
                    
                    // 6. INTERCEPTAÇÃO DA FERRAMENTA E EXECUÇÃO
                    if (firstPart && firstPart.functionCall) {
                        const functionName = firstPart.functionCall.name;
                        const args = firstPart.functionCall.args;

                        if (functionName === "cadastrar_produto") {
                            try {
                                // Grava no Firebase
                                await addDoc(collection(db, 'products'), {
                                    name: args.nome,
                                    price: Number(args.preco),
                                    promotionalPrice: 0,
                                    category: args.categoria || 'Serviços',
                                    description: args.descricao || 'Cadastrado pelo WhatsApp (IA)',
                                    imageUrl: 'https://cdn-icons-png.flaticon.com/512/8636/8636813.png',
                                    stock: 999,
                                    sku: `IA-${Date.now()}`,
                                    isActive: true,
                                    tenantId: tenantId,
                                    createdAt: serverTimestamp()
                                });

                                // GERA A RESPOSTA FINAL DIRETAMENTE (Sem chamar o Google de novo!)
                                if (agentTone === 'descontraido') replyText = `Prontinho, chefe! 😎 O item "${args.nome}" (R$ ${args.preco}) foi cadastrado no sistema com sucesso. Mais alguma coisa?`;
                                else if (agentTone === 'fofo') replyText = `Feito!! ✨💖 Cadastrei "${args.nome}" por R$ ${args.preco} para você! Se precisar de mais algo é só chamar!`;
                                else if (agentTone === 'agressivo') replyText = `Cadastro concluído! 🚀 "${args.nome}" (R$ ${args.preco}) já está no sistema pronto pra vender. Qual é a próxima meta?`;
                                else replyText = `✅ Operação realizada. "${args.nome}" (R$ ${args.preco}) foi salvo com sucesso no banco de dados.`;

                            } catch (e) {
                                console.error("🚨 Erro Firebase:", e);
                                replyText = "Houve um problema técnico ao gravar no banco de dados da loja.";
                            }
                        }
                    } else {
                        // Se não for função, apenas repassa o que a IA respondeu
                        replyText = firstPart?.text || "Olá! Não entendi o comando. Como posso ajudar?";
                    }
                }

                // 7. DISPARO BLINDADO PARA O WHATSAPP (META API)
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
                            to: fromPhoneRaw, // Responde para o número exato que chamou
                            type: 'text',
                            text: { 
                                preview_url: false,
                                body: replyText 
                            }
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