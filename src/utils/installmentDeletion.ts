import { Installment, UserRole } from '@/types';
import { hasFinancialEvidence } from '@/utils/loanScheduleReplacement';
import { formatCurrency, formatDate } from '@/utils';

/**
 * Regras de exclusão de parcela individual.
 *
 * Excluir parcela é irreversível pela interface, então recebimento registrado
 * nunca pode ser apagado por aqui: seria perda de histórico financeiro. Casos
 * assim exigem conferência (estorno/ajuste), não exclusão.
 */

export type InstallmentDeletionCheck = {
  allowed: boolean;
  /** Motivo do bloqueio — preenchido quando `allowed` é false. */
  reason?: string;
  /** Alerta a exibir na confirmação — preenchido quando `allowed` é true. */
  warning?: string;
};

function hasScheduledPromise(installment: Installment): boolean {
  return Boolean(
    installment.promisedPaymentDate ||
      installment.promisedPaymentAmount ||
      installment.promisedPaymentReason ||
      installment.promisedPaymentHistory?.length,
  );
}

export function canDeleteInstallment(params: {
  installment: Installment;
  loanInstallments: readonly Installment[];
  userRole?: UserRole;
}): InstallmentDeletionCheck {
  const { installment, loanInstallments, userRole } = params;

  if (userRole !== UserRole.ADMIN) {
    return {
      allowed: false,
      reason: 'Apenas administradores podem excluir parcelas.',
    };
  }

  if (hasFinancialEvidence(installment)) {
    return {
      allowed: false,
      reason:
        'Esta parcela tem recebimento registrado e não pode ser excluída — ' +
        'excluir apagaria o histórico de pagamento. Confira o valor recebido antes de qualquer ajuste.',
    };
  }

  const sameLoan = loanInstallments.filter(inst => inst.loanId === installment.loanId);
  if (sameLoan.length <= 1) {
    return {
      allowed: false,
      reason:
        'É a única parcela do empréstimo. Para encerrar a cobrança, exclua o empréstimo.',
    };
  }

  if (hasScheduledPromise(installment)) {
    return {
      allowed: true,
      warning: 'Há um agendamento de recebimento nesta parcela que será perdido.',
    };
  }

  return { allowed: true };
}

/** Texto de confirmação com os dados que identificam a parcela. */
export function buildDeletionConfirmation(params: {
  installment: Installment;
  clientName?: string;
  warning?: string;
}): string {
  const { installment, clientName, warning } = params;
  const cliente = clientName ? ` de ${clientName}` : '';

  const base =
    `Excluir a parcela ${installment.number}${cliente}?\n\n` +
    `Vencimento: ${formatDate(installment.dueDate)}\n` +
    `Valor: ${formatCurrency(installment.amount)}\n\n` +
    'Esta ação não pode ser desfeita.';

  return warning ? `${base}\n\nATENÇÃO: ${warning}` : base;
}
