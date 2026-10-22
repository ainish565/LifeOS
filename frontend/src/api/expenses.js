import { apiFetch } from './client'

// ── Currency config ─────────────────────────────────────────────────────── //
// INR is the default. To switch currency later, update this object only.
export const CURRENCY = {
  code:   'INR',
  symbol: '₹',
  locale: 'en-IN',
}

export function formatCurrency(amount) {
  if (amount == null) return '—'
  return new Intl.NumberFormat(CURRENCY.locale, {
    style:    'currency',
    currency: CURRENCY.code,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatCurrencyCompact(amount) {
  if (amount == null) return '—'
  if (amount >= 100000) return `${CURRENCY.symbol}${(amount / 100000).toFixed(1)}L`
  if (amount >= 1000)   return `${CURRENCY.symbol}${(amount / 1000).toFixed(1)}K`
  return `${CURRENCY.symbol}${Math.round(amount)}`
}

// ── Categories ──────────────────────────────────────────────────────────── //
export const EXPENSE_CATEGORIES = [
  'Food', 'Travel', 'Shopping', 'Education',
  'Entertainment', 'Bills', 'Health', 'Other',
]

export const CATEGORY_COLORS = {
  Food:          '#f97316',
  Travel:        '#0ea5e9',
  Shopping:      '#ec4899',
  Education:     '#8b5cf6',
  Entertainment: '#f59e0b',
  Bills:         '#ef4444',
  Health:        '#10b981',
  Other:         '#6b7280',
}

export const CATEGORY_ICONS = {
  Food:          '🍽️',
  Travel:        '✈️',
  Shopping:      '🛍️',
  Education:     '📚',
  Entertainment: '🎮',
  Bills:         '⚡',
  Health:        '💊',
  Other:         '📦',
}

// ── API functions ───────────────────────────────────────────────────────── //

export function fetchExpenses(params = {}) {
  const qs = new URLSearchParams(
    Object.fromEntries(Object.entries(params).filter(([, v]) => v != null && v !== ''))
  ).toString()
  return apiFetch(`/api/expenses/${qs ? '?' + qs : ''}`)
}

export function fetchExpenseStats() {
  return apiFetch('/api/expenses/stats')
}

export function fetchExpenseChart() {
  return apiFetch('/api/expenses/chart')
}

export function fetchBudget(month) {
  const qs = month ? `?month=${month}` : ''
  return apiFetch(`/api/expenses/budget${qs}`)
}

export function setBudget(month, amount) {
  return apiFetch('/api/expenses/budget', {
    method: 'PUT',
    body:   { month, amount },
  })
}

export function createExpense(data) {
  return apiFetch('/api/expenses/', { method: 'POST', body: data })
}

export function updateExpense(id, data) {
  return apiFetch(`/api/expenses/${id}`, { method: 'PUT', body: data })
}

export function deleteExpense(id) {
  return apiFetch(`/api/expenses/${id}`, { method: 'DELETE' })
}
