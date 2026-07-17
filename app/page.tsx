"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Rocket, Store, MessageSquare, BarChart3, CheckCircle2, 
  ChevronRight, Menu, X, Sparkles, MapPin, Smartphone, ShieldCheck
} from 'lucide-react';
import { FaGoogle } from 'react-icons/fa6';
import Link from 'next/link';

export default function LandingPage() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Muda o visual da Navbar ao rolar a página
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const features = [
    {
      icon: <Store className="text-blue-600" size={32} />,
      title: 'Catálogo Dinâmico e Webview',
      desc: 'Sua loja otimizada ao extremo para celulares. Templates focados em conversão para varejo, alimentação e serviços.'
    },
    {
      icon: <MessageSquare className="text-green-500" size={32} />,
      title: 'WhatsApp Bot + IA',
      desc: 'Atendimento no piloto automático. A IA responde clientes, recupera carrinhos abandonados e avisa sobre o status do pedido.'
    },
    {
      icon: <MapPin className="text-red-500" size={32} />,
      title: 'Google Meu Negócio (SEO)',
      desc: 'Integração direta! O sistema posta suas ofertas e sincroniza avaliações automaticamente para você dominar as buscas locais.'
    },
    {
      icon: <BarChart3 className="text-purple-500" size={32} />,
      title: 'Velo Insights (Consultoria IA)',
      desc: 'Seu painel analisa as métricas de vendas e visitas, e uma Inteligência Artificial gera um plano de ação diário para você crescer.'
    }
  ];

  const plans = [
    {
      name: 'Grátis',
      desc: 'O essencial para digitalizar seu negócio e atrair clientes.',
      price: '0,00',
      features: ['Cadastro Simplificado no Google Meu Negócio', 'Até 50 Produtos no Catálogo', 'Recebimento de Pedidos no WhatsApp'],
      highlight: false
    },
    {
      name: 'Plano Pro',
      desc: 'O Start-up do Digital. Automação para quem quer vender mais.',
      price: '99,90',
      features: ['Produtos Ilimitados', 'Pagamentos Online (Pix/Cartão)', 'Automação de WhatsApp (Bot)', 'IA Copywriter para Produtos'],
      highlight: false
    },
    {
      name: 'Business',
      desc: 'Foco total em conversão e recuperação de vendas.',
      price: '199,90',
      features: ['Tudo do Plano Pro', 'Layouts Inteligentes (Temas Especiais)', 'Recuperação de Carrinho Abandonado (Bot)', 'PDV Frente de Caixa Integrado'],
      highlight: true
    },
    {
      name: 'Enterprise',
      desc: 'Crescimento escalonado. Deixe a burocracia com a gente.',
      price: '299,90',
      features: ['Tudo do Plano Business', 'Emissão Fiscal (NFC-e Automática)', 'Gamificação, Roleta e Clube VIP', 'Integração Meta Ads / Google Ads', 'GA4 e Relatórios Analíticos (IA)'],
      highlight: false
    }
  ];

  // --- MOTOR SEO E GEO: DADOS ESTRUTURADOS PARA O GOOGLE E IAs ---
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": "https://veloloja.com.br/#organization",
        "name": "Velo Loja Virtual",
        "url": "https://veloloja.com.br",
        "logo": "https://veloloja.com.br/velo loja virtual logo.png",
        "description": "Plataforma SaaS de E-commerce e Delivery com Inteligência Artificial, Automação de WhatsApp e Integração com Google Meu Negócio.",
        "sameAs": [
          "https://instagram.com/veloloja",
          "https://facebook.com/veloloja"
        ]
      },
      {
        "@type": "SoftwareApplication",
        "@id": "https://veloloja.com.br/#software",
        "name": "Velo Loja Virtual SaaS",
        "applicationCategory": "BusinessApplication",
        "operatingSystem": "Web, iOS, Android",
        "description": "Crie sua loja virtual grátis. Catálogo digital, gestão de estoque, PDV de balcão e robô de atendimento via WhatsApp.",
        "provider": {
          "@id": "https://veloloja.com.br/#organization"
        },
        "offers": {
          "@type": "AggregateOffer",
          "priceCurrency": "BRL",
          "lowPrice": "0.00",
          "highPrice": "299.90",
          "offerCount": "4",
          "offers": [
            { "@type": "Offer", "name": "Plano Gratuito", "price": "0.00", "priceCurrency": "BRL" },
            { "@type": "Offer", "name": "Plano Pro", "price": "99.90", "priceCurrency": "BRL" },
            { "@type": "Offer", "name": "Plano Business", "price": "199.90", "priceCurrency": "BRL" },
            { "@type": "Offer", "name": "Plano Enterprise", "price": "299.90", "priceCurrency": "BRL" }
          ]
        }
      }
    ]
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 selection:bg-blue-600 selection:text-white">
      {/* INJEÇÃO INVISÍVEL PARA OS ROBÔS DO GOOGLE */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />

      {/* NAVEGAÇÃO (HEADER) */}
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled ? 'bg-white/80 backdrop-blur-md shadow-sm py-4' : 'bg-transparent py-6'}`}>
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center overflow-hidden shadow-sm border-2 border-gray-50 p-1">
              <img src="/velo loja virtual logo.png" alt="Velo Loja Virtual" className="w-full h-full object-contain" />
            </div>
            <span className="font-black text-xl tracking-tighter uppercase text-slate-800">Velo Loja</span>
          </div>

          {/* Links Desktop */}
          <nav className="hidden md:flex items-center gap-8 font-bold text-sm text-slate-600">
            <a href="#funcionalidades" className="hover:text-blue-600 transition-colors">Funcionalidades</a>
            <a href="#planos" className="hover:text-blue-600 transition-colors">Planos</a>
            <a href="#contato" className="hover:text-blue-600 transition-colors">Contato</a>
          </nav>

          <div className="hidden md:flex items-center gap-4">
            <Link href="/login" className="font-black text-sm text-slate-600 hover:text-slate-900 transition-colors">
              Entrar
            </Link>
            <Link href="/login" className="bg-blue-600 text-white px-6 py-3 rounded-full font-black text-sm uppercase tracking-widest shadow-lg shadow-blue-600/30 hover:bg-blue-700 active:scale-95 transition-all">
              Criar Loja Grátis
            </Link>
          </div>

          {/* Botão Mobile */}
          <button className="md:hidden text-slate-800" onClick={() => setIsMobileMenuOpen(true)}>
            <Menu size={28} />
          </button>
        </div>
      </header>

      {/* MENU MOBILE */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/90 backdrop-blur-md z-[100] flex flex-col items-center justify-center p-6 text-center">
            <button onClick={() => setIsMobileMenuOpen(false)} className="absolute top-6 right-6 text-white"><X size={32}/></button>
            <div className="flex flex-col gap-8 text-white font-black text-2xl uppercase tracking-widest">
              <a href="#funcionalidades" onClick={() => setIsMobileMenuOpen(false)}>Funcionalidades</a>
              <a href="#planos" onClick={() => setIsMobileMenuOpen(false)}>Planos</a>
              <Link href="/login" onClick={() => setIsMobileMenuOpen(false)}>Entrar no Painel</Link>
              <Link href="/login" className="bg-blue-600 text-white px-8 py-4 rounded-full shadow-lg shadow-blue-600/50 mt-4" onClick={() => setIsMobileMenuOpen(false)}>Criar Loja Grátis</Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* HERO SECTION */}
      <section className="relative pt-40 pb-20 lg:pt-48 lg:pb-32 px-6 overflow-hidden">
        {/* Background Gradients Mágicos */}
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-400 rounded-full blur-[120px] opacity-20 pointer-events-none"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-400 rounded-full blur-[120px] opacity-20 pointer-events-none"></div>

        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-12 relative z-10">
          <div className="flex-1 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-100 text-blue-700 px-4 py-2 rounded-full font-black text-[10px] uppercase tracking-widest shadow-sm mb-6 animate-in fade-in slide-in-from-bottom-2">
              <Sparkles size={14}/> Plataforma All-in-One para Lojistas
            </div>
            <h1 className="text-5xl lg:text-7xl font-black italic tracking-tighter uppercase text-slate-900 leading-[0.9] mb-6 animate-in fade-in slide-in-from-bottom-3">
              Venda mais no <span className="text-blue-600">Piloto Automático.</span>
            </h1>
            <p className="text-lg text-slate-600 font-medium mb-10 max-w-2xl mx-auto lg:mx-0 leading-relaxed animate-in fade-in slide-in-from-bottom-4">
              Tenha um catálogo digital focado em conversão, recupere carrinhos via WhatsApp Bot e domine as buscas do Google Meu Negócio. Tudo integrado em um único painel inteligente.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 animate-in fade-in slide-in-from-bottom-5">
              <Link href="/login" className="w-full sm:w-auto bg-slate-900 hover:bg-slate-800 text-white px-8 py-5 rounded-full font-black text-sm uppercase tracking-widest shadow-2xl transition-all active:scale-95 flex items-center justify-center gap-2">
                Começar Grátis Agora <ChevronRight size={18}/>
              </Link>
              <a href="#planos" className="w-full sm:w-auto bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-8 py-5 rounded-full font-black text-sm uppercase tracking-widest shadow-sm transition-all active:scale-95 text-center">
                Ver Planos
              </a>
            </div>
            <p className="text-xs font-bold text-slate-400 mt-4 flex items-center justify-center lg:justify-start gap-1">
              <ShieldCheck size={14}/> Sem cartão de crédito. Cancele quando quiser.
            </p>
          </div>

          {/* MOCKUP VISUAL */}
          <div className="flex-1 w-full relative animate-in fade-in zoom-in duration-700">
            <div className="relative mx-auto w-[280px] h-[580px] bg-slate-900 rounded-[3rem] border-[8px] border-slate-800 shadow-[0_20px_50px_-10px_rgba(0,0,0,0.3)] overflow-hidden z-20 flex justify-center">
              <div className="absolute top-0 w-32 h-6 bg-slate-800 rounded-b-3xl z-30"></div>
              
              {/* Fake UI do App Cliente (Mantido estrategicamente como Skeleton Loader) */}
              <div className="w-full h-full bg-slate-50 flex flex-col relative pt-8 px-4">
                <div className="w-full h-12 bg-white rounded-xl mb-4 shadow-sm flex items-center px-3 gap-2">
                  <div className="w-6 h-6 bg-blue-600 rounded-full"></div>
                  <div className="h-2 w-24 bg-slate-200 rounded-full"></div>
                </div>
                <div className="w-full h-32 bg-blue-600 rounded-2xl mb-4 shadow-sm p-4 relative overflow-hidden">
                    <div className="h-3 w-32 bg-white/30 rounded-full mb-2"></div>
                    <div className="h-6 w-24 bg-white rounded-full"></div>
                    <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-white/10 rounded-full blur-md"></div>
                </div>
                <div className="grid grid-cols-2 gap-2 mb-4">
                   <div className="h-24 bg-white rounded-xl shadow-sm border border-slate-100"></div>
                   <div className="h-24 bg-white rounded-xl shadow-sm border border-slate-100"></div>
                   <div className="h-24 bg-white rounded-xl shadow-sm border border-slate-100"></div>
                   <div className="h-24 bg-white rounded-xl shadow-sm border border-slate-100"></div>
                </div>
              </div>

              {/* IMAGEM REALISTA DA INTERFACE */}
              <motion.img 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 1.2, delay: 0.8, ease: "easeOut" }}
                src="/tela-app.png" 
                alt="Interface do Aplicativo Velo Loja"
                className="absolute inset-0 w-full h-full object-cover object-top z-20 pointer-events-none"
              />
            </div>

            {/* Elementos Flutuantes (Decoração) */}
            <motion.div animate={{ y: [-10, 10, -10] }} transition={{ repeat: Infinity, duration: 4 }} className="absolute top-10 left-0 lg:-left-10 bg-white p-4 rounded-2xl shadow-xl border border-slate-100 z-30 flex items-center gap-3">
              <div className="bg-green-100 p-2 rounded-full text-green-600"><MessageSquare size={20}/></div>
              <div>
                <p className="text-[10px] font-black uppercase text-slate-400">WhatsApp Bot</p>
                <p className="text-xs font-bold text-slate-800">Venda Recuperada!</p>
              </div>
            </motion.div>

            <motion.div animate={{ y: [10, -10, 10] }} transition={{ repeat: Infinity, duration: 5 }} className="absolute bottom-20 right-0 lg:-right-10 bg-white p-4 rounded-2xl shadow-xl border border-slate-100 z-30 flex items-center gap-3">
              <div className="bg-blue-100 p-2 rounded-full text-blue-600"><FaGoogle className="w-5 h-5"/></div>
              <div>
                <p className="text-[10px] font-black uppercase text-slate-400">Google Maps</p>
                <p className="text-xs font-bold text-slate-800">Nova Avaliação 5⭐</p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* FUNCIONALIDADES */}
      <section id="funcionalidades" className="py-24 bg-white border-y border-slate-100">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-5xl font-black italic tracking-tighter uppercase text-slate-900 mb-4">
              Por que escolher a Velo?
            </h2>
            <p className="text-slate-500 font-medium text-lg max-w-2xl mx-auto">
              Substituímos 4 ferramentas diferentes por um único painel pensado para o dono do negócio lucrar e ter paz.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feat, index) => (
              <div key={index} className="bg-slate-50 p-8 rounded-[2.5rem] border border-slate-100 hover:shadow-lg hover:border-blue-200 transition-all group">
                <div className="bg-white w-16 h-16 rounded-2xl flex items-center justify-center shadow-sm mb-6 group-hover:scale-110 transition-transform">
                  {feat.icon}
                </div>
                <h3 className="text-xl font-black uppercase text-slate-800 mb-3 leading-tight">{feat.title}</h3>
                <p className="text-sm font-medium text-slate-500 leading-relaxed">{feat.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PLANOS DE ASSINATURA */}
      <section id="planos" className="py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-5xl font-black italic tracking-tighter uppercase text-slate-900 mb-4">
              Planos sem pegadinhas.
            </h2>
            <p className="text-slate-500 font-medium text-lg max-w-xl mx-auto">
              Não cobramos comissão sobre suas vendas. Você paga apenas pela tecnologia. Cancele quando quiser.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
            {plans.map((plan, idx) => (
              <div key={idx} className={`relative bg-white rounded-[3rem] p-6 lg:p-8 flex flex-col transition-all ${plan.highlight ? 'border-4 border-blue-600 shadow-2xl lg:scale-105 z-10' : 'border border-slate-200 shadow-sm hover:border-slate-300'}`}>
                {plan.highlight && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-md">
                    Mais Escolhido
                  </div>
                )}
                <div className="mb-8">
                  <h3 className={`text-2xl font-black italic uppercase ${plan.highlight ? 'text-blue-600' : 'text-slate-800'}`}>{plan.name}</h3>
                  <p className="text-xs font-bold text-slate-400 mt-2 h-8">{plan.desc}</p>
                </div>
                <div className="mb-8">
                  <span className="text-sm font-bold text-slate-500">R$</span>
                  <span className="text-5xl font-black italic text-slate-900 ml-1">{plan.price}</span>
                  <span className="text-sm font-bold text-slate-500">/mês</span>
                </div>
                <ul className="space-y-4 mb-8 flex-1">
                  {plan.features.map((feature, fIdx) => (
                    <li key={fIdx} className="flex items-start gap-3 text-sm font-bold text-slate-600">
                      <CheckCircle2 size={18} className={`${plan.highlight ? 'text-blue-600' : 'text-green-500'} flex-shrink-0 mt-0.5`} />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Link href="/login" className={`w-full py-5 rounded-full font-black uppercase tracking-widest text-xs text-center transition-all shadow-lg active:scale-95 ${plan.highlight ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-slate-900 text-white hover:bg-slate-800'}`}>
                  Assinar {plan.name}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer id="contato" className="bg-slate-900 text-slate-400 py-16 border-t-[10px] border-blue-600">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-12 text-center md:text-left">
          
          <div className="flex flex-col items-center md:items-start gap-4">
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center overflow-hidden p-1.5 shadow-md">
              <img src="/velo loja virtual logo.png" alt="Velo Loja Virtual" className="w-full h-full object-contain" />
            </div>
            <h4 className="text-white font-black uppercase tracking-widest text-lg">Velo Loja Virtual</h4>
            <p className="text-sm font-medium leading-relaxed max-w-xs">
              A plataforma SaaS definitiva para lojistas que querem vender mais usando tecnologia e inteligência artificial.
            </p>
          </div>

          <div className="flex flex-col gap-3 font-bold text-sm">
            <h4 className="text-white font-black uppercase tracking-widest text-xs mb-2">Produto</h4>
            <Link href="#funcionalidades" className="hover:text-white transition-colors">Funcionalidades</Link>
            <Link href="#planos" className="hover:text-white transition-colors">Preços</Link>
            <Link href="/login" className="hover:text-white transition-colors">Acessar Painel</Link>
          </div>

          <div className="flex flex-col gap-3 font-bold text-sm">
            <h4 className="text-white font-black uppercase tracking-widest text-xs mb-2">Legal</h4>
            <Link href="/termos" className="hover:text-white transition-colors">Termos de Uso</Link>
            <Link href="/privacidade" className="hover:text-white transition-colors">Política de Privacidade</Link>
            <p className="mt-4 text-xs font-medium">© {new Date().getFullYear()} Velo Loja Virtual. Todos os direitos reservados.</p>
          </div>

        </div>
      </footer>
    </div>
  );
}