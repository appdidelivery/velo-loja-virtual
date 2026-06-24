import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, addDoc, updateDoc, doc } from 'firebase/firestore';
import { db } from '../services/firebase'; // Verifique se o caminho do seu firebase.ts está correto aqui
import { Order, OrderStatus } from '../types';

export function useOrders(tenantId: string) {
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    if (!tenantId) return;
    
    // Busca pedidos apenas do lojista específico
    const q = query(collection(db, 'orders'), where('tenantId', '==', tenantId));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ordersData: Order[] = [];
      snapshot.forEach((doc) => {
        ordersData.push({ id: doc.id, ...doc.data() } as Order);
      });
      // Ordena do mais recente pro mais antigo
      ordersData.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setOrders(ordersData);
    });

    return () => unsubscribe();
  }, [tenantId]);

  // Função para a Vitrine criar o pedido
  const addOrder = async (order: Omit<Order, 'id'>) => {
    try {
      await addDoc(collection(db, 'orders'), order);
    } catch (error) {
      console.error("Erro ao salvar pedido:", error);
    }
  };

  // Função para o Painel Admin atualizar o status (Pendente -> Pago -> Enviado)
  const updateStatus = async (orderId: string, status: OrderStatus) => {
    try {
      const orderRef = doc(db, 'orders', orderId);
      await updateDoc(orderRef, { status });
    } catch (error) {
      console.error("Erro ao atualizar pedido:", error);
    }
  };

  return { orders, addOrder, updateStatus };
}