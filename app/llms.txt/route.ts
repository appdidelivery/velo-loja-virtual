import { NextResponse } from 'next/server';
import { db } from '@/services/firebase'; // Ajuste o caminho se a sua importação do db for diferente
import { doc, getDoc } from 'firebase/firestore';

export async function GET(request: Request) {
  try {
    // 1. Extração segura do Host no Next.js
    const url = new URL(request.url);
    const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || url.host;
    const hostname = host.split(':')[0];
    const protocol = request.headers.get('x-forwarded-proto') || 'https';
    const baseUrl = `${protocol}://${hostname}`;

    // 2. Lógica Multi-tenant (Igual ao projeto anterior, mas tipada)
    let storeId: string | null = null;
    const customDomains: Record<string, string> = {
      'convenienciasantaisabel.com.br': 'csi',
      'www.convenienciasantaisabel.com.br': 'csi',
    };

    if (customDomains[hostname]) {
      storeId = customDomains[hostname];
    } else {
      const parts = hostname.split('.');
      if (parts.length >= 2) {
        storeId = parts[0] === 'www' ? parts[1] : parts[0];
      }
    }

    // Identifica se é o Agregador
    const isAggregator = hostname === 'app.velovarejo.com.br' || hostname === 'localhost';

    // 3. Montagem do Conteúdo
    let title = "Velo Varejo";
    let description = "Plataforma de E-commerce e Catálogo Digital.";
    let llmsTxt = "";

    if (isAggregator) {
      // TEXTO DO AGREGADOR
      llmsTxt = `# ${title} Shopping

> ${description}

## Navegação Agêntica
Esta é a plataforma principal. Para acessar as lojas dos lojistas, navegue pelo diretório:
- [Página Inicial](${baseUrl}/)
- [Acessar Lojas](${baseUrl}/lojas)
`;
    } else {
      // TEXTO DA LOJA (Tenant)
      if (storeId) {
        const storeRef = doc(db, 'stores', storeId);
        const storeSnap = await getDoc(storeRef);
        
        if (storeSnap.exists()) {
          const storeData = storeSnap.data();
          title = storeData.name || title;
          description = storeData.description || storeData.slogan || description;
        }
      }

      llmsTxt = `# ${title}

> ${description}

## Sobre a Loja
Este é o catálogo digital oficial da loja ${title}. Operamos através da plataforma Velo Varejo.

## Estrutura de Navegação
- [Página Inicial e Vitrine](${baseUrl}/)
- [Carrinho de Compras](${baseUrl}/checkout)

## Informações Fatuais (E-E-A-T)
- **Operação:** E-commerce e Varejo Digital.
- **Domínio:** ${hostname}
`;
    }

    // 4. Retorno Nativo do Next.js com Cache Control para a Vercel
    return new NextResponse(llmsTxt, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=3600'
      },
    });

  } catch (error) {
    console.error("Erro na rota llms.txt:", error);
    return new NextResponse("# Velo Varejo\n\n> Plataforma de E-commerce", {
      status: 200,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }
}