//import { clsx, type ClassValue } from 'clsx';
//import { twMerge } from 'tailwind-merge';
//
//export function cn(...inputs: ClassValue[]) {
//  return twMerge(clsx(inputs));
//}
//
//export const formatCurrency = (value: number) => {
//  return new Intl.NumberFormat('pt-BR', {
//    style: 'currency',
//    currency: 'BRL',
//  }).format(value);
//};
//
//export const formatDate = (dateString: string) => {
//  return new Date(dateString).toLocaleDateString('pt-BR');
//};
//
//export const isLate = (dueDate: string) => {
//  const today = new Date();
//  today.setHours(0, 0, 0, 0);
//  const due = new Date(dueDate);
//  return due < today;
//};
//
//export const getTodayDateString = () => {
//  const now = new Date();
//  const timezoneOffset = now.getTimezoneOffset() * 60000;
//  return new Date(now.getTime() - timezoneOffset).toISOString().split('T')[0];
//};
//
//export const stripNonDigits = (value?: string | null) => (value || '').replace(/\D/g, '');
//
//export const formatCpf = (value: string) => {
//  const digits = stripNonDigits(value).slice(0, 11);
//  return digits
//    .replace(/(\d{3})(\d)/, '$1.$2')
//    .replace(/(\d{3})(\d)/, '$1.$2')
//    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
//};
//
//export const formatPhone = (value: string) => {
//  const digits = stripNonDigits(value).slice(0, 11);
//  return digits
//    .replace(/(\d{2})(\d)/, '($1)$2')
//    .replace(/(\d{5})(\d)/, '$1-$2');
//};
//
//export const formatCep = (value: string) => {
//  const digits = stripNonDigits(value).slice(0, 8);
//  return digits.replace(/(\d{5})(\d)/, '$1-$2');
//};
//
//export const generateNoteHash = () => {
//  if (typeof crypto !== 'undefined' && 'getRandomValues' in crypto) {
//    const randomBytes = crypto.getRandomValues(new Uint8Array(8));
//    return Array.from(randomBytes)
//      .map(byte => byte.toString(16).padStart(2, '0'))
//      .join('');
//  }
//
//  return `${Math.random().toString(36).slice(2, 10)}${Math.random().toString(36).slice(2, 6)}`;
//};
//
//// --- N8N INTEGRATION ---
//// Webhook padrão apontando para o agente de clientes no n8n
//const N8N_WEBHOOK_URL = import.meta.env.VITE_N8N_WEBHOOK_URL || 'https://n8n.aiagentautomate.com.br/webhook/clientes';
//
//type SendToN8NOptions = {
//  accessToken?: string;
//  webhookUrl?: string;
//};
//
//export async function sendToN8N(payload: any, options: SendToN8NOptions = {}) {
//  const { accessToken, webhookUrl } = options;
//  try {
//    const targetUrl = webhookUrl || N8N_WEBHOOK_URL;
//
//    if (!targetUrl || targetUrl.includes('seu-n8n')) {
//      console.log('[N8N Webhook Disparado - modo simulado]', payload);
//      return true;
//    }
//
//    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
//    if (accessToken) {
//      headers.Authorization = `Bearer ${accessToken}`;
//    }
//
//    const response = await fetch(targetUrl, {
//      method: 'POST',
//      headers,
//      body: JSON.stringify(payload)
//    });
//
//    if (!response.ok) {
//      throw new Error(`Webhook retornou ${response.status}`);
//    }
//
//    return true;
//  } catch (error) {
//    console.error('Erro ao conectar com n8n', error);
//    return false;
//  }
//}
//

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { UserRole } from '@/types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const normalizeUserRole = (role?: string | null): UserRole => {
  const normalized = role?.toString().trim().toUpperCase();

  if (normalized === UserRole.COLLECTION) return UserRole.COLLECTION;
  if (normalized === UserRole.ADMIN) return UserRole.ADMIN;

  return UserRole.ADMIN;
};

export const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

export const formatDate = (dateString: string) => {
  if (!dateString) return '';
  // Normalizar a data para evitar problemas de fuso horário
  // Se já está no formato YYYY-MM-DD, usar diretamente
  let normalizedDate = dateString;
  if (dateString.includes('T')) {
    normalizedDate = dateString.split('T')[0];
  } else if (dateString.includes(' ')) {
    normalizedDate = dateString.split(' ')[0];
  }
  
  // Parse a data no formato YYYY-MM-DD
  const [year, month, day] = normalizedDate.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('pt-BR');
};

export const isLate = (dueDate: string) => {
  if (!dueDate) return false;
  // Normalizar a data para evitar problemas de fuso horário
  let normalizedDate = dueDate;
  if (dueDate.includes('T')) {
    normalizedDate = dueDate.split('T')[0];
  } else if (dueDate.includes(' ')) {
    normalizedDate = dueDate.split(' ')[0];
  }
  
  // Parse a data no formato YYYY-MM-DD
  const [year, month, day] = normalizedDate.split('-').map(Number);
  const due = new Date(year, month - 1, day);
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  
  return due < today;
};

export const getTodayDateString = () => {
  const now = new Date();
  const timezoneOffset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - timezoneOffset).toISOString().split('T')[0];
};

/**
 * Normaliza uma string de data para YYYY-MM-DD.
 * Aceita inputs ISO (YYYY-MM-DDTHH:mm:ss) e com espaço.
 */
export const normalizeYmd = (value: string): string => {
  if (!value) return '';
  if (value.includes('T')) return value.split('T')[0];
  if (value.includes(' ')) return value.split(' ')[0];
  return value;
};

/**
 * Compara duas strings YYYY-MM-DD de forma determinística (sem fuso).
 * Retorna negativo se a < b, zero se igual, positivo se a > b.
 */
export const compareYmd = (a: string, b: string): number => {
  const [ya, ma, da] = normalizeYmd(a).split('-').map(Number);
  const [yb, mb, db] = normalizeYmd(b).split('-').map(Number);
  const ta = new Date(ya, ma - 1, da).getTime();
  const tb = new Date(yb, mb - 1, db).getTime();
  return ta - tb;
};

/**
 * Soma meses a uma string YYYY-MM-DD, preservando o dia quando possível.
 * Trata corretamente fins de mês (ex.: 31/01 + 1 mês => 29/02 ou 28/02).
 */
export const addMonthsYmd = (dateYmd: string, months: number): string => {
  const [year, month, day] = normalizeYmd(dateYmd).split('-').map(Number);
  const baseMonthIndex = month - 1;
  const targetMonthIndexTotal = baseMonthIndex + months;
  const targetYear = year + Math.floor(targetMonthIndexTotal / 12);
  const normalizedTargetMonthIndex = ((targetMonthIndexTotal % 12) + 12) % 12;
  const lastDayOfTargetMonth = new Date(targetYear, normalizedTargetMonthIndex + 1, 0).getDate();
  const targetDay = Math.min(day, lastDayOfTargetMonth);
  const newDate = new Date(targetYear, normalizedTargetMonthIndex, targetDay);
  const yearStr = newDate.getFullYear();
  const monthStr = String(newDate.getMonth() + 1).padStart(2, '0');
  const dayStr = String(newDate.getDate()).padStart(2, '0');
  return `${yearStr}-${monthStr}-${dayStr}`;
};

export const stripNonDigits = (value?: string | null) => (value || '').replace(/\D/g, '');

export const formatCpf = (value: string) => {
  const digits = stripNonDigits(value).slice(0, 11);
  return digits
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
};

export const formatPhone = (value: string) => {
  const digits = stripNonDigits(value).slice(0, 11);
  return digits
    .replace(/(\d{2})(\d)/, '($1)$2')
    .replace(/(\d{5})(\d)/, '$1-$2');
};

export const formatCep = (value: string) => {
  const digits = stripNonDigits(value).slice(0, 8);
  return digits.replace(/(\d{5})(\d)/, '$1-$2');
};

export const formatInterestRate = (value: number): string => {
  return `${Number(value.toFixed(1))}%`;
};

export const generateNoteHash = () => {
  if (typeof crypto !== 'undefined' && 'getRandomValues' in crypto) {
    const randomBytes = crypto.getRandomValues(new Uint8Array(8));
    return Array.from(randomBytes)
      .map(byte => byte.toString(16).padStart(2, '0'))
      .join('');
  }

  return `${Math.random().toString(36).slice(2, 10)}${Math.random().toString(36).slice(2, 6)}`;
};

/**
 * Gera o número da nota promissória no formato #X/YYY#
 * onde X é o número do cliente e YYY é o sequencial da nota para aquele cliente
 */
export const generatePromissoryNoteNumber = (
  clientId: string,
  clientIndex: number,
  existingLoans: Array<{ clientId: string; promissoryNote?: { numberHash?: string } }>
): string => {
  // Número do cliente (usando índice + 1 para começar em 1)
  const clientNumber = clientIndex + 1;
  
  // Contar quantas notas promissórias já existem para este cliente
  const clientNotesCount = existingLoans.filter(
    loan => loan.clientId === clientId && loan.promissoryNote?.numberHash
  ).length;
  
  // Sequencial da nota (incrementa 1 para a nova nota)
  const noteSequence = clientNotesCount + 1;
  
  // Formatar no padrão #X/YYY#
  return `#${clientNumber}/${noteSequence.toString().padStart(3, '0')}#`;
};

/**
 * Converte um número para extenso em português brasileiro
 * Usado para notas promissórias e documentos oficiais
 */
/**
 * Sanitiza strings para prevenir XSS e injeção de código
 * Remove caracteres perigosos e limita o tamanho
 */
export const sanitizeString = (input: string | null | undefined, maxLength: number = 1000): string => {
  if (!input) return '';
  
  // Limitar tamanho primeiro
  let sanitized = input.substring(0, maxLength);
  
  // Remover caracteres de controle e tags HTML
  sanitized = sanitized
    .replace(/[<>]/g, '') // Remove < e >
    .replace(/[\x00-\x1F\x7F]/g, '') // Remove caracteres de controle
    .trim();
  
  return sanitized;
};

/**
 * Sanitiza email removendo caracteres perigosos
 */
export const sanitizeEmail = (email: string | null | undefined): string => {
  if (!email) return '';
  
  // Remover espaços e caracteres perigosos, manter apenas caracteres válidos para email
  return email
    .trim()
    .toLowerCase()
    .replace(/[<>\"'`]/g, '') // Remove caracteres perigosos
    .substring(0, 254); // Limite máximo de email
};

/**
 * Sanitiza texto de observações/notas removendo HTML e limitando tamanho
 */
export const sanitizeText = (text: string | null | undefined, maxLength: number = 5000): string => {
  if (!text) return '';
  
  let sanitized = text.substring(0, maxLength);
  
  // Remover tags HTML básicas
  sanitized = sanitized
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .trim();
  
  return sanitized;
};

/**
 * Valida e sanitiza CPF/CNPJ
 */
export const sanitizeCpfCnpj = (value: string | null | undefined): string => {
  if (!value) return '';
  
  // Remove tudo exceto dígitos
  const digits = stripNonDigits(value);
  
  // Limita a 14 dígitos (tamanho máximo de CNPJ)
  return digits.substring(0, 14);
};

export const numberToWords = (value: number): string => {
  const unidades = ['', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove'];
  const dezAteDezenove = ['dez', 'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove'];
  const dezenas = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'];
  const centenas = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos'];

  const converterGrupo = (num: number): string => {
    if (num === 0) return '';
    if (num === 100) return 'cem';
    
    const c = Math.floor(num / 100);
    const resto = num % 100;
    const d = Math.floor(resto / 10);
    const u = resto % 10;
    
    let resultado = '';
    
    if (c > 0) {
      resultado += centenas[c];
      if (resto > 0) resultado += ' e ';
    }
    
    if (resto > 0) {
      if (resto < 10) {
        resultado += unidades[resto];
      } else if (resto < 20) {
        resultado += dezAteDezenove[resto - 10];
      } else {
        resultado += dezenas[d];
        if (u > 0) resultado += ' e ' + unidades[u];
      }
    }
    
    return resultado;
  };

  // Separar parte inteira e decimal
  const partes = value.toFixed(2).split('.');
  const inteiro = parseInt(partes[0]);
  const centavos = parseInt(partes[1]);

  if (inteiro === 0 && centavos === 0) return 'zero reais';

  let resultado = '';

  // Milhões
  const milhoes = Math.floor(inteiro / 1000000);
  if (milhoes > 0) {
    resultado += converterGrupo(milhoes);
    resultado += milhoes === 1 ? ' milhão' : ' milhões';
    const resto = inteiro % 1000000;
    if (resto > 0) resultado += ' ';
  }

  // Milhares
  const milhares = Math.floor((inteiro % 1000000) / 1000);
  if (milhares > 0) {
    if (milhares === 1) {
      resultado += 'mil';
    } else {
      resultado += converterGrupo(milhares) + ' mil';
    }
    const resto = inteiro % 1000;
    if (resto > 0) resultado += ' ';
  }

  // Centenas, dezenas e unidades
  const resto = inteiro % 1000;
  if (resto > 0 || inteiro === 0) {
    resultado += converterGrupo(resto);
  }

  // Reais
  if (inteiro === 1) {
    resultado += ' real';
  } else if (inteiro > 1) {
    resultado += ' reais';
  }

  // Centavos
  if (centavos > 0) {
    if (inteiro > 0) resultado += ' e ';
    resultado += converterGrupo(centavos);
    if (centavos === 1) {
      resultado += ' centavo';
    } else {
      resultado += ' centavos';
    }
  }

  return resultado.trim();
};

export { generateSequentialHashes, promissoryIdentifyingTotal } from './promissoryHashes';
