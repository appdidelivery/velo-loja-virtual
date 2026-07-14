import { NextResponse } from 'next/server';
import { doc, getDoc, updateDoc, collection, query, where, getDocs, serverTimestamp } from 'firebase/firestore';
import { db } from '@/services/firebase';

const GOOGLE_CLIENT_ID = String(process.env.GOOGLE_CLIENT_ID || "");
const GOOGLE_CLIENT_SECRET = String(process.env.GOOGLE_CLIENT_SECRET || "");

async function getValidGmbTokenAndIds(storeId: string) {
    const docRef = doc(db, 'tenants', storeId); // TRAVA SÊNIOR: Ajustado para a coleção tenants
    const docSnap = await getDoc(docRef);
    const data = docSnap.exists() ? docSnap.data()?.integrations?.google_my_business : null;

    if (!data || !data.accessToken) {
        throw new Error("A loja não possui uma conta do Google conectada.");
    }

    const connectedAtDate = new Date(data.connectedAt).getTime();
    const isExpired = (Date.now() - connectedAtDate) > 3500000; 

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

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const storeId = searchParams.get('storeId');

    if (!storeId) return NextResponse.json({ success: false, error: 'storeId é obrigatório.' }, { status: 400 });

    try {
        if (action === 'checkStatus') {
            const docSnap = await getDoc(doc(db, 'tenants', storeId)); // TRAVA SÊNIOR: Ajustado para tenants
            const gmbData = docSnap.exists() ? docSnap.data()?.integrations?.google_my_business : null;
            return NextResponse.json({ 
                connected: !!(gmbData && gmbData.accessToken),
                locationId: gmbData?.locationId || null
            });
        }

        const { accessToken, locationId } = await getValidGmbTokenAndIds(storeId);
        
        // NOVO: Buscar lista COMPLETA de empresas (locations) de TODOS os grupos
        if (action === 'listLocations') {
            const accountRes = await fetch('https://mybusinessaccountmanagement.googleapis.com/v1/accounts', {
                headers: { 'Authorization': `Bearer ${accessToken}` }
            });
            const accountData = await accountRes.json();
            if (!accountRes.ok) throw new Error("Erro ao buscar conta GMB.");
            
            if (!accountData.accounts || accountData.accounts.length === 0) {
                return NextResponse.json({ success: true, locations: [] });
            }

            let allLocations: any[] = [];

            // Faz um loop por TODAS as subcontas (Grupos de Locais) que você tem acesso
            for (const account of accountData.accounts) {
                try {
                    const locRes = await fetch(`https://mybusinessbusinessinformation.googleapis.com/v1/${account.name}/locations?readMask=title,name&pageSize=100`, {
                        headers: { 'Authorization': `Bearer ${accessToken}` }
                    });
                    const locData = await locRes.json();
                    
                    if (locData.locations && locData.locations.length > 0) {
                        allLocations = [...allLocations, ...locData.locations];
                    }
                } catch (err) {
                    console.warn(`Aviso: Falha ao puxar locais do grupo ${account.name}`);
                }
            }

            // Ordena a lista em ordem alfabética para facilitar a visualização no painel
            allLocations.sort((a, b) => a.title.localeCompare(b.title));

            return NextResponse.json({ success: true, locations: allLocations });
        }

        if (!locationId && action !== 'getProfile') {
            return NextResponse.json({ success: false, error: "ID do Local não configurado." }, { status: 400 });
        }

        // Lógica super robusta para extrair o ID limpo, não importa o formato que o Google envie
        // MÁGICA DE RESOLUÇÃO: O Google na v1 quer exatamente o que ele enviou na listagem
        // Na listagem, o name já vem como: "locations/123456789"
        const locationName = locationId; 
        
        // E para as APIs antigas (v4) de Reviews e Mídia, usamos a conta curinga '-'
        let cleanIdForOldApi = '';
        if (locationId) {
            const parts = locationId.split('/');
            cleanIdForOldApi = parts[parts.length - 1];
        }
        const accountLocationName = `accounts/-/locations/${cleanIdForOldApi}`;

        if (action === 'getProfile') {
            const apiRes = await fetch(`https://mybusinessbusinessinformation.googleapis.com/v1/${locationName}?readMask=title,profile,primaryPhone`, {
                headers: { 'Authorization': `Bearer ${accessToken}` }
            });
            const data = await apiRes.json();
            
            // Tratamento de erro detalhado para debugar se falhar de novo
            if (!apiRes.ok) {
                console.error("Erro Google API (Profile):", data);
                throw new Error(data.error?.message || "Erro na API GMB.");
            }
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

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { action, storeId, ...params } = body;

        if (!storeId) return NextResponse.json({ success: false, error: 'storeId é obrigatório.' }, { status: 400 });

        const { accessToken, locationId } = await getValidGmbTokenAndIds(storeId);

        // NOVO: Salvar a empresa escolhida pelo usuário no Firebase
        if (action === 'setLocationId') {
            await updateDoc(doc(db, 'tenants', storeId), {
                "integrations.google_my_business.locationId": params.locationId
            });
            return NextResponse.json({ success: true });
        }
        
        if (!locationId) {
            return NextResponse.json({ success: false, error: "Empresa não selecionada." }, { status: 400 });
        }

       const locationName = locationId; 
        
        let cleanIdForOldApi = '';
        if (locationId) {
            const parts = locationId.split('/');
            cleanIdForOldApi = parts[parts.length - 1];
        }
        const accountLocationName = `accounts/-/locations/${cleanIdForOldApi}`;

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