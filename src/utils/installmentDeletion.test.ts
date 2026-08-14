// @vitest-environment node
import { describe, it, expect } from 'vitest';
import {
  canDeleteInstallment,
  buildDeletionConfirmation,
} from './installmentDeletion';
import { Installment, InstallmentStatus, UserRole } from '@/types';

const LOAN_ID = 'loan-1';

function makeInstallment(overrides: Partial<Installment> = {}): Installment {
  return {
    id: 'inst-1',
    loanId: LOAN_ID,
    clientId: 'client-1',
    number: 3,
    dueDate: '2026-08-10',
    amount: 404,
    amountPaid: 0,
    status: InstallmentStatus.PENDING,
    ...overrides,
  };
}

/** Duas parcelas garantem que a regra "última parcela" não interfira. */
function loanWith(installment: Installment): Installment[] {
  return [installment, makeInstallment({ id: 'outra', number: 99 })];
}

describe('canDeleteInstallment', () => {
  it('permite excluir parcela pendente sem recebimento (administrador)', () => {
    const inst = makeInstallment();
    const result = canDeleteInstallment({
      installment: inst,
      loanInstallments: loanWith(inst),
      userRole: UserRole.ADMIN,
    });

    expect(result.allowed).toBe(true);
  });

  it('permite excluir parcela em atraso sem recebimento', () => {
    const inst = makeInstallment({ status: InstallmentStatus.LATE });
    const result = canDeleteInstallment({
      installment: inst,
      loanInstallments: loanWith(inst),
      userRole: UserRole.ADMIN,
    });

    expect(result.allowed).toBe(true);
  });

  it('bloqueia para quem não é administrador', () => {
    const inst = makeInstallment();
    const result = canDeleteInstallment({
      installment: inst,
      loanInstallments: loanWith(inst),
      userRole: UserRole.COLLECTION,
    });

    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      expect(result.reason).toMatch(/administrador/i);
    }
  });

  it('bloqueia quando o papel do usuário é desconhecido', () => {
    const inst = makeInstallment();
    const result = canDeleteInstallment({
      installment: inst,
      loanInstallments: loanWith(inst),
      userRole: undefined,
    });

    expect(result.allowed).toBe(false);
  });

  it('bloqueia parcela quitada (perderia o recebimento)', () => {
    const inst = makeInstallment({
      status: InstallmentStatus.PAID,
      amountPaid: 404,
    });
    const result = canDeleteInstallment({
      installment: inst,
      loanInstallments: loanWith(inst),
      userRole: UserRole.ADMIN,
    });

    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      expect(result.reason).toMatch(/recebimento/i);
    }
  });

  it('bloqueia parcela com recebimento parcial', () => {
    const inst = makeInstallment({
      status: InstallmentStatus.PARTIAL,
      amountPaid: 100,
    });
    const result = canDeleteInstallment({
      installment: inst,
      loanInstallments: loanWith(inst),
      userRole: UserRole.ADMIN,
    });

    expect(result.allowed).toBe(false);
  });

  it('bloqueia parcela pendente que tem histórico de pagamento', () => {
    const inst = makeInstallment({
      paymentHistory: [
        {
          amount: 50,
          interestPaid: 50,
          principalPaid: 0,
          paymentDate: '2026-08-01',
          createdAt: '2026-08-01T00:00:00.000Z',
        },
      ],
    });
    const result = canDeleteInstallment({
      installment: inst,
      loanInstallments: loanWith(inst),
      userRole: UserRole.ADMIN,
    });

    expect(result.allowed).toBe(false);
  });

  it('bloqueia quando é a única parcela do empréstimo', () => {
    const inst = makeInstallment();
    const result = canDeleteInstallment({
      installment: inst,
      loanInstallments: [inst],
      userRole: UserRole.ADMIN,
    });

    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      expect(result.reason).toMatch(/única parcela/i);
    }
  });

  it('avisa que o acordo agendado será perdido, mas permite', () => {
    const inst = makeInstallment({
      promisedPaymentDate: '2026-08-25',
      promisedPaymentAmount: 404,
      promisedPaymentReason: 'Cliente pediu prazo',
    });
    const result = canDeleteInstallment({
      installment: inst,
      loanInstallments: loanWith(inst),
      userRole: UserRole.ADMIN,
    });

    expect(result.allowed).toBe(true);
    if (result.allowed) {
      expect(result.warning).toMatch(/agendamento|acordo/i);
    }
  });

  it('considera apenas parcelas do mesmo empréstimo na regra da única parcela', () => {
    const inst = makeInstallment();
    const outroEmprestimo = makeInstallment({ id: 'x', loanId: 'loan-2' });
    const result = canDeleteInstallment({
      installment: inst,
      loanInstallments: [inst, outroEmprestimo],
      userRole: UserRole.ADMIN,
    });

    expect(result.allowed).toBe(false);
  });
});

describe('buildDeletionConfirmation', () => {
  it('identifica parcela, vencimento e valor na confirmação', () => {
    const message = buildDeletionConfirmation({
      installment: makeInstallment(),
      clientName: 'JOELMA TAVARES DA SILVA',
    });

    expect(message).toContain('3');
    expect(message).toContain('JOELMA TAVARES DA SILVA');
    expect(message).toContain('404');
  });

  it('inclui o aviso quando existe agendamento', () => {
    const message = buildDeletionConfirmation({
      installment: makeInstallment({ promisedPaymentDate: '2026-08-25' }),
      clientName: 'ILIDIO',
      warning: 'Há agendamento de recebimento que será perdido.',
    });

    expect(message).toContain('agendamento');
  });

  it('funciona sem nome de cliente conhecido', () => {
    const message = buildDeletionConfirmation({
      installment: makeInstallment(),
    });

    expect(message.length).toBeGreaterThan(0);
  });
});
