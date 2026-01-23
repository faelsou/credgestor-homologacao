import React, { useContext, useState, useMemo, useCallback } from 'react';
import { Search, MessageCircle, CheckCircle, Clock, AlertCircle, Pencil, FileSpreadsheet } from 'lucide-react';
import { AppContext } from '@/pages/App';
import { formatCurrency, formatDate, getTodayDateString, isLate } from '@/utils';
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

  const getClient = (id: string) => clients.find(c => c.id === id);

  // Verifica se uma parcela está realmente atrasada, considerando pagamentos
  const isActuallyLate = useCallback((inst: Installment): boolean => {
    // Se está paga, não está atrasada
    if (inst.status === InstallmentStatus.PAID) {
      return false;
    }

    // PRIMEIRO: Se a data de vencimento não passou, não está atrasada (independente de pagamentos)
    // Isso garante que parcelas com vencimento futuro nunca sejam consideradas atrasadas
    if (!isLate(inst.dueDate)) {
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
      
      const due = normalizeDate(inst.dueDate);
      
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
    return true;
  }, []);

  // Função auxiliar para normalizar data para comparação
  const normalizeDateString = (dateStr: string): string => {
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
    if (dateStr.includes('T')) return dateStr.split('T')[0];
    if (dateStr.includes(' ')) return dateStr.split(' ')[0];
    return dateStr;
  };

  const filtered = useMemo(() => {
    let result = installments.filter(inst => {
      if (filter === 'ALL') return true;
      if (filter === 'LATE') return isActuallyLate(inst);
      if (filter === 'PENDING') return inst.status === InstallmentStatus.PENDING && !isActuallyLate(inst);
      if (filter === 'PARTIAL') return inst.status === InstallmentStatus.PARTIAL;
      return inst.status === filter;
    });

    // Aplicar filtro de data se fornecido
    if (dateFilterStart && dateFilterEnd) {
      const startNormalized = normalizeDateString(dateFilterStart);
      const endNormalized = normalizeDateString(dateFilterEnd);
      result = result.filter(inst => {
        const dueNormalized = normalizeDateString(inst.dueDate);
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

    return result.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  }, [installments, filter, searchTerm, clients, dateFilterStart, dateFilterEnd, isActuallyLate]);

  const handleWhatsapp = (inst: Installment) => {
    const client = getClient(inst.clientId);
    if (!client) return;

    const message = `Olá ${client.name}, lembrete da parcela ${inst.number} no valor de ${formatCurrency(inst.amount)} vencendo em ${formatDate(inst.dueDate)}.`;
    const url = `https://wa.me/55${client.phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  const handlePay = (id: string) => {
    const installment = installments.find(item => item.id === id);
    if (!installment) return;

    const loan = loans.find(l => l.id === installment.loanId);
    
    setSelectedInstallment(installment);
    // Inicializar com o valor mínimo (juros) baseado na taxa do empréstimo
    // Se não houver interestAmount, calcular baseado na taxa do empréstimo
    let interestAmount = installment.interestAmount ?? 0;
    if (interestAmount === 0 && loan) {
      // Calcular juros mínimo baseado na taxa do empréstimo e no principal
      const principal = installment.principalAmount ?? installment.amount;
      interestAmount = Number((principal * (loan.interestRate / 100)).toFixed(2));
    }
    const pendingAmount = installment.amount - (installment.amountPaid || 0);
    const minAmount = interestAmount > 0 ? interestAmount : pendingAmount;
    setPaymentAmount(minAmount > 0 ? minAmount : installment.amount);
    setPaymentDate(getTodayDateString());
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
    const interest = inst.interestAmount ?? 0;
    return inst.principalAmount ?? Math.max(0, inst.amount - interest);
  };

  const handleConfirmPayment = () => {
    if (!selectedInstallment) return;

    if (!paymentAmount || paymentAmount <= 0) {
      alert('Informe um valor válido para receber.');
      return;
    }

    if (!paymentDate) {
      alert('Informe a data do pagamento.');
      return;
    }

    const loan = loans.find(l => l.id === selectedInstallment.loanId);
    if (!loan) return;

    // Calcular valor total em aberto do empréstimo
    const allLoanInstallments = installments.filter(inst => inst.loanId === loan.id);
    
    const calculateOutstandingAmount = (): number => {
      if (allLoanInstallments.length === 0) {
        return loan.totalAmount;
      }
      
      // Para empréstimos "somente juros", calcular capital + juros pendentes
      if (loan.model === LoanModel.INTEREST_ONLY) {
        let capitalAmount = 0;
        let totalInterest = 0;
        
        // IMPORTANTE: No modelo "somente juros", o capital é compartilhado entre todas as parcelas
        // Não devemos somar o capital de todas as parcelas, mas sim pegar o capital de UMA parcela pendente
        // (todas as parcelas têm o mesmo capital)
        for (const inst of allLoanInstallments) {
          if (inst.status !== InstallmentStatus.PAID) {
            const principal = inst.principalAmount ?? 0;
            if (principal > 0 && capitalAmount === 0) {
              capitalAmount = principal; // Capital é o mesmo para todas as parcelas
            }
            
            // Soma todos os juros pendentes
            const interest = inst.interestAmount ?? 0;
            if (interest > 0) {
              totalInterest += interest;
            }
          }
        }
        
        const totalOutstanding = capitalAmount + totalInterest;
        return Number(totalOutstanding.toFixed(2));
      }
      
      // Para outros modelos, calcular valor total menos o que já foi pago
      const totalPaid = allLoanInstallments.reduce((sum, inst) => sum + (inst.amountPaid || 0), 0);
      const outstanding = Math.max(0, loan.totalAmount - totalPaid);
      return Number(outstanding.toFixed(2));
    };

    const outstandingAmount = calculateOutstandingAmount();

    // Se o pagamento for igual ou maior que o valor total em aberto, é um pagamento total
    // Nesse caso, não validar valor mínimo de juros
    if (paymentAmount >= outstandingAmount && outstandingAmount > 0) {
      // Pagamento total - permitir sem validação de mínimo
      payInstallment(selectedInstallment.id, paymentAmount, paymentDate);
      setSelectedInstallment(null);
      setPaymentAmount(0);
      setPaymentDate(getTodayDateString());
      return;
    }

    // Para pagamentos parciais, validar valor mínimo (pelo menos o valor dos juros)
    let interestAmount = selectedInstallment.interestAmount ?? 0;
    
    // Se não houver interestAmount, calcular baseado na taxa do empréstimo
    if (interestAmount === 0 && loan) {
      const principal = selectedInstallment.principalAmount ?? selectedInstallment.amount;
      interestAmount = Number((principal * (loan.interestRate / 100)).toFixed(2));
    }
    
    // Validar que o pagamento seja pelo menos o valor dos juros (apenas para pagamentos parciais)
    if (interestAmount > 0 && paymentAmount < interestAmount) {
      alert(`O valor mínimo a receber é ${formatCurrency(interestAmount)} (valor dos juros baseado na taxa de ${loan?.interestRate ?? 0}% do empréstimo).`);
      return;
    }

    // Permitir pagamentos maiores que o valor pendente - o excedente abaterá o capital
    payInstallment(selectedInstallment.id, paymentAmount, paymentDate);
    setSelectedInstallment(null);
    setPaymentAmount(0);
    setPaymentDate(getTodayDateString());
  };

  const openPromiseModal = (inst: Installment) => {
    setPromiseModal(inst);
    const defaults = getPromiseDefaults(inst);
    setPromiseReason(defaults.reason);
    setPromiseAmount(defaults.amount);
    // Usar a data de vencimento como padrão
    setPromiseDate(inst.dueDate);
    setPromiseLateFee(0);
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
      await scheduleFuturePayment(promiseModal.id, reasonWithLateFee, promiseAmount, promiseDate);
      setPromiseModal(null);
      setPromiseLateFee(0);
    } catch (error) {
      console.error('Erro ao agendar recebimento', error);
      alert('Erro ao salvar agendamento. Tente novamente.');
    }
  };

  const handleEditInstallment = (inst: Installment) => {
    setEditingInstallment(inst);
    setEditDueDate(inst.dueDate);
    setEditAmount(inst.amount);
    setEditInterestAmount(inst.interestAmount ?? 0);
    setEditPrincipalAmount(inst.principalAmount ?? 0);
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
    if (inst.status === InstallmentStatus.PAID) {
      return <span className="flex items-center gap-1 text-emerald-600 font-bold"><CheckCircle size={14}/> Pago</span>;
    }

    if (inst.status === InstallmentStatus.PARTIAL) {
      return <span className="flex items-center gap-1 text-amber-600 font-bold"><Clock size={14}/> Parcial</span>;
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
      if (inst.status === InstallmentStatus.PAID) {
        status = 'Pago';
      } else if (inst.status === InstallmentStatus.PARTIAL) {
        status = 'Parcial';
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
        'Data Vencimento': formatDate(inst.dueDate),
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
        'Taxa Juros Empréstimo': loan ? `${loan.interestRate}%` : '',
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
      {Object.keys(paymentHistoryByClient).length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <h3 className="text-lg font-bold text-slate-800 mb-4">Histórico de Pagamentos por Cliente</h3>
          <div className="space-y-4">
            {Object.entries(paymentHistoryByClient).map(([clientId, entries]) => {
              const client = getClient(clientId);
              if (!client) return null;
              
              return (
                <div key={clientId} className="border border-slate-200 rounded-lg p-4">
                  <h4 className="font-bold text-slate-800 mb-3">{client.name}</h4>
                  <div className="space-y-2">
                    {entries.map(({ installment, entry }, idx) => (
                      <div key={`${entry.createdAt}-${idx}`} className="flex flex-col rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2">
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
                    <td className="p-4">{formatDate(inst.dueDate)}</td>
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
                            <span className="text-xs text-slate-500 font-medium">Vencimento {formatDate(inst.dueDate)}</span>
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
                  // Calcular valor mínimo dos juros baseado no capital restante
                  const principal = selectedInstallment.principalAmount ?? 0;
                  const minInterestAmount = principal > 0 && loan 
                    ? Number((principal * (loan.interestRate / 100)).toFixed(2))
                    : 0;
                  
                  // O valor da parcela deve ser pelo menos o valor mínimo dos juros
                  const displayAmount = Math.max(selectedInstallment.amount, minInterestAmount);
                  const pendingAmount = Math.max(displayAmount - (selectedInstallment.amountPaid || 0), minInterestAmount);
                  
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
                {selectedInstallment.interestAmount !== undefined && selectedInstallment.principalAmount !== undefined && (
                  <div className="mt-2 text-xs text-slate-500">
                    Juros: {formatCurrency(selectedInstallment.interestAmount)} • 
                    Capital: {formatCurrency(selectedInstallment.principalAmount)}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Valor a receber <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={paymentAmount || ''}
                  onChange={e => setPaymentAmount(parseFloat(e.target.value) || 0)}
                  className="w-full border border-slate-300 rounded-lg p-3 bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  placeholder="0,00"
                  autoFocus
                />
                {(() => {
                  const loan = loans.find(l => l.id === selectedInstallment.loanId);
                  let interestAmount = selectedInstallment.interestAmount ?? 0;
                  
                  // Se não houver interestAmount, calcular baseado na taxa do empréstimo
                  if (interestAmount === 0 && loan) {
                    const principal = selectedInstallment.principalAmount ?? selectedInstallment.amount;
                    interestAmount = Number((principal * (loan.interestRate / 100)).toFixed(2));
                  }
                  
                  if (interestAmount > 0) {
                    return (
                      <p className="mt-1 text-xs text-slate-600">
                        <span className="font-semibold">Mínimo (juros):</span> {formatCurrency(interestAmount)}
                        {loan && <span className="text-slate-500"> ({loan.interestRate}% do capital)</span>}
                      </p>
                    );
                  }
                  return null;
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
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  className="w-full border border-slate-300 rounded-lg p-3 bg-slate-50 focus:bg-white"
                  value={promiseAmount}
                  onChange={e => setPromiseAmount(parseFloat(e.target.value))}
                  placeholder="Informe o valor combinado"
                />
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
