import { Installment, InstallmentStatus, LoanModel } from '@/types';

/**
 * Regras de substituição de cronograma ao editar um empréstimo.
 *
 * Sem essas regras a edição recriava o cronograma numerando sempre a partir de 1,
 * enquanto as parcelas já quitadas continuavam no banco — o que gerava parcelas
 * com o mesmo `number` no mesmo `loan_id` (duplicidade) e inflava a quantidade
 * de parcelas do contrato.
 */

export type ScheduleReplacementPlan = {
  /** Têm dinheiro registrado: nunca podem ser apagadas nem renumeradas. */
  preserved: Installment[];
  /** Sem recebimento: serão substituídas pelo novo cronograma. */
  toDelete: Installment[];
  /** Novas parcelas, já renumeradas para não colidir com as preservadas. */
  toCreate: Installment[];
};

/**
 * Indica recebimento registrado na parcela. Usado para decidir o que não pode
 * ser apagado — status PARTIAL/PAID e histórico de pagamento representam
 * dinheiro que já entrou.
 */
export function hasFinancialEvidence(installment: Installment): boolean {
  if (installment.status === InstallmentStatus.PAID) return true;
  if (installment.status === InstallmentStatus.PARTIAL) return true;
  if ((installment.amountPaid || 0) > 0) return true;
  return Boolean(installment.paymentHistory?.length);
}

function compareByNumber(a: Installment, b: Installment): number {
  return a.number - b.number;
}

/**
 * Quantidade de parcelas novas a criar.
 * PRICE: as preservadas já ocupam as primeiras posições do cronograma.
 * INTEREST_ONLY: o cronograma tem sempre uma única cobrança em aberto (juros do mês).
 */
function countToCreate(
  model: LoanModel,
  generatedCount: number,
  preservedCount: number,
): number {
  if (model === LoanModel.INTEREST_ONLY) {
    return Math.min(generatedCount, 1);
  }
  return Math.max(0, generatedCount - preservedCount);
}

export function planScheduleReplacement(params: {
  loanId: string;
  model: LoanModel;
  existing: readonly Installment[];
  generated: readonly Installment[];
}): ScheduleReplacementPlan {
  const { loanId, model, existing, generated } = params;

  const related = existing.filter(inst => inst.loanId === loanId);
  const preserved = related.filter(hasFinancialEvidence).slice().sort(compareByNumber);
  const toDelete = related.filter(inst => !hasFinancialEvidence(inst));

  const highestPreservedNumber = preserved.reduce(
    (max, inst) => Math.max(max, inst.number),
    0,
  );

  const total = countToCreate(model, generated.length, preserved.length);
  const toCreate = generated.slice(generated.length - total).map((inst, index) => {
    const number = highestPreservedNumber + index + 1;
    return {
      ...inst,
      id: `inst_${loanId}_${number}`,
      loanId,
      number,
    };
  });

  return { preserved, toDelete, toCreate };
}

/** Números do cronograma após a substituição — usado para validar duplicidade. */
export function getFinalScheduleNumbers(plan: ScheduleReplacementPlan): number[] {
  return [...plan.preserved, ...plan.toCreate].map(inst => inst.number).sort((a, b) => a - b);
}
