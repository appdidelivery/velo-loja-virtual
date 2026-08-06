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

        if (body.object !== 'whatsapp_business_account') {
            return new NextResponse('Not a WhatsApp event', { status: 404 });
        }

        const messages = body.entry?.[0]?.changes?.[0]?.value?.messages;

        if (messages && messages.length > 0) {
            const message = messages[0];
            const fromPhoneRaw = message.from; 
            const messageText = message.text?.body;

            if (fromPhoneRaw && messageText) {
                
                // 1. Busca a Loja e verifica se é Admin
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

                // 2. Personalidade
                const agentName = tenantData.agentName || 'Velo Bot';
                let toneInstruction = "profissional e direto";
                if (tenantData.agentTone === 'descontraido') toneInstruction = "descontraído, amigável e usar emojis 😎";
                if (tenantData.agentTone === 'fofo') toneInstruction = "fofo, entusiasmado e usar emojis ✨💖";
                if (tenantData.agentTone === 'agressivo') toneInstruction = "focado em vendas, persuasivo e usar emojis 🚀";

                // 🔥 O HACK: JSON PROMPTING (Bypassa o bloqueio de Tools do Google)
                const prompt = `Você é o ${agentName}, assistente da loja.
Sua personalidade: Você deve ser ${toneInstruction}.

O dono da loja enviou o seguinte comando: "${messageText}"

REGRAS OBRIGATÓRIAS DE RESPOSTA:
Você deve responder ÚNICA e EXCLUSIVAMENTE com um objeto JSON válido, sem usar blocos de código (não use \`\`\`json).

SE a intenção do usuário for CADASTRAR/CRIAR um produto ou serviço, retorne estritamente isso:
{
  "action": "cadastrar",
  "nome": "Nome extraído do produto",
  "preco": 150.00,
  "categoria": "Geral"
}

SE for apenas uma CONVERSA, SAUDAÇÃO ou pergunta, retorne estritamente isso:
{
  "action": "responder",
  "texto": "Sua resposta amigável formatada com a sua personalidade"
}`;

                // AQUI ESTÁ A CORREÇÃO (FLASH): É O MODELO QUE NUNCA DÁ 404 NO SEU CÓDIGO
                const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;

                // 3. Chamada ÚNICA e simples (Nunca dará 404)
                const geminiResponse = await fetch(geminiUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        contents: [{ role: "user", parts: [{ text: prompt }] }]
                    })
                });

                const geminiData = await geminiResponse.json();
                let replyText = "";

                if (geminiData.error) {
                    console.error("🚨 ERRO GOOGLE API:", geminiData.error);
                    replyText = "Houve uma falha na chave da Inteligência Artificial.";
                } else {
                    try {
                        // Extrai e limpa a resposta para garantir que é um JSON válido
                        let rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
                        rawText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
                        
                        const aiDecision = JSON.parse(rawText);

                        // 4. A IA DECIDIU CADASTRAR?
                        if (aiDecision.action === "cadastrar") {
                            
                            // Salva no Banco de Dados
                            await addDoc(collection(db, 'products'), {
                                name: aiDecision.nome,
                                price: Number(aiDecision.preco),
                                promotionalPrice: 0,
                                category: aiDecision.categoria || 'Geral',
                                description: 'Cadastrado pelo WhatsApp',
                                imageUrl: 'https://cdn-icons-png.flaticon.com/512/8636/8636813.png',
                                stock: 999,
                                sku: `IA-${Date.now()}`,
                                isActive: true,
                                tenantId: tenantId,
                                createdAt: serverTimestamp()
                            });

                            // Prepara a resposta de sucesso baseada na personalidade
                            if (tenantData.agentTone === 'descontraido') replyText = `Prontinho, chefe! 😎 Cadastrei "${aiDecision.nome}" por R$ ${aiDecision.preco}. Quer lançar mais algum?`;
                            else if (tenantData.agentTone === 'fofo') replyText = `Feito!! ✨💖 O item "${aiDecision.nome}" (R$ ${aiDecision.preco}) já está na loja!`;
                            else if (tenantData.agentTone === 'agressivo') replyText = `Tudo certo! 🚀 "${aiDecision.nome}" cadastrado por R$ ${aiDecision.preco}. Vamos vender!`;
                            else replyText = `✅ Sucesso. O produto "${aiDecision.nome}" foi cadastrado no valor de R$ ${aiDecision.preco}.`;
                        
                        } else {
                            // 5. A IA DECIDIU APENAS RESPONDER
                            replyText = aiDecision.texto || "Olá! Como posso te ajudar hoje?";
                        }

                    } catch (e) {
                        console.error("🚨 Erro ao interpretar JSON da IA ou gravar no Firebase:", e);
                        replyText = "⚠️ Chefe, eu processei a requisição mas houve um erro ao comunicar com o banco de dados.";
                    }
                }

                // 6. DISPARO FINAL PARA O WHATSAPP (META API)
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