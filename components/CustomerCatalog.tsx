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

  // Evitar Hydration Mismatch
  useEffect(() => setMounted(true), []);

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

  // --- CHECKOUT WHATSAPP ---
  const handleWhatsAppCheckout = () => {
    if (cart.length === 0) return;

    let message = `🛒 *NOVO PEDIDO - ${settings.businessName}*\n\n`;
    message += `Olá! Separei os seguintes itens no carrinho:\n\n`;

    cart.forEach((item, index) => {
      message += `${index + 1}. *${item.product.name}*\n`;
      message += `   Qtd: ${item.quantity}x de R$ ${item.product.price.toFixed(2)}\n`;
      message += `   Subtotal: R$ ${(item.quantity * item.product.price).toFixed(2)}\n\n`;
    });

    message += `💰 *TOTAL A PAGAR: R$ ${cartTotalValue.toFixed(2)}*\n\n`;
    message += `Como funciona o pagamento e o envio?`;

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
    <div className="min-h-screen bg-white text-gray-800 font-sans flex flex-col selection:bg-[#357b64] selection:text-white">
      
      {/* INJEÇÃO ESTRUTURAL DE SEO */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: generateStructuredData() }} />

      {/* 1. TARJA DE PROMOÇÃO (TOPO) */}
      <aside className="bg-[#f0f0f0] border-b border-gray-200 text-center py-1.5 px-4 text-xs font-medium text-gray-700">
        🚚 <strong>Comprou R$ 999,00?</strong> Frete é Grátis! <a href="#" className="underline hover:text-[#357b64]">Clique aqui para saber +</a>
      </aside>

      {/* 2. CABEÇALHO PRINCIPAL */}
      <header style={{ backgroundColor: THEME.primary }} className="w-full sticky top-0 z-40 shadow-md">
        <div className="max-w-[1300px] mx-auto px-4 py-4 sm:py-5 flex items-center justify-between gap-4 sm:gap-8">
          
          {/* Menu Mobile Toggle & Logo */}
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              className="lg:hidden p-1 text-white hover:bg-white/10 rounded"
              aria-label="Abrir Menu"
            >
              <Menu className="w-6 h-6" />
            </button>
            <a href="/" className="flex flex-col text-white group outline-none">
              <span className="text-2xl sm:text-4xl font-extrabold tracking-tighter leading-none group-hover:opacity-90 transition-opacity">
                {settings.businessName.split(' ')[0]}
              </span>
              <span className="text-[9px] sm:text-[11px] uppercase tracking-[0.2em] opacity-80">
                {settings.businessName.split(' ').slice(1).join(' ') || 'Embalagens'}
              </span>
            </a>
          </div>

          {/* Barra de Busca (Desktop & Mobile Adaptive) */}
          <div className="hidden sm:flex flex-1 max-w-2xl relative">
            <input 
              type="search" 
              placeholder="Digite o que você procura" 
              className="w-full h-11 pl-4 pr-12 rounded-full text-sm text-gray-900 bg-white border-none focus:ring-2 focus:ring-emerald-400 outline-none"
            />
            <button className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#357b64]" aria-label="Buscar">
              <Search className="w-5 h-5" />
            </button>
          </div>

          {/* Ícones de Ação (Atendimento, Conta, Carrinho) */}
          <div className="flex items-center gap-4 sm:gap-6 text-white">
            <div className="hidden lg:flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity">
              <HeadphonesIcon className="w-6 h-6 opacity-90" />
              <div className="flex flex-col leading-tight">
                <span className="text-[11px] font-medium opacity-80">Central de</span>
                <span className="text-xs font-bold flex items-center gap-1">Atendimento <ChevronDown className="w-3 h-3" /></span>
              </div>
            </div>

            <div className="hidden lg:flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity">
              <User className="w-6 h-6 opacity-90" />
              <div className="flex flex-col leading-tight">
                <span className="text-[11px] font-medium opacity-80">Bem-vindo(a)</span>
                <span className="text-xs font-bold">Entrar ou Cadastrar <ChevronDown className="inline w-3 h-3" /></span>
              </div>
            </div>

            <button 
              onClick={() => setIsCartOpen(true)}
              className="flex items-center gap-2 cursor-pointer hover:scale-105 transition-transform relative group"
              aria-label="Abrir Carrinho"
            >
              <ShoppingCart className="w-7 h-7 sm:w-8 sm:h-8" />
              <span className="absolute -top-1.5 -right-1.5 sm:-top-2 sm:-right-2 bg-red-500 text-white text-[10px] sm:text-xs font-bold w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center rounded-full border-2 border-[#357b64]">
                {cartTotalItems}
              </span>
            </button>
          </div>
        </div>

        {/* Busca Mobile (Aparece apenas em telas pequenas) */}
        <div className="sm:hidden px-4 pb-4">
          <div className="relative w-full">
            <input 
              type="search" 
              placeholder="O que você procura?" 
              className="w-full h-10 pl-4 pr-10 rounded-full text-sm text-gray-900 bg-white border-none outline-none"
            />
            <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
          </div>
        </div>
      </header>

      {/* 3. MENU DE NAVEGAÇÃO SECUNDÁRIO (DESKTOP) */}
      <nav style={{ backgroundColor: THEME.secondary }} className="hidden lg:block text-white shadow-inner">
        <div className="max-w-[1300px] mx-auto px-4 flex items-center gap-8 text-[13px] font-semibold h-12">
          <button className="flex items-center gap-2 hover:opacity-80 h-full">
            <LayoutGrid className="w-4 h-4" /> Todas as categorias <ChevronDown className="w-3 h-3" />
          </button>
          {categories.slice(0, 4).map(cat => (
            <a key={cat} href={`#${cat}`} className="hover:opacity-80 flex items-center gap-1 transition-opacity">
              {cat} <ChevronDown className="w-3 h-3 opacity-50" />
            </a>
          ))}
        </div>
      </nav>

      {/* 4. CONTEÚDO PRINCIPAL DA LOJA */}
      <main className="flex-1 w-full max-w-[1300px] mx-auto px-4 py-6 sm:py-10 space-y-12 sm:space-y-16">
        
        {/* Banners Hero */}
        <section aria-label="Banners Promocionais" className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-900 aspect-[16/9] md:aspect-auto md:h-[300px] rounded flex flex-col justify-center p-8 text-white relative overflow-hidden group cursor-pointer">
            <div className="absolute inset-0 bg-[#1a1a1a] group-hover:scale-105 transition-transform duration-700 z-0"></div>
            <div className="relative z-10">
              <p className="text-sm font-medium mb-1 opacity-80">Sua embalagem também comunica.</p>
              <h2 className="text-3xl font-extrabold mb-4 leading-tight">SUA<br/>MARCA<br/>AQUI.</h2>
              <span className="inline-block px-4 py-2 bg-white/10 border border-white/20 text-xs font-bold uppercase tracking-wider backdrop-blur-sm">Ver Modelos</span>
            </div>
          </div>
          <div className="bg-[#e9f5f1] aspect-[16/9] md:aspect-auto md:h-[300px] rounded flex flex-col items-center justify-center p-6 text-center cursor-pointer border border-[#c4e4d8]">
            <h2 className="text-[#357b64] text-4xl font-black mb-1 tracking-tight">FRETE GRÁTIS!</h2>
            <p className="text-[#357b64] text-xl font-bold mb-2">COMPRAS ACIMA DE</p>
            <p className="text-[#357b64] text-5xl font-black mb-2">R$ 999,00</p>
            <p className="text-[#357b64] text-xs font-medium">*Consulte as regras.</p>
          </div>
          <div className="bg-[#1f1d1b] aspect-[16/9] md:aspect-auto md:h-[300px] rounded flex flex-col justify-center p-8 text-[#e3cda8] relative overflow-hidden cursor-pointer group">
            <div className="relative z-10">
              <h2 className="text-3xl font-black mb-2 leading-none">TALHERES<br/>DE MADEIRA</h2>
              <p className="text-sm font-bold opacity-90 mb-4 tracking-widest uppercase">Práticos e Sustentáveis</p>
              <span className="inline-block px-4 py-2 bg-[#357b64] text-white text-xs font-bold uppercase tracking-wider">Ver Opções</span>
            </div>
          </div>
        </section>

        {/* VITRINE DE PRODUTOS */}
        <section aria-labelledby="vitrine-destaques">
          <h2 id="vitrine-destaques" className="text-2xl sm:text-3xl font-bold text-[#357b64] text-center mb-8">
            Últimos Lançamentos
          </h2>
          
          {loading ? (
             <div className="flex flex-col items-center justify-center py-20 space-y-4">
               <div className="w-12 h-12 border-4 border-[#357b64] border-t-transparent rounded-full animate-spin"></div>
               <p className="text-gray-500 font-bold">Carregando catálogo diretamente do banco de dados...</p>
             </div>
          ) : activeProducts.length === 0 ? (
             <div className="text-center py-20 text-gray-500 bg-gray-50 rounded-xl border border-dashed border-gray-300">
               Nenhum produto cadastrado no momento.
             </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              {activeProducts.map((product) => {

              const pixDiscount = 3; 
              const pixPrice = product.price * (1 - (pixDiscount / 100));

              return (
                <article 
                  key={product.id} 
                  className="bg-white flex flex-col h-full rounded border border-transparent hover:border-gray-200 hover:shadow-xl transition-all duration-300 relative group"
                  itemScope itemType="https://schema.org/Product"
                >
                  <div className="absolute top-3 left-3 z-10 flex flex-col gap-1">
                    {product.stock <= 10 && (
                      <span className="bg-rose-500 text-white text-[10px] font-bold w-10 h-10 rounded-full flex items-center justify-center leading-none text-center shadow-sm">
                        {pixDiscount}%<br/>OFF
                      </span>
                    )}
                  </div>
                  <button className="absolute top-3 right-3 z-10 w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center text-gray-400 transition-colors" aria-label="Favoritar">
                    <Star className="w-4 h-4" />
                  </button>

                  <div className="w-full aspect-square relative p-4 bg-white overflow-hidden">
                    <img 
                      src={product.imageUrl} 
                      alt={product.name} 
                      itemProp="image"
                      className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>

                  <div className="p-4 flex flex-col flex-1 text-center border-t border-gray-50 mt-2">
                    <h3 itemProp="name" className="text-sm font-medium text-gray-800 line-clamp-2 min-h-[40px] mb-2">
                      {product.name}
                    </h3>
                    
                    <div className="flex items-center justify-center gap-0.5 text-gray-300 mb-3">
                      {[1,2,3,4,5].map(i => <Star key={i} className="w-3 h-3 fill-current" />)}
                      <span className="text-[10px] ml-1">(0)</span>
                    </div>

                    <div itemProp="offers" itemScope itemType="https://schema.org/Offer" className="mt-auto">
                      <meta itemProp="priceCurrency" content="BRL" />
                      <meta itemProp="availability" content={product.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock"} />
                      
                      <div className="flex items-end justify-center gap-2 mb-2">
                        <span className="text-xs text-gray-400 line-through font-medium">R$ {(product.price * 1.1).toFixed(2)}</span>
                        <span itemProp="price" content={product.price.toString()} className="text-xl font-extrabold text-[#357b64]">
                          R$ {product.price.toFixed(2)}
                        </span>
                      </div>

                      <div className="bg-[#f2fcf8] border border-[#c4e4d8] rounded py-2 px-1 flex flex-col items-center justify-center mb-4">
                        <span className="text-sm font-bold text-[#357b64] flex items-center gap-1">
                           R$ {pixPrice.toFixed(2)} <span className="text-[10px] font-normal text-gray-600">no pix</span>
                        </span>
                        <span className="text-[10px] text-gray-500">com {pixDiscount}% de desconto</span>
                      </div>

                      <div className="flex flex-col gap-2">
                        <button 
                          onClick={() => handleAddToCart(product)}
                          className="w-full bg-[#357b64] hover:bg-[#2c6b56] text-white font-bold text-sm py-3 rounded transition-colors"
                        >
                          Comprar
                        </button>
                        <button 
                          onClick={() => { handleAddToCart(product); setIsCartOpen(true); }}
                          className="w-full bg-white border border-[#357b64] text-[#357b64] hover:bg-gray-50 font-bold text-xs py-2 rounded flex items-center justify-center gap-1.5 transition-colors"
                        >
                          Comprar pelo whatsapp <Phone className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
            </div>
          )}
        </section>

      </main>

      {/* 5. NEWSLETTER E-E-A-T */}
      <section className="bg-[#2a2a2a] pt-12 pb-8 border-b border-gray-800" aria-label="Newsletter">
        <div className="max-w-[1300px] mx-auto px-4 text-center">
          <h3 className="text-white font-bold text-lg mb-1">Cadastre-se e ganhe R$ 15,00 de desconto! ✌️</h3>
          <p className="text-gray-400 text-xs mb-6">É a sua primeira compra em nosso e-commerce? Aproveite este desconto especial que reservamos para você! cadastre seu e-mail 😁</p>
          <div className="max-w-md mx-auto relative flex">
            <input 
              type="email" 
              placeholder="Digite seu email" 
              className="w-full h-11 bg-gray-200 text-gray-900 text-sm px-4 rounded-l outline-none"
            />
            <button className="h-11 bg-gray-300 hover:bg-gray-400 text-gray-700 px-4 rounded-r font-medium transition-colors">
              Assinar
            </button>
          </div>
        </div>
      </section>

      {/* 6. RODAPÉ ESTILO LOJA INTEGRADA */}
      <footer style={{ backgroundColor: THEME.dark }} className="text-gray-300 pt-12 pb-6 text-sm" itemScope itemType="https://schema.org/Store">
        <div className="max-w-[1300px] mx-auto px-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
          
          <div className="space-y-4">
            <span className="text-3xl font-extrabold text-white">{settings.businessName.split(' ')[0]}</span>
            <p className="text-xs text-gray-400 leading-relaxed pr-4">
              A {settings.businessName} chega até você com embalagens práticas para seu negócio, com produtos de qualidade e de baixo custo, e variedade para todos os gostos.
            </p>
          </div>

          <div className="space-y-4">
            <h4 className="text-white font-bold mb-4">Ligue para nós:</h4>
            <div className="space-y-3 text-xs">
              <p className="flex items-start gap-2">
                <Phone className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="flex flex-col">
                  <strong className="text-sm text-white">{settings.whatsappNumber}</strong>
                  <span className="text-gray-400">Comercial Vendas</span>
                </span>
              </p>
              <h4 className="text-white font-bold pt-2">E-mail:</h4>
              <p className="flex items-center gap-2 text-white font-medium">
                <Mail className="w-4 h-4" /> {STORE_TRUST_DATA.email}
              </p>
              <h4 className="text-white font-bold pt-2">Horário de atendimento:</h4>
              <p className="text-gray-400">{STORE_TRUST_DATA.supportHours}</p>
            </div>
            <button className="mt-4 bg-white text-gray-900 w-full py-2.5 rounded text-xs font-bold hover:bg-gray-100 transition-colors flex justify-center items-center gap-2">
              <Mail className="w-4 h-4" /> Enviar mensagem
            </button>
          </div>

          <div>
            <h4 className="text-white font-bold mb-4">Institucional</h4>
            <ul className="space-y-2 text-xs font-medium">
              <li><a href="#" className="hover:text-white transition-colors">Sobre</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Segurança</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Política de privacidade</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Política de trocas e devoluções</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Formas de envio</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Formas de pagamento</a></li>
            </ul>
          </div>

          <div>
            <div className="bg-white p-4 rounded mb-6 flex items-center gap-3">
              <div className="w-10 h-10 bg-[#357b64] rounded-full flex items-center justify-center text-white font-bold">
                {settings.businessName.charAt(0)}
              </div>
              <div>
                <p className="text-gray-900 font-bold text-sm leading-tight">{settings.businessName}</p>
                <p className="text-gray-500 text-[10px]">10 mil seguidores</p>
              </div>
            </div>
            <div className="flex gap-2">
              {/* SVG Instagram Nativo */}
              <a href="#" className="w-8 h-8 rounded-full bg-[#357b64] flex items-center justify-center text-white hover:bg-[#2c6b56] transition-colors" aria-label="Instagram">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
              </a>
              {/* SVG Facebook Nativo */}
              <a href="#" className="w-8 h-8 rounded-full bg-[#357b64] flex items-center justify-center text-white hover:bg-[#2c6b56] transition-colors" aria-label="Facebook">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path></svg>
              </a>
            </div>
          </div>
        </div>

        <div className="bg-white text-gray-900 py-8 border-t border-gray-200">
          <div className="max-w-[1300px] mx-auto px-4 grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <div>
              <h5 className="font-bold mb-3 text-sm">Formas de pagamento</h5>
              <div className="flex gap-2 flex-wrap">
                {['Visa', 'Master', 'Elo', 'Pix'].map(b => (
                  <span key={b} className="px-2 py-1 border border-gray-300 rounded text-[10px] font-bold text-gray-500 uppercase tracking-wider">{b}</span>
                ))}
              </div>
            </div>
            <div>
              <h5 className="font-bold mb-3 text-sm">Selos de segurança</h5>
              <div className="flex gap-3">
                <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 border border-emerald-200 bg-emerald-50 px-2 py-1 rounded">
                  <ShieldCheck className="w-4 h-4" /> SITE PROTEGIDO
                </span>
                <span className="flex items-center gap-1 text-[10px] font-bold text-blue-600 border border-blue-200 bg-blue-50 px-2 py-1 rounded">
                  <CheckCircle2 className="w-4 h-4" /> GOOGLE SAFE
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-[#f7f7f7] text-gray-500 py-4 text-[11px] border-t border-gray-200">
          <div className="max-w-[1300px] mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-4">
            <p itemProp="address">{settings.businessName} - © Todos os direitos reservados. {new Date().getFullYear()} - CNPJ: {STORE_TRUST_DATA.cnpj}</p>
            <p className="flex items-center gap-1">
              Plataforma: <strong className="text-gray-800">Velo Varejo SaaS</strong>
            </p>
          </div>
        </div>
      </footer>

      {/* 7. BOTÃO FLUTUANTE WHATSAPP (FAB) */}
      <a 
        href={`https://wa.me/${settings.whatsappNumber.replace(/\D/g, '')}?text=Olá,%20vim%20pelo%20site!`}
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-40 bg-[#25D366] hover:bg-[#1DA851] text-white p-4 rounded-full shadow-2xl hover:scale-110 transition-transform flex items-center justify-center focus:outline-none focus:ring-4 focus:ring-green-300"
        aria-label="Falar no WhatsApp"
      >
        <Phone className="w-8 h-8 fill-current" />
      </a>

      {/* 8. DRAWER DO CARRINHO LATERAL (FRAMER MOTION) */}
      <AnimatePresence>
        {isCartOpen && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-end"
            onClick={() => setIsCartOpen(false)}
          >
            <motion.div 
              initial={{ x: '100%' }} 
              animate={{ x: 0 }} 
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full sm:w-[400px] h-full bg-white shadow-2xl flex flex-col"
            >
              <div style={{ backgroundColor: THEME.primary }} className="p-4 flex items-center justify-between text-white shadow-md">
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5" /> Meu Carrinho
                </h3>
                <button onClick={() => setIsCartOpen(false)} className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
                {cart.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-50">
                    <ShoppingCart className="w-16 h-16 text-gray-400" />
                    <p className="text-sm font-medium text-gray-600">Sua sacola está vazia.</p>
                  </div>
                ) : (
                  <ul className="space-y-3">
                    {cart.map((item) => (
                      <li key={item.product.id} className="flex gap-3 bg-white border border-gray-200 rounded p-3 shadow-sm">
                        <div className="w-16 h-16 bg-gray-100 rounded overflow-hidden shrink-0">
                          <img src={item.product.imageUrl} alt={item.product.name} className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1 flex flex-col justify-between min-w-0">
                          <div>
                            <h4 className="text-xs font-bold text-gray-800 truncate">{item.product.name}</h4>
                            <p className="text-sm font-extrabold text-[#357b64] mt-0.5">R$ {item.product.price.toFixed(2)}</p>
                          </div>
                          <div className="flex items-center justify-between mt-2">
                            <div className="flex items-center border border-gray-300 rounded overflow-hidden">
                              <button onClick={() => handleUpdateQuantity(item.product.id, -1)} className="px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors"><Minus className="w-3 h-3" /></button>
                              <span className="text-xs font-bold w-8 text-center bg-white">{item.quantity}</span>
                              <button onClick={() => handleUpdateQuantity(item.product.id, 1)} disabled={item.quantity >= item.product.stock} className="px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-600 disabled:opacity-50 transition-colors"><Plus className="w-3 h-3" /></button>
                            </div>
                            <button onClick={() => handleRemoveItem(item.product.id)} className="text-gray-400 hover:text-red-500 transition-colors p-1"><Trash2 className="w-4 h-4" /></button>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="p-5 border-t border-gray-200 bg-white shadow-[0_-10px_20px_rgba(0,0,0,0.05)]">
                <div className="flex justify-between text-sm text-gray-600 mb-2">
                  <span>Subtotal ({cartTotalItems} itens)</span>
                  <span className="font-medium">R$ {cartTotalValue.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-lg font-black text-gray-900 mb-5 border-t border-gray-100 pt-2">
                  <span>Total</span>
                  <span className="text-[#357b64]">R$ {cartTotalValue.toFixed(2)}</span>
                </div>
                <button
                  onClick={handleWhatsAppCheckout}
                  disabled={cart.length === 0}
                  className="w-full py-3.5 bg-[#25D366] hover:bg-[#1DA851] disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-extrabold rounded text-sm flex items-center justify-center gap-2 transition-all shadow-md uppercase tracking-wider"
                >
                  <Phone className="w-4 h-4 fill-current" />
                  Finalizar no WhatsApp
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MENU MOBILE LATERAL (SIMPLES) */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-50 flex"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <motion.div 
              initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }}
              className="w-[80%] max-w-sm h-full bg-white flex flex-col"
              onClick={e => e.stopPropagation()}
            >
              <div style={{ backgroundColor: THEME.primary }} className="p-4 flex items-center justify-between text-white">
                <span className="font-bold">Menu</span>
                <button onClick={() => setIsMobileMenuOpen(false)}><X className="w-6 h-6" /></button>
              </div>
              <nav className="flex-1 overflow-y-auto py-2">
                <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center gap-3">
                  <User className="w-5 h-5 text-gray-500" />
                  <span className="text-sm font-bold text-gray-800">Entrar ou Cadastrar</span>
                </div>
                {categories.map(cat => (
                  <a key={cat} href={`#${cat}`} className="block px-4 py-3 border-b border-gray-100 text-sm font-medium text-gray-700">
                    {cat}
                  </a>
                ))}
              </nav>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}