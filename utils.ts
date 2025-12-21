import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

export const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('pt-BR');
};

export const isLate = (dueDate: string) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
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

// --- N8N INTEGRATION ---
// Webhook padrão apontando para o agente de clientes no n8n
const N8N_WEBHOOK_URL = import.meta.env.VITE_N8N_WEBHOOK_URL || 'https://n8n.aiagentautomate.com.br/webhook/clientes';

export async function sendToN8N(payload: any) {
  try {
    if (!N8N_WEBHOOK_URL || N8N_WEBHOOK_URL.includes('seu-n8n')) {
      console.log('[N8N Webhook Disparado - modo simulado]', payload);
      return true;
    }

    const response = await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Webhook retornou ${response.status}`);
    }

    return true;
  } catch (error) {
    console.error('Erro ao conectar com n8n', error);
    return false;
  }
}
