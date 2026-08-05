// @vitest-environment node
import { describe, it, expect, beforeEach } from 'vitest';
import {
  INACTIVITY_TIMEOUT_MS,
  LAST_ACTIVITY_KEY,
  isSessionExpiredByInactivity,
  readLastActivityAt,
  writeLastActivityAt,
  clearLastActivityAt,
  shouldBlockSessionRestore,
  remainingInactivityMs,
} from './sessionInactivity';

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

describe('sessionInactivity', () => {
  let storage: Storage;

  beforeEach(() => {
    storage = createMemoryStorage();
  });

  describe('isSessionExpiredByInactivity', () => {
    it('expira quando passaram mais de 15 minutos', () => {
      const lastActivityAt = 1_000_000;
      const now = lastActivityAt + INACTIVITY_TIMEOUT_MS + 1;
      expect(isSessionExpiredByInactivity(lastActivityAt, now)).toBe(true);
    });

    it('não expira exatamente no limite de 15 minutos', () => {
      const lastActivityAt = 1_000_000;
      const now = lastActivityAt + INACTIVITY_TIMEOUT_MS;
      expect(isSessionExpiredByInactivity(lastActivityAt, now)).toBe(false);
    });

    it('expira quando lastActivityAt está ausente', () => {
      expect(isSessionExpiredByInactivity(null, Date.now())).toBe(true);
      expect(isSessionExpiredByInactivity(undefined, Date.now())).toBe(true);
      expect(isSessionExpiredByInactivity(Number.NaN, Date.now())).toBe(true);
    });
  });

  describe('storage helpers', () => {
    it('grava e lê lastActivityAt', () => {
      writeLastActivityAt(storage, 1_234_567);
      expect(storage.getItem(LAST_ACTIVITY_KEY)).toBe('1234567');
      expect(readLastActivityAt(storage)).toBe(1_234_567);
    });

    it('retorna null para valor inválido ou ausente', () => {
      expect(readLastActivityAt(storage)).toBeNull();
      storage.setItem(LAST_ACTIVITY_KEY, 'abc');
      expect(readLastActivityAt(storage)).toBeNull();
    });

    it('limpa lastActivityAt', () => {
      writeLastActivityAt(storage, 99);
      clearLastActivityAt(storage);
      expect(readLastActivityAt(storage)).toBeNull();
    });
  });

  describe('shouldBlockSessionRestore', () => {
    it('bloqueia restore quando não há registro de atividade', () => {
      expect(shouldBlockSessionRestore(storage, Date.now())).toBe(true);
    });

    it('bloqueia restore após 15 minutos sem atividade', () => {
      const lastActivityAt = 5_000_000;
      writeLastActivityAt(storage, lastActivityAt);
      expect(
        shouldBlockSessionRestore(storage, lastActivityAt + INACTIVITY_TIMEOUT_MS + 1),
      ).toBe(true);
    });

    it('permite restore dentro da janela de 15 minutos', () => {
      const lastActivityAt = 5_000_000;
      writeLastActivityAt(storage, lastActivityAt);
      expect(
        shouldBlockSessionRestore(storage, lastActivityAt + INACTIVITY_TIMEOUT_MS - 1),
      ).toBe(false);
    });
  });

  describe('remainingInactivityMs', () => {
    it('calcula o tempo restante até o logout', () => {
      const lastActivityAt = 1_000_000;
      expect(remainingInactivityMs(lastActivityAt, lastActivityAt)).toBe(INACTIVITY_TIMEOUT_MS);
      expect(remainingInactivityMs(lastActivityAt, lastActivityAt + 60_000)).toBe(
        INACTIVITY_TIMEOUT_MS - 60_000,
      );
    });

    it('nunca retorna negativo', () => {
      const lastActivityAt = 1_000_000;
      expect(
        remainingInactivityMs(lastActivityAt, lastActivityAt + INACTIVITY_TIMEOUT_MS + 5_000),
      ).toBe(0);
    });
  });
});
