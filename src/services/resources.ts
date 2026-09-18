import app from './api'
import type {
  ApiResponse,
  Category,
  Contact,
  Country,
  DashboardResponse,
  Paginated,
  Transaction,
  TransactionTargetType,
  TransactionType,
  User,
  Wallet,
} from '../types/api'

export async function getCsrf(): Promise<void> {
  await app.get('/sanctum/csrf-cookie')
}

export async function login(email: string, password: string): Promise<User> {
  const { data } = await app.post<ApiResponse<User>>('/api/login', { email, password })
  return data.data
}

export async function logout(): Promise<void> {
  await app.post('/api/logout')
}

export async function me(): Promise<User> {
  const { data } = await app.get<ApiResponse<User>>('/api/user')
  return data.data
}

export async function listCountries(): Promise<Country[]> {
  const { data } = await app.get<ApiResponse<Country[]>>('/api/countries')
  return data.data
}

export async function storeCountry(payload: Partial<Country>): Promise<Country> {
  const { data } = await app.post<ApiResponse<Country>>('/api/countries', payload)
  return data.data
}

export async function updateCountry(id: number, payload: Partial<Country>): Promise<void> {
  await app.put(`/api/countries/${id}`, payload)
}

export async function deleteCountry(id: number): Promise<void> {
  await app.delete(`/api/countries/${id}`)
}

export async function listCategories(countryId: number): Promise<Category[]> {
  const { data } = await app.get<ApiResponse<Category[]>>(`/api/countries/${countryId}/categories`)
  return data.data
}

export async function storeCategory(countryId: number, payload: Partial<Category>): Promise<Category> {
  const { data } = await app.post<ApiResponse<Category>>(`/api/countries/${countryId}/categories`, payload)
  return data.data
}

export async function updateCategory(
  countryId: number,
  id: number,
  payload: Partial<Category>,
): Promise<Category> {
  const { data } = await app.put<ApiResponse<Category>>(`/api/countries/${countryId}/categories/${id}`, payload)
  return data.data
}

export async function deleteCategory(countryId: number, id: number): Promise<void> {
  await app.delete(`/api/countries/${countryId}/categories/${id}`)
}

export async function listWallets(countryId: number, visibleOnly = false): Promise<Wallet[]> {
  const { data } = await app.get<ApiResponse<Wallet[]>>(`/api/countries/${countryId}/wallets`, {
    params: { visible_only: visibleOnly ? 1 : undefined },
  })
  return data.data
}

export async function storeWallet(
  countryId: number,
  payload: Partial<Wallet> & { init_amount?: number },
): Promise<Wallet> {
  const { data } = await app.post<ApiResponse<Wallet>>(`/api/countries/${countryId}/wallets`, payload)
  return data.data
}

export async function updateWallet(countryId: number, id: number, payload: Partial<Wallet>): Promise<Wallet> {
  const { data } = await app.put<ApiResponse<Wallet>>(`/api/countries/${countryId}/wallets/${id}`, payload)
  return data.data
}

export async function deleteWallet(countryId: number, id: number): Promise<void> {
  await app.delete(`/api/countries/${countryId}/wallets/${id}`)
}

export async function reorderWallets(countryId: number, walletIds: number[]): Promise<void> {
  await app.post(`/api/countries/${countryId}/wallets/reorder`, { wallets: walletIds })
}

export interface TransactionFilters {
  type?: TransactionType
  wallet_id?: number
  category_id?: number
  expense_category_id?: number
  income_category_id?: number
  contact_id?: number
  date_from?: string
  date_to?: string
  search?: string
  page?: number
  per_page?: number
}

export async function listTransactions(countryId: number, filters: TransactionFilters = {}): Promise<Paginated<Transaction>> {
  const { data } = await app.get<Paginated<Transaction>>(`/api/countries/${countryId}/transactions`, { params: filters })
  return data
}

export interface TransactionPayload {
  type: TransactionType
  amount: number
  wallet_id: number
  target_type: TransactionTargetType
  target_id: number
  notes?: string | null
  date?: string
  time?: string
}

export async function storeTransaction(countryId: number, payload: TransactionPayload): Promise<Transaction> {
  const { data } = await app.post<ApiResponse<Transaction>>(`/api/countries/${countryId}/transactions`, payload)
  return data.data
}

export async function updateTransaction(id: number, payload: TransactionPayload): Promise<Transaction> {
  const { data } = await app.put<ApiResponse<Transaction>>(`/api/transactions/${id}`, payload)
  return data.data
}

export async function deleteTransaction(id: number): Promise<void> {
  await app.delete(`/api/transactions/${id}`)
}

export async function listContacts(countryId: number): Promise<Contact[]> {
  const { data } = await app.get<ApiResponse<Contact[]>>(`/api/countries/${countryId}/contacts`)
  return data.data
}

export async function storeContact(countryId: number, payload: Partial<Contact>): Promise<Contact> {
  const { data } = await app.post<ApiResponse<Contact>>(`/api/countries/${countryId}/contacts`, payload)
  return data.data
}

export async function updateContact(countryId: number, id: number, payload: Partial<Contact>): Promise<Contact> {
  const { data } = await app.put<ApiResponse<Contact>>(`/api/countries/${countryId}/contacts/${id}`, payload)
  return data.data
}

export async function deleteContact(countryId: number, id: number): Promise<void> {
  await app.delete(`/api/countries/${countryId}/contacts/${id}`)
}

export async function getDashboard(countryId: number, range: { date_from?: string; date_to?: string; wallet_id?: number } = {}): Promise<DashboardResponse['data']> {
  const { data } = await app.get<DashboardResponse>(`/api/countries/${countryId}/dashboard`, { params: range })
  return data.data
}