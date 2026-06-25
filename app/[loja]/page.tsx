import { Metadata } from 'next';
import CustomerCatalog from '../../components/CustomerCatalog';

export const dynamic = 'force-dynamic';
const PROJECT_ID = 'velo-loja-virtual';

type Props = { params: { loja: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const tenantId = params.loja;
  
  let title = 'Loja Online';
  let description = 'Catálogo de Produtos';
  let logoUrl = 'https://app.velodelivery.com.br/velo%20loja%20virtual%20logo.png'; 

  try {
    // 🔥 Puxa a chave da Vercel / .env.local
    const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
    
    // 🌐 Bate na REST API enviando a Chave (?key=) para o Google não bloquear!
    const res = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/tenants/${tenantId}?key=${apiKey}`, {
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
      console.error("Firebase REST falhou:", await res.text());
    }
  } catch (error) {
    console.error("Erro na API REST:", error);
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

export default async function LojaPage({ params }: Props) {
  let tenantData = null;
  
  try {
    const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
    const res = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/tenants/${params.loja}?key=${apiKey}`, {
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

  return <CustomerCatalog tenantId={params.loja} initialData={tenantData} />;
}