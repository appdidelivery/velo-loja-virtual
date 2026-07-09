import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  const url = req.nextUrl;
  const hostname = req.headers.get('host') || '';

  // 1. Domínios Oficiais da Velo (Plataforma Mãe)
  const isMainPlatform = 
    hostname.includes('localhost:3000') || 
    hostname.includes('velovarejo.vercel.app') || 
    hostname === 'veloloja.com.br' || 
    hostname === 'www.veloloja.com.br';

  // 2. Libera rotas globais do sistema para funcionarem em QUALQUER domínio
  if (url.pathname.startsWith('/admin') || url.pathname.startsWith('/login') || url.pathname.startsWith('/api')) {
    return NextResponse.next();
  }

  // 3. Roteamento Mágico para Lojas com Domínio Próprio (White-label)
  if (!isMainPlatform) {
    // Se o cliente tentar acessar a raiz do site (Ex: app.mamedes.com.br/)
    if (url.pathname === '/') {
      let tenantId = hostname; // Tenta usar o próprio domínio como ID
      
      // Mapeamento "Hardcoded" para os seus clientes antigos não caírem
      if (hostname === 'app.mamedes.com.br') {
        tenantId = 'mamedes';
      } 
      else if (hostname === 'app.sacolaonline.com.br') {
        tenantId = 'app.sacolaonline.com.br'; // ID EXATO do documento no Firebase
      }

      // Reescreve a URL por baixo dos panos (A URL fica limpa, mas carrega o Catálogo!)
      return NextResponse.rewrite(new URL(`/${tenantId}`, req.url));
    }
  }

  return NextResponse.next();
}

// Configura o middleware para rodar em todas as rotas (menos imagens, arquivos e sistema interno)
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.png|.*\\.jpg|.*\\.svg).*)',
  ],
};