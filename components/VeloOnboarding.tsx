"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckCircle2, Building2, Palette, MessageSquare, 
  ShoppingBag, Star, ArrowRight, ArrowLeft, UploadCloud, 
  MapPin, Sparkles, Loader2, Save, Search, EyeOff, Flame
} from 'lucide-react';
import { FaGoogle as FaGoogleIcon } from 'react-icons/fa6';

interface VeloOnboardingProps {
  settingsForm: any;
  setSettingsForm: any;
  saveSettings: (e: React.FormEvent) => void;
  setActivePanel: (panel: 'dashboard' | 'products' | 'categories' | 'orders' | 'chats' | 'settings' | 'google_business' | 'finance') => void;
  handleLogoUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isUploadingLogo: boolean;
  onFinish: () => void;
  addProduct: (product: any) => Promise<void>;
  uploadImageToCloudinary: (file: File) => Promise<string>;
}

export default function VeloOnboarding({
  settingsForm,
  setSettingsForm,
  saveSettings,
  setActivePanel,
  handleLogoUpload,
  isUploadingLogo,
  onFinish,
  addProduct,
  uploadImageToCloudinary
}: VeloOnboardingProps) {
  const [currentStep, setCurrentStep] = useState(1);

  // ESTADOS DA IA - EMPRESA
  const [termoSobreIA, setTermoSobreIA] = useState('');
  const [isGeneratingAbout, setIsGeneratingAbout] = useState(false);

  // ESTADOS DO PRIMEIRO PRODUTO
  const [productSaved, setProductSaved] = useState(false);
  const [isUploadingProductImage, setIsUploadingProductImage] = useState(false);
  const [termoProdutoIA, setTermoProdutoIA] = useState('');
  const [isGeneratingProduct, setIsGeneratingProduct] = useState(false);
  const [productForm, setProductForm] = useState({
    name: '', description: '', price: '', imageUrl: '', category: 'Destaques', stock: 99, isActive: true
  });

  const steps = [
    { id: 1, title: 'Conexão Google', icon: FaGoogleIcon, subtitle: 'Programa Impulso Velo' },
    { id: 2, title: 'Dados da Empresa', icon: Building2, subtitle: 'Identidade e História' },
    { id: 3, title: 'Identidade Visual', icon: Palette, subtitle: 'Logo e Cores' },
    { id: 4, title: 'Atendimento', icon: MessageSquare, subtitle: 'WhatsApp da Loja' },
    { id: 5, title: 'Catálogo', icon: ShoppingBag, subtitle: 'Primeiro Produto' },
    { id: 6, title: 'Prova Social', icon: Star, subtitle: 'Avaliações e Galeria' }
  ];

  const progressPercentage = ((currentStep - 1) / (steps.length - 1)) * 100;

  const handleNext = async () => {
    // SALVAMENTO AUTOMÁTICO: Se estiver no passo do Catálogo e tiver digitado um nome, salva antes de avançar.
    if (currentStep === 5 && productForm.name && !productSaved) {
      await handleSaveFirstProduct();
    }
    
    if (currentStep < steps.length) setCurrentStep(currentStep + 1);
  };

  const handlePrev = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const handleComplete = (e: React.MouseEvent) => {
    e.preventDefault();
    saveSettings({ preventDefault: () => {} } as React.FormEvent);
    onFinish();
  };

  // MOTOR DE IA: SOBRE A EMPRESA
  const handleGenerateAboutCopy = async () => {
    if (!termoSobreIA) return alert("Digite algumas palavras soltas sobre a sua loja primeiro!");
    setIsGeneratingAbout(true);
    
    try {
        const res = await fetch('/api/generate-about-copy', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                prompt: termoSobreIA, 
                lojaNome: settingsForm.businessName || 'Minha Loja',
                lojaNicho: settingsForm.storeNiche || 'varejo'
            })
        });

        const result = await res.json();
        
        if (res.ok && result.success) {
            setSettingsForm((prev: any) => ({ ...prev, aboutText: result.aboutText }));
            setTermoSobreIA(''); 
        } else {
            alert(`Erro na IA: ${result.error || 'Tente novamente.'}`);
        }
    } catch (error) {
        alert("Erro de conexão com o servidor da IA. Verifique a internet.");
    } finally {
        setIsGeneratingAbout(false);
    }
  };

  // MOTOR DE IA: PRODUTO
  const handleGenerateProductCopy = async () => {
    if (!termoProdutoIA) return alert("Digite o nome básico do produto primeiro!");
    setIsGeneratingProduct(true);
    
    try {
        const res = await fetch('/api/generate-product-copy', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                termoRaw: termoProdutoIA, 
                lojaNome: settingsForm.businessName || 'Minha Loja',
                lojaNicho: settingsForm.storeNiche || 'varejo',
                lojaLocalizacao: settingsForm.address || ''
            })
        });

        const result = await res.json();
        
        if (res.ok && result.success) {
            setProductForm(prev => ({
                ...prev,
                name: result.nome || prev.name,
                description: result.descricao || prev.description
            }));
            setTermoProdutoIA(''); 
        } else {
            alert(`Erro na IA: ${result.error || 'Tente novamente.'}`);
        }
    } catch (error) {
        alert("Erro de conexão com o servidor da IA. Verifique a internet.");
    } finally {
        setIsGeneratingProduct(false);
    }
  };

  // UPLOAD DA IMAGEM DO PRODUTO (WIZARD)
  const handleWizardProductImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
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

  // SALVAR PRIMEIRO PRODUTO
  const handleSaveFirstProduct = async () => {
    if (!productForm.name) return alert("O produto precisa de pelo menos um nome!");
    try {
        await addProduct({ 
            ...productForm, 
            price: Number(productForm.price) || 0, 
            stock: Number(productForm.stock) || 99,
            sku: `PROD-${Date.now()}`
        });
        setProductSaved(true);
    } catch (error) {
        alert("Erro ao salvar produto no banco de dados.");
    }
  };

  return (
    <div className="bg-white border-2 border-gray-100 rounded-[2.5rem] shadow-sm overflow-hidden flex flex-col md:flex-row min-h-[600px] max-h-[85vh]">
      
      {/* Sidebar do Wizard */}
      <div className="w-full md:w-80 bg-gray-50 border-r-2 border-gray-100 p-8 flex flex-col shrink-0">
        <div className="mb-8">
          <h2 className="text-2xl font-black italic uppercase text-[#111827] leading-tight">
            Missões<br/><span className="text-[#0055ff]">Velo Setup</span>
          </h2>
          <p className="text-xs font-bold text-slate-500 mt-2">
            Configure sua vitrine para vender mais no automático.
          </p>
        </div>

        <div className="flex-1 space-y-6">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isActive = currentStep === step.id;
            const isCompleted = currentStep > step.id;

            return (
              <div key={step.id} className="flex items-start gap-4 relative">
                {index < steps.length - 1 && (
                  <div className={`absolute top-8 left-[19px] w-0.5 h-full -ml-px ${isCompleted ? 'bg-[#0055ff]' : 'bg-gray-200'}`} />
                )}
                
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 border-2 z-10 transition-colors duration-300 ${isActive ? 'bg-[#0055ff] border-[#0055ff] text-white shadow-lg shadow-blue-200' : isCompleted ? 'bg-white border-[#0055ff] text-[#0055ff]' : 'bg-white border-gray-200 text-gray-400'}`}>
                  {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : <Icon className="w-4 h-4" />}
                </div>
                
                <div className="pt-1">
                  <p className={`text-xs font-black uppercase tracking-wider transition-colors ${isActive ? 'text-[#0055ff]' : isCompleted ? 'text-slate-800' : 'text-slate-400'}`}>
                    {step.title}
                  </p>
                  <p className="text-[10px] font-bold text-slate-400 mt-0.5">{step.subtitle}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Conteúdo Principal */}
      <div className="flex-1 flex flex-col bg-white relative overflow-hidden">
        {/* Barra de Progresso no Topo */}
        <div className="h-1.5 w-full bg-gray-50 shrink-0">
          <div className="h-full bg-gradient-to-r from-[#0055ff] to-[#ff7b00] transition-all duration-500 ease-out" style={{ width: `${progressPercentage}%` }} />
        </div>

        <div className="flex-1 p-8 md:p-10 overflow-y-auto custom-scrollbar">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="max-w-2xl mx-auto w-full pb-8"
            >
              
              {/* PASSO 1: GOOGLE */}
              {currentStep === 1 && (
                <div className="space-y-6 mt-4">
                  <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mb-6 border border-blue-100">
                    <FaGoogleIcon className="w-8 h-8 text-blue-500" />
                  </div>
                  <h3 className="text-3xl font-black uppercase italic text-slate-900 leading-tight">Impulsione seu<br/>SEO Local</h3>
                  <p className="text-sm font-medium text-slate-500 leading-relaxed">
                    Conectar sua loja ao Google Meu Negócio permite que você apareça nas buscas da sua região. Clientes confiam em lojas que aparecem no mapa.
                  </p>
                  
                  {/* VERIFICA SE JÁ EXISTE TOKEN DO GOOGLE SALVO NO FIREBASE */}
                  {settingsForm?.integrations?.google_my_business?.accessToken ? (
                      <div className="bg-green-50 border-2 border-green-200 p-6 rounded-2xl flex flex-col items-center justify-center gap-2 text-center animate-in zoom-in">
                          <div className="bg-green-500 text-white p-2 rounded-full mb-1">
                              <CheckCircle2 size={24} />
                          </div>
                          <h4 className="font-black text-green-800 uppercase tracking-widest text-sm">Ficha Conectada!</h4>
                          <p className="text-[10px] font-bold text-green-600">Sua loja já está sincronizada com o Google Meu Negócio.</p>
                      </div>
                  ) : (
                      <div className="bg-orange-50 border border-orange-200 p-5 rounded-2xl">
                        <p className="text-xs font-bold text-orange-800 mb-3">Já tem uma ficha no Google?</p>
                        <button 
                          onClick={() => setActivePanel('google_business')}
                          className="w-full bg-white border-2 border-orange-200 text-orange-700 hover:bg-orange-100 py-3 rounded-xl font-black text-[11px] uppercase tracking-widest transition-all"
                        >
                          Ir para Integração do Google
                        </button>
                      </div>
                  )}
                </div>
              )}

              {/* PASSO 2: DADOS DA EMPRESA */}
              {currentStep === 2 && (
                <div className="space-y-6">
                  <h3 className="text-3xl font-black uppercase italic text-slate-900 mb-6">Sobre o Negócio</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Nome Oficial da Loja</label>
                      <input 
                        type="text" 
                        value={settingsForm.businessName || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          // Slugify: Transforma "Loja do João" em "loja-do-joao"
                          const newSlug = val.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
                          setSettingsForm((prev: any) => ({...prev, businessName: val, slug: newSlug}));
                        }}
                        className="w-full p-4 bg-gray-50 rounded-2xl outline-none focus:ring-2 ring-[#0055ff] font-bold text-sm text-slate-700 border border-gray-200 transition-all" 
                        placeholder="Ex: Velo Express"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1 flex items-center gap-1">
                        <MapPin size={12} className="text-red-500"/> Endereço Físico (Mapa)
                      </label>
                      <input 
                        type="text" 
                        value={settingsForm.address || ''}
                        onChange={(e) => setSettingsForm((prev: any) => ({...prev, address: e.target.value}))}
                        className="w-full p-4 bg-gray-50 rounded-2xl outline-none focus:ring-2 ring-[#0055ff] font-bold text-sm text-slate-700 border border-gray-200 transition-all" 
                        placeholder="Rua, Número - Bairro"
                      />
                    </div>
                  </div>

                  {/* BLOCO DE IA: HISTÓRIA DA EMPRESA */}
                  <div className="pt-4 border-t border-slate-100 mt-6">
                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1 block mb-3">História da Loja (Relevância Google)</label>
                    
                    <div className="bg-gradient-to-r from-purple-50 to-indigo-50 p-5 rounded-3xl border border-purple-100 mb-4 flex flex-col gap-3 shadow-sm">
                        <div className="flex items-center gap-1 text-[10px] font-black text-purple-600 uppercase tracking-widest">
                            <Sparkles size={12} /> Gerar com Inteligência Artificial
                        </div>
                        <div className="flex flex-col md:flex-row gap-3">
                            <input 
                                type="text" 
                                placeholder="Digite palavras soltas (Ex: 5 anos, artesanal, familiar, bairro centro...)" 
                                className="w-full p-3.5 bg-white rounded-xl border border-purple-200 outline-none text-xs font-bold focus:ring-2 ring-purple-400 text-slate-700"
                                value={termoSobreIA}
                                onChange={(e) => setTermoSobreIA(e.target.value)}
                            />
                            <button 
                                type="button" 
                                onClick={handleGenerateAboutCopy}
                                disabled={isGeneratingAbout}
                                className="w-full md:w-auto px-6 py-3.5 bg-purple-600 hover:bg-purple-700 text-white font-black text-[10px] uppercase tracking-widest rounded-xl shadow-md transition-all disabled:opacity-50 active:scale-95 flex-shrink-0 flex items-center justify-center gap-2"
                            >
                                {isGeneratingAbout ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                                {isGeneratingAbout ? 'Pensando...' : 'Criar Texto'}
                            </button>
                        </div>
                    </div>

                    <textarea 
                        rows={4}
                        placeholder="A história da sua empresa aparecerá aqui..."
                        value={settingsForm.aboutText || ''}
                        onChange={(e) => setSettingsForm((prev: any) => ({...prev, aboutText: e.target.value}))}
                        className="w-full p-4 bg-gray-50 rounded-2xl outline-none focus:ring-2 ring-[#0055ff] font-medium text-sm text-slate-700 border border-gray-200 transition-all resize-none custom-scrollbar" 
                    />
                  </div>
                </div>
              )}

              {/* PASSO 3: IDENTIDADE VISUAL */}
              {currentStep === 3 && (
                <div className="space-y-6">
                  <h3 className="text-3xl font-black uppercase italic text-slate-900 mb-6">A Cara da sua Marca</h3>
                  
                  <div className="bg-gray-50 p-6 rounded-3xl border border-gray-200 space-y-4">
                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Logomarca (Recomendado PNG transparente)</label>
                    <div className="flex flex-col sm:flex-row items-center gap-4">
                      <label className="w-full sm:flex-1 cursor-pointer bg-white border-2 border-dashed border-gray-300 hover:border-[#0055ff] hover:bg-blue-50 transition-colors p-6 rounded-2xl flex flex-col items-center justify-center gap-2 text-center">
                        {isUploadingLogo ? (
                          <div className="w-6 h-6 border-2 border-[#0055ff] border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                          <>
                            <UploadCloud className="w-8 h-8 text-slate-400" />
                            <span className="text-xs font-bold text-slate-600">Clique para subir logo</span>
                          </>
                        )}
                        <input type="file" accept="image/*" onChange={handleLogoUpload} disabled={isUploadingLogo} className="hidden" />
                      </label>
                      {settingsForm.logoUrl && (
                        <div className="w-32 h-32 bg-white rounded-2xl p-2 border border-gray-200 flex items-center justify-center shrink-0 shadow-sm">
                          <img src={settingsForm.logoUrl} alt="Logo" className="max-w-full max-h-full object-contain" />
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Cor Predominante da Loja</label>
                    <div className="flex items-center gap-3">
                      <div className="relative w-14 h-14 shrink-0 rounded-full overflow-hidden border-4 border-gray-100 shadow-sm hover:scale-105 transition-transform cursor-pointer">
                        <input 
                          type="color" 
                          value={settingsForm.primaryColor}
                          onChange={(e) => setSettingsForm((prev: any) => ({...prev, primaryColor: e.target.value}))}
                          className="absolute -top-2 -left-2 w-20 h-20 cursor-pointer"
                        />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-bold text-slate-600 mb-1">A cor dos botões e destaques.</p>
                        <input 
                          type="text" 
                          value={settingsForm.primaryColor}
                          onChange={(e) => setSettingsForm((prev: any) => ({...prev, primaryColor: e.target.value}))}
                          className="w-full max-w-[150px] bg-gray-50 border border-gray-200 text-xs font-bold text-slate-700 p-3 rounded-xl outline-none focus:border-[#0055ff] uppercase"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* PASSO 4: ATENDIMENTO */}
              {currentStep === 4 && (
                <div className="space-y-6">
                  <h3 className="text-3xl font-black uppercase italic text-slate-900">Canal de Vendas</h3>
                  <p className="text-sm font-medium text-slate-500">
                    Onde seus clientes vão falar com você para tirar dúvidas ou finalizar orçamentos.
                  </p>
                  <div className="space-y-1.5 pt-4">
                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1 flex items-center gap-2">
                      WhatsApp de Atendimento <MessageSquare className="w-3.5 h-3.5 text-[#25D366]" />
                    </label>
                    <input 
                      type="text" 
                      value={settingsForm.whatsappNumber || ''}
                      onChange={(e) => setSettingsForm((prev: any) => ({...prev, whatsappNumber: e.target.value.replace(/\D/g, '')}))}
                      className="w-full p-4 bg-gray-50 rounded-2xl outline-none focus:ring-2 ring-[#25D366] font-black text-lg text-slate-800 border border-gray-200 transition-all placeholder:font-medium" 
                      placeholder="5511999999999"
                      maxLength={13}
                    />
                    <p className="text-[10px] text-slate-400 font-bold ml-1">Digite apenas números, incluindo código do país (55) e DDD.</p>
                  </div>
                </div>
              )}

              {/* PASSO 5: CATÁLOGO COM CRIADOR DE PRODUTOS E IA */}
              {currentStep === 5 && (
                <div className="space-y-6">
                  <div className="mb-6">
                      <h3 className="text-3xl font-black uppercase italic text-slate-900 leading-none mb-2">Primeiro Produto</h3>
                      <p className="text-sm font-medium text-slate-500 leading-relaxed">
                        Vamos cadastrar o seu primeiro item. Use a IA para criar uma descrição magnética focada em conversão no Google.
                      </p>
                  </div>
                  
                  {productSaved ? (
                      <div className="bg-green-50 border-2 border-green-200 p-10 rounded-[3rem] text-center flex flex-col items-center">
                          <div className="w-20 h-20 bg-green-500 text-white rounded-full flex items-center justify-center mb-4">
                              <CheckCircle2 size={40} />
                          </div>
                          <h4 className="text-2xl font-black uppercase italic text-green-800">Produto Salvo!</h4>
                          <p className="text-sm font-bold text-green-600 mt-2">Você poderá adicionar mais itens depois no painel de Catálogo.</p>
                      </div>
                  ) : (
                      <div className="space-y-5 bg-slate-50 p-6 md:p-8 rounded-[2.5rem] border border-slate-200 shadow-inner">
                          
                          {/* --- GERADOR DE IA (VELO COPY) --- */}
                          <div className="bg-gradient-to-r from-purple-50 to-indigo-50 p-5 rounded-3xl border border-purple-100 flex flex-col md:flex-row items-center gap-4 shadow-sm">
                              <div className="flex-1 w-full">
                                  <label className="text-[10px] font-black text-purple-600 uppercase tracking-widest mb-2 flex items-center gap-1">
                                      <Sparkles size={12} /> Velo IA (Auto-Preencher)
                                  </label>
                                  <input 
                                      type="text" 
                                      placeholder="Ex: Pod Descartável Vapper Elfbar BC Pro..." 
                                      className="w-full p-4 bg-white rounded-2xl border border-purple-200 outline-none text-sm font-bold focus:ring-2 ring-purple-400 text-slate-700"
                                      value={termoProdutoIA}
                                      onChange={(e) => setTermoProdutoIA(e.target.value)}
                                  />
                              </div>
                              <button 
                                  type="button" 
                                  onClick={handleGenerateProductCopy}
                                  disabled={isGeneratingProduct}
                                  className="w-full md:w-auto mt-2 md:mt-0 px-8 py-4 bg-purple-600 hover:bg-purple-700 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-lg shadow-purple-200 transition-all disabled:opacity-50 active:scale-95 flex-shrink-0 flex items-center justify-center gap-2"
                              >
                                  {isGeneratingProduct ? <Loader2 className="animate-spin" size={16} /> : <Sparkles size={16} />}
                                  {isGeneratingProduct ? 'Pensando...' : 'Gerar c/ IA'}
                              </button>
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Nome Oficial do Item</label>
                            <input 
                                type="text" 
                                required 
                                value={productForm.name} 
                                onChange={e => setProductForm({...productForm, name: e.target.value})} 
                                className="w-full p-4 bg-white rounded-2xl outline-none focus:ring-2 ring-[#0055ff] font-bold text-sm text-slate-700 border border-gray-200 shadow-sm" 
                                placeholder="Ex: Pod Descartável 5000 Puffs" 
                            />
                            <p className="text-[10px] text-[#0055ff] font-bold mt-1 ml-2 flex items-center gap-1">
                                <Search size={12} /> Digite exatamente como seu cliente buscaria no Google.
                            </p>
                          </div>
                          
                          <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Descrição</label>
                            <textarea 
                                rows={3} 
                                value={productForm.description} 
                                onChange={e => setProductForm({...productForm, description: e.target.value})} 
                                className="w-full p-4 bg-white rounded-2xl outline-none focus:ring-2 ring-[#0055ff] font-medium text-sm text-slate-600 border border-gray-200 shadow-sm resize-none" 
                                placeholder="Detalhes do que está incluso..."
                            ></textarea>
                            
                            {/* MEDIDOR DE FORÇA DE SEO / IA */}
                            {(() => {
                                const desc = productForm.description || '';
                                const length = desc.length;
                                const hasKeywords = /(serviço|incluso|garantia|atendimento|especial|profissional|domicílio|qualidade|rápido|técnico|manutenção|premium|puro|malte|gelada|artesanal|grelhado)/i.test(desc);
                                
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
                                                <Sparkles size={10}/> Força para o Google/IAs:
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

                          {/* BOX DE EXEMPLO PERFEITO DE SEO */}
                          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-5 rounded-3xl border border-blue-100 shadow-sm mt-4">
                              <h4 className="text-xs font-black text-blue-800 uppercase tracking-widest mb-3 flex items-center gap-2">
                                  <Flame size={14} className="text-orange-500" /> O que mais vende no Google
                              </h4>
                              
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div className="bg-white/60 p-4 rounded-2xl border border-red-100">
                                      <p className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-2">❌ Cadastro Ruim (Invisível)</p>
                                      <p className="text-sm font-bold text-slate-400 line-through decoration-red-400">Heineken</p>
                                      <p className="text-xs text-slate-400 mt-1 italic">"Cerveja gelada."</p>
                                  </div>
                                  
                                  <div className="bg-white p-4 rounded-2xl border-2 border-green-400 shadow-md relative overflow-hidden">
                                      <div className="absolute top-0 right-0 bg-green-500 text-white text-[9px] font-black px-2 py-1 rounded-bl-lg uppercase">Ideal</div>
                                      <p className="text-[10px] font-black text-green-600 uppercase tracking-widest mb-2">✅ Cadastro Perfeito (Vende muito)</p>
                                      <p className="text-sm font-black text-slate-800">Cerveja Heineken Long Neck 330ml Gelada</p>
                                      <p className="text-xs text-slate-600 mt-1 italic font-medium">"Cerveja Premium Puro Malte em garrafa de vidro 330ml. Entregue trincando de gelada na sua porta em minutos."</p>
                                  </div>
                              </div>
                          </div>

                          <div className="flex flex-col sm:flex-row gap-4 pt-2">
                              <div className="w-full space-y-1">
                                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Preço Base (R$) - Opcional</label>
                                  <input 
                                      type="number" step="0.01" 
                                      placeholder="0.00" 
                                      className="w-full p-4 bg-blue-50 rounded-xl outline-none font-black text-xl text-blue-600 border border-blue-100 focus:ring-2 ring-blue-500 shadow-sm placeholder:text-blue-300"
                                      value={productForm.price}
                                      onChange={e => setProductForm({...productForm, price: e.target.value})}
                                  />
                              </div>
                              <div className="w-full space-y-1">
                                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Upload da Foto</label>
                                  <label className="w-full h-[62px] bg-white border border-slate-200 rounded-xl flex items-center justify-center gap-2 cursor-pointer hover:bg-slate-50 transition-colors shadow-sm text-slate-600 font-bold text-xs uppercase tracking-widest">
                                      {isUploadingProductImage ? <Loader2 size={16} className="animate-spin"/> : <UploadCloud size={16}/>}
                                      {productForm.imageUrl ? 'Imagem Anexada ✅' : 'Subir Foto'}
                                      <input type="file" accept="image/*" className="hidden" onChange={handleWizardProductImageUpload} disabled={isUploadingProductImage}/>
                                  </label>
                              </div>
                          </div>

                          <button 
                              onClick={handleSaveFirstProduct}
                              disabled={!productForm.name || isUploadingProductImage}
                              className="w-full bg-slate-900 text-white py-4 rounded-xl font-black uppercase tracking-widest text-xs shadow-xl hover:bg-slate-800 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 mt-4"
                          >
                              <Save size={16} /> Salvar Este Produto
                          </button>
                      </div>
                  )}
                </div>
              )}

              {/* PASSO 6: PROVA SOCIAL */}
              {currentStep === 6 && (
                <div className="space-y-6">
                  <h3 className="text-3xl font-black uppercase italic text-slate-900">Confiança (Prova Social)</h3>
                  <p className="text-sm font-medium text-slate-500 leading-relaxed">
                    Lojas que exibem avaliações reais vendem até 3x mais. Traga as estrelas do seu Google para dentro da vitrine.
                  </p>
                  
                  <div className="space-y-1.5 pt-2">
                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1 flex items-center gap-2">
                      Link de Avaliações (Google Meu Negócio)
                    </label>
                    <input 
                      type="url" 
                      value={settingsForm.googleReviewUrl || ''}
                      onChange={(e) => setSettingsForm((prev: any) => ({...prev, googleReviewUrl: e.target.value}))}
                      className="w-full p-4 bg-gray-50 rounded-2xl outline-none focus:ring-2 ring-yellow-400 font-bold text-sm text-slate-700 border border-gray-200 transition-all" 
                      placeholder="https://maps.app.goo.gl/..."
                    />
                  </div>

                  <div className="mt-8 bg-green-50 p-6 rounded-3xl border border-green-200 text-center">
                    <h4 className="text-lg font-black text-green-800 uppercase italic mb-2">🎉 Tudo Pronto!</h4>
                    <p className="text-xs font-bold text-green-700">
                      Você completou a configuração básica. Clique em concluir para salvar e abrir seu painel de controle.
                    </p>
                  </div>
                </div>
              )}

            </motion.div>
          </AnimatePresence>
        </div>

        {/* Rodapé de Ações (Fixo no fundo) - CORRIGIDO MOBILE */}
        <div className="p-4 sm:p-6 md:px-10 border-t-2 border-gray-100 flex items-center justify-between bg-white shrink-0 sticky bottom-0 z-50">
          <button
            onClick={currentStep === 1 ? onFinish : handlePrev}
            className="px-6 py-3.5 bg-gray-50 border border-gray-200 hover:bg-gray-100 text-slate-600 font-black uppercase tracking-widest text-[10px] rounded-xl flex items-center gap-2 transition-all shadow-sm"
          >
            {currentStep === 1 ? 'Pular Tour' : <><ArrowLeft className="w-4 h-4" /> Voltar</>}
          </button>
          
          {currentStep < steps.length ? (
            <button 
              onClick={handleNext}
              className="px-8 py-3.5 bg-[#111827] hover:bg-black text-white font-black uppercase tracking-widest text-[10px] rounded-xl flex items-center gap-2 shadow-lg transition-all active:scale-95"
            >
              Próximo <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button 
              onClick={handleComplete}
              className="px-8 py-3.5 bg-[#0055ff] hover:bg-blue-700 text-white font-black uppercase tracking-widest text-[10px] rounded-xl flex items-center gap-2 shadow-lg shadow-blue-500/30 transition-all active:scale-95"
            >
              <CheckCircle2 className="w-4 h-4" /> Finalizar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}