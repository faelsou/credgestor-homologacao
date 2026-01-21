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

import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
  payInstallment: (id: string, amount?: number) => void;
  updateInstallment: (id: string, installment: Installment) => Promise<void>;
  scheduleFuturePayment: (id: string, reason: string, amount: number, date?: string) => Promise<void>;
  startEditingLoan: (loanId: string) => void;
  addUser: (newUser: User) => Promise<User | null>;
  removeUser: (id: string) => Promise<void>;
  view: string;
  setView: (v: string) => void;
  theme: ThemeOption;
  setTheme: (theme: ThemeOption) => void;
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
      if (inst.status === InstallmentStatus.PENDING && isLate(inst.dueDate)) {
        return { ...inst, status: InstallmentStatus.LATE };
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
        return true;
      } catch (error) {
        console.error('❌ Falha ao autenticar via backend:', error);
        if (error instanceof Error) {
          console.error('📝 Mensagem de erro:', error.message);
        }
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

      if (shouldUseLocalFallback(error)) {
        const fallbackUser = mapAuthUserToLocalUser(null, email);
        setUser(fallbackUser);
        setUsersList(prev => prev.some(u => u.id === fallbackUser.id) ? prev : [...prev, fallbackUser]);
        setView('home');
        return true;
      }

      console.error('Falha ao autenticar usuário', error ?? 'Sessão retornada sem usuário');
    } catch (error) {
      const fallbackUser = mapAuthUserToLocalUser(null, email);
      setUser(fallbackUser);
      setUsersList(prev => prev.some(u => u.id === fallbackUser.id) ? prev : [...prev, fallbackUser]);
      setView('home');
      return true;
    }

    const fallbackUser = MOCK_USERS.find(u => u.email === email && u.password === password);
    if (fallbackUser) {
      setUser(fallbackUser);
      setView('home');
      return true;
    }

    return false;
  }, [fetchUserProfile, mapAuthUserToLocalUser, isBackendConfiguredValue]);

  const logout = useCallback(async () => {
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

  const deleteClient = useCallback(async (id: string) => {
    if (isBackendConfiguredValue && session?.accessToken) {
      try {
        await deleteClientApi(session.accessToken, session.tenantId, id);
      } catch (error) {
        console.error('Erro ao excluir cliente no backend', error);
      }
    }

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
    if (isBackendConfiguredValue && session?.accessToken) {
      try {
        const { updateBackendLoan } = await import('@/services/backendApi');
        await updateBackendLoan(session.accessToken, requireTenantId(session.tenantId, 'atualizar empréstimo'), loan.id, loan);
        setLoans(prev => prev.map(item => item.id === loan.id ? loan : item));
        setInstallments(prev => prev.filter(inst => inst.loanId !== loan.id).concat(generatedInstallments));
        return;
      } catch (error) {
        console.error('Erro ao atualizar empréstimo via backend API', error);
        // Fallback: atualiza localmente se falhar
      }
    }
    setLoans(prev => prev.map(item => item.id === loan.id ? loan : item));
    setInstallments(prev => prev.filter(inst => inst.loanId !== loan.id).concat(generatedInstallments));
  }, [session, isBackendConfiguredValue]);

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
    const entry = {
      reason,
      amount,
      date: scheduledDate,
      createdAt
    };

    const promisedPaymentHistory = [...(installment.promisedPaymentHistory ?? []), entry];

    // Atualizar a data de vencimento (dueDate) para a data do agendamento quando alterada
    const updatedInstallment = {
      ...installment,
      dueDate: scheduledDate, // Atualizar dueDate para a data do agendamento
      promisedPaymentReason: entry.reason,
      promisedPaymentAmount: entry.amount,
      promisedPaymentDate: entry.date,
      promisedPaymentHistory
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

  const payInstallment = useCallback(async (id: string, amount?: number) => {
    if (user?.role === UserRole.COLLECTION) {
      alert("Acesso restrito: Cobradores não podem baixar pagamentos, apenas visualizar.");
      return;
    }

    const installment = installments.find(inst => inst.id === id);
    if (!installment) return;

    const paymentValue = installment.status === InstallmentStatus.PAID ? 0 : (amount ?? installment.amount);
    const loan = loans.find(l => l.id === installment.loanId);
    if (!loan) return;

    // Função auxiliar para adicionar meses a uma data
    const addMonths = (dateString: string, months: number) => {
      // Parse a data no formato YYYY-MM-DD evitando problemas de fuso horário
      const [year, month, day] = dateString.split('-').map(Number);
      const baseDate = new Date(year, month - 1, day);
      const newDate = new Date(baseDate.getFullYear(), baseDate.getMonth() + months, baseDate.getDate());
      // Formatar de volta para YYYY-MM-DD
      const yearStr = newDate.getFullYear();
      const monthStr = String(newDate.getMonth() + 1).padStart(2, '0');
      const dayStr = String(newDate.getDate()).padStart(2, '0');
      return `${yearStr}-${monthStr}-${dayStr}`;
    };

    if (loan.model === LoanModel.INTEREST_ONLY) {
      // Calcular juros baseado na taxa do empréstimo se não estiver definido
      let interestDue = installment.interestAmount ?? 0;
      if (interestDue === 0) {
        const principal = installment.principalAmount ?? installment.amount;
        interestDue = Number((principal * (loan.interestRate / 100)).toFixed(2));
      }
      
      const principalDue = Math.max(0, installment.principalAmount ?? Math.max(0, installment.amount - interestDue));
      const totalDue = Math.max(0, interestDue + principalDue);

      // Permitir pagamentos maiores que o valor devido - o excedente abaterá o capital
      let remainingPayment = paymentValue;

      // 1. Abater primeiro os juros da parcela atual
      const interestPayment = Math.min(remainingPayment, interestDue);
      remainingPayment -= interestPayment;
      const updatedInterest = Number((interestDue - interestPayment).toFixed(2));

      // 2. Abater o principal (capital) da parcela atual
      const principalPayment = Math.min(remainingPayment, principalDue);
      remainingPayment -= principalPayment;
      const updatedPrincipal = Number((principalDue - principalPayment).toFixed(2));

      // Para empréstimos "somente juros", o amount é apenas os juros, não juros + principal
      // O status é PAID quando não há mais juros nem principal pendentes
      // IMPORTANTE: O amount deve sempre ser pelo menos o valor mínimo dos juros baseado no capital restante
      const rateDecimal = loan.interestRate / 100;
      // Calcular valor mínimo dos juros baseado no capital restante
      const minInterestFromPrincipal = updatedPrincipal > 0 ? Number((updatedPrincipal * rateDecimal).toFixed(2)) : 0;
      // O amount deve ser pelo menos o valor mínimo dos juros, mesmo que os juros atuais sejam menores ou zero
      const remainingBalance = Math.max(updatedInterest, minInterestFromPrincipal);
      const newStatus = (updatedInterest <= 0 && updatedPrincipal <= 0) ? InstallmentStatus.PAID : 
                       (updatedInterest <= 0 && updatedPrincipal <= 0) ? InstallmentStatus.PARTIAL : InstallmentStatus.PARTIAL;
      
      // Valor total aplicado nesta parcela (juros + principal)
      const appliedToThisInstallment = interestPayment + principalPayment;

      // Registrar pagamento no histórico
      const paymentHistoryEntry = {
        amount: appliedToThisInstallment,
        interestPaid: interestPayment,
        principalPaid: principalPayment,
        paymentDate: getTodayDateString(),
        createdAt: new Date().toISOString()
      };
      const existingHistory = installment.paymentHistory || [];
      const updatedPaymentHistory = [...existingHistory, paymentHistoryEntry];

      const updatedInstallment = {
        ...installment,
        amount: remainingBalance, // Sempre pelo menos o valor mínimo dos juros baseado no capital restante
        interestAmount: updatedInterest,
        principalAmount: updatedPrincipal,
        amountPaid: Number(((installment.amountPaid || 0) + appliedToThisInstallment).toFixed(2)),
        paymentHistory: updatedPaymentHistory,
        status: newStatus,
        paidDate: newStatus === InstallmentStatus.PAID ? new Date().toISOString() : installment.paidDate
      };

      // 3. Se ainda sobrar valor, abater o capital das próximas parcelas pendentes
      const loanInstallments = installments.filter(inst => inst.loanId === loan.id && inst.id !== id);
      const pendingInstallments = loanInstallments
        .filter(inst => inst.status !== InstallmentStatus.PAID)
        .sort((a, b) => a.number - b.number);

      const updatedInstallments: Installment[] = [updatedInstallment];
      let excessPayment = remainingPayment;

      // Abater o capital excedente nas próximas parcelas
      for (const nextInst of pendingInstallments) {
        if (excessPayment <= 0) break;

        const nextPrincipal = nextInst.principalAmount ?? 0;
        const capitalReduction = Math.min(excessPayment, nextPrincipal);
        excessPayment -= capitalReduction;

        const newPrincipal = Number((nextPrincipal - capitalReduction).toFixed(2));
        const rateDecimal = loan.interestRate / 100;
        const newInterest = Number((newPrincipal * rateDecimal).toFixed(2));
        // Para empréstimos "somente juros", o amount é apenas os juros, não juros + principal
        // IMPORTANTE: O amount deve sempre ser pelo menos o valor mínimo dos juros baseado no capital restante
        const minInterestFromPrincipal = newPrincipal > 0 ? Number((newPrincipal * rateDecimal).toFixed(2)) : 0;
        const newAmount = Math.max(newInterest, minInterestFromPrincipal);

        const updatedNextInst: Installment = {
          ...nextInst,
          principalAmount: newPrincipal,
          interestAmount: newInterest,
          amount: newAmount
        };

        updatedInstallments.push(updatedNextInst);
      }

      // Atualizar parcelas no backend se configurado
      if (isBackendConfiguredValue && session?.accessToken) {
        try {
          const { updateBackendInstallment } = await import('@/services/backendApi');
          for (const inst of updatedInstallments) {
            await updateBackendInstallment(
              session.accessToken,
              requireTenantId(session.tenantId, 'operar com parcelas'),
              inst.id,
              inst
            );
          }
        } catch (error) {
          console.error('Erro ao atualizar parcelas no backend', error);
        }
      }

      // Calcular capital total restante do empréstimo após o pagamento
      // Primeiro, atualizar a lista de parcelas com as modificadas
      const allUpdatedInstallments = [...updatedInstallments];
      
      // Calcular capital total restante: soma de todos os principalAmount das parcelas pendentes
      let totalRemainingCapital = 0;
      
      // Capital da parcela atual atualizada
      totalRemainingCapital += updatedPrincipal;
      
      // Capital das outras parcelas atualizadas
      for (const inst of updatedInstallments) {
        if (inst.id !== id && inst.principalAmount && inst.status !== InstallmentStatus.PAID) {
          totalRemainingCapital += inst.principalAmount;
        }
      }
      
      // Capital das parcelas que não foram atualizadas (ainda pendentes)
      const otherPendingInstallments = loanInstallments.filter(
        inst => inst.status !== InstallmentStatus.PAID && 
                !updatedInstallments.some(updated => updated.id === inst.id)
      );
      for (const inst of otherPendingInstallments) {
        if (inst.principalAmount) {
          totalRemainingCapital += inst.principalAmount;
        }
      }
      
      totalRemainingCapital = Number(totalRemainingCapital.toFixed(2));
      
      // Encontrar o próximo número de parcela
      const allLoanInstallments = installments.filter(inst => inst.loanId === loan.id);
      const maxNumber = Math.max(...allLoanInstallments.map(inst => inst.number), 0);
      const nextNumber = maxNumber + 1;

      // Se ainda há capital total em aberto, criar nova parcela com juros recalculados
      // A nova parcela representa o capital restante total do empréstimo
      if (totalRemainingCapital > 0) {
        const rateDecimal = loan.interestRate / 100;
        // Calcular juros sobre o capital total restante (ex: R$ 900 * 20% = R$ 180)
        // O amount deve sempre ser pelo menos o valor mínimo dos juros baseado no capital restante
        const nextInterestAmount = totalRemainingCapital > 0 ? Number((totalRemainingCapital * rateDecimal).toFixed(2)) : 0;
        const nextAmount = nextInterestAmount; // Já é o valor mínimo dos juros
        const nextDueDate = addMonths(getTodayDateString(), 1); // Próximo mês

        const newInstallment: Installment = {
          id: `inst_${loan.id}_${nextNumber}_${Date.now()}`,
          loanId: loan.id,
          clientId: installment.clientId,
          number: nextNumber,
          dueDate: nextDueDate,
          amount: nextAmount, // Sempre pelo menos o valor mínimo dos juros baseado no capital restante
          interestAmount: nextInterestAmount, // R$ 180
          principalAmount: totalRemainingCapital, // Capital total em aberto (R$ 900)
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

      // Atualizar todas as parcelas modificadas
      setInstallments(prev => {
        const updatedMap = new Map(updatedInstallments.map(inst => [inst.id, inst]));
        return prev.map(inst => updatedMap.get(inst.id) || inst);
      });
    } else {
      // Lógica para outros modelos de empréstimo
      const paidAmount = Math.min(installment.amount, (installment.amountPaid || 0) + paymentValue);
      const isPaid = paidAmount >= installment.amount;

      // Registrar pagamento no histórico
      const paymentHistoryEntry = {
        amount: paymentValue,
        interestPaid: 0,
        principalPaid: paymentValue,
        paymentDate: getTodayDateString(),
        createdAt: new Date().toISOString()
      };
      const existingHistory = installment.paymentHistory || [];
      const updatedPaymentHistory = [...existingHistory, paymentHistoryEntry];

      const updatedInstallment = {
        ...installment,
        status: isPaid ? InstallmentStatus.PAID : InstallmentStatus.PARTIAL,
        amountPaid: Number(paidAmount.toFixed(2)),
        paymentHistory: updatedPaymentHistory,
        paidDate: new Date().toISOString()
      };

      // Atualizar no backend se configurado
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
          console.error('Erro ao atualizar parcela no backend', error);
        }
      }

      setInstallments(prev => prev.map(inst => inst.id === id ? updatedInstallment : inst));
    }

    // Função auxiliar para calcular valor em aberto
    const calculateOutstandingAmount = (loan: Loan, relatedInstallments: Installment[]): number => {
      if (relatedInstallments.length === 0) {
        return loan.totalAmount;
      }
      
      // Para empréstimos "somente juros", calcular capital + juros pendentes
      if (loan.model === LoanModel.INTEREST_ONLY) {
        let totalOutstanding = 0;
        
        // Soma todo o capital pendente
        for (const inst of relatedInstallments) {
          const principal = inst.principalAmount ?? 0;
          if (principal > 0) {
            totalOutstanding += principal;
          }
        }
        
        // Soma todos os juros pendentes
        for (const inst of relatedInstallments) {
          const interest = inst.interestAmount ?? 0;
          if (interest > 0) {
            totalOutstanding += interest;
          }
        }
        
        return Number(totalOutstanding.toFixed(2));
      }
      
      // Para outros modelos, calcular valor total menos o que já foi pago
      const totalPaid = relatedInstallments.reduce((sum, inst) => sum + (inst.amountPaid || 0), 0);
      const outstanding = Math.max(0, loan.totalAmount - totalPaid);
      return Number(outstanding.toFixed(2));
    };

    // Atualizar status do empréstimo e valor em aberto
    setLoans(prevLoans => prevLoans.map(l => {
      const related = installments.filter(inst => inst.loanId === l.id);
      
      if (related.length === 0) {
        return { ...l, status: LoanStatus.ACTIVE, outstandingAmount: l.totalAmount };
      }
      
      // Calcular valor em aberto
      const outstandingAmount = calculateOutstandingAmount(l, related);
      
      // Para empréstimos "somente juros", verificar se não há mais capital nem juros pendentes
      if (l.model === LoanModel.INTEREST_ONLY) {
        const hasPendingCapital = related.some(inst => {
          const principal = inst.principalAmount ?? 0;
          return principal > 0;
        });
        
        const hasPendingInterest = related.some(inst => {
          const interest = inst.interestAmount ?? 0;
          return interest > 0;
        });
        
        // Empréstimo só está finalizado se não há capital nem juros pendentes
        const isLoanPaid = !hasPendingCapital && !hasPendingInterest;
        const updatedLoan = { ...l, status: isLoanPaid ? LoanStatus.PAID : LoanStatus.ACTIVE, outstandingAmount };
        
        // Atualizar no backend se configurado
        if (isBackendConfiguredValue && session?.accessToken) {
          (async () => {
            try {
              const { updateBackendLoan } = await import('@/services/backendApi');
              await updateBackendLoan(session.accessToken, session.tenantId || '', l.id, updatedLoan);
            } catch (error) {
              console.error('Erro ao atualizar valor em aberto no backend', error);
            }
          })();
        }
        
        return updatedLoan;
      }
      
      // Para outros modelos, verificar se todas as parcelas estão pagas
      const isLoanPaid = related.every(inst => inst.status === InstallmentStatus.PAID || inst.amount <= 0);
      const updatedLoan = { ...l, status: isLoanPaid ? LoanStatus.PAID : LoanStatus.ACTIVE, outstandingAmount };
      
      // Atualizar no backend se configurado
      if (isBackendConfiguredValue && session?.accessToken) {
        (async () => {
          try {
            const { updateBackendLoan } = await import('@/services/backendApi');
            await updateBackendLoan(session.accessToken, session.tenantId || '', l.id, updatedLoan);
          } catch (error) {
            console.error('Erro ao atualizar valor em aberto no backend', error);
          }
        })();
      }
      
      return updatedLoan;
    }));
  }, [installments, loans, user?.role, isBackendConfiguredValue, session]);

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
            on_conflict: 'tenant_id,email'
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
    addUser,
    removeUser,
    view,
    setView,
    theme,
    setTheme
  }), [user, usersList, clients, loans, installments, session, setSession, isBackendConfiguredValue, view, theme, login, logout, addClient, addUser, removeUser, deleteClient, deleteLoan, payInstallment, updateInstallment, scheduleFuturePayment, startEditingLoan, addLoan, updateLoan, setTheme, setView]);

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