import { NextResponse } from 'next/server';
import { doc, getDoc, updateDoc, collection, query, where, getDocs, serverTimestamp } from 'firebase/firestore';
import { db } from '@/services/firebase'; // Ajuste se seu import do firebase estiver em outro caminho

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

// Função utilitária para verificar e renovar o token do Google automaticamente
async function getValidGmbTokenAndIds(storeId: string) {
    const docRef = doc(db, 'settings', storeId);
    const docSnap = await getDoc(docRef);
    const data = docSnap.exists() ? docSnap.data()?.integrations?.google_my_business : null;

    if (!data || !data.accessToken) {
        throw new Error("A loja não possui uma conta do Google Meu Negócio conectada.");
    }

    // Calcula se passou de 58 minutos (3500000 ms)
    const connectedAtDate = new Date(data.connectedAt).getTime();
    const isExpired = (Date.now() - connectedAtDate) > 3500000; 

    // Renova o token se estiver expirado e houver um refresh token salvo
    if (isExpired && data.refreshToken) {
        try {
            const tokenParams = new URLSearchParams({
                client_id: GOOGLE_CLIENT_ID || '',
                client_secret: GOOGLE_CLIENT_SECRET || '',
                refresh_token: data.refreshToken,
                grant_type: 'refresh_token'
            });

            const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: tokenParams
            });

            const tokenData = await tokenRes.json();
            if (!tokenRes.ok) throw new Error(tokenData.error_description || "Erro ao atualizar o token.");

            const newAccessToken = tokenData.access_token;

            await updateDoc(docRef, {
                "integrations.google_my_business.accessToken": newAccessToken, 
                "integrations.google_my_business.connectedAt": new Date().toISOString()
            });

            return { accessToken: newAccessToken, locationId: data.locationId };
        } catch (error) {
            throw new Error("O Token expirou. Reconecte na aba Integrações.");
        }
    }
    return { accessToken: data.accessToken, locationId: data.locationId };
}

// ==========================================
// MÉTODOS GET (Leituras)
// ==========================================
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const storeId = searchParams.get('storeId');

    if (!storeId) return NextResponse.json({ success: false, error: 'storeId é obrigatório.' }, { status: 400 });

    try {
        if (action === 'checkStatus') {
            const docSnap = await getDoc(doc(db, 'settings', storeId));
            const gmbData = docSnap.exists() ? docSnap.data()?.integrations?.google_my_business : null;
            return NextResponse.json({ connected: !!(gmbData && gmbData.accessToken) });
        }

        const { accessToken, locationId } = await getValidGmbTokenAndIds(storeId);
        
        if (!locationId && action !== 'getProfile') {
            return NextResponse.json({ success: false, error: "ID do Local não configurado." }, { status: 400 });
        }

        const cleanLocationId = locationId ? locationId.replace('locations/', '') : '';
        const locationName = `locations/${cleanLocationId}`;
        const accountLocationName = `accounts/-/locations/${cleanLocationId}`;

        if (action === 'getProfile') {
            const apiRes = await fetch(`https://mybusinessbusinessinformation.googleapis.com/v1/${locationName}?readMask=title,profile,primaryPhone`, {
                headers: { 'Authorization': `Bearer ${accessToken}` }
            });
            const data = await apiRes.json();
            if (!apiRes.ok) throw new Error(data.error?.message || "Erro na API GMB.");
            return NextResponse.json({ success: true, profile: data });
        }

        if (action === 'getReviews') {
            const apiRes = await fetch(`https://mybusiness.googleapis.com/v4/${accountLocationName}/reviews`, {
                headers: { 'Authorization': `Bearer ${accessToken}` }
            });
            const data = await apiRes.json();
            if (!apiRes.ok) throw new Error(data.error?.message || "Falha ao listar avaliações.");
            return NextResponse.json({ success: true, reviews: data });
        }

        if (action === 'getMedia') {
            const apiRes = await fetch(`https://mybusiness.googleapis.com/v4/${accountLocationName}/media`, {
                headers: { 'Authorization': `Bearer ${accessToken}` }
            });
            const data = await apiRes.json();
            if (!apiRes.ok) throw new Error(data.error?.message || "Falha ao buscar fotos.");
            return NextResponse.json({ success: true, media: data });
        }

        return NextResponse.json({ success: false, error: 'Ação GET não reconhecida.' }, { status: 400 });

    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

// ==========================================
// MÉTODOS POST / PUT / PATCH (Escritas)
// ==========================================
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { action, storeId, ...params } = body;

        if (!storeId) return NextResponse.json({ success: false, error: 'storeId é obrigatório.' }, { status: 400 });

        const { accessToken, locationId } = await getValidGmbTokenAndIds(storeId);
        
        if (!locationId) {
            return NextResponse.json({ success: false, error: "ID do Local não configurado na aba de integrações." }, { status: 400 });
        }

        const cleanLocationId = locationId.replace('locations/', '');
        const locationName = `locations/${cleanLocationId}`;
        const accountLocationName = `accounts/-/locations/${cleanLocationId}`;

        if (action === 'updateBusinessInfo') {
            const { title, description, phone } = params;
            const updatePayload: any = {};
            const updateMask: string[] = [];

            if (title) { updatePayload.title = title; updateMask.push('title'); }
            if (description) { updatePayload.profile = { description }; updateMask.push('profile.description'); }
            if (phone) { updatePayload.primaryPhone = phone; updateMask.push('primaryPhone'); }

            const apiRes = await fetch(`https://mybusinessbusinessinformation.googleapis.com/v1/${locationName}?updateMask=${updateMask.join(',')}`, {
                method: 'PATCH',
                headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(updatePayload)
            });
            const data = await apiRes.json();
            if (!apiRes.ok) throw new Error(data.error?.message || "Falha ao atualizar perfil.");
            return NextResponse.json({ success: true, profile: data });
        }

        if (action === 'createGooglePost') {
            const { summary, imageUrl, topicType, startDate, endDate, productUrl } = params;
            if (!summary) throw new Error("O texto da postagem é obrigatório.");

            const postPayload: any = { 
                languageCode: "pt-BR", 
                topicType: topicType || "STANDARD", 
                summary: summary 
            };
            
            if (imageUrl) {
                postPayload.media = [{ mediaFormat: "PHOTO", sourceUrl: encodeURI(imageUrl) }];
            }

            if (productUrl) {
                postPayload.callToAction = {
                    actionType: "ORDER", 
                    url: productUrl
                };
            }

            if (topicType === 'OFFER' || topicType === 'EVENT') {
                if (!startDate || !endDate) throw new Error("Datas obrigatórias para Ofertas e Eventos.");
                
                const startYear = parseInt(startDate.split('-')[0]);
                const startMonth = parseInt(startDate.split('-')[1]);
                const startDay = parseInt(startDate.split('-')[2]);
                
                const endYear = parseInt(endDate.split('-')[0]);
                const endMonth = parseInt(endDate.split('-')[1]);
                const endDay = parseInt(endDate.split('-')[2]);

                postPayload.event = {
                    title: topicType === 'EVENT' ? 'Evento Especial' : 'Oferta Especial',
                    schedule: {
                        startDate: { year: startYear, month: startMonth, day: startDay },
                        endDate: { year: endYear, month: endMonth, day: endDay }
                    }
                };
            }

            const apiRes = await fetch(`https://mybusiness.googleapis.com/v4/${accountLocationName}/localPosts`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(postPayload)
            });
            const data = await apiRes.json();
            if (!apiRes.ok) throw new Error(data.error?.message || "Falha ao publicar postagem.");
            return NextResponse.json({ success: true, post: data });
        }

        if (action === 'handleReviews') {
            const { reviewId, replyText } = params;
            const apiRes = await fetch(`https://mybusiness.googleapis.com/v4/${accountLocationName}/reviews/${reviewId}/reply`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ comment: replyText })
            });
            const data = await apiRes.json();
            if (!apiRes.ok) throw new Error(data.error?.message || "Falha ao enviar resposta.");
            return NextResponse.json({ success: true, reply: data });
        }

        if (action === 'uploadGoogleMedia') {
            const { mediaUrl, category } = params; 
            const apiRes = await fetch(`https://mybusiness.googleapis.com/v4/${accountLocationName}/media`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    mediaFormat: "PHOTO", 
                    locationAssociation: { category: category }, 
                    sourceUrl: encodeURI(mediaUrl) 
                })
            });
            const data = await apiRes.json();
            if (!apiRes.ok) throw new Error(data.error?.message || "Falha ao enviar imagem.");
            return NextResponse.json({ success: true, media: data });
        }

        if (action === 'syncVeloProducts') {
            const q = query(collection(db, "products"), where("tenantId", "==", storeId), where("isActive", "==", true));
            const productsSnap = await getDocs(q);
                
            if (productsSnap.empty) throw new Error("Nenhum produto ativo encontrado.");

            let syncedCount = 0;
            const batchPromises = productsSnap.docs.map(async (doc) => {
                const p = doc.data();
                if (!p.imageUrl) return; 
                
                const postPayload = {
                    languageCode: "pt-BR", 
                    topicType: "STANDARD",
                    summary: `${p.name} - R$ ${p.price}\n\n${p.description || 'Faça seu pedido online.'}`,
                    media: [{ mediaFormat: "PHOTO", sourceUrl: encodeURI(p.imageUrl) }]
                };
                
                const gRes = await fetch(`https://mybusiness.googleapis.com/v4/${accountLocationName}/localPosts`, {
                    method: 'POST', 
                    headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' }, 
                    body: JSON.stringify(postPayload)
                });
                
                if (gRes.ok) syncedCount++;
            });

            await Promise.all(batchPromises);
            
            await updateDoc(doc(db, 'tenants', storeId), {
                lastCatalogSync: serverTimestamp()
            });

            return NextResponse.json({ success: true, syncedCount });
        }

        return NextResponse.json({ success: false, error: 'Ação POST não reconhecida.' }, { status: 400 });

    } catch (error: any) {
        console.error("Erro na API GMB:", error.message);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}