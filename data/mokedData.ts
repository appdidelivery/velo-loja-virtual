import { Product, Order, ChatSession, TenantSettings } from '@/types';

export const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'prod_1',
    name: 'Fone de Ouvido Bluetooth Pro',
    description: 'Fone com cancelamento de ruído ativo e bateria de 24h.',
    price: 299.90,
    imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&q=80&w=600',
    category: 'Eletrônicos',
    stock: 45,
    sku: 'FNB-001',
    isActive: true,
    tenantId: 'tenant_abc123'
  },
  {
    id: 'prod_2',
    name: 'Garrafa Térmica Inox 1L',
    description: 'Mantém a temperatura por até 12h quente ou 24h frio.',
    price: 89.90,
    imageUrl: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&q=80&w=600',
    category: 'Cozinha',
    stock: 150,
    sku: 'GAR-003',
    isActive: true,
    tenantId: 'tenant_abc123'
  }
];

export const INITIAL_ORDERS: Order[] = [
  {
    id: 'ORD_9482',
    customerName: 'Carlos Silva',
    customerPhone: '+5511999991111',
    items: [
      { productId: 'prod_1', name: 'Fone de Ouvido Bluetooth Pro', price: 299.90, quantity: 1 }
    ],
    total: 299.90,
    status: 'paid',
    paymentStatus: 'approved',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    tenantId: 'tenant_abc123',
    notes: 'Cliente solicitou entrega expressa.'
  }
];

export const INITIAL_CHATS: ChatSession[] = [
  {
    id: 'chat_1',
    customerName: 'Mariana Costa',
    customerPhone: '+5511977773333',
    lastMessage: 'Queria saber se tem desconto à vista no fone.',
    unread: true,
    updatedAt: new Date().toISOString(),
    tenantId: 'tenant_abc123',
    messages: [
      {
        id: 'msg_1',
        sender: 'customer',
        text: 'Olá, bom dia! Queria saber se tem desconto à vista no fone.',
        timestamp: new Date().toISOString(),
        type: 'text'
      }
    ]
  }
];

export const INITIAL_SETTINGS: TenantSettings = {
  tenantId: 'tenant_abc123',
  businessName: 'Velo Loja Virtual',
  whatsappNumber: '+5511999998888',
  currency: 'BRL',
  paymentGateway: 'stripe'
};