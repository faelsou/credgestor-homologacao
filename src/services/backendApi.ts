/**
 * Serviço para comunicação com o backend FastAPI
 * Usado quando não está usando N8N backend
 */

import { Client } from '@/types';
import { stripNonDigits } from '@/utils';

// Em produção, se VITE_API_BASE_URL não estiver configurada, usa o mesmo domínio do frontend
const getApiBaseUrl = () => {
  const explicitUrl = import.meta.env.VITE_API_BASE_URL as string | undefined;
  if (explicitUrl) {
    return explicitUrl;
  }
  
  // Em produção, tenta usar o mesmo domínio com /api
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    // Se não for localhost, assume produção e usa o mesmo domínio
    if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
      const protocol = window.location.protocol;
      return `${protocol}//${hostname}/api`;
    }
  }
  
  // Fallback para desenvolvimento local
  return 'http://localhost:8000';
};

const API_BASE_URL = getApiBaseUrl();

const NORMALIZED_BASE_URL = API_BASE_URL?.replace(/\/$/, '');

const buildUrl = (path: string) => {
  if (!NORMALIZED_BASE_URL) throw new Error('API base URL is not configured');
  return `${NORMALIZED_BASE_URL}/${path.replace(/^\//, '')}`;
};

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const isUuid = (value: string) => UUID_REGEX.test(value);

const toJson = async (response: Response) => {
  const text = await response.text();
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return text;
  }
};

const assertOk = (response: Response, body: any) => {
  if (response.ok) return;
  const message =
    (body && (body.error || body.erro || body.message || body.detail)) ||
    `Erro ${response.status}: ${response.statusText}`;
  throw new Error(message);
};

/**
 * Normaliza um cliente da API para o formato do frontend
 */
const normalizeApiClient = (apiClient: any): Client => {
  return {
    id: apiClient.id || apiClient.cliente_id || '',
    name: apiClient.nome || apiClient.nome_completo || apiClient.name || '',
    cpf: apiClient.cpf_cnpj || apiClient.cpf || '',
    phone: apiClient.telefone || apiClient.celular || apiClient.whatsapp || apiClient.phone || '',
    email: apiClient.email || '',
    birthDate: apiClient.data_nascimento || apiClient.birth_date || '',
    cep: apiClient.cep || '',
    street: apiClient.endereco || apiClient.street || '',
    complement: apiClient.complemento || apiClient.complement || '',
    neighborhood: apiClient.bairro || apiClient.neighborhood || '',
    city: apiClient.cidade || apiClient.city || '',
    state: apiClient.estado || apiClient.state || '',
    status: apiClient.ativo === false ? 'inactive' : (apiClient.status || 'active'),
    notes: apiClient.observacoes || apiClient.notes || '',
  };
};

/**
 * Busca clientes do backend
 */
export async function fetchBackendClients(
  token: string,
  tenantId: string
): Promise<Client[]> {
  const bearerToken = token?.replace(/[\r\n]+/g, '').trim();
  if (!bearerToken) {
    throw new Error('Token de acesso inválido ou ausente.');
  }

  const endpoint = `tenants/${tenantId}/clients`;

  const response = await fetch(buildUrl(endpoint), {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${bearerToken}`,
    },
  });

  const body = await toJson(response);
  assertOk(response, body);

  const records = Array.isArray(body) ? body : body?.data || [];
  return records.map(normalizeApiClient);
}

/**
 * Cria um cliente no backend
 */
export async function createBackendClient(
  token: string,
  tenantId: string,
  client: Client
): Promise<Client> {
  const bearerToken = token?.replace(/[\r\n]+/g, '').trim();
  if (!bearerToken) {
    throw new Error('Token de acesso inválido ou ausente para criar clientes.');
  }

  // Monta o payload no formato esperado pelo backend
  const payload = {
    nome: client.name,
    nome_completo: client.name,
    cpf_cnpj: stripNonDigits(client.cpf),
    tipo_pessoa: 'PF', // Padrão: Pessoa Física
    email: client.email || null,
    telefone: stripNonDigits(client.phone) || null,
    celular: stripNonDigits(client.phone) || null,
    whatsapp: stripNonDigits(client.phone) || null,
    endereco: client.street || null,
    complemento: client.complement || null,
    bairro: client.neighborhood || null,
    cidade: client.city || null,
    estado: client.state || null,
    cep: stripNonDigits(client.cep) || null,
    data_nascimento: client.birthDate || null,
    observacoes: client.notes || null,
  };

  const endpoint = `tenants/${tenantId}/clients`;

  const response = await fetch(buildUrl(endpoint), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${bearerToken}`,
    },
    body: JSON.stringify(payload),
  });

  const body = await toJson(response);
  assertOk(response, body);

  // O backend pode retornar um array ou um objeto
  const record = Array.isArray(body) ? body[0] : body;
  return normalizeApiClient(record);
}

/**
 * Atualiza um cliente no backend
 */
export async function updateBackendClient(
  token: string,
  tenantId: string,
  clientId: string,
  client: Client
): Promise<Client> {
  const bearerToken = token?.replace(/[\r\n]+/g, '').trim();
  if (!bearerToken) {
    throw new Error('Token de acesso inválido ou ausente para atualizar clientes.');
  }

  const payload = {
    nome: client.name,
    nome_completo: client.name,
    cpf_cnpj: stripNonDigits(client.cpf),
    email: client.email || null,
    telefone: stripNonDigits(client.phone) || null,
    celular: stripNonDigits(client.phone) || null,
    whatsapp: stripNonDigits(client.phone) || null,
    endereco: client.street || null,
    complemento: client.complement || null,
    bairro: client.neighborhood || null,
    cidade: client.city || null,
    estado: client.state || null,
    cep: stripNonDigits(client.cep) || null,
    data_nascimento: client.birthDate || null,
    observacoes: client.notes || null,
    ativo: client.status === 'active',
  };

  const endpoint = `tenants/${tenantId}/clients/${clientId}`;

  const response = await fetch(buildUrl(endpoint), {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${bearerToken}`,
    },
    body: JSON.stringify(payload),
  });

  const body = await toJson(response);
  assertOk(response, body);

  const record = Array.isArray(body) ? body[0] : body;
  return normalizeApiClient(record);
}

/**
 * Deleta um cliente no backend
 */
export async function deleteBackendClient(
  token: string,
  tenantId: string,
  clientId: string
): Promise<void> {
  const bearerToken = token?.replace(/[\r\n]+/g, '').trim();
  if (!bearerToken) {
    throw new Error('Token de acesso inválido ou ausente para deletar clientes.');
  }

  const endpoint = `tenants/${tenantId}/clients/${clientId}`;

  const response = await fetch(buildUrl(endpoint), {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${bearerToken}`,
    },
  });

  const body = await toJson(response);
  assertOk(response, body);
}

/**
 * Normaliza um empréstimo da API para o formato do frontend
 */
const normalizeApiLoan = (apiLoan: any): any => {
  return {
    id: apiLoan.id || '',
    clientId: apiLoan.client_id || apiLoan.clientId || '',
    amount: parseFloat(apiLoan.amount || 0),
    interestRate: parseFloat(apiLoan.interest_rate || apiLoan.interestRate || 0),
    totalAmount: parseFloat(apiLoan.total_amount || apiLoan.totalAmount || 0),
    outstandingAmount: apiLoan.outstanding_amount !== undefined ? parseFloat(apiLoan.outstanding_amount || 0) : undefined,
    startDate: apiLoan.start_date || apiLoan.startDate || '',
    installmentsCount: parseInt(apiLoan.installments_count || apiLoan.installmentsCount || 0),
    model: apiLoan.model || 'PRICE',
    status: apiLoan.status || 'open',
    promissoryNote: apiLoan.promissory_note || apiLoan.promissoryNote || undefined,
  };
};

/**
 * Busca empréstimos do backend
 */
export async function fetchBackendLoans(
  token: string,
  tenantId: string
): Promise<any[]> {
  const bearerToken = token?.replace(/[\r\n]+/g, '').trim();
  if (!bearerToken) {
    throw new Error('Token de acesso inválido ou ausente.');
  }

  const endpoint = `tenants/${tenantId}/loans`;

  const response = await fetch(buildUrl(endpoint), {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${bearerToken}`,
    },
  });

  const body = await toJson(response);
  assertOk(response, body);

  const records = Array.isArray(body) ? body : body?.data || [];
  return records.map(normalizeApiLoan);
}

/**
 * Cria um empréstimo no backend
 */
export async function createBackendLoan(
  token: string,
  tenantId: string,
  loan: any
): Promise<any> {
  const bearerToken = token?.replace(/[\r\n]+/g, '').trim();
  if (!bearerToken) {
    throw new Error('Token de acesso inválido ou ausente para criar empréstimos.');
  }

  const payload: any = {
    client_id: loan.clientId,
    amount: loan.amount,
    interest_rate: loan.interestRate,
    total_amount: loan.totalAmount,
    outstanding_amount: loan.outstandingAmount !== undefined ? loan.outstandingAmount : loan.totalAmount,
    start_date: loan.startDate,
    installments_count: loan.installmentsCount,
    model: loan.model,
    status: loan.status || 'open',
  };
  
  // Serializar promissory_note como JSON se existir
  if (loan.promissoryNote) {
    payload.promissory_note = loan.promissoryNote;
  }

  const endpoint = `tenants/${tenantId}/loans`;

  const response = await fetch(buildUrl(endpoint), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${bearerToken}`,
    },
    body: JSON.stringify(payload),
  });

  const body = await toJson(response);
  assertOk(response, body);

  const record = Array.isArray(body) ? body[0] : body;
  return normalizeApiLoan(record);
}

/**
 * Atualiza um empréstimo no backend
 */
export async function updateBackendLoan(
  token: string,
  tenantId: string,
  loanId: string,
  loan: any
): Promise<any> {
  const bearerToken = token?.replace(/[\r\n]+/g, '').trim();
  if (!bearerToken) {
    throw new Error('Token de acesso inválido ou ausente para atualizar empréstimos.');
  }

  const payload: any = {
    client_id: loan.clientId,
    amount: loan.amount,
    interest_rate: loan.interestRate,
    total_amount: loan.totalAmount,
    outstanding_amount: loan.outstandingAmount !== undefined ? loan.outstandingAmount : loan.totalAmount,
    start_date: loan.startDate,
    installments_count: loan.installmentsCount,
    model: loan.model,
    status: loan.status,
  };
  
  // Serializar promissory_note como JSON se existir
  if (loan.promissoryNote) {
    payload.promissory_note = loan.promissoryNote;
  }

  const endpoint = `tenants/${tenantId}/loans/${loanId}`;

  const response = await fetch(buildUrl(endpoint), {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${bearerToken}`,
    },
    body: JSON.stringify(payload),
  });

  const body = await toJson(response);
  assertOk(response, body);

  const record = Array.isArray(body) ? body[0] : body;
  return normalizeApiLoan(record);
}

/**
 * Deleta um empréstimo no backend
 */
export async function deleteBackendLoan(
  token: string,
  tenantId: string,
  loanId: string
): Promise<void> {
  const bearerToken = token?.replace(/[\r\n]+/g, '').trim();
  if (!bearerToken) {
    throw new Error('Token de acesso inválido ou ausente para deletar empréstimos.');
  }

  const endpoint = `tenants/${tenantId}/loans/${loanId}`;

  const response = await fetch(buildUrl(endpoint), {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${bearerToken}`,
    },
  });

  const body = await toJson(response);
  assertOk(response, body);
}

/**
 * Normaliza uma parcela da API para o formato do frontend
 */
const normalizeApiInstallment = (apiInst: any): any => {
  const promisedPaymentHistory = apiInst.promised_payment_history || apiInst.promisedPaymentHistory || [];
  const originalDueDate = apiInst.due_date || apiInst.dueDate || '';
  
  // Se houver histórico de agendamentos, usar a data mais recente como data de vencimento
  let dueDate = originalDueDate;
  if (promisedPaymentHistory && Array.isArray(promisedPaymentHistory) && promisedPaymentHistory.length > 0) {
    const allDates = [
      ...promisedPaymentHistory.map((e: any) => e.date),
      apiInst.promised_payment_date || apiInst.promisedPaymentDate
    ].filter(Boolean);
    
    if (allDates.length > 0) {
      // Ordenar datas e pegar a mais recente
      const sortedDates = allDates.sort((a: string, b: string) => 
        (() => {
          const [ya, ma, da] = String(a).split('T')[0].split('-').map(Number);
          const [yb, mb, db] = String(b).split('T')[0].split('-').map(Number);
          return new Date(yb, mb - 1, db).getTime() - new Date(ya, ma - 1, da).getTime();
        })()
      );
      dueDate = sortedDates[0];
    }
  }
  
  return {
    id: apiInst.id || '',
    loanId: apiInst.loan_id || apiInst.loanId || '',
    clientId: apiInst.client_id || apiInst.clientId || '',
    number: parseInt(apiInst.number || 0, 10),
    dueDate: dueDate,
    amount: parseFloat(apiInst.amount || 0),
    amountPaid: parseFloat(apiInst.amount_paid || apiInst.amountPaid || 0),
    interestAmount: apiInst.interest_amount || apiInst.interestAmount ? parseFloat(apiInst.interest_amount || apiInst.interestAmount) : undefined,
    principalAmount: apiInst.principal_amount || apiInst.principalAmount ? parseFloat(apiInst.principal_amount || apiInst.principalAmount) : undefined,
    promisedPaymentReason: apiInst.promised_payment_reason || apiInst.promisedPaymentReason || undefined,
    promisedPaymentAmount: apiInst.promised_payment_amount || apiInst.promisedPaymentAmount ? parseFloat(apiInst.promised_payment_amount || apiInst.promisedPaymentAmount) : undefined,
    promisedPaymentDate: apiInst.promised_payment_date || apiInst.promisedPaymentDate || undefined,
    promisedPaymentHistory: promisedPaymentHistory,
    status: apiInst.status || 'PENDING',
    paidDate: apiInst.paid_date || apiInst.paidDate || undefined,
  };
};

/**
 * Busca parcelas do backend
 */
export async function fetchBackendInstallments(
  token: string,
  tenantId: string
): Promise<any[]> {
  const bearerToken = token?.replace(/[\r\n]+/g, '').trim();
  if (!bearerToken) {
    throw new Error('Token de acesso inválido ou ausente.');
  }

  const endpoint = `tenants/${tenantId}/installments`;

  const response = await fetch(buildUrl(endpoint), {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${bearerToken}`,
    },
  });

  const body = await toJson(response);
  assertOk(response, body);

  const records = Array.isArray(body) ? body : body?.data || [];
  return records.map(normalizeApiInstallment);
}

/**
 * Cria parcelas em lote no backend
 */
export async function createBackendInstallmentsBatch(
  token: string,
  tenantId: string,
  installments: any[]
): Promise<any[]> {
  const bearerToken = token?.replace(/[\r\n]+/g, '').trim();
  if (!bearerToken) {
    throw new Error('Token de acesso inválido ou ausente para criar parcelas.');
  }

  const payload = installments.map(inst => {
    // Normalizar status para o formato esperado pelo banco
    let status = inst.status || 'PENDING';
    if (typeof status === 'string') {
      status = status.toUpperCase();
    }
    
    return {
      loan_id: inst.loanId,
      client_id: inst.clientId,
      number: inst.number,
      due_date: inst.dueDate,
      amount: inst.amount,
      amount_paid: inst.amountPaid || 0,
      interest_amount: inst.interestAmount || null,
      principal_amount: inst.principalAmount || null,
      status: status,
      promised_payment_reason: inst.promisedPaymentReason || null,
      promised_payment_amount: inst.promisedPaymentAmount || null,
      promised_payment_date: inst.promisedPaymentDate || null,
      promised_payment_history: inst.promisedPaymentHistory || [],
    };
  });
  
  console.log('📦 Payload das parcelas para o backend:', JSON.stringify(payload, null, 2));

  const endpoint = `tenants/${tenantId}/installments/batch`;

  const response = await fetch(buildUrl(endpoint), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${bearerToken}`,
    },
    body: JSON.stringify(payload),
  });

  const body = await toJson(response);
  assertOk(response, body);

  const records = Array.isArray(body) ? body : body?.data || [];
  console.log('✅ Parcelas criadas no backend:', records.length, 'registros');
  console.log('📋 Dados retornados:', records);
  return records.map(normalizeApiInstallment);
}

/**
 * Cria uma parcela no backend
 */
export async function createBackendInstallment(
  token: string,
  tenantId: string,
  installment: any
): Promise<any> {
  const bearerToken = token?.replace(/[\r\n]+/g, '').trim();
  if (!bearerToken) {
    throw new Error('Token de acesso inválido ou ausente para criar parcelas.');
  }

  const payload = {
    loan_id: installment.loanId,
    client_id: installment.clientId,
    number: installment.number,
    due_date: installment.dueDate,
    amount: installment.amount,
    amount_paid: installment.amountPaid || 0,
    interest_amount: installment.interestAmount || null,
    principal_amount: installment.principalAmount || null,
    status: installment.status || 'PENDING',
    promised_payment_reason: installment.promisedPaymentReason || null,
    promised_payment_amount: installment.promisedPaymentAmount || null,
    promised_payment_date: installment.promisedPaymentDate || null,
    promised_payment_history: installment.promisedPaymentHistory || [],
  };

  const endpoint = `tenants/${tenantId}/installments`;

  const response = await fetch(buildUrl(endpoint), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${bearerToken}`,
    },
    body: JSON.stringify(payload),
  });

  const body = await toJson(response);
  assertOk(response, body);

  const record = Array.isArray(body) ? body[0] : body;
  return normalizeApiInstallment(record);
}

/**
 * Atualiza uma parcela no backend
 */
export async function updateBackendInstallment(
  token: string,
  tenantId: string,
  installmentId: string,
  installment: any
): Promise<any> {
  if (!isUuid(installmentId)) {
    throw new Error(
      `ID de parcela invalido para atualizacao no backend: ${installmentId}. ` +
      'Recarregue os dados para sincronizar os IDs reais.'
    );
  }

  const bearerToken = token?.replace(/[\r\n]+/g, '').trim();
  if (!bearerToken) {
    throw new Error('Token de acesso inválido ou ausente para atualizar parcelas.');
  }

  const payload: any = {
    loan_id: installment.loanId,
    client_id: installment.clientId,
    number: installment.number,
    due_date: installment.dueDate,
    amount: installment.amount,
    amount_paid: installment.amountPaid || 0,
    status: installment.status,
  };
  
  if (installment.interestAmount !== undefined) {
    payload.interest_amount = installment.interestAmount;
  }
  if (installment.principalAmount !== undefined) {
    payload.principal_amount = installment.principalAmount;
  }
  if (installment.promisedPaymentReason !== undefined) {
    payload.promised_payment_reason = installment.promisedPaymentReason;
  }
  if (installment.promisedPaymentAmount !== undefined) {
    payload.promised_payment_amount = installment.promisedPaymentAmount;
  }
  if (installment.promisedPaymentDate !== undefined) {
    payload.promised_payment_date = installment.promisedPaymentDate;
  }
  if (installment.promisedPaymentHistory !== undefined) {
    payload.promised_payment_history = installment.promisedPaymentHistory;
  }
  if (installment.paidDate !== undefined) {
    payload.paid_date = installment.paidDate;
  }

  const endpoint = `tenants/${tenantId}/installments/${installmentId}`;

  const response = await fetch(buildUrl(endpoint), {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${bearerToken}`,
    },
    body: JSON.stringify(payload),
  });

  const body = await toJson(response);
  assertOk(response, body);

  const record = Array.isArray(body) ? body[0] : body;
  return normalizeApiInstallment(record);
}

/**
 * Deleta uma parcela no backend
 */
export async function deleteBackendInstallment(
  token: string,
  tenantId: string,
  installmentId: string
): Promise<void> {
  if (!isUuid(installmentId)) {
    throw new Error(
      `ID de parcela invalido para exclusao no backend: ${installmentId}. ` +
      'Recarregue os dados para sincronizar os IDs reais.'
    );
  }

  const bearerToken = token?.replace(/[\r\n]+/g, '').trim();
  if (!bearerToken) {
    throw new Error('Token de acesso inválido ou ausente para deletar parcelas.');
  }

  const endpoint = `tenants/${tenantId}/installments/${installmentId}`;

  const response = await fetch(buildUrl(endpoint), {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${bearerToken}`,
    },
  });

  const body = await toJson(response);
  assertOk(response, body);
}

/**
 * Normaliza um usuário da API para o formato do frontend
 */
const normalizeApiUser = (apiUser: any): any => {
  return {
    id: apiUser.id || '',
    email: apiUser.email || '',
    name: apiUser.name || apiUser.email?.split('@')[0] || 'Usuário',
    role: apiUser.role || 'COLLECTION',
    whatsappContacts: apiUser.whatsapp_contacts || apiUser.whatsappContacts || [],
    tenantId: apiUser.tenant_id || apiUser.tenantId,
  };
};

/**
 * Cria um usuário no backend dentro do tenant especificado
 */
export async function createBackendUser(
  token: string,
  tenantId: string,
  user: { email: string; password: string; name: string; role: string; whatsappContacts?: string[] }
): Promise<any> {
  const bearerToken = token?.replace(/[\r\n]+/g, '').trim();
  if (!bearerToken) {
    throw new Error('Token de acesso inválido ou ausente para criar usuários.');
  }

  const payload = {
    email: user.email,
    password: user.password,
    name: user.name,
    role: user.role,
    whatsapp_contacts: user.whatsappContacts || [],
  };

  const endpoint = `tenants/${tenantId}/users`;

  const response = await fetch(buildUrl(endpoint), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${bearerToken}`,
    },
    body: JSON.stringify(payload),
  });

  const body = await toJson(response);
  assertOk(response, body);

  const record = Array.isArray(body) ? body[0] : body;
  return normalizeApiUser(record);
}

/**
 * Busca usuários do tenant no backend
 */
export async function fetchBackendUsers(
  token: string,
  tenantId: string
): Promise<any[]> {
  const bearerToken = token?.replace(/[\r\n]+/g, '').trim();
  if (!bearerToken) {
    throw new Error('Token de acesso inválido ou ausente.');
  }

  const endpoint = `tenants/${tenantId}/users`;

  const response = await fetch(buildUrl(endpoint), {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${bearerToken}`,
    },
  });

  const body = await toJson(response);
  
  // Tratamento especial para 404 - recurso pode não existir ou não estar disponível
  if (response.status === 404) {
    const errorMessage = body?.detail || body?.error || body?.message || 'Resource \'users\' is not tenant scoped or does not exist.';
    throw new Error(errorMessage);
  }
  
  assertOk(response, body);

  const records = Array.isArray(body) ? body : body?.data || [];
  return records.map(normalizeApiUser);
}
