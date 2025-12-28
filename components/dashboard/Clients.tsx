//import React, { useContext, useState } from 'react';
//import { AppContext } from '../../App';
//import { Search, Plus, Phone, Mail, User, Pencil, Trash2, MapPin, Loader2 } from 'lucide-react';
//import { Client, UserRole } from '../../types';
//import { formatCep, formatCpf, formatPhone, sendToN8N } from '../../utils';
//
//export const ClientsView: React.FC = () => {
//  const { clients, addClient, updateClient, deleteClient, user, loans, n8nSession } = useContext(AppContext);
//  const [searchTerm, setSearchTerm] = useState('');
//  const [isModalOpen, setIsModalOpen] = useState(false);
//  const [editingClientId, setEditingClientId] = useState<string | null>(null);
//  const [cepError, setCepError] = useState('');
//  const [isFetchingCep, setIsFetchingCep] = useState(false);
//  const [isSavingClient, setIsSavingClient] = useState(false);
//  const [saveError, setSaveError] = useState('');
//
//  const [newClient, setNewClient] = useState<Partial<Client>>({
//    name: '',
//    cpf: '',
//    phone: '',
//    email: '',
//    birthDate: '',
//    cep: '',
//    street: '',
//    complement: '',
//    neighborhood: '',
//    city: '',
//    state: '',
//    status: 'active'
//  });
//
//  const fetchAddressByCep = async (cepValue: string) => {
//    const digits = cepValue.replace(/\D/g, '');
//    if (digits.length !== 8) return;
//
//    setIsFetchingCep(true);
//    setCepError('');
//    try {
//      const response = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
//      const data = await response.json();
//
//      if (data?.erro) {
//        setCepError('CEP não encontrado.');
//        return;
//      }
//
//      setNewClient(prev => ({
//        ...prev,
//        cep: formatCep(digits),
//        street: data.logradouro || '',
//        neighborhood: data.bairro || '',
//        city: data.localidade || '',
//        state: data.uf || '',
//      }));
//    } catch (error) {
//      setCepError('Erro ao buscar CEP.');
//    } finally {
//      setIsFetchingCep(false);
//    }
//  };
//
//  const resetForm = () => {
//    setSaveError('');
//    setIsSavingClient(false);
//    setNewClient({
//      name: '',
//      cpf: '',
//      phone: '',
//      email: '',
//      birthDate: '',
//      cep: '',
//      street: '',
//      complement: '',
//      neighborhood: '',
//      city: '',
//      state: '',
//      status: 'active'
//    });
//    setEditingClientId(null);
//    setCepError('');
//  };
//
//  const filteredClients = clients.filter(c =>
//    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
//    c.cpf.includes(searchTerm)
//  );
//
//  const handleSubmit = async (e: React.FormEvent) => {
//    e.preventDefault();
//    setSaveError('');
//
//    if (!newClient.name || !newClient.cpf) {
//      setSaveError('Nome e CPF são obrigatórios.');
//      return;
//    }
//
//    const clientToSave: Client = {
//      id: editingClientId || Math.random().toString(36).substr(2, 9),
//      name: newClient.name,
//      cpf: newClient.cpf,
//      phone: newClient.phone || '',
//      email: newClient.email || '',
//      birthDate: newClient.birthDate || '',
//      cep: newClient.cep || '',
//      street: newClient.street || '',
//      complement: newClient.complement || '',
//      neighborhood: newClient.neighborhood || '',
//      city: newClient.city || '',
//      state: newClient.state || '',
//      status: newClient.status || 'active'
//    };
//
//    const sendClientToWebhook = async (client: Client) => {
//      try {
//        await sendToN8N(client, { accessToken: n8nSession?.accessToken });
//      } catch (error) {
//        console.error('Erro ao enviar cliente para o webhook', error);
//      }
//    };
//
//    setIsSavingClient(true);
//    try {
//      if (editingClientId) {
//        updateClient(clientToSave);
//        await sendClientToWebhook(clientToSave);
//      } else {
//        await addClient(clientToSave);
//        await sendClientToWebhook(clientToSave);
//      }
//
//      setIsModalOpen(false);
//      resetForm();
//    } catch (error) {
//      console.error('Erro ao salvar cliente', error);
//      setSaveError('Não foi possível salvar o cliente. Verifique a conexão com o backend e tente novamente.');
//    } finally {
//      setIsSavingClient(false);
//    }
//  };
//
//  const canEdit = user?.role === UserRole.ADMIN;
//
//  const handleEditClient = (client: Client) => {
//    setEditingClientId(client.id);
//    setNewClient({
//      ...client
//    });
//    setIsModalOpen(true);
//  };
//
//  const handleDeleteClient = (clientId: string) => {
//    if (confirm('Deseja realmente excluir este cliente e seus registros?')) {
//      deleteClient(clientId);
//    }
//  };
//
//  return (
//    <div className="space-y-6">
//      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
//        <h2 className="text-2xl font-bold text-slate-800">Clientes</h2>
//        {canEdit && (
//          <button
//            onClick={() => { resetForm(); setIsModalOpen(true); }}
//            className="bg-emerald-600 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 hover:bg-emerald-700 transition"
//          >
//            <Plus size={18} /> Novo Cliente
//          </button>
//        )}
//      </div>
//
//      {/* Filters */}
//      <div className="relative">
//        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
//        <input 
//          type="text" 
//          placeholder="Buscar por nome ou CPF..." 
//          className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
//          value={searchTerm}
//          onChange={(e) => setSearchTerm(e.target.value)}
//        />
//      </div>
//
//      {/* List */}
//      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
//        {filteredClients.map(client => (
//          <div key={client.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:border-emerald-200 transition">
//            <div className="flex justify-between items-start mb-4">
//              <div className="flex items-center gap-3">
//                <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-500">
//                  <User size={20} />
//                </div>
//                <div>
//                  <h3 className="font-bold text-slate-800">{client.name}</h3>
//                  <span className={`text-xs px-2 py-0.5 rounded-full ${client.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
//                    {client.status === 'active' ? 'Ativo' : 'Bloqueado'}
//                  </span>
//                </div>
//              </div>
//              {canEdit && (
//                <div className="flex items-center gap-2">
//                  <button
//                    onClick={() => handleEditClient(client)}
//                    className="p-2 rounded-lg hover:bg-slate-100 text-slate-500"
//                    aria-label="Editar cliente"
//                  >
//                    <Pencil size={18} />
//                  </button>
//                  <button
//                    onClick={() => handleDeleteClient(client.id)}
//                    className="p-2 rounded-lg hover:bg-red-50 text-red-500"
//                    aria-label="Excluir cliente"
//                  >
//                    <Trash2 size={18} />
//                  </button>
//                </div>
//              )}
//            </div>
//
//              <div className="space-y-2 text-sm text-slate-600">
//                <div className="flex items-center gap-2">
//                  <span className="font-semibold text-xs text-slate-400 uppercase w-10">CPF</span>
//                  {client.cpf}
//                </div>
//              <div className="flex items-center gap-2">
//                <Phone size={14} className="text-slate-400" />
//                {client.phone}
//              </div>
//               <div className="flex items-center gap-2">
//                <Mail size={14} className="text-slate-400" />
//                {client.email || 'Não informado'}
//              </div>
//              <div className="flex items-start gap-2">
//                <MapPin size={14} className="text-slate-400 mt-0.5" />
//                <div>
//                  <div className="font-medium text-slate-700">{client.street}{client.complement ? `, ${client.complement}` : ''} - {client.neighborhood}</div>
//                  <div className="text-xs text-slate-500">{client.city}/{client.state} - CEP {client.cep}</div>
//                </div>
//              </div>
//            </div>
//          </div>
//        ))}
//      </div>
//
//      {/* Modal */}
//      {isModalOpen && (
//        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
//          <div className="bg-white rounded-2xl w-full max-w-3xl p-6 max-h-[90vh] overflow-y-auto">
//            <h3 className="text-xl font-bold mb-4">{editingClientId ? 'Editar Cliente' : 'Cadastrar Cliente'}</h3>
//            {saveError && (
//              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700">
//                {saveError}
//              </div>
//            )}
//            <form onSubmit={handleSubmit} className="space-y-4">
//              <div>
//                <label className="block text-sm font-medium text-slate-700 mb-1">Nome Completo</label>
//                <input
//                    required
//                    type="text"
//                    className="w-full border border-slate-300 rounded-lg p-3 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 transition-colors"
//                    placeholder="Ex: João da Silva"
//                    value={newClient.name}
//                    onChange={e => setNewClient({...newClient, name: e.target.value})}
//                />
//              </div>
//              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
//                <div>
//                  <label className="block text-sm font-medium text-slate-700 mb-1">CPF</label>
//                  <input
//                      required
//                      type="text"
//                      className="w-full border border-slate-300 rounded-lg p-3 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 transition-colors"
//                      placeholder="000.000.000-00"
//                      value={newClient.cpf}
//                      onChange={e => setNewClient({...newClient, cpf: formatCpf(e.target.value)})}
//                  />
//                </div>
//                <div>
//                  <label className="block text-sm font-medium text-slate-700 mb-1">WhatsApp</label>
//                  <input
//                      required
//                      type="text"
//                      className="w-full border border-slate-300 rounded-lg p-3 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 transition-colors"
//                      placeholder="(11) 99999-9999"
//                      value={newClient.phone}
//                      onChange={e => setNewClient({...newClient, phone: formatPhone(e.target.value)})}
//                  />
//                </div>
//              </div>
//              <div>
//                <label className="block text-sm font-medium text-slate-700 mb-1">CEP</label>
//                <div className="flex flex-col sm:flex-row gap-2">
//                  <input
//                    required
//                    type="text"
//                    className="w-full border border-slate-300 rounded-lg p-3 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 transition-colors"
//                    placeholder="00000-000"
//                    value={newClient.cep}
//                    onChange={e => {
//                      const formatted = formatCep(e.target.value);
//                      setNewClient({ ...newClient, cep: formatted });
//                      if (formatted.replace(/\D/g, '').length === 8) {
//                        fetchAddressByCep(formatted);
//                      }
//                    }}
//                  />
//                  {isFetchingCep && <Loader2 className="animate-spin text-emerald-600" />}
//                </div>
//                {cepError && <p className="text-sm text-red-600 mt-1">{cepError}</p>}
//              </div>
//              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
//                <div>
//                  <label className="block text-sm font-medium text-slate-700 mb-1">Endereço</label>
//                  <input
//                    required
//                    type="text"
//                    className="w-full border border-slate-300 rounded-lg p-3 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 transition-colors"
//                    placeholder="Rua e número"
//                    value={newClient.street}
//                    onChange={e => setNewClient({ ...newClient, street: e.target.value })}
//                  />
//                </div>
//                <div>
//                  <label className="block text-sm font-medium text-slate-700 mb-1">Complemento</label>
//                  <input
//                    type="text"
//                    className="w-full border border-slate-300 rounded-lg p-3 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 transition-colors"
//                    placeholder="Apto, bloco, sala (opcional)"
//                    value={newClient.complement}
//                    onChange={e => setNewClient({ ...newClient, complement: e.target.value })}
//                  />
//                </div>
//                <div>
//                  <label className="block text-sm font-medium text-slate-700 mb-1">Bairro</label>
//                  <input
//                    required
//                    type="text"
//                    className="w-full border border-slate-300 rounded-lg p-3 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 transition-colors"
//                    placeholder="Bairro"
//                    value={newClient.neighborhood}
//                    onChange={e => setNewClient({ ...newClient, neighborhood: e.target.value })}
//                  />
//                </div>
//              </div>
//              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
//                <div>
//                  <label className="block text-sm font-medium text-slate-700 mb-1">Cidade</label>
//                  <input
//                    required
//                    type="text"
//                    className="w-full border border-slate-300 rounded-lg p-3 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 transition-colors"
//                    placeholder="Cidade"
//                    value={newClient.city}
//                    onChange={e => setNewClient({ ...newClient, city: e.target.value })}
//                  />
//                </div>
//                <div>
//                  <label className="block text-sm font-medium text-slate-700 mb-1">Estado</label>
//                  <input
//                    required
//                    maxLength={2}
//                    className="w-full border border-slate-300 rounded-lg p-3 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 transition-colors"
//                    placeholder="UF"
//                    value={newClient.state}
//                    onChange={e => setNewClient({ ...newClient, state: e.target.value.toUpperCase() })}
//                  />
//                </div>
//              </div>
//              <div>
//                <label className="block text-sm font-medium text-slate-700 mb-1">Email (Opcional)</label>
//                <input
//                    type="email"
//                    className="w-full border border-slate-300 rounded-lg p-3 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 transition-colors"
//                    placeholder="email@exemplo.com"
//                    value={newClient.email}
//                    onChange={e => setNewClient({...newClient, email: e.target.value})}
//                />
//              </div>
//              <div>
//                <label className="block text-sm font-medium text-slate-700 mb-1">Data de Nascimento (Opcional)</label>
//                <input
//                  type="date"
//                  className="w-full border border-slate-300 rounded-lg p-3 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 transition-colors"
//                  value={newClient.birthDate}
//                  onChange={e => setNewClient({ ...newClient, birthDate: e.target.value })}
//                />
//              </div>
//              <div className="flex flex-col sm:flex-row gap-3 mt-6">
//                <button type="button" onClick={() => { setIsModalOpen(false); resetForm(); }} className="flex-1 py-2 border rounded-lg hover:bg-slate-50">Cancelar</button>
//                <button
//                  type="submit"
//                  disabled={isSavingClient}
//                  className="flex-1 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
//                >
//                  {isSavingClient ? (
//                    <>
//                      <Loader2 className="animate-spin" size={16} /> Salvando...
//                    </>
//                  ) : (
//                    'Salvar'
//                  )}
//                </button>
//              </div>
//            </form>
//          </div>
//        </div>
//      )}
//    </div>
//  );
//};
//
// VERSÃO MINIMAL - FOCO TOTAL EM FUNCIONAR SEM ERROS

import React, { useContext, useState } from 'react';
import { AppContext } from '../../App';
import { Search, Plus, Phone, Mail, User, Pencil, Trash2, MapPin, Loader2 } from 'lucide-react';
import { Client, UserRole } from '../../types';
import { formatCep, formatCpf, formatPhone, sendToN8N } from '../../utils';

export const ClientsView: React.FC = () => {
  const { clients, addClient, updateClient, deleteClient, user, loans, n8nSession } = useContext(AppContext);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClientId, setEditingClientId] = useState<string | null>(null);
  const [cepError, setCepError] = useState('');
  const [isFetchingCep, setIsFetchingCep] = useState(false);
  const [isSavingClient, setIsSavingClient] = useState(false);
  const [saveError, setSaveError] = useState('');

  const [newClient, setNewClient] = useState<Partial<Client>>({
    name: '',
    cpf: '',
    phone: '',
    email: '',
    birthDate: '',
    cep: '',
    street: '',
    complement: '',
    neighborhood: '',
    city: '',
    state: '',
    status: 'active'
  });

  const fetchAddressByCep = async (cepValue: string) => {
    const digits = cepValue.replace(/\D/g, '');
    if (digits.length !== 8) return;

    setIsFetchingCep(true);
    setCepError('');
    try {
      const response = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      const data = await response.json();

      if (data?.erro) {
        setCepError('CEP não encontrado.');
        return;
      }

      setNewClient(prev => ({
        ...prev,
        cep: formatCep(digits),
        street: data.logradouro || '',
        neighborhood: data.bairro || '',
        city: data.localidade || '',
        state: data.uf || '',
      }));
    } catch (error) {
      setCepError('Erro ao buscar CEP.');
    } finally {
      setIsFetchingCep(false);
    }
  };

  const resetForm = () => {
    setSaveError('');
    setIsSavingClient(false);
    setNewClient({
      name: '',
      cpf: '',
      phone: '',
      email: '',
      birthDate: '',
      cep: '',
      street: '',
      complement: '',
      neighborhood: '',
      city: '',
      state: '',
      status: 'active'
    });
    setEditingClientId(null);
    setCepError('');
  };

  const filteredClients = clients.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.cpf.includes(searchTerm)
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError('');

    if (!newClient.name || !newClient.cpf) {
      setSaveError('Nome e CPF são obrigatórios.');
      return;
    }

    const clientToSave: Client = {
      id: editingClientId || Math.random().toString(36).substr(2, 9),
      name: newClient.name,
      cpf: newClient.cpf,
      phone: newClient.phone || '',
      email: newClient.email || '',
      birthDate: newClient.birthDate || '',
      cep: newClient.cep || '',
      street: newClient.street || '',
      complement: newClient.complement || '',
      neighborhood: newClient.neighborhood || '',
      city: newClient.city || '',
      state: newClient.state || '',
      status: newClient.status || 'active'
    };

    setIsSavingClient(true);
    try {
      // 1. Salva o cliente localmente
      if (editingClientId) {
        updateClient(clientToSave);
      } else {
        await addClient(clientToSave);
      }

      // 2. Envia para o webhook n8n (não bloqueia o salvamento se falhar)
      try {
        const webhookPayload = {
          action: editingClientId ? 'update' : 'create',
          timestamp: new Date().toISOString(),
          client: {
            id: clientToSave.id,
            nome_completo: clientToSave.name,
            cpf: clientToSave.cpf.replace(/\D/g, ''), // Remove formatação
            whatsapp: clientToSave.phone.replace(/\D/g, ''), // Remove formatação
            email: clientToSave.email,
            data_nascimento: clientToSave.birthDate,
            cep: clientToSave.cep.replace(/\D/g, ''), // Remove formatação
            endereco: clientToSave.street,
            complemento: clientToSave.complement,
            bairro: clientToSave.neighborhood,
            cidade: clientToSave.city,
            estado: clientToSave.state,
            status: clientToSave.status,
            observacoes: clientToSave.notes || ''
          }
        };

        console.log('📤 Enviando cliente para n8n:', webhookPayload);

        const webhookSent = await sendToN8N(webhookPayload, { 
          accessToken: n8nSession?.accessToken,
          webhookUrl: 'https://n8n.aiagentautomate.com.br/webhook/clientes'
        });

        if (webhookSent) {
          console.log('✅ Cliente enviado para o n8n com sucesso');
        } else {
          console.warn('⚠️ Webhook n8n falhou, mas o cliente foi salvo localmente');
        }
      } catch (webhookError) {
        console.warn('⚠️ Erro ao enviar para webhook n8n (cliente salvo localmente):', webhookError);
        // Não mostra erro para o usuário, apenas loga
      }

      setIsModalOpen(false);
      resetForm();
    } catch (error) {
      console.error('❌ Erro ao salvar cliente', error);
      setSaveError('Não foi possível salvar o cliente. Verifique os dados e tente novamente.');
    } finally {
      setIsSavingClient(false);
    }
  };

  const canEdit = user?.role === UserRole.ADMIN;

  const handleEditClient = (client: Client) => {
    setEditingClientId(client.id);
    setNewClient({
      ...client
    });
    setIsModalOpen(true);
  };

  const handleDeleteClient = (clientId: string) => {
    if (confirm('Deseja realmente excluir este cliente e seus registros?')) {
      deleteClient(clientId);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-slate-800">Clientes</h2>
        {canEdit && (
          <button
            onClick={() => { resetForm(); setIsModalOpen(true); }}
            className="bg-emerald-600 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 hover:bg-emerald-700 transition"
          >
            <Plus size={18} /> Novo Cliente
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
        <input 
          type="text" 
          placeholder="Buscar por nome ou CPF..." 
          className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* List */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filteredClients.map(client => (
          <div key={client.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:border-emerald-200 transition">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-500">
                  <User size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800">{client.name}</h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${client.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                    {client.status === 'active' ? 'Ativo' : 'Bloqueado'}
                  </span>
                </div>
              </div>
              {canEdit && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleEditClient(client)}
                    className="p-2 rounded-lg hover:bg-slate-100 text-slate-500"
                    aria-label="Editar cliente"
                  >
                    <Pencil size={18} />
                  </button>
                  <button
                    onClick={() => handleDeleteClient(client.id)}
                    className="p-2 rounded-lg hover:bg-red-50 text-red-500"
                    aria-label="Excluir cliente"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              )}
            </div>

              <div className="space-y-2 text-sm text-slate-600">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-xs text-slate-400 uppercase w-10">CPF</span>
                  {client.cpf}
                </div>
              <div className="flex items-center gap-2">
                <Phone size={14} className="text-slate-400" />
                {client.phone}
              </div>
               <div className="flex items-center gap-2">
                <Mail size={14} className="text-slate-400" />
                {client.email || 'Não informado'}
              </div>
              <div className="flex items-start gap-2">
                <MapPin size={14} className="text-slate-400 mt-0.5" />
                <div>
                  <div className="font-medium text-slate-700">{client.street}{client.complement ? `, ${client.complement}` : ''} - {client.neighborhood}</div>
                  <div className="text-xs text-slate-500">{client.city}/{client.state} - CEP {client.cep}</div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-3xl p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-4">{editingClientId ? 'Editar Cliente' : 'Cadastrar Cliente'}</h3>
            {saveError && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700">
                {saveError}
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nome Completo</label>
                <input
                    required
                    type="text"
                    className="w-full border border-slate-300 rounded-lg p-3 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 transition-colors"
                    placeholder="Ex: João da Silva"
                    value={newClient.name}
                    onChange={e => setNewClient({...newClient, name: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">CPF</label>
                  <input
                      required
                      type="text"
                      className="w-full border border-slate-300 rounded-lg p-3 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 transition-colors"
                      placeholder="000.000.000-00"
                      value={newClient.cpf}
                      onChange={e => setNewClient({...newClient, cpf: formatCpf(e.target.value)})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">WhatsApp</label>
                  <input
                      required
                      type="text"
                      className="w-full border border-slate-300 rounded-lg p-3 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 transition-colors"
                      placeholder="(11) 99999-9999"
                      value={newClient.phone}
                      onChange={e => setNewClient({...newClient, phone: formatPhone(e.target.value)})}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">CEP</label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    required
                    type="text"
                    className="w-full border border-slate-300 rounded-lg p-3 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 transition-colors"
                    placeholder="00000-000"
                    value={newClient.cep}
                    onChange={e => {
                      const formatted = formatCep(e.target.value);
                      setNewClient({ ...newClient, cep: formatted });
                      if (formatted.replace(/\D/g, '').length === 8) {
                        fetchAddressByCep(formatted);
                      }
                    }}
                  />
                  {isFetchingCep && <Loader2 className="animate-spin text-emerald-600" />}
                </div>
                {cepError && <p className="text-sm text-red-600 mt-1">{cepError}</p>}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Endereço</label>
                  <input
                    required
                    type="text"
                    className="w-full border border-slate-300 rounded-lg p-3 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 transition-colors"
                    placeholder="Rua e número"
                    value={newClient.street}
                    onChange={e => setNewClient({ ...newClient, street: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Complemento</label>
                  <input
                    type="text"
                    className="w-full border border-slate-300 rounded-lg p-3 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 transition-colors"
                    placeholder="Apto, bloco, sala (opcional)"
                    value={newClient.complement}
                    onChange={e => setNewClient({ ...newClient, complement: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Bairro</label>
                  <input
                    required
                    type="text"
                    className="w-full border border-slate-300 rounded-lg p-3 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 transition-colors"
                    placeholder="Bairro"
                    value={newClient.neighborhood}
                    onChange={e => setNewClient({ ...newClient, neighborhood: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Cidade</label>
                  <input
                    required
                    type="text"
                    className="w-full border border-slate-300 rounded-lg p-3 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 transition-colors"
                    placeholder="Cidade"
                    value={newClient.city}
                    onChange={e => setNewClient({ ...newClient, city: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Estado</label>
                  <input
                    required
                    maxLength={2}
                    className="w-full border border-slate-300 rounded-lg p-3 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 transition-colors"
                    placeholder="UF"
                    value={newClient.state}
                    onChange={e => setNewClient({ ...newClient, state: e.target.value.toUpperCase() })}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email (Opcional)</label>
                <input
                    type="email"
                    className="w-full border border-slate-300 rounded-lg p-3 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 transition-colors"
                    placeholder="email@exemplo.com"
                    value={newClient.email}
                    onChange={e => setNewClient({...newClient, email: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Data de Nascimento (Opcional)</label>
                <input
                  type="date"
                  className="w-full border border-slate-300 rounded-lg p-3 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 transition-colors"
                  value={newClient.birthDate}
                  onChange={e => setNewClient({ ...newClient, birthDate: e.target.value })}
                />
              </div>
              <div className="flex flex-col sm:flex-row gap-3 mt-6">
                <button type="button" onClick={() => { setIsModalOpen(false); resetForm(); }} className="flex-1 py-2 border rounded-lg hover:bg-slate-50">Cancelar</button>
                <button
                  type="submit"
                  disabled={isSavingClient}
                  className="flex-1 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isSavingClient ? (
                    <>
                      <Loader2 className="animate-spin" size={16} /> Salvando...
                    </>
                  ) : (
                    'Salvar'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};