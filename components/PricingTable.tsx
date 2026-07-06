// components/PricingTable.tsx
"use client";

import React from 'react';
import { Check, Star } from 'lucide-react';
import { PricingPlan } from '../data/pricingPlans';

interface PricingTableProps {
  plans: PricingPlan[];
}

export default function PricingTable({ plans }: PricingTableProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 xl:gap-8 items-start">
      {plans.map((plan) => {
        const isRec = plan.isRecommended;

        return (
          <div 
            key={plan.id}
            className={`relative bg-white rounded-[2rem] p-8 transition-all duration-300 flex flex-col h-full ${
              isRec 
                ? 'border-4 border-[#ff7b00] shadow-2xl scale-100 lg:scale-105 z-10' 
                : 'border-2 border-gray-100 shadow-sm hover:border-[#111827]'
            }`}
          >
            {/* Badge Recomendado */}
            {isRec && (
              <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-[#ff7b00] text-white px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 shadow-lg">
                <Star className="w-3.5 h-3.5 fill-current" />
                Mais Escolhido
              </div>
            )}

            {/* Cabeçalho do Card */}
            <div className="mb-6">
              <h3 className="text-xl font-black uppercase tracking-wider text-slate-800 mb-2">
                {plan.name}
              </h3>
              <p className="text-xs text-slate-500 font-medium h-10 line-clamp-2">
                {plan.description}
              </p>
            </div>

            {/* Preço */}
            <div className="mb-8 pb-8 border-b-2 border-gray-50 flex items-baseline gap-1">
              <span className="text-sm font-black text-slate-400">R$</span>
              <span className="text-4xl font-black text-[#111827] tracking-tight">
                {plan.price === 0 ? '0,00' : plan.price.toFixed(2).replace('.', ',')}
              </span>
              <span className="text-xs font-bold text-slate-400">{plan.period}</span>
            </div>

            {/* Lista de Features */}
            <ul className="space-y-4 mb-8 flex-1">
              {plan.features.map((feature, idx) => (
                <li key={idx} className="flex items-start gap-3">
                  <div className={`p-1 rounded-full shrink-0 ${isRec ? 'bg-orange-100 text-[#ff7b00]' : 'bg-green-100 text-green-600'}`}>
                    <Check className="w-3.5 h-3.5" strokeWidth={3} />
                  </div>
                  <span className="text-xs font-bold text-slate-600 leading-relaxed">
                    {feature}
                  </span>
                </li>
              ))}
            </ul>

            {/* Botão de Ação */}
            <button 
              className={`w-full py-4 rounded-full font-black uppercase tracking-widest text-[11px] transition-all active:scale-95 ${
                plan.buttonVariant === 'primary' 
                  ? 'bg-[#ff7b00] hover:bg-[#e66a00] text-white shadow-lg shadow-orange-500/30' 
                  : plan.buttonVariant === 'dark'
                  ? 'bg-[#111827] hover:bg-black text-white shadow-md'
                  : 'bg-white border-2 border-gray-200 text-slate-700 hover:border-[#111827] hover:bg-gray-50'
              }`}
            >
              {plan.buttonText}
            </button>
          </div>
        );
      })}
    </div>
  );
}