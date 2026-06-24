import { NextResponse } from 'next/server';
import { db } from '@/services/firebase'; // Verifique se o caminho do seu Firebase Admin ou Client está correto aqui
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state'); // Este é o ID da loja (tenantId) que enviamos

  if (!code || !state) {
    return new Response("Faltam parâmetros do Mercado Pago (code ou state).", { status: 400 });
  }

  try {
    const storeId = state;
    const isLocal = req.headers.get('host')?.includes('localhost');
    
    // A URL que você configurou no painel do Desenvolvedor do MP
    const redirectUri = isLocal 
      ? 'http://localhost:3000/api/mp-callback' 
      : 'https://app.velodelivery.com.br/api/mp-callback'; // ⚠️ Mude para seu domínio real depois!

    // 1. Troca o 'code' pelo 'access_token' no Mercado Pago
    const mpResponse = await fetch('https://api.mercadopago.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        client_id: process.env.MP_CLIENT_ID, // Vai no seu .env.local
        client_secret: process.env.MP_CLIENT_SECRET, // Vai no seu .env.local
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: redirectUri
      })
    });

    const data = await mpResponse.json();

    if (!mpResponse.ok) {
      console.error("❌ Erro OAuth MP:", data);
      return new Response(`Erro ao gerar token: ${data.message || 'Desconhecido'}`, { status: 400 });
    }

    // 2. Salva as credenciais no Firestore atreladas à Loja correta
    await setDoc(doc(db, 'settings', storeId), {
      integrations: {
        mercadopago: {
          accessToken: data.access_token,
          refreshToken: data.refresh_token,
          publicKey: data.public_key,
          userId: data.user_id,
          expiresIn: data.expires_in,
          connectedAt: serverTimestamp()
        }
      }
    }, { merge: true });

    // 3. Redireciona o lojista de volta pro painel dele
    const returnUrl = isLocal ? 'http://localhost:3000/admin?mp_connected=true' : `https://${req.headers.get('host')}/admin?mp_connected=true`;
    return NextResponse.redirect(returnUrl);

  } catch (error: any) {
    console.error('❌ Erro no Callback do Mercado Pago:', error);
    return new Response('Erro interno do servidor', { status: 500 });
  }
}