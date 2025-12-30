//import React, { useState, useEffect, useMemo, useCallback } from 'react';
//import { LandingPage } from './components/LandingPage';
//import { DashboardLayout } from './components/dashboard/DashboardLayout';
//import { DashboardHome } from './components/dashboard/Home';
//import { ClientsView } from './components/dashboard/Clients';
//import { LoansView } from './components/dashboard/Loans';
//import { InstallmentsView } from './components/dashboard/Installments';
//import { UsersView } from './components/dashboard/Users';
//import { LoanHistoryView } from './components/dashboard/LoanHistory';
//import { User, UserRole, Client, Loan, Installment, LoanStatus, InstallmentStatus, LoanModel } from './types';
//import { getTodayDateString, isLate } from './utils';
//import { isSupabaseConfigured, supabase } from './supabaseClient';
//import { createN8NClient, fetchN8NClients, isN8NBackendConfigured, loginWithN8N } from './n8nApi';
//
//// --- MOCK DATA INITIALIZATION ---
//const CLIENTS_STORAGE_KEY = 'credgestor:clients';
//
//const MOCK_CLIENTS: Client[] = [
//  {
//    id: '1',
//    name: 'João Silva',
//    cpf: '123.456.789-00',
//    phone: '(11)99999-9999',
//    email: 'joao@email.com',
//    cep: '01001-000',
//    street: 'Praça da Sé',
//    complement: 'Apto 21',
//    neighborhood: 'Sé',
//    city: 'São Paulo',
//    state: 'SP',
//    status: 'active'
//  },
//  {
//    id: '2',
//    name: 'Maria Oliveira',
//    cpf: '987.654.321-11',
//    phone: '(11)98888-8888',
//    email: 'maria@email.com',
//    cep: '20010-000',
//    street: 'Praça Quinze de Novembro',
//    complement: 'Sala 5',
//    neighborhood: 'Centro',
//    city: 'Rio de Janeiro',
//    state: 'RJ',
//    status: 'active'
//  },
//  {
//    id: '3',
//    name: 'Carlos Souza',
//    cpf: '456.789.123-22',
//    phone: '(11)97777-7777',
//    email: 'carlos@email.com',
//    cep: '30190-924',
//    street: 'Praça Sete de Setembro',
//    complement: 'Casa 2',
//    neighborhood: 'Centro',
//    city: 'Belo Horizonte',
//    state: 'MG',
//    status: 'blocked'
//  },
//];
//
//const MOCK_USERS: User[] = [
//  {
//    id: 'u1',
//    name: 'Administrador Principal',
//    email: 'admin@credgestor.com',
//    password: 'admin123',
//    role: UserRole.ADMIN,
//    whatsappContacts: ['+5511999991111', '+5511988882222']
//  },
//  {
//    id: 'u2',
//    name: 'Cobrador Externo',
//    email: 'cobrador@credgestor.com',
//    password: 'cobrador123',
//    role: UserRole.COLLECTION
//  },
//];
//
//const TODAY = getTodayDateString();
//
//const MOCK_LOANS: Loan[] = [
//  {
//    id: 'l1',
//    clientId: '1',
//    amount: 1000,
//    interestRate: 10,
//    totalAmount: 1100,
//    startDate: '2023-10-01',
//    installmentsCount: 2,
//    model: LoanModel.SIMPLE_INTEREST,
//    status: LoanStatus.ACTIVE,
//    promissoryNote: {
//      capital: 1000,
//      interestRate: 10,
//      issueDate: '2023-10-01',
//      dueDate: '2024-10-01',
//      indication: 'Garantia',
//      numberHash: 'b7c4d8f2e19a',
//      observation: 'Pagamento na conta 001'
//    }
//  },
//];
//
//const MOCK_INSTALLMENTS: Installment[] = [
//  { id: 'i1', loanId: 'l1', clientId: '1', number: 1, dueDate: '2023-11-01', amount: 550, amountPaid: 550, status: InstallmentStatus.PAID, paidDate: '2023-11-01' },
//  { id: 'i2', loanId: 'l1', clientId: '1', number: 2, dueDate: TODAY, amount: 550, amountPaid: 0, status: InstallmentStatus.PENDING },
//];
//
//type N8NSession = {
//  accessToken: string;
//  refreshToken: string;
//  accessExpiresAt?: string;
//  refreshExpiresAt?: string;
//  tenantId?: string;
//  tenantName?: string;
//};
//
//const N8N_SESSION_STORAGE_KEY = 'credgestor:n8n-session';
//
//export type ThemeOption = 'light' | 'dark-emerald' | 'dark-graphite';
//
//export const AppContext = React.createContext<{
//  user: User | null;
//  usersList: User[];
//  clients: Client[];
//  loans: Loan[];
//  installments: Installment[];
//  n8nSession: N8NSession | null;
//  usingN8NBackend: boolean;
//  login: (email: string, password?: string, provider?: 'google') => Promise<boolean>;
//  logout: () => Promise<void>;
//  addClient: (client: Client) => Promise<Client | null>;
//  updateClient: (client: Client) => void;
//  deleteClient: (id: string) => void;
//  addLoan: (loan: Loan, generatedInstallments: Installment[]) => void;
//  updateLoan: (loan: Loan, generatedInstallments: Installment[]) => void;
//  deleteLoan: (id: string) => void;
//  payInstallment: (id: string, amount?: number) => void;
//  scheduleFuturePayment: (id: string, reason: string, amount: number, date?: string) => void;
//  startEditingLoan: (loanId: string) => void;
//  addUser: (newUser: User) => Promise<User | null>;
//  removeUser: (id: string) => Promise<void>;
//  view: string;
//  setView: (v: string) => void;
//  theme: ThemeOption;
//  setTheme: (theme: ThemeOption) => void;
//}>({} as any);
//
//const App: React.FC = () => {
//  const [user, setUser] = useState<User | null>(null);
//  const [view, setView] = useState('home'); // home, clients, loans, installments, users
//  
//  // App Data State
//  const [clients, setClients] = useState<Client[]>(() => {
//    if (typeof window === 'undefined') return MOCK_CLIENTS;
//
//    const storedClients = localStorage.getItem(CLIENTS_STORAGE_KEY);
//    if (!storedClients) return MOCK_CLIENTS;
//
//    try {
//      const parsed: Client[] = JSON.parse(storedClients);
//      return parsed.length ? parsed : MOCK_CLIENTS;
//    } catch (error) {
//      console.error('Não foi possível ler clientes salvos localmente', error);
//      localStorage.removeItem(CLIENTS_STORAGE_KEY);
//      return MOCK_CLIENTS;
//    }
//  });
//  const [loans, setLoans] = useState<Loan[]>(MOCK_LOANS);
//  const [installments, setInstallments] = useState<Installment[]>(MOCK_INSTALLMENTS);
//  const [usersList, setUsersList] = useState<User[]>([]);
//  const [theme, setTheme] = useState<ThemeOption>('light');
//  const [loanToEditId, setLoanToEditId] = useState<string | null>(null);
//  const [n8nSession, setN8nSession] = useState<N8NSession | null>(null);
//
//  const usingN8NBackend = isN8NBackendConfigured;
//
//  const mapDbUserToUser = useCallback((record: any): User => ({
//    id: record.id,
//    name: record.name ?? record.email?.split('@')[0] ?? 'Usuário',
//    email: record.email,
//    role: (record.role as UserRole) ?? UserRole.ADMIN,
//    whatsappContacts: record.whatsapp_contacts ?? [],
//    password: ''
//  }), []);
//
//  useEffect(() => {
//    if (!usingN8NBackend) return;
//    const stored = localStorage.getItem(N8N_SESSION_STORAGE_KEY);
//    if (!stored) return;
//
//    try {
//      const parsed = JSON.parse(stored) as { session: N8NSession; user: User };
//      setN8nSession(parsed.session);
//      setUser(parsed.user);
//      setUsersList([parsed.user]);
//    } catch (error) {
//      console.error('Não foi possível restaurar a sessão do n8n', error);
//      localStorage.removeItem(N8N_SESSION_STORAGE_KEY);
//    }
//  }, [usingN8NBackend]);
//
//  useEffect(() => {
//    if (!usingN8NBackend) return;
//
//    if (n8nSession && user) {
//      localStorage.setItem(N8N_SESSION_STORAGE_KEY, JSON.stringify({ session: n8nSession, user }));
//    } else {
//      localStorage.removeItem(N8N_SESSION_STORAGE_KEY);
//    }
//  }, [n8nSession, user, usingN8NBackend]);
//
//  useEffect(() => {
//    if (usingN8NBackend) return;
//
//    localStorage.setItem(CLIENTS_STORAGE_KEY, JSON.stringify(clients));
//  }, [clients, usingN8NBackend]);
//
//  useEffect(() => {
//    if (!usingN8NBackend || !n8nSession?.accessToken) return;
//
//    const loadClients = async () => {
//      try {
//        const remoteClients = await fetchN8NClients(n8nSession.accessToken, n8nSession.tenantId);
//        setClients(remoteClients);
//      } catch (error) {
//        console.error('Erro ao buscar clientes no backend n8n', error);
//      }
//    };
//
//    loadClients();
//  }, [n8nSession, usingN8NBackend]);
//
//  const fetchUserProfile = useCallback(async (authUserId: string, fallbackEmail?: string): Promise<User | null> => {
//    if (!supabase) return null;
//
//    const { data, error } = await supabase
//      .from('users')
//      .select('id, name, email, role, whatsapp_contacts')
//      .eq('id', authUserId)
//      .maybeSingle();
//
//    if (error) {
//      console.error('Erro ao buscar usuário no Supabase', error);
//      return null;
//    }
//
//    if (data) {
//      return mapDbUserToUser(data);
//    }
//
//    if (!fallbackEmail) return null;
//
//    const { data: created, error: insertError } = await supabase
//      .from('users')
//      .insert({
//        id: authUserId,
//        email: fallbackEmail,
//        name: fallbackEmail.split('@')[0] || 'Novo usuário',
//        role: UserRole.ADMIN,
//        whatsapp_contacts: []
//      })
//      .select('id, name, email, role, whatsapp_contacts')
//      .single();
//
//    if (insertError) {
//      console.error('Erro ao inserir perfil do usuário', insertError);
//      return null;
//    }
//
//    return created ? mapDbUserToUser(created) : null;
//  }, [mapDbUserToUser]);
//
//  const loadUsers = useCallback(async () => {
//    if (!supabase) {
//      setUsersList(MOCK_USERS);
//      return;
//    }
//
//    const { data, error } = await supabase
//      .from('users')
//      .select('id, name, email, role, whatsapp_contacts')
//      .order('created_at', { ascending: true });
//
//    if (error) {
//      console.error('Erro ao carregar usuários', error);
//      return;
//    }
//
//    if (data) {
//      setUsersList(data.map(mapDbUserToUser));
//    }
//  }, [mapDbUserToUser]);
//
//  // Check for late installments on load
//  useEffect(() => {
//    setInstallments(prev => prev.map(inst => {
//      if (inst.status === InstallmentStatus.PENDING && isLate(inst.dueDate)) {
//        return { ...inst, status: InstallmentStatus.LATE };
//      }
//      return inst;
//    }));
//  }, []);
//
//  useEffect(() => {
//    if (usingN8NBackend) return;
//
//    if (!isSupabaseConfigured || !supabase) {
//      setUsersList(MOCK_USERS);
//      return;
//    }
//
//    loadUsers();
//
//    supabase.auth.getSession().then(async ({ data }) => {
//      const sessionUser = data.session?.user;
//      if (!sessionUser) return;
//      const profile = await fetchUserProfile(sessionUser.id, sessionUser.email ?? undefined);
//      if (profile) setUser(profile);
//    });
//
//    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, session) => {
//      if (session?.user) {
//        const profile = await fetchUserProfile(session.user.id, session.user.email ?? undefined);
//        if (profile) setUser(profile);
//      } else {
//        setUser(null);
//      }
//    });
//
//    return () => {
//      authListener?.subscription.unsubscribe();
//    };
//  }, [fetchUserProfile, loadUsers]);
//
//  const login = useCallback(async (email: string, password?: string, provider?: 'google') => {
//    if (usingN8NBackend) {
//      if (!password) return false;
//      try {
//        const result = await loginWithN8N(email, password);
//        const sessionInfo: N8NSession = {
//          accessToken: result.accessToken,
//          refreshToken: result.refreshToken,
//          accessExpiresAt: result.accessExpiresAt,
//          refreshExpiresAt: result.refreshExpiresAt,
//          tenantId: result.user.tenantId,
//          tenantName: result.user.tenantName,
//        };
//
//        setUser(result.user);
//        setUsersList([result.user]);
//        setN8nSession(sessionInfo);
//        setView('home');
//        return true;
//      } catch (error) {
//        console.error('Falha ao autenticar via backend n8n', error);
//        return false;
//      }
//    }
//
//    if (!isSupabaseConfigured || !supabase) {
//      if (!password) return false;
//
//      const fallbackUser = MOCK_USERS.find(u => u.email === email && u.password === password);
//
//      if (fallbackUser) {
//        setUser(fallbackUser);
//        setView('home');
//        return true;
//      }
//
//      return false;
//    }
//
//    if (provider === 'google') {
//      const { error, data } = await supabase.auth.signInWithOAuth({
//        provider: 'google',
//        options: {
//          redirectTo: window.location.origin,
//        },
//      });
//
//      if (error) {
//        console.error('Falha ao autenticar com Google', error);
//        return false;
//      }
//
//      // Supabase fará o redirecionamento. Consideramos sucesso se a URL de autenticação foi gerada.
//      return Boolean(data.url);
//    }
//
//    if (!password) return false;
//
//    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
//
//    if (error || !data.user) {
//      console.error('Falha ao autenticar usuário', error);
//      return false;
//    }
//
//    const profile = await fetchUserProfile(data.user.id, email);
//    if (profile) {
//      setUser(profile);
//      setView('home');
//      return true;
//    }
//
//    return false;
//  }, [fetchUserProfile, usingN8NBackend]);
//
//  const logout = useCallback(async () => {
//    if (usingN8NBackend) {
//      setN8nSession(null);
//      setUser(null);
//      setClients(MOCK_CLIENTS);
//      setLoans(MOCK_LOANS);
//      setInstallments(MOCK_INSTALLMENTS);
//      return;
//    }
//
//    if (!supabase) {
//      setUser(null);
//      return;
//    }
//
//    await supabase.auth.signOut();
//    setUser(null);
//  }, [usingN8NBackend]);
//
//  const addClient = useCallback(async (client: Client): Promise<Client | null> => {
//    if (usingN8NBackend && n8nSession?.accessToken) {
//      const created = await createN8NClient(n8nSession.accessToken, n8nSession.tenantId, client);
//      setClients(prev => [...prev, created]);
//      return created;
//    }
//
//    setClients(prev => [...prev, client]);
//    return client;
//  }, [n8nSession, usingN8NBackend]);
//
//  const updateClient = (client: Client) => {
//    setClients(prev => prev.map(item => item.id === client.id ? client : item));
//  };
//
//  const deleteClient = (id: string) => {
//    setClients(prev => prev.filter(client => client.id !== id));
//    setLoans(prev => prev.filter(loan => loan.clientId !== id));
//    setInstallments(prev => prev.filter(inst => inst.clientId !== id));
//  };
//
//  const addLoan = (loan: Loan, generatedInstallments: Installment[]) => {
//    setLoans([...loans, loan]);
//    setInstallments([...installments, ...generatedInstallments]);
//  };
//
//  const updateLoan = (loan: Loan, generatedInstallments: Installment[]) => {
//    setLoans(prev => prev.map(item => item.id === loan.id ? loan : item));
//    setInstallments(prev => prev.filter(inst => inst.loanId !== loan.id).concat(generatedInstallments));
//  };
//
//  const deleteLoan = (id: string) => {
//    setLoans(prev => prev.filter(loan => loan.id !== id));
//    setInstallments(prev => prev.filter(inst => inst.loanId !== id));
//  };
//
//  const scheduleFuturePayment = (id: string, reason: string, amount: number, date?: string) => {
//    const createdAt = new Date().toISOString();
//    setInstallments(prev => prev.map(inst => {
//      if (inst.id !== id) return inst;
//
//      const entry = {
//        reason,
//        amount,
//        date: date || getTodayDateString(),
//        createdAt
//      };
//
//      const promisedPaymentHistory = [...(inst.promisedPaymentHistory ?? []), entry];
//
//      return {
//        ...inst,
//        promisedPaymentReason: entry.reason,
//        promisedPaymentAmount: entry.amount,
//        promisedPaymentDate: entry.date,
//        promisedPaymentHistory
//      };
//    }));
//  };
//
//  const startEditingLoan = (loanId: string) => {
//    if (user?.role !== UserRole.ADMIN) return;
//    setLoanToEditId(loanId);
//    setView('loans');
//  };
//
//  const payInstallment = (id: string, amount?: number) => {
//    if (user?.role === UserRole.COLLECTION) {
//      alert("Acesso restrito: Cobradores não podem baixar pagamentos, apenas visualizar.");
//      return;
//    }
//
//    setInstallments(prev => {
//      const updatedInstallments = prev.map(inst => {
//        if (inst.id !== id) return inst;
//
//        const paymentValue = inst.status === InstallmentStatus.PAID ? 0 : (amount ?? inst.amount);
//        const loan = loans.find(l => l.id === inst.loanId);
//
//        if (loan?.model === LoanModel.INTEREST_ONLY) {
//          const interestDue = Math.max(0, inst.interestAmount ?? Math.max(0, inst.amount - (inst.principalAmount ?? 0)));
//          const principalDue = Math.max(0, inst.principalAmount ?? Math.max(0, inst.amount - interestDue));
//          const totalDue = Math.max(0, interestDue + principalDue);
//
//          const appliedPayment = Math.min(paymentValue, totalDue);
//          let remainingPayment = appliedPayment;
//
//          const interestPayment = Math.min(remainingPayment, interestDue);
//          remainingPayment -= interestPayment;
//          const updatedInterest = Number((interestDue - interestPayment).toFixed(2));
//
//          const principalPayment = Math.min(remainingPayment, principalDue);
//          const updatedPrincipal = Number((principalDue - principalPayment).toFixed(2));
//
//          const remainingBalance = Number((updatedInterest + updatedPrincipal).toFixed(2));
//          const newStatus = remainingBalance <= 0 ? InstallmentStatus.PAID : InstallmentStatus.PARTIAL;
//
//          return {
//            ...inst,
//            amount: remainingBalance,
//            interestAmount: updatedInterest,
//            principalAmount: updatedPrincipal,
//            amountPaid: Number(((inst.amountPaid || 0) + appliedPayment).toFixed(2)),
//            status: newStatus,
//            paidDate: newStatus === InstallmentStatus.PAID ? new Date().toISOString() : inst.paidDate
//          };
//        }
//
//        const paidAmount = Math.min(inst.amount, (inst.amountPaid || 0) + paymentValue);
//        const isPaid = paidAmount >= inst.amount;
//
//        return {
//          ...inst,
//          status: isPaid ? InstallmentStatus.PAID : InstallmentStatus.PARTIAL,
//          amountPaid: Number(paidAmount.toFixed(2)),
//          paidDate: new Date().toISOString()
//        };
//      });
//
//      setLoans(prevLoans => prevLoans.map(loan => {
//        const related = updatedInstallments.filter(inst => inst.loanId === loan.id);
//        const isLoanPaid = related.length > 0 && related.every(inst => inst.status === InstallmentStatus.PAID || inst.amount <= 0);
//        return { ...loan, status: isLoanPaid ? LoanStatus.PAID : LoanStatus.ACTIVE };
//      }));
//
//      return updatedInstallments;
//    });
//  };
//
//  const addUser = useCallback(async (newUser: User): Promise<User | null> => {
//    if (usingN8NBackend || !supabase) {
//      const fallbackUser = { ...newUser, id: newUser.id ?? `local-${Date.now()}` };
//      setUsersList(prev => [...prev, fallbackUser]);
//      return fallbackUser;
//    }
//
//    const { data, error } = await supabase.auth.signUp({
//      email: newUser.email,
//      password: newUser.password ?? ''
//    });
//
//    if (error) {
//      console.error('Erro ao cadastrar usuário no Supabase Auth', error);
//      throw error;
//    }
//
//    const authUser = data.user;
//    if (!authUser) return null;
//
//    const { data: profile, error: profileError } = await supabase
//      .from('users')
//      .upsert({
//        id: authUser.id,
//        email: newUser.email,
//        name: newUser.name,
//        role: newUser.role,
//        whatsapp_contacts: newUser.whatsappContacts ?? []
//      })
//      .select('id, name, email, role, whatsapp_contacts')
//      .single();
//
//    if (profileError) {
//      console.error('Erro ao salvar perfil do usuário', profileError);
//      throw profileError;
//    }
//
//    const formatted = mapDbUserToUser(profile);
//    setUsersList(prev => [...prev, formatted]);
//    return formatted;
//  }, [mapDbUserToUser, usingN8NBackend]);
//
//  const removeUser = useCallback(async (id: string) => {
//    if (id === user?.id) {
//      alert("Você não pode remover a si mesmo.");
//      return;
//    }
//
//    if (usingN8NBackend || !supabase) {
//      setUsersList(prev => prev.filter(u => u.id !== id));
//      return;
//    }
//
//    const { error } = await supabase.from('users').delete().eq('id', id);
//    if (error) {
//      console.error('Erro ao remover usuário', error);
//      throw error;
//    }
//
//    setUsersList(prev => prev.filter(u => u.id !== id));
//  }, [user?.id, usingN8NBackend]);
//
//  const value = useMemo(() => ({
//    user,
//    usersList,
//    clients,
//    loans,
//    installments,
//    n8nSession,
//    usingN8NBackend,
//    login,
//    logout,
//    addClient,
//    updateClient,
//    deleteClient,
//    addLoan,
//    updateLoan,
//    deleteLoan,
//    payInstallment,
//    scheduleFuturePayment,
//    startEditingLoan,
//    addUser,
//    removeUser,
//    view,
//    setView,
//    theme,
//    setTheme
//  }), [user, usersList, clients, loans, installments, n8nSession, usingN8NBackend, view, theme, login, logout, addClient, addUser, removeUser, deleteClient, deleteLoan, payInstallment, scheduleFuturePayment, startEditingLoan, addLoan, updateLoan, setTheme, setView]);
//
//  useEffect(() => {
//    const body = document.body;
//    const themeClasses: ThemeOption[] = ['light', 'dark-emerald', 'dark-graphite'];
//    body.classList.remove(...themeClasses.map(t => `theme-${t}`));
//    body.classList.add(`theme-${theme}`);
//  }, [theme]);
//
//  if (!user) {
//    return (
//      <AppContext.Provider value={value}>
//        <LandingPage onLogin={() => setView('home')} />
//      </AppContext.Provider>
//    );
//  }
//
//  return (
//    <AppContext.Provider value={value}>
//      <DashboardLayout>
//        {view === 'home' && <DashboardHome />}
//        {view === 'clients' && <ClientsView />}
//        {view === 'loans' && (
//          <LoansView
//            editingLoanId={loanToEditId}
//            onCloseEdit={() => setLoanToEditId(null)}
//          />
//        )}
//        {view === 'installments' && <InstallmentsView />}
//        {view === 'users' && <UsersView />}
//        {view === 'loanHistory' && <LoanHistoryView />}
//      </DashboardLayout>
//    </AppContext.Provider>
//  );
//};
//
//export default App;
//

//import React, { useState, useEffect, useMemo, useCallback } from 'react';
//import { LandingPage } from './components/LandingPage';
//import { DashboardLayout } from './components/dashboard/DashboardLayout';
//import { DashboardHome } from './components/dashboard/Home';
//import { ClientsView } from './components/dashboard/Clients';
//import { LoansView } from './components/dashboard/Loans';
//import { InstallmentsView } from './components/dashboard/Installments';
//import { UsersView } from './components/dashboard/Users';
//import { LoanHistoryView } from './components/dashboard/LoanHistory';
//import { User, UserRole, Client, Loan, Installment, LoanStatus, InstallmentStatus, LoanModel } from './types';
//import { getTodayDateString, isLate } from './utils';
//import { isSupabaseConfigured, supabase } from './supabaseClient';
//import { createN8NClient, fetchN8NClients, isN8NBackendConfigured, loginWithN8N } from './n8nApi';
//
//// --- MOCK DATA INITIALIZATION ---
//const CLIENTS_STORAGE_KEY = 'credgestor:clients';
//
//const MOCK_CLIENTS: Client[] = [
//  {
//    id: '1',
//    name: 'João Silva',
//    cpf: '123.456.789-00',
//    phone: '(11)99999-9999',
//    email: 'joao@email.com',
//    cep: '01001-000',
//    street: 'Praça da Sé',
//    complement: 'Apto 21',
//    neighborhood: 'Sé',
//    city: 'São Paulo',
//    state: 'SP',
//    status: 'active'
//  },
//  {
//    id: '2',
//    name: 'Maria Oliveira',
//    cpf: '987.654.321-11',
//    phone: '(11)98888-8888',
//    email: 'maria@email.com',
//    cep: '20010-000',
//    street: 'Praça Quinze de Novembro',
//    complement: 'Sala 5',
//    neighborhood: 'Centro',
//    city: 'Rio de Janeiro',
//    state: 'RJ',
//    status: 'active'
//  },
//  {
//    id: '3',
//    name: 'Carlos Souza',
//    cpf: '456.789.123-22',
//    phone: '(11)97777-7777',
//    email: 'carlos@email.com',
//    cep: '30190-924',
//    street: 'Praça Sete de Setembro',
//    complement: 'Casa 2',
//    neighborhood: 'Centro',
//    city: 'Belo Horizonte',
//    state: 'MG',
//    status: 'blocked'
//  },
//];
//
//const MOCK_USERS: User[] = [
//  {
//    id: 'u1',
//    name: 'Administrador Principal',
//    email: 'admin@credgestor.com',
//    password: 'admin123',
//    role: UserRole.ADMIN,
//    whatsappContacts: ['+5511999991111', '+5511988882222']
//  },
//  {
//    id: 'u2',
//    name: 'Cobrador Externo',
//    email: 'cobrador@credgestor.com',
//    password: 'cobrador123',
//    role: UserRole.COLLECTION
//  },
//];
//
//const TODAY = getTodayDateString();
//
//const MOCK_LOANS: Loan[] = [
//  {
//    id: 'l1',
//    clientId: '1',
//    amount: 1000,
//    interestRate: 10,
//    totalAmount: 1100,
//    startDate: '2023-10-01',
//    installmentsCount: 2,
//    model: LoanModel.SIMPLE_INTEREST,
//    status: LoanStatus.ACTIVE,
//    promissoryNote: {
//      capital: 1000,
//      interestRate: 10,
//      issueDate: '2023-10-01',
//      dueDate: '2024-10-01',
//      indication: 'Garantia',
//      numberHash: 'b7c4d8f2e19a',
//      observation: 'Pagamento na conta 001'
//    }
//  },
//];
//
//const MOCK_INSTALLMENTS: Installment[] = [
//  { id: 'i1', loanId: 'l1', clientId: '1', number: 1, dueDate: '2023-11-01', amount: 550, amountPaid: 550, status: InstallmentStatus.PAID, paidDate: '2023-11-01' },
//  { id: 'i2', loanId: 'l1', clientId: '1', number: 2, dueDate: TODAY, amount: 550, amountPaid: 0, status: InstallmentStatus.PENDING },
//];
//
//type N8NSession = {
//  accessToken: string;
//  refreshToken: string;
//  accessExpiresAt?: string;
//  refreshExpiresAt?: string;
//  tenantId?: string;
//  tenantName?: string;
//};
//
//const N8N_SESSION_STORAGE_KEY = 'credgestor:n8n-session';
//
//export type ThemeOption = 'light' | 'dark-emerald' | 'dark-graphite';
//
//export const AppContext = React.createContext<{
//  user: User | null;
//  usersList: User[];
//  clients: Client[];
//  loans: Loan[];
//  installments: Installment[];
//  n8nSession: N8NSession | null;
//  usingN8NBackend: boolean;
//  login: (email: string, password?: string, provider?: 'google') => Promise<boolean>;
//  logout: () => Promise<void>;
//  addClient: (client: Client) => Promise<Client | null>;
//  updateClient: (client: Client) => void;
//  deleteClient: (id: string) => void;
//  addLoan: (loan: Loan, generatedInstallments: Installment[]) => void;
//  updateLoan: (loan: Loan, generatedInstallments: Installment[]) => void;
//  deleteLoan: (id: string) => void;
//  payInstallment: (id: string, amount?: number) => void;
//  scheduleFuturePayment: (id: string, reason: string, amount: number, date?: string) => void;
//  startEditingLoan: (loanId: string) => void;
//  addUser: (newUser: User) => Promise<User | null>;
//  removeUser: (id: string) => Promise<void>;
//  view: string;
//  setView: (v: string) => void;
//  theme: ThemeOption;
//  setTheme: (theme: ThemeOption) => void;
//}>({} as any);
//
//const App: React.FC = () => {
//  const [user, setUser] = useState<User | null>(null);
//  const [view, setView] = useState('home');
//  
//  const [clients, setClients] = useState<Client[]>(() => {
//    if (typeof window === 'undefined') return MOCK_CLIENTS;
//
//    const storedClients = localStorage.getItem(CLIENTS_STORAGE_KEY);
//    if (!storedClients) return MOCK_CLIENTS;
//
//    try {
//      const parsed: Client[] = JSON.parse(storedClients);
//      return parsed.length ? parsed : MOCK_CLIENTS;
//    } catch (error) {
//      console.error('Não foi possível ler clientes salvos localmente', error);
//      localStorage.removeItem(CLIENTS_STORAGE_KEY);
//      return MOCK_CLIENTS;
//    }
//  });
//  
//  const [loans, setLoans] = useState<Loan[]>(MOCK_LOANS);
//  const [installments, setInstallments] = useState<Installment[]>(MOCK_INSTALLMENTS);
//  const [usersList, setUsersList] = useState<User[]>([]);
//  const [theme, setTheme] = useState<ThemeOption>('light');
//  const [loanToEditId, setLoanToEditId] = useState<string | null>(null);
//  const [n8nSession, setN8nSession] = useState<N8NSession | null>(null);
//
//  const usingN8NBackend = isN8NBackendConfigured;
//
//  const mapDbUserToUser = useCallback((record: any): User => ({
//    id: record.id,
//    name: record.name ?? record.email?.split('@')[0] ?? 'Usuário',
//    email: record.email,
//    role: (record.role as UserRole) ?? UserRole.ADMIN,
//    whatsappContacts: record.whatsapp_contacts ?? [],
//    password: ''
//  }), []);
//
//  useEffect(() => {
//    if (!usingN8NBackend) return;
//    const stored = localStorage.getItem(N8N_SESSION_STORAGE_KEY);
//    if (!stored) return;
//
//    try {
//      const parsed = JSON.parse(stored) as { session: N8NSession; user: User };
//      setN8nSession(parsed.session);
//      setUser(parsed.user);
//      setUsersList([parsed.user]);
//    } catch (error) {
//      console.error('Não foi possível restaurar a sessão do n8n', error);
//      localStorage.removeItem(N8N_SESSION_STORAGE_KEY);
//    }
//  }, [usingN8NBackend]);
//
//  useEffect(() => {
//    if (!usingN8NBackend) return;
//
//    if (n8nSession && user) {
//      localStorage.setItem(N8N_SESSION_STORAGE_KEY, JSON.stringify({ session: n8nSession, user }));
//    } else {
//      localStorage.removeItem(N8N_SESSION_STORAGE_KEY);
//    }
//  }, [n8nSession, user, usingN8NBackend]);
//
//  useEffect(() => {
//    if (usingN8NBackend) return;
//
//    localStorage.setItem(CLIENTS_STORAGE_KEY, JSON.stringify(clients));
//  }, [clients, usingN8NBackend]);
//
//  useEffect(() => {
//    if (!usingN8NBackend || !n8nSession?.accessToken) return;
//
//    const loadClients = async () => {
//      try {
//        const remoteClients = await fetchN8NClients(n8nSession.accessToken, n8nSession.tenantId);
//        setClients(remoteClients);
//      } catch (error) {
//        console.error('Erro ao buscar clientes no backend n8n', error);
//      }
//    };
//
//    loadClients();
//  }, [n8nSession, usingN8NBackend]);
//
//  const fetchUserProfile = useCallback(async (authUserId: string, fallbackEmail?: string): Promise<User | null> => {
//    if (!supabase) return null;
//
//    const { data, error } = await supabase
//      .from('users')
//      .select('id, name, email, role, whatsapp_contacts')
//      .eq('id', authUserId)
//      .maybeSingle();
//
//    if (error) {
//      console.error('Erro ao buscar usuário no Supabase', error);
//      return null;
//    }
//
//    if (data) {
//      return mapDbUserToUser(data);
//    }
//
//    if (!fallbackEmail) return null;
//
//    const { data: created, error: insertError } = await supabase
//      .from('users')
//      .insert({
//        id: authUserId,
//        email: fallbackEmail,
//        name: fallbackEmail.split('@')[0] || 'Novo usuário',
//        role: UserRole.ADMIN,
//        whatsapp_contacts: []
//      })
//      .select('id, name, email, role, whatsapp_contacts')
//      .single();
//
//    if (insertError) {
//      console.error('Erro ao inserir perfil do usuário', insertError);
//      return null;
//    }
//
//    return created ? mapDbUserToUser(created) : null;
//  }, [mapDbUserToUser]);
//
//  const loadUsers = useCallback(async () => {
//    if (!supabase) {
//      setUsersList(MOCK_USERS);
//      return;
//    }
//
//    const { data, error } = await supabase
//      .from('users')
//      .select('id, name, email, role, whatsapp_contacts')
//      .order('created_at', { ascending: true });
//
//    if (error) {
//      console.error('Erro ao carregar usuários', error);
//      return;
//    }
//
//    if (data) {
//      setUsersList(data.map(mapDbUserToUser));
//    }
//  }, [mapDbUserToUser]);
//
//  useEffect(() => {
//    setInstallments(prev => prev.map(inst => {
//      if (inst.status === InstallmentStatus.PENDING && isLate(inst.dueDate)) {
//        return { ...inst, status: InstallmentStatus.LATE };
//      }
//      return inst;
//    }));
//  }, []);
//
//  useEffect(() => {
//    if (usingN8NBackend) return;
//
//    if (!isSupabaseConfigured || !supabase) {
//      setUsersList(MOCK_USERS);
//      return;
//    }
//
//    loadUsers();
//
//    supabase.auth.getSession().then(async ({ data }) => {
//      const sessionUser = data.session?.user;
//      if (!sessionUser) return;
//      const profile = await fetchUserProfile(sessionUser.id, sessionUser.email ?? undefined);
//      if (profile) setUser(profile);
//    });
//
//    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, session) => {
//      if (session?.user) {
//        const profile = await fetchUserProfile(session.user.id, session.user.email ?? undefined);
//        if (profile) setUser(profile);
//      } else {
//        setUser(null);
//      }
//    });
//
//    return () => {
//      authListener?.subscription.unsubscribe();
//    };
//  }, [fetchUserProfile, loadUsers, usingN8NBackend]);
//
//  const login = useCallback(async (email: string, password?: string, provider?: 'google') => {
//    if (usingN8NBackend) {
//      if (!password) return false;
//      try {
//        const result = await loginWithN8N(email, password);
//        const sessionInfo: N8NSession = {
//          accessToken: result.accessToken,
//          refreshToken: result.refreshToken,
//          accessExpiresAt: result.accessExpiresAt,
//          refreshExpiresAt: result.refreshExpiresAt,
//          tenantId: result.user.tenantId,
//          tenantName: result.user.tenantName,
//        };
//
//        setUser(result.user);
//        setUsersList([result.user]);
//        setN8nSession(sessionInfo);
//        setView('home');
//        return true;
//      } catch (error) {
//        console.error('Falha ao autenticar via backend n8n', error);
//        return false;
//      }
//    }
//
//    if (!isSupabaseConfigured || !supabase) {
//      if (!password) return false;
//
//      const fallbackUser = MOCK_USERS.find(u => u.email === email && u.password === password);
//
//      if (fallbackUser) {
//        setUser(fallbackUser);
//        setView('home');
//        return true;
//      }
//
//      return false;
//    }
//
//    if (provider === 'google') {
//      const { error, data } = await supabase.auth.signInWithOAuth({
//        provider: 'google',
//        options: {
//          redirectTo: window.location.origin,
//        },
//      });
//
//      if (error) {
//        console.error('Falha ao autenticar com Google', error);
//        return false;
//      }
//
//      return Boolean(data.url);
//    }
//
//    if (!password) return false;
//
//    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
//
//    if (error || !data.user) {
//      console.error('Falha ao autenticar usuário', error);
//      return false;
//    }
//
//    const profile = await fetchUserProfile(data.user.id, email);
//    if (profile) {
//      setUser(profile);
//      setView('home');
//      return true;
//    }
//
//    return false;
//  }, [fetchUserProfile, usingN8NBackend]);
//
//  const logout = useCallback(async () => {
//    if (usingN8NBackend) {
//      setN8nSession(null);
//      setUser(null);
//      setClients(MOCK_CLIENTS);
//      setLoans(MOCK_LOANS);
//      setInstallments(MOCK_INSTALLMENTS);
//      return;
//    }
//
//    if (!supabase) {
//      setUser(null);
//      return;
//    }
//
//    await supabase.auth.signOut();
//    setUser(null);
//  }, [usingN8NBackend]);
//
//  // ⭐ FUNÇÃO CORRIGIDA - SEM WEBHOOK, APENAS SALVAMENTO LOCAL
//  const addClient = useCallback(async (client: Client): Promise<Client | null> => {
//    if (usingN8NBackend && n8nSession?.accessToken) {
//      try {
//        const created = await createN8NClient(n8nSession.accessToken, n8nSession.tenantId, client);
//        setClients(prev => [...prev, created]);
//        return created;
//      } catch (error) {
//        console.error('Erro ao criar cliente via n8n API', error);
//        throw error;
//      }
//    }
//
//    // ✅ SOLUÇÃO: Apenas salva localmente, SEM chamar webhook
//    console.log('📝 addClient: salvando cliente localmente');
//    setClients(prev => [...prev, client]);
//    console.log('✅ addClient: cliente salvo com sucesso');
//    return client;
//  }, [n8nSession, usingN8NBackend]);
//
//  const updateClient = (client: Client) => {
//    setClients(prev => prev.map(item => item.id === client.id ? client : item));
//  };
//
//  const deleteClient = (id: string) => {
//    setClients(prev => prev.filter(client => client.id !== id));
//    setLoans(prev => prev.filter(loan => loan.clientId !== id));
//    setInstallments(prev => prev.filter(inst => inst.clientId !== id));
//  };
//
//  const addLoan = (loan: Loan, generatedInstallments: Installment[]) => {
//    setLoans([...loans, loan]);
//    setInstallments([...installments, ...generatedInstallments]);
//  };
//
//  const updateLoan = (loan: Loan, generatedInstallments: Installment[]) => {
//    setLoans(prev => prev.map(item => item.id === loan.id ? loan : item));
//    setInstallments(prev => prev.filter(inst => inst.loanId !== loan.id).concat(generatedInstallments));
//  };
//
//  const deleteLoan = (id: string) => {
//    setLoans(prev => prev.filter(loan => loan.id !== id));
//    setInstallments(prev => prev.filter(inst => inst.loanId !== id));
//  };
//
//  const scheduleFuturePayment = (id: string, reason: string, amount: number, date?: string) => {
//    const createdAt = new Date().toISOString();
//    setInstallments(prev => prev.map(inst => {
//      if (inst.id !== id) return inst;
//
//      const entry = {
//        reason,
//        amount,
//        date: date || getTodayDateString(),
//        createdAt
//      };
//
//      const promisedPaymentHistory = [...(inst.promisedPaymentHistory ?? []), entry];
//
//      return {
//        ...inst,
//        promisedPaymentReason: entry.reason,
//        promisedPaymentAmount: entry.amount,
//        promisedPaymentDate: entry.date,
//        promisedPaymentHistory
//      };
//    }));
//  };
//
//  const startEditingLoan = (loanId: string) => {
//    if (user?.role !== UserRole.ADMIN) return;
//    setLoanToEditId(loanId);
//    setView('loans');
//  };
//
//  const payInstallment = (id: string, amount?: number) => {
//    if (user?.role === UserRole.COLLECTION) {
//      alert("Acesso restrito: Cobradores não podem baixar pagamentos, apenas visualizar.");
//      return;
//    }
//
//    setInstallments(prev => {
//      const updatedInstallments = prev.map(inst => {
//        if (inst.id !== id) return inst;
//
//        const paymentValue = inst.status === InstallmentStatus.PAID ? 0 : (amount ?? inst.amount);
//        const loan = loans.find(l => l.id === inst.loanId);
//
//        if (loan?.model === LoanModel.INTEREST_ONLY) {
//          const interestDue = Math.max(0, inst.interestAmount ?? Math.max(0, inst.amount - (inst.principalAmount ?? 0)));
//          const principalDue = Math.max(0, inst.principalAmount ?? Math.max(0, inst.amount - interestDue));
//          const totalDue = Math.max(0, interestDue + principalDue);
//
//          const appliedPayment = Math.min(paymentValue, totalDue);
//          let remainingPayment = appliedPayment;
//
//          const interestPayment = Math.min(remainingPayment, interestDue);
//          remainingPayment -= interestPayment;
//          const updatedInterest = Number((interestDue - interestPayment).toFixed(2));
//
//          const principalPayment = Math.min(remainingPayment, principalDue);
//          const updatedPrincipal = Number((principalDue - principalPayment).toFixed(2));
//
//          const remainingBalance = Number((updatedInterest + updatedPrincipal).toFixed(2));
//          const newStatus = remainingBalance <= 0 ? InstallmentStatus.PAID : InstallmentStatus.PARTIAL;
//
//          return {
//            ...inst,
//            amount: remainingBalance,
//            interestAmount: updatedInterest,
//            principalAmount: updatedPrincipal,
//            amountPaid: Number(((inst.amountPaid || 0) + appliedPayment).toFixed(2)),
//            status: newStatus,
//            paidDate: newStatus === InstallmentStatus.PAID ? new Date().toISOString() : inst.paidDate
//          };
//        }
//
//        const paidAmount = Math.min(inst.amount, (inst.amountPaid || 0) + paymentValue);
//        const isPaid = paidAmount >= inst.amount;
//
//        return {
//          ...inst,
//          status: isPaid ? InstallmentStatus.PAID : InstallmentStatus.PARTIAL,
//          amountPaid: Number(paidAmount.toFixed(2)),
//          paidDate: new Date().toISOString()
//        };
//      });
//
//      setLoans(prevLoans => prevLoans.map(loan => {
//        const related = updatedInstallments.filter(inst => inst.loanId === loan.id);
//        const isLoanPaid = related.length > 0 && related.every(inst => inst.status === InstallmentStatus.PAID || inst.amount <= 0);
//        return { ...loan, status: isLoanPaid ? LoanStatus.PAID : LoanStatus.ACTIVE };
//      }));
//
//      return updatedInstallments;
//    });
//  };
//
//  const addUser = useCallback(async (newUser: User): Promise<User | null> => {
//    if (usingN8NBackend || !supabase) {
//      const fallbackUser = { ...newUser, id: newUser.id ?? `local-${Date.now()}` };
//      setUsersList(prev => [...prev, fallbackUser]);
//      return fallbackUser;
//    }
//
//    const { data, error } = await supabase.auth.signUp({
//      email: newUser.email,
//      password: newUser.password ?? ''
//    });
//
//    if (error) {
//      console.error('Erro ao cadastrar usuário no Supabase Auth', error);
//      throw error;
//    }
//
//    const authUser = data.user;
//    if (!authUser) return null;
//
//    const { data: profile, error: profileError } = await supabase
//      .from('users')
//      .upsert({
//        id: authUser.id,
//        email: newUser.email,
//        name: newUser.name,
//        role: newUser.role,
//        whatsapp_contacts: newUser.whatsappContacts ?? []
//      })
//      .select('id, name, email, role, whatsapp_contacts')
//      .single();
//
//    if (profileError) {
//      console.error('Erro ao salvar perfil do usuário', profileError);
//      throw profileError;
//    }
//
//    const formatted = mapDbUserToUser(profile);
//    setUsersList(prev => [...prev, formatted]);
//    return formatted;
//  }, [mapDbUserToUser, usingN8NBackend]);
//
//  const removeUser = useCallback(async (id: string) => {
//    if (id === user?.id) {
//      alert("Você não pode remover a si mesmo.");
//      return;
//    }
//
//    if (usingN8NBackend || !supabase) {
//      setUsersList(prev => prev.filter(u => u.id !== id));
//      return;
//    }
//
//    const { error } = await supabase.from('users').delete().eq('id', id);
//    if (error) {
//      console.error('Erro ao remover usuário', error);
//      throw error;
//    }
//
//    setUsersList(prev => prev.filter(u => u.id !== id));
//  }, [user?.id, usingN8NBackend]);
//
//  const value = useMemo(() => ({
//    user,
//    usersList,
//    clients,
//    loans,
//    installments,
//    n8nSession,
//    usingN8NBackend,
//    login,
//    logout,
//    addClient,
//    updateClient,
//    deleteClient,
//    addLoan,
//    updateLoan,
//    deleteLoan,
//    payInstallment,
//    scheduleFuturePayment,
//    startEditingLoan,
//    addUser,
//    removeUser,
//    view,
//    setView,
//    theme,
//    setTheme
//  }), [user, usersList, clients, loans, installments, n8nSession, usingN8NBackend, view, theme, login, logout, addClient, addUser, removeUser, deleteClient, deleteLoan, payInstallment, scheduleFuturePayment, startEditingLoan, addLoan, updateLoan, setTheme, setView]);
//
//  useEffect(() => {
//    const body = document.body;
//    const themeClasses: ThemeOption[] = ['light', 'dark-emerald', 'dark-graphite'];
//    body.classList.remove(...themeClasses.map(t => `theme-${t}`));
//    body.classList.add(`theme-${theme}`);
//  }, [theme]);
//
//  if (!user) {
//    return (
//      <AppContext.Provider value={value}>
//        <LandingPage onLogin={() => setView('home')} />
//      </AppContext.Provider>
//    );
//  }
//
//  return (
//    <AppContext.Provider value={value}>
//      <DashboardLayout>
//        {view === 'home' && <DashboardHome />}
//        {view === 'clients' && <ClientsView />}
//        {view === 'loans' && (
//          <LoansView
//            editingLoanId={loanToEditId}
//            onCloseEdit={() => setLoanToEditId(null)}
//          />
//        )}
//        {view === 'installments' && <InstallmentsView />}
//        {view === 'users' && <UsersView />}
//        {view === 'loanHistory' && <LoanHistoryView />}
//      </DashboardLayout>
//    </AppContext.Provider>
//  );
//};
//
//export default App;

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { LandingPage } from '@/components/LandingPage';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { DashboardHome } from '@/components/dashboard/Home';
import { ClientsView } from '@/components/dashboard/Clients';
import { LoansView } from '@/components/dashboard/Loans';
import { InstallmentsView } from '@/components/dashboard/Installments';
import { UsersView } from '@/components/dashboard/Users';
import { LoanHistoryView } from '@/components/dashboard/LoanHistory';
import { User, UserRole, Client, Loan, Installment, LoanStatus, InstallmentStatus, LoanModel } from '@/types';
import { getTodayDateString, isLate, normalizeUserRole } from '@/utils';
import { isSupabaseConfigured, supabase } from '@/services/supabaseClient';
import { createN8NClient, fetchN8NClients, isN8NBackendConfigured, loginWithN8N } from '@/services/n8nApi';

// --- MOCK DATA INITIALIZATION ---
const CLIENTS_STORAGE_KEY = 'credgestor:clients';
const LOCAL_APP_STATE_KEY = 'credgestor:app-state';

type LocalAppState = {
  user?: User | null;
  usersList?: User[];
  clients?: Client[];
  loans?: Loan[];
  installments?: Installment[];
  view?: string;
  theme?: ThemeOption;
};

const MOCK_CLIENTS: Client[] = [
  {
    id: '1',
    name: 'João Silva',
    cpf: '123.456.789-00',
    phone: '(11)99999-9999',
    email: 'joao@email.com',
    cep: '01001-000',
    street: 'Praça da Sé',
    complement: 'Apto 21',
    neighborhood: 'Sé',
    city: 'São Paulo',
    state: 'SP',
    status: 'active'
  },
  {
    id: '2',
    name: 'Maria Oliveira',
    cpf: '987.654.321-11',
    phone: '(11)98888-8888',
    email: 'maria@email.com',
    cep: '20010-000',
    street: 'Praça Quinze de Novembro',
    complement: 'Sala 5',
    neighborhood: 'Centro',
    city: 'Rio de Janeiro',
    state: 'RJ',
    status: 'active'
  },
  {
    id: '3',
    name: 'Carlos Souza',
    cpf: '456.789.123-22',
    phone: '(11)97777-7777',
    email: 'carlos@email.com',
    cep: '30190-924',
    street: 'Praça Sete de Setembro',
    complement: 'Casa 2',
    neighborhood: 'Centro',
    city: 'Belo Horizonte',
    state: 'MG',
    status: 'blocked'
  },
];

const MOCK_USERS: User[] = [
  {
    id: 'u1',
    name: 'Administrador Principal',
    email: 'admin@credgestor.com',
    password: 'admin123',
    role: UserRole.ADMIN,
    whatsappContacts: ['+5511999991111', '+5511988882222']
  },
  {
    id: 'u2',
    name: 'Cobrador Externo',
    email: 'cobrador@credgestor.com',
    password: 'cobrador123',
    role: UserRole.COLLECTION
  },
];

const TODAY = getTodayDateString();

const MOCK_LOANS: Loan[] = [
  {
    id: 'l1',
    clientId: '1',
    amount: 1000,
    interestRate: 10,
    totalAmount: 1100,
    startDate: '2023-10-01',
    installmentsCount: 2,
    model: LoanModel.SIMPLE_INTEREST,
    status: LoanStatus.ACTIVE,
    promissoryNote: {
      capital: 1000,
      interestRate: 10,
      issueDate: '2023-10-01',
      dueDate: '2024-10-01',
      indication: 'Garantia',
      numberHash: 'b7c4d8f2e19a',
      observation: 'Pagamento na conta 001'
    }
  },
];

const MOCK_INSTALLMENTS: Installment[] = [
  { id: 'i1', loanId: 'l1', clientId: '1', number: 1, dueDate: '2023-11-01', amount: 550, amountPaid: 550, status: InstallmentStatus.PAID, paidDate: '2023-11-01' },
  { id: 'i2', loanId: 'l1', clientId: '1', number: 2, dueDate: TODAY, amount: 550, amountPaid: 0, status: InstallmentStatus.PENDING },
];

type N8NSession = {
  accessToken: string;
  refreshToken: string;
  accessExpiresAt?: string;
  refreshExpiresAt?: string;
  tenantId?: string;
  tenantName?: string;
};

const N8N_SESSION_STORAGE_KEY = 'credgestor:n8n-session';
const DEFAULT_N8N_TENANT_ID = import.meta.env.VITE_N8N_TENANT_ID as string | undefined;

export type ThemeOption = 'light' | 'dark-emerald' | 'dark-graphite';

const loadStoredAppState = (): LocalAppState => {
  if (typeof window === 'undefined') return {};

  const stored = localStorage.getItem(LOCAL_APP_STATE_KEY);
  if (!stored) return {};

  try {
    const parsed = JSON.parse(stored) as LocalAppState;

    return {
      clients: Array.isArray(parsed.clients) ? parsed.clients : undefined,
      loans: Array.isArray(parsed.loans) ? parsed.loans : undefined,
      installments: Array.isArray(parsed.installments) ? parsed.installments : undefined,
      usersList: Array.isArray(parsed.usersList) ? parsed.usersList : undefined,
      user: parsed.user,
      view: typeof parsed.view === 'string' ? parsed.view : undefined,
      theme: parsed.theme,
    };
  } catch (error) {
    console.error('Não foi possível restaurar o estado salvo do app', error);
    localStorage.removeItem(LOCAL_APP_STATE_KEY);
    return {};
  }
};

export const AppContext = React.createContext<{
  user: User | null;
  usersList: User[];
  clients: Client[];
  loans: Loan[];
  installments: Installment[];
  n8nSession: N8NSession | null;
  usingN8NBackend: boolean;
  login: (email: string, password?: string, provider?: 'google') => Promise<boolean>;
  logout: () => Promise<void>;
  addClient: (client: Client) => Promise<Client | null>;
  updateClient: (client: Client) => void;
  deleteClient: (id: string) => void;
  addLoan: (loan: Loan, generatedInstallments: Installment[]) => void;
  updateLoan: (loan: Loan, generatedInstallments: Installment[]) => void;
  deleteLoan: (id: string) => void;
  payInstallment: (id: string, amount?: number) => void;
  scheduleFuturePayment: (id: string, reason: string, amount: number, date?: string) => void;
  startEditingLoan: (loanId: string) => void;
  addUser: (newUser: User) => Promise<User | null>;
  removeUser: (id: string) => Promise<void>;
  view: string;
  setView: (v: string) => void;
  theme: ThemeOption;
  setTheme: (theme: ThemeOption) => void;
}>({} as any);

const App: React.FC = () => {
  const usingN8NBackend = isN8NBackendConfigured;
  const shouldUseLocalPersistence = !usingN8NBackend && !isSupabaseConfigured;
  const [storedState] = useState<LocalAppState>(() => shouldUseLocalPersistence ? loadStoredAppState() : {});

  const [user, setUser] = useState<User | null>(() => shouldUseLocalPersistence ? storedState.user ?? null : null);
  const [view, setView] = useState(storedState.view ?? 'home');

  const [clients, setClients] = useState<Client[]>(() => {
    if (shouldUseLocalPersistence) {
      return storedState.clients && storedState.clients.length ? storedState.clients : MOCK_CLIENTS;
    }

    if (typeof window === 'undefined') return MOCK_CLIENTS;

    const storedClients = localStorage.getItem(CLIENTS_STORAGE_KEY);
    if (!storedClients) return MOCK_CLIENTS;

    try {
      const parsed: Client[] = JSON.parse(storedClients);
      return parsed.length ? parsed : MOCK_CLIENTS;
    } catch (error) {
      console.error('Não foi possível ler clientes salvos localmente', error);
      localStorage.removeItem(CLIENTS_STORAGE_KEY);
      return MOCK_CLIENTS;
    }
  });

  const [loans, setLoans] = useState<Loan[]>(() => shouldUseLocalPersistence && storedState.loans ? storedState.loans : MOCK_LOANS);
  const [installments, setInstallments] = useState<Installment[]>(() => shouldUseLocalPersistence && storedState.installments ? storedState.installments : MOCK_INSTALLMENTS);
  const [usersList, setUsersList] = useState<User[]>(() => shouldUseLocalPersistence && storedState.usersList ? storedState.usersList : []);
  const [theme, setTheme] = useState<ThemeOption>(storedState.theme ?? 'light');
  const [loanToEditId, setLoanToEditId] = useState<string | null>(null);
  const [n8nSession, setN8nSession] = useState<N8NSession | null>(null);

  const mapDbUserToUser = useCallback((record: any): User => ({
    id: record.id,
    name: record.name ?? record.email?.split('@')[0] ?? 'Usuário',
    email: record.email,
    role: normalizeUserRole(record.role),
    whatsappContacts: record.whatsapp_contacts ?? [],
    password: ''
  }), []);

  const mapAuthUserToLocalUser = useCallback((authUser: { id?: string; email?: string; user_metadata?: Record<string, any> } | null, fallbackEmail?: string): User => {
    const email = authUser?.email ?? fallbackEmail ?? '';
    const nameFromMetadata = authUser?.user_metadata?.full_name as string | undefined;
    const derivedName = nameFromMetadata || email.split('@')[0] || 'Usuário';

    return {
      id: authUser?.id ?? `local-${crypto.randomUUID?.() || Date.now()}`,
      email: email || 'usuario@temporario.local',
      name: derivedName,
      role: normalizeUserRole((authUser?.user_metadata?.role as string | undefined) ?? UserRole.ADMIN),
      whatsappContacts: [],
    };
  }, []);

  useEffect(() => {
    if (!usingN8NBackend) return;
    const stored = localStorage.getItem(N8N_SESSION_STORAGE_KEY);
    if (!stored) return;

    try {
      const parsed = JSON.parse(stored) as { session: N8NSession; user: User };
      const session = { ...parsed.session, tenantId: parsed.session.tenantId ?? DEFAULT_N8N_TENANT_ID };
      const storedUser = {
        ...parsed.user,
        tenantId: parsed.user.tenantId ?? DEFAULT_N8N_TENANT_ID,
        role: normalizeUserRole(parsed.user.role),
      };
      setN8nSession(session);
      setUser(storedUser);
      setUsersList([storedUser]);
    } catch (error) {
      console.error('Não foi possível restaurar a sessão do n8n', error);
      localStorage.removeItem(N8N_SESSION_STORAGE_KEY);
    }
  }, [usingN8NBackend]);

  useEffect(() => {
    if (!usingN8NBackend) return;

    if (n8nSession && user) {
      localStorage.setItem(N8N_SESSION_STORAGE_KEY, JSON.stringify({ session: n8nSession, user }));
    } else {
      localStorage.removeItem(N8N_SESSION_STORAGE_KEY);
    }
  }, [n8nSession, user, usingN8NBackend]);

  useEffect(() => {
    if (usingN8NBackend) return;

    localStorage.setItem(CLIENTS_STORAGE_KEY, JSON.stringify(clients));
  }, [clients, usingN8NBackend]);

  useEffect(() => {
    if (!shouldUseLocalPersistence) return;

    const payload: LocalAppState = {
      user,
      usersList,
      clients,
      loans,
      installments,
      view,
      theme,
    };

    localStorage.setItem(LOCAL_APP_STATE_KEY, JSON.stringify(payload));
  }, [clients, installments, loans, shouldUseLocalPersistence, theme, user, usersList, view]);

  useEffect(() => {
    if (!usingN8NBackend || !n8nSession?.accessToken) return;

    const loadClients = async () => {
      try {
        const remoteClients = await fetchN8NClients(n8nSession.accessToken, n8nSession.tenantId);
        setClients(remoteClients);
      } catch (error) {
        console.error('Erro ao buscar clientes no backend n8n', error);
      }
    };

    loadClients();
  }, [n8nSession, usingN8NBackend]);

  const fetchUserProfile = useCallback(async (authUserId: string, fallbackEmail?: string): Promise<User | null> => {
    if (!supabase) return null;

    const { data, error } = await supabase
      .from('users')
      .select('id, name, email, role, whatsapp_contacts')
      .eq('id', authUserId)
      .maybeSingle();

    if (error) {
      console.error('Erro ao buscar usuário no Supabase', error);
      return null;
    }

    if (data) {
      return mapDbUserToUser(data);
    }

    if (!fallbackEmail) return null;

    const { data: created, error: insertError } = await supabase
      .from('users')
      .insert({
        id: authUserId,
        email: fallbackEmail,
        name: fallbackEmail.split('@')[0] || 'Novo usuário',
        role: UserRole.ADMIN,
        whatsapp_contacts: []
      })
      .select('id, name, email, role, whatsapp_contacts')
      .single();

    if (insertError) {
      console.error('Erro ao inserir perfil do usuário', insertError);
      return null;
    }

    return created ? mapDbUserToUser(created) : null;
  }, [mapDbUserToUser]);

  const loadUsers = useCallback(async () => {
    if (!supabase) {
      setUsersList(MOCK_USERS);
      return;
    }

    const { data, error } = await supabase
      .from('users')
      .select('id, name, email, role, whatsapp_contacts')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Erro ao carregar usuários', error);
      return;
    }

    if (data) {
      setUsersList(data.map(mapDbUserToUser));
    }
  }, [mapDbUserToUser]);

  useEffect(() => {
    setInstallments(prev => prev.map(inst => {
      if (inst.status === InstallmentStatus.PENDING && isLate(inst.dueDate)) {
        return { ...inst, status: InstallmentStatus.LATE };
      }
      return inst;
    }));
  }, []);

  useEffect(() => {
    if (usingN8NBackend) return;

    if (!isSupabaseConfigured || !supabase) {
      if (!shouldUseLocalPersistence || !storedState.usersList || storedState.usersList.length === 0) {
        setUsersList(MOCK_USERS);
      }
      return;
    }

    loadUsers();

    supabase.auth.getSession().then(async ({ data }) => {
      const sessionUser = data.session?.user;
      if (!sessionUser) return;
      const profile = await fetchUserProfile(sessionUser.id, sessionUser.email ?? undefined);
      if (profile) {
        setUser(profile);
        return;
      }

      const fallbackUser = mapAuthUserToLocalUser(sessionUser, sessionUser.email ?? undefined);
      setUser(fallbackUser);
      setUsersList(prev => prev.some(u => u.id === fallbackUser.id) ? prev : [...prev, fallbackUser]);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        const profile = await fetchUserProfile(session.user.id, session.user.email ?? undefined);
        if (profile) {
          setUser(profile);
          return;
        }

        const fallbackUser = mapAuthUserToLocalUser(session.user, session.user.email ?? undefined);
        setUser(fallbackUser);
        setUsersList(prev => prev.some(u => u.id === fallbackUser.id) ? prev : [...prev, fallbackUser]);
      } else {
        setUser(null);
      }
    });

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, [
    fetchUserProfile,
    loadUsers,
    mapAuthUserToLocalUser,
    shouldUseLocalPersistence,
    storedState.usersList,
    usingN8NBackend,
  ]);

  const login = useCallback(async (email: string, password?: string, provider?: 'google') => {
    if (usingN8NBackend) {
      if (!password) return false;
      try {
        const result = await loginWithN8N(email, password);
        const normalizedUser = {
          ...result.user,
          tenantId: result.user.tenantId ?? DEFAULT_N8N_TENANT_ID,
          role: normalizeUserRole(result.user.role),
        };
        const sessionInfo: N8NSession = {
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
          accessExpiresAt: result.accessExpiresAt,
          refreshExpiresAt: result.refreshExpiresAt,
          tenantId: normalizedUser.tenantId,
          tenantName: normalizedUser.tenantName,
        };

        setUser(normalizedUser);
        setUsersList([normalizedUser]);
        setN8nSession(sessionInfo);
        setView('home');
        return true;
      } catch (error) {
        console.error('Falha ao autenticar via backend n8n', error);
        return false;
      }
    }

    if (!isSupabaseConfigured || !supabase) {
      if (!password) return false;

      const fallbackUser = MOCK_USERS.find(u => u.email === email && u.password === password);

      if (fallbackUser) {
        setUser(fallbackUser);
        setView('home');
        return true;
      }

      return false;
    }

    if (provider === 'google') {
      const { error, data } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
        },
      });

      if (error) {
        console.error('Falha ao autenticar com Google', error);
        return false;
      }

      return Boolean(data.url);
    }

    if (!password) return false;

    const shouldUseLocalFallback = (authError?: { message?: string; status?: number }) => {
      if (!authError) return false;
      if (typeof authError.status === 'number' && authError.status >= 500) return true;

      const message = authError.message?.toLowerCase() ?? '';
      return message.includes('fetch') || message.includes('network') || message.includes('cors');
    };

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      const authUser = data.user ?? data.session?.user;

      if (!error && authUser) {
        const profile = await fetchUserProfile(authUser.id, authUser.email ?? email);
        if (profile) {
          setUser(profile);
          setView('home');
          return true;
        }

        const fallbackUser = mapAuthUserToLocalUser(authUser, authUser.email ?? email);
        setUser(fallbackUser);
        setUsersList(prev => prev.some(u => u.id === fallbackUser.id) ? prev : [...prev, fallbackUser]);
        setView('home');
        return true;
      }


      setUser(fallbackUser);
      setUsersList(prev => prev.some(u => u.id === fallbackUser.id) ? prev : [...prev, fallbackUser]);
      setView('home');
      return true;
    }

    // Fallback para usuários de demonstração caso o Supabase esteja indisponível
    const fallbackUser = MOCK_USERS.find(u => u.email === email && u.password === password);
    if (fallbackUser) {
      setUser(fallbackUser);
      setView('home');
      return true;
    }

    return false;
  }, [fetchUserProfile, mapAuthUserToLocalUser, usingN8NBackend]);

  const logout = useCallback(async () => {
    if (usingN8NBackend) {
      setN8nSession(null);
      setUser(null);
      setClients(MOCK_CLIENTS);
      setLoans(MOCK_LOANS);
      setInstallments(MOCK_INSTALLMENTS);
      return;
    }

    if (!supabase) {
      setUser(null);
      return;
    }

    await supabase.auth.signOut();
    setUser(null);
  }, [usingN8NBackend]);

  // ⭐ FUNÇÃO CORRIGIDA - SEM WEBHOOK, APENAS SALVAMENTO LOCAL
  const addClient = useCallback(async (client: Client): Promise<Client | null> => {
    if (usingN8NBackend && n8nSession?.accessToken) {
      try {
        const created = await createN8NClient(n8nSession.accessToken, n8nSession.tenantId, client);
        setClients(prev => [...prev, created]);
        return created;
      } catch (error) {
        console.error('Erro ao criar cliente via n8n API', error);
        throw error;
      }
    }

    // ✅ SOLUÇÃO: Apenas salva localmente, SEM chamar webhook
    console.log('📝 addClient: salvando cliente localmente');
    setClients(prev => [...prev, client]);
    console.log('✅ addClient: cliente salvo com sucesso');
    return client;
  }, [n8nSession, usingN8NBackend]);

  const updateClient = (client: Client) => {
    setClients(prev => prev.map(item => item.id === client.id ? client : item));
  };

  const deleteClient = (id: string) => {
    setClients(prev => prev.filter(client => client.id !== id));
    setLoans(prev => prev.filter(loan => loan.clientId !== id));
    setInstallments(prev => prev.filter(inst => inst.clientId !== id));
  };

  const addLoan = (loan: Loan, generatedInstallments: Installment[]) => {
    setLoans([...loans, loan]);
    setInstallments([...installments, ...generatedInstallments]);
  };

  const updateLoan = (loan: Loan, generatedInstallments: Installment[]) => {
    setLoans(prev => prev.map(item => item.id === loan.id ? loan : item));
    setInstallments(prev => prev.filter(inst => inst.loanId !== loan.id).concat(generatedInstallments));
  };

  const deleteLoan = (id: string) => {
    setLoans(prev => prev.filter(loan => loan.id !== id));
    setInstallments(prev => prev.filter(inst => inst.loanId !== id));
  };

  const scheduleFuturePayment = (id: string, reason: string, amount: number, date?: string) => {
    const createdAt = new Date().toISOString();
    setInstallments(prev => prev.map(inst => {
      if (inst.id !== id) return inst;

      const entry = {
        reason,
        amount,
        date: date || getTodayDateString(),
        createdAt
      };

      const promisedPaymentHistory = [...(inst.promisedPaymentHistory ?? []), entry];

      return {
        ...inst,
        promisedPaymentReason: entry.reason,
        promisedPaymentAmount: entry.amount,
        promisedPaymentDate: entry.date,
        promisedPaymentHistory
      };
    }));
  };

  const startEditingLoan = (loanId: string) => {
    if (user?.role !== UserRole.ADMIN) return;
    setLoanToEditId(loanId);
    setView('loans');
  };

  const payInstallment = (id: string, amount?: number) => {
    if (user?.role === UserRole.COLLECTION) {
      alert("Acesso restrito: Cobradores não podem baixar pagamentos, apenas visualizar.");
      return;
    }

    setInstallments(prev => {
      const updatedInstallments = prev.map(inst => {
        if (inst.id !== id) return inst;

        const paymentValue = inst.status === InstallmentStatus.PAID ? 0 : (amount ?? inst.amount);
        const loan = loans.find(l => l.id === inst.loanId);

        if (loan?.model === LoanModel.INTEREST_ONLY) {
          const interestDue = Math.max(0, inst.interestAmount ?? Math.max(0, inst.amount - (inst.principalAmount ?? 0)));
          const principalDue = Math.max(0, inst.principalAmount ?? Math.max(0, inst.amount - interestDue));
          const totalDue = Math.max(0, interestDue + principalDue);

          const appliedPayment = Math.min(paymentValue, totalDue);
          let remainingPayment = appliedPayment;

          const interestPayment = Math.min(remainingPayment, interestDue);
          remainingPayment -= interestPayment;
          const updatedInterest = Number((interestDue - interestPayment).toFixed(2));

          const principalPayment = Math.min(remainingPayment, principalDue);
          const updatedPrincipal = Number((principalDue - principalPayment).toFixed(2));

          const remainingBalance = Number((updatedInterest + updatedPrincipal).toFixed(2));
          const newStatus = remainingBalance <= 0 ? InstallmentStatus.PAID : InstallmentStatus.PARTIAL;

          return {
            ...inst,
            amount: remainingBalance,
            interestAmount: updatedInterest,
            principalAmount: updatedPrincipal,
            amountPaid: Number(((inst.amountPaid || 0) + appliedPayment).toFixed(2)),
            status: newStatus,
            paidDate: newStatus === InstallmentStatus.PAID ? new Date().toISOString() : inst.paidDate
          };
        }

        const paidAmount = Math.min(inst.amount, (inst.amountPaid || 0) + paymentValue);
        const isPaid = paidAmount >= inst.amount;

        return {
          ...inst,
          status: isPaid ? InstallmentStatus.PAID : InstallmentStatus.PARTIAL,
          amountPaid: Number(paidAmount.toFixed(2)),
          paidDate: new Date().toISOString()
        };
      });

      setLoans(prevLoans => prevLoans.map(loan => {
        const related = updatedInstallments.filter(inst => inst.loanId === loan.id);
        const isLoanPaid = related.length > 0 && related.every(inst => inst.status === InstallmentStatus.PAID || inst.amount <= 0);
        return { ...loan, status: isLoanPaid ? LoanStatus.PAID : LoanStatus.ACTIVE };
      }));

      return updatedInstallments;
    });
  };

  const addUser = useCallback(async (newUser: User): Promise<User | null> => {
    if (usingN8NBackend || !supabase) {
      const fallbackUser = { ...newUser, id: newUser.id ?? `local-${Date.now()}` };
      setUsersList(prev => [...prev, fallbackUser]);
      return fallbackUser;
    }

    const { data, error } = await supabase.auth.signUp({
      email: newUser.email,
      password: newUser.password ?? ''
    });

    if (error) {
      console.error('Erro ao cadastrar usuário no Supabase Auth', error);
      throw error;
    }

    const authUser = data.user;
    if (!authUser) return null;

    const { data: profile, error: profileError } = await supabase
      .from('users')
      .upsert({
        id: authUser.id,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role,
        whatsapp_contacts: newUser.whatsappContacts ?? []
      })
      .select('id, name, email, role, whatsapp_contacts')
      .single();

    if (profileError) {
      console.error('Erro ao salvar perfil do usuário', profileError);
      throw profileError;
    }

    const formatted = mapDbUserToUser(profile);
    setUsersList(prev => [...prev, formatted]);
    return formatted;
  }, [mapDbUserToUser, usingN8NBackend]);

  const removeUser = useCallback(async (id: string) => {
    if (id === user?.id) {
      alert("Você não pode remover a si mesmo.");
      return;
    }

    if (usingN8NBackend || !supabase) {
      setUsersList(prev => prev.filter(u => u.id !== id));
      return;
    }

    const { error } = await supabase.from('users').delete().eq('id', id);
    if (error) {
      console.error('Erro ao remover usuário', error);
      throw error;
    }

    setUsersList(prev => prev.filter(u => u.id !== id));
  }, [user?.id, usingN8NBackend]);

  const value = useMemo(() => ({
    user,
    usersList,
    clients,
    loans,
    installments,
    n8nSession,
    usingN8NBackend,
    login,
    logout,
    addClient,
    updateClient,
    deleteClient,
    addLoan,
    updateLoan,
    deleteLoan,
    payInstallment,
    scheduleFuturePayment,
    startEditingLoan,
    addUser,
    removeUser,
    view,
    setView,
    theme,
    setTheme
  }), [user, usersList, clients, loans, installments, n8nSession, usingN8NBackend, view, theme, login, logout, addClient, addUser, removeUser, deleteClient, deleteLoan, payInstallment, scheduleFuturePayment, startEditingLoan, addLoan, updateLoan, setTheme, setView]);

  useEffect(() => {
    const body = document.body;
    const themeClasses: ThemeOption[] = ['light', 'dark-emerald', 'dark-graphite'];
    body.classList.remove(...themeClasses.map(t => `theme-${t}`));
    body.classList.add(`theme-${theme}`);
  }, [theme]);

  if (!user) {
    return (
      <AppContext.Provider value={value}>
        <LandingPage onLogin={() => setView('home')} />
      </AppContext.Provider>
    );
  }

  return (
    <AppContext.Provider value={value}>
      <DashboardLayout>
        {view === 'home' && <DashboardHome />}
        {view === 'clients' && <ClientsView />}
        {view === 'loans' && (
          <LoansView
            editingLoanId={loanToEditId}
            onCloseEdit={() => setLoanToEditId(null)}
          />
        )}
        {view === 'installments' && <InstallmentsView />}
        {view === 'users' && <UsersView />}
        {view === 'loanHistory' && <LoanHistoryView />}
      </DashboardLayout>
    </AppContext.Provider>
  );
};

export default App;