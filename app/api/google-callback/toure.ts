import { NextResponse } from 'next/server';
import { db } from '@/services/firebase';
import { doc, setDoc } from 'firebase/firestore';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const storeId = searchParams.get('state'); // Pegamos a loja devolvida no "state"

    if (!code || !storeId) {
        return NextResponse.json({ error: 'Código ou Store ID ausentes na resposta.' }, { status: 400 });
    }

    // ⚠️ SUBSTITUA PELAS SUAS CREDENCIAIS DO GOOGLE CLOUD CONSOLE ⚠️
    const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "COLOQUE_SEU_CLIENT_ID_AQUI.apps.googleusercontent.com";
    const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || "COLOQUE_SEU_CLIENT_SECRET_AQUI";

    const isLocal = request.url.includes('localhost') || request.url.includes('127.0.0.1');
    const redirectUri = isLocal 
        ? 'http://localhost:3000/api/google-callback' 
        : `https://${new URL(request.url).host}/api/google-callback`;

    try {
        // 1. Troca o 'code' pelo Token Permanente (Refresh Token) no Google
        const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                code,
                client_id: GOOGLE_CLIENT_ID,
                client_secret: GOOGLE_CLIENT_SECRET,
                redirect_uri: redirectUri,
                grant_type: 'authorization_code',
            }).toString(),
        });

        const tokenData = await tokenResponse.json();

        if (!tokenResponse.ok) {
            console.error("Erro ao gerar token Google:", tokenData);
            return NextResponse.json({ error: 'Falha ao autenticar no Google.' }, { status: 500 });
        }

        // 2. Salva o Token gerado lá na sua loja no Firebase
        await setDoc(doc(db, "settings", storeId), {
            integrations: {
                google_my_business: {
                    accessToken: tokenData.access_token,
                    refreshToken: tokenData.refresh_token, // Crucial para não deslogar!
                    expiresAt: Date.now() + (tokenData.expires_in * 1000)
                }
            }
        }, { merge: true });

        // 3. Manda o lojista de volta pro painel dele, já logado!
        const returnUrl = isLocal ? 'http://localhost:3000/admin' : `https://${new URL(request.url).host}/admin`;
        return NextResponse.redirect(returnUrl);

    } catch (error) {
        console.error("Erro catastrófico no Callback:", error);
        return NextResponse.json({ error: 'Erro de Servidor.' }, { status: 500 });
    }
}