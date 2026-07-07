import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  const url = req.nextUrl;
  const hostname = req.headers.get('host') || '';

  // Domínios do seu SaaS (Que não são de clientes)
  const isMainPlatform = 
    hostname.includes('localhost:3000') || 
    hostname.includes('velovarejo.vercel.app') || 
    hostname === 'veloloja.com.br' || 
    hostname === 'www.veloloja.com.br';

  // Libera o acesso ao painel e login normalmente
  if (url.pathname.startsWith('/admin') || url.pathname.startsWith('/login')) {
    return NextResponse.next();
  }

  // === ROTEAMENTO MÁGICO MULTILOJA ===
  if (!isMainPlatform) {
    let tenantId = 'tenant_generico'; // Fallback
    
    // Aqui você vai adicionando seus futuros clientes
    if (hostname === 'app.mamedespapeis.com.br') {
      tenantId = 'tenant_mamedes123';
    } 
    else if (hostname === 'app.lojaexemplo.com.br') {
      tenantId = 'tenant_exemplo999';
    }

    // Reescreve a URL por baixo dos panos (O cliente vê o domínio dele, mas o Next.js carrega a pasta /[loja])
    return NextResponse.rewrite(new URL(`/${tenantId}`, req.url));
  }

  return NextResponse.next();
}

// Configura o middleware para rodar em todas as rotas (menos imagens e sistema interno)
export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.png|.*\\.svg).*)',
  ],
};