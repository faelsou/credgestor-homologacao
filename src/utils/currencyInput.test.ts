// @vitest-environment node
import { describe, it, expect } from 'vitest';
import {
  formatCurrencyInput,
  sanitizeCurrencyInput,
  parseCurrencyInput,
  buildInvalidReceiveAmountAlert,
} from './currencyInput';

describe('currencyInput', () => {
  describe('formatCurrencyInput', () => {
    it('formats with two decimal places and comma separator', () => {
      expect(formatCurrencyInput(200)).toBe('200,00');
      expect(formatCurrencyInput(200.5)).toBe('200,50');
      expect(formatCurrencyInput(0)).toBe('0,00');
      expect(formatCurrencyInput(1234.56)).toBe('1234,56');
    });

    it('returns empty string for invalid values', () => {
      expect(formatCurrencyInput(Number.NaN)).toBe('');
      expect(formatCurrencyInput(-10)).toBe('');
    });
  });

  describe('sanitizeCurrencyInput', () => {
    it('keeps only digits and a single comma decimal separator', () => {
      expect(sanitizeCurrencyInput('200')).toBe('200');
      expect(sanitizeCurrencyInput('200,5')).toBe('200,5');
      expect(sanitizeCurrencyInput('200.50')).toBe('200,50');
      expect(sanitizeCurrencyInput('R$ 200,50')).toBe('200,50');
      expect(sanitizeCurrencyInput('200,505')).toBe('200,50');
      expect(sanitizeCurrencyInput('12.3.4')).toBe('12,34');
    });

    it('allows intermediate typing states', () => {
      expect(sanitizeCurrencyInput('200,')).toBe('200,');
      expect(sanitizeCurrencyInput(',5')).toBe('0,5');
    });
  });

  describe('parseCurrencyInput', () => {
    it('parses Brazilian decimal text to number', () => {
      expect(parseCurrencyInput('200')).toBe(200);
      expect(parseCurrencyInput('200,00')).toBe(200);
      expect(parseCurrencyInput('200,50')).toBe(200.5);
      expect(parseCurrencyInput('1234,56')).toBe(1234.56);
      expect(parseCurrencyInput('99.9')).toBe(99.9);
    });

    it('returns null for empty or invalid input', () => {
      expect(parseCurrencyInput('')).toBeNull();
      expect(parseCurrencyInput('abc')).toBeNull();
      expect(parseCurrencyInput(',')).toBeNull();
    });
  });

  describe('buildInvalidReceiveAmountAlert', () => {
    it('points out informed value, expected value and error reason', () => {
      const message = buildInvalidReceiveAmountAlert({
        informedAmount: 150,
        expectedAmount: 200,
        reason: 'Para empréstimos PRICE, o valor a receber deve ser igual ao valor da parcela.',
      });

      expect(message).toContain('Valor inserido incorretamente.');
      expect(message).toContain('Valor informado: R$ 150,00');
      expect(message).toContain('Valor esperado: R$ 200,00');
      expect(message).toContain('Erro: Para empréstimos PRICE');
    });
  });
});
