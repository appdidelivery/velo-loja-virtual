import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../services/firebase'; 
import CustomerCatalog from '../../components/CustomerCatalog'; 
import { Metadata } from 'next';

type Props = {
  params: Promise<{ loja: string }>;
};

// 1. GERAÇÃO DE SEO DINÂMICO
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    const resolvedParams = await params;
    const slugOrId = resolvedParams.loja;

    // Tenta achar por slug primeiro
    const q = query(collection(db, 'tenants'), where('slug', '==', slugOrId));
    const querySnapshot = await getDocs(q);
    
    let docSnap;
    if (!querySnapshot.empty) {
      docSnap = querySnapshot.docs[0];
    } else {
      // Se não achar por slug, tenta pelo ID direto
      const docRef = doc(db, 'tenants', slugOrId);
      docSnap = await getDoc(docRef);
    }

    if (docSnap && docSnap.exists()) {
      const data = docSnap.data();
      return {
        title: `${data.businessName || 'Loja'} | Velo Loja Virtual`,
        description: data.slogan || 'Faça seu pedido online.',
        openGraph: { images: [data.logoUrl || ''] },
      };
    }
  } catch (e) {
    console.error("Erro ao gerar SEO:", e);
  }

  return { title: 'Velo Loja Virtual', description: 'Catálogo de Produtos' };
}

// 2. RENDERIZAÇÃO DA PÁGINA
export default async function LojaPage({ params }: Props) {
  let tenantData = null;
  let tenantId = null; // O ID real e seguro do Firestore
  
  const resolvedParams = await params;
  const slugOrId = resolvedParams.loja;

  if (!slugOrId || slugOrId === 'favicon.ico' || slugOrId.includes('.')) return null;

  try {
    // 1. MÁGICA: Tenta buscar pelo Link Amigável (Slug)
    const q = query(collection(db, 'tenants'), where('slug', '==', slugOrId));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      const docSnap = querySnapshot.docs[0];
      tenantData = docSnap.data();
      tenantId = docSnap.id; // Desvenda o ID real!
    } else {
      // 2. Fallback: Se não tem slug, tenta pelo ID direto
      const docRef = doc(db, 'tenants', slugOrId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        tenantData = docSnap.data();
        tenantId = docSnap.id;
      }
    }
  } catch (e) {
    console.error("Erro ao carregar dados:", e);
  }

  if (!tenantId) return null; // Loja não existe

  return (
    <CustomerCatalog 
      tenantId={tenantId} // Passamos o ID Real para o Catálogo não quebrar
      initialData={tenantData} 
    />
  );
}