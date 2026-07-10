"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckCircle2, Building2, Palette, MessageSquare, 
  ShoppingBag, Star, ArrowRight, ArrowLeft, UploadCloud, 
  MapPin 
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
}

export default function VeloOnboarding({
  settingsForm,
  setSettingsForm,
  saveSettings,
  setActivePanel,
  handleLogoUpload,
  isUploadingLogo,
  onFinish
}: VeloOnboardingProps) {
  const [currentStep, setCurrentStep] = useState(1);

  const steps = [
    { id: 1, title: 'Conexão Google', icon: FaGoogleIcon, subtitle: 'Programa Impulso Velo' },
    { id: 2, title: 'Dados da Empresa', icon: Building2, subtitle: 'Nome, CNPJ e Endereço' },
    { id: 3, title: 'Identidade Visual', icon: Palette, subtitle: 'Logo e Cores' },
    { id: 4, title: 'Atendimento', icon: MessageSquare, subtitle: 'WhatsApp da Loja' },
    { id: 5, title: 'Catálogo', icon: ShoppingBag, subtitle: 'Serviços e Produtos' },
    { id: 6, title: 'Prova Social', icon: Star, subtitle: 'Avaliações e Galeria' }
  ];

  const progressPercentage = ((currentStep - 1) / (steps.length - 1)) * 100;

  const handleNext = () => {
    if (currentStep < steps.length) setCurrentStep(currentStep + 1);
  };

  const handlePrev = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const handleComplete = (e: React.MouseEvent) => {
    e.preventDefault();
    // Simula um evento de formulário para a função saveSettings do painel principal
    saveSettings({ preventDefault: () => {} } as React.FormEvent);
    onFinish();
  };

  return (
    <div className="bg-white border-2 border-gray-100 rounded-[2.5rem] shadow-sm overflow-hidden flex flex-col md:flex-row min-h-[600px]">
      
      {/* Sidebar do Wizard */}
      <div className="w-full md:w-80 bg-gray-50 border-r-2 border-gray-100 p-8 flex flex-col">
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
                {/* Linha conectora */}
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
      <div className="flex-1 flex flex-col bg-white relative">
        {/* Barra de Progresso no Topo */}
        <div className="h-1.5 w-full bg-gray-50">
          <div className="h-full bg-gradient-to-r from-[#0055ff] to-[#ff7b00] transition-all duration-500 ease-out" style={{ width: `${progressPercentage}%` }} />
        </div>

        <div className="flex-1 p-8 md:p-12 overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="max-w-xl"
            >
              
              {/* PASSO 1: GOOGLE */}
              {currentStep === 1 && (
                <div className="space-y-6">
                  <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mb-6 border border-blue-100">
                    <FaGoogleIcon className="w-8 h-8 text-blue-500" />
                  </div>
                  <h3 className="text-3xl font-black uppercase italic text-slate-900 leading-tight">Impulsione seu<br/>SEO Local</h3>
                  <p className="text-sm font-medium text-slate-500 leading-relaxed">
                    Conectar sua loja ao Google Meu Negócio permite que você apareça nas buscas da sua região. Clientes confiam em lojas que aparecem no mapa.
                  </p>
                  <div className="bg-orange-50 border border-orange-200 p-5 rounded-2xl">
                    <p className="text-xs font-bold text-orange-800 mb-3">Já tem uma ficha no Google?</p>
                    <button 
                      onClick={() => setActivePanel('google_business')}
                      className="w-full bg-white border-2 border-orange-200 text-orange-700 hover:bg-orange-100 py-3 rounded-xl font-black text-[11px] uppercase tracking-widest transition-all"
                    >
                      Ir para Integração do Google
                    </button>
                  </div>
                </div>
              )}

              {/* PASSO 2: DADOS DA EMPRESA */}
              {currentStep === 2 && (
                <div className="space-y-6">
                  <h3 className="text-3xl font-black uppercase italic text-slate-900">Sobre o Negócio</h3>
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Nome Oficial da Loja</label>
                      <input 
                        type="text" 
                        value={settingsForm.businessName || ''}
                        onChange={(e) => setSettingsForm({...settingsForm, businessName: e.target.value})}
                        className="w-full p-4 bg-gray-50 rounded-2xl outline-none focus:ring-2 ring-[#0055ff] font-bold text-sm text-slate-700 border border-gray-200 transition-all" 
                        placeholder="Ex: Velo Express"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">CNPJ (Opcional, gera confiança)</label>
                      <input 
                        type="text" 
                        value={settingsForm.cnpj || ''}
                        onChange={(e) => setSettingsForm({...settingsForm, cnpj: e.target.value})}
                        className="w-full p-4 bg-gray-50 rounded-2xl outline-none focus:ring-2 ring-[#0055ff] font-bold text-sm text-slate-700 border border-gray-200 transition-all" 
                        placeholder="00.000.000/0001-00"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1 flex items-center gap-1">
                        <MapPin size={12} className="text-red-500"/> Endereço Físico (Aparece no Mapa)
                      </label>
                      <input 
                        type="text" 
                        value={settingsForm.address || ''}
                        onChange={(e) => setSettingsForm({...settingsForm, address: e.target.value})}
                        className="w-full p-4 bg-gray-50 rounded-2xl outline-none focus:ring-2 ring-[#0055ff] font-bold text-sm text-slate-700 border border-gray-200 transition-all" 
                        placeholder="Rua, Número - Bairro, Cidade - Estado"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* PASSO 3: IDENTIDADE VISUAL */}
              {currentStep === 3 && (
                <div className="space-y-6">
                  <h3 className="text-3xl font-black uppercase italic text-slate-900">A Cara da sua Marca</h3>
                  
                  <div className="bg-gray-50 p-6 rounded-3xl border border-gray-200 space-y-4">
                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Logomarca (Recomendado PNG transparente)</label>
                    <div className="flex items-center gap-4">
                      <label className="flex-1 cursor-pointer bg-white border-2 border-dashed border-gray-300 hover:border-[#0055ff] hover:bg-blue-50 transition-colors p-6 rounded-2xl flex flex-col items-center justify-center gap-2 text-center">
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
                        <div className="w-24 h-24 bg-white rounded-2xl p-2 border border-gray-200 flex items-center justify-center shrink-0 shadow-sm">
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
                          onChange={(e) => setSettingsForm({...settingsForm, primaryColor: e.target.value})}
                          className="absolute -top-2 -left-2 w-20 h-20 cursor-pointer"
                        />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-bold text-slate-600 mb-1">A cor dos botões e destaques.</p>
                        <input 
                          type="text" 
                          value={settingsForm.primaryColor}
                          onChange={(e) => setSettingsForm({...settingsForm, primaryColor: e.target.value})}
                          className="w-full bg-gray-50 border border-gray-200 text-xs font-bold text-slate-700 p-3 rounded-xl outline-none focus:border-[#0055ff] uppercase"
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
                      value={settingsForm.whatsappNumber}
                      onChange={(e) => setSettingsForm({...settingsForm, whatsappNumber: e.target.value.replace(/\D/g, '')})}
                      className="w-full p-4 bg-gray-50 rounded-2xl outline-none focus:ring-2 ring-[#25D366] font-black text-lg text-slate-800 border border-gray-200 transition-all placeholder:font-medium" 
                      placeholder="5511999999999"
                      maxLength={13}
                    />
                    <p className="text-[10px] text-slate-400 font-bold ml-1">Digite apenas números, incluindo código do país (55) e DDD.</p>
                  </div>
                </div>
              )}

              {/* PASSO 5: CATÁLOGO */}
              {currentStep === 5 && (
                <div className="space-y-6">
                  <h3 className="text-3xl font-black uppercase italic text-slate-900">Seu Catálogo</h3>
                  <p className="text-sm font-medium text-slate-500 leading-relaxed">
                    Sua loja precisa de produtos ou serviços para existir. Nossa inteligência artificial Velo Copy pode te ajudar a criar descrições persuasivas na tela de cadastro.
                  </p>
                  <div className="bg-blue-50 border border-blue-200 p-6 rounded-3xl flex flex-col items-center justify-center text-center gap-4">
                    <ShoppingBag className="w-10 h-10 text-blue-500" />
                    <p className="text-sm font-bold text-blue-900">
                      Você pode adicionar produtos agora ou finalizar o tour primeiro.
                    </p>
                    <button 
                      onClick={() => setActivePanel('products')}
                      className="px-6 py-3 bg-[#0055ff] hover:bg-blue-700 text-white font-black uppercase tracking-widest text-[11px] rounded-xl shadow-lg transition-all"
                    >
                      Ir para Cadastro de Produtos
                    </button>
                  </div>
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
                      onChange={(e) => setSettingsForm({...settingsForm, googleReviewUrl: e.target.value})}
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

        {/* Rodapé de Ações */}
        <div className="p-6 md:px-12 border-t-2 border-gray-100 flex items-center justify-between bg-gray-50/50">
          <button 
            onClick={currentStep === 1 ? onFinish : handlePrev}
            className="px-6 py-3.5 bg-white border-2 border-gray-200 hover:bg-gray-50 text-slate-600 font-black uppercase tracking-widest text-[11px] rounded-full flex items-center gap-2 transition-all"
          >
            {currentStep === 1 ? 'Pular Tour' : <><ArrowLeft className="w-4 h-4" /> Voltar</>}
          </button>
          
          {currentStep < steps.length ? (
            <button 
              onClick={handleNext}
              className="px-8 py-3.5 bg-[#111827] hover:bg-black text-white font-black uppercase tracking-widest text-[11px] rounded-full flex items-center gap-2 shadow-lg transition-all"
            >
              Próximo Passo <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button 
              onClick={handleComplete}
              className="px-8 py-3.5 bg-[#0055ff] hover:bg-blue-700 text-white font-black uppercase tracking-widest text-[11px] rounded-full flex items-center gap-2 shadow-lg shadow-blue-500/30 transition-all"
            >
              <CheckCircle2 className="w-4 h-4" /> Salvar e Concluir
            </button>
          )}
        </div>
      </div>
    </div>
  );
}