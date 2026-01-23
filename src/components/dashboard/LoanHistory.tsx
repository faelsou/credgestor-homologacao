import React, { useContext, useMemo, useState } from 'react';
import { Search, CalendarRange, Pencil, Clock8, RotateCcw } from 'lucide-react';
import { AppContext } from '@/pages/App';
import { formatCurrency, formatDate, getTodayDateString } from '@/utils';
import { Installment, InstallmentStatus, LoanStatus, LoanModel } from '@/types';

export const LoanHistoryView: React.FC = () => {
  const { loans, clients, installments, scheduleFuturePayment, startEditingLoan, reopenLoan } = useContext(AppContext);
  const [nameFilter, setNameFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [statusFilter, setStatusFilter] = useState<LoanStatus | 'ALL'>('ALL');
  const [promiseModal, setPromiseModal] = useState<{ loanId: string; installment: Installment } | null>(null);
  const [promiseReason, setPromiseReason] = useState('');
  const [promiseAmount, setPromiseAmount] = useState(0);
  const [promiseDate, setPromiseDate] = useState(getTodayDateString());
  const [promiseLateFee, setPromiseLateFee] = useState(0);

  // Função para calcular o status correto do empréstimo baseado nas parcelas
  const calculateLoanStatus = (loan: typeof loans[0]): LoanStatus => {
    const related = installments.filter(inst => inst.loanId === loan.id);
    
    if (related.length === 0) {
      return LoanStatus.ACTIVE;
    }
    
    // Para empréstimos "somente juros", verificar se não há mais capital nem juros pendentes
    if (loan.model === LoanModel.INTEREST_ONLY) {
      const hasPendingCapital = related.some(inst => {
        const principal = inst.principalAmount ?? 0;
        return principal > 0;
      });
      
      const hasPendingInterest = related.some(inst => {
        const interest = inst.interestAmount ?? 0;
        return interest > 0;
      });
      
      // Empréstimo só está finalizado se não há capital nem juros pendentes
      return (!hasPendingCapital && !hasPendingInterest) ? LoanStatus.PAID : LoanStatus.ACTIVE;
    }
    
    // Para outros modelos, verificar se todas as parcelas estão pagas
    const isLoanPaid = related.every(inst => inst.status === InstallmentStatus.PAID || inst.amount <= 0);
    return isLoanPaid ? LoanStatus.PAID : LoanStatus.ACTIVE;
  };

  // Função para calcular o valor em aberto do empréstimo
  const calculateOutstandingAmount = (loan: typeof loans[0]): number => {
    const related = installments.filter(inst => inst.loanId === loan.id);
    
    if (related.length === 0) {
      return loan.totalAmount;
    }
    
    // Para empréstimos "somente juros", calcular capital + juros pendentes
    if (loan.model === LoanModel.INTEREST_ONLY) {
      let totalOutstanding = 0;
      
      // Soma todo o capital pendente
      for (const inst of related) {
        const principal = inst.principalAmount ?? 0;
        if (principal > 0) {
          totalOutstanding += principal;
        }
      }
      
      // Soma todos os juros pendentes
      for (const inst of related) {
        const interest = inst.interestAmount ?? 0;
        if (interest > 0) {
          totalOutstanding += interest;
        }
      }
      
      return Number(totalOutstanding.toFixed(2));
    }
    
    // Para outros modelos, calcular valor total menos o que já foi pago
    const totalPaid = related.reduce((sum, inst) => sum + (inst.amountPaid || 0), 0);
    const outstanding = Math.max(0, loan.totalAmount - totalPaid);
    return Number(outstanding.toFixed(2));
  };

  const filteredLoans = useMemo(() => {
    return loans
      .filter(loan => {
        const client = clients.find(c => c.id === loan.clientId);
        const matchesName = !nameFilter || (client?.name.toLowerCase().includes(nameFilter.toLowerCase()) ?? false);

        const loanDate = new Date(loan.startDate);
        const afterStart = startDate ? loanDate >= new Date(startDate) : true;
        const beforeEnd = endDate ? loanDate <= new Date(endDate) : true;
        
        // Calcular status correto para filtrar
        const correctStatus = calculateLoanStatus(loan);
        const matchesStatus = statusFilter === 'ALL' || correctStatus === statusFilter;

        return matchesName && afterStart && beforeEnd && matchesStatus;
      })
      .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
  }, [clients, endDate, loans, nameFilter, startDate, statusFilter]);

  const statusBadge = (status: LoanStatus) => {
    switch (status) {
      case LoanStatus.ACTIVE:
        return <span className="px-2 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700">Em Aberto</span>;
      case LoanStatus.PAID:
        return <span className="px-2 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700">Finalizado</span>;
      case LoanStatus.DEFAULTED:
      default:
        return <span className="px-2 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700">Em Atraso</span>;
    }
  };

  const getInterestAmount = (inst: Installment) => {
    const interest = inst.interestAmount ?? Math.max(0, inst.amount - (inst.principalAmount ?? inst.amount));
    return interest > 0 ? interest : inst.amount;
  };

  const getLatestPromise = (inst: Installment) => inst.promisedPaymentHistory?.[inst.promisedPaymentHistory.length - 1];

  const getPromiseDefaults = (inst: Installment) => {
    const latest = getLatestPromise(inst);
    return {
      reason: latest?.reason ?? inst.promisedPaymentReason ?? '',
      amount: latest?.amount ?? inst.promisedPaymentAmount ?? getInterestAmount(inst),
      date: latest?.date ?? inst.promisedPaymentDate ?? getTodayDateString()
    };
  };

  const getPrincipalAmount = (inst: Installment) => {
    const interest = inst.interestAmount ?? 0;
    return inst.principalAmount ?? Math.max(0, inst.amount - interest);
  };

  const renderPromiseHistory = (inst: Installment) => {
    const history = inst.promisedPaymentHistory;
    if (!history?.length) return null;

    const recentHistory = history.slice(-3).reverse();
    return (
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-1 mt-3">
        <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Histórico de agendamentos</p>
        {recentHistory.map((entry, idx) => (
          <div key={`${entry.createdAt}-${idx}`} className="text-xs text-slate-700 leading-snug">
            <div className="font-semibold">{formatDate(entry.date)} • {formatCurrency(entry.amount)}</div>
            <div>{entry.reason}</div>
            <div className="text-[10px] text-slate-500">Registrado em {formatDate(entry.createdAt)}</div>
          </div>
        ))}
      </div>
    );
  };

  const findNextInstallment = (loanId: string) => {
    return installments
      .filter(inst => inst.loanId === loanId && inst.status !== InstallmentStatus.PAID)
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())[0];
  };

  const openPromiseModal = (loanId: string) => {
    const nextInst = findNextInstallment(loanId);

    if (!nextInst) {
      alert('Nenhuma parcela pendente para agendar recebimento.');
      return;
    }

    setPromiseModal({ loanId, installment: nextInst });
    const defaults = getPromiseDefaults(nextInst);
    setPromiseReason(defaults.reason);
    setPromiseAmount(defaults.amount);
    // Usar a data de vencimento como padrão
    setPromiseDate(nextInst.dueDate);
    setPromiseLateFee(0);
  };

  const handleSavePromise = () => {
    if (!promiseModal) return;
    if (!promiseReason.trim()) {
      alert('Informe o motivo do agendamento.');
      return;
    }
    if (!promiseAmount || promiseAmount <= 0) {
      alert('Informe um valor válido.');
      return;
    }

    if (!promiseDate) {
      alert('Informe a data de agendamento.');
      return;
    }

    // Incluir multa/atraso no motivo se informado
    const reasonWithLateFee = promiseLateFee > 0 
      ? `${promiseReason.trim()} | Multa/Atraso: ${formatCurrency(promiseLateFee)}`
      : promiseReason.trim();
    scheduleFuturePayment(promiseModal.installment.id, reasonWithLateFee, promiseAmount, promiseDate);
    setPromiseModal(null);
    setPromiseLateFee(0);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-xs uppercase font-semibold text-slate-500">Relatórios</p>
          <h2 className="text-2xl font-bold text-slate-800">Histórico de empréstimo</h2>
        </div>
      </div>

      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Filtrar por nome do cliente"
              className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:bg-white focus:border-emerald-500 transition-colors"
              value={nameFilter}
              onChange={e => setNameFilter(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <CalendarRange size={18} className="text-slate-500 flex-shrink-0" />
            <input
              type="date"
              className="flex-1 px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
            />
            <span className="text-slate-500 text-sm flex-shrink-0">até</span>
            <input
              type="date"
              className="flex-1 px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
            />
          </div>
          <div>
            <select
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:bg-white focus:border-emerald-500 transition-colors text-slate-700"
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as LoanStatus | 'ALL')}
            >
              <option value="ALL">Todos os status</option>
              <option value={LoanStatus.ACTIVE}>Em Aberto</option>
              <option value={LoanStatus.PAID}>Finalizado</option>
              <option value={LoanStatus.DEFAULTED}>Em Atraso</option>
            </select>
          </div>
          <div className="flex items-center justify-end text-sm text-slate-500">
            <span className="font-medium">{filteredLoans.length}</span> empréstimo(s) encontrado(s)
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold">
              <tr>
                <th className="p-3">Cliente</th>
                <th className="p-3">Data</th>
                <th className="p-3">Principal</th>
                <th className="p-3">Total</th>
                <th className="p-3">Valor em Aberto</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLoans.map(loan => {
                const client = clients.find(c => c.id === loan.clientId);
                const nextInstallment = findNextInstallment(loan.id);
                const latestPromise = nextInstallment ? getLatestPromise(nextInstallment) : null;
                // Calcular status correto baseado nas parcelas
                const correctStatus = calculateLoanStatus(loan);
                // Calcular valor em aberto
                const outstandingAmount = calculateOutstandingAmount(loan);
                return (
                  <tr key={loan.id} className="hover:bg-slate-50 transition">
                    <td className="p-3">
                      <p className="font-semibold text-slate-800">{client?.name || 'Cliente removido'}</p>
                      <p className="text-xs text-slate-500">CPF: {client?.cpf || '---'}</p>
                    </td>
                    <td className="p-3 text-slate-600">
                      {formatDate(loan.startDate)}
                      {latestPromise?.date && (
                        <p className="text-xs text-purple-700 font-semibold mt-1">
                          Próximo agendamento: {formatDate(latestPromise.date)}
                          <span className="block text-[11px] text-slate-500 font-normal">{latestPromise.reason}</span>
                        </p>
                      )}
                    </td>
                    <td className="p-3 font-medium">{formatCurrency(loan.amount)}</td>
                    <td className="p-3 font-semibold text-emerald-600">{formatCurrency(loan.totalAmount)}</td>
                    <td className="p-3 font-bold text-amber-600">{formatCurrency(outstandingAmount)}</td>
                    <td className="p-3">{statusBadge(correctStatus)}</td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {correctStatus !== LoanStatus.PAID && (
                          <button
                            onClick={() => openPromiseModal(loan.id)}
                            className="inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold text-purple-700 bg-purple-50 border border-purple-100 rounded-lg hover:bg-purple-100"
                          >
                            <Clock8 size={14} /> Agendar recebimento
                          </button>
                        )}
                        {correctStatus === LoanStatus.PAID && (
                          <button
                            onClick={() => reopenLoan(loan.id)}
                            className="inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-100 rounded-lg hover:bg-blue-100"
                            title="Reabrir empréstimo finalizado"
                          >
                            <RotateCcw size={14} /> Reabrir
                          </button>
                        )}
                        <button
                          onClick={() => startEditingLoan(loan.id)}
                          className="inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-100"
                        >
                          <Pencil size={14} /> Editar
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredLoans.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-slate-500">Nenhum empréstimo encontrado para os filtros informados.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {promiseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="mb-4">
              <h3 className="text-xl font-bold text-slate-900">Agendar recebimento</h3>
              <p className="text-sm text-slate-600">
                Parcela {promiseModal.installment.number} do cliente {clients.find(c => c.id === promiseModal.installment.clientId)?.name}
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Motivo do agendamento</label>
                <textarea
                  className="w-full border border-slate-300 rounded-lg p-3 bg-slate-50 focus:bg-white"
                  value={promiseReason}
                  onChange={e => setPromiseReason(e.target.value)}
                  placeholder="Ex: cliente pediu prorrogação para próxima semana"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Valor combinado</label>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  className="w-full border border-slate-300 rounded-lg p-3 bg-slate-50 focus:bg-white"
                  value={promiseAmount}
                  onChange={e => setPromiseAmount(parseFloat(e.target.value))}
                  placeholder="Informe o valor"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Capital: {formatCurrency(getPrincipalAmount(promiseModal.installment))} • Juros: {formatCurrency(getInterestAmount(promiseModal.installment))}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Multa/Atraso</label>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  className="w-full border border-slate-300 rounded-lg p-3 bg-slate-50 focus:bg-white"
                  value={promiseLateFee || ''}
                  onChange={e => setPromiseLateFee(parseFloat(e.target.value) || 0)}
                  placeholder="Informe o valor da multa/atraso"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Valor adicional por atraso no pagamento
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
                  Data de vencimento da parcela: {formatDate(promiseModal.installment.dueDate)}
                </p>
              </div>
            </div>

            {renderPromiseHistory(promiseModal.installment)}

            <div className="flex gap-3 mt-6">
              <button onClick={() => setPromiseModal(null)} className="flex-1 py-2 rounded-lg border hover:bg-slate-50">Cancelar</button>
              <button onClick={handleSavePromise} className="flex-1 py-2 rounded-lg bg-purple-600 text-white font-bold hover:bg-purple-700">Salvar agendamento</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
