import { NextResponse } from 'next/server';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '@/services/firebase'; // Ajuste este import conforme o caminho do seu firebase.ts

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get('storeId') || searchParams.get('state');
    const code = searchParams.get('code');

    // Chaves que você configurou no painel do Google Cloud Console (.env.local)
    const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
    const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
    
    // Captura dinâmica da URL base (suporta localhost e produção Vercel)
    const protocol = request.headers.get('x-forwarded-proto') || 'https';
    const host = request.headers.get('host');
    const REDIRECT_URI = `${protocol}://${host}/google-auth`;

    if (!storeId) {
        return NextResponse.json({ error: 'Store ID (Tenant ID) é obrigatório para iniciar a integração.' }, { status: 400 });
    }

    // PASSO A: Lojista clicou em conectar no painel. Gerar URL e redirecionar para a tela do Google.
    if (!code) {
        const scope = encodeURIComponent('https://www.googleapis.com/auth/business.manage openid profile email');
        const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&response_type=code&scope=${scope}&access_type=offline&prompt=consent&state=${storeId}`;
        return NextResponse.redirect(authUrl);
    }

    // PASSO B: Retorno do Google. Trocar o "code" recebido pelos Tokens de Acesso.
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

        // PASSO C: Salvar Tokens no documento de Settings do Tenant no Firestore
        const settingsRef = doc(db, 'settings', storeId);
        await setDoc(settingsRef, {
            integrations: {
                google_my_business: {
                    accessToken: tokenData.access_token,
                    refreshToken: tokenData.refresh_token || null, // Refresh Token só vem na 1ª vez que o cliente autoriza
                    expiresIn: tokenData.expires_in,
                    tokenType: tokenData.token_type,
                    connectedAt: new Date().toISOString(),
                    healthStatus: 'healthy'
                }
            }
        }, { merge: true });

        // PASSO D: Redirecionar o lojista de volta para o painel de administração da Velo Loja Virtual
        return NextResponse.redirect(`${protocol}://${host}/admin?tab=google_business&gmb_status=success`);

    } catch (error: any) {
        console.error('Erro na autenticação OAuth com Google Meu Negócio:', error);
        return NextResponse.redirect(`${protocol}://${host}/admin?tab=google_business&gmb_status=error`);
    }
}