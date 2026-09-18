export interface User {
  id: number
  name: string
  email: string
  last_selected_country_id: number | null
}

export interface Country {
  id: number
  name: string
  currency: string
  decimal_points: number
  wallet_count: number | null
  wallet_total: number | null
}

export type CategoryType = 'expense' | 'income'

export interface Category {
  id: number
  name: string
  type: CategoryType
  category_id: number | null
  children_count: number | null
  usage_count: number | null
}

export interface Wallet {
  id: number
  country_id: number
  name: string
  current_balance: number
  is_visible: boolean
  init_amount: number
  color: string | null
  order: number
}

export interface Contact {
  id: number
  country_id: number
  name: string
  balance: number
  created_at?: string
}

export type TransactionType = 'expense' | 'income' | 'transfer' | 'loan_to' | 'loan_from'

export type TransactionTargetType = 'wallet' | 'contact' | 'category'

export interface WalletTarget {
  id: number
  name: string
  color: string | null
}

export interface ContactTarget {
  id: number
  name: string
}

export interface CategoryTarget {
  id: number
  name: string
  type: CategoryType
}

export type TransactionTarget = WalletTarget | ContactTarget | CategoryTarget

export interface Transaction {
  id: number
  type: TransactionType
  amount: number
  notes: string | null
  date: string
  time: string
  wallet_id: number
  target_type: TransactionTargetType
  target_id: number
  target: TransactionTarget
  wallet?: { id: number; name: string; color: string | null } | null
}

export interface WalletSummary {
  id: number
  name: string
  current_balance: number
  is_visible: boolean
  color: string | null
}

export interface CategoryRollup {
  id: number
  name: string
  type: CategoryType
  total: number
  children?: CategoryRollup[]
}

export interface DashboardResponse {
  data: {
    currency: { symbol: string; decimal_points: number }
    date_from: string
    date_to: string
    income_total: number
    expense_total: number
    net: number
    wallets: WalletSummary[]
    wallet_total: number
    categories: CategoryRollup[]
  }
}

export interface TransactionTotals {
  income: number
  expense: number
}

export interface Paginated<T> {
  data: T[]
  totals?: TransactionTotals
  links: { first: string | null; last: string | null; prev: string | null; next: string | null }
  meta: {
    current_page: number
    from: number | null
    last_page: number
    path: string
    per_page: number
    to: number | null
    total: number
  }
}

export interface ApiError {
  message: string
  errors?: Record<string, string[]>
}

export interface ApiResponse<T> {
  data: T
  message?: string
}