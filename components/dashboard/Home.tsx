import React, { useContext, useMemo, useState } from 'react';
import { AppContext } from '../../App';
import { TrendingUp, TrendingDown, Users, AlertTriangle, Send, FileText, X, Calendar, DownloadCloud, Filter } from 'lucide-react';
import { formatCurrency, formatDate, isLate, sendToN8N } from '../../utils';
import { InstallmentStatus, LoanStatus, UserRole } from '../../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export const DashboardHome: React.FC = () => {
  const { clients, installments, loans, user, setView, usersList, n8nSession } = useContext(AppContext);
  const [sendingReport, setSendingReport] = useState(false);
  const [detailFilter, setDetailFilter] = useState<'PAID' | 'RECEIVABLE' | 'LATE' | null>(null);
  const today = new Date().toISOString().split('T')[0];
  const [reportStartDate, setReportStartDate] = useState(today);
  const [reportEndDate, setReportEndDate] = useState(today);
  const [rangeDetail, setRangeDetail] = useState<'capital' | 'interest' | null>(null);

  const stats = useMemo(() => {
    const totalReceived = installments
      .filter(i => i.status === InstallmentStatus.PAID)
      .reduce((acc, curr) => acc + curr.amountPaid, 0);

    const totalReceivable = installments
      .filter(i => i.status !== InstallmentStatus.PAID)
      .reduce((acc, curr) => acc + curr.amount, 0);
      
    const lateInstallments = installments.filter(i => i.status !== InstallmentStatus.PAID && isLate(i.dueDate));
    const totalLate = lateInstallments.reduce((acc, curr) => acc + curr.amount, 0);

    const activeLoans = loans.filter(l => l.status === LoanStatus.ACTIVE).length;

    return { totalReceived, totalReceivable, totalLate, activeLoans, lateCount: lateInstallments.length, lateInstallments };
  }, [installments, loans]);

  // Chart Data Preparation (Simple Forecast)
  const chartData = [
    { name: 'Recebido', value: stats.totalReceived, color: '#10b981' }, // Emerald-500
    { name: 'A Vencer', value: stats.totalReceivable - stats.totalLate, color: '#3b82f6' }, // Blue-500
    { name: 'Atrasado', value: stats.totalLate, color: '#ef4444' }, // Red-500
  ];

  const detailedInstallments = useMemo(() => {
    if (!detailFilter) return [];

    const base = installments.filter(inst => {
      if (detailFilter === 'PAID') return inst.status === InstallmentStatus.PAID;
      if (detailFilter === 'LATE') return inst.status !== InstallmentStatus.PAID && isLate(inst.dueDate);
      return inst.status !== InstallmentStatus.PAID && !isLate(inst.dueDate);
    });

    return base.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  }, [detailFilter, installments]);

  const detailTitle = detailFilter === 'PAID'
    ? 'Parcelas Recebidas'
    : detailFilter === 'RECEIVABLE'
      ? 'Parcelas a Receber'
      : 'Parcelas em Atraso';

  const detailTotal = detailedInstallments.reduce((acc, inst) => acc + (inst.amountPaid || inst.amount), 0);

  const installmentsInRange = useMemo(() => {
    const start = new Date(reportStartDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(reportEndDate);
    end.setHours(23, 59, 59, 999);

    return installments.filter(inst => {
      const due = new Date(inst.dueDate);
      return due >= start && due <= end;
    });
  }, [installments, reportEndDate, reportStartDate]);

  const rangeLoans = useMemo(() => {
    const map = new Map<string, { loanId: string; capital: number; interest: number; earliestDue: string }>();

    installmentsInRange.forEach(inst => {
      const interestPortion = inst.interestAmount ?? Math.max(0, inst.amount - (inst.principalAmount ?? inst.amount));
      const principalPortion = inst.principalAmount ?? Math.max(0, inst.amount - interestPortion);

      const existing = map.get(inst.loanId);
      if (existing) {
        existing.capital += principalPortion;
        existing.interest += interestPortion;
        existing.earliestDue = new Date(inst.dueDate) < new Date(existing.earliestDue) ? inst.dueDate : existing.earliestDue;
      } else {
        map.set(inst.loanId, { loanId: inst.loanId, capital: principalPortion, interest: interestPortion, earliestDue: inst.dueDate });
      }
    });

    return Array.from(map.values()).sort((a, b) => new Date(a.earliestDue).getTime() - new Date(b.earliestDue).getTime());
  }, [installmentsInRange]);

  const dailyCapital = rangeLoans.reduce((acc, entry) => acc + entry.capital, 0);
  const dailyInterest = rangeLoans.reduce((acc, entry) => acc + entry.interest, 0);
  const rangeDetailTitle = rangeDetail === 'capital' ? 'Capital por cliente' : 'Juros por cliente';
  const rangeDetailTotal = rangeDetail === 'capital' ? dailyCapital : dailyInterest;

  const exportExcelReport = () => {
    const data = installmentsInRange.map(inst => {
      const loan = loans.find(l => l.id === inst.loanId);
      const client = clients.find(c => c.id === inst.clientId);
      const interestPortion = inst.interestAmount ?? Math.max(0, inst.amount - (inst.principalAmount ?? inst.amount));
      const principalPortion = inst.principalAmount ?? Math.max(0, inst.amount - interestPortion);
      return {
        Data: formatDate(inst.dueDate),
        Cliente: client?.name || 'Cliente não encontrado',
        CPF: client?.cpf || '',
        Capital: principalPortion,
        Juros: interestPortion,
        Total: loan ? loan.totalAmount : inst.amount
      };
    });

    if (data.length === 0) {
      alert('Nenhum registro no período selecionado. Ajuste as datas para exportar.');
      return;
    }

    const header = ['Data', 'Cliente', 'CPF', 'Capital', 'Juros', 'Total'];
    const rows = data.map(row => [row.Data, row.Cliente, row.CPF, row.Capital, row.Juros, row.Total]);
    const csvContent = [header, ...rows]
      .map(line => line.map(value => typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : value).join(';'))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `relatorio_financeiro_${reportStartDate}_a_${reportEndDate}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleSendAdminReport = async () => {
    setSendingReport(true);

    const adminContacts = Array.from(new Set(
      usersList
        .filter(u => u.role === UserRole.ADMIN)
        .flatMap(u => u.whatsappContacts || [])
        .filter(Boolean)
    ));

    if (adminContacts.length === 0) {
      alert('Nenhum contato de WhatsApp configurado para administradores. Cadastre um número em Equipe / Acessos.');
      setSendingReport(false);
      return;
    }

    // Prepara dados para o n8n
    const payload = {
      type: 'ADMIN_REPORT',
      adminName: user?.name,
      adminContacts,
      totalLate: stats.totalLate,
      countLate: stats.lateCount,
      details: stats.lateInstallments.map(i => ({
        client: clients.find(c => c.id === i.clientId)?.name,
        amount: i.amount,
        daysLate: Math.floor((new Date().getTime() - new Date(i.dueDate).getTime()) / (1000 * 3600 * 24))
      }))
    };

    await sendToN8N(payload, { accessToken: n8nSession?.accessToken });

    setTimeout(() => {
      alert(`Relatório enviado para ${adminContacts.length} contato(s) de Admin no WhatsApp! (${stats.lateCount} atrasos identificados)`);
      setSendingReport(false);
    }, 1500);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-slate-800">Visão Geral</h2>
        
        {/* Botão de Relatório para Admin */}
        {user?.role === UserRole.ADMIN && (
          <button 
            onClick={handleSendAdminReport}
            disabled={sendingReport}
            className="bg-slate-800 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 hover:bg-slate-900 transition shadow-lg shadow-slate-200 disabled:opacity-70"
          >
            {sendingReport ? (
              <span className="animate-pulse">Enviando...</span>
            ) : (
              <>
                <FileText size={18} /> Relatório Diário no Whats
              </>
            )}
          </button>
        )}
      </div>
      
      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Total Recebido"
          value={formatCurrency(stats.totalReceived)}
          icon={<TrendingUp className="text-white" />}
          bg="bg-emerald-500"
          onClick={() => setDetailFilter('PAID')}
          active={detailFilter === 'PAID'}
        />
        <KPICard
          title="A Receber"
          value={formatCurrency(stats.totalReceivable)}
          icon={<TrendingDown className="text-white" />}
          bg="bg-blue-500"
          onClick={() => setDetailFilter('RECEIVABLE')}
          active={detailFilter === 'RECEIVABLE'}
        />
        <KPICard
          title="Em Atraso"
          value={formatCurrency(stats.totalLate)}
          subtext={`${stats.lateCount} parcelas`}
          icon={<AlertTriangle className="text-white" />}
          bg="bg-red-500"
          onClick={() => setDetailFilter('LATE')}
          active={detailFilter === 'LATE'}
        />
         <KPICard
          title="Empréstimos Ativos"
          value={stats.activeLoans.toString()}
          icon={<Users className="text-emerald-600" />}
          bg="bg-white border border-slate-200"
          textColor="text-slate-800"
          iconWrapper="bg-emerald-100"
        />
      </div>

      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-2 text-slate-700">
            <Filter size={16} />
            <div>
              <p className="text-xs uppercase font-semibold text-slate-500">Filtros do período</p>
              <h3 className="text-lg font-bold text-slate-800">Capital e juros</h3>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
            <div className="flex items-center gap-2">
              <Calendar size={16} className="text-slate-500" />
              <div className="flex gap-2">
                <input
                  type="date"
                  value={reportStartDate}
                  onChange={e => setReportStartDate(e.target.value)}
                  className="border border-slate-300 rounded-lg px-3 py-2 text-sm"
                />
                <span className="text-slate-500">até</span>
                <input
                  type="date"
                  value={reportEndDate}
                  onChange={e => setReportEndDate(e.target.value)}
                  className="border border-slate-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>
            </div>
            <button
              onClick={exportExcelReport}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-semibold flex items-center gap-2 hover:bg-emerald-700 transition"
            >
              <DownloadCloud size={16} /> Exportar Excel
            </button>
          </div>
        </div>
        <div className="grid sm:grid-cols-3 gap-4">
          <button
            type="button"
            onClick={() => setRangeDetail('capital')}
            className={`text-left p-4 rounded-xl border ${rangeDetail === 'capital' ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200 bg-slate-50'} hover:border-emerald-300 transition`}
          >
            <p className="text-xs uppercase font-semibold text-slate-500">Capital do período</p>
            <p className="text-2xl font-bold text-slate-800">{formatCurrency(dailyCapital)}</p>
          </button>
          <button
            type="button"
            onClick={() => setRangeDetail('interest')}
            className={`text-left p-4 rounded-xl border ${rangeDetail === 'interest' ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200 bg-slate-50'} hover:border-emerald-300 transition`}
          >
            <p className="text-xs uppercase font-semibold text-slate-500">Juros do período</p>
            <p className="text-2xl font-bold text-slate-800">{formatCurrency(dailyInterest)}</p>
          </button>
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
            <p className="text-xs uppercase font-semibold text-slate-500">Registros filtrados</p>
            <p className="text-2xl font-bold text-slate-800">{rangeLoans.length}</p>
          </div>
        </div>
      </div>

      {rangeDetail && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <p className="text-xs uppercase font-semibold text-slate-500">{rangeDetailTitle}</p>
              <h3 className="text-2xl font-bold text-slate-800">{formatCurrency(rangeDetailTotal)}</h3>
              <p className="text-sm text-slate-500">{rangeLoans.length} empréstimos encontrados</p>
            </div>
            <button
              onClick={() => setRangeDetail(null)}
              className="self-start md:self-auto px-3 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-semibold hover:bg-slate-200 flex items-center gap-2"
            >
              <X size={16} /> Fechar filtro
            </button>
          </div>

          {rangeLoans.length === 0 && (
            <p className="text-sm text-slate-500">Nenhum empréstimo no período selecionado.</p>
          )}

          <div className="divide-y divide-slate-100">
            {rangeLoans.map(rangeLoan => {
              const loan = loans.find(l => l.id === rangeLoan.loanId);
              const client = loan ? clients.find(c => c.id === loan.clientId) : undefined;
              return (
                <div key={rangeLoan.loanId} className="py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-800">{client?.name || 'Cliente desconhecido'}</p>
                    <p className="text-sm text-slate-500">Vencimento: {formatDate(rangeLoan.earliestDue)} • CPF: {client?.cpf || '---'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-slate-500">{rangeDetail === 'capital' ? 'Capital do período' : 'Juros do período'}</p>
                    <p className="text-lg font-bold text-slate-800">{formatCurrency(rangeDetail === 'capital' ? rangeLoan.capital : rangeLoan.interest)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {detailFilter && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
            <div>
              <p className="text-xs uppercase font-semibold text-slate-500">{detailTitle}</p>
              <h3 className="text-2xl font-bold text-slate-800">{formatCurrency(detailTotal)}</h3>
              <p className="text-sm text-slate-500">{detailedInstallments.length} registros</p>
            </div>
            <button
              onClick={() => setDetailFilter(null)}
              className="self-start md:self-auto px-3 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-semibold hover:bg-slate-200 flex items-center gap-2"
            >
              <X size={16} /> Fechar lista
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {detailedInstallments.map(inst => {
              const client = clients.find(c => c.id === inst.clientId);
              const late = inst.status !== InstallmentStatus.PAID && isLate(inst.dueDate);
              return (
                <div key={inst.id} className="py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <p className="text-sm text-slate-500 flex items-center gap-1"><Calendar size={14} /> {formatDate(inst.dueDate)}</p>
                    <p className="text-base font-semibold text-slate-800">{client?.name}</p>
                    <p className="text-xs text-slate-400">Parcela {inst.number}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-slate-900">{formatCurrency(inst.amountPaid || inst.amount)}</p>
                    {inst.status === InstallmentStatus.PAID && <span className="text-xs text-emerald-600 font-semibold">Pago</span>}
                    {late && <span className="text-xs text-red-600 font-semibold">Atrasado</span>}
                    {detailFilter === 'RECEIVABLE' && !late && inst.status !== InstallmentStatus.PAID && (
                      <span className="text-xs text-blue-600 font-semibold">A Vencer</span>
                    )}
                  </div>
                </div>
              );
            })}

            {detailedInstallments.length === 0 && (
              <div className="py-4 text-center text-slate-500 text-sm">Nenhum registro encontrado para este filtro.</div>
            )}
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Chart Section */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="font-bold text-slate-800 mb-6">Fluxo Financeiro</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" width={80} tick={{fontSize: 12}} />
                <Tooltip cursor={{fill: 'transparent'}} formatter={(value: number) => formatCurrency(value)} />
                <Bar dataKey="value" barSize={30} radius={[0, 4, 4, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Activity / Simple List */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="font-bold text-slate-800 mb-4">Acesso Rápido</h3>
          <div className="space-y-3">
             <div className="p-3 bg-blue-50 rounded-lg border border-blue-100 text-sm text-blue-800 flex justify-between items-center">
                <span>Novos Clientes (Mês)</span>
                <span className="font-bold">{clients.length}</span>
             </div>
             <button
               onClick={() => setView('loans')}
               className="w-full py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition"
             >
                Novo Empréstimo
             </button>
             <button
               onClick={() => setDetailFilter('LATE')}
               className="w-full py-2 bg-white border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition"
             >
                Ver Inadimplentes
             </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const KPICard = ({ title, value, icon, subtext, bg, textColor = "text-white", iconWrapper = "bg-white/20", onClick, active = false }: any) => (
  <button
    type="button"
    onClick={onClick}
    className={`${bg} rounded-2xl p-6 shadow-sm transition hover:shadow-md text-left w-full ${onClick ? 'cursor-pointer' : 'cursor-default'} ${active ? 'ring-2 ring-offset-2 ring-slate-800' : ''}`}
  >
    <div className="flex justify-between items-start">
      <div>
        <p className={`text-sm font-medium ${textColor} opacity-90`}>{title}</p>
        <h3 className={`text-2xl font-bold ${textColor} mt-1`}>{value}</h3>
        {subtext && <p className={`text-xs ${textColor} mt-2 opacity-80`}>{subtext}</p>}
      </div>
      <div className={`p-3 rounded-xl ${iconWrapper} backdrop-blur-sm`}>
        {icon}
      </div>
    </div>
  </button>
);