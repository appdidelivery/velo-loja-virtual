"use client";

import React, { useState } from 'react';
import { signInWithPopup, GoogleAuthProvider, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@/services/firebase';
import { useRouter } from 'next/navigation';
import { ShoppingBag, AlertCircle, Loader2, Mail, Lock } from 'lucide-react';

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();

  // --- MOTOR SAAS: VERIFICA OU CRIA A LOJA AUTOMATICAMENTE ---
  const handleTenantSetup = async (user: any) => {
    // Usamos o UID do usuário como o ID oficial da loja (Segurança e Performance)
    const tenantRef = doc(db, 'tenants', user.uid);
    const tenantSnap = await getDoc(tenantRef);

    if (!tenantSnap.exists()) {
      // Se não existe, é um Lojista NOVO! Criamos a loja grátis pra ele na hora.
      // Cria um link inicial baseado no ID, que o cliente poderá alterar depois
      const baseSlug = `loja-${user.uid.substring(0, 6).toLowerCase()}`;

      await setDoc(tenantRef, {
        ownerId: user.uid,
        ownerEmail: user.email,
        businessName: 'Nova Loja',
        slug: baseSlug, // <-- ADICIONADO AQUI
        slogan: 'Catálogo Exclusivo',
        storeMode: 'ecommerce',
        templateId: 'nativo_app',
        productLayout: 'list',
        plan: 'gratis',
        createdAt: serverTimestamp()
      });
      console.log("🏪 Nova loja criada com sucesso para:", user.email);
    } else {
      console.log("🏪 Loja existente carregada para:", user.email);
    }
  };

  // Login Tradicional (E-mail e Senha)
  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return setError('Preencha seu e-mail e senha.');
    
    setIsLoading(true);
    setError('');
    
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      await handleTenantSetup(result.user); // Roda a trava de criação da loja
      router.push('/admin');
    } catch (err: any) {
      console.error(err);
      setError('E-mail ou senha incorretos. Verifique seus dados.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError('');
    
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      
      const result = await signInWithPopup(auth, provider);
      await handleTenantSetup(result.user); // Roda a trava de criação da loja
      router.push('/admin');
      
    } catch (err: any) {
      console.error(err);
      setError('Erro ao fazer login com o Google. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f4f7f6] flex items-center justify-center p-4 selection:bg-[#0055ff] selection:text-white">
      <div className="max-w-md w-full bg-white rounded-[2rem] shadow-2xl p-8 md:p-10 border border-white">
        
        {/* Cabeçalho do Login */}
        <div className="flex flex-col items-center text-center mb-10">
          <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center overflow-hidden shadow-lg mb-4 border-4 border-gray-50 p-2">
            <img src="/velo loja virtual logo.png" alt="Velo Varejo Logo" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-2xl font-black uppercase tracking-tighter text-[#111827]">Velo Loja Virtual</h1>
          <p className="text-sm font-medium text-slate-500 mt-1">Acesso exclusivo para Lojistas e Equipes</p>
        </div>

        {/* Mensagem de Erro */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <p className="text-xs font-bold text-red-800">{error}</p>
          </div>
        )}

        {/* Formulário de E-mail e Senha */}
        <form onSubmit={handleEmailLogin} className="space-y-4 mb-6">
          <div className="relative">
            <Mail className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="email" 
              placeholder="Seu e-mail de acesso"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-gray-50 border-2 border-gray-100 text-sm font-bold text-slate-800 py-4 pl-12 pr-4 rounded-2xl outline-none focus:border-[#111827] transition-all"
            />
          </div>
          <div className="relative">
            <Lock className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="password" 
              placeholder="Sua senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-gray-50 border-2 border-gray-100 text-sm font-bold text-slate-800 py-4 pl-12 pr-4 rounded-2xl outline-none focus:border-[#111827] transition-all"
            />
          </div>
          <button 
            type="submit" 
            disabled={isLoading}
            className="w-full bg-[#111827] hover:bg-black text-white font-black uppercase tracking-wider text-[11px] py-4 rounded-2xl shadow-lg shadow-black/20 transition-all flex items-center justify-center disabled:opacity-70"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Entrar no Painel'}
          </button>
        </form>

        {/* Divisor */}
        <div className="flex items-center gap-3 w-full mb-6">
          <div className="h-[2px] bg-gray-100 flex-1"></div>
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">OU</span>
          <div className="h-[2px] bg-gray-100 flex-1"></div>
        </div>

        {/* Botão do Google */}
        <button
          onClick={handleGoogleLogin}
          type="button"
          disabled={isLoading}
          className="w-full relative flex items-center justify-center gap-3 bg-white border-2 border-gray-200 hover:border-[#0055ff] hover:bg-blue-50 text-slate-800 font-bold px-6 py-4 rounded-2xl transition-all group disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {/* Ícone SVG Original do Google */}
          <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
          </svg>
          <span className="text-sm group-hover:text-[#0055ff] transition-colors">Entrar com Google</span>
        </button>

        <p className="text-center text-[10px] text-slate-400 font-medium mt-8 leading-relaxed">
          Ao fazer login, você concorda com nossos Termos de Serviço e Política de Privacidade do Velo Varejo SaaS.
        </p>

      </div>
    </div>
  );
}