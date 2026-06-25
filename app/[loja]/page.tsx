import { Metadata } from 'next';
import CustomerCatalog from '../../components/CustomerCatalog';

export const dynamic = 'force-dynamic';
const PROJECT_ID = 'velo-loja-virtual'; // <- ID direto aqui também!

type Props = { params: { loja: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const tenantId = params.loja;
  
  let title = 'Velo Loja Virtual';
  let description = 'O melhor catálogo de produtos.';
  let logoUrl = 'https://app.velodelivery.com.br/velo%20loja%20virtual%20logo.png'; 

  try {
    // Bate na REST API usando o parâmetro dinâmico da loja
    const res = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/tenants/${tenantId}`, {
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
    console.error("Erro fatal ao buscar metadados para a loja:", error);
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

export default function LojaPage({ params }: Props) {
  return <CustomerCatalog tenantId={params.loja} />;
}