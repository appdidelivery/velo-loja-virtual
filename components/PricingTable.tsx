"use client";

import React, { useState } from 'react';
import { CheckCircle2, Loader2, ExternalLink } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../services/firebase';

export default function PricingTable({ plans, tenantId }: { plans: any[], tenantId: string }) {
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  const handleSubscribe = async (planName: string, price: string) => {
    if (!tenantId || tenantId === 'loading') return alert("Erro: Loja não identificada.");

    const isFree = price === '0,00' || price === '0' || planName.toLowerCase().includes('grátis');
    const planIdFormatado = planName.toLowerCase().replace(/\s+/g, '_');
    
    setLoadingPlan(planName);

    try {
      // 1. SE FOR O PLANO GRÁTIS: Apenas libera o acesso imediato no banco
      if (isFree) {
        await updateDoc(doc(db, "tenants", tenantId), {
          plan: 'gratis',
          billingStatus: 'ativo_gratis'
        });
        alert("✅ Plano Grátis ativado com sucesso!");
        window.location.reload();
        return;
      }

      // 2. SE FOR PLANO PAGO: Converte o valor para número
      const valorFormatado = Number(price.replace('.', '').replace(',', '.'));

      // 2.1 Marca a intenção de compra no Banco de Dados
      await updateDoc(doc(db, "tenants", tenantId), {
        plan: planIdFormatado,
        billingStatus: 'pendente',
        lastCheckoutAmount: valorFormatado
      });

      // 2.2 Chama a rota de API do Mercado Pago no Backend
      const res = await fetch('/api/mp-checkout-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId: tenantId,
          planName: planName,
          amount: valorFormatado
        })
      });

      const data = await res.json();

      // 2.3 Redireciona o lojista para a página de Checkout Seguro
      if (res.ok && data.url) {
        window.location.href = data.url;
      } else {
        throw new Error(data.error || "Falha ao gerar link de pagamento.");
      }

    } catch (error: any) {
      console.error("Erro no Checkout:", error);
      alert(`❌ Erro ao conectar com o Mercado Pago: ${error.message}`);
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
      {plans.map((plan, idx) => (
        <div 
          key={idx} 
          className={`relative bg-white rounded-[3rem] p-6 lg:p-8 flex flex-col transition-all ${
            plan.highlight 
              ? 'border-4 border-[#ff7b00] shadow-2xl lg:scale-105 z-10' 
              : 'border border-slate-200 shadow-sm hover:border-slate-300'
          }`}
        >
          {plan.highlight && (
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-[#ff7b00] text-white px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-md whitespace-nowrap">
              Mais Escolhido
            </div>
          )}
          
          <div className="mb-8">
            <h3 className={`text-2xl font-black italic uppercase ${plan.highlight ? 'text-[#111827]' : 'text-slate-800'}`}>
              {plan.name}
            </h3>
            <p className="text-xs font-bold text-slate-400 mt-2 h-10 line-clamp-3">{plan.desc}</p>
          </div>
          
          <div className="mb-8">
            <span className="text-sm font-bold text-slate-500">R$</span>
            <span className={`text-5xl font-black italic ml-1 ${plan.highlight ? 'text-[#ff7b00]' : 'text-[#111827]'}`}>
              {plan.price}
            </span>
            <span className="text-sm font-bold text-slate-500">/mês</span>
          </div>
          
          <ul className="space-y-4 mb-8 flex-1">
            {plan.features.map((feature: string, fIdx: number) => (
              <li key={fIdx} className="flex items-start gap-3 text-xs font-bold text-slate-600">
                <CheckCircle2 size={16} className={`${plan.highlight ? 'text-[#ff7b00]' : 'text-green-500'} flex-shrink-0 mt-0.5`} />
                <span className="leading-snug">{feature}</span>
              </li>
            ))}
          </ul>
          
          <button 
            onClick={() => handleSubscribe(plan.name, plan.price)}
            disabled={loadingPlan !== null}
            className={`w-full py-4 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${
              plan.highlight 
                ? 'bg-[#111827] text-white hover:bg-black' 
                : 'bg-white border-2 border-slate-200 text-slate-700 hover:border-slate-800'
            }`}
          >
            {loadingPlan === plan.name ? (
              <><Loader2 size={16} className="animate-spin" /> Processando...</>
            ) : (
              plan.price === '0,00' ? 'Ativar Grátis' : 'Assinar Agora'
            )}
          </button>
        </div>
      ))}
    </div>
  );
}