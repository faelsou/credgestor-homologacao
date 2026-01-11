/**
 * Serviço unificado para comunicação com o backend FastAPI
 * Substitui o antigo n8nApi.ts
 */

import { Client, User, UserRole } from '@/types';
import { normalizeUserRole, stripNonDigits } from '@/utils';

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

const resolveLoginUrl = () => {
  const explicitLoginUrl =
    (import.meta.env.VITE_API_LOGIN_URL as string | undefined);

  if (explicitLoginUrl) {
    return explicitLoginUrl.replace(/\/$/, '');
  }

  if (NORMALIZED_BASE_URL) {
    return `${NORMALIZED_BASE_URL}/auth/login`;
  }

  return undefined;
};

const CONFIGURED_LOGIN_URL = resolveLoginUrl();

const DEFAULT_TENANT_ID =
  (import.meta.env.VITE_API_TENANT_ID as string | undefined) || '00000000-0000-0000-0000-000000000001';

// Verifica se o backend está configurado
export const isBackendConfigured = Boolean(NORMALIZED_BASE_URL || CONFIGURED_LOGIN_URL);

type ApiClientPayload = Record<string, any>;

const sanitizeToken = (token?: string | null) => {
  const cleaned = token?.replace(/[\r\n]+/g, '').trim();
  return cleaned && cleaned.length > 0 ? cleaned : null;
};

const toJson = async (response: Response) => {
  const text = await response.text();
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return text;
  }
};

const buildUrl = (path: string) => {
  if (!NORMALIZED_BASE_URL) throw new Error('API base URL is not configured');
  return `${NORMALIZED_BASE_URL}/${path.replace(/^\//, '')}`;
};

const assertOk = (response: Response, body: any) => {
  if (response.ok) return;
  const message =
    (body && (body.error || body.erro || body.message || body.detail)) ||
    `Erro ${response.status}: ${response.statusText}`;
  throw new Error(message);
};

export const mapApiUserToUser = (apiUser: any): User => ({
  id: apiUser.id || apiUser.user_id || '',
  name: apiUser.nome || apiUser.name || apiUser.email?.split('@')[0] || 'Usuário',
  email: apiUser.email || '',
  role: normalizeUserRole(apiUser.role),
  whatsappContacts: apiUser.whatsapp_contacts || apiUser.whatsappContacts || [],
  tenantId: apiUser.tenant_id || apiUser.tenantId || DEFAULT_TENANT_ID,
  tenantName: apiUser.tenant_nome || apiUser.tenantName,
});

export interface LoginResult {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
  accessExpiresAt?: string;
  refreshExpiresAt?: string;
  user: User;
}

export async function loginWithBackend(email: string, password: string): Promise<LoginResult> {
  if (!CONFIGURED_LOGIN_URL) {
    throw new Error('Backend não configurado. Configure VITE_API_BASE_URL ou VITE_API_LOGIN_URL.');
  }

  const tenantId = DEFAULT_TENANT_ID;

  console.log('🔐 Tentando login em:', CONFIGURED_LOGIN_URL);
  console.log('📧 Email:', email);
  console.log('🏢 Tenant ID:', tenantId || 'não informado');

  try {
    const response = await fetch(CONFIGURED_LOGIN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, senha: password, tenant_id: tenantId }),
    });

    const body = await toJson(response);
    
    if (!response.ok) {
      const errorMessage = body?.detail || body?.error || body?.message || `Erro ${response.status}: ${response.statusText}`;
      console.error('❌ Erro no login:', {
        status: response.status,
        statusText: response.statusText,
        error: errorMessage,
        body: body
      });
      throw new Error(errorMessage);
    }
    
    console.log('✅ Login bem-sucedido');
    
    const user = mapApiUserToUser(body?.usuario || body?.user || {});
    const accessToken = sanitizeToken(body?.access_token);
    const refreshToken = sanitizeToken(body?.refresh_token);

    if (!accessToken) {
      throw new Error('Token de acesso não retornado pelo servidor.');
    }

    return {
      accessToken,
      refreshToken: refreshToken || '',
      tokenType: body?.token_type || 'bearer',
      expiresIn: body?.expires_in || 3600,
      accessExpiresAt: body?.access_expires_at,
      refreshExpiresAt: body?.refresh_expires_at,
      user,
    };
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      console.error('❌ Erro de rede ao fazer login:', error.message);
      console.error('🔗 URL tentada:', CONFIGURED_LOGIN_URL);
      throw new Error(`Não foi possível conectar ao servidor. Verifique se a API está acessível em ${CONFIGURED_LOGIN_URL}`);
    }
    if (error instanceof Error) {
      throw error;
    }
    console.error('❌ Erro desconhecido no login:', error);
    throw new Error('Erro ao fazer login. Tente novamente.');
  }
}

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

export async function fetchClients(token: string, tenantId?: string): Promise<Client[]> {
  const bearerToken = sanitizeToken(token);
  if (!bearerToken) {
    throw new Error('Token de acesso inválido ou ausente.');
  }

  const effectiveTenantId = tenantId || DEFAULT_TENANT_ID;
  if (!effectiveTenantId) {
    throw new Error('tenant_id é obrigatório para buscar clientes.');
  }

  const endpoint = `tenants/${effectiveTenantId}/clients`;

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

export async function createClient(
  token: string,
  tenantId: string | undefined,
  client: Client,
): Promise<Client> {
  const bearerToken = sanitizeToken(token);
  if (!bearerToken) {
    throw new Error('Token de acesso inválido ou ausente para criar clientes.');
  }

  const effectiveTenantId = tenantId || DEFAULT_TENANT_ID;
  if (!effectiveTenantId) {
    throw new Error('tenant_id é obrigatório para criar clientes.');
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

  const endpoint = `tenants/${effectiveTenantId}/clients`;

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

export async function updateClient(
  token: string,
  tenantId: string | undefined,
  clientId: string,
  client: Client,
): Promise<Client> {
  const bearerToken = sanitizeToken(token);
  if (!bearerToken) {
    throw new Error('Token de acesso inválido ou ausente para atualizar clientes.');
  }

  const effectiveTenantId = tenantId || DEFAULT_TENANT_ID;
  if (!effectiveTenantId) {
    throw new Error('tenant_id é obrigatório para atualizar clientes.');
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

  const endpoint = `tenants/${effectiveTenantId}/clients/${clientId}`;

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

export async function deleteClient(
  token: string,
  tenantId: string | undefined,
  clientId: string
): Promise<void> {
  const bearerToken = sanitizeToken(token);
  if (!bearerToken) {
    throw new Error('Token de acesso inválido ou ausente para deletar clientes.');
  }

  const effectiveTenantId = tenantId || DEFAULT_TENANT_ID;
  if (!effectiveTenantId) {
    throw new Error('tenant_id é obrigatório para deletar clientes.');
  }

  const endpoint = `tenants/${effectiveTenantId}/clients/${clientId}`;

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
