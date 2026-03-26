import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: any[]) {
  return twMerge(clsx(inputs))
}

export function formatPhoneForWebhook(phone: string): string {
  // Remove tudo que não for dígito
  const digits = phone.replace(/\D/g, '');
  
  // Se o número tem 10 ou 11 dígitos (padrão Brasil sem DDI), adiciona 55
  if (digits.length === 11 || digits.length === 10) {
    return `55${digits}`;
  }
  
  // Se já começar com 55 e tiver o tamanho esperado (12 ou 13 dígitos), retorna como está
  if (digits.startsWith('55') && (digits.length === 12 || digits.length === 13)) {
    return digits;
  }
  
  // Caso contrário, tenta garantir que comece com 55 se não começar
  if (!digits.startsWith('55') && digits.length > 0) {
    return `55${digits}`;
  }
  
  return digits;
}