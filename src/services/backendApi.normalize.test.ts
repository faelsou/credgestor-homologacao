// @vitest-environment node
import { describe, it, expect } from 'vitest';
import {
  normalizeApiInstallment,
  parseOptionalNumber,
  toNullableNumber,
} from './backendApi';

describe('parseOptionalNumber', () => {
  it('preserva zero (não trata como vazio)', () => {
    expect(parseOptionalNumber(0)).toBe(0);
    expect(parseOptionalNumber(null, 0)).toBe(0);
    expect(parseOptionalNumber(undefined, 0)).toBe(0);
  });

  it('retorna undefined quando ausente', () => {
    expect(parseOptionalNumber(undefined)).toBeUndefined();
    expect(parseOptionalNumber(null)).toBeUndefined();
    expect(parseOptionalNumber('')).toBeUndefined();
    expect(parseOptionalNumber(null, undefined, '')).toBeUndefined();
  });

  it('aceita string numérica e preferência snake_case', () => {
    expect(parseOptionalNumber('100.5')).toBe(100.5);
    expect(parseOptionalNumber(null, '42')).toBe(42);
  });
});

describe('toNullableNumber', () => {
  it('preserva zero ao gravar', () => {
    expect(toNullableNumber(0)).toBe(0);
  });

  it('converte undefined/null em null', () => {
    expect(toNullableNumber(undefined)).toBeNull();
    expect(toNullableNumber(null)).toBeNull();
  });
});

describe('normalizeApiInstallment', () => {
  it('preserva interest_amount e principal_amount iguais a zero', () => {
    const normalized = normalizeApiInstallment({
      id: '2031eb6e-c3a0-4672-b49b-de413e4f458b',
      loan_id: 'loan-1',
      client_id: 'client-1',
      number: 1,
      due_date: '2026-01-01',
      amount: 1100,
      amount_paid: 0,
      interest_amount: 0,
      principal_amount: 1000,
      status: 'PENDING',
    });

    expect(normalized.interestAmount).toBe(0);
    expect(normalized.principalAmount).toBe(1000);
    expect(normalized.amount).toBe(1100);
  });

  it('usa fallback camelCase quando snake_case ausente', () => {
    const normalized = normalizeApiInstallment({
      id: 'id-1',
      loanId: 'loan-1',
      clientId: 'client-1',
      number: 2,
      dueDate: '2026-02-01',
      amount: 200,
      amountPaid: 0,
      interestAmount: 0,
      principalAmount: 0,
      status: 'PENDING',
    });

    expect(normalized.interestAmount).toBe(0);
    expect(normalized.principalAmount).toBe(0);
  });

  it('deixa undefined quando juros/principal não vêm da API', () => {
    const normalized = normalizeApiInstallment({
      id: 'id-2',
      loan_id: 'loan-1',
      client_id: 'client-1',
      number: 3,
      due_date: '2026-03-01',
      amount: 500,
      amount_paid: 0,
      status: 'PENDING',
    });

    expect(normalized.interestAmount).toBeUndefined();
    expect(normalized.principalAmount).toBeUndefined();
  });
});
