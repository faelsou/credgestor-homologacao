import React, { useContext, useMemo, useState } from 'react';
import { AppContext } from '../../App';
import { formatCurrency, formatDate } from '../../utils';
import { LoanStatus } from '../../types';
import { Search, CalendarRange, Pencil } from 'lucide-react';

export const LoanHistoryView: React.FC = () => {
  const { loans, clients, startEditingLoan } = useContext(AppContext);
  const [nameFilter, setNameFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

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
                return (
                  <tr key={loan.id} className="hover:bg-slate-50 transition">
                    <td className="p-3">
                      <p className="font-semibold text-slate-800">{client?.name || 'Cliente removido'}</p>
                      <p className="text-xs text-slate-500">CPF: {client?.cpf || '---'}</p>
                    </td>
                    <td className="p-3 text-slate-600">{formatDate(loan.startDate)}</td>
                    <td className="p-3 font-medium">{formatCurrency(loan.amount)}</td>
                    <td className="p-3 font-semibold text-emerald-600">{formatCurrency(loan.totalAmount)}</td>
                    <td className="p-3">{statusBadge(loan.status)}</td>
                    <td className="p-3 text-right">
                      {loan.status !== LoanStatus.PAID && (
                        <button
                          onClick={() => startEditingLoan(loan.id)}
                          className="inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-100"
                        >
                          <Pencil size={14} /> Editar
                        </button>
                      )}
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
    </div>
  );
};
