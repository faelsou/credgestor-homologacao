// @vitest-environment node
import { describe, it, expect } from 'vitest';
import {
  calculateLoanOutstandingAmount,
  calculateLoanDisplayStatus,
  sumPrincipalPaid,
  hasPendingInstallmentBalance,
  getInstallmentPendingAmount,
  getPendingCapital,
  calculateInterestOnlyMonthlyInterest,
  getInterestOnlyReceiveSummary,
} from './loanBalances';
import {
  Installment,
  InstallmentStatus,
  Loan,
  LoanModel,
  LoanStatus,
} from '@/types';

function makeLoan(overrides: Partial<Loan> = {}): Loan {
  return {
    id: 'loan-1',
    clientId: 'client-1',
    amount: 1000,
    interestRate: 12,
    totalAmount: 1120,
    startDate: '2025-11-12',
    installmentsCount: 1,
    model: LoanModel.INTEREST_ONLY,
    status: LoanStatus.ACTIVE,
    ...overrides,
  };
}

function makeInstallment(overrides: Partial<Installment> = {}): Installment {
  return {
    id: 'inst-1',
    loanId: 'loan-1',
    clientId: 'client-1',
    number: 1,
    dueDate: '2025-12-12',
    amount: 120,
    amountPaid: 0,
    interestAmount: 120,
    principalAmount: 1000,
    status: InstallmentStatus.PENDING,
    ...overrides,
  };
}

describe('sumPrincipalPaid', () => {
  it('soma principalPaid do histórico de pagamentos', () => {
    const installments = [
      makeInstallment({
        paymentHistory: [
          {
            amount: 500,
            interestPaid: 120,
            principalPaid: 380,
            paymentDate: '2025-12-01',
            createdAt: '2025-12-01T10:00:00.000Z',
          },
          {
            amount: 620,
            interestPaid: 0,
            principalPaid: 620,
            paymentDate: '2026-01-01',
            createdAt: '2026-01-01T10:00:00.000Z',
          },
        ],
      }),
    ];

    expect(sumPrincipalPaid(installments)).toBe(1000);
  });

  it('retorna 0 quando não há histórico', () => {
    expect(sumPrincipalPaid([makeInstallment()])).toBe(0);
  });
});

describe('hasPendingInstallmentBalance', () => {
  it('detecta parcela com saldo pendente', () => {
    expect(hasPendingInstallmentBalance([makeInstallment()])).toBe(true);
  });

  it('ignora parcela PAID', () => {
    expect(
      hasPendingInstallmentBalance([
        makeInstallment({
          status: InstallmentStatus.PAID,
          amountPaid: 120,
        }),
      ]),
    ).toBe(false);
  });

  it('detecta PARTIAL com saldo restante', () => {
    expect(
      hasPendingInstallmentBalance([
        makeInstallment({
          status: InstallmentStatus.PARTIAL,
          amountPaid: 50,
        }),
      ]),
    ).toBe(true);
  });
});

describe('getInstallmentPendingAmount', () => {
  it('retorna amount − amountPaid', () => {
    expect(
      getInstallmentPendingAmount(
        makeInstallment({ amount: 351, amountPaid: 350.16 }),
      ),
    ).toBe(0.84);
  });

  it('não fica negativo quando pago ≥ amount', () => {
    expect(
      getInstallmentPendingAmount(
        makeInstallment({ amount: 100, amountPaid: 120 }),
      ),
    ).toBe(0);
  });
});

describe('getInterestOnlyReceiveSummary — modal Receber', () => {
  it('caso Cristina: parcial não reincha pendente com juros cheios', () => {
    const loan = makeLoan({
      amount: 2920,
      interestRate: 12,
      // juros sobre capital ≈ 350.4; parcela no banco pode ser 351 (ceil na criação)
    });
    const installment = makeInstallment({
      amount: 351,
      amountPaid: 350.16,
      interestAmount: 351,
      status: InstallmentStatus.PARTIAL,
    });

    const summary = getInterestOnlyReceiveSummary(loan, installment, [installment]);

    expect(summary.displayAmount).toBe(351);
    expect(summary.pendingAmount).toBe(0.84);
    // Não pode ser Math.max(351 - 350.16, jurosCheios) ≈ 350+
    expect(summary.pendingAmount).toBeLessThan(1);
  });

  it('sem pagamento: pendente = amount da parcela', () => {
    const loan = makeLoan({ amount: 1000, interestRate: 10 });
    const installment = makeInstallment({ amount: 100, amountPaid: 0, interestAmount: 100 });

    const summary = getInterestOnlyReceiveSummary(loan, installment, [installment]);

    expect(summary.pendingAmount).toBe(100);
    expect(summary.monthlyInterest).toBe(100);
    expect(summary.pendingCapital).toBe(1000);
  });

  it('juros do mês usam capital pendente (não capital original após amortização)', () => {
    const loan = makeLoan({ amount: 1000, interestRate: 10 });
    const installment = makeInstallment({
      amount: 90,
      amountPaid: 0,
      paymentHistory: [
        {
          amount: 200,
          interestPaid: 100,
          principalPaid: 100,
          paymentDate: '2026-01-01',
          createdAt: '2026-01-01T10:00:00.000Z',
        },
      ],
    });

    expect(getPendingCapital(loan, [installment])).toBe(900);
    expect(calculateInterestOnlyMonthlyInterest(loan, [installment])).toBe(90);
  });
});

describe('calculateLoanOutstandingAmount — INTEREST_ONLY', () => {
  it('caso João: capital quitado e parcelas sem saldo → R$ 0', () => {
    const loan = makeLoan();
    const installments = [
      makeInstallment({
        status: InstallmentStatus.PAID,
        amountPaid: 1120,
        interestAmount: 120,
        principalAmount: 1000,
        paymentHistory: [
          {
            amount: 1120,
            interestPaid: 120,
            principalPaid: 1000,
            paymentDate: '2026-01-15',
            createdAt: '2026-01-15T10:00:00.000Z',
          },
        ],
      }),
    ];

    expect(calculateLoanOutstandingAmount(loan, installments)).toBe(0);
  });

  it('capital quitado com cobrança de juros ainda aberta → mostra cobrança', () => {
    const loan = makeLoan();
    const installments = [
      makeInstallment({
        status: InstallmentStatus.PENDING,
        amount: 120,
        amountPaid: 0,
        interestAmount: 120,
        principalAmount: 0,
        paymentHistory: [
          {
            amount: 1000,
            interestPaid: 0,
            principalPaid: 1000,
            paymentDate: '2026-01-15',
            createdAt: '2026-01-15T10:00:00.000Z',
          },
        ],
      }),
    ];

    expect(calculateLoanOutstandingAmount(loan, installments)).toBe(120);
  });

  it('capital pendente + juros sobre capital pendente', () => {
    const loan = makeLoan({ amount: 1000, interestRate: 10 });
    const installments = [makeInstallment({ amount: 100, interestAmount: 100 })];

    // capital 1000 + juros 100 = 1100
    expect(calculateLoanOutstandingAmount(loan, installments)).toBe(1100);
  });
});

describe('calculateLoanDisplayStatus — INTEREST_ONLY', () => {
  it('não usa principalAmount/interestAmount estáticos para decidir status', () => {
    const loan = makeLoan({ status: LoanStatus.ACTIVE });
    const installments = [
      makeInstallment({
        status: InstallmentStatus.PAID,
        amountPaid: 1120,
        interestAmount: 120,
        principalAmount: 1000,
        paymentHistory: [
          {
            amount: 1120,
            interestPaid: 120,
            principalPaid: 1000,
            paymentDate: '2026-01-15',
            createdAt: '2026-01-15T10:00:00.000Z',
          },
        ],
      }),
    ];

    expect(calculateLoanDisplayStatus(loan, installments)).toBe(LoanStatus.PAID);
  });

  it('permanece ACTIVE se capital pago mas há cobrança aberta', () => {
    const loan = makeLoan();
    const installments = [
      makeInstallment({
        status: InstallmentStatus.PENDING,
        amount: 120,
        amountPaid: 0,
        paymentHistory: [
          {
            amount: 1000,
            interestPaid: 0,
            principalPaid: 1000,
            paymentDate: '2026-01-15',
            createdAt: '2026-01-15T10:00:00.000Z',
          },
        ],
      }),
    ];

    expect(calculateLoanDisplayStatus(loan, installments)).toBe(LoanStatus.ACTIVE);
  });
});

describe('calculateLoanDisplayStatus / outstanding — PRICE', () => {
  it('PRICE com todas as parcelas pagas → Finalizado e R$ 0', () => {
    const loan = makeLoan({
      model: LoanModel.PRICE,
      totalAmount: 1263.8,
      status: LoanStatus.ACTIVE,
    });
    const installments = [
      makeInstallment({
        status: InstallmentStatus.PAID,
        amount: 631.9,
        amountPaid: 631.9,
        interestAmount: undefined,
        principalAmount: undefined,
      }),
      makeInstallment({
        id: 'inst-2',
        number: 2,
        status: InstallmentStatus.PAID,
        amount: 631.9,
        amountPaid: 631.9,
      }),
    ];

    expect(calculateLoanDisplayStatus(loan, installments)).toBe(LoanStatus.PAID);
    expect(calculateLoanOutstandingAmount(loan, installments)).toBe(0);
  });

  it('PRICE com parcela pendente → Em Aberto com saldo', () => {
    const loan = makeLoan({
      model: LoanModel.PRICE,
      totalAmount: 1000,
      status: LoanStatus.ACTIVE,
    });
    const installments = [
      makeInstallment({
        status: InstallmentStatus.PAID,
        amount: 500,
        amountPaid: 500,
      }),
      makeInstallment({
        id: 'inst-2',
        number: 2,
        status: InstallmentStatus.PENDING,
        amount: 500,
        amountPaid: 0,
      }),
    ];

    expect(calculateLoanDisplayStatus(loan, installments)).toBe(LoanStatus.ACTIVE);
    expect(calculateLoanOutstandingAmount(loan, installments)).toBe(500);
  });
});
