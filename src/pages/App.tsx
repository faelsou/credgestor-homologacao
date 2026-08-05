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
//import { createClient, fetchClients, isN8NBackendConfigured, loginWithBackend } from './n8nApi';
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
//const BACKEND_SESSION_STORAGE_KEY = 'credgestor:n8n-session';
//
//export type ThemeOption = 'light' | 'dark-emerald' | 'dark-graphite';
//
//export const AppContext = React.createContext<{
//  user: User | null;
//  usersList: User[];
//  clients: Client[];
//  loans: Loan[];
//  installments: Installment[];
//  session: N8NSession | null;
//  isBackendConfiguredValue: boolean;
//  login: (email: string, password?: string, provider?: 'google') => Promise<boolean>;
//  logout: () => Promise<void>;
//  addClient: (client: Client) => Promise<Client | null>;
//  updateClient: (client: Client) => void;
//  deleteClient: (id: string) => void;
//  addLoan: (loan: Loan, generatedInstallments: Installment[]) => void;
//  updateLoan: (loan: Loan, generatedInstallments: Installment[]) => void;
//  deleteLoan: (id: string) => void;
//  payInstallment: (id: string, amount?: number, paymentDate?: string) => void;
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
//  const [session, setSession] = useState<N8NSession | null>(null);
//
//  const isBackendConfiguredValue = isN8NBackendConfigured;
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
//    if (!isBackendConfiguredValue) return;
//    const stored = localStorage.getItem(BACKEND_SESSION_STORAGE_KEY);
//    if (!stored) return;
//
//    try {
//      const parsed = JSON.parse(stored) as { session: N8NSession; user: User };
//      setSession(parsed.session);
//      setUser(parsed.user);
//      setUsersList([parsed.user]);
//    } catch (error) {
//      console.error('Não foi possível restaurar a sessão do n8n', error);
//      localStorage.removeItem(BACKEND_SESSION_STORAGE_KEY);
//    }
//  }, [isBackendConfiguredValue]);
//
//  useEffect(() => {
//    if (!isBackendConfiguredValue) return;
//
//    if (session && user) {
//      localStorage.setItem(BACKEND_SESSION_STORAGE_KEY, JSON.stringify({ session: session, user }));
//    } else {
//      localStorage.removeItem(BACKEND_SESSION_STORAGE_KEY);
//    }
//  }, [session, user, isBackendConfiguredValue]);
//
//  useEffect(() => {
//    if (isBackendConfiguredValue) return;
//
//    localStorage.setItem(CLIENTS_STORAGE_KEY, JSON.stringify(clients));
//  }, [clients, isBackendConfiguredValue]);
//
//  useEffect(() => {
//    if (!isBackendConfiguredValue || !session?.accessToken) return;
//
//    const loadClients = async () => {
//      try {
//        const remoteClients = await fetchClients(session.accessToken, session.tenantId);
//        setClients(remoteClients);
//      } catch (error) {
//        console.error('Erro ao buscar clientes no backend n8n', error);
//      }
//    };
//
//    loadClients();
//  }, [session, isBackendConfiguredValue]);
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
//    if (isBackendConfiguredValue) return;
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
//    if (isBackendConfiguredValue) {
//      if (!password) return false;
//      try {
//        const result = await loginWithBackend(email, password);
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
//        setSession(sessionInfo);
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
//  }, [fetchUserProfile, isBackendConfiguredValue]);
//
//  const logout = useCallback(async () => {
//    if (isBackendConfiguredValue) {
//      setSession(null);
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
//  }, [isBackendConfiguredValue]);
//
//  const addClient = useCallback(async (client: Client): Promise<Client | null> => {
//    if (isBackendConfiguredValue && session?.accessToken) {
//      const created = await createClient(session.accessToken, session.tenantId, client);
//      setClients(prev => [...prev, created]);
//      return created;
//    }
//
//    setClients(prev => [...prev, client]);
//    return client;
//  }, [session, isBackendConfiguredValue]);
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
//    if (isBackendConfiguredValue || !supabase) {
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
//  }, [mapDbUserToUser, isBackendConfiguredValue]);
//
//  const removeUser = useCallback(async (id: string) => {
//    if (id === user?.id) {
//      alert("Você não pode remover a si mesmo.");
//      return;
//    }
//
//    if (isBackendConfiguredValue || !supabase) {
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
//  }, [user?.id, isBackendConfiguredValue]);
//
//  const value = useMemo(() => ({
//    user,
//    usersList,
//    clients,
//    loans,
//    installments,
//    session,
//    isBackendConfiguredValue,
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
//  }), [user, usersList, clients, loans, installments, session, isBackendConfiguredValue, view, theme, login, logout, addClient, addUser, removeUser, deleteClient, deleteLoan, payInstallment, scheduleFuturePayment, startEditingLoan, addLoan, updateLoan, setTheme, setView]);
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
//import { createClient, fetchClients, isN8NBackendConfigured, loginWithBackend } from './n8nApi';
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
//const BACKEND_SESSION_STORAGE_KEY = 'credgestor:n8n-session';
//
//export type ThemeOption = 'light' | 'dark-emerald' | 'dark-graphite';
//
//export const AppContext = React.createContext<{
//  user: User | null;
//  usersList: User[];
//  clients: Client[];
//  loans: Loan[];
//  installments: Installment[];
//  session: N8NSession | null;
//  isBackendConfiguredValue: boolean;
//  login: (email: string, password?: string, provider?: 'google') => Promise<boolean>;
//  logout: () => Promise<void>;
//  addClient: (client: Client) => Promise<Client | null>;
//  updateClient: (client: Client) => void;
//  deleteClient: (id: string) => void;
//  addLoan: (loan: Loan, generatedInstallments: Installment[]) => void;
//  updateLoan: (loan: Loan, generatedInstallments: Installment[]) => void;
//  deleteLoan: (id: string) => void;
//  payInstallment: (id: string, amount?: number, paymentDate?: string) => void;
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
//  const [session, setSession] = useState<N8NSession | null>(null);
//
//  const isBackendConfiguredValue = isN8NBackendConfigured;
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
//    if (!isBackendConfiguredValue) return;
//    const stored = localStorage.getItem(BACKEND_SESSION_STORAGE_KEY);
//    if (!stored) return;
//
//    try {
//      const parsed = JSON.parse(stored) as { session: N8NSession; user: User };
//      setSession(parsed.session);
//      setUser(parsed.user);
//      setUsersList([parsed.user]);
//    } catch (error) {
//      console.error('Não foi possível restaurar a sessão do n8n', error);
//      localStorage.removeItem(BACKEND_SESSION_STORAGE_KEY);
//    }
//  }, [isBackendConfiguredValue]);
//
//  useEffect(() => {
//    if (!isBackendConfiguredValue) return;
//
//    if (session && user) {
//      localStorage.setItem(BACKEND_SESSION_STORAGE_KEY, JSON.stringify({ session: session, user }));
//    } else {
//      localStorage.removeItem(BACKEND_SESSION_STORAGE_KEY);
//    }
//  }, [session, user, isBackendConfiguredValue]);
//
//  useEffect(() => {
//    if (isBackendConfiguredValue) return;
//
//    localStorage.setItem(CLIENTS_STORAGE_KEY, JSON.stringify(clients));
//  }, [clients, isBackendConfiguredValue]);
//
//  useEffect(() => {
//    if (!isBackendConfiguredValue || !session?.accessToken) return;
//
//    const loadClients = async () => {
//      try {
//        const remoteClients = await fetchClients(session.accessToken, session.tenantId);
//        setClients(remoteClients);
//      } catch (error) {
//        console.error('Erro ao buscar clientes no backend n8n', error);
//      }
//    };
//
//    loadClients();
//  }, [session, isBackendConfiguredValue]);
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
//    if (isBackendConfiguredValue) return;
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
//  }, [fetchUserProfile, loadUsers, isBackendConfiguredValue]);
//
//  const login = useCallback(async (email: string, password?: string, provider?: 'google') => {
//    if (isBackendConfiguredValue) {
//      if (!password) return false;
//      try {
//        const result = await loginWithBackend(email, password);
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
//        setSession(sessionInfo);
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
//  }, [fetchUserProfile, isBackendConfiguredValue]);
//
//  const logout = useCallback(async () => {
//    if (isBackendConfiguredValue) {
//      setSession(null);
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
//  }, [isBackendConfiguredValue]);
//
//  // ⭐ FUNÇÃO CORRIGIDA - SEM WEBHOOK, APENAS SALVAMENTO LOCAL
//  const addClient = useCallback(async (client: Client): Promise<Client | null> => {
//    if (isBackendConfiguredValue && session?.accessToken) {
//      try {
//        const created = await createClient(session.accessToken, session.tenantId, client);
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
//  }, [session, isBackendConfiguredValue]);
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
//    if (isBackendConfiguredValue || !supabase) {
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
//  }, [mapDbUserToUser, isBackendConfiguredValue]);
//
//  const removeUser = useCallback(async (id: string) => {
//    if (id === user?.id) {
//      alert("Você não pode remover a si mesmo.");
//      return;
//    }
//
//    if (isBackendConfiguredValue || !supabase) {
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
//  }, [user?.id, isBackendConfiguredValue]);
//
//  const value = useMemo(() => ({
//    user,
//    usersList,
//    clients,
//    loans,
//    installments,
//    session,
//    isBackendConfiguredValue,
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
//  }), [user, usersList, clients, loans, installments, session, isBackendConfiguredValue, view, theme, login, logout, addClient, addUser, removeUser, deleteClient, deleteLoan, payInstallment, scheduleFuturePayment, startEditingLoan, addLoan, updateLoan, setTheme, setView]);
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

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { LandingPage } from '@/components/LandingPage';
import { ResetPassword } from '@/components/ResetPassword';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { DashboardHome } from '@/components/dashboard/Home';
import { ClientsView } from '@/components/dashboard/Clients';
import { LoansView } from '@/components/dashboard/Loans';
import { InstallmentsView } from '@/components/dashboard/Installments';
import { UsersView } from '@/components/dashboard/Users';
import { LoanHistoryView } from '@/components/dashboard/LoanHistory';
import { User, UserRole, Client, Loan, Installment, LoanStatus, InstallmentStatus, LoanModel } from '@/types';
import { getTodayDateString, isLate, normalizeUserRole } from '@/utils';
import {
  ACTIVITY_SAVE_INTERVAL_MS,
  INACTIVITY_CHECK_INTERVAL_MS,
  LAST_ACTIVITY_KEY,
  clearLastActivityAt,
  isSessionExpiredByInactivity,
  readLastActivityAt,
  remainingInactivityMs,
  shouldBlockSessionRestore,
  writeLastActivityAt,
} from '@/utils/sessionInactivity';
import { isSupabaseConfigured, supabase } from '@/services/supabaseClient';
import { createClient, deleteClient as deleteClientApi, fetchClients, isBackendConfigured, loginWithBackend, LoginResult } from '@/services/api';

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

// --- LOGOUT POR INATIVIDADE ---
// lastActivityAt fica em chave separada (credgestor:last-activity) para não ser
// apagada ao restaurar a UI após o login.
const LAST_STATE_KEY = 'credgestor:last-state';
const KNOWN_VIEWS = ['home', 'clients', 'loans', 'installments', 'users', 'loanHistory'];

type InstallmentsFilter = 'ALL' | 'PENDING' | 'LATE' | 'PAID' | 'PARTIAL';

type PersistedLastState = {
  view?: string;
  theme?: ThemeOption;
  installmentsInitialFilter?: InstallmentsFilter | null;
  installmentsDateRange?: { start: string; end: string } | null;
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
    model: LoanModel.PRICE,
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

type BackendSession = {
  accessToken: string;
  refreshToken: string;
  accessExpiresAt?: string;
  refreshExpiresAt?: string;
  tenantId?: string;
  tenantName?: string;
};

const BACKEND_SESSION_STORAGE_KEY = 'credgestor:backend-session';
const DEFAULT_TENANT_ID = import.meta.env.VITE_API_TENANT_ID as string | undefined || '00000000-0000-0000-0000-000000000001';

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
  session: BackendSession | null;
  setSession: (session: BackendSession | null) => void;
  isBackendConfigured: boolean;
  login: (email: string, password?: string, provider?: 'google') => Promise<boolean>;
  logout: () => Promise<void>;
  addClient: (client: Client) => Promise<Client | null>;
  updateClient: (client: Client) => void;
  deleteClient: (id: string) => Promise<void>;
  addLoan: (loan: Loan, generatedInstallments: Installment[]) => void;
  updateLoan: (loan: Loan, generatedInstallments: Installment[]) => void;
  deleteLoan: (id: string) => void;
  payInstallment: (id: string, amount?: number, paymentDate?: string) => void;
  updateInstallment: (id: string, installment: Installment) => Promise<void>;
  scheduleFuturePayment: (id: string, reason: string, amount: number, date?: string) => Promise<void>;
  startEditingLoan: (loanId: string) => void;
  reopenLoan: (loanId: string) => Promise<void>;
  addUser: (newUser: User) => Promise<User | null>;
  removeUser: (id: string) => Promise<void>;
  view: string;
  setView: (v: string, filter?: 'ALL' | 'PENDING' | 'LATE' | 'PAID' | 'PARTIAL', dateRange?: { start: string; end: string }) => void;
  theme: ThemeOption;
  setTheme: (theme: ThemeOption) => void;
  installmentsInitialFilter: 'ALL' | 'PENDING' | 'LATE' | 'PAID' | 'PARTIAL' | null;
  setInstallmentsInitialFilter: (filter: 'ALL' | 'PENDING' | 'LATE' | 'PAID' | 'PARTIAL' | null) => void;
  installmentsDateRange: { start: string; end: string } | null;
  setInstallmentsDateRange: (range: { start: string; end: string } | null) => void;
}>({} as any);

const App: React.FC = () => {
  const isBackendConfiguredValue = isBackendConfigured;
  const shouldUseLocalPersistence = !isBackendConfiguredValue && !isSupabaseConfigured;
  
  // Helper para validar tenantId (REGRA IMPORTANTE: sem fallback)
  const requireTenantId = useCallback((tenantId: string | undefined, operation: string): string => {
    if (!tenantId) {
      throw new Error(`tenantId é obrigatório para ${operation}. Faça logout e login novamente.`);
    }
    return tenantId;
  }, []);
  const [storedState] = useState<LocalAppState>(() => shouldUseLocalPersistence ? loadStoredAppState() : {});

  const [user, setUser] = useState<User | null>(() => shouldUseLocalPersistence ? storedState.user ?? null : null);
  const [view, setView] = useState(storedState.view ?? 'home');
  const [installmentsInitialFilter, setInstallmentsInitialFilter] = useState<'ALL' | 'PENDING' | 'LATE' | 'PAID' | 'PARTIAL' | null>(null);
  const [installmentsDateRange, setInstallmentsDateRange] = useState<{ start: string; end: string } | null>(null);

  // REGRA IMPORTANTE: Não carregar dados do localStorage quando usa backend
  // localStorage é compartilhado entre usuários no mesmo navegador
  const [clients, setClients] = useState<Client[]>(() => {
    // Se usa backend, sempre começar vazio - dados virão do backend
    if (isBackendConfiguredValue) {
      return [];
    }
    
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

  // REGRA IMPORTANTE: Não carregar dados do localStorage quando usa backend
  const [loans, setLoans] = useState<Loan[]>(() => {
    if (isBackendConfiguredValue) {
      return []; // Dados virão do backend
    }
    return shouldUseLocalPersistence && storedState.loans ? storedState.loans : MOCK_LOANS;
  });
  const [installments, setInstallments] = useState<Installment[]>(() => {
    if (isBackendConfiguredValue) {
      return []; // Dados virão do backend
    }
    return shouldUseLocalPersistence && storedState.installments ? storedState.installments : MOCK_INSTALLMENTS;
  });
  const [usersList, setUsersList] = useState<User[]>(() => shouldUseLocalPersistence && storedState.usersList ? storedState.usersList : []);
  const [theme, setTheme] = useState<ThemeOption>(storedState.theme ?? 'light');
  const [loanToEditId, setLoanToEditId] = useState<string | null>(null);
  const [session, setSession] = useState<BackendSession | null>(null);

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
    if (!isBackendConfiguredValue) return;
    const stored = localStorage.getItem(BACKEND_SESSION_STORAGE_KEY);
    if (!stored) return;

    // Sem atividade recente (ou sem registro), não restaurar a sessão.
    // LAST_STATE_KEY é mantido para restaurar a UI após o próximo login.
    if (shouldBlockSessionRestore()) {
      console.warn('⏱️ Sessão expirada por inatividade (15 min). Novo login necessário.');
      localStorage.removeItem(BACKEND_SESSION_STORAGE_KEY);
      clearLastActivityAt();
      return;
    }

    try {
      const parsed = JSON.parse(stored) as { session: BackendSession; user: User };
      // REGRA IMPORTANTE: Se não tiver tenantId na sessão restaurada, limpar e forçar novo login
      if (!parsed.session.tenantId || !parsed.user.tenantId) {
        console.warn('⚠️ Sessão restaurada sem tenantId. Limpando e forçando novo login.');
        localStorage.removeItem(BACKEND_SESSION_STORAGE_KEY);
        // Limpar todos os dados
        setClients([]);
        setLoans([]);
        setInstallments([]);
        localStorage.removeItem(CLIENTS_STORAGE_KEY);
        localStorage.removeItem(LOCAL_APP_STATE_KEY);
        return;
      }
      
      const restoredSession = { ...parsed.session, tenantId: parsed.session.tenantId };
      const storedUser = {
        ...parsed.user,
        tenantId: parsed.user.tenantId, // Sem fallback
        role: normalizeUserRole(parsed.user.role),
      };
      
      // REGRA CRÍTICA: Limpar dados ao restaurar sessão para evitar dados de outro usuário
      console.log('🧹 Limpando dados ao restaurar sessão...');
      setClients([]);
      setLoans([]);
      setInstallments([]);
      // Limpar localStorage de dados antigos (pode ser de outro usuário)
      localStorage.removeItem(CLIENTS_STORAGE_KEY);
      localStorage.removeItem(LOCAL_APP_STATE_KEY);
      
      setSession(restoredSession);
      setUser(storedUser);
      setUsersList([storedUser]);
    } catch (error) {
      console.error('Não foi possível restaurar a sessão do backend', error);
      localStorage.removeItem(BACKEND_SESSION_STORAGE_KEY);
    }
  }, [isBackendConfiguredValue]);

  useEffect(() => {
    if (!isBackendConfiguredValue) return;

    if (session && user) {
      localStorage.setItem(BACKEND_SESSION_STORAGE_KEY, JSON.stringify({ session, user }));
    } else {
      localStorage.removeItem(BACKEND_SESSION_STORAGE_KEY);
    }
  }, [session, user, isBackendConfiguredValue]);

  // REGRA IMPORTANTE: NÃO salvar dados no localStorage quando usa backend
  // localStorage é compartilhado entre usuários no mesmo navegador
  // useEffect(() => {
  //   if (isBackendConfiguredValue) return;
  //   localStorage.setItem(CLIENTS_STORAGE_KEY, JSON.stringify(clients));
  // }, [clients, isBackendConfiguredValue]);

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
    if (!isBackendConfiguredValue || !session?.accessToken) return;

    const loadData = async () => {
      try {
        // REGRA CRÍTICA: Limpar dados antes de carregar novos para evitar mistura
        // Isso garante que dados de outro usuário não apareçam
        console.log('🧹 Limpando dados antes de carregar do backend...');
        setClients([]);
        setLoans([]);
        setInstallments([]);
        
        // Carregar clientes
        if (!session.tenantId) {
          throw new Error('tenantId não está definido na sessão. Faça logout e login novamente.');
        }
        const remoteClients = await fetchClients(session.accessToken, session.tenantId);
        console.log(`✅ Carregados ${remoteClients.length} clientes para tenant ${session.tenantId}`);
        setClients(remoteClients);
        
        // Carregar empréstimos
        try {
          const { fetchBackendLoans } = await import('@/services/backendApi');
          // REGRA: tenantId é obrigatório
          if (!session.tenantId) {
            throw new Error('tenantId não está definido na sessão');
          }
          const remoteLoans = await fetchBackendLoans(session.accessToken, session.tenantId);
          setLoans(remoteLoans);
        } catch (loanError) {
          console.error('Erro ao buscar empréstimos no backend', loanError);
          // Continua mesmo se falhar ao carregar empréstimos
        }
        
        // Carregar parcelas
        try {
          const { fetchBackendInstallments } = await import('@/services/backendApi');
          // REGRA: tenantId é obrigatório
          if (!session.tenantId) {
            throw new Error('tenantId não está definido na sessão');
          }
          const remoteInstallments = await fetchBackendInstallments(session.accessToken, session.tenantId);
          setInstallments(remoteInstallments);
        } catch (installmentError) {
          console.error('Erro ao buscar parcelas no backend', installmentError);
          // Continua mesmo se falhar ao carregar parcelas
        }
        
        // Carregar usuários do tenant
        try {
          const { fetchBackendUsers } = await import('@/services/backendApi');
          // REGRA: tenantId é obrigatório
          if (!session.tenantId) {
            throw new Error('tenantId não está definido na sessão');
          }
          const remoteUsers = await fetchBackendUsers(session.accessToken, session.tenantId);
          const formattedUsers = remoteUsers.map(u => ({
            id: u.id,
            email: u.email,
            name: u.name,
            role: normalizeUserRole(u.role),
            whatsappContacts: u.whatsappContacts || [],
            tenantId: u.tenantId
          }));
          setUsersList(formattedUsers);
          console.log(`✅ Carregados ${formattedUsers.length} usuários para tenant ${session.tenantId}`);
        } catch (usersError) {
          // Erro ao buscar usuários não é crítico - apenas loga sem mostrar erro ao usuário
          if (usersError instanceof Error && !usersError.message.includes('404')) {
            console.warn('Aviso ao buscar usuários no backend (não crítico):', usersError.message);
          }
          // Continua mesmo se falhar ao carregar usuários
        }
      } catch (error) {
        console.error('Erro ao buscar dados no backend', error);
      }
    };

    loadData();
  }, [session, isBackendConfiguredValue]);

  // REGRA CRÍTICA: Limpar dados quando o tenantId mudar (usuário diferente fez login)
  useEffect(() => {
    if (!isBackendConfiguredValue || !session?.tenantId) return;
    
    // Armazenar o tenantId anterior para comparar
    const previousTenantId = sessionStorage.getItem('current_tenant_id');
    const currentTenantId = session.tenantId;
    
    // Se o tenantId mudou, limpar todos os dados
    if (previousTenantId && previousTenantId !== currentTenantId) {
      console.warn('⚠️ TenantId mudou! Limpando dados do tenant anterior...');
      console.log(`   Tenant anterior: ${previousTenantId}`);
      console.log(`   Tenant atual: ${currentTenantId}`);
      setClients([]);
      setLoans([]);
      setInstallments([]);
      // Limpar localStorage
      localStorage.removeItem(CLIENTS_STORAGE_KEY);
      localStorage.removeItem(LOCAL_APP_STATE_KEY);
    }
    
    // Atualizar o tenantId atual
    sessionStorage.setItem('current_tenant_id', currentTenantId);
  }, [session?.tenantId, isBackendConfiguredValue]);

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
      // Verificar se a parcela foi totalmente paga
      const totalPaid = inst.amountPaid || 0;
      const totalDue = inst.amount || 0;
      const isFullyPaid = totalPaid >= totalDue && totalDue > 0;

      // Se foi totalmente paga, atualizar status para PAID (mesmo que tenha status LATE ou PARTIAL)
      if (isFullyPaid && inst.status !== InstallmentStatus.PAID) {
        return { ...inst, status: InstallmentStatus.PAID };
      }

      // Não marcar como LATE se a parcela já está paga
      if (inst.status === InstallmentStatus.PAID) {
        return inst;
      }

      // Marcar como LATE apenas se está PENDING e a data passou
      if (inst.status === InstallmentStatus.PENDING && isLate(inst.dueDate)) {
        return { ...inst, status: InstallmentStatus.LATE };
      }

      // Se está LATE mas foi paga (verificar pelo paymentHistory), atualizar para PAID
      if (inst.status === InstallmentStatus.LATE && inst.paymentHistory && inst.paymentHistory.length > 0) {
        // Verificar se há pagamento suficiente para quitar a parcela
        const totalPaidFromHistory = inst.paymentHistory.reduce((sum, p) => sum + (p.amount || 0), 0);
        const totalDueFromHistory = (inst.interestAmount || 0) + (inst.principalAmount || 0);
        if (totalPaidFromHistory >= totalDueFromHistory && totalDueFromHistory > 0) {
          return { ...inst, status: InstallmentStatus.PAID };
        }
      }

      // Se está PARTIAL mas foi totalmente paga, atualizar para PAID
      if (inst.status === InstallmentStatus.PARTIAL && isFullyPaid) {
        return { ...inst, status: InstallmentStatus.PAID };
      }

      return inst;
    }));
  }, []);

  useEffect(() => {
    if (isBackendConfiguredValue) return;

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
    isBackendConfiguredValue,
  ]);

  const login = useCallback(async (email: string, password?: string, provider?: 'google') => {
    if (isBackendConfiguredValue) {
      if (!password) return false;
      try {
        const result = await loginWithBackend(email, password);
        // REGRA IMPORTANTE: tenantId é obrigatório - não usar fallback
        if (!result.user.tenantId) {
          throw new Error('Usuário não possui tenant_id. Entre em contato com o administrador.');
        }
        
        const normalizedUser = {
          ...result.user,
          tenantId: result.user.tenantId, // Sem fallback - deve vir do backend
          role: normalizeUserRole(result.user.role),
        };
        const sessionInfo: BackendSession = {
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
          accessExpiresAt: result.accessExpiresAt,
          refreshExpiresAt: result.refreshExpiresAt,
          tenantId: normalizedUser.tenantId, // Obrigatório
          tenantName: normalizedUser.tenantName,
        };

        // REGRA CRÍTICA: Limpar TODOS os dados ao fazer login para evitar compartilhamento
        // localStorage é compartilhado entre usuários no mesmo navegador
        console.log('🧹 Limpando dados antigos ao fazer login...');
        setClients([]);
        setLoans([]);
        setInstallments([]);
        // Limpar localStorage de dados antigos (pode ser de outro usuário)
        localStorage.removeItem(CLIENTS_STORAGE_KEY);
        localStorage.removeItem(LOCAL_APP_STATE_KEY);
        // Limpar sessionStorage também
        sessionStorage.removeItem('current_tenant_id');
        // Armazenar o novo tenantId
        sessionStorage.setItem('current_tenant_id', normalizedUser.tenantId);

        setUser(normalizedUser);
        setUsersList([normalizedUser]);
        setSession(sessionInfo);
        setView('home');
        writeLastActivityAt();
        return true;
      } catch (error) {
        console.error('❌ Falha ao autenticar via backend:', error);
        if (error instanceof Error) {
          console.error('📝 Mensagem de erro:', error.message);
          // Propagar o erro para que o componente possa exibir a mensagem específica
          throw error;
        }
        throw new Error('Erro desconhecido ao fazer login');
      }
    }

    if (!isSupabaseConfigured || !supabase) {
      if (!password) return false;

      const fallbackUser = MOCK_USERS.find(u => u.email === email && u.password === password);

      if (fallbackUser) {
        setUser(fallbackUser);
        setView('home');
        writeLastActivityAt();
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
          writeLastActivityAt();
          return true;
        }

        const fallbackUser = mapAuthUserToLocalUser(authUser, authUser.email ?? email);
        setUser(fallbackUser);
        setUsersList(prev => prev.some(u => u.id === fallbackUser.id) ? prev : [...prev, fallbackUser]);
        setView('home');
        writeLastActivityAt();
        return true;
      }

      if (shouldUseLocalFallback(error)) {
        const fallbackUser = mapAuthUserToLocalUser(null, email);
        setUser(fallbackUser);
        setUsersList(prev => prev.some(u => u.id === fallbackUser.id) ? prev : [...prev, fallbackUser]);
        setView('home');
        writeLastActivityAt();
        return true;
      }

      console.error('Falha ao autenticar usuário', error ?? 'Sessão retornada sem usuário');
    } catch (error) {
      const fallbackUser = mapAuthUserToLocalUser(null, email);
      setUser(fallbackUser);
      setUsersList(prev => prev.some(u => u.id === fallbackUser.id) ? prev : [...prev, fallbackUser]);
      setView('home');
      writeLastActivityAt();
      return true;
    }

    const fallbackUser = MOCK_USERS.find(u => u.email === email && u.password === password);
    if (fallbackUser) {
      setUser(fallbackUser);
      setView('home');
      writeLastActivityAt();
      return true;
    }

    return false;
  }, [fetchUserProfile, mapAuthUserToLocalUser, isBackendConfiguredValue]);

  const logout = useCallback(async () => {
    // Logout manual limpa o último estado salvo; o logout por inatividade
    // regrava o estado logo após esta função terminar
    localStorage.removeItem(LAST_STATE_KEY);
    clearLastActivityAt();

    // REGRA IMPORTANTE: Limpar TODOS os dados ao fazer logout para evitar compartilhamento
    if (isBackendConfiguredValue) {
      // Limpar sessão e dados do usuário
      setSession(null);
      setUser(null);
      setUsersList([]);
      
      // Limpar dados de negócio
      setClients(MOCK_CLIENTS);
      setLoans(MOCK_LOANS);
      setInstallments(MOCK_INSTALLMENTS);
      
      // Limpar localStorage para evitar dados compartilhados entre usuários
      localStorage.removeItem(BACKEND_SESSION_STORAGE_KEY);
      localStorage.removeItem(CLIENTS_STORAGE_KEY);
      localStorage.removeItem(LOCAL_APP_STATE_KEY);
      
      return;
    }

    if (!supabase) {
      setUser(null);
      setUsersList([]);
      setClients(MOCK_CLIENTS);
      localStorage.removeItem(CLIENTS_STORAGE_KEY);
      localStorage.removeItem(LOCAL_APP_STATE_KEY);
      return;
    }

    await supabase.auth.signOut();
    setUser(null);
    setUsersList([]);
    setClients(MOCK_CLIENTS);
    localStorage.removeItem(CLIENTS_STORAGE_KEY);
    localStorage.removeItem(LOCAL_APP_STATE_KEY);
  }, [isBackendConfiguredValue]);

  // --- LOGOUT AUTOMÁTICO APÓS 15 MINUTOS DE INATIVIDADE (persistindo o último estado) ---
  const lastStateRef = useRef<PersistedLastState>({});
  const inactivityLogoutInProgressRef = useRef(false);

  useEffect(() => {
    lastStateRef.current = { view, theme, installmentsInitialFilter, installmentsDateRange };
  }, [view, theme, installmentsInitialFilter, installmentsDateRange]);

  const saveLastState = useCallback(() => {
    const payload: PersistedLastState = { ...lastStateRef.current };
    localStorage.setItem(LAST_STATE_KEY, JSON.stringify(payload));
  }, []);

  useEffect(() => {
    if (!user) return;

    let logoutTimer: ReturnType<typeof setTimeout> | undefined;
    let checkInterval: ReturnType<typeof setInterval> | undefined;
    let lastSaveAt = 0;
    let lastActivityAt = readLastActivityAt() ?? Date.now();
    writeLastActivityAt(localStorage, lastActivityAt);
    inactivityLogoutInProgressRef.current = false;

    const handleInactivityLogout = async () => {
      if (inactivityLogoutInProgressRef.current) return;
      inactivityLogoutInProgressRef.current = true;
      console.warn('⏱️ 15 minutos sem atividade. Deslogando e salvando o último estado...');
      try {
        await logout();
        // Grava depois do logout para sobreviver à limpeza do localStorage
        saveLastState();
      } catch (error) {
        console.error('Falha ao encerrar sessão por inatividade', error);
        inactivityLogoutInProgressRef.current = false;
      }
    };

    const syncActivityFromStorage = () => {
      const persisted = readLastActivityAt();
      if (persisted != null && persisted > lastActivityAt) {
        lastActivityAt = persisted;
      }
    };

    const expireIfNeeded = () => {
      syncActivityFromStorage();
      if (isSessionExpiredByInactivity(lastActivityAt)) {
        void handleInactivityLogout();
        return true;
      }
      return false;
    };

    const scheduleLogout = () => {
      if (logoutTimer) clearTimeout(logoutTimer);
      logoutTimer = setTimeout(() => {
        if (!expireIfNeeded()) {
          scheduleLogout();
        }
      }, remainingInactivityMs(lastActivityAt));
    };

    const registerActivity = () => {
      lastActivityAt = Date.now();
      scheduleLogout();

      const now = Date.now();
      if (now - lastSaveAt >= ACTIVITY_SAVE_INTERVAL_MS) {
        lastSaveAt = now;
        writeLastActivityAt(localStorage, lastActivityAt);
        saveLastState();
      }
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible' && !expireIfNeeded()) {
        scheduleLogout();
      }
    };

    const onStorage = (event: StorageEvent) => {
      if (event.key === LAST_ACTIVITY_KEY) {
        syncActivityFromStorage();
        if (!expireIfNeeded()) {
          scheduleLogout();
        }
        return;
      }

      // Sessão encerrada em outra aba → só sincroniza o estado local (sem regravar UI)
      if (event.key === BACKEND_SESSION_STORAGE_KEY && event.newValue == null) {
        setSession(null);
        setUser(null);
        clearLastActivityAt();
      }
    };

    const events: (keyof WindowEventMap)[] = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
    events.forEach(eventName => window.addEventListener(eventName, registerActivity, { passive: true }));
    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('storage', onStorage);
    checkInterval = setInterval(() => {
      expireIfNeeded();
    }, INACTIVITY_CHECK_INTERVAL_MS);

    // Não reinicia o relógio no mount — agenda a partir da última atividade persistida.
    if (!expireIfNeeded()) {
      scheduleLogout();
    }

    return () => {
      if (logoutTimer) clearTimeout(logoutTimer);
      if (checkInterval) clearInterval(checkInterval);
      events.forEach(eventName => window.removeEventListener(eventName, registerActivity));
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('storage', onStorage);
    };
  }, [user?.id, logout, saveLastState]);

  // Restaura o último estado salvo assim que o usuário loga novamente
  useEffect(() => {
    if (!user) return;

    const stored = localStorage.getItem(LAST_STATE_KEY);
    if (!stored) return;

    try {
      const parsed = JSON.parse(stored) as PersistedLastState;
      if (parsed.view && KNOWN_VIEWS.includes(parsed.view)) setView(parsed.view);
      if (parsed.theme) setTheme(parsed.theme);
      if (parsed.installmentsInitialFilter !== undefined) setInstallmentsInitialFilter(parsed.installmentsInitialFilter);
      if (parsed.installmentsDateRange !== undefined) setInstallmentsDateRange(parsed.installmentsDateRange);
      console.log('♻️ Último estado restaurado após login:', parsed.view);
    } catch (error) {
      console.error('Não foi possível restaurar o último estado salvo', error);
    }

    // Remove só o estado de UI — a atividade fica em credgestor:last-activity
    localStorage.removeItem(LAST_STATE_KEY);
  }, [user?.id]);

  // ⭐ FUNÇÃO CORRIGIDA - Salva no backend FastAPI quando autenticado
  const addClient = useCallback(async (client: Client): Promise<Client | null> => {
    if (isBackendConfiguredValue && session?.accessToken) {
      try {
        const created = await createClient(session.accessToken, session.tenantId, client);
        setClients(prev => [...prev, created]);
        return created;
      } catch (error) {
        console.error('Erro ao criar cliente via backend API', error);
        // Fallback: salva localmente se falhar
        setClients(prev => [...prev, client]);
        return client;
      }
    }

    // Fallback: salva localmente se não estiver configurado
    console.log('📝 addClient: salvando cliente localmente (backend não configurado)');
    setClients(prev => [...prev, client]);
    return client;
  }, [session, isBackendConfiguredValue]);

  const updateClient = (client: Client) => {
    setClients(prev => prev.map(item => item.id === client.id ? client : item));
  };

  const deleteClient = useCallback(async (id: string): Promise<void> => {
    if (isBackendConfiguredValue && session?.accessToken) {
      try {
        await deleteClientApi(session.accessToken, session.tenantId, id);
      } catch (error) {
        console.error('Erro ao excluir cliente no backend', error);
        // Propagar o erro para que o componente possa tratá-lo
        throw error;
      }
    }

    // Só remove do estado local se a exclusão foi bem-sucedida
    setClients(prev => prev.filter(client => client.id !== id));
    setLoans(prev => prev.filter(loan => loan.clientId !== id));
    setInstallments(prev => prev.filter(inst => inst.clientId !== id));
  }, [session, isBackendConfiguredValue]);

  const addLoan = useCallback(async (loan: Loan, generatedInstallments: Installment[]) => {
    if (isBackendConfiguredValue && session?.accessToken) {
      try {
        const { createBackendLoan, createBackendInstallmentsBatch } = await import('@/services/backendApi');
        console.log('📝 Criando empréstimo no backend...', { loan, installmentsCount: generatedInstallments.length });
        
        // Calcular valor em aberto inicial (igual ao total quando criado)
        const loanWithOutstanding = { ...loan, outstandingAmount: loan.totalAmount };
        
        // Criar empréstimo primeiro
        // REGRA: tenantId é obrigatório
        if (!session.tenantId) {
          throw new Error('tenantId não está definido na sessão. Faça logout e login novamente.');
        }
        const created = await createBackendLoan(session.accessToken, session.tenantId, loanWithOutstanding);
        console.log('✅ Empréstimo criado:', created.id);
        
        // Atualizar os IDs das parcelas com o ID do empréstimo criado
        const installmentsWithLoanId = generatedInstallments.map(inst => ({
          ...inst,
          loanId: created.id,
        }));
        console.log('📦 Preparando parcelas para inserção:', installmentsWithLoanId.length, 'parcelas');
        
        // Criar parcelas em lote
        const createdInstallments = await createBackendInstallmentsBatch(
          session.accessToken,
          requireTenantId(session.tenantId, 'criar parcelas'),
          installmentsWithLoanId
        );
        console.log('✅ Parcelas criadas no backend:', createdInstallments.length, 'parcelas');
        
        setLoans(prev => [...prev, created]);
        setInstallments(prev => [...prev, ...createdInstallments]);
        return;
      } catch (error) {
        console.error('❌ Erro ao criar empréstimo via backend API', error);
        console.error('Detalhes do erro:', error instanceof Error ? error.message : error);
        // Fallback: salva localmente se falhar
        console.warn('⚠️ Salvando localmente como fallback');
      }
    }
    setLoans(prev => [...prev, loan]);
    setInstallments(prev => [...prev, ...generatedInstallments]);
  }, [session, isBackendConfiguredValue]);

  const updateLoan = useCallback(async (loan: Loan, generatedInstallments: Installment[]) => {
    // IMPORTANTE: Preservar parcelas que já foram pagas (status PAID) para manter o histórico
    // Apenas atualizar parcelas pendentes (status PENDING) com as novas datas
    const existingInstallments = installments.filter(inst => inst.loanId === loan.id);
    const paidInstallments = existingInstallments.filter(inst => inst.status === InstallmentStatus.PAID);
    
    if (isBackendConfiguredValue && session?.accessToken) {
      try {
        const { updateBackendLoan, createBackendInstallment, deleteBackendInstallment } = await import('@/services/backendApi');
        await updateBackendLoan(session.accessToken, requireTenantId(session.tenantId, 'atualizar empréstimo'), loan.id, loan);
        
        // Identificar parcelas pendentes antigas que serão substituídas
        const pendingInstallments = existingInstallments.filter(inst => inst.status !== InstallmentStatus.PAID);
        
        // Atualizar parcelas no backend:
        // 1. Deletar parcelas pendentes antigas que foram substituídas
        for (const oldInst of pendingInstallments) {
          try {
            await deleteBackendInstallment(session.accessToken, requireTenantId(session.tenantId, 'deletar parcelas'), oldInst.id);
          } catch (error) {
            console.error(`Erro ao deletar parcela antiga ${oldInst.id} no backend`, error);
          }
        }
        
        // 2. Criar novas parcelas geradas (substituem as pendentes antigas)
        // Guardar os registros retornados para usar os IDs UUID reais do backend.
        const persistedInstallments: Installment[] = [];
        for (const newInst of generatedInstallments) {
          try {
            const createdInstallment = await createBackendInstallment(
              session.accessToken,
              requireTenantId(session.tenantId, 'criar parcelas'),
              newInst
            );
            persistedInstallments.push(createdInstallment);
          } catch (error) {
            console.error(`Erro ao criar parcela ${newInst.id} no backend`, error);
          }
        }
        
        // 3. Parcelas pagas são preservadas automaticamente (não são deletadas nem atualizadas)
        
        setLoans(prev => prev.map(item => item.id === loan.id ? loan : item));
        setInstallments(prev => {
          // Remover parcelas pendentes antigas e adicionar as novas
          // Preservar parcelas pagas (status PAID)
          const withoutOldPending = prev.filter(inst => 
            inst.loanId !== loan.id || inst.status === InstallmentStatus.PAID
          );
          // Se houve sucesso na persistencia, usar IDs reais do backend em vez de IDs locais "inst_*".
          const nextInstallments = persistedInstallments.length > 0 ? persistedInstallments : generatedInstallments;
          return [...withoutOldPending, ...nextInstallments];
        });
        return;
      } catch (error) {
        console.error('Erro ao atualizar empréstimo via backend API', error);
        // Fallback: atualiza localmente se falhar
      }
    }
    setLoans(prev => prev.map(item => item.id === loan.id ? loan : item));
    setInstallments(prev => {
      // Remover parcelas pendentes antigas e adicionar as novas
      // Preservar parcelas pagas (status PAID) para manter histórico
      const withoutOldPending = prev.filter(inst => 
        inst.loanId !== loan.id || inst.status === InstallmentStatus.PAID
      );
      return [...withoutOldPending, ...generatedInstallments];
    });
  }, [session, isBackendConfiguredValue, installments]);

  const deleteLoan = useCallback(async (id: string) => {
    if (isBackendConfiguredValue && session?.accessToken) {
      try {
        const { deleteBackendLoan } = await import('@/services/backendApi');
        await deleteBackendLoan(session.accessToken, requireTenantId(session.tenantId, 'deletar empréstimo'), id);
      } catch (error) {
        console.error('Erro ao excluir empréstimo no backend', error);
      }
    }
    setLoans(prev => prev.filter(loan => loan.id !== id));
    setInstallments(prev => prev.filter(inst => inst.loanId !== id));
  }, [session, isBackendConfiguredValue]);

  const scheduleFuturePayment = useCallback(async (id: string, reason: string, amount: number, date?: string) => {
    const createdAt = new Date().toISOString();
    const installment = installments.find(inst => inst.id === id);
    if (!installment) return;

    const scheduledDate = date || getTodayDateString();
    const chargeAmount = Number((amount || 0).toFixed(2));
    const entry = {
      reason,
      amount: chargeAmount,
      date: scheduledDate,
      createdAt
    };

    const promisedPaymentHistory = [...(installment.promisedPaymentHistory ?? []), entry];

    // Multa/atraso entra SOMENTE nesta parcela (mês do atraso):
    // atualiza amount/interestAmount para o valor combinado (juros + multa),
    // assim na baixa valor_pago = valor da parcela e a conta fecha sem sobra.
    // Capital (principalAmount) e demais parcelas NÃO são alterados.
    const previousAmount = installment.amount || 0;
    const feePortion = Math.max(0, chargeAmount - previousAmount);
    const currentInterest = installment.interestAmount ?? 0;
    const updatedInterestAmount =
      feePortion > 0
        ? Number((currentInterest + feePortion).toFixed(2))
        : (chargeAmount > 0 && currentInterest === 0 ? chargeAmount : installment.interestAmount);

    const updatedInstallment = {
      ...installment,
      promisedPaymentReason: entry.reason,
      promisedPaymentAmount: entry.amount,
      promisedPaymentDate: entry.date,
      promisedPaymentHistory,
      principalAmount: installment.principalAmount,
      amount: chargeAmount > 0 ? Math.max(previousAmount, chargeAmount) : installment.amount,
      interestAmount: updatedInterestAmount
    };

    // Salvar no backend se estiver configurado
    if (isBackendConfiguredValue && session?.accessToken) {
      try {
        const { updateBackendInstallment } = await import('@/services/backendApi');
        await updateBackendInstallment(
          session.accessToken,
          requireTenantId(session.tenantId, 'operar com parcelas'),
          id,
          updatedInstallment
        );
      } catch (error) {
        console.error('Erro ao salvar agendamento no backend', error);
        // Continua com atualização local mesmo se falhar
      }
    }

    // Atualizar estado local
    setInstallments(prev => prev.map(inst => {
      if (inst.id !== id) return inst;
      return updatedInstallment;
    }));
  }, [installments, session, isBackendConfiguredValue]);

  const updateInstallment = useCallback(async (id: string, installment: Installment) => {
    // Salvar no backend se estiver configurado
    if (isBackendConfiguredValue && session?.accessToken) {
      try {
        const { updateBackendInstallment } = await import('@/services/backendApi');
        await updateBackendInstallment(
          session.accessToken,
          requireTenantId(session.tenantId, 'atualizar parcela'),
          id,
          installment
        );
      } catch (error) {
        console.error('Erro ao atualizar parcela no backend', error);
        // Continua com atualização local mesmo se falhar
      }
    }

    // Atualizar estado local
    setInstallments(prev => prev.map(inst => {
      if (inst.id !== id) return inst;
      return installment;
    }));
  }, [session, isBackendConfiguredValue, requireTenantId]);

  const startEditingLoan = (loanId: string) => {
    if (user?.role !== UserRole.ADMIN) return;
    setLoanToEditId(loanId);
    setView('loans');
  };

  const reopenLoan = useCallback(async (loanId: string) => {
    if (user?.role !== UserRole.ADMIN) {
      alert("Acesso restrito: apenas administradores podem reabrir empréstimos.");
      return;
    }

    const loan = loans.find(l => l.id === loanId);
    if (!loan) return;

    if (loan.status !== LoanStatus.PAID) {
      alert("Apenas empréstimos finalizados podem ser reabertos.");
      return;
    }

    if (!confirm('Deseja reabrir este empréstimo? O status será alterado de "Finalizado" para "Em Aberto".')) {
      return;
    }

    // Reabrir empréstimo: mudar status de PAID para ACTIVE
    const updatedLoan = {
      ...loan,
      status: LoanStatus.ACTIVE
    };

    // Atualizar no backend se configurado
    if (isBackendConfiguredValue && session?.accessToken) {
      try {
        const { updateBackendLoan } = await import('@/services/backendApi');
        await updateBackendLoan(
          session.accessToken,
          requireTenantId(session.tenantId, 'reabrir empréstimo'),
          loanId,
          updatedLoan
        );
      } catch (error) {
        console.error('Erro ao reabrir empréstimo no backend', error);
        alert('Erro ao reabrir empréstimo. Tente novamente.');
        return;
      }
    }

    // Atualizar estado local
    setLoans(prev => prev.map(l => l.id === loanId ? updatedLoan : l));
    
    alert('Empréstimo reaberto com sucesso!');
  }, [loans, user?.role, isBackendConfiguredValue, session]);

  // Função auxiliar para obter o UUID correto da parcela no backend
  const getInstallmentBackendId = useCallback(async (
    installment: Installment,
    backendInstallments?: any[]
  ): Promise<string | null> => {
    if (!isBackendConfiguredValue || !session?.accessToken) {
      return installment.id;
    }

    // Verificar se o ID é um UUID válido
    const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(installment.id);
    
    if (isValidUUID) {
      return installment.id;
    }

    // Se não for UUID válido, buscar no backend
    try {
      let installments = backendInstallments;
      if (!installments) {
        const { fetchBackendInstallments } = await import('@/services/backendApi');
        installments = await fetchBackendInstallments(
          session.accessToken,
          requireTenantId(session.tenantId, 'buscar parcelas')
        );
      }
      
      const backendInst = installments.find(
        (bi: any) => bi.loanId === installment.loanId && bi.number === installment.number
      );
      
      return backendInst?.id || null;
    } catch (error) {
      console.error('Erro ao buscar parcela no backend', error);
      return null;
    }
  }, [isBackendConfiguredValue, session]);

  // Persiste um conjunto de parcelas no backend, resolvendo IDs locais (não-UUID)
  // para os UUIDs reais. Uma falha em uma parcela não impede a gravação das demais.
  // Se alguma gravação falhar, o operador é avisado (senão a baixa "some" no dia
  // seguinte, quando os dados são recarregados do backend).
  const persistInstallmentsToBackend = useCallback(async (
    installmentsToSave: Installment[]
  ): Promise<number[]> => {
    if (!isBackendConfiguredValue || !session?.accessToken || installmentsToSave.length === 0) {
      return [];
    }

    const failedNumbers: number[] = [];

    try {
      const tenantId = requireTenantId(session.tenantId, 'operar com parcelas');
      const { updateBackendInstallment, fetchBackendInstallments } = await import('@/services/backendApi');

      // Buscar as parcelas do backend uma única vez, apenas se houver IDs locais
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      let backendInstallments: any[] | undefined;
      if (installmentsToSave.some(inst => !uuidRegex.test(inst.id))) {
        try {
          backendInstallments = await fetchBackendInstallments(session.accessToken, tenantId);
        } catch (error) {
          console.error('Erro ao buscar parcelas no backend para sincronização', error);
        }
      }

      for (const inst of installmentsToSave) {
        try {
          const backendId = await getInstallmentBackendId(inst, backendInstallments);
          if (!backendId) {
            console.warn(`Parcela não encontrada no backend: loanId=${inst.loanId}, number=${inst.number}`);
            failedNumbers.push(inst.number);
            continue;
          }
          await updateBackendInstallment(session.accessToken, tenantId, backendId, inst);
        } catch (error) {
          console.error(`Erro ao salvar parcela ${inst.number} no backend`, error);
          failedNumbers.push(inst.number);
        }
      }
    } catch (error) {
      console.error('Erro ao salvar parcelas no backend', error);
      failedNumbers.push(...installmentsToSave.map(inst => inst.number));
    }

    if (failedNumbers.length > 0) {
      const plural = failedNumbers.length > 1;
      alert(
        `Atenção: não foi possível salvar ${plural ? 'as parcelas' : 'a parcela'} ` +
        `${failedNumbers.join(', ')} no servidor. A baixa pode ser desfeita quando os dados ` +
        `forem recarregados. Verifique sua conexão e dê a baixa novamente.`
      );
    }

    return failedNumbers;
  }, [isBackendConfiguredValue, session, getInstallmentBackendId]);

  const payInstallment = useCallback(async (id: string, amount?: number, paymentDate?: string) => {
    if (user?.role === UserRole.COLLECTION) {
      alert("Acesso restrito: Cobradores não podem baixar pagamentos, apenas visualizar.");
      return;
    }

    const installment = installments.find(inst => inst.id === id);
    if (!installment) return;

    const paymentValue = installment.status === InstallmentStatus.PAID ? 0 : (amount ?? installment.amount);
    let loan = loans.find(l => l.id === installment.loanId);
    if (!loan) return;
    
    // Usar a data fornecida ou a data de hoje como padrão
    const actualPaymentDate = paymentDate || getTodayDateString();

    // Empréstimo marcado PAID com parcelas ainda abertas (tipo A):
    // - Se há SALDO real → reabrir para ACTIVE e seguir o recebimento normal
    //   (evita o bloqueio "valor em aberto R$ 0,00", caso João Guedes).
    // - Se só o status da parcela está errado (já quitada pelo valor) → regularizar PAID.
    if (loan.status === LoanStatus.PAID) {
      const pendingInstallments = installments.filter(
        inst => inst.loanId === loan!.id && inst.status !== InstallmentStatus.PAID
      );
      if (pendingInstallments.length === 0) return;

      const withRealBalance = pendingInstallments.filter(
        inst => (inst.amountPaid || 0) < (inst.amount || 0)
      );

      if (withRealBalance.length === 0) {
        const regularizedInstallments: Installment[] = pendingInstallments.map(inst => ({
          ...inst,
          status: InstallmentStatus.PAID,
          paidDate: inst.paidDate || actualPaymentDate
        }));

        await persistInstallmentsToBackend(regularizedInstallments);

        setInstallments(prev => {
          const regularizedMap = new Map(regularizedInstallments.map(inst => [inst.id, inst]));
          return prev.map(inst => regularizedMap.get(inst.id) || inst);
        });
        return;
      }

      loan = { ...loan, status: LoanStatus.ACTIVE };
      setLoans(prev => prev.map(l => (l.id === loan!.id ? loan! : l)));
      if (isBackendConfiguredValue && session?.accessToken) {
        try {
          const { updateBackendLoan } = await import('@/services/backendApi');
          await updateBackendLoan(
            session.accessToken,
            session.tenantId || '',
            loan.id,
            loan
          );
        } catch (error) {
          console.error('Erro ao reabrir empréstimo no backend', error);
        }
      }
    }

    // Função auxiliar para calcular valor em aberto do empréstimo
    const calculateOutstandingAmount = (loan: Loan, relatedInstallments: Installment[]): number => {
      const hasPendingBalance = relatedInstallments.some(
        inst => inst.status !== InstallmentStatus.PAID && (inst.amountPaid || 0) < (inst.amount || 0)
      );
      // Só zera se PAID E sem saldo pendente real
      if (loan.status === LoanStatus.PAID && !hasPendingBalance) {
        return 0;
      }
      
      if (relatedInstallments.length === 0) {
        return loan.totalAmount;
      }
      
      // Para empréstimos "somente juros", calcular capital + juros totais
      if (loan.model === LoanModel.INTEREST_ONLY) {
        // IMPORTANTE: O capital SEMPRE é o valor original do empréstimo (loan.amount)
        // Verificar se o capital já foi totalmente pago através do histórico de pagamentos
        const totalCapitalPaid = relatedInstallments.reduce((sum, inst) => {
          if (inst.paymentHistory && inst.paymentHistory.length > 0) {
            return sum + inst.paymentHistory.reduce((pSum, p) => pSum + (p.principalPaid || 0), 0);
          }
          return sum;
        }, 0);
        
        // Capital pendente = Capital original - Capital pago
        const pendingCapital = Math.max(0, loan.amount - totalCapitalPaid);
        
        // IMPORTANTE: VALOR EM ABERTO = Capital pendente + Juros sobre capital pendente
        // Juros são calculados sobre o capital pendente (não sobre o capital original)
        // Quando cliente paga apenas juros, o capital não muda, então VALOR EM ABERTO permanece igual
        // Quando cliente paga juros + capital, o capital diminui e os juros são recalculados sobre o novo capital
        // Exemplo: R$ 1.000 com 10% = R$ 1.100 inicial
        //          Cliente paga R$ 200 (R$ 100 juros + R$ 100 capital)
        //          Capital restante: R$ 900, Juros: 10% de R$ 900 = R$ 90
        //          VALOR EM ABERTO = R$ 900 + R$ 90 = R$ 990
        // Arredondar juros para cima para garantir que os centavos sejam sempre arredondados para cima
        const monthlyInterest = Math.ceil(pendingCapital * (loan.interestRate / 100));
        
        // Usar o número de parcelas do empréstimo ou o número de parcelas existentes
        const totalInstallments = loan.installmentsCount || relatedInstallments.length || 1;
        const totalInterest = monthlyInterest * totalInstallments;
        
        const totalOutstanding = pendingCapital + totalInterest;
        return Number(totalOutstanding.toFixed(2));
      }
      
      // Para outros modelos, calcular valor total menos o que já foi pago
      const totalPaid = relatedInstallments.reduce((sum, inst) => sum + (inst.amountPaid || 0), 0);
      const outstanding = Math.max(0, loan.totalAmount - totalPaid);
      return Number(outstanding.toFixed(2));
    };

    // Verificar se o pagamento é igual ou maior que o valor total em aberto
    // Se for, marcar todas as parcelas como pagas
    const allLoanInstallments = installments.filter(inst => inst.loanId === loan.id);
    const outstandingAmount = calculateOutstandingAmount(loan, allLoanInstallments);
    
    if (paymentValue >= outstandingAmount && outstandingAmount > 0) {
      // Pagamento total do empréstimo - marcar todas as parcelas como pagas
      const updatedInstallments: Installment[] = [];
      let remainingPayment = paymentValue;
      
      for (const inst of allLoanInstallments) {
        if (inst.status === InstallmentStatus.PAID) {
          updatedInstallments.push(inst);
          continue;
        }

        // Calcular quanto falta pagar nesta parcela
        const pendingAmount = inst.amount - (inst.amountPaid || 0);
        
        if (pendingAmount <= 0) {
          // Parcela já está paga
          updatedInstallments.push(inst);
          continue;
        }

        let pendingInterest = inst.interestAmount ?? 0;
        let pendingPrincipal = inst.principalAmount ?? 0;
        
        // Se não houver valores definidos, calcular baseado no modelo
        if (loan.model === LoanModel.INTEREST_ONLY) {
          // IMPORTANTE: Calcular capital pendente primeiro
          // O capital é compartilhado entre todas as parcelas no modelo INTEREST_ONLY
          const totalCapitalPaid = allLoanInstallments.reduce((sum, allInst) => {
            if (allInst.paymentHistory && allInst.paymentHistory.length > 0) {
              return sum + allInst.paymentHistory.reduce((pSum, p) => pSum + (p.principalPaid || 0), 0);
            }
            return sum;
          }, 0);
          const pendingCapital = Math.max(0, loan.amount - totalCapitalPaid);
          
          // IMPORTANTE: Juros devem ser calculados sobre o capital pendente (não sobre o capital original)
          // Quando o capital é pago, os juros diminuem proporcionalmente
          // Exemplo: R$ 1.000 com 10% = R$ 100 inicial
          //          Após pagar R$ 100 de capital: Capital restante R$ 900, Juros = 10% de R$ 900 = R$ 90
          pendingInterest = Number((pendingCapital * (loan.interestRate / 100)).toFixed(2));
          pendingPrincipal = pendingCapital;
        } else {
          // Para outros modelos, se não tiver valores separados, usar o amount pendente
          if (pendingInterest === 0 && pendingPrincipal === 0) {
            pendingPrincipal = pendingAmount;
          }
        }

        const totalPending = pendingInterest + pendingPrincipal;
        
        if (totalPending > 0 && remainingPayment > 0) {
          // Abater o que falta nesta parcela
          const interestPaid = Math.min(remainingPayment, pendingInterest);
          remainingPayment -= interestPaid;
          const principalPaid = Math.min(remainingPayment, pendingPrincipal);
          remainingPayment -= principalPaid;
          
          const totalPaidForThis = interestPaid + principalPaid;
          
          // Registrar pagamento no histórico
          const paymentHistoryEntry = {
            amount: totalPaidForThis,
            interestPaid: interestPaid,
            principalPaid: principalPaid,
            paymentDate: actualPaymentDate,
            createdAt: new Date().toISOString()
          };
          const existingHistory = inst.paymentHistory || [];
          const updatedPaymentHistory = [...existingHistory, paymentHistoryEntry];

          // Calcular amountPaid: soma do que já foi pago + o que está sendo pago agora
          const previousAmountPaid = inst.amountPaid || 0;
          const newAmountPaid = previousAmountPaid + totalPaidForThis;
          
          // IMPORTANTE: Para empréstimos INTEREST_ONLY:
          // Uma parcela está PAID se: juros foram pagos E capital foi totalmente pago (em qualquer parcela)
          // Calcular capital total pago até agora (incluindo este pagamento)
          const currentCapitalPaid = updatedInstallments.reduce((sum, updatedInst) => {
            if (updatedInst.paymentHistory && updatedInst.paymentHistory.length > 0) {
              return sum + updatedInst.paymentHistory.reduce((pSum, p) => pSum + (p.principalPaid || 0), 0);
            }
            return sum;
          }, 0);
          const totalCapitalPaidAfterThis = currentCapitalPaid + principalPaid;
          
          // Verificar se juros foram pagos nesta parcela
          const isInterestPaid = interestPaid >= pendingInterest;
          
          // Verificar se capital foi totalmente pago (em qualquer parcela)
          const isCapitalFullyPaid = totalCapitalPaidAfterThis >= loan.amount;
          
          // Parcela está PAID se: juros foram pagos E capital foi totalmente pago
          const isPaid = isInterestPaid && isCapitalFullyPaid;

          const updatedInst: Installment = {
            ...inst,
            amount: inst.amount, // Preservar valor original
            interestAmount: isPaid ? 0 : (pendingInterest - interestPaid), // Se não pago, manter juros pendentes
            principalAmount: loan.amount, // SEMPRE manter capital original (não muda)
            amountPaid: newAmountPaid,
            paymentHistory: updatedPaymentHistory,
            status: isPaid ? InstallmentStatus.PAID : InstallmentStatus.PARTIAL,
            paidDate: isPaid ? actualPaymentDate : inst.paidDate
          };
          
          updatedInstallments.push(updatedInst);
        } else {
          updatedInstallments.push(inst);
        }
      }

      // IMPORTANTE: Para empréstimos INTEREST_ONLY, após processar todas as parcelas,
      // verificar se o capital foi totalmente pago e marcar TODAS as parcelas como PAID
      let finalInstallments = updatedInstallments;
      if (loan.model === LoanModel.INTEREST_ONLY) {
        // Calcular capital total pago através do histórico de pagamentos de todas as parcelas
        const totalCapitalPaid = updatedInstallments.reduce((sum, inst) => {
          if (inst.paymentHistory && inst.paymentHistory.length > 0) {
            return sum + inst.paymentHistory.reduce((pSum, p) => pSum + (p.principalPaid || 0), 0);
          }
          return sum;
        }, 0);
        
        // IMPORTANTE: Após processar todas as parcelas, verificar se capital foi totalmente pago
        // Se sim, marcar todas as parcelas com juros pagos como PAID
        if (totalCapitalPaid >= loan.amount) {
          // Quando o capital está totalmente pago, não há mais juros a calcular
          const monthlyInterest = 0;
          
          // Marcar todas as parcelas (atualizadas e não atualizadas) que têm juros pagos como PAID
          finalInstallments = allLoanInstallments.map(inst => {
            // Verificar se esta parcela foi atualizada
            const updated = updatedInstallments.find(u => u.id === inst.id);
            const instToCheck = updated || inst;
            
            // Verificar se os juros desta parcela foram pagos
            const interestPaid = instToCheck.paymentHistory?.reduce((sum, p) => sum + (p.interestPaid || 0), 0) || 0;
            const isInterestPaid = interestPaid >= monthlyInterest;
            
            // Se juros foram pagos E capital foi totalmente pago, parcela está PAID
            if (isInterestPaid) {
              return {
                ...instToCheck,
                status: InstallmentStatus.PAID,
                interestAmount: 0,
                principalAmount: loan.amount, // Manter capital original
                paidDate: instToCheck.paidDate || actualPaymentDate
              };
            }
            
            // Retornar a versão atualizada se existir, senão retornar a original
            return updated || inst;
          });
        }
      }

      // Atualizar parcelas no backend se configurado
      // IMPORTANTE: persistir TODAS as parcelas alteradas (não apenas as PAID),
      // com resolução de IDs locais e sem abortar as demais em caso de falha.
      if (isBackendConfiguredValue && session?.accessToken) {
        const originalById = new Map(allLoanInstallments.map(inst => [inst.id, inst]));
        const changedInstallments = finalInstallments.filter(inst => originalById.get(inst.id) !== inst);
        await persistInstallmentsToBackend(changedInstallments);
      }

      // Atualizar todas as parcelas
      setInstallments(prev => {
        const updatedMap = new Map(finalInstallments.map(inst => [inst.id, inst]));
        return prev.map(inst => updatedMap.get(inst.id) || inst);
      });

      // IMPORTANTE: Atualizar status do empréstimo após pagamento total
      // Para empréstimos INTEREST_ONLY, verificar se capital + todos os juros foram pagos
      // Usar todas as parcelas do empréstimo (atualizadas e não atualizadas) para verificação correta
      setLoans(prevLoans => prevLoans.map(l => {
        if (l.id === loan.id) {
          // IMPORTANTE: Combinar parcelas atualizadas (finalInstallments) com parcelas não atualizadas
          // Isso garante que verificamos o estado real de todas as parcelas após a atualização
          const allLoanInstallmentsAfterUpdate = allLoanInstallments.map(inst => {
            const updated = finalInstallments.find(f => f.id === inst.id);
            return updated || inst;
          });
          
          // Verificar se todas as parcelas estão pagas
          const allPaid = allLoanInstallmentsAfterUpdate.every(inst => inst.status === InstallmentStatus.PAID);
          
          // Para empréstimos INTEREST_ONLY, verificar se capital foi totalmente pago
          if (loan.model === LoanModel.INTEREST_ONLY) {
            // Calcular capital total pago através do histórico de pagamentos de TODAS as parcelas
            const totalCapitalPaid = allLoanInstallmentsAfterUpdate.reduce((sum, inst) => {
              if (inst.paymentHistory && inst.paymentHistory.length > 0) {
                return sum + inst.paymentHistory.reduce((pSum, p) => pSum + (p.principalPaid || 0), 0);
              }
              return sum;
            }, 0);
            
            // Empréstimo está pago se: todas as parcelas estão PAID E capital foi totalmente pago
            const isCapitalPaid = totalCapitalPaid >= loan.amount;
            const isLoanPaid = allPaid && isCapitalPaid;
            
            // Calcular valor em aberto usando a função auxiliar
            const outstandingAmount = isLoanPaid ? 0 : calculateOutstandingAmount(loan, allLoanInstallmentsAfterUpdate);
            
            const updatedLoan = { 
              ...l, 
              status: isLoanPaid ? LoanStatus.PAID : LoanStatus.ACTIVE, 
              outstandingAmount 
            };
            
            // Atualizar no backend se configurado
            if (isBackendConfiguredValue && session?.accessToken) {
              (async () => {
                try {
                  const { updateBackendLoan } = await import('@/services/backendApi');
                  await updateBackendLoan(session.accessToken, session.tenantId || '', l.id, updatedLoan);
                } catch (error) {
                  console.error('Erro ao atualizar empréstimo no backend', error);
                }
              })();
            }
            
            return updatedLoan;
          }
          
          // Para outros modelos, se todas as parcelas estão pagas, empréstimo está pago
          // Calcular valor em aberto usando a função auxiliar
          const outstandingAmount = allPaid ? 0 : calculateOutstandingAmount(loan, allLoanInstallmentsAfterUpdate);
          
          const updatedLoan = { 
            ...l, 
            status: allPaid ? LoanStatus.PAID : LoanStatus.ACTIVE, 
            outstandingAmount 
          };
          
          // Atualizar no backend se configurado
          if (isBackendConfiguredValue && session?.accessToken) {
            (async () => {
              try {
                const { updateBackendLoan } = await import('@/services/backendApi');
                await updateBackendLoan(session.accessToken, session.tenantId || '', l.id, updatedLoan);
              } catch (error) {
                console.error('Erro ao atualizar empréstimo no backend', error);
              }
            })();
          }
          
          return updatedLoan;
        }
        return l;
      }));

      return; // Sair da função após processar pagamento total
    }

    // Função auxiliar para adicionar meses a uma data (YYYY-MM-DD)
    const addMonths = (dateString: string, months: number) => {
      const [year, month, day] = String(dateString).split('T')[0].split('-').map(Number);
      const baseMonthIndex = month - 1;
      const targetMonthIndexTotal = baseMonthIndex + months;
      const targetYear = year + Math.floor(targetMonthIndexTotal / 12);
      const normalizedTargetMonthIndex = ((targetMonthIndexTotal % 12) + 12) % 12;
      const lastDayOfTargetMonth = new Date(targetYear, normalizedTargetMonthIndex + 1, 0).getDate();
      const targetDay = Math.min(day, lastDayOfTargetMonth);
      const newDate = new Date(targetYear, normalizedTargetMonthIndex, targetDay);
      const yearStr = newDate.getFullYear();
      const monthStr = String(newDate.getMonth() + 1).padStart(2, '0');
      const dayStr = String(newDate.getDate()).padStart(2, '0');
      return `${yearStr}-${monthStr}-${dayStr}`;
    };

    if (loan.model === LoanModel.INTEREST_ONLY) {
      // IMPORTANTE: Calcular capital pendente para determinar os juros da parcela
      // Os juros devem ser calculados sobre o capital pendente atual (não sobre o capital original)
      const allLoanInstallmentsForInterest = installments.filter(inst => inst.loanId === loan.id);
      const totalCapitalPaid = allLoanInstallmentsForInterest.reduce((sum, inst) => {
        if (inst.paymentHistory && inst.paymentHistory.length > 0) {
          return sum + inst.paymentHistory.reduce((pSum, p) => pSum + (p.principalPaid || 0), 0);
        }
        return sum;
      }, 0);
      const pendingCapital = Math.max(0, loan.amount - totalCapitalPaid);
      
      // IMPORTANTE: Juros devem ser calculados sobre o capital pendente atual
      // Quando o capital é pago, os juros diminuem proporcionalmente
      // Exemplo: R$ 1.000 com 10% = R$ 100 inicial
      //          Após pagar R$ 100 de capital: Capital restante R$ 900, Juros = 10% de R$ 900 = R$ 90
      // Arredondar juros para cima para garantir que os centavos sejam sempre arredondados para cima
      const correctInterestAmount = Math.ceil(pendingCapital * (loan.interestRate / 100));
      
      // IMPORTANTE: Usar o valor correto dos juros baseado no capital pendente
      // Se o interestAmount da parcela estiver incorreto, usar o valor calculado
      let interestDue = installment.interestAmount ?? 0;
      const tolerance = 0.01; // Tolerância de 1 centavo para comparação
      if (interestDue === 0 || Math.abs(interestDue - correctInterestAmount) > tolerance) {
        // Usar o valor correto dos juros baseado no capital pendente
        interestDue = correctInterestAmount;
      }

      // Se existe agendamento com multa para esta parcela, tratar a multa como parte dos juros
      // até o limite do valor prometido, evitando que a multa amortize o capital indevidamente.
      const latestPromisedAmount =
        installment.promisedPaymentHistory?.[installment.promisedPaymentHistory.length - 1]?.amount ??
        installment.promisedPaymentAmount ??
        0;
      if (latestPromisedAmount > 0 && latestPromisedAmount > interestDue) {
        const cappedPayment = Math.min(paymentValue, latestPromisedAmount);
        const feePortion = Math.max(0, cappedPayment - interestDue);
        if (feePortion > 0) {
          interestDue = Number((interestDue + feePortion).toFixed(2));
        }
      }
      
      // IMPORTANTE: Para empréstimos INTEREST_ONLY, o capital SEMPRE deve ser o valor original do empréstimo
      // O capital do empréstimo (loan.amount) NUNCA deve ser alterado, mesmo com amortização
      // Exemplo: Empréstimo de R$ 1.000 com 10% = Capital sempre R$ 1.000, Juros sempre R$ 100
      // A amortização é registrada no histórico, mas o capital da parcela permanece como o original
      const originalPrincipal = loan.amount; // SEMPRE usar o capital original do empréstimo
      const principalDue = originalPrincipal; // Capital disponível para amortização
      const totalDue = Math.max(0, interestDue + principalDue);

      // IMPORTANTE: Para empréstimos INTEREST_ONLY:
      // 1. O mínimo a receber é sempre o valor dos juros (baseado no valor original do empréstimo)
      // 2. Se o pagamento for maior que o mínimo, o excedente pode amortizar o capital
      // 3. A taxa de juros permanece constante (sempre baseada no valor original)
      // 4. O capital do empréstimo SEMPRE permanece como o valor original (não é alterado)
      let remainingPayment = paymentValue;

      // 1. Abater PRIMEIRO os juros da parcela atual (valor mínimo)
      const interestPayment = Math.min(remainingPayment, interestDue);
      remainingPayment -= interestPayment;
      const updatedInterest = Number((interestDue - interestPayment).toFixed(2));

      // 2. Se sobrar pagamento após abater os juros, aplicar ao capital (amortização)
      // IMPORTANTE: A amortização é registrada no histórico, mas o capital da parcela permanece como o original
      const principalPayment = Math.min(remainingPayment, principalDue);
      remainingPayment -= principalPayment;
      
      // IMPORTANTE: O capital do empréstimo SEMPRE permanece como o valor original
      // Não alterar o principalAmount da parcela, ele sempre deve ser o capital original do empréstimo
      // A amortização é registrada apenas no histórico de pagamentos
      const updatedPrincipal = originalPrincipal; // SEMPRE manter o capital original do empréstimo

      // Valor total aplicado nesta parcela (juros + principal)
      const appliedToThisInstallment = interestPayment + principalPayment;

      // Semântica INTEREST_ONLY:
      // - A parcela representa a cobrança do mês (juros + eventual multa).
      // - PAID = cobrança do mês quitada (juros integralmente recebidos).
      // - PARTIAL = pagou menos que os juros do mês (ainda há saldo nesta parcela).
      // - A dívida de capital fica no empréstimo (ACTIVE + outstanding_amount)
      //   e é cobrada via criação da próxima parcela mensal.
      const monthlyChargeFullyPaid = updatedInterest <= 0;
      const newStatus = monthlyChargeFullyPaid
        ? InstallmentStatus.PAID
        : (appliedToThisInstallment > 0)
          ? InstallmentStatus.PARTIAL
          : installment.status;

      // Registrar pagamento no histórico
      const paymentHistoryEntry = {
        amount: appliedToThisInstallment,
        interestPaid: interestPayment,
        principalPaid: principalPayment,
        paymentDate: actualPaymentDate,
        createdAt: new Date().toISOString()
      };
      const existingHistory = installment.paymentHistory || [];
      const updatedPaymentHistory = [...existingHistory, paymentHistoryEntry];

      const finalStatus = newStatus === InstallmentStatus.PAID
        ? InstallmentStatus.PAID
        : (newStatus === InstallmentStatus.PARTIAL && installment.status === InstallmentStatus.LATE)
          ? InstallmentStatus.PARTIAL
          : newStatus;

      // Usar o valor correto dos juros baseado no capital pendente
      const finalInterestAmount = correctInterestAmount;

      // Capital pendente APÓS este pagamento (inclui amortização feita agora)
      const capitalPaidAfterThis = totalCapitalPaid + principalPayment;
      const pendingCapitalAfterPayment = Math.max(0, loan.amount - capitalPaidAfterThis);

      const updatedInstallment = {
        ...installment,
        amount: installment.amount, // Preservar o valor original da parcela (juros do mês)
        interestAmount: finalInterestAmount,
        principalAmount: updatedPrincipal, // Capital de referência do contrato
        amountPaid: Number(((installment.amountPaid || 0) + appliedToThisInstallment).toFixed(2)),
        paymentHistory: updatedPaymentHistory,
        status: finalStatus,
        paidDate: finalStatus === InstallmentStatus.PAID ? actualPaymentDate : installment.paidDate
      };

      const updatedInstallments: Installment[] = [updatedInstallment];

      // Atualizar parcelas no backend se configurado
      if (isBackendConfiguredValue && session?.accessToken) {
        await persistInstallmentsToBackend(updatedInstallments);
      }

      const allUpdatedInstallments = [...updatedInstallments];

      // Encontrar o próximo número de parcela
      const allLoanInstallmentsForNew = installments.filter(inst => inst.loanId === loan.id);
      const maxNumber = Math.max(...allLoanInstallmentsForNew.map(inst => inst.number), 0);
      const nextNumber = maxNumber + 1;

      // Verificar se já existe uma próxima parcela com o número calculado
      const nextInstallmentExists = allLoanInstallmentsForNew.some(
        inst => inst.number === nextNumber
      );

      // Já existe outra parcela futura/pendente (não criar duplicata)
      const hasFuturePendingInstallment = allLoanInstallmentsForNew.some(
        inst =>
          inst.id !== id &&
          inst.status !== InstallmentStatus.PAID &&
          inst.number > installment.number
      );

      // Criar próxima parcela quando:
      // 1. A cobrança do mês atual foi quitada (PAID)
      // 2. Ainda há capital pendente no empréstimo
      // 3. Ainda não existe a próxima parcela
      const shouldCreateNewInstallment =
        monthlyChargeFullyPaid &&
        pendingCapitalAfterPayment > 0 &&
        !nextInstallmentExists &&
        !hasFuturePendingInstallment;

      if (shouldCreateNewInstallment) {
        const rateDecimal = loan.interestRate / 100;
        // Juros da nova parcela sobre o capital pendente APÓS este pagamento
        const nextInterestAmount = Number((pendingCapitalAfterPayment * rateDecimal).toFixed(2));

        // Encontrar a data de vencimento mais recente entre todas as parcelas do empréstimo
        const allDates = [
          ...allLoanInstallmentsForNew.map(inst => inst.dueDate),
          updatedInstallment.dueDate
        ];
        const mostRecentDueDate = allDates.sort((a, b) =>
          (() => {
            const [yA, mA, dA] = String(a).split('T')[0].split('-').map(Number);
            const [yB, mB, dB] = String(b).split('T')[0].split('-').map(Number);
            return new Date(yB, mB - 1, dB).getTime() - new Date(yA, mA - 1, dA).getTime();
          })()
        )[0];

        const nextDueDate = addMonths(mostRecentDueDate, 1);

        const newInstallment: Installment = {
          id: `inst_${loan.id}_${nextNumber}_${Date.now()}`,
          loanId: loan.id,
          clientId: installment.clientId,
          number: nextNumber,
          dueDate: nextDueDate,
          amount: nextInterestAmount,
          interestAmount: nextInterestAmount,
          principalAmount: loan.amount,
          amountPaid: 0,
          status: InstallmentStatus.PENDING
        };

        // Criar nova parcela no backend se configurado
        if (isBackendConfiguredValue && session?.accessToken) {
          try {
            const { createBackendInstallment } = await import('@/services/backendApi');
            const created = await createBackendInstallment(
              session.accessToken,
              requireTenantId(session.tenantId, 'operar com parcelas'),
              newInstallment
            );
            newInstallment.id = created.id;
          } catch (error) {
            console.error('Erro ao criar nova parcela no backend', error);
          }
        }

        allUpdatedInstallments.push(newInstallment);
      }

      // Atualizar referência para usar a lista completa
      updatedInstallments.length = 0;
      updatedInstallments.push(...allUpdatedInstallments);

      // Atualizar todas as parcelas modificadas e adicionar novas parcelas
      setInstallments(prev => {
        const updatedMap = new Map(updatedInstallments.map(inst => [inst.id, inst]));
        const existingIds = new Set(prev.map(inst => inst.id));

        const updated = prev.map(inst => updatedMap.get(inst.id) || inst);
        const newInstallments = updatedInstallments.filter(inst => !existingIds.has(inst.id));

        return [...updated, ...newInstallments];
      });

      // Atualizar empréstimo: PAID só quando o capital for totalmente quitado.
      // Enquanto houver capital, permanece ACTIVE com outstanding recalculado.
      const relatedAfterUpdate = allLoanInstallmentsForNew
        .map(inst => (inst.id === id ? updatedInstallment : inst))
        .concat(allUpdatedInstallments.filter(inst => !allLoanInstallmentsForNew.some(e => e.id === inst.id)));

      const isCapitalFullyPaid = pendingCapitalAfterPayment <= 0;
      const hasPendingCharges = relatedAfterUpdate.some(inst => inst.status !== InstallmentStatus.PAID);
      const isLoanPaid = isCapitalFullyPaid && !hasPendingCharges;
      const outstandingAmount = isLoanPaid
        ? 0
        : calculateOutstandingAmount({ ...loan, status: LoanStatus.ACTIVE }, relatedAfterUpdate);

      const updatedLoan = {
        ...loan,
        status: isLoanPaid ? LoanStatus.PAID : LoanStatus.ACTIVE,
        outstandingAmount
      };

      setLoans(prev => prev.map(l => (l.id === loan.id ? updatedLoan : l)));

      if (isBackendConfiguredValue && session?.accessToken) {
        try {
          const { updateBackendLoan } = await import('@/services/backendApi');
          await updateBackendLoan(
            session.accessToken,
            session.tenantId || '',
            loan.id,
            updatedLoan
          );
        } catch (error) {
          console.error('Erro ao atualizar empréstimo no backend', error);
        }
      }
    } else {
      // Lógica para outros modelos de empréstimo (PRICE, etc.)
      const paidAmount = Math.min(installment.amount, (installment.amountPaid || 0) + paymentValue);
      const isPaid = paidAmount >= installment.amount;

      // Calcular valores pendentes de juros e capital
      const interestAmount = installment.interestAmount ?? 0;
      const principalAmount = installment.principalAmount ?? (installment.amount - interestAmount);
      
      // Calcular quanto já foi pago de juros e capital
      const interestPaidSoFar = installment.paymentHistory?.reduce((sum, p) => sum + (p.interestPaid || 0), 0) || 0;
      const principalPaidSoFar = installment.paymentHistory?.reduce((sum, p) => sum + (p.principalPaid || 0), 0) || 0;
      
      // Calcular valores pendentes
      let pendingInterest = Math.max(0, interestAmount - interestPaidSoFar);
      const pendingPrincipal = Math.max(0, principalAmount - principalPaidSoFar);
      let totalPending = pendingInterest + pendingPrincipal;

      // Se existe agendamento com multa para esta parcela, tratar a multa como parte dos juros
      // até o limite do valor prometido, evitando que a multa amortize capital indevidamente.
      const latestPromisedAmount =
        installment.promisedPaymentHistory?.[installment.promisedPaymentHistory.length - 1]?.amount ??
        installment.promisedPaymentAmount ??
        0;
      if (latestPromisedAmount > 0 && latestPromisedAmount > totalPending) {
        const cappedPayment = Math.min(paymentValue, latestPromisedAmount);
        const feePortion = Math.max(0, cappedPayment - totalPending);
        if (feePortion > 0) {
          pendingInterest = Number((pendingInterest + feePortion).toFixed(2));
          totalPending = pendingInterest + pendingPrincipal;
        }
      }
      
      // Distribuir o pagamento proporcionalmente entre juros e capital
      let interestPaid = 0;
      let principalPaid = 0;
      
      if (totalPending > 0) {
        // Primeiro, abater os juros pendentes
        interestPaid = Math.min(paymentValue, pendingInterest);
        const remainingPayment = paymentValue - interestPaid;
        
        // Depois, abater o capital pendente
        principalPaid = Math.min(remainingPayment, pendingPrincipal);
      } else {
        // Se não há valores pendentes definidos, tratar como pagamento de capital
        principalPaid = paymentValue;
      }

      // Registrar pagamento no histórico
      const paymentHistoryEntry = {
        amount: paymentValue,
        interestPaid: interestPaid,
        principalPaid: principalPaid,
        paymentDate: actualPaymentDate,
        createdAt: new Date().toISOString()
      };
      const existingHistory = installment.paymentHistory || [];
      const updatedPaymentHistory = [...existingHistory, paymentHistoryEntry];

      // IMPORTANTE: Se a parcela foi paga (PAID), ela não deve mais estar como LATE
      // Se estava LATE e agora está parcialmente paga, remover status LATE
      const finalStatus = isPaid 
        ? InstallmentStatus.PAID 
        : (installment.status === InstallmentStatus.LATE)
          ? InstallmentStatus.PARTIAL // Se estava LATE e agora está parcialmente paga, remover status LATE
          : InstallmentStatus.PARTIAL;
      
      const updatedInstallment = {
        ...installment,
        status: finalStatus,
        amountPaid: Number(paidAmount.toFixed(2)),
        paymentHistory: updatedPaymentHistory,
        paidDate: finalStatus === InstallmentStatus.PAID ? new Date().toISOString() : installment.paidDate
      };

      // Atualizar no backend se configurado
      if (isBackendConfiguredValue && session?.accessToken) {
        await persistInstallmentsToBackend([updatedInstallment]);
      }

      setInstallments(prev => {
        const updated = prev.map(inst => inst.id === id ? updatedInstallment : inst);
        
        // Atualizar apenas o empréstimo relacionado à parcela que foi paga
        // Isso evita atualizar todos os empréstimos e causar muitas requisições simultâneas
        const loanId = installment.loanId;
        const related = updated.filter(inst => inst.loanId === loanId);
        
        if (related.length > 0) {
          // Usar setLoans com função callback para obter o estado mais recente
          setLoans(currentLoans => {
            const loan = currentLoans.find(l => l.id === loanId);
            if (!loan) return currentLoans;
            // Calcular valor em aberto
            const outstandingAmount = calculateOutstandingAmount(loan, related);
            
            // Para empréstimos "somente juros", verificar se capital + todos os juros foram pagos
            if (loan.model === LoanModel.INTEREST_ONLY) {
              // Calcular capital total pago através do histórico de pagamentos
              const totalCapitalPaid = related.reduce((sum, inst) => {
                if (inst.paymentHistory && inst.paymentHistory.length > 0) {
                  return sum + inst.paymentHistory.reduce((pSum, p) => pSum + (p.principalPaid || 0), 0);
                }
                return sum;
              }, 0);
              
              // Verificar se há parcelas pendentes (não pagas completamente)
              const hasPendingInstallments = related.some(inst => inst.status !== InstallmentStatus.PAID);
              
              const isCapitalPaid = totalCapitalPaid >= loan.amount;
              const allInstallmentsPaid = !hasPendingInstallments;
              
              const isLoanPaid = isCapitalPaid && allInstallmentsPaid;
              const newStatus = isLoanPaid ? LoanStatus.PAID : LoanStatus.ACTIVE;
              
              // Só atualizar se o valor ou status realmente mudou
              const hasChanged = loan.status !== newStatus || 
                                Math.abs((loan.outstandingAmount || 0) - outstandingAmount) > 0.01;
              
              if (hasChanged) {
                const updatedLoan = { ...loan, status: newStatus, outstandingAmount };
                
                // Atualizar no backend se configurado (de forma assíncrona e silenciosa)
                if (isBackendConfiguredValue && session?.accessToken) {
                  setTimeout(async () => {
                    try {
                      const { updateBackendLoan } = await import('@/services/backendApi');
                      await updateBackendLoan(session.accessToken, session.tenantId || '', loanId, updatedLoan);
                    } catch (error) {
                      console.warn('Erro ao atualizar valor em aberto no backend (não crítico):', error);
                    }
                  }, 100);
                }
                
                return currentLoans.map(l => l.id === loanId ? updatedLoan : l);
              }
            } else {
              // Para outros modelos, verificar se todas as parcelas estão pagas
              const isLoanPaid = related.every(inst => inst.status === InstallmentStatus.PAID || inst.amount <= 0);
              const newStatus = isLoanPaid ? LoanStatus.PAID : LoanStatus.ACTIVE;
              
              // Só atualizar se o valor ou status realmente mudou
              const hasChanged = loan.status !== newStatus || 
                                Math.abs((loan.outstandingAmount || 0) - outstandingAmount) > 0.01;
              
              if (hasChanged) {
                const updatedLoan = { ...loan, status: newStatus, outstandingAmount };
                
                // Atualizar no backend se configurado (de forma assíncrona e silenciosa)
                if (isBackendConfiguredValue && session?.accessToken) {
                  setTimeout(async () => {
                    try {
                      const { updateBackendLoan } = await import('@/services/backendApi');
                      await updateBackendLoan(session.accessToken, session.tenantId || '', loanId, updatedLoan);
                    } catch (error) {
                      console.warn('Erro ao atualizar valor em aberto no backend (não crítico):', error);
                    }
                  }, 100);
                }
                
                return currentLoans.map(l => l.id === loanId ? updatedLoan : l);
              }
            }
            
            return currentLoans;
          });
        }
        
        return updated;
      });
    }
  }, [installments, loans, user?.role, isBackendConfiguredValue, session, persistInstallmentsToBackend]);

  const addUser = useCallback(async (newUser: User): Promise<User | null> => {
    // Se usar backend, criar usuário via API do backend
    if (isBackendConfiguredValue && session?.accessToken && session?.tenantId) {
      try {
        const { createBackendUser } = await import('@/services/backendApi');
        const createdUser = await createBackendUser(
          session.accessToken,
          session.tenantId,
          {
            email: newUser.email,
            password: newUser.password ?? '',
            name: newUser.name,
            role: newUser.role,
            whatsappContacts: newUser.whatsappContacts ?? []
          }
        );
        
        const formatted: User = {
          id: createdUser.id,
          email: createdUser.email,
          name: createdUser.name,
          role: normalizeUserRole(createdUser.role),
          whatsappContacts: createdUser.whatsappContacts ?? [],
          tenantId: createdUser.tenantId
        };
        
        setUsersList(prev => [...prev, formatted]);
        return formatted;
      } catch (error) {
        console.error('Erro ao cadastrar usuário no backend', error);
        throw error;
      }
    }
    
    // Fallback para modo local (sem backend)
    if (!supabase) {
      const fallbackUser = { ...newUser, id: newUser.id ?? `local-${Date.now()}` };
      setUsersList(prev => [...prev, fallbackUser]);
      return fallbackUser;
    }

    // Modo Supabase direto (sem backend)
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

    // Obter tenant_id do usuário atual para vincular o novo usuário
    const currentTenantId = user?.tenantId || session?.tenantId;
    
    const userData: any = {
      id: authUser.id,
      email: newUser.email,
      name: newUser.name,
      role: newUser.role,
      whatsapp_contacts: newUser.whatsappContacts ?? []
    };
    
    // Se tiver tenant_id, adicionar ao perfil
    if (currentTenantId) {
      userData.tenant_id = currentTenantId;
    }

    const { data: profile, error: profileError } = await supabase
      .from('users')
      .upsert(userData)
      .select('id, name, email, role, whatsapp_contacts, tenant_id')
      .single();

    if (profileError) {
      console.error('Erro ao salvar perfil do usuário', profileError);
      throw profileError;
    }

    // Criar vínculo em tenant_users se tiver tenant_id
    if (currentTenantId) {
      try {
        await supabase
          .from('tenant_users')
          .upsert({
            tenant_id: currentTenantId,
            user_id: authUser.id,
            email: newUser.email,
            role: newUser.role,
            ativo: true,
            metadata: {
              name: newUser.name,
              role: newUser.role,
              created_by: user?.email || 'system'
            }
          }, {
            onConflict: 'tenant_id,email'
          });
      } catch (tenantError) {
        console.warn('Aviso: Erro ao criar vínculo em tenant_users', tenantError);
        // Não falha a criação do usuário se o vínculo falhar
      }
    }

    const formatted = mapDbUserToUser(profile);
    setUsersList(prev => [...prev, formatted]);
    return formatted;
  }, [mapDbUserToUser, isBackendConfiguredValue, session, user]);

  const removeUser = useCallback(async (id: string) => {
    if (id === user?.id) {
      alert("Você não pode remover a si mesmo.");
      return;
    }

    if (isBackendConfiguredValue || !supabase) {
      setUsersList(prev => prev.filter(u => u.id !== id));
      return;
    }

    const { error } = await supabase.from('users').delete().eq('id', id);
    if (error) {
      console.error('Erro ao remover usuário', error);
      throw error;
    }

    setUsersList(prev => prev.filter(u => u.id !== id));
  }, [user?.id, isBackendConfiguredValue]);

  const setViewWithFilter = useCallback((v: string, filter?: 'ALL' | 'PENDING' | 'LATE' | 'PAID' | 'PARTIAL', dateRange?: { start: string; end: string }) => {
    setView(v);
    if (v === 'installments' && filter) {
      setInstallmentsInitialFilter(filter);
      if (dateRange) {
        setInstallmentsDateRange(dateRange);
      } else {
        setInstallmentsDateRange(null);
      }
    } else if (v !== 'installments') {
      setInstallmentsInitialFilter(null);
      setInstallmentsDateRange(null);
    }
  }, []);

  const value = useMemo(() => ({
    user,
    usersList,
    clients,
    loans,
    installments,
    session,
    setSession,
    isBackendConfigured: isBackendConfiguredValue,
    login,
    logout,
    addClient,
    updateClient,
    deleteClient,
    addLoan,
    updateLoan,
    deleteLoan,
    payInstallment,
    updateInstallment,
    scheduleFuturePayment,
    startEditingLoan,
    reopenLoan,
    addUser,
    removeUser,
    view,
    setView: setViewWithFilter,
    theme,
    setTheme,
    installmentsInitialFilter,
    setInstallmentsInitialFilter,
    installmentsDateRange,
    setInstallmentsDateRange
  }), [user, usersList, clients, loans, installments, session, setSession, isBackendConfiguredValue, view, theme, login, logout, addClient, addUser, removeUser, deleteClient, deleteLoan, payInstallment, updateInstallment, scheduleFuturePayment, startEditingLoan, reopenLoan, addLoan, updateLoan, setTheme, setViewWithFilter, installmentsInitialFilter, installmentsDateRange]);

  useEffect(() => {
    const body = document.body;
    const themeClasses: ThemeOption[] = ['light', 'dark-emerald', 'dark-graphite'];
    body.classList.remove(...themeClasses.map(t => `theme-${t}`));
    body.classList.add(`theme-${theme}`);
  }, [theme]);

  // Verificar se há token de reset na URL
  const [showResetPassword, setShowResetPassword] = useState(false);
  
  useEffect(() => {
    // Verificar se há token de reset na URL (query params ou hash)
    const urlParams = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    
    const tokenFromQuery = urlParams.get('access_token') || urlParams.get('token');
    const tokenFromHash = hashParams.get('access_token') || hashParams.get('token');
    
    if (tokenFromQuery || tokenFromHash) {
      setShowResetPassword(true);
    }
  }, []);

  // Se houver token de reset na URL, mostrar página de reset
  if (showResetPassword) {
    return <ResetPassword />;
  }

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