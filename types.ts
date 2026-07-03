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
  tenantId: string;
  ean?: string;
  ncm?: string;
  weight?: number;
  seoTitle?: string;
  seoDescription?: string;
  variations?: any[]; // 🔥 Adicionado para o TypeScript parar de chiar
  images?: string[];  // 🔥 Adicionado para a galeria de imagens
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

// --- INTEGRAÇÕES ---
export interface GoogleBusinessProfileIntegration {
  accessToken: string;
  refreshToken: string | null;
  expiresIn: number;
  tokenType: string;
  connectedAt: string;
  locationId?: string;
  accountId?: string;
  healthStatus: 'healthy' | 'degraded' | 'offline';
}

export interface TenantSettings {
  tenantId: string;
  businessName: string;
  integrations?: {
    google_my_business?: GoogleBusinessProfileIntegration;
    [key: string]: any; // Mantém compatibilidade com outras integrações que você já possua
  };
  customDomain?: string;
  whatsappNumber: string;
  currency: string;
  paymentGateway: 'stripe' | 'mercadopago' | 'whatsapp_only';
  storeMode?: string;
  maintenanceMode?: boolean;
}