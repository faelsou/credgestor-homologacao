/** Chave dedicada à última atividade — não deve ser apagada ao restaurar UI. */
export const LAST_ACTIVITY_KEY = 'credgestor:last-activity';

/** Tempo máximo sem interação antes de encerrar a sessão. */
export const INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000;

/** Intervalo mínimo entre gravações do timestamp de atividade. */
export const ACTIVITY_SAVE_INTERVAL_MS = 10 * 1000;

/** Intervalo de verificação absoluta (compensa setTimeout atrasado em aba em background). */
export const INACTIVITY_CHECK_INTERVAL_MS = 30 * 1000;

export function isSessionExpiredByInactivity(
  lastActivityAt: number | null | undefined,
  now: number = Date.now(),
  timeoutMs: number = INACTIVITY_TIMEOUT_MS,
): boolean {
  if (lastActivityAt == null || !Number.isFinite(lastActivityAt)) {
    return true;
  }
  return now - lastActivityAt > timeoutMs;
}

export function readLastActivityAt(storage: Storage = localStorage): number | null {
  try {
    const raw = storage.getItem(LAST_ACTIVITY_KEY);
    if (!raw) return null;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function writeLastActivityAt(
  storage: Storage = localStorage,
  timestamp: number = Date.now(),
): void {
  storage.setItem(LAST_ACTIVITY_KEY, String(timestamp));
}

export function clearLastActivityAt(storage: Storage = localStorage): void {
  storage.removeItem(LAST_ACTIVITY_KEY);
}

/** Bloqueia restauração de sessão se a atividade expirou ou nunca foi registrada. */
export function shouldBlockSessionRestore(
  storage: Storage = localStorage,
  now: number = Date.now(),
  timeoutMs: number = INACTIVITY_TIMEOUT_MS,
): boolean {
  return isSessionExpiredByInactivity(readLastActivityAt(storage), now, timeoutMs);
}

export function remainingInactivityMs(
  lastActivityAt: number,
  now: number = Date.now(),
  timeoutMs: number = INACTIVITY_TIMEOUT_MS,
): number {
  return Math.max(0, timeoutMs - (now - lastActivityAt));
}
