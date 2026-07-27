import { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  // URL base de produção
  const baseUrl = 'https://veloloja.com.br'

  return [
    {
      url: `${baseUrl}`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1, // Prioridade MÁXIMA para o Google rastrear as novidades da Landing Page
    },
    {
      url: `${baseUrl}/login`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/termos`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/privacidade`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.5,
    }
  ]
}