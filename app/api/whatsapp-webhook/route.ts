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

                // SPRINT 3: IA OPENAI (A Prova Real)
                const prompt = `Você é um robô extrator de dados. Leia a mensagem do usuário e extraia o nome do produto, o preço numérico e a categoria.
Responda APENAS com um objeto JSON válido, sem texto adicional. Formato:
{"acao": "cadastrar", "nome": "nome do item", "preco": 150.00, "categoria": "Estética"}`;

                const openAiUrl = 'https://api.openai.com/v1/chat/completions';
                
                const openAiPayload = {
                    model: "gpt-4o-mini", // Modelo super rápido e barato da OpenAI
                    response_format: { type: "json_object" }, // Força retorno em JSON
                    messages: [
                        { role: "system", content: prompt },
                        { role: "user", content: messageText }
                    ]
                };

                const aiResponse = await fetch(openAiUrl, { 
                    method: 'POST', 
                    headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
                    }, 
                    body: JSON.stringify(openAiPayload) 
                });
                
                const aiData = await aiResponse.json();
                
                let replyText = "";

                if (aiData.error) {
                    console.error("🚨 ERRO DA OPENAI:", aiData.error);
                    replyText = `Erro na API OpenAI: ${aiData.error.message}`;
                } else {
                    const responseText = aiData.choices?.[0]?.message?.content || "";
                    
                    try {
                        const dados = JSON.parse(responseText);

                        if (dados.acao === 'cadastrar') {
                            await addDoc(collection(db, 'products'), {
                                name: dados.nome, price: Number(dados.preco), category: dados.categoria || 'Geral',
                                description: 'Cadastrado via Velo IA (OpenAI)', imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&q=80&w=600',
                                stock: 99, sku: `IA-${Date.now()}`, isActive: true, tenantId: tenantId
                            });
                            replyText = `✅ Cadastrado com sucesso! Produto: ${dados.nome} | Valor: R$ ${dados.preco}. Atualize seu painel!`;
                        } else {
                            replyText = "Não identifiquei uma ordem de cadastro.";
                        }
                    } catch (e) {
                        console.error("Erro ao ler JSON da OpenAI:", responseText);
                        replyText = "A IA processou, mas o formato falhou.";
                    }
                }

                const metaToken = tenantData.metaApiToken;
                const metaPhoneId = tenantData.metaPhoneId;

                if (metaToken && metaPhoneId && numeroOficialDoPainel) {
                    await fetch(`https://graph.facebook.com/v17.0/${metaPhoneId}/messages`, {
                        method: 'POST',
                        headers: { 'Authorization': `Bearer ${metaToken}`, 'Content-Type': 'application/json' },
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