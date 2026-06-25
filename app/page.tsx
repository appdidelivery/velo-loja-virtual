import { Metadata } from 'next';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import CustomerCatalog from '../components/CustomerCatalog';

// 🔥 MÁGICA AQUI: Obriga o Next.js a NUNCA fazer cache desta página, sempre buscando do Firebase no carregamento!
export const dynamic = 'force-dynamic';

// Aqui definimos qual é a loja principal que deve carregar quando alguém acessa apenas a raiz (/)
const DEFAULT_TENANT_ID = 'mamedes'; 

export async function generateMetadata(): Promise<Metadata> {
  // Valores genéricos caso falhe
  let title = 'Catálogo Digital | Velo Varejo';
  let description = 'Faça seu pedido diretamente pelo nosso site de forma rápida e segura.';
  let logoUrl = 'https://app.velodelivery.com.br/velo%20loja%20virtual%20logo.png';

  try {
    // Bate no Firebase para pegar a logo e nome reais ANTES da página carregar
    const docRef = doc(db, 'tenants', DEFAULT_TENANT_ID);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      if (data.businessName) title = data.businessName;
      if (data.slogan) description = data.slogan;
      if (data.logoUrl) logoUrl = data.logoUrl;
    }
  } catch (error) {
    console.error("Erro ao buscar metadados dinâmicos para a raiz:", error);
  }

  return {
    title: title,
    description: description,
    icons: {
      icon: logoUrl,
      shortcut: logoUrl,
      apple: logoUrl,
    },
    openGraph: {
      title: title,
      description: description,
      siteName: title,
      images: [
        {
          url: logoUrl, 
          width: 800,
          height: 800,
          alt: `Logomarca da loja ${title}`,
        },
      ],
      locale: 'pt_BR',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: title,
      description: description,
      images: [logoUrl],
    }
  };
}

export default function HomePage() {
  return (
    <main>
      <CustomerCatalog tenantId={DEFAULT_TENANT_ID} />
    </main>
  );
}