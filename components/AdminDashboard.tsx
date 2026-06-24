"use client";

import React, { useState } from 'react';
import { 
  ShoppingBag, Settings, MessageSquare, Plus, Edit2, Trash2, 
  Search, CheckCircle2, DollarSign, Eye, EyeOff, User, Sparkles,
  Layers, AlertCircle, Send, HelpCircle, FileCheck, Percent,
  TrendingUp, X, CreditCard, Sun, Moon, ExternalLink, ChevronDown, List,
  Megaphone, ChevronLeft, ChevronRight, Filter,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import { Product, Order, ChatSession, TenantSettings, OrderStatus, PaymentStatus } from '../types';
import { INITIAL_ORDERS, INITIAL_CHATS, INITIAL_SETTINGS } from '../data/mokedData';
import VeloSupportWidget from './VeloSupportWidget';
import { useProducts } from '../hooks/useProducts';
import { useOrders } from '../hooks/useOrders';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../services/firebase';

export default function AdminDashboard() {
  // Theme state
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Multi-tenant auth details simulation (Movi para cima para podermos usar o tenantId)
  const [authRole, setAuthRole] = useState({
    email: 'contato@mamedes.com.br',
    role: 'merchant_owner',
    businessType: 'whatsapp_catalog', 
    tenantId: 'mamedes' // ID REAL DA LOJA
  });

  // Conexão em Tempo Real com o Firebase (Magia acontecendo!)
  const { products, addProduct, updateProduct, deleteProduct } = useProducts(authRole.tenantId);
  const { orders, updateStatus: updateOrderStatus } = useOrders(authRole.tenantId); // PEDIDOS REAIS!
  
  // Original States
  const [chats, setChats] = useState<ChatSession[]>(INITIAL_CHATS);
  const [settings, setSettings] = useState<TenantSettings>(INITIAL_SETTINGS);

  // Navigation tabs
const [activePanel, setActivePanel] = useState<'dashboard' | 'products' | 'categories' | 'orders' | 'chats' | 'settings'>('dashboard');
  
  // Controles do novo Menu estilo Loja Integrada
  const [isSettingsExpanded, setIsSettingsExpanded] = useState(false);
  const [settingsSubPanel, setSettingsSubPanel] = useState('gerais');
    

  // Estados para o Importador de XML
  const [isXmlModalOpen, setIsXmlModalOpen] = useState(false);
  const [xmlUrl, setXmlUrl] = useState('https://loja.mamedes.com.br/xml/b7ef8/googlemerchant.xml');
  const [isImporting, setIsImporting] = useState(false);

  // Search and Filter states
  const [productSearch, setProductSearch] = useState('');
  const [orderFilter, setOrderFilter] = useState<'all' | 'pending' | 'paid' | 'delivered'>('all');

  // Product Pagination & Filters
  const [productCategoryFilter, setProductCategoryFilter] = useState('all');
  const [productStatusFilter, setProductStatusFilter] = useState('all');
  const [productItemsPerPage, setProductItemsPerPage] = useState(25);
  const [productCurrentPage, setProductCurrentPage] = useState(1);

  React.useEffect(() => {
    setProductCurrentPage(1);
  }, [productSearch, productCategoryFilter, productStatusFilter, productItemsPerPage]);

  // Product Dialog/Form state
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  // Category Dialog/Form state
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<{name: string, order: number, isActive: boolean} | null>(null);
  const [categoryForm, setCategoryForm] = useState({ name: '', order: 1, isActive: true });

  // Puxa as categorias ativas dinamicamente de todos os produtos
  // No Velo Delivery real isso vem de uma tabela "Categories", mas aqui vamos 
  // agregar os nomes lendo os produtos (O que facilita para importar XML)
  const uniqueCategories = Array.from(new Set(products.map(p => p.category))).filter(Boolean).map(catName => {
      // Como não temos tabela de categorias separada ainda, vamos mockar os dados 
      // para exibir o olho e a ordem na tela baseados nos produtos dessa categoria
      const catProducts = products.filter(p => p.category === catName);
      const isActive = catProducts.some(p => p.isActive); // Se 1 produto for ativo, a categoria é ativa
      return { name: catName, order: 1, isActive: isActive, count: catProducts.length };
  }).sort((a, b) => a.name.localeCompare(b.name));

  // Função para salvar (ou "criar" o produto fantasma que sustenta a categoria)
  const saveCategory = async (e: React.FormEvent) => {
      e.preventDefault();
      
      if (editingCategory) {
          // Atualiza todos os produtos dessa categoria para o nome/status novo
          const prodsToUpdate = products.filter(p => p.category === editingCategory.name);
          for (const p of prodsToUpdate) {
              await updateProduct(p.id, { 
                  category: categoryForm.name, 
                  isActive: categoryForm.isActive 
              });
          }
      } else {
          // Cria o produto "fantasma" que sustenta a categoria nova
          await addProduct({
              name: `_CAT_${categoryForm.name}`,
              description: 'Categoria base',
              price: 0,
              imageUrl: '',
              category: categoryForm.name,
              stock: 0,
              sku: `CAT-${Date.now()}`,
              isActive: categoryForm.isActive, 
              tenantId: settings.tenantId
          });
      }
      setIsCategoryModalOpen(false);
  };
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

  const [settingsForm, setSettingsForm] = useState({ 
    ...settings, 
    primaryColor: '#357b64',
    logoUrl: '',
    slogan: 'Catálogo Exclusivo', 
    whatsappNumber: '5511999999999', 
    mpAccessToken: '',
    metaPhoneId: '',
    metaApiToken: '',
    storeMode: 'orcamento', 
    maintenanceMode: false,
    enableAbandonedCart: false,
    abandonedCartDiscount: 5,
    productLayout: 'list'
  });
  
  const [settingsSuccess, setSettingsSuccess] = useState(false);
  const [openVisualAccordion, setOpenVisualAccordion] = useState<string | null>('cores');
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);

  // Assim que o painel abrir, ele vai olhar no LocalStorage e puxar a cor/logo salvas!
  React.useEffect(() => {
    const savedColor = localStorage.getItem('velo_theme_color');
    const savedLogo = localStorage.getItem('velo_store_logo');
    const savedName = localStorage.getItem('velo_store_name');
    const savedSlogan = localStorage.getItem('velo_store_slogan');
    const savedWhatsapp = localStorage.getItem('velo_store_whatsapp');
    const savedMpToken = localStorage.getItem('velo_mp_token');
    const savedMetaPhoneId = localStorage.getItem('velo_meta_phone_id');
    const savedMetaToken = localStorage.getItem('velo_meta_token');
   const savedMode = localStorage.getItem('velo_store_mode');
    const savedMaintenance = localStorage.getItem('velo_store_maintenance') === 'true';
    const savedLayout = localStorage.getItem('velo_store_layout') || 'list';

    setSettingsForm(prev => ({
      ...prev,
      primaryColor: savedColor || prev.primaryColor,
      logoUrl: savedLogo || prev.logoUrl,
      businessName: savedName || prev.businessName,
      slogan: savedSlogan || prev.slogan,
      whatsappNumber: savedWhatsapp || prev.whatsappNumber,
      mpAccessToken: savedMpToken || '',
      metaPhoneId: savedMetaPhoneId || '',
      metaApiToken: savedMetaToken || '',
      storeMode: savedMode || 'orcamento',
      maintenanceMode: savedMaintenance,
      productLayout: savedLayout
    }));
  }, []);

const [isUploadingProductImage, setIsUploadingProductImage] = useState(false);

  // Upload da Foto do Produto para o Cloudinary
  const handleProductImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingProductImage(true);
    const formData = new FormData();
    formData.append('file', file);
    
    const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    
    if (!uploadPreset || !cloudName) {
      alert("Chaves do Cloudinary não encontradas no arquivo .env.local.");
      setIsUploadingProductImage(false);
      return;
    }

    formData.append('upload_preset', uploadPreset); 
    
    try {
      const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      
      if (data.secure_url) {
        setProductForm({ ...productForm, imageUrl: data.secure_url });
      } else {
        alert("Erro ao fazer o upload da imagem do produto.");
      }
    } catch (error) {
      alert("Falha de conexão com a nuvem de imagens.");
    } finally {
      setIsUploadingProductImage(false);
    }
  };
  // Upload Direto para o Cloudinary usando variáveis de ambiente (.env)
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingLogo(true);
    const formData = new FormData();
    formData.append('file', file);
    
    // Puxa os dados seguros do arquivo .env.local
    const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    
    if (!uploadPreset || !cloudName) {
      alert("Faltam as chaves do Cloudinary no arquivo .env.local!");
      setIsUploadingLogo(false);
      return;
    }

    formData.append('upload_preset', uploadPreset); 
    
    try {
      const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      
      if (data.secure_url) {
        // Se deu certo, ele coloca o link final na caixinha de texto automaticamente!
        setSettingsForm({ ...settingsForm, logoUrl: data.secure_url });
      } else {
        alert(`Erro do Cloudinary: ${data.error?.message || "Preset pode não estar como Unsigned"}`);
      }
    } catch (error) {
      console.error(error);
      alert("Erro de conexão ao enviar a imagem.");
    } finally {
      setIsUploadingLogo(false);
    }
  };

  // Salvar Configurações
  const saveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    setSettings(settingsForm);
    
    // Salva no navegador para a Vitrine ler as customizações
    localStorage.setItem('velo_theme_color', settingsForm.primaryColor);
    localStorage.setItem('velo_store_logo', settingsForm.logoUrl);
    localStorage.setItem('velo_store_name', settingsForm.businessName);
    localStorage.setItem('velo_store_slogan', settingsForm.slogan);
    localStorage.setItem('velo_store_whatsapp', settingsForm.whatsappNumber);
    
    // Salva as Configurações Gerais
    localStorage.setItem('velo_store_mode', settingsForm.storeMode || 'orcamento');
    localStorage.setItem('velo_store_maintenance', settingsForm.maintenanceMode ? 'true' : 'false');
    localStorage.setItem('velo_store_layout', settingsForm.productLayout || 'list');
    
    window.dispatchEvent(new Event('storage'));
    
    setSettingsSuccess(true);
    setTimeout(() => setSettingsSuccess(false), 3000);
  };

  // Estados de Gerenciamento de Equipe (MOCKADO para design inicial)
  const [teamMembers, setTeamMembers] = useState([
    { id: '1', email: 'contato@mamedes.com.br', role: 'Administrador (Dono)', status: 'Ativo' }
  ]);
  const [newTeamEmail, setNewTeamEmail] = useState('');
  const [newTeamRole, setNewTeamRole] = useState('Vendedor / Atendente');

  const handleAddTeamMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeamEmail.trim()) return;
    setTeamMembers([...teamMembers, { 
      id: Date.now().toString(), 
      email: newTeamEmail, 
      role: newTeamRole, 
      status: 'Aguardando Login' 
    }]);
    setNewTeamEmail('');
  };

  // Filtered Products

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
      console.log("1. Solicitando XML via Backend Velo...");
      
      // Chama a nossa API segura (passa direto por qualquer CORS/Adblock)
      const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      const apiUrl = isLocal ? '/api/import-xml' : 'https://app.velodelivery.com.br/api/import-xml'; // ⚠️ Mude para o domínio base do seu app depois
      
      const response = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ xmlUrl: xmlUrl })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Erro de conexão (Status: ${response.status}).`);
      }
      
      const xmlText = await response.text();

      console.log("2. Convertendo texto para DOM XML...");
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlText, "text/xml");
      
      // Procura por <item> (Padrão RSS/Merchant) ou <entry> (Padrão Atom)
      let items = xmlDoc.getElementsByTagName("item");
      if (items.length === 0) {
        items = xmlDoc.getElementsByTagName("entry");
      }

      if (items.length === 0) {
        throw new Error("Nenhum produto encontrado. Verifique se o XML tem a tag <item>.");
      }

      let importedCount = 0;

      // Extrator inteligente: Lê a tag com ou sem o prefixo 'g:'
      const getTag = (el: any, tag: string, prefix = "g") => {
        let val = el.getElementsByTagName(`${prefix}:${tag}`)[0]?.textContent;
        if (!val) val = el.getElementsByTagName(tag)[0]?.textContent;
        return val || "";
      };

      const importLimit = items.length;
      console.log(`3. Importando todos os ${importLimit} produtos...`);

      for (let i = 0; i < importLimit; i++) {
        const item = items[i];
        
        const title = getTag(item, "title", "") || "Produto Importado";
        const description = getTag(item, "description", "");
        const imageLink = getTag(item, "image_link");
        
        // Tratamento robusto de preço BR
        const priceRaw = getTag(item, "price") || "0";
        const cleanPriceString = priceRaw.replace(/[^\d.,]/g, '').replace(',', '.');
        const priceNumber = Number(cleanPriceString) || 0;
        
        const rawCategory = getTag(item, "product_type") || "Geral";
        const category = rawCategory.split('>').pop()?.trim() || rawCategory;
        
        const ean = getTag(item, "gtin");
        const sku = getTag(item, "id") || `SKU-XML-${Date.now().toString().slice(-4)}${i}`;

        await addProduct({
          name: title.substring(0, 100),
          description: description.substring(0, 400),
          price: priceNumber,
          imageUrl: imageLink || "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&q=80&w=600",
          category: category,
          stock: 99,
          sku: sku,
          isActive: true,
          ean: ean,
          ncm: '',
          weight: 0,
          seoTitle: title.substring(0, 60),
          seoDescription: description.substring(0, 160),
          tenantId: authRole.tenantId
        });

        importedCount++;
      }

      alert(`✅ Sincronização concluída!\n\n${importedCount} produtos foram cadastrados com sucesso.`);
      setIsXmlModalOpen(false);
    } catch (error: any) {
      console.error(error);
      alert(`⚠️ Erro ao importar: ${error.message}`);
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

  // Filtered & Paginated Products
  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(productSearch.toLowerCase()) || p.sku.toLowerCase().includes(productSearch.toLowerCase());
    const matchesCategory = productCategoryFilter === 'all' || p.category === productCategoryFilter;
    const matchesStatus = productStatusFilter === 'all' || (productStatusFilter === 'active' && p.isActive) || (productStatusFilter === 'inactive' && !p.isActive);
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const totalProductPages = Math.ceil(filteredProducts.length / productItemsPerPage);
  const paginatedProducts = filteredProducts.slice(
    (productCurrentPage - 1) * productItemsPerPage, 
    productCurrentPage * productItemsPerPage
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

            <button onClick={() => setActivePanel('categories')} className={`w-full flex items-center gap-3 px-5 py-3.5 rounded-full text-sm font-black uppercase tracking-wider transition-all ${activePanel === 'categories' ? 'bg-[#111827] text-white shadow-lg shadow-black/20' : 'text-slate-500 hover:bg-gray-100 hover:text-slate-900'}`}>
              <List className="w-5 h-5" /> CATEGORIAS
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
                      <button onClick={() => { setActivePanel('settings'); setSettingsSubPanel('equipe'); }} className={`block w-full text-left text-xs py-2.5 font-bold rounded-full px-4 transition-colors ${settingsSubPanel === 'equipe' && activePanel === 'settings' ? 'bg-orange-50 text-[#ff7b00]' : 'text-slate-500 hover:text-slate-900 hover:bg-gray-50'}`}>Acesso e Equipe</button>
                      <button onClick={() => { setActivePanel('settings'); setSettingsSubPanel('integracoes'); }} className={`block w-full text-left text-xs py-2.5 font-bold rounded-full px-4 transition-colors ${settingsSubPanel === 'integracoes' && activePanel === 'settings' ? 'bg-orange-50 text-[#ff7b00]' : 'text-slate-500 hover:text-slate-900 hover:bg-gray-50'}`}>Integrações e APIs</button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </nav>

          <div className="p-5 border-t border-gray-100 bg-gray-50/50">
            <div className="flex items-center justify-center mb-4">
               <a href={`/${authRole.tenantId}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-[#111827] hover:text-[#0055ff] transition-colors">
                 <ExternalLink className="w-4 h-4"/> VER LOJA ONLINE
               </a>
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
{/* --- ADD CATEGORY DIALOG MODAL --- */}
      <AnimatePresence>
        {isCategoryModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 z-[200] flex items-center justify-center p-4 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl relative">
              <button onClick={() => setIsCategoryModalOpen(false)} className="absolute top-6 right-6 p-2 bg-gray-50 rounded-full hover:bg-red-50 hover:text-red-500 text-gray-400 transition-colors"><X size={18}/></button>
              
              <h2 className="text-2xl font-black italic mb-6 uppercase text-slate-900">Nova Categoria</h2>
              <form onSubmit={async (e) => {
                  e.preventDefault();
                  // No sistema real, a gente criaria um banco separado para Categorias.
                  // Mas como o seu front-end é inteligente e deduz as categorias lendo a lista de produtos,
                  // Se ele cria uma categoria vazia, a gente "finge" salvando um produto fantasma
                  // que ficará inativo apenas para a aba de Categoria registrar a existência dela.
                  await addProduct({
                      name: `_CAT_BASE_${categoryForm.name}`,
                      description: 'Produto oculto para sustentar a categoria.',
                      price: 0,
                      imageUrl: '',
                      category: categoryForm.name,
                      stock: 0,
                      sku: `CAT-${Date.now()}`,
                      isActive: false, // Cliente não vê
                      tenantId: settings.tenantId
                  });
                  setIsCategoryModalOpen(false);
                  alert("Categoria adicionada!");
              }} className="space-y-4">
                  <div>
                      <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1 block mb-1">Nome da Categoria</label>
                      <input 
                          type="text" 
                          required 
                          value={categoryForm.name} 
                          onChange={e => setCategoryForm({ ...categoryForm, name: e.target.value })} 
                          placeholder="Ex: Hambúrgueres"
                          className="w-full p-4 bg-gray-50 rounded-2xl outline-none focus:ring-2 ring-[#0055ff] font-bold text-sm border border-gray-200" 
                      />
                  </div>
                  <button type="submit" className="w-full bg-[#111827] text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl hover:bg-black transition-all active:scale-95">Salvar Categoria</button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* TELA DE CATEGORIAS */}
          {activePanel === 'categories' && (
            <div className="bg-white border-2 border-gray-100 rounded-[2rem] p-8 space-y-6 max-w-6xl mx-auto shadow-sm animate-in fade-in slide-in-from-bottom-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b-2 border-gray-50 pb-6">
                <div>
                  <h2 className="text-2xl font-black italic uppercase text-[#111827]">Categorias</h2>
                  <p className="text-sm font-bold text-slate-400 mt-1">Organize as vitrines do seu cardápio.</p>
                </div>
                <button 
                  onClick={() => {
                    setEditingCategory(null);
                    setCategoryForm({name: '', order: 1, isActive: true}); 
                    setIsCategoryModalOpen(true);
                  }} 
                  className="px-6 py-3 bg-[#ff7b00] hover:bg-[#e66a00] transition-all text-white font-black uppercase tracking-wider rounded-full text-[11px] flex items-center gap-2 shadow-lg shadow-orange-500/30"
                >
                  <Plus className="w-4 h-4" /> Nova Categoria
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {uniqueCategories.length === 0 ? (
                  <div className="col-span-full p-12 text-center border-2 border-dashed border-gray-200 rounded-3xl bg-gray-50">
                    <List className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="font-bold text-gray-500">Nenhuma categoria criada.</p>
                    <p className="text-xs font-medium text-gray-400 mt-1">Ao cadastrar um produto, sua categoria aparecerá aqui automaticamente.</p>
                  </div>
                ) : (
                  uniqueCategories.map((cat, index) => (
                    <div key={index} className="flex items-center justify-between p-6 bg-white rounded-3xl border-2 border-gray-100 hover:border-[#0055ff] hover:shadow-lg transition-all group">
                      <div>
                        <h3 className={`font-black uppercase tracking-widest text-sm leading-tight ${cat.isActive ? 'text-slate-800' : 'text-slate-400 line-through'}`}>
                          {cat.name}
                        </h3>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">{cat.count} produtos</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={async () => {
                            if(window.confirm(`Deseja ${cat.isActive ? 'ocultar' : 'ativar'} a categoria e todos os produtos dentro dela?`)) {
                               const prodsToUpdate = products.filter(p => p.category === cat.name);
                               for (const p of prodsToUpdate) {
                                   await updateProduct(p.id, { isActive: !cat.isActive });
                               }
                            }
                          }}
                          className={`p-2.5 rounded-xl transition-all shadow-sm ${cat.isActive ? 'bg-green-50 text-green-600 border border-green-100 hover:bg-green-100' : 'bg-red-50 text-red-600 border border-red-100 hover:bg-red-100'}`}
                          title={cat.isActive ? 'Visível (Clique para Ocultar)' : 'Oculta (Clique para Ativar)'}
                        >
                          {cat.isActive ? <Eye size={18} /> : <EyeOff size={18} />}
                        </button>
                        
                        <button 
                          onClick={() => {
                            setEditingCategory(cat);
                            setCategoryForm({ name: cat.name, order: cat.order, isActive: cat.isActive });
                            setIsCategoryModalOpen(true);
                          }}
                          className="p-2.5 bg-blue-50 text-blue-600 border border-blue-100 hover:bg-blue-100 rounded-xl transition-all shadow-sm"
                          title="Editar"
                        >
                          <Edit2 size={18} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
          {activePanel === 'products' && (
            <div className="bg-white border-2 border-gray-100 rounded-[2rem] p-8 space-y-6 max-w-6xl mx-auto shadow-sm">
              <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 border-b-2 border-gray-50 pb-6">
                <h2 className="text-2xl font-black italic uppercase text-[#111827]">Produtos</h2>
                
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2 bg-gray-50 p-1.5 rounded-full border border-gray-200">
                    <Filter className="w-4 h-4 text-gray-400 ml-2" />
                    <select 
                      value={productCategoryFilter} 
                      onChange={(e) => setProductCategoryFilter(e.target.value)}
                      className="bg-transparent text-xs font-bold text-slate-700 py-1.5 px-2 outline-none cursor-pointer border-r border-gray-200"
                    >
                      <option value="all">Todas as Categorias</option>
                      {Array.from(new Set(products.map(p => p.category))).filter(Boolean).map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>

                    <select 
                      value={productStatusFilter} 
                      onChange={(e) => setProductStatusFilter(e.target.value)}
                      className="bg-transparent text-xs font-bold text-slate-700 py-1.5 px-2 outline-none cursor-pointer border-r border-gray-200"
                    >
                      <option value="all">Todos Status</option>
                      <option value="active">Ativos</option>
                      <option value="inactive">Inativos</option>
                    </select>

                    <select 
                      value={productItemsPerPage} 
                      onChange={(e) => setProductItemsPerPage(Number(e.target.value))}
                      className="bg-transparent text-xs font-bold text-slate-700 py-1.5 px-2 outline-none cursor-pointer"
                    >
                      <option value={25}>25 por tela</option>
                      <option value={50}>50 por tela</option>
                      <option value={100}>100 por tela</option>
                    </select>
                  </div>

                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input type="text" placeholder="Buscar por SKU ou Nome..." value={productSearch} onChange={(e) => setProductSearch(e.target.value)} className="bg-gray-50 text-sm text-slate-800 pl-10 pr-4 py-2.5 rounded-full border-2 border-gray-100 focus:border-[#ff7b00] outline-none w-[180px] sm:w-[220px] transition-all font-medium" />
                  </div>
                  
                  <div className="h-8 w-px bg-gray-200 mx-1 hidden lg:block"></div>
                  
                  <div className="flex items-center gap-2">
                    <button onClick={() => setIsXmlModalOpen(true)} className="px-5 py-2.5 bg-white border-2 border-gray-200 hover:border-[#111827] text-[#111827] transition-all font-black uppercase tracking-wider rounded-full text-[10px] flex items-center gap-2">
                      <Layers className="w-3.5 h-3.5" /> Importar XML
                    </button>
                    <button onClick={openNewProductModal} className="px-5 py-2.5 bg-[#ff7b00] hover:bg-[#e66a00] transition-all text-white font-black uppercase tracking-wider rounded-full text-[10px] flex items-center gap-2 shadow-lg shadow-orange-500/30">
                      <Plus className="w-3.5 h-3.5" /> Novo Produto
                    </button>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto rounded-2xl border-2 border-gray-50">
                <table className="w-full text-sm text-left text-slate-700">
                  <thead className="bg-gray-50 text-slate-500 uppercase font-black text-[10px] tracking-widest">
                    <tr><th className="px-6 py-4">Produto</th><th className="px-6 py-4">SKU</th><th className="px-6 py-4">Preço</th><th className="px-6 py-4">Estoque</th><th className="px-6 py-4">Status</th><th className="px-6 py-4 text-right">Ações</th></tr>
                  </thead>
                  <tbody className="divide-y-2 divide-gray-50">
                    {paginatedProducts.length === 0 ? (
                      <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-400 font-bold">Nenhum produto localizado.</td></tr>
                    ) : (
                      paginatedProducts.map(p => (
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

              {totalProductPages > 1 && (
                <div className="flex items-center justify-between border-t-2 border-gray-50 pt-4 px-2">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Mostrando {(productCurrentPage - 1) * productItemsPerPage + 1} até {Math.min(productCurrentPage * productItemsPerPage, filteredProducts.length)} de {filteredProducts.length}
                  </span>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setProductCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={productCurrentPage === 1}
                      className="p-2 bg-gray-50 border border-gray-200 rounded-lg text-slate-600 hover:border-[#0055ff] hover:text-[#0055ff] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <span className="text-xs font-black text-slate-800 px-2">
                      {productCurrentPage} de {totalProductPages}
                    </span>
                    <button 
                      onClick={() => setProductCurrentPage(prev => Math.min(prev + 1, totalProductPages))}
                      disabled={productCurrentPage === totalProductPages}
                      className="p-2 bg-gray-50 border border-gray-200 rounded-lg text-slate-600 hover:border-[#0055ff] hover:text-[#0055ff] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              )}
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
            <div className="space-y-6 max-w-6xl mx-auto">
              <div className="flex justify-between items-end">
                <div>
                  <h2 className="text-3xl font-black italic uppercase text-[#111827]">Atendimento (WhatsApp)</h2>
                  <p className="text-slate-500 font-bold mt-1 text-sm">Responda seus clientes conectando sua conta da Meta.</p>
                </div>
              </div>
              <AdminChat />
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
                        <select 
                          value={settingsForm.storeMode || 'orcamento'}
                          onChange={(e) => setSettingsForm({...settingsForm, storeMode: e.target.value})}
                          className="w-full bg-gray-50 border-2 border-gray-100 text-sm font-bold text-slate-800 p-3.5 rounded-xl outline-none focus:border-[#0055ff] transition-colors cursor-pointer"
                        >
                          <option value="ecommerce">Loja virtual Completa</option>
                          <option value="catalogo">Catálogo (Sem preço)</option>
                          <option value="orcamento">Orçamento (B2B Atacado)</option>
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
                            <input 
                              type="checkbox" 
                              checked={settingsForm.maintenanceMode || false}
                              onChange={(e) => setSettingsForm({...settingsForm, maintenanceMode: e.target.checked})}
                              className="sr-only peer" 
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#0055ff]"></div>
                          </label>
                          <span className="text-sm text-slate-600 font-black uppercase">{settingsForm.maintenanceMode ? 'SIM (Fechada)' : 'Não (Aberta)'}</span>
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
                      
                      {/* Pré-visualização Real do Site (Iframe) */}
                      <div className="max-w-[340px] mx-auto border-[10px] border-slate-900 rounded-[3rem] h-[650px] overflow-hidden relative shadow-2xl bg-white">
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-slate-900 rounded-b-3xl z-50"></div>
                        {/* O Iframe aponta para a rota da loja para mostrar a versão real mobile */}
                        <iframe 
                          src={`/${authRole.tenantId}`} 
                          title="Preview da Loja" 
                          className="w-full h-full border-none custom-scrollbar"
                        />
                      </div>
                    </div>

                    <div className="bg-gray-50 border-2 border-gray-100 rounded-[2rem] p-6 space-y-3">
                      
                      {/* Upload de Logo (Via Cloudinary) */}
                      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden p-4 space-y-3">
                        <label className="text-[10px] font-black uppercase text-slate-500">Logomarca da Loja (PNG/JPG)</label>
                        
                        <div className="flex items-center gap-4">
                          <label className="flex-1 cursor-pointer bg-gray-50 border-2 border-dashed border-gray-200 hover:border-[#0055ff] hover:bg-blue-50 transition-colors p-4 rounded-xl flex flex-col items-center justify-center gap-2 text-center">
                            {isUploadingLogo ? (
                              <div className="w-5 h-5 border-2 border-[#0055ff] border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                              <>
                                <Plus className="w-6 h-6 text-slate-400" />
                                <span className="text-[10px] font-bold text-slate-600">Clique para enviar imagem</span>
                              </>
                            )}
                            <input 
                              type="file" 
                              accept="image/*" 
                              onChange={handleLogoUpload} 
                              disabled={isUploadingLogo}
                              className="hidden" 
                            />
                          </label>

                          {settingsForm.logoUrl && (
                            <div className="w-20 h-20 bg-gray-100 rounded-xl p-2 border border-gray-200 flex items-center justify-center shrink-0 relative group">
                              <img src={settingsForm.logoUrl} alt="Logo Preview" className="max-w-full max-h-full object-contain" />
                              <button 
                                onClick={() => setSettingsForm({...settingsForm, logoUrl: ''})}
                                className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                        </div>
                        <p className="text-[9px] text-slate-400 font-medium">Sua imagem será enviada diretamente para a nuvem.</p>
                      </div>

                      {/* Acordeon Cores Funcional */}
                      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden transition-all">
                        <button onClick={() => setOpenVisualAccordion(openVisualAccordion === 'cores' ? null : 'cores')} className="w-full p-4 flex items-center justify-between text-xs font-bold text-slate-700 hover:text-[#0055ff] transition-colors outline-none">
                          Cor Predominante <ChevronDown className={`w-4 h-4 transition-transform ${openVisualAccordion === 'cores' ? 'rotate-180 text-[#0055ff]' : ''}`} />
                        </button>
                        {openVisualAccordion === 'cores' && (
                          <div className="p-4 pt-0 border-t border-gray-100 bg-gray-50/50">
                            
                            {/* Paleta de Cores Padrão */}
                            <div className="grid grid-cols-4 gap-3 mb-4">
                              {['#357b64', '#0055ff', '#ff7b00', '#111827', '#e11d48', '#8b5cf6', '#0ea5e9', '#f59e0b'].map(color => (
                                <button 
                                  key={color}
                                  onClick={() => setSettingsForm({...settingsForm, primaryColor: color})}
                                  style={{ backgroundColor: color }}
                                  className={`w-10 h-10 rounded-full border-4 shadow-sm hover:scale-110 transition-transform mx-auto ${settingsForm.primaryColor === color ? 'border-gray-900 scale-110' : 'border-white'}`}
                                />
                              ))}
                            </div>

                            {/* Seletor de Cor Customizada (Cor Livre) */}
                            <div className="pt-4 border-t border-gray-200">
                              <label className="text-[10px] font-black uppercase text-slate-500 block mb-2">Ou escolha a cor da sua marca</label>
                              <div className="flex items-center gap-3">
                                <div className="relative w-10 h-10 shrink-0 rounded-full overflow-hidden border-2 border-gray-200 shadow-sm hover:border-[#0055ff] transition-colors cursor-pointer">
                                  {/* Input nativo HTML tipo "color" escondido, clicável via CSS */}
                                  <input 
                                    type="color" 
                                    value={settingsForm.primaryColor}
                                    onChange={(e) => setSettingsForm({...settingsForm, primaryColor: e.target.value})}
                                    className="absolute -top-2 -left-2 w-16 h-16 cursor-pointer"
                                  />
                                </div>
                                <input 
                                  type="text" 
                                  value={settingsForm.primaryColor}
                                  onChange={(e) => setSettingsForm({...settingsForm, primaryColor: e.target.value})}
                                  placeholder="#HEX"
                                  className="w-full bg-white border border-gray-200 text-xs font-bold text-slate-700 p-2.5 rounded-lg outline-none focus:border-[#0055ff] uppercase"
                                />
                              </div>
                            </div>

                          </div>
                        )}
                      </div>

                      {/* Acordeon Layout Vitrine */}
                      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden transition-all">
                        <button onClick={() => setOpenVisualAccordion(openVisualAccordion === 'layout' ? null : 'layout')} className="w-full p-4 flex items-center justify-between text-xs font-bold text-slate-700 hover:text-[#0055ff] transition-colors outline-none">
                          Layout dos Produtos <ChevronDown className={`w-4 h-4 transition-transform ${openVisualAccordion === 'layout' ? 'rotate-180 text-[#0055ff]' : ''}`} />
                        </button>
                        {openVisualAccordion === 'layout' && (
                          <div className="p-4 pt-0 border-t border-gray-100 bg-gray-50/50 space-y-3">
                            <label className="text-[10px] font-black uppercase text-slate-500">Exibição no Celular</label>
                            <select 
                              value={settingsForm.productLayout || 'list'}
                              onChange={(e) => setSettingsForm({...settingsForm, productLayout: e.target.value})}
                              className="w-full bg-white border border-gray-200 text-xs font-bold text-slate-700 p-2.5 rounded-lg outline-none focus:border-[#0055ff]"
                            >
                              <option value="list">Em Lista (1 por linha, imagem à esquerda)</option>
                              <option value="grid">Em Grade (2 por linha, lado a lado)</option>
                            </select>
                          </div>
                        )}
                      </div>

                      {/* Acordeon Botões */}
                      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden transition-all">
                        <button onClick={() => setOpenVisualAccordion(openVisualAccordion === 'botoes' ? null : 'botoes')} className="w-full p-4 flex items-center justify-between text-xs font-bold text-slate-700 hover:text-[#0055ff] transition-colors outline-none">
                          Botões e Tarjas <ChevronDown className={`w-4 h-4 transition-transform ${openVisualAccordion === 'botoes' ? 'rotate-180 text-[#0055ff]' : ''}`} />
                        </button>
                        {openVisualAccordion === 'botoes' && (
                          <div className="p-4 pt-0 border-t border-gray-100 bg-gray-50/50 space-y-3">
                            <label className="text-[10px] font-black uppercase text-slate-500">Estilo das bordas</label>
                            <select className="w-full bg-white border border-gray-200 text-xs font-bold text-slate-700 p-2.5 rounded-lg outline-none focus:border-[#0055ff]">
                              <option>Arredondado (Moderno)</option>
                              <option>Quadrado (Clássico)</option>
                              <option>Pílula (Suave)</option>
                            </select>
                          </div>
                        )}
                      </div>

                      {/* Acordeon Fontes */}
                      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden transition-all">
                        <button onClick={() => setOpenVisualAccordion(openVisualAccordion === 'fontes' ? null : 'fontes')} className="w-full p-4 flex items-center justify-between text-xs font-bold text-slate-700 hover:text-[#0055ff] transition-colors outline-none">
                          Fontes <ChevronDown className={`w-4 h-4 transition-transform ${openVisualAccordion === 'fontes' ? 'rotate-180 text-[#0055ff]' : ''}`} />
                        </button>
                        {openVisualAccordion === 'fontes' && (
                          <div className="p-4 pt-0 border-t border-gray-100 bg-gray-50/50 space-y-3">
                            <label className="text-[10px] font-black uppercase text-slate-500">Tipografia Global</label>
                            <select className="w-full bg-white border border-gray-200 text-xs font-bold text-slate-700 p-2.5 rounded-lg outline-none focus:border-[#0055ff]">
                              <option>Inter (Recomendado)</option>
                              <option>Roboto</option>
                              <option>Montserrat</option>
                            </select>
                          </div>
                        )}
                      </div>

                    </div>
                  </div>
                </div>
              )}

              {/* TELA DE DADOS DA LOJA (CABEÇALHO) */}
              {settingsSubPanel === 'dados' && (
                <div className="bg-white border-2 border-gray-100 rounded-[2rem] overflow-hidden shadow-sm">
                  <div className="bg-gray-50 px-8 py-5 border-b-2 border-gray-100">
                    <h3 className="text-slate-800 font-black uppercase tracking-wider text-sm">Identidade da Loja</h3>
                  </div>
                  <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Nome da Loja</label>
                      <input 
                        type="text" 
                        value={settingsForm.businessName}
                        onChange={(e) => setSettingsForm({...settingsForm, businessName: e.target.value})}
                        className="w-full bg-gray-50 border-2 border-gray-100 text-sm font-bold text-slate-800 p-3.5 rounded-xl outline-none focus:border-[#0055ff] transition-colors"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Slogan / Frase de Efeito</label>
                      <input 
                        type="text" 
                        value={settingsForm.slogan}
                        onChange={(e) => setSettingsForm({...settingsForm, slogan: e.target.value})}
                        className="w-full bg-gray-50 border-2 border-gray-100 text-sm font-bold text-slate-800 p-3.5 rounded-xl outline-none focus:border-[#0055ff] transition-colors"
                        placeholder="Ex: Embalagens para seu negócio"
                      />
                    </div>
                    
                    {/* Novo Campo: Número do WhatsApp */}
                    <div className="space-y-2 md:col-span-2 pt-4 border-t border-gray-100">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                        WhatsApp de Vendas <MessageSquare className="w-3.5 h-3.5 text-[#25D366]" />
                      </label>
                      <p className="text-[10px] text-slate-400 font-medium -mt-1">Digite o número com DDD (Apenas números). Ex: 5511999999999</p>
                      <input 
                        type="text" 
                        value={settingsForm.whatsappNumber}
                        onChange={(e) => setSettingsForm({...settingsForm, whatsappNumber: e.target.value.replace(/\D/g, '')})}
                        className="w-full max-w-md bg-gray-50 border-2 border-gray-100 text-sm font-bold text-slate-800 p-3.5 rounded-xl outline-none focus:border-[#25D366] transition-colors"
                        placeholder="5511999999999"
                        maxLength={13}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* TELA DE EQUIPES E PERMISSÕES */}
              {settingsSubPanel === 'equipe' && (
                <div className="space-y-6">
                  {/* Formulário de Convite */}
                  <div className="bg-white border-2 border-gray-100 rounded-[2rem] p-8 shadow-sm">
                    <h3 className="text-slate-800 font-black uppercase tracking-wider text-sm mb-2">Convidar Funcionário</h3>
                    <p className="text-xs text-slate-500 font-medium mb-6">Autorize e-mails do Google (Gmail) para que sua equipe possa acessar o painel.</p>
                    
                    <form onSubmit={handleAddTeamMember} className="flex flex-col sm:flex-row items-end gap-4">
                      <div className="w-full space-y-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">E-mail (Conta Google)</label>
                        <input 
                          type="email" 
                          required
                          value={newTeamEmail}
                          onChange={(e) => setNewTeamEmail(e.target.value)}
                          placeholder="vendedor@gmail.com"
                          className="w-full bg-gray-50 border-2 border-gray-100 text-sm font-bold text-slate-800 p-3.5 rounded-xl outline-none focus:border-[#0055ff] transition-colors"
                        />
                      </div>
                      <div className="w-full sm:w-64 space-y-2 shrink-0">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Permissão</label>
                        <select 
                          value={newTeamRole}
                          onChange={(e) => setNewTeamRole(e.target.value)}
                          className="w-full bg-gray-50 border-2 border-gray-100 text-sm font-bold text-slate-800 p-3.5 rounded-xl outline-none focus:border-[#0055ff] transition-colors"
                        >
                          <option>Vendedor / Atendente</option>
                          <option>Administrador (Total)</option>
                        </select>
                      </div>
                      <button type="submit" className="w-full sm:w-auto px-8 py-3.5 bg-[#0055ff] hover:bg-blue-700 text-white font-black uppercase tracking-wider rounded-xl shadow-lg transition-colors text-[11px] shrink-0 h-[52px]">
                        Liberar Acesso
                      </button>
                    </form>
                  </div>

                  {/* Lista da Equipe */}
                  <div className="bg-white border-2 border-gray-100 rounded-[2rem] overflow-hidden shadow-sm">
                    <div className="bg-gray-50 px-8 py-5 border-b-2 border-gray-100 flex items-center justify-between">
                      <h3 className="text-slate-800 font-black uppercase tracking-wider text-sm">Contas Autorizadas</h3>
                      <span className="bg-[#111827] text-white text-[10px] font-bold px-3 py-1 rounded-full">{teamMembers.length} usuários</span>
                    </div>
                    <div className="divide-y-2 divide-gray-50">
                      {teamMembers.map(member => (
                        <div key={member.id} className="p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-gray-50 transition-colors">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-gray-200 text-slate-600 flex items-center justify-center font-black text-sm shrink-0">
                              {member.email.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="text-sm font-black text-slate-800">{member.email}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded border ${member.role.includes('Admin') ? 'bg-orange-50 text-orange-600 border-orange-200' : 'bg-blue-50 text-blue-600 border-blue-200'}`}>
                                  {member.role}
                                </span>
                                <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded border ${member.status === 'Ativo' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                                  {member.status}
                                </span>
                              </div>
                            </div>
                          </div>
                          {member.role !== 'Administrador (Dono)' && (
                            <button onClick={() => setTeamMembers(teamMembers.filter(m => m.id !== member.id))} className="text-slate-400 hover:text-red-500 p-2 rounded-lg hover:bg-red-50 transition-colors">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
{/* TELA DE INTEGRAÇÕES */}
              {settingsSubPanel === 'integracoes' && (
                <div className="space-y-6">
                  {/* Mercado Pago (OAuth Inteligente) */}
                  <div className="bg-white border-2 border-gray-100 rounded-[2rem] p-8 shadow-sm">
                    <h3 className="text-slate-800 font-black uppercase tracking-wider text-sm mb-2 flex items-center gap-2">
                      <CreditCard className="text-blue-500" size={20}/> Mercado Pago (Transparente)
                    </h3>
                    
                    {/* Valida se o Token já foi salvo pela API */}
                    {settings?.integrations?.mercadopago?.accessToken ? (
                        <div className="bg-green-50 border border-green-200 p-6 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-4 mt-6">
                            <div>
                                <p className="text-green-800 font-black flex items-center gap-2 uppercase tracking-widest text-sm">✅ Conta Conectada</p>
                                <p className="text-green-600 font-bold text-xs mt-1">Sua loja já pode receber Pix e Cartão nativamente.</p>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-slate-50 border border-slate-200 p-8 rounded-3xl text-center flex flex-col items-center justify-center gap-4 mt-6">
                            <p className="text-slate-500 font-bold text-sm">Autorize o sistema a processar pagamentos de Cartão e PIX caindo direto na sua conta do Mercado Pago.</p>
                            <button 
                                onClick={() => {
                                    // ⚠️ MUDE AQUI PARA O SEU APP ID REAL DO MERCADO PAGO ⚠️
                                    const MP_CLIENT_ID = "3333618086500697"; 
                                    
                                    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
                                    const redirectUri = isLocal 
                                        ? 'http://localhost:3000/api/mp-callback' 
                                        : 'https://app.velodelivery.com.br/api/mp-callback'; 

                                    // Manda o ID da Loja (tenantId) escondido no 'state'
                                    const authUrl = `https://auth.mercadopago.com.br/authorization?client_id=${MP_CLIENT_ID}&response_type=code&platform_id=mp&state=${authRole.tenantId}&redirect_uri=${encodeURIComponent(redirectUri)}`;

                                    window.location.href = authUrl;
                                }} 
                                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-blue-200 transition-all active:scale-95 flex items-center gap-2"
                            >
                                <CreditCard size={20}/> 🤝 Integrar Mercado Pago
                            </button>
                        </div>
                    )}
                  </div>

                  {/* WhatsApp Meta */}
                  <div className="bg-white border-2 border-gray-100 rounded-[2rem] p-8 shadow-sm">
                    <h3 className="text-slate-800 font-black uppercase tracking-wider text-sm mb-2 flex items-center gap-2">
                      <MessageSquare className="text-green-500" size={20}/> WhatsApp Oficial (Meta API)
                    </h3>
                    <p className="text-xs text-slate-500 font-medium mb-6">Conecte o número da sua loja para responder clientes direto do painel.</p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">ID do Número de Telefone</label>
                        <input 
                          type="text" 
                          value={settingsForm.metaPhoneId}
                          onChange={(e) => setSettingsForm({...settingsForm, metaPhoneId: e.target.value})}
                          placeholder="Apenas números..."
                          className="w-full bg-gray-50 border-2 border-gray-100 text-sm font-bold text-slate-800 p-3.5 rounded-xl outline-none focus:border-green-500 transition-colors mt-1"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Token de Acesso Permanente</label>
                        <input 
                          type="text" 
                          value={settingsForm.metaApiToken}
                          onChange={(e) => setSettingsForm({...settingsForm, metaApiToken: e.target.value})}
                          placeholder="EAAB..."
                          className="w-full bg-gray-50 border-2 border-gray-100 text-sm font-bold text-slate-800 p-3.5 rounded-xl outline-none focus:border-green-500 transition-colors mt-1"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
{/* --- ADD/EDIT CATEGORY MODAL --- */}
      <AnimatePresence>
        {isCategoryModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 z-[200] flex items-center justify-center p-4 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl relative flex flex-col">
              <button onClick={() => setIsCategoryModalOpen(false)} className="absolute top-6 right-6 p-2 bg-gray-50 rounded-full hover:bg-red-50 hover:text-red-500 text-gray-400 transition-colors"><X size={18}/></button>
              
              <h2 className="text-2xl font-black italic mb-6 uppercase text-slate-900 leading-none">
                {editingCategory ? 'Editar' : 'Nova'} Categoria
              </h2>
              
              <form onSubmit={saveCategory} className="space-y-5">
                  <div>
                      <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1 block mb-1">Nome da Categoria</label>
                      <input 
                          type="text" 
                          required 
                          value={categoryForm.name} 
                          onChange={e => setCategoryForm({ ...categoryForm, name: e.target.value })} 
                          placeholder="Ex: Hambúrgueres"
                          className="w-full p-4 bg-white rounded-2xl outline-none focus:ring-2 ring-[#0055ff] font-bold text-sm border border-gray-200 shadow-sm" 
                      />
                  </div>

                  <div>
                      <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1 block mb-1">Ordem na Tela (Vitrine)</label>
                      <input 
                          type="number" 
                          required 
                          value={categoryForm.order} 
                          onChange={e => setCategoryForm({ ...categoryForm, order: Number(e.target.value) })} 
                          className="w-full p-4 bg-white rounded-2xl outline-none focus:ring-2 ring-[#0055ff] font-bold text-sm border border-gray-200 shadow-sm" 
                      />
                  </div>

                  <label className={`flex items-center justify-between p-4 rounded-2xl border-2 mb-4 cursor-pointer transition-all shadow-sm ${categoryForm.isActive ? 'bg-green-50 border-green-200' : 'bg-slate-50 border-slate-200 opacity-70'}`}>
                      <div className="flex flex-col">
                          <span className={`font-black uppercase text-xs tracking-widest ${categoryForm.isActive ? 'text-green-700' : 'text-slate-500'}`}>
                              {categoryForm.isActive ? '✅ Categoria Ativa' : '🚫 Categoria Oculta'}
                          </span>
                      </div>
                      <input 
                          type="checkbox" 
                          checked={categoryForm.isActive} 
                          onChange={(e) => setCategoryForm({ ...categoryForm, isActive: e.target.checked })}
                          className="w-6 h-6 accent-green-600 cursor-pointer"
                      />
                  </label>

                  <button type="submit" className="w-full bg-[#111827] text-white py-5 rounded-[2rem] font-black text-sm uppercase tracking-widest shadow-xl hover:bg-black transition-all active:scale-95">
                    Salvar Categoria
                  </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* --- ADD/EDIT PRODUCT DIALOG MODAL --- */}
      <AnimatePresence>
        {isProductModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 z-[150] flex items-center justify-center p-4 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white rounded-[2.5rem] w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
              <div className="p-6 border-b-2 border-gray-50 flex justify-between items-center bg-white sticky top-0 z-10">
                <h3 className="text-2xl font-black italic uppercase text-slate-800">{editingProduct ? 'Editar' : 'Novo'} Produto</h3>
                <button onClick={() => setIsProductModalOpen(false)} className="w-10 h-10 bg-gray-100 text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-full flex items-center justify-center transition-colors"><X className="w-5 h-5" /></button>
              </div>
              
              <form onSubmit={saveProduct} className="p-6 space-y-5 overflow-y-auto custom-scrollbar bg-gray-50/30">
                
                {/* UPLOAD DE IMAGEM */}
                <div className="flex flex-col items-center gap-4 mb-2">
                  <div className="relative w-32 h-32 rounded-3xl border-4 border-white shadow-lg bg-gray-100 flex items-center justify-center overflow-hidden group">
                    {productForm.imageUrl ? (
                      <img src={productForm.imageUrl} alt="Produto" className="w-full h-full object-cover" />
                    ) : (
                      <ShoppingBag className="w-10 h-10 text-gray-300" />
                    )}
                    
                    {/* Overlay Escuro com Loading ou Botão de Envio */}
                    <label className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                      {isUploadingProductImage ? (
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <span className="text-white text-[10px] font-black uppercase tracking-widest text-center px-2">Trocar<br/>Imagem</span>
                      )}
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handleProductImageUpload} 
                        disabled={isUploadingProductImage}
                        className="hidden" 
                      />
                    </label>
                  </div>
                  <p className="text-[10px] font-bold text-slate-400">Clique na caixa acima para subir a foto.</p>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Nome do Produto</label>
                  <input type="text" required value={productForm.name} onChange={e => setProductForm({...productForm, name: e.target.value})} className="w-full p-4 bg-white rounded-2xl outline-none focus:ring-2 ring-[#0055ff] font-bold text-sm text-slate-700 border border-gray-200 shadow-sm" placeholder="Ex: Cerveja Heineken 330ml" />
                </div>
                
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Descrição</label>
                  <textarea rows={2} value={productForm.description} onChange={e => setProductForm({...productForm, description: e.target.value})} className="w-full p-4 bg-white rounded-2xl outline-none focus:ring-2 ring-[#0055ff] font-medium text-sm text-slate-600 border border-gray-200 shadow-sm resize-none" placeholder="Detalhes do produto..."></textarea>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Preço (R$)</label>
                    <input type="number" step="0.01" required value={productForm.price || ''} onChange={e => setProductForm({...productForm, price: Number(e.target.value)})} className="w-full p-4 bg-blue-50 rounded-2xl outline-none focus:ring-2 ring-[#0055ff] font-black text-xl text-blue-600 border border-blue-100" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Estoque Inicial</label>
                    <input type="number" required value={productForm.stock} onChange={e => setProductForm({...productForm, stock: Number(e.target.value)})} className="w-full p-4 bg-white rounded-2xl outline-none focus:ring-2 ring-[#0055ff] font-bold text-slate-700 border border-gray-200 shadow-sm" />
                  </div>
                </div>

                <div className="space-y-1 pb-4 border-b border-gray-100">
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Categoria na Loja</label>
                  
                  {/* Select Dinâmico (Lê as categorias únicas existentes na lista de produtos) */}
                  {(() => {
                    const uniqueCategories = Array.from(new Set(products.map(p => p.category))).filter(Boolean);
                    
                    return (
                      <div className="relative">
                        <input 
                          type="text" 
                          list="categoriesList"
                          required 
                          value={productForm.category} 
                          onChange={e => setProductForm({...productForm, category: e.target.value})} 
                          className="w-full p-4 bg-white rounded-2xl outline-none focus:ring-2 ring-[#0055ff] font-bold text-sm text-slate-700 border border-gray-200 shadow-sm" 
                          placeholder="Escolha ou digite uma nova..." 
                        />
                        <datalist id="categoriesList">
                          {uniqueCategories.map(cat => (
                            <option key={cat} value={cat} />
                          ))}
                        </datalist>
                      </div>
                    );
                  })()}
                </div>

                <button type="submit" disabled={isUploadingProductImage} className="w-full bg-[#111827] text-white py-5 rounded-[2rem] font-black uppercase tracking-widest shadow-xl hover:bg-black transition-all active:scale-95 disabled:bg-gray-300 disabled:cursor-not-allowed">
                  Salvar Produto
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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