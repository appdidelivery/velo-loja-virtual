import { NextResponse } from 'next/server';
import { db } from '@/services/firebase'; // Ajuste o caminho do seu firebase
import { collection, addDoc, getDocs, query, where, serverTimestamp } from 'firebase/firestore';

export async function POST(request: Request) {
    try {
        const { storeId } = await request.json();

        if (!storeId) {
            return NextResponse.json({ error: 'Store ID ausente' }, { status: 400 });
        }

        // 1. Aqui você deve colocar a sua API KEY real do Google Cloud (Places API)
        const GOOGLE_API_KEY = process.env.GOOGLE_PLACES_API_KEY; 
        
        // NOTA: O link "share.google" precisa ser convertido num "Place ID" do Google.
        // Como exemplo, vamos simular que já pegamos o Place ID via API.
        // O ideal é no seu painel Admin pedir o "Google Place ID" em vez do Link de compartilhamento.
        const placeId = "ChIJN1t_tDeuEmsRUsoyG83frY4"; // Exemplo de ID do Google
        
        if (!GOOGLE_API_KEY) {
            // MOCK PARA TESTE (Caso não tenha a API Key ainda)
            // Se não tiver API Key, vamos injetar avaliações fakes do Google no banco para você ver funcionando no Front!
            await addDoc(collection(db, "reviews"), {
                storeId,
                orderId: "google-import",
                rating: 5,
                comment: "Ótimo serviço! Empresa muito séria, recomendo a todos.",
                customerName: "Cliente Google",
                source: "google",
                createdAt: serverTimestamp()
            });

            return NextResponse.json({ message: 'Avaliações de teste do Google importadas com sucesso!' });
        }

        // 2. Chamada Real para a API do Google (Se tiver a chave)
        const googleRes = await fetch(`https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=reviews&language=pt-BR&key=${GOOGLE_API_KEY}`);
        const googleData = await googleRes.json();

        if (googleData.result && googleData.result.reviews) {
            const reviews = googleData.result.reviews;

            // 3. Salva cada avaliação no Firebase da loja
            for (const review of reviews) {
                // Checa se já existe para não duplicar
                const q = query(collection(db, "reviews"), where("storeId", "==", storeId), where("comment", "==", review.text));
                const existing = await getDocs(q);

                if (existing.empty && review.text) {
                    await addDoc(collection(db, "reviews"), {
                        storeId,
                        orderId: "google",
                        rating: review.rating,
                        comment: review.text,
                        customerName: review.author_name,
                        source: 'google',
                        imageUrl: review.profile_photo_url || null,
                        createdAt: serverTimestamp() // Importante para o front-end ordenar
                    });
                }
            }
        }

        return NextResponse.json({ message: 'Sincronização concluída com sucesso!' });

    } catch (error) {
        console.error("Erro na API de Reviews do Google:", error);
        return NextResponse.json({ error: 'Falha no servidor' }, { status: 500 });
    }
}