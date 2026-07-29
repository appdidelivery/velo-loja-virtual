import { MetadataRoute } from 'next';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/services/firebase';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://veloloja.com.br';

  // Rotas fixas da sua plataforma
  const routes: MetadataRoute.Sitemap = [
    { url: `${baseUrl}`, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    { url: `${baseUrl}/login`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.8 },
    { url: `${baseUrl}/termos`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.5 },
    { url: `${baseUrl}/privacidade`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.5 }
  ];

  try {
    // Busca todas as lojas (tenants) no Firebase
    const tenantsSnap = await getDocs(collection(db, 'tenants'));
    
    tenantsSnap.forEach(doc => {
      const tenantData = doc.data();
      const slug = tenantData.slug || doc.id; // Usa o link personalizado ou o ID padrão

      // Rota 1: O Catálogo da Loja
      routes.push({
        url: `${baseUrl}/${slug}`,
        lastModified: new Date(),
        changeFrequency: 'daily',
        priority: 0.9,
      });

      // Rota 2: A Página de Avaliações da Loja
      routes.push({
        url: `${baseUrl}/${slug}/avaliacoes`,
        lastModified: new Date(),
        changeFrequency: 'weekly',
        priority: 0.7,
      });
    });
  } catch (error) {
    console.error("Erro ao gerar sitemap dinâmico:", error);
  }

  return routes;
}