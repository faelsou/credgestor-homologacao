/**
 * Serviço para comunicação com o backend FastAPI
 * Usado quando não está usando N8N backend
 */

import { Client } from '@/types';
import { stripNonDigits } from '@/utils';

const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ||
  'http://localhost:8000';

const NORMALIZED_BASE_URL = API_BASE_URL?.replace(/\/$/, '');

const buildUrl = (path: string) => {
  if (!NORMALIZED_BASE_URL) throw new Error('API base URL is not configured');
  return `${NORMALIZED_BASE_URL}/${path.replace(/^\//, '')}`;
};

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
