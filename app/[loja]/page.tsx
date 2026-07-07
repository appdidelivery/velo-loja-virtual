import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../services/firebase'; 
import CustomerCatalog from '../../components/CustomerCatalog'; 
import { Metadata } from 'next';
import { TEMPLATES } from '../../data/templatesConfig';

// No Next.js 15, os params são uma Promise. Precisamos tipar corretamente.
type Props = {
  params: Promise<{ loja: string }>;
};

// 1. GERAÇÃO DE SEO DINÂMICO NO SERVIDOR (Lê o banco antes de enviar pro Google)
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    // Desempacotando a Promise do Next.js 15
    const resolvedParams = await params;
    const tenantId = resolvedParams.loja;

    const docRef = doc(db, 'tenants', tenantId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        title: `${data.businessName || 'Loja'} | Velo Loja Virtual`,
        description: data.slogan || 'Faça seu pedido online.',
        openGraph: {
          images: [data.logoUrl || ''],
        },
      };
    }
  } catch (e) {
    console.error("Erro ao gerar SEO:", e);
  }

  return {
    title: 'Velo Loja Virtual',
    description: 'Catálogo de Produtos e Serviços',
  };
}

// 2. RENDERIZAÇÃO DA PÁGINA (Injeta os dados na vitrine do cliente)
export default async function LojaPage({ params }: Props) {
  let tenantData = null;
  
  // Desempacotando a Promise do Next.js 15
  const resolvedParams = await params;
  const tenantId = resolvedParams.loja;

  // Blindagem: Impede o navegador de procurar uma loja chamada "favicon.ico"
  if (!tenantId || tenantId === 'favicon.ico') {
    return null;
  }

  try {
    const docRef = doc(db, 'tenants', tenantId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      tenantData = docSnap.data();
    }
  } catch (e) {
    console.error("Erro ao carregar dados da loja no servidor:", e);
  }

  return (
    <CustomerCatalog 
      tenantId={tenantId} 
      initialData={tenantData} 
    />
  );
}