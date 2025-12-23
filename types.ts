export enum UserRole {
  ADMIN = 'ADMIN',
  COLLECTION = 'COLLECTION' // Read-only / Limited
}

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string;
  role: UserRole;
  whatsappContacts?: string[];
  tenantId?: string;
  tenantName?: string;
}

export interface Client {
  id: string;
  name: string;
  cpf: string;
  phone: string;
  email: string;
  cep: string;
  street: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  status: 'active' | 'blocked';
  notes?: string;
}

export enum LoanStatus {
  ACTIVE = 'ACTIVE',
  PAID = 'PAID',
  DEFAULTED = 'DEFAULTED' // Inadimplente
}

export interface Loan {
  id: string;
  clientId: string;
  amount: number; // Valor emprestado
  interestRate: number; // Porcentagem
  totalAmount: number; // Valor total com juros
  startDate: string;
  installmentsCount: number;
  model: LoanModel;
  status: LoanStatus;
  promissoryNote?: PromissoryNote;
}

export enum LoanModel {
  FIXED_AMORTIZATION = 'FIXED_AMORTIZATION',
  SIMPLE_INTEREST = 'SIMPLE_INTEREST',
  COMPOUND_INTEREST = 'COMPOUND_INTEREST',
  SAC = 'SAC',
  PRICE = 'PRICE',
  PARTICULAR = 'PARTICULAR',
  INTEREST_ONLY = 'INTEREST_ONLY'
}

export enum InstallmentStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  LATE = 'LATE',
  PARTIAL = 'PARTIAL'
}

export interface PromisedPaymentHistoryEntry {
  reason: string;
  amount: number;
  date: string;
  createdAt: string;
}

export interface Installment {
  id: string;
  loanId: string;
  clientId: string; // Denormalized for easier querying
  number: number;
  dueDate: string;
  amount: number;
  amountPaid: number;
  interestAmount?: number;
  principalAmount?: number;
  promisedPaymentReason?: string;
  promisedPaymentAmount?: number;
  promisedPaymentDate?: string;
  promisedPaymentHistory?: PromisedPaymentHistoryEntry[];
  status: InstallmentStatus;
  paidDate?: string;
}

export interface DashboardStats {
  totalReceivable: number;
  totalReceived: number;
  totalLate: number;
  activeClients: number;
}

export type IndicationType = 'Garantia' | 'Sem Garantia';

export interface PromissoryNote {
  capital: number;
  interestRate: number;
  issueDate: string;
  dueDate: string;
  indication: IndicationType;
  numberHash: string;
  observation?: string;
}
