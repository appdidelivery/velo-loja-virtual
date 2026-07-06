// app/admin/financeiro/page.tsx
import React from 'react';
import PricingTable from '@/components/PricingTable'; // Ajuste o path se necessário
import { pricingPlans } from '@/data/pricingPlans'; // Ajuste o path se necessário
import { CreditCard, ShieldCheck } from 'lucide-react';

export const metadata = {
  title: 'Financeiro e Planos | Velo Loja Virtual',
};

export default function FinanceiroPage() {
  return (
    <div className="flex-1 overflow-y-auto p-6 lg:p-10 bg-[#f4f7f6] min-h-screen">
      <div className="max-w-[1400px] mx-auto space-y-10">
        
        {/* Cabeçalho da Página */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl sm:text-4xl font-black italic uppercase text-[#111827] tracking-tighter">
              Assinatura & Planos
            </h2>
            <p className="text-sm font-bold text-slate-500 mt-2">
              Evolua sua loja de acordo com o crescimento do seu negócio.
            </p>
          </div>
          
          {/* Status Atual do Lojista */}
          <div className="bg-white border-2 border-gray-200 px-6 py-4 rounded-2xl flex items-center gap-4 shadow-sm">
            <div className="bg-gray-100 p-2.5 rounded-full">
              <CreditCard className="w-5 h-5 text-slate-600" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Plano Atual</p>
              <p className="text-sm font-black text-[#111827] uppercase">Velo Grátis</p>
            </div>
          </div>
        </div>

        {/* Tabela de Preços (Componente Isolado) */}
        <div className="pt-8">
          <PricingTable plans={pricingPlans} />
        </div>

        {/* Rodapé de Segurança / Dúvidas */}
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
          <button className="px-6 py-3 bg-gray-50 hover:bg-gray-100 text-slate-700 font-black uppercase tracking-wider rounded-full border-2 border-gray-200 transition-colors text-[11px] whitespace-nowrap">
            Precisa de ajuda? Fale com suporte
          </button>
        </div>

      </div>
    </div>
  );
}