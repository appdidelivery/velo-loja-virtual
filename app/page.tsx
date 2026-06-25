import { Metadata } from 'next';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import CustomerCatalog from '../components/CustomerCatalog';

export const dynamic = 'force-dynamic';
const DEFAULT_TENANT_ID = 'mamedes'; 

export async function generateMetadata(): Promise<Metadata> {
  // O seu Plano B (Caso o banco de dados falhe ou o lojista não tenha configurado)
  let title = 'Catálogo Digital | Velo Varejo';
  let description = 'Faça seu pedido diretamente pelo nosso site de forma rápida e segura.';
  let logoUrl = 'https://app.velodelivery.com.br/velo%20loja%20virtual%20logo.png';

  try {
    // 🔥 Agora sim! Usa a SUA conexão do Firebase (já autenticada pelas chaves)
    const docRef = doc(db, 'tenants', DEFAULT_TENANT_ID);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      // Substitui o Plano B pelos dados reais do cliente
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

export default function HomePage() {
  return (
    <main>
      <CustomerCatalog tenantId={DEFAULT_TENANT_ID} />
    </main>
  );
}