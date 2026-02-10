import React, { useContext, useEffect, useMemo, useState } from 'react';
import { Plus, Calculator, Pencil, Trash2, FileText, Clock8, Search, RotateCcw, Scale } from 'lucide-react';
import { AppContext } from '@/pages/App';
import { formatCurrency, formatDate, generateNoteHash, getTodayDateString, numberToWords, formatCpf, formatCep, formatInterestRate } from '@/utils';
import { LoanStatus, Installment, InstallmentStatus, UserRole, Loan, PromissoryNote, IndicationType, Client, LoanModel } from '@/types';

interface LoansViewProps {
  editingLoanId?: string | null;
  onCloseEdit?: () => void;
}

export const LoansView: React.FC<LoansViewProps> = ({ editingLoanId, onCloseEdit }) => {
  const { loans, clients, installments, addLoan, updateLoan, deleteLoan, user, scheduleFuturePayment, reopenLoan } = useContext(AppContext);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLoan, setEditingLoan] = useState<Loan | null>(null);
  const [promiseModal, setPromiseModal] = useState<{ loan: Loan; installment: Installment } | null>(null);
  const [promiseReason, setPromiseReason] = useState('');
  const [promiseAmount, setPromiseAmount] = useState(0);
  const [promiseDate, setPromiseDate] = useState(getTodayDateString());
  const [promiseLateFee, setPromiseLateFee] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<LoanStatus | 'ALL'>('ALL');
  
  // Form State
  const [selectedClientId, setSelectedClientId] = useState('');
  const [amount, setAmount] = useState(1000);
  const [interestRate, setInterestRate] = useState(0.0); // 0.0% - deve ser preenchido manualmente
  const [interestRateDisplay, setInterestRateDisplay] = useState('0,0'); // Valor exibido no campo
  const [installmentsCount, setInstallmentsCount] = useState(1);
  const [startDate, setStartDate] = useState(getTodayDateString());
  const [loanModel, setLoanModel] = useState<LoanModel>(LoanModel.PRICE);
  const createDefaultPromissoryNote = (baseDate: string, defaultInterestRate: number = 0.0): PromissoryNote => ({
    capital: amount,
    interestRate: defaultInterestRate,
    issueDate: baseDate,
    dueDate: baseDate,
    indication: 'Sem Garantia',
    numberHash: '', // Será gerado automaticamente quando o cliente for selecionado
    observation: ''
  });
  const [promissoryNote, setPromissoryNote] = useState<PromissoryNote>(createDefaultPromissoryNote(startDate, 0.0));

  const addMonths = (dateString: string, months: number) => {
    // Parse a data no formato YYYY-MM-DD evitando problemas de fuso horário
    const [year, month, day] = dateString.split('-').map(Number);
    const baseDate = new Date(year, month - 1, day);
    const newDate = new Date(baseDate.getFullYear(), baseDate.getMonth() + months, baseDate.getDate());
    // Formatar de volta para YYYY-MM-DD
    const yearStr = newDate.getFullYear();
    const monthStr = String(newDate.getMonth() + 1).padStart(2, '0');
    const dayStr = String(newDate.getDate()).padStart(2, '0');
    return `${yearStr}-${monthStr}-${dayStr}`;
  };

  const calculatePriceInstallment = (principal: number, rateDecimal: number, periods: number) => {
    if (rateDecimal === 0) return principal / periods;
    const factor = Math.pow(1 + rateDecimal, periods);
    return principal * ((rateDecimal * factor) / (factor - 1));
  };

  type SchedulePreviewItem = { number: number; dueDate: string; amount: number; interest: number; principal: number };

  const schedulePreview = useMemo(() => {
    const schedule: SchedulePreviewItem[] = [];
    const rateDecimal = interestRate / 100;
    let remainingPrincipal = amount;
    const amortizationBase = installmentsCount > 0 ? amount / installmentsCount : 0;
    const priceInstallment = calculatePriceInstallment(amount, rateDecimal, installmentsCount || 1);

    for (let i = 1; i <= installmentsCount; i++) {
      // A primeira parcela deve ser calculada a partir da data de início
      // Se i=1, adiciona 0 meses (usa a data de início), se i=2, adiciona 1 mês, etc.
      const dueDate = addMonths(startDate, i - 1);
      let installmentAmount = amortizationBase;
      let interestPortion = 0;
      let principalPortion = amortizationBase;

      switch (loanModel) {
        case LoanModel.PRICE: {
          interestPortion = remainingPrincipal * rateDecimal;
          const amortization = priceInstallment - interestPortion;
          principalPortion = amortization;
          installmentAmount = priceInstallment;
          remainingPrincipal -= principalPortion;
          break;
        }
        case LoanModel.INTEREST_ONLY: {
          interestPortion = amount * rateDecimal;
          principalPortion = i === installmentsCount ? amount : 0;
          installmentAmount = interestPortion + principalPortion;
          break;
        }
        default:
          break;
      }

      schedule.push({
        number: i,
        dueDate,
        amount: Number(installmentAmount.toFixed(2)),
        interest: Number(interestPortion.toFixed(2)),
        principal: Number(principalPortion.toFixed(2))
      });
    }

    return schedule;
  }, [amount, interestRate, installmentsCount, startDate, loanModel]);

  // Derived calculations
  const totalAmount = useMemo(
    () => schedulePreview.reduce((sum, inst) => sum + inst.amount, 0),
    [schedulePreview]
  );
  const averageInstallment = installmentsCount > 0 ? totalAmount / installmentsCount : 0;

  const loanModelLabel = (model: LoanModel) => {
    switch (model) {
      case LoanModel.PRICE:
        return 'Price';
      case LoanModel.INTEREST_ONLY:
        return 'Somente Juros';
      default:
        return model;
    }
  };

  const handlePromissoryChange = (field: keyof PromissoryNote, value: string | number | IndicationType) => {
    setPromissoryNote(prev => ({ ...prev, [field]: value }));
  };

  // Gerar hashes sequenciais para cada parcela da nota promissória
  // Formato: #1/010#, #2/010#, #3/010#, etc.
  // Onde o primeiro número é sequencial (1, 2, 3...) e o segundo é o número de parcelas
  const generateSequentialHashes = (installmentsCount: number): string[] => {
    const hashes: string[] = [];
    const parcelNumber = installmentsCount.toString().padStart(3, '0');
    
    // Gerar hash sequencial para cada parcela
    for (let i = 1; i <= installmentsCount; i++) {
      hashes.push(`#${i}/${parcelNumber}#`);
    }
    
    return hashes;
  };

  const resetForm = () => {
    setSelectedClientId('');
    setAmount(1000);
    setInterestRate(0.0);
    setInterestRateDisplay('0,0');
    setInstallmentsCount(1);
    setLoanModel(LoanModel.PRICE);
    const today = getTodayDateString();
    setStartDate(today);
    setPromissoryNote(createDefaultPromissoryNote(today, 0.0));
    setEditingLoan(null);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    resetForm();
    onCloseEdit?.();
  };

  const handleCreateLoan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClientId) return;

    const loanId = editingLoan?.id || Math.random().toString(36).substr(2, 9);
    
    // Para INTEREST_ONLY, criar apenas 1 parcela inicial (somente juros)
    let generatedInstallments: Installment[];
    if (loanModel === LoanModel.INTEREST_ONLY) {
      const firstScheduleItem = schedulePreview[0];
      if (!firstScheduleItem) {
        alert('Erro ao gerar parcela inicial.');
        return;
      }
      
      // IMPORTANTE: Para empréstimos "somente juros", os juros devem ser SEMPRE calculados
      // sobre o valor ORIGINAL do empréstimo (amount), não sobre valores calculados do schedulePreview.
      // Isso garante que a taxa de juros permaneça constante do início ao fim do empréstimo.
      // Exemplo: Empréstimo de R$ 1.000 com 10% = R$ 100,00 de juros sempre
      const rateDecimal = interestRate / 100;
      const originalInterestAmount = Number((amount * rateDecimal).toFixed(2));
      
      // Criar apenas a primeira parcela com somente juros
      // O principalAmount representa o capital total em aberto
      generatedInstallments = [{
        id: `inst_${loanId}_1`,
        loanId: loanId,
        clientId: selectedClientId,
        number: 1,
        dueDate: firstScheduleItem.dueDate,
        amount: originalInterestAmount, // SEMPRE usar o valor original dos juros
        interestAmount: originalInterestAmount, // SEMPRE usar o valor original dos juros
        principalAmount: amount, // Capital total em aberto (será reduzido conforme pagamentos)
        amountPaid: 0,
        status: InstallmentStatus.PENDING
      }];
    } else {
      // Para outros modelos, criar todas as parcelas normalmente
      generatedInstallments = schedulePreview.map(scheduleItem => ({
        id: `inst_${loanId}_${scheduleItem.number}`,
        loanId: loanId,
        clientId: selectedClientId,
        number: scheduleItem.number,
        dueDate: scheduleItem.dueDate,
        amount: scheduleItem.amount,
        interestAmount: scheduleItem.interest,
        principalAmount: scheduleItem.principal,
        amountPaid: 0,
        status: InstallmentStatus.PENDING
      }));
    }

    const lastDueDate = generatedInstallments[generatedInstallments.length - 1]?.dueDate || startDate;
    
    // Hash inicial do empréstimo sempre é #1/001#
    // Este hash é usado apenas para identificar o empréstimo
    // As notas promissórias terão hashes sequenciais: #1/010#, #2/010#, #3/010#, etc.
    let noteNumber = promissoryNote.numberHash;
    if (!noteNumber) {
      // Hash inicial sempre começa com #1/001#
      noteNumber = '#1/001#';
    } else {
      // Se já existe um hash, manter o formato mas garantir que seja válido
      const match = noteNumber.match(/#(\d+)\/(\d+)#/);
      if (!match) {
        // Se o formato estiver incorreto, resetar para #1/001#
        noteNumber = '#1/001#';
      }
    }
    
    const promissoryToSave: PromissoryNote = {
      ...promissoryNote,
      capital: Number(promissoryNote.capital || amount),
      interestRate: Number(promissoryNote.interestRate || interestRate),
      issueDate: promissoryNote.issueDate || startDate,
      dueDate: promissoryNote.dueDate || lastDueDate,
      numberHash: noteNumber
    };

    const loanToPersist: Loan = {
      id: loanId,
      clientId: selectedClientId,
      amount,
      interestRate,
      totalAmount: Number(totalAmount.toFixed(2)),
      startDate,
      installmentsCount,
      model: loanModel,
      status: editingLoan ? editingLoan.status : LoanStatus.ACTIVE,
      promissoryNote: promissoryToSave
    };

    if (editingLoan) {
      updateLoan(loanToPersist, generatedInstallments);
    } else {
      addLoan(loanToPersist, generatedInstallments);
    }

    const client = clients.find(c => c.id === selectedClientId);
    if (client) {
      generatePromissoryNotePDF(client.name, client, loanToPersist, generatedInstallments, user?.name || 'Empresa credora');
    }

    handleCloseModal();
  };

  const getClientName = (id: string) => clients.find(c => c.id === id)?.name || 'Desconhecido';

  // Filtrar empréstimos por busca e status
  const filteredLoans = useMemo(() => {
    let filtered = loans;
    
    // Filtro por busca
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(loan => {
        const client = clients.find(c => c.id === loan.clientId);
        const clientName = client?.name || getClientName(loan.clientId);
        return clientName.toLowerCase().includes(searchLower);
      });
    }
    
    // Filtro por status
    if (statusFilter !== 'ALL') {
      filtered = filtered.filter(loan => loan.status === statusFilter);
    }
    
    return filtered;
  }, [loans, clients, searchTerm, statusFilter]);

  const canAdd = user?.role === UserRole.ADMIN;

  const handleEditLoan = (loan: Loan) => {
    setEditingLoan(loan);
    setSelectedClientId(loan.clientId);
    setAmount(loan.amount);
    // Garantir que o valor de juros seja sempre um número válido (0 ou maior)
    const validInterestRate = loan.interestRate !== null && loan.interestRate !== undefined ? loan.interestRate : 0;
    setInterestRate(validInterestRate);
    setInterestRateDisplay(validInterestRate.toString().replace('.', ','));
    setInstallmentsCount(loan.installmentsCount);
    setStartDate(loan.startDate);
    const promissory = loan.promissoryNote || createDefaultPromissoryNote(loan.startDate);
    // Garantir que o interestRate da nota promissória também seja válido
    if (promissory.interestRate === null || promissory.interestRate === undefined) {
      promissory.interestRate = validInterestRate;
    }
    setPromissoryNote(promissory);
    setLoanModel(loan.model || LoanModel.PRICE);
    setIsModalOpen(true);
  };

  const handleDeleteLoan = (loan: Loan) => {
    if (confirm('Deseja remover este empréstimo e suas parcelas?')) {
      deleteLoan(loan.id);
    }
  };

  // Sincronizar juros inicial quando o formulário é aberto (novo empréstimo)
  useEffect(() => {
    if (!editingLoan && isModalOpen) {
      // Garantir que o campo da nota promissória também tenha 0.0%
      setPromissoryNote(prev => {
        if (prev.interestRate !== 0.0) {
          return { ...prev, interestRate: 0.0 };
        }
        return prev;
      });
      setInterestRate(0.0);
      setInterestRateDisplay('0,0');
    }
  }, [isModalOpen, editingLoan]);

  // Atualizar hash inicial do empréstimo quando o cliente for selecionado
  // Hash inicial sempre é #1/001#
  useEffect(() => {
    if (selectedClientId && !editingLoan) {
      setPromissoryNote(prev => {
        // Se não há hash ou o hash não é #1/001#, definir como #1/001#
        if (!prev.numberHash || prev.numberHash !== '#1/001#') {
          return { ...prev, numberHash: '#1/001#' };
        }
        return prev;
      });
    }
  }, [selectedClientId, editingLoan]);

  // Atualizar data de vencimento com a última parcela da simulação
  useEffect(() => {
    if (schedulePreview.length > 0 && !editingLoan) {
      const lastInstallment = schedulePreview[schedulePreview.length - 1];
      if (lastInstallment && lastInstallment.dueDate) {
        setPromissoryNote(prev => ({ ...prev, dueDate: lastInstallment.dueDate }));
      }
    }
  }, [schedulePreview, editingLoan]);

  useEffect(() => {
    if (!editingLoanId) return;
    const loan = loans.find(l => l.id === editingLoanId);
    if (loan) {
      handleEditLoan(loan);
    }
  }, [editingLoanId, loans]);

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

  const renderPromiseHistory = (inst: Installment) => {
    const history = inst.promisedPaymentHistory;
    if (!history?.length) return null;

    const recentHistory = history.slice(-3).reverse();
    return (
      <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
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

  // Função para calcular o valor em aberto do empréstimo
  const calculateOutstandingAmount = (loan: Loan): number => {
    // Se o empréstimo foi finalizado, valor em aberto deve ser sempre 0
    if (loan.status === LoanStatus.PAID) {
      return 0;
    }
    
    const related = installments.filter(inst => inst.loanId === loan.id);
    
    if (related.length === 0) {
      return loan.totalAmount;
    }
    
    // Para empréstimos "somente juros", calcular capital + juros pendentes
    if (loan.model === LoanModel.INTEREST_ONLY) {
      // Calcular capital total pago através do histórico de pagamentos
      const totalCapitalPaid = related.reduce((sum, inst) => {
        if (inst.paymentHistory && inst.paymentHistory.length > 0) {
          return sum + inst.paymentHistory.reduce((pSum, p) => pSum + (p.principalPaid || 0), 0);
        }
        return sum;
      }, 0);
      
      // Se o cliente pagou somente juros (capital pago = 0), manter o capital original
      // Se o cliente pagou juros + capital (capital pago > 0), reduzir o capital pendente
      const pendingCapital = totalCapitalPaid > 0 
        ? Math.max(0, loan.amount - totalCapitalPaid) 
        : loan.amount; // Se só juros foram pagos, manter capital original
      
      // Calcular juros pendentes (de parcelas não pagas)
      let totalInterestPending = 0;
      for (const inst of related) {
        if (inst.status !== InstallmentStatus.PAID) {
          const interest = inst.interestAmount ?? 0;
          if (interest > 0) {
            // Verificar se os juros desta parcela foram pagos
            const interestPaid = inst.paymentHistory?.reduce((sum, p) => sum + (p.interestPaid || 0), 0) || 0;
            const pendingInterest = Math.max(0, interest - interestPaid);
            totalInterestPending += pendingInterest;
          }
        }
      }
      
      const totalOutstanding = pendingCapital + totalInterestPending;
      return Number(totalOutstanding.toFixed(2));
    }
    
    // Para outros modelos, calcular valor total menos o que já foi pago
    const totalPaid = related.reduce((sum, inst) => sum + (inst.amountPaid || 0), 0);
    const outstanding = Math.max(0, loan.totalAmount - totalPaid);
    return Number(outstanding.toFixed(2));
  };

  const getPrincipalAmount = (inst: Installment) => {
    const interest = inst.interestAmount ?? 0;
    return inst.principalAmount ?? Math.max(0, inst.amount - interest);
  };

  const openPromiseModal = (loan: Loan) => {
    const nextInst = findNextInstallment(loan.id);

    if (!nextInst) {
      alert('Nenhuma parcela pendente para agendar recebimento.');
      return;
    }

    const defaults = getPromiseDefaults(nextInst);
    setPromiseModal({ loan, installment: nextInst });
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

  const generatePromissoryNotePDF = (
    safeClientName: string,
    client: Client,
    loan: Loan,
    schedule: Installment[],
    issuerName: string
  ) => {
    if (!loan.promissoryNote) return;

    const printable = window.open('', '_blank', 'width=800,height=900');
    const fileName = `${safeClientName || 'cliente'}.pdf`;

    if (!printable) {
      alert('Não foi possível abrir o gerador de PDF. Verifique o bloqueio de pop-ups.');
      return;
    }

    const { promissoryNote } = loan;

    printable.document.write(`
      <html>
        <head>
          <title>${fileName}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 32px; color: #0f172a; }
            h1 { text-align: center; margin-bottom: 24px; }
            .section { margin-bottom: 10px; }
            .label { font-weight: bold; text-transform: uppercase; font-size: 12px; color: #334155; }
            .value { font-size: 14px; }
            .card { border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin-top: 12px; }
            .schedule { margin-top: 8px; }
            .schedule-row { display: flex; justify-content: space-between; font-size: 13px; padding: 6px 0; border-bottom: 1px solid #e2e8f0; }
            .schedule-row:last-child { border-bottom: none; }
            .schedule-meta { font-size: 11px; color: #64748b; margin-top: 4px; }
            .signatures { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 12px; margin-top: 12px; }
            .signature-box { border: 1px dashed #cbd5e1; border-radius: 12px; padding: 12px; min-height: 140px; display: flex; flex-direction: column; justify-content: space-between; background: #f8fafc; }
            .signature-title { text-transform: uppercase; font-size: 12px; letter-spacing: 0.04em; color: #475569; font-weight: 700; }
            .signature-note { font-size: 12px; color: #64748b; margin-top: 8px; line-height: 1.4; }
            .signature-line { margin-top: 18px; border-top: 1px solid #94a3b8; padding-top: 10px; text-align: center; font-weight: 700; color: #0f172a; }
          </style>
        </head>
        <body>
          <h1>Resumo do empréstimo</h1>
          <div class="section"><span class="label">Número:</span> <span class="value">${promissoryNote.numberHash}</span></div>
          <div class="section"><span class="label">Emitente:</span> <span class="value">${client.name}</span></div>
          <div class="section"><span class="label">CPF:</span> <span class="value">${client.cpf}</span></div>
          <div class="section"><span class="label">Contato:</span> <span class="value">${client.phone} / ${client.email || 'sem email'}</span></div>
          <div class="section"><span class="label">Endereço:</span> <span class="value">${client.street}${client.complement ? ', ' + client.complement : ''}${client.neighborhood ? ' - ' + client.neighborhood : ''}, ${client.city}/${client.state} - CEP ${client.cep}</span></div>
          <div class="card">
            <div class="section"><span class="label">Capital:</span> <span class="value">${formatCurrency(promissoryNote.capital)}</span></div>
            <div class="section"><span class="label">Juros:</span> <span class="value">${formatInterestRate(promissoryNote.interestRate)}</span></div>
            <div class="section"><span class="label">Emissão:</span> <span class="value">${formatDate(promissoryNote.issueDate)}</span></div>
            <div class="section"><span class="label">Vencimento:</span> <span class="value">${formatDate(promissoryNote.dueDate)}</span></div>
            <div class="section"><span class="label">Indicação:</span> <span class="value">${promissoryNote.indication}</span></div>
            ${promissoryNote.observation ? `<div class="section"><span class="label">Observações:</span> <span class="value">${promissoryNote.observation}</span></div>` : ''}
          </div>
          <div class="card">
            <div class="section"><span class="label">Empréstimo:</span> <span class="value">${formatCurrency(loan.amount)} liberado em ${formatDate(loan.startDate)}</span></div>
            <div class="section"><span class="label">Total com juros:</span> <span class="value">${formatCurrency(loan.totalAmount)}</span></div>
            <div class="section"><span class="label">Modelo:</span> <span class="value">${loanModelLabel(loan.model)}</span></div>
            <div class="section"><span class="label">Parcelas:</span> <span class="value">${loan.installmentsCount}x de ${formatCurrency(loan.totalAmount / loan.installmentsCount)}</span></div>
            <div class="section schedule">
              <div class="label">Agenda de pagamento</div>
              ${schedule.map(s => `<div class="schedule-row"><div><div>Parcela ${s.number} - ${formatDate(s.dueDate)}</div><div class="schedule-meta">Juros ${formatCurrency(s.interestAmount ?? Math.max(0, s.amount - (s.principalAmount ?? 0)))} • Amortização ${formatCurrency(s.principalAmount ?? s.amount)}</div></div><span>${formatCurrency(s.amount)}</span></div>`).join('')}
            </div>
          </div>
          <div class="card">
            <div class="section"><span class="label">Autorização e assinaturas digitais</span></div>
            <div class="signatures">
              <div class="signature-box">
                <div>
                  <div class="signature-title">Assinatura do credor (empresa)</div>
                  <p class="signature-note">Área reservada para assinatura digital do representante da empresa responsável pela emissão da nota promissória.</p>
                </div>
                <div class="signature-line">${issuerName || 'Empresa credora'}</div>
              </div>
              <div class="signature-box">
                <div>
                  <div class="signature-title">Assinatura do devedor (cliente)</div>
                  <p class="signature-note">Confirmação de ciência e concordância com os valores, datas e condições descritas nesta nota.</p>
                </div>
                <div class="signature-line">${client.name}</div>
              </div>
            </div>
          </div>
        </body>
      </html>
    `);
    printable.document.title = fileName;
    printable.document.close();
    printable.focus();
    printable.print();
  };

  /**
   * Gera nota promissória no formato oficial aceito por cartórios para protesto
   * Formato baseado nos requisitos legais brasileiros
   * Gera uma nota promissória para cada parcela do empréstimo
   */
  const generateOfficialPromissoryNote = (
    safeClientName: string,
    client: Client,
    loan: Loan,
    issuerName: string,
    issuerData?: {
      name?: string;
      cnpj?: string;
      address?: string;
      city?: string;
      state?: string;
      cep?: string;
    }
  ) => {
    if (!loan.promissoryNote) {
      alert('Nota promissória não encontrada para este empréstimo.');
      return;
    }

    const printable = window.open('', '_blank', 'width=800,height=1100');
    const fileName = `Nota_Promissoria_${safeClientName || 'cliente'}.pdf`;

    if (!printable) {
      alert('Não foi possível abrir o gerador de PDF. Verifique o bloqueio de pop-ups.');
      return;
    }

    const { promissoryNote } = loan;
    
    // Buscar parcelas do empréstimo e ordenar por data de vencimento
    const loanInstallments = installments
      .filter(inst => inst.loanId === loan.id)
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
    
    // Gerar hashes sequenciais para cada parcela
    // Formato: #1/010#, #2/010#, #3/010#, etc.
    // Onde o primeiro número é sequencial (1, 2, 3...) e o segundo é o número de parcelas
    const hashes = generateSequentialHashes(loan.installmentsCount);
    
    // Dados do credor (empresa)
    const creditorName = issuerData?.name || issuerName || 'Empresa Credora';
    const creditorCnpj = issuerData?.cnpj || 'CNPJ não informado';
    const creditorAddress = issuerData?.address || 'Endereço não informado';
    const creditorCity = issuerData?.city || 'Cidade não informada';
    const creditorState = issuerData?.state || 'Estado não informado';
    const creditorCep = issuerData?.cep || 'CEP não informado';
    
    // Dados do devedor (cliente)
    const debtorName = client.name;
    const debtorCpf = client.cpf || 'CPF não informado';
    const debtorAddress = `${client.street || ''}${client.complement ? ', ' + client.complement : ''}${client.neighborhood ? ' - ' + client.neighborhood : ''}`.trim() || 'Endereço não informado';
    const debtorCity = client.city || 'Cidade não informada';
    const debtorState = client.state || 'Estado não informado';
    const debtorCep = client.cep || 'CEP não informado';
    
    // Local de pagamento (cidade e estado do devedor/cliente)
    const paymentLocation = `${debtorCity}/${debtorState}`;

    // Formatar data de vencimento para texto extenso
    const formatDateToWords = (dateStr: string): string => {
      // Normalizar a data (pode vir em YYYY-MM-DD ou outro formato)
      let normalizedDate = dateStr;
      if (dateStr.includes('T')) {
        normalizedDate = dateStr.split('T')[0];
      } else if (dateStr.includes(' ')) {
        normalizedDate = dateStr.split(' ')[0];
      }
      
      // Parse a data no formato YYYY-MM-DD
      const [year, month, day] = normalizedDate.split('-').map(Number);
      
      const months = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 
                     'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
      
      const dayWords = ['', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove', 'dez',
                       'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove',
                       'vinte', 'vinte e um', 'vinte e dois', 'vinte e três', 'vinte e quatro', 'vinte e cinco',
                       'vinte e seis', 'vinte e sete', 'vinte e oito', 'vinte e nove', 'trinta', 'trinta e um'];
      
      const yearWords = numberToWords(year).replace('reais', '').trim();
      
      const dayWord = dayWords[day] || day.toString();
      const monthWord = months[month - 1] || '';
      
      return `${dayWord.toUpperCase()} de ${monthWord.toUpperCase()} de ${yearWords.toUpperCase()}`;
    };

    // Gerar notas promissórias para cada parcela
    // Cada parcela tem um hash sequencial: #1/010#, #2/010#, #3/010#, etc.
    // Agrupar em grupos de até 3 notas por página A4
    const notesHtml = loanInstallments.length > 0 
      ? loanInstallments.map((installment, index) => {
          // Cada parcela usa um hash sequencial baseado no índice (1, 2, 3...)
          const installmentHash = hashes[index] || hashes[0];
          const installmentDueDate = installment.dueDate;
          const installmentDueDateWords = formatDateToWords(installmentDueDate);
          const installmentValue = installment.amount;
          const installmentValueWords = numberToWords(installmentValue);
          const installmentIssueDate = formatDate(promissoryNote.issueDate);
          const installmentDueDateFormatted = formatDate(installmentDueDate);
          
          // Adicionar quebra de página após cada grupo de 3 notas (índices 2, 5, 8, etc.)
          // Ou seja, após a 3ª, 6ª, 9ª nota, etc.
          const shouldBreakPage = (index + 1) % 3 === 0 && index < loanInstallments.length - 1;
          const pageBreakClass = shouldBreakPage ? 'page-break-after' : '';
          
          return `
            <div class="note-container ${pageBreakClass}">
              <div class="header-row">
                <div class="header-left">
                  <h1>NOTA PROMISSÓRIA</h1>
                </div>
                <div class="header-right">
                  <div class="document-number">
                    <strong>Nº</strong> ${installmentHash}
                  </div>
                  <div class="due-date">
                    <strong>Vencimento:</strong> ${installmentDueDateWords}
                  </div>
                </div>
              </div>

              <div class="promise-text">
                <p>
                  No dia <strong>${installmentDueDateWords}</strong> pagarei por esta única via de <strong>NOTA PROMISSÓRIA</strong> 
                  a <strong>${creditorName}</strong>${creditorCnpj && creditorCnpj !== 'CNPJ não informado' ? ' CNPJ ' + creditorCnpj : ''} ou à sua ordem 
                  a quantia de <strong>${installmentValueWords.toUpperCase()}</strong> em moeda corrente desse país.
                </p>
              </div>

              <div class="value-highlight">
                <strong>${formatCurrency(installmentValue)}</strong>
              </div>

              <div class="info-section">
                <div class="info-row">
                  <span class="info-label">Local de pagamento:</span> ${paymentLocation}
                </div>
                <div class="info-row">
                  <span class="info-label">Data da Emissão:</span> ${installmentIssueDate}
                </div>
                <div class="info-row">
                  <span class="info-label">Parcela:</span> ${installment.number} de ${loanInstallments.length}
                </div>
              </div>

              <div class="issuer-section">
                <div class="issuer-title">Nome do Emitente:</div>
                <div class="issuer-info">
                  <strong>${debtorName}</strong><br>
                  CPF: ${debtorCpf ? formatCpf(debtorCpf) : 'não informado'}<br>
                  Endereço: ${debtorAddress}${debtorAddress && debtorCity ? ',' : ''}${debtorCity ? ' ' + debtorCity : ''}${debtorState ? '/' + debtorState : ''}${debtorCep ? ' - CEP:' + formatCep(debtorCep) : ''}
                </div>
              </div>

              <div class="signature-section">
                <div class="signature-label">Assinatura do Emitente</div>
              </div>
            </div>
          `;
        }).join('')
      : (() => {
          // Fallback: gerar uma única nota se não houver parcelas
          const dueDateWords = formatDateToWords(promissoryNote.dueDate);
          const noteValue = loan.totalAmount;
          const noteValueWords = numberToWords(noteValue);
          const issueDate = formatDate(promissoryNote.issueDate);
          
          return `
            <div class="note-container">
              <div class="header-row">
                <div class="header-left">
                  <h1>NOTA PROMISSÓRIA</h1>
                </div>
                <div class="header-right">
                  <div class="document-number">
                    <strong>Nº</strong> ${promissoryNote.numberHash}
                  </div>
                  <div class="due-date">
                    <strong>Vencimento:</strong> ${dueDateWords}
                  </div>
                </div>
              </div>

              <div class="promise-text">
                <p>
                  No dia <strong>${dueDateWords}</strong> pagarei por esta única via de <strong>NOTA PROMISSÓRIA</strong> 
                  a <strong>${creditorName}</strong>${creditorCnpj && creditorCnpj !== 'CNPJ não informado' ? ' CNPJ ' + creditorCnpj : ''} ou à sua ordem 
                  a quantia de <strong>${noteValueWords.toUpperCase()}</strong> em moeda corrente desse país.
                </p>
              </div>

              <div class="value-highlight">
                <strong>${formatCurrency(noteValue)}</strong>
              </div>

              <div class="info-section">
                <div class="info-row">
                  <span class="info-label">Local de pagamento:</span> ${paymentLocation}
                </div>
                <div class="info-row">
                  <span class="info-label">Data da Emissão:</span> ${issueDate}
                </div>
              </div>

              <div class="issuer-section">
                <div class="issuer-title">Nome do Emitente:</div>
                <div class="issuer-info">
                  <strong>${debtorName}</strong><br>
                  CPF: ${debtorCpf ? formatCpf(debtorCpf) : 'não informado'}<br>
                  Endereço: ${debtorAddress}${debtorAddress && debtorCity ? ',' : ''}${debtorCity ? ' ' + debtorCity : ''}${debtorState ? '/' + debtorState : ''}${debtorCep ? ' - CEP:' + formatCep(debtorCep) : ''}
                </div>
              </div>

              <div class="signature-section">
                <div class="signature-label">Assinatura do Emitente</div>
              </div>
            </div>
          `;
        })();

    printable.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>${fileName}</title>
          <style>
            @media print {
              @page {
                size: A4;
                margin: 0.8cm;
              }
              .note-container {
                page-break-inside: avoid;
                break-inside: avoid;
              }
              .page-break-after {
                page-break-after: always;
                break-after: page;
              }
            }
            body {
              font-family: 'Times New Roman', serif;
              font-size: 9pt;
              line-height: 1.3;
              color: #000;
              padding: 5px;
              margin: 0;
            }
            .note-container {
              border: 1px solid #000;
              padding: 12px;
              margin-bottom: 8px;
              height: calc((100vh - 1.6cm) / 3);
              max-height: 9.2cm;
              min-height: 9cm;
              position: relative;
              display: flex;
              flex-direction: column;
              box-sizing: border-box;
            }
            .header-row {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              margin-bottom: 8px;
              border-bottom: 1px solid #000;
              padding-bottom: 6px;
              flex-shrink: 0;
            }
            .header-left {
              flex: 1;
            }
            .header-right {
              text-align: right;
              font-size: 8pt;
            }
            .header-left h1 {
              font-size: 13pt;
              font-weight: bold;
              margin: 0;
              text-transform: uppercase;
              letter-spacing: 0.3px;
            }
            .document-number {
              font-size: 9pt;
              margin-bottom: 3px;
              font-weight: bold;
            }
            .due-date {
              font-size: 8pt;
            }
            .promise-text {
              text-align: justify;
              margin: 8px 0;
              font-size: 9pt;
              line-height: 1.4;
              flex-shrink: 0;
            }
            .promise-text p {
              margin: 0;
            }
            .value-highlight {
              text-align: center;
              margin: 10px 0;
              padding: 8px;
              border: 2px solid #000;
              font-size: 12pt;
              font-weight: bold;
              flex-shrink: 0;
            }
            .value-highlight strong {
              font-size: 14pt;
            }
            .info-section {
              margin: 6px 0;
              font-size: 8.5pt;
              flex-shrink: 0;
            }
            .info-row {
              margin: 3px 0;
            }
            .info-label {
              font-weight: bold;
            }
            .issuer-section {
              margin-top: 8px;
              font-size: 8.5pt;
              flex-shrink: 0;
            }
            .issuer-title {
              font-weight: bold;
              margin-bottom: 4px;
            }
            .issuer-info {
              line-height: 1.4;
            }
            .signature-section {
              margin-top: auto;
              text-align: center;
              border-top: 1px solid #000;
              padding-top: 6px;
              min-height: 40px;
              flex-shrink: 0;
            }
            .signature-name {
              font-weight: bold;
              margin-top: 6px;
              font-size: 9pt;
            }
            .signature-label {
              font-size: 8pt;
              margin-top: 4px;
              color: #333;
            }
          </style>
        </head>
        <body>
          ${notesHtml}
        </body>
      </html>
    `);
    
    printable.document.title = fileName;
    printable.document.close();
    printable.focus();
    printable.print();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-800">Empréstimos</h2>
        {canAdd && (
          <button
            onClick={() => { resetForm(); setIsModalOpen(true); }}
            className="bg-emerald-600 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 hover:bg-emerald-700 transition shadow-lg shadow-emerald-200"
          >
            <Plus size={18} /> Novo Empréstimo
          </button>
        )}
      </div>

      {/* Filtros: Busca e Status */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:bg-white focus:border-emerald-500 transition-colors text-slate-700"
              placeholder="Buscar por nome do cliente..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <div>
            <select
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:bg-white focus:border-emerald-500 transition-colors text-slate-700"
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as LoanStatus | 'ALL')}
            >
              <option value="ALL">Todos os status</option>
              <option value={LoanStatus.ACTIVE}>Em Aberto</option>
              <option value={LoanStatus.PAID}>Finalizado</option>
              <option value={LoanStatus.DEFAULTED}>Em Atraso</option>
            </select>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto bg-white rounded-xl border border-slate-200 shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold">
            <tr>
              <th className="p-4">Cliente</th>
              <th className="p-4">Valor Principal</th>
              <th className="p-4">Total (+Juros)</th>
              <th className="p-4">Valor em Aberto</th>
              <th className="p-4">Modelo</th>
              <th className="p-4">Parcelas</th>
              <th className="p-4">Data</th>
              <th className="p-4">Status</th>
              {canAdd && <th className="p-4 text-center">Ações</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredLoans.map(loan => {
              const clientInstallments = installments.filter(inst => inst.loanId === loan.id);
              const loanClient = clients.find(c => c.id === loan.clientId);
              const clientName = loanClient?.name || getClientName(loan.clientId);
              const nextInstallment = findNextInstallment(loan.id);
              const latestPromise = nextInstallment ? getLatestPromise(nextInstallment) : null;
              const statusStyle = loan.status === LoanStatus.ACTIVE
                ? 'bg-blue-100 text-blue-700'
                : loan.status === LoanStatus.PAID
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-red-100 text-red-700';
              const statusLabel = loan.status === LoanStatus.ACTIVE
                ? 'Em Aberto'
                : loan.status === LoanStatus.PAID
                  ? 'Finalizado'
                  : 'Em Atraso';
              // Calcular valor em aberto
              const outstandingAmount = calculateOutstandingAmount(loan);

              return (
              <tr key={loan.id} className="hover:bg-slate-50 transition">
                <td className="p-4 font-medium text-slate-800">
                  {clientName}
                  {latestPromise && latestPromise.date && (
                    <div className="mt-1 text-xs text-purple-700 font-semibold leading-snug">
                      Próximo agendamento: {formatDate(latestPromise.date)} — {formatCurrency(latestPromise.amount)}
                      <div className="text-[11px] text-slate-500 font-normal">{latestPromise.reason}</div>
                    </div>
                  )}
                </td>
                <td className="p-4">{formatCurrency(loan.amount)}</td>
                <td className="p-4 font-semibold text-emerald-600">{formatCurrency(loan.totalAmount)}</td>
                <td className="p-4 font-bold text-amber-600">{formatCurrency(outstandingAmount)}</td>
                <td className="p-4 text-slate-600">{loanModelLabel(loan.model)}</td>
                <td className="p-4">{loan.installmentsCount}x</td>
                <td className="p-4 text-slate-500">{formatDate(loan.startDate)}</td>
                <td className="p-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-bold ${statusStyle}`}>
                    {statusLabel}
                  </span>
                </td>
                {canAdd && (
                  <td className="p-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() =>
                          loanClient &&
                          generatePromissoryNotePDF(
                            clientName,
                            loanClient,
                            loan,
                            clientInstallments,
                            user?.name || 'Empresa credora'
                          )
                        }
                        className="p-2 rounded-lg hover:bg-emerald-50 text-emerald-600"
                        aria-label="Gerar PDF da nota"
                        title="Gerar resumo do empréstimo"
                      >
                        <FileText size={18} />
                      </button>
                      <button
                        onClick={() =>
                          loanClient &&
                          generateOfficialPromissoryNote(
                            clientName,
                            loanClient,
                            loan,
                            user?.name || 'Empresa credora'
                          )
                        }
                        className="p-2 rounded-lg hover:bg-blue-50 text-blue-600"
                        aria-label="Gerar Nota Promissória Oficial"
                        title="Gerar Nota Promissória no formato oficial para cartório"
                      >
                        <Scale size={18} />
                      </button>
                      {loan.status !== LoanStatus.PAID && (
                        <button
                          onClick={() => openPromiseModal(loan)}
                          className="p-2 rounded-lg hover:bg-purple-50 text-purple-600"
                          aria-label="Agendar recebimento"
                        >
                          <Clock8 size={18} />
                        </button>
                      )}
                      {loan.status === LoanStatus.PAID && (
                        <button
                          onClick={() => reopenLoan(loan.id)}
                          className="p-2 rounded-lg hover:bg-blue-50 text-blue-600"
                          aria-label="Reabrir empréstimo"
                          title="Reabrir empréstimo finalizado"
                        >
                          <RotateCcw size={18} />
                        </button>
                      )}
                      <button
                        onClick={() => handleEditLoan(loan)}
                        className="p-2 rounded-lg hover:bg-slate-100 text-slate-500"
                        aria-label="Editar empréstimo"
                      >
                        <Pencil size={18} />
                      </button>
                      <button
                        onClick={() => handleDeleteLoan(loan)}
                        className="p-2 rounded-lg hover:bg-red-50 text-red-500"
                        aria-label="Excluir empréstimo"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                )}
              </tr>
              );
            })}
            {filteredLoans.length === 0 && (
                <tr>
                    <td colSpan={canAdd ? 8 : 7} className="p-8 text-center text-slate-400">
                      {searchTerm ? 'Nenhum empréstimo encontrado com esse termo.' : 'Nenhum empréstimo cadastrado.'}
                    </td>
                </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal - New Loan */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex items-center gap-2 mb-6 text-emerald-600">
                <Calculator />
                <h3 className="text-xl font-bold text-slate-900">{editingLoan ? 'Editar Empréstimo' : 'Simular Empréstimo'}</h3>
            </div>
            
            <form onSubmit={handleCreateLoan} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Cliente</label>
                <select 
                    required 
                    className="w-full border border-slate-300 rounded-lg p-3 bg-slate-50 focus:bg-white transition-colors"
                    value={selectedClientId}
                    onChange={e => setSelectedClientId(e.target.value)}
                >
                    <option value="">Selecione um cliente...</option>
                    {clients
                      .filter(c => c.status === 'active' || c.id === editingLoan?.clientId)
                      .map(c => (
                        <option key={c.id} value={c.id}>{c.name} - {c.cpf}</option>
                      ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Valor (R$)</label>
                    <input
                      type="number"
                      min="1"
                      className="w-full border border-slate-300 rounded-lg p-3 bg-slate-50 focus:bg-white transition-colors"
                      value={amount}
                      onChange={e => {
                        const value = parseFloat(e.target.value);
                        setAmount(value);
                        setPromissoryNote(prev => ({ ...prev, capital: value }));
                      }}
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Juros (%)</label>
                    <input
                      type="text"
                      inputMode="decimal"
                      className="w-full border border-slate-300 rounded-lg p-3 bg-slate-50 focus:bg-white transition-colors"
                      value={interestRateDisplay}
                      onChange={e => {
                        let inputValue = e.target.value;
                        
                        // Permitir campo vazio durante digitação
                        if (inputValue === '') {
                          setInterestRateDisplay('');
                          setInterestRate(0);
                          setPromissoryNote(prev => ({ ...prev, interestRate: 0 }));
                          return;
                        }
                        
                        // Remover caracteres inválidos, mantendo apenas números, vírgula e ponto
                        let cleaned = inputValue.replace(/[^\d,.]/g, '');
                        
                        // Normalizar: aceitar vírgula ou ponto como separador decimal
                        // Se houver múltiplos separadores, manter apenas o primeiro
                        let hasDecimal = false;
                        let normalized = '';
                        for (let i = 0; i < cleaned.length; i++) {
                          const char = cleaned[i];
                          if (char === ',' || char === '.') {
                            if (!hasDecimal) {
                              normalized += ',';
                              hasDecimal = true;
                            }
                          } else {
                            normalized += char;
                          }
                        }
                        
                        // Atualizar o valor exibido
                        setInterestRateDisplay(normalized);
                        
                        // Converter para número e atualizar o estado numérico
                        if (normalized === '' || normalized === ',') {
                          setInterestRate(0);
                          setPromissoryNote(prev => ({ ...prev, interestRate: 0 }));
                        } else {
                          const numValue = parseFloat(normalized.replace(',', '.'));
                          if (!isNaN(numValue) && numValue >= 0 && isFinite(numValue)) {
                            // Limitar a 2 casas decimais
                            const roundedValue = Math.round(numValue * 100) / 100;
                            setInterestRate(roundedValue);
                            setPromissoryNote(prev => ({ ...prev, interestRate: roundedValue }));
                          }
                        }
                      }}
                      onBlur={e => {
                        // Ao sair do campo, garantir formato válido
                        const inputValue = e.target.value.trim();
                        
                        if (inputValue === '' || inputValue === ',' || inputValue === '.') {
                          setInterestRateDisplay('0,0');
                          setInterestRate(0);
                          setPromissoryNote(prev => ({ ...prev, interestRate: 0 }));
                        } else {
                          // Normalizar e formatar corretamente
                          const normalizedValue = inputValue.replace(',', '.');
                          const numValue = parseFloat(normalizedValue);
                          
                          if (!isNaN(numValue) && numValue >= 0) {
                            const roundedValue = Math.round(numValue * 100) / 100;
                            setInterestRate(roundedValue);
                            setInterestRateDisplay(roundedValue.toString().replace('.', ','));
                            setPromissoryNote(prev => ({ ...prev, interestRate: roundedValue }));
                          } else {
                            // Se inválido, resetar para 0
                            setInterestRateDisplay('0,0');
                            setInterestRate(0);
                            setPromissoryNote(prev => ({ ...prev, interestRate: 0 }));
                          }
                        }
                      }}
                      placeholder="0,0"
                    />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Modelo de Empréstimo</label>
                <select
                  className="w-full border border-slate-300 rounded-lg p-3 bg-slate-50 focus:bg-white transition-colors"
                  value={loanModel}
                  onChange={e => setLoanModel(e.target.value as LoanModel)}
                >
                  <option value={LoanModel.PRICE}>Price</option>
                  <option value={LoanModel.INTEREST_ONLY}>Somente Juros</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Parcelas</label>
                    <input
                      type="number"
                      min="1" 
                      max="48" 
                      className="w-full border border-slate-300 rounded-lg p-3 bg-slate-50 focus:bg-white transition-colors" 
                      value={installmentsCount} 
                      onChange={e => setInstallmentsCount(parseInt(e.target.value))} 
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">1ª Parcela</label>
                    <input
                      type="date"
                      required
                      className="w-full border border-slate-300 rounded-lg p-3 bg-slate-50 focus:bg-white transition-colors"
                      value={startDate}
                      onChange={e => {
                        const value = e.target.value;
                        setStartDate(value);
                        setPromissoryNote(prev => ({ ...prev, issueDate: value, dueDate: prev.dueDate || value }));
                      }}
                    />
                </div>
              </div>

              {/* Summary Card */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mt-4 space-y-2">
                <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Valor a liberar:</span>
                    <span className="font-medium">{formatCurrency(amount)}</span>
                </div>
                <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Total a receber:</span>
                    <span className="font-bold text-emerald-600">{formatCurrency(totalAmount)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Modelo</span>
                  <span className="font-medium text-slate-800">{loanModelLabel(loanModel)}</span>
                </div>
                <div className="pt-2 border-t border-slate-200 flex justify-between items-center">
                    <span className="text-sm font-bold text-slate-700">Parcelas:</span>
                    <span className="text-lg font-bold text-slate-900">{installmentsCount}x de {formatCurrency(averageInstallment)}</span>
                </div>
              </div>


              <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">Simulação das parcelas</p>
                    <p className="text-xs text-slate-500">Juros e amortização por parcela para enviar ao cliente.</p>
                  </div>
                  <span className="text-xs font-bold px-2 py-1 rounded-full bg-slate-100 text-slate-700">{loanModelLabel(loanModel)}</span>
                </div>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {schedulePreview.map(item => (
                    <div key={item.number} className="flex justify-between items-start border-b border-slate-100 pb-2 last:border-0">
                      <div>
                        <div className="text-sm font-medium text-slate-800">Parcela {item.number} - {formatDate(item.dueDate)}</div>
                        <div className="text-xs text-slate-500">Juros {formatCurrency(item.interest)} • Amortização {formatCurrency(item.principal)}</div>
                      </div>
                      <div className="text-sm font-semibold text-slate-900">{formatCurrency(item.amount)}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <FileText size={18} className="text-emerald-600" />
                  <div>
                    <p className="text-sm font-semibold text-slate-800">Nota promissória do empréstimo</p>
                    <p className="text-xs text-slate-500">Os dados serão salvos junto ao empréstimo e usados na geração do PDF.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Indicação</label>
                    <select
                      className="w-full border border-slate-300 rounded-lg p-3 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 transition-colors"
                      value={promissoryNote.indication}
                      onChange={e => handlePromissoryChange('indication', e.target.value as IndicationType)}
                    >
                      <option value="Garantia">Garantia</option>
                      <option value="Sem Garantia">Sem Garantia</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Hash da Nota</label>
                    <input
                      className="w-full border border-slate-300 rounded-lg p-3 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 transition-colors"
                      value={promissoryNote.numberHash}
                      onChange={e => handlePromissoryChange('numberHash', e.target.value)}
                      placeholder="#1/001#"
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      Hash inicial do empréstimo: #1/001#. As notas promissórias terão hashes sequenciais: #1/010#, #2/010#, #3/010#, etc.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Capital (R$)</label>
                    <input
                      required
                      type="number"
                      min="0"
                      className="w-full border border-slate-300 rounded-lg p-3 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 transition-colors"
                      placeholder="Valor principal"
                      value={promissoryNote.capital}
                      onChange={e => handlePromissoryChange('capital', parseFloat(e.target.value))}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Juros (%)</label>
                    <input
                      required
                      type="text"
                      inputMode="decimal"
                      className="w-full border border-slate-300 rounded-lg p-3 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 transition-colors"
                      placeholder="0,0"
                      value={interestRateDisplay}
                      onChange={e => {
                        let inputValue = e.target.value;
                        
                        // Permitir campo vazio durante digitação
                        if (inputValue === '') {
                          setInterestRateDisplay('');
                          setInterestRate(0);
                          handlePromissoryChange('interestRate', 0);
                          return;
                        }
                        
                        // Remover caracteres inválidos, mantendo apenas números, vírgula e ponto
                        let cleaned = inputValue.replace(/[^\d,.]/g, '');
                        
                        // Normalizar: aceitar vírgula ou ponto como separador decimal
                        // Se houver múltiplos separadores, manter apenas o primeiro
                        let hasDecimal = false;
                        let normalized = '';
                        for (let i = 0; i < cleaned.length; i++) {
                          const char = cleaned[i];
                          if (char === ',' || char === '.') {
                            if (!hasDecimal) {
                              normalized += ',';
                              hasDecimal = true;
                            }
                          } else {
                            normalized += char;
                          }
                        }
                        
                        // Atualizar o valor exibido
                        setInterestRateDisplay(normalized);
                        
                        // Converter para número e atualizar o estado numérico
                        if (normalized === '' || normalized === ',') {
                          setInterestRate(0);
                          handlePromissoryChange('interestRate', 0);
                        } else {
                          const numValue = parseFloat(normalized.replace(',', '.'));
                          if (!isNaN(numValue) && numValue >= 0 && isFinite(numValue)) {
                            // Limitar a 2 casas decimais
                            const roundedValue = Math.round(numValue * 100) / 100;
                            setInterestRate(roundedValue);
                            handlePromissoryChange('interestRate', roundedValue);
                          }
                        }
                      }}
                      onBlur={e => {
                        // Ao sair do campo, garantir formato válido
                        const inputValue = e.target.value.trim();
                        
                        if (inputValue === '' || inputValue === ',' || inputValue === '.') {
                          setInterestRateDisplay('0,0');
                          setInterestRate(0);
                          handlePromissoryChange('interestRate', 0);
                        } else {
                          // Normalizar e formatar corretamente
                          const normalizedValue = inputValue.replace(',', '.');
                          const numValue = parseFloat(normalizedValue);
                          
                          if (!isNaN(numValue) && numValue >= 0) {
                            const roundedValue = Math.round(numValue * 100) / 100;
                            setInterestRate(roundedValue);
                            setInterestRateDisplay(roundedValue.toString().replace('.', ','));
                            handlePromissoryChange('interestRate', roundedValue);
                          } else {
                            // Se inválido, resetar para 0
                            setInterestRateDisplay('0,0');
                            setInterestRate(0);
                            handlePromissoryChange('interestRate', 0);
                          }
                        }
                      }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Emissão</label>
                    <input
                      required
                      type="date"
                      className="w-full border border-slate-300 rounded-lg p-3 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 transition-colors"
                      value={promissoryNote.issueDate}
                      onChange={e => handlePromissoryChange('issueDate', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Vencimento</label>
                    <input
                      required
                      type="date"
                      className="w-full border border-slate-300 rounded-lg p-3 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 transition-colors"
                      value={promissoryNote.dueDate}
                      onChange={e => handlePromissoryChange('dueDate', e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Observações</label>
                  <textarea
                    className="w-full border border-slate-300 rounded-lg p-3 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 transition-colors"
                    placeholder="Instruções adicionais para assinatura e cobrança"
                    value={promissoryNote.observation || ''}
                    onChange={e => handlePromissoryChange('observation', e.target.value)}
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button type="button" onClick={handleCloseModal} className="flex-1 py-3 border rounded-xl font-medium hover:bg-slate-50">Cancelar</button>
                <button type="submit" className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700">{editingLoan ? 'Salvar alterações' : 'Confirmar Empréstimo'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {promiseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="mb-4">
              <h3 className="text-xl font-bold text-slate-900">Agendar recebimento</h3>
              <p className="text-sm text-slate-600">
                {promiseModal.loan.model ? loanModelLabel(promiseModal.loan.model) : 'Empréstimo'} • Parcela {promiseModal.installment.number} do cliente {clients.find(c => c.id === promiseModal.loan.clientId)?.name}
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
