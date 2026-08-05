// @vitest-environment node
import { describe, it, expect } from 'vitest';
import {
  buildFormFieldAlert,
  buildInvalidReceiveAmountAlert,
  validateLoanForm,
} from './formAlerts';

describe('formAlerts', () => {
  describe('buildFormFieldAlert', () => {
    it('builds title, field, informed, expected and reason lines', () => {
      const message = buildFormFieldAlert({
        title: 'Preenchimento incorreto.',
        field: 'Valor (R$)',
        informed: 'R$ 0,00',
        expected: 'Valor maior que zero',
        reason: 'Informe um valor de empréstimo válido maior que zero.',
      });

      expect(message).toContain('Preenchimento incorreto.');
      expect(message).toContain('Campo: Valor (R$)');
      expect(message).toContain('Valor informado: R$ 0,00');
      expect(message).toContain('Valor esperado: Valor maior que zero');
      expect(message).toContain('Erro: Informe um valor de empréstimo válido');
    });

    it('omits optional lines when not provided', () => {
      const message = buildFormFieldAlert({
        reason: 'Selecione um cliente.',
      });

      expect(message).toBe('Preenchimento incorreto.\n\nErro: Selecione um cliente.');
    });
  });

  describe('buildInvalidReceiveAmountAlert', () => {
    it('keeps receive payment message contract', () => {
      const message = buildInvalidReceiveAmountAlert({
        informedAmount: 150,
        expectedAmount: 200,
        reason: 'Para empréstimos PRICE, o valor a receber deve ser igual ao valor da parcela.',
      });

      expect(message).toContain('Valor inserido incorretamente.');
      expect(message).toContain('Campo: Valor a receber');
      expect(message).toContain('Valor informado: R$ 150,00');
      expect(message).toContain('Valor esperado: R$ 200,00');
      expect(message).toContain('Erro: Para empréstimos PRICE');
    });
  });

  describe('validateLoanForm', () => {
    const base = {
      clientId: 'client-1',
      amount: 1000,
      interestRate: 10,
      installmentsCount: 3,
      startDate: '2026-09-05',
      maxInstallments: 120,
    };

    it('accepts a valid loan simulation form', () => {
      expect(validateLoanForm(base)).toEqual({ ok: true });
    });

    it('rejects missing client', () => {
      const result = validateLoanForm({ ...base, clientId: '' });
      expect(result.ok).toBe(false);
      if (result.ok === false) {
        expect(result.field).toBe('clientId');
        expect(result.message).toContain('Cliente');
      }
    });

    it('rejects amount zero or invalid', () => {
      const zero = validateLoanForm({ ...base, amount: 0 });
      expect(zero.ok).toBe(false);
      if (zero.ok === false) expect(zero.field).toBe('amount');

      const nan = validateLoanForm({ ...base, amount: Number.NaN });
      expect(nan.ok).toBe(false);
      if (nan.ok === false) expect(nan.field).toBe('amount');
    });

    it('rejects negative interest rate', () => {
      const result = validateLoanForm({ ...base, interestRate: -1 });
      expect(result.ok).toBe(false);
      if (result.ok === false) expect(result.field).toBe('interestRate');
    });

    it('rejects installments outside range', () => {
      const low = validateLoanForm({ ...base, installmentsCount: 0 });
      expect(low.ok).toBe(false);
      if (low.ok === false) expect(low.field).toBe('installmentsCount');

      const high = validateLoanForm({ ...base, installmentsCount: 121 });
      expect(high.ok).toBe(false);
      if (high.ok === false) expect(high.field).toBe('installmentsCount');
    });

    it('rejects missing first installment date', () => {
      const result = validateLoanForm({ ...base, startDate: '' });
      expect(result.ok).toBe(false);
      if (result.ok === false) expect(result.field).toBe('startDate');
    });
  });
});
