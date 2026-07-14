import { NextResponse } from 'next/server';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '@/services/firebase'; // Ajuste o caminho do seu firebase

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    
    // Pega o ID da loja na ida (storeId) ou na volta do Google (state)
    const storeId = searchParams.get('storeId') || searchParams.get('state');
    const code = searchParams.get('code');

    // Chaves do Google Cloud Console
    const CLIENT_ID = String(process.env.GOOGLE_CLIENT_ID || "");
    const CLIENT_SECRET = String(process.env.GOOGLE_CLIENT_SECRET || "");
    
    // Captura dinâmica da URL (localhost ou produção)
    const host = request.headers.get('host') || new URL(request.url).host;
    const isLocal = host.includes('localhost') || host.includes('127.0.0.1');
    const protocol = isLocal ? 'http' : 'https';
    
    // 🚨 A MÁGICA AQUI: O Redirect URI aponta de volta para ESSE MESMO ARQUIVO!
    const REDIRECT_URI = `${protocol}://${host}/api/google-auth`;

    if (!storeId) {
        return NextResponse.json({ error: 'Store ID ausente.' }, { status: 400 });
    }

    // ==========================================
    // PASSO A: IDA (Lojista clicou em Conectar)
    // ==========================================
    if (!code) {
        const scope = encodeURIComponent('https://www.googleapis.com/auth/business.manage openid profile email');
        const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&response_type=code&scope=${scope}&access_type=offline&prompt=consent&state=${storeId}`;
        
        return NextResponse.redirect(authUrl);
    }

    // ==========================================
    // PASSO B: VOLTA (Google devolveu o código)
    // ==========================================
    try {
        const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                code,
                client_id: CLIENT_ID || '',
                client_secret: CLIENT_SECRET || '',
                redirect_uri: REDIRECT_URI,
                grant_type: 'authorization_code',
            }),
        });

        const tokenData = await tokenResponse.json();

        if (!tokenResponse.ok) {
            throw new Error(tokenData.error_description || 'Erro ao obter tokens da API do Google');
        }

        // Salva os Tokens no Firebase da loja correspondente
        const settingsRef = doc(db, 'tenants', storeId); // <-- MUDOU DE settings PARA tenants
        await setDoc(settingsRef, {
            integrations: {
                google_my_business: {
                    accessToken: tokenData.access_token,
                    refreshToken: tokenData.refresh_token || null,
                    expiresIn: tokenData.expires_in,
                    tokenType: tokenData.token_type,
                    connectedAt: new Date().toISOString(),
                    healthStatus: 'healthy'
                }
            }
        }, { merge: true });

        // Manda o lojista de volta pro painel, na aba do Google!
        return NextResponse.redirect(`${protocol}://${host}/admin`);

    } catch (error: any) {
        console.error('Erro na autenticação OAuth com Google Meu Negócio:', error);
        return NextResponse.redirect(`${protocol}://${host}/admin`);
    }
}