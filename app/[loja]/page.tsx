import CustomerCatalog from '@/components/CustomerCatalog';
import { Metadata } from 'next';

export async function generateMetadata({ params }: { params: { loja: string } }): Promise<Metadata> {
  const tenantId = params.loja; 
  const formattedStoreName = tenantId.replace(/-/g, ' ').toUpperCase();
  
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://app.mamedes.com.br';
  const domainUrl = `${baseUrl}/${tenantId}`;
  const imageUrl = `${baseUrl}/velo loja virtual logo.png`;

  return {
    title: `${formattedStoreName} | Catálogo Online`,
    description: 'Faça seu orçamento ou pedido online de forma rápida, segura e prática.',
    metadataBase: new URL(baseUrl),
    openGraph: {
      title: `${formattedStoreName} | Catálogo de Produtos`,
      description: 'Acesse nosso catálogo e faça seu pedido direto pelo WhatsApp.',
      url: domainUrl,
      siteName: formattedStoreName,
      images: [
        {
          url: imageUrl, 
          width: 800,
          height: 600,
          alt: `Logo ${formattedStoreName}`,
        },
      ],
      locale: 'pt_BR',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${formattedStoreName} | Loja Virtual`,
      description: 'Acesse nosso catálogo online.',
      images: [imageUrl],
    },
  };
}

export default function LojaDinamica({ params }: { params: { loja: string } }) {
  return (
    <main>
      <CustomerCatalog tenantId={params.loja} />
    </main>
  );
}