import React, { useState, useEffect } from 'react';
import { db } from '../services/firebase';
import { collection, query, where, limit, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { Star, ThumbsUp, ImageIcon } from 'lucide-react';

export default function Reviews({ storeId }) {
    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isSyncing, setIsSyncing] = useState(false);
    const [newRating, setNewRating] = useState(5);
    const [comment, setComment] = useState('');
    const [orderId, setOrderId] = useState('');
    const [customerName, setCustomerName] = useState('');

    useEffect(() => {
        const fetchReviews = async () => {
            if (!storeId) {
                setLoading(false);
                return;
            }

            console.log("🔍 Buscando avaliações para a loja ID:", storeId); // LOG PARA DEBUG

            try {
                const q = query(
                    collection(db, "reviews"),
                    where("storeId", "==", storeId),
                    limit(100) 
                );
                const snapshot = await getDocs(q);
                
                const fetchedReviews = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                
                // CORREÇÃO CRÍTICA: Ordenação segura de datas no Firebase
                fetchedReviews.sort((a, b) => {
                    const timeA = a.createdAt?.seconds || 0;
                    const timeB = b.createdAt?.seconds || 0;
                    return timeB - timeA; // Maior para menor (mais recente primeiro)
                });
                
                setReviews(fetchedReviews);
                console.log("✅ Avaliações encontradas:", fetchedReviews.length); // LOG PARA DEBUG
            } catch (error) {
                console.error("❌ Erro ao carregar avaliações do Firestore:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchReviews();
    }, [storeId]);

    const handleSyncGoogleReviews = async () => {
        setIsSyncing(true);
        try {
            // Agora ele chama o Backend do seu próprio Next.js
            const response = await fetch('/api/sync-google-reviews', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ storeId })
            });

            if (!response.ok) {
                throw new Error("Erro de comunicação com o servidor.");
            }
            
            const data = await response.json();
            alert(`✅ Sucesso: ${data.message}`);
            
            // Recarrega para mostrar as novas avaliações do banco
            window.location.reload(); 
        } catch (error) {
            console.error("Erro na sincronização:", error);
            alert("⚠️ Erro ao buscar avaliações do Google. Verifique a integração.");
        } finally {
            setIsSyncing(false);
        }
    };

    const handleSubmitReview = async (e) => {
        e.preventDefault();
        
        if (!orderId || !comment || !customerName) {
            return alert("Por favor, preencha todos os campos!");
        }
        
        try {
            await addDoc(collection(db, "reviews"), {
                storeId,
                orderId,
                rating: newRating,
                comment,
                customerName,
                source: 'site', // Adicionado para identificar que veio da loja
                createdAt: serverTimestamp()
            });
            
            alert("✅ Avaliação enviada com sucesso! Muito obrigado.");
            
            setComment('');
            setOrderId('');
            setCustomerName('');
            setNewRating(5);
            
            window.location.reload();

        } catch (error) {
            console.error("❌ Erro ao salvar avaliação no banco:", error);
            alert("Erro ao enviar avaliação! Verifique sua conexão e tente novamente.");
        }
    };

    const totalReviews = reviews.length;
    const averageRating = totalReviews > 0 
        ? (reviews.reduce((acc, curr) => acc + Number(curr.rating || 5), 0) / totalReviews).toFixed(1) 
        : 5.0;

    return (
        <div className="bg-white p-6 md:p-8 rounded-[2.5rem] shadow-sm border border-slate-100 mt-8 mb-4 relative">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                    <h2 className="text-2xl font-black italic uppercase text-slate-800 mb-1">Avaliações da Loja</h2>
                    <div className="flex items-center gap-3">
                        <span className="text-4xl font-black text-slate-900">{averageRating}</span>
                        <div className="flex flex-col">
                            <div className="flex text-yellow-400">
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <Star key={star} size={18} fill={star <= Math.round(averageRating) ? "currentColor" : "none"} />
                                ))}
                            </div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                                Baseado em {totalReviews} avaliações
                            </span>
                        </div>
                    </div>
                </div>
                
                {averageRating >= 4.0 && totalReviews > 0 && (
                    <div className="flex flex-col gap-2">
                        <div className="bg-green-100 text-green-700 flex items-center gap-2 px-4 py-2 rounded-2xl border border-green-200 shadow-sm">
                            <ThumbsUp size={20} className="mb-1" />
                            <div className="flex flex-col">
                                <span className="text-xs font-black uppercase tracking-widest leading-none">Excelente</span>
                                <span className="text-[9px] font-bold opacity-80 uppercase tracking-widest">Loja Verificada</span>
                            </div>
                        </div>
                        
                        {window.location.pathname.includes('/admin') && (
                            <button 
                                onClick={handleSyncGoogleReviews}
                                disabled={isSyncing}
                                className="text-[10px] font-bold text-blue-600 underline hover:text-blue-800 uppercase tracking-widest"
                            >
                                {isSyncing ? "Sincronizando..." : "Atualizar do Google"}
                            </button>
                        )}
                    </div>
                )}
            </div>
            
            <div className="space-y-4 mb-8 max-h-80 overflow-y-auto custom-scrollbar pr-2">
                {loading ? (
                    <p className="text-slate-500 font-bold animate-pulse">Buscando avaliações...</p>
                ) : reviews.length === 0 ? (
                    <div className="text-center p-6 bg-slate-50 border border-dashed border-slate-200 rounded-2xl">
                        <p className="text-slate-500 font-bold text-sm">Nenhuma avaliação ainda.</p>
                        <p className="text-slate-400 font-medium text-xs mt-1">Preencha o formulário abaixo e seja o primeiro a avaliar!</p>
                    </div>
                ) : reviews.map(r => (
                    <div key={r.id} className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                        <div className="flex justify-between items-center mb-3">
                            <div className="flex items-center gap-2">
                                <span className="font-black text-sm text-slate-800 uppercase tracking-tight">{r.customerName}</span>
                                {r.source === 'google' && (
                                    <span className="bg-blue-500 text-[8px] text-white px-1.5 py-0.5 rounded-md font-black">GOOGLE</span>
                                )}
                            </div>
                            <div className="flex text-yellow-400">
                                {[...Array(5)].map((_, i) => (
                                    <Star key={i} size={16} fill={i < r.rating ? "currentColor" : "none"} />
                                ))}
                            </div>
                        </div>
                        <p className="text-sm text-slate-600 font-medium leading-relaxed">{r.comment}</p>
                    </div>
                ))}
            </div>

            <form onSubmit={handleSubmitReview} className="pt-6 border-t border-slate-100 space-y-4">
                <h3 className="font-black text-xs text-slate-400 uppercase tracking-widest mb-2">Deixe sua avaliação</h3>
                
                <div className="flex gap-2 mb-4">
                    {[1, 2, 3, 4, 5].map(star => (
                        <Star 
                            key={star} 
                            size={36} 
                            className="cursor-pointer text-yellow-400 transition-transform hover:scale-110" 
                            fill={star <= newRating ? "currentColor" : "none"} 
                            onClick={() => setNewRating(star)}
                        />
                    ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input 
                        type="text" 
                        placeholder="Seu Nome (Como quer aparecer)" 
                        className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold text-sm focus:ring-2 ring-blue-500 transition-all" 
                        value={customerName} 
                        onChange={e => setCustomerName(e.target.value)} 
                        required 
                    />
                    <input 
                        type="text" 
                        placeholder="ID do Pedido (Ex: abcd1)" 
                        className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold text-sm focus:ring-2 ring-blue-500 transition-all" 
                        value={orderId} 
                        onChange={e => setOrderId(e.target.value)} 
                        required 
                    />
                </div>
                
                <textarea 
                    placeholder="Conte para a gente: O que achou do seu pedido e da entrega?" 
                    className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold text-sm focus:ring-2 ring-blue-500 transition-all resize-none" 
                    rows="3" 
                    value={comment} 
                    onChange={e => setComment(e.target.value)} 
                    required
                ></textarea>
                
                <button 
                    type="submit" 
                    className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-blue-200 hover:bg-blue-700 active:scale-95 transition-all mt-2"
                >
                    Enviar Avaliação
                </button>
            </form>
        </div>
    );
}