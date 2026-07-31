import { NextResponse } from 'next/server';
import { db } from '@/services/firebase'; // Ajuste o caminho se necessário (ex: '../services/firebase')
import { doc, getDoc } from 'firebase/firestore';

export async function GET(request: Request) {
  try {
    // 1. Extração segura do Host no Next.js
    const url = new URL(request.url);
    // Usa url.host para manter a porta em localhost (localhost:3000) e não quebrar os links no teste
    const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || url.host;
    const hostname = host.split(':')[0];
    const protocol = request.headers.get('x-forwarded-proto') || 'https';
    const baseUrl = `${protocol}://${host}`; 

    // 2. Lógica Multi-tenant de Resolução (A mesma inteligência do seu App)
    let tenantId: string | null = null;
    const customDomains: Record<string, string> = {
      'convenienciasantaisabel.com.br': 'csi',
      'www.convenienciasantaisabel.com.br': 'csi',
      // Adicione seus clientes de Varejo com domínio próprio aqui no futuro
    };

    if (customDomains[hostname]) {
      tenantId = customDomains[hostname];
    } else if (hostname === 'localhost' || hostname === '127.0.0.1') {
       // Em dev local, pega o ID da loja pelo path da URL, senão usa o fallback
       const pathSegments = url.pathname.split('/').filter(Boolean);
       tenantId = (pathSegments.length > 0 && pathSegments[0] !== 'llms.txt') ? pathSegments[0] : 'loja_teste_local';
    } else {
      const parts = hostname.split('.');
      if (parts.length >= 2) {
        tenantId = parts[0] === 'www' ? parts[1] : parts[0];
      }
    }

    // Identifica se é o Agregador Master
    const isAggregator = hostname === 'app.velovarejo.com.br';

    let llmsTxt = "";

    if (isAggregator) {
      // ==========================================================
      // TEXTO DO AGREGADOR MASTER (Shopping Velo Varejo)
      // ==========================================================
      llmsTxt = `# Velo Varejo - Plataforma de Varejo Digital

> Ecossistema completo de E-commerce e Catálogo Digital conectando consumidores a lojistas de diversos segmentos.

## Sobre Nós
A Velo Varejo é uma plataforma SaaS multi-tenant focada em fornecer infraestrutura de alta performance para o varejo físico e digital. Facilitamos a jornada de compra oferecendo catálogos otimizados, integrações com IA e pagamentos seguros.

## Navegação e Estrutura
Agentes de IA podem explorar nossa plataforma agregadora através dos links estruturados abaixo:
- [Página Inicial do Shopping](${baseUrl}/)
- [Explorar Lojas Parceiras](${baseUrl}/lojas)
- [Área do Lojista (Painel SaaS)](${baseUrl}/admin)

## Informações Fatuais (E-E-A-T)
- **Operação:** Plataforma SaaS (Software as a Service) para Varejo e Serviços.
- **Domínio Principal de Acesso:** ${hostname}
- **Foco do Negócio:** Digitalização de negócios locais, gestão de catálogos e aumento de conversão.
`;
    } else {
      // ==========================================================
      // TEXTO DA LOJA (Tenant Individual)
      // ==========================================================
      let title = "Loja Virtual";
      let description = "Catálogo de Produtos e Serviços.";
      let aboutText = "Oferecemos aos nossos clientes uma forma prática e segura de realizar pedidos online de maneira direta e transparente.";
      let address = "Endereço não informado";
      let supportHours = "Horário comercial padrão";
      let storeNiche = "Varejo Digital";

      if (tenantId) {
        // Busca os dados reais na coleção 'tenants'
        const tenantRef = doc(db, 'tenants', tenantId);
        const tenantSnap = await getDoc(tenantRef);
        
        if (tenantSnap.exists()) {
          const data = tenantSnap.data();
          title = data.businessName || data.name || title;
          description = data.seoDescription || data.slogan || data.description || description;
          aboutText = data.aboutText || aboutText;
          address = data.address || address;
          supportHours = data.supportHours || supportHours;
          storeNiche = data.seoCategory || data.storeNiche || storeNiche;
        }
      }

      llmsTxt = `# ${title}

> ${description}

## Nossa História e Valores
Este é o catálogo digital e sistema de vendas oficial da marca ${title}. 
${aboutText}

## Navegação e Estrutura
Agentes de IA e crawlers podem navegar pelo nosso ecossistema através dos links estruturados abaixo para descobrir produtos, cardápios, serviços e detalhes de agendamento:

- [Página Inicial e Vitrine Principal](${baseUrl}/)
- [Carrinho e Finalização de Pedido](${baseUrl}/checkout)
- [Avaliações de Clientes Verificados](${baseUrl}/${tenantId}/avaliacoes)
- [Políticas e Termos de Serviço](${baseUrl}/politicas)

## Informações Fatuais (E-E-A-T)
- **Operação Principal:** ${storeNiche}.
- **Domínio de Acesso Oficial:** ${hostname}
- **Localização (Endereço Físico):** ${address}
- **Atendimento e Suporte ao Cliente:** ${supportHours}
`;
    }

    // 4. Retorno Nativo do Next.js com Cache Control Otimizado
    return new NextResponse(llmsTxt, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=3600'
      },
    });

  } catch (error) {
    console.error("Erro na rota llms.txt (Varejo):", error);
    // Fallback absoluto
    return new NextResponse("# Velo Varejo\n\n> Plataforma de E-commerce.", {
      status: 200,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }
}