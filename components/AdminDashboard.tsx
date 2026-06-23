"use client";

import React, { useState } from 'react';
import { 
  ShoppingBag, Settings, MessageSquare, Plus, Edit2, Trash2, 
  Search, CheckCircle2, DollarSign, Eye, User, Sparkles,
  Layers, AlertCircle, Send, HelpCircle, FileCheck, Percent,
  TrendingUp, X, CreditCard, Sun, Moon, ExternalLink, ChevronDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import { Product, Order, ChatSession, TenantSettings, OrderStatus, PaymentStatus } from '../types';
import { INITIAL_ORDERS, INITIAL_CHATS, INITIAL_SETTINGS } from '../data/mokedData';
import VeloSupportWidget from './VeloSupportWidget';
import { useProducts } from '../hooks/useProducts';

export default function AdminDashboard() {
  // Theme state
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Conexão em Tempo Real com o Firebase (Magia acontecendo!)
  const { products, addProduct, updateProduct, deleteProduct } = useProducts('tenant_abc123');
  
  // Original States
  const [orders, setOrders] = useState<Order[]>(INITIAL_ORDERS);
  const [chats, setChats] = useState<ChatSession[]>(INITIAL_CHATS);
  const [settings, setSettings] = useState<TenantSettings>(INITIAL_SETTINGS);

  // Navigation tabs
const [activePanel, setActivePanel] = useState<'dashboard' | 'products' | 'orders' | 'chats' | 'settings'>('dashboard');
  
  // Controles do novo Menu estilo Loja Integrada
  const [isSettingsExpanded, setIsSettingsExpanded] = useState(false);
  const [settingsSubPanel, setSettingsSubPanel] = useState('gerais');
    // Multi-tenant auth details simulation
  const [authRole, setAuthRole] = useState({
    email: 'contato@mamedes.com.br',
    role: 'merchant_owner',
    businessType: 'whatsapp_catalog', // Pode ser 'ecommerce' ou 'whatsapp_catalog'
    tenantId: 'tenant_mamedes123'
  });

  // Estados para o Importador de XML
  const [isXmlModalOpen, setIsXmlModalOpen] = useState(false);
  const [xmlUrl, setXmlUrl] = useState('https://loja.mamedes.com.br/xml/b7ef8/googlemerchant.xml');
  const [isImporting, setIsImporting] = useState(false);

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
    isActive: true,
    ean: '',
    ncm: '',
    weight: 0,
    seoTitle: '',
    seoDescription: ''
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

  // --- LÓGICA DE IMPORTAÇÃO REAL DE XML (GOOGLE MERCHANT) ---
  const handleImportXML = async () => {
    if (!xmlUrl) return alert("Por favor, insira uma URL válida.");
    setIsImporting(true);

    try {
      // Como o XML está em outro domínio (CORS), usamos uma API pública gratuita para contornar isso temporariamente
      const response = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(xmlUrl)}`);
      const data = await response.json();
      const xmlText = data.contents;

      // Usando o DOMParser nativo do navegador para ler o XML
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlText, "text/xml");
      const items = xmlDoc.getElementsByTagName("item");

      let importedCount = 0;

      // Loop por cada item do teste XML para salvar no Firebase
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        
        // Mapeamento das tags padrão do Google Merchant
        const title = item.getElementsByTagName("title")[0]?.textContent || "Produto sem nome";
        const description = item.getElementsByTagName("description")[0]?.textContent || "";
        const link = item.getElementsByTagName("link")[0]?.textContent || "";
        const imageLink = item.getElementsByTagName("g:image_link")[0]?.textContent || "";
        
        // Tratamento de preço (Tirando a palavra BRL e convertendo pra número)
        const priceRaw = item.getElementsByTagName("g:price")[0]?.textContent || "0";
        const priceNumber = Number(priceRaw.replace(/[^\d.-]/g, ''));
        
        const category = item.getElementsByTagName("g:product_type")[0]?.textContent || "Geral";
        const ean = item.getElementsByTagName("g:gtin")[0]?.textContent || "";
        const sku = item.getElementsByTagName("g:id")[0]?.textContent || `SKU-${Date.now()}-${i}`;

        // Salvar no Firebase via nosso Hook
        await addProduct({
          name: title,
          description: description,
          price: priceNumber,
          imageUrl: imageLink || "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&q=80&w=600",
          category: category,
          stock: 99, // Estoque padrão ao importar
          sku: sku,
          isActive: true,
          ean: ean,
          ncm: '',
          weight: 0,
          seoTitle: title.substring(0, 60),
          seoDescription: description.substring(0, 160),
          tenantId: settings.tenantId
        });

        importedCount++;
      }

      alert(`Sucesso! ${importedCount} produtos foram importados para sua loja.`);
      setIsXmlModalOpen(false);
    } catch (error) {
      console.error(error);
      alert("Erro ao importar o XML. Verifique se o link é válido e público.");
    } finally {
      setIsImporting(false);
    }
  };

  // --- HANDLERS CONTROLLERS (SIMULATING ISOLATED FIRESTORE BATCH WRITE & CRUD) ---
  const saveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingProduct) {
      // Atualiza direto no Firebase
      await updateProduct(editingProduct.id, { 
        ...productForm, 
        price: Number(productForm.price), 
        stock: Number(productForm.stock) 
      });
    } else {
      // Salva um novo direto no Firebase
      await addProduct({
        ...productForm,
        price: Number(productForm.price),
        stock: Number(productForm.stock),
        tenantId: settings.tenantId
      });
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
      isActive: true,
      ean: '',
      ncm: '',
      weight: 0,
      seoTitle: '',
      seoDescription: ''
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
      isActive: prod.isActive,
      ean: prod.ean || '',
      ncm: prod.ncm || '',
      weight: prod.weight || 0,
      seoTitle: prod.seoTitle || '',
      seoDescription: prod.seoDescription || ''
    });
    setIsProductModalOpen(true);
  };

  const handleDeleteProduct = async (id: string) => {
    if (window.confirm('Tem certeza que deseja apagar este produto do Banco de Dados?')) {
      await deleteProduct(id);
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

  // Navigation Items Renderer Helper
  const NavItem = ({ id, label, icon: Icon, badge = 0 }: any) => {
    const isActive = activePanel === id;
    return (
      <button
        onClick={() => setActivePanel(id)}
        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
          isActive
            ? 'bg-orange-500/10 text-orange-600 dark:text-orange-400'
            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800/50 hover:text-gray-900 dark:hover:text-gray-200'
        }`}
      >
        <div className="flex items-center gap-2.5">
          <Icon className="w-4 h-4" />
          {label}
        </div>
        {badge > 0 && (
          <span className="w-5 h-5 bg-red-500 text-white rounded-full text-[10px] flex items-center justify-center font-bold shadow-sm">
            {badge}
          </span>
        )}
      </button>
    );
  };

  return (
    <div className="light">
      <div className="flex h-screen bg-[#f4f7f6] text-slate-800 font-sans overflow-hidden selection:bg-[#0055ff] selection:text-white">
        
        {/* SIDEBAR PADRÃO VELO DELIVERY */}
        <aside className="w-[280px] flex flex-col bg-white border-r border-gray-200 shrink-0 shadow-sm z-10 relative">
          <div className="p-6 flex flex-col items-center border-b border-gray-50">
            <div className="w-20 h-20 rounded-full bg-white flex items-center justify-center overflow-hidden shadow-md mb-3 border-4 border-gray-50 p-1">
              <img src="/velo loja virtual logo.png" alt="Velo Logo" className="w-full h-full object-contain" />
            </div>
            <h1 className="text-sm font-black text-[#111827] uppercase tracking-wider text-center leading-tight">
              {settings.businessName}
            </h1>
            <p className="text-[10px] text-gray-500 font-medium text-center mt-2 px-2 leading-relaxed">
              Oferecemos uma ampla variedade de produtos. Nosso compromisso é com a praticidade e qualidade.
            </p>
          </div>

          <div className="px-5 py-4">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-8 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="text" placeholder="Buscar funcionalidade." className="w-full bg-white border-2 border-gray-100 text-xs rounded-full py-3 pl-10 pr-4 outline-none focus:border-[#ff7b00] transition-all font-bold text-slate-700 shadow-sm" />
            </div>
          </div>

          <nav className="flex-1 overflow-y-auto px-4 py-2 space-y-1.5 custom-scrollbar">
            
            {/* Oculta INÍCIO se for Catálogo Simples */}
            {authRole.businessType === 'ecommerce' && (
              <button onClick={() => setActivePanel('dashboard')} className={`w-full flex items-center gap-3 px-5 py-3.5 rounded-full text-sm font-black uppercase tracking-wider transition-all ${activePanel === 'dashboard' ? 'bg-[#111827] text-white shadow-lg shadow-black/20' : 'text-slate-500 hover:bg-gray-100 hover:text-slate-900'}`}>
                <TrendingUp className="w-5 h-5" /> INÍCIO
              </button>
            )}

            <button onClick={() => setActivePanel('products')} className={`w-full flex items-center gap-3 px-5 py-3.5 rounded-full text-sm font-black uppercase tracking-wider transition-all ${activePanel === 'products' ? 'bg-[#111827] text-white shadow-lg shadow-black/20' : 'text-slate-500 hover:bg-gray-100 hover:text-slate-900'}`}>
              <ShoppingBag className="w-5 h-5" /> PRODUTOS
            </button>

            {/* Oculta PEDIDOS se for Catálogo Simples */}
            {authRole.businessType === 'ecommerce' && (
              <button onClick={() => setActivePanel('orders')} className={`w-full flex items-center gap-3 px-5 py-3.5 rounded-full text-sm font-black uppercase tracking-wider transition-all ${activePanel === 'orders' ? 'bg-[#111827] text-white shadow-lg shadow-black/20' : 'text-slate-500 hover:bg-gray-100 hover:text-slate-900'}`}>
                <FileCheck className="w-5 h-5" /> PEDIDOS
              </button>
            )}
            <button onClick={() => setActivePanel('chats')} className={`w-full flex items-center justify-between px-5 py-3.5 rounded-full text-sm font-black uppercase tracking-wider transition-all ${activePanel === 'chats' ? 'bg-[#111827] text-white shadow-lg shadow-black/20' : 'text-slate-500 hover:bg-gray-100 hover:text-slate-900'}`}>
              <div className="flex items-center gap-3"><MessageSquare className="w-5 h-5" /> ATENDIMENTO</div>
              {unreadChatsCount > 0 && <span className="w-5 h-5 bg-[#ff7b00] text-white rounded-full text-[10px] flex items-center justify-center shadow-sm">{unreadChatsCount}</span>}
            </button>

            <div className="pt-2">
              <button onClick={() => { setIsSettingsExpanded(!isSettingsExpanded); setActivePanel('settings'); }} className={`w-full flex items-center gap-3 px-5 py-3.5 rounded-full text-sm font-black uppercase tracking-wider transition-all ${activePanel === 'settings' ? 'bg-[#111827] text-white shadow-lg shadow-black/20' : 'text-slate-500 hover:bg-gray-100 hover:text-slate-900'}`}>
                <Settings className="w-5 h-5" /> CONFIGURAÇÕES
              </button>
              <AnimatePresence>
                {isSettingsExpanded && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                    <div className="pl-12 pr-3 py-2 space-y-1">
                      <button onClick={() => { setActivePanel('settings'); setSettingsSubPanel('visual'); }} className={`block w-full text-left text-xs py-2.5 font-bold rounded-full px-4 transition-colors ${settingsSubPanel === 'visual' && activePanel === 'settings' ? 'bg-orange-50 text-[#ff7b00]' : 'text-slate-500 hover:text-slate-900 hover:bg-gray-50'}`}>Visual da loja</button>
                      <button onClick={() => { setActivePanel('settings'); setSettingsSubPanel('gerais'); }} className={`block w-full text-left text-xs py-2.5 font-bold rounded-full px-4 transition-colors ${settingsSubPanel === 'gerais' && activePanel === 'settings' ? 'bg-orange-50 text-[#ff7b00]' : 'text-slate-500 hover:text-slate-900 hover:bg-gray-50'}`}>Gerais</button>
                      <button onClick={() => { setActivePanel('settings'); setSettingsSubPanel('dados'); }} className={`block w-full text-left text-xs py-2.5 font-bold rounded-full px-4 transition-colors ${settingsSubPanel === 'dados' && activePanel === 'settings' ? 'bg-orange-50 text-[#ff7b00]' : 'text-slate-500 hover:text-slate-900 hover:bg-gray-50'}`}>Dados da Loja</button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </nav>

          <div className="p-5 border-t border-gray-100 bg-gray-50/50">
            <div className="flex items-center justify-center mb-4">
               <button className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-[#111827] hover:text-[#ff7b00] transition-colors"><ExternalLink className="w-4 h-4"/> VER LOJA ONLINE</button>
            </div>
            <div className="flex items-center justify-between bg-white p-3 rounded-2xl border-2 border-gray-100 shadow-sm cursor-pointer hover:border-[#ff7b00] transition-colors">
               <div className="flex items-center gap-3 overflow-hidden">
                 <div className="w-10 h-10 rounded-full bg-[#111827] text-white flex items-center justify-center font-black text-sm shrink-0">{authRole.email.charAt(0).toUpperCase()}</div>
                 <div className="overflow-hidden">
                   <p className="text-[11px] font-black text-slate-800 uppercase tracking-wider truncate">USUÁRIO</p>
                   <p className="text-[10px] text-slate-500 truncate font-medium">{authRole.email}</p>
                 </div>
               </div>
            </div>
          </div>
        </aside>

        {/* MAIN CONTENT AREA */}
        <main className="flex-1 overflow-y-auto p-6 lg:p-10">
          
          {activePanel === 'dashboard' && (
            <div className="space-y-8 max-w-6xl mx-auto">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h2 className="text-3xl sm:text-4xl font-black italic uppercase text-[#111827] tracking-tighter">Visão Geral</h2>
                <button className="bg-[#111827] hover:bg-black text-white px-6 py-3.5 rounded-full font-black text-[11px] uppercase tracking-widest flex items-center gap-2 transition-all shadow-lg">
                  Fechar Caixa / Relatório
                </button>
              </div>

              {/* Escola Velo Delivery Highlight Card */}
              <div className="bg-white border-2 border-[#111827] rounded-[2rem] p-6 sm:p-10 shadow-sm relative overflow-hidden flex flex-col md:flex-row gap-6 items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-white mb-3 bg-[#111827] w-max px-3 py-1 rounded-full">
                    <Sparkles className="w-3.5 h-3.5 text-[#ff7b00]" /> SEO Local & Vendas
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-black text-[#111827] uppercase leading-tight mb-3">Crie um combo e apareça em destaque no Google</h3>
                  <p className="text-sm text-slate-600 font-medium leading-relaxed max-w-2xl">
                    Clientes adoram ofertas combinadas! Deixe nossa Inteligência Artificial sugerir combos baseados no seu segmento. Em um clique, nós o criamos no seu catálogo e o enviamos direto para a vitrine do seu negócio.
                  </p>
                </div>
                <div className="flex flex-col gap-3 w-full md:w-64 shrink-0 z-10">
                  <button className="w-full bg-[#ff7b00] hover:bg-[#e66a00] text-white font-black uppercase tracking-wider text-xs py-4 rounded-full shadow-lg shadow-orange-500/30 flex items-center justify-center gap-2 transition-transform hover:scale-105">
                    <Sparkles className="w-4 h-4 fill-current" /> Ver Sugestões Mágicas
                  </button>
                  <button className="w-full bg-white border-2 border-gray-200 hover:border-[#111827] text-[#111827] font-black uppercase tracking-wider text-xs py-3.5 rounded-full transition-colors flex items-center justify-center gap-2">
                    Ver Próxima Aula
                  </button>
                </div>
              </div>

              {/* Missões / Métricas */}
              <div className="bg-[#f8f9fa] border-2 border-gray-100 rounded-[2rem] p-6 sm:p-10 shadow-inner">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 border-b-2 border-gray-200 pb-6 gap-4">
                  <div>
                    <h3 className="text-xl font-black italic uppercase text-[#111827] flex items-center gap-2">🚀 Missões Velo</h3>
                    <p className="text-sm font-medium text-slate-500 mt-1">Configure sua loja para decolar suas vendas.</p>
                  </div>
                  <div className="text-right flex items-center gap-4">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Progresso</span>
                    <div className="w-32 h-3 bg-gray-200 rounded-full overflow-hidden">
                      <div className="bg-[#ff7b00] w-1/2 h-full rounded-full"></div>
                    </div>
                    <div className="text-3xl font-black text-[#ff7b00] italic">50%</div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Card Receita */}
                  <div className="bg-white border-2 border-gray-200 rounded-[1.5rem] p-6 flex flex-col relative shadow-sm hover:border-[#111827] transition-colors cursor-pointer">
                    <div className="bg-[#111827] text-white w-12 h-12 rounded-2xl flex items-center justify-center mb-4"><DollarSign className="w-6 h-6" /></div>
                    <h4 className="font-black text-slate-800 text-sm uppercase tracking-wide">Receita Total</h4>
                    <p className="text-2xl font-black text-[#111827] mt-1 tracking-tight">R$ {totalSalesAmount.toFixed(2)}</p>
                    <CheckCircle2 className="w-6 h-6 text-[#ff7b00] absolute top-6 right-6" />
                  </div>
                  
                  {/* Card Conversas */}
                  <div className="bg-white border-2 border-gray-200 rounded-[1.5rem] p-6 flex flex-col relative shadow-sm hover:border-[#111827] transition-colors cursor-pointer">
                    <div className="bg-gray-100 text-gray-400 w-12 h-12 rounded-2xl flex items-center justify-center mb-4"><MessageSquare className="w-6 h-6" /></div>
                    <h4 className="font-black text-slate-800 text-sm uppercase tracking-wide">Conversas Meta</h4>
                    <p className="text-2xl font-black text-slate-400 mt-1 tracking-tight">{chats.length}</p>
                    <div className="w-5 h-5 border-2 border-gray-300 rounded-full absolute top-6 right-6"></div>
                  </div>

                  {/* Card Pedidos */}
                  <div className="bg-white border-2 border-gray-200 rounded-[1.5rem] p-6 flex flex-col relative shadow-sm hover:border-[#111827] transition-colors cursor-pointer">
                    <div className="bg-[#111827] text-white w-12 h-12 rounded-2xl flex items-center justify-center mb-4"><FileCheck className="w-6 h-6" /></div>
                    <h4 className="font-black text-slate-800 text-sm uppercase tracking-wide">Total Pedidos</h4>
                    <p className="text-2xl font-black text-[#111827] mt-1 tracking-tight">{orders.length}</p>
                    <CheckCircle2 className="w-6 h-6 text-[#ff7b00] absolute top-6 right-6" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {activePanel === 'products' && (
            <div className="bg-white border-2 border-gray-100 rounded-[2rem] p-8 space-y-6 max-w-6xl mx-auto shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b-2 border-gray-50 pb-6">
                <h2 className="text-2xl font-black italic uppercase text-[#111827]">Produtos</h2>
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input type="text" placeholder="Buscar por SKU ou Nome..." value={productSearch} onChange={(e) => setProductSearch(e.target.value)} className="bg-gray-50 text-sm text-slate-800 pl-10 pr-4 py-3 rounded-full border-2 border-gray-100 focus:border-[#ff7b00] outline-none w-[180px] sm:w-[280px] transition-all font-medium" />
                  </div>
                  <button onClick={() => setIsXmlModalOpen(true)} className="px-6 py-3 bg-white border-2 border-gray-200 hover:border-[#111827] text-[#111827] transition-all font-black uppercase tracking-wider rounded-full text-[11px] flex items-center gap-2">
                    <Layers className="w-4 h-4" /> Importar XML
                  </button>
                  <button onClick={openNewProductModal} className="px-6 py-3 bg-[#ff7b00] hover:bg-[#e66a00] transition-all text-white font-black uppercase tracking-wider rounded-full text-[11px] flex items-center gap-2 shadow-lg shadow-orange-500/30">
                    <Plus className="w-4 h-4" />Novo Produto
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto rounded-2xl border-2 border-gray-50">
                <table className="w-full text-sm text-left text-slate-700">
                  <thead className="bg-gray-50 text-slate-500 uppercase font-black text-[10px] tracking-widest">
                    <tr><th className="px-6 py-4">Produto</th><th className="px-6 py-4">SKU</th><th className="px-6 py-4">Preço</th><th className="px-6 py-4">Estoque</th><th className="px-6 py-4">Status</th><th className="px-6 py-4 text-right">Ações</th></tr>
                  </thead>
                  <tbody className="divide-y-2 divide-gray-50">
                    {filteredProducts.length === 0 ? (
                      <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-400 font-bold">Nenhum produto localizado.</td></tr>
                    ) : (
                      filteredProducts.map(p => (
                        <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 flex items-center gap-4">
                            <img src={p.imageUrl} alt={p.name} className="w-12 h-12 object-cover rounded-xl border border-gray-200 shrink-0 shadow-sm" />
                            <div><p className="font-bold text-slate-900">{p.name}</p><p className="text-[11px] text-slate-500 font-medium mt-0.5">{p.category}</p></div>
                          </td>
                          <td className="px-6 py-4 font-mono text-xs font-bold text-slate-500">{p.sku}</td>
                          <td className="px-6 py-4 text-[#111827] font-black tracking-tight">R$ {p.price.toFixed(2)}</td>
                          <td className="px-6 py-4"><span className={`font-bold px-3 py-1 rounded-full ${p.stock <= 5 ? 'bg-red-50 text-red-600' : 'bg-gray-100 text-slate-700'}`}>{p.stock} un</span></td>
                          <td className="px-6 py-4"><span className={`px-3 py-1 text-[10px] font-black uppercase tracking-wider rounded-full ${p.isActive ? 'bg-gray-100 text-slate-800' : 'bg-gray-100 text-slate-400'}`}>{p.isActive ? 'Ativo' : 'Inativo'}</span></td>
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-end gap-2">
                              <button onClick={() => openEditProductModal(p)} className="p-2 text-slate-400 hover:text-[#111827] hover:bg-gray-100 rounded-lg transition-colors"><Edit2 className="w-4 h-4" /></button>
                              <button onClick={() => handleDeleteProduct(p.id)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
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

          {activePanel === 'orders' && (
            <div className="bg-white border-2 border-gray-100 rounded-[2rem] p-8 space-y-6 max-w-6xl mx-auto shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b-2 border-gray-50 pb-6">
                 <h2 className="text-2xl font-black italic uppercase text-[#111827]">Pedidos</h2>
              </div>
              <div className="space-y-4">
                {filteredOrders.length === 0 ? (
                  <div className="bg-gray-50 py-16 rounded-2xl text-center text-slate-400 font-bold border-2 border-dashed border-gray-200">Nenhum pedido localizado.</div>
                ) : (
                  filteredOrders.map(ord => (
                    <div key={ord.id} className="bg-white border-2 border-gray-100 rounded-2xl p-6 flex flex-col md:flex-row justify-between gap-6 items-start md:items-center hover:shadow-md transition-shadow">
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-sm font-black text-slate-800 bg-gray-100 px-3 py-1 rounded-lg">{ord.id}</span>
                          <span className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider rounded-lg border-2 bg-gray-100 text-slate-800 border-gray-200">
                            {ord.paymentStatus === 'approved' ? 'Aprovado' : 'Pendente'}
                          </span>
                        </div>
                        <div className="text-sm text-slate-600 font-medium">Cliente: <strong className="text-slate-900 font-black">{ord.customerName}</strong></div>
                        <div className="text-xs text-slate-500 font-medium bg-gray-50 p-3 rounded-xl border border-gray-100">{ord.items.map(i => `${i.quantity}x ${i.name}`).join(', ')}</div>
                      </div>
                      <div className="flex flex-col sm:flex-row items-center gap-4">
                        <div className="text-right bg-gray-50 p-4 rounded-2xl border-2 border-gray-100 min-w-[150px]">
                          <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Total</div>
                          <div className="text-2xl font-black text-[#ff7b00] tracking-tight">R$ {ord.total.toFixed(2)}</div>
                        </div>
                        <div className="flex flex-col gap-2">
                          {ord.status === 'pending' && <button onClick={() => updateOrderStatus(ord.id, 'paid')} className="px-4 py-2.5 bg-white border-2 border-gray-200 text-[#111827] hover:bg-[#111827] hover:text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all">Confirmar Pago</button>}
                          {ord.status === 'paid' && <button onClick={() => updateOrderStatus(ord.id, 'delivered')} className="px-4 py-2.5 bg-white border-2 border-gray-200 text-[#111827] hover:bg-[#111827] hover:text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all">Marcar Enviado</button>}
                          <span className="text-center px-4 py-2 text-[10px] font-black uppercase tracking-wider rounded-xl bg-gray-100 text-slate-500">Status: {ord.status === 'pending' ? 'Pendente' : ord.status === 'paid' ? 'Pago' : 'Entregue'}</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activePanel === 'chats' && (
            <div className="bg-white border-2 border-gray-100 rounded-[2rem] p-12 text-center shadow-sm max-w-3xl mx-auto mt-10">
              <div className="w-20 h-20 bg-gray-100 text-[#111827] rounded-full flex items-center justify-center mx-auto mb-6"><MessageSquare className="w-10 h-10" /></div>
              <h2 className="text-2xl font-black uppercase text-slate-800 mb-2">Atendimento WhatsApp</h2>
              <p className="text-slate-500 font-medium leading-relaxed">A integração com a API Oficial da Meta está configurada na arquitetura, mas os chats em tempo real serão conectados na próxima fase.</p>
            </div>
          )}

          {activePanel === 'settings' && (
            <div className="max-w-5xl mx-auto space-y-6">
              
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-black italic uppercase text-[#111827] flex items-center gap-2">
                    {settingsSubPanel === 'gerais' && 'Configurações Gerais'}
                    {settingsSubPanel === 'dados' && 'Dados da Loja'}
                  </h2>
                </div>
                <button onClick={saveSettings} className="px-6 py-3 bg-[#111827] hover:bg-black text-white font-black uppercase tracking-wider rounded-full shadow-lg shadow-black/20 transition-colors text-[11px]">
                  Salvar alterações
                </button>
              </div>

              {settingsSubPanel === 'gerais' && (
                <div className="space-y-6">
                  {/* Bloco 1: Gerenciamento */}
                  <div className="bg-white border-2 border-gray-100 rounded-[2rem] overflow-hidden shadow-sm">
                    <div className="bg-gray-50 px-8 py-5 border-b-2 border-gray-100">
                      <h3 className="text-slate-800 font-black uppercase tracking-wider text-sm">Gerenciamento (Básico)</h3>
                    </div>
                    <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Usarei minha loja como:</label>
                        <select className="w-full bg-gray-50 border-2 border-gray-100 text-sm font-bold text-slate-800 p-3.5 rounded-xl outline-none focus:border-[#ff7b00] transition-colors">
                          <option>Loja virtual</option>
                          <option>Catálogo (Sem preço)</option>
                          <option>Orçamento</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Gerenciar cadastro de clientes?</label>
                        <select className="w-full bg-gray-50 border-2 border-gray-100 text-sm font-bold text-slate-800 p-3.5 rounded-xl outline-none focus:border-[#ff7b00] transition-colors">
                          <option>Não gerenciar cadastro de clientes</option>
                          <option>Aprovar clientes manualmente</option>
                        </select>
                        <p className="text-[10px] text-slate-400 font-medium">O cliente irá precisar de uma aprovação posterior para completar o cadastro na loja.</p>
                      </div>
                      
                      <div className="space-y-2 md:col-span-2 pt-4 border-t-2 border-gray-50">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">Loja em manutenção? <HelpCircle className="w-3.5 h-3.5 text-gray-400" /></label>
                        <div className="flex items-center gap-3">
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" className="sr-only peer" />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#ff7b00]"></div>
                          </label>
                          <span className="text-sm text-slate-600 font-black uppercase">Não</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Bloco 2: Produtos */}
                  <div className="bg-white border-2 border-gray-100 rounded-[2rem] overflow-hidden shadow-sm">
                    <div className="bg-gray-50 px-8 py-5 border-b-2 border-gray-100">
                      <h3 className="text-slate-800 font-black uppercase tracking-wider text-sm">Produtos (Avançado)</h3>
                    </div>
                    <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Filtrar variações indisponíveis</label>
                        <select className="w-full bg-gray-50 border-2 border-gray-100 text-sm font-bold text-slate-800 p-3.5 rounded-xl outline-none focus:border-[#ff7b00] transition-colors">
                          <option>Mostrar produtos com variações indisponíveis</option>
                          <option>Ocultar produtos esgotados</option>
                        </select>
                        <p className="text-[10px] text-slate-400 font-medium">Busca e categoria não retornarão produtos cuja variação esteja indisponível.</p>
                      </div>
                      
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">Valor do produto restrito?</label>
                        <div className="flex items-center gap-3">
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" className="sr-only peer" />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#ff7b00]"></div>
                          </label>
                          <span className="text-sm text-slate-600 font-black uppercase">Não</span>
                        </div>
                        <p className="text-[10px] text-slate-400 font-medium">Exibir o valor dos produtos apenas para usuários logados na loja.</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

             {/* TELA DE PERSONALIZAR O LAYOUT (IDÊNTICO A LOJA INTEGRADA) */}
              {settingsSubPanel === 'visual' && (
                <div className="space-y-6">
                  <div className="bg-blue-50 border-2 border-blue-100 rounded-2xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-[#0055ff] shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm text-[#0055ff] font-bold">Você já tem um tema instalado.</p>
                        <p className="text-xs text-blue-800 font-medium mt-1">Nesta modalidade "Webview", sua vitrine é otimizada ao extremo para celulares. Ajuste apenas as cores principais abaixo.</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 bg-white border-2 border-gray-100 rounded-[2rem] p-8 shadow-sm">
                      <h3 className="text-slate-800 font-black uppercase tracking-wider text-sm mb-6">Estrutura do Webview</h3>
                      
                      {/* Representação visual do celular (Wireframe) */}
                      <div className="max-w-xs mx-auto border-4 border-slate-800 rounded-[3rem] p-4 bg-gray-50 h-[500px] flex flex-col gap-3 relative shadow-xl">
                        <div className="w-32 h-4 bg-slate-800 rounded-full mx-auto mb-2 absolute top-0 left-1/2 -translate-x-1/2 rounded-t-none"></div>
                        <div className="w-full bg-[#ff7b00] rounded-xl h-16 shrink-0 flex items-center justify-center text-white text-[10px] font-bold">Menu Superior</div>
                        <div className="w-full bg-gray-200 rounded-xl h-32 shrink-0 flex items-center justify-center text-slate-500 text-[10px] font-bold">Banners</div>
                        <div className="grid grid-cols-2 gap-2 flex-1">
                          <div className="bg-white border-2 border-gray-100 rounded-xl flex items-center justify-center text-slate-400 text-[9px] font-bold">Produto</div>
                          <div className="bg-white border-2 border-gray-100 rounded-xl flex items-center justify-center text-slate-400 text-[9px] font-bold">Produto</div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-gray-50 border-2 border-gray-100 rounded-[2rem] p-6 space-y-3">
                      <button className="w-full bg-white border border-gray-200 p-4 rounded-xl flex items-center justify-between text-xs font-bold text-slate-700 hover:border-[#0055ff] transition-colors">Cores Predominantes <ChevronDown className="w-4 h-4" /></button>
                      <button className="w-full bg-white border border-gray-200 p-4 rounded-xl flex items-center justify-between text-xs font-bold text-slate-700 hover:border-[#0055ff] transition-colors">Botões e Tarjas <ChevronDown className="w-4 h-4" /></button>
                      <button className="w-full bg-white border border-gray-200 p-4 rounded-xl flex items-center justify-between text-xs font-bold text-slate-700 hover:border-[#0055ff] transition-colors">Fontes <ChevronDown className="w-4 h-4" /></button>
                    </div>
                  </div>
                </div>
              )}

              {/* Telas provisórias para os outros menus */}
              {settingsSubPanel !== 'gerais' && settingsSubPanel !== 'visual' && (
                <div className="bg-white border-2 border-gray-100 rounded-[2rem] p-12 text-center shadow-sm">
                  <Settings className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <h3 className="text-xl font-black uppercase text-slate-800">Módulo em Desenvolvimento</h3>
                  <p className="text-sm text-slate-500 mt-2 font-medium">As configurações de {settingsSubPanel} estarão disponíveis na próxima atualização do SaaS Velo.</p>
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* --- ADD/EDIT PRODUCT DIALOG MODAL --- */}
      {/* ... (O Modal de Novo Produto já está correto lá em cima) ... */}

      {/* --- MODAL IMPORTAÇÃO XML (MAMEDES) --- */}
      {isXmlModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-[2rem] w-full max-w-xl shadow-2xl overflow-hidden flex flex-col border border-white">
            
            <div className="p-6 border-b-2 border-gray-50 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-black uppercase text-slate-800">Importação em Massa</h3>
                <p className="text-xs font-medium text-slate-500 mt-1">Integração XML via Loja Integrada ou Google Merchant</p>
              </div>
              <button onClick={() => setIsXmlModalOpen(false)} className="w-10 h-10 bg-gray-100 hover:bg-red-50 text-gray-500 hover:text-red-500 rounded-full flex items-center justify-center transition-colors"><X className="w-5 h-5" /></button>
            </div>

            <div className="p-6 space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-600">URL do Arquivo XML</label>
                <input 
                  type="text" 
                  value={xmlUrl} 
                  onChange={(e) => setXmlUrl(e.target.value)} 
                  className="w-full bg-gray-50 border-2 border-gray-100 text-sm font-medium text-slate-800 p-4 rounded-xl focus:border-[#ff7b00] outline-none transition-colors" 
                  placeholder="https://loja.mamedes.com.br/xml/googlemerchant.xml"
                />
              </div>
              
              <div className="bg-orange-50 p-4 rounded-xl border border-orange-100 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-[#ff7b00] shrink-0 mt-0.5" />
                <p className="text-xs text-slate-700 font-medium leading-relaxed">
                  Ao clicar no botão abaixo, nosso sistema irá ler a URL da <strong>Mamedes Papeis</strong> e cadastrar automaticamente os produtos no Firebase.
                </p>
              </div>
            </div>

            <div className="p-6 border-t-2 border-gray-50 bg-gray-50/50 flex justify-end">
              <button 
                onClick={handleImportXML} 
                disabled={isImporting}
                className="px-8 py-3.5 bg-[#111827] hover:bg-black disabled:bg-gray-300 text-white font-black uppercase tracking-wider rounded-full shadow-lg transition-all flex items-center gap-2"
              >
                {isImporting ? (
                  <> <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Importando do XML... </>
                ) : (
                  <> <Layers className="w-4 h-4" /> Iniciar Sincronização </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* WIDGET DE SUPORTE VELO SAAS */}
      <VeloSupportWidget
        tenantId={authRole.tenantId} 
        tenantName={settings.businessName} 
      />

    </div>
  );
}