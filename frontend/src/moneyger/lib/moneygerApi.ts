import api from '../../services/api';

export type MoneyAccount = {
  id: number;
  name: string;
  account_type: string;
  initial_balance: string;
  limit_amount?: string | null;
  balance?: string;
  available?: string | null;
  role?: 'asset' | 'liability';
  requires_limit?: boolean;
  color: string;
  is_active: boolean;
};

export type MoneyCategory = {
  id: number;
  name: string;
  kind: 'expense' | 'income';
  icon: string;
  color: string;
};

export type MoneyTransaction = {
  id: number;
  account: number;
  account_name?: string;
  category: number | null;
  category_name?: string | null;
  type: 'expense' | 'income' | 'transfer';
  amount: string;
  occurred_on: string;
  description: string;
  notes?: string;
  payment_method: string;
  external_ref?: string;
  source: string;
  status: string;
};

export type MoneyBudget = {
  id: number;
  category: number;
  category_name?: string;
  year: number;
  month: number;
  limit_amount: string;
  spent?: string;
};

export type MoneyInbox = {
  id: number;
  status: string;
  raw_text: string;
  parsed_payload: Record<string, unknown>;
  confidence: number;
  source: string;
  has_attachment?: boolean;
  attachment_url?: string | null;
  attachment_mime?: string | null;
};

export type DashboardData = {
  year: number;
  month: number;
  total_balance: string;
  available_balance?: string;
  credit_debt?: string;
  net_worth?: string;
  accounts: {
    id: number;
    name: string;
    balance: string;
    color: string;
    account_type?: string;
    role?: 'asset' | 'liability';
  }[];
  month_income: string;
  month_expense: string;
  month_net: string;
  by_category: { category_id: number; name: string; color: string; total: string }[];
  budget_progress: { id: number; category: string; color: string; limit: string; spent: string; pct: number }[];
  upcoming: { id: number; description: string; amount: string; next_due_on: string; payment_method: string }[];
  inbox_count: number;
  recent_transactions: MoneyTransaction[];
  insights: {
    avg_daily_expense: string;
    top_category: string | null;
    prev_month_expense: string;
    pace_vs_prev: number | null;
  };
};

export async function fetchDashboard(year?: number, month?: number): Promise<DashboardData> {
  const params: Record<string, number> = {};
  if (year) params.year = year;
  if (month) params.month = month;
  const { data } = await api.get('/moneyger/dashboard/', { params });
  return data;
}

export async function fetchAccounts(): Promise<MoneyAccount[]> {
  const { data } = await api.get('/moneyger/accounts/');
  return data;
}

export async function createAccount(payload: Partial<MoneyAccount>): Promise<MoneyAccount> {
  const { data } = await api.post('/moneyger/accounts/', payload);
  return data;
}

export async function updateAccount(
  id: number,
  payload: Partial<Pick<MoneyAccount, 'name' | 'account_type' | 'initial_balance' | 'limit_amount' | 'color'>>,
): Promise<MoneyAccount> {
  const { data } = await api.patch(`/moneyger/accounts/${id}/`, payload);
  return data;
}

export async function deleteAccount(id: number): Promise<void> {
  await api.delete(`/moneyger/accounts/${id}/`);
}

export async function payCreditBill(
  creditAccountId: number,
  payload: { from_account: number; amount: string; occurred_on?: string; description?: string },
) {
  const { data } = await api.post(`/moneyger/accounts/${creditAccountId}/pay-bill/`, payload);
  return data;
}

export async function fetchCategories(): Promise<MoneyCategory[]> {
  const { data } = await api.get('/moneyger/categories/');
  return data;
}

export async function createCategory(payload: {
  name: string;
  kind: 'expense' | 'income';
  color?: string;
  icon?: string;
}): Promise<MoneyCategory> {
  const { data } = await api.post('/moneyger/categories/', payload);
  return data;
}

export async function updateCategory(
  id: number,
  payload: Partial<Pick<MoneyCategory, 'name' | 'kind' | 'color' | 'icon'>>,
): Promise<MoneyCategory> {
  const { data } = await api.patch(`/moneyger/categories/${id}/`, payload);
  return data;
}

export async function deleteCategory(id: number): Promise<void> {
  await api.delete(`/moneyger/categories/${id}/`);
}

export async function fetchTransactions(params?: Record<string, string | number>): Promise<MoneyTransaction[]> {
  const { data } = await api.get('/moneyger/transactions/', { params });
  return data;
}

export async function createTransaction(payload: Partial<MoneyTransaction>): Promise<MoneyTransaction> {
  const { data } = await api.post('/moneyger/transactions/', payload);
  return data;
}

export async function updateTransaction(
  id: number,
  payload: Partial<{
    category: number | null;
    description: string;
    amount: string | number;
    occurred_on: string;
    payment_method: string;
    status: string;
    notes: string;
  }>,
): Promise<MoneyTransaction> {
  const { data } = await api.patch(`/moneyger/transactions/${id}/`, payload);
  return data;
}

export async function deleteTransaction(id: number): Promise<void> {
  await api.delete(`/moneyger/transactions/${id}/`);
}

export async function fetchBudgets(year: number, month: number): Promise<MoneyBudget[]> {
  const { data } = await api.get('/moneyger/budgets/', { params: { year, month } });
  return data;
}

export async function createBudget(payload: {
  category: number;
  year: number;
  month: number;
  limit_amount: string | number;
}): Promise<MoneyBudget> {
  const { data } = await api.post('/moneyger/budgets/', payload);
  return data;
}

export async function updateBudget(
  id: number,
  payload: Partial<{ category: number; limit_amount: string | number; year: number; month: number }>,
): Promise<MoneyBudget> {
  const { data } = await api.patch(`/moneyger/budgets/${id}/`, payload);
  return data;
}

export async function deleteBudget(id: number): Promise<void> {
  await api.delete(`/moneyger/budgets/${id}/`);
}

export async function fetchInbox(): Promise<MoneyInbox[]> {
  const { data } = await api.get('/moneyger/inbox/');
  return data;
}

/** Baixa anexo autenticado como blob URL (revogar com URL.revokeObjectURL). */
export async function fetchInboxAttachmentBlob(id: number): Promise<{ blob: Blob; objectUrl: string; mime: string }> {
  const { data, headers } = await api.get(`/moneyger/inbox/${id}/attachment/`, {
    responseType: 'blob',
  });
  const mime = (headers['content-type'] as string) || data.type || 'application/octet-stream';
  const blob = data instanceof Blob ? data : new Blob([data], { type: mime });
  return { blob, objectUrl: URL.createObjectURL(blob), mime };
}

export async function confirmInbox(id: number, payload: Record<string, unknown> = {}) {
  const { data } = await api.post(`/moneyger/inbox/${id}/confirm/`, payload);
  return data;
}

export async function dismissInbox(id: number) {
  const { data } = await api.post(`/moneyger/inbox/${id}/dismiss/`);
  return data;
}

export async function parseCapture(text: string) {
  const { data } = await api.post('/moneyger/parse/', { text });
  return data;
}

export async function quickCapture(text: string, opts?: { account_id?: number; create_transaction?: boolean }) {
  const { data } = await api.post('/moneyger/capture/', {
    text,
    account_id: opts?.account_id,
    create_transaction: opts?.create_transaction ?? true,
  });
  return data;
}

export async function fetchTelegramLinkCode() {
  const { data } = await api.get('/moneyger/telegram/link-code/');
  return data as {
    link_code: string;
    instructions: string;
    linked: boolean;
    bot_username?: string | null;
    deep_link?: string | null;
  };
}

export async function fetchTelegramStatus() {
  const { data } = await api.get('/moneyger/telegram/status/');
  return data as {
    linked: boolean;
    chat_id: string | null;
    linked_at?: string | null;
    bot_username?: string | null;
    bot_display_name?: string;
    deep_link?: string | null;
  };
}

export type MoneyRecurring = {
  id: number;
  account: number;
  account_name?: string;
  category: number | null;
  category_name?: string | null;
  type: 'expense' | 'income' | 'transfer';
  nature: string;
  amount: string;
  description: string;
  notes?: string;
  frequency: string;
  next_due_on: string;
  payment_method: string;
  is_active: boolean;
};

export type MoneyInstallment = {
  id: number;
  account: number;
  account_name?: string;
  category: number | null;
  category_name?: string | null;
  description: string;
  notes?: string;
  total_amount: string;
  installment_amount: string;
  total_installments: number;
  paid_installments: number;
  remaining_installments: number;
  is_completed: boolean;
  start_on: string;
  next_due_on: string;
  payment_method: string;
  is_active: boolean;
};

export async function fetchRecurring(): Promise<MoneyRecurring[]> {
  const { data } = await api.get('/moneyger/recurring/');
  return data;
}

export async function createRecurring(payload: Partial<MoneyRecurring>): Promise<MoneyRecurring> {
  const { data } = await api.post('/moneyger/recurring/', payload);
  return data;
}

export async function deleteRecurring(id: number): Promise<void> {
  await api.delete(`/moneyger/recurring/${id}/`);
}

export async function fetchInstallments(active?: boolean): Promise<MoneyInstallment[]> {
  const params = active === undefined ? {} : { active: active ? '1' : '0' };
  const { data } = await api.get('/moneyger/installments/', { params });
  return data;
}

export async function createInstallment(payload: Record<string, unknown>): Promise<MoneyInstallment> {
  const { data } = await api.post('/moneyger/installments/', payload);
  return data;
}

export async function payInstallment(id: number): Promise<{ plan: MoneyInstallment; transaction: MoneyTransaction | null }> {
  const { data } = await api.post(`/moneyger/installments/${id}/pay/`, { create_transaction: true });
  return data;
}

export async function deleteInstallment(id: number): Promise<void> {
  await api.delete(`/moneyger/installments/${id}/`);
}

export type MarketListItem = {
  id: number;
  name: string;
  quantity: string;
  is_checked: boolean;
  price: string | null;
  sort_order: number;
  checked_at?: string | null;
};

export type MarketList = {
  id: number;
  title: string;
  limit_amount: string;
  status: 'draft' | 'active' | 'completed' | 'cancelled';
  notes?: string;
  started_at?: string | null;
  completed_at?: string | null;
  resulting_transaction?: number | null;
  spent_total: string;
  remaining: string;
  items_count: number;
  checked_count: number;
  items: MarketListItem[];
};

export async function fetchMarketLists(status?: string): Promise<MarketList[]> {
  const { data } = await api.get('/moneyger/market-lists/', {
    params: status ? { status } : undefined,
  });
  return data;
}

export async function fetchMarketList(id: number): Promise<MarketList> {
  const { data } = await api.get(`/moneyger/market-lists/${id}/`);
  return data;
}

export async function createMarketList(payload: {
  title?: string;
  limit_amount: string | number;
  notes?: string;
  items_input?: { name: string; quantity?: string }[];
}): Promise<MarketList> {
  const { data } = await api.post('/moneyger/market-lists/', payload);
  return data;
}

export async function updateMarketList(
  id: number,
  payload: Partial<{ title: string; limit_amount: string | number; notes: string }>,
): Promise<MarketList> {
  const { data } = await api.patch(`/moneyger/market-lists/${id}/`, payload);
  return data;
}

export async function deleteMarketList(id: number): Promise<void> {
  await api.delete(`/moneyger/market-lists/${id}/`);
}

export async function startMarketList(id: number): Promise<MarketList> {
  const { data } = await api.post(`/moneyger/market-lists/${id}/start/`);
  return data;
}

export async function completeMarketList(id: number): Promise<MarketList> {
  const { data } = await api.post(`/moneyger/market-lists/${id}/complete/`);
  return data;
}

export async function cancelMarketList(id: number): Promise<MarketList> {
  const { data } = await api.post(`/moneyger/market-lists/${id}/cancel/`);
  return data;
}

export async function addMarketListItem(
  listId: number,
  payload: { name: string; quantity?: string },
): Promise<MarketListItem> {
  const { data } = await api.post(`/moneyger/market-lists/${listId}/items/`, payload);
  return data;
}

export async function deleteMarketListItem(listId: number, itemId: number): Promise<void> {
  await api.delete(`/moneyger/market-lists/${listId}/items/${itemId}/`);
}

export async function checkMarketListItem(
  listId: number,
  itemId: number,
  price: string | number,
): Promise<{ item: MarketListItem; list: MarketList }> {
  const { data } = await api.post(`/moneyger/market-lists/${listId}/items/${itemId}/check/`, {
    price: typeof price === 'string' ? price.replace(',', '.') : price,
  });
  return data;
}

export async function uncheckMarketListItem(
  listId: number,
  itemId: number,
): Promise<{ item: MarketListItem; list: MarketList }> {
  const { data } = await api.delete(`/moneyger/market-lists/${listId}/items/${itemId}/check/`);
  return data;
}

export async function marketListToTransaction(
  listId: number,
  payload: {
    account_id: number;
    category_id?: number | null;
    payment_method?: string;
    occurred_on?: string;
    description?: string;
  },
): Promise<{ list: MarketList; transaction: MoneyTransaction }> {
  const { data } = await api.post(`/moneyger/market-lists/${listId}/to-transaction/`, payload);
  return data;
}

export function formatApiError(err: any, fallback: string): string {
  const d = err?.response?.data;
  if (!d) return fallback;
  if (typeof d.error === 'string') return d.error;
  if (typeof d.detail === 'string') return d.detail;
  return fallback;
}
