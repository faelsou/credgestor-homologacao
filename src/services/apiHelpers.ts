/**
 * Helpers para requisições com refresh automático de token
 */

import { refreshAccessToken } from './api';

export type SessionUpdater = (session: {
  accessToken: string;
  refreshToken: string;
  accessExpiresAt?: string;
  refreshExpiresAt?: string;
}) => void;

let refreshPromise: Promise<any> | null = null;

/**
 * Faz uma requisição com refresh automático de token se necessário
 */
export async function fetchWithAutoRefresh(
  url: string,
  options: RequestInit,
  currentToken: string,
  refreshToken: string,
  onTokenRefreshed?: SessionUpdater
): Promise<Response> {
  // Primeira tentativa
  let response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${currentToken}`,
    },
  });

  // Se não for 401, retorna a resposta
  if (response.status !== 401) {
    return response;
  }

  // Token expirado, tenta refresh
  console.log('🔄 Token expirado, tentando renovar...');
  
  // Evita múltiplas tentativas simultâneas de refresh
  if (!refreshPromise) {
    refreshPromise = refreshAccessToken(refreshToken)
      .then(result => {
        refreshPromise = null;
        return result;
      })
      .catch(error => {
        refreshPromise = null;
        throw error;
      });
  }

  try {
    const newTokens = await refreshPromise;
    
    // Atualiza a sessão se callback fornecido
    if (onTokenRefreshed) {
      onTokenRefreshed({
        accessToken: newTokens.accessToken,
        refreshToken: newTokens.refreshToken,
        accessExpiresAt: newTokens.accessExpiresAt,
        refreshExpiresAt: newTokens.refreshExpiresAt,
      });
    }

    // Tenta novamente com o novo token
    response = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        Authorization: `Bearer ${newTokens.accessToken}`,
      },
    });

    return response;
  } catch (error) {
    console.error('❌ Erro ao renovar token:', error);
    // Se o refresh falhar, retorna a resposta original (401)
    return response;
  }
}
