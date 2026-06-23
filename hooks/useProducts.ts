import { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, setDoc, deleteDoc, query } from 'firebase/firestore';
import { db } from '../services/firebase';
import { Product } from '../types';

export function useProducts(tenantId: string) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // 1. LER PRODUTOS EM TEMPO REAL (Isolado por Lojista/Tenant)
  useEffect(() => {
    if (!tenantId) return;
    
    // Caminho seguro no banco: tenants/ID_DA_LOJA/products
    const productsRef = collection(db, 'tenants', tenantId, 'products');
    const q = query(productsRef);

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
      setProducts(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [tenantId]);

  // 2. CRIAR PRODUTO NOVO
  const addProduct = async (productData: Omit<Product, 'id'>) => {
    const newId = `prod_${Date.now()}`;
    const docRef = doc(db, 'tenants', tenantId, 'products', newId);
    await setDoc(docRef, { ...productData, id: newId, tenantId });
  };

  // 3. ATUALIZAR PRODUTO EXISTENTE
  const updateProduct = async (productId: string, productData: Partial<Product>) => {
    const docRef = doc(db, 'tenants', tenantId, 'products', productId);
    await setDoc(docRef, productData, { merge: true });
  };

  // 4. APAGAR PRODUTO
  const deleteProduct = async (productId: string) => {
    const docRef = doc(db, 'tenants', tenantId, 'products', productId);
    await deleteDoc(docRef);
  };

  return { products, loading, addProduct, updateProduct, deleteProduct };
}