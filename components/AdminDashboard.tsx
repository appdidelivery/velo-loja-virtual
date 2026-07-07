"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { 
  ShoppingBag, Settings, MessageSquare, Plus, Edit2, Trash2, 
  Search, CheckCircle2, DollarSign, Eye, EyeOff, User, Sparkles,
  Layers, AlertCircle, Send, HelpCircle, FileCheck, Percent,
  TrendingUp, X, CreditCard, Sun, Moon, ExternalLink, ChevronDown, List,
  Megaphone, ChevronLeft, ChevronRight, Filter, RefreshCw, ShieldCheck, LayoutTemplate, Package,
  Store 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Componentes da Loja
import PricingTable from './PricingTable';
import { pricingPlans } from '../data/pricingPlans';
import TemplateSelector from './TemplateSelector';
import { TEMPLATES } from '../data/templatesConfig'; 

import { Product, Order, ChatSession, TenantSettings, OrderStatus, PaymentStatus } from '../types';
import { INITIAL_ORDERS, INITIAL_CHATS, INITIAL_SETTINGS } from '../data/mokedData';
import VeloSupportWidget from './VeloSupportWidget';
import AdminChat from './AdminChat';
import { useProducts } from '../hooks/useProducts';
import { useOrders } from '../hooks/useOrders';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import GoogleIntegrationDashboard from './GoogleIntegrationDashboard';
import { FaGoogle } from 'react-icons/fa6';

export default function AdminDashboard() {
  const [activePanel, setActivePanel] = useState<'dashboard' | 'products' | 'categories' | 'orders' | 'chats' | 'settings' | 'google_business' | 'finance'>('dashboard');

  const [isClearingCache, setIsClearingCache] = useState(false);

  const handleClearCache = async () => {
    setIsClearingCache(true);
    try {
      const res = await fetch('/api/revalidate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: `/${authRole.tenantId}` })
      });
      if (res.ok) alert('✅ Vitrine atualizada com sucesso! O cache da loja foi limpo.');
      else alert('⚠️ Erro ao atualizar a vitrine.');
    } catch (error) {
      alert('⚠️ Erro de conexão ao limpar cache.');
    } finally {
      setIsClearingCache(false);
    }
  };

  const getInitialTenant = () => {
    if (typeof window !== 'undefined') {
      const host = window.location.hostname;
      if (host === 'app.mamedes.com.br' || host === 'localhost' || host === '127.0.0.1') return 'mamedes';
      return host; 
    }
    return 'mamedes';
  };

  // Objeto inicial genérico para o TypeScript não reclamar. Será substituído pelo Firebase.
  const [authRole, setAuthRole] = useState({ 
    email: 'carregando...', 
    role: 'merchant_owner', 
    businessType: 'ecommerce', 
    tenantId: 'loading' 
  });

  // Trava de Segurança Real (Protege a rota /admin)
  useEffect(() => {
    const { onAuthStateChanged } = require('firebase/auth');
    const { auth } = require('../services/firebase');
    
    const unsubscribe = onAuthStateChanged(auth, (user: any) => {
      if (user) {
        // Usuário logado: O TenantId dele é o próprio UID (conforme criamos no Login)
        setAuthRole({
          email: user.email,
          role: 'merchant_owner',
          businessType: 'ecommerce', 
          tenantId: user.uid 
        });
      } else {
        // Ninguém logado? Expulsa para a tela de login imediatamente.
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
      }
    });

    return () => unsubscribe();
  }, []);

  const tenantForHooks = authRole?.tenantId || 'loading';

  const { products, addProduct, updateProduct, deleteProduct } = useProducts(tenantForHooks);
  const { orders, updateStatus: updateOrderStatus } = useOrders(tenantForHooks);
  
  const [chats, setChats] = useState<ChatSession[]>(INITIAL_CHATS);
  const [settings, setSettings] = useState<TenantSettings>(INITIAL_SETTINGS);

  const [isSettingsExpanded, setIsSettingsExpanded] = useState(false);
  const [settingsSubPanel, setSettingsSubPanel] = useState('gerais');
    
  const [isXmlModalOpen, setIsXmlModalOpen] = useState(false);
  const [xmlUrl, setXmlUrl] = useState(''); 
  const [isImporting, setIsImporting] = useState(false);
  const [isAutoSync, setIsAutoSync] = useState(true); 

  const [productSearch, setProductSearch] = useState('');
  const [orderFilter, setOrderFilter] = useState<'all' | 'pending' | 'paid' | 'delivered'>('all');
  const [productCategoryFilter, setProductCategoryFilter] = useState('all');
  const [productStatusFilter, setProductStatusFilter] = useState('all');
  const [productItemsPerPage, setProductItemsPerPage] = useState(25);
  const [productCurrentPage, setProductCurrentPage] = useState(1);

  useEffect(() => {
    setProductCurrentPage(1);
  }, [productSearch, productCategoryFilter, productStatusFilter, productItemsPerPage]);

  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<{name: string, order: number, isActive: boolean} | null>(null);
  const [categoryForm, setCategoryForm] = useState({ name: '', order: 1, isActive: true });

  const [productForm, setProductForm] = useState({
    name: '', description: '', price: 0, imageUrl: '', category: 'Eletrônicos', stock: 10, sku: '', isActive: true, ean: '', ncm: '', weight: 0, seoTitle: '', seoDescription: ''
  });

  const [settingsForm, setSettingsForm] = useState<any>({ 
    ...settings, 
    templateId: 'nativo_app', 
    primaryColor: '#0ea5e9',
    storeNiche: 'varejo',
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
    productLayout: 'list',
    aboutText: '',
    faq: [],
    googleReviewUrl: ''
  });
  
  const [settingsSuccess, setSettingsSuccess] = useState(false);
  const [openVisualAccordion, setOpenVisualAccordion] = useState<string | null>('cores');
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isUploadingProductImage, setIsUploadingProductImage] = useState(false);
  const [showAllCriticalStock, setShowAllCriticalStock] = useState(false);

  // --- CÁLCULOS GLOBAIS E DE DASHBOARD ---
  const uniqueCategories = Array.from(new Set(products.map(p => p.category))).filter(Boolean).map(catName => {
      const catProducts = products.filter(p => p.category === catName);
      const isActive = catProducts.some(p => p.isActive); 
      return { name: catName, order: 1, isActive: isActive, count: catProducts.length };
  }).sort((a, b) => a.name.localeCompare(b.name));

  const isLegacyClient = authRole.tenantId.includes('mamedes') || authRole.tenantId.includes('sacola');
  const isVitalicio = (settingsForm as any)?.billingStatus === 'gratis_vitalicio';
  const showFinanceTab = !isLegacyClient && !isVitalicio;

  const [selectedChatId, setSelectedChatId] = useState<string>(chats[0]?.id || '');
  const [currentMessageText, setCurrentMessageText] = useState('');
  const activeChat = chats.find(c => c.id === selectedChatId) || chats[0];
  const totalSalesAmount = orders.filter(o => o.status === 'paid' || o.paymentStatus === 'approved' || (o.status as string) === 'completed' || o.status === 'delivered').reduce((sum, o) => sum + Number(o.total || 0), 0);
  const unreadChatsCount = chats.filter(c => c.unread).length;

  const isToday = (dateString?: string) => {
    if (!dateString) return false;
    const dateObj = new Date(dateString);
    if (isNaN(dateObj.getTime())) return false;
    return dateObj.toDateString() === new Date().toDateString();
  };

  const todaysOrders = orders.filter(o => (o.status as string) !== 'canceled' && (o.status as string) !== 'cancelled' && isToday(o.createdAt));
  const todaysRevenue = todaysOrders.reduce((acc, o) => acc + Number(o.total || 0), 0);
  const todaysProfit = todaysRevenue * 0.4; 

  const totalProducts = products.length;
  const totalOrders = orders.length;
  // @ts-ignore
  const manualOrdersCount = orders.filter(o => o.source === 'manual' || o.source === 'manual_pdv').length;
  // @ts-ignore
  const storefrontOrdersCount = orders.filter(o => o.source !== 'manual' && o.source !== 'manual_pdv').length; 
  const totalCustomers = Array.from(new Set(orders.filter(o => o.customerPhone).map(o => o.customerPhone))).length;
  const criticalProducts = products.filter(p => p.stock !== undefined && p.stock !== null && String(p.stock) !== '' && Number(p.stock) <= 5);

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

  const filteredOrders = orders.filter(o => {
    if (orderFilter === 'all') return true;
    return o.status === orderFilter;
  });

  // --- EFEITOS ---
  useEffect(() => {
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
    const savedTemplateId = localStorage.getItem('velo_store_templateId') || 'nativo_app';

    setSettingsForm((prev: any) => ({
      ...prev,
      templateId: savedTemplateId,
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

  // --- FUNÇÕES DE AÇÃO ---
  const saveCategory = async (e: React.FormEvent) => {
      e.preventDefault();
      if (editingCategory) {
          const prodsToUpdate = products.filter(p => p.category === editingCategory.name);
          for (const p of prodsToUpdate) {
              await updateProduct(p.id, { category: categoryForm.name, isActive: categoryForm.isActive });
          }
      } else {
          await addProduct({
              name: `_CAT_${categoryForm.name}`, description: 'Categoria base', price: 0, imageUrl: '', category: categoryForm.name, stock: 0, sku: `CAT-${Date.now()}`, isActive: categoryForm.isActive, tenantId: settings.tenantId
          });
      }
      setIsCategoryModalOpen(false);
  };

  const uploadImageToCloudinary = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    
    if (!uploadPreset || !cloudName) throw new Error("Chaves do Cloudinary ausentes.");
    formData.append('upload_preset', uploadPreset); 
    
    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
      method: 'POST', body: formData
    });
    const data = await res.json();
    if (data.secure_url) return data.secure_url;
    throw new Error("Erro no upload da imagem");
  };

  const handleProductImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingProductImage(true);
    try {
      const url = await uploadImageToCloudinary(file);
      setProductForm({ ...productForm, imageUrl: url });
    } catch (error) {
      alert("Falha de conexão com a nuvem de imagens.");
    } finally {
      setIsUploadingProductImage(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingLogo(true);
    try {
      const url = await uploadImageToCloudinary(file);
      setSettingsForm({ ...settingsForm, logoUrl: url });
    } catch (error) {
      alert("Erro de conexão ao enviar a imagem.");
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const saveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSettings(settingsForm);
    
    localStorage.setItem('velo_theme_color', settingsForm.primaryColor);
    localStorage.setItem('velo_store_logo', settingsForm.logoUrl);
    localStorage.setItem('velo_store_name', settingsForm.businessName);
    localStorage.setItem('velo_store_slogan', settingsForm.slogan);
    localStorage.setItem('velo_store_whatsapp', settingsForm.whatsappNumber);
    localStorage.setItem('velo_store_mode', settingsForm.storeMode || 'orcamento');
    localStorage.setItem('velo_store_maintenance', settingsForm.maintenanceMode ? 'true' : 'false');
    localStorage.setItem('velo_store_layout', settingsForm.productLayout || 'list');
    localStorage.setItem('velo_store_templateId', settingsForm.templateId); 
    
    try {
      await setDoc(doc(db, 'tenants', authRole.tenantId), {
        businessName: settingsForm.businessName,
        slogan: settingsForm.slogan,
        logoUrl: settingsForm.logoUrl,
        primaryColor: settingsForm.primaryColor,
        whatsappNumber: settingsForm.whatsappNumber,
        storeMode: settingsForm.storeMode,
        maintenanceMode: settingsForm.maintenanceMode,
        productLayout: settingsForm.productLayout,
        templateId: settingsForm.templateId,
        aboutText: settingsForm.aboutText || '',
        faq: settingsForm.faq || [],
        googleReviewUrl: settingsForm.googleReviewUrl || ''
      }, { merge: true });
      
      alert("✅ SUCESSO! Dados salvos no Firebase.");
    } catch (error) {
      alert("❌ ERRO: O Firebase recusou salvar.");
    }
    
    window.dispatchEvent(new Event('storage'));
    setSettingsSuccess(true);
    setTimeout(() => setSettingsSuccess(false), 3000);
  };

  const [teamMembers, setTeamMembers] = useState([
    { id: '1', email: 'contato@loja.com.br', role: 'Administrador (Dono)', status: 'Ativo' }
  ]);
  const [newTeamEmail, setNewTeamEmail] = useState('');
  const [newTeamRole, setNewTeamRole] = useState('Vendedor / Atendente');

  const handleAddTeamMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeamEmail.trim()) return;
    setTeamMembers([...teamMembers, { id: Date.now().toString(), email: newTeamEmail, role: newTeamRole, status: 'Aguardando Login' }]);
    setNewTeamEmail('');
  };

  const handleImportXML = async () => {
    if (!xmlUrl) return alert("Por favor, insira uma URL válida.");
    setIsImporting(true);
    try {
      const response = await fetch('/api/import-xml', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ xmlUrl: xmlUrl }) });
      if (!response.ok) throw new Error("Erro de conexão.");
      const xmlText = await response.text();
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlText, "text/xml");
      let items = xmlDoc.getElementsByTagName("item");
      if (items.length === 0) items = xmlDoc.getElementsByTagName("entry");
      if (items.length === 0) throw new Error("Nenhum produto encontrado.");
      
      alert(`Sincronização processada com sucesso!`);
      setIsXmlModalOpen(false);
    } catch (error: any) {
      alert(`⚠️ Erro ao importar: ${error.message}`);
    } finally {
      setIsImporting(false);
    }
  };

  const saveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingProduct) {
      await updateProduct(editingProduct.id, { ...productForm, price: Number(productForm.price), stock: Number(productForm.stock) });
    } else {
      await addProduct({ ...productForm, price: Number(productForm.price), stock: Number(productForm.stock), tenantId: settings.tenantId });
    }
    setIsProductModalOpen(false);
    setEditingProduct(null);
  };

  const openNewProductModal = () => {
    setEditingProduct(null);
    setProductForm({ name: '', description: '', price: 0, imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&q=80&w=600', category: 'Geral', stock: 12, sku: `PROD-${Math.floor(Math.random() * 9000 + 1000)}`, isActive: true, ean: '', ncm: '', weight: 0, seoTitle: '', seoDescription: '' });
    setIsProductModalOpen(true);
  };

  const openEditProductModal = (prod: Product) => {
    setEditingProduct(prod);
    setProductForm({ name: prod.name, description: prod.description, price: prod.price, imageUrl: prod.imageUrl, category: prod.category, stock: prod.stock, sku: prod.sku, isActive: prod.isActive, ean: prod.ean || '', ncm: prod.ncm || '', weight: prod.weight || 0, seoTitle: prod.seoTitle || '', seoDescription: prod.seoDescription || '' });
    setIsProductModalOpen(true);
  };

  const handleDeleteProduct = async (id: string) => {
    if (window.confirm('Tem certeza que deseja apagar este produto do Banco de Dados?')) {
      await deleteProduct(id);
    }
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

          <nav className="flex-1 overflow-y-auto px-4 py-4 space-y-2 custom-scrollbar">
            
            {authRole.businessType === 'ecommerce' && (
              <button 
                onClick={() => setActivePanel('dashboard')} 
                className={`w-full flex items-center justify-start gap-3 px-4 py-3.5 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all ${activePanel === 'dashboard' ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'}`}
              >
                <TrendingUp className="w-5 h-5 shrink-0" /> 
                <span className="text-left truncate">Início</span>
              </button>
            )}

            <button 
              onClick={() => setActivePanel('products')} 
              className={`w-full flex items-center justify-start gap-3 px-4 py-3.5 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all ${activePanel === 'products' || activePanel === 'categories' ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'}`}
            >
              <ShoppingBag className="w-5 h-5 shrink-0" /> 
              <span className="text-left truncate">Catálogo</span>
            </button>

            {authRole.businessType === 'ecommerce' && (
              <button 
                onClick={() => setActivePanel('orders')} 
                className={`w-full flex items-center justify-start gap-3 px-4 py-3.5 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all ${activePanel === 'orders' ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'}`}
              >
                <FileCheck className="w-5 h-5 shrink-0" /> 
                <span className="text-left truncate">Pedidos</span>
              </button>
            )}

            <button 
              onClick={() => setActivePanel('google_business')} 
              className={`w-full flex items-center justify-start gap-3 px-4 py-3.5 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all relative overflow-hidden ${activePanel === 'google_business' ? 'bg-white text-slate-900 shadow-[0_0_15px_rgba(66,133,244,0.15)] border border-slate-200 z-10' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'}`}
            >
              {activePanel === 'google_business' && (
                  <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-blue-500 via-red-500 to-yellow-400"></div>
              )}
              <FaGoogle className="w-5 h-5 text-blue-500 shrink-0" />
              <span className="text-left truncate leading-tight">Google Meu<br/>Negócio</span>
            </button>

            <button 
              onClick={() => setActivePanel('chats')} 
              className={`w-full flex items-center justify-between px-4 py-3.5 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all ${activePanel === 'chats' ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'}`}
            >
              <div className="flex items-center justify-start gap-3 overflow-hidden">
                <MessageSquare className="w-5 h-5 shrink-0" /> 
                <span className="text-left truncate">Atendimento</span>
              </div>
              {unreadChatsCount > 0 && <span className="shrink-0 w-5 h-5 bg-red-500 text-white rounded-full text-[10px] flex items-center justify-center shadow-sm animate-pulse">{unreadChatsCount}</span>}
            </button>

            <div className="pt-2 border-t border-slate-100 mt-2">
              {showFinanceTab && (
                <button 
                  onClick={() => setActivePanel('finance')} 
                  className={`w-full flex items-center justify-start gap-3 px-4 py-3.5 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all ${activePanel === 'finance' ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'}`}
                >
                  <CreditCard className="w-5 h-5 shrink-0" /> 
                  <span className="text-left truncate leading-tight">Planos &<br/>Assinatura</span>
                </button>
              )}

              <button
                onClick={() => { setIsSettingsExpanded(!isSettingsExpanded); setActivePanel('settings'); }} 
                className={`w-full flex items-center justify-start gap-3 px-4 py-3.5 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all mt-2 ${activePanel === 'settings' ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'}`}
              >
                <Settings className="w-5 h-5 shrink-0" /> 
                <span className="text-left truncate">Configurações</span>
              </button>
              
              <AnimatePresence>
                {isSettingsExpanded && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                    <div className="pl-12 pr-3 py-2 space-y-1">
                      <button onClick={() => { setActivePanel('settings'); setSettingsSubPanel('visual'); }} className={`block w-full text-left text-[10px] uppercase tracking-widest py-2.5 font-bold rounded-xl px-4 transition-colors ${settingsSubPanel === 'visual' && activePanel === 'settings' ? 'bg-blue-50 text-blue-600' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'}`}>Visual da loja</button>
                      <button onClick={() => { setActivePanel('settings'); setSettingsSubPanel('gerais'); }} className={`block w-full text-left text-[10px] uppercase tracking-widest py-2.5 font-bold rounded-xl px-4 transition-colors ${settingsSubPanel === 'gerais' && activePanel === 'settings' ? 'bg-blue-50 text-blue-600' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'}`}>Gerais</button>
                      <button onClick={() => { setActivePanel('settings'); setSettingsSubPanel('dados'); }} className={`block w-full text-left text-[10px] uppercase tracking-widest py-2.5 font-bold rounded-xl px-4 transition-colors ${settingsSubPanel === 'dados' && activePanel === 'settings' ? 'bg-blue-50 text-blue-600' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'}`}>Dados da Loja</button>
                      <button onClick={() => { setActivePanel('settings'); setSettingsSubPanel('equipe'); }} className={`block w-full text-left text-[10px] uppercase tracking-widest py-2.5 font-bold rounded-xl px-4 transition-colors ${settingsSubPanel === 'equipe' && activePanel === 'settings' ? 'bg-blue-50 text-blue-600' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'}`}>Acesso e Equipe</button>
                      <button onClick={() => { setActivePanel('settings'); setSettingsSubPanel('integracoes'); }} className={`block w-full text-left text-[10px] uppercase tracking-widest py-2.5 font-bold rounded-xl px-4 transition-colors ${settingsSubPanel === 'integracoes' && activePanel === 'settings' ? 'bg-blue-50 text-blue-600' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'}`}>Integrações e APIs</button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </nav>

          <div className="p-5 border-t border-gray-100 bg-gray-50/50">
            <div className="flex items-center justify-center mb-4">
               <a href={`/${authRole.tenantId}?nocache=${Date.now()}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-[#111827] hover:text-[#0055ff] transition-colors">
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
            <div className="space-y-8 max-w-[1400px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
              
              {/* CABEÇALHO */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h1 className="text-4xl font-black italic tracking-tighter uppercase text-[#111827]">Visão Geral</h1>
                <div className="flex flex-col sm:flex-row items-center gap-3">
                  <button 
                    onClick={handleClearCache} 
                    disabled={isClearingCache} 
                    className="w-full sm:w-auto bg-white border-2 border-gray-200 text-[#111827] hover:bg-gray-50 px-6 py-3.5 rounded-xl font-black text-[11px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-sm disabled:opacity-50"
                  >
                    {isClearingCache ? <div className="w-4 h-4 border-2 border-[#111827] border-t-transparent rounded-full animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                    Atualizar Vitrine (Cache)
                  </button>
                  <button className="w-full sm:w-auto bg-[#111827] hover:bg-black text-white px-8 py-3.5 rounded-xl font-black text-[11px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95">
                    Fechar Caixa / Relatório
                  </button>
                </div>
              </div>

              {/* BANNER IA / SEO (ESCOLA VELO) */}
              <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-200 rounded-[2.5rem] p-6 sm:p-10 shadow-sm relative overflow-hidden flex flex-col md:flex-row gap-6 items-center justify-between">
                <button className="absolute top-4 right-4 p-2 text-yellow-600/50 hover:bg-yellow-100 rounded-full transition-colors"><X size={16}/></button>
                <div className="flex-1">
                  <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-yellow-800 mb-3 bg-white w-max px-3 py-1 rounded-full shadow-sm border border-yellow-100">
                    <Sparkles className="w-3.5 h-3.5 text-yellow-500" /> SEO Local & Vendas
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-black text-yellow-950 uppercase leading-tight mb-3">Crie um combo e apareça em destaque no Google</h3>
                  <p className="text-sm text-yellow-800/80 font-medium leading-relaxed max-w-2xl">
                    Clientes adoram ofertas combinadas! Deixe nossa Inteligência Artificial sugerir combos baseados no seu segmento. Em um clique, nós o criamos no seu catálogo e o enviamos direto para a vitrine do seu negócio.
                  </p>
                </div>
                <div className="flex flex-col gap-3 w-full md:w-64 shrink-0 z-10">
                  <button className="w-full bg-gradient-to-r from-orange-500 to-orange-400 hover:from-orange-600 hover:to-orange-500 text-white font-black uppercase tracking-wider text-xs py-4 rounded-xl shadow-lg shadow-orange-500/30 flex items-center justify-center gap-2 transition-transform hover:scale-[0.98]">
                    <Sparkles className="w-4 h-4" /> Ver Sugestões Mágicas
                  </button>
                  <button className="w-full bg-white/60 border-2 border-yellow-200 hover:bg-white hover:border-yellow-300 text-yellow-900 font-black uppercase tracking-wider text-xs py-3.5 rounded-xl transition-all">
                    Ver Próxima Aula
                  </button>
                </div>
              </div>

              {/* ALERTA DE ESTOQUE CRÍTICO */}
              {criticalProducts.length > 0 && (
                <div className="bg-red-50 border border-red-200 p-6 rounded-[2rem]">
                  <div className="flex justify-between items-center mb-3">
                      <h3 className="text-red-600 font-black flex items-center gap-2 animate-pulse"><AlertCircle size={20} /> ALERTA: ESTOQUE CRÍTICO ({criticalProducts.length} itens)</h3>
                      {criticalProducts.length > 5 && (
                          <button onClick={() => setShowAllCriticalStock(!showAllCriticalStock)} className="text-xs font-black text-red-600 bg-red-100 px-3 py-1.5 rounded-lg hover:bg-red-200 transition-all">
                              {showAllCriticalStock ? 'Ocultar Lista' : `Ver todos os ${criticalProducts.length}`}
                          </button>
                      )}
                  </div>
                  <div className="flex gap-2 flex-wrap">
                      {(showAllCriticalStock ? criticalProducts : criticalProducts.slice(0, 5)).map(p => (
                          <span key={p.id} className="bg-white text-red-600 px-3 py-1 rounded-lg text-xs font-bold border border-red-100 shadow-sm flex items-center gap-1">
                              {p.name} <strong className="text-red-800">({p.stock} un)</strong>
                          </span>
                      ))}
                      {!showAllCriticalStock && criticalProducts.length > 5 && (
                          <span className="bg-red-100 text-red-500 px-3 py-1 rounded-lg text-xs font-bold border border-red-200">
                              + {criticalProducts.length - 5} ocultos...
                          </span>
                      )}
                  </div>
                </div>
              )}

              {/* QUADRO DE MÉTRICAS PRINCIPAL (HOJE) */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="bg-white p-6 md:p-8 rounded-[2.5rem] shadow-sm border border-gray-100 relative overflow-hidden">
                      <p className="text-gray-400 font-bold text-[10px] uppercase tracking-widest mb-1 z-10 relative">Visitas Hoje</p>
                      <p className="text-4xl font-black text-indigo-500 italic z-10 relative">24</p>
                      <div className="absolute -right-4 -bottom-4 text-indigo-50 opacity-30"><ExternalLink size={120}/></div>
                      <p className="text-[10px] font-bold text-gray-400 mt-2">Conversão Est.: 4.2%</p>
                  </div>
                  <div className="bg-white p-6 md:p-8 rounded-[2.5rem] shadow-sm border border-gray-100 relative overflow-hidden">
                      <p className="text-gray-400 font-bold text-[10px] uppercase tracking-widest mb-1 z-10 relative">Faturamento (Hoje)</p>
                      <p className="text-4xl font-black text-green-500 italic z-10 relative">R$ {todaysRevenue.toFixed(2)}</p>
                      <div className="absolute -right-4 -bottom-4 text-green-50 opacity-30"><DollarSign size={120}/></div>
                  </div>
                  <div className="bg-white p-6 md:p-8 rounded-[2.5rem] shadow-sm border border-gray-100 relative overflow-hidden">
                      <p className="text-gray-400 font-bold text-[10px] uppercase tracking-widest mb-1 z-10 relative">Lucro Est. (Hoje)</p>
                      <p className="text-4xl font-black text-cyan-500 italic z-10 relative">R$ {todaysProfit.toFixed(2)}</p>
                      <div className="absolute -right-4 -bottom-4 text-cyan-50 opacity-30"><TrendingUp size={120}/></div>
                  </div>
                  <div className="bg-white p-6 md:p-8 rounded-[2.5rem] shadow-sm border border-gray-100 relative overflow-hidden">
                      <p className="text-gray-400 font-bold text-[10px] uppercase tracking-widest mb-1 z-10 relative">Pedidos Hoje</p>
                      <p className="text-4xl font-black text-blue-600 italic z-10 relative">{todaysOrders.length}</p>
                      <div className="absolute -right-4 -bottom-4 text-blue-50 opacity-20"><ShoppingBag size={120}/></div>
                  </div>
              </div>

              {/* BLOCOS DE DADOS GLOBAIS */}
              <div className="pt-8 border-t border-gray-100">
                <h2 className="text-2xl font-black italic tracking-tighter uppercase mb-6 text-gray-800">Estatísticas Gerais</h2>
                
                <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
                    <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-gray-100 text-center flex flex-col justify-center hover:shadow-md transition-shadow">
                        <div className="flex justify-center mb-2"><Package size={32} className="text-gray-400"/></div>
                        <p className="text-3xl font-black text-gray-800 italic">{totalProducts}</p>
                        <p className="text-gray-400 font-bold text-[10px] uppercase tracking-widest mt-1">Produtos</p>
                    </div>
                    
                    <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-gray-100 text-center flex flex-col justify-center hover:shadow-md transition-shadow">
                        <div className="flex justify-center mb-2"><ShoppingBag size={32} className="text-gray-400"/></div>
                        <p className="text-3xl font-black text-gray-800 italic">{totalOrders}</p>
                        <p className="text-gray-400 font-bold text-[10px] uppercase tracking-widest mt-1">Pedidos Totais</p>
                    </div>
                    
                    <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-gray-100 text-center flex flex-col justify-center hover:shadow-md transition-shadow">
                        <div className="flex justify-center mb-2"><User size={32} className="text-gray-400"/></div>
                        <p className="text-3xl font-black text-gray-800 italic">{totalCustomers}</p>
                        <p className="text-gray-400 font-bold text-[10px] uppercase tracking-widest mt-1">Clientes Únicos</p>
                    </div>
                    
                    <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-gray-100 text-center flex flex-col justify-center hover:shadow-md transition-shadow">
                        <div className="flex justify-center mb-2"><ExternalLink size={32} className="text-green-500"/></div>
                        <p className="text-3xl font-black text-green-600 italic">{storefrontOrdersCount}</p>
                        <p className="text-gray-400 font-bold text-[10px] uppercase tracking-widest mt-1">Pedidos (Loja)</p>
                    </div>
                    
                    <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-gray-100 text-center flex flex-col justify-center hover:shadow-md transition-shadow">
                        <div className="flex justify-center mb-2"><Plus size={32} className="text-blue-500"/></div>
                        <p className="text-3xl font-black text-blue-600 italic">{manualOrdersCount}</p>
                        <p className="text-gray-400 font-bold text-[10px] uppercase tracking-widest mt-1">Pedidos (Manual)</p>
                    </div>
                </div>
              </div>

            </div>
          )}

{/* --- ADD CATEGORY DIALOG MODAL --- */}
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
                    const uniqueCategoriesList = Array.from(new Set(products.map(p => p.category))).filter(Boolean);
                    
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
                          {uniqueCategoriesList.map(cat => (
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

      {/* TELA DE CATEGORIAS */}
          {activePanel === 'categories' && (
            <div className="bg-white border-2 border-gray-100 rounded-[2rem] p-8 space-y-6 max-w-6xl mx-auto shadow-sm animate-in fade-in slide-in-from-bottom-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b-2 border-gray-50 pb-6">
                <div>
                    {/* NOVO: SUB-Navegação de Catálogo */}
                    <div className="flex bg-gray-100 p-1 rounded-full w-max shadow-inner mb-4">
                        <button 
                            onClick={() => setActivePanel('products')} 
                            className="px-6 py-2.5 rounded-full text-xs font-black uppercase tracking-widest transition-all text-slate-500 hover:text-[#111827]"
                        >
                            📦 Produtos / Serviços
                        </button>
                        <button 
                            onClick={() => setActivePanel('categories')} 
                            className="px-6 py-2.5 rounded-full text-xs font-black uppercase tracking-widest transition-all bg-white text-[#111827] shadow-sm"
                        >
                            📑 Categorias
                        </button>
                    </div>
                  <p className="text-sm font-bold text-slate-400 mt-1">Organize as vitrines da sua loja.</p>
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

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {uniqueCategories.length === 0 ? (
                  <div className="col-span-full p-12 text-center border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50">
                    <List className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    <p className="font-bold text-slate-500">Nenhuma categoria criada.</p>
                    <p className="text-xs font-medium text-slate-400 mt-1">Ao cadastrar um produto, sua categoria aparecerá aqui automaticamente.</p>
                  </div>
                ) : (
                  uniqueCategories.map((cat, index) => (
                    <div key={index} className="flex items-center justify-between p-5 bg-white rounded-[2rem] border-2 border-slate-100 shadow-sm hover:shadow-md hover:border-blue-200 transition-all group">
                      <div className="flex-1 min-w-0 pr-2">
                        <h3 className={`font-black uppercase tracking-tight text-sm leading-tight truncate ${cat.isActive ? 'text-slate-800' : 'text-slate-400 line-through'}`} title={cat.name}>
                          {cat.name}
                        </h3>
                        <p className="text-[10px] font-bold text-slate-400 mt-1">
                          Ordem: {cat.order || 1} • {cat.count} itens
                        </p>
                      </div>
                      
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button 
                          onClick={async () => {
                            if(window.confirm(`Deseja ${cat.isActive ? 'ocultar' : 'ativar'} a categoria e todos os produtos dentro dela?`)) {
                               const prodsToUpdate = products.filter(p => p.category === cat.name);
                               for (const p of prodsToUpdate) {
                                   await updateProduct(p.id, { isActive: !cat.isActive });
                               }
                            }
                          }}
                          className={`p-2 rounded-xl transition-all shadow-sm border ${cat.isActive ? 'bg-green-50 text-green-600 border-green-100 hover:bg-green-100' : 'bg-red-50 text-red-500 border-red-100 hover:bg-red-100'}`}
                          title={cat.isActive ? 'Ocultar' : 'Ativar'}
                        >
                          {cat.isActive ? <Eye size={16} /> : <EyeOff size={16} />}
                        </button>
                        <button 
                          onClick={() => {
                            setEditingCategory(cat);
                            setCategoryForm({ name: cat.name, order: cat.order, isActive: cat.isActive });
                            setIsCategoryModalOpen(true);
                          }}
                          className="p-2 bg-blue-50 text-blue-600 border border-blue-100 hover:bg-blue-100 rounded-xl transition-all shadow-sm"
                        >
                          <Edit2 size={16} />
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
                
                {/* NOVO: SUB-Navegação de Catálogo */}
                <div className="flex bg-gray-100 p-1 rounded-full w-max shadow-inner">
                    <button 
                        onClick={() => setActivePanel('products')} 
                        className="px-6 py-2.5 rounded-full text-xs font-black uppercase tracking-widest transition-all bg-white text-[#111827] shadow-sm"
                    >
                        📦 Produtos / Serviços
                    </button>
                    <button 
                        onClick={() => setActivePanel('categories')} 
                        className="px-6 py-2.5 rounded-full text-xs font-black uppercase tracking-widest transition-all text-slate-500 hover:text-[#111827]"
                    >
                        📑 Categorias
                    </button>
                </div>
                
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

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {paginatedProducts.length === 0 ? (
                  <div className="col-span-full p-12 text-center border-2 border-dashed border-slate-200 rounded-[3rem] bg-slate-50">
                    <ShoppingBag className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    <p className="font-bold text-slate-500">Nenhum produto localizado com estes filtros.</p>
                  </div>
                ) : (
                  paginatedProducts.map(p => (
                    <div key={p.id} className={`bg-white p-5 md:p-6 rounded-[2.5rem] border-2 flex items-stretch gap-4 shadow-sm hover:shadow-md transition-all relative overflow-hidden border-slate-100`}>
                      
                      {/* COLUNA 1: Imagem */}
                      <div className="flex flex-col items-center gap-3 flex-shrink-0 w-16 md:w-20">
                        <div className="w-16 h-16 md:w-20 md:h-20 flex items-center justify-center bg-slate-50 border border-slate-100 rounded-2xl p-1 shadow-sm">
                          <img src={p.imageUrl || "https://cdn-icons-png.flaticon.com/512/8636/8636813.png"} className="max-w-full max-h-full object-contain rounded-xl" alt={p.name} />
                        </div>
                      </div>

                      {/* COLUNA 2: Textos */}
                      <div className="flex-1 min-w-0 flex flex-col justify-center relative z-10">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h3 className={`font-black text-sm md:text-base leading-tight truncate ${p.isActive ? 'text-slate-800' : 'text-slate-400 line-through'}`} title={p.name}>
                            {p.name}
                          </h3>
                          {!p.isActive && (
                            <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest border border-slate-200 shrink-0">
                              Pausado
                            </span>
                          )}
                        </div>
                        
                        <div className='flex items-center gap-2 mt-1'>
                          <p className="text-blue-600 font-black text-lg">
                            R$ {Number(p.price)?.toFixed(2)}
                          </p>
                        </div>
                        
                        <p className={`text-[10px] font-bold mt-2 uppercase tracking-widest ${p.stock <= 5 ? 'text-red-500' : 'text-slate-400'}`}>
                          Estoque: <span className={p.stock <= 5 ? 'text-red-600' : 'text-slate-500'}>{p.stock !== undefined ? p.stock : 'N/A'}</span>
                        </p>
                      </div>

                      {/* COLUNA 3: Botões de Ação */}
                      <div className="flex flex-col justify-center gap-2 flex-shrink-0 relative z-10 w-10">
                        <button 
                          onClick={async () => await updateProduct(p.id, { isActive: !p.isActive })} 
                          className={`p-2.5 rounded-xl transition-all shadow-sm border ${!p.isActive ? 'bg-red-50 text-red-600 border-red-100 hover:bg-red-100' : 'bg-green-50 text-green-600 border-green-100 hover:bg-green-100'}`} 
                          title={!p.isActive ? 'Oculto (Clique para Ativar)' : 'Ativo (Clique para Ocultar)'}
                        >
                          {!p.isActive ? <EyeOff size={16} className="mx-auto" /> : <Eye size={16} className="mx-auto" />}
                        </button>
                        
                        <button 
                          onClick={() => openEditProductModal(p)} 
                          className="p-2.5 bg-blue-50 rounded-xl text-blue-600 border border-blue-100 hover:bg-blue-100 transition-all shadow-sm" 
                          title="Editar Produto"
                        >
                          <Edit2 size={16} className="mx-auto" />
                        </button>
                        
                        <button 
                          onClick={() => handleDeleteProduct(p.id)} 
                          className="p-2.5 bg-slate-50 rounded-xl text-red-500 border border-slate-100 hover:bg-red-100 transition-all shadow-sm"
                          title="Excluir Produto"
                        >
                          <Trash2 size={16} className="mx-auto" />
                        </button>
                      </div>

                    </div>
                  ))
                )}
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

          {activePanel === 'google_business' && (
            <div className="space-y-6 max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
               <GoogleIntegrationDashboard 
                  storeId={authRole.tenantId} 
                  products={products} 
                  storeStatus={settings} 
                  settings={settings}
                  uploadImageToCloudinary={uploadImageToCloudinary}
               />
            </div>
          )}

          {/* --- ABA FINANCEIRO E PLANOS --- */}
          {activePanel === 'finance' && showFinanceTab && (
            <div className="space-y-6 max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
                 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
                <div>
                  <h2 className="text-3xl sm:text-4xl font-black italic uppercase text-[#111827] tracking-tighter">
                    Assinatura & Planos
                  </h2>
                  <p className="text-sm font-bold text-slate-500 mt-1">
                    Evolua sua loja de acordo com o crescimento do seu negócio.
                  </p>
                </div>
                
                <div className="bg-white border-2 border-gray-100 px-6 py-4 rounded-[1.5rem] flex items-center gap-4 shadow-sm">
                  <div className="bg-orange-50 p-2.5 rounded-full">
                    <CreditCard className="w-5 h-5 text-[#ff7b00]" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Plano Atual</p>
                    <p className="text-sm font-black text-[#111827] uppercase tracking-wider">Velo Grátis</p>
                  </div>
                </div>
              </div>

              <div className="pt-6">
                <PricingTable plans={pricingPlans} />
              </div>

              <div className="mt-12 bg-white border-2 border-gray-100 rounded-[2rem] p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="bg-green-50 p-3 rounded-2xl">
                    <ShieldCheck className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <h4 className="font-black text-slate-800 text-sm uppercase tracking-wide">Pagamento Seguro</h4>
                    <p className="text-xs font-medium text-slate-500 mt-1">Cancele ou mude de plano a qualquer momento sem multas contratuais.</p>
                  </div>
                </div>
                <button className="px-6 py-3.5 bg-gray-50 hover:bg-gray-100 text-slate-700 font-black uppercase tracking-wider rounded-full border-2 border-gray-200 transition-colors text-[11px] whitespace-nowrap">
                  Precisa de ajuda? Fale com suporte
                </button>
              </div>
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
                    <div className="p-8">
                      <div className="space-y-2 max-w-md">
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
                        <p className="text-[10px] text-slate-400 font-medium mt-2 leading-relaxed">
                          Define o comportamento da vitrine. <strong>E-commerce</strong> envia os pedidos para o painel de "Pedidos" e aceita pagamento online. <strong>Orçamento</strong> envia o pedido direto para o seu WhatsApp. <strong>Catálogo</strong> oculta os preços e o botão de comprar.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

             {settingsSubPanel === 'visual' && (
                <div className="space-y-8">
                  
                  {/* --- NOVA SEÇÃO: GALERIA DE TEMPLATES DINÂMICOS --- */}
                  <div className="bg-white border-2 border-gray-100 rounded-[2.5rem] p-8 shadow-sm">
                    <div className="mb-6 border-b border-gray-50 pb-6">
                      <h3 className="text-2xl font-black italic uppercase text-slate-900 flex items-center gap-3">
                        <LayoutTemplate className="text-[#0055ff]" size={28} />
                        Galeria de Templates
                      </h3>
                      <p className="text-sm font-bold text-slate-500 mt-2 max-w-2xl">
                        Escolha um layout focado na conversão do seu nicho. O sistema ajustará cores, fontes e disposição da vitrine automaticamente para combinar com a sua marca.
                      </p>
                    </div>

                    <TemplateSelector 
                      selectedTemplateId={settingsForm.templateId}
                      onSelect={(template) => {
                        setSettingsForm({
                          ...settingsForm,
                          templateId: template.id,
                          primaryColor: template.primaryColor,
                          productLayout: template.gridConfig === 'grid' ? 'grid' : 'list'
                        });
                      }}
                    />
                  </div>
                  {/* --------------------------------------------------- */}

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
                        {/* O Iframe aponta para a rota da loja segura e passaremos as configs em tempo real via localStorage */}
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

                    {/* NOVO CAMPO: CATEGORIA GOOGLE MEU NEGÓCIO */}
                    <div className="space-y-2 md:col-span-2 pt-4 border-t border-gray-100">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                        <FaGoogle className="w-3.5 h-3.5 text-blue-500" /> Categoria do Negócio (Google)
                      </label>
                      <p className="text-[10px] text-slate-400 font-medium -mt-1">Define como sua loja será categorizada para o SEO e Integração GMB.</p>
                      <select 
                        value={settingsForm.storeNiche || 'varejo'}
                        onChange={(e) => setSettingsForm({...settingsForm, storeNiche: e.target.value})}
                        className="w-full bg-gray-50 border-2 border-gray-100 text-sm font-bold text-slate-800 p-3.5 rounded-xl outline-none focus:border-blue-500 transition-colors cursor-pointer"
                      >
                        <optgroup label="Varejo e Comércio">
                            <option value="varejo">Loja de Varejo Geral (Roupas, Eletrônicos, Utilidades)</option>
                            <option value="mercado">Supermercado / Conveniência / Empório</option>
                            <option value="farmacia">Farmácia / Drogaria</option>
                            <option value="petshop">Pet Shop / Agropecuária</option>
                            <option value="floricultura">Floricultura / Presentes</option>
                        </optgroup>
                        <optgroup label="Serviços e Estética">
                            <option value="salao_beleza">Salão de Beleza / Barbearia / Estética</option>
                            <option value="clinica">Clínica / Consultório</option>
                            <option value="oficina">Oficina Mecânica / Assistência Técnica</option>
                            <option value="servicos_gerais">Serviços Gerais (Limpeza, Reformas, Manutenção)</option>
                        </optgroup>
                        <optgroup label="Alimentação (Food Service)">
                            <option value="restaurante">Restaurante / Lanchonete</option>
                            <option value="doceria">Doceria / Açaiteria / Cafeteria</option>
                            <option value="bebidas">Adega / Distribuidora de Bebidas</option>
                        </optgroup>
                      </select>
                    </div>

                    {/* NOVO CAMPO: SOBRE A EMPRESA */}
                    <div className="space-y-2 md:col-span-2 pt-4 border-t border-gray-100">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                        <Store className="w-3.5 h-3.5 text-purple-500" /> Sobre a Empresa (História / Quem Somos)
                      </label>
                      <p className="text-[10px] text-slate-400 font-medium -mt-1">Aparece no rodapé de templates de "Serviços" para gerar confiança.</p>
                      <textarea
                        value={(settingsForm as any).aboutText || ''}
                        onChange={(e) => setSettingsForm({...settingsForm, aboutText: e.target.value} as any)}
                        className="w-full bg-gray-50 border-2 border-gray-100 text-sm font-bold text-slate-800 p-3.5 rounded-xl outline-none focus:border-purple-500 transition-colors resize-none"
                        rows={4}
                        placeholder="Ex: Fundada em 2010, nossa empresa é especialista em resolver os seus problemas..."
                      />
                    </div>

                    {/* NOVO CAMPO: FAQ (PERGUNTAS FREQUENTES) */}
                    <div className="space-y-2 md:col-span-2 pt-4 border-t border-gray-100">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                          <MessageSquare className="w-3.5 h-3.5 text-blue-500" /> Perguntas Frequentes (FAQ)
                        </label>
                        <button 
                          type="button"
                          onClick={() => setSettingsForm((prev: any) => ({ ...prev, faq: [...(prev.faq || []), { question: '', answer: '' }] }))}
                          className="text-[10px] font-black uppercase bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors"
                        >
                          + Adicionar Pergunta
                        </button>
                      </div>
                      
                      <div className="space-y-3 mt-3">
                        {(!(settingsForm as any).faq || (settingsForm as any).faq.length === 0) && (
                          <p className="text-xs text-slate-400 font-bold text-center p-4 bg-gray-50 rounded-xl border border-dashed border-gray-200">Nenhuma pergunta cadastrada.</p>
                        )}
                        {((settingsForm as any).faq || []).map((faqItem: any, idx: number) => (
                          <div key={idx} className="bg-gray-50 p-4 rounded-xl border border-gray-200 relative group">
                            <button 
                              type="button"
                              onClick={() => {
                                const newFaq = [...(settingsForm as any).faq];
                                newFaq.splice(idx, 1);
                                setSettingsForm({...settingsForm, faq: newFaq} as any);
                              }}
                              className="absolute top-3 right-3 text-red-400 hover:text-red-600 transition-colors p-1"
                            >
                              <Trash2 size={16} />
                            </button>
                            <input 
                              type="text" 
                              placeholder="Pergunta (Ex: Como funciona o orçamento?)" 
                              className="w-full bg-white border border-gray-200 text-xs font-bold text-slate-800 p-2.5 rounded-lg mb-2 outline-none focus:border-blue-500"
                              value={faqItem.question}
                              onChange={(e) => {
                                const newFaq = [...(settingsForm as any).faq];
                                newFaq[idx].question = e.target.value;
                                setSettingsForm({...settingsForm, faq: newFaq} as any);
                              }}
                            />
                            <textarea 
                              placeholder="Resposta..." 
                              className="w-full bg-white border border-gray-200 text-xs font-medium text-slate-700 p-2.5 rounded-lg outline-none focus:border-blue-500 resize-none"
                              rows={2}
                              value={faqItem.answer}
                              onChange={(e) => {
                                const newFaq = [...(settingsForm as any).faq];
                                newFaq[idx].answer = e.target.value;
                                setSettingsForm({...settingsForm, faq: newFaq} as any);
                              }}
                            />
                          </div>
                        ))}
                      </div>
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

                  {/* NOVO: GOOGLE MEU NEGÓCIO (Reviews) */}
                  <div className="bg-white border-2 border-gray-100 rounded-[2rem] p-8 shadow-sm">
                    <h3 className="text-slate-800 font-black uppercase tracking-wider text-sm mb-2 flex items-center gap-2">
                      <FaGoogle className="text-blue-500" size={20}/> Google Maps & Avaliações
                    </h3>
                    <p className="text-xs text-slate-500 font-medium mb-6">Cole o link da sua empresa no Google para ativar os depoimentos na vitrine.</p>
                    
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Link do Google Meu Negócio</label>
                      <input 
                        type="url" 
                        value={(settingsForm as any).googleReviewUrl || ''}
                        onChange={(e) => setSettingsForm({...settingsForm, googleReviewUrl: e.target.value} as any)}
                        placeholder="Ex: https://maps.app.goo.gl/..."
                        className="w-full bg-gray-50 border-2 border-gray-100 text-sm font-bold text-slate-800 p-3.5 rounded-xl outline-none focus:border-blue-500 transition-colors mt-1"
                      />
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
                    const uniqueCategoriesList = Array.from(new Set(products.map(p => p.category))).filter(Boolean);
                    
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
                          {uniqueCategoriesList.map(cat => (
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
                  placeholder="https://seusite.com.br/xml/googlemerchant.xml"
                />
              </div>

              {/* Toggle do Robô de 24h */}
              <div className="flex items-center justify-between bg-gray-50 p-4 rounded-xl border border-gray-100">
                <div>
                  <h4 className="text-xs font-black uppercase text-slate-700">Robô Automático (24h)</h4>
                  <p className="text-[10px] text-slate-500 font-medium">O sistema verificará o link diariamente para atualizar preços e adicionar novos itens.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={isAutoSync} onChange={(e) => setIsAutoSync(e.target.checked)} className="sr-only peer" />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#0055ff]"></div>
                </label>
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