import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
  }).format(amount);
}

export function phoneToEmail(phone: string) {
  // Remove any non-digit characters
  const cleanPhone = phone.replace(/\D/g, '');
  return `${cleanPhone}@gundalegacy.com`;
}
