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

// 🧠 MOTOR DINÂMICO SUPREMO: Pergunta pro Google qual modelo usar, sem adivinhação.
async function fetchGeminiDynamic(prompt: string, apiKey: string) {
    try {
        // 1. Pede a lista real e atualizada de modelos para esta chave exata
        const listRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        const listData = await listRes.json();

        if (!listData.models) {
            console.error("🚨 Erro ao buscar lista de modelos permitidos:", listData);
            return null;
        }

        // 2. Filtra os modelos que suportam geração de texto
        const validModels = listData.models
            .filter((m: any) => m.supportedGenerationMethods?.includes('generateContent'))
            .map((m: any) => m.name.replace('models/', '')); // Tira o prefixo

        // Priorizamos os alias globais (latest) que você listou antes
        const preferred = ['gemini-flash-latest', 'gemini-3.5-flash', 'gemini-pro-latest'];
        const sortedModels = [
            ...preferred.filter(p => validModels.includes(p)),
            ...validModels.filter((m: string) => !preferred.includes(m))
        ];

        // 3. Testa os modelos até um dar sucesso 200 OK
        for (const model of sortedModels) {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ role: "user", parts: [{ text: prompt }] }]
                })
            });

            const data = await res.json();
            
            if (res.ok && !data.error) {
                console.log(`✅ [MÁGICA] Conectado com sucesso ao modelo: ${model}`);
                return data; // Devolve os dados e sai do loop
            } else {
                console.warn(`⏳ Pulando o modelo ${model} (Erro do Google: ${data.error?.message})`);
            }
        }
    } catch (e) {
        console.error("🚨 Erro crítico no Motor Dinâmico:", e);
    }
    return null;
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
                
                // Busca a Loja e verifica se o número é de um Admin
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

                const apiKey = process.env.GEMINI_API_KEY;
                if (!apiKey) {
                    console.error("🚨 ERRO: GEMINI_API_KEY não configurada na Vercel.");
                    return new NextResponse('OK', { status: 200 });
                }

                const agentName = tenantData.agentName || 'Velo Bot';
                let toneInstruction = "profissional e direto";
                if (tenantData.agentTone === 'descontraido') toneInstruction = "descontraído, amigável e usar emojis 😎";
                if (tenantData.agentTone === 'fofo') toneInstruction = "fofo, muito entusiasmado e usar emojis ✨💖";
                if (tenantData.agentTone === 'agressivo') toneInstruction = "focado em vendas, persuasivo e usar emojis 🚀";

                // O HACK DE JSON PROMPTING (Blindado)
                const prompt = `Você é o ${agentName}, assistente da loja.
Sua personalidade: Você deve ser ${toneInstruction}.

Comando do dono da loja: "${messageText}"

REGRAS OBRIGATÓRIAS DE RESPOSTA:
Você deve responder ÚNICA e EXCLUSIVAMENTE com um objeto JSON válido, sem markdown.

SE a intenção do usuário for CADASTRAR/CRIAR um produto/serviço, retorne estritamente:
{
  "action": "cadastrar",
  "nome": "Nome do produto",
  "preco": 150.00,
  "categoria": "Geral"
}

SE for apenas uma CONVERSA, retorne estritamente:
{
  "action": "responder",
  "texto": "Sua resposta amigável"
}`;

                let replyText = "Desculpe, ocorreu um erro no servidor.";

                // RODA A IA COM O MOTOR QUE NUNCA FALHA
                const geminiData = await fetchGeminiDynamic(prompt, apiKey);

                if (!geminiData) {
                    replyText = "⚠️ Chefe, o Google bloqueou a geração de texto para a sua Chave de API. Revise a conta no Google Cloud.";
                } else {
                    try {
                        let rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
                        rawText = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
                        
                        const aiDecision = JSON.parse(rawText);

                        if (aiDecision.action === "cadastrar") {
                            await addDoc(collection(db, 'products'), {
                                name: aiDecision.nome,
                                price: Number(aiDecision.preco),
                                promotionalPrice: 0,
                                category: aiDecision.categoria || 'Geral',
                                description: 'Cadastrado via IA pelo WhatsApp',
                                imageUrl: 'https://cdn-icons-png.flaticon.com/512/8636/8636813.png',
                                stock: 999,
                                sku: `IA-${Date.now()}`,
                                isActive: true,
                                tenantId: tenantId,
                                createdAt: serverTimestamp()
                            });

                            if (tenantData.agentTone === 'descontraido') replyText = `Prontinho, chefe! 😎 Cadastrei "${aiDecision.nome}" por R$ ${aiDecision.preco}.`;
                            else if (tenantData.agentTone === 'fofo') replyText = `Feito!! ✨💖 O item "${aiDecision.nome}" (R$ ${aiDecision.preco}) já está na loja!`;
                            else if (tenantData.agentTone === 'agressivo') replyText = `Tudo certo! 🚀 "${aiDecision.nome}" cadastrado por R$ ${aiDecision.preco}.`;
                            else replyText = `✅ Sucesso. O produto "${aiDecision.nome}" foi cadastrado no valor de R$ ${aiDecision.preco}.`;
                        
                        } else {
                            replyText = aiDecision.texto || "Olá! Como posso ajudar hoje?";
                        }
                    } catch (e) {
                        console.error("🚨 Erro ao ler JSON da IA:", e);
                        replyText = "⚠️ Chefe, a IA gerou a resposta, mas o formato veio inválido.";
                    }
                }

                // 10. DISPARO FINAL PARA O WHATSAPP (COM LOGS DETALHADOS)
                if (!tenantData.metaApiToken || !tenantData.metaPhoneId) {
                    console.error("🚨 ERRO META API: Faltam as credenciais (Token ou ID do Telefone) no painel da loja no Firebase.");
                } else if (replyText) {
                    try {
                        const metaResponse = await fetch(`https://graph.facebook.com/v19.0/${tenantData.metaPhoneId}/messages`, {
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

                        const metaData = await metaResponse.json();

                        if (!metaResponse.ok) {
                            console.error("🚨 REJEIÇÃO DA META API:", JSON.stringify(metaData));
                        } else {
                            console.log("✅ [SUCESSO] Mensagem entregue ao WhatsApp da Meta!");
                        }
                    } catch (err) {
                        console.error("🚨 FALHA DE REDE AO CHAMAR META API:", err);
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