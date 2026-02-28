/**
 * Serviço unificado para comunicação com o backend FastAPI
 * Substitui o antigo n8nApi.ts
 */

import { Client, User, UserRole } from '@/types';
import { normalizeUserRole, stripNonDigits, sanitizeString, sanitizeEmail, sanitizeText, sanitizeCpfCnpj } from '@/utils';

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
  tenantId: apiUser.tenant_id || apiUser.tenantId, // REGRA: Sem fallback - deve vir do backend
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

export async function refreshAccessToken(refreshToken: string): Promise<LoginResult> {
  const refreshUrl = `${NORMALIZED_BASE_URL}/auth/refresh`;
  
  try {
    const response = await fetch(refreshUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    let body;
    try {
      body = await toJson(response);
    } catch (parseError) {
      console.error('❌ Erro ao parsear resposta do refresh:', parseError);
      throw new Error(`Erro ${response.status}: ${response.statusText || 'Resposta inválida do servidor'}`);
    }
    
    if (!response.ok) {
      const errorMessage = body?.detail || body?.error || body?.message || `Erro ${response.status}: ${response.statusText}`;
      throw new Error(errorMessage);
    }
    
    const user = mapApiUserToUser(body?.usuario || body?.user || {});
    const accessToken = sanitizeToken(body?.access_token);
    const newRefreshToken = sanitizeToken(body?.refresh_token);

    if (!accessToken) {
      throw new Error('Token de acesso não retornado pelo servidor.');
    }

    return {
      accessToken,
      refreshToken: newRefreshToken || refreshToken,
      tokenType: body?.token_type || 'bearer',
      expiresIn: body?.expires_in || 3600,
      accessExpiresAt: body?.access_expires_at,
      refreshExpiresAt: body?.refresh_expires_at,
      user,
    };
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error(`Não foi possível conectar ao servidor para renovar token.`);
    }
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Erro ao renovar token. Tente novamente.');
  }
}

export async function loginWithBackend(email: string, password: string): Promise<LoginResult> {
  if (!CONFIGURED_LOGIN_URL) {
    throw new Error('Backend não configurado. Configure VITE_API_BASE_URL ou VITE_API_LOGIN_URL.');
  }

  // Não enviar tenant_id - deixar o backend usar o dos metadados do usuário automaticamente
  // Isso evita conflitos quando o tenant_id do usuário é diferente do DEFAULT_TENANT_ID
  const tenantId = undefined; // Removido: DEFAULT_TENANT_ID

  console.log('🔐 Tentando login em:', CONFIGURED_LOGIN_URL);
  console.log('📧 Email:', email);
  console.log('🏢 Tenant ID:', tenantId || 'não informado (backend usará dos metadados)');

  try {
    // Montar payload sem tenant_id para que o backend use o dos metadados
    const payload: { email: string; senha: string; tenant_id?: string } = { 
      email, 
      senha: password 
    };
    // Só adiciona tenant_id se estiver explicitamente configurado e for necessário
    // if (tenantId) {
    //   payload.tenant_id = tenantId;
    // }

    const response = await fetch(CONFIGURED_LOGIN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    // Ler a resposta como texto primeiro para verificar se é HTML
    const responseText = await response.text().catch(() => '');
    const isHtml = responseText.trim().startsWith('<');

    // Verificar se é erro 405 (Method Not Allowed) - geralmente indica problema de roteamento
    if (response.status === 405) {
      console.error('❌ Erro 405 (Method Not Allowed) no login:', {
        status: response.status,
        statusText: response.statusText,
        url: CONFIGURED_LOGIN_URL,
        isHtmlResponse: isHtml,
        responsePreview: isHtml ? responseText.substring(0, 200) : responseText
      });
      
      if (isHtml) {
        throw new Error('Erro 405: A requisição não está chegando ao backend. Verifique se o Traefik está roteando corretamente a rota /api para o backend.');
      } else {
        throw new Error('Erro 405: Método POST não permitido. Verifique a configuração do servidor.');
      }
    }

    let body;
    try {
      // Tentar fazer parse do JSON
      body = responseText ? JSON.parse(responseText) : null;
    } catch (parseError) {
      console.error('❌ Erro ao parsear resposta do servidor:', parseError);
      console.error('📄 Resposta do servidor (texto):', isHtml ? 'HTML recebido (possível problema de roteamento)' : responseText.substring(0, 500));
      
      // Se for HTML, provavelmente é um problema de roteamento
      if (isHtml && response.status >= 400) {
        throw new Error(`Erro ${response.status}: A resposta do servidor é HTML, indicando que a requisição não chegou ao backend. Verifique o roteamento.`);
      }
      
      throw new Error(`Erro ${response.status}: ${response.statusText || 'Resposta inválida do servidor'}`);
    }
    
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

  // REGRA IMPORTANTE: tenant_id é obrigatório - não usar fallback
  if (!tenantId) {
    throw new Error('tenant_id é obrigatório para buscar clientes. Usuário deve estar autenticado com tenant válido.');
  }

  const effectiveTenantId = tenantId;

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
  refreshToken?: string,
  onTokenRefreshed?: (newToken: string, newRefreshToken: string) => void,
): Promise<Client> {
  const bearerToken = sanitizeToken(token);
  if (!bearerToken) {
    throw new Error('Token de acesso inválido ou ausente para criar clientes.');
  }

  // REGRA IMPORTANTE: tenant_id é obrigatório - não usar fallback
  if (!tenantId) {
    throw new Error('tenant_id é obrigatório para criar clientes. Usuário deve estar autenticado com tenant válido.');
  }
  const effectiveTenantId = tenantId;

  // Monta o payload no formato esperado pelo backend com sanitização
  const payload = {
    nome: sanitizeString(client.name, 200),
    nome_completo: sanitizeString(client.name, 200),
    cpf_cnpj: sanitizeCpfCnpj(client.cpf),
    tipo_pessoa: 'PF', // Padrão: Pessoa Física
    email: client.email ? sanitizeEmail(client.email) : null,
    telefone: stripNonDigits(client.phone) || null,
    celular: stripNonDigits(client.phone) || null,
    whatsapp: stripNonDigits(client.phone) || null,
    endereco: sanitizeString(client.street, 200) || null,
    complemento: sanitizeString(client.complement, 200) || null,
    bairro: sanitizeString(client.neighborhood, 100) || null,
    cidade: sanitizeString(client.city, 100) || null,
    estado: sanitizeString(client.state, 2) || null,
    cep: stripNonDigits(client.cep) || null,
    data_nascimento: client.birthDate || null,
    observacoes: client.notes ? sanitizeText(client.notes, 5000) : null,
  };

  const endpoint = `tenants/${effectiveTenantId}/clients`;
  let currentToken = bearerToken;

  // Primeira tentativa
  let response = await fetch(buildUrl(endpoint), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${currentToken}`,
    },
    body: JSON.stringify(payload),
  });

  // Se token expirado e temos refresh token, tenta renovar
  if (response.status === 401 && refreshToken && onTokenRefreshed) {
    try {
      console.log('🔄 Token expirado, renovando...');
      const newTokens = await refreshAccessToken(refreshToken);
      currentToken = newTokens.accessToken;
      onTokenRefreshed(newTokens.accessToken, newTokens.refreshToken);
      
      // Tenta novamente com novo token
      response = await fetch(buildUrl(endpoint), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${currentToken}`,
        },
        body: JSON.stringify(payload),
      });
    } catch (refreshError) {
      console.error('❌ Erro ao renovar token:', refreshError);
      // Se o refresh também falhou, lança erro específico
      const errorMessage = refreshError instanceof Error ? refreshError.message : 'Sessão expirada';
      throw new Error(`Sessão expirada. Por favor, faça login novamente. (${errorMessage})`);
    }
  }

  // Se ainda retornar 401 após tentar refresh, lança erro específico
  if (response.status === 401) {
    throw new Error('Sessão expirada. Por favor, faça login novamente.');
  }

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
  refreshToken?: string,
  onTokenRefreshed?: (newToken: string, newRefreshToken: string) => void,
): Promise<Client> {
  const bearerToken = sanitizeToken(token);
  if (!bearerToken) {
    throw new Error('Token de acesso inválido ou ausente para atualizar clientes.');
  }

  // REGRA IMPORTANTE: tenant_id é obrigatório - não usar fallback
  if (!tenantId) {
    throw new Error('tenant_id é obrigatório para atualizar clientes. Usuário deve estar autenticado com tenant válido.');
  }
  const effectiveTenantId = tenantId;

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

  const endpoint = `tenants/${effectiveTenantId}/clients/${clientId}`;
  let currentToken = bearerToken;

  // Primeira tentativa
  let response = await fetch(buildUrl(endpoint), {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${currentToken}`,
    },
    body: JSON.stringify(payload),
  });

  // Se token expirado e temos refresh token, tenta renovar
  if (response.status === 401 && refreshToken && onTokenRefreshed) {
    try {
      console.log('🔄 Token expirado, renovando...');
      const newTokens = await refreshAccessToken(refreshToken);
      currentToken = newTokens.accessToken;
      onTokenRefreshed(newTokens.accessToken, newTokens.refreshToken);
      
      // Tenta novamente com novo token
      response = await fetch(buildUrl(endpoint), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${currentToken}`,
        },
        body: JSON.stringify(payload),
      });
    } catch (refreshError) {
      console.error('❌ Erro ao renovar token:', refreshError);
      // Se o refresh também falhou, lança erro específico
      const errorMessage = refreshError instanceof Error ? refreshError.message : 'Sessão expirada';
      throw new Error(`Sessão expirada. Por favor, faça login novamente. (${errorMessage})`);
    }
  }

  // Se ainda retornar 401 após tentar refresh, lança erro específico
  if (response.status === 401) {
    throw new Error('Sessão expirada. Por favor, faça login novamente.');
  }

  // Se ainda retornar 401 após tentar refresh, lança erro específico
  if (response.status === 401) {
    throw new Error('Sessão expirada. Por favor, faça login novamente.');
  }

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

  // REGRA IMPORTANTE: tenant_id é obrigatório - não usar fallback
  if (!tenantId) {
    throw new Error('tenant_id é obrigatório para deletar clientes. Usuário deve estar autenticado com tenant válido.');
  }
  const effectiveTenantId = tenantId;

  const endpoint = `tenants/${effectiveTenantId}/clients/${clientId}`;

  const response = await fetch(buildUrl(endpoint), {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${bearerToken}`,
    },
  });

  const body = await toJson(response);
  
  if (!response.ok) {
    // Criar erro com status code e mensagem detalhada
    const errorMessage = body?.detail || body?.error || body?.erro || body?.message || 
                        `Erro ${response.status}: ${response.statusText}`;
    const error: any = new Error(errorMessage);
    error.status = response.status;
    error.detail = body?.detail || errorMessage;
    throw error;
  }
}

export interface ForgotPasswordResponse {
  message: string;
  success: boolean;
}

export async function forgotPassword(email: string): Promise<ForgotPasswordResponse> {
  if (!NORMALIZED_BASE_URL) {
    throw new Error('Backend não configurado. Configure VITE_API_BASE_URL.');
  }

  try {
    const response = await fetch(`${NORMALIZED_BASE_URL}/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });

    const body = await toJson(response);
    
    if (!response.ok) {
      const errorMessage = body?.detail || body?.error || body?.message || `Erro ${response.status}: ${response.statusText}`;
      throw new Error(errorMessage);
    }

    return {
      message: body?.message || 'Email de reset enviado com sucesso.',
      success: body?.success ?? true,
    };
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error(`Não foi possível conectar ao servidor. Verifique se a API está acessível.`);
    }
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Erro ao solicitar reset de senha. Tente novamente.');
  }
}

export interface ResetPasswordResponse {
  message: string;
  success: boolean;
}

export async function resetPassword(password: string, tokenHash: string): Promise<ResetPasswordResponse> {
  if (!NORMALIZED_BASE_URL) {
    throw new Error('Backend não configurado. Configure VITE_API_BASE_URL.');
  }

  try {
    const response = await fetch(`${NORMALIZED_BASE_URL}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password, token_hash: tokenHash }),
    });

    const body = await toJson(response);
    
    if (!response.ok) {
      const errorMessage = body?.detail || body?.error || body?.message || `Erro ${response.status}: ${response.statusText}`;
      throw new Error(errorMessage);
    }

    return {
      message: body?.message || 'Senha resetada com sucesso.',
      success: body?.success ?? true,
    };
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error(`Não foi possível conectar ao servidor. Verifique se a API está acessível.`);
    }
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Erro ao resetar senha. Tente novamente.');
  }
}
