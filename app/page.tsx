import { Metadata } from 'next';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import CustomerCatalog from '../components/CustomerCatalog';

// 🔥 Mata o cache da Vercel para sempre ler do banco em tempo real
export const dynamic = 'force-dynamic';
const DEFAULT_TENANT_ID = 'mamedes'; 

export async function generateMetadata(): Promise<Metadata> {
  let title = 'Velo Loja Virtual';
  let description = 'O melhor catálogo de produtos.';
  let logoUrl = 'https://app.velodelivery.com.br/velo%20loja%20virtual%20logo.png';

  try {
    // 🌐 Usa o Firebase Oficial (Ele já tem suas chaves e o Google nunca bloqueia)
    const docRef = doc(db, 'tenants', DEFAULT_TENANT_ID);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      if (data.businessName) title = data.businessName;
      if (data.slogan) description = data.slogan;
      if (data.logoUrl) logoUrl = data.logoUrl;
    }
  } catch (error) {
    console.error("Erro ao buscar metadados no Firebase:", error);
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

export default async function HomePage() {
  let tenantData = null;
  
  try {
    const docRef = doc(db, 'tenants', DEFAULT_TENANT_ID);
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
    console.error("Erro ao pré-carregar loja no servidor:", e);
  }

  return (
    <main>
      <CustomerCatalog tenantId={DEFAULT_TENANT_ID} initialData={tenantData} />
    </main>
  );
}