import { Metadata } from 'next';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import CustomerCatalog from '../../components/CustomerCatalog';

export const dynamic = 'force-dynamic';

type Props = { params: { loja: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const tenantId = params.loja;
  
  let title = 'Velo Loja Virtual';
  let description = 'O melhor catálogo de produtos.';
  let logoUrl = 'https://app.velodelivery.com.br/velo%20loja%20virtual%20logo.png'; 

  try {
    const docRef = doc(db, 'tenants', tenantId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      if (data.businessName) title = data.businessName;
      if (data.slogan) description = data.slogan;
      if (data.logoUrl) logoUrl = data.logoUrl;
    }
  } catch (error) {
    console.error(`Erro ao buscar metadados para a loja ${tenantId}:`, error);
  }

  return {
    title: title,
    description: description,
    icons: { icon: logoUrl, shortcut: logoUrl, apple: logoUrl },
    openGraph: {
      title: title,
      description: description,
      siteName: title,
      images: [{ url: logoUrl, width: 800, height: 800, alt: `Logomarca da loja ${title}` }],
      locale: 'pt_BR',
      type: 'website',
    }
  };
}

export default async function LojaPage({ params }: Props) {
  let tenantData = null;
  
  try {
    const docRef = doc(db, 'tenants', params.loja);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      tenantData = {
        businessName: data.businessName || null,
        slogan: data.slogan || null,
        logoUrl: data.logoUrl || null,
        primaryColor: data.primaryColor || null,
        whatsappNumber: data.whatsappNumber || null,
        productLayout: data.productLayout || null,
      };
    }
  } catch (e) {
    console.error("Erro ao pré-carregar loja dinâmica no servidor:", e);
  }

  return <CustomerCatalog tenantId={params.loja} initialData={tenantData} />;
}