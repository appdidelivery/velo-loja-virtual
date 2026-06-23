export type OrderStatus = 'pending' | 'paid' | 'delivered';
export type PaymentStatus = 'pending' | 'approved';

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  category: string;
  stock: number;
  sku: string;
  isActive: boolean;
  tenantId?: string;
  // Novos campos Fiscais e Logísticos
  ean?: string; // Código de Barras (GTIN) obrigatório para Google Shopping
  ncm?: string; // Nomenclatura Comum do Mercosul para NFe
  weight?: number; // Peso em KG
  // Novos campos de SEO
  seoTitle?: string;
  seoDescription?: string;
}

export interface Order {
  id: string;
  customerName: string;
  customerPhone: string;
  items: { productId: string; name: string; price: number; quantity: number }[];
  total: number;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentLink?: string;
  createdAt: string;
  tenantId: string;
  notes?: string;
}

export interface ChatMessage {
  id: string;
  sender: 'merchant' | 'customer';
  text: string;
  timestamp: string;
  type: 'text' | 'order_summary' | 'payment_link';
  metadata?: {
    orderId?: string;
    total?: number;
    paymentUrl?: string;
    itemsCount?: number;
  };
}

export interface ChatSession {
  id: string;
  customerPhone: string;
  customerName: string;
  lastMessage: string;
  unread: boolean;
  updatedAt: string;
  messages: ChatMessage[];
  tenantId: string;
}

export interface TenantSettings {
  tenantId: string;
  businessName: string;
  whatsappNumber: string;
  currency: string;
  paymentGateway: 'stripe' | 'mercadopago' | 'whatsapp_only';
}