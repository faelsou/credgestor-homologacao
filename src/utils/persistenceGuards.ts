/**
 * Regras de persistência financeira: evita "sucesso fantasma"
 * (UI atualiza localmente quando o backend falhou).
 */

export type PersistenceResult =
  | { ok: true; warning?: string }
  | { ok: false; error: string };

/** Com backend ativo, nunca aplicar só estado local após falha da API. */
export function canApplyLocalFallback(backendConfigured: boolean): boolean {
  return !backendConfigured;
}

/** Modal de recebimento só fecha quando a baixa persistiu. */
export function shouldCloseReceiveModal(result: PersistenceResult): boolean {
  return result.ok;
}

export function persistenceSuccess(warning?: string): PersistenceResult {
  return warning ? { ok: true, warning } : { ok: true };
}

export function persistenceFailure(error: string): PersistenceResult {
  return { ok: false, error };
}

/**
 * Decide se o estado local pode refletir a operação após tentativa de save.
 * - Sem backend: sempre pode (modo local).
 * - Com backend: só se a API confirmou sucesso.
 */
export function shouldApplyLocalState(params: {
  backendConfigured: boolean;
  backendSucceeded: boolean;
}): boolean {
  if (!params.backendConfigured) return true;
  return params.backendSucceeded;
}
