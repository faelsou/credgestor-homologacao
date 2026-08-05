// @vitest-environment node
import { describe, it, expect, beforeEach } from 'vitest';
import {
  HIDDEN_PAYMENT_HISTORY_KEY_PREFIX,
  buildPaymentHistoryEntryId,
  storageKeyForHiddenPayments,
  readHiddenPaymentIds,
  writeHiddenPaymentIds,
  hidePaymentEntry,
  hidePaymentEntries,
  clearHiddenPaymentIds,
  isPaymentHidden,
} from './hiddenPaymentHistory';

function createMemoryStorage(initial: Record<string, string> = {}): Storage {
  const store = { ...initial };
  return {
    get length() {
      return Object.keys(store).length;
    },
    clear() {
      Object.keys(store).forEach(key => {
        delete store[key];
      });
    },
    getItem(key: string) {
      return Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null;
    },
    key(index: number) {
      return Object.keys(store)[index] ?? null;
    },
    removeItem(key: string) {
      delete store[key];
    },
    setItem(key: string, value: string) {
      store[key] = String(value);
    },
  };
}

describe('hiddenPaymentHistory', () => {
  let storage: Storage;

  beforeEach(() => {
    storage = createMemoryStorage();
  });

  describe('buildPaymentHistoryEntryId', () => {
    it('combina installmentId e createdAt', () => {
      expect(buildPaymentHistoryEntryId('inst-1', '2026-08-04T10:00:00.000Z')).toBe(
        'inst-1:2026-08-04T10:00:00.000Z',
      );
    });
  });

  describe('storageKeyForHiddenPayments', () => {
    it('usa chave base sem escopo', () => {
      expect(storageKeyForHiddenPayments()).toBe(HIDDEN_PAYMENT_HISTORY_KEY_PREFIX);
      expect(storageKeyForHiddenPayments(null)).toBe(HIDDEN_PAYMENT_HISTORY_KEY_PREFIX);
      expect(storageKeyForHiddenPayments('')).toBe(HIDDEN_PAYMENT_HISTORY_KEY_PREFIX);
    });

    it('anexa escopo de tenant/usuário', () => {
      expect(storageKeyForHiddenPayments('tenant-abc')).toBe(
        `${HIDDEN_PAYMENT_HISTORY_KEY_PREFIX}:tenant-abc`,
      );
    });
  });

  describe('hide / show (imutável)', () => {
    it('hidePaymentEntry adiciona id sem mutar o Set original', () => {
      const original = new Set(['a']);
      const next = hidePaymentEntry(original, 'b');
      expect(next.has('a')).toBe(true);
      expect(next.has('b')).toBe(true);
      expect(original.has('b')).toBe(false);
      expect(next).not.toBe(original);
    });

    it('hidePaymentEntries adiciona vários ids', () => {
      const next = hidePaymentEntries(new Set(['a']), ['b', 'c']);
      expect([...next].sort()).toEqual(['a', 'b', 'c']);
    });

    it('clearHiddenPaymentIds retorna Set vazio', () => {
      const next = clearHiddenPaymentIds();
      expect(next.size).toBe(0);
    });

    it('isPaymentHidden reflete presença no Set', () => {
      const ids = new Set(['x']);
      expect(isPaymentHidden(ids, 'x')).toBe(true);
      expect(isPaymentHidden(ids, 'y')).toBe(false);
    });
  });

  describe('storage helpers', () => {
    it('grava e lê ids como array JSON', () => {
      writeHiddenPaymentIds(storage, new Set(['id-1', 'id-2']), 'tenant-1');
      const key = storageKeyForHiddenPayments('tenant-1');
      const raw = JSON.parse(storage.getItem(key)!);
      expect(raw.sort()).toEqual(['id-1', 'id-2']);

      const loaded = readHiddenPaymentIds(storage, 'tenant-1');
      expect(loaded.has('id-1')).toBe(true);
      expect(loaded.has('id-2')).toBe(true);
      expect(loaded.size).toBe(2);
    });

    it('retorna Set vazio para valor ausente ou inválido', () => {
      expect(readHiddenPaymentIds(storage, 'tenant-1').size).toBe(0);
      storage.setItem(storageKeyForHiddenPayments('tenant-1'), 'not-json');
      expect(readHiddenPaymentIds(storage, 'tenant-1').size).toBe(0);
      storage.setItem(storageKeyForHiddenPayments('tenant-1'), '{"a":1}');
      expect(readHiddenPaymentIds(storage, 'tenant-1').size).toBe(0);
    });

    it('isola escopos diferentes', () => {
      writeHiddenPaymentIds(storage, new Set(['a']), 'tenant-a');
      writeHiddenPaymentIds(storage, new Set(['b']), 'tenant-b');
      expect([...readHiddenPaymentIds(storage, 'tenant-a')]).toEqual(['a']);
      expect([...readHiddenPaymentIds(storage, 'tenant-b')]).toEqual(['b']);
    });

    it('grava array vazio ao limpar', () => {
      writeHiddenPaymentIds(storage, new Set(['x']), 't');
      writeHiddenPaymentIds(storage, clearHiddenPaymentIds(), 't');
      expect(JSON.parse(storage.getItem(storageKeyForHiddenPayments('t'))!)).toEqual([]);
    });
  });

  describe('fluxo UI: ocultar parcela → cliente → reabrir', () => {
    it('filtra e restaura pagamentos sem apagar dados de origem', () => {
      const entries = [
        { clientId: 'ester', entryId: buildPaymentHistoryEntryId('i1', '2026-08-02T10:00:00Z') },
        { clientId: 'ester', entryId: buildPaymentHistoryEntryId('i2', '2026-08-02T11:00:00Z') },
        { clientId: 'joao', entryId: buildPaymentHistoryEntryId('i3', '2026-08-03T09:00:00Z') },
      ];
      const sourceSnapshot = entries.map(e => ({ ...e }));

      let hidden = hidePaymentEntry(new Set(), entries[0].entryId);
      writeHiddenPaymentIds(storage, hidden, 'tenant-x');
      hidden = readHiddenPaymentIds(storage, 'tenant-x');

      let visible = entries.filter(e => !isPaymentHidden(hidden, e.entryId));
      expect(visible).toHaveLength(2);
      expect(visible.map(e => e.entryId)).not.toContain(entries[0].entryId);

      const esterIds = entries.filter(e => e.clientId === 'ester').map(e => e.entryId);
      hidden = hidePaymentEntries(hidden, esterIds);
      writeHiddenPaymentIds(storage, hidden, 'tenant-x');
      hidden = readHiddenPaymentIds(storage, 'tenant-x');

      visible = entries.filter(e => !isPaymentHidden(hidden, e.entryId));
      expect(visible).toEqual([entries[2]]);

      hidden = clearHiddenPaymentIds();
      writeHiddenPaymentIds(storage, hidden, 'tenant-x');
      hidden = readHiddenPaymentIds(storage, 'tenant-x');

      expect(hidden.size).toBe(0);
      expect(entries.filter(e => !isPaymentHidden(hidden, e.entryId))).toHaveLength(3);
      expect(entries).toEqual(sourceSnapshot);
    });
  });
});
