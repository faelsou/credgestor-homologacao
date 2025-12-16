import React, { useState, useEffect, useMemo } from 'react';
import { LandingPage } from './components/LandingPage';
import { DashboardLayout } from './components/dashboard/DashboardLayout';
import { DashboardHome } from './components/dashboard/Home';
import { ClientsView } from './components/dashboard/Clients';
import { LoansView } from './components/dashboard/Loans';
import { InstallmentsView } from './components/dashboard/Installments';
import { UsersView } from './components/dashboard/Users';
import { User, UserRole, Client, Loan, Installment, LoanStatus, InstallmentStatus, LoanModel } from './types';
import { isLate } from './utils';

// --- MOCK DATA INITIALIZATION ---
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

const TODAY = new Date().toISOString().split('T')[0];

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

export type ThemeOption = 'light' | 'dark-emerald' | 'dark-graphite';

export const AppContext = React.createContext<{
  user: User | null;
  usersList: User[];
  clients: Client[];
  loans: Loan[];
  installments: Installment[];
  login: (email: string, password?: string, provider?: 'google') => boolean;
  logout: () => void;
  addClient: (client: Client) => void;
  updateClient: (client: Client) => void;
  deleteClient: (id: string) => void;
  addLoan: (loan: Loan, generatedInstallments: Installment[]) => void;
  updateLoan: (loan: Loan, generatedInstallments: Installment[]) => void;
  deleteLoan: (id: string) => void;
  payInstallment: (id: string, amount?: number) => void;
  addUser: (newUser: User) => void;
  removeUser: (id: string) => void;
  view: string;
  setView: (v: string) => void;
  theme: ThemeOption;
  setTheme: (theme: ThemeOption) => void;
}>({} as any);

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [view, setView] = useState('home'); // home, clients, loans, installments, users
  
  // App Data State
  const [clients, setClients] = useState<Client[]>(MOCK_CLIENTS);
  const [loans, setLoans] = useState<Loan[]>(MOCK_LOANS);
  const [installments, setInstallments] = useState<Installment[]>(MOCK_INSTALLMENTS);
  const [usersList, setUsersList] = useState<User[]>(MOCK_USERS);
  const [theme, setTheme] = useState<ThemeOption>('light');

  // Check for late installments on load
  useEffect(() => {
    setInstallments(prev => prev.map(inst => {
      if (inst.status === InstallmentStatus.PENDING && isLate(inst.dueDate)) {
        return { ...inst, status: InstallmentStatus.LATE };
      }
      return inst;
    }));
  }, []);

  const login = (email: string, password?: string, provider?: 'google') => {
    let foundUser = usersList.find(u => u.email.toLowerCase() === email.toLowerCase());

    if (provider === 'google') {
      if (!foundUser) {
        foundUser = {
          id: `google-${Date.now()}`,
          name: email.split('@')[0] || 'Usuário Google',
          email,
          password: '',
          role: UserRole.ADMIN
        };
        setUsersList(prev => [...prev, foundUser!]);
      }
      setUser(foundUser || null);
      setView('home');
      return true;
    }

    if (foundUser && foundUser.password === password) {
      setUser(foundUser);
      setView('home');
      return true;
    }

    return false;
  };

  const logout = () => {
    setUser(null);
  };

  const addClient = (client: Client) => {
    setClients([...clients, client]);
  };

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

  const payInstallment = (id: string, amount?: number) => {
    if (user?.role === UserRole.COLLECTION) {
      alert("Acesso restrito: Cobradores não podem baixar pagamentos, apenas visualizar.");
      return;
    }
    setInstallments(prev => prev.map(inst => {
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
        const isPaid = remainingBalance <= 0;

        return {
          ...inst,
          amount: remainingBalance,
          interestAmount: updatedInterest,
          principalAmount: updatedPrincipal,
          amountPaid: Number(((inst.amountPaid || 0) + appliedPayment).toFixed(2)),
          status: isPaid ? InstallmentStatus.PAID : InstallmentStatus.PARTIAL,
          paidDate: isPaid ? new Date().toISOString() : inst.paidDate
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
    }));
  };

  const addUser = (newUser: User) => {
    setUsersList([...usersList, newUser]);
  };

  const removeUser = (id: string) => {
    if (id === user?.id) {
      alert("Você não pode remover a si mesmo.");
      return;
    }
    setUsersList(usersList.filter(u => u.id !== id));
  };

  const value = useMemo(() => ({
    user,
    usersList,
    clients,
    loans,
    installments,
    login,
    logout,
    addClient,
    updateClient,
    deleteClient,
    addLoan,
    updateLoan,
    deleteLoan,
    payInstallment,
    addUser,
    removeUser,
    view,
    setView,
    theme,
    setTheme
  }), [user, usersList, clients, loans, installments, view, theme]);

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
        {view === 'loans' && <LoansView />}
        {view === 'installments' && <InstallmentsView />}
        {view === 'users' && <UsersView />}
      </DashboardLayout>
    </AppContext.Provider>
  );
};

export default App;