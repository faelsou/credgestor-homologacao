import React, { useState, useEffect } from 'react';
import { Lock, CheckCircle, X, ArrowLeft } from 'lucide-react';
import { resetPassword } from '@/services/api';

export const ResetPassword: React.FC = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tokenHash, setTokenHash] = useState<string | null>(null);

  useEffect(() => {
    // Extrair token da URL
    // O Supabase pode enviar o token de várias formas:
    // 1. Como query param: ?access_token=... ou ?token=...
    // 2. Como hash: #access_token=...
    const urlParams = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    
    const tokenFromQuery = urlParams.get('access_token') || urlParams.get('token');
    const tokenFromHash = hashParams.get('access_token') || hashParams.get('token');
    
    const token = tokenFromQuery || tokenFromHash;
    
    if (token) {
      setTokenHash(token);
    } else {
      setError('Token de reset não encontrado na URL. Verifique o link do email.');
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!tokenHash) {
      setError('Token de reset não encontrado. Verifique o link do email.');
      return;
    }

    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }

    setIsSubmitting(true);

    try {
      await resetPassword(password, tokenHash);
      setSuccess(true);
      // Limpar a URL após sucesso
      window.history.replaceState({}, document.title, '/');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido ao resetar senha';
      console.error('❌ Erro ao resetar senha:', error);
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-blue-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl w-full max-w-md p-8 shadow-2xl">
          <div className="text-center">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle size={32} />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">
              Senha resetada com sucesso!
            </h2>
            <p className="text-slate-600 mb-6">
              Sua senha foi alterada. Você já pode fazer login com a nova senha.
            </p>
            <a
              href="/"
              className="inline-block bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-3 rounded-xl shadow-lg shadow-emerald-200 transition-transform active:scale-95"
            >
              Ir para login
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-blue-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md p-8 shadow-2xl">
        <div className="mb-6 text-center">
          <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center mx-auto mb-4">
            <Lock size={24} />
          </div>
          <h2 className="text-2xl font-bold text-slate-900">
            Redefinir senha
          </h2>
          <p className="text-slate-500 text-sm mt-1">
            Digite sua nova senha abaixo
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg flex items-center gap-2">
              <X size={16} />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-sm font-semibold text-slate-700">Nova senha</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="password"
                required
                minLength={6}
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all outline-none"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isSubmitting || !tokenHash}
              />
            </div>
            <p className="text-xs text-slate-500">Mínimo de 6 caracteres</p>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-semibold text-slate-700">Confirmar senha</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="password"
                required
                minLength={6}
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all outline-none"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={isSubmitting || !tokenHash}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !tokenHash}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-emerald-200 transition-transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Redefinindo...' : 'Redefinir senha'}
          </button>

          <div className="text-center">
            <a
              href="/"
              className="text-sm text-emerald-600 hover:text-emerald-700 font-medium transition inline-flex items-center gap-1"
            >
              <ArrowLeft size={14} />
              Voltar para login
            </a>
          </div>
        </form>
      </div>
    </div>
  );
};
