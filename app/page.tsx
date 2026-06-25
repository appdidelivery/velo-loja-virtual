import { Metadata } from 'next';
import CustomerCatalog from '../components/CustomerCatalog';

// 🔥 Mata o cache da Vercel e obriga a ler do banco de dados na hora
export const dynamic = 'force-dynamic';

const DEFAULT_TENANT_ID = 'mamedes'; 
const PROJECT_ID = 'velo-loja-virtual'; // ID do Firebase cravado para o TypeScript não reclamar

export async function generateMetadata(): Promise<Metadata> {
  let title = 'Catálogo Digital | Velo Varejo';
  let description = 'Faça seu pedido diretamente pelo nosso site de forma rápida e segura.';
  let logoUrl = 'https://app.velodelivery.com.br/velo%20loja%20virtual%20logo.png';

  try {
    // 🌐 Bate na REST API do Google via 'fetch' (Isso nunca trava no servidor da Vercel)
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
    }
  } catch (error) {
    console.error("Erro na API do Firebase:", error);
  }

  return {
    title: title,
    description: description,
    icons: { icon: logoUrl, shortcut: logoUrl, apple: logoUrl },
    openGraph: {
      title: title,
      description: description,
      siteName: title,
      images: [{ url: logoUrl, width: 800, height: 800, alt: `Logomarca ${title}` }],
      locale: 'pt_BR',
      type: 'website',
    }
  };
}

export default async function HomePage() {
  let tenantData = null;
  
  try {
    const res = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/tenants/${DEFAULT_TENANT_ID}`, {
      cache: 'no-store' 
    });

    if (res.ok) {
      const data = await res.json();
      const fields = data.fields;
      if (fields) {
        tenantData = {
          businessName: fields.businessName?.stringValue || null,
          slogan: fields.slogan?.stringValue || null,
          logoUrl: fields.logoUrl?.stringValue || null,
          primaryColor: fields.primaryColor?.stringValue || null,
          whatsappNumber: fields.whatsappNumber?.stringValue || null,
          productLayout: fields.productLayout?.stringValue || null,
        };
      }
    }
  } catch (e) {
    console.error("Erro ao pré-carregar loja:", e);
  }

  return (
    <main>
      <CustomerCatalog tenantId={DEFAULT_TENANT_ID} initialData={tenantData} />
    </main>
  );
}