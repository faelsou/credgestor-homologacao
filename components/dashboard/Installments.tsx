import React, { useContext, useState } from 'react';
import { AppContext } from '../../App';
import { formatCurrency, formatDate, getTodayDateString, isLate, sendToN8N } from '../../utils';
import { InstallmentStatus, Installment, UserRole } from '../../types';
import { Search, MessageCircle, CheckCircle, Clock, AlertCircle, Bot } from 'lucide-react';

export const InstallmentsView: React.FC = () => {
  const { installments, clients, payInstallment, scheduleFuturePayment, user } = useContext(AppContext);
  const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'LATE' | 'PAID'>('ALL');
  const [selectedInstallment, setSelectedInstallment] = useState<Installment | null>(null);
  const [paymentMode, setPaymentMode] = useState<'INTEREST' | 'CUSTOM'>('INTEREST');
  const [customAmount, setCustomAmount] = useState(0);
  const [promiseModal, setPromiseModal] = useState<Installment | null>(null);
  const [promiseReason, setPromiseReason] = useState('');
  const [promiseAmount, setPromiseAmount] = useState(0);
  const [promiseDate, setPromiseDate] = useState(getTodayDateString());

  const filtered = installments.filter(inst => {
    if (filter === 'ALL') return true;
    if (filter === 'LATE') return inst.status !== InstallmentStatus.PAID && isLate(inst.dueDate);
    if (filter === 'PENDING') return (inst.status === InstallmentStatus.PENDING || inst.status === InstallmentStatus.PARTIAL) && !isLate(inst.dueDate);
    return inst.status === filter;
  }).sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

  const getClient = (id: string) => clients.find(c => c.id === id);

  const handleWhatsapp = (inst: Installment, useAI: boolean = false) => {
    const client = getClient(inst.clientId);
    if (!client) return;

    if (useAI) {
      // Disparo via n8n Webhook
      const payload = {
        type: 'CLIENT_REMINDER',
        clientName: client.name,
        clientPhone: client.phone,
        amount: inst.amount,
        dueDate: inst.dueDate,
        daysLate: isLate(inst.dueDate) ? Math.floor((new Date().getTime() - new Date(inst.dueDate).getTime()) / (1000 * 3600 * 24)) : 0
      };
      
      sendToN8N(payload);
      alert('Solicitação enviada para o Agente IA! A mensagem será enviada em breve.');
    } else {
      // Fallback: Link direto
      const message = `Olá ${client.name}, lembrete da parcela ${inst.number} no valor de ${formatCurrency(inst.amount)} vencendo em ${formatDate(inst.dueDate)}.`;
      const url = `https://wa.me/55${client.phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
      window.open(url, '_blank');
    }
  };

  const handlePay = (id: string) => {
    const installment = installments.find(item => item.id === id);
    if (!installment) return;

    setSelectedInstallment(installment);
    setPaymentMode('INTEREST');
    setCustomAmount(installment.amount);
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

    const amountToPay = paymentMode === 'INTEREST'
      ? getInterestAmount(selectedInstallment)
      : customAmount;

    if (!amountToPay || amountToPay <= 0) {
      alert('Informe um valor válido para receber.');
      return;
    }

    payInstallment(selectedInstallment.id, amountToPay);
    setSelectedInstallment(null);
  };

  const openPromiseModal = (inst: Installment) => {
    setPromiseModal(inst);
    const defaults = getPromiseDefaults(inst);
    setPromiseReason(defaults.reason);
    setPromiseAmount(defaults.amount);
    setPromiseDate(defaults.date);
  };

  const handleSavePromise = () => {
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

    const today = new Date(getTodayDateString());
    const scheduled = new Date(promiseDate);
    if (scheduled < today) {
      alert('Selecione uma data futura ou igual a hoje.');
      return;
    }

    scheduleFuturePayment(promiseModal.id, promiseReason.trim(), promiseAmount, promiseDate);
    setPromiseModal(null);
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

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-800">Controle de Parcelas</h2>

      {/* Tabs */}
      <div className="flex space-x-2 overflow-x-auto pb-2">
        {['ALL', 'PENDING', 'LATE', 'PAID'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f as any)}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition ${
              filter === f ? 'bg-slate-800 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {f === 'ALL' ? 'Todas' : f === 'PENDING' ? 'A Vencer' : f === 'LATE' ? 'Em Atraso' : 'Pagas'}
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
               const late = inst.status !== InstallmentStatus.PAID && isLate(inst.dueDate);
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
                    </td>
                    <td className="p-4">{renderStatus(inst, late)}</td>
                    <td className="p-4 flex justify-end gap-2">
                        {/* Botão AI Agent */}
                        <button onClick={() => handleWhatsapp(inst, true)} className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg" title="Cobrar com IA (n8n)">
                            <Bot size={18} />
                        </button>
                        {/* Botão Whats Direto */}
                        <button onClick={() => handleWhatsapp(inst, false)} className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg" title="Abrir WhatsApp Web">
                            <MessageCircle size={18} />
                        </button>
                        
                        {inst.status !== InstallmentStatus.PAID && user?.role === UserRole.ADMIN && (
                             <button onClick={() => handlePay(inst.id)} className="px-3 py-1 bg-emerald-600 text-white text-xs font-bold rounded hover:bg-emerald-700 ml-2">
                                Receber
                             </button>
                        )}
                        {late && inst.status !== InstallmentStatus.PAID && user?.role === UserRole.ADMIN && (
                          <button
                            onClick={() => openPromiseModal(inst)}
                            className="px-3 py-1 bg-purple-100 text-purple-700 text-xs font-bold rounded hover:bg-purple-200"
                          >
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
            const late = inst.status !== InstallmentStatus.PAID && isLate(inst.dueDate);
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
                            {renderPromiseInfo(inst)}
                             {renderStatus(inst, late)}
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-slate-100">
                         <button onClick={() => handleWhatsapp(inst, true)} className="py-2 bg-purple-50 text-purple-700 font-semibold rounded-lg text-sm flex items-center justify-center gap-2">
                            <Bot size={16} /> IA Cobrança
                         </button>
                         <button onClick={() => handleWhatsapp(inst, false)} className="py-2 bg-emerald-50 text-emerald-700 font-semibold rounded-lg text-sm flex items-center justify-center gap-2">
                            <MessageCircle size={16} /> WhatsApp
                         </button>
                    </div>
                     {inst.status !== InstallmentStatus.PAID && user?.role === UserRole.ADMIN && (
                         <button onClick={() => handlePay(inst.id)} className="w-full mt-2 py-2 bg-emerald-600 text-white font-semibold rounded-lg text-sm">
                            Baixar Pagamento
                         </button>
                     )}
                     {late && inst.status !== InstallmentStatus.PAID && user?.role === UserRole.ADMIN && (
                        <button onClick={() => openPromiseModal(inst)} className="w-full mt-2 py-2 bg-purple-100 text-purple-700 font-semibold rounded-lg text-sm">
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
              <p className="text-sm text-slate-600">Escolha como deseja registrar este recebimento.</p>
            </div>

            <div className="space-y-3">
              <label className={`block border rounded-xl p-3 cursor-pointer ${paymentMode === 'INTEREST' ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200'}`}>
                <input
                  type="radio"
                  name="paymentMode"
                  className="mr-2"
                  checked={paymentMode === 'INTEREST'}
                  onChange={() => setPaymentMode('INTEREST')}
                />
                Receber apenas juros ({formatCurrency(getInterestAmount(selectedInstallment))})
              </label>

              <label className={`block border rounded-xl p-3 cursor-pointer ${paymentMode === 'CUSTOM' ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200'}`}>
                <input
                  type="radio"
                  name="paymentMode"
                  className="mr-2"
                  checked={paymentMode === 'CUSTOM'}
                  onChange={() => setPaymentMode('CUSTOM')}
                />
                Receber juros + capital (total ou parcial)
                {paymentMode === 'CUSTOM' && (
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    value={customAmount}
                    onChange={e => setCustomAmount(parseFloat(e.target.value))}
                    className="mt-2 w-full border border-slate-300 rounded-lg p-2"
                    placeholder="Valor a receber"
                  />
                )}
              </label>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => setSelectedInstallment(null)} className="flex-1 py-2 rounded-lg border hover:bg-slate-50">Cancelar</button>
              <button onClick={handleConfirmPayment} className="flex-1 py-2 rounded-lg bg-emerald-600 text-white font-bold hover:bg-emerald-700">Confirmar</button>
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
              <button onClick={handleSavePromise} className="flex-1 py-2 rounded-lg bg-purple-600 text-white font-bold hover:bg-purple-700">Salvar promessa</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
