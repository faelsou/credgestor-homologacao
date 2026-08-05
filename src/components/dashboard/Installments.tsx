import React, { useContext, useState, useMemo, useCallback, useEffect } from 'react';
import { Search, MessageCircle, CheckCircle, Clock, AlertCircle, Pencil, FileSpreadsheet, X } from 'lucide-react';
import { AppContext } from '@/pages/App';
import {
  formatCurrency,
  formatDate,
  getTodayDateString,
  isLate,
  formatInterestRate,
  buildInvalidReceiveAmountAlert,
  buildPaymentHistoryEntryId,
  hidePaymentEntry,
  hidePaymentEntries,
  clearHiddenPaymentIds,
  isPaymentHidden,
  readHiddenPaymentIds,
  writeHiddenPaymentIds,
} from '@/utils';
import {
  calculateInterestOnlyMonthlyInterest,
  calculateLoanOutstandingAmount,
  getInstallmentPendingAmount,
  getInterestOnlyReceiveSummary,
  getPendingCapital,
} from '@/utils/loanBalances';
import { CurrencyInput } from '@/components/CurrencyInput';
import { InstallmentStatus, Installment, UserRole, LoanModel } from '@/types';

export const InstallmentsView: React.FC = () => {
  const { installments, clients, loans, payInstallment, updateInstallment, scheduleFuturePayment, user, installmentsInitialFilter, setInstallmentsInitialFilter, installmentsDateRange, setInstallmentsDateRange } = useContext(AppContext);
  const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'LATE' | 'PAID' | 'PARTIAL'>(installmentsInitialFilter || 'ALL');
  const [dateFilterStart, setDateFilterStart] = useState<string | null>(installmentsDateRange?.start || null);
  const [dateFilterEnd, setDateFilterEnd] = useState<string | null>(installmentsDateRange?.end || null);
  
  // Limpar filtro inicial após usar
  React.useEffect(() => {
    if (installmentsInitialFilter) {
      setFilter(installmentsInitialFilter);
      setInstallmentsInitialFilter(null);
    }
    if (installmentsDateRange) {
      setDateFilterStart(installmentsDateRange.start);
      setDateFilterEnd(installmentsDateRange.end);
      setInstallmentsDateRange(null);
    }
  }, [installmentsInitialFilter, setInstallmentsInitialFilter, installmentsDateRange, setInstallmentsDateRange]);
  const [selectedInstallment, setSelectedInstallment] = useState<Installment | null>(null);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentDate, setPaymentDate] = useState(getTodayDateString());
  const [promiseModal, setPromiseModal] = useState<Installment | null>(null);
  const [promiseReason, setPromiseReason] = useState('');
  const [promiseAmount, setPromiseAmount] = useState(0);
  const [promiseDate, setPromiseDate] = useState(getTodayDateString());
  const [promiseLateFee, setPromiseLateFee] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingInstallment, setEditingInstallment] = useState<Installment | null>(null);
  const [editDueDate, setEditDueDate] = useState('');
  const [editAmount, setEditAmount] = useState(0);
  const [editInterestAmount, setEditInterestAmount] = useState(0);
  const [editPrincipalAmount, setEditPrincipalAmount] = useState(0);
  const hiddenPaymentsScope = user?.tenantId || user?.id || null;
  const [hiddenPaymentIds, setHiddenPaymentIds] = useState<Set<string>>(() =>
    readHiddenPaymentIds(localStorage, hiddenPaymentsScope),
  );

  useEffect(() => {
    setHiddenPaymentIds(readHiddenPaymentIds(localStorage, hiddenPaymentsScope));
  }, [hiddenPaymentsScope]);

  const persistHiddenPaymentIds = useCallback(
    (next: Set<string>) => {
      setHiddenPaymentIds(next);
      writeHiddenPaymentIds(localStorage, next, hiddenPaymentsScope);
    },
    [hiddenPaymentsScope],
  );

  const hidePaymentFromView = useCallback(
    (entryId: string) => {
      persistHiddenPaymentIds(hidePaymentEntry(hiddenPaymentIds, entryId));
    },
    [hiddenPaymentIds, persistHiddenPaymentIds],
  );

  const hideAllClientPaymentsFromView = useCallback(
    (entryIds: string[]) => {
      persistHiddenPaymentIds(hidePaymentEntries(hiddenPaymentIds, entryIds));
    },
    [hiddenPaymentIds, persistHiddenPaymentIds],
  );

  const showAllHiddenPayments = useCallback(() => {
    persistHiddenPaymentIds(clearHiddenPaymentIds());
  }, [persistHiddenPaymentIds]);

  const getClient = (id: string) => clients.find(c => c.id === id);

  // A data exibida/considerada em telas e filtros deve refletir o agendamento de recebimento,
  // quando existir. O `dueDate` original do contrato permanece para cálculo/encadeamento.
  const getInstallmentDueDateForDisplay = useCallback((inst: Installment): string => {
    // Usar a data do agendamento (promisedPaymentDate) quando existir.
    if (inst.promisedPaymentDate) return inst.promisedPaymentDate;

    const history = inst.promisedPaymentHistory ?? [];
    if (history.length > 0) {
      const toTime = (d: string) => {
        const [y, m, day] = String(d).split('T')[0].split('-').map(Number);
        return new Date(y, m - 1, day).getTime();
      };
      return history.reduce((maxDate, entry) => (toTime(entry.date) > toTime(maxDate) ? entry.date : maxDate), history[0].date);
    }

    return inst.dueDate;
  }, []);

  // Verifica se uma parcela está realmente atrasada, considerando pagamentos
  const isActuallyLate = useCallback((inst: Installment): boolean => {
    // Se está paga, não está atrasada
    if (inst.status === InstallmentStatus.PAID) {
      return false;
    }

    // IMPORTANTE: Verificar se a parcela foi totalmente paga mesmo que tenha status LATE ou PARTIAL
    // Se foi totalmente paga, não está mais atrasada
    const totalPaid = inst.amountPaid || 0;
    const totalDue = inst.amount || 0;
    if (totalPaid >= totalDue && totalDue > 0) {
      return false;
    }

    // PRIMEIRO: Se a data de vencimento não passou, não está atrasada (independente de pagamentos)
    // Isso garante que parcelas com vencimento futuro nunca sejam consideradas atrasadas
    const displayDueDate = getInstallmentDueDateForDisplay(inst);
    if (!isLate(displayDueDate)) {
      return false;
    }

    // Se chegou aqui, a data de vencimento já passou
    // Agora verificar se há pagamentos que indicam que está em dia (cadastro retroativo)

    // Se há histórico de pagamentos, verificar se algum pagamento foi feito antes ou no dia do vencimento
    // Isso cobre casos de cadastro retroativo onde o cliente pagou em dia
    if (inst.paymentHistory && inst.paymentHistory.length > 0) {
      // Normalizar datas para comparação
      const normalizeDate = (dateStr: string) => {
        if (dateStr.includes('T')) return dateStr.split('T')[0];
        if (dateStr.includes(' ')) return dateStr.split(' ')[0];
        return dateStr;
      };
      
      const due = normalizeDate(displayDueDate);
      
      // Verificar se algum pagamento foi feito antes ou no dia do vencimento
      // Se sim, a parcela foi cadastrada retroativa mas o cliente pagou em dia
      const hasPaymentOnTime = inst.paymentHistory.some(payment => {
        const paymentDate = normalizeDate(payment.paymentDate);
        return paymentDate <= due;
      });
      
      if (hasPaymentOnTime) {
        // Há pelo menos um pagamento feito antes ou no dia do vencimento
        // Isso indica cadastro retroativo com pagamento em dia - não está atrasada
        return false;
      }
    }

    // Se chegou aqui, está atrasada:
    // - A data de vencimento passou
    // - E (não há pagamentos OU todos os pagamentos foram feitos depois do vencimento)
    // - E a parcela não foi totalmente paga
    return true;
  }, [getInstallmentDueDateForDisplay]);

  // Função auxiliar para normalizar data para comparação
  const normalizeDateString = (dateStr: string): string => {
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
    if (dateStr.includes('T')) return dateStr.split('T')[0];
    if (dateStr.includes(' ')) return dateStr.split(' ')[0];
    return dateStr;
  };

  const filtered = useMemo(() => {
    let result = installments.filter(inst => {
      // IMPORTANTE: Parcelas totalmente pagas não devem aparecer nos filtros LATE ou PARTIAL
      // Verificar se a parcela foi totalmente paga
      const totalPaid = inst.amountPaid || 0;
      const totalDue = inst.amount || 0;
      const isFullyPaid = totalPaid >= totalDue && totalDue > 0;

      if (filter === 'ALL') return true;
      if (filter === 'LATE') {
        // Parcelas pagas não devem aparecer no filtro LATE
        if (isFullyPaid || inst.status === InstallmentStatus.PAID) return false;
        return isActuallyLate(inst);
      }
      if (filter === 'PENDING') {
        // Usar a data exibida/agendada para decidir se está atrasada de fato,
        // mesmo que o status persistido no banco esteja desatualizado.
        if (isFullyPaid || inst.status === InstallmentStatus.PAID) return false;
        if (inst.status === InstallmentStatus.PARTIAL) return false;
        return !isActuallyLate(inst);
      }
      if (filter === 'PARTIAL') {
        // Parcelas pagas não devem aparecer no filtro PARTIAL
        if (isFullyPaid || inst.status === InstallmentStatus.PAID) return false;
        return inst.status === InstallmentStatus.PARTIAL;
      }
      return inst.status === filter;
    });

    // Aplicar filtro de data se fornecido
    if (dateFilterStart && dateFilterEnd) {
      const startNormalized = normalizeDateString(dateFilterStart);
      const endNormalized = normalizeDateString(dateFilterEnd);
      result = result.filter(inst => {
        const dueNormalized = normalizeDateString(getInstallmentDueDateForDisplay(inst));
        return dueNormalized >= startNormalized && dueNormalized <= endNormalized;
      });
    }

    // Aplicar busca por nome do cliente ou número da parcela
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      result = result.filter(inst => {
        const client = getClient(inst.clientId);
        const clientName = client?.name || '';
        return clientName.toLowerCase().includes(searchLower) || 
               inst.number.toString().includes(searchTerm);
      });
    }

    return result.sort((a, b) => {
      const aDate = getInstallmentDueDateForDisplay(a);
      const bDate = getInstallmentDueDateForDisplay(b);
      const [ya, ma, da] = String(aDate).split('T')[0].split('-').map(Number);
      const [yb, mb, db] = String(bDate).split('T')[0].split('-').map(Number);
      return new Date(ya, ma - 1, da).getTime() - new Date(yb, mb - 1, db).getTime();
    });
  }, [installments, filter, searchTerm, clients, dateFilterStart, dateFilterEnd, isActuallyLate, getInstallmentDueDateForDisplay]);

  const handleWhatsapp = (inst: Installment) => {
    const client = getClient(inst.clientId);
    if (!client) return;

    const message = `Bom dia. Hoje tem nosso compromisso beleza? ${formatCurrency(inst.amount)}.`;
    const url = `https://wa.me/55${client.phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  const handlePay = (id: string) => {
    const installment = installments.find(item => item.id === id);
    if (!installment) return;

    const loan = loans.find(l => l.id === installment.loanId);
    
    setSelectedInstallment(installment);
    
    const pendingAmount = getInstallmentPendingAmount(installment);
    const latestPromiseAmount =
      installment.promisedPaymentHistory?.[installment.promisedPaymentHistory.length - 1]?.amount ??
      installment.promisedPaymentAmount ??
      0;

    // Se existir agendamento, o valor a receber deve respeitar o valor prometido (inclui multa).
    if (latestPromiseAmount > 0) {
      setPaymentAmount(latestPromiseAmount);
      setPaymentDate(getTodayDateString());
      return;
    }
    
    // PRICE e INTEREST_ONLY: valor inicial = saldo real da parcela (amount − amountPaid)
    if (pendingAmount > 0) {
      setPaymentAmount(pendingAmount);
    } else if (loan && loan.model === LoanModel.INTEREST_ONLY) {
      const interestAmount = calculateInterestOnlyMonthlyInterest(loan, installments);
      setPaymentAmount(interestAmount > 0 ? interestAmount : installment.amount);
    } else {
      setPaymentAmount(installment.amount);
    }
    
    setPaymentDate(getTodayDateString());
  };

  const getInterestAmount = (inst: Installment) => {
    const loan = loans.find(l => l.id === inst.loanId);
    if (loan && loan.model === LoanModel.INTEREST_ONLY) {
      return calculateInterestOnlyMonthlyInterest(loan, installments);
    }
    
    // Para outros modelos, usar o valor salvo na parcela
    const interest = inst.interestAmount ?? Math.max(0, inst.amount - (inst.principalAmount ?? inst.amount));
    return interest > 0 ? interest : inst.amount;
  };

  const getLatestPromise = (inst: Installment) => inst.promisedPaymentHistory?.[inst.promisedPaymentHistory.length - 1];

  const getPromiseBaseAmount = (inst: Installment) => {
    const loan = loans.find(l => l.id === inst.loanId);
    const pendingAmount = getInstallmentPendingAmount(inst);
    if (loan && loan.model === LoanModel.PRICE) {
      return pendingAmount > 0 ? pendingAmount : (inst.amount || 0);
    }

    // INTEREST_ONLY: após parcial, base = saldo restante; senão = juros do mês
    if (pendingAmount > 0 && (inst.amountPaid || 0) > 0) {
      return pendingAmount;
    }
    return getInterestAmount(inst);
  };

  const getPromiseDefaults = (inst: Installment) => {
    const latest = getLatestPromise(inst);
    return {
      reason: latest?.reason ?? inst.promisedPaymentReason ?? '',
      amount: latest?.amount ?? inst.promisedPaymentAmount ?? getPromiseBaseAmount(inst),
      date: latest?.date ?? inst.promisedPaymentDate ?? getTodayDateString()
    };
  };

  const renderPromiseInfo = (inst: Installment) => {
    const latest = getLatestPromise(inst);
    const shouldShowPromise = latest || inst.promisedPaymentAmount || inst.promisedPaymentReason;
    if (!shouldShowPromise) return null;

    const history = inst.promisedPaymentHistory ?? (latest ? [latest] : []);
    const recentHistory = history.slice(-3).reverse();

    return (
      <div className="mt-1 text-xs">
        <span className="block text-xs text-purple-700 font-semibold">
          Promessa: {formatCurrency(latest?.amount ?? inst.promisedPaymentAmount ?? 0)} — {(latest?.reason ?? inst.promisedPaymentReason) || 'Sem motivo informado'}
        </span>
        {(() => {
          const targetDate = latest?.date || inst.promisedPaymentDate;
          return targetDate ? (
            <span className="block text-[11px] text-purple-600">Agendado para {formatDate(targetDate)}</span>
          ) : null;
        })()}
        {recentHistory.length > 0 && (
          <div className="mt-1 space-y-1">
            <p className="text-[11px] text-slate-500 font-semibold uppercase tracking-wide">Histórico de agendamentos</p>
            {recentHistory.map((entry, idx) => (
              <div key={`${entry.createdAt}-${idx}`} className="flex flex-col rounded-lg border border-slate-100 bg-slate-50 px-2 py-1">
                <span className="text-[11px] text-slate-700 font-semibold">{formatDate(entry.date)} • {formatCurrency(entry.amount)}</span>
                <span className="text-[11px] text-slate-600">{entry.reason}</span>
                <span className="text-[10px] text-slate-400">Registrado em {formatDate(entry.createdAt)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const getPrincipalAmount = (inst: Installment) => {
    const loan = loans.find(l => l.id === inst.loanId);
    if (loan && loan.model === LoanModel.INTEREST_ONLY) {
      return getPendingCapital(loan, installments);
    }
    
    // Para outros modelos, usar o principalAmount da parcela ou calcular
    const interest = inst.interestAmount ?? 0;
    return inst.principalAmount ?? Math.max(0, inst.amount - interest);
  };

  const handleConfirmPayment = () => {
    if (!selectedInstallment) return;

    if (!paymentAmount || paymentAmount <= 0) {
      alert(
        buildInvalidReceiveAmountAlert({
          informedAmount: paymentAmount,
          reason: 'Informe um valor válido maior que zero no campo "Valor a receber".',
        })
      );
      return;
    }

    if (!paymentDate) {
      alert('Informe a data do pagamento.');
      return;
    }

    const loan = loans.find(l => l.id === selectedInstallment.loanId);
    if (!loan) return;

    const pendingAmount = getInstallmentPendingAmount(selectedInstallment);
    const outstandingAmount = calculateLoanOutstandingAmount(loan, installments);

    // Arredondar valores para evitar problemas de precisão de ponto flutuante
    const roundedPaymentAmount = Math.round(paymentAmount * 100) / 100;
    const roundedOutstandingAmount = Math.round(outstandingAmount * 100) / 100;
    const roundedPendingAmount = Math.round(pendingAmount * 100) / 100;
    const latestPromiseAmount =
      selectedInstallment.promisedPaymentHistory?.[selectedInstallment.promisedPaymentHistory.length - 1]?.amount ??
      selectedInstallment.promisedPaymentAmount ??
      0;
    const roundedLatestPromiseAmount = Math.round(latestPromiseAmount * 100) / 100;

    // PRICE: valor a receber deve ser igual à parcela (ou ao valor prometido, se houver)
    if (loan.model === LoanModel.PRICE) {
      const expectedPriceAmount =
        roundedLatestPromiseAmount > 0
          ? roundedLatestPromiseAmount
          : roundedPendingAmount > 0
            ? roundedPendingAmount
            : Math.round((selectedInstallment.amount || 0) * 100) / 100;

      if (roundedPaymentAmount !== expectedPriceAmount) {
        alert(
          buildInvalidReceiveAmountAlert({
            informedAmount: roundedPaymentAmount,
            expectedAmount: expectedPriceAmount,
            reason:
              roundedLatestPromiseAmount > 0
                ? 'Para empréstimos PRICE com agendamento, o valor a receber deve ser igual ao valor prometido (parcela + multa/atraso).'
                : 'Para empréstimos PRICE, o valor a receber deve ser igual ao valor da parcela.',
          })
        );
        return;
      }
    }

    // Para empréstimos "somente juros", permitir pagamento até o valor total em aberto (capital + juros)
    // Para outros modelos, validar que não exceda o valor pendente da parcela
    if (loan.model === LoanModel.INTEREST_ONLY) {
      // Permitir pagamento até o valor total em aberto do empréstimo
      const maxAllowed = roundedLatestPromiseAmount > roundedOutstandingAmount ? roundedLatestPromiseAmount : roundedOutstandingAmount;
      if (roundedPaymentAmount > maxAllowed) {
        alert(
          buildInvalidReceiveAmountAlert({
            informedAmount: roundedPaymentAmount,
            expectedAmount: maxAllowed,
            reason: `O valor a receber não pode ser maior que o valor total em aberto do empréstimo (${formatCurrency(maxAllowed)}).`,
          })
        );
        return;
      }
    } else if (loan.model !== LoanModel.PRICE) {
      // Para outros modelos, validar que não exceda o valor pendente da parcela
      const maxAllowed = roundedLatestPromiseAmount > roundedPendingAmount ? roundedLatestPromiseAmount : roundedPendingAmount;
      if (roundedPaymentAmount > maxAllowed) {
        alert(
          buildInvalidReceiveAmountAlert({
            informedAmount: roundedPaymentAmount,
            expectedAmount: maxAllowed,
            reason: `O valor a receber não pode ser maior que o valor pendente da parcela (${formatCurrency(maxAllowed)}).`,
          })
        );
        return;
      }
    }

    // Se o pagamento for igual ou maior que o valor total em aberto, é um pagamento total
    // Nesse caso, não validar valor mínimo de juros
    if (roundedPaymentAmount >= roundedOutstandingAmount && roundedOutstandingAmount > 0) {
      // Pagamento total - permitir sem validação de mínimo
      payInstallment(selectedInstallment.id, roundedPaymentAmount, paymentDate);
      setSelectedInstallment(null);
      setPaymentAmount(0);
      setPaymentDate(getTodayDateString());
      return;
    }

    // Para pagamentos parciais, validar valor mínimo apenas se a parcela ainda não foi paga parcialmente
    // Se já foi paga parcialmente, permitir qualquer valor positivo até o valor pendente
    const hasPartialPayment = (selectedInstallment.amountPaid || 0) > 0;
    
    if (!hasPartialPayment) {
      // Apenas validar valor mínimo se a parcela ainda não foi paga parcialmente
      let interestAmount = 0;
      
      if (loan.model === LoanModel.INTEREST_ONLY) {
        interestAmount = calculateInterestOnlyMonthlyInterest(loan, installments);
      } else {
        interestAmount = selectedInstallment.interestAmount ?? 0;
        if (interestAmount === 0 && loan.interestRate > 0) {
          const principal = selectedInstallment.principalAmount ?? selectedInstallment.amount;
          interestAmount = Number((principal * (loan.interestRate / 100)).toFixed(2));
        }
      }
      
      // Validar que o pagamento seja pelo menos o valor dos juros (apenas para primeira parcela parcial)
      if (interestAmount > 0 && paymentAmount < interestAmount) {
        const reason = loan.model === LoanModel.INTEREST_ONLY
          ? `O valor mínimo a receber é ${formatCurrency(interestAmount)} (juros sobre o capital pendente, taxa ${formatInterestRate(loan.interestRate)}).`
          : `O valor mínimo a receber é ${formatCurrency(interestAmount)} (valor dos juros baseado na taxa de ${formatInterestRate(loan.interestRate)} do empréstimo).`;
        alert(
          buildInvalidReceiveAmountAlert({
            informedAmount: paymentAmount,
            expectedAmount: interestAmount,
            reason,
          })
        );
        return;
      }
    }

    // Processar pagamento parcial - o valor será aplicado proporcionalmente entre juros e capital
    payInstallment(selectedInstallment.id, paymentAmount, paymentDate);
    setSelectedInstallment(null);
    setPaymentAmount(0);
    setPaymentDate(getTodayDateString());
  };

  const openPromiseModal = (inst: Installment) => {
    setPromiseModal(inst);
    const defaults = getPromiseDefaults(inst);
    const baseAmount = getPromiseBaseAmount(inst);
    const latestAmount = defaults.amount || 0;
    // Valor a cobrar = base do mês; multa = diferença já prometida (se houver),
    // para não somar multa em cima de multa ao reabrir o agendamento.
    const existingFee = Math.max(0, Number((latestAmount - baseAmount).toFixed(2)));
    setPromiseReason(defaults.reason);
    setPromiseAmount(baseAmount);
    setPromiseDate(inst.dueDate);
    setPromiseLateFee(existingFee);
  };

  const handleSavePromise = async () => {
    if (!promiseModal) return;
    if (!promiseReason.trim()) {
      alert('Informe o motivo do atraso.');
      return;
    }

    if (!promiseAmount || promiseAmount <= 0) {
      alert('Informe um valor válido para cobrança futura.');
      return;
    }

    if (!promiseDate) {
      alert('Informe a data de agendamento.');
      return;
    }

    try {
      // Incluir multa/atraso no motivo se informado
      const reasonWithLateFee = promiseLateFee > 0 
        ? `${promiseReason.trim()} | Multa/Atraso: ${formatCurrency(promiseLateFee)}`
        : promiseReason.trim();
      // A multa deve ser somada ao valor agendado (valor a receber)
      const amountToCharge = Number((promiseAmount + (promiseLateFee || 0)).toFixed(2));
      await scheduleFuturePayment(promiseModal.id, reasonWithLateFee, amountToCharge, promiseDate);
      setPromiseModal(null);
      setPromiseLateFee(0);
    } catch (error) {
      console.error('Erro ao agendar recebimento', error);
      alert('Erro ao salvar agendamento. Tente novamente.');
    }
  };

  const handleEditInstallment = (inst: Installment) => {
    const loan = loans.find(l => l.id === inst.loanId);
    
    setEditingInstallment(inst);
    setEditDueDate(inst.dueDate);
    
    if (loan && loan.model === LoanModel.INTEREST_ONLY) {
      const correctInterestAmount = calculateInterestOnlyMonthlyInterest(loan, installments);
      setEditAmount(correctInterestAmount);
      setEditInterestAmount(correctInterestAmount);
      setEditPrincipalAmount(getPendingCapital(loan, installments));
    } else {
      setEditAmount(inst.amount);
      setEditInterestAmount(inst.interestAmount ?? 0);
      setEditPrincipalAmount(inst.principalAmount ?? 0);
    }
  };

  const handleSaveEdit = async () => {
    if (!editingInstallment) return;

    if (!editDueDate) {
      alert('Informe a data de vencimento.');
      return;
    }

    if (!editAmount || editAmount <= 0) {
      alert('Informe um valor válido para a parcela.');
      return;
    }

    try {
      const updatedInstallment: Installment = {
        ...editingInstallment,
        dueDate: editDueDate,
        amount: editAmount,
        interestAmount: editInterestAmount > 0 ? editInterestAmount : undefined,
        principalAmount: editPrincipalAmount > 0 ? editPrincipalAmount : undefined,
      };

      await updateInstallment(editingInstallment.id, updatedInstallment);
      setEditingInstallment(null);
      setEditDueDate('');
      setEditAmount(0);
      setEditInterestAmount(0);
      setEditPrincipalAmount(0);
    } catch (error) {
      console.error('Erro ao atualizar parcela', error);
      alert('Erro ao salvar alterações. Tente novamente.');
    }
  };

  const renderStatus = (inst: Installment, late: boolean) => {
    const loan = loans.find(l => l.id === inst.loanId);
    const isInterestOnly = loan?.model === LoanModel.INTEREST_ONLY;

    if (inst.status === InstallmentStatus.PAID) {
      // Parcelas pagas de todos os empréstimos
      return <span className="flex items-center gap-1 text-emerald-600 font-bold"><CheckCircle size={14}/> Pago</span>;
    }

    if (inst.status === InstallmentStatus.PARTIAL) {
      // Para empréstimos somente juros, verificar se houve amortização
      if (isInterestOnly) {
        // Verificar se há pagamento de capital no histórico
        const hasPrincipalPayment = inst.paymentHistory && inst.paymentHistory.length > 0
          ? inst.paymentHistory.some(p => (p.principalPaid || 0) > 0)
          : false;
        
        if (hasPrincipalPayment) {
          return <span className="flex items-center gap-1 text-amber-600 font-bold"><Clock size={14}/> Pgto Juros+Amortização</span>;
        } else {
          return <span className="flex items-center gap-1 text-amber-600 font-bold"><Clock size={14}/> Pgto Juros</span>;
        }
      }
      return <span className="flex items-center gap-1 text-amber-600 font-bold"><Clock size={14}/> Pgto Juros</span>;
    }

    if (late) {
      return <span className="flex items-center gap-1 text-red-600 font-bold"><AlertCircle size={14}/> Atrasada</span>;
    }

    return <span className="flex items-center gap-1 text-blue-600 font-bold"><Clock size={14}/> A Vencer</span>;
  };

  // Agrupar histórico de pagamentos por cliente
  const getPaymentHistoryByClient = () => {
    const historyByClient: Record<string, Array<{ installment: Installment; entry: any }>> = {};
    
    installments.forEach(inst => {
      if (inst.paymentHistory && inst.paymentHistory.length > 0) {
        const clientId = inst.clientId;
        if (!historyByClient[clientId]) {
          historyByClient[clientId] = [];
        }
        inst.paymentHistory.forEach(entry => {
          historyByClient[clientId].push({ installment: inst, entry });
        });
      }
    });
    
    // Ordenar por data de pagamento (mais recente primeiro)
    Object.keys(historyByClient).forEach(clientId => {
      historyByClient[clientId].sort((a, b) => 
        new Date(b.entry.paymentDate).getTime() - new Date(a.entry.paymentDate).getTime()
      );
    });
    
    return historyByClient;
  };

  const paymentHistoryByClient = getPaymentHistoryByClient();

  const visiblePaymentHistoryByClient = (() => {
    const visible: Record<string, Array<{ installment: Installment; entry: any; entryId: string }>> = {};
    let hiddenCount = 0;

    Object.entries(paymentHistoryByClient).forEach(([clientId, entries]) => {
      const visibleEntries = entries
        .map(({ installment, entry }) => ({
          installment,
          entry,
          entryId: buildPaymentHistoryEntryId(installment.id, entry.createdAt),
        }))
        .filter(({ entryId }) => {
          const hidden = isPaymentHidden(hiddenPaymentIds, entryId);
          if (hidden) hiddenCount += 1;
          return !hidden;
        });

      if (visibleEntries.length > 0) {
        visible[clientId] = visibleEntries;
      }
    });

    return { visible, hiddenCount };
  })();

  // Função de exportação para Excel
  const exportToExcel = () => {
    const data = filtered.map(inst => {
      const client = getClient(inst.clientId);
      const loan = loans.find(l => l.id === inst.loanId);
      const late = isActuallyLate(inst);
      const interestAmount = inst.interestAmount ?? Math.max(0, inst.amount - (inst.principalAmount ?? inst.amount));
      const principalAmount = inst.principalAmount ?? Math.max(0, inst.amount - interestAmount);
      
      // Status formatado
      let status = '';
      const isInterestOnly = loan?.model === LoanModel.INTEREST_ONLY;
      
      if (inst.status === InstallmentStatus.PAID) {
        // Para empréstimos somente juros, mostrar "PAGO" em vez de "Pago"
        status = isInterestOnly ? 'PAGO' : 'Pago';
      } else if (inst.status === InstallmentStatus.PARTIAL) {
        // Para empréstimos somente juros, verificar se houve amortização
        if (isInterestOnly) {
          // Verificar se há pagamento de capital no histórico
          const hasPrincipalPayment = inst.paymentHistory && inst.paymentHistory.length > 0
            ? inst.paymentHistory.some(p => (p.principalPaid || 0) > 0)
            : false;
          
          status = hasPrincipalPayment ? 'Pgto Juros+Amortização' : 'Pgto Juros';
        } else {
          status = 'Parcial';
        }
      } else if (late) {
        status = 'Atrasada';
      } else {
        status = 'A Vencer';
      }

      // Histórico de pagamentos formatado
      const paymentHistory = inst.paymentHistory && inst.paymentHistory.length > 0
        ? inst.paymentHistory.map(p => 
            `${formatDate(p.paymentDate)}: ${formatCurrency(p.amount)} (Juros: ${formatCurrency(p.interestPaid)}, Capital: ${formatCurrency(p.principalPaid)})`
          ).join(' | ')
        : '';

      // Histórico de promessas formatado
      const promiseHistory = inst.promisedPaymentHistory && inst.promisedPaymentHistory.length > 0
        ? inst.promisedPaymentHistory.map(p => 
            `${formatDate(p.date)}: ${formatCurrency(p.amount)} - ${p.reason}`
          ).join(' | ')
        : '';

      return {
        'Data Vencimento': formatDate(getInstallmentDueDateForDisplay(inst)),
        'Cliente': client?.name || 'Cliente não encontrado',
        'CPF': client?.cpf || '',
        'Telefone': client?.phone || '',
        'Email': client?.email || '',
        'Número Parcela': inst.number,
        'Valor Total': inst.amount,
        'Capital': principalAmount,
        'Juros': interestAmount,
        'Valor Pago': inst.amountPaid || 0,
        'Valor Pendente': inst.amount - (inst.amountPaid || 0),
        'Status': status,
        'Data Pagamento': inst.paidDate ? formatDate(inst.paidDate) : '',
        'Histórico Pagamentos': paymentHistory,
        'Promessa Pagamento': inst.promisedPaymentReason || '',
        'Valor Prometido': inst.promisedPaymentAmount || '',
        'Data Prometida': inst.promisedPaymentDate ? formatDate(inst.promisedPaymentDate) : '',
        'Histórico Promessas': promiseHistory,
        'ID Empréstimo': inst.loanId,
        'Taxa Juros Empréstimo': loan ? formatInterestRate(loan.interestRate) : '',
        'Modelo Empréstimo': loan?.model === LoanModel.PRICE ? 'Tabela Price' : loan?.model === LoanModel.INTEREST_ONLY ? 'Somente Juros' : ''
      };
    });

    if (data.length === 0) {
      alert('Nenhum registro encontrado para exportar. Ajuste os filtros e tente novamente.');
      return;
    }

    // Criar cabeçalhos
    const headers = Object.keys(data[0]);
    
    // Criar linhas de dados
    const rows = data.map(row => headers.map(header => {
      const value = row[header as keyof typeof row];
      // Converter para string e escapar aspas
      if (value === null || value === undefined) return '';
      return String(value).replace(/"/g, '""');
    }));

    // Criar conteúdo CSV (separado por ponto e vírgula para Excel)
    const csvContent = [
      headers.map(h => `"${h.replace(/"/g, '""')}"`).join(';'),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(';'))
    ].join('\n');

    // Adicionar BOM para UTF-8 (garante acentuação correta no Excel)
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    
    // Nome do arquivo com filtros aplicados
    const filterName = filter === 'ALL' ? 'Todas' : filter === 'PENDING' ? 'A_Vencer' : filter === 'LATE' ? 'Atrasadas' : filter === 'PARTIAL' ? 'Parciais' : 'Pagas';
    const dateRange = dateFilterStart && dateFilterEnd 
      ? `_${dateFilterStart}_${dateFilterEnd}` 
      : '';
    link.download = `parcelas_${filterName}${dateRange}_${new Date().toISOString().split('T')[0]}.csv`;
    
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-800">Controle de Parcelas</h2>
        <button
          onClick={exportToExcel}
          className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-semibold flex items-center gap-2 hover:bg-emerald-700 transition shadow-sm"
          title="Exportar dados filtrados para Excel"
        >
          <FileSpreadsheet size={18} /> Exportar Excel
        </button>
      </div>

      {/* Histórico por Cliente */}
      {(Object.keys(paymentHistoryByClient).length > 0) && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h3 className="text-lg font-bold text-slate-800">Histórico de Pagamentos por Cliente</h3>
            {visiblePaymentHistoryByClient.hiddenCount > 0 && (
              <button
                type="button"
                onClick={showAllHiddenPayments}
                className="text-sm font-semibold text-emerald-700 hover:text-emerald-800 hover:underline"
              >
                Mostrar ocultos ({visiblePaymentHistoryByClient.hiddenCount})
              </button>
            )}
          </div>
          {Object.keys(visiblePaymentHistoryByClient.visible).length === 0 ? (
            <p className="text-sm text-slate-500">
              Todos os pagamentos recentes estão ocultos. Use &quot;Mostrar ocultos&quot; para reexibi-los.
            </p>
          ) : (
            <div className="space-y-4">
              {Object.entries(visiblePaymentHistoryByClient.visible).map(([clientId, entries]) => {
                const client = getClient(clientId);
                if (!client) return null;
                const allEntryIds = entries.map(e => e.entryId);

                return (
                  <div key={clientId} className="border border-slate-200 rounded-lg p-4">
                    <div className="flex items-center justify-between gap-3 mb-3">
                      <h4 className="font-bold text-slate-800">{client.name}</h4>
                      <button
                        type="button"
                        onClick={() => hideAllClientPaymentsFromView(allEntryIds)}
                        className="text-xs font-semibold text-slate-500 hover:text-slate-700 hover:underline whitespace-nowrap"
                        title="Ocultar todos os pagamentos deste cliente na view"
                      >
                        Ocultar todas
                      </button>
                    </div>
                    <div className="space-y-2">
                      {entries.map(({ installment, entry, entryId }, idx) => (
                        <div
                          key={`${entryId}-${idx}`}
                          className="relative flex flex-col rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 pr-9"
                        >
                          <button
                            type="button"
                            onClick={() => hidePaymentFromView(entryId)}
                            className="absolute top-2 right-2 p-0.5 rounded text-emerald-400 hover:text-emerald-700 hover:bg-emerald-100 transition"
                            title="Ocultar este pagamento da view"
                            aria-label="Ocultar este pagamento da view"
                          >
                            <X size={14} />
                          </button>
                          <div className="flex justify-between items-start">
                            <div>
                              <span className="text-sm text-emerald-700 font-semibold">
                                Parcela {installment.number} • {formatDate(entry.paymentDate)}
                              </span>
                              <span className="block text-sm text-emerald-600 font-bold">
                                {formatCurrency(entry.amount)}
                              </span>
                              <span className="text-xs text-emerald-600">
                                Juros: {formatCurrency(entry.interestPaid)} • Capital: {formatCurrency(entry.principalPaid)}
                              </span>
                            </div>
                            <span className="text-xs text-emerald-400">
                              {formatDate(entry.createdAt)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Campo de Busca */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        <input
          type="text"
          className="w-full pl-10 pr-4 py-3 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
          placeholder="Buscar por nome do cliente ou número da parcela..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Filtros de Data */}
      <div className="flex flex-wrap gap-4 mb-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Data Início
          </label>
          <input
            type="date"
            className="w-full border border-slate-300 rounded-lg p-2 bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            value={dateFilterStart || ''}
            onChange={e => setDateFilterStart(e.target.value || null)}
          />
        </div>
        <div className="flex-1 min-w-[200px]">
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Data Fim
          </label>
          <input
            type="date"
            className="w-full border border-slate-300 rounded-lg p-2 bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            value={dateFilterEnd || ''}
            onChange={e => setDateFilterEnd(e.target.value || null)}
          />
        </div>
        {(dateFilterStart || dateFilterEnd) && (
          <div className="flex items-end">
            <button
              onClick={() => {
                setDateFilterStart(null);
                setDateFilterEnd(null);
              }}
              className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-300 transition"
            >
              Limpar Filtros
            </button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex space-x-2 overflow-x-auto pb-2">
        {['ALL', 'PENDING', 'LATE', 'PARTIAL', 'PAID'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f as any)}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition ${
              filter === f ? 'bg-slate-800 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {f === 'ALL' ? 'Todas' : f === 'PENDING' ? 'A Vencer' : f === 'LATE' ? 'Em Atraso' : f === 'PARTIAL' ? 'Parcial' : 'Pagas'}
          </button>
        ))}
      </div>

      {/* Mobile Card View / Desktop Table View */}
      <div className="hidden md:block bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold">
            <tr>
              <th className="p-4">Vencimento</th>
              <th className="p-4">Cliente</th>
              <th className="p-4">Parc.</th>
              <th className="p-4">Valor</th>
              <th className="p-4">Status</th>
              <th className="p-4 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map(inst => {
               const client = getClient(inst.clientId);
               const late = isActuallyLate(inst);
               return (
                <tr key={inst.id} className="hover:bg-slate-50">
                    <td className="p-4">{formatDate(getInstallmentDueDateForDisplay(inst))}</td>
                    <td className="p-4 font-medium">{client?.name}</td>
                    <td className="p-4 text-slate-500">{inst.number}</td>
                    <td className="p-4 font-medium">
                      {formatCurrency(inst.amount)}
                      <span className="block text-xs text-slate-500">Capital: {formatCurrency(getPrincipalAmount(inst))} • Juros: {formatCurrency(getInterestAmount(inst))}</span>
                      {renderPromiseInfo(inst)}
                      {inst.amountPaid > 0 && inst.amountPaid < inst.amount && (
                        <span className="block text-xs text-amber-600 font-semibold">Recebido: {formatCurrency(inst.amountPaid)}</span>
                      )}
                      {inst.paymentHistory && inst.paymentHistory.length > 0 && (
                        <div className="mt-2 space-y-1">
                          <p className="text-[11px] text-slate-500 font-semibold uppercase tracking-wide">Histórico de Pagamentos</p>
                          {inst.paymentHistory.slice().reverse().map((entry, idx) => (
                            <div key={`${entry.createdAt}-${idx}`} className="flex flex-col rounded-lg border border-emerald-100 bg-emerald-50 px-2 py-1">
                              <span className="text-[11px] text-emerald-700 font-semibold">
                                {formatDate(entry.paymentDate)} • {formatCurrency(entry.amount)}
                              </span>
                              <span className="text-[11px] text-emerald-600">
                                Juros: {formatCurrency(entry.interestPaid)} • Capital: {formatCurrency(entry.principalPaid)}
                              </span>
                              <span className="text-[10px] text-emerald-400">Registrado em {formatDate(entry.createdAt)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="p-4">{renderStatus(inst, late)}</td>
                    <td className="p-4 flex justify-end gap-2">
                        {/* Botão Whats Direto */}
                        <button onClick={() => handleWhatsapp(inst)} className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg" title="Abrir WhatsApp Web">
                            <MessageCircle size={18} />
                        </button>
                        
                        {user?.role === UserRole.ADMIN && (
                          <button
                            onClick={() => handleEditInstallment(inst)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                            title="Editar parcela"
                          >
                            <Pencil size={18} />
                          </button>
                        )}
                        
                        {inst.status !== InstallmentStatus.PAID && user?.role === UserRole.ADMIN && (
                             <button onClick={() => handlePay(inst.id)} className="px-3 py-1 bg-emerald-600 text-white text-xs font-bold rounded hover:bg-emerald-700 ml-2">
                                Receber
                             </button>
                        )}
                        {inst.status !== InstallmentStatus.PAID && user?.role === UserRole.ADMIN && (
                          <button
                            onClick={() => openPromiseModal(inst)}
                            className="px-3 py-1 bg-purple-100 text-purple-700 text-xs font-bold rounded hover:bg-purple-200 flex items-center gap-1"
                          >
                            <Clock size={14} />
                            Agendar recebimento
                          </button>
                        )}
                    </td>
                </tr>
               );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile Stack */}
      <div className="md:hidden space-y-4">
        {filtered.map(inst => {
            const client = getClient(inst.clientId);
            const late = isActuallyLate(inst);
            return (
                <div key={inst.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                    <div className="flex justify-between items-start mb-2">
                        <div>
                            <span className="text-xs text-slate-500 font-medium">Vencimento {formatDate(getInstallmentDueDateForDisplay(inst))}</span>
                            <h4 className="font-bold text-slate-800">{client?.name}</h4>
                            <span className="text-xs text-slate-400">Parcela {inst.number}</span>
                        </div>
                        <div className="text-right">
                            <div className="font-bold text-slate-900">{formatCurrency(inst.amount)}</div>
                            <div className="text-xs text-slate-500">Capital: {formatCurrency(getPrincipalAmount(inst))} • Juros: {formatCurrency(getInterestAmount(inst))}</div>
                            {inst.amountPaid > 0 && inst.amountPaid < inst.amount && (
                              <div className="text-xs text-amber-600 font-semibold">Recebido: {formatCurrency(inst.amountPaid)}</div>
                            )}
                            {inst.paymentHistory && inst.paymentHistory.length > 0 && (
                              <div className="mt-2 space-y-1">
                                <p className="text-[11px] text-slate-500 font-semibold uppercase tracking-wide">Histórico de Pagamentos</p>
                                {inst.paymentHistory.slice().reverse().map((entry, idx) => (
                                  <div key={`${entry.createdAt}-${idx}`} className="flex flex-col rounded-lg border border-emerald-100 bg-emerald-50 px-2 py-1">
                                    <span className="text-[11px] text-emerald-700 font-semibold">
                                      {formatDate(entry.paymentDate)} • {formatCurrency(entry.amount)}
                                    </span>
                                    <span className="text-[11px] text-emerald-600">
                                      Juros: {formatCurrency(entry.interestPaid)} • Capital: {formatCurrency(entry.principalPaid)}
                                    </span>
                                    <span className="text-[10px] text-emerald-400">Registrado em {formatDate(entry.createdAt)}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                            {renderPromiseInfo(inst)}
                             {renderStatus(inst, late)}
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-slate-100">
                         <button onClick={() => handleWhatsapp(inst)} className="py-2 bg-emerald-50 text-emerald-700 font-semibold rounded-lg text-sm flex items-center justify-center gap-2">
                            <MessageCircle size={16} /> WhatsApp
                         </button>
                         {user?.role === UserRole.ADMIN && (
                           <button onClick={() => handleEditInstallment(inst)} className="py-2 bg-blue-50 text-blue-700 font-semibold rounded-lg text-sm flex items-center justify-center gap-2">
                             <Pencil size={16} /> Editar
                           </button>
                         )}
                    </div>
                     {inst.status !== InstallmentStatus.PAID && user?.role === UserRole.ADMIN && (
                         <button onClick={() => handlePay(inst.id)} className="w-full mt-2 py-2 bg-emerald-600 text-white font-semibold rounded-lg text-sm">
                            Baixar Pagamento
                         </button>
                     )}
                     {inst.status !== InstallmentStatus.PAID && user?.role === UserRole.ADMIN && (
                        <button onClick={() => openPromiseModal(inst)} className="w-full mt-2 py-2 bg-purple-100 text-purple-700 font-semibold rounded-lg text-sm flex items-center justify-center gap-2">
                          <Clock size={16} />
                          Agendar recebimento
                        </button>
                     )}
                </div>
            );
        })}
      </div>

      {selectedInstallment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="mb-4">
              <h3 className="text-xl font-bold text-slate-900">Receber parcela {selectedInstallment.number}</h3>
              <p className="text-sm text-slate-600">Informe o valor a receber.</p>
            </div>

            <div className="space-y-4">
              <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                <div className="text-sm text-slate-600 mb-1">Valor da parcela</div>
                {(() => {
                  const loan = loans.find(l => l.id === selectedInstallment.loanId);
                  const isInterestOnly = loan?.model === LoanModel.INTEREST_ONLY;
                  const summary = isInterestOnly && loan
                    ? getInterestOnlyReceiveSummary(loan, selectedInstallment, installments)
                    : null;
                  const displayAmount = summary?.displayAmount ?? selectedInstallment.amount;
                  const pendingAmount = summary?.pendingAmount
                    ?? getInstallmentPendingAmount(selectedInstallment);
                  
                  return (
                    <>
                      <div className="text-lg font-bold text-slate-900">{formatCurrency(displayAmount)}</div>
                      {selectedInstallment.amountPaid > 0 && (
                        <div className="mt-2 text-sm">
                          <span className="text-slate-600">Já recebido: </span>
                          <span className="font-semibold text-emerald-600">{formatCurrency(selectedInstallment.amountPaid)}</span>
                        </div>
                      )}
                      <div className="mt-2 text-sm">
                        <span className="text-slate-600">Valor pendente: </span>
                        <span className="font-semibold text-slate-900">
                          {formatCurrency(pendingAmount)}
                        </span>
                      </div>
                    </>
                  );
                })()}
                {(() => {
                  const loan = loans.find(l => l.id === selectedInstallment.loanId);
                  let displayInterest = selectedInstallment.interestAmount ?? 0;
                  let displayCapital = selectedInstallment.principalAmount ?? 0;

                  if (loan && loan.model === LoanModel.INTEREST_ONLY) {
                    const summary = getInterestOnlyReceiveSummary(loan, selectedInstallment, installments);
                    displayInterest = summary.monthlyInterest;
                    displayCapital = summary.pendingCapital;
                  }
                  
                  if (displayCapital > 0 || displayInterest > 0) {
                    return (
                      <div className="mt-2 text-xs text-slate-500">
                        Juros: {formatCurrency(displayInterest)} • 
                        Capital: {formatCurrency(displayCapital)}
                      </div>
                    );
                  }
                  return null;
                })()}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Valor a receber <span className="text-red-500">*</span>
                </label>
                {(() => {
                  const loan = loans.find(l => l.id === selectedInstallment.loanId);
                  const pendingAmount = getInstallmentPendingAmount(selectedInstallment);
                  const latestPromiseAmount =
                    selectedInstallment.promisedPaymentHistory?.[selectedInstallment.promisedPaymentHistory.length - 1]?.amount ??
                    selectedInstallment.promisedPaymentAmount ??
                    0;
                  const baseAmount = pendingAmount > 0 ? pendingAmount : selectedInstallment.amount;
                  const expectedAmount = latestPromiseAmount > 0 ? latestPromiseAmount : baseAmount;
                  const isPrice = loan?.model === LoanModel.PRICE;

                  return (
                    <>
                      <CurrencyInput
                        value={paymentAmount}
                        onChange={setPaymentAmount}
                        className="w-full border border-slate-300 rounded-lg p-3 bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        placeholder="0,00"
                        autoFocus
                        aria-label="Valor a receber"
                      />
                      {isPrice && (
                        <p className="mt-1 text-xs text-slate-600">
                          <span className="font-semibold">
                            Para empréstimos PRICE, o valor a receber deve ser sempre igual ao valor da parcela
                            {latestPromiseAmount > 0 ? ' (incluindo multa/atraso do agendamento)' : ''}.
                          </span>{' '}
                          Valor esperado: {formatCurrency(expectedAmount)}.
                        </p>
                      )}
                      {!isPrice && (() => {
                        if (!loan) return null;

                        const hasPartialPayment = (selectedInstallment.amountPaid || 0) > 0;
                        let interestAmount = 0;
                        let maxAmount = pendingAmount;

                        if (loan.model === LoanModel.INTEREST_ONLY) {
                          const summary = getInterestOnlyReceiveSummary(loan, selectedInstallment, installments);
                          interestAmount = summary.monthlyInterest;
                          maxAmount = summary.maxQuitAmount;
                        } else {
                          interestAmount = selectedInstallment.interestAmount ?? 0;
                          if (interestAmount === 0) {
                            const principal = selectedInstallment.principalAmount ?? selectedInstallment.amount;
                            interestAmount = Number((principal * (loan.interestRate / 100)).toFixed(2));
                          }
                        }
                        
                        if (interestAmount <= 0 && maxAmount <= 0) return null;

                        return (
                          <div className="mt-1 space-y-1">
                            {loan.model === LoanModel.INTEREST_ONLY && hasPartialPayment ? (
                              <p className="text-xs text-slate-600">
                                <span className="font-semibold">Saldo restante da parcela:</span>{' '}
                                {formatCurrency(pendingAmount)}
                              </p>
                            ) : interestAmount > 0 ? (
                              <p className="text-xs text-slate-600">
                                <span className="font-semibold">Mínimo (juros):</span> {formatCurrency(interestAmount)}
                                {loan.model === LoanModel.INTEREST_ONLY && (
                                  <span className="text-slate-500"> ({formatInterestRate(loan.interestRate)} do capital pendente)</span>
                                )}
                                {loan.model !== LoanModel.INTEREST_ONLY && (
                                  <span className="text-slate-500"> ({formatInterestRate(loan.interestRate)} do capital)</span>
                                )}
                              </p>
                            ) : null}
                            {loan.model === LoanModel.INTEREST_ONLY && maxAmount > interestAmount && (
                              <p className="text-xs text-emerald-600">
                                <span className="font-semibold">Máximo (para quitar):</span> {formatCurrency(maxAmount)}
                                <span className="text-slate-500"> (capital pendente + juros/cobranças)</span>
                              </p>
                            )}
                          </div>
                        );
                      })()}
                    </>
                  );
                })()}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Data do pagamento <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={paymentDate}
                  onChange={e => setPaymentDate(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-3 bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  max={getTodayDateString()}
                />
                <p className="mt-1 text-xs text-slate-600">
                  Para pagamentos retroativos, selecione a data em que o pagamento foi realizado.
                </p>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button 
                onClick={() => {
                  setSelectedInstallment(null);
                  setPaymentAmount(0);
                  setPaymentDate(getTodayDateString());
                }} 
                className="flex-1 py-2 rounded-lg border hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button 
                onClick={handleConfirmPayment} 
                className="flex-1 py-2 rounded-lg bg-emerald-600 text-white font-bold hover:bg-emerald-700"
              >
                Confirmar Recebimento
              </button>
            </div>
          </div>
        </div>
      )}

      {promiseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="mb-4">
              <h3 className="text-xl font-bold text-slate-900">Agendar recebimento futuro</h3>
              <p className="text-sm text-slate-600">Registre o motivo do atraso e o valor combinado para cobrar posteriormente.</p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Motivo do atraso</label>
                <textarea
                  className="w-full border border-slate-300 rounded-lg p-3 bg-slate-50 focus:bg-white"
                  value={promiseReason}
                  onChange={e => setPromiseReason(e.target.value)}
                  placeholder="Ex: cliente solicitou prorrogação até receber salário"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Valor a cobrar</label>
                <CurrencyInput
                  className="w-full border border-slate-300 rounded-lg p-3 bg-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  value={promiseAmount}
                  onChange={setPromiseAmount}
                  placeholder="0,00"
                  aria-label="Valor a cobrar"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Multa/Atraso</label>
                <CurrencyInput
                  className="w-full border border-slate-300 rounded-lg p-3 bg-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  value={promiseLateFee}
                  onChange={setPromiseLateFee}
                  placeholder="0,00"
                  aria-label="Multa/Atraso"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Entra somente nesta parcela (mês do atraso). Na baixa, o valor da parcela
                  passa a ser juros + multa para a conta fechar.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Data do recebimento</label>
                <input
                  type="date"
                  className="w-full border border-slate-300 rounded-lg p-3 bg-slate-50 focus:bg-white"
                  value={promiseDate}
                  onChange={e => setPromiseDate(e.target.value)}
                />
                <p className="text-xs text-slate-500 mt-1">
                  Data de vencimento da parcela: {formatDate(promiseModal.dueDate)}
                </p>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => setPromiseModal(null)} className="flex-1 py-2 rounded-lg border hover:bg-slate-50">Cancelar</button>
              <button onClick={handleSavePromise} className="flex-1 py-2 rounded-lg bg-purple-600 text-white font-bold hover:bg-purple-700">Salvar promessa</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Edição de Parcela */}
      {editingInstallment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="mb-4">
              <h3 className="text-xl font-bold text-slate-900">Editar Parcela {editingInstallment.number}</h3>
              <p className="text-sm text-slate-600">Corrija os dados da parcela caso tenha sido preenchida incorretamente.</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Data de Vencimento <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  className="w-full border border-slate-300 rounded-lg p-3 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={editDueDate}
                  onChange={e => setEditDueDate(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Valor Total <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  className="w-full border border-slate-300 rounded-lg p-3 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={editAmount || ''}
                  onChange={e => setEditAmount(parseFloat(e.target.value) || 0)}
                  placeholder="0,00"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Juros
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    className="w-full border border-slate-300 rounded-lg p-3 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={editInterestAmount || ''}
                    onChange={e => setEditInterestAmount(parseFloat(e.target.value) || 0)}
                    placeholder="0,00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Capital
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    className="w-full border border-slate-300 rounded-lg p-3 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={editPrincipalAmount || ''}
                    onChange={e => setEditPrincipalAmount(parseFloat(e.target.value) || 0)}
                    placeholder="0,00"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button 
                onClick={() => {
                  setEditingInstallment(null);
                  setEditDueDate('');
                  setEditAmount(0);
                  setEditInterestAmount(0);
                  setEditPrincipalAmount(0);
                }} 
                className="flex-1 py-2 rounded-lg border hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button 
                onClick={handleSaveEdit} 
                className="flex-1 py-2 rounded-lg bg-blue-600 text-white font-bold hover:bg-blue-700"
              >
                Salvar Alterações
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
