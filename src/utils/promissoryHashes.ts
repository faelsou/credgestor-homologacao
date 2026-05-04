import { LoanModel } from '@/types';

/** Hashes por parcela: #1/120#, #2/120#, … (total com 3 dígitos). Usado na nota oficial e no hash de referência do empréstimo. */
export function generateSequentialHashes(installmentsCount: number): string[] {
  const n = Math.max(1, Math.floor(installmentsCount || 1));
  const hashes: string[] = [];
  const totalParcels = n.toString().padStart(3, '0');
  for (let i = 1; i <= n; i++) {
    hashes.push(`#${i}/${totalParcels}#`);
  }
  return hashes;
}

/** Total de parcelas refletido na hash da nota (somente juros gera 1 parcela real). */
export function promissoryIdentifyingTotal(loanModel: LoanModel, installmentsCount: number): number {
  return loanModel === LoanModel.INTEREST_ONLY ? 1 : Math.max(1, Math.floor(installmentsCount || 1));
}
