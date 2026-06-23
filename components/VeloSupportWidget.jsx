import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MessageCircle, X, HelpCircle, FileText, 
  Zap, ExternalLink, Headset, ChevronRight 
} from 'lucide-react';

export default function VeloSupportWidget({ tenantId, tenantName }) {
  const [isOpen, setIsOpen] = useState(false);

  // Número oficial de suporte da Velo
  const VELO_SUPPORT_WHATSAPP = "5511999999999"; 

  const handleOpenWhatsAppSupport = () => {
    const text = encodeURIComponent(`Olá, suporte Velo! Preciso de ajuda no meu painel.\n\n*Minha Loja:* ${tenantName}\n*ID:* ${tenantId}`);
    window.open(`https://wa.me/${VELO_SUPPORT_WHATSAPP}?text=${text}`, '_blank');
  };

  return (
    <div className="fixed bottom-6 left-6 z-50 font-sans">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: "spring", bounce: 0.3, duration: 0.4 }}
            className="absolute bottom-16 left-0 w-80 bg-white dark:bg-[#12141c] border border-gray-200 dark:border-gray-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col mb-2 origin-bottom-left"
          >
            <div className="bg-gradient-to-r from-gray-900 to-gray-800 dark:from-[#1a1d27] dark:to-[#12141c] p-5 text-white relative">
              <button 
                onClick={() => setIsOpen(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center shadow-lg border-2 border-white/10">
                  <Zap className="w-5 h-5 text-white fill-current" />
                </div>
                <div>
                  <h3 className="font-bold text-sm leading-tight">Suporte Velo</h3>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span className="text-[10px] text-gray-300 font-medium tracking-wider uppercase">Online agora</span>
                  </div>
                </div>
              </div>
              <p className="text-xs text-gray-300 mt-3 leading-relaxed">
                Olá! Como podemos ajudar a sua loja a vender mais hoje?
              </p>
            </div>

            <div className="p-4 space-y-2 bg-gray-50 dark:bg-[#0c0d12]">
              <button 
                onClick={handleOpenWhatsAppSupport}
                className="w-full flex items-center justify-between p-3 bg-white dark:bg-[#1a1d27] border border-gray-200 dark:border-gray-800 hover:border-orange-500 dark:hover:border-orange-500 rounded-xl transition-all group shadow-sm hover:shadow"
              >
                <div className="flex items-center gap-3 text-left">
                  <div className="bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 p-2 rounded-lg">
                    <Headset className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100 group-hover:text-orange-500 transition-colors">Falar com Especialista</h4>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400">Atendimento humano via WhatsApp</p>
                  </div>
                </div>
                <ExternalLink className="w-4 h-4 text-gray-300 dark:text-gray-600 group-hover:text-orange-500" />
              </button>

              <a 
                href="https://ajuda.velovarejo.com.br" 
                target="_blank" 
                rel="noreferrer"
                className="w-full flex items-center justify-between p-3 bg-white dark:bg-[#1a1d27] border border-gray-200 dark:border-gray-800 hover:border-orange-500 dark:hover:border-orange-500 rounded-xl transition-all group shadow-sm hover:shadow"
              >
                <div className="flex items-center gap-3 text-left">
                  <div className="bg-blue-100 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 p-2 rounded-lg">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100 group-hover:text-orange-500 transition-colors">Central de Ajuda</h4>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400">Tutoriais e guias da plataforma</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-300 dark:text-gray-600 group-hover:text-orange-500" />
              </a>
            </div>

            <div className="p-3 bg-white dark:bg-[#12141c] border-t border-gray-200 dark:border-gray-800 text-center flex items-center justify-center gap-1.5">
              <HelpCircle className="w-3.5 h-3.5 text-gray-400" />
              <span className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">
                Tenant: <strong className="font-mono text-gray-700 dark:text-gray-300">{tenantId || 'Não identificado'}</strong>
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={() => setIsOpen(!isOpen)}
        className="group relative flex items-center justify-center w-14 h-14 bg-gray-900 dark:bg-orange-500 text-white rounded-full shadow-2xl hover:scale-105 transition-transform duration-200 focus:outline-none focus:ring-4 focus:ring-gray-300 dark:focus:ring-orange-500/30"
      >
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div
              key="close"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <X className="w-6 h-6" />
            </motion.div>
          ) : (
            <motion.div
              key="open"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <MessageCircle className="w-6 h-6 fill-current" />
            </motion.div>
          )}
        </AnimatePresence>
      </button>
    </div>
  );
}