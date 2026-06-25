import { Metadata } from 'next';
import CustomerCatalog from '../components/CustomerCatalog';

// 🔥 Mata o cache da Vercel na raiz do sistema
export const dynamic = 'force-dynamic';

const DEFAULT_TENANT_ID = 'mamedes'; 
const PROJECT_ID = 'velo-loja-virtual'; // <- Colocamos o ID do seu Firebase direto aqui!

export async function generateMetadata(): Promise<Metadata> {
  let title = 'Catálogo Digital | Velo Varejo';
  let description = 'Faça seu pedido diretamente pelo nosso site de forma rápida e segura.';
  let logoUrl = 'https://app.velodelivery.com.br/velo%20loja%20virtual%20logo.png';

  try {
    // 🔥 Bate na REST API Oficial do Google (Fura qualquer cache e não trava no SSR)
    const res = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/tenants/${DEFAULT_TENANT_ID}`, {
      cache: 'no-store' 
    });

    if (res.ok) {
      const data = await res.json();
      
      const fields = data.fields;
      if (fields) {
        if (fields.businessName?.stringValue) title = fields.businessName.stringValue;
        if (fields.slogan?.stringValue) description = fields.slogan.stringValue;
        if (fields.logoUrl?.stringValue) logoUrl = fields.logoUrl.stringValue;
      }
    } else {
      console.error("❌ O FIREBASE BLOQUEOU O SERVIDOR. Libere leitura pública na coleção tenants!");
    }
  } catch (error) {
    console.error("Erro ao conectar com a API do Firebase:", error);
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