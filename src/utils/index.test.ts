import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { normalizeYmd, compareYmd, addMonthsYmd, isLate, formatDate } from './index';

describe('Date utils - YYYY-MM-DD without timezone', () => {
  const realDate = Date;
  beforeAll(() => {
    // Fixar a data do sistema para 2026-03-29
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 2, 29, 12, 0, 0)); // meses base 0
  });
  afterAll(() => {
    vi.useRealTimers();
    // restaurar Date
    // @ts-expect-error restore
    global.Date = realDate;
  });

  it('normalizeYmd should strip time from ISO or spaced format', () => {
    expect(normalizeYmd('2026-03-29T10:30:00Z')).toBe('2026-03-29');
    expect(normalizeYmd('2026-03-29 10:30:00')).toBe('2026-03-29');
    expect(normalizeYmd('2026-03-29')).toBe('2026-03-29');
  });

  it('compareYmd should order deterministically', () => {
    expect(Math.sign(compareYmd('2026-03-28', '2026-03-29'))).toBeLessThan(0);
    expect(compareYmd('2026-03-29', '2026-03-29')).toBe(0);
    expect(Math.sign(compareYmd('2026-03-30', '2026-03-29'))).toBeGreaterThan(0);
  });

  it('addMonthsYmd should preserve day when possible', () => {
    expect(addMonthsYmd('2026-01-20', 1)).toBe('2026-02-20');
    expect(addMonthsYmd('2026-02-20', 1)).toBe('2026-03-20');
  });

  it('addMonthsYmd should clamp to end-of-month where needed', () => {
    // 31/01 + 1 mês => 28/02 (2026 não é bissexto)
    expect(addMonthsYmd('2026-01-31', 1)).toBe('2026-02-28');
    // 31/01 + 13 meses => 29/02 (2027 não é bissexto; usar outro caso bissexto)
    // Usar 2024 bissexto para demonstrar 31/01/2024 + 1 => 29/02/2024
    expect(addMonthsYmd('2024-01-31', 1)).toBe('2024-02-29');
  });

  it('isLate should compare using normalized dates', () => {
    expect(isLate('2026-03-28')).toBe(true);
    expect(isLate('2026-03-29')).toBe(false);
    expect(isLate('2026-03-30')).toBe(false);
    expect(isLate('2026-03-28T23:59:59Z')).toBe(true);
  });

  it('formatDate should render in pt-BR', () => {
    expect(formatDate('2026-03-05')).toMatch(/05\/03\/2026/);
    expect(formatDate('2026-03-05T12:00:00Z')).toMatch(/05\/03\/2026/);
  });
});

