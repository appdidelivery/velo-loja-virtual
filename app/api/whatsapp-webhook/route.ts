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

// 🧠 MOTOR AUTO-CURÁVEL: Testa os modelos até achar o que a sua Chave de API aceita
async function fetchGeminiWithFallback(prompt: string, apiKey: string) {
    const models = [
        'gemini-1.5-flash', 
        'gemini-1.5-pro', 
        'gemini-pro', 
        'gemini-1.0-pro-latest'
    ];
    
    for (const model of models) {
        try {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    contents: [{ role: "user", parts: [{ text: prompt }] }]
                })
            });
            
            const data = await res.json();
            
            // Se o Google respondeu com sucesso, retornamos os dados imediatamente!
            if (res.ok && !data.error) {
                console.log(`✅ [SUCESSO] O modelo que funcionou na sua chave foi: ${model}`);
                return data; 
            } else {
                console.warn(`⚠️ [FALHA] Modelo ${model} rejeitado pelo Google:`, data.error?.message);
            }
        } catch (e) {
            console.warn(`⚠️ [REDE] Erro ao testar o modelo ${model}`);
        }
    }
    
    // Se chegou aqui, a chave do Google está completamente bloqueada.
    // Vamos perguntar pro Google quais modelos sua chave tem direito e jogar no log!
    try {
        const listRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        const listData = await listRes.json();
        console.error("🚨 NENHUM MODELO FUNCIONOU. Sua chave só tem acesso aos modelos:", JSON.stringify(listData.models?.map((m: any) => m.name)));
    } catch(e) {}

    return null;
}

export async function POST(request: Request) {
    try {
        const body = await request.json();

        // 1. Verificação do Webhook da Meta
        if (body.object !== 'whatsapp_business_account') {
            return new NextResponse('Not a WhatsApp event', { status: 404 });
        }

        const messages = body.entry?.[0]?.changes?.[0]?.value?.messages;

        if (messages && messages.length > 0) {
            const message = messages[0];
            const fromPhoneRaw = message.from; 
            const messageText = message.text?.body;

            if (fromPhoneRaw && messageText) {
                
                // 2. Busca a Loja e verifica se o número é de um Admin
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

                // Se não for Admin, para aqui.
                if (!tenantId || !tenantData) return new NextResponse('OK', { status: 200 });

                // 3. Trava de Segurança da Chave API
                const apiKey = process.env.GEMINI_API_KEY;
                if (!apiKey) {
                    console.error("🚨 ERRO: GEMINI_API_KEY não configurada na Vercel.");
                    return new NextResponse('OK', { status: 200 });
                }

                // 4. Personalidade
                const agentName = tenantData.agentName || 'Velo Bot';
                let toneInstruction = "profissional e direto";
                if (tenantData.agentTone === 'descontraido') toneInstruction = "descontraído, amigável e usar emojis 😎";
                if (tenantData.agentTone === 'fofo') toneInstruction = "fofo, muito entusiasmado e usar emojis ✨💖";
                if (tenantData.agentTone === 'agressivo') toneInstruction = "focado em vendas, persuasivo e usar emojis 🚀";

                // 5. O HACK DE JSON (Substitui o Tools que o Google estava bloqueando)
                const prompt = `Você é o ${agentName}, assistente da loja.
Sua personalidade: Você deve ser ${toneInstruction}.

Comando do dono da loja: "${messageText}"

REGRAS OBRIGATÓRIAS DE RESPOSTA:
Você deve responder ÚNICA e EXCLUSIVAMENTE com um objeto JSON válido, sem usar blocos de código markdown.

SE a intenção do usuário for CADASTRAR ou CRIAR um produto/serviço, retorne estritamente isso:
{
  "action": "cadastrar",
  "nome": "Nome do produto",
  "preco": 150.00,
  "categoria": "Geral"
}

SE for apenas uma CONVERSA (ex: "oi", "tudo bem?", "teste"), retorne estritamente isso:
{
  "action": "responder",
  "texto": "Sua resposta amigável de acordo com sua personalidade."
}`;

                let replyText = "Desculpe, ocorreu um erro de comunicação com o servidor.";

                // 6. Roda a Inteligência Artificial (com Motor Auto-Curável)
                const geminiData = await fetchGeminiWithFallback(prompt, apiKey);

                if (!geminiData) {
                    replyText = "⚠️ Chefe, a sua Chave do Google bloqueou o acesso a todos os modelos de IA. Olhe os logs da Vercel para ver quais modelos a sua chave tem direito.";
                } else {
                    try {
                        // 7. Limpa e processa o JSON gerado pela IA
                        let rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
                        rawText = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
                        
                        const aiDecision = JSON.parse(rawText);

                        // 8. A IA DECIDIU CADASTRAR?
                        if (aiDecision.action === "cadastrar") {
                            
                            // Grava no Firebase
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

                            // Resposta de sucesso baseada na personalidade
                            if (tenantData.agentTone === 'descontraido') replyText = `Prontinho, chefe! 😎 Cadastrei "${aiDecision.nome}" por R$ ${aiDecision.preco}.`;
                            else if (tenantData.agentTone === 'fofo') replyText = `Feito!! ✨💖 O item "${aiDecision.nome}" (R$ ${aiDecision.preco}) já está na loja!`;
                            else if (tenantData.agentTone === 'agressivo') replyText = `Tudo certo! 🚀 "${aiDecision.nome}" cadastrado por R$ ${aiDecision.preco}.`;
                            else replyText = `✅ Sucesso. O produto "${aiDecision.nome}" foi cadastrado no valor de R$ ${aiDecision.preco}.`;
                        
                        } else {
                            // 9. A IA DECIDIU APENAS RESPONDER (Ex: Quando você manda "oi teste")
                            replyText = aiDecision.texto || "Olá! Como posso ajudar nas vendas hoje?";
                        }

                    } catch (e) {
                        console.error("🚨 Erro ao ler JSON da IA:", e);
                        replyText = "⚠️ Chefe, o Google processou a mensagem, mas devolveu um texto inválido.";
                    }
                }

                // 10. DISPARO FINAL PARA O WHATSAPP (META API)
                if (tenantData.metaApiToken && tenantData.metaPhoneId && replyText) {
                    await fetch(`https://graph.facebook.com/v19.0/${tenantData.metaPhoneId}/messages`, {
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
                }
            }
        }
        return new NextResponse('OK', { status: 200 });
    } catch (error) {
        console.error("🚨 ERRO FATAL WEBHOOK:", error);
        return new NextResponse('OK', { status: 200 });
    }
}