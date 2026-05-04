// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { LoanModel } from '@/types';
import { generateSequentialHashes, promissoryIdentifyingTotal } from './promissoryHashes';

describe('generateSequentialHashes', () => {
  it('gera 120 hashes com total 120 para empréstimo de 120 parcelas', () => {
    const hashes = generateSequentialHashes(120);
    expect(hashes).toHaveLength(120);
    expect(hashes[0]).toBe('#1/120#');
    expect(hashes[119]).toBe('#120/120#');
  });

  it('mantém total com 3 dígitos (padding) para quantidades menores que 100', () => {
    const hashes = generateSequentialHashes(5);
    expect(hashes).toHaveLength(5);
    expect(hashes[0]).toBe('#1/005#');
    expect(hashes[4]).toBe('#5/005#');
  });

  it('uma parcela gera #1/001#', () => {
    expect(generateSequentialHashes(1)).toEqual(['#1/001#']);
  });

  it('normaliza contagens inválidas para 1 parcela', () => {
    expect(generateSequentialHashes(0)).toEqual(['#1/001#']);
    expect(generateSequentialHashes(-10)).toEqual(['#1/001#']);
    expect(generateSequentialHashes(NaN)).toEqual(['#1/001#']);
  });
});

describe('promissoryIdentifyingTotal', () => {
  it('Price usa a quantidade de parcelas do formulário (até 120)', () => {
    expect(promissoryIdentifyingTotal(LoanModel.PRICE, 120)).toBe(120);
    expect(promissoryIdentifyingTotal(LoanModel.PRICE, 12)).toBe(12);
  });

  it('Somente juros usa total 1 na hash (uma parcela gerada)', () => {
    expect(promissoryIdentifyingTotal(LoanModel.INTEREST_ONLY, 48)).toBe(1);
    expect(promissoryIdentifyingTotal(LoanModel.INTEREST_ONLY, 120)).toBe(1);
  });

  it('Price normaliza mínimo 1', () => {
    expect(promissoryIdentifyingTotal(LoanModel.PRICE, 0)).toBe(1);
  });
});
