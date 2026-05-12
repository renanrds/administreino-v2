import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { BanknoteArrowDown, BanknoteArrowUp, Landmark, Loader2, PiggyBank, Plus, Target, TrendingDown, TrendingUp, Wallet } from 'lucide-react';
import api from '../../../services/api';
import { useAuthStore } from '../../../store/authStore';
import type {
  FinanceCategory,
  FinanceDashboardData,
  FinanceGoal,
  FinancePlanningStyle,
  FinanceRiskProfile,
  FinanceTransactionType,
  FinanceWalletType,
} from '../../../types';

type OnboardingForm = {
  wallet_name: string;
  initial_balance: string;
  monthly_income: string;
  monthly_fixed_expenses: string;
  savings_target_percent: string;
  payday_day: string;
  financial_goal: FinanceGoal;
  risk_profile: FinanceRiskProfile;
  planning_style: FinancePlanningStyle;
};

type WalletForm = {
  name: string;
  wallet_type: FinanceWalletType;
  initial_balance: string;
};

type TransactionForm = {
  wallet: string;
  category: string;
  transaction_type: FinanceTransactionType;
  description: string;
  amount: string;
  transaction_date: string;
};

const inputClassName = 'w-full rounded-2xl px-4 py-3 text-sm text-white outline-none';
const inputStyle = { background: '#0c1711', border: '1px solid #234c33' };
const today = new Date().toISOString().slice(0, 10);

const DEFAULT_ONBOARDING: OnboardingForm = {
  wallet_name: 'Carteira Principal',
  initial_balance: '0',
  monthly_income: '5000',
  monthly_fixed_expenses: '2500',
  savings_target_percent: '15',
  payday_day: '5',
  financial_goal: 'build_reserve',
  risk_profile: 'balanced',
  planning_style: 'guided',
};

const DEFAULT_WALLET: WalletForm = {
  name: '',
  wallet_type: 'savings',
  initial_balance: '0',
};

const goalLabel: Record<FinanceGoal, string> = {
  control_spending: 'Controlar gastos',
  build_reserve: 'Montar reserva',
  pay_debts: 'Quitar dívidas',
  invest_better: 'Investir melhor',
};

const walletTypeLabel: Record<FinanceWalletType, string> = {
  cash: 'Dinheiro',
  checking: 'Conta corrente',
  savings: 'Reserva',
  investment: 'Investimento',
};

function formatCurrency(value: number | string) {
  return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function AdminisgranaPage() {
  const { user } = useAuthStore();
  const [dashboard, setDashboard] = useState<FinanceDashboardData | null>(null);
  const [categories, setCategories] = useState<FinanceCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingOnboarding, setSavingOnboarding] = useState(false);
  const [savingWallet, setSavingWallet] = useState(false);
  const [savingTransaction, setSavingTransaction] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [onboardingForm, setOnboardingForm] = useState<OnboardingForm>(DEFAULT_ONBOARDING);
  const [walletForm, setWalletForm] = useState<WalletForm>(DEFAULT_WALLET);
  const [transactionForm, setTransactionForm] = useState<TransactionForm>({
    wallet: '',
    category: '',
    transaction_type: 'expense',
    description: '',
    amount: '',
    transaction_date: today,
  });

  const hasAccess = !!user?.has_adminisgrana_access;

  const loadData = async () => {
    if (!hasAccess) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const [dashboardResponse, categoriesResponse] = await Promise.all([
        api.get('/grana/dashboard/'),
        api.get('/grana/categories/'),
      ]);
      setDashboard(dashboardResponse.data);
      setCategories(categoriesResponse.data);
    } catch {
      setError('Nao foi possivel carregar o painel financeiro.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [hasAccess]);

  useEffect(() => {
    const firstWallet = dashboard?.wallets[0];
    if (!firstWallet) return;
    setTransactionForm((current) => ({
      ...current,
      wallet: current.wallet || String(firstWallet.id),
    }));
  }, [dashboard?.wallets]);

  const filteredCategories = useMemo(
    () => categories.filter((category) => category.category_type === transactionForm.transaction_type),
    [categories, transactionForm.transaction_type]
  );

  useEffect(() => {
    if (!filteredCategories.length) return;
    setTransactionForm((current) => {
      const stillExists = filteredCategories.some((category) => String(category.id) === current.category);
      return stillExists ? current : { ...current, category: String(filteredCategories[0].id) };
    });
  }, [filteredCategories]);

  const submitOnboarding = async () => {
    setSavingOnboarding(true);
    setError(null);
    try {
      const { data } = await api.post('/grana/onboarding/', {
        ...onboardingForm,
        initial_balance: Number(onboardingForm.initial_balance),
        monthly_income: Number(onboardingForm.monthly_income),
        monthly_fixed_expenses: Number(onboardingForm.monthly_fixed_expenses),
        savings_target_percent: Number(onboardingForm.savings_target_percent),
        payday_day: Number(onboardingForm.payday_day),
      });
      setDashboard(data);
      const categoriesResponse = await api.get('/grana/categories/');
      setCategories(categoriesResponse.data);
    } catch {
      setError('Falha ao salvar o perfil financeiro inicial.');
    } finally {
      setSavingOnboarding(false);
    }
  };

  const submitWallet = async () => {
    if (!walletForm.name.trim()) {
      setError('Informe um nome para a carteira.');
      return;
    }

    setSavingWallet(true);
    setError(null);
    try {
      await api.post('/grana/wallets/', {
        name: walletForm.name,
        wallet_type: walletForm.wallet_type,
        initial_balance: Number(walletForm.initial_balance),
      });
      setWalletForm(DEFAULT_WALLET);
      await loadData();
    } catch {
      setError('Falha ao criar a nova carteira.');
    } finally {
      setSavingWallet(false);
    }
  };

  const submitTransaction = async () => {
    if (!transactionForm.wallet || !transactionForm.description.trim() || !transactionForm.amount) {
      setError('Preencha carteira, descricao e valor antes de salvar.');
      return;
    }

    setSavingTransaction(true);
    setError(null);
    try {
      await api.post('/grana/transactions/', {
        wallet: Number(transactionForm.wallet),
        category: transactionForm.category ? Number(transactionForm.category) : null,
        transaction_type: transactionForm.transaction_type,
        description: transactionForm.description,
        amount: Number(transactionForm.amount),
        transaction_date: transactionForm.transaction_date,
      });
      setTransactionForm((current) => ({
        ...current,
        description: '',
        amount: '',
      }));
      await loadData();
    } catch {
      setError('Falha ao registrar o lancamento.');
    } finally {
      setSavingTransaction(false);
    }
  };

  if (!hasAccess) {
    return (
      <div className="min-h-full px-4 py-6 md:px-8 md:py-8">
        <div className="max-w-4xl mx-auto rounded-3xl p-6 md:p-8" style={{ background: '#112017', border: '1px solid #234c33' }}>
          <h1 className="text-2xl font-black text-white">Adminisgrana</h1>
          <p className="mt-2 text-sm" style={{ color: '#bbf7d0' }}>
            O modulo financeiro fica disponivel para usuarios com acesso ao Adminisgrana.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-full px-4 py-8 flex items-center justify-center">
        <Loader2 className="animate-spin" style={{ color: 'var(--color-primary)' }} />
      </div>
    );
  }

  const onboardingCompleted = dashboard?.onboarding_completed;

  return (
    <div className="min-h-full px-4 py-6 md:px-8 md:py-8">
      <div className="max-w-6xl mx-auto space-y-5">
        <section
          className="rounded-3xl p-6 md:p-8"
          style={{
            background: 'linear-gradient(130deg, #10231a 0%, #123323 55%, #13482e 100%)',
            border: '1px solid #1f5c3b',
          }}
        >
          <p className="text-sm font-semibold tracking-wide uppercase" style={{ color: '#86efac' }}>
            Adminisgrana
          </p>
          <h1 className="text-3xl md:text-4xl font-black text-white mt-2">Operacao do seu caixa pessoal</h1>
          <p className="mt-2 text-base" style={{ color: '#d1fae5' }}>
            Onboarding rapido para entender seu perfil financeiro, importar sua base inicial e ja comecar com um painel util.
          </p>
        </section>

        {error && (
          <div className="rounded-2xl px-4 py-3 text-sm" style={{ background: 'rgba(239,68,68,0.14)', border: '1px solid rgba(239,68,68,0.35)', color: '#fecaca' }}>
            {error}
          </div>
        )}

        {!onboardingCompleted ? (
          <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-3xl p-5 md:p-6 space-y-4" style={{ background: '#112017', border: '1px solid #234c33' }}>
              <div>
                <h2 className="text-xl font-black text-white">Questionario inicial</h2>
                <p className="mt-1 text-sm" style={{ color: '#bbf7d0' }}>
                  Em menos de 2 minutos definimos seu perfil, carteira principal e uma base minima de entradas e saidas para o dashboard ja nascer util.
                </p>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <Field label="Nome da carteira principal">
                  <input value={onboardingForm.wallet_name} onChange={(e) => setOnboardingForm({ ...onboardingForm, wallet_name: e.target.value })} className={inputClassName} style={inputStyle} />
                </Field>
                <Field label="Saldo atual inicial">
                  <input value={onboardingForm.initial_balance} onChange={(e) => setOnboardingForm({ ...onboardingForm, initial_balance: e.target.value })} className={inputClassName} style={inputStyle} type="number" step="0.01" />
                </Field>
                <Field label="Renda mensal">
                  <input value={onboardingForm.monthly_income} onChange={(e) => setOnboardingForm({ ...onboardingForm, monthly_income: e.target.value })} className={inputClassName} style={inputStyle} type="number" step="0.01" />
                </Field>
                <Field label="Gastos fixos mensais">
                  <input value={onboardingForm.monthly_fixed_expenses} onChange={(e) => setOnboardingForm({ ...onboardingForm, monthly_fixed_expenses: e.target.value })} className={inputClassName} style={inputStyle} type="number" step="0.01" />
                </Field>
                <Field label="Meta de poupanca (%)">
                  <input value={onboardingForm.savings_target_percent} onChange={(e) => setOnboardingForm({ ...onboardingForm, savings_target_percent: e.target.value })} className={inputClassName} style={inputStyle} type="number" min="0" max="100" />
                </Field>
                <Field label="Dia do pagamento">
                  <input value={onboardingForm.payday_day} onChange={(e) => setOnboardingForm({ ...onboardingForm, payday_day: e.target.value })} className={inputClassName} style={inputStyle} type="number" min="1" max="31" />
                </Field>
                <Field label="Objetivo financeiro">
                  <select value={onboardingForm.financial_goal} onChange={(e) => setOnboardingForm({ ...onboardingForm, financial_goal: e.target.value as FinanceGoal })} className={inputClassName} style={inputStyle}>
                    {Object.entries(goalLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </Field>
                <Field label="Perfil de risco">
                  <select value={onboardingForm.risk_profile} onChange={(e) => setOnboardingForm({ ...onboardingForm, risk_profile: e.target.value as FinanceRiskProfile })} className={inputClassName} style={inputStyle}>
                    <option value="conservative">Conservador</option>
                    <option value="balanced">Equilibrado</option>
                    <option value="bold">Arrojado</option>
                  </select>
                </Field>
              </div>

              <Field label="Nivel de acompanhamento desejado">
                <div className="grid gap-2 md:grid-cols-3">
                  {[
                    ['simple', 'Quero algo simples'],
                    ['guided', 'Quero orientacao'],
                    ['detailed', 'Quero detalhe total'],
                  ].map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setOnboardingForm({ ...onboardingForm, planning_style: value as FinancePlanningStyle })}
                      className="rounded-2xl px-4 py-3 text-left text-sm font-semibold"
                      style={{
                        border: '1px solid #234c33',
                        background: onboardingForm.planning_style === value ? 'rgba(34,197,94,0.14)' : '#0c1711',
                        color: onboardingForm.planning_style === value ? '#86efac' : '#d1fae5',
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </Field>

              <button
                onClick={submitOnboarding}
                disabled={savingOnboarding}
                className="w-full rounded-2xl py-3 font-bold text-white flex items-center justify-center gap-2"
                style={{ background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))' }}
              >
                {savingOnboarding ? <Loader2 size={18} className="animate-spin" /> : <Target size={18} />}
                {savingOnboarding ? 'Configurando sua base...' : 'Criar meu painel financeiro'}
              </button>
            </div>

            <div className="rounded-3xl p-5 md:p-6 space-y-4" style={{ background: '#112017', border: '1px solid #234c33' }}>
              <h2 className="text-xl font-black text-white">O que entra nesta fase</h2>
              <FeatureItem title="Carteira inicial" description="Cria sua carteira principal com saldo inicial para o caixa comecar coerente." />
              <FeatureItem title="Categorias padrao" description="Entrega categorias essenciais de entrada e saida para nao comecar em branco." />
              <FeatureItem title="Dashboard com contexto" description="Mostra saldo total, entradas, saidas, meta mensal e distribuicao por categoria." />
              <FeatureItem title="Gerenciador de gastos" description="Voce ja consegue registrar lancamentos e ver impacto imediato no caixa." />
              <FeatureItem title="Insights acionaveis" description="As primeiras recomendacoes nascem do objetivo financeiro e da meta de poupanca." />
            </div>
          </section>
        ) : (
          <>
            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <MetricCard title="Saldo total" value={formatCurrency(dashboard?.summary.total_balance || 0)} icon={<Wallet size={20} />} />
              <MetricCard title="Entradas do mes" value={formatCurrency(dashboard?.summary.income_total || 0)} icon={<TrendingUp size={20} />} />
              <MetricCard title="Saidas do mes" value={formatCurrency(dashboard?.summary.expense_total || 0)} icon={<TrendingDown size={20} />} />
              <MetricCard title="Meta mensal" value={formatCurrency(dashboard?.summary.monthly_goal || 0)} icon={<PiggyBank size={20} />} />
            </section>

            <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
              <div className="rounded-3xl p-5 md:p-6 space-y-4" style={{ background: '#112017', border: '1px solid #234c33' }}>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm uppercase font-semibold" style={{ color: '#86efac' }}>Radar financeiro</p>
                    <h2 className="text-xl font-black text-white">Visao rapida do periodo</h2>
                  </div>
                  <div className="text-right">
                    <p className="text-xs" style={{ color: '#86efac' }}>Objetivo atual</p>
                    <p className="text-sm font-bold text-white">{dashboard?.profile ? goalLabel[dashboard.profile.financial_goal] : 'Sem onboarding'}</p>
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-2xl p-4" style={{ background: '#0c1711', border: '1px solid #234c33' }}>
                    <p className="text-xs uppercase font-semibold" style={{ color: '#86efac' }}>Poupanca do mes</p>
                    <p className="text-2xl font-black text-white mt-1">{formatCurrency(dashboard?.summary.savings_now || 0)}</p>
                    <p className="text-sm mt-2" style={{ color: '#bbf7d0' }}>
                      Baseado em entradas e saidas registradas neste mes.
                    </p>
                  </div>

                  <div className="rounded-2xl p-4" style={{ background: '#0c1711', border: '1px solid #234c33' }}>
                    <p className="text-xs uppercase font-semibold" style={{ color: '#86efac' }}>Perfil</p>
                    <p className="text-2xl font-black text-white mt-1">{dashboard?.profile?.risk_profile === 'conservative' ? 'Conservador' : dashboard?.profile?.risk_profile === 'bold' ? 'Arrojado' : 'Equilibrado'}</p>
                    <p className="text-sm mt-2" style={{ color: '#bbf7d0' }}>
                      Acompanhamento {dashboard?.profile?.planning_style === 'detailed' ? 'detalhado' : dashboard?.profile?.planning_style === 'guided' ? 'guiado' : 'simples'}.
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="text-sm font-bold text-white">Distribuicao de gastos</h3>
                  {(dashboard?.expense_breakdown || []).length === 0 ? (
                    <p className="text-sm" style={{ color: '#bbf7d0' }}>Ainda nao ha gastos suficientes para montar o mapa de categorias.</p>
                  ) : (
                    dashboard?.expense_breakdown.map((item) => (
                      <div key={item.category} className="rounded-2xl p-3 flex items-center justify-between gap-3" style={{ background: '#0c1711', border: '1px solid #234c33' }}>
                        <div className="flex items-center gap-3">
                          <span className="w-3 h-3 rounded-full" style={{ background: item.color }} />
                          <span className="text-sm font-semibold text-white">{item.category}</span>
                        </div>
                        <span className="text-sm font-bold" style={{ color: '#86efac' }}>{formatCurrency(item.total)}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="rounded-3xl p-5 md:p-6 space-y-3" style={{ background: '#112017', border: '1px solid #234c33' }}>
                <h2 className="text-xl font-black text-white">Proximos focos sugeridos</h2>
                {(dashboard?.insights || []).map((insight, index) => (
                  <div key={index} className="rounded-2xl p-4 text-sm" style={{ background: '#0c1711', border: '1px solid #234c33', color: '#d1fae5' }}>
                    {insight}
                  </div>
                ))}
                <div className="rounded-2xl p-4 text-sm" style={{ background: 'rgba(16,185,129,0.08)', border: '1px dashed #22c55e', color: '#bbf7d0' }}>
                  Proximas features recomendadas: metas por categoria, lancamentos recorrentes, alertas de caixa baixo e projecao ate o proximo pagamento.
                </div>
              </div>
            </section>

            <section className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
              <div className="rounded-3xl p-5 md:p-6 space-y-4" style={{ background: '#112017', border: '1px solid #234c33' }}>
                <div className="flex items-center gap-2">
                  <BanknoteArrowDown size={18} style={{ color: '#86efac' }} />
                  <h2 className="text-xl font-black text-white">Lancar movimentacao</h2>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <Field label="Tipo">
                    <select value={transactionForm.transaction_type} onChange={(e) => setTransactionForm({ ...transactionForm, transaction_type: e.target.value as FinanceTransactionType })} className={inputClassName} style={inputStyle}>
                      <option value="expense">Saida</option>
                      <option value="income">Entrada</option>
                    </select>
                  </Field>
                  <Field label="Carteira">
                    <select value={transactionForm.wallet} onChange={(e) => setTransactionForm({ ...transactionForm, wallet: e.target.value })} className={inputClassName} style={inputStyle}>
                      {(dashboard?.wallets || []).map((wallet) => <option key={wallet.id} value={wallet.id}>{wallet.name}</option>)}
                    </select>
                  </Field>
                  <Field label="Categoria">
                    <select value={transactionForm.category} onChange={(e) => setTransactionForm({ ...transactionForm, category: e.target.value })} className={inputClassName} style={inputStyle}>
                      {filteredCategories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
                    </select>
                  </Field>
                  <Field label="Valor">
                    <input value={transactionForm.amount} onChange={(e) => setTransactionForm({ ...transactionForm, amount: e.target.value })} className={inputClassName} style={inputStyle} type="number" step="0.01" />
                  </Field>
                </div>

                <Field label="Descricao">
                  <input value={transactionForm.description} onChange={(e) => setTransactionForm({ ...transactionForm, description: e.target.value })} className={inputClassName} style={inputStyle} />
                </Field>

                <Field label="Data">
                  <input value={transactionForm.transaction_date} onChange={(e) => setTransactionForm({ ...transactionForm, transaction_date: e.target.value })} className={inputClassName} style={inputStyle} type="date" />
                </Field>

                <button onClick={submitTransaction} disabled={savingTransaction} className="w-full rounded-2xl py-3 font-bold text-white flex items-center justify-center gap-2" style={{ background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))' }}>
                  {savingTransaction ? <Loader2 size={18} className="animate-spin" /> : <BanknoteArrowUp size={18} />}
                  {savingTransaction ? 'Salvando lancamento...' : 'Adicionar lancamento'}
                </button>
              </div>

              <div className="rounded-3xl p-5 md:p-6 space-y-4" style={{ background: '#112017', border: '1px solid #234c33' }}>
                <div className="flex items-center gap-2">
                  <Landmark size={18} style={{ color: '#86efac' }} />
                  <h2 className="text-xl font-black text-white">Carteiras e caixa</h2>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  {(dashboard?.wallets || []).map((wallet) => (
                    <div key={wallet.id} className="rounded-2xl p-4" style={{ background: '#0c1711', border: '1px solid #234c33' }}>
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p className="text-sm font-bold text-white">{wallet.name}</p>
                          <p className="text-xs" style={{ color: '#86efac' }}>{walletTypeLabel[wallet.wallet_type]}</p>
                        </div>
                        {wallet.is_primary && <span className="text-[11px] font-semibold px-2 py-1 rounded-full" style={{ background: 'rgba(34,197,94,0.15)', color: '#86efac' }}>Principal</span>}
                      </div>
                      <p className="mt-3 text-2xl font-black text-white">{formatCurrency(wallet.current_balance)}</p>
                      <p className="text-xs mt-1" style={{ color: '#bbf7d0' }}>Saldo inicial {formatCurrency(wallet.initial_balance)}</p>
                    </div>
                  ))}
                </div>

                <div className="rounded-2xl p-4 space-y-3" style={{ background: '#0c1711', border: '1px solid #234c33' }}>
                  <p className="text-sm font-bold text-white">Nova carteira</p>
                  <div className="grid gap-3 md:grid-cols-3">
                    <input value={walletForm.name} onChange={(e) => setWalletForm({ ...walletForm, name: e.target.value })} className={inputClassName} style={inputStyle} placeholder="Ex: Reserva" />
                    <select value={walletForm.wallet_type} onChange={(e) => setWalletForm({ ...walletForm, wallet_type: e.target.value as FinanceWalletType })} className={inputClassName} style={inputStyle}>
                      {Object.entries(walletTypeLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                    </select>
                    <input value={walletForm.initial_balance} onChange={(e) => setWalletForm({ ...walletForm, initial_balance: e.target.value })} className={inputClassName} style={inputStyle} type="number" step="0.01" placeholder="Saldo inicial" />
                  </div>
                  <button onClick={submitWallet} disabled={savingWallet} className="rounded-2xl px-4 py-2.5 font-bold text-white inline-flex items-center gap-2" style={{ background: '#166534' }}>
                    {savingWallet ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                    {savingWallet ? 'Criando...' : 'Adicionar carteira'}
                  </button>
                </div>
              </div>
            </section>

            <section className="rounded-3xl p-5 md:p-6 space-y-4" style={{ background: '#112017', border: '1px solid #234c33' }}>
              <h2 className="text-xl font-black text-white">Ultimos lancamentos</h2>
              {(dashboard?.recent_transactions || []).length === 0 ? (
                <p className="text-sm" style={{ color: '#bbf7d0' }}>Sem movimentos recentes. Lance sua primeira entrada ou saida para comecar.</p>
              ) : (
                <div className="space-y-3">
                  {dashboard?.recent_transactions.map((transaction) => (
                    <div key={transaction.id} className="rounded-2xl p-4 flex items-center justify-between gap-3" style={{ background: '#0c1711', border: '1px solid #234c33' }}>
                      <div>
                        <p className="text-sm font-bold text-white">{transaction.description}</p>
                        <p className="text-xs" style={{ color: '#86efac' }}>{transaction.wallet_name} • {transaction.category_name || 'Sem categoria'} • {new Date(transaction.transaction_date).toLocaleDateString('pt-BR')}</p>
                      </div>
                      <span className="text-sm font-black" style={{ color: transaction.transaction_type === 'income' ? '#86efac' : '#fca5a5' }}>
                        {transaction.transaction_type === 'income' ? '+' : '-'} {formatCurrency(transaction.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}

function MetricCard({ title, value, icon }: { title: string; value: string; icon: ReactNode }) {
  return (
    <div className="rounded-3xl p-5" style={{ background: '#112017', border: '1px solid #234c33' }}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold" style={{ color: '#86efac' }}>{title}</p>
        <span style={{ color: '#86efac' }}>{icon}</span>
      </div>
      <p className="mt-4 text-2xl font-black text-white">{value}</p>
    </div>
  );
}

function FeatureItem({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-2xl p-4" style={{ background: '#0c1711', border: '1px solid #234c33' }}>
      <p className="text-sm font-bold text-white">{title}</p>
      <p className="text-sm mt-1" style={{ color: '#bbf7d0' }}>{description}</p>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs uppercase font-semibold tracking-wider" style={{ color: '#86efac' }}>{label}</span>
      {children}
    </label>
  );
}
