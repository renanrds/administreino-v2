import { HIDDEN_AMOUNT, useAmountsHidden } from './privacy';

export const moneygerTheme = {
  primary: '#22c55e',
  primaryDark: '#16a34a',
  primarySoft: 'rgba(34,197,94,0.15)',
  gradient: 'linear-gradient(135deg, #22c55e, #16a34a)',
  bg: '#0f0f1a',
  surface: '#1a1a2e',
  border: '#2a2a4a',
  muted: '#94a3b8',
  danger: '#ef4444',
  income: '#22c55e',
  expense: '#f87171',
};

export function formatBRL(value: string | number | null | undefined): string {
  if (useAmountsHidden.getState().hidden) return HIDDEN_AMOUNT;
  const n = typeof value === 'string' ? Number(value) : (value ?? 0);
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
