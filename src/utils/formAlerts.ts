import { formatCurrencyInput } from './currencyInput';

export type FormAlertParams = {
  title?: string;
  field?: string;
  informed?: string;
  expected?: string;
  reason: string;
};

/** Builds a clear multi-line alert for wrong form filling. */
export const buildFormFieldAlert = (params: FormAlertParams): string => {
  const title = params.title?.trim() || 'Preenchimento incorreto.';
  const lines = [title, ''];

  if (params.field) {
    lines.push(`Campo: ${params.field}`);
  }
  if (params.informed !== undefined && params.informed !== '') {
    lines.push(`Valor informado: ${params.informed}`);
  }
  if (params.expected !== undefined && params.expected !== '') {
    lines.push(`Valor esperado: ${params.expected}`);
  }

  if (params.field || params.informed || params.expected) {
    lines.push('');
  }

  lines.push(`Erro: ${params.reason}`);
  return lines.join('\n');
};

/** Builds a clear alert when a payment/receive amount is wrong. */
export const buildInvalidReceiveAmountAlert = (params: {
  informedAmount: number;
  expectedAmount?: number;
  reason: string;
}): string => {
  const informed = formatCurrencyInput(params.informedAmount);
  return buildFormFieldAlert({
    title: 'Valor inserido incorretamente.',
    field: 'Valor a receber',
    informed: `R$ ${informed || '—'}`,
    expected:
      params.expectedAmount !== undefined && Number.isFinite(params.expectedAmount)
        ? `R$ ${formatCurrencyInput(params.expectedAmount)}`
        : undefined,
    reason: params.reason,
  });
};

export type LoanFormField =
  | 'clientId'
  | 'amount'
  | 'interestRate'
  | 'installmentsCount'
  | 'startDate';

export type LoanFormValues = {
  clientId: string;
  amount: number;
  interestRate: number;
  installmentsCount: number;
  startDate: string;
  maxInstallments: number;
};

export type LoanFormValidationResult =
  | { ok: true }
  | { ok: false; field: LoanFormField; message: string };

/** Validates loan simulation / create form before persist. */
export const validateLoanForm = (values: LoanFormValues): LoanFormValidationResult => {
  if (!values.clientId.trim()) {
    return {
      ok: false,
      field: 'clientId',
      message: buildFormFieldAlert({
        field: 'Cliente',
        reason: 'Selecione um cliente ativo para simular o empréstimo.',
      }),
    };
  }

  if (!Number.isFinite(values.amount) || values.amount <= 0) {
    return {
      ok: false,
      field: 'amount',
      message: buildFormFieldAlert({
        field: 'Valor (R$)',
        informed:
          Number.isFinite(values.amount) ? `R$ ${formatCurrencyInput(values.amount)}` : '—',
        expected: 'Valor maior que zero',
        reason: 'Informe um valor de empréstimo válido maior que zero.',
      }),
    };
  }

  if (!Number.isFinite(values.interestRate) || values.interestRate < 0) {
    return {
      ok: false,
      field: 'interestRate',
      message: buildFormFieldAlert({
        field: 'Juros (%)',
        informed: Number.isFinite(values.interestRate) ? String(values.interestRate) : '—',
        expected: 'Taxa maior ou igual a zero',
        reason: 'Informe uma taxa de juros válida (0 ou maior).',
      }),
    };
  }

  if (
    !Number.isFinite(values.installmentsCount) ||
    values.installmentsCount < 1 ||
    values.installmentsCount > values.maxInstallments
  ) {
    return {
      ok: false,
      field: 'installmentsCount',
      message: buildFormFieldAlert({
        field: 'Parcelas',
        informed: Number.isFinite(values.installmentsCount)
          ? String(values.installmentsCount)
          : '—',
        expected: `Entre 1 e ${values.maxInstallments}`,
        reason: `Informe um número de parcelas entre 1 e ${values.maxInstallments}.`,
      }),
    };
  }

  if (!values.startDate.trim()) {
    return {
      ok: false,
      field: 'startDate',
      message: buildFormFieldAlert({
        field: '1ª Parcela',
        reason: 'Informe a data da primeira parcela.',
      }),
    };
  }

  return { ok: true };
};
