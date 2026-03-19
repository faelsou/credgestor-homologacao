import React, { useContext, useEffect, useMemo, useState } from 'react';
import { TrendingUp, TrendingDown, Users, AlertTriangle, Calendar, DownloadCloud, FileSpreadsheet, DollarSign, Percent } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from 'recharts';
import { AppContext } from '@/pages/App';
import { formatCurrency, formatDate, isLate } from '@/utils';
import { InstallmentStatus, LoanStatus, LoanModel } from '@/types';
import { DateInput } from '@/components/DateInput';

export const DashboardHome: React.FC = () => {
  const { clients, installments, loans, setView } = useContext(AppContext);

  // Inputs do filtro de data (não ficam pré-preenchidos no login)
  const [parceladosStartDate, setParceladosStartDate] = useState<string>('');
  const [parceladosEndDate, setParceladosEndDate] = useState<string>('');

  const [jurosStartDate, setJurosStartDate] = useState<string>('');
  const [jurosEndDate, setJurosEndDate] = useState<string>('');

  // Datas aplicadas no filtro. Vazias = exibe todos os dados desde o primeiro empréstimo; preenchidas = filtra pelo período.
  const [parceladosAppliedStartDate, setParceladosAppliedStartDate] = useState<string>('');
  const [parceladosAppliedEndDate, setParceladosAppliedEndDate] = useState<string>('');
  const [jurosAppliedStartDate, setJurosAppliedStartDate] = useState<string>('');
  const [jurosAppliedEndDate, setJurosAppliedEndDate] = useState<string>('');

  // Separar empréstimos parcelados e somente juros
  const parceladosLoans = useMemo(() => 
    loans.filter(l => l.model !== LoanModel.INTEREST_ONLY),
    [loans]
  );

  const jurosLoans = useMemo(() => 
    loans.filter(l => l.model === LoanModel.INTEREST_ONLY),
    [loans]
  );

  // Função auxiliar para normalizar data para comparação
  const normalizeDateString = (dateStr: string): string => {
    // Se já está no formato YYYY-MM-DD, retorna
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
    // Se tem timestamp, remove
    if (dateStr.includes('T')) return dateStr.split('T')[0];
    if (dateStr.includes(' ')) return dateStr.split(' ')[0];
    return dateStr;
  };

  // Aplicar filtros de data para parcelados (apenas datas manuais)
  const parceladosFilteredData = useMemo(() => {
    const parceladosLoanIds = new Set(parceladosLoans.map(l => l.id));

    // Sem datas aplicadas: não filtra por período.
    if (!parceladosAppliedStartDate || !parceladosAppliedEndDate) {
      return installments.filter(inst => parceladosLoanIds.has(inst.loanId));
    }

    // Normalizar datas de início e fim para comparação
    const startNormalized = normalizeDateString(parceladosAppliedStartDate);
    const endNormalized = normalizeDateString(parceladosAppliedEndDate);

    return installments.filter(inst => {
      const dueNormalized = normalizeDateString(inst.dueDate);
      return parceladosLoanIds.has(inst.loanId) && dueNormalized >= startNormalized && dueNormalized <= endNormalized;
    });
  }, [installments, parceladosLoans, parceladosAppliedStartDate, parceladosAppliedEndDate]);

  // Aplicar filtros de data para somente juros (apenas datas manuais)
  const jurosFilteredData = useMemo(() => {
    const jurosLoanIds = new Set(jurosLoans.map(l => l.id));

    // Sem datas aplicadas: não filtra por período.
    if (!jurosAppliedStartDate || !jurosAppliedEndDate) {
      return installments.filter(inst => jurosLoanIds.has(inst.loanId));
    }

    // Normalizar datas de início e fim para comparação
    const startNormalized = normalizeDateString(jurosAppliedStartDate);
    const endNormalized = normalizeDateString(jurosAppliedEndDate);

    return installments.filter(inst => {
      const dueNormalized = normalizeDateString(inst.dueDate);
      return jurosLoanIds.has(inst.loanId) && dueNormalized >= startNormalized && dueNormalized <= endNormalized;
    });
  }, [installments, jurosLoans, jurosAppliedStartDate, jurosAppliedEndDate]);

  // Estatísticas para empréstimos parcelados
  const parceladosStats = useMemo(() => {
    const total = parceladosFilteredData.reduce((acc, curr) => acc + curr.amount, 0);
    // Somar todos os amountPaid de todas as parcelas, independente do status
    const received = parceladosFilteredData
      .reduce((acc, curr) => acc + (curr.amountPaid || 0), 0);
    const receivable = parceladosFilteredData
      .filter(i => i.status !== InstallmentStatus.PAID)
      .reduce((acc, curr) => acc + (curr.amount - (curr.amountPaid || 0)), 0);
    // Valor em atraso = soma do valor PENDENTE (não recebido) das parcelas em atraso
    const late = parceladosFilteredData
      .filter(i => i.status !== InstallmentStatus.PAID && isLate(i.dueDate))
      .reduce((acc, curr) => acc + (curr.amount - (curr.amountPaid || 0)), 0);
    const lateCount = parceladosFilteredData.filter(i => i.status !== InstallmentStatus.PAID && isLate(i.dueDate)).length;
    const activeCount = parceladosLoans.filter(l => l.status === LoanStatus.ACTIVE).length;
    
    // Capital das parcelas (amortização)
    const capital = parceladosFilteredData.reduce((acc, curr) => 
      acc + (curr.principalAmount ?? Math.max(0, curr.amount - (curr.interestAmount ?? 0))), 0
    );
    // Lucro (juros) das parcelas
    const interest = parceladosFilteredData.reduce((acc, curr) => 
      acc + (curr.interestAmount ?? Math.max(0, curr.amount - (curr.principalAmount ?? curr.amount))), 0
    );
    
    // Capital total emprestado (soma dos valores emprestados dos empréstimos ativos)
    const capitalEmprestado = parceladosLoans
      .filter(l => l.status === LoanStatus.ACTIVE)
      .reduce((acc, curr) => acc + curr.amount, 0);
    
    // Total do período = valor das parcelas no período (evita dupla contagem: em PRICE as parcelas já incluem capital + juros)
    const valorTotal = total;

    return { total, received, receivable, late, lateCount, activeCount, capital, interest, capitalEmprestado, valorTotal };
  }, [parceladosFilteredData, parceladosLoans]);

  // Estatísticas para empréstimos somente juros
  const jurosStats = useMemo(() => {
    const total = jurosFilteredData.reduce((acc, curr) => acc + curr.amount, 0);
    // Somar todos os amountPaid de todas as parcelas, independente do status
    const received = jurosFilteredData
      .reduce((acc, curr) => acc + (curr.amountPaid || 0), 0);
    const receivable = jurosFilteredData
      .filter(i => i.status !== InstallmentStatus.PAID)
      .reduce((acc, curr) => acc + (curr.amount - (curr.amountPaid || 0)), 0);
    // Valor em atraso = soma do valor PENDENTE (não recebido) das parcelas em atraso
    const late = jurosFilteredData
      .filter(i => i.status !== InstallmentStatus.PAID && isLate(i.dueDate))
      .reduce((acc, curr) => acc + (curr.amount - (curr.amountPaid || 0)), 0);
    const lateCount = jurosFilteredData.filter(i => i.status !== InstallmentStatus.PAID && isLate(i.dueDate)).length;
    const activeCount = jurosLoans.filter(l => l.status === LoanStatus.ACTIVE).length;
    
    // Valor dos juros
    const interest = jurosFilteredData.reduce((acc, curr) => 
      acc + (curr.interestAmount ?? curr.amount), 0
    );
    
    // Capital total emprestado (soma dos valores emprestados dos empréstimos ativos)
    const capitalEmprestado = jurosLoans
      .filter(l => l.status === LoanStatus.ACTIVE)
      .reduce((acc, curr) => acc + curr.amount, 0);
    
    // Valor dos Juros + Capital
    const jurosMaisCapital = interest + capitalEmprestado;

    return { total, received, receivable, late, lateCount, activeCount, capital: capitalEmprestado, interest, jurosMaisCapital };
  }, [jurosFilteredData, jurosLoans]);

  // Dados para gráfico de linha - Parcelados
  const parceladosChartData = useMemo(() => {
    const grouped = new Map<string, { date: string; received: number; receivable: number }>();
    
    parceladosFilteredData.forEach(inst => {
      // Normalizar a data para YYYY-MM-DD (remover timestamp se presente)
      const dateKey = inst.dueDate.includes('T') ? inst.dueDate.split('T')[0] : inst.dueDate.split(' ')[0];
      const existing = grouped.get(dateKey) || { date: dateKey, received: 0, receivable: 0 };
      
      // Somar todos os pagamentos recebidos (amountPaid)
      const paidAmount = inst.amountPaid || 0;
      existing.received += paidAmount;
      
      // Calcular o valor ainda a receber (valor total - já recebido)
      const remainingAmount = inst.amount - paidAmount;
      if (remainingAmount > 0) {
        existing.receivable += remainingAmount;
      }
      
      grouped.set(dateKey, existing);
    });

    return Array.from(grouped.values())
      .sort((a, b) => {
        // Comparar datas de forma segura
        const dateA = a.date.split('-').map(Number);
        const dateB = b.date.split('-').map(Number);
        return new Date(dateA[0], dateA[1] - 1, dateA[2]).getTime() - new Date(dateB[0], dateB[1] - 1, dateB[2]).getTime();
      })
      .slice(-30); // Últimos 30 dias
  }, [parceladosFilteredData]);

  // Dados para gráfico de linha - Somente Juros
  const jurosChartData = useMemo(() => {
    const grouped = new Map<string, { date: string; received: number; receivable: number }>();
    
    jurosFilteredData.forEach(inst => {
      // Normalizar a data para YYYY-MM-DD (remover timestamp se presente)
      const dateKey = inst.dueDate.includes('T') ? inst.dueDate.split('T')[0] : inst.dueDate.split(' ')[0];
      const existing = grouped.get(dateKey) || { date: dateKey, received: 0, receivable: 0 };
      
      // Somar todos os pagamentos recebidos (amountPaid)
      const paidAmount = inst.amountPaid || 0;
      existing.received += paidAmount;
      
      // Calcular o valor ainda a receber (valor total - já recebido)
      const remainingAmount = inst.amount - paidAmount;
      if (remainingAmount > 0) {
        existing.receivable += remainingAmount;
      }
      
      grouped.set(dateKey, existing);
    });

    return Array.from(grouped.values())
      .sort((a, b) => {
        // Comparar datas de forma segura
        const dateA = a.date.split('-').map(Number);
        const dateB = b.date.split('-').map(Number);
        return new Date(dateA[0], dateA[1] - 1, dateA[2]).getTime() - new Date(dateB[0], dateB[1] - 1, dateB[2]).getTime();
      })
      .slice(-30); // Últimos 30 dias
  }, [jurosFilteredData]);

  // Função de exportação Excel - Parcelados
  const exportParceladosExcel = () => {
    const data = parceladosFilteredData.map(inst => {
      const loan = parceladosLoans.find(l => l.id === inst.loanId);
      const client = clients.find(c => c.id === inst.clientId);
      const interestPortion = inst.interestAmount ?? Math.max(0, inst.amount - (inst.principalAmount ?? inst.amount));
      const principalPortion = inst.principalAmount ?? Math.max(0, inst.amount - interestPortion);
      return {
        Data: formatDate(inst.dueDate),
        Cliente: client?.name || 'Cliente não encontrado',
        CPF: client?.cpf || '',
        Parcela: inst.number,
        Capital: principalPortion,
        Juros: interestPortion,
        Total: inst.amount,
        Status: inst.status === InstallmentStatus.PAID ? 'Pago' : isLate(inst.dueDate) ? 'Atrasado' : 'A Vencer'
      };
    });

    if (data.length === 0) {
      alert('Nenhum registro no período selecionado. Ajuste as datas para exportar.');
      return;
    }

    const header = ['Data', 'Cliente', 'CPF', 'Parcela', 'Capital', 'Juros', 'Total', 'Status'];
    const rows = data.map(row => [
      row.Data, row.Cliente, row.CPF, row.Parcela, row.Capital, row.Juros, row.Total, row.Status
    ]);
    const csvContent = [header, ...rows]
      .map(line => line.map(value => typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : value).join(';'))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const startSlug = parceladosAppliedStartDate || 'all';
    const endSlug = parceladosAppliedEndDate || 'all';
    link.download = `emprestimos_parcelados_${startSlug}_${endSlug}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Função de exportação Excel - Somente Juros
  const exportJurosExcel = () => {
    const data = jurosFilteredData.map(inst => {
      const loan = jurosLoans.find(l => l.id === inst.loanId);
      const client = clients.find(c => c.id === inst.clientId);
      const interestPortion = inst.interestAmount ?? inst.amount;
      const principalPortion = inst.principalAmount ?? 0;
      return {
        Data: formatDate(inst.dueDate),
        Cliente: client?.name || 'Cliente não encontrado',
        CPF: client?.cpf || '',
        Juros: interestPortion,
        Capital_Em_Aberto: principalPortion,
        Total: inst.amount,
        Status: inst.status === InstallmentStatus.PAID ? 'Pago' : isLate(inst.dueDate) ? 'Atrasado' : 'A Vencer'
      };
    });

    if (data.length === 0) {
      alert('Nenhum registro no período selecionado. Ajuste as datas para exportar.');
      return;
    }

    const header = ['Data', 'Cliente', 'CPF', 'Juros', 'Capital em Aberto', 'Total', 'Status'];
    const rows = data.map(row => [
      row.Data, row.Cliente, row.CPF, row.Juros, row.Capital_Em_Aberto, row.Total, row.Status
    ]);
    const csvContent = [header, ...rows]
      .map(line => line.map(value => typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : value).join(';'))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const startSlug = jurosAppliedStartDate || 'all';
    const endSlug = jurosAppliedEndDate || 'all';
    link.download = `emprestimos_somente_juros_${startSlug}_${endSlug}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Quando as duas datas forem informadas, aplica automaticamente no dashboard.
  // Se o usuário preencher só uma data, mantém o período aplicado anterior.
  useEffect(() => {
    if (parceladosStartDate && parceladosEndDate) {
      setParceladosAppliedStartDate(parceladosStartDate);
      setParceladosAppliedEndDate(parceladosEndDate);
    }
  }, [parceladosStartDate, parceladosEndDate]);

  useEffect(() => {
    if (jurosStartDate && jurosEndDate) {
      setJurosAppliedStartDate(jurosStartDate);
      setJurosAppliedEndDate(jurosEndDate);
    }
  }, [jurosStartDate, jurosEndDate]);

  const handleClearParcelados = () => {
    setParceladosStartDate('');
    setParceladosEndDate('');
    setParceladosAppliedStartDate('');
    setParceladosAppliedEndDate('');
  };

  const handleClearJuros = () => {
    setJurosStartDate('');
    setJurosEndDate('');
    setJurosAppliedStartDate('');
    setJurosAppliedEndDate('');
  };

  const parceladosClearDisabled = !parceladosStartDate && !parceladosEndDate;
  const jurosClearDisabled = !jurosStartDate && !jurosEndDate;

  // Componente de filtro de data (apenas inserção manual)
  const DateFilter = ({ 
    startDate, 
    setStartDate, 
    endDate, 
    setEndDate 
  }: {
    startDate: string;
    setStartDate: (date: string) => void;
    endDate: string;
    setEndDate: (date: string) => void;
  }) => (
    <div className="flex items-center gap-3 flex-wrap">
      <div className="flex items-center gap-2 flex-1 min-w-[280px]">
        <Calendar size={18} className="text-slate-500 flex-shrink-0" />
        <label className="text-sm text-slate-600 font-medium whitespace-nowrap">Data Inicial:</label>
        <DateInput
          value={startDate}
          onChange={(value) => {
            setStartDate(value);
          }}
          className="flex-1 border-2 border-slate-300 rounded-lg px-4 py-3 text-base bg-white focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all min-w-[160px] cursor-text"
          placeholder="DD/MM/AAAA"
        />
      </div>
      <div className="flex items-center gap-2 flex-1 min-w-[280px]">
        <span className="text-slate-500 text-sm font-medium">até</span>
        <label className="text-sm text-slate-600 font-medium whitespace-nowrap">Data Final:</label>
        <DateInput
          value={endDate}
          onChange={(value) => {
            setEndDate(value);
          }}
          className="flex-1 border-2 border-slate-300 rounded-lg px-4 py-3 text-base bg-white focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all min-w-[160px] cursor-text"
          placeholder="DD/MM/AAAA"
        />
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-3xl font-bold text-slate-800">Dashboard</h2>
      </div>

      {/* Layout de Duas Colunas */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Dashboard 1: Empréstimos Parcelados */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-slate-800">Empréstimos Parcelados</h3>
              <p className="text-sm text-slate-500 mt-1">Empréstimos com várias parcelas</p>
            </div>
            <div className="p-3 bg-emerald-100 rounded-xl">
              <DollarSign className="text-emerald-600" size={24} />
            </div>
          </div>

          {/* Valor Principal: Lucro + Parcelas + Capital */}
          <div>
            <p className="text-xs uppercase font-semibold text-slate-500 mb-1">Total do Período</p>
            <p className="text-3xl font-bold text-slate-800">{formatCurrency(parceladosStats.valorTotal)}</p>
            <p className="text-sm text-slate-500 mt-1">
              {parceladosStats.received > 0 && (
                <span className="text-emerald-600">+{formatCurrency(parceladosStats.received)} recebido</span>
              )}
            </p>
          </div>

          {/* Filtros de Data */}
          <div className="space-y-3">
            <p className="text-xs uppercase font-semibold text-slate-500">Filtro por Período</p>
            <DateFilter
              startDate={parceladosStartDate}
              setStartDate={setParceladosStartDate}
              endDate={parceladosEndDate}
              setEndDate={setParceladosEndDate}
            />
            <button
              onClick={handleClearParcelados}
              disabled={parceladosClearDisabled}
              className={`w-full px-4 py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition shadow-sm ${
                parceladosClearDisabled
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  : 'bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              Limpar filtro
            </button>
          </div>

          {/* Informações do Empréstimo Price */}
          <div className="space-y-3">
            <p className="text-xs uppercase font-semibold text-slate-500">Informações do Empréstimo Price</p>
            <div className="grid grid-cols-2 gap-3">
              <StatCard
                title="Valor dinheiro emprestado"
                value={formatCurrency(parceladosStats.capitalEmprestado)}
                icon={<DollarSign className="text-slate-600" size={20} />}
                bg="bg-slate-50"
              />
              <StatCard
                title="Valor das parcelas"
                value={formatCurrency(parceladosStats.total)}
                icon={<DollarSign className="text-blue-600" size={20} />}
                bg="bg-blue-50"
              />
              <StatCard
                title="Valor de lucro referente as parcelas"
                value={formatCurrency(parceladosStats.interest)}
                icon={<TrendingUp className="text-emerald-600" size={20} />}
                bg="bg-emerald-50"
              />
              <StatCard
                title="Total do período (valor das parcelas)"
                value={formatCurrency(parceladosStats.valorTotal)}
                icon={<DollarSign className="text-emerald-600" size={20} />}
                bg="bg-emerald-100"
              />
            </div>
          </div>

          {/* Estatísticas */}
          <div className="grid grid-cols-2 gap-3">
            <StatCard
              title="Recebido"
              value={formatCurrency(parceladosStats.received)}
              icon={<TrendingUp className="text-emerald-600" size={20} />}
              bg="bg-emerald-50"
              onClick={() => {
                if (parceladosAppliedStartDate && parceladosAppliedEndDate) {
                  setView('installments', 'PAID', { start: parceladosAppliedStartDate, end: parceladosAppliedEndDate });
                } else {
                  setView('installments', 'PAID');
                }
              }}
            />
            <StatCard
              title="A Receber"
              value={formatCurrency(parceladosStats.receivable)}
              icon={<TrendingDown className="text-blue-600" size={20} />}
              bg="bg-blue-50"
              onClick={() => {
                if (parceladosAppliedStartDate && parceladosAppliedEndDate) {
                  setView('installments', 'PENDING', { start: parceladosAppliedStartDate, end: parceladosAppliedEndDate });
                } else {
                  setView('installments', 'PENDING');
                }
              }}
            />
            <StatCard
              title="Em Atraso"
              value={formatCurrency(parceladosStats.late)}
              subtext={`${parceladosStats.lateCount} parcelas`}
              icon={<AlertTriangle className="text-red-600" size={20} />}
              bg="bg-red-50"
              onClick={() => {
                if (parceladosAppliedStartDate && parceladosAppliedEndDate) {
                  setView('installments', 'LATE', { start: parceladosAppliedStartDate, end: parceladosAppliedEndDate });
                } else {
                  setView('installments', 'LATE');
                }
              }}
            />
            <StatCard
              title="Ativos"
              value={parceladosStats.activeCount.toString()}
              icon={<Users className="text-slate-600" size={20} />}
              bg="bg-slate-50"
            />
          </div>



          {/* Gráfico */}
          <div className="space-y-3">
            <p className="text-xs uppercase font-semibold text-slate-500">Evolução do Período</p>
            <div className="h-48 w-full min-h-[192px]">
              <ResponsiveContainer width="100%" height="100%" minHeight={192}>
                <LineChart data={parceladosChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 10 }}
                    tickFormatter={(value) => {
                      const date = new Date(value);
                      return `${date.getDate()}/${date.getMonth() + 1}`;
                    }}
                  />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={(value) => formatCurrency(value).replace('R$', 'R$').substring(0, 8)} />
                  <Tooltip 
                    formatter={(value: number) => formatCurrency(value)}
                    labelFormatter={(label) => formatDate(label)}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="received" 
                    stroke="#10b981" 
                    strokeWidth={2}
                    name="Recebido"
                    dot={{ r: 3 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="receivable" 
                    stroke="#3b82f6" 
                    strokeWidth={2}
                    name="A Receber"
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Botão Exportar */}
          <button
            onClick={exportParceladosExcel}
            className="w-full px-4 py-3 bg-emerald-600 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 hover:bg-emerald-700 transition shadow-sm"
          >
            <FileSpreadsheet size={18} /> Exportar para Excel
          </button>
        </div>

        {/* Dashboard 2: Empréstimos Somente Juros */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-slate-800">Empréstimos Somente Juros</h3>
              <p className="text-sm text-slate-500 mt-1">Empréstimos com pagamento de juros</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-xl">
              <Percent className="text-blue-600" size={24} />
            </div>
          </div>

          {/* Valor Principal: Juros + Capital */}
          <div>
            <p className="text-xs uppercase font-semibold text-slate-500 mb-1">Total do Período</p>
            <p className="text-3xl font-bold text-slate-800">{formatCurrency(jurosStats.jurosMaisCapital)}</p>
            <p className="text-sm text-slate-500 mt-1">
              {jurosStats.received > 0 && (
                <span className="text-emerald-600">+{formatCurrency(jurosStats.received)} recebido</span>
              )}
            </p>
          </div>

          {/* Filtros de Data */}
          <div className="space-y-3">
            <p className="text-xs uppercase font-semibold text-slate-500">Filtro por Período</p>
            <DateFilter
              startDate={jurosStartDate}
              setStartDate={setJurosStartDate}
              endDate={jurosEndDate}
              setEndDate={setJurosEndDate}
            />
            <button
              onClick={handleClearJuros}
              disabled={jurosClearDisabled}
              className={`w-full px-4 py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition shadow-sm ${
                jurosClearDisabled
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  : 'bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              Limpar filtro
            </button>
          </div>

          {/* Informações do Empréstimo Somente Juros */}
          <div className="space-y-3">
            <p className="text-xs uppercase font-semibold text-slate-500">Informações do Empréstimo Somente Juros</p>
            <div className="grid grid-cols-2 gap-3">
              <StatCard
                title="Capital (dinheiro emprestado)"
                value={formatCurrency(jurosStats.capital)}
                icon={<DollarSign className="text-slate-600" size={20} />}
                bg="bg-slate-50"
              />
              <StatCard
                title="Valor do Juros"
                value={formatCurrency(jurosStats.interest)}
                icon={<Percent className="text-emerald-600" size={20} />}
                bg="bg-emerald-50"
              />
              <StatCard
                title="Valor do Juros + Capital"
                value={formatCurrency(jurosStats.jurosMaisCapital)}
                icon={<DollarSign className="text-emerald-600" size={20} />}
                bg="bg-emerald-100"
                className="col-span-2"
              />
            </div>
          </div>

          {/* Estatísticas */}
          <div className="grid grid-cols-2 gap-3">
            <StatCard
              title="Recebido"
              value={formatCurrency(jurosStats.received)}
              icon={<TrendingUp className="text-emerald-600" size={20} />}
              bg="bg-emerald-50"
              onClick={() => {
                if (jurosAppliedStartDate && jurosAppliedEndDate) {
                  setView('installments', 'PAID', { start: jurosAppliedStartDate, end: jurosAppliedEndDate });
                } else {
                  setView('installments', 'PAID');
                }
              }}
            />
            <StatCard
              title="A Receber"
              value={formatCurrency(jurosStats.receivable)}
              icon={<TrendingDown className="text-blue-600" size={20} />}
              bg="bg-blue-50"
              onClick={() => {
                if (jurosAppliedStartDate && jurosAppliedEndDate) {
                  setView('installments', 'PENDING', { start: jurosAppliedStartDate, end: jurosAppliedEndDate });
                } else {
                  setView('installments', 'PENDING');
                }
              }}
            />
            <StatCard
              title="Em Atraso"
              value={formatCurrency(jurosStats.late)}
              subtext={`${jurosStats.lateCount} parcelas`}
              icon={<AlertTriangle className="text-red-600" size={20} />}
              bg="bg-red-50"
              onClick={() => {
                if (jurosAppliedStartDate && jurosAppliedEndDate) {
                  setView('installments', 'LATE', { start: jurosAppliedStartDate, end: jurosAppliedEndDate });
                } else {
                  setView('installments', 'LATE');
                }
              }}
            />
            <StatCard
              title="Ativos"
              value={jurosStats.activeCount.toString()}
              icon={<Users className="text-slate-600" size={20} />}
              bg="bg-slate-50"
            />
          </div>



          {/* Gráfico */}
          <div className="space-y-3">
            <p className="text-xs uppercase font-semibold text-slate-500">Evolução do Período</p>
            <div className="h-48 w-full min-h-[192px]">
              <ResponsiveContainer width="100%" height="100%" minHeight={192}>
                <LineChart data={jurosChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 10 }}
                    tickFormatter={(value) => {
                      const date = new Date(value);
                      return `${date.getDate()}/${date.getMonth() + 1}`;
                    }}
                  />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={(value) => formatCurrency(value).replace('R$', 'R$').substring(0, 8)} />
                  <Tooltip 
                    formatter={(value: number) => formatCurrency(value)}
                    labelFormatter={(label) => formatDate(label)}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="received" 
                    stroke="#10b981" 
                    strokeWidth={2}
                    name="Recebido"
                    dot={{ r: 3 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="receivable" 
                    stroke="#3b82f6" 
                    strokeWidth={2}
                    name="A Receber"
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Botão Exportar */}
          <button
            onClick={exportJurosExcel}
            className="w-full px-4 py-3 bg-blue-600 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 hover:bg-blue-700 transition shadow-sm"
          >
            <FileSpreadsheet size={18} /> Exportar para Excel
          </button>
        </div>
      </div>
    </div>
  );
};

// Componente de Card de Estatística
const StatCard = ({ 
  title, 
  value, 
  subtext, 
  icon, 
  bg,
  onClick,
  className
}: { 
  title: string; 
  value: string; 
  subtext?: string; 
  icon: React.ReactNode; 
  bg: string;
  onClick?: () => void;
  className?: string;
}) => (
  <div 
    className={`p-4 rounded-xl border border-slate-200 ${bg} ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''} ${className || ''}`}
    onClick={onClick}
  >
    <div className="flex items-center justify-between mb-2">
      <p className="text-xs uppercase font-semibold text-slate-500">{title}</p>
      {icon}
    </div>
    <p className="text-xl font-bold text-slate-800">{value}</p>
    {subtext && <p className="text-xs text-slate-500 mt-1">{subtext}</p>}
  </div>
);
