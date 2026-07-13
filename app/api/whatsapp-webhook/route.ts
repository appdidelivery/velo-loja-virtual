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
                
                // Pega os últimos 8 dígitos (Ignora 55, DDD e dígito 9) - O MATCH PERFEITO!
                const last8Incoming = fromPhoneRaw.slice(-8);
                const allTenantsSnap = await getDocs(collection(db, 'tenants'));
                
                let tenantId: string | null = null;
                let tenantData: any = null;
                let numeroOficialDoPainel = '';

                allTenantsSnap.forEach(doc => {
                    const data = doc.data();
                    const phones = data.adminPhones || [];
                    const matchEncontrado = phones.some((p: string) => p.slice(-8) === last8Incoming);
                    if (matchEncontrado) {
                        tenantId = doc.id;
                        tenantData = data;
                        numeroOficialDoPainel = phones[0]; 
                    }
                });

                if (!tenantId || !tenantData) {
                    return new NextResponse('EVENT_RECEIVED', { status: 200 });
                }

                // SPRINT 3: IA Gemini (MODO INDESTRUTÍVEL - JSON PURO)
                const prompt = `Você é a assistente de gestão da loja ${tenantData.businessName || 'Velo'}.
Sua única função agora é extrair dados e retornar UM OBJETO JSON PURO.
NÃO use formatação markdown (sem \`\`\`json).
Se o usuário pedir para cadastrar, adicionar ou criar um produto/serviço, retorne exatamente este objeto:
{"acao": "cadastrar", "nome": "Nome do item", "preco": 150.00, "categoria": "Categoria do Item"}

Se a mensagem não for sobre cadastrar, retorne:
{"acao": "conversar", "resposta": "Sua resposta educada aqui"}

Mensagem do dono: "${messageText}"`;

                const geminiPayload = {
                    contents: [{ role: "user", parts: [{ text: prompt }] }]
                };

                const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;
                const geminiResponse = await fetch(geminiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(geminiPayload) });
                const geminiData = await geminiResponse.json();
                
                const responseText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "";
                let replyText = "Entendido, mas ocorreu um erro ao processar. Tente novamente.";

                try {
                    // Limpa a resposta da IA e transforma em Objeto do Banco de Dados
                    const cleanedText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
                    const dados = JSON.parse(cleanedText);

                    if (dados.acao === 'cadastrar') {
                        // GRAVANDO NO FIREBASE!
                        await addDoc(collection(db, 'products'), {
                            name: dados.nome, 
                            price: Number(dados.preco), 
                            category: dados.categoria || 'Geral',
                            description: 'Cadastrado automaticamente via WhatsApp (Velo IA)', 
                            imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&q=80&w=600',
                            stock: 99, 
                            sku: `IA-${Date.now()}`, 
                            isActive: true, 
                            tenantId: tenantId
                        });
                        replyText = `✅ Sucesso Total! Acabei de cadastrar "${dados.nome}" por R$ ${dados.preco}. Vá no painel conferir!`;
                    } else if (dados.acao === 'conversar') {
                        replyText = dados.resposta;
                    }
                } catch (e) {
                    console.error("Erro ao ler dados da IA:", responseText);
                }

                // SPRINT 4: Envio da Confirmação para o WhatsApp
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
        return new NextResponse('EVENT_RECEIVED', { status: 200 });
    } catch (error) {
        return new NextResponse('EVENT_RECEIVED', { status: 200 });
    }
}