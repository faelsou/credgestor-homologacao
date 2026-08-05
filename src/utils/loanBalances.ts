import {
  Installment,
  InstallmentStatus,
  Loan,
  LoanModel,
  LoanStatus,
} from '@/types';

/** Soma o capital amortizado via histórico de pagamentos. */
export function sumPrincipalPaid(installments: readonly Installment[]): number {
  return installments.reduce((sum, inst) => {
    if (!inst.paymentHistory?.length) return sum;
    return (
      sum +
      inst.paymentHistory.reduce((pSum, entry) => pSum + (entry.principalPaid || 0), 0)
    );
  }, 0);
}

/** Há parcela com saldo ainda a receber (não PAID e amountPaid < amount). */
export function hasPendingInstallmentBalance(
  installments: readonly Installment[],
): boolean {
  return installments.some(
    inst =>
      inst.status !== InstallmentStatus.PAID &&
      (inst.amountPaid || 0) < (inst.amount || 0),
  );
}

function roundMoney(value: number): number {
  return Number(value.toFixed(2));
}

function outstandingInterestOnly(
  loan: Loan,
  installments: readonly Installment[],
): number {
  const pendingCapital = Math.max(0, loan.amount - sumPrincipalPaid(installments));
  const calculatedInterest = roundMoney(pendingCapital * (loan.interestRate / 100));

  const openCharges = installments
    .filter(
      inst =>
        inst.status !== InstallmentStatus.PAID &&
        (inst.amountPaid || 0) < (inst.amount || 0),
    )
    .reduce(
      (sum, inst) => sum + Math.max(0, (inst.amount || 0) - (inst.amountPaid || 0)),
      0,
    );

  // Capital + o maior entre juros do mês e cobranças em aberto (captura multa/atraso)
  const monthlyCharges = Math.max(calculatedInterest, openCharges);
  return roundMoney(pendingCapital + monthlyCharges);
}

function outstandingPrice(
  loan: Loan,
  installments: readonly Installment[],
): number {
  const totalPaid = installments.reduce((sum, inst) => sum + (inst.amountPaid || 0), 0);
  return roundMoney(Math.max(0, loan.totalAmount - totalPaid));
}

/**
 * Valor em aberto exibido na listagem / recebimento.
 * INTEREST_ONLY: capital pendente + cobranças abertas (não multiplica juros por N parcelas).
 * Não confia só em loan.status === PAID (tipo A: PAID com parcela pendente).
 */
export function calculateLoanOutstandingAmount(
  loan: Loan,
  installments: readonly Installment[],
): number {
  const related = installments.filter(inst => inst.loanId === loan.id);
  const pending = hasPendingInstallmentBalance(related);

  if (loan.status === LoanStatus.PAID && !pending) {
    return 0;
  }

  if (related.length === 0) {
    return roundMoney(loan.totalAmount);
  }

  if (loan.model === LoanModel.INTEREST_ONLY) {
    return outstandingInterestOnly(loan, related);
  }

  return outstandingPrice(loan, related);
}

/**
 * Status exibido na listagem de empréstimos.
 * INTEREST_ONLY: capital quitado (via paymentHistory) E sem parcela com saldo.
 * Não usa principalAmount/interestAmount estáticos das parcelas — esses campos
 * permanecem preenchidos mesmo após quitação e geravam "Em Aberto" com R$ 0,00.
 */
export function calculateLoanDisplayStatus(
  loan: Loan,
  installments: readonly Installment[],
): LoanStatus {
  const related = installments.filter(inst => inst.loanId === loan.id);

  if (related.length === 0) {
    return LoanStatus.ACTIVE;
  }

  if (loan.model === LoanModel.INTEREST_ONLY) {
    const capitalPaid = sumPrincipalPaid(related) >= loan.amount;
    const pending = hasPendingInstallmentBalance(related);
    return capitalPaid && !pending ? LoanStatus.PAID : LoanStatus.ACTIVE;
  }

  const allPaid = related.every(
    inst => inst.status === InstallmentStatus.PAID || inst.amount <= 0,
  );
  return allPaid ? LoanStatus.PAID : LoanStatus.ACTIVE;
}
