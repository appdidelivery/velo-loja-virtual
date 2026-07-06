"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation'; // Next.js Router
import { signOut } from 'firebase/auth';
import { auth, db } from '@/services/firebase'; // Ajuste o caminho se necessário
import { collection, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { 
    Store, ShieldAlert, LogOut, Menu, X, Loader2, 
    Zap, CreditCard, Lock, Ban, Trash2, CheckCircle2, Play, Activity, LayoutDashboard
} from 'lucide-react';

export default function SaasAdminPage() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState('lojas');
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const [globalLoading, setGlobalLoading] = useState(true);
    const [tenantsList, setTenantsList] = useState<any[]>([]);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    // 🔒 TRAVA DE SEGURANÇA MASTER
    const MASTER_EMAILS = [
        'projetosdiego.l@gmail.com', 
        'appdidelivery@gmail.com',
        'appdedelivery@gmail.com',
        'admin@mamedes.com.br' // Adicionei para você conseguir testar
    ]; 

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged(async (user) => {
            if (!user) { 
                setTimeout(() => router.replace('/login'), 500);
                return; 
            }
            
            const userEmail = user.email ? user.email.toLowerCase() : 'sem-email';

            if (!MASTER_EMAILS.includes(userEmail)) {
                alert(`ACESSO NEGADO!\n\nEmail bloqueado: ${userEmail}`);
                router.replace('/admin'); 
                return;
            }
            
            await fetchSaaSData();
            setGlobalLoading(false);
        });
        
        return () => unsubscribe();
    }, [router]);

    const fetchSaaSData = async () => {
        try {
            // Na Velo Loja Virtual a coleção base é 'tenants'
            const tenantsSnap = await getDocs(collection(db, 'tenants'));
            const allTenants = tenantsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
            setTenantsList(allTenants);
        } catch (error) { console.error("Erro:", error); }
    };

    // --- AÇÕES DO FIREBASE ---
    const handleUpdateBillingStatus = async (tenantId: string, newStatus: string) => {
        if (!window.confirm(`Mudar status financeiro para: ${newStatus.toUpperCase()}?`)) return;
        setActionLoading(`billing_${tenantId}`);
        try {
            await updateDoc(doc(db, 'tenants', tenantId), { billingStatus: newStatus });
            await fetchSaaSData(); 
        } catch (error: any) { alert('Erro: ' + error.message); } 
        finally { setActionLoading(null); }
    };

    const handleUpdatePlan = async (tenantId: string, newPlan: string) => {
        if (!window.confirm(`Deseja alterar o plano desta loja para o plano ${newPlan.toUpperCase()}?`)) return;
        setActionLoading(`plan_${tenantId}`);
        try {
            await updateDoc(doc(db, 'tenants', tenantId), { plan: newPlan });
            await fetchSaaSData(); 
            alert('Plano atualizado com sucesso!');
        } catch (error: any) { alert('Erro: ' + error.message); } 
        finally { setActionLoading(null); }
    };

    const handleMagicUnlock = async (tenantId: string) => {
        if (!window.confirm("🪄 ATENÇÃO: Isso ativará o plano INFINITY e marcará a loja como CORTESIA VITALÍCIA (Irá esconder a aba de Planos do cliente).\n\nDeseja continuar?")) return;
        setActionLoading(`magic_${tenantId}`);
        try {
            await updateDoc(doc(db, 'tenants', tenantId), { 
                plan: 'infinity',
                billingStatus: 'gratis_vitalicio',
            });
            await fetchSaaSData(); 
            alert('✅ Mágica Feita! Loja liberada 100% como cortesia.');
        } catch (error: any) { alert('Erro: ' + error.message); } 
        finally { setActionLoading(null); }
    };

    const handleImpersonate = (tenantId: string) => {
        if (!window.confirm("Você entrará no painel deste cliente.\nPara voltar ao Master Admin depois, você precisará limpar a URL.\nDeseja continuar?")) return;
        
        // Simulação de Impersonate no Frontend (força a URL do tenant)
        window.open(`http://${tenantId}.localhost:3000/admin`, '_blank'); // Ajuste para produção depois
    };

    const handleDeleteStore = async (tenantId: string, storeName: string) => {
        const travaDeSeguranca = window.prompt(`BLINDAGEM DE SEGURANÇA:\nPara confirmar a exclusão de ${storeName || tenantId}, digite a palavra EXCLUIR:`);
        if (travaDeSeguranca !== 'EXCLUIR') return alert('Cancelado.');

        setActionLoading(`delete_${tenantId}`);
        try {
            await deleteDoc(doc(db, 'tenants', tenantId));
            await fetchSaaSData();
        } catch (error: any) { alert('Erro ao excluir: ' + error.message); } 
        finally { setActionLoading(null); }
    };

    const renderBillingBadge = (status: string) => {
        switch (status) {
            case 'pago': return <span className="flex w-fit items-center gap-1 bg-emerald-500/10 text-emerald-500 text-[10px] font-bold px-2 py-1 rounded"><CheckCircle2 size={12}/> Pago</span>;
            case 'pendente': return <span className="flex w-fit items-center gap-1 bg-amber-500/10 text-amber-500 text-[10px] font-bold px-2 py-1 rounded"><Lock size={12}/> Pendente</span>;
            case 'teste': return <span className="flex w-fit items-center gap-1 bg-blue-500/10 text-blue-400 text-[10px] font-bold px-2 py-1 rounded"><Activity size={12}/> Teste</span>;
            case 'gratis_vitalicio': return <span className="flex w-fit items-center gap-1 bg-purple-500/10 text-purple-400 text-[10px] font-bold px-2 py-1 rounded"><ShieldAlert size={12}/> Cortesia VIP</span>;
            case 'bloqueado': return <span className="flex w-fit items-center gap-1 bg-red-500/10 text-red-400 text-[10px] font-bold px-2 py-1 rounded"><Ban size={12}/> Bloqueado</span>;
            default: return <span className="flex w-fit items-center gap-1 bg-slate-500/10 text-slate-400 text-[10px] font-bold px-2 py-1 rounded">Sem Fatura</span>;
        }
    };

    if (globalLoading) return <div className="flex h-screen items-center justify-center bg-slate-950"><Loader2 className="animate-spin text-blue-500 w-12 h-12"/></div>;

    return (
        <div className="flex h-screen bg-slate-950 overflow-hidden font-sans text-slate-300">
            <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 border-r border-slate-800 transform transition-transform duration-300 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0 flex flex-col`}>
                <div className="p-6 border-b border-slate-800 flex justify-between items-center">
                    <h2 className="font-black text-white text-xl flex items-center gap-2"><Zap size={20} className="text-blue-500 fill-blue-500" /> DARK OPS</h2>
                    <button onClick={() => setIsMobileMenuOpen(false)} className="md:hidden text-slate-400"><X /></button>
                </div>
                <nav className="p-4 space-y-1 flex-1 overflow-y-auto">
                    <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all bg-blue-600/10 text-blue-400 border border-blue-500/20">
                        <Store size={18} /> Controle de Lojas
                    </button>
                </nav>
                <div className="p-4 border-t border-slate-800 bg-slate-900">
                    <button onClick={async () => { await signOut(auth); router.replace('/login'); }} className="w-full flex items-center gap-3 px-4 py-3 text-red-400 font-bold hover:bg-red-500/10 rounded-xl transition-colors"><LogOut size={18} /> Sair</button>
                </div>
            </aside>
            <main className="flex-1 overflow-y-auto bg-[#0B0F19] p-6 md:p-10 relative">
                <header className="md:hidden mb-6 flex justify-between"><button onClick={() => setIsMobileMenuOpen(true)} className="text-white"><Menu /></button></header>
                
                <div className="max-w-7xl mx-auto space-y-6">
                    <div>
                        <h2 className="text-3xl font-black text-white mb-2">Controle de Clientes (Velo Loja Virtual)</h2>
                        <p className="text-slate-400">Ligue módulos, altere planos ou ative o modo cortesia para esconder a tela de faturas do lojista.</p>
                    </div>

                    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-x-auto">
                        <table className="w-full text-left border-collapse min-w-[900px]">
                            <thead>
                                <tr className="bg-slate-950/50 border-b border-slate-800">
                                    <th className="p-4 text-slate-400 font-semibold text-sm">Tenant ID & Status</th>
                                    <th className="p-4 text-slate-400 font-semibold text-sm">Plano / Módulos</th>
                                    <th className="p-4 text-slate-400 font-semibold text-sm text-right">Ações Rápidas</th>
                                </tr>
                            </thead>
                            <tbody>
                                {tenantsList.map(loja => (
                                    <tr key={loja.id} className={`border-b border-slate-800/50 hover:bg-slate-800/20 ${loja.billingStatus === 'bloqueado' ? 'opacity-50' : ''}`}>
                                        <td className="p-4 min-w-[200px]">
                                            <p className="font-bold text-white uppercase">{loja.businessName || loja.id}</p>
                                            <div className="mt-2">{renderBillingBadge(loja.billingStatus)}</div>
                                            <p className="text-[10px] text-slate-500 mt-2 font-mono">{loja.id}</p>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex flex-col gap-3 min-w-[280px]">
                                                <div className="flex items-center gap-3">
                                                    <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Plano Ativo:</span>
                                                    <select 
                                                        value={loja.plan || 'gratis'} 
                                                        onChange={(e) => handleUpdatePlan(loja.id, e.target.value)}
                                                        disabled={actionLoading === `plan_${loja.id}`}
                                                        className="bg-slate-900 border border-slate-700 text-blue-400 text-xs font-black uppercase p-2.5 rounded-lg outline-none cursor-pointer focus:border-blue-500 transition-colors"
                                                    >
                                                        <option value="gratis">Grátis (R$ 0)</option>
                                                        <option value="pro">Pro (R$ 99,90)</option>
                                                        <option value="business">Business (R$ 199,90)</option>
                                                        <option value="enterprise">Enterprise (R$ 299,90)</option>
                                                        <option value="infinity">Infinito (Admin)</option>
                                                    </select>
                                                </div>

                                                <button 
                                                    onClick={() => handleMagicUnlock(loja.id)}
                                                    disabled={actionLoading === `magic_${loja.id}`}
                                                    className="w-fit flex items-center gap-2 bg-fuchsia-500/10 hover:bg-fuchsia-500/20 border border-fuchsia-500/30 text-fuchsia-400 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95"
                                                >
                                                    {actionLoading === `magic_${loja.id}` ? <Loader2 size={14} className="animate-spin"/> : <Zap size={14} className="fill-fuchsia-400" />}
                                                    Dar Cortesia (Esconder Fatura)
                                                </button>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex justify-end flex-wrap items-center gap-2">
                                                <button onClick={() => handleImpersonate(loja.id)} className="bg-blue-600/10 text-blue-500 hover:bg-blue-600/20 px-3 py-2 rounded-lg text-xs font-bold transition-colors flex items-center gap-1"><Play size={14} /> Espionar</button>
                                                <button onClick={() => handleUpdateBillingStatus(loja.id, loja.billingStatus === 'bloqueado' ? 'pago' : 'bloqueado')} className="bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 px-3 py-2 rounded-lg text-xs font-bold transition-colors flex items-center gap-1"><Lock size={14} /> Bloquear</button>
                                                <button onClick={() => handleDeleteStore(loja.id, loja.businessName)} className="bg-red-500/10 text-red-500 hover:bg-red-500/20 px-3 py-2 rounded-lg text-xs font-bold transition-colors"><Trash2 size={14} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>
        </div>
    );
}