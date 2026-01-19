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

export const generateNoteHash = () => {
  if (typeof crypto !== 'undefined' && 'getRandomValues' in crypto) {
    const randomBytes = crypto.getRandomValues(new Uint8Array(8));
    return Array.from(randomBytes)
      .map(byte => byte.toString(16).padStart(2, '0'))
      .join('');
  }

  return `${Math.random().toString(36).slice(2, 10)}${Math.random().toString(36).slice(2, 6)}`;
};
