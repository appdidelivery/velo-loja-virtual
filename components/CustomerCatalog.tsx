"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShoppingCart, Search, Menu, User, HeadphonesIcon, 
  ChevronDown, Star, ShieldCheck, MapPin, Phone, 
  Mail, X, Plus, Minus, Trash2, CheckCircle2, LayoutGrid
} from 'lucide-react';

// IMPORTAÇÕES CORRIGIDAS (Usando caminhos relativos em vez de @/)
import { Product, TenantSettings } from '../types';
import { INITIAL_SETTINGS } from '../data/mokedData';
import { useProducts } from '../hooks/useProducts';

// --- CONFIGURAÇÕES DE CONFIANÇA (E-E-A-T) PARA SEO/AEO ---
const STORE_TRUST_DATA = {
  cnpj: '45.123.456/0001-99',
  address: 'Rua das Embalagens, 1578 - Centro, São Paulo - SP, 01310-200',
  returnPolicy: 'Troca garantida em até 7 dias corridos conforme CDC.',
  supportHours: 'Segunda a Sexta, das 08h às 18h',
  email: 'vendas@velovarejo.com.br'
};

// Cores baseadas no print (Tema Loja Integrada Padrão)
const THEME = {
  primary: '#357b64', // Verde principal
  secondary: '#2c6b56', // Verde escuro (menu)
  accent: '#25D366', // Verde WhatsApp
  dark: '#2a2a2a', // Rodapé
};

export default function CustomerCatalog() {
  const settings: TenantSettings = INITIAL_SETTINGS;

  // Magia do Firebase acontecendo na Vitrine
  const { products, loading } = useProducts('tenant_abc123');
  
  // Só mostra na vitrine os produtos que o lojista marcou como "Ativo"
  const activeProducts = useMemo(() => products.filter(p => p.isActive), [products]);

  // Extrair categorias únicas para o Menu
  const categories = useMemo(() => Array.from(new Set(activeProducts.map(p => p.category))), [activeProducts]);

  // Estados
  const [cart, setCart] = useState<{ product: Product; quantity: number }[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  
  // Estados do Modo Orçamento
  const [customerName, setCustomerName] = useState('');
  const [customerCnpj, setCustomerCnpj] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Pix');
  
  // Estados de Endereço (Modo Orçamento)
  const [cep, setCep] = useState('');
  const [address, setAddress] = useState({ street: '', neighborhood: '', city: '', state: '' });
  const [addressNumber, setAddressNumber] = useState('');
  const [complement, setComplement] = useState('');
  const [isLoadingCep, setIsLoadingCep] = useState(false);
  
 // Toggle de Layout: 'complete' (Loja Integrada) ou 'webview' (Mobile App)
  // No futuro isso virá do Firebase: settings.businessType === 'whatsapp_catalog'
  const [layoutMode, setLayoutMode] = useState<'complete' | 'webview'>('webview');
  
  // Estado para o filtro de categorias no Webview
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos');

  // Estados Customizáveis de Visual
  const [themeColor, setThemeColor] = useState('#357b64'); // Cor padrão Velo Verde
  const [storeLogo, setStoreLogo] = useState('');

  // Evitar Hydration Mismatch e buscar personalização em Tempo Real
  useEffect(() => {
    setMounted(true);
    
    // Função que busca a cor e logo
    const loadTheme = () => {
      const savedColor = localStorage.getItem('velo_theme_color');
      const savedLogo = localStorage.getItem('velo_store_logo');
      if (savedColor) setThemeColor(savedColor);
      if (savedLogo) setStoreLogo(savedLogo);
    };

    // 1. Carrega assim que a página abre
    loadTheme();

    // 2. Fica "escutando" se o Lojista apertar o botão de Salvar lá no Admin
    window.addEventListener('storage', loadTheme);
    
    return () => window.removeEventListener('storage', loadTheme);
  }, []);

  // Produtos filtrados pela categoria selecionada
  const filteredActiveProducts = useMemo(() => {
    if (selectedCategory === 'Todos') return activeProducts;
    return activeProducts.filter(p => p.category === selectedCategory);
  }, [activeProducts, selectedCategory]);

  // Busca Automática de CEP
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

  // --- LÓGICA DO CARRINHO ---
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

  // --- CHECKOUT WHATSAPP (MODO ORÇAMENTO) ---
  const handleWhatsAppCheckout = () => {
    if (cart.length === 0 || !customerName.trim() || !customerCnpj.trim() || cep.length !== 8 || !addressNumber.trim()) return;

    let message = `🛒 *SOLICITAÇÃO DE ORÇAMENTO - ${settings.businessName}*\n\n`;
    
    message += `*Dados do Cliente:*\n`;
    message += `👤 Empresa: ${customerName}\n`;
    message += `📄 CNPJ: ${customerCnpj}\n`;
    message += `💳 Pagamento Desejado: ${paymentMethod}\n\n`;
    
    message += `*Endereço para Cálculo de Frete:*\n`;
    message += `📍 CEP: ${cep}\n`;
    message += `📍 Endereço: ${address.street}, ${addressNumber} ${complement ? ' - ' + complement : ''}\n`;
    message += `📍 Bairro/Cidade: ${address.neighborhood} - ${address.city}/${address.state}\n\n`;

    message += `*Itens Solicitados:*\n\n`;

    cart.forEach((item, index) => {
      message += `${index + 1}. *${item.product.name}*\n`;
      message += `   Qtd: ${item.quantity} un\n`;
      message += `   Subtotal (Base): R$ ${(item.quantity * item.product.price).toFixed(2)}\n\n`;
    });

    message += `💰 *VALOR TOTAL DOS PRODUTOS: R$ ${cartTotalValue.toFixed(2)}*\n\n`;
    message += `Aguardo o retorno para darmos andamento à negociação e inclusão do valor do frete.`;

    const encodedMessage = encodeURIComponent(message);
    const rawPhone = settings.whatsappNumber.replace(/\D/g, '');
    window.open(`https://wa.me/${rawPhone}?text=${encodedMessage}`, '_blank');
  };

  // --- SCHEMA MARKUP (JSON-LD) PARA MUVERA / GOOGLE AEO ---
  const generateStructuredData = () => {
    const organizationSchema = {
      "@context": "https://schema.org",
      "@type": "Store",
      "name": settings.businessName,
      "url": "https://www.suastartup.com.br",
      "telephone": settings.whatsappNumber,
      "address": {
        "@type": "PostalAddress",
        "streetAddress": STORE_TRUST_DATA.address,
        "addressCountry": "BR"
      }
    };

    const productSchema = activeProducts.map(p => ({
      "@context": "https://schema.org/",
      "@type": "Product",
      "name": p.name,
      "image": [p.imageUrl],
      "description": p.description,
      "sku": p.sku,
      "offers": {
        "@type": "Offer",
        "priceCurrency": "BRL",
        "price": p.price.toString(),
        "availability": p.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      }
    }));

    return JSON.stringify([organizationSchema, ...productSchema]);
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-gray-100 text-gray-800 font-sans selection:bg-[#357b64] selection:text-white relative">
      
      {/* INJEÇÃO ESTRUTURAL DE SEO */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: generateStructuredData() }} />

      {layoutMode === 'webview' ? (
        /* =========================================
           1. LAYOUT WEBVIEW (Focado em Mobile/Orçamento)
           ========================================= */
        // O h-[100dvh] (Dynamic Viewport Height) é o que trava a tela exatamente no tamanho do celular, impedindo que o menu fuja.
        <div className="flex justify-center bg-[#1a1a1a] h-[100dvh] overflow-hidden">
          <div className="w-full max-w-md bg-white h-full flex flex-col relative shadow-2xl overflow-hidden">
            
            {/* Header App-like com Cor Dinâmica */}
            <header style={{ backgroundColor: themeColor }} className="text-white px-5 py-4 flex items-center justify-between shrink-0 z-10 rounded-b-[2rem] shadow-sm transition-colors duration-500">
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center font-black text-xl shadow-inner border-2 border-white/30 shrink-0 overflow-hidden">
                  {storeLogo ? (
                    <img src={storeLogo} alt="Logo" className="w-full h-full object-contain p-1" />
                  ) : (
                    <span style={{ color: themeColor }}>{settings.businessName.charAt(0)}</span>
                  )}
                </div>
                <div className="overflow-hidden">
                  <h1 className="text-sm font-black leading-tight uppercase tracking-wider truncate">{settings.businessName}</h1>
                  <p className="text-[10px] font-medium opacity-80 mt-0.5">Catálogo Exclusivo</p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button onClick={() => setLayoutMode('complete')} className="text-[9px] font-bold uppercase tracking-wider bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-full transition-colors">
                  Ver PC
                </button>
              </div>
            </header>

            {/* Categorias Horizontais em Pílulas */}
            <div className="px-4 py-3 bg-white shrink-0 flex items-center gap-2 overflow-x-auto custom-scrollbar border-b border-gray-50">
              <button 
                onClick={() => setSelectedCategory('Todos')}
                style={selectedCategory === 'Todos' ? { backgroundColor: themeColor, color: '#fff' } : {}}
                className={`px-5 py-2 text-[11px] font-bold rounded-full whitespace-nowrap transition-colors ${selectedCategory === 'Todos' ? 'shadow-md' : 'bg-gray-50 hover:bg-gray-100 text-gray-600 border border-gray-200'}`}
              >
                Todos
              </button>
              {categories.map(cat => (
                <button 
                  key={cat} 
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-5 py-2 text-[11px] font-bold rounded-full whitespace-nowrap transition-colors ${selectedCategory === cat ? 'bg-[#357b64] text-white shadow-md' : 'bg-gray-50 hover:bg-gray-100 text-gray-600 border border-gray-200'}`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Lista de Produtos (Cards Otimizados Mobile) */}
            <main className="flex-1 overflow-y-auto px-4 pb-24 bg-gray-50/50 custom-scrollbar space-y-3 pt-2">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <div className="w-8 h-8 border-4 border-[#357b64] border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : filteredActiveProducts.length === 0 ? (
                <div className="text-center py-10">
                  <p className="text-sm font-bold text-gray-500">Nenhum produto nesta categoria.</p>
                  <button onClick={() => setSelectedCategory('Todos')} className="mt-3 text-[#357b64] text-xs font-bold underline">Limpar filtro</button>
                </div>
              ) : (
                filteredActiveProducts.map(product => (
                  <div key={product.id} className="bg-white p-3 rounded-[1.5rem] shadow-sm border border-gray-100 flex gap-4 items-center relative overflow-hidden group">
                    {product.stock <= 10 && <div className="absolute top-0 left-0 bg-red-500 text-white text-[8px] font-black uppercase px-2 py-1 rounded-br-lg z-10">Últimos</div>}
                    <div className="w-20 h-20 bg-gray-50 rounded-xl p-1.5 shrink-0 border border-gray-100 relative">
                      <img src={product.imageUrl} alt={product.name} className="w-full h-full object-contain mix-blend-multiply group-hover:scale-110 transition-transform" />
                    </div>
                    <div className="flex-1 min-w-0 py-1">
                      <h3 className="text-xs font-bold text-gray-800 leading-tight mb-1 line-clamp-2 pr-2">{product.name}</h3>
                      <p className="text-[10px] font-bold text-gray-400 mb-2 uppercase tracking-wider">{product.category}</p>
                      <div className="flex items-center justify-between mt-auto">
                        <span style={{ color: themeColor }} className="text-sm font-black">R$ {product.price.toFixed(2)}</span>
                        <button 
                          onClick={() => handleAddToCart(product)} 
                          style={{ backgroundColor: themeColor }}
                          className="w-8 h-8 text-white rounded-full flex items-center justify-center shadow-sm hover:scale-105 transition-transform"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </main>

            {/* Bottom Navigation Navbar (Agora Fixo e Colorido) */}
            <nav className="shrink-0 w-full bg-white border-t border-gray-100 flex justify-around items-center px-6 py-3 pb-6 z-20 rounded-t-3xl shadow-[0_-10px_30px_rgba(0,0,0,0.08)]">
              <button style={{ color: themeColor }} className="flex flex-col items-center gap-1">
                <LayoutGrid className="w-5 h-5" />
                <span className="text-[9px] font-bold">Início</span>
              </button>
              <button className="flex flex-col items-center gap-1 text-gray-400 transition-colors">
                <Search className="w-5 h-5" />
                <span className="text-[9px] font-bold">Buscar</span>
              </button>
              <button onClick={() => setIsCartOpen(true)} className="flex flex-col items-center gap-1 text-gray-400 transition-colors relative">
                <ShoppingCart className="w-5 h-5" />
                <span className="text-[9px] font-bold">Orçamento</span>
                {cartTotalItems > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold shadow-sm border border-white">
                    {cartTotalItems}
                  </span>
                )}
              </button>
            </nav>
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

          <header style={{ backgroundColor: THEME.primary }} className="w-full sticky top-0 z-40 shadow-md">
            <div className="max-w-[1300px] mx-auto px-4 py-4 sm:py-5 flex items-center justify-between gap-4 sm:gap-8">
              <div className="flex items-center gap-3">
                <button onClick={() => setIsMobileMenuOpen(true)} className="lg:hidden p-1 text-white hover:bg-white/10 rounded"><Menu className="w-6 h-6" /></button>
                <a href="/" className="flex flex-col text-white group outline-none">
                  <span className="text-2xl sm:text-4xl font-extrabold tracking-tighter leading-none group-hover:opacity-90">{settings.businessName.split(' ')[0]}</span>
                  <span className="text-[9px] sm:text-[11px] uppercase tracking-[0.2em] opacity-80">{settings.businessName.split(' ').slice(1).join(' ') || 'Embalagens'}</span>
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
                <button onClick={() => setIsCartOpen(true)} className="flex items-center gap-2 cursor-pointer hover:scale-105 transition-transform relative group">
                  <ShoppingCart className="w-7 h-7 sm:w-8 sm:h-8" />
                  <span className="absolute -top-1.5 -right-1.5 sm:-top-2 sm:-right-2 bg-red-500 text-white text-[10px] sm:text-xs font-bold w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center rounded-full border-2 border-[#357b64]">{cartTotalItems}</span>
                </button>
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
              ) : activeProducts.length === 0 ? (
                 <div className="text-center py-20 text-gray-500 bg-gray-50 rounded-xl border border-dashed border-gray-300">Nenhum produto cadastrado.</div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                  {activeProducts.map((product) => {
                  const pixPrice = product.price * 0.97;
                  return (
                    <article key={product.id} className="bg-white flex flex-col h-full rounded border border-transparent hover:border-gray-200 hover:shadow-xl transition-all duration-300 relative group">
                      <button className="absolute top-3 right-3 z-10 w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center text-gray-400"><Star className="w-4 h-4" /></button>
                      <div className="w-full aspect-square relative p-4 overflow-hidden"><img src={product.imageUrl} alt={product.name} className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500" /></div>
                      <div className="p-4 flex flex-col flex-1 text-center border-t border-gray-50 mt-2">
                        <h3 className="text-sm font-medium text-gray-800 line-clamp-2 min-h-[40px] mb-2">{product.name}</h3>
                        <div className="mt-auto">
                          <div className="flex items-end justify-center gap-2 mb-2"><span className="text-xs text-gray-400 line-through font-medium">R$ {(product.price * 1.1).toFixed(2)}</span><span className="text-xl font-extrabold text-[#357b64]">R$ {product.price.toFixed(2)}</span></div>
                          <div className="bg-[#f2fcf8] border border-[#c4e4d8] rounded py-2 px-1 flex flex-col items-center justify-center mb-4"><span className="text-sm font-bold text-[#357b64] flex items-center gap-1">R$ {pixPrice.toFixed(2)} <span className="text-[10px] font-normal text-gray-600">no pix</span></span></div>
                          <button onClick={() => handleAddToCart(product)} className="w-full bg-[#357b64] hover:bg-[#2c6b56] text-white font-bold text-sm py-3 rounded mb-2">Comprar</button>
                          <button onClick={() => { handleAddToCart(product); setIsCartOpen(true); }} className="w-full bg-white border border-[#357b64] text-[#357b64] hover:bg-gray-50 font-bold text-xs py-2 rounded flex items-center justify-center gap-1.5">Orçamento Fácil <Phone className="w-3.5 h-3.5" /></button>
                        </div>
                      </div>
                    </article>
                  );})}
                </div>
              )}
            </section>
          </main>

          <footer style={{ backgroundColor: THEME.dark }} className="text-gray-300 pt-12 pb-6 text-sm">
            <div className="max-w-[1300px] mx-auto px-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
              <div className="space-y-4"><span className="text-3xl font-extrabold text-white">{settings.businessName}</span><p className="text-xs text-gray-400">Embalagens práticas para seu negócio.</p></div>
              <div className="space-y-4"><h4 className="text-white font-bold">Ligue para nós:</h4><p className="flex items-start gap-2"><Phone className="w-4 h-4" /><strong className="text-white">{settings.whatsappNumber}</strong></p></div>
            </div>
          </footer>
        </div>
      )}

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
                    <input type="text" placeholder="Nome da Empresa / Contato *" value={customerName} onChange={(e) => setCustomerName(e.target.value)} className="w-full h-9 px-3 text-xs bg-white border border-gray-200 rounded focus:border-[#357b64] focus:ring-1 focus:ring-[#357b64] outline-none transition-all" />
                    <div className="grid grid-cols-2 gap-2"><input type="text" placeholder="CNPJ *" value={customerCnpj} onChange={(e) => setCustomerCnpj(e.target.value)} className="w-full h-9 px-3 text-xs bg-white border border-gray-200 rounded focus:border-[#357b64] focus:ring-1 focus:ring-[#357b64] outline-none transition-all" /><select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="w-full h-9 px-3 text-xs bg-white border border-gray-200 rounded focus:border-[#357b64] focus:ring-1 focus:ring-[#357b64] outline-none transition-all text-gray-700"><option value="Pix">Pix</option><option value="Boleto">Boleto a prazo</option><option value="Cartão de Crédito">Cartão de Crédito</option></select></div>
                    <p className="text-[10px] font-black uppercase text-gray-500 tracking-wider mt-4 mb-2">2. Endereço para Frete</p>
                    <div className="relative"><input type="text" maxLength={8} placeholder="CEP (Apenas números) *" value={cep} onChange={handleCepChange} className="w-full h-9 px-3 text-xs bg-white border border-gray-200 rounded focus:border-[#357b64] focus:ring-1 focus:ring-[#357b64] outline-none transition-all" />{isLoadingCep && <div className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 border-2 border-[#357b64] border-t-transparent rounded-full animate-spin"></div>}</div>
                    {address.street && (<><input type="text" value={address.street} readOnly className="w-full h-9 px-3 text-xs bg-gray-100 text-gray-500 border border-gray-200 rounded outline-none cursor-not-allowed" placeholder="Rua / Logradouro" /><div className="grid grid-cols-3 gap-2"><input type="text" placeholder="Número *" value={addressNumber} onChange={(e) => setAddressNumber(e.target.value)} className="col-span-1 w-full h-9 px-3 text-xs bg-white border border-gray-200 rounded focus:border-[#357b64] focus:ring-1 focus:ring-[#357b64] outline-none transition-all" /><input type="text" placeholder="Complemento" value={complement} onChange={(e) => setComplement(e.target.value)} className="col-span-2 w-full h-9 px-3 text-xs bg-white border border-gray-200 rounded focus:border-[#357b64] focus:ring-1 focus:ring-[#357b64] outline-none transition-all" /></div><p className="text-[10px] text-gray-400 font-medium px-1 truncate">{address.neighborhood} - {address.city} / {address.state}</p></>)}
                  </div>
                )}
                <div className="flex justify-between text-sm text-gray-600 mb-1"><span>Subtotal ({cartTotalItems} itens)</span><span className="font-medium">R$ {cartTotalValue.toFixed(2)}</span></div>
                <div className="flex justify-between text-lg font-black text-gray-900 mb-4 border-t border-gray-100 pt-2"><span>Total s/ Frete</span><span className="text-[#357b64]">R$ {cartTotalValue.toFixed(2)}</span></div>
                <button onClick={handleWhatsAppCheckout} disabled={cart.length === 0 || !customerName.trim() || !customerCnpj.trim() || cep.length !== 8 || !addressNumber.trim()} className="w-full py-3.5 bg-[#25D366] hover:bg-[#1DA851] disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed text-white font-extrabold rounded-lg text-xs flex items-center justify-center gap-2 transition-all shadow-md uppercase tracking-wider">
                  <Phone className="w-4 h-4 fill-current" /> Solicitar Orçamento
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