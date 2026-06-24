"use client";

import React, { useState } from 'react';
import { Search, Send, User, ShoppingCart, X, CheckCircle2, AlertCircle, MessageSquare } from 'lucide-react';

export default function AdminChat() {
    const [chats, setChats] = useState([
        { id: '1', phone: '5511999999999', name: 'Cliente Teste', lastMessage: 'Olá, gostaria de fazer um pedido!', unread: true }
    ]);
    const [activeChat, setActiveChat] = useState<string | null>(null);
    const [messageText, setMessageText] = useState('');
    const [isSending, setIsSending] = useState(false);

    // Lógica para enviar mensagem via API da Meta que criamos
    const handleSendMessage = async () => {
        if (!messageText.trim() || !activeChat) return;

        setIsSending(true);
        try {
            // Puxa as credenciais que o lojista salvou no painel
            const metaPhoneId = localStorage.getItem('velo_meta_phone_id');
            const metaToken = localStorage.getItem('velo_meta_token');

            if (!metaPhoneId || !metaToken) {
                alert("⚠️ Erro: Vá na aba 'Integrações e APIs' e salve as credenciais da Meta primeiro.");
                setIsSending(false);
                return;
            }

            const res = await fetch('/api/whatsapp-send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    toPhone: activeChat,
                    text: messageText,
                    phoneNumberId: metaPhoneId,
                    apiToken: metaToken
                })
            });

            const data = await res.json();

            if (res.ok) {
                alert("✅ Mensagem enviada com sucesso para o WhatsApp do cliente!");
                setMessageText('');
            } else {
                alert(`❌ Erro ao enviar: ${data.error}`);
            }
        } catch (error) {
            console.error("Erro:", error);
            alert("Erro de conexão ao tentar enviar a mensagem.");
        } finally {
            setIsSending(false);
        }
    };

    return (
        <div className="flex h-[600px] border-2 border-gray-100 rounded-[2rem] bg-white overflow-hidden shadow-sm">
            {/* Lista de Contatos */}
            <div className="w-[320px] border-r-2 border-gray-100 bg-gray-50 flex flex-col">
                <div className="p-4 border-b-2 border-gray-100 bg-white">
                    <div className="relative">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input 
                            type="text" 
                            placeholder="Buscar conversa..." 
                            className="w-full bg-gray-50 border-none text-xs rounded-xl py-3 pl-10 pr-4 outline-none focus:ring-2 ring-[#00a884] font-bold"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {chats.map(chat => (
                        <div 
                            key={chat.id} 
                            onClick={() => setActiveChat(chat.phone)}
                            className={`p-4 border-b border-gray-100 cursor-pointer transition-colors flex items-center gap-3 ${activeChat === chat.phone ? 'bg-white shadow-sm' : 'hover:bg-gray-100'}`}
                        >
                            <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center shrink-0">
                                <User className="text-gray-500 w-5 h-5" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h4 className="font-black text-sm text-slate-800 truncate">{chat.name}</h4>
                                <p className="text-xs text-slate-500 truncate font-medium mt-0.5">{chat.lastMessage}</p>
                            </div>
                            {chat.unread && <div className="w-2.5 h-2.5 bg-[#00a884] rounded-full shrink-0"></div>}
                        </div>
                    ))}
                </div>
            </div>

            {/* Área da Conversa */}
            <div className="flex-1 flex flex-col bg-[#efeae2] relative">
                {activeChat ? (
                    <>
                        <div className="h-16 bg-white border-b-2 border-gray-100 flex items-center justify-between px-6 shrink-0 shadow-sm z-10">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-[#111827] rounded-full flex items-center justify-center shrink-0 text-white font-bold">
                                    {chats.find(c => c.phone === activeChat)?.name.charAt(0)}
                                </div>
                                <div>
                                    <h3 className="font-black text-slate-800">{chats.find(c => c.phone === activeChat)?.name}</h3>
                                    <p className="text-[10px] text-slate-500 font-bold">+{activeChat}</p>
                                </div>
                            </div>
                        </div>

                        <div className="flex-1 p-6 overflow-y-auto">
                            {/* Balão de Mensagem de Teste */}
                            <div className="bg-white p-3 rounded-2xl rounded-tl-none w-fit max-w-[70%] shadow-sm mb-4">
                                <p className="text-sm font-medium text-slate-700">Olá, gostaria de fazer um pedido!</p>
                                <span className="text-[9px] text-slate-400 mt-1 block text-right">14:30</span>
                            </div>
                        </div>

                        <div className="p-4 bg-[#f0f2f5] shrink-0 flex items-center gap-3">
                            <input 
                                type="text" 
                                placeholder="Digite sua mensagem (Disparará direto na Meta)..." 
                                value={messageText}
                                onChange={(e) => setMessageText(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                                className="flex-1 bg-white p-4 rounded-xl border-none outline-none font-medium text-sm shadow-sm focus:ring-2 ring-[#00a884]"
                            />
                            <button 
                                onClick={handleSendMessage}
                                disabled={isSending}
                                className="w-12 h-12 bg-[#00a884] hover:bg-[#008f6f] text-white rounded-xl flex items-center justify-center shadow-md transition-colors disabled:opacity-50"
                            >
                                {isSending ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <Send size={20} className="ml-1" />}
                            </button>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-4">
                        <MessageSquare size={64} className="opacity-50" />
                        <p className="font-black uppercase tracking-widest text-sm">Velo Web Chat</p>
                        <p className="text-xs font-bold text-slate-500">Selecione uma conversa ao lado para iniciar.</p>
                    </div>
                )}
            </div>
        </div>
    );
}