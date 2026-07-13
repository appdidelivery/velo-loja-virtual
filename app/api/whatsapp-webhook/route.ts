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

                // PROMPT SIMPLES E DIRETO (À prova de falhas na API)
                const prompt = `Você é um robô extrator de dados. Leia a mensagem abaixo e extraia o nome do produto, o preço e a categoria.
Responda APENAS com um objeto JSON válido, sem NENHUM texto antes ou depois. Use este formato exato:
{"acao": "cadastrar", "nome": "nome do item", "preco": 150.00, "categoria": "Estética"}

Mensagem: "${messageText}"`;

                const geminiPayload = {
                    contents: [{ parts: [{ text: prompt }] }]
                };

                const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;
                const geminiResponse = await fetch(geminiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(geminiPayload) });
                const geminiData = await geminiResponse.json();
                
                let replyText = "";

                // VERIFICA SE O GOOGLE DEU ERRO DE API (E manda pro seu WhatsApp se der!)
                if (geminiData.error) {
                    console.error("🚨 ERRO DO GOOGLE:", geminiData.error);
                    replyText = `Erro na API do Google: ${geminiData.error.message}`;
                } else {
                    const responseText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "";
                    
                    try {
                        const cleanedText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
                        const dados = JSON.parse(cleanedText);

                        if (dados.acao === 'cadastrar') {
                            await addDoc(collection(db, 'products'), {
                                name: dados.nome, price: Number(dados.preco), category: dados.categoria || 'Geral',
                                description: 'Cadastrado via Velo IA (WhatsApp)', imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&q=80&w=600',
                                stock: 99, sku: `IA-${Date.now()}`, isActive: true, tenantId: tenantId
                            });
                            replyText = `✅ Cadastrado com sucesso! Produto: ${dados.nome} | Valor: R$ ${dados.preco}. Atualize seu painel!`;
                        } else {
                            replyText = "Não identifiquei uma ordem de cadastro.";
                        }
                    } catch (e) {
                        console.error("Erro ao ler JSON. O Google enviou:", responseText);
                        replyText = "A IA processou, mas o formato falhou. Tente novamente.";
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