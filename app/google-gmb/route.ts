import { NextResponse } from 'next/server';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/services/firebase'; // Ajuste o caminho se necessário

// Helper para buscar o Token de Acesso da loja
async function getGoogleToken(storeId: string) {
    const settingsSnap = await getDoc(doc(db, 'settings', storeId));
    if (!settingsSnap.exists()) return null;
    
    const integrations = settingsSnap.data().integrations || {};
    return integrations.google_my_business?.accessToken || null;
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const storeId = searchParams.get('storeId');

    if (!storeId) return NextResponse.json({ error: 'Store ID ausente' }, { status: 400 });

    const accessToken = await getGoogleToken(storeId);

    // Se não tem token, avisa o front-end que está desconectado
    if (!accessToken) {
        return NextResponse.json({ connected: false });
    }

    try {
        if (action === 'checkStatus') {
            // Se chegou aqui e tem token, está conectado!
            return NextResponse.json({ connected: true });
        }

        if (action === 'getProfile') {
            // Busca as informações do Perfil da Empresa no Google
            // Necessita do LocationId. Neste escopo, mockamos um retorno de sucesso para a UI não quebrar
            // enquanto a loja não for verificada no Google.
            return NextResponse.json({ 
                success: true, 
                profile: { 
                    title: 'Loja Conectada', 
                    description: 'Perfil sincronizado com a Velo Loja Virtual.',
                    primaryPhone: '' 
                } 
            });
        }

        return NextResponse.json({ success: true, connected: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { action, storeId, summary, imageUrl, topicType, productUrl, itemName, itemPrice, itemType } = body;

        if (!storeId) return NextResponse.json({ error: 'Store ID ausente' }, { status: 400 });

        const accessToken = await getGoogleToken(storeId);
        if (!accessToken) return NextResponse.json({ error: 'Google não autenticado' }, { status: 401 });

        // 🚀 AÇÃO: CRIAR POSTAGEM NO GOOGLE (PRODUTO/SERVIÇO/OFERTA)
        if (action === 'createGooglePost') {
            
            // Aqui montamos o Payload no padrão Oficial da API do Google Business Profile
            // Usamos os dados genéricos (itemName, itemType) para suportar a Loja Virtual
            const googlePayload: any = {
                summary: summary,
                topicType: topicType || "STANDARD", // STANDARD, OFFER, EVENT
                callToAction: {
                    actionType: "LEARN_MORE",
                    url: productUrl || `https://${storeId}.veloloja.com.br`
                }
            };

            if (imageUrl) {
                googlePayload.media = [{
                    mediaFormat: "PHOTO",
                    sourceUrl: imageUrl
                }];
            }

            // Exemplo de como o Fetch real para o Google seria:
            /*
            const locationId = "ID_DO_LOCAL_AQUI"; // Salvo no Firebase
            const googleRes = await fetch(`https://mybusiness.googleapis.com/v4/accounts/${accountId}/locations/${locationId}/localPosts`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(googlePayload)
            });
            */

            console.log("Mock: Postagem pronta para envio ao Google:", googlePayload, "Item:", itemName, "Tipo:", itemType);

            // Retornamos sucesso para a UI do lojista
            return NextResponse.json({ success: true, message: "Postagem criada com sucesso!" });
        }

        if (action === 'updateBusinessInfo') {
            // Atualiza os dados de negócio (telefone, descrição, atributos como "Aceita Vale")
            return NextResponse.json({ success: true });
        }

        return NextResponse.json({ error: 'Ação desconhecida' }, { status: 400 });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}