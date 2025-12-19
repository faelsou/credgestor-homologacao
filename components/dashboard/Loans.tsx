import React, { useContext, useEffect, useMemo, useState } from 'react';
import { AppContext } from '../../App';
import { formatCurrency, formatDate, generateNoteHash, getTodayDateString } from '../../utils';
import { LoanStatus, Installment, InstallmentStatus, UserRole, Loan, PromissoryNote, IndicationType, Client, LoanModel } from '../../types';
import { Plus, Calculator, Pencil, Trash2, FileText, Clock8 } from 'lucide-react';

interface LoansViewProps {
  editingLoanId?: string | null;
  onCloseEdit?: () => void;
}

export const LoansView: React.FC<LoansViewProps> = ({ editingLoanId, onCloseEdit }) => {
  const { loans, clients, installments, addLoan, updateLoan, deleteLoan, user, scheduleFuturePayment } = useContext(AppContext);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLoan, setEditingLoan] = useState<Loan | null>(null);
  const [promiseModal, setPromiseModal] = useState<{ loan: Loan; installment: Installment } | null>(null);
  const [promiseReason, setPromiseReason] = useState('');
  const [promiseAmount, setPromiseAmount] = useState(0);
  const [promiseDate, setPromiseDate] = useState(getTodayDateString());
  
  // Form State
  const [selectedClientId, setSelectedClientId] = useState('');
  const [amount, setAmount] = useState(1000);
  const [interestRate, setInterestRate] = useState(20); // 20%
  const [installmentsCount, setInstallmentsCount] = useState(4);
  const [startDate, setStartDate] = useState(getTodayDateString());
  const [loanModel, setLoanModel] = useState<LoanModel>(LoanModel.PRICE);
  const createDefaultPromissoryNote = (baseDate: string): PromissoryNote => ({
    capital: amount,
    interestRate: interestRate,
    issueDate: baseDate,
    dueDate: baseDate,
    indication: 'Sem Garantia',
    numberHash: generateNoteHash(),
    observation: ''
  });
  const [promissoryNote, setPromissoryNote] = useState<PromissoryNote>(createDefaultPromissoryNote(startDate));

  const addMonths = (dateString: string, months: number) => {
    const baseDate = new Date(dateString);
    const newDate = new Date(baseDate.setMonth(baseDate.getMonth() + months));
    return newDate.toISOString().split('T')[0];
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
      const dueDate = addMonths(startDate, i);
      let installmentAmount = amortizationBase;
      let interestPortion = 0;
      let principalPortion = amortizationBase;

      switch (loanModel) {
        case LoanModel.FIXED_AMORTIZATION:
          installmentAmount = amortizationBase;
          principalPortion = amortizationBase;
          remainingPrincipal -= principalPortion;
          break;
        case LoanModel.SIMPLE_INTEREST: {
          interestPortion = amount * rateDecimal;
          principalPortion = amortizationBase;
          installmentAmount = principalPortion + interestPortion;
          remainingPrincipal -= principalPortion;
          break;
        }
        case LoanModel.COMPOUND_INTEREST: {
          interestPortion = remainingPrincipal * rateDecimal;
          principalPortion = Math.min(amortizationBase, remainingPrincipal);
          installmentAmount = principalPortion + interestPortion;
          remainingPrincipal = remainingPrincipal + interestPortion - principalPortion;
          break;
        }
        case LoanModel.SAC: {
          interestPortion = remainingPrincipal * rateDecimal;
          principalPortion = amortizationBase;
          installmentAmount = principalPortion + interestPortion;
          remainingPrincipal -= principalPortion;
          break;
        }
        case LoanModel.PRICE: {
          interestPortion = remainingPrincipal * rateDecimal;
          const amortization = priceInstallment - interestPortion;
          principalPortion = amortization;
          installmentAmount = priceInstallment;
          remainingPrincipal -= principalPortion;
          break;
        }
        case LoanModel.PARTICULAR: {
          interestPortion = amount * rateDecimal;
          principalPortion = amortizationBase;
          installmentAmount = principalPortion + interestPortion;
          remainingPrincipal = Math.max(0, remainingPrincipal - principalPortion);
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
      case LoanModel.FIXED_AMORTIZATION:
        return 'Amortização Fixa';
      case LoanModel.SIMPLE_INTEREST:
        return 'Juros Simples';
      case LoanModel.COMPOUND_INTEREST:
        return 'Juros Compostos';
      case LoanModel.SAC:
        return 'SAC';
      case LoanModel.PRICE:
        return 'Price';
      case LoanModel.PARTICULAR:
        return 'Modelo Particular';
      case LoanModel.INTEREST_ONLY:
        return 'Somente Juros';
      default:
        return model;
    }
  };

  const handlePromissoryChange = (field: keyof PromissoryNote, value: string | number | IndicationType) => {
    setPromissoryNote(prev => ({ ...prev, [field]: value }));
  };

  const resetForm = () => {
    setSelectedClientId('');
    setAmount(1000);
    setInterestRate(20);
    setInstallmentsCount(4);
    setLoanModel(LoanModel.PRICE);
    const today = getTodayDateString();
    setStartDate(today);
    setPromissoryNote(createDefaultPromissoryNote(today));
    setEditingLoan(null);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    resetForm();
    onCloseEdit?.();
  };

  const handleCreateLoan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClientId) return;

    const loanId = editingLoan?.id || Math.random().toString(36).substr(2, 9);
    
      const generatedInstallments: Installment[] = schedulePreview.map(scheduleItem => ({
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

    const lastDueDate = generatedInstallments[generatedInstallments.length - 1]?.dueDate || startDate;
    const promissoryToSave: PromissoryNote = {
      ...promissoryNote,
      capital: Number(promissoryNote.capital || amount),
      interestRate: Number(promissoryNote.interestRate || interestRate),
      issueDate: promissoryNote.issueDate || startDate,
      dueDate: promissoryNote.dueDate || lastDueDate,
      numberHash: promissoryNote.numberHash || generateNoteHash()
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

  const canAdd = user?.role === UserRole.ADMIN;

  const handleEditLoan = (loan: Loan) => {
    setEditingLoan(loan);
    setSelectedClientId(loan.clientId);
    setAmount(loan.amount);
    setInterestRate(loan.interestRate);
    setInstallmentsCount(loan.installmentsCount);
    setStartDate(loan.startDate);
    setPromissoryNote(loan.promissoryNote || createDefaultPromissoryNote(loan.startDate));
    setLoanModel(loan.model || LoanModel.PRICE);
    setIsModalOpen(true);
  };

  const handleDeleteLoan = (loan: Loan) => {
    if (confirm('Deseja remover este empréstimo e suas parcelas?')) {
      deleteLoan(loan.id);
    }
  };

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

  const getPrincipalAmount = (inst: Installment) => {
    const interest = inst.interestAmount ?? 0;
    return inst.principalAmount ?? Math.max(0, inst.amount - interest);
  };

  const openPromiseModal = (loan: Loan) => {
    const nextInst = installments
      .filter(inst => inst.loanId === loan.id && inst.status !== InstallmentStatus.PAID)
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())[0];

    if (!nextInst) {
      alert('Nenhuma parcela pendente para agendar recebimento.');
      return;
    }

    setPromiseModal({ loan, installment: nextInst });
    setPromiseReason(nextInst.promisedPaymentReason || '');
    setPromiseAmount(nextInst.promisedPaymentAmount || getInterestAmount(nextInst));
    setPromiseDate(nextInst.promisedPaymentDate || getTodayDateString());
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
          <h1>Nota Promissória</h1>
          <div class="section"><span class="label">Número:</span> <span class="value">${promissoryNote.numberHash}</span></div>
          <div class="section"><span class="label">Emitente:</span> <span class="value">${client.name}</span></div>
          <div class="section"><span class="label">CPF:</span> <span class="value">${client.cpf}</span></div>
          <div class="section"><span class="label">Contato:</span> <span class="value">${client.phone} / ${client.email || 'sem email'}</span></div>
          <div class="section"><span class="label">Endereço:</span> <span class="value">${client.street}${client.complement ? ', ' + client.complement : ''} - ${client.neighborhood}, ${client.city}/${client.state} - CEP ${client.cep}</span></div>
          <div class="card">
            <div class="section"><span class="label">Capital:</span> <span class="value">${formatCurrency(promissoryNote.capital)}</span></div>
            <div class="section"><span class="label">Juros:</span> <span class="value">${promissoryNote.interestRate}%</span></div>
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

      <div className="overflow-x-auto bg-white rounded-xl border border-slate-200 shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold">
            <tr>
              <th className="p-4">Cliente</th>
              <th className="p-4">Valor Principal</th>
              <th className="p-4">Total (+Juros)</th>
              <th className="p-4">Modelo</th>
              <th className="p-4">Parcelas</th>
              <th className="p-4">Data</th>
              <th className="p-4">Status</th>
              {canAdd && <th className="p-4 text-center">Ações</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loans.map(loan => {
              const clientInstallments = installments.filter(inst => inst.loanId === loan.id);
              const loanClient = clients.find(c => c.id === loan.clientId);
              const clientName = loanClient?.name || getClientName(loan.clientId);
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

              return (
              <tr key={loan.id} className="hover:bg-slate-50 transition">
                <td className="p-4 font-medium text-slate-800">{clientName}</td>
                <td className="p-4">{formatCurrency(loan.amount)}</td>
                <td className="p-4 font-semibold text-emerald-600">{formatCurrency(loan.totalAmount)}</td>
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
                      >
                        <FileText size={18} />
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
            {loans.length === 0 && (
                <tr>
                    <td colSpan={canAdd ? 8 : 7} className="p-8 text-center text-slate-400">Nenhum empréstimo cadastrado.</td>
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
                      type="number"
                      min="0"
                      className="w-full border border-slate-300 rounded-lg p-3 bg-slate-50 focus:bg-white transition-colors"
                      value={interestRate}
                      onChange={e => {
                        const value = parseFloat(e.target.value);
                        setInterestRate(value);
                        setPromissoryNote(prev => ({ ...prev, interestRate: value }));
                      }}
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
                  <option value={LoanModel.FIXED_AMORTIZATION}>Amortização Fixa</option>
                  <option value={LoanModel.SIMPLE_INTEREST}>Juros Simples</option>
                  <option value={LoanModel.COMPOUND_INTEREST}>Juros Compostos</option>
                  <option value={LoanModel.SAC}>SAC</option>
                  <option value={LoanModel.PRICE}>Price</option>
                  <option value={LoanModel.PARTICULAR}>Modelo Particular</option>
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

              {loanModel === LoanModel.PARTICULAR && (
                <div className="border border-amber-200 bg-amber-50 text-amber-900 rounded-xl p-3 text-sm leading-relaxed">
                  <p className="font-semibold">Modelo Particular</p>
                  <p>Em cada parcela o cliente paga juros fixos de {formatCurrency(amount * (interestRate / 100))} mais a amortização de {formatCurrency(installmentsCount > 0 ? amount / installmentsCount : 0)}, conforme solicitado.</p>
                </div>
              )}

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
                      readOnly
                      className="w-full border border-slate-300 rounded-lg p-3 bg-slate-50 focus:bg-white"
                      value={promissoryNote.numberHash}
                    />
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
                      type="number"
                      min="0"
                      className="w-full border border-slate-300 rounded-lg p-3 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 transition-colors"
                      placeholder="Ex: 8"
                      value={promissoryNote.interestRate}
                      onChange={e => handlePromissoryChange('interestRate', parseFloat(e.target.value))}
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
