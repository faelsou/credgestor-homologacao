/** Preferências de UI: pagamentos ocultos no histórico por cliente (não apaga dados). */
export const HIDDEN_PAYMENT_HISTORY_KEY_PREFIX = 'credgestor:hidden-payment-history';

export function buildPaymentHistoryEntryId(installmentId: string, createdAt: string): string {
  return `${installmentId}:${createdAt}`;
}

export function storageKeyForHiddenPayments(scopeId?: string | null): string {
  if (!scopeId) return HIDDEN_PAYMENT_HISTORY_KEY_PREFIX;
  return `${HIDDEN_PAYMENT_HISTORY_KEY_PREFIX}:${scopeId}`;
}

export function hidePaymentEntry(current: ReadonlySet<string>, entryId: string): Set<string> {
  const next = new Set(current);
  next.add(entryId);
  return next;
}

export function hidePaymentEntries(
  current: ReadonlySet<string>,
  entryIds: readonly string[],
): Set<string> {
  const next = new Set(current);
  for (const id of entryIds) {
    next.add(id);
  }
  return next;
}

export function clearHiddenPaymentIds(): Set<string> {
  return new Set();
}

export function isPaymentHidden(hiddenIds: ReadonlySet<string>, entryId: string): boolean {
  return hiddenIds.has(entryId);
}

export function summarizePaymentHistoryGroups(
  groups: Record<string, readonly unknown[]>,
): { clientCount: number; paymentCount: number } {
  const clientCount = Object.keys(groups).length;
  const paymentCount = Object.values(groups).reduce(
    (sum, entries) => sum + entries.length,
    0,
  );
  return { clientCount, paymentCount };
}

export function buildClientPaymentHistoryToggleLabel(params: {
  expanded: boolean;
  clientCount: number;
  paymentCount: number;
}): string {
  const { expanded, clientCount, paymentCount } = params;
  if (expanded) {
    return 'Ocultar histórico de pagamentos por cliente';
  }

  const clientLabel = clientCount === 1 ? 'cliente' : 'clientes';
  const paymentLabel = paymentCount === 1 ? 'pagamento' : 'pagamentos';
  return `Ver histórico de pagamentos por cliente (${clientCount} ${clientLabel} · ${paymentCount} ${paymentLabel})`;
}

export function readHiddenPaymentIds(
  storage: Storage = localStorage,
  scopeId?: string | null,
): Set<string> {
  try {
    const raw = storage.getItem(storageKeyForHiddenPayments(scopeId));
    if (!raw) return new Set();
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((id): id is string => typeof id === 'string'));
  } catch {
    return new Set();
  }
}

export function writeHiddenPaymentIds(
  storage: Storage = localStorage,
  ids: ReadonlySet<string>,
  scopeId?: string | null,
): void {
  storage.setItem(storageKeyForHiddenPayments(scopeId), JSON.stringify([...ids]));
}
