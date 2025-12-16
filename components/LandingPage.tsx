import React, { useContext, useState } from 'react';
import { Menu, X, CheckCircle, TrendingUp, Shield, Smartphone, ArrowRight, BarChart3, Users, PieChart, MessageCircle, Lock, Mail, UserPlus, LogIn } from 'lucide-react';
import { AppContext } from '../App';
import { User, UserRole } from '../types';

export const LandingPage: React.FC<{ onLogin: () => void }> = () => {
  const { login, addUser, usersList } = useContext(AppContext);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');

  // Login State
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

  const openAuthModal = (mode: 'login' | 'register' = 'login') => {
    setAuthMode(mode);
    setError('');
    setShowAuthModal(true);
  };

  const resetAuthForm = () => {
    setFullName('');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    const success = await login(email, password);
    setIsSubmitting(false);
    if (success) {
      setShowAuthModal(false);
      resetAuthForm();
      return;
    }
    setError('Credenciais inválidas ou problema ao conectar ao Supabase.');
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    if (password !== confirmPassword) {
      setError('As senhas não coincidem.');
      setIsSubmitting(false);
      return;
    }

    const emailExists = usersList.some(u => u.email.toLowerCase() === email.toLowerCase());
    if (emailExists) {
      setError('Email já cadastrado. Faça login com essas credenciais.');
      setAuthMode('login');
      setIsSubmitting(false);
      return;
    }

    const newUser: User = {
      id: `u-${Date.now()}`,
      name: fullName || 'Novo usuário',
      email,
      password,
      role: UserRole.ADMIN
    };

    try {
      const created = await addUser(newUser);
      if (created) {
        await login(email, password);
        setShowAuthModal(false);
        resetAuthForm();
      }
    } catch (err) {
      console.error(err);
      setError('Erro ao criar usuário no Supabase. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    const googleEmail = email || 'usuario.google@credgestor.com';
    const success = await login(googleEmail, undefined, 'google');
    if (!success) {
      setError('Não foi possível entrar com o Google.');
      return;
    }
    setShowAuthModal(false);
    resetAuthForm();
  };

  const fillCredentials = (type: 'ADMIN' | 'COLLECTION') => {
    if (type === 'ADMIN') {
      setEmail('admin@credgestor.com');
      setPassword('admin123');
    } else {
      setEmail('cobrador@credgestor.com');
      setPassword('cobrador123');
    }
    setError('');
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center">
                <TrendingUp className="text-white w-5 h-5" />
              </div>
              <span className="text-xl font-bold text-slate-900 tracking-tight">CredGestor</span>
            </div>
            
            <div className="hidden md:flex space-x-8">
              <a href="#funcionalidades" className="text-slate-600 hover:text-emerald-600 font-medium transition">Funcionalidades</a>
              <a href="#como-funciona" className="text-slate-600 hover:text-emerald-600 font-medium transition">Como Funciona</a>
              <a href="#planos" className="text-slate-600 hover:text-emerald-600 font-medium transition">Planos</a>
            </div>

            <div className="hidden md:flex items-center space-x-4">
              <button
                onClick={() => openAuthModal('login')}
                className="text-emerald-600 font-semibold hover:text-emerald-700"
              >
                Entrar
              </button>
              <button
                onClick={() => openAuthModal('register')}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-lg font-semibold transition shadow-lg shadow-emerald-200"
              >
                Começar agora
              </button>
            </div>

            <div className="md:hidden flex items-center">
              <button onClick={toggleMenu} className="text-slate-600 p-2">
                {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden absolute top-16 left-0 w-full bg-white border-b border-slate-200 shadow-xl p-4 flex flex-col space-y-4">
            <a href="#funcionalidades" className="text-slate-700 font-medium py-2" onClick={toggleMenu}>Funcionalidades</a>
            <a href="#como-funciona" className="text-slate-700 font-medium py-2" onClick={toggleMenu}>Como Funciona</a>
            <a href="#planos" className="text-slate-700 font-medium py-2" onClick={toggleMenu}>Planos</a>
            <hr className="border-slate-100"/>
            <button onClick={() => openAuthModal('login')} className="w-full text-center text-emerald-600 font-bold py-3">Entrar</button>
            <button onClick={() => openAuthModal('register')} className="w-full bg-emerald-600 text-white py-3 rounded-lg font-bold">Começar agora</button>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="pt-12 pb-20 lg:pt-24 lg:pb-32 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col lg:flex-row items-center gap-12">
          <div className="lg:w-1/2 text-center lg:text-left">
            <h1 className="text-4xl lg:text-5xl font-extrabold text-slate-900 leading-tight mb-6">
              Controle seus empréstimos e parcelas <span className="text-emerald-600">sem planilhas</span>.
            </h1>
            <p className="text-lg text-slate-600 mb-8 max-w-lg mx-auto lg:mx-0">
              Sistema online para organizar clientes, parcelas, atrasos e recebimentos — tudo em um único lugar, acessível do celular.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <button onClick={() => openAuthModal('register')} className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3.5 rounded-xl font-bold text-lg shadow-xl shadow-emerald-200 transition flex items-center justify-center gap-2">
                Começar Agora <ArrowRight size={20} />
              </button>
              <a href="#funcionalidades" className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-8 py-3.5 rounded-xl font-bold text-lg transition flex items-center justify-center">
                Ver como funciona
              </a>
            </div>
            <div className="mt-8 flex items-center justify-center lg:justify-start gap-6 text-sm text-slate-500 font-medium">
              <span className="flex items-center gap-1"><CheckCircle size={16} className="text-emerald-500" /> App Web</span>
              <span className="flex items-center gap-1"><CheckCircle size={16} className="text-emerald-500" /> App Mobile</span>
            </div>
          </div>
          
          <div className="lg:w-1/2 relative">
            <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 bg-emerald-100 rounded-full blur-3xl opacity-50"></div>
            <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-72 h-72 bg-blue-100 rounded-full blur-3xl opacity-50"></div>
            
            {/* Mockup Dashboard */}
            <div className="relative bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden transform rotate-2 hover:rotate-0 transition duration-500">
              <div className="bg-slate-900 text-white p-4 flex justify-between items-center">
                <div className="font-bold">Dashboard</div>
                <div className="text-xs bg-emerald-500 px-2 py-1 rounded text-white">Online</div>
              </div>
              <div className="p-6 grid gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100">
                    <div className="text-xs text-emerald-600 font-bold uppercase">A receber hoje</div>
                    <div className="text-2xl font-bold text-emerald-900">R$ 1.250,00</div>
                  </div>
                  <div className="bg-red-50 p-4 rounded-xl border border-red-100">
                    <div className="text-xs text-red-600 font-bold uppercase">Atrasados</div>
                    <div className="text-2xl font-bold text-red-900">R$ 450,00</div>
                  </div>
                </div>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <div className="flex justify-between mb-2">
                    <span className="font-semibold text-slate-700">João Silva</span>
                    <span className="text-red-500 font-bold">Atrasado</span>
                  </div>
                  <div className="flex justify-between text-sm text-slate-500">
                    <span>Parc. 3/5</span>
                    <span>Venceu ontem</span>
                  </div>
                </div>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                   <div className="flex justify-between mb-2">
                    <span className="font-semibold text-slate-700">Maria Oliveira</span>
                    <span className="text-emerald-500 font-bold">Pago</span>
                  </div>
                  <div className="flex justify-between text-sm text-slate-500">
                    <span>Parc. 1/10</span>
                    <span>Pago hoje</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-16 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900">Por que usar o CredGestor?</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition">
              <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center mb-4">
                <Shield size={24} />
              </div>
              <h3 className="text-xl font-bold mb-2">Segurança Total</h3>
              <p className="text-slate-600">Seus dados salvos na nuvem. Nunca mais perca seu caderno ou planilha corrompida.</p>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center mb-4">
                <Smartphone size={24} />
              </div>
              <h3 className="text-xl font-bold mb-2">100% Mobile</h3>
              <p className="text-slate-600">Gerencie tudo pelo celular. Interface pensada para telas pequenas e uso rápido.</p>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition">
              <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-xl flex items-center justify-center mb-4">
                <TrendingUp size={24} />
              </div>
              <h3 className="text-xl font-bold mb-2">Controle Financeiro</h3>
              <p className="text-slate-600">Saiba exatamente quanto tem a receber e quem está inadimplente em segundos.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Accordion */}
      <section id="funcionalidades" className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12 text-slate-900">Tudo que você precisa</h2>
          <div className="grid gap-6">
            <FeatureCard 
              icon={<Users />} title="Gestão de Clientes" 
              desc="Cadastro completo, histórico de empréstimos, status de bom pagador e bloqueio de inadimplentes." 
            />
            <FeatureCard 
              icon={<BarChart3 />} title="Dashboard Inteligente" 
              desc="Resumo financeiro em tempo real. Saiba quanto entrou e quanto falta entrar no mês." 
            />
            <FeatureCard 
              icon={<MessageCircle />} title="Cobrança no WhatsApp" 
              desc="Envie lembretes de vencimento e comprovantes diretamente para o WhatsApp do cliente com um clique." 
            />
            <FeatureCard 
              icon={<PieChart />} title="Relatórios Financeiros" 
              desc="Analise o fluxo de caixa, lucro estimado e taxa de inadimplência do seu negócio." 
            />
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="planos" className="py-20 bg-emerald-900 text-white">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">Um preço único, tudo incluso</h2>
          <p className="text-emerald-200 mb-12">Sem taxas escondidas. Cancele quando quiser.</p>
          
          <div className="max-w-md mx-auto bg-white text-slate-900 rounded-2xl overflow-hidden shadow-2xl transform hover:scale-105 transition duration-300">
            <div className="p-8">
              <h3 className="text-xl font-semibold text-slate-500 uppercase tracking-wide">Plano PRO</h3>
              <div className="mt-4 flex justify-center items-baseline">
                <span className="text-5xl font-extrabold tracking-tight">A Consultar</span>
                <span className="ml-1 text-xl text-slate-500"></span>
              </div>
              <ul className="mt-8 space-y-4 text-left">
                {['Clientes ilimitados', 'Empréstimos ilimitados', 'Acesso pelo celular e PC', 'Suporte prioritário', 'Integração WhatsApp Web'].map((feat, i) => (
                  <li key={i} className="flex items-center">
                    <CheckCircle className="text-emerald-500 mr-3 h-5 w-5" />
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>
              <button onClick={() => openAuthModal('register')} className="mt-8 w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 rounded-xl shadow-lg transition">
                Assinar Agora
              </button>
              <p className="mt-4 text-xs text-slate-400">Assine agora e aproveite o plano Pro.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-12 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <TrendingUp className="text-emerald-500" />
            <span className="text-white font-bold text-lg">CredGestor</span>
          </div>
          <div className="flex gap-6 text-sm">
            <a href="#" className="hover:text-white transition">Termos de Uso</a>
            <a href="#" className="hover:text-white transition">Privacidade</a>
            <a href="#" className="hover:text-white transition">Suporte</a>
          </div>
          <div className="text-sm">
            © 2024 CredGestor. Todos os direitos reservados.
          </div>
        </div>
      </footer>

      {/* Auth Modal (Login Screen) */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-sm p-8 shadow-2xl animate-fade-in relative">
            <button
                onClick={() => {
                  setShowAuthModal(false);
                  resetAuthForm();
                  setAuthMode('login');
                }}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition"
            >
                <X size={20} />
            </button>

            <div className="mb-6 text-center">
                <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                    {authMode === 'login' ? <Lock size={24} /> : <UserPlus size={24} />}
                </div>
                <h3 className="text-2xl font-bold text-slate-900">
                  {authMode === 'login' ? 'Bem-vindo de volta' : 'Crie sua conta'}
                </h3>
                <p className="text-slate-500 text-sm mt-1">
                  {authMode === 'login' ? 'Acesse sua conta para continuar' : 'Cadastre-se para começar'}
                </p>
            </div>

            <div className="flex rounded-xl bg-slate-100 p-1 mb-6">
              <button
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg font-semibold transition ${authMode === 'login' ? 'bg-white shadow text-emerald-600' : 'text-slate-500'}`}
                onClick={() => { setAuthMode('login'); setError(''); }}
              >
                <LogIn size={16} /> Entrar
              </button>
              <button
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg font-semibold transition ${authMode === 'register' ? 'bg-white shadow text-emerald-600' : 'text-slate-500'}`}
                onClick={() => { setAuthMode('register'); setError(''); }}
              >
                <UserPlus size={16} /> Cadastrar
              </button>
            </div>

            <form onSubmit={authMode === 'login' ? handleLoginSubmit : handleRegisterSubmit} className="space-y-4">
                {error && (
                    <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg flex items-center gap-2">
                        <span className="font-bold">Erro:</span> {error}
                    </div>
                )}

                {authMode === 'register' && (
                  <div className="space-y-1">
                    <label className="text-sm font-semibold text-slate-700">Nome completo</label>
                    <div className="relative">
                        <UserPlus className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            required
                            className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all outline-none"
                            placeholder="Seu nome"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                        />
                    </div>
                  </div>
                )}

                <div className="space-y-1">
                    <label className="text-sm font-semibold text-slate-700">Email</label>
                    <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="email"
                            required
                            className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all outline-none"
                            placeholder="seu@email.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>
                </div>

                <div className="space-y-1">
                    <label className="text-sm font-semibold text-slate-700">Senha</label>
                    <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="password"
                            required
                            className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all outline-none"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                    </div>
                </div>

                {authMode === 'register' && (
                  <div className="space-y-1">
                    <label className="text-sm font-semibold text-slate-700">Confirmar senha</label>
                    <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="password"
                            required
                            className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all outline-none"
                            placeholder="Repita a senha"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                        />
                    </div>
                  </div>
                )}

                <button
                    type="submit"
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-emerald-200 transition-transform active:scale-95"
                >
                    {authMode === 'login' ? 'Entrar no Sistema' : 'Criar conta agora'}
                </button>

                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  className="w-full flex items-center justify-center gap-2 border border-slate-200 text-slate-700 font-semibold py-3 rounded-xl hover:bg-slate-50 transition"
                >
                  <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="w-5 h-5" />
                  Entrar com Google
                </button>
            </form>

            <div className="mt-8 pt-6 border-t border-slate-100">
                <p className="text-xs font-bold text-slate-400 text-center mb-3 uppercase tracking-wider">Acesso Rápido (Ambiente de Teste)</p>
                <div className="grid grid-cols-2 gap-3">
                    <button
                        type="button"
                        onClick={() => fillCredentials('ADMIN')}
                        className="py-2 px-3 bg-purple-50 text-purple-700 rounded-lg text-xs font-semibold hover:bg-purple-100 transition border border-purple-100"
                    >
                        Preencher Admin
                    </button>
                    <button
                        type="button"
                        onClick={() => fillCredentials('COLLECTION')}
                        className="py-2 px-3 bg-blue-50 text-blue-700 rounded-lg text-xs font-semibold hover:bg-blue-100 transition border border-blue-100"
                    >
                        Preencher Cobrador
                    </button>
                </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const FeatureCard = ({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) => (
  <div className="flex gap-4 p-6 bg-slate-50 rounded-xl border border-slate-100 items-start">
    <div className="text-emerald-600 bg-white p-3 rounded-lg shadow-sm">{icon}</div>
    <div>
      <h3 className="font-bold text-slate-900 mb-1">{title}</h3>
      <p className="text-slate-600 text-sm leading-relaxed">{desc}</p>
    </div>
  </div>
);