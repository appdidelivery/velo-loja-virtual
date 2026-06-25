import { Metadata } from 'next';
import { doc, getDoc } from 'firebase/firestore';
// Ajuste o caminho do Firebase conforme sua estrutura real, ex: '@/services/firebase' ou '../../services/firebase'
import { db } from '../../services/firebase'; 
// Ajuste o caminho do Componente da Vitrine conforme sua estrutura real
import CustomerCatalog from '../../components/CustomerCatalog';

type Props = {
  params: { loja: string };
};

// Next.js App Router: Geração de Metadata Dinâmica
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const tenantId = params.loja;
  
  // Valores Fallback/Padrão caso dê algum erro
  let title = 'Velo Loja Virtual';
  let description = 'Catálogo Exclusivo';
  let logoUrl = '/favicon.ico';

  try {
    const docRef = doc(db, 'tenants', tenantId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      // Puxa os dados reais salvos no Painel
      title = data.businessName || title;
      description = data.slogan || description;
      logoUrl = data.logoUrl || logoUrl;
    }
  } catch (error) {
    console.error("Erro ao buscar metadados para SEO/WhatsApp:", error);
  }

  return {
    title: title,
    description: description,
    openGraph: {
      title: title,
      description: description,
      url: `https://seu-dominio.com.br/${tenantId}`, // MUDE PARA O SEU DOMÍNIO REAL
      siteName: title,
      images: [
        {
          url: logoUrl, // Esta imagem vai aparecer no WhatsApp!
          width: 800,
          height: 800,
          alt: `Logo da loja ${title}`,
        },
      ],
      locale: 'pt_BR',
      type: 'website',
    },
    icons: {
      icon: logoUrl,
      shortcut: logoUrl,
      apple: logoUrl,
    },
  };
}

export default function LojaPage({ params }: Props) {
  return <CustomerCatalog tenantId={params.loja} />;
}