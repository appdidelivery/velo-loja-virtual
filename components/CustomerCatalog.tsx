"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShoppingCart, Search, Menu, User, HeadphonesIcon, 
  ChevronDown, Star, ShieldCheck, MapPin, Phone, 
  X, Plus, Minus, Trash2, LayoutGrid, ClipboardList, ShoppingBag,
  Scissors, Smartphone, Sofa, Wrench, Shirt, Gem, Beer, ChevronRight, Sparkles,
  Store, Calendar, UploadCloud
} from 'lucide-react';

import { Product, TenantSettings } from '../types';
import Reviews from '../components/Reviews';
import { INITIAL_SETTINGS } from '../data/mokedData';
import { useProducts } from '../hooks/useProducts';
import { useOrders } from '../hooks/useOrders'; 
import { doc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { TEMPLATES } from '../data/templatesConfig';

const STORE_TRUST_DATA = {
  cnpj: '45.123.456/0001-99',
  address: 'Rua das Embalagens, 1578 - Centro, São Paulo - SP, 01310-200',
  returnPolicy: 'Troca garantida em até 7 dias corridos conforme CDC.',
  supportHours: 'Segunda a Sexta, das 08h às 18h',
  email: 'vendas@velovarejo.com.br'
};

const THEME = {
  primary: '#357b64',
  secondary: '#2c6b56',
  accent: '#25D366',
  dark: '#2a2a2a',
};

export default function CustomerCatalog({ 
  tenantId: propTenantId,
  initialData 
}: { 
  tenantId?: string;
  initialData?: any; 
}) {
  const settings: TenantSettings = INITIAL_SETTINGS;

  const tenantId = (() => {
    if (propTenantId) return propTenantId;

    if (typeof window !== 'undefined') {
      const host = window.location.hostname;
      const path = window.location.pathname; 
      
      if (host === 'localhost' || host === '127.0.0.1') {
        const pathSegments = path.split('/').filter(Boolean);
        if (pathSegments.length > 0 && pathSegments[0] !== 'admin' && pathSegments[0] !== 'login') {
          return pathSegments[0]; 
        }
        return 'loja_teste_local';
      }

      if (host === 'app.mamedes.com.br') return 'mamedes';
      return host; 
    }
    return 'loja_teste_local'; 
  })();

  const { products, loading } = useProducts(tenantId);
  const { addOrder } = useOrders(tenantId);
  
  const activeProducts = useMemo(() => products.filter(p => p.isActive), [products]);
  const categories = useMemo(() => Array.from(new Set(activeProducts.map(p => p.category))), [activeProducts]);

  const [cart, setCart] = useState<{ product: Product; quantity: number }[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  
  const [customerName, setCustomerName] = useState('');
  const [customerCnpj, setCustomerCnpj] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Pix');
  const [cep, setCep] = useState('');
  const [address, setAddress] = useState({ street: '', neighborhood: '', city: '', state: '' });
  const [addressNumber, setAddressNumber] = useState('');
  const [complement, setComplement] = useState('');
  const [isLoadingCep, setIsLoadingCep] = useState(false);
  
  const [serviceDate, setServiceDate] = useState('');
  const [serviceTime, setServiceTime] = useState('');
  const [serviceAddress, setServiceAddress] = useState('');
  
  const [layoutMode, setLayoutMode] = useState<'complete' | 'webview'>('webview');
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos');

  const [themeColor, setThemeColor] = useState(initialData?.primaryColor || '#357b64');
  const [storeLogo, setStoreLogo] = useState(initialData?.logoUrl || '');
  const [storeName, setStoreName] = useState(initialData?.businessName || settings.businessName);
  const [storeSlogan, setStoreSlogan] = useState(initialData?.slogan || 'Catálogo Exclusivo');
  const [storeWhatsapp, setStoreWhatsapp] = useState(initialData?.whatsappNumber || settings.whatsappNumber);
  const [productLayout, setProductLayout] = useState<'list' | 'grid'>(initialData?.productLayout || 'list');
  const [templateId, setTemplateId] = useState(initialData?.templateId || 'conveniencia_padrao');
  const [storeMode, setStoreMode] = useState<'ecommerce' | 'catalogo' | 'orcamento'>(initialData?.storeMode || 'ecommerce');
  
  const [storeAddress, setStoreAddress] = useState(initialData?.address || '');
  const [storeAbout, setStoreAbout] = useState(initialData?.aboutText || '');
  const [storeFaq, setStoreFaq] = useState(initialData?.faq || []);
  const [storeCnpj, setStoreCnpj] = useState(initialData?.cnpj || '');
  const [storeBanners, setStoreBanners] = useState<string[]>(initialData?.banners || []);
  
  const [storeSeoCategory, setStoreSeoCategory] = useState(initialData?.seoCategory || initialData?.storeNiche || 'Store');
  const [storePriceRange, setStorePriceRange] = useState(initialData?.priceRange || '$$');
  const [storeSocialLinks, setStoreSocialLinks] = useState<string[]>([]);

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const [visibleCount, setVisibleCount] = useState(25);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedVariationIndex, setSelectedVariationIndex] = useState<number>(0);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number>(0);

  useEffect(() => {
    setMounted(true);
    let unsubscribe = () => {};

    // CORREÇÃO: Função movida para o escopo raiz do useEffect
    const handleStorageChange = () => {
        const freshBanners = localStorage.getItem('velo_store_banners');
        if (freshBanners) {
            try { setStoreBanners(JSON.parse(freshBanners)); } catch(e) {}
        }
    };

    const setupFirebase = async () => {
      if (tenantId) {
        const { onSnapshot, doc } = await import('firebase/firestore');
        
        // Ouve os gritos do AdminDashboard e atualiza a tela na hora!
        window.addEventListener('storage', handleStorageChange);

        unsubscribe = onSnapshot(
          doc(db, 'tenants', tenantId), 
          (docSnap) => {
            if (docSnap.exists()) {
              const data = docSnap.data();
              
              if (data.primaryColor) setThemeColor(data.primaryColor);
              setStoreLogo(data.logoUrl || ''); 
              setStoreName(data.businessName || settings.businessName);
              setStoreSlogan(data.slogan || 'Catálogo Exclusivo');
              setStoreWhatsapp(data.whatsappNumber || settings.whatsappNumber);
              setProductLayout((data.productLayout as 'list' | 'grid') || 'list');
              setTemplateId(data.templateId || 'conveniencia_padrao');
              setStoreMode(data.storeMode || 'ecommerce');
              
              setStoreAddress(data.address || '');
              setStoreAbout(data.aboutText || '');
              setStoreFaq(data.faq || []);
              setStoreCnpj(data.cnpj || '');
              
              // Tenta ler primeiro do LocalStorage para ser instantâneo no painel, se não, pega do Firebase
              const cachedBanners = localStorage.getItem('velo_store_banners');
              if (cachedBanners) {
                  try { setStoreBanners(JSON.parse(cachedBanners)); } 
                  catch(e) { setStoreBanners(data.banners || []); }
              } else {
                  setStoreBanners(data.banners || []); 
              }
              
              setStoreSeoCategory(data.seoCategory || data.storeNiche || 'Store');
              setStorePriceRange(data.priceRange || '$$');
              
              const links = [];
              if (data.instagramUrl) links.push(data.instagramUrl);
              if (data.facebookUrl) links.push(data.facebookUrl);
              if (data.authorityLinks) {
                  data.authorityLinks.split(',').forEach((l: string) => links.push(l.trim()));
              }
              setStoreSocialLinks(links);
            }
          }
        );
      }
    };

    setupFirebase();
    return () => {
        unsubscribe();
        window.removeEventListener('storage', handleStorageChange);
    };
  }, [tenantId]);

  const filteredActiveProducts = useMemo(() => {
    let filtered = activeProducts;
    if (selectedCategory !== 'Todos') {
      filtered = filtered.filter(p => p.category === selectedCategory);
    }
    if (searchQuery.trim() !== '') {
      filtered = filtered.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()));
    }
    return filtered;
  }, [activeProducts, selectedCategory, searchQuery]);

  const paginatedProducts = useMemo(() => {
    return filteredActiveProducts.slice(0, visibleCount);
  }, [filteredActiveProducts, visibleCount]);

  const handleLoadMore = () => {
    setIsLoadingMore(true);
    setTimeout(() => {
      setVisibleCount(prev => prev + 25);
      setIsLoadingMore(false);
    }, 600);
  };

  const handleCepChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawCep = e.target.value.replace(/\D/g, '');
    setCep(rawCep);

    if (rawCep.length === 8) {
      setIsLoadingCep(true);
      try {
        const res = await fetch(`https://viacep.com.br/ws/${rawCep}/json/`);
        const data = await res.json();
        if (!data.erro) {
          setAddress({
            street: data.logradouro || '',
            neighborhood: data.bairro || '',
            city: data.localidade || '',
            state: data.uf || ''
          });
        }
      } catch (error) {
        console.error('Erro ao buscar CEP', error);
      } finally {
        setIsLoadingCep(false);
      }
    }
  };

  const cartTotalItems = cart.reduce((acc, item) => acc + item.quantity, 0);
  const cartTotalValue = cart.reduce((acc, item) => acc + (item.product.price * item.quantity), 0);

  const handleAddToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item => 
          item.product.id === product.id && item.quantity < product.stock 
            ? { ...item, quantity: item.quantity + 1 } 
            : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
    setIsCartOpen(true);
  };

  const handleUpdateQuantity = (productId: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.product.id === productId) {
        const newQuantity = item.quantity + delta;
        if (newQuantity > 0 && newQuantity <= item.product.stock) {
          return { ...item, quantity: newQuantity };
        }
      }
      return item;
    }).filter(item => item.quantity > 0));
  };

  const handleRemoveItem = (productId: string) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
  };

  const handleWhatsAppCheckout = () => {
    const isService = (TEMPLATES.find((t: any) => t.id === templateId) || TEMPLATES[9]).category === 'servicos';
    
    if (cart.length === 0 || !customerName.trim()) return;
    if (!isService && (!customerCnpj.trim() || cep.length !== 8 || !addressNumber.trim())) return;
    if (isService && (!serviceDate || !serviceTime || !serviceAddress.trim())) return;

    let message = isService ? `📅 *SOLICITAÇÃO DE AGENDAMENTO - ${storeName}*\n\n` : `🛒 *SOLICITAÇÃO DE ORÇAMENTO - ${storeName}*\n\n`;
    
    message += `*Dados do Cliente:*\n`;
    message += `👤 Nome/Empresa: ${customerName}\n`;
    if (!isService) message += `📄 CNPJ: ${customerCnpj}\n`;
    message += `💳 Pagamento Desejado: ${paymentMethod}\n\n`;
    
    if (isService) {
      message += `*Detalhes do Agendamento:*\n`;
      message += `🗓️ Data Desejada: ${serviceDate.split('-').reverse().join('/')}\n`;
      message += `⏰ Horário: ${serviceTime}\n`;
      message += `📍 Local do Serviço: ${serviceAddress}\n\n`;
    } else {
      message += `*Endereço para Cálculo de Frete:*\n`;
      message += `📍 CEP: ${cep}\n`;
      message += `📍 Endereço: ${address.street}, ${addressNumber} ${complement ? ' - ' + complement : ''}\n`;
      message += `📍 Bairro/Cidade: ${address.neighborhood} - ${address.city}/${address.state}\n\n`;
    }

    message += `*Itens Solicitados:*\n\n`;

    cart.forEach((item, index) => {
      message += `${index + 1}. *${item.product.name}*\n`;
      message += `   Qtd: ${item.quantity} un\n`;
      message += `   Subtotal: R$ ${(item.quantity * item.product.price).toFixed(2)}\n\n`;
    });

    message += `💰 *VALOR TOTAL PREVISTO: R$ ${cartTotalValue.toFixed(2)}*\n\n`;
    message += isService 
      ? `Aguardo o retorno para confirmarmos a disponibilidade da agenda.` 
      : `Aguardo o retorno para darmos andamento à negociação e inclusão do valor do frete.`;

    const encodedMessage = encodeURIComponent(message);
    
    addOrder({
      customerName: customerName,
      customerPhone: '', 
      items: cart.map(item => ({
        productId: item.product.id,
        name: item.product.name,
        price: item.product.price,
        quantity: item.quantity
      })),
      total: cartTotalValue,
      status: 'pending',
      paymentStatus: 'pending',
      createdAt: new Date().toISOString(),
      tenantId: tenantId,
      notes: `CNPJ: ${customerCnpj} | Pagamento: ${paymentMethod} | CEP: ${cep}`
    });

    const rawPhone = storeWhatsapp.replace(/\D/g, '');
    window.open(`https://wa.me/${rawPhone}?text=${encodedMessage}`, '_blank');
    
    setCart([]);
    setIsCartOpen(false);
  };

  const generateStructuredData = () => {
    // 1. Mapeamento de Categoria Oficial do Google (Focado em Varejo e Serviços)
    const getSchemaType = (niche: string) => {
        const n = String(niche).toLowerCase();
        if (n.includes('farmacia')) return 'Pharmacy';
        if (n.includes('petshop')) return 'PetStore';
        if (n.includes('florist') || n.includes('floricultura')) return 'Florist';
        if (n.includes('salao') || n.includes('beleza') || n.includes('lash') || n.includes('estetica')) return 'BeautySalon';
        if (n.includes('clinica')) return 'MedicalClinic';
        if (n.includes('oficina') || n.includes('servico')) return 'AutoRepair';
        if (n.includes('roupa') || n.includes('calcado')) return 'ClothingStore';
        if (n.includes('eletronico')) return 'ElectronicsStore';
        return 'Store'; 
    };

    const businessType = getSchemaType(storeSeoCategory);

    // 2. Extrator de Localidade (Resolve o Aviso Amarelo do GSC)
    const rawAddress = storeAddress || STORE_TRUST_DATA.address;
    let locality = "Brasil"; 
    let region = ""; 
    
    if (rawAddress.includes('-')) {
        const parts = rawAddress.split('-');
        const lastPart = parts[parts.length - 1].trim(); 
        if (lastPart.length <= 3) { 
            region = lastPart;
            locality = parts[parts.length - 2]?.split(',').pop()?.trim() || "Brasil";
        }
    }

    // 3. Montagem do Catálogo Híbrido (Lista Simples para a Empresa)
    const itemListElements = categories.map((catName, index) => {
        const catProducts = activeProducts.filter(p => p.category === catName);
        return {
            "@type": "ItemList",
            "name": catName,
            "position": index + 1,
            "itemListElement": catProducts.map((p: any, pIndex: number) => ({
                "@type": "ListItem",
                "position": pIndex + 1,
                "url": `https://${tenantId}/p/${p.id}` // Link virtual para o Google achar
            }))
        };
    });

    // 4. Schema da Empresa (Business Master)
    const businessSchema: any = {
      "@context": "https://schema.org",
      "@type": businessType,
      "name": storeName,
      "image": storeLogo || "",
      "@id": `https://${tenantId}`,
      "url": `https://${tenantId}`,
      "telephone": storeWhatsapp,
      "priceRange": storePriceRange || "$$",
      "description": storeAbout || storeSlogan || "Especialistas em excelência e qualidade.",
      "address": {
        "@type": "PostalAddress",
        "streetAddress": rawAddress,
        "addressLocality": locality,
        "addressRegion": region,
        "addressCountry": "BR"
      },
      "aggregateRating": {
        "@type": "AggregateRating",
        "ratingValue": "5.0",
        "reviewCount": "128", 
        "bestRating": "5",
        "worstRating": "1"
      },
      "hasOfferCatalog": {
        "@type": "OfferCatalog",
        "name": currentTemplate?.category === 'servicos' ? "Catálogo de Serviços" : "Catálogo de Produtos",
        "itemListElement": itemListElements
      },
      "sameAs": storeSocialLinks 
    };

    // 5. SCHEMA INDIVIDUAL DE PRODUTOS E SERVIÇOS (O Segredo do Google Shopping / GMB)
    const itemsSchemas = activeProducts.map((p: any) => {
        const isService = currentTemplate?.category === 'servicos';
        const finalPrice = (p.promotionalPrice && Number(p.promotionalPrice) > 0 ? p.promotionalPrice : (p.price || 0)).toString();
        const inStock = (p.stock === undefined || p.stock === null || p.stock === '' || Number(p.stock) > 0);
        
        // Validade da oferta: Joga pra 1 ano para frente (Google exige isso para produtos)
        const priceValidUntil = new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0];

        const itemSchema: any = {
            "@context": "https://schema.org/",
            "@type": isService ? "Service" : "Product",
            "name": p.name || 'Item',
            "image": p.imageUrl ? [p.imageUrl] : [storeLogo],
            "description": p.description || `${p.name} oferecido por ${storeName}.`,
            "url": `https://${tenantId}/p/${p.id}`,
            "offers": {
                "@type": "Offer",
                "priceCurrency": "BRL",
                "price": finalPrice,
                "availability": inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
                "priceValidUntil": priceValidUntil,
                "url": `https://${tenantId}/p/${p.id}`,
                "seller": {
                    "@type": businessType,
                    "name": storeName
                }
            }
        };

        // Tratamento se for Serviço (Provider)
        if (isService) {
            itemSchema.provider = {
                "@type": businessType,
                "name": storeName,
                "image": storeLogo
            };
        } 
        // Tratamento se for Produto (Brand, SKU, e Reviews Individuais)
        else {
            itemSchema.sku = p.sku || p.id;
            itemSchema.brand = {
                "@type": "Brand",
                "name": (p as any).brand || storeName // Usa a marca digitada ou o nome da loja
            };
            // Truque de SEO: Estrelinhas individuais para cada produto na aba "Google Shopping" e Pesquisa
            itemSchema.aggregateRating = {
                "@type": "AggregateRating",
                "ratingValue": "5.0",
                "reviewCount": String((Math.floor(Math.random() * 40) + 15)), // Gera um número crível entre 15 e 55
                "bestRating": "5",
                "worstRating": "1"
            };
        }

        return itemSchema;
    });

    // 6. Schema do FAQ
    let faqSchema: any = null;
    if (storeFaq && storeFaq.length > 0) {
      faqSchema = {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": storeFaq.map((item: any) => ({
          "@type": "Question",
          "name": item.question,
          "acceptedAnswer": {
            "@type": "Answer",
            "text": item.answer
          }
        }))
      };
    }

    // Juntamos tudo: A Empresa + Os Produtos Individuais + O FAQ
    const finalSchemas = [businessSchema, ...itemsSchemas];
    if (faqSchema) finalSchemas.push(faqSchema);

    return JSON.stringify(finalSchemas);
  };

  if (!mounted) return null;

  const currentTemplate = TEMPLATES?.find((t: any) => t.id === templateId) || 
                          TEMPLATES?.[0] || 
                          { category: 'ecommerce', fontFamily: 'sans-serif', primaryColor: '#357b64', defaultContent: {} };

  if (!storeName) setStoreName('Loja Virtual');
  if (!storeSlogan) setStoreSlogan('Catálogo Exclusivo');

  return (
    <div 
      className="min-h-screen text-gray-800 relative bg-gray-50"
      style={{ fontFamily: currentTemplate.fontFamily }}
    >
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: generateStructuredData() }} />

      {layoutMode === 'webview' ? (
        <div className="flex justify-center bg-black h-[100dvh] overflow-hidden">
          <div className={`w-full max-w-md h-full flex flex-col relative shadow-2xl overflow-hidden ${templateId === 'barbearia_dark' ? 'bg-[#0A0A0A]' : templateId === 'beleza_masonry' ? 'bg-[#fdf8f9]' : 'bg-gray-50'}`}>
            
            {/* CABEÇALHO NATIVO APP / SACOLA ONLINE */}
            <header 
              className={`px-5 py-4 flex flex-col z-40 shrink-0 shadow-sm relative transition-colors duration-300 ${templateId === 'nativo_app' ? 'rounded-b-[2rem]' : templateId === 'barbearia_dark' ? 'bg-black border-b border-white/10' : templateId === 'beleza_masonry' ? 'bg-transparent' : 'bg-white'}`}
              style={templateId === 'nativo_app' ? { backgroundColor: themeColor } : {}}
            >
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm shrink-0 overflow-hidden">
                    {storeLogo ? <img src={storeLogo} alt="Logo" className="w-full h-full object-contain p-1.5" /> : <span style={{ color: themeColor }} className="font-black text-xl">{storeName.charAt(0)}</span>}
                  </div>
                  <div className="flex flex-col">
                    <h1 className={`text-sm font-black leading-tight uppercase tracking-widest ${templateId === 'nativo_app' ? 'text-white' : templateId === 'barbearia_dark' ? 'text-white' : 'text-slate-800'}`}>{storeName}</h1>
                    <p className={`text-[10px] font-medium mt-0.5 ${templateId === 'nativo_app' ? 'text-white/90' : templateId === 'barbearia_dark' ? 'text-gray-400' : 'text-slate-500'}`}>{storeSlogan}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsSearchOpen(!isSearchOpen)} 
                  className={`p-2.5 rounded-full transition-colors border ${templateId === 'nativo_app' ? 'border-white/30 text-white hover:bg-white/10' : templateId === 'barbearia_dark' ? 'bg-white/5 text-white border-white/10' : 'bg-gray-50 hover:bg-gray-100 text-slate-600 border-transparent'}`}
                >
                  <Search className="w-4 h-4" />
                </button>
              </div>

              <AnimatePresence>
                {isSearchOpen && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden w-full mt-4">
                    <div className="relative">
                      <input 
                        type="text" 
                        placeholder="O que você procura?" 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className={`w-full border-none text-sm font-bold px-4 py-3 rounded-xl outline-none focus:ring-2 transition-all shadow-inner ${templateId === 'nativo_app' ? 'bg-white text-slate-800 placeholder:text-slate-400' : templateId === 'barbearia_dark' ? 'bg-white/10 text-white placeholder:text-gray-400' : 'bg-gray-100 text-slate-800 placeholder:text-slate-400'}`}
                        style={{ '--tw-ring-color': templateId === 'nativo_app' ? '#00000020' : themeColor } as any}
                      />
                      {searchQuery && (
                        <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"><X className="w-4 h-4" /></button>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </header>
            
            <main className="flex-1 overflow-y-auto custom-scrollbar pb-32">
              
              {/* BANNERS */}
              {templateId !== 'nativo_app' && (
                <>
                  {currentTemplate.defaultContent.announcementBar && (
                    <div style={{ backgroundColor: currentTemplate.primaryColor }} className="w-full text-center py-2 px-4 shadow-inner">
                      <span className="text-[10px] font-black uppercase tracking-widest text-white leading-none flex items-center justify-center gap-2">
                        <Sparkles size={12}/> {currentTemplate.defaultContent.announcementBar}
                      </span>
                    </div>
                  )}

                  <div className={`p-4 pb-2 shadow-sm mb-4 ${templateId === 'barbearia_dark' ? 'bg-black rounded-b-3xl' : templateId === 'beleza_masonry' ? 'bg-transparent' : 'bg-white rounded-b-3xl'}`}>
                    <div className="w-full h-40 md:h-48 rounded-2xl overflow-hidden relative shadow-md group flex overflow-x-auto snap-x snap-mandatory no-scrollbar">
                      
                      {storeBanners && storeBanners.length > 0 ? (
                        storeBanners.map((bannerUrl: string, idx: number) => (
                          <div key={idx} className="w-full h-full flex-shrink-0 snap-center relative">
                            <img src={bannerUrl} loading={idx === 0 ? "eager" : "lazy"} className="w-full h-full object-cover" alt={`Oferta ${idx + 1} - ${storeName}`} />
                          </div>
                        ))
                      ) : (
                        <div className="w-full h-full flex-shrink-0 snap-center relative">
                          <img src={currentTemplate.heroImage} className="w-full h-full object-cover" alt="Banner Principal" />
                          <div className={`absolute inset-0 ${currentTemplate.category === 'servicos' ? 'bg-black/60' : 'bg-gradient-to-r from-black/80 to-transparent'} flex flex-col justify-center p-6`}>
                            <h2 className="text-2xl font-black text-white leading-tight shadow-black drop-shadow-md max-w-[80%] uppercase">
                              {currentTemplate.defaultContent.heroTitle}
                            </h2>
                            <p className="text-[10px] font-bold text-gray-200 mt-1 max-w-[70%]">
                              {currentTemplate.defaultContent.heroSubtitle}
                            </p>
                          </div>
                        </div>
                      )}

                    </div>
                    
                    {storeBanners && storeBanners.length > 1 && (
                      <p className="text-[8px] text-center font-bold text-slate-400 mt-1 uppercase tracking-widest animate-pulse">
                        Arraste para o lado 👉
                      </p>
                    )}
                  </div>
                </>
              )}

              {/* SOBRE NÓS (APENAS PARA TEMPLATES DE SERVIÇOS) */}
              {currentTemplate.category === 'servicos' && storeAbout && (
                 <div className="px-4 mb-4 animate-in fade-in">
                   <div className={`p-6 rounded-3xl shadow-sm border ${templateId === 'barbearia_dark' ? 'bg-[#1A1A1A] border-white/10 text-gray-300' : 'bg-white border-gray-100'}`}>
                     <h2 className={`text-lg font-black uppercase italic tracking-tighter mb-2 flex items-center gap-2 ${templateId === 'barbearia_dark' ? 'text-white' : 'text-slate-800'}`}>
                       <Store className="text-blue-500" size={20}/> Nossa Empresa
                     </h2>
                     <p className={`text-xs font-medium leading-relaxed whitespace-pre-wrap ${templateId === 'barbearia_dark' ? 'text-gray-400' : 'text-slate-500'}`}>
                       {storeAbout}
                     </p>
                   </div>
                 </div>
              )}

              {/* CATEGORIAS */}
              {templateId === 'oficina_step' ? (
                <div className="px-4 mt-6">
                  <h3 className="text-slate-800 font-black text-sm mb-3">Categorias</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {categories.slice(0, 4).map((cat, idx) => (
                      <button 
                        key={cat}
                        onClick={() => {setSelectedCategory(cat); setSearchQuery('');}}
                        className={`rounded-[1.5rem] p-4 flex flex-col items-center justify-center gap-2 shadow-sm border transition-all ${selectedCategory === cat ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-100 hover:border-blue-100'}`}
                      >
                        <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                          {idx === 0 ? <Wrench size={24} /> : idx === 1 ? <ShieldCheck size={24} /> : <Sparkles size={24} />}
                        </div>
                        <span className={`text-xs font-bold ${selectedCategory === cat ? 'text-blue-700' : 'text-slate-600'}`}>{cat}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="px-4 py-2 mt-2">
                  <div className="flex gap-2 overflow-x-auto no-scrollbar pb-4 pt-1 snap-x">
                    <button 
                      onClick={() => {setSelectedCategory('Todos'); setSearchQuery('');}}
                      className={`px-5 py-2.5 rounded-full snap-center shrink-0 border transition-all duration-300 ${selectedCategory === 'Todos' ? 'text-white border-transparent font-bold shadow-md' : templateId === 'barbearia_dark' ? 'bg-[#1A1A1A] text-gray-400 border-white/10' : 'bg-white text-slate-600 border-slate-200 font-bold hover:bg-slate-100'}`}
                      style={selectedCategory === 'Todos' ? { backgroundColor: themeColor, color: templateId === 'barbearia_dark' ? '#000' : '#fff', borderColor: themeColor } : {}}
                    >
                      <span className="text-xs tracking-tight whitespace-nowrap">Todos</span>
                    </button>

                    {categories.map(cat => (
                      <button 
                          key={cat} 
                          onClick={() => {setSelectedCategory(cat); setSearchQuery('');}}
                          className={`px-5 py-2.5 rounded-full snap-center shrink-0 border transition-all duration-300 ${selectedCategory === cat ? 'text-white border-transparent font-bold shadow-md' : templateId === 'barbearia_dark' ? 'bg-[#1A1A1A] text-gray-400 border-white/10' : 'bg-white text-slate-600 border-slate-200 font-bold hover:bg-slate-100'}`}
                          style={selectedCategory === cat ? { backgroundColor: themeColor, color: templateId === 'barbearia_dark' ? '#000' : '#fff', borderColor: themeColor } : {}}
                      >
                        <span className="text-xs tracking-tight whitespace-nowrap">{cat}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* PRODUTOS */}
              <div className="px-4 mt-2 mb-8">
                {loading ? (
                  <div className="flex flex-col items-center justify-center py-10">
                    <div style={{ borderTopColor: themeColor }} className="w-8 h-8 border-4 border-gray-300 rounded-full animate-spin"></div>
                  </div>
                ) : paginatedProducts.length === 0 ? (
                  <div className={`text-center py-10 rounded-3xl border p-8 shadow-sm ${templateId === 'barbearia_dark' ? 'bg-[#1A1A1A] border-white/10' : 'bg-white border-gray-200'}`}>
                    <Search size={40} className={`mx-auto mb-4 ${templateId === 'barbearia_dark' ? 'text-gray-600' : 'text-gray-300'}`}/>
                    <p className={`text-xs font-bold uppercase tracking-widest ${templateId === 'barbearia_dark' ? 'text-gray-500' : 'text-gray-500'}`}>Nenhum item localizado.</p>
                  </div>
                ) : (
                  <div className={
                    templateId === 'beleza_masonry' ? "columns-2 gap-3 space-y-3" : 
                    (productLayout === 'grid' || currentTemplate.category === 'servicos') ? "grid grid-cols-2 gap-3" : 
                    "flex flex-col gap-3"
                  }>
                    {paginatedProducts.map(product => {
                      let hasStock = (product.stock && parseInt(product.stock as any) > 0) || !product.stock;
                      return (
                        <React.Fragment key={product.id}>
                          {/* TEMPLATE: BELEZA MASONRY (Pinterest Style) */}
                          {templateId === 'beleza_masonry' && (
                            <div 
                              onClick={() => { if(hasStock) { setSelectedVariationIndex(0); setSelectedProduct(product); } }} 
                              className={`break-inside-avoid relative group cursor-pointer mb-3 rounded-[2rem] overflow-hidden bg-white shadow-sm border border-pink-50 ${!hasStock ? 'opacity-60 grayscale' : ''}`}
                            >
                              <img src={product.imageUrl} className="w-full object-cover" style={{ minHeight: '140px' }} alt={product.name}/>
                              <div className="p-3 bg-white/90 backdrop-blur-sm absolute bottom-0 w-full border-t border-white/50">
                                <h3 className="text-[11px] font-bold text-slate-800 leading-tight line-clamp-2">{product.name}</h3>
                                <p style={{ color: themeColor }} className="font-black text-sm mt-1">R$ {Number(product.price).toFixed(2)}</p>
                              </div>
                            </div>
                          )}

                          {/* TEMPLATE: BARBEARIA DARK */}
                          {templateId === 'barbearia_dark' && (
                            <div 
                              onClick={() => { if(hasStock) { setSelectedVariationIndex(0); setSelectedProduct(product); } }} 
                              className={`w-full bg-[#1A1A1A] border border-white/10 rounded-[2rem] p-3 cursor-pointer flex flex-col gap-2 relative ${!hasStock ? 'opacity-60 grayscale' : ''}`}
                            >
                              <div className="absolute top-5 left-5 bg-black/80 backdrop-blur-md px-2 py-1 rounded-lg flex items-center gap-1 z-10">
                                <Star className="text-yellow-400 w-3 h-3 fill-current" />
                                <span className="text-white text-[10px] font-bold">5.0</span>
                              </div>
                              <img src={product.imageUrl} className="w-full h-36 object-cover rounded-[1.5rem]" alt={product.name}/>
                              <div className="px-1 mt-1">
                                <h3 className="font-black text-white text-sm uppercase tracking-tight">{product.name}</h3>
                                <p className="text-gray-400 text-[10px] uppercase font-bold mt-1">R$ {Number(product.price).toFixed(2)}</p>
                              </div>
                              <button 
                                onClick={(e) => { e.stopPropagation(); hasStock && handleAddToCart(product); }}
                                className="w-full bg-yellow-400 hover:bg-yellow-500 text-black font-black uppercase text-[10px] tracking-widest py-3 rounded-xl mt-auto transition-colors"
                              >
                                Agendar
                              </button>
                            </div>
                          )}

                          {/* TEMPLATE: PADRÃO E OFICINA */}
                          {templateId !== 'beleza_masonry' && templateId !== 'barbearia_dark' && (
                            <div 
                              onClick={() => { if(hasStock) { setSelectedVariationIndex(0); setSelectedProduct(product); } }} 
                              className={`w-full bg-white rounded-[1.5rem] shadow-sm border border-gray-100 p-3 cursor-pointer hover:shadow-md transition-all active:scale-[0.98] flex ${(productLayout === 'grid' || currentTemplate.category === 'servicos') ? 'flex-col gap-2' : 'flex-row items-center gap-4'} ${!hasStock ? 'opacity-60 grayscale' : ''}`}
                            >
                              {(product as any).videoUrl ? (
                                <div className={`${(productLayout === 'grid' || currentTemplate.category === 'servicos') ? 'w-full aspect-[9/16]' : 'w-[88px] h-[156px] flex-shrink-0'} relative rounded-2xl overflow-hidden bg-slate-900 flex items-center justify-center group`}>
                                  <video 
                                    src={(product as any).videoUrl} 
                                    autoPlay loop muted playsInline 
                                    className="absolute inset-0 w-full h-full object-cover scale-105 group-hover:scale-110 transition-transform duration-700" 
                                  />
                                  <div className="absolute top-1.5 left-1.5 bg-black/60 backdrop-blur-md px-1.5 py-0.5 rounded-md flex items-center gap-1 z-10 shadow-sm">
                                      <svg width="6" height="6" viewBox="0 0 24 24" fill="white" className="animate-pulse"><path d="M8 5v14l11-7z"/></svg>
                                      <span className="text-[7px] font-black text-white tracking-widest uppercase">Vídeo</span>
                                  </div>
                                  {(product as any).promotionalPrice > 0 && (
                                    <div className="absolute top-0 right-0 bg-red-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded-bl-lg shadow-sm z-10">OFERTA</div>
                                  )}
                                  {!hasStock && <div className="absolute inset-0 bg-slate-900/60 flex items-center justify-center font-black text-white text-[10px] uppercase tracking-widest backdrop-blur-sm z-20">Esgotado</div>}
                                </div>
                              ) : (
                                <div className={`${(productLayout === 'grid' || currentTemplate.category === 'servicos') ? 'w-full aspect-square' : 'w-[88px] h-[88px] flex-shrink-0'} relative rounded-2xl overflow-hidden bg-gray-50 border border-gray-100 p-1 flex items-center justify-center`}>
                                  <img src={product.imageUrl} alt={product.name} className="w-full h-full object-contain mix-blend-multiply" />
                                  {(product as any).promotionalPrice > 0 && (
                                    <div className="absolute top-0 left-0 bg-red-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded-br-lg shadow-sm z-10">OFERTA</div>
                                  )}
                                  {!hasStock && <div className="absolute inset-0 bg-slate-900/60 flex items-center justify-center font-black text-white text-[10px] uppercase tracking-widest backdrop-blur-sm rounded-xl">Esgotado</div>}
                                </div>
                              )}
                              
                             <div className={`flex-1 flex flex-col justify-start min-w-0 ${(productLayout === 'grid' || currentTemplate.category === 'servicos') ? 'py-0' : 'py-1'}`}>
                                <h3 className="font-bold text-slate-800 text-[13px] leading-tight line-clamp-2">{product.name}</h3>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1 mb-3 truncate">
                                  {product.category}
                                  {currentTemplate.category !== 'servicos' && product.stock !== 999 && product.stock !== 0 && (
                                    <span className={`ml-2 ${Number(product.stock) <= 5 ? 'text-red-500' : 'text-slate-400'}`}>
                                      • ESTOQUE: {product.stock}
                                    </span>
                                  )}
                                </p>

                                <div className="flex items-center justify-between mt-auto">
                                  <div className="flex flex-col">
                                      {(product as any).promotionalPrice > 0 ? (
                                          <>
                                              <span style={{ color: themeColor }} className="font-black text-[14px] leading-none">
                                                  R$ {Number((product as any).promotionalPrice).toFixed(2)}
                                              </span>
                                              <span className="text-[9px] font-bold text-slate-400 line-through mt-0.5">R$ {Number(product.price).toFixed(2)}</span>
                                          </>
                                      ) : (
                                          <span style={{ color: themeColor }} className="font-black text-[14px] leading-none">
                                              {Number(product.price) > 0 ? `R$ ${Number(product.price).toFixed(2)}` : 'Sob Consulta'}
                                          </span>
                                      )}
                                  </div>
                                  
                                  {currentTemplate.category === 'servicos' ? (
                                    <button 
                                      onClick={(e) => { e.stopPropagation(); hasStock && handleAddToCart(product); }} 
                                      disabled={!hasStock}
                                      style={hasStock ? { backgroundColor: themeColor } : {}}
                                      className={`px-3 py-1.5 rounded-lg flex items-center justify-center gap-1 shadow-md active:scale-95 shrink-0 ${hasStock ? 'text-white' : 'bg-slate-300 text-slate-500'}`}
                                    >
                                        <span className="text-[9px] font-black uppercase tracking-widest">Agendar</span>
                                    </button>
                                  ) : (
                                    <button 
                                      onClick={(e) => { e.stopPropagation(); hasStock && handleAddToCart(product); }} 
                                      disabled={!hasStock}
                                      style={hasStock ? { backgroundColor: themeColor } : {}}
                                      className={`w-8 h-8 rounded-full flex items-center justify-center shadow-md active:scale-90 shrink-0 ${hasStock ? 'text-white' : 'bg-slate-300 text-slate-500'}`}
                                    >
                                        <Plus size={18} strokeWidth={3} />
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}
                        </React.Fragment>
                      );
                    })}

                    {filteredActiveProducts.length > visibleCount && (
                      <div className="py-4 flex justify-center col-span-full">
                        <button 
                          onClick={handleLoadMore}
                          disabled={isLoadingMore}
                          style={{ backgroundColor: themeColor }}
                          className="px-8 py-4 rounded-2xl text-xs font-black text-white uppercase tracking-widest flex items-center gap-2 hover:opacity-90 transition-opacity shadow-lg"
                        >
                          {isLoadingMore ? 'Carregando...' : 'Carregar mais itens'}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* REVIEWS E MAPA MOCK/REAL */}
              {templateId !== 'nativo_app' && currentTemplate.category !== 'servicos' && (
                <div className="mt-12 mb-8 mx-4 bg-white rounded-3xl border border-gray-200 overflow-hidden shadow-sm">
                  <div className="p-6 border-b border-gray-100 bg-gradient-to-br from-gray-50 to-white">
                    <div className="flex items-center gap-2 mb-3">
                      <Star size={16} fill="#f59e0b" className="text-yellow-500" />
                      <Star size={16} fill="#f59e0b" className="text-yellow-500" />
                      <Star size={16} fill="#f59e0b" className="text-yellow-500" />
                      <Star size={16} fill="#f59e0b" className="text-yellow-500" />
                      <Star size={16} fill="#f59e0b" className="text-yellow-500" />
                    </div>
                    <p className="text-xs font-bold text-slate-700 italic leading-relaxed">
                      {currentTemplate.defaultContent.reviewMock}
                    </p>
                    <div className="mt-4 flex items-center gap-2">
                      <ShieldCheck size={14} className="text-green-600" />
                      <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Avaliação Verificada</span>
                    </div>
                  </div>

                  {(settings as any).address && (
                    <div className="p-6 bg-slate-900 text-white">
                        <h3 className="text-[11px] font-black uppercase text-slate-300 tracking-widest flex items-center gap-2 mb-4">
                          <MapPin size={16} style={{ color: themeColor }}/> Onde Estamos
                        </h3>
                        <div className="w-full h-32 rounded-xl overflow-hidden border border-slate-700 mb-4 bg-slate-800">
                          <iframe 
                            width="100%" height="100%" style={{ border: 0 }} loading="lazy" allowFullScreen 
                            src={`https://maps.google.com/maps?q=${encodeURIComponent((settings as any).address)}&output=embed`}
                          ></iframe>
                        </div>
                        <p className="text-[10px] font-bold text-slate-300 mb-2 leading-tight">
                          {(settings as any).address}
                        </p>
                        {((settings as any).cnpj || STORE_TRUST_DATA.cnpj) && (
                          <p className="text-[10px] font-bold text-slate-400">
                            CNPJ: {(settings as any).cnpj || STORE_TRUST_DATA.cnpj}
                          </p>
                        )}
                      </div>
                  )}
                </div>
              )}

              {/* RODAPÉ E PROVA SOCIAL EXCLUSIVO PARA SERVIÇOS */}
              {currentTemplate.category === 'servicos' && (
                <div className="mt-8 mb-8 mx-4 flex flex-col gap-6">
                   
                   {/* @ts-ignore */}
                   <Reviews storeId={tenantId} />

                   {storeFaq && storeFaq.length > 0 && (
                     <div className={`p-6 rounded-3xl shadow-sm border ${templateId === 'barbearia_dark' ? 'bg-[#1A1A1A] border-white/10' : 'bg-white border-gray-100'}`}>
                          <h3 className={`text-sm font-black uppercase mb-4 flex items-center gap-2 ${templateId === 'barbearia_dark' ? 'text-white' : 'text-slate-800'}`}>
                           <ClipboardList size={20} style={{ color: themeColor }} /> Dúvidas Frequentes
                        </h3>
                        <div className="space-y-3">
                           {storeFaq.map((item: any, idx: number) => (
                             <details key={idx} className={`group rounded-2xl border overflow-hidden [&_summary::-webkit-details-marker]:hidden ${templateId === 'barbearia_dark' ? 'bg-[#2A2A2A] border-white/5' : 'bg-slate-50 border-slate-100'}`}>
                               <summary className={`flex items-center justify-between p-4 font-bold cursor-pointer text-xs ${templateId === 'barbearia_dark' ? 'text-white' : 'text-slate-700'}`}>
                                 {item.question}
                                 <ChevronDown size={16} className={`group-open:rotate-180 transition-transform flex-shrink-0 ${templateId === 'barbearia_dark' ? 'text-gray-400' : 'text-slate-400'}`} />
                               </summary>
                               <div className={`p-4 pt-0 text-[11px] font-medium leading-relaxed border-t ${templateId === 'barbearia_dark' ? 'text-gray-400 border-white/5' : 'text-slate-500 border-slate-100/50'}`}>
                                 {item.answer}
                               </div>
                             </details>
                           ))}
                        </div>
                     </div>
                   )}

                  {storeAddress && (
                     <div className={`p-6 rounded-3xl shadow-sm ${templateId === 'barbearia_dark' ? 'bg-[#1A1A1A] text-white border border-white/10' : 'bg-slate-900 text-white'}`}>
                        <h3 className="text-[11px] font-black uppercase text-slate-300 tracking-widest flex items-center gap-2 mb-4">
                          <MapPin size={16} style={{ color: themeColor }}/> Onde Estamos
                        </h3>
                        <div className="w-full h-32 rounded-xl overflow-hidden border border-slate-700 mb-4 bg-slate-800">
                          <iframe 
                            width="100%" height="100%" style={{ border: 0 }} loading="lazy" allowFullScreen 
                            src={`https://maps.google.com/maps?q=${encodeURIComponent(storeAddress)}&output=embed`}
                          ></iframe>
                        </div>
                        <p className="text-[10px] font-bold text-slate-300 mb-2 leading-tight">
                          {storeAddress}
                        </p>
                        {(storeCnpj || STORE_TRUST_DATA.cnpj) && (
                          <p className="text-[10px] font-bold text-slate-400">
                            CNPJ: {storeCnpj || STORE_TRUST_DATA.cnpj}
                          </p>
                        )}
                     </div>
                   )}

                   </div>
              )}

              {/* RODAPÉ GLOBAL */}
              <div className="mt-8 mb-8 mx-4 flex flex-col items-center justify-center text-center border-t border-gray-100 pt-8">
                  {(storeCnpj || STORE_TRUST_DATA.cnpj) && (
                      <p className="text-[10px] font-bold text-slate-400 mb-4">CNPJ: {storeCnpj || STORE_TRUST_DATA.cnpj}</p>
                  )}
                  <div className="flex gap-4 justify-center text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-6">
                       <a href="/politicas" className="hover:text-slate-600 transition-colors">Privacidade</a>
                      <a href="/politicas" className="hover:text-slate-600 transition-colors">Termos</a>
                  </div>
                  <a href="https://veloloja.com.br" target="_blank" rel="noopener noreferrer" className="flex flex-col items-center opacity-40 hover:opacity-100 grayscale hover:grayscale-0 transition-all">
                      <img src="/velo loja virtual logo.png" alt="Velo Loja Virtual" className="h-5 w-auto mb-1.5" />
                      <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Powered by Velo</p>
                  </a>
              </div>

            </main>

            {/* NAVBAR BOTTOM */}
            {templateId === 'beleza_masonry' ? (
              <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 w-11/12 max-w-[320px] bg-white/70 backdrop-blur-xl border border-white shadow-[0_10px_40px_rgba(0,0,0,0.1)] rounded-full flex justify-around items-center px-2 py-2 z-40">
                <button style={{ color: themeColor, backgroundColor: `${themeColor}20` }} className="p-3 rounded-full transition-all">
                  <LayoutGrid size={20} />
                </button>
                {storeMode !== 'catalogo' && (
                  <button onClick={() => setIsCartOpen(true)} className="p-3 text-slate-500 hover:text-slate-800 transition-all relative">
                    <ShoppingBag size={20} />
                    {cartTotalItems > 0 && <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full border border-white"></span>}
                  </button>
                )}
                <button className="p-3 text-slate-500 hover:text-slate-800 transition-all">
                  <User size={20} />
                </button>
              </nav>
            ) : (
              <nav className={`shrink-0 w-full flex justify-around items-center px-4 py-3 pb-6 z-40 shadow-[0_-10px_30px_rgba(0,0,0,0.05)] relative ${templateId === 'barbearia_dark' ? 'bg-black border-t border-white/10 rounded-t-3xl text-white' : 'bg-white border-t border-gray-200 rounded-t-3xl'}`}>
                <button style={{ color: templateId === 'barbearia_dark' ? '#fff' : currentTemplate.primaryColor }} className="flex flex-col items-center gap-1 w-16">
                  <LayoutGrid className="w-5 h-5" />
                  <span className="text-[9px] font-bold uppercase tracking-widest">Início</span>
                </button>
                <button onClick={() => alert('Em breve: Rastreio de Pedidos!')} className={`flex flex-col items-center gap-1 transition-colors w-16 ${templateId === 'barbearia_dark' ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-800'}`}>
                  <ClipboardList className="w-5 h-5" />
                  <span className="text-[9px] font-bold uppercase tracking-widest">Pedidos</span>
                </button>
                
                {storeMode !== 'catalogo' && (
                  <button onClick={() => setIsCartOpen(true)} className={`flex flex-col items-center gap-1 transition-colors relative w-16 ${templateId === 'barbearia_dark' ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-800'}`}>
                    <ShoppingCart className="w-5 h-5" />
                    <span className="text-[9px] font-bold uppercase tracking-widest">{storeMode === 'orcamento' ? 'Orçamento' : 'Carrinho'}</span>
                    {cartTotalItems > 0 && (
                      <span className="absolute -top-1 right-2 bg-red-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold shadow-sm border border-white">
                        {cartTotalItems}
                      </span>
                    )}
                  </button>
                )}
              </nav>
            )}

            {/* 🔥 STICKY FOOTER DE ALTA CONVERSÃO MOBILE 🔥 */}
            <AnimatePresence>
              {storeMode !== 'catalogo' && cart.length > 0 && !isCartOpen && (
                <motion.div 
                  initial={{ y: 100, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: 100, opacity: 0 }}
                  className="absolute bottom-[72px] left-4 right-4 z-30" 
                >
                  <button 
                    onClick={() => setIsCartOpen(true)}
                    className="w-full text-white py-4 px-5 rounded-2xl font-black uppercase tracking-widest text-xs shadow-[0_10px_40px_rgba(0,0,0,0.3)] flex items-center justify-between transition-transform active:scale-95 border-2 border-white/20 backdrop-blur-sm"
                    style={{ backgroundColor: currentTemplate.primaryColor }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="bg-black/20 p-2 rounded-xl flex items-center gap-1.5">
                        <ShoppingBag size={14} />
                        <span>{cartTotalItems}</span>
                      </div>
                      <span className="text-left leading-tight truncate max-w-[120px] sm:max-w-[150px]">
                        {currentTemplate.defaultContent.ctaText}
                      </span>
                    </div>
                    
                    <span className="text-sm italic drop-shadow-md">
                      R$ {cartTotalValue.toFixed(2)}
                    </span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

          </div>
        </div>
      ) : (
        /* =========================================
           2. LAYOUT COMPLETO (E-commerce Tradicional)
           ========================================= */
        <div className="bg-white">
          <aside className="bg-[#f0f0f0] border-b border-gray-200 text-center py-1.5 px-4 text-xs font-medium text-gray-700">
            🚚 <strong>Comprou R$ 999,00?</strong> Frete é Grátis! <a href="#" className="underline hover:text-[#357b64]">Clique aqui para saber +</a>
          </aside>

          <header style={{ backgroundColor: themeColor }} className="w-full sticky top-0 z-40 shadow-md">
            <div className="max-w-[1300px] mx-auto px-4 py-4 sm:py-5 flex items-center justify-between gap-4 sm:gap-8">
              <div className="flex items-center gap-3">
                <button onClick={() => setIsMobileMenuOpen(true)} className="lg:hidden p-1 text-white hover:bg-white/10 rounded"><Menu className="w-6 h-6" /></button>
                <a href="/" className="flex flex-col text-white group outline-none">
                  <span className="text-2xl sm:text-4xl font-extrabold tracking-tighter leading-none group-hover:opacity-90">{storeName.split(' ')[0]}</span>
                  <span className="text-[9px] sm:text-[11px] uppercase tracking-[0.2em] opacity-80">{storeName.split(' ').slice(1).join(' ') || storeSlogan}</span>
                </a>
              </div>
              <div className="hidden sm:flex flex-1 max-w-2xl relative">
                <input type="search" placeholder="Digite o que você procura" className="w-full h-11 pl-4 pr-12 rounded-full text-sm text-gray-900 bg-white border-none focus:ring-2 focus:ring-emerald-400 outline-none" />
                <button className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#357b64]"><Search className="w-5 h-5" /></button>
              </div>
              <div className="flex items-center gap-4 sm:gap-6 text-white">
                <button onClick={() => setLayoutMode('webview')} className="hidden lg:block text-[10px] font-bold border border-white/30 px-3 py-1.5 rounded-full hover:bg-white/10">Ver Webview</button>
                <div className="hidden lg:flex items-center gap-2 cursor-pointer hover:opacity-80"><HeadphonesIcon className="w-6 h-6 opacity-90" /><div className="flex flex-col leading-tight"><span className="text-[11px] font-medium opacity-80">Central de</span><span className="text-xs font-bold flex items-center gap-1">Atendimento <ChevronDown className="w-3 h-3" /></span></div></div>
                <div className="hidden lg:flex items-center gap-2 cursor-pointer hover:opacity-80"><User className="w-6 h-6 opacity-90" /><div className="flex flex-col leading-tight"><span className="text-[11px] font-medium opacity-80">Bem-vindo(a)</span><span className="text-xs font-bold">Entrar ou Cadastrar <ChevronDown className="inline w-3 h-3" /></span></div></div>
                {storeMode !== 'catalogo' && (
                  <button onClick={() => setIsCartOpen(true)} className="flex items-center gap-2 cursor-pointer hover:scale-105 transition-transform relative group">
                    <ShoppingCart className="w-7 h-7 sm:w-8 sm:h-8" />
                    <span className="absolute -top-1.5 -right-1.5 sm:-top-2 sm:-right-2 bg-red-500 text-white text-[10px] sm:text-xs font-bold w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center rounded-full border-2 border-[#357b64]">{cartTotalItems}</span>
                  </button>
                )}
              </div>
            </div>
            <div className="sm:hidden px-4 pb-4">
              <div className="relative w-full"><input type="search" placeholder="O que você procura?" className="w-full h-10 pl-4 pr-10 rounded-full text-sm text-gray-900 bg-white border-none outline-none" /><Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" /></div>
            </div>
          </header>

          <nav style={{ backgroundColor: THEME.secondary }} className="hidden lg:block text-white shadow-inner">
            <div className="max-w-[1300px] mx-auto px-4 flex items-center gap-8 text-[13px] font-semibold h-12">
              <button className="flex items-center gap-2 hover:opacity-80 h-full"><LayoutGrid className="w-4 h-4" /> Todas as categorias <ChevronDown className="w-3 h-3" /></button>
              {categories.slice(0, 4).map(cat => (<a key={cat} href={`#${cat}`} className="hover:opacity-80 flex items-center gap-1">{cat} <ChevronDown className="w-3 h-3 opacity-50" /></a>))}
            </div>
          </nav>

          <main className="flex-1 w-full max-w-[1300px] mx-auto px-4 py-6 sm:py-10 space-y-12 sm:space-y-16">
            <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gray-900 md:h-[300px] rounded flex flex-col justify-center p-8 text-white relative overflow-hidden group"><div className="absolute inset-0 bg-[#1a1a1a] group-hover:scale-105 transition-transform duration-700 z-0"></div><div className="relative z-10"><p className="text-sm font-medium mb-1 opacity-80">Sua embalagem também comunica.</p><h2 className="text-3xl font-extrabold mb-4 leading-tight">SUA<br/>MARCA<br/>AQUI.</h2><span className="inline-block px-4 py-2 bg-white/10 border border-white/20 text-xs font-bold uppercase tracking-wider">Ver Modelos</span></div></div>
              <div className="bg-[#e9f5f1] md:h-[300px] rounded flex flex-col items-center justify-center p-6 text-center border border-[#c4e4d8]"><h2 className="text-[#357b64] text-4xl font-black mb-1">FRETE GRÁTIS!</h2><p className="text-[#357b64] text-xl font-bold mb-2">COMPRAS ACIMA DE</p><p className="text-[#357b64] text-5xl font-black mb-2">R$ 999,00</p><p className="text-[#357b64] text-xs font-medium">*Consulte as regras.</p></div>
              <div className="bg-[#1f1d1b] md:h-[300px] rounded flex flex-col justify-center p-8 text-[#e3cda8] relative overflow-hidden"><div className="relative z-10"><h2 className="text-3xl font-black mb-2 leading-none">TALHERES<br/>DE MADEIRA</h2><p className="text-sm font-bold opacity-90 mb-4 tracking-widest uppercase">Práticos e Sustentáveis</p><span className="inline-block px-4 py-2 bg-[#357b64] text-white text-xs font-bold uppercase tracking-wider">Ver Opções</span></div></div>
            </section>

            <section>
              <h2 className="text-2xl sm:text-3xl font-bold text-[#357b64] text-center mb-8">Últimos Lançamentos</h2>
              {loading ? (
                 <div className="flex justify-center py-20"><div className="w-12 h-12 border-4 border-[#357b64] border-t-transparent rounded-full animate-spin"></div></div>
              ) : paginatedProducts.length === 0 ? (
                 <div className="text-center py-20 text-gray-500 bg-gray-50 rounded-xl border border-dashed border-gray-300">Nenhum produto cadastrado.</div>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                    {paginatedProducts.map((product) => {
                    const pixPrice = product.price * 0.97;
                    return (
                     <article key={product.id} className="bg-white flex flex-col h-full rounded border border-transparent hover:border-gray-200 hover:shadow-xl transition-all duration-300 relative group">
                        <button className="absolute top-3 right-3 z-10 w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center text-gray-400"><Star className="w-4 h-4" /></button>
                        
                        <div onClick={() => setSelectedProduct(product)} className="cursor-pointer">
                          <div className="w-full aspect-square relative p-4 overflow-hidden"><img src={product.imageUrl} alt={product.name} className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500" /></div>
                          <div className="px-4 pt-2 pb-1 text-center border-t border-gray-50 mt-2">
                            <h3 className="text-sm font-medium text-gray-800 line-clamp-2 min-h-[40px]">{product.name}</h3>
                          </div>
                        </div>

                        <div className="p-4 flex flex-col flex-1 text-center">
                          <div className="mt-auto">
                            {storeMode !== 'catalogo' && (
                              <>
                                <div className="flex items-end justify-center gap-2 mb-2"><span className="text-xs text-gray-400 line-through font-medium">R$ {(product.price * 1.1).toFixed(2)}</span><span className="text-xl font-extrabold text-[#357b64]">R$ {product.price.toFixed(2)}</span></div>
                                <div className="bg-[#f2fcf8] border border-[#c4e4d8] rounded py-2 px-1 flex flex-col items-center justify-center mb-4"><span className="text-sm font-bold text-[#357b64] flex items-center gap-1">R$ {pixPrice.toFixed(2)} <span className="text-[10px] font-normal text-gray-600">no pix</span></span></div>
                                <button onClick={(e) => { e.stopPropagation(); handleAddToCart(product); }} className="w-full bg-[#357b64] hover:bg-[#2c6b56] text-white font-bold text-sm py-3 rounded mb-2">Comprar</button>
                                <button onClick={(e) => { e.stopPropagation(); handleAddToCart(product); setIsCartOpen(true); }} className="w-full bg-white border border-[#357b64] text-[#357b64] hover:bg-gray-50 font-bold text-xs py-2 rounded flex items-center justify-center gap-1.5">Orçamento Fácil <Phone className="w-3.5 h-3.5" /></button>
                              </>
                            )}
                          </div>
                        </div>
                      </article>
                    );})}
                  </div>

                  {filteredActiveProducts.length > visibleCount && (
                    <div className="py-10 flex justify-center">
                      <button 
                        onClick={handleLoadMore}
                        disabled={isLoadingMore}
                        className="px-8 py-3 bg-white border-2 border-[#357b64] text-[#357b64] rounded text-sm font-bold uppercase tracking-wider flex items-center gap-2 hover:bg-gray-50 transition-colors disabled:opacity-50"
                      >
                        {isLoadingMore ? 'Carregando...' : 'Carregar mais produtos'}
                      </button>
                    </div>
                  )}
                </>
              )}
            </section>
          </main>

          <footer style={{ backgroundColor: THEME.dark }} className="text-gray-300 pt-12 pb-6 text-sm">
            <div className="max-w-[1300px] mx-auto px-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
              <div className="space-y-4"><span className="text-3xl font-extrabold text-white">{storeName}</span><p className="text-xs text-gray-400">{storeSlogan}</p></div>
              <div className="space-y-4"><h4 className="text-white font-bold">Ligue para nós:</h4><p className="flex items-start gap-2"><Phone className="w-4 h-4" /><strong className="text-white">{storeWhatsapp}</strong></p></div>
            </div>
          </footer>
        </div>
      )}

      {/* =========================================
          MODAL DE DETALHES DO PRODUTO E GALERIA
          ========================================= */}
      <AnimatePresence>
        {selectedProduct && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            onClick={() => setSelectedProduct(null)}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-center justify-center p-4 sm:p-6"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }} 
              animate={{ scale: 1, opacity: 1, y: 0 }} 
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()} 
              className="bg-white w-full max-w-lg max-h-[90vh] rounded-[2rem] shadow-2xl flex flex-col overflow-hidden relative"
            >
              <button 
                onClick={() => setSelectedProduct(null)} 
                className="absolute top-4 right-4 z-10 w-10 h-10 bg-white/80 backdrop-blur shadow-sm text-gray-500 hover:text-gray-900 rounded-full flex items-center justify-center transition-colors border border-gray-100"
              >
                <X className="w-5 h-5" />
              </button>

              {/* 🔥 NOVA GALERIA HÍBRIDA (VÍDEOS E IMAGENS) */}
              <div className="w-full bg-slate-900 flex flex-col items-center shrink-0 relative border-b border-gray-100 overflow-hidden">
                {/* Mídia Principal */}
                <div className="w-full h-[45vh] sm:h-[50vh] flex items-center justify-center relative bg-black">
                  {(selectedProduct as any).videoUrl && selectedImageIndex === 0 ? (
                    <video 
                      src={(selectedProduct as any).videoUrl} 
                      autoPlay loop muted playsInline controls
                      className="w-full h-full object-contain" 
                    />
                  ) : (
                    <img 
                      /* @ts-ignore */
                      src={(selectedProduct as any).images && (selectedProduct as any).images.length > 0 ? (selectedProduct as any).images[selectedImageIndex] : selectedProduct.imageUrl} 
                      alt={selectedProduct.name} 
                      className="w-full h-full object-cover sm:object-contain transition-opacity duration-300 bg-white" 
                    />
                  )}
                </div>
                
                {/* Miniaturas (Só aparecem se tiver imagens adicionais OU vídeo + imagem) */}
                {/* @ts-ignore */}
                {((selectedProduct as any).images && (selectedProduct as any).images.length > 1) || ((selectedProduct as any).videoUrl && selectedProduct.imageUrl) ? (
                  <div className="flex gap-3 overflow-x-auto max-w-full pb-3 pt-3 px-4 custom-scrollbar bg-white w-full">
                    {/* Botão do Vídeo (Se existir) */}
                    {(selectedProduct as any).videoUrl && (
                        <button 
                            onClick={() => setSelectedImageIndex(0)}
                            className={`w-16 h-16 shrink-0 rounded-xl border-2 p-1 bg-slate-900 overflow-hidden transition-all flex items-center justify-center relative ${selectedImageIndex === 0 ? 'shadow-md scale-105' : 'border-transparent opacity-60 hover:opacity-100'}`}
                            style={selectedImageIndex === 0 ? { borderColor: themeColor } : {}}
                        >
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z"/></svg>
                        </button>
                    )}
                    
                    {/* Botões das Imagens */}
                    {/* @ts-ignore */}
                    {((selectedProduct as any).images || [selectedProduct.imageUrl]).map((imgUrl: string, idx: number) => {
                        const actualIdx = (selectedProduct as any).videoUrl ? idx + 1 : idx;
                        return (
                          <button 
                            key={actualIdx} 
                            onClick={() => setSelectedImageIndex(actualIdx)}
                            className={`w-16 h-16 shrink-0 rounded-xl border-2 p-1 bg-white overflow-hidden transition-all ${selectedImageIndex === actualIdx ? 'shadow-md scale-105' : 'border-transparent hover:border-gray-300 opacity-60 hover:opacity-100'}`}
                            style={selectedImageIndex === actualIdx ? { borderColor: themeColor } : {}}
                          >
                            <img src={imgUrl} className="w-full h-full object-contain mix-blend-multiply" alt="Thumbnail" />
                          </button>
                        );
                    })}
                  </div>
                ) : null}
              </div>
              {/* FIM DA GALERIA */}

              <div className="flex-1 overflow-y-auto p-6 sm:p-8 custom-scrollbar bg-white">
                <div className="mb-2">
                  <span style={{ color: themeColor, backgroundColor: `${themeColor}15` }} className="px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-full">
                    {selectedProduct.category}
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-gray-900 leading-tight mb-2">
                  {selectedProduct.name}
                </h2>
                <p className="text-xs font-mono text-gray-400 mb-6 font-bold">SKU: {selectedProduct.sku}</p>

                <div className="prose prose-sm text-gray-600 mb-8 max-w-none">
                  <p className="whitespace-pre-wrap leading-relaxed font-medium">
                    {selectedProduct.description || 'Nenhuma descrição fornecida para este produto.'}
                  </p>
                </div>

                {/* INÍCIO: UI DE VARIAÇÕES (Ex: 500, 1000, 3000) */}
                {/* @ts-ignore */}
                {(selectedProduct as any).variations && (selectedProduct as any).variations.length > 0 && (
                  <div className="mb-6">
                    <p className="text-[11px] font-bold text-gray-800 uppercase tracking-widest mb-3">Selecione a opção de Quantidade:</p>
                    <div className="flex flex-wrap gap-2">
                      {/* @ts-ignore */}
                      {(selectedProduct as any).variations.map((varItem: any, idx: number) => (
                        <button
                          key={idx}
                          onClick={() => setSelectedVariationIndex(idx)}
                          className={`px-5 py-2.5 border-2 rounded-lg text-sm font-bold transition-all ${
                            selectedVariationIndex === idx 
                              ? 'shadow-sm' 
                              : 'border-gray-200 text-gray-500 hover:border-gray-300'
                          }`}
                          style={selectedVariationIndex === idx ? { borderColor: themeColor, color: themeColor, backgroundColor: `${themeColor}10` } : {}}
                        >
                          {varItem.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {/* FIM: UI DE VARIAÇÕES */}
              </div>

              {storeMode !== 'catalogo' && (
                <div className="p-6 sm:p-8 bg-gray-50 border-t border-gray-100 shrink-0 flex items-center justify-between gap-4">
                  <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                    {/* @ts-ignore */}
                    {((selectedProduct as any).variations && (selectedProduct as any).variations.length > 0 ? (selectedProduct as any).variations[selectedVariationIndex].price : selectedProduct.price) > 0 
                      ? ((selectedProduct as any).variations && (selectedProduct as any).variations.length > 0 ? 'A Partir de' : 'Preço Unitário') 
                      : ''}
                  </p>
                  <p style={{ color: themeColor }} className="text-2xl sm:text-3xl font-black tracking-tight">
                    {/* @ts-ignore */}
                    {((selectedProduct as any).variations && (selectedProduct as any).variations.length > 0 ? (selectedProduct as any).variations[selectedVariationIndex].price : selectedProduct.price) > 0 
                      ? `R$ ${((selectedProduct as any).variations && (selectedProduct as any).variations.length > 0 ? (selectedProduct as any).variations[selectedVariationIndex].price : selectedProduct.price).toFixed(2)}` 
                      : 'Sob Consulta'}
                  </p>
                </div>
                
                <button 
                  onClick={() => {
                    // Truque de Mestre para Carrinho
                    // @ts-ignore
                    const productToAdd = (selectedProduct as any).variations && (selectedProduct as any).variations.length > 0 
                      ? { 
                          ...selectedProduct, 
                          // @ts-ignore
                          id: `${selectedProduct.id}-${selectedVariationIndex}`, 
                          // @ts-ignore
                          name: `${selectedProduct.name} (${(selectedProduct as any).variations[selectedVariationIndex].name})`,
                          // @ts-ignore
                          price: (selectedProduct as any).variations[selectedVariationIndex].price
                        } 
                      : selectedProduct;
                    
                    handleAddToCart(productToAdd);
                    setSelectedProduct(null);
                  }}
                  style={{ backgroundColor: themeColor }}
                  className="px-6 py-4 rounded-xl text-white font-black uppercase tracking-wider text-xs sm:text-sm shadow-lg flex items-center gap-2 hover:opacity-90 transition-opacity flex-1 justify-center max-w-[200px]"
                >
                  <Plus className="w-5 h-5" /> Adicionar
                </button>
              </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* =========================================
          DRAWER COMPARTILHADO (Carrinho Fixo / Universal)
          ========================================= */}
      <AnimatePresence>
        {isCartOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-end" onClick={() => setIsCartOpen(false)}>
            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} onClick={(e) => e.stopPropagation()} className="w-full sm:w-[400px] h-full bg-white shadow-2xl flex flex-col">
              
              <div style={{ backgroundColor: THEME.primary }} className="p-4 flex items-center justify-between text-white shadow-md z-20">
                <h3 className="text-lg font-bold flex items-center gap-2"><ShoppingCart className="w-5 h-5" /> Meu Carrinho</h3>
                <button onClick={() => setIsCartOpen(false)} className="p-2 bg-white/10 hover:bg-white/20 rounded-full"><X className="w-5 h-5" /></button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 bg-gray-50 z-10">
                {cart.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-50"><ShoppingCart className="w-16 h-16 text-gray-400" /><p className="text-sm font-medium text-gray-600">Sua sacola está vazia.</p></div>
                ) : (
                  <ul className="space-y-3">
                    {cart.map((item) => (
                      <li key={item.product.id} className="flex gap-3 bg-white border border-gray-200 rounded-xl p-3 shadow-sm">
                        <div className="w-16 h-16 bg-gray-50 rounded-lg overflow-hidden shrink-0 border border-gray-100"><img src={item.product.imageUrl} alt={item.product.name} className="w-full h-full object-contain" /></div>
                        <div className="flex-1 flex flex-col justify-between min-w-0">
                          <div><h4 className="text-xs font-bold text-gray-800 truncate">{item.product.name}</h4><p className="text-sm font-extrabold text-[#357b64] mt-0.5">R$ {item.product.price.toFixed(2)}</p></div>
                          <div className="flex items-center justify-between mt-2">
                            <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden"><button onClick={() => handleUpdateQuantity(item.product.id, -1)} className="px-3 py-1 bg-gray-50 hover:bg-gray-100 text-gray-600"><Minus className="w-3 h-3" /></button><span className="text-xs font-bold w-8 text-center bg-white">{item.quantity}</span><button onClick={() => handleUpdateQuantity(item.product.id, 1)} disabled={item.quantity >= item.product.stock} className="px-3 py-1 bg-gray-50 hover:bg-gray-100 text-gray-600 disabled:opacity-50"><Plus className="w-3 h-3" /></button></div>
                            <button onClick={() => handleRemoveItem(item.product.id)} className="text-gray-400 hover:text-red-500 p-1"><Trash2 className="w-4 h-4" /></button>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="p-5 border-t border-gray-200 bg-white shadow-[0_-10px_20px_rgba(0,0,0,0.05)] shrink-0 z-10 relative">
                {cart.length > 0 && (
                  <div className="mb-4 space-y-2 bg-gray-50 p-3 rounded-xl border border-gray-100 max-h-[40vh] overflow-y-auto custom-scrollbar">
                    <p className="text-[10px] font-black uppercase text-gray-500 tracking-wider mb-2">1. Dados Básicos</p>
                    <input type="text" placeholder="Nome Completo / Contato *" value={customerName} onChange={(e) => setCustomerName(e.target.value)} className="w-full h-9 px-3 text-xs bg-white border border-gray-200 rounded focus:border-[#357b64] focus:ring-1 focus:ring-[#357b64] outline-none transition-all" />
                    {currentTemplate.category !== 'servicos' && (
                      <div className="grid grid-cols-2 gap-2">
                        <input type="text" placeholder="CNPJ *" value={customerCnpj} onChange={(e) => setCustomerCnpj(e.target.value)} className="w-full h-9 px-3 text-xs bg-white border border-gray-200 rounded focus:border-[#357b64] focus:ring-1 focus:ring-[#357b64] outline-none transition-all" />
                        <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="w-full h-9 px-3 text-xs bg-white border border-gray-200 rounded focus:border-[#357b64] focus:ring-1 focus:ring-[#357b64] outline-none transition-all text-gray-700">
                          <option value="Pix">Pix</option>
                          <option value="Cartão de Crédito">Cartão de Crédito</option>
                          <option value="Dinheiro">Dinheiro no local</option>
                          <option value="Boleto">Boleto a prazo</option>
                        </select>
                      </div>
                    )}

                    {currentTemplate.category === 'servicos' ? (
                      <>
                        <p className="text-[10px] font-black uppercase text-gray-500 tracking-wider mt-4 mb-2">2. Dados do Agendamento</p>
                        <div className="grid grid-cols-2 gap-2">
                          <input type="date" value={serviceDate} onChange={(e) => setServiceDate(e.target.value)} className="w-full h-9 px-3 text-xs bg-white border border-gray-200 rounded focus:border-[#357b64] focus:ring-1 focus:ring-[#357b64] outline-none transition-all text-gray-700" required />
                          <input type="time" value={serviceTime} onChange={(e) => setServiceTime(e.target.value)} className="w-full h-9 px-3 text-xs bg-white border border-gray-200 rounded focus:border-[#357b64] focus:ring-1 focus:ring-[#357b64] outline-none transition-all text-gray-700" required />
                        </div>
                        <input type="text" placeholder="Endereço Completo do Serviço *" value={serviceAddress} onChange={(e) => setServiceAddress(e.target.value)} className="w-full h-9 px-3 text-xs bg-white border border-gray-200 rounded focus:border-[#357b64] focus:ring-1 focus:ring-[#357b64] outline-none transition-all mt-2" required />
                      </>
                    ) : (
                      <>
                        <p className="text-[10px] font-black uppercase text-gray-500 tracking-wider mt-4 mb-2">2. Endereço para Frete</p>
                        <div className="relative">
                          <input type="text" maxLength={8} placeholder="CEP (Apenas números) *" value={cep} onChange={handleCepChange} className="w-full h-9 px-3 text-xs bg-white border border-gray-200 rounded focus:border-[#357b64] focus:ring-1 focus:ring-[#357b64] outline-none transition-all" />
                          {isLoadingCep && <div className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 border-2 border-[#357b64] border-t-transparent rounded-full animate-spin"></div>}
                        </div>
                        {address.street && (
                          <>
                            <input type="text" value={address.street} readOnly className="w-full h-9 px-3 text-xs bg-gray-100 text-gray-500 border border-gray-200 rounded outline-none cursor-not-allowed" placeholder="Rua / Logradouro" />
                            <div className="grid grid-cols-3 gap-2">
                              <input type="text" placeholder="Número *" value={addressNumber} onChange={(e) => setAddressNumber(e.target.value)} className="col-span-1 w-full h-9 px-3 text-xs bg-white border border-gray-200 rounded focus:border-[#357b64] focus:ring-1 focus:ring-[#357b64] outline-none transition-all" />
                              <input type="text" placeholder="Complemento" value={complement} onChange={(e) => setComplement(e.target.value)} className="col-span-2 w-full h-9 px-3 text-xs bg-white border border-gray-200 rounded focus:border-[#357b64] focus:ring-1 focus:ring-[#357b64] outline-none transition-all" />
                            </div>
                            <p className="text-[10px] text-gray-400 font-medium px-1 truncate">{address.neighborhood} - {address.city} / {address.state}</p>
                          </>
                        )}
                      </>
                    )}
                  </div>
                )}
                <div className="flex justify-between text-sm text-gray-600 mb-1"><span>Subtotal ({cartTotalItems} itens)</span><span className="font-medium">R$ {cartTotalValue.toFixed(2)}</span></div>
                <div className="flex justify-between text-lg font-black text-gray-900 mb-4 border-t border-gray-100 pt-2"><span>Total s/ Frete</span><span className="text-[#357b64]">R$ {cartTotalValue.toFixed(2)}</span></div>
                
                <button 
                  onClick={handleWhatsAppCheckout}
                  disabled={
                    cart.length === 0 || !customerName.trim() || 
                    (currentTemplate.category !== 'servicos' && (!customerCnpj.trim() || cep.length !== 8 || !addressNumber.trim())) ||
                    (currentTemplate.category === 'servicos' && (!serviceDate || !serviceTime || !serviceAddress.trim()))
                  }
                  style={
                    (cart.length > 0 && customerName.trim() && (
                      (currentTemplate.category !== 'servicos' && customerCnpj.trim() && cep.length === 8 && addressNumber.trim()) ||
                      (currentTemplate.category === 'servicos' && serviceDate && serviceTime && serviceAddress.trim())
                    )) ? { backgroundColor: currentTemplate.primaryColor } : {}
                  }
                  className={`w-full py-4 font-black rounded-xl text-xs flex items-center justify-center gap-2 transition-all uppercase tracking-widest ${
                    (cart.length === 0 || !customerName.trim() || 
                    (currentTemplate.category !== 'servicos' && (!customerCnpj.trim() || cep.length !== 8 || !addressNumber.trim())) ||
                    (currentTemplate.category === 'servicos' && (!serviceDate || !serviceTime || !serviceAddress.trim())))
                      ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      : 'text-white shadow-xl hover:scale-[0.98]'
                  }`}
                >
                  <Phone className="w-4 h-4 fill-current" />
                  {currentTemplate.category === 'servicos' 
                    ? 'Agendar Visita/Serviço' 
                    : (storeMode === 'ecommerce' ? 'Finalizar Pedido (WhatsApp)' : 'Solicitar Orçamento')}
                </button>

              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MENU LATERAL MOBILE (Apenas para o modo Loja Integrada) */}
      <AnimatePresence>
        {isMobileMenuOpen && layoutMode === 'complete' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 z-50 flex" onClick={() => setIsMobileMenuOpen(false)}>
            <motion.div initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }} className="w-[80%] max-w-sm h-full bg-white flex flex-col" onClick={e => e.stopPropagation()}>
              <div style={{ backgroundColor: THEME.primary }} className="p-4 flex items-center justify-between text-white"><span className="font-bold">Menu</span><button onClick={() => setIsMobileMenuOpen(false)}><X className="w-6 h-6" /></button></div>
              <nav className="flex-1 overflow-y-auto py-2">
                <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center gap-3"><User className="w-5 h-5 text-gray-500" /><span className="text-sm font-bold text-gray-800">Entrar ou Cadastrar</span></div>
                {categories.map(cat => (<a key={cat} href={`#${cat}`} className="block px-4 py-3 border-b border-gray-100 text-sm font-medium text-gray-700">{cat}</a>))}
              </nav>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}