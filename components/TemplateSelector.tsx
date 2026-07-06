"use client";

import React, { useState } from 'react';
import { TEMPLATES, TemplateConfig, TemplateCategory } from '../data/templatesConfig';
import { CheckCircle2 } from 'lucide-react';

interface TemplateSelectorProps {
  selectedTemplateId: string;
  onSelect: (template: TemplateConfig) => void;
}

export default function TemplateSelector({ selectedTemplateId, onSelect }: TemplateSelectorProps) {
  const [activeCategory, setActiveCategory] = useState<TemplateCategory>('varejo');

  const filteredTemplates = TEMPLATES.filter(t => t.category === activeCategory);

  return (
    <div className="space-y-6">
      {/* Abas (Varejo vs Serviços) */}
      <div className="flex bg-slate-100 p-1 rounded-2xl w-max shadow-inner">
        <button
          type="button"
          onClick={() => setActiveCategory('varejo')}
          className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
            activeCategory === 'varejo' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          🛍️ Produtos e Varejo
        </button>
        <button
          type="button"
          onClick={() => setActiveCategory('servicos')}
          className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
            activeCategory === 'servicos' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          📅 Serviços (Orçamentos)
        </button>
      </div>

      {/* Galeria de Templates */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredTemplates.map(template => {
          const isSelected = selectedTemplateId === template.id;

          return (
            <div 
              key={template.id} 
              className={`bg-white rounded-[2rem] border-4 overflow-hidden transition-all group relative cursor-pointer flex flex-col h-full ${
                isSelected ? 'border-blue-600 shadow-lg scale-[1.02]' : 'border-slate-100 hover:border-blue-300'
              }`}
              onClick={() => onSelect(template)}
            >
              {isSelected && (
                <div className="absolute top-3 right-3 bg-blue-600 text-white p-1 rounded-full z-10 shadow-md">
                  <CheckCircle2 size={20} />
                </div>
              )}
              
              <div className="h-40 w-full relative overflow-hidden bg-slate-100 shrink-0">
                <div className="absolute inset-0 bg-slate-900/10 group-hover:bg-transparent transition-colors z-0"></div>
                <img 
                  src={template.previewImage} 
                  alt={template.templateName} 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                />
              </div>

              <div className="p-5 flex flex-col flex-1">
                <h4 className="font-black text-slate-800 uppercase text-sm mb-1">{template.templateName}</h4>
                <div className="flex flex-wrap gap-2 mb-4">
                  <span className="bg-slate-100 text-slate-500 px-2 py-1 rounded text-[9px] font-bold uppercase tracking-widest truncate max-w-[120px]">
                    Fonte: {template.fontFamily.split(',')[0].replace(/"/g, '')}
                  </span>
                  <span className="bg-slate-100 text-slate-500 px-2 py-1 rounded text-[9px] font-bold uppercase tracking-widest">
                    Layout: {template.gridConfig}
                  </span>
                </div>
                
                <button 
                  type="button"
                  className={`mt-auto w-full py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${
                    isSelected 
                      ? 'bg-blue-600 text-white shadow-md' 
                      : 'bg-slate-100 text-slate-600 group-hover:bg-blue-50 group-hover:text-blue-600'
                  }`}
                >
                  {isSelected ? 'Tema Selecionado' : 'Aplicar Estilo'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}