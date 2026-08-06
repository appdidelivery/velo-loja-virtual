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

        // 1. Validação do Webhook da Meta
        if (body.object !== 'whatsapp_business_account') {
            return new NextResponse('Not a WhatsApp event', { status: 404 });
        }

        const messages = body.entry?.[0]?.changes?.[0]?.value?.messages;

        if (messages && messages.length > 0) {
            const message = messages[0];
            const fromPhoneRaw = message.from; 
            const messageText = message.text?.body;

            if (fromPhoneRaw && messageText) {
                
                // 2. Trava de Segurança: Verifica se o número é de um Lojista Admin
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

                // Se não for o dono da loja, ignoramos silenciosamente (Por isso seu número pessoal não dá erro)
                if (!tenantId || !tenantData) {
                    console.log(`Número ${fromPhoneRaw} ignorado. Não é administrador.`);
                    return new NextResponse('OK', { status: 200 });
                }

                // 3. Verifica a Chave da API
                if (!process.env.GEMINI_API_KEY) {
                    console.error("ERRO: GEMINI_API_KEY não encontrada no painel da Vercel.");
                    // Continua o código para a Meta enviar a mensagem de erro para o WhatsApp
                }

                // 4. Monta a Personalidade e o Prompt
                const agentName = tenantData.agentName || 'Velo Bot';
                let toneInstruction = "Aja de forma profissional e direta.";
                if (tenantData.agentTone === 'descontraido') toneInstruction = "Aja de forma descontraída, amigável e use emojis 😎.";
                if (tenantData.agentTone === 'fofo') toneInstruction = "Aja de forma fofa, entusiasmada e use emojis ✨💖.";

                const prompt = `Você é o ${agentName}, assistente da loja. ${toneInstruction}
Mensagem do dono da loja: "${messageText}".
Aja naturalmente. Se ele pediu para cadastrar ou criar um produto/serviço, USE A FERRAMENTA 'cadastrar_produto'. Se for uma saudação, responda normalmente.`;

                // 5. Configuração da Ferramenta de Cadastro
                const tools = [{
                    functionDeclarations: [{
                        name: "cadastrar_produto",
                        description: "Cadastra um novo produto no banco de dados da loja.",
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

                // 🔄 MUDANÇA ESTRATÉGICA: Usando o modelo PRO que garante suporte a ferramentas
                const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${process.env.GEMINI_API_KEY}`;

                let replyText = "Desculpe, ocorreu um erro inesperado.";

                // 6. Chamada para a Inteligência Artificial
                try {
                    const geminiResponse = await fetch(geminiUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ 
                            contents: [{ role: "user", parts: [{ text: prompt }] }],
                            tools: tools
                        })
                    });

                    const geminiData = await geminiResponse.json();

                    if (geminiData.error) {
                        console.error("🚨 ERRO GOOGLE API:", geminiData.error);
                        replyText = `⚠️ Chefe, o Google bloqueou minha resposta. Verifique a GEMINI_API_KEY na Vercel. Erro: ${geminiData.error.message}`;
                    } else {
                        const firstPart = geminiData.candidates?.[0]?.content?.parts?.[0];
                        
                        // 7. A IA escolheu usar a Ferramenta?
                        if (firstPart && firstPart.functionCall) {
                            const functionName = firstPart.functionCall.name;
                            const args = firstPart.functionCall.args;

                            if (functionName === "cadastrar_produto") {
                                try {
                                    // Executa a injeção no Firebase
                                    await addDoc(collection(db, 'products'), {
                                        name: args.nome,
                                        price: Number(args.preco),
                                        promotionalPrice: 0,
                                        category: args.categoria || 'Geral',
                                        description: args.descricao || 'Criado via IA pelo WhatsApp',
                                        imageUrl: 'https://cdn-icons-png.flaticon.com/512/8636/8636813.png',
                                        stock: 999,
                                        sku: `IA-${Date.now()}`,
                                        isActive: true,
                                        tenantId: tenantId,
                                        createdAt: serverTimestamp()
                                    });

                                    // Gera a resposta formatada sem chamar o Google de novo
                                    if (tenantData.agentTone === 'descontraido') replyText = `Prontinho, chefe! 😎 O item "${args.nome}" foi cadastrado no valor de R$ ${args.preco}.`;
                                    else if (tenantData.agentTone === 'fofo') replyText = `Feito!! ✨💖 Cadastrei "${args.nome}" para você! Se precisar de mais algo é só chamar!`;
                                    else replyText = `✅ Operação concluída. O produto "${args.nome}" foi salvo no sistema.`;

                                } catch (e) {
                                    console.error("🚨 Erro Firebase:", e);
                                    replyText = "⚠️ Chefe, a IA funcionou, mas o banco de dados do Firebase bloqueou a gravação do produto.";
                                }
                            }
                        } else {
                            // Se for apenas uma conversa ("Oi"), repassa o texto da IA
                            replyText = firstPart?.text || "Não consegui formular uma resposta.";
                        }
                    }
                } catch (e) {
                    console.error("🚨 Erro de Rede com o Google:", e);
                    replyText = "⚠️ Falha de comunicação com os servidores do Google Gemini.";
                }

                // 8. DISPARO PARA O WHATSAPP (META API)
                // A Blindagem Mestra: Garantimos que o replyText NUNCA estará vazio
                if (tenantData.metaApiToken && tenantData.metaPhoneId && replyText) {
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
                    
                    if (!metaRequest.ok) {
                        const metaError = await metaRequest.json();
                        console.error("🚨 ERRO META API:", metaError);
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