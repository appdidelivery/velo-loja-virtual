"use client";
import React, { useState, useEffect } from 'react';
import { db } from '../services/firebase';
import { collection, query, onSnapshot, addDoc, updateDoc, doc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { Search, Loader2, Send, Phone, MapPin, User, ArrowRight, ArrowLeft, Trash2, CheckCircle2, Star, Store, Clock, Tag, MessageSquareText, ExternalLink, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function ProspeccaoVarejoKanban() {
    const [leads, setLeads] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    
    // Filtros de Qualificação Velo Varejo
    const [filters, setFilters] = useState({
        onlyWithPhone: false,
        noWebsite: false,      
        noEcommerce: false,    // Alterado para E-commerce
        hasInstagram: false,   
        maxReviews: '',        
        segment: ''            
    });
    
    // Controle do Modal de Abordagem Manual
    const [approachLead, setApproachLead] = useState(null);

    // Textos de Prospecção Prontos para Varejo
    const PROMO_TEMPLATES = [
        {
            title: "Vender Online / E-commerce",
            text: "Opa [Nome], tudo bem? Vi a [Nicho] de vocês no Google. Vocês já têm um site próprio para vender online e enviar para todo Brasil ou estão dependendo só do Instagram?"
        },
        {
            title: "Sem Catálogo / WhatsApp",
            text: "Oi [Nome], tudo joia? Achei vocês aqui, mas vi que não tem um catálogo com link direto. Vocês estão mandando fotos soltas no WhatsApp? Tenho uma ferramenta que cria seu catálogo no automático."
        },
        {
            title: "Foco em SEO / Google",
            text: "Fala [Nome]! Vi a página da loja de vocês aqui no Google, mas notei que estão com poucas avaliações. Sabia que isso derruba vocês nas buscas da cidade? Nosso sistema resolve isso no automático."
        }
    ];
    
    // Carregar leads do Firebase (Nova Coleção: leads_varejo)
    useEffect(() => {
        const q = query(collection(db, 'leads_varejo'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const leadsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            leadsData.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
            setLeads(leadsData);
        });
        return () => unsubscribe();
    }, []);

    // Buscar Leads no Google via Vercel Backend
    const handleSearchLeads = async (e) => {
        e.preventDefault();
        if (!searchTerm) return;
        setIsSearching(true);

        try {
            const response = await fetch('/api/prospeccao', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'prospeccao_serper', queryTerm: searchTerm })
            });
            
            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.error || 'Erro ao buscar no Serper');
            }

            let added = 0;
            for (const place of data.leads) {
                const rawPhone = place.phoneNumber || place.phone_number || place.formatted_phone_number || place.international_phone_number || place.phone || place.telefone;
                const leadName = place.title || place.name || 'Sem Nome';
                
                if (!rawPhone) continue; 

                let cleanPhone = String(rawPhone).replace(/\D/g, ''); 
                
                if (cleanPhone.length >= 10 && !cleanPhone.startsWith('55')) {
                    cleanPhone = `55${cleanPhone}`;
                }

                if (cleanPhone.length < 10) continue;

                const isDuplicate = leads.some(l => l.phone === cleanPhone);
                
                if (!isDuplicate) {
                    const allUrls = [place.website, place.orderUrl].filter(Boolean).join(' ').toLowerCase();
                    let detectedMarketplace = null;
                    if (allUrls.includes('mercadolivre')) detectedMarketplace = 'Mercado Livre';
                    else if (allUrls.includes('shopee')) detectedMarketplace = 'Shopee';
                    else if (allUrls.includes('nuvemshop') || allUrls.includes('lojavirtual') || allUrls.includes('tray')) detectedMarketplace = 'Usa Plataforma';

                    const leadCategory = place.categoryName || place.category || (place.categories ? place.categories[0] : 'Desconhecido');

                    // Salvar na coleção isolada de varejo
                    await addDoc(collection(db, 'leads_varejo'), {
                        name: leadName,
                        phone: cleanPhone,
                        address: place.address || place.formatted_address || '',
                        website: place.website || '',
                        orderUrl: place.orderUrl || '',
                        instagram: place.instagram || '',
                        rating: place.rating || null,
                        reviewsCount: place.reviewsCount || 0,
                        isOpen: place.isOpen !== undefined ? place.isOpen : null,
                        marketplace: detectedMarketplace,
                        category: leadCategory,
                        status: 'extracted',
                        createdAt: serverTimestamp()
                    });
                    added++;
                }
            }
            
            if (added > 0) {
                alert(`🎯 Sucesso! ${added} novas lojas adicionadas ao funil.`);
            } else {
                alert(`Nenhuma loja NOVA foi adicionada. \nProvavelmente todos já estão no funil ou não possuem telefone.`);
            }
            
        } catch (error) {
            alert(`Erro na busca: ${error.message}`);
        } finally {
            setIsSearching(false);
        }
    };

    // Mudar Status no Kanban (Sem integrações complexas de API, apenas Firebase visual)
    const handleChangeStatus = async (leadId, newStatus) => {
        try {
            await updateDoc(doc(db, 'leads_varejo', leadId), { status: newStatus });
        } catch (error) {
            alert('Erro ao atualizar status.');
        }
    };

    const handleSendColdMessage = (lead) => {
        setApproachLead(lead);
    };

    // Executar Redirecionamento 100% Nativo para WhatsApp Web
    const executeManualApproach = async (templateText) => {
        if (!approachLead) return;

        try {
            const firstName = approachLead.name ? approachLead.name.split(' ')[0] : 'pessoal';
            const categoryName = approachLead.category && approachLead.category !== 'Desconhecido' ? approachLead.category.toLowerCase() : 'loja';

            let finalMessage = templateText
                .replace(/\[Nome\]/gi, firstName)
                .replace(/\[Nicho\]/gi, categoryName);

            const encodedMessage = encodeURIComponent(finalMessage);

            let cleanPhone = String(approachLead.phone).replace(/\D/g, '');
            if (cleanPhone.length >= 10 && !cleanPhone.startsWith('55')) cleanPhone = `55${cleanPhone}`;

            // Abre a URL limpa do WhatsApp Web/App
            const waUrl = `https://wa.me/${cleanPhone}?text=${encodedMessage}`;
            window.open(waUrl, '_blank');

            // Move para contatado automaticamente
            await handleChangeStatus(approachLead.id, 'contacted');
            setApproachLead(null);
        } catch (error) {
            alert(`Erro ao redirecionar para o WhatsApp: ${error.message}`);
        }
    };

    const handleDelete = async (leadId) => {
        if (window.confirm('Excluir este lead definitivamente?')) {
            await deleteDoc(doc(db, 'leads_varejo', leadId));
        }
    };

    const COLUMNS = [
        { id: 'extracted', title: '🔍 Leads Extraídos', color: 'bg-slate-100', border: 'border-slate-200' },
        { id: 'contacted', title: '💬 Abordagem Inicial', color: 'bg-blue-50', border: 'border-blue-200' },
        { id: 'replied', title: '🔥 Responderam', color: 'bg-orange-50', border: 'border-orange-200' },
        { id: 'closed', title: '✅ Fechados', color: 'bg-green-50', border: 'border-green-200' }
    ];

    const LeadCard = ({ lead, colIndex }) => (
        <motion.div layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col gap-2 relative group">
            <button onClick={() => handleDelete(lead.id)} className="absolute top-3 right-3 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={14}/></button>
            <h4 className="font-black text-slate-800 text-sm leading-tight pr-6">{lead.name}</h4>
            
            {lead.phone && (
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
                    <Phone size={12} className="text-blue-500"/> {lead.phone}
                </div>
            )}
            {lead.address && (
                <div className="flex items-start gap-1.5 text-[10px] text-slate-400 font-medium leading-tight">
                    <MapPin size={12} className="shrink-0 mt-0.5"/> {lead.address}
                </div>
            )}

            <div className="flex flex-wrap gap-1.5 mt-1.5">
                {lead.category && lead.category !== 'Desconhecido' && (
                    <div className="flex items-center gap-1 bg-purple-50 text-purple-700 text-[9px] font-extrabold px-2 py-0.5 rounded-md border border-purple-200 shadow-sm" title="Segmento no Google">
                        <Tag size={10} />
                        {lead.category}
                    </div>
                )}
                {lead.rating && (
                    <div className="flex items-center gap-1 bg-yellow-50 text-yellow-700 text-[9px] font-extrabold px-2 py-0.5 rounded-md border border-yellow-200 shadow-sm" title="Avaliação no Google">
                        <Star size={10} className="fill-yellow-500 text-yellow-500" />
                        {lead.rating} ({lead.reviewsCount || 0})
                    </div>
                )}
                {lead.marketplace && (
                    <div className="flex items-center gap-1 bg-red-50 text-red-700 text-[9px] font-extrabold px-2 py-0.5 rounded-md border border-red-200 shadow-sm" title="Plataforma Detectada">
                        <Store size={10} />
                        {lead.marketplace}
                    </div>
                )}
            </div>

            <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
                <div className="flex gap-1">
                    {colIndex > 0 && (
                        <button onClick={() => handleChangeStatus(lead.id, COLUMNS[colIndex - 1].id)} className="p-1.5 bg-slate-100 text-slate-500 rounded-lg hover:bg-slate-200 transition-colors"><ArrowLeft size={14}/></button>
                    )}
                    {colIndex < COLUMNS.length - 1 && (
                        <button onClick={() => handleChangeStatus(lead.id, COLUMNS[colIndex + 1].id)} className="p-1.5 bg-slate-100 text-slate-500 rounded-lg hover:bg-slate-200 transition-colors"><ArrowRight size={14}/></button>
                    )}
                </div>

                {/* Botão Único de Abordagem (Abre WhatsApp Web) */}
                {lead.status !== 'closed' && lead.phone && (
                    <button onClick={() => handleSendColdMessage(lead)} className="bg-blue-600 text-white text-[10px] font-black uppercase px-3 py-1.5 rounded-lg flex items-center gap-1 hover:bg-blue-700 active:scale-95 shadow-sm">
                        <Send size={12}/> {lead.status === 'extracted' ? 'Abordar' : 'Nova Msg'}
                    </button>
                )}

                {lead.status === 'replied' && (
                    <button onClick={() => handleChangeStatus(lead.id, 'closed')} className="bg-green-500 text-white text-[10px] font-black uppercase px-3 py-1.5 rounded-lg flex items-center gap-1 hover:bg-green-600 active:scale-95 shadow-sm">
                        <CheckCircle2 size={12}/> Vendeu
                    </button>
                )}
            </div>
        </motion.div>
    );

    return (
        <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
            {/* Header Varejo */}
            <header className="bg-slate-900 text-white p-6 flex flex-col md:flex-row justify-between items-center gap-4 shrink-0 shadow-md relative z-20">
                <div className="flex items-center gap-4">
                    <div className="bg-gradient-to-tr from-blue-500 to-indigo-500 p-3 rounded-2xl shadow-lg">
                        <User size={28} className="text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black italic tracking-tighter uppercase">Velo Máquina de Vendas</h1>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Encontre lojas e varejo sem site</p>
                    </div>
                </div>

                <form onSubmit={handleSearchLeads} className="flex w-full md:w-auto gap-2">
                    <div className="relative w-full md:w-80">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input 
                            type="text" 
                            placeholder="Ex: Loja de Roupas em Florianópolis, SC"
                            className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-800 text-white border-none outline-none focus:ring-2 ring-blue-500 font-bold placeholder:text-slate-500 text-sm"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button type="submit" disabled={isSearching || !searchTerm} className="bg-blue-600 hover:bg-blue-700 text-white px-6 rounded-xl font-black uppercase text-xs tracking-widest transition-all disabled:opacity-50 flex items-center justify-center shrink-0">
                        {isSearching ? <Loader2 size={18} className="animate-spin" /> : 'Prospectar'}
                    </button>
                </form>
            </header>

            {/* Barra de Filtros Inteligentes */}
            <div className="bg-white border-b border-slate-200 px-6 py-3 flex items-center gap-4 overflow-x-auto">
                <span className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                    <Search size={14}/> Filtros:
                </span>
                
                <button 
                    onClick={() => setFilters(f => ({ ...f, onlyWithPhone: !f.onlyWithPhone }))}
                    className={`text-[10px] font-bold uppercase px-3 py-1.5 rounded-full transition-colors flex items-center gap-1 border ${filters.onlyWithPhone ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'}`}
                >
                    <Phone size={12}/> Com Telefone
                </button>

                <button 
                    onClick={() => setFilters(f => ({ ...f, noWebsite: !f.noWebsite }))}
                    className={`text-[10px] font-bold uppercase px-3 py-1.5 rounded-full transition-colors border ${filters.noWebsite ? 'bg-red-100 text-red-700 border-red-200' : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'}`}
                >
                    Sem Site Próprio
                </button>

                <button 
                    onClick={() => setFilters(f => ({ ...f, noEcommerce: !f.noEcommerce }))}
                    className={`text-[10px] font-bold uppercase px-3 py-1.5 rounded-full transition-colors border ${filters.noEcommerce ? 'bg-orange-100 text-orange-700 border-orange-200' : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'}`}
                >
                    Sem E-commerce / Catálogo
                </button>

                <button 
                    onClick={() => setFilters(f => ({ ...f, hasInstagram: !f.hasInstagram }))}
                    className={`text-[10px] font-bold uppercase px-3 py-1.5 rounded-full transition-colors border ${filters.hasInstagram ? 'bg-pink-100 text-pink-700 border-pink-200' : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'}`}
                >
                    Tem Instagram
                </button>

                <div className="flex items-center gap-2 border-l border-slate-200 pl-4 ml-2">
                    <input
                        type="number"
                        placeholder="Máx. Avaliações (Ex: 10)"
                        value={filters.maxReviews}
                        onChange={(e) => setFilters(f => ({ ...f, maxReviews: e.target.value }))}
                        className="text-[10px] font-bold px-3 py-1.5 rounded-full border border-slate-200 bg-slate-50 text-slate-700 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 w-36 transition-all"
                    />

                    <input
                        type="text"
                        placeholder="Segmento (Ex: Roupas)"
                        value={filters.segment}
                        onChange={(e) => setFilters(f => ({ ...f, segment: e.target.value }))}
                        className="text-[10px] font-bold px-3 py-1.5 rounded-full border border-slate-200 bg-slate-50 text-slate-700 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 w-32 transition-all"
                    />
                </div>
            </div>

            {/* Kanban Board */}
            <main className="flex-1 p-6 overflow-x-auto relative">
                <div className="flex gap-6 min-w-max h-full">
                    {COLUMNS.map((col, index) => {
                        const colLeads = leads.filter(l => {
                            if (l.status !== col.id) return false;
                            if (filters.onlyWithPhone && !l.phone) return false;
                            if (filters.noWebsite && l.website) return false;
                            if (filters.noEcommerce && l.orderUrl) return false;
                            if (filters.hasInstagram && !l.instagram) return false;
                            
                            if (filters.maxReviews !== '') {
                                const max = parseInt(filters.maxReviews, 10);
                                if (!isNaN(max) && (l.reviewsCount || 0) > max) return false;
                            }

                            if (filters.segment !== '') {
                                if (!l.category || !l.category.toLowerCase().includes(filters.segment.toLowerCase())) {
                                    return false;
                                }
                            }
                            return true;
                        });

                        return (
                            <div key={col.id} className={`w-80 flex flex-col rounded-3xl ${col.color} border ${col.border} overflow-hidden max-h-[calc(100vh-140px)] shadow-sm`}>
                                <div className="p-4 border-b border-black/5 bg-white/50 backdrop-blur-sm flex justify-between items-center shrink-0">
                                    <h3 className="font-black text-slate-800 uppercase text-xs tracking-widest">{col.title}</h3>
                                    <span className="bg-white text-slate-600 text-[10px] font-black px-2 py-0.5 rounded-full shadow-sm">{colLeads.length}</span>
                                </div>
                                <div className="flex-1 p-4 overflow-y-auto custom-scrollbar space-y-3">
                                    {colLeads.length === 0 && <p className="text-center text-xs font-bold text-slate-400 mt-4 opacity-50">Vazio</p>}
                                    {colLeads.map(lead => <LeadCard key={lead.id} lead={lead} colIndex={index} />)}
                                </div>
                            </div>
                        );
                    })}
               </div>
            </main>

            {/* MODAL DE ABORDAGEM MANUAL (WHATSAPP WEB) */}
            <AnimatePresence>
                {approachLead && (
                    <motion.div 
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
                    >
                        <motion.div 
                            initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
                            className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col border border-slate-200"
                        >
                            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                                <div>
                                    <h3 className="text-slate-800 font-black uppercase tracking-widest text-sm flex items-center gap-2">
                                        <MessageSquareText size={16} className="text-blue-600" />
                                        Escolher Abordagem
                                    </h3>
                                    <p className="text-[10px] text-slate-500 font-bold mt-1 uppercase tracking-wider">
                                        Destino: <span className="text-blue-600">{approachLead.name}</span> ({approachLead.phone})
                                    </p>
                                </div>
                                <button onClick={() => setApproachLead(null)} className="text-slate-400 hover:text-slate-700 transition-colors bg-white p-2 rounded-full shadow-sm">
                                    <X size={16} />
                                </button>
                            </div>
                            
                            <div className="p-4 flex flex-col gap-3 max-h-[60vh] overflow-y-auto custom-scrollbar">
                                <p className="text-xs text-slate-500 font-medium mb-2">
                                    Clique em uma das mensagens abaixo. O sistema vai preencher os dados do lead e abrir seu WhatsApp Web ou App.
                                </p>

                                {PROMO_TEMPLATES.map((template, idx) => (
                                    <button 
                                        key={idx}
                                        onClick={() => executeManualApproach(template.text)}
                                        className="text-left bg-white border border-slate-200 p-4 rounded-2xl hover:border-blue-400 hover:ring-2 hover:ring-blue-100 transition-all group relative"
                                    >
                                        <h4 className="font-black text-slate-800 text-xs uppercase tracking-widest mb-2 flex justify-between items-center">
                                            {template.title}
                                            <ExternalLink size={14} className="text-slate-300 group-hover:text-blue-500 transition-colors" />
                                        </h4>
                                        <p className="text-sm text-slate-600 leading-relaxed">
                                            {template.text
                                                .replace(/\[Nome\]/gi, `<strong class="text-blue-600">${approachLead.name?.split(' ')[0] || 'pessoal'}</strong>`)
                                                .replace(/\[Nicho\]/gi, `<strong class="text-blue-600">${approachLead.category !== 'Desconhecido' ? approachLead.category : 'loja'}</strong>`)
                                            }
                                        </p>
                                        <div dangerouslySetInnerHTML={{ __html: '' }} />
                                    </button>
                                ))}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

        </div>
    );
}