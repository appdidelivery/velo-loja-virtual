import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  // Define a URL base dinamicamente (puxando da Vercel em Produção ou localhost em Dev)
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://app.velovarejo.com.br';

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // Impede que os robôs do Google indexem áreas privadas do lojista
      disallow: [
        '/admin/', 
        '/admin/financeiro/', 
        '/admin/prospeccao/', 
        '/login/'
      ],
    },
    // Aponta automaticamente para o Sitemap dinâmico que construímos no passo anterior
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}