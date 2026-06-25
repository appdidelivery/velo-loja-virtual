import { Metadata } from 'next';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import CustomerCatalog from '../../components/CustomerCatalog';

type Props = {
  params: { loja: string };
};

// Next.js: Geração Dinâmica de SEO, Favicon e WhatsApp (Open Graph)
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const tenantId = params.loja;
  
  // 1. Valores Padrão (Fallback caso a loja não tenha configurado logo/nome ainda)
  let title = 'Velo Loja Virtual';
  let description = 'O melhor catálogo de produtos.';
  // IMPORTANTE: O WhatsApp exige uma URL absoluta (https://...) para mostrar a imagem.
  let logoUrl = 'https://app.velodelivery.com.br/velo%20loja%20virtual%20logo.png'; 

  try {
    // 2. Bate no Firebase ANTES da tela renderizar
    const docRef = doc(db, 'tenants', tenantId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      
      // 3. Substitui pelos dados reais do Painel do Lojista
      if (data.businessName) title = data.businessName;
      if (data.slogan) description = data.slogan;
      if (data.logoUrl) logoUrl = data.logoUrl; // O link do Cloudinary já é https://
    }
  } catch (error) {
    console.error("Erro ao buscar metadados dinâmicos para a loja:", error);
  }

  // 4. Injeta as tags na cabeça ( <head> ) do HTML
  return {
    title: title,
    description: description,
    icons: {
      icon: logoUrl, // Muda o Favicon lá na aba do Chrome
      shortcut: logoUrl,
      apple: logoUrl,
    },
    openGraph: {
      title: title,
      description: description,
      siteName: title,
      // O WhatsApp lê este array 'images' para criar aquele card de pré-visualização
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

// Renderiza a Vitrine passando o ID da loja
export default function LojaPage({ params }: Props) {
  return <CustomerCatalog tenantId={params.loja} />;
}