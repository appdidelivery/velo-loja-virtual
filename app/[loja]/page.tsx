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

    let docSnap = null;

    const q = query(collection(db, 'tenants'), where('slug', '==', slugOrId));
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      docSnap = querySnapshot.docs[0];
    } else {
      const docRef = doc(db, 'tenants', slugOrId);
      const tempSnap = await getDoc(docRef);
      
      if (tempSnap.exists()) {
        docSnap = tempSnap;
      } else {
        const storeRef = doc(db, 'stores', slugOrId);
        const storeSnap = await getDoc(storeRef);
        if (storeSnap.exists()) {
          docSnap = storeSnap;
        }
      }
    }

    if (docSnap && docSnap.exists()) {
      const data = docSnap.data();
      
      const storeName = data.businessName || data.nome || 'Catálogo Virtual';
      const storeDescription = data.slogan || data.description || 'Faça seu pedido online.';
      const storeLogo = data.logoUrl || 'https://veloloja.com.br/velo-loja-virtual-logo.png'; // Sempre URL Absoluta
      const siteUrl = `https://www.veloloja.com.br/${slugOrId}`;

      return {
        metadataBase: new URL('https://www.veloloja.com.br'), // Resolve o bug do Vercel Favicon
        title: storeName,
        description: storeDescription,
        openGraph: { 
          title: storeName,
          description: storeDescription,
          url: siteUrl, // Resolve o aviso "og:url ausente" do Facebook
          siteName: storeName,
          type: 'website', // Resolve o aviso "og:type ausente" do Facebook
          images: [
            {
              url: storeLogo,
              width: 800,
              height: 600,
              alt: storeName,
            }
          ] 
        },
        twitter: {
          card: 'summary_large_image',
          title: storeName,
          description: storeDescription,
          images: [storeLogo],
        },
        icons: {
          icon: storeLogo, // Favicon dinâmico da loja
          shortcut: storeLogo,
          apple: storeLogo,
        }
      };
    }
  } catch (e) {
    console.error("Erro ao gerar SEO:", e);
  }

  return { 
    title: 'Catálogo Virtual', 
    description: 'Faça seu pedido online.',
    metadataBase: new URL('https://www.veloloja.com.br')
  };
}

// 2. RENDERIZAÇÃO DA PÁGINA
export default async function LojaPage({ params }: Props) {
  let tenantData = null;
  let tenantId = null; // O ID real e seguro do Firestore
  
  const resolvedParams = await params;
  const slugOrId = resolvedParams.loja;

  // PROTEÇÃO CIRÚRGICA: Permite domínios com ponto, mas bloqueia arquivos de sistema
  if (!slugOrId || slugOrId === 'favicon.ico' || slugOrId.endsWith('.png') || slugOrId.endsWith('.xml') || slugOrId.endsWith('.txt')) return null;

 try {
    const q = query(collection(db, 'tenants'), where('slug', '==', slugOrId));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      const docSnap = querySnapshot.docs[0];
      tenantData = docSnap.data();
      tenantId = docSnap.id;
    } else {
      const docRef = doc(db, 'tenants', slugOrId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        tenantData = docSnap.data();
        tenantId = docSnap.id;
      } else {
        const storeRef = doc(db, 'stores', slugOrId);
        const storeSnap = await getDoc(storeRef);
        
        if (storeSnap.exists()) {
          tenantData = storeSnap.data();
          tenantId = storeSnap.id;
        }
      }
    }
  } catch (e) {
    console.error("Erro ao carregar dados:", e);
  }

  if (!tenantId) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 text-gray-800 p-4 text-center">
        <h1 className="text-3xl font-bold mb-4">Loja não encontrada</h1>
        <p className="text-gray-600 max-w-md">
          Não conseguimos localizar o catálogo desta loja. Verifique se o endereço foi digitado corretamente ou se a loja ainda está ativa em nossa plataforma.
        </p>
      </div>
    );
  }

  return (
    <CustomerCatalog 
      tenantId={tenantId} // Passamos o ID Real para o Catálogo não quebrar
      initialData={tenantData} 
    />
  );
}