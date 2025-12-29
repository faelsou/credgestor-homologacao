import { Client, User, UserRole } from '@/types';
import { formatCep, formatCpf, formatPhone, stripNonDigits } from '@/utils';

const DEFAULT_BASE_URL = 'https://n8n.aiagentautomate.com.br/webhook';

const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ||
  (import.meta.env.VITE_N8N_BASE_URL as string | undefined) ||
  DEFAULT_BASE_URL;

const NORMALIZED_BASE_URL = API_BASE_URL?.replace(/\/$/, '');

const resolveLoginUrl = () => {
  const explicitLoginUrl =
    (import.meta.env.VITE_API_LOGIN_URL as string | undefined) ||
    (import.meta.env.VITE_N8N_LOGIN_URL as string | undefined);

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
  (import.meta.env.VITE_API_TENANT_ID as string | undefined) ||
  (import.meta.env.VITE_N8N_TENANT_ID as string | undefined);

// Mantém o nome exportado para compatibilidade com o restante da aplicação
export const isN8NBackendConfigured = Boolean(NORMALIZED_BASE_URL || CONFIGURED_LOGIN_URL);

type ApiClientPayload = Record<string, any>;

const toJson = async (response: Response) => {
  const text = await response.text();
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return text;
  }
};

const buildUrl = (path: string) => {
  if (!NORMALIZED_BASE_URL) throw new Error('N8N base URL is not configured');
  return `${NORMALIZED_BASE_URL}/${path.replace(/^\//, '')}`;
};

const assertOk = (response: Response, body: any) => {
  if (response.ok) return;
  const message =
    (body && (body.error || body.erro || body.message)) ||
    `Erro ${response.status}: ${response.statusText}`;
  throw new Error(message);
};

export const mapApiUserToUser = (apiUser: any): User => ({
  id: apiUser.id || apiUser.user_id || '',
  name: apiUser.nome || apiUser.name || apiUser.email?.split('@')[0] || 'Usuário',
  email: apiUser.email || '',
  role: (apiUser.role as UserRole) || UserRole.ADMIN,
  whatsappContacts: apiUser.whatsapp_contacts || apiUser.whatsappContacts || [],
  tenantId: apiUser.tenant_id || apiUser.tenantId || DEFAULT_TENANT_ID,
  tenantName: apiUser.tenant_nome || apiUser.tenantName,
});

export interface N8NLoginResult {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
  accessExpiresAt?: string;
  refreshExpiresAt?: string;
  user: User;
}

export async function loginWithN8N(email: string, password: string): Promise<N8NLoginResult> {
  if (!CONFIGURED_LOGIN_URL) {
    throw new Error('N8N backend não configurado.');
  }

  const tenantId = DEFAULT_TENANT_ID;

  const response = await fetch(CONFIGURED_LOGIN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, senha: password, tenant_id: tenantId }),
  });

  const body = await toJson(response);
  assertOk(response, body);

  const user = mapApiUserToUser(body.usuario || {});

  return {
    accessToken: body.access_token,
    refreshToken: body.refresh_token,
    tokenType: body.token_type || 'Bearer',
    expiresIn: body.expires_in ?? 900,
    accessExpiresAt: body.access_expires_at,
    refreshExpiresAt: body.refresh_expires_at,
    user,
  };
}

const normalizeApiClient = (payload: ApiClientPayload): Client => {
  const cpf = payload.cpf || payload.CPF || '';
  const phone = payload.whatsapp || payload.phone || payload.telefone || payload.whatsapp_contacts?.[0] || '';
  const cep = payload.cep || '';

  return {
    id: String(payload.id || payload.uuid || payload.user_id || crypto.randomUUID?.() || Date.now()),
    name: payload.nome_completo || payload.nome || payload.name || 'Cliente',
    cpf: cpf ? formatCpf(cpf) : '',
    phone: phone ? formatPhone(phone) : '',
    email: payload.email || '',
    cep: cep ? formatCep(cep) : '',
    street: payload.endereco || payload.street || '',
    complement: payload.complemento || '',
    neighborhood: payload.bairro || '',
    city: payload.cidade || '',
    state: payload.estado || '',
    status: payload.status || 'active',
    birthDate: payload.data_nascimento || payload.dataNascimento || '',
    notes: payload.observacoes || payload.observacao || '',
  };
};

export async function fetchN8NClients(token: string, tenantId?: string): Promise<Client[]> {
  const effectiveTenantId = tenantId || DEFAULT_TENANT_ID;
  if (!effectiveTenantId) {
    throw new Error('tenant_id não informado para buscar clientes.');
  }

  const response = await fetch(buildUrl(`clientes/${effectiveTenantId}`), {
    headers: { Authorization: `Bearer ${token}` },
  });

  const body = await toJson(response);
  assertOk(response, body);

  const records: ApiClientPayload[] = Array.isArray(body)
    ? body
    : Array.isArray(body?.clientes)
      ? body.clientes
      : [];

  return records.map(normalizeApiClient);
}

export async function createN8NClient(
  token: string,
  tenantId: string | undefined,
  client: Client,
): Promise<Client> {
  const payload: ApiClientPayload = {
    nome_completo: client.name,
    cpf: stripNonDigits(client.cpf),
    whatsapp: stripNonDigits(client.phone),
    email: client.email,
    cep: stripNonDigits(client.cep),
    endereco: client.street,
    complemento: client.complement,
    bairro: client.neighborhood,
    cidade: client.city,
    estado: client.state,
    data_nascimento: client.birthDate || null,
    observacoes: client.notes,
    tenant_id_required: tenantId || DEFAULT_TENANT_ID,
  };

  const response = await fetch(buildUrl('clientes'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  const body = await toJson(response);
  assertOk(response, body);

  const record = Array.isArray(body) ? body[0] : body?.cliente || body;
  return normalizeApiClient(record);
}
