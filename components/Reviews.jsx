import React, { useState, useEffect } from 'react';
import { db } from '../services/firebase';
import { collection, query, where, limit, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { Star, ThumbsUp } from 'lucide-react';
import { FaGoogle } from 'react-icons/fa6';

// Conversor de estrelas do Google (que vêm como texto) para números
const mapGoogleRating = (ratingStr) => {
    const map = { ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5 };
    return map[ratingStr] || 5;
};

export default function Reviews({ storeId }) {
    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [newRating, setNewRating] = useState(5);
    const [comment, setComment] = useState('');
    const [orderId, setOrderId] = useState('');
    const [customerName, setCustomerName] = useState('');

    useEffect(() => {
        const fetchAllReviews = async () => {
            if (!storeId) {
                setLoading(false);
                return;
            }

            try {
                // 1. Busca as avaliações manuais do Firebase
                const fetchFirebase = async () => {
                    const q = query(collection(db, "reviews"), where("storeId", "==", storeId), limit(50));
                    const snapshot = await getDocs(q);
                    return snapshot.docs.map(doc => {
                        const data = doc.data();
                        return {
                            id: doc.id,
                            customerName: data.customerName,
                            comment: data.comment,
                            rating: Number(data.rating || 5),
                            source: 'site',
                            createdAt: data.createdAt?.seconds || 0
                        };
                    });
                };

                // 2. Busca as avaliações OFICIAIS do Google direto da nossa API
                const fetchGoogle = async () => {
                    try {
                        const res = await fetch(`/api/google-gmb?action=getReviews&storeId=${storeId}`);
                        const data = await res.json();
                        if (data.success && data.reviews?.reviews) {
                            return data.reviews.reviews.map(r => ({
                                id: r.reviewId,
                                customerName: r.reviewer?.displayName || 'Cliente Google',
                                photoUrl: r.reviewer?.profilePhotoUrl,
                                comment: r.comment || '',
                                rating: mapGoogleRating(r.starRating),
                                source: 'google',
                                // Converte o tempo do Google para o mesmo formato do Firebase para ordenar
                                createdAt: new Date(r.createTime).getTime() / 1000 
                            }));
                        }
                        return [];
                    } catch (e) {
                        return []; // Se a loja não tiver GMB conectado, ignora silenciosamente
                    }
                };

                // Roda as duas buscas ao mesmo tempo para ser super rápido
                const [fbReviews, googleReviews] = await Promise.all([fetchFirebase(), fetchGoogle()]);

                // Junta tudo e ordena do mais recente pro mais antigo
                const combinedReviews = [...fbReviews, ...googleReviews].sort((a, b) => b.createdAt - a.createdAt);
                
                // Remove avaliações do Google que não têm texto (só deixaram as estrelas) para a vitrine ficar bonita
                const filteredReviews = combinedReviews.filter(r => r.comment && r.comment.trim() !== '');

                setReviews(filteredReviews);

            } catch (error) {
                console.error("❌ Erro ao compilar avaliações:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchAllReviews();
    }, [storeId]);

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
                source: 'site', 
                createdAt: serverTimestamp()
            });
            
            alert("✅ Avaliação enviada com sucesso! Muito obrigado.");
            
            setComment('');
            setOrderId('');
            setCustomerName('');
            setNewRating(5);
            
            window.location.reload();

        } catch (error) {
            alert("Erro ao enviar avaliação! Verifique sua conexão e tente novamente.");
        }
    };

    const totalReviews = reviews.length;
    const averageRating = totalReviews > 0 
        ? (reviews.reduce((acc, curr) => acc + curr.rating, 0) / totalReviews).toFixed(1) 
        : 5.0;

    return (
        <div className="bg-white p-6 md:p-8 rounded-[2.5rem] shadow-sm border border-slate-100 mt-8 mb-4 relative">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                    <h2 className="text-2xl font-black italic uppercase text-slate-800 mb-1">Avaliações de Clientes</h2>
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
                    <div className="bg-green-100 text-green-700 flex items-center gap-2 px-4 py-2 rounded-2xl border border-green-200 shadow-sm">
                        <ThumbsUp size={20} className="mb-1" />
                        <div className="flex flex-col">
                            <span className="text-xs font-black uppercase tracking-widest leading-none">Excelente</span>
                            <span className="text-[9px] font-bold opacity-80 uppercase tracking-widest">Loja Verificada</span>
                        </div>
                    </div>
                )}
            </div>
            
            <div className="space-y-4 mb-8 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
                {loading ? (
                    <div className="flex justify-center py-10"><div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div></div>
                ) : reviews.length === 0 ? (
                    <div className="text-center p-6 bg-slate-50 border border-dashed border-slate-200 rounded-2xl">
                        <p className="text-slate-500 font-bold text-sm">Nenhuma avaliação ainda.</p>
                        <p className="text-slate-400 font-medium text-xs mt-1">Preencha o formulário abaixo e seja o primeiro a avaliar!</p>
                    </div>
                ) : reviews.map(r => (
                    <div key={r.id} className="bg-slate-50 p-5 rounded-3xl border border-slate-100 relative overflow-hidden">
                        <div className="flex justify-between items-start mb-3">
                            <div className="flex items-center gap-3">
                                {/* Se for do Google e tiver foto, mostra a foto do cliente. Senão, mostra a letra inicial. */}
                                {r.photoUrl ? (
                                    <img src={r.photoUrl} alt={r.customerName} className="w-10 h-10 rounded-full shadow-sm" />
                                ) : (
                                    <div className="w-10 h-10 bg-white border border-slate-200 rounded-full flex items-center justify-center font-black text-slate-600 shadow-sm">
                                        {r.customerName.charAt(0).toUpperCase()}
                                    </div>
                                )}
                                
                                <div className="flex flex-col">
                                    <span className="font-black text-sm text-slate-800 tracking-tight leading-none">{r.customerName}</span>
                                    {r.source === 'google' && (
                                        <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest flex items-center gap-1 mt-1">
                                            <FaGoogle size={10} /> Google Review
                                        </span>
                                    )}
                                </div>
                            </div>
                            <div className="flex text-yellow-400 bg-white px-2 py-1 rounded-lg border border-slate-100 shadow-sm">
                                {[...Array(5)].map((_, i) => (
                                    <Star key={i} size={12} fill={i < r.rating ? "currentColor" : "none"} />
                                ))}
                            </div>
                        </div>
                        <p className="text-sm text-slate-600 font-medium leading-relaxed italic">"{r.comment}"</p>
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