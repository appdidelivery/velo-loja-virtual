import CustomerCatalog from '@/components/CustomerCatalog';
import { Metadata } from 'next';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/services/firebase';

export async function generateMetadata({ params }: { params: { loja?: string } }): Promise<Metadata> {
  // TRAVA DE SEGURANÇA BÁSICA
  const tenantId = params?.loja || 'mamedes'; 
  const formattedStoreName = tenantId.replace(/-/g, ' ').toUpperCase();
  
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://app.mamedes.com.br';
  const domainUrl = `${baseUrl}/${tenantId}`;
  
  // Variáveis padrão de fallback (Caso a loja não tenha configurado nada ainda)
  let imageUrl = `${baseUrl}/velo loja virtual logo.png`;
  let siteTitle = `${formattedStoreName} | Catálogo Online`;
  let siteDescription = 'Faça seu orçamento ou pedido online de forma rápida, segura e prática.';

  // INTERCEPTAÇÃO NO FIREBASE: Busca as configurações reais da loja em milissegundos
  try {
    const tenantRef = doc(db, 'tenants', tenantId);
    const tenantSnap = await getDoc(tenantRef);
    
    if (tenantSnap.exists()) {
      const data = tenantSnap.data();
      if (data.logoUrl) imageUrl = data.logoUrl;
      if (data.businessName) siteTitle = `${data.businessName} | Catálogo Online`;
      if (data.slogan) siteDescription = data.slogan;
    }
  } catch (error) {
    console.error(`Erro ao buscar metadados para ${tenantId}:`, error);
  }

  return {
    title: siteTitle,
    description: siteDescription,
    metadataBase: new URL(baseUrl),
    icons: {
      icon: imageUrl,
      apple: imageUrl,
    },
    openGraph: {
      title: siteTitle,
      description: siteDescription,
      url: domainUrl,
      siteName: formattedStoreName,
      images: [
        {
          url: imageUrl, 
          width: 800,
          height: 600,
          alt: `Logo da loja ${formattedStoreName}`,
        },
      ],
      locale: 'pt_BR',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: siteTitle,
      description: siteDescription,
      images: [imageUrl],
    },
  };
}

export default function LojaDinamica({ params }: { params: { loja?: string } }) {
  // TRAVA DE SEGURANÇA TAMBÉM NO COMPONENTE
  const tenantId = params?.loja || 'mamedes';

  return (
    <main>
      <CustomerCatalog tenantId={tenantId} />
    </main>
  );
}