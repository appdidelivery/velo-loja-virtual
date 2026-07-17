"use client";

import React, { useState } from 'react';
import { CheckCircle2, Loader2, X, Copy } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { motion, AnimatePresence } from 'framer-motion';

export default function PricingTable({ plans, tenantId }: { plans: any[], tenantId: string }) {
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  
  // Estados do Modal de PIX
  const [showPixModal, setShowPixModal] = useState(false);
  const [pixData, setPixData] = useState({ qrCodeBase64: '', copiaECola: '' });

  const handleSubscribe = async (planName: string, rawPrice: string | number) => {
    if (!tenantId || tenantId === 'loading') return alert("Erro: Loja não identificada.");

    // Blindagem matemática para transformar o preço em número seguro
    let priceNumber = 0;
    if (typeof rawPrice === 'string') {
        const cleanedStr = rawPrice.replace(/[R$\s]/g, '');
        if (cleanedStr.includes(',')) {
            priceNumber = Number(cleanedStr.replace(/\./g, '').replace(',', '.'));
        } else {
            priceNumber = Number(cleanedStr);
        }
    } else {
        priceNumber = Number(rawPrice);
    }
    
    const isFree = priceNumber === 0 || planName.toLowerCase().includes('grátis');
    const planIdFormatado = planName.toLowerCase().replace(/\s+/g, '_');
    
    setLoadingPlan(planName);

    try {
      if (isFree) {
        await updateDoc(doc(db, "tenants", tenantId), {
          plan: 'gratis',
          billingStatus: 'ativo_gratis'
        });
        alert("✅ Plano Grátis ativado com sucesso!");
        window.location.reload();
        return;
      }

      await updateDoc(doc(db, "tenants", tenantId), {
        plan: planIdFormatado,
        billingStatus: 'pendente',
        lastCheckoutAmount: priceNumber
      });

      // API de PIX direto
      const res = await fetch('/api/mp-checkout-pix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId: tenantId,
          planName: planName,
          amount: priceNumber
        })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setPixData({ qrCodeBase64: data.qrCodeBase64, copiaECola: data.copiaECola });
        setShowPixModal(true);
      } else {
        throw new Error(data.error || "Falha ao gerar o código PIX.");
      }

    } catch (error: any) {
      console.error("Erro no Checkout:", error);
      alert(`❌ Erro de comunicação: ${error.message}`);
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto relative z-10">
        {plans.map((plan, idx) => {
          // Formatador de Moeda
          let priceNumber = 0;
          if (typeof plan.price === 'string') {
              const cleanedStr = plan.price.replace(/[R$\s]/g, '');
              if (cleanedStr.includes(',')) priceNumber = Number(cleanedStr.replace(/\./g, '').replace(',', '.'));
              else priceNumber = Number(cleanedStr);
          } else {
              priceNumber = Number(plan.price);
          }
          const precoFormatado = priceNumber.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
          const isGratis = priceNumber === 0;

          // Design Limpo da Velo (Baseado na Landing Page)
          return (
            <div 
              key={idx} 
              className={`relative bg-white rounded-[3rem] p-6 lg:p-8 flex flex-col transition-all ${
                plan.highlight 
                  ? 'border-4 border-blue-600 shadow-2xl lg:scale-105 z-10' 
                  : 'border border-slate-200 shadow-sm hover:border-slate-300'
              }`}
            >
              {plan.highlight && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-md whitespace-nowrap">
                  Mais Escolhido
                </div>
              )}
              
              <div className="mb-8">
                <h3 className={`text-2xl font-black italic uppercase ${plan.highlight ? 'text-blue-600' : 'text-slate-800'}`}>
                  {plan.name}
                </h3>
                <p className="text-xs font-bold text-slate-400 mt-2 h-8">{plan.desc}</p>
              </div>
              
              <div className="mb-8 flex items-baseline">
                <span className="text-sm font-bold text-slate-500">R$</span>
                <span className="text-5xl font-black italic text-slate-900 ml-1">
                  {precoFormatado}
                </span>
                <span className="text-sm font-bold text-slate-500 ml-1">/mês</span>
              </div>
              
              <ul className="space-y-4 mb-8 flex-1">
                {plan.features.map((feature: string, fIdx: number) => (
                  <li key={fIdx} className="flex items-start gap-3 text-sm font-bold text-slate-600">
                    <CheckCircle2 size={18} className={`${plan.highlight ? 'text-blue-600' : 'text-green-500'} flex-shrink-0 mt-0.5`} />
                    <span className="leading-snug">{feature}</span>
                  </li>
                ))}
              </ul>
              
              <button 
                onClick={() => handleSubscribe(plan.name, plan.price)}
                disabled={loadingPlan !== null}
                className={`w-full py-5 rounded-full font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${
                  plan.highlight 
                    ? 'bg-blue-600 text-white hover:bg-blue-700' 
                    : 'bg-slate-900 text-white hover:bg-slate-800'
                }`}
              >
                {loadingPlan === plan.name ? (
                  <><Loader2 size={18} className="animate-spin" /> Gerando...</>
                ) : (
                  isGratis ? 'Assinar Grátis' : `Assinar ${plan.name}`
                )}
              </button>
            </div>
          );
        })}
      </div>

      {/* --- MODAL DE PAGAMENTO PIX --- */}
      <AnimatePresence>
        {showPixModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/90 backdrop-blur-md z-[500] flex items-center justify-center p-4">
              <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="bg-white w-full max-w-md rounded-[3rem] p-10 relative text-center shadow-2xl flex flex-col items-center">
                  <button onClick={() => setShowPixModal(false)} className="absolute top-8 right-8 text-slate-400 hover:text-red-500 transition-colors"><X size={24}/></button>
                  
                  <h2 className="text-3xl font-black italic uppercase text-slate-900 mb-2 mt-4">Pagamento PIX</h2>
                  <p className="text-slate-500 font-bold mb-6 text-sm">Escaneie o QR Code abaixo com o app do seu banco.</p>

                  <div className="bg-white p-2 rounded-3xl border-4 border-green-100 shadow-md mb-6">
                      <img src={`data:image/png;base64,${pixData.qrCodeBase64}`} alt="QR Code PIX" className="w-48 h-48 object-contain rounded-2xl" />
                  </div>

                  <div className="w-full bg-slate-50 border border-slate-200 p-4 rounded-2xl mb-6 relative group cursor-pointer" onClick={() => {
                      navigator.clipboard.writeText(pixData.copiaECola);
                      alert("Código Copia e Cola copiado com sucesso!");
                  }}>
                      <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">Pix Copia e Cola (Clique para Copiar)</p>
                      <p className="text-xs font-mono text-slate-600 break-all line-clamp-3 select-all">{pixData.copiaECola}</p>
                      <div className="absolute inset-0 bg-blue-600/90 text-white rounded-2xl flex items-center justify-center font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                          <Copy size={16} className="mr-2"/> Copiar Código
                      </div>
                  </div>
                  
                  <button onClick={() => {
                      setShowPixModal(false);
                      alert("Assim que o pagamento for concluído no seu banco, o painel será liberado automaticamente em alguns segundos.");
                  }} className="w-full bg-green-500 text-white py-4 rounded-2xl font-black uppercase tracking-widest shadow-xl hover:bg-green-600 active:scale-95 transition-all">
                      Já realizei o pagamento
                  </button>
              </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}