// @vitest-environment node
import { describe, it, expect } from 'vitest';
import {
  hasFinancialEvidence,
  planScheduleReplacement,
  getFinalScheduleNumbers,
} from './loanScheduleReplacement';
import { Installment, InstallmentStatus, LoanModel } from '@/types';

const LOAN_ID = 'loan-1';

function makeInstallment(overrides: Partial<Installment> & { number: number }): Installment {
  return {
    id: `existing-${overrides.number}`,
    loanId: LOAN_ID,
    clientId: 'client-1',
    dueDate: '2026-01-10',
    amount: 100,
    amountPaid: 0,
    status: InstallmentStatus.PENDING,
    ...overrides,
  };
}

function makeGenerated(count: number, firstMonth = 1): Installment[] {
  return Array.from({ length: count }, (_, index) => {
    const month = String(firstMonth + index).padStart(2, '0');
    return makeInstallment({
      id: `gen-${index + 1}`,
      number: index + 1,
      dueDate: `2026-${month}-10`,
    });
  });
}

describe('hasFinancialEvidence', () => {
  it('reconhece parcela PAID como evidência de dinheiro', () => {
    const inst = makeInstallment({ number: 1, status: InstallmentStatus.PAID, amountPaid: 100 });
    expect(hasFinancialEvidence(inst)).toBe(true);
  });

  it('reconhece parcela PARTIAL com valor recebido', () => {
    const inst = makeInstallment({ number: 1, status: InstallmentStatus.PARTIAL, amountPaid: 40 });
    expect(hasFinancialEvidence(inst)).toBe(true);
  });

  it('reconhece parcela com paymentHistory mesmo sem amountPaid', () => {
    const inst = makeInstallment({
      number: 1,
      paymentHistory: [
        {
          amount: 50,
          interestPaid: 50,
          principalPaid: 0,
          paymentDate: '2026-01-10',
          createdAt: '2026-01-10T00:00:00.000Z',
        },
      ],
    });
    expect(hasFinancialEvidence(inst)).toBe(true);
  });

  it('não considera parcela PENDING sem recebimento', () => {
    const inst = makeInstallment({ number: 1, status: InstallmentStatus.PENDING });
    expect(hasFinancialEvidence(inst)).toBe(false);
  });

  it('não considera parcela LATE sem recebimento', () => {
    const inst = makeInstallment({ number: 1, status: InstallmentStatus.LATE });
    expect(hasFinancialEvidence(inst)).toBe(false);
  });
});

describe('planScheduleReplacement — PRICE', () => {
  it('não infla a quantidade de parcelas ao reeditar (caso Joelma 12 → 24)', () => {
    const paid = Array.from({ length: 4 }, (_, index) =>
      makeInstallment({
        number: index + 1,
        status: InstallmentStatus.PAID,
        amountPaid: 100,
        dueDate: `2026-0${index + 1}-10`,
      }),
    );
    const pending = Array.from({ length: 8 }, (_, index) =>
      makeInstallment({ id: `pend-${index}`, number: index + 5 }),
    );

    const plan = planScheduleReplacement({
      loanId: LOAN_ID,
      model: LoanModel.PRICE,
      existing: [...paid, ...pending],
      generated: makeGenerated(12),
    });

    expect(plan.preserved).toHaveLength(4);
    expect(plan.toDelete).toHaveLength(8);
    expect(plan.toCreate).toHaveLength(8);
    expect(getFinalScheduleNumbers(plan)).toHaveLength(12);
  });

  it('renumera as novas parcelas após as preservadas (sem colisão de número)', () => {
    const paid = [
      makeInstallment({ number: 1, status: InstallmentStatus.PAID, amountPaid: 370, dueDate: '2026-05-29' }),
      makeInstallment({ number: 2, status: InstallmentStatus.PAID, amountPaid: 370, dueDate: '2026-06-29' }),
    ];

    const plan = planScheduleReplacement({
      loanId: LOAN_ID,
      model: LoanModel.PRICE,
      existing: paid,
      generated: makeGenerated(6),
    });

    expect(plan.toCreate.map(inst => inst.number)).toEqual([3, 4, 5, 6]);
    expect(getFinalScheduleNumbers(plan)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('nunca apaga parcela com dinheiro registrado', () => {
    const partial = makeInstallment({
      number: 2,
      status: InstallmentStatus.PARTIAL,
      amountPaid: 150,
    });

    const plan = planScheduleReplacement({
      loanId: LOAN_ID,
      model: LoanModel.PRICE,
      existing: [
        makeInstallment({ number: 1, status: InstallmentStatus.PAID, amountPaid: 300 }),
        partial,
        makeInstallment({ id: 'pend-3', number: 3 }),
      ],
      generated: makeGenerated(3),
    });

    expect(plan.toDelete.map(inst => inst.id)).toEqual(['pend-3']);
    expect(plan.preserved.map(inst => inst.id)).toContain(partial.id);
  });

  it('gera cronograma completo quando não há nada pago', () => {
    const plan = planScheduleReplacement({
      loanId: LOAN_ID,
      model: LoanModel.PRICE,
      existing: [makeInstallment({ id: 'pend-1', number: 1 })],
      generated: makeGenerated(6),
    });

    expect(plan.preserved).toHaveLength(0);
    expect(plan.toDelete).toHaveLength(1);
    expect(plan.toCreate.map(inst => inst.number)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('ignora parcelas de outros empréstimos', () => {
    const outro = makeInstallment({ id: 'outro', number: 1, loanId: 'loan-2' });

    const plan = planScheduleReplacement({
      loanId: LOAN_ID,
      model: LoanModel.PRICE,
      existing: [outro, makeInstallment({ id: 'pend-1', number: 1 })],
      generated: makeGenerated(2),
    });

    expect(plan.toDelete.map(inst => inst.id)).toEqual(['pend-1']);
    expect(plan.preserved).toHaveLength(0);
  });

  it('não cria parcela quando todas as previstas já foram pagas', () => {
    const paid = Array.from({ length: 3 }, (_, index) =>
      makeInstallment({
        number: index + 1,
        status: InstallmentStatus.PAID,
        amountPaid: 100,
      }),
    );

    const plan = planScheduleReplacement({
      loanId: LOAN_ID,
      model: LoanModel.PRICE,
      existing: paid,
      generated: makeGenerated(3),
    });

    expect(plan.toCreate).toHaveLength(0);
    expect(getFinalScheduleNumbers(plan)).toEqual([1, 2, 3]);
  });
});

describe('planScheduleReplacement — INTEREST_ONLY', () => {
  it('substitui a cobrança aberta sem duplicar a numeração', () => {
    const existing = [
      makeInstallment({ number: 1, status: InstallmentStatus.PAID, amountPaid: 150, dueDate: '2026-06-12' }),
      makeInstallment({ number: 2, status: InstallmentStatus.PAID, amountPaid: 150, dueDate: '2026-07-12' }),
      makeInstallment({ id: 'pend-3', number: 3, dueDate: '2026-08-12' }),
    ];

    const plan = planScheduleReplacement({
      loanId: LOAN_ID,
      model: LoanModel.INTEREST_ONLY,
      existing,
      generated: makeGenerated(1),
    });

    expect(plan.toDelete.map(inst => inst.id)).toEqual(['pend-3']);
    expect(plan.toCreate.map(inst => inst.number)).toEqual([3]);
    expect(getFinalScheduleNumbers(plan)).toEqual([1, 2, 3]);
  });

  it('mantém a cobrança do mês mesmo quando todas as anteriores estão pagas', () => {
    const plan = planScheduleReplacement({
      loanId: LOAN_ID,
      model: LoanModel.INTEREST_ONLY,
      existing: [
        makeInstallment({ number: 1, status: InstallmentStatus.PAID, amountPaid: 150 }),
        makeInstallment({ number: 2, status: InstallmentStatus.PAID, amountPaid: 150 }),
      ],
      generated: makeGenerated(1),
    });

    expect(plan.toCreate.map(inst => inst.number)).toEqual([3]);
  });
});

describe('getFinalScheduleNumbers', () => {
  it('não retorna número repetido no cronograma final', () => {
    const plan = planScheduleReplacement({
      loanId: LOAN_ID,
      model: LoanModel.PRICE,
      existing: [
        makeInstallment({ number: 1, status: InstallmentStatus.PAID, amountPaid: 404 }),
        makeInstallment({ number: 2, status: InstallmentStatus.PAID, amountPaid: 404 }),
        makeInstallment({ id: 'pend-3', number: 3 }),
      ],
      generated: makeGenerated(12),
    });

    const numbers = getFinalScheduleNumbers(plan);
    expect(new Set(numbers).size).toBe(numbers.length);
  });
});
