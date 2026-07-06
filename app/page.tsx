import { Metadata } from 'next';
import { headers } from 'next/headers';
import { doc, getDoc } from 'firebase/firestore';
import { TEMPLATES } from '../data/templatesConfig';
import { db } from '../services/firebase';
import CustomerCatalog from '../components/CustomerCatalog';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  // 🔥 Espera os cabeçalhos carregarem (Proteção Next.js 15)
  const headersList = await headers();
  const host = headersList.get('host') || '';
  
  // Regra da Mamedes (Legado)
  const tenantId = (host === 'app.mamedes.com.br' || host.includes('localhost') || host === 'mamedes') ? 'mamedes' : host;
  
  let title = 'Loja Virtual';
  let description = 'Catálogo B2B e E-commerce.';
  let logoUrl = '/velo loja virtual logo.png'; 

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
      images: [{ url: logoUrl, width: 800, height: 800, alt: title }],
      locale: 'pt_BR',
      type: 'website',
    }
  };
}

export default async function HomePage() {
  let tenantData = null;
  
  // 🔥 Espera os cabeçalhos carregarem (Proteção Next.js 15)
  const headersList = await headers();
  const host = headersList.get('host') || '';
  
  // Regra da Mamedes (Legado)
  const tenantId = (host === 'app.mamedes.com.br' || host.includes('localhost') || host === 'mamedes') ? 'mamedes' : host;
  
  try {
    const docRef = doc(db, 'tenants', tenantId);
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

  // Entrega os dados mastigados e REAIS para a Vitrine
  return <CustomerCatalog tenantId={tenantId} initialData={tenantData} />;
}