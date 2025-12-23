import React, { useContext, useMemo, useState } from 'react';
import { AppContext } from '../../App';
import { formatCurrency, formatDate, getTodayDateString } from '../../utils';
import { Installment, InstallmentStatus, LoanStatus } from '../../types';
import { Search, CalendarRange, Pencil, Clock8 } from 'lucide-react';

export const LoanHistoryView: React.FC = () => {
  const { loans, clients, installments, scheduleFuturePayment, startEditingLoan } = useContext(AppContext);
  const [nameFilter, setNameFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [promiseModal, setPromiseModal] = useState<{ loanId: string; installment: Installment } | null>(null);
  const [promiseReason, setPromiseReason] = useState('');
  const [promiseAmount, setPromiseAmount] = useState(0);
  const [promiseDate, setPromiseDate] = useState(getTodayDateString());

  const filteredLoans = useMemo(() => {
    return loans
      .filter(loan => {
        const client = clients.find(c => c.id === loan.clientId);
        const matchesName = !nameFilter || (client?.name.toLowerCase().includes(nameFilter.toLowerCase()) ?? false);

        const loanDate = new Date(loan.startDate);
        const afterStart = startDate ? loanDate >= new Date(startDate) : true;
        const beforeEnd = endDate ? loanDate <= new Date(endDate) : true;

        return matchesName && afterStart && beforeEnd;
      })
      .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
  }, [clients, endDate, loans, nameFilter, startDate]);

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
    setPromiseDate(defaults.date);
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

    const today = new Date(getTodayDateString());
    const scheduled = new Date(promiseDate);
    if (scheduled < today) {
      alert('Selecione uma data futura ou igual a hoje.');
      return;
    }

    scheduleFuturePayment(promiseModal.installment.id, promiseReason.trim(), promiseAmount, promiseDate);
    setPromiseModal(null);
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
        <div className="grid gap-3 md:grid-cols-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Filtrar por nome do cliente"
              className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:bg-white"
              value={nameFilter}
              onChange={e => setNameFilter(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <CalendarRange size={18} className="text-slate-500" />
            <input
              type="date"
              className="flex-1 px-3 py-2 border border-slate-200 rounded-lg"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
            />
            <span className="text-slate-500 text-sm">até</span>
            <input
              type="date"
              className="flex-1 px-3 py-2 border border-slate-200 rounded-lg"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
            />
          </div>
          <div className="flex items-center justify-end text-sm text-slate-500">
            {filteredLoans.length} empréstimo(s) encontrado(s)
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
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLoans.map(loan => {
                const client = clients.find(c => c.id === loan.clientId);
                const nextInstallment = findNextInstallment(loan.id);
                const latestPromise = nextInstallment ? getLatestPromise(nextInstallment) : null;
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
                    <td className="p-3">{statusBadge(loan.status)}</td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {loan.status !== LoanStatus.PAID && (
                          <button
                            onClick={() => openPromiseModal(loan.id)}
                            className="inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold text-purple-700 bg-purple-50 border border-purple-100 rounded-lg hover:bg-purple-100"
                          >
                            <Clock8 size={14} /> Agendar recebimento
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
                  <td colSpan={6} className="p-6 text-center text-slate-500">Nenhum empréstimo encontrado para os filtros informados.</td>
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
                <label className="block text-sm font-medium text-slate-700 mb-1">Data do recebimento</label>
                <input
                  type="date"
                  className="w-full border border-slate-300 rounded-lg p-3 bg-slate-50 focus:bg-white"
                  value={promiseDate}
                  onChange={e => setPromiseDate(e.target.value)}
                  min={getTodayDateString()}
                />
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
