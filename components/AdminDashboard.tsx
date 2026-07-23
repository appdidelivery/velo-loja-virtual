"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Menu, ShoppingBag, Settings, MessageSquare, Plus, Edit2, Trash2, 
  Search, CheckCircle2, DollarSign, Eye, EyeOff, User, Sparkles, MapPin,
  Layers, AlertCircle, Send, HelpCircle, FileCheck, Percent,
  TrendingUp, X, CreditCard, Sun, Moon, ExternalLink, ChevronDown, List,
  Megaphone, ChevronLeft, ChevronRight, Filter, RefreshCw, ShieldCheck, LayoutTemplate, Package,
  Store, UploadCloud, LogOut, Calendar
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Componentes da Loja
import PricingTable from './PricingTable';
import { pricingPlans } from '../data/pricingPlans';
import VeloOnboarding from './VeloOnboarding';
import TemplateSelector from './TemplateSelector';
import { TEMPLATES } from '../data/templatesConfig'; 

import { Product, Order, ChatSession, TenantSettings, OrderStatus, PaymentStatus } from '../types';
import { INITIAL_ORDERS, INITIAL_CHATS, INITIAL_SETTINGS } from '../data/mokedData';
import VeloSupportWidget from './VeloSupportWidget';
import AdminChat from './AdminChat';
import { useProducts } from '../hooks/useProducts';
import { useOrders } from '../hooks/useOrders';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase';
import GoogleIntegrationDashboard from './GoogleIntegrationDashboard';
import { FaGoogle } from 'react-icons/fa6';

export default function AdminDashboard() {
  const [activePanel, setActivePanel] = useState<'dashboard' | 'manual' | 'products' | 'categories' | 'orders' | 'customers' | 'chats' | 'settings' | 'google_business' | 'finance'>('dashboard');

  // Estado que controla se o usuário vê o Wizard ou o Dashboard clássico
  const [showOnboarding, setShowOnboarding] = useState(true); 
  
  // NOVO: Controle de abertura do menu no Mobile
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false); 

  // --- ESTADOS DO PDV (FRENTE DE CAIXA) ---
  const [manualCart, setManualCart] = useState<any[]>([]);
  const [pdvSearch, setPdvSearch] = useState('');
  const [manualCustomer, setManualCustomer] = useState({ name: '', phone: '', date: '', time: '', isService: false });
  const [manualDiscount, setManualDiscount] = useState<number>(0);
  const [isSubmittingPDV, setIsSubmittingPDV] = useState(false);
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);

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
const handleLogout = async () => {
    if (window.confirm('Tem certeza que deseja sair da sua conta?')) {
      try {
        // Importação dinâmica segura no Next.js
        const { getAuth, signOut } = await import('firebase/auth');
        const { auth } = await import('../services/firebase');
        
        await signOut(auth);
        window.location.href = '/login';
      } catch (error) {
        console.error(error);
        alert("Erro ao sair da conta.");
      }
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

  // DESTRUIDOR DE CACHE: Força o Favicon da Velo Loja no Painel
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // 1. Caça e destrói qualquer Favicon antigo (Vercel ou Next.js)
      document.querySelectorAll("link[rel~='icon']").forEach(el => el.remove());
      document.querySelectorAll("link[rel='apple-touch-icon']").forEach(el => el.remove());
      
      // 2. Injeta a Logo da Velo à força
      const newIcon = document.createElement('link');
      newIcon.rel = 'icon';
      newIcon.href = '/velo loja virtual logo.png'; // URL da sua imagem na pasta public
      document.head.appendChild(newIcon);
    }
  }, []);

  // Trava de Segurança Real (Protege a rota /admin)
  useEffect(() => {
    const { onAuthStateChanged } = require('firebase/auth');
    const { auth } = require('../services/firebase');
    
    const unsubscribe = onAuthStateChanged(auth, (user: any) => {
      if (user) {
        // PROTEÇÃO SÊNIOR: Verifica se está rodando na máquina local
        const isLocal = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

        // Usuário logado: Se for local, usa uma loja de teste. Se for nuvem, usa o UID real.
        // 🧠 IDENTIFICAÇÃO INTELIGENTE (Resolve o problema do Dark Ops)
        let resolvedTenantId = user.uid; // Padrão

        if (typeof window !== 'undefined') {
            const host = window.location.hostname;
            if (host.includes('mamedes.com.br')) resolvedTenantId = 'mamedes';
            else if (host.includes('sacolaonline.com.br')) resolvedTenantId = 'sacola';
            else if (host === 'localhost' || host === '127.0.0.1') resolvedTenantId = 'loja_teste_local';
        }

        setAuthRole({
          email: user.email,
          role: 'merchant_owner',
          businessType: 'ecommerce', 
          tenantId: resolvedTenantId
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
  const { orders, updateStatus: updateOrderStatus, addOrder } = useOrders(tenantForHooks);
  
  const [chats, setChats] = useState<ChatSession[]>(INITIAL_CHATS);
  const [settings, setSettings] = useState<TenantSettings>(INITIAL_SETTINGS);

  const [isSettingsExpanded, setIsSettingsExpanded] = useState(false);
  const [settingsSubPanel, setSettingsSubPanel] = useState('visual');
    
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

  const [productForm, setProductForm] = useState<any>({
    name: '', description: '', price: 0, promotionalPrice: 0, brand: '', imageUrl: '', videoUrl: '', category: 'Eletrônicos', stock: 10, sku: '', isActive: true, ean: '', ncm: '', weight: 0, seoTitle: '', seoDescription: ''
  });

  const [settingsForm, setSettingsForm] = useState<any>({ 
    ...settings, 
    templateId: 'nativo_app', 
    primaryColor: '#0ea5e9',
    announcementTexts: ['', '', ''], // Textos da Tarja
    announcementColor: '#e11d48', // Cor da Tarja
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
    googleReviewUrl: '',
    cnpj: ''
  });
  
  const [settingsSuccess, setSettingsSuccess] = useState(false);
  const [openVisualAccordion, setOpenVisualAccordion] = useState<string | null>('cores');
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isUploadingProductImage, setIsUploadingProductImage] = useState(false);
  const [showAllCriticalStock, setShowAllCriticalStock] = useState(false);
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);

  // --- CÁLCULOS GLOBAIS E DE DASHBOARD ---
  const uniqueCategories = Array.from(new Set(products.map(p => p.category))).filter(Boolean).map(catName => {
      const catProducts = products.filter(p => p.category === catName);
      const isActive = catProducts.some(p => p.isActive); 
      return { name: catName, order: 1, isActive: isActive, count: catProducts.length };
  }).sort((a, b) => a.name.localeCompare(b.name));

  // 🛡️ BLINDAGEM MESTRA: Oculta a aba Financeira com base na URL ou no banco de dados (Dark Ops)
  const isProtectedPartner = 
    authRole.tenantId.includes('mamedes') || 
    authRole.tenantId.includes('sacola') ||
    (typeof window !== 'undefined' && window.location.hostname.includes('mamedes')) ||
    (typeof window !== 'undefined' && window.location.hostname.includes('sacola'));

  const hideFinance = 
    isProtectedPartner || 
    (settings as any)?.billingStatus === 'gratis_vitalicio' || 
    (settings as any)?.billingStatus === 'cortesia' ||
    (settingsForm as any)?.billingStatus === 'gratis_vitalicio';

  const showFinanceTab = !hideFinance;

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
    const safeName = (p.name || '').toLowerCase();
    const safeSku = (p.sku || '').toLowerCase();
    const searchLower = (productSearch || '').toLowerCase();
    
    const matchesSearch = safeName.includes(searchLower) || safeSku.includes(searchLower);
    const matchesCategory = productCategoryFilter === 'all' || p.category === productCategoryFilter;
    
    // Blindagem: Aceita o padrão boolean (isActive) e o padrão em string legado (status: 'ativo')
    const isProdActive = p.isActive === true || (p as any).status === 'ativo' || String(p.isActive) === 'true';
    
    const matchesStatus = productStatusFilter === 'all' || 
                          (productStatusFilter === 'active' && isProdActive) || 
                          (productStatusFilter === 'inactive' && !isProdActive);
                          
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

  // --- EFEITOS (CARREGAMENTO EM TEMPO REAL DO FIREBASE) ---
  useEffect(() => {
    // Trava de segurança: Só busca no banco se já souber quem é o lojista
    if (!authRole || !authRole.tenantId || authRole.tenantId === 'loading') return;

    // Usamos a variável global 'db' e adicionamos (docSnap: any) para limpar o erro do TypeScript
    const unsubscribe = onSnapshot(doc(db, 'tenants', authRole.tenantId), (docSnap: any) => {
      if (docSnap.exists()) {
        const dbData = docSnap.data();
        
        setSettings(dbData as any);
        
        // Sobrescreve o formulário com a verdade absoluta do banco de dados
        setSettingsForm((prev: any) => ({
          ...prev,
          ...dbData,
          businessName: dbData.businessName || '',
          slogan: dbData.slogan || '',
          whatsappNumber: dbData.whatsappNumber || '',
          primaryColor: dbData.primaryColor || '#0ea5e9',
          templateId: dbData.templateId || 'nativo_app',
          banners: dbData.banners || [], // <-- LÊ OS BANNERS DO BANCO
          storeMode: dbData.storeMode || 'ecommerce',
          slug: dbData.slug || '', // <-- CORRIGIDO: Se não tem slug, deixa vazio
          address: dbData.address || '',
          aboutText: dbData.aboutText || '',
          storeNiche: dbData.storeNiche || 'varejo',
          cnpj: dbData.cnpj || '',
          metaPhoneId: dbData.metaPhoneId || '',
          metaApiToken: dbData.metaApiToken || ''
        }));
      }
    });

    return () => unsubscribe();
  }, [authRole.tenantId]);

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

  // FUNÇÃO RESTAURADA: Faz o upload tanto de Imagens quanto de Vídeos (.mp4)
  const uploadImageToCloudinary = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    
    if (!uploadPreset || !cloudName) throw new Error("Chaves do Cloudinary ausentes.");
    formData.append('upload_preset', uploadPreset); 
    
    // MUDANÇA SÊNIOR: Alterado de /image/upload para /auto/upload para aceitar vídeos!
    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, {
      method: 'POST', body: formData
    });
    const data = await res.json();
    if (data.secure_url) return data.secure_url;
    throw new Error("Erro no upload da imagem/vídeo");
  };

  // REMOVIDA A VARIÁVEL DUPLICADA AQUI. MANTÉM SÓ A FUNÇÃO:
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

  const [isUploadingProductVideo, setIsUploadingProductVideo] = useState(false);
const [termoIA, setTermoIA] = useState('');
  const [isGeneratingCopy, setIsGeneratingCopy] = useState(false);

  const handleGenerateProductCopy = async () => {
    if (!termoIA) return alert("Digite o nome básico do produto primeiro!");
    setIsGeneratingCopy(true);
    
    try {
        const res = await fetch('/api/generate-product-copy', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                termoRaw: termoIA, 
                lojaNome: settings.businessName || 'Loja',
                lojaNicho: (settings as any).storeNiche || 'varejo',
                lojaLocalizacao: (settings as any).address || ''
            })
        });

        const result = await res.json();
        
        if (res.ok && result.success) {
            setProductForm((prev: any) => ({
                ...prev,
                name: result.nome || prev.name,
                description: result.descricao || prev.description
            }));
            setTermoIA(''); 
            alert("✨ Mágica feita! A IA otimizou seu produto.");
        } else {
            alert(`Erro na IA: ${result.error || 'Tente novamente.'}`);
        }
    } catch (error) {
        alert("Erro de conexão com o servidor da IA. Verifique a internet.");
    } finally {
        setIsGeneratingCopy(false);
    }
  };
  const handleProductVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingProductVideo(true);
    try {
      // O Cloudinary aceita vídeos usando a mesma função genérica
      const url = await uploadImageToCloudinary(file);
      setProductForm({ ...productForm, videoUrl: url });
      alert("✅ Vídeo enviado com sucesso!");
    } catch (error) {
      alert("❌ Erro ao subir vídeo. Tente um arquivo menor (até 10MB).");
    } finally {
      setIsUploadingProductVideo(false);
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
        slug: settingsForm.slug || '', // <-- CORRIGIDO: Salva vazio se o cliente não preencher
        slogan: settingsForm.slogan,
        logoUrl: settingsForm.logoUrl,
        primaryColor: settingsForm.primaryColor,
        whatsappNumber: settingsForm.whatsappNumber,
        storeMode: settingsForm.storeMode,
        maintenanceMode: settingsForm.maintenanceMode,
        productLayout: settingsForm.productLayout,
        paymentMethods: settingsForm.paymentMethods || ['Pix', 'Cartão de Crédito', 'Dinheiro no local', 'Boleto a prazo'],
        templateId: settingsForm.templateId,
        banners: settingsForm.banners || [], // <-- SALVA OS BANNERS
        announcementTexts: settingsForm.announcementTexts || ['', '', ''],
        announcementColor: settingsForm.announcementColor || '#e11d48',
        aboutText: settingsForm.aboutText || '',
        address: settingsForm.address || '',
        faq: settingsForm.faq || [],
        googleReviewUrl: settingsForm.googleReviewUrl || '',
        cnpj: settingsForm.cnpj || '',
        metaPhoneId: settingsForm.metaPhoneId || '',
        metaApiToken: settingsForm.metaApiToken || '',
        privacyPolicy: settingsForm.privacyPolicy || '',
        termsOfUse: settingsForm.termsOfUse || '',
        supportHours: settingsForm.supportHours || '',
        seoDescription: settingsForm.seoDescription || '',
        seoCategory: settingsForm.seoCategory || 'Store',
        adminPhones: settingsForm.whatsappNumber ? [settingsForm.whatsappNumber.replace(/\D/g, '')] : []
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
      if (!response.ok) throw new Error("Erro de conexão com a API de importação.");
      
      const xmlText = await response.text();
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlText, "text/xml");
      
      let items = xmlDoc.getElementsByTagName("item");
      if (items.length === 0) items = xmlDoc.getElementsByTagName("entry");
      if (items.length === 0) throw new Error("Nenhum produto encontrado no XML.");
      
      let importCount = 0;

      for (let i = 0; i < items.length; i++) {
        const node = items[i];

        // Função para pegar tags normais ou do Google Merchant (ex: g:title)
        const getText = (tag1: string, tag2: string) => {
          let el = node.getElementsByTagName(tag1)[0];
          if (!el) el = node.getElementsByTagName(tag2)[0];
          return el ? el.textContent || '' : '';
        };

        const title = getText("g:title", "title");
        if (!title) continue; // Pula se o item não tiver nome

        const description = getText("g:description", "description");
        const imageLink = getText("g:image_link", "image_link") || getText("g:link", "link");
        const category = getText("g:product_type", "category") || 'Importados';
        const sku = getText("g:id", "id") || `XML-${Date.now()}-${i}`;

        // Tratamento do preço (vem como "12.99 BRL" ou "12,99")
        const rawPrice = getText("g:price", "price");
        let price = 0;
        if (rawPrice) {
          const numericString = rawPrice.replace(/[^\d.,]/g, '').replace(',', '.');
          price = parseFloat(numericString) || 0;
        }

        // Salva o produto real no banco de dados usando a função do hook
        await addProduct({
          name: title,
          description: description.substring(0, 400), // Limita tamanho da desc
          price: price,
          imageUrl: imageLink || 'https://cdn-icons-png.flaticon.com/512/8636/8636813.png',
          category: category,
          stock: 999, // Estoque padrão
          sku: sku,
          isActive: true,
          tenantId: authRole?.tenantId || 'mamedes',
          ean: '', ncm: '', weight: 0, seoTitle: '', seoDescription: ''
        });

        importCount++;
      }
      
      alert(`Sincronização concluída! ${importCount} produtos foram importados e salvos.`);
      setIsXmlModalOpen(false);
      setXmlUrl('');
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
    setProductForm({ name: '', description: '', price: 0, imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&q=80&w=600', videoUrl: '', category: 'Geral', stock: 12, sku: `PROD-${Math.floor(Math.random() * 9000 + 1000)}`, isActive: true, ean: '', ncm: '', weight: 0, seoTitle: '', seoDescription: '' });
    setIsProductModalOpen(true);
  };

  const openEditProductModal = (prod: Product) => {
    setEditingProduct(prod);
    setProductForm({ name: prod.name, description: prod.description, price: prod.price, imageUrl: prod.imageUrl, videoUrl: (prod as any).videoUrl || '', category: prod.category, stock: prod.stock, sku: prod.sku, isActive: prod.isActive, ean: prod.ean || '', ncm: prod.ncm || '', weight: prod.weight || 0, seoTitle: prod.seoTitle || '', seoDescription: prod.seoDescription || '' });
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
        
        {/* OVERLAY MOBILE (Fecha o menu ao clicar na parte escura) */}
        {isMobileMenuOpen && (
          <div 
            className="fixed inset-0 bg-slate-900/60 z-[90] lg:hidden backdrop-blur-sm transition-opacity" 
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}

        {/* SIDEBAR PADRÃO VELO DELIVERY - AGORA RESPONSIVA (OFF-CANVAS NO MOBILE) */}
        <aside className={`fixed inset-y-0 left-0 z-[100] w-[280px] flex flex-col bg-white border-r border-gray-200 shrink-0 shadow-2xl lg:shadow-sm transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="p-6 flex flex-col items-center border-b border-gray-50 relative">
            
            {/* Botão de Fechar no Mobile (Visível apenas em telas menores) */}
            <button 
              onClick={() => setIsMobileMenuOpen(false)} 
              className="absolute top-4 right-4 p-2 bg-gray-50 rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 lg:hidden transition-colors"
            >
              <X size={16} />
            </button>
            <div className="w-20 h-20 rounded-full bg-white flex items-center justify-center overflow-hidden shadow-md mb-3 border-4 border-gray-50 p-1">
              <img src={(settings as any).logoUrl || "/velo loja virtual logo.png"} alt={settings.businessName || "Velo Logo"} className="w-full h-full object-contain" />
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
              <>
                <button 
                  onClick={() => setActivePanel('manual')} 
                  className={`w-full flex items-center justify-start gap-3 px-4 py-3.5 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all ${activePanel === 'manual' ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'}`}
                >
                  <Store className="w-5 h-5 shrink-0" /> 
                  <span className="text-left truncate">Frente de Caixa</span>
                </button>
                <button 
                  onClick={() => setActivePanel('orders')} 
                  className={`w-full flex items-center justify-start gap-3 px-4 py-3.5 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all ${activePanel === 'orders' ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'}`}
                >
                  <FileCheck className="w-5 h-5 shrink-0" /> 
                  <span className="text-left truncate">Pedidos</span>
                </button>
                <button 
                  onClick={() => setActivePanel('customers')} 
                  className={`w-full flex items-center justify-start gap-3 px-4 py-3.5 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all ${activePanel === 'customers' ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'}`}
                >
                  <User className="w-5 h-5 shrink-0" /> 
                  <span className="text-left truncate">Clientes (CRM)</span>
                </button>
              </>
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

            {/* Oculta o menu de Atendimento se a API da Meta não estiver configurada no Firebase */}
            {((settings as any)?.metaPhoneId && (settings as any)?.metaApiToken) && (
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
            )}

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
               {/* Agora manda para o Slug (link amigável) personalizado pelo cliente */}
               <a href={`/${settingsForm.slug || authRole.tenantId}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-[#111827] hover:text-[#0055ff] transition-colors">
                 <ExternalLink className="w-4 h-4"/> VER LOJA ONLINE
               </a>
            </div>
            <div className="flex items-center justify-between bg-white p-2.5 rounded-2xl border-2 border-gray-100 shadow-sm group">
               <div className="flex items-center gap-3 overflow-hidden">
                 <div className="w-10 h-10 rounded-full bg-[#111827] text-white flex items-center justify-center font-black text-sm shrink-0">
                    {authRole.email.charAt(0).toUpperCase()}
                 </div>
                 <div className="overflow-hidden">
                   <p className="text-[11px] font-black text-slate-800 uppercase tracking-wider truncate">USUÁRIO</p>
                   <p className="text-[10px] text-slate-500 truncate font-medium" title={authRole.email}>{authRole.email}</p>
                 </div>
               </div>
               
               <button 
                  onClick={handleLogout} 
                  title="Sair da Conta"
                  className="p-2.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all shrink-0 active:scale-95"
               >
                 <LogOut size={18} />
               </button>
            </div>
          </div>
        </aside>

        {/* CONTAINER DIREITO (Engloba Header Mobile + Área Principal) */}
        <div className="flex-1 flex flex-col h-screen overflow-hidden min-w-0 bg-[#f4f7f6]">
          
          {/* HEADER MOBILE (Visível apenas em telas pequenas) */}
          <header className="lg:hidden flex items-center justify-between bg-white border-b border-gray-200 p-4 shrink-0 shadow-sm z-40 relative">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center overflow-hidden border border-gray-100 p-0.5 shadow-sm">
              <img src={(settings as any).logoUrl || "/velo loja virtual logo.png"} alt={settings.businessName || "Velo Logo"} className="w-full h-full object-contain" />
            </div>
              <h1 className="text-xs font-black text-[#111827] uppercase tracking-wider line-clamp-1">
                {settings.businessName || 'Painel de Controle'}
              </h1>
            </div>
            <button 
              onClick={() => setIsMobileMenuOpen(true)} 
              className="p-2 bg-gray-50 border border-gray-200 rounded-lg text-slate-600 hover:text-[#0055ff] hover:bg-blue-50 transition-colors shadow-sm"
            >
              <Menu className="w-5 h-5" />
            </button>
          </header>

          {/* MAIN CONTENT AREA - OCUPARÁ 100% DA LARGURA NO MOBILE AGORA */}
          <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-10 relative">
            
            {activePanel === 'dashboard' && (
            <>
              {showOnboarding ? (
                <div className="max-w-[1200px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <VeloOnboarding 
                    settingsForm={settingsForm}
                    setSettingsForm={setSettingsForm}
                    saveSettings={saveSettings}
                    setActivePanel={setActivePanel}
                    handleLogoUpload={handleLogoUpload}
                    isUploadingLogo={isUploadingLogo}
                    onFinish={() => setShowOnboarding(false)}
                    addProduct={addProduct}
                    uploadImageToCloudinary={uploadImageToCloudinary}
                  />
                </div>
              ) : (
                <div className="space-y-8 max-w-[1400px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
                  
                  {/* CABEÇALHO */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <h1 className="text-4xl font-black italic tracking-tighter uppercase text-[#111827]">Visão Geral</h1>
                      <button onClick={() => setShowOnboarding(true)} className="bg-blue-50 text-[#0055ff] hover:bg-blue-100 px-4 py-2 rounded-lg font-black text-[10px] uppercase tracking-widest border border-blue-200 transition-colors">
                        Reabrir Setup
                      </button>
                    </div>
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
            </>
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
                          className="w-full p-4 bg-white text-slate-800 rounded-2xl outline-none focus:ring-2 ring-[#0055ff] font-bold text-sm border border-gray-200 shadow-sm" 
                      />
                  </div>

                  <div>
                      <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1 block mb-1">Ordem na Tela (Vitrine)</label>
                      <input 
                          type="number" 
                          required 
                          value={categoryForm.order} 
                          onChange={e => setCategoryForm({ ...categoryForm, order: Number(e.target.value) })} 
                          className="w-full p-4 bg-white text-slate-800 rounded-2xl outline-none focus:ring-2 ring-[#0055ff] font-bold text-sm border border-gray-200 shadow-sm" 
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
                <div className="flex flex-col items-center gap-3 mb-2">
                  <div className="relative">
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
                    
                    {/* BOTÃO REMOVER FOTO VISÍVEL NO MOBILE */}
                    {productForm.imageUrl && (
                        <button 
                            type="button" 
                            onClick={() => setProductForm({ ...productForm, imageUrl: '' })} 
                            className="absolute -top-3 -right-3 bg-red-500 hover:bg-red-600 text-white p-2 rounded-full shadow-lg transition-transform active:scale-90 z-20"
                            title="Remover Imagem"
                        >
                            <Trash2 size={16} />
                        </button>
                    )}
                  </div>
                  <p className="text-[10px] font-bold text-slate-400">Clique na caixa acima para subir a foto.</p>
                </div>

                {/* --- GERADOR DE IA (VELO COPY) --- */}
                <div className="bg-gradient-to-r from-purple-50 to-indigo-50 p-5 rounded-3xl border border-purple-100 mb-4 flex flex-col md:flex-row items-center gap-4 shadow-sm">
                    <div className="flex-1 w-full">
                        <label className="text-[10px] font-black text-purple-600 uppercase tracking-widest mb-2 flex items-center gap-1">
                            <Sparkles size={12} /> Velo IA (Auto-Preencher)
                        </label>
                        <input 
                            type="text" 
                            placeholder="Ex: tenis nike, bolo de pote, sofa impermeabilizado..." 
                            className="w-full p-4 bg-white rounded-2xl border border-purple-200 outline-none text-sm font-bold focus:ring-2 ring-purple-400 text-slate-700"
                            value={termoIA}
                            onChange={(e) => setTermoIA(e.target.value)}
                        />
                    </div>
                    <button 
                        type="button" 
                        onClick={handleGenerateProductCopy}
                        disabled={isGeneratingCopy}
                        className="w-full md:w-auto mt-2 md:mt-0 px-8 py-4 bg-purple-600 hover:bg-purple-700 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-lg shadow-purple-200 transition-all disabled:opacity-50 active:scale-95 flex-shrink-0 flex items-center justify-center gap-2"
                    >
                        {isGeneratingCopy ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <Sparkles size={16} />}
                        {isGeneratingCopy ? 'Pensando...' : 'Gerar c/ IA'}
                    </button>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Nome Oficial (Catálogo)</label>
                  <input type="text" required value={productForm.name} onChange={e => setProductForm({...productForm, name: e.target.value})} className="w-full p-4 bg-white rounded-2xl outline-none focus:ring-2 ring-[#0055ff] font-bold text-sm text-slate-700 border border-gray-200 shadow-sm" placeholder="Nome gerado pela IA aparecerá aqui..." />
                </div>
                
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Descrição Comercial</label>
                   <textarea rows={2} value={productForm.description} onChange={e => setProductForm({...productForm, description: e.target.value})} className="w-full p-4 bg-white rounded-2xl outline-none focus:ring-2 ring-[#0055ff] font-medium text-sm text-slate-600 border border-gray-200 shadow-sm resize-none" placeholder="Detalhes do que está incluso..."></textarea>
                  
                  {/* MEDIDOR DE FORÇA DE SEO / IA */}
                  {(() => {
                      const desc = productForm.description || '';
                      const length = desc.length;
                      const hasKeywords = /(serviço|incluso|garantia|atendimento|especial|profissional|domicílio|qualidade|rápido|técnico|manutenção)/i.test(desc);
                      
                      let score = 0;
                      let color = 'bg-slate-200';
                      let text = 'Oculto para Buscas (Muito Curto)';
                      let textColor = 'text-slate-500';

                      if (length > 10) { score = 33; color = 'bg-red-400'; text = 'Fraco (Vitrine Muda)'; textColor = 'text-red-600'; }
                      if (length > 30) { score = 66; color = 'bg-orange-400'; text = 'Bom (Aceitável)'; textColor = 'text-orange-600'; }
                      if (length > 50 && hasKeywords) { score = 100; color = 'bg-green-500'; text = 'Excelente (Pronto para IAs)'; textColor = 'text-green-600'; }

                      return (
                          <div className="mt-2 px-2">
                              <div className="flex justify-between items-center mb-1">
                                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1">
                                      <Sparkles size={10}/> Força para o Google:
                                  </span>
                                  <span className={`text-[9px] font-black uppercase ${textColor}`}>
                                      {text}
                                  </span>
                              </div>
                              <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                  <div className={`h-full ${color} transition-all duration-500`} style={{ width: `${score}%` }}></div>
                              </div>
                          </div>
                      );
                  })()}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Preço Base (R$)</label>
                    <input type="number" step="0.01" value={productForm.price || ''} onChange={e => setProductForm({...productForm, price: Number(e.target.value)})} className="w-full p-4 bg-white rounded-2xl outline-none focus:ring-2 ring-[#0055ff] font-black text-xl text-slate-600 border border-slate-200 shadow-sm placeholder:text-slate-300" placeholder="0.00" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-green-600 tracking-widest ml-1">Preço Oferta (Opcional)</label>
                    <input type="number" step="0.01" value={productForm.promotionalPrice || ''} onChange={e => setProductForm({...productForm, promotionalPrice: Number(e.target.value)})} className="w-full p-4 bg-green-50 rounded-2xl outline-none focus:ring-2 ring-green-500 font-black text-xl text-green-700 border border-green-200 placeholder:text-green-300 shadow-sm" placeholder="0.00" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Marca / Empresa (SEO)</label>
                    <input type="text" value={productForm.brand || ''} onChange={e => setProductForm({...productForm, brand: e.target.value})} className="w-full p-4 bg-white rounded-2xl outline-none focus:ring-2 ring-[#0055ff] font-bold text-sm text-slate-700 border border-gray-200 shadow-sm" placeholder="Ex: Nike, Velo..." />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">SKU / Código</label>
                    <input type="text" value={productForm.sku || ''} onChange={e => setProductForm({...productForm, sku: e.target.value})} className="w-full p-4 bg-white rounded-2xl outline-none focus:ring-2 ring-[#0055ff] font-bold text-sm text-slate-700 border border-gray-200 shadow-sm" placeholder="Ex: PROD-001" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pb-4 border-b border-gray-100">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Estoque</label>
                    <input type="number" value={productForm.stock === 0 ? '' : productForm.stock} onChange={e => setProductForm({...productForm, stock: Number(e.target.value)})} className="w-full p-4 bg-white rounded-2xl outline-none focus:ring-2 ring-[#0055ff] font-bold text-slate-700 border border-gray-200 shadow-sm placeholder:text-slate-300" placeholder="∞" />
                  </div>
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
                
                {/* SUB-Navegação de Catálogo */}
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
                    <input type="text" placeholder="Buscar..." value={productSearch} onChange={(e) => setProductSearch(e.target.value)} className="bg-gray-50 text-sm text-slate-800 pl-10 pr-4 py-2.5 rounded-full border-2 border-gray-100 focus:border-[#ff7b00] outline-none w-[180px] transition-all font-medium" />
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
                    <div key={p.id} className="bg-white p-5 md:p-6 rounded-[2.5rem] border-2 flex items-stretch gap-4 shadow-sm hover:shadow-md transition-all relative overflow-hidden border-slate-100">
                      
                      <div className="flex flex-col items-center gap-3 flex-shrink-0 w-16 md:w-20">
                        <div className="w-16 h-16 md:w-20 md:h-20 flex items-center justify-center bg-slate-50 border border-slate-100 rounded-2xl p-1 shadow-sm">
                          <img src={p.imageUrl || "https://cdn-icons-png.flaticon.com/512/8636/8636813.png"} className="max-w-full max-h-full object-contain rounded-xl" alt={p.name} />
                        </div>
                      </div>

                      <div className="flex-1 min-w-0 flex flex-col justify-center relative z-10">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h3 className={`font-black text-sm md:text-base leading-tight truncate ${p.isActive ? 'text-slate-800' : 'text-slate-400 line-through'}`}>{p.name}</h3>
                        </div>
                        <div className='flex items-center gap-2 mt-1'>
                          <p className="text-blue-600 font-black text-lg">
                            {Number(p.price) > 0 ? `R$ ${Number(p.price).toFixed(2)}` : 'Sob Consulta'}
                          </p>
                        </div>
                        <p className="text-[10px] font-bold mt-2 uppercase tracking-widest text-slate-400">Estoque: {p.stock}</p>
                      </div>

                      <div className="flex flex-col justify-center gap-2 flex-shrink-0 relative z-10 w-10">
                        <button onClick={() => updateProduct(p.id, { isActive: !p.isActive })} className="p-2.5 rounded-xl transition-all shadow-sm border bg-gray-50"><Eye size={16} className="mx-auto" /></button>
                        <button onClick={() => openEditProductModal(p)} className="p-2.5 bg-blue-50 rounded-xl text-blue-600 border border-blue-100 shadow-sm"><Edit2 size={16} className="mx-auto" /></button>
                        <button onClick={() => handleDeleteProduct(p.id)} className="p-2.5 bg-slate-50 rounded-xl text-red-500 border border-slate-100 shadow-sm"><Trash2 size={16} className="mx-auto" /></button>
                      </div>

                    </div>
                  ))
                )}
              </div>

              {totalProductPages > 1 && (
                <div className="flex items-center justify-between border-t-2 border-gray-50 pt-4 px-2">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Página {productCurrentPage} de {totalProductPages}
                  </span>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setProductCurrentPage(prev => Math.max(prev - 1, 1))} disabled={productCurrentPage === 1} className="p-2 bg-gray-50 border border-gray-200 rounded-lg text-slate-600 hover:text-[#0055ff] disabled:opacity-50"><ChevronLeft size={16} /></button>
                    <button onClick={() => setProductCurrentPage(prev => Math.min(prev + 1, totalProductPages))} disabled={productCurrentPage === totalProductPages} className="p-2 bg-gray-50 border border-gray-200 rounded-lg text-slate-600 hover:text-[#0055ff] disabled:opacity-50"><ChevronRight size={16} /></button>
                  </div>
                </div>
              )}
            </div>
          )}
{/* --- TELA PDV (FRENTE DE CAIXA) --- */}
          {activePanel === 'manual' && (
            <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-100px)] animate-in fade-in slide-in-from-bottom-4 duration-500 relative pb-20 lg:pb-0 max-w-7xl mx-auto">
                {/* COLUNA ESQUERDA: CATÁLOGO */}
                <div className="flex-1 flex flex-col bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
                    <div className="p-6 border-b border-slate-100 bg-slate-50 space-y-4">
                        <h2 className="text-2xl font-black italic uppercase text-slate-800 flex items-center gap-2">
                            <Store size={24} className="text-blue-600"/> Lançar Venda/Agendamento
                        </h2>
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                            <input 
                                type="text" 
                                placeholder="Buscar produto ou serviço..." 
                                className="w-full p-4 pl-12 bg-white border border-slate-200 rounded-2xl font-bold text-sm outline-none focus:ring-2 ring-blue-500 transition-all shadow-sm"
                                value={pdvSearch}
                                onChange={(e) => setPdvSearch(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 bg-slate-50 custom-scrollbar">
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {products.filter(p => p.isActive && p.name.toLowerCase().includes(pdvSearch.toLowerCase())).map(p => {
                                const isOutOfStock = p.stock !== undefined && p.stock !== null && String(p.stock) !== '' && Number(p.stock) <= 0;
                                return (
                                    <div 
                                        key={p.id}
                                        onClick={() => {
                                            if (isOutOfStock) return alert("Produto Esgotado!");
                                            const existing = manualCart.find(it => it.id === p.id);
                                            if (existing) {
                                                if (p.stock && existing.quantity >= Number(p.stock)) return alert("Estoque máximo atingido!");
                                                setManualCart(manualCart.map(it => it.id === p.id ? { ...it, quantity: it.quantity + 1 } : it));
                                            } else {
                                                setManualCart([...manualCart, { ...p, quantity: 1, currentPrice: Number((p as any).promotionalPrice) > 0 ? Number((p as any).promotionalPrice) : Number(p.price) }]);
                                            }
                                        }}
                                        className={`bg-white rounded-3xl p-4 border-2 transition-all flex flex-col justify-between h-40 select-none ${isOutOfStock ? 'border-slate-100 opacity-50 cursor-not-allowed grayscale' : 'border-transparent hover:border-blue-400 cursor-pointer shadow-sm active:scale-95'}`}
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            {p.imageUrl ? <img src={p.imageUrl} className="w-10 h-10 object-cover rounded-xl shrink-0" alt={p.name} /> : <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center"><Package size={16} className="text-slate-400"/></div>}
                                            <span className={`text-[9px] font-black px-1.5 py-1 rounded-md shrink-0 ${isOutOfStock ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-500'}`}>
                                                {isOutOfStock ? 'Esgotado' : `Estoque: ${p.stock || '∞'}`}
                                            </span>
                                        </div>
                                        <div>
                                            <p className="font-bold text-slate-700 text-xs leading-tight line-clamp-2 mb-1">{p.name}</p>
                                            <p className="font-black text-blue-600 text-sm">R$ {Number((p as any).promotionalPrice > 0 ? (p as any).promotionalPrice : p.price).toFixed(2)}</p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* BOTÃO FLUTUANTE MOBILE */}
                <div className="lg:hidden fixed bottom-4 left-4 right-4 z-30">
                    <button 
                        onClick={() => setIsMobileCartOpen(!isMobileCartOpen)}
                        className="w-full bg-slate-900 text-white p-4 rounded-[1.5rem] font-black text-sm uppercase tracking-widest shadow-xl flex justify-between items-center active:scale-95 transition-transform"
                    >
                        <div className="flex items-center gap-2"><ShoppingBag size={20}/> Comanda ({manualCart.reduce((a, b) => a + b.quantity, 0)})</div>
                        <span>R$ {manualCart.reduce((a, b) => a + (b.currentPrice * b.quantity), 0).toFixed(2)}</span>
                    </button>
                </div>

                {/* COLUNA DIREITA: COMANDA/CARRINHO */}
                <div className={`${isMobileCartOpen ? 'fixed inset-0 z-40 bg-white m-0' : 'hidden lg:flex'} w-full lg:w-[400px] xl:w-[450px] flex-col bg-white rounded-[2.5rem] shadow-xl border border-slate-100 overflow-hidden flex-shrink-0`}>
                    <div className="p-6 bg-slate-900 text-white flex justify-between items-center relative">
                        <h3 className="font-black italic uppercase text-xl">Comanda</h3>
                        <button onClick={() => setManualCart([])} className="text-[10px] text-red-400 font-bold uppercase tracking-widest hover:text-red-300">Limpar</button>
                        {isMobileCartOpen && <button onClick={() => setIsMobileCartOpen(false)} className="absolute top-6 right-6 lg:hidden"><X size={20}/></button>}
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-50 p-4">
                        {manualCart.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-slate-300 opacity-50">
                                <ShoppingBag size={48} className="mb-2"/>
                                <p className="text-xs font-bold uppercase tracking-widest">Caixa Livre</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {manualCart.map(i => (
                                    <div key={i.id} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col gap-2">
                                        <div className="flex justify-between items-start">
                                            <span className="font-black text-slate-700 text-xs flex-1 pr-2">{i.name}</span>
                                            <span className="font-black text-blue-600 text-sm">R$ {(i.currentPrice * i.quantity).toFixed(2)}</span>
                                        </div>
                                        <div className="flex items-center gap-3 bg-slate-50 p-1.5 rounded-xl border border-slate-100 w-fit">
                                            <button onClick={() => i.quantity <= 1 ? setManualCart(manualCart.filter(item => item.id !== i.id)) : setManualCart(manualCart.map(item => item.id === i.id ? { ...item, quantity: item.quantity - 1 } : item))} className="w-6 h-6 bg-white rounded-lg shadow-sm text-slate-500 font-bold">-</button>
                                            <span className="font-black text-slate-800 text-xs w-6 text-center">{i.quantity}</span>
                                            <button onClick={() => {
                                                if (i.stock && i.quantity >= Number(i.stock)) return alert("Estoque máximo atingido!");
                                                setManualCart(manualCart.map(item => item.id === i.id ? { ...item, quantity: item.quantity + 1 } : item));
                                            }} className="w-6 h-6 bg-white rounded-lg shadow-sm text-blue-600 font-bold">+</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="p-6 bg-white border-t border-slate-100">
                        {manualCart.length > 0 && (
                            <div className="mb-4 space-y-3 max-h-[35vh] overflow-y-auto custom-scrollbar p-1">
                                <label className="flex items-center gap-2 cursor-pointer bg-blue-50 p-3 rounded-xl border border-blue-100">
                                    <input type="checkbox" checked={manualCustomer.isService} onChange={(e) => setManualCustomer({...manualCustomer, isService: e.target.checked})} className="w-4 h-4 accent-blue-600"/>
                                    <span className="font-black text-[10px] uppercase text-blue-800 tracking-widest">É um Agendamento?</span>
                                </label>
                                
                                <input type="text" placeholder="Nome do Cliente *" value={manualCustomer.name} onChange={e => setManualCustomer({...manualCustomer, name: e.target.value})} className="w-full p-3 bg-slate-50 rounded-xl font-bold text-xs border border-slate-200 outline-none focus:ring-2 ring-blue-500" />
                                <input type="tel" placeholder="WhatsApp do Cliente *" value={manualCustomer.phone} onChange={e => setManualCustomer({...manualCustomer, phone: e.target.value.replace(/\D/g, '')})} className="w-full p-3 bg-slate-50 rounded-xl font-bold text-xs border border-slate-200 outline-none focus:ring-2 ring-blue-500" />
                                
                                {manualCustomer.isService && (
                                    <div className="grid grid-cols-2 gap-2">
                                        <input type="date" value={manualCustomer.date} onChange={e => setManualCustomer({...manualCustomer, date: e.target.value})} className="w-full p-3 bg-slate-50 rounded-xl font-bold text-xs border border-slate-200 outline-none focus:ring-2 ring-blue-500" />
                                        <input type="time" value={manualCustomer.time} onChange={e => setManualCustomer({...manualCustomer, time: e.target.value})} className="w-full p-3 bg-slate-50 rounded-xl font-bold text-xs border border-slate-200 outline-none focus:ring-2 ring-blue-500" />
                                    </div>
                                )}
                                
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-black uppercase text-slate-400">Desconto R$</span>
                                    <input type="number" placeholder="0.00" value={manualDiscount || ''} onChange={e => setManualDiscount(Number(e.target.value))} className="w-full p-3 bg-green-50 text-green-700 rounded-xl font-bold text-xs border border-green-200 outline-none focus:ring-2 ring-green-500 text-right" />
                                </div>
                            </div>
                        )}

                        <div className="flex justify-between items-end mb-4">
                            <span className="font-black text-slate-400 uppercase tracking-widest text-[10px]">Total Final</span>
                            <span className="text-3xl font-black text-slate-900 italic leading-none">
                                R$ {Math.max(0, manualCart.reduce((a, b) => a + (b.currentPrice * b.quantity), 0) - manualDiscount).toFixed(2)}
                            </span>
                        </div>

                        <button 
                            onClick={async () => {
                                if (manualCart.length === 0 || !manualCustomer.name || !manualCustomer.phone) return alert("Preencha o Nome, WhatsApp e adicione itens.");
                                if (manualCustomer.isService && (!manualCustomer.date || !manualCustomer.time)) return alert("Preencha a Data e Hora do agendamento.");
                                
                                setIsSubmittingPDV(true);
                                try {
                                    const finalTotal = Math.max(0, manualCart.reduce((a, b) => a + (b.currentPrice * b.quantity), 0) - manualDiscount);
                                    let notes = manualCustomer.isService ? `Agendamento: ${manualCustomer.date.split('-').reverse().join('/')} às ${manualCustomer.time}` : 'Venda (PDV)';
                                    
                                    if (addOrder) {
                                        await addOrder({
                                            customerName: manualCustomer.name,
                                            customerPhone: manualCustomer.phone,
                                            items: manualCart.map(i => ({
                                                productId: i.id,
                                                name: i.name,
                                                price: i.currentPrice,
                                                quantity: i.quantity
                                            })),
                                            total: finalTotal,
                                            status: (manualCustomer.isService ? 'pending' : 'completed'),
                                            paymentStatus: 'paid', 
                                            source: 'manual_pdv',
                                            notes: notes,
                                            tenantId: tenantForHooks,
                                            createdAt: new Date().toISOString()
                                        } as any);
                                        
                                        alert("✅ Pedido/Agendamento lançado com sucesso!");
                                        setManualCart([]);
                                        setManualCustomer({ name: '', phone: '', date: '', time: '', isService: false });
                                        setManualDiscount(0);
                                        setIsMobileCartOpen(false);
                                    } else {
                                        alert("A função addOrder não está mapeada corretamente.");
                                    }
                                } catch (error) {
                                    alert("Erro ao lançar pedido.");
                                } finally {
                                    setIsSubmittingPDV(false);
                                }
                            }}
                            disabled={manualCart.length === 0 || isSubmittingPDV}
                            className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
                        >
                            {isSubmittingPDV ? 'Processando...' : 'Lançar no Sistema'}
                        </button>
                    </div>
                </div>
            </div>
          )}
          {activePanel === 'orders' && (
            <div className="bg-white border-2 border-gray-100 rounded-[2rem] p-8 space-y-6 max-w-6xl mx-auto shadow-sm animate-in fade-in slide-in-from-bottom-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b-2 border-gray-50 pb-6">
                 <div>
                   <h2 className="text-2xl font-black italic uppercase text-[#111827]">Pedidos & Agendamentos</h2>
                   <p className="text-sm font-bold text-slate-500 mt-1">Gerencie as solicitações recebidas da sua vitrine.</p>
                 </div>
              </div>
              <div className="space-y-4">
                {filteredOrders.length === 0 ? (
                  <div className="bg-gray-50 py-16 rounded-2xl text-center text-slate-400 font-bold border-2 border-dashed border-gray-200">Nenhum pedido localizado.</div>
                ) : (
                  filteredOrders.map(ord => (
                    <div key={ord.id} className="bg-white border-2 border-gray-100 rounded-[1.5rem] p-6 flex flex-col md:flex-row justify-between gap-6 items-start md:items-center hover:shadow-lg transition-shadow relative overflow-hidden">
                      {ord.notes && ord.notes.includes('Agendamento:') && (
                         <div className="absolute top-0 left-0 w-1.5 h-full bg-purple-500"></div>
                      )}
                      <div className="space-y-3 flex-1">
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-xs font-black text-slate-800 bg-gray-100 px-3 py-1.5 rounded-lg">{ord.id}</span>
                          <span className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg border-2 ${ord.paymentStatus === 'approved' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-orange-50 text-orange-700 border-orange-200'}`}>
                            {ord.paymentStatus === 'approved' ? 'Pagamento Aprovado' : 'Aguardando Pagamento'}
                          </span>
                        </div>
                        
                        <div>
                          <div className="text-sm text-slate-600 font-medium">Cliente: <strong className="text-slate-900 font-black text-lg">{ord.customerName}</strong></div>
                          {ord.customerPhone && (
                             <a href={`https://wa.me/55${ord.customerPhone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-green-600 hover:underline flex items-center gap-1 mt-1">
                               <MessageSquare size={12}/> {ord.customerPhone}
                             </a>
                          )}
                        </div>

                        {/* EXIBE A DATA DO AGENDAMENTO (Ou Endereço) */}
                        {ord.notes && (
                            <div className={`text-xs font-bold p-3 rounded-xl border ${ord.notes.includes('Agendamento:') ? 'bg-purple-50 text-purple-800 border-purple-200' : 'bg-blue-50 text-blue-800 border-blue-200'}`}>
                                {ord.notes}
                            </div>
                        )}

                        <div className="text-xs text-slate-500 font-medium bg-gray-50 p-3 rounded-xl border border-gray-100 line-clamp-2">
                           <strong>Itens:</strong> {ord.items.map(i => `${i.quantity}x ${i.name}`).join(', ')}
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row items-center gap-4 shrink-0">
                        <div className="text-right bg-gray-50 p-4 rounded-2xl border-2 border-gray-100 min-w-[150px] flex flex-col justify-center">
                          <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Total a Cobrar</div>
                          <div className="text-2xl font-black text-[#ff7b00] tracking-tight">R$ {ord.total.toFixed(2)}</div>
                        </div>
                        
                        <div className="flex flex-col gap-2 w-full sm:w-auto">
                          {ord.status === 'pending' && <button onClick={() => updateOrderStatus(ord.id, 'paid')} className="px-5 py-3 bg-white border-2 border-gray-200 text-[#111827] hover:bg-[#111827] hover:text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all w-full">Confirmar Pagamento</button>}
                          {ord.status === 'paid' && <button onClick={() => updateOrderStatus(ord.id, 'delivered')} className="px-5 py-3 bg-white border-2 border-gray-200 text-[#111827] hover:bg-[#111827] hover:text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all w-full">Marcar Concluído</button>}
                          
                          <div className={`text-center px-4 py-2 text-[10px] font-black uppercase tracking-wider rounded-xl border ${ord.status === 'pending' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' : ord.status === 'paid' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-green-50 text-green-700 border-green-200'}`}>
                              Status: {ord.status === 'pending' ? 'Pendente' : ord.status === 'paid' ? 'Pago/Confirmado' : 'Entregue/Realizado'}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activePanel === 'customers' && (
            <div className="bg-white border-2 border-gray-100 rounded-[2rem] p-8 space-y-6 max-w-6xl mx-auto shadow-sm animate-in fade-in slide-in-from-bottom-4">
               <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b-2 border-gray-50 pb-6">
                 <div>
                   <h2 className="text-2xl font-black italic uppercase text-[#111827] flex items-center gap-2"><User className="text-blue-600"/> Gestão de Clientes (CRM)</h2>
                   <p className="text-sm font-bold text-slate-500 mt-1">Base de contatos gerada automaticamente a partir dos seus pedidos.</p>
                 </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b-2 border-gray-100">
                      <th className="pb-3 px-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Cliente</th>
                      <th className="pb-3 px-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Contato (WhatsApp)</th>
                      <th className="pb-3 px-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Pedidos</th>
                      <th className="pb-3 px-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">LTV (Gasto Total)</th>
                      <th className="pb-3 px-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                        // Extrai e agrupa clientes únicos baseado nos pedidos
                        const customerMap = new Map();
                        orders.forEach(o => {
                            if (!o.customerName) return;
                            const key = o.customerPhone || o.customerName; 
                            if (!customerMap.has(key)) {
                                customerMap.set(key, { name: o.customerName, phone: o.customerPhone, totalSpent: 0, orderCount: 0 });
                            }
                            const c = customerMap.get(key);
                            c.totalSpent += Number(o.total || 0);
                            c.orderCount += 1;
                        });
                        const uniqueCustomers = Array.from(customerMap.values()).sort((a, b) => b.totalSpent - a.totalSpent);

                        if (uniqueCustomers.length === 0) {
                            return (
                                <tr>
                                    <td colSpan={5} className="py-12 text-center text-slate-400 font-bold border-b border-gray-50">Nenhum cliente registrado ainda.</td>
                                </tr>
                            );
                        }

                        return uniqueCustomers.map((cust, idx) => (
                            <tr key={idx} className="border-b border-gray-50 hover:bg-gray-50 transition-colors group">
                                <td className="py-4 px-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-black text-xs shrink-0">
                                            {cust.name.charAt(0).toUpperCase()}
                                        </div>
                                        <span className="font-bold text-slate-800">{cust.name}</span>
                                    </div>
                                </td>
                                <td className="py-4 px-4 font-medium text-slate-600">
                                    {cust.phone ? cust.phone : <span className="text-gray-300 italic">Não informado</span>}
                                </td>
                                <td className="py-4 px-4 text-center font-black text-slate-700">
                                    <span className="bg-gray-100 px-2 py-1 rounded-lg text-xs">{cust.orderCount}</span>
                                </td>
                                <td className="py-4 px-4 text-right font-black text-green-600">
                                    R$ {cust.totalSpent.toFixed(2)}
                                </td>
                                <td className="py-4 px-4 text-right">
                                    {cust.phone && (
                                        <a href={`https://wa.me/55${cust.phone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center p-2 bg-green-50 text-green-600 hover:bg-green-500 hover:text-white rounded-lg transition-colors">
                                            <MessageSquare size={16} />
                                        </a>
                                    )}
                                </td>
                            </tr>
                        ));
                    })()}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activePanel === 'chats' && (
            <div className="space-y-6 max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4">
              {((settings as any)?.metaPhoneId && (settings as any)?.metaApiToken) ? (
                <>
                  <div className="flex justify-between items-end">
                    <div>
                      <h2 className="text-3xl font-black italic uppercase text-[#111827]">Atendimento (WhatsApp)</h2>
                      <p className="text-slate-500 font-bold mt-1 text-sm">Responda seus clientes conectando sua conta da Meta.</p>
                    </div>
                  </div>
                  <AdminChat />
                </>
              ) : (
                <div className="flex flex-col items-center justify-center bg-white border-2 border-dashed border-gray-200 rounded-[2.5rem] py-20 px-4 text-center mt-10 shadow-sm">
                  <div className="w-20 h-20 bg-green-50 text-green-500 rounded-full flex items-center justify-center mb-6 shadow-inner">
                    <MessageSquare size={40} />
                  </div>
                  <h2 className="text-2xl font-black italic uppercase text-slate-800 mb-2">Central de Atendimento Oculta</h2>
                  <p className="text-sm font-bold text-slate-500 max-w-lg mb-8">
                    Para habilitar o painel de chat e responder clientes por aqui, você precisa conectar a API Oficial da Meta (WhatsApp).
                  </p>
                  <button 
                    onClick={() => { setActivePanel('settings'); setSettingsSubPanel('integracoes'); }}
                    className="px-8 py-4 bg-[#111827] text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg hover:bg-black transition-all active:scale-95"
                  >
                    Ir para Integrações
                  </button>
                </div>
              )}
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
                <PricingTable plans={pricingPlans} tenantId={authRole.tenantId} />
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
                    {settingsSubPanel === 'visual' && 'Aparência da Vitrine'}
                    {settingsSubPanel === 'dados' && 'Identidade da Loja'}
                    {settingsSubPanel === 'equipe' && 'Controle de Acessos'}
                    {settingsSubPanel === 'integracoes' && 'Integrações Externas'}
                  </h2>
                </div>
                <button onClick={saveSettings} className="px-6 py-3 bg-[#111827] hover:bg-black text-white font-black uppercase tracking-wider rounded-full shadow-lg shadow-black/20 transition-colors text-[11px]">
                  Salvar alterações
                </button>
              </div>

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
                        {/* O Iframe aponta para a rota da loja segura APENAS quando o ID for confirmado */}
                        {authRole.tenantId !== 'loading' && (
                          <iframe 
                            src={`/${authRole.tenantId}`} 
                            title="Preview da Loja" 
                            className="w-full h-full border-none custom-scrollbar"
                          />
                        )}
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

                      {/* GERENCIADOR DE BANNERS CARROSSEL */}
                      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden p-4 space-y-3">
                        <div className="flex justify-between items-center">
                          <label className="text-[10px] font-black uppercase text-slate-500">Banners (Até 5 Imagens)</label>
                          <span className="text-[9px] font-bold text-slate-400">{(settingsForm.banners || []).length}/5</span>
                        </div>
                        <p className="text-[9px] text-slate-400 font-bold -mt-2 leading-tight">
                          Recomendado: <b>800x400px</b> (Formato Celular). Máximo de <b>2MB</b> por imagem.
                        </p>

                        {/* NOVO: classes modificadas para esconder a scrollbar nativa */}
                        <div className="flex gap-2 overflow-x-auto py-2 snap-x snap-mandatory scrollbar-hide" style={{ msOverflowStyle: 'none', scrollbarWidth: 'none' }}>
                          <style dangerouslySetInnerHTML={{__html: `::-webkit-scrollbar { display: none; }`}} />
                          
                          {/* Lista de Banners Atuais */}
                          {(settingsForm.banners || []).map((bannerUrl: string, idx: number) => (
                            <div key={idx} className="h-16 w-auto min-w-[4rem] max-w-[12rem] bg-gray-100 rounded-lg border border-gray-200 flex-shrink-0 relative group flex items-center justify-center overflow-hidden">
                              <img src={bannerUrl} alt={`Banner ${idx}`} className="max-w-full max-h-full object-contain rounded-lg" />
                              <button 
                                onClick={async () => {
                                  const newBanners = [...settingsForm.banners];
                                  newBanners.splice(idx, 1);
                                  setSettingsForm({...settingsForm, banners: newBanners});
                                  if (authRole.tenantId && authRole.tenantId !== 'loading') {
                                    await setDoc(doc(db, 'tenants', authRole.tenantId), { banners: newBanners }, { merge: true });
                                    // GRAVAÇÃO BLINDADA COM O ID DO LOJISTA
                                    localStorage.setItem(`velo_store_banners_${authRole.tenantId}`, JSON.stringify(newBanners));
                                    window.dispatchEvent(new Event('storage'));
                                  }
                                }}
                                className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ))}

                          {/* Botão de Adicionar Banners */}
                          {(settingsForm.banners || []).length < 5 && (
                            <label className="w-24 h-12 flex-shrink-0 cursor-pointer bg-gray-50 border-2 border-dashed border-gray-200 hover:border-[#0055ff] hover:bg-blue-50 transition-colors rounded-lg flex flex-col items-center justify-center relative">
                              {isUploadingBanner ? (
                                <div className="w-4 h-4 border-2 border-[#0055ff] border-t-transparent rounded-full animate-spin"></div>
                              ) : (
                                <Plus className="w-5 h-5 text-slate-400" />
                              )}
                              <input 
                                type="file" accept="image/jpeg, image/png, image/webp" disabled={isUploadingBanner} className="hidden" 
                                onChange={async (e) => {
                                  const file = e.target.files?.[0];
                                  if (!file) return;
                                  if (file.size > 2 * 1024 * 1024) return alert("⚠️ Imagem muito pesada!");
                                  setIsUploadingBanner(true);
                                  try {
                                    const url = await uploadImageToCloudinary(file);
                                    const novosBanners = [...(settingsForm.banners || []), url];
                                    setSettingsForm((prev: any) => ({ ...prev, banners: novosBanners }));
                                    if (authRole.tenantId && authRole.tenantId !== 'loading') {
                                      await setDoc(doc(db, 'tenants', authRole.tenantId), { banners: novosBanners }, { merge: true });
                                      // GRAVAÇÃO BLINDADA COM O ID DO LOJISTA
                                      localStorage.setItem(`velo_store_banners_${authRole.tenantId}`, JSON.stringify(novosBanners));
                                      window.dispatchEvent(new Event('storage'));
                                    }
                                  } catch (error) {
                                    alert("Erro de conexão ao enviar a imagem.");
                                  } finally {
                                    setIsUploadingBanner(false);
                                  }
                                }}
                              />
                            </label>
                          )}
                        </div>
                      </div>

                      {/* BANNER TARJA (ANNOUNCEMENT BAR) CORRIGIDO - AGORA ESTÁ FORA DO CARROSSEL! */}
                      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden p-4 space-y-3">
                        <label className="text-[10px] font-black uppercase text-slate-500">Banner Tarja (Topo da Loja)</label>
                        <p className="text-[9px] text-slate-400 font-bold -mt-2 leading-tight">
                          Chame a atenção para promoções. Adicione até 3 mensagens que ficarão passando na tela.
                        </p>

                        <div className="flex items-center gap-3 mb-3">
                          <div className="relative w-8 h-8 shrink-0 rounded-full overflow-hidden border-2 border-gray-200 shadow-sm cursor-pointer hover:border-[#0055ff]">
                            <input 
                              type="color" 
                              value={settingsForm.announcementColor || '#e11d48'} 
                              onChange={(e) => setSettingsForm({...settingsForm, announcementColor: e.target.value})} 
                              className="absolute -top-2 -left-2 w-12 h-12 cursor-pointer" 
                            />
                          </div>
                          <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Cor de Fundo da Tarja</span>
                        </div>

                        <div className="space-y-2">
                          {[0, 1, 2].map((index) => (
                            <input
                              key={index}
                              type="text"
                              placeholder={`Mensagem ${index + 1} (Ex: 🚀 Frete Grátis acima de R$ 100)`}
                              value={(settingsForm.announcementTexts && settingsForm.announcementTexts[index]) || ''}
                              onChange={(e) => {
                                const newTexts = [...(settingsForm.announcementTexts || ['', '', ''])];
                                newTexts[index] = e.target.value;
                                setSettingsForm({...settingsForm, announcementTexts: newTexts});
                              }}
                              className="w-full bg-gray-50 border border-gray-200 text-xs font-bold text-slate-700 p-2.5 rounded-lg outline-none focus:border-[#0055ff]"
                            />
                          ))}
                        </div>
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
                        value={settingsForm.businessName || ''}
                        onChange={(e) => setSettingsForm({...settingsForm, businessName: e.target.value})}
                        className="w-full bg-gray-50 border-2 border-gray-100 text-sm font-bold text-slate-800 p-3.5 rounded-xl outline-none focus:border-[#0055ff] transition-colors"
                      />
                    </div>

                    {/* NOVO CAMPO: LINK PERSONALIZADO */}
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Link da Loja (Sua URL)</label>
                      <div className="flex items-center bg-gray-50 border-2 border-gray-100 rounded-xl overflow-hidden focus-within:border-[#0055ff] transition-colors">
                        <span className="pl-3.5 py-3.5 text-[11px] font-bold text-slate-400 bg-gray-100">veloloja.com.br/</span>
                        <input 
                          type="text" 
                          value={settingsForm.slug || ''}
                          onChange={(e) => setSettingsForm({...settingsForm, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')})}
                          className="w-full bg-transparent text-sm font-bold text-slate-800 p-3.5 outline-none"
                          placeholder="minha-loja"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Slogan / Frase de Efeito</label>
                       <input 
                        type="text" 
                        value={settingsForm.slogan || ''}
                        onChange={(e) => setSettingsForm({...settingsForm, slogan: e.target.value})}
                        className="w-full bg-gray-50 border-2 border-gray-100 text-sm font-bold text-slate-800 p-3.5 rounded-xl outline-none focus:border-[#0055ff] transition-colors"
                        placeholder="Ex: Seu negócio, sua regra"
                      />
                    </div>

                    {/* NOVO CAMPO: CNPJ DA LOJA */}
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">CNPJ da Empresa</label>
                      <input 
                        type="text" 
                        value={settingsForm.cnpj || ''}
                        onChange={(e) => setSettingsForm({...settingsForm, cnpj: e.target.value})}
                        className="w-full bg-gray-50 border-2 border-gray-100 text-sm font-bold text-slate-800 p-3.5 rounded-xl outline-none focus:border-[#0055ff] transition-colors"
                        placeholder="Ex: 00.000.000/0001-00"
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
                      </select>
                    </div>

                    {/* NOVO CAMPO: ENDEREÇO FÍSICO (MAPA) */}
                    <div className="space-y-2 md:col-span-2 pt-4 border-t border-gray-100">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-red-500" /> Endereço Físico (Para o Mapa na Vitrine)
                      </label>
                      <p className="text-[10px] text-slate-400 font-medium -mt-1">Deixe em branco se você atende apenas online. O mapa será ocultado automaticamente da vitrine.</p>
                      <input 
                        type="text" 
                        value={(settingsForm as any).address || ''}
                        onChange={(e) => setSettingsForm({...settingsForm, address: e.target.value} as any)}
                        className="w-full bg-gray-50 border-2 border-gray-100 text-sm font-bold text-slate-800 p-3.5 rounded-xl outline-none focus:border-red-500 transition-colors"
                        placeholder="Ex: Rua das Flores, 123 - Centro, São Paulo - SP"
                      />
                    </div>

                    {/* NOVO CAMPO: HORÁRIO DE ATENDIMENTO */}
                    <div className="space-y-2 md:col-span-2 pt-4 border-t border-gray-100">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-orange-500" /> Horário de Atendimento
                      </label>
                      <p className="text-[10px] text-slate-400 font-medium -mt-1">Aparecerá no rodapé da loja. Ex: Segunda a Sexta, das 08h às 18h.</p>
                      <input 
                        type="text" 
                        value={(settingsForm as any).supportHours || ''}
                        onChange={(e) => setSettingsForm({...settingsForm, supportHours: e.target.value} as any)}
                        className="w-full bg-gray-50 border-2 border-gray-100 text-sm font-bold text-slate-800 p-3.5 rounded-xl outline-none focus:border-orange-500 transition-colors"
                        placeholder="Ex: Seg a Sex, das 09:00 às 18:00"
                      />
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

                    {/* NOVO CAMPO: CATEGORIA EXATA PARA SEO (SCHEMA.ORG) */}
                    <div className="space-y-2 md:col-span-2 pt-4 border-t border-gray-100">
                      <label className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-purple-600" /> Categoria SEO (Rich Results Google)
                      </label>
                      <p className="text-[10px] text-slate-500 font-bold -mt-1 leading-tight max-w-3xl">
                        Define como os robôs do Google enxergam a estrutura do seu negócio (Schema.org). Isso é independente da categoria do Google Meu Negócio e foca em te destacar nos resultados de pesquisa.
                      </p>
                      <select
                        value={(settingsForm as any).seoCategory || 'Store'}
                        onChange={(e) => setSettingsForm({...settingsForm, seoCategory: e.target.value} as any)}
                        className="w-full bg-white border-2 border-purple-100 text-sm font-bold text-slate-700 p-3.5 rounded-xl outline-none focus:border-purple-500 transition-colors cursor-pointer shadow-sm"
                      >
                        <option value="Store">Loja Genérica / E-commerce (Padrão)</option>
                        <option value="BeautySalon">Salão de Beleza / Estética / Cílios / Barbearia</option>
                        <option value="Restaurant">Restaurante / Lanchonete / Food Service</option>
                        <option value="AutoRepair">Oficina Mecânica / Reparos</option>
                        <option value="MedicalClinic">Clínica Médica / Odontológica / Saúde</option>
                        <option value="PetStore">Pet Shop / Agropecuária</option>
                        <option value="Pharmacy">Farmácia / Drogaria</option>
                        <option value="ProfessionalService">Serviços Profissionais / Autônomos</option>
                      </select>
                    </div>

                    {/* NOVO CAMPO MASTER: DESCRIÇÃO SEO (META TAG) */}
                    <div className="space-y-2 md:col-span-2 pt-4 border-t border-gray-100">
                      <div className="flex justify-between items-center">
                        <label className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                          <Search className="w-4 h-4 text-blue-600" /> Descrição para o Google (Meta SEO)
                        </label>
                        <button 
                          type="button" 
                          onClick={() => {
                            if (!settingsForm.businessName) return alert("Preencha o Nome da Loja primeiro!");
                            const niche = settingsForm.storeNiche || 'varejo';
                            const loc = (settingsForm as any).address ? ` em ${(settingsForm as any).address.split('-').pop()?.trim()}` : '';
                            const generatedSEO = `${settingsForm.businessName}: Especialistas em ${niche === 'salao_beleza' ? 'beleza e estética' : niche === 'oficina' ? 'manutenção automotiva' : niche === 'floricultura' ? 'arranjos e presentes' : 'produtos exclusivos'}${loc}. Oferecemos qualidade, atendimento rápido e os melhores preços da região. Acesse nosso catálogo online e garanta sua oferta agora mesmo!`;
                            setSettingsForm({...settingsForm, seoDescription: generatedSEO} as any);
                          }}
                          className="bg-blue-50 text-blue-600 hover:bg-blue-100 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
                        >
                          <Sparkles size={12}/> Auto-Completar (IA)
                        </button>
                      </div>
                      <p className="text-[10px] text-slate-500 font-bold -mt-1 leading-tight max-w-2xl">
                        Este é o texto que aparece embaixo do link quando alguém compartilha sua loja no WhatsApp ou encontra no Google. O ideal é ter entre 140 e 160 caracteres.
                      </p>
                      
                      <div className="relative">
                        <textarea
                          maxLength={160}
                          value={(settingsForm as any).seoDescription || ''}
                          onChange={(e) => setSettingsForm({...settingsForm, seoDescription: e.target.value} as any)}
                          className="w-full bg-white border-2 border-blue-100 text-sm font-medium text-slate-800 p-4 rounded-xl outline-none focus:border-blue-500 transition-colors resize-none shadow-sm"
                          rows={3}
                          placeholder="Acesse nosso catálogo e confira os melhores produtos da região..."
                        />
                        <div className={`absolute bottom-3 right-4 text-[10px] font-black ${((settingsForm as any).seoDescription || '').length > 150 ? 'text-red-500' : 'text-slate-400'}`}>
                          {((settingsForm as any).seoDescription || '').length}/160
                        </div>
                      </div>
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

                    {/* NOVO CAMPO: TERMOS E PRIVACIDADE */}
                    <div className="space-y-4 md:col-span-2 pt-4 border-t border-gray-100">
                      <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                          <ShieldCheck className="w-3.5 h-3.5 text-blue-500" /> Política de Privacidade (Opcional)
                        </label>
                        <p className="text-[10px] text-slate-400 font-medium -mt-1 mb-2">Deixe em branco para usar nosso texto padrão (já aprovado pelo Google).</p>
                        <textarea
                          value={(settingsForm as any).privacyPolicy || ''}
                          onChange={(e) => setSettingsForm({...settingsForm, privacyPolicy: e.target.value} as any)}
                          className="w-full bg-gray-50 border-2 border-gray-100 text-sm font-bold text-slate-800 p-3.5 rounded-xl outline-none focus:border-blue-500 transition-colors resize-y custom-scrollbar"
                          rows={4}
                          placeholder="Digite sua política de privacidade personalizada..."
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                          <FileCheck className="w-3.5 h-3.5 text-blue-500" /> Termos e Reembolso (Opcional)
                        </label>
                        <p className="text-[10px] text-slate-400 font-medium -mt-1 mb-2">Deixe em branco para usar as regras padrão (Direito de Arrependimento de 7 dias).</p>
                        <textarea
                          value={(settingsForm as any).termsOfUse || ''}
                          onChange={(e) => setSettingsForm({...settingsForm, termsOfUse: e.target.value} as any)}
                          className="w-full bg-gray-50 border-2 border-gray-100 text-sm font-bold text-slate-800 p-3.5 rounded-xl outline-none focus:border-blue-500 transition-colors resize-y custom-scrollbar"
                          rows={4}
                          placeholder="Digite seus termos de uso e política de devolução..."
                        />
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
          </div> {/* FIM DO NOVO CONTAINER DIREITO (Header Mobile + Main) */}
      </div> {/* FIM DO CONTAINER PRINCIPAL (flex h-screen) */}
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
                          className="w-full p-4 bg-white text-slate-800 rounded-2xl outline-none focus:ring-2 ring-[#0055ff] font-bold text-sm border border-gray-200 shadow-sm" 
                      />
                  </div>

                  <div>
                      <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1 block mb-1">Ordem na Tela (Vitrine)</label>
                      <input 
                          type="number" 
                          required 
                          value={categoryForm.order} 
                          onChange={e => setCategoryForm({ ...categoryForm, order: Number(e.target.value) })} 
                          className="w-full p-4 bg-white text-slate-800 rounded-2xl outline-none focus:ring-2 ring-[#0055ff] font-bold text-sm border border-gray-200 shadow-sm" 
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
                <div className="flex flex-col items-center gap-3 mb-2">
                  <div className="relative">
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
                    
                    {/* BOTÃO REMOVER FOTO VISÍVEL NO MOBILE */}
                    {productForm.imageUrl && (
                        <button 
                            type="button" 
                            onClick={() => setProductForm({ ...productForm, imageUrl: '' })} 
                            className="absolute -top-3 -right-3 bg-red-500 hover:bg-red-600 text-white p-2 rounded-full shadow-lg transition-transform active:scale-90 z-20"
                            title="Remover Imagem"
                        >
                            <Trash2 size={16} />
                        </button>
                    )}
                  </div>
                  <p className="text-[10px] font-bold text-slate-400">Clique na caixa acima para subir a foto.</p>
                </div>

                {/* --- UPLOAD DE VÍDEO VERTICAL (REELS/TIKTOK) --- */}
                <div className="pt-4 mt-2 border-t border-slate-100">
                    <label className="text-xs font-black text-blue-600 uppercase tracking-widest ml-2 flex items-center gap-2 mb-3">
                        🎥 Vídeo do Produto (Estilo Reels)
                    </label>
                    <div className="space-y-4">
                        {productForm.videoUrl && (
                            <div className="relative w-max mx-auto">
                                <div className="rounded-2xl overflow-hidden border-2 border-blue-100 aspect-[9/16] w-32 bg-slate-900 shadow-md">
                                    <video src={productForm.videoUrl} muted autoPlay loop playsInline className="w-full h-full object-cover" />
                                </div>
                                {/* BOTÃO REMOVER VÍDEO VISÍVEL NO MOBILE */}
                                <button 
                                    type="button" 
                                    onClick={() => setProductForm({ ...productForm, videoUrl: '' })} 
                                    className="absolute -top-3 -right-3 bg-red-500 hover:bg-red-600 text-white p-2 rounded-full shadow-lg transition-transform active:scale-90 z-20"
                                    title="Remover Vídeo"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        )}
                        <label className={`w-full p-4 rounded-2xl flex items-center justify-center gap-2 font-bold cursor-pointer transition-all border-2 ${isUploadingProductVideo ? 'bg-blue-50 border-blue-400 text-blue-400 pointer-events-none' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-blue-50 hover:border-blue-300 shadow-sm'}`}>
                            <input type="file" accept="video/mp4,video/mov,video/webm" onChange={handleProductVideoUpload} className="hidden" />
                            {isUploadingProductVideo ? (
                                <> <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div> <span className="text-xs uppercase font-black">Enviando...</span> </>
                            ) : (
                                <> <UploadCloud size={20} /> <span className="text-xs uppercase font-black">{productForm.videoUrl ? 'Trocar Arquivo MP4' : 'Subir Vídeo Vertical (MP4)'}</span> </>
                            )}
                        </label>
                        <input type="url" placeholder="Ou cole o link direto (https://...)" className="w-full p-4 bg-slate-50 rounded-2xl outline-none font-bold text-xs border border-slate-200 focus:ring-2 ring-blue-500 transition-all text-slate-600" value={productForm.videoUrl || ''} onChange={e => setProductForm({ ...productForm, videoUrl: e.target.value })} />
                    </div>
                </div>
                {/* ----------------------------------------------- */}

               <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Nome do Item / Serviço</label>
                   <input type="text" required value={productForm.name} onChange={e => setProductForm({...productForm, name: e.target.value})} className="w-full p-4 bg-white rounded-2xl outline-none focus:ring-2 ring-[#0055ff] font-bold text-sm text-slate-700 border border-gray-200 shadow-sm" placeholder="Ex: Limpeza a Seco de Sofá" />
                  <p className="text-[10px] text-[#0055ff] font-bold mt-1 ml-2 flex items-center gap-1">
                      <Search size={12} /> Digite exatamente como seu cliente buscaria no Google.
                  </p>
                </div>
                
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Descrição</label>
                  <textarea rows={2} value={productForm.description} onChange={e => setProductForm({...productForm, description: e.target.value})} className="w-full p-4 bg-white rounded-2xl outline-none focus:ring-2 ring-[#0055ff] font-medium text-sm text-slate-600 border border-gray-200 shadow-sm resize-none" placeholder="Detalhes do que está incluso..."></textarea>
                  
                  {/* MEDIDOR DE FORÇA DE SEO / IA */}
                  {(() => {
                      const desc = productForm.description || '';
                      const length = desc.length;
                      const hasKeywords = /(serviço|incluso|garantia|atendimento|especial|profissional|domicílio|qualidade|rápido|técnico|manutenção)/i.test(desc);
                      
                      let score = 0;
                      let color = 'bg-slate-200';
                      let text = 'Oculto para Buscas (Muito Curto)';
                      let textColor = 'text-slate-500';

                      if (length > 10) { score = 33; color = 'bg-red-400'; text = 'Fraco (Vitrine Muda)'; textColor = 'text-red-600'; }
                      if (length > 30) { score = 66; color = 'bg-orange-400'; text = 'Bom (Aceitável)'; textColor = 'text-orange-600'; }
                      if (length > 50 && hasKeywords) { score = 100; color = 'bg-green-500'; text = 'Excelente (Pronto para IAs)'; textColor = 'text-green-600'; }

                      return (
                          <div className="mt-2 px-2">
                              <div className="flex justify-between items-center mb-1">
                                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1">
                                      <Sparkles size={10}/> Força para o Google:
                                  </span>
                                  <span className={`text-[9px] font-black uppercase ${textColor}`}>
                                      {text}
                                  </span>
                              </div>
                              <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                  <div className={`h-full ${color} transition-all duration-500`} style={{ width: `${score}%` }}></div>
                              </div>
                          </div>
                      );
                  })()}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Preço Base (R$)</label>
                    <input type="number" step="0.01" value={productForm.price || ''} onChange={e => setProductForm({...productForm, price: Number(e.target.value)})} className="w-full p-4 bg-white rounded-2xl outline-none focus:ring-2 ring-[#0055ff] font-black text-xl text-slate-600 border border-slate-200 shadow-sm placeholder:text-slate-300" placeholder="0.00" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-green-600 tracking-widest ml-1">Preço Oferta (Opcional)</label>
                    <input type="number" step="0.01" value={productForm.promotionalPrice || ''} onChange={e => setProductForm({...productForm, promotionalPrice: Number(e.target.value)})} className="w-full p-4 bg-green-50 rounded-2xl outline-none focus:ring-2 ring-green-500 font-black text-xl text-green-700 border border-green-200 placeholder:text-green-300 shadow-sm" placeholder="0.00" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Marca / Empresa (SEO)</label>
                    <input type="text" value={productForm.brand || ''} onChange={e => setProductForm({...productForm, brand: e.target.value})} className="w-full p-4 bg-white rounded-2xl outline-none focus:ring-2 ring-[#0055ff] font-bold text-sm text-slate-700 border border-gray-200 shadow-sm" placeholder="Ex: Nike, Velo..." />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">SKU / Código</label>
                    <input type="text" value={productForm.sku || ''} onChange={e => setProductForm({...productForm, sku: e.target.value})} className="w-full p-4 bg-white rounded-2xl outline-none focus:ring-2 ring-[#0055ff] font-bold text-sm text-slate-700 border border-gray-200 shadow-sm" placeholder="Ex: PROD-001" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pb-4 border-b border-gray-100">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Estoque (Opcional)</label>
                    <input type="number" value={productForm.stock === 0 ? '' : productForm.stock} onChange={e => setProductForm({...productForm, stock: Number(e.target.value)})} className="w-full p-4 bg-white rounded-2xl outline-none focus:ring-2 ring-[#0055ff] font-bold text-slate-700 border border-gray-200 shadow-sm placeholder:text-slate-300" placeholder="∞" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Categoria na Loja</label>
                    {(() => {
                      // Pegamos a lista de categorias existentes na loja
                      const uniqueCategoriesList = Array.from(new Set(products.map(p => p.category))).filter(Boolean);
                      
                      return (
                        <div className="relative">
                          <select 
                            required 
                            value={productForm.category} 
                            onChange={e => setProductForm({...productForm, category: e.target.value})} 
                            className="w-full p-4 bg-white rounded-2xl outline-none focus:ring-2 ring-[#0055ff] font-bold text-sm text-slate-700 border border-gray-200 shadow-sm appearance-none cursor-pointer" 
                          >
                            <option value="" disabled>Selecione uma Categoria...</option>
                            {uniqueCategoriesList.map(cat => (
                              <option key={cat} value={cat}>{cat}</option>
                            ))}
                            {/* Caso ele tenha digitado algo manualmente antes, isso garante que não quebre */}
                            {productForm.category && !uniqueCategoriesList.includes(productForm.category) && (
                                <option value={productForm.category}>{productForm.category}</option>
                            )}
                          </select>
                          <ChevronDown className="w-4 h-4 text-slate-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>
                      );
                    })()}
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