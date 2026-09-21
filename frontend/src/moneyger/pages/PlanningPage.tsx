import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, CheckCircle2, Repeat, ShoppingBag, Zap } from 'lucide-react';
import AddAccordion from '../components/AddAccordion';
import { Chip, PageHeader, PageShell } from '../components/ui';
import {
  createInstallment,
  createRecurring,
  createTransaction,
  deleteInstallment,
  deleteRecurring,
  fetchAccounts,
  fetchCategories,
  fetchInstallments,
  fetchRecurring,
  formatApiError,
  payInstallment,
} from '../lib/moneygerApi';
import { formatBRL, moneygerTheme as t } from '../theme';
import { useAmountsHidden } from '../privacy';

type Tab = 'fixed' | 'variable' | 'installments';

const METHODS = [
  { id: 'pix', label: 'PIX' },
  { id: 'boleto', label: 'Boleto' },
  { id: 'credit', label: 'Crédito' },
  { id: 'debit', label: 'Débito' },
  { id: 'cash', label: 'Dinheiro' },
  { id: 'meal_voucher', label: 'VA / VR' },
  { id: 'fuel_voucher', label: 'Vale combustível' },
  { id: 'other', label: 'Outro' },
];

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export default function MoneygerPlanningPage() {
  useAmountsHidden((s) => s.hidden);
  const [tab, setTab] = useState<Tab>('fixed');
  const [formOpen, setFormOpen] = useState(false);
  const queryClient = useQueryClient();

  const accountsQ = useQuery({ queryKey: ['moneyger', 'accounts'], queryFn: fetchAccounts });
  const catsQ = useQuery({ queryKey: ['moneyger', 'categories'], queryFn: fetchCategories });
  const recurringQ = useQuery({ queryKey: ['moneyger', 'recurring'], queryFn: fetchRecurring });
  const installmentsQ = useQuery({
    queryKey: ['moneyger', 'installments'],
    queryFn: () => fetchInstallments(true),
  });

  const accounts = accountsQ.data ?? [];
  const expenseCats = useMemo(
    () => (catsQ.data ?? []).filter((c) => c.kind === 'expense'),
    [catsQ.data],
  );

  const [accountId, setAccountId] = useState<number | ''>('');
  const [categoryId, setCategoryId] = useState<number | ''>('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('pix');
  const [dueOn, setDueOn] = useState(todayISO());
  const [frequency, setFrequency] = useState('monthly');
  const [installments, setInstallments] = useState('12');
  const [installmentAmount, setInstallmentAmount] = useState('');

  useEffect(() => {
    if (accounts.length && accountId === '') setAccountId(accounts[0].id);
  }, [accounts, accountId]);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['moneyger'] });

  const resetForm = () => {
    setDescription('');
    setAmount('');
    setInstallmentAmount('');
    setDueOn(todayISO());
    setInstallments('12');
  };

  const createFixed = useMutation({
    mutationFn: () => createRecurring({
      account: Number(accountId),
      category: categoryId ? Number(categoryId) : null,
      type: 'expense',
      nature: 'fixed',
      amount: amount.replace(',', '.'),
      description: description.trim(),
      frequency,
      next_due_on: dueOn,
      payment_method: method,
    }),
    onSuccess: () => { resetForm(); setFormOpen(false); invalidate(); },
    onError: (e) => alert(formatApiError(e, 'Erro ao salvar despesa fixa.')),
  });

  const createVariable = useMutation({
    mutationFn: () => createTransaction({
      account: Number(accountId),
      category: categoryId ? Number(categoryId) : null,
      type: 'expense',
      amount: amount.replace(',', '.'),
      description: description.trim(),
      occurred_on: dueOn,
      payment_method: method,
      status: 'confirmed',
      source: 'manual',
    }),
    onSuccess: () => { resetForm(); setFormOpen(false); invalidate(); },
    onError: (e) => alert(formatApiError(e, 'Erro ao salvar despesa variável.')),
  });

  const createPlan = useMutation({
    mutationFn: () => {
      const n = Math.max(1, Number(installments) || 1);
      const parcel = installmentAmount.replace(',', '.') || amount.replace(',', '.');
      const total = amount.replace(',', '.')
        || String((Number(parcel) * n).toFixed(2));
      return createInstallment({
        account: Number(accountId),
        category: categoryId ? Number(categoryId) : null,
        description: description.trim(),
        total_amount: total,
        installment_amount: parcel,
        total_installments: n,
        start_on: dueOn,
        next_due_on: dueOn,
        payment_method: method,
      });
    },
    onSuccess: () => { resetForm(); setFormOpen(false); invalidate(); },
    onError: (e) => alert(formatApiError(e, 'Erro ao salvar parcelamento.')),
  });

  const delFixed = useMutation({
    mutationFn: deleteRecurring,
    onSuccess: invalidate,
  });
  const delPlan = useMutation({
    mutationFn: deleteInstallment,
    onSuccess: invalidate,
  });
  const payPlan = useMutation({
    mutationFn: payInstallment,
    onSuccess: invalidate,
    onError: (e) => alert(formatApiError(e, 'Erro ao registrar parcela.')),
  });

  const canSubmit = Boolean(accountId && description.trim() && (amount || installmentAmount));

  const submit = () => {
    if (!canSubmit) return;
    if (tab === 'fixed') createFixed.mutate();
    else if (tab === 'variable') createVariable.mutate();
    else createPlan.mutate();
  };

  const tabs: { id: Tab; label: string; icon: typeof Repeat }[] = [
    { id: 'fixed', label: 'Fixas', icon: Repeat },
    { id: 'variable', label: 'Variáveis', icon: Zap },
    { id: 'installments', label: 'Parceladas', icon: ShoppingBag },
  ];

  return (
    <PageShell>
      <PageHeader
        title="Planejamento"
        subtitle="Fixas, variáveis e compras parceladas"
      />

      <div className="flex gap-2 overflow-x-auto pb-1">
        {tabs.map(({ id, label, icon: Icon }) => (
          <Chip
            key={id}
            active={tab === id}
            icon={Icon}
            onClick={() => {
              setTab(id);
              setFormOpen(false);
            }}
          >
            {label}
          </Chip>
        ))}
      </div>

      {(accounts.length === 0) && (
        <div className="rounded-2xl p-3 text-sm" style={{ background: 'rgba(245,158,11,0.12)', color: '#fbbf24', border: '1px solid #f59e0b' }}>
          Crie uma conta em Mais → Contas antes de cadastrar.
        </div>
      )}

      <AddAccordion
        title={
          tab === 'fixed' ? 'Nova despesa fixa'
            : tab === 'variable' ? 'Nova despesa variável'
              : 'Nova compra parcelada'
        }
        open={formOpen}
        onOpenChange={setFormOpen}
      >
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={
            tab === 'fixed' ? 'Ex.: Aluguel, Netflix, Academia'
              : tab === 'variable' ? 'Ex.: Mercado, Uber, Farmácia'
                : 'Ex.: Notebook, Sofá, Curso'
          }
          className="w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none"
          style={{ background: '#0f0f1a', border: `1px solid ${t.border}` }}
        />

        <div className="grid grid-cols-2 gap-2">
          <select value={accountId} onChange={(e) => setAccountId(e.target.value ? Number(e.target.value) : '')}
            className="px-3 py-2.5 rounded-xl text-sm text-white outline-none"
            style={{ background: '#0f0f1a', border: `1px solid ${t.border}` }}>
            {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
          <select value={categoryId} onChange={(e) => setCategoryId(e.target.value ? Number(e.target.value) : '')}
            className="px-3 py-2.5 rounded-xl text-sm text-white outline-none"
            style={{ background: '#0f0f1a', border: `1px solid ${t.border}` }}>
            <option value="">Categoria</option>
            {expenseCats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        {tab === 'installments' ? (
          <div className="grid grid-cols-3 gap-2">
            <input value={installments} onChange={(e) => setInstallments(e.target.value)}
              placeholder="Nº parcelas" inputMode="numeric"
              className="px-3 py-2.5 rounded-xl text-sm text-white outline-none"
              style={{ background: '#0f0f1a', border: `1px solid ${t.border}` }} />
            <input value={installmentAmount} onChange={(e) => setInstallmentAmount(e.target.value)}
              placeholder="Valor parcela"
              className="px-3 py-2.5 rounded-xl text-sm text-white outline-none"
              style={{ background: '#0f0f1a', border: `1px solid ${t.border}` }} />
            <input value={amount} onChange={(e) => setAmount(e.target.value)}
              placeholder="Total (opc.)"
              className="px-3 py-2.5 rounded-xl text-sm text-white outline-none"
              style={{ background: '#0f0f1a', border: `1px solid ${t.border}` }} />
          </div>
        ) : (
          <input value={amount} onChange={(e) => setAmount(e.target.value)}
            placeholder="Valor (ex.: 1500,00)"
            className="w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none"
            style={{ background: '#0f0f1a', border: `1px solid ${t.border}` }} />
        )}

        <div className="grid grid-cols-2 gap-2">
          <input type="date" value={dueOn} onChange={(e) => setDueOn(e.target.value)}
            className="px-3 py-2.5 rounded-xl text-sm text-white outline-none"
            style={{ background: '#0f0f1a', border: `1px solid ${t.border}`, colorScheme: 'dark' }} />
          <select value={method} onChange={(e) => setMethod(e.target.value)}
            className="px-3 py-2.5 rounded-xl text-sm text-white outline-none"
            style={{ background: '#0f0f1a', border: `1px solid ${t.border}` }}>
            {METHODS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
          </select>
        </div>

        {tab === 'fixed' && (
          <select value={frequency} onChange={(e) => setFrequency(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none"
            style={{ background: '#0f0f1a', border: `1px solid ${t.border}` }}>
            <option value="monthly">Mensal</option>
            <option value="weekly">Semanal</option>
            <option value="yearly">Anual</option>
          </select>
        )}

        <button type="button" disabled={!canSubmit || createFixed.isPending || createVariable.isPending || createPlan.isPending}
          onClick={submit}
          className="w-full py-2.5 rounded-xl font-bold text-white flex items-center justify-center gap-2 disabled:opacity-40"
          style={{ background: t.gradient }}>
          <Plus size={16} /> Cadastrar
        </button>
      </AddAccordion>

      {tab === 'fixed' && (
        <section className="space-y-2">
          <h2 className="text-sm font-bold text-white">Suas fixas</h2>
          {(recurringQ.data ?? []).length === 0 ? (
            <p className="text-sm" style={{ color: t.muted }}>Nenhuma despesa fixa ainda.</p>
          ) : (recurringQ.data ?? []).map((r) => (
            <div key={r.id} className="rounded-2xl p-3 flex items-center gap-3"
              style={{ background: t.surface, border: `1px solid ${t.border}` }}>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-white truncate">{r.description}</p>
                <p className="text-xs" style={{ color: t.muted }}>
                  {r.frequency === 'monthly' ? 'Mensal' : r.frequency === 'weekly' ? 'Semanal' : 'Anual'}
                  {' · '}vence {r.next_due_on}
                  {r.category_name ? ` · ${r.category_name}` : ''}
                </p>
              </div>
              <p className="font-bold whitespace-nowrap" style={{ color: t.expense }}>{formatBRL(r.amount)}</p>
              <button type="button" onClick={() => { if (confirm('Arquivar esta fixa?')) delFixed.mutate(r.id); }}
                className="p-2" style={{ color: t.danger }}>
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </section>
      )}

      {tab === 'variable' && (
        <section className="rounded-2xl p-4 space-y-2" style={{ background: t.surface, border: `1px solid ${t.border}` }}>
          <p className="text-sm font-bold text-white">Despesas variáveis</p>
          <p className="text-xs leading-relaxed" style={{ color: t.muted }}>
            São gastos do dia a dia (mercado, transporte, lazer). Ao cadastrar acima, entram nos
            <span className="text-white"> Lançamentos</span> do mês. Use também Capturar para PIX/boleto rápido.
          </p>
        </section>
      )}

      {tab === 'installments' && (
        <section className="space-y-2">
          <h2 className="text-sm font-bold text-white">Parcelamentos ativos</h2>
          {(installmentsQ.data ?? []).length === 0 ? (
            <p className="text-sm" style={{ color: t.muted }}>Nenhuma compra parcelada ativa.</p>
          ) : (installmentsQ.data ?? []).map((p) => {
            const pct = (p.paid_installments / p.total_installments) * 100;
            return (
              <div key={p.id} className="rounded-2xl p-3 space-y-2"
                style={{ background: t.surface, border: `1px solid ${t.border}` }}>
                <div className="flex items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-white truncate">{p.description}</p>
                    <p className="text-xs" style={{ color: t.muted }}>
                      {p.paid_installments}/{p.total_installments} pagas · próxima {p.next_due_on}
                      {p.category_name ? ` · ${p.category_name}` : ''}
                    </p>
                  </div>
                  <p className="font-bold text-sm whitespace-nowrap" style={{ color: t.expense }}>
                    {formatBRL(p.installment_amount)}
                  </p>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ background: '#0f0f1a' }}>
                  <div className="h-full rounded-full" style={{ width: `${pct}%`, background: t.primary }} />
                </div>
                <div className="flex gap-2">
                  <button type="button" disabled={payPlan.isPending}
                    onClick={() => payPlan.mutate(p.id)}
                    className="flex-1 py-2 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-1"
                    style={{ background: t.gradient }}>
                    <CheckCircle2 size={14} /> Pagar parcela
                  </button>
                  <button type="button"
                    onClick={() => { if (confirm('Arquivar parcelamento?')) delPlan.mutate(p.id); }}
                    className="px-3 py-2 rounded-xl text-xs font-bold"
                    style={{ background: '#0f0f1a', color: t.danger, border: `1px solid ${t.border}` }}>
                    <Trash2 size={14} />
                  </button>
                </div>
                <p className="text-[11px]" style={{ color: t.muted }}>
                  Total {formatBRL(p.total_amount)} · restam {p.remaining_installments}
                </p>
              </div>
            );
          })}
        </section>
      )}
    </PageShell>
  );
}
