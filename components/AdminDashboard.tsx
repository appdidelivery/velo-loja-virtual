import React, { useState } from 'react';
import { 
  ShoppingBag, 
  Settings, 
  MessageSquare, 
  Plus, 
  Edit2, 
  Trash2, 
  Search, 
  CheckCircle2, 
  DollarSign, 
  Eye, 
  User, 
  Sparkles,
  Layers, 
  AlertCircle, 
  Send, 
  HelpCircle,
  FileCheck,
  Percent,
  TrendingUp,
  X,
  CreditCard
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Product, Order, ChatSession, TenantSettings, OrderStatus, PaymentStatus } from '../types';

interface AdminDashboardProps {
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  orders: Order[];
  setOrders: React.Dispatch<React.SetStateAction<Order[]>>;
  chats: ChatSession[];
  setChats: React.Dispatch<React.SetStateAction<ChatSession[]>>;
  settings: TenantSettings;
  setSettings: React.Dispatch<React.SetStateAction<TenantSettings>>;
}

export default function AdminDashboard({
  products,
  setProducts,
  orders,
  setOrders,
  chats,
  setChats,
  settings,
  setSettings
}: AdminDashboardProps) {
  // Navigation tabs
  const [activePanel, setActivePanel] = useState<'dashboard' | 'products' | 'orders' | 'chats' | 'settings'>('dashboard');

  // Multi-tenant auth details simulation
  const [authRole, setAuthRole] = useState({
    email: 'tidiegolemes@gmail.com',
    role: 'merchant_owner',
    businessType: 'retail', // The specific subrole matching SaaS requirements
    tenantId: 'tenant_abc123'
  });

  // Search and Filter states
  const [productSearch, setProductSearch] = useState('');
  const [orderFilter, setOrderFilter] = useState<'all' | 'pending' | 'paid' | 'delivered'>('all');

  // Product Dialog/Form state
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productForm, setProductForm] = useState({
    name: '',
    description: '',
    price: 0,
    imageUrl: '',
    category: 'Eletrônicos',
    stock: 10,
    sku: '',
    isActive: true
  });

  // Settings Edit states
  const [settingsForm, setSettingsForm] = useState({ ...settings });
  const [settingsSuccess, setSettingsSuccess] = useState(false);

  // Chat/Meta interaction support
  const [selectedChatId, setSelectedChatId] = useState<string>(chats[0]?.id || '');
  const [currentMessageText, setCurrentMessageText] = useState('');

  // POS / "Modo Garçom" inside active chat
  const [isPosDrawerOpen, setIsPosDrawerOpen] = useState(false);
  const [posCart, setPosCart] = useState<{ product: Product; quantity: number }[]>([]);
  const [posSearch, setPosSearch] = useState('');
  const [posDiscount, setPosDiscount] = useState(0);

  // Active Chats details helper
  const activeChat = chats.find(c => c.id === selectedChatId) || chats[0];

  // Total earnings count helper
  const totalSalesAmount = orders
    .filter(o => o.status === 'paid' || o.paymentStatus === 'approved')
    .reduce((sum, o) => sum + o.total, 0);

  // Count pending chats count
  const unreadChatsCount = chats.filter(c => c.unread).length;

  // --- HANDLERS CONTROLLERS (SIMULATING ISOLATED FIRESTORE BATCH WRITE & CRUD) ---
  const saveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingProduct) {
      // Update
      const updated = products.map(p => 
        p.id === editingProduct.id 
          ? { ...p, ...productForm, price: Number(productForm.price), stock: Number(productForm.stock) } 
          : p
      );
      setProducts(updated);
    } else {
      // Create - writing in /tenants/{tenantId}/products/{productId}
      const newProduct: Product = {
        id: `prod_${Date.now()}`,
        ...productForm,
        price: Number(productForm.price),
        stock: Number(productForm.stock),
        tenantId: settings.tenantId
      };
      setProducts([...products, newProduct]);
    }
    setIsProductModalOpen(false);
    setEditingProduct(null);
  };

  const openNewProductModal = () => {
    setEditingProduct(null);
    setProductForm({
      name: '',
      description: '',
      price: 0,
      imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&q=80&w=600',
      category: 'Geral',
      stock: 12,
      sku: `PROD-${Math.floor(Math.random() * 9000 + 1000)}`,
      isActive: true
    });
    setIsProductModalOpen(true);
  };

  const openEditProductModal = (prod: Product) => {
    setEditingProduct(prod);
    setProductForm({
      name: prod.name,
      description: prod.description,
      price: prod.price,
      imageUrl: prod.imageUrl,
      category: prod.category,
      stock: prod.stock,
      sku: prod.sku,
      isActive: prod.isActive
    });
    setIsProductModalOpen(true);
  };

  const deleteProduct = (id: string) => {
    if (window.confirm('Tem certeza que deseja apagar este produto com isolamento de tenant?')) {
      setProducts(products.filter(p => p.id !== id));
    }
  };

  // Pedidos and checkout simulation
  const updateOrderStatus = (orderId: string, status: OrderStatus) => {
    setOrders(orders.map(o => {
      if (o.id === orderId) {
        return {
          ...o,
          status,
          paymentStatus: status === 'paid' ? 'approved' as PaymentStatus : o.paymentStatus
        };
      }
      return o;
    }));
  };

  // Meta API - Sending message & simulating webhook automatic followups
  const handleSendMessage = () => {
    if (!currentMessageText.trim() || !activeChat) return;

    const newMessageId = `msg_${Date.now()}`;
    const updatedChats = chats.map(c => {
      if (c.id === activeChat.id) {
        return {
          ...c,
          lastMessage: currentMessageText,
          unread: false,
          updatedAt: new Date().toISOString(),
          messages: [
            ...c.messages,
            {
              id: newMessageId,
              sender: 'merchant' as const,
              text: currentMessageText,
              timestamp: new Date().toISOString(),
              type: 'text' as const
            }
          ]
        };
      }
      return c;
    });

    setChats(updatedChats);
    setCurrentMessageText('');

    // Meta Webhook automatic simulator reaction
    setTimeout(() => {
      const responses = [
        "Nossa, entendi! Obrigado pelo retorno rápido.",
        "Maravilha, vou aceitar essas condições.",
        "Como seria o processo caso eu precise efetuar uma troca?",
        "Consigo finalizar o pagamento em PIX ou cartão de crédito?"
      ];
      const randomResponse = responses[Math.floor(Math.random() * responses.length)];

      setChats(prevChats => prevChats.map(c => {
        if (c.id === activeChat.id) {
          return {
            ...c,
            lastMessage: randomResponse,
            unread: true,
            updatedAt: new Date().toISOString(),
            messages: [
              ...c.messages,
              {
                id: `msg_resp_${Date.now()}`,
                sender: 'customer' as const,
                text: randomResponse,
                timestamp: new Date().toISOString(),
                type: 'text' as const
              }
            ]
          };
        }
        return c;
      }));
    }, 3000);
  };

  // POS / Modo Garçom logic
  const handleAddToPosCart = (product: Product) => {
    const existing = posCart.find(item => item.product.id === product.id);
    if (existing) {
      setPosCart(posCart.map(item => 
        item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
      ));
    } else {
      setPosCart([...posCart, { product, quantity: 1 }]);
    }
  };

  const handleRemoveFromPosCart = (productId: string) => {
    setPosCart(posCart.filter(item => item.product.id !== productId));
  };

  const handleUpdatePosQty = (productId: string, qty: number) => {
    if (qty <= 0) {
      handleRemoveFromPosCart(productId);
      return;
    }
    setPosCart(posCart.map(item => 
      item.product.id === productId ? { ...item, quantity: qty } : item
    ));
  };

  const handleCompileSendSummary = () => {
    if (posCart.length === 0 || !activeChat) return;

    // Calculate sum with optional discount percentage
    const grossTotal = posCart.reduce((acc, item) => acc + (item.product.price * item.quantity), 0);
    const finalTotal = Number((grossTotal * (1 - posDiscount / 100)).toFixed(2));

    // Register a simulated Order under tenants/{tenantId}/orders/{orderId}
    const orderId = `ORD_${Math.floor(Math.random() * 9000 + 1000)}`;
    const newOrder: Order = {
      id: orderId,
      customerName: activeChat.customerName,
      customerPhone: activeChat.customerPhone,
      items: posCart.map(item => ({
        productId: item.product.id,
        name: item.product.name,
        price: item.product.price,
        quantity: item.quantity
      })),
      total: finalTotal,
      status: 'pending',
      paymentStatus: 'pending',
      paymentLink: `https://checkout.stripe.com/pay/cs_live_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
      tenantId: settings.tenantId,
      notes: `Gerado via PDV no Chat (Modo Garçom) com desconto de ${posDiscount}%`
    };

    setOrders([newOrder, ...orders]);

    // Format Checkout / POS summary to write into Chat
    const itemsDescription = posCart.map(item => `• ${item.quantity}x ${item.product.name} - R$ ${item.product.price.toFixed(2)}`).join('\n');
    const formattedText = `📱 *RESUMO DE PEDIDO - ${settings.businessName}*\n\n` +
      `Olá, ${activeChat.customerName}! Preparei seu carrinho personalizado:\n\n` +
      `${itemsDescription}\n\n` +
      (posDiscount > 0 ? `🎟️ Desconto aplicado: *${posDiscount}%*\n` : '') +
      `💵 *Total Final: R$ ${finalTotal.toFixed(2)}*\n\n` +
      `💳 Para concluir sua compra de forma segura, use o link oficial abaixo:\n` +
      `${newOrder.paymentLink}`;

    // Append to Chat messaging
    setChats(chats.map(c => {
      if (c.id === activeChat.id) {
        return {
          ...c,
          lastMessage: `Checkout emitido: R$ ${finalTotal.toFixed(2)}`,
          unread: false,
          updatedAt: new Date().toISOString(),
          messages: [
            ...c.messages,
            {
              id: `msg_pos_${Date.now()}`,
              sender: 'merchant' as const,
              text: formattedText,
              timestamp: new Date().toISOString(),
              type: 'order_summary' as const,
              metadata: {
                orderId: orderId,
                total: finalTotal,
                paymentUrl: newOrder.paymentLink,
                itemsCount: posCart.length
              }
            }
          ]
        };
      }
      return c;
    }));

    // Reset drawer state & cart
    setPosCart([]);
    setPosDiscount(0);
    setIsPosDrawerOpen(false);
  };

  const saveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    setSettings(settingsForm);
    setSettingsSuccess(true);
    setTimeout(() => setSettingsSuccess(false), 3000);
  };

  // Filtered Products
  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
    p.sku.toLowerCase().includes(productSearch.toLowerCase()) ||
    p.category.toLowerCase().includes(productSearch.toLowerCase())
  );

  // Filtered Orders
  const filteredOrders = orders.filter(o => {
    if (orderFilter === 'all') return true;
    return o.status === orderFilter;
  });

  return (
    <div className="space-y-6">
      {/* Merchant Admin Header bar with Auth Sub-Role indicator */}
      <div className="bg-[#12141c] border border-gray-800/80 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center border border-orange-500/20 text-orange-400">
            <ShoppingBag className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-display font-semibold flex items-center gap-2">
              {settings.businessName}
              <span className="text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded font-mono">
                Multitenant Retail Active
              </span>
            </h1>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-400 mt-1">
              <span className="flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-gray-500" />
                Dono: <strong className="text-gray-300 font-medium">{authRole.email}</strong>
              </span>
              <span className="text-gray-600">•</span>
              <span className="flex items-center gap-1 font-mono text-[11px] bg-[#0c0d12] px-1.5 py-0.5 rounded text-sky-400 border border-sky-900/40">
                <Layers className="w-3 h-3 text-sky-400" />
                db.businessType === '{authRole.businessType}'
              </span>
              <span className="text-gray-600">•</span>
              <span className="text-gray-500">Tenant: <strong className="text-gray-300 font-mono">{authRole.tenantId}</strong></span>
            </div>
          </div>
        </div>

        {/* Dashboard inner tabs navigation */}
        <div className="flex items-center overflow-x-auto gap-2 bg-[#0c0d12]/60 p-1.5 rounded-xl border border-gray-800/60 self-start md:self-center">
          <button
            onClick={() => setActivePanel('dashboard')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
              activePanel === 'dashboard' ? 'bg-orange-500 text-gray-950 font-bold' : 'text-gray-400 hover:text-white'
            }`}
          >
            Métricas
          </button>
          <button
            onClick={() => setActivePanel('products')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
              activePanel === 'products' ? 'bg-orange-500 text-gray-950 font-bold' : 'text-gray-400 hover:text-white'
            }`}
          >
            Produtos ({products.length})
          </button>
          <button
            onClick={() => setActivePanel('orders')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
              activePanel === 'orders' ? 'bg-orange-500 text-gray-950 font-bold' : 'text-gray-400 hover:text-white'
            }`}
          >
            Pedidos
          </button>
          <button
            onClick={() => setActivePanel('chats')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all relative ${
              activePanel === 'chats' ? 'bg-orange-500 text-gray-950 font-bold' : 'text-gray-400 hover:text-white'
            }`}
          >
            Atendimento Meta
            {unreadChatsCount > 0 && (
              <span className="absolute -top-1 -right-1.5 w-4 h-4 bg-red-500 text-white rounded-full text-[9px] flex items-center justify-center font-bold">
                {unreadChatsCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setActivePanel('settings')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
              activePanel === 'settings' ? 'bg-orange-500 text-gray-950 font-bold' : 'text-gray-400 hover:text-white'
            }`}
          >
            Canais / API
          </button>
        </div>
      </div>

      {/* --- PANEL COMPONENT ROUTES --- */}

      {/* METRICS / MAIN OVERVIEW */}
      {activePanel === 'dashboard' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="bg-[#12141c] border border-gray-800 p-5 rounded-2xl">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-display uppercase tracking-wider text-gray-400">Receita de Venda Conversacional</span>
                <DollarSign className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-2xl font-semibold text-gray-100">
                R$ {totalSalesAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
              <p className="text-[10px] text-gray-500 mt-2 flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                <span>Base de checkout integrada via Stripe & Mercado Pago.</span>
              </p>
            </div>

            <div className="bg-[#12141c] border border-gray-800 p-5 rounded-2xl">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-display uppercase tracking-wider text-gray-400">Conversas por Webhook Meta</span>
                <MessageSquare className="w-4 h-4 text-indigo-400" />
              </div>
              <div className="text-2xl font-semibold text-gray-100 flex items-baseline gap-2">
                {chats.length} 
                <span className="text-xs font-normal text-emerald-400">({unreadChatsCount} pendentes)</span>
              </div>
              <p className="text-[10px] text-gray-500 mt-2">
                Meta Cloud API ativo e sincronizado com Firestore.
              </p>
            </div>

            <div className="bg-[#12141c] border border-gray-800 p-5 rounded-2xl">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-display uppercase tracking-wider text-gray-400">Total de Pedidos Gerados</span>
                <FileCheck className="w-4 h-4 text-orange-400" />
              </div>
              <div className="text-2xl font-semibold text-gray-100">
                {orders.length}
              </div>
              <p className="text-[10px] text-gray-500 mt-2">
                Criação direta via link de catálogo ou carrinho de PDV.
              </p>
            </div>
          </div>

          {/* Quick instructions widget */}
          <div className="bg-sky-500/10 border border-sky-500/20 rounded-2xl p-5 flex items-start gap-4">
            <Sparkles className="w-5 h-5 text-sky-400 shrink-0 mt-0.5" />
            <div className="text-xs text-sky-200 leading-relaxed space-y-1.5">
              <p className="font-semibold text-sky-300">💡 Fluxo Operacional Demo:</p>
              <p>
                1. Mude para a aba <strong className="text-orange-300">Atendimento Meta</strong> para ver canais de Webhooks ativos ou testar o <strong className="text-orange-300">PDV integrados de Chat</strong>.
              </p>
              <p>
                2. Na aba de chat, use o PDV para selecionar produtos do catálogo, aplicar descontos, e gerar mensagens completas com checkout transacional seguro.
              </p>
              <p>
                3. Convidamos também a clicar em <strong className="text-emerald-300">Catálogo do Cliente (no Menu Superior)</strong> para visualizar a experiência de vitrine pública, adicionar itens ao carrinho e testar o envio de pedidos formatados ao WhatsApp.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* PRODUCTS CRUD PANEL */}
      {activePanel === 'products' && (
        <div className="bg-[#12141c] border border-gray-800 rounded-2xl p-5 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h2 className="text-base font-display font-semibold text-gray-200">
              Produtos Registrados (Tenant Isolado)
            </h2>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="Buscar por SKU ou Nome..." 
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  className="bg-[#0c0d12] text-xs text-gray-200 pl-8 pr-4 py-2 rounded-lg border border-gray-800 focus:border-orange-500 outline-none w-[180px] sm:w-[240px] transition-all"
                />
              </div>
              <button
                onClick={openNewProductModal}
                className="px-3 py-2 bg-orange-500 hover:bg-orange-400 transition-all text-gray-950 font-semibold rounded-lg text-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Novo Produto
              </button>
            </div>
          </div>

          {/* Active Product Table / List */}
          <div className="overflow-x-auto rounded-xl border border-gray-800 bg-[#0c0d12]">
            <table className="w-full text-xs text-left text-gray-300">
              <thead className="bg-[#13151e] text-gray-400 uppercase font-mono text-[10px] tracking-wider border-b border-gray-800">
                <tr>
                  <th className="px-4 py-3">Produto</th>
                  <th className="px-4 py-3">SKU</th>
                  <th className="px-4 py-3">Preço</th>
                  <th className="px-4 py-3">Estoque</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60">
                {filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-gray-500">
                      Nenhum produto cadastrado ou localizado.
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map(p => (
                    <tr key={p.id} className="hover:bg-gray-900/40">
                      <td className="px-4 py-3 flex items-center gap-3">
                        <img 
                          src={p.imageUrl} 
                          alt={p.name} 
                          className="w-10 h-10 object-cover rounded-lg border border-gray-800 shrink-0" 
                        />
                        <div>
                          <p className="font-semibold text-gray-100">{p.name}</p>
                          <p className="text-[10px] text-gray-400 truncate max-w-[180px] mt-0.5">{p.description}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-[11px] text-gray-400">{p.sku}</td>
                      <td className="px-4 py-3 text-gray-100 font-semibold">R$ {p.price.toFixed(2)}</td>
                      <td className="px-4 py-3">
                        <span className={`font-medium ${p.stock <= 5 ? 'text-rose-400 font-bold' : 'text-gray-300'}`}>
                          {p.stock} un
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 text-[10px] font-semibold rounded border ${
                          p.isActive 
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                            : 'bg-gray-800 text-gray-500 border-gray-700'
                        }`}>
                          {p.isActive ? 'Ativo' : 'Rascunho'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2.5">
                          <button 
                            onClick={() => openEditProductModal(p)}
                            className="p-1 text-gray-400 hover:text-white transition-colors cursor-pointer"
                            title="Editar Produto"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button 
                            onClick={() => deleteProduct(p.id)}
                            className="p-1 text-gray-400 hover:text-red-400 transition-colors cursor-pointer"
                            title="Apagar do Tenant"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ORDERS / BACKOFFICE HISTORY */}
      {activePanel === 'orders' && (
        <div className="bg-[#12141c] border border-gray-800 rounded-2xl p-5 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-display font-semibold text-gray-200">
                Pedidos de Clientes (Instancia de Atendimento)
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">Pedidos importados da Meta WhatsApp API ou preenchidos pelo catálogo.</p>
            </div>

            <div className="flex items-center gap-2 bg-[#0c0d12] p-1 rounded-lg border border-gray-800">
              {(['all', 'pending', 'paid', 'delivered'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setOrderFilter(f)}
                  className={`px-3 py-1 rounded-md text-[11px] font-semibold uppercase tracking-wider transition-all cursor-pointer ${
                    orderFilter === f ? 'bg-orange-500 text-gray-950 font-bold' : 'text-gray-400 hover:text-gray-200'
                  }`}
                >
                  {f === 'all' ? 'Tudo' : f === 'pending' ? 'Pendente' : f === 'paid' ? 'Pago' : 'Entregue'}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            {filteredOrders.length === 0 ? (
              <div className="bg-[#0c0d12] py-14 border border-gray-800 rounded-xl text-center text-gray-500 text-xs">
                Nenhum pedido localizado para a categoria selecionada.
              </div>
            ) : (
              filteredOrders.map(ord => (
                <div key={ord.id} className="bg-[#0c0d12] border border-gray-800 rounded-xl p-4 flex flex-col md:flex-row justify-between gap-4 items-start md:items-center">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5">
                      <span className="font-mono text-xs font-bold text-gray-100">{ord.id}</span>
                      <span className={`px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider rounded border ${
                        ord.paymentStatus === 'approved'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                      }`}>
                        {ord.paymentStatus === 'approved' ? 'Aprovado' : 'Aguardando Pagamento'}
                      </span>
                    </div>

                    <div className="text-xs text-gray-300">
                      Cliente: <strong className="text-gray-100">{ord.customerName}</strong> ({ord.customerPhone})
                    </div>

                    <div className="text-xs text-gray-400">
                      {ord.items.map(i => `${i.quantity}x ${i.name}`).join(', ')}
                    </div>

                    {ord.notes && (
                      <p className="text-[10px] text-gray-500 italic mt-1 font-sans">{ord.notes}</p>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-4 self-stretch justify-between md:justify-end">
                    <div className="text-right">
                      <div className="text-xs text-gray-400">Total Geral</div>
                      <div className="text-sm font-semibold text-gray-100">R$ {ord.total.toFixed(2)}</div>
                    </div>

                    <div className="flex items-center gap-2">
                      {ord.status === 'pending' && (
                        <button
                          onClick={() => updateOrderStatus(ord.id, 'paid')}
                          className="px-2.5 py-1.5 bg-emerald-500/20 hover:bg-emerald-500 text-emerald-400 hover:text-gray-950 rounded-lg text-[10px] font-bold transition-all cursor-pointer"
                        >
                          Confirmar Pago (Simular PIX)
                        </button>
                      )}

                      {ord.status === 'paid' && (
                        <button
                          onClick={() => updateOrderStatus(ord.id, 'delivered')}
                          className="px-2.5 py-1.5 bg-blue-500/20 hover:bg-blue-500 text-blue-400 hover:text-gray-950 rounded-lg text-[10px] font-bold transition-all cursor-pointer"
                        >
                          Marcar Enviado/Entregue
                        </button>
                      )}

                      <span className={`px-2.5 py-1 text-[11px] font-semibold rounded ${
                        ord.status === 'delivered'
                          ? 'bg-gray-800 text-gray-300'
                          : 'bg-orange-500/10 text-orange-400'
                      }`}>
                        Fase: {ord.status === 'pending' ? 'Pendente' : ord.status === 'paid' ? 'Revisado / Pago' : 'Entregue'}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* CHAT META CLOUD INTEGRATION & POS INTERACTIVE SIMULATION */}
      {activePanel === 'chats' && (
        <div className="bg-[#12141c] border border-gray-800 rounded-2xl overflow-hidden h-[580px] grid grid-cols-1 md:grid-cols-3">
          {/* Chat List sidebar */}
          <div className="border-r border-gray-800/80 bg-[#0c0d12]/60 flex flex-col h-full">
            <div className="p-4 border-b border-gray-800 bg-[#12141c]/50">
              <h3 className="text-xs uppercase font-mono tracking-wider text-gray-400 font-semibold mb-2">Webhooks Meta Clientes</h3>
              <p className="text-[10px] text-gray-500">Atendimento ao vivo, sync com Firestore.</p>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-gray-800/40">
              {chats.map(cht => (
                <button
                  key={cht.id}
                  onClick={() => setSelectedChatId(cht.id)}
                  className={`w-full p-4 text-left transition-all hover:bg-gray-900/30 flex items-start gap-3 relative cursor-pointer ${
                    cht.id === selectedChatId ? 'bg-orange-500/5 border-l-2 border-orange-500' : ''
                  }`}
                >
                  <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-xs font-semibold text-gray-300 border border-gray-700">
                    {cht.customerName.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <p className="text-xs font-semibold text-gray-200 truncate">{cht.customerName}</p>
                      <span className="text-[9px] text-gray-500 font-mono">
                        {new Date(cht.updatedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-400 truncate mt-0.5">{cht.lastMessage}</p>
                  </div>

                  {cht.unread && (
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 w-2 h-2 bg-red-500 rounded-full" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Active Chat thread window */}
          <div className="md:col-span-2 flex flex-col h-full bg-[#131520] justify-between relative">
            <div className="p-4 bg-[#12141a] border-b border-gray-800/80 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-gray-200">{activeChat.customerName}</p>
                <p className="text-[10px] text-gray-400 mt-0.5 font-mono">{activeChat.customerPhone}</p>
              </div>

              {/* PDV ACTIVATION TRIGGER (Aproveitamento de Lógica) */}
              <button
                type="button"
                onClick={() => setIsPosDrawerOpen(true)}
                className="px-3 py-1.5 bg-orange-500 hover:bg-orange-400 text-gray-950 font-bold rounded-lg text-xs flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
              >
                <CreditCard className="w-3.5 h-3.5" />
                PDV no Chat (Garçom)
              </button>
            </div>

            {/* Chat Messages flow */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-[#0e1017]">
              {activeChat.messages.map((m) => (
                <div key={m.id} className={`flex ${m.sender === 'merchant' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] rounded-xl p-3 text-xs leading-relaxed space-y-1 border ${
                    m.sender === 'merchant'
                      ? 'bg-orange-500/10 text-gray-100 border-orange-500/20 rounded-tr-none'
                      : 'bg-gray-900 text-gray-200 border-gray-800 rounded-tl-none'
                  }`}>
                    {/* Meta/Rich components parser */}
                    {m.type === 'order_summary' || m.type === 'payment_link' ? (
                      <div className="space-y-2">
                        <pre className="font-sans whitespace-pre-wrap font-medium">{m.text}</pre>
                        <div className="p-2.5 bg-black/60 rounded-lg border border-gray-800/80 flex items-center justify-between gap-4 mt-2">
                          <div className="text-[10px] font-mono text-gray-400">
                            ID: {m.metadata?.orderId} | Itens: {m.metadata?.itemsCount}
                          </div>
                          <a 
                            href={m.metadata?.paymentUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="px-2.5 py-1 text-[10px] font-bold bg-emerald-500 hover:bg-emerald-400 text-gray-950 rounded uppercase flex items-center gap-1 transition-all"
                          >
                            PAGAR ONLINE
                          </a>
                        </div>
                      </div>
                    ) : (
                      <p className="font-sans whitespace-pre-line">{m.text}</p>
                    )}
                    <span className="text-[9px] text-gray-500 font-mono block text-right mt-1.5">
                      {new Date(m.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Chat input box */}
            <div className="p-4 bg-[#12141a] border-t border-gray-800/80 flex gap-2">
              <input
                type="text"
                placeholder="Escreva uma mensagem de atendimento..."
                value={currentMessageText}
                onChange={(e) => setCurrentMessageText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                className="flex-1 bg-[#0c0d12] border border-gray-800 text-xs text-gray-200 px-4 py-2.5 rounded-lg outline-none focus:border-orange-500/50"
              />
              <button
                type="button"
                onClick={handleSendMessage}
                className="p-2.5 bg-orange-500 hover:bg-orange-400 text-gray-950 rounded-lg transition-all cursor-pointer"
              >
                <Send className="w-4 h-4 shrink-0" />
              </button>
            </div>

            {/* INTERACTIVE POS SIDE DRAWER PANEL (Modo Garçom) */}
            <AnimatePresence>
              {isPosDrawerOpen && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-black/80 z-20 flex justify-end"
                >
                  <motion.div 
                    initial={{ x: '100%' }}
                    animate={{ x: 0 }}
                    exit={{ x: '100%' }}
                    transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                    className="w-full sm:w-[380px] bg-[#12141c] h-full shadow-2xl border-l border-gray-800 flex flex-col justify-between"
                  >
                    {/* Header */}
                    <div className="p-4 border-b border-gray-800 flex items-center justify-between">
                      <div>
                        <h4 className="text-xs uppercase font-mono tracking-wider text-orange-400 font-bold">PDV de Varejo no Chat</h4>
                        <p className="text-[10px] text-gray-400 mt-0.5">Monte o pedido de {activeChat.customerName}.</p>
                      </div>
                      <button 
                        onClick={() => setIsPosDrawerOpen(false)}
                        className="p-1 hover:bg-gray-800 rounded text-gray-400 hover:text-white cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {/* PDV Content */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                      {/* POS Catalog search */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] uppercase tracking-wider font-semibold text-gray-400">Buscar no Estoque</label>
                        <div className="relative">
                          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-gray-400" />
                          <input 
                            type="text" 
                            placeholder="Nome do produto..."
                            value={posSearch}
                            onChange={(e) => setPosSearch(e.target.value)}
                            className="w-full bg-[#0c0d12] text-xs pl-8 pr-3 py-2 rounded-lg border border-gray-800 focus:border-orange-500/50 outline-none font-sans"
                          />
                        </div>

                        {/* Search result items trigger */}
                        <div className="max-h-[140px] overflow-y-auto divide-y divide-gray-800/40 bg-[#0c0d12] rounded-lg border border-gray-800 mt-1 max-w-full">
                          {products
                            .filter(p => p.isActive && p.name.toLowerCase().includes(posSearch.toLowerCase()))
                            .map(prod => (
                              <button
                                key={prod.id}
                                onClick={() => handleAddToPosCart(prod)}
                                className="w-full px-3 py-2 text-left hover:bg-gray-800/50 flex align-middle justify-between transition-colors cursor-pointer text-xs"
                              >
                                <span className="font-medium text-gray-200 truncate pr-2">{prod.name}</span>
                                <span className="font-semibold text-emerald-400 shrink-0">R$ {prod.price.toFixed(2)}</span>
                              </button>
                            ))}
                        </div>
                      </div>

                      {/* virtual Pos cart list */}
                      <div className="space-y-2 border-t border-gray-800 pt-3">
                        <h5 className="text-[10px] uppercase tracking-wider font-semibold text-gray-400">Carrinho Selecionado</h5>
                        {posCart.length === 0 ? (
                          <div className="bg-[#0c0d12]/50 border border-dashed border-gray-800 rounded-xl py-6 text-center text-[11px] text-gray-500">
                            Nenhum produto adicionado ao carrinho de chat.
                          </div>
                        ) : (
                          <div className="space-y-2 h-[150px] overflow-y-auto scrollbar-thin">
                            {posCart.map(item => (
                              <div key={item.product.id} className="bg-[#0c0d12] p-2.5 rounded-lg border border-gray-800/60 flex items-center justify-between gap-2">
                                <div className="truncate flex-1">
                                  <p className="font-medium text-gray-200 truncate text-[11px]">{item.product.name}</p>
                                  <p className="text-[10px] text-emerald-400 font-semibold">R$ {item.product.price.toFixed(2)}</p>
                                </div>

                                <div className="flex items-center gap-2">
                                  <input 
                                    type="number" 
                                    value={item.quantity} 
                                    min="1" 
                                    max={item.product.stock}
                                    onChange={(e) => handleUpdatePosQty(item.product.id, Number(e.target.value))}
                                    className="w-10 bg-[#12141c] text-center text-xs p-1 rounded border border-gray-800 text-gray-100 outline-none"
                                  />
                                  <button
                                    onClick={() => handleRemoveFromPosCart(item.product.id)}
                                    className="text-gray-400 hover:text-red-400 p-1 cursor-pointer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Discount inputs */}
                      <div className="space-y-1.5 border-t border-gray-800 pt-3">
                        <label className="text-[10px] uppercase tracking-wider font-semibold text-gray-400 flex justify-between">
                          <span>Percentual de Desconto</span>
                          <span className="text-orange-400 font-mono font-semibold">{posDiscount}%</span>
                        </label>
                        <div className="flex gap-2">
                          <input 
                            type="range" 
                            min="0" 
                            max="80" 
                            value={posDiscount} 
                            onChange={(e) => setPosDiscount(Number(e.target.value))}
                            className="flex-1 accent-orange-500 bg-gray-800 h-1 rounded" 
                          />
                        </div>
                      </div>
                    </div>

                    {/* PDV Submission panel */}
                    <div className="p-4 border-t border-gray-800 bg-[#0c0d12]/80 space-y-3">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-400 font-medium">Subtotal Geral:</span>
                        <span className="text-gray-400 font-mono font-medium">
                          R$ {posCart.reduce((acc, item) => acc + (item.product.price * item.quantity), 0).toFixed(2)}
                        </span>
                      </div>
                      {posDiscount > 0 && (
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-orange-400 font-medium">Aplicando -{posDiscount}%:</span>
                          <span className="text-orange-400 font-mono font-semibold">
                            - R$ {(posCart.reduce((acc, item) => acc + (item.product.price * item.quantity), 0) * (posDiscount / 100)).toFixed(2)}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center justify-between text-sm pt-1 border-t border-gray-800/60">
                        <span className="text-gray-100 font-semibold">Valor Total Líquido:</span>
                        <span className="text-lg font-bold text-gray-100 font-mono text-emerald-400">
                          R$ {(posCart.reduce((acc, item) => acc + (item.product.price * item.quantity), 0) * (1 - posDiscount / 100)).toFixed(2)}
                        </span>
                      </div>

                      <button
                        onClick={handleCompileSendSummary}
                        disabled={posCart.length === 0}
                        className="w-full py-2.5 bg-orange-500 hover:bg-orange-400 disabled:bg-gray-800 text-gray-950 disabled:text-gray-500 rounded-xl text-xs font-bold transition-all shadow-lg flex items-center justify-center gap-1.5 cursor-pointer mt-2"
                      >
                        <Send className="w-3.5 h-3.5" />
                        Gerar checkout & Enviar Link
                      </button>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* CHANNELS INTEGRATIONS CONFIGURATION PANEL */}
      {activePanel === 'settings' && (
        <div className="bg-[#12141c] border border-gray-800 rounded-2xl p-5 space-y-6">
          <div>
            <h2 className="text-base font-display font-semibold text-gray-200">Configurações Gerais & Gateway</h2>
            <p className="text-xs text-gray-400 mt-0.5">Parâmetros exclusivos do tenant ativo para WhatsApp Meta API e Checkout Online.</p>
          </div>

          <form onSubmit={saveSettings} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[11px] uppercase tracking-wider font-semibold text-gray-400 block">Nome Comercial (Business)</label>
                <input 
                  type="text" 
                  value={settingsForm.businessName}
                  onChange={(e) => setSettingsForm({ ...settingsForm, businessName: e.target.value })}
                  className="w-full bg-[#0c0d12] text-xs text-gray-300 p-2.5 rounded-lg border border-gray-800 focus:border-orange-500/50 outline-none"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] uppercase tracking-wider font-semibold text-gray-400 block">Nº de Destino WhatsApp Principal</label>
                <input 
                  type="text" 
                  value={settingsForm.whatsappNumber}
                  onChange={(e) => setSettingsForm({ ...settingsForm, whatsappNumber: e.target.value })}
                  className="w-full bg-[#0c0d12] text-xs text-gray-300 p-2.5 rounded-lg border border-gray-800 focus:border-orange-500/50 outline-none font-mono"
                  placeholder="+5511999998888"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] uppercase tracking-wider font-semibold text-gray-400 block">Moeda Comercial</label>
                <input 
                  type="text" 
                  value={settingsForm.currency}
                  onChange={(e) => setSettingsForm({ ...settingsForm, currency: e.target.value })}
                  className="w-full bg-[#0c0d12] text-xs text-gray-300 p-2.5 rounded-lg border border-gray-800 focus:border-orange-500/50 outline-none"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] uppercase tracking-wider font-semibold text-gray-400 block">Gateway de Pagamento Integrado</label>
                <select 
                  value={settingsForm.paymentGateway}
                  onChange={(e) => setSettingsForm({ ...settingsForm, paymentGateway: e.target.value as any })}
                  className="w-full bg-[#0c0d12] text-xs text-gray-300 p-2.5 rounded-lg border border-gray-800 focus:border-orange-500/50 outline-none"
                >
                  <option value="stripe">Stripe Checkout Link (via Google Functions)</option>
                  <option value="mercadopago">Mercado Pago Pro (Simulação)</option>
                  <option value="whatsapp_only">Apenas Fechamento Manual pelo WhatsApp</option>
                </select>
              </div>
            </div>

            <div className="bg-[#0c0d12] border border-gray-800 rounded-xl p-4 space-y-3">
              <span className="text-xs font-semibold text-gray-300 block">⚡ Credenciais Meta Cloud API (Simuladas)</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <span className="text-[10px] text-gray-400 font-mono">META_PHONE_NUMBER_ID</span>
                  <input type="text" readOnly value="1098438219483" className="w-full bg-gray-900 text-gray-500 text-[11px] p-2 rounded border border-gray-800/80 font-mono outline-none" />
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] text-gray-400 font-mono">WEBHOOK_VERIFY_TOKEN</span>
                  <input type="text" readOnly value="verify_token_secret_123" className="w-full bg-gray-900 text-gray-500 text-[11px] p-2 rounded border border-gray-800/80 font-mono outline-none" />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              {settingsSuccess && (
                <span className="text-xs text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Atualizado em database tenants/tenant_abc123!
                </span>
              )}
              <button
                type="submit"
                className="px-4 py-2 bg-orange-500 hover:bg-orange-400 font-semibold text-gray-950 rounded-lg text-xs transition-all cursor-pointer"
              >
                Salvar Configurações
              </button>
            </div>
          </form>
        </div>
      )}

      {/* --- ADD/EDIT PRODUCT DIALOG MODAL SIMULATOR --- */}
      {isProductModalOpen && (
        <div className="fixed inset-0 bg-black/75 z-40 flex items-center justify-center p-4">
          <div className="bg-[#12141c] border border-gray-800 rounded-2xl w-full max-w-lg shadow-2xl p-5 space-y-4">
            <h3 className="text-base font-display font-semibold text-gray-200">
              {editingProduct ? 'Editar Produto do Varejo' : 'Inserir Novo Produto no Firestore'}
            </h3>

            <form onSubmit={saveProduct} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 space-y-1">
                  <label className="text-[10px] uppercase font-semibold tracking-wider text-gray-400">Nome do Produto</label>
                  <input 
                    type="text" 
                    value={productForm.name}
                    onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                    className="w-full bg-[#0c0d12] border border-gray-800 text-xs text-gray-200 p-2 rounded outline-none focus:border-orange-500/50"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-semibold tracking-wider text-gray-400">Preço (R$)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    value={productForm.price}
                    onChange={(e) => setProductForm({ ...productForm, price: Number(e.target.value) })}
                    className="w-full bg-[#0c0d12] border border-gray-800 text-xs text-gray-200 p-2 rounded outline-none focus:border-orange-500/50"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-semibold tracking-wider text-gray-400">Estoque Inicial</label>
                  <input 
                    type="number" 
                    value={productForm.stock}
                    onChange={(e) => setProductForm({ ...productForm, stock: Number(e.target.value) })}
                    className="w-full bg-[#0c0d12] border border-gray-800 text-xs text-gray-200 p-2 rounded outline-none focus:border-orange-500/50"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-semibold tracking-wider text-gray-400">Código SKU</label>
                  <input 
                    type="text" 
                    value={productForm.sku}
                    onChange={(e) => setProductForm({ ...productForm, sku: e.target.value })}
                    className="w-full bg-[#0c0d12] border border-gray-800 text-xs text-gray-200 p-2 rounded outline-none focus:border-orange-500/50 font-mono uppercase"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-semibold tracking-wider text-gray-400">Categoria</label>
                  <select 
                    value={productForm.category}
                    onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
                    className="w-full bg-[#0c0d12] border border-gray-800 text-xs text-gray-200 p-2 rounded outline-none focus:border-orange-500/50"
                  >
                    <option value="Eletrônicos">Eletrônicos</option>
                    <option value="Escritório">Escritório</option>
                    <option value="Acessórios">Acessórios</option>
                    <option value="Cozinha">Cozinha</option>
                    <option value="Geral">Outros / Geral</option>
                  </select>
                </div>

                <div className="col-span-2 space-y-1">
                  <label className="text-[10px] uppercase font-semibold tracking-wider text-gray-400">URL da Imagem</label>
                  <input 
                    type="text" 
                    value={productForm.imageUrl}
                    onChange={(e) => setProductForm({ ...productForm, imageUrl: e.target.value })}
                    className="w-full bg-[#0c0d12] border border-gray-800 text-xs text-gray-200 p-2 rounded outline-none focus:border-orange-500/50 font-mono"
                    required
                  />
                </div>

                <div className="col-span-2 space-y-1">
                  <label className="text-[10px] uppercase font-semibold tracking-wider text-gray-400">Descrição Detalhada</label>
                  <textarea 
                    value={productForm.description}
                    onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                    rows={3}
                    className="w-full bg-[#0c0d12] border border-gray-800 text-xs text-gray-200 p-2 rounded outline-none focus:border-orange-500/50 font-sans"
                    required
                  />
                </div>

                <div className="col-span-2 flex items-center gap-2 py-1">
                  <input 
                    type="checkbox" 
                    id="isActive"
                    checked={productForm.isActive}
                    onChange={(e) => setProductForm({ ...productForm, isActive: e.target.checked })}
                    className="accent-orange-500 w-3.5 h-3.5 rounded"
                  />
                  <label htmlFor="isActive" className="text-xs text-gray-300 font-medium select-none cursor-pointer">
                    Manter produto visível publicamente no catálogo de varejo.
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-gray-800">
                <button
                  type="button"
                  onClick={() => setIsProductModalOpen(false)}
                  className="px-3 py-1.5 text-xs text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-orange-500 hover:bg-orange-400 text-gray-950 font-bold rounded-lg text-xs cursor-pointer"
                >
                  {editingProduct ? 'Atualizar Firestore' : 'Inserir no Lote'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
