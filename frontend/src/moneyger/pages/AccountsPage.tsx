import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, CreditCard, FileUp, Pencil, Plus, Trash2, Wallet, X } from 'lucide-react';
import AddAccordion from '../components/AddAccordion';
import { PageHeader, PageShell } from '../components/ui';
import {
  createAccount,
  deleteAccount,
  fetchAccounts,
  fetchInstallments,
  formatApiError,
  importCardStatement,
  payCreditBill,
  type MoneyAccount,
  type MoneyInstallment,
  updateAccount,
} from '../lib/moneygerApi';
import { formatBRL, moneygerTheme as t } from '../theme';
import { useAmountsHidden } from '../privacy';

const ACCOUNT_TYPES = [
  { id: 'checking', label: 'Corrente', group: 'money' as const },
  { id: 'savings', label: 'Poupança', group: 'money' as const },
  { id: 'cash', label: 'Dinheiro', group: 'money' as const },
  { id: 'credit', label: 'Cartão de crédito', group: 'limit' as const },
  { id: 'meal_voucher', label: 'Vale alimentação / refeição', group: 'limit' as const },
  { id: 'fuel_voucher', label: 'Vale combustível / transporte', group: 'limit' as const },
  { id: 'other', label: 'Outro', group: 'money' as const },
] as const;

const typeLabel = (id: string) => ACCOUNT_TYPES.find((x) => x.id === id)?.label ?? id;
const isCredit = (a: MoneyAccount) => a.account_type === 'credit' || a.role === 'liability';
const requiresLimit = (type: string) => type === 'credit';
const isVoucher = (a: MoneyAccount) =>
  a.account_type === 'meal_voucher' || a.account_type === 'fuel_voucher';

type FormState = {
  name: string;
  type: string;
  initial: string;
  limit: string;
  color: string;
};

const emptyForm = (type = 'checking'): FormState => ({
  name: '',
  type,
  initial: type === 'credit' ? '0' : '',
  limit: '',
  color: type === 'credit' ? '#f59e0b' : type.includes('voucher') ? '#38bdf8' : '#22c55e',
});

function formFromAccount(a: MoneyAccount): FormState {
  return {
    name: a.name,
    type: a.account_type,
    initial: a.initial_balance,
    limit: a.limit_amount != null ? String(a.limit_amount) : '',
    color: a.color || (isCredit(a) ? '#f59e0b' : isVoucher(a) ? '#38bdf8' : '#22c55e'),
  };
}

const ACCOUNT_COLORS = [
  '#22c55e', '#14b8a6', '#38bdf8', '#3b82f6', '#6366f1',
  '#a855f7', '#ec4899', '#ef4444', '#f59e0b', '#f97316',
  '#eab308', '#94a3b8',
];

function ColorPicker({ value, onChange }: { value: string; onChange: (color: string) => void }) {
  const current = value.toLowerCase();
  const extras = ACCOUNT_COLORS.some((c) => c.toLowerCase() === current) ? [] : [value];
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-wider" style={{ color: t.muted }}>Cor</p>
      <div className="flex flex-wrap gap-2 mt-2">
        {[...ACCOUNT_COLORS, ...extras].map((c) => {
          const selected = current === c.toLowerCase();
          return (
            <button
              key={c}
              type="button"
              aria-label={`Cor ${c}`}
              aria-pressed={selected}
              onClick={() => onChange(c)}
              className="w-7 h-7 rounded-full"
              style={{
                background: c,
                boxShadow: selected ? `0 0 0 2px #0f0f1a, 0 0 0 4px white` : undefined,
              }}
            />
          );
        })}
      </div>
    </div>
  );
}

function CreditPlans({
  accountId,
  plans,
  importing,
  onFile,
}: {
  accountId: number;
  plans: MoneyInstallment[];
  importing: boolean;
  onFile: (file: File) => void;
}) {
  return (
    <div className="space-y-2 pt-1">
      <p className="text-xs font-bold uppercase tracking-wider" style={{ color: t.muted }}>
        Parcelamentos deste cartão
      </p>
      {plans.length === 0 ? (
        <p className="text-xs" style={{ color: t.muted }}>Nenhum parcelamento mapeado.</p>
      ) : plans.map((p) => (
        <div key={p.id} className="flex items-center justify-between gap-2 text-sm">
          <div className="min-w-0">
            <p className="text-white truncate">{p.description}</p>
            <p className="text-xs" style={{ color: t.muted }}>
              {p.paid_installments}/{p.total_installments} · próxima {p.next_due_on}
            </p>
          </div>
          <p className="font-bold whitespace-nowrap" style={{ color: t.expense }}>{formatBRL(p.installment_amount)}</p>
        </div>
      ))}
      <label
        className="w-full py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer"
        style={{ background: '#0f0f1a', border: `1px solid ${t.border}`, color: t.primary, opacity: importing ? 0.5 : 1 }}
      >
        <FileUp size={14} />
        {importing ? 'Lendo extrato…' : 'Importar extrato CSV'}
        <input
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          disabled={importing}
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = '';
            if (file) onFile(file);
          }}
        />
      </label>
      <p className="text-[11px]" style={{ color: t.muted }}>
        CSV com date, title e amount (ex.: Nubank). Linhas “Parcela N/M” viram parcelamentos já pagos até essa parcela, sem lançamento.
      </p>
      <span className="sr-only">{accountId}</span>
    </div>
  );
}

export default function MoneygerAccountsPage() {
  useAmountsHidden((s) => s.hidden);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<FormState>(emptyForm());
  const [payingId, setPayingId] = useState<number | null>(null);
  const [plansId, setPlansId] = useState<number | null>(null);
  const [payFromId, setPayFromId] = useState<number | ''>('');
  const [payAmount, setPayAmount] = useState('');
  const queryClient = useQueryClient();
  const { data = [], isLoading } = useQuery({ queryKey: ['moneyger', 'accounts'], queryFn: fetchAccounts });
  const plansQ = useQuery({
    queryKey: ['moneyger', 'installments', 'all'],
    queryFn: () => fetchInstallments(),
  });

  const assets = useMemo(() => data.filter((a) => !isCredit(a) && !isVoucher(a)), [data]);
  const cards = useMemo(() => data.filter((a) => isCredit(a)), [data]);
  const vouchers = useMemo(() => data.filter((a) => isVoucher(a)), [data]);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['moneyger'] });

  const importStatement = useMutation({
    mutationFn: ({ accountId, file }: { accountId: number; file: File }) =>
      importCardStatement(accountId, file),
    onSuccess: (result) => {
      invalidate();
      alert(`Extrato lido: ${result.created} parcelamento(s) novo(s), ${result.updated} atualizado(s). Sem lançamentos.`);
    },
    onError: (e) => alert(formatApiError(e, 'Não foi possível ler o extrato.')),
  });

  const create = useMutation({
    mutationFn: () => {
      const limit = form.limit.replace(',', '.');
      const initial = form.initial.replace(',', '.') || (requiresLimit(form.type) && form.type !== 'credit' ? limit : '0');
      return createAccount({
        name: form.name.trim(),
        account_type: form.type,
        initial_balance: initial || '0',
        limit_amount: requiresLimit(form.type) ? limit : null,
        color: form.color,
      });
    },
    onSuccess: () => {
      setForm(emptyForm(form.type));
      setFormOpen(false);
      invalidate();
    },
    onError: (e) => alert(formatApiError(e, 'Erro ao criar conta.')),
  });

  const update = useMutation({
    mutationFn: () => {
      if (editingId == null) throw new Error('Nenhuma conta em edição');
      const limit = editForm.limit.replace(',', '.');
      return updateAccount(editingId, {
        name: editForm.name.trim(),
        account_type: editForm.type,
        initial_balance: editForm.initial.replace(',', '.') || '0',
        limit_amount: requiresLimit(editForm.type) ? limit : null,
        color: editForm.color,
      });
    },
    onSuccess: () => {
      setEditingId(null);
      invalidate();
    },
    onError: (e) => alert(formatApiError(e, 'Erro ao atualizar conta.')),
  });

  const remove = useMutation({
    mutationFn: (id: number) => deleteAccount(id),
    onSuccess: (_, id) => {
      if (editingId === id) setEditingId(null);
      if (payingId === id) setPayingId(null);
      invalidate();
    },
    onError: (e) => alert(formatApiError(e, 'Erro ao excluir conta.')),
  });

  const payBill = useMutation({
    mutationFn: () => {
      if (payingId == null || payFromId === '') throw new Error('Dados incompletos');
      return payCreditBill(payingId, {
        from_account: Number(payFromId),
        amount: payAmount.replace(',', '.'),
        occurred_on: new Date().toISOString().slice(0, 10),
      });
    },
    onSuccess: () => {
      setPayingId(null);
      setPayAmount('');
      invalidate();
    },
    onError: (e) => alert(formatApiError(e, 'Erro ao pagar fatura.')),
  });

  const startEdit = (a: MoneyAccount) => {
    setPayingId(null);
    setEditingId(a.id);
    setEditForm(formFromAccount(a));
  };

  const startPay = (a: MoneyAccount) => {
    setEditingId(null);
    setPayingId(a.id);
    setPayAmount(a.balance && Number(a.balance) > 0 ? a.balance : '');
    setPayFromId(assets[0]?.id ?? '');
  };

  const inputStyle = {
    background: '#0f0f1a',
    border: `1px solid ${t.border}`,
  } as const;

  const creatingCredit = form.type === 'credit';
  const creatingNeedsLimit = requiresLimit(form.type);
  const canCreate =
    !!form.name.trim()
    && (!creatingNeedsLimit || Number(form.limit.replace(',', '.')) > 0);

  const renderAccountCard = (a: MoneyAccount) => {
    const credit = isCredit(a);
    const voucher = isVoucher(a);
    const isEditing = editingId === a.id;
    const isPaying = payingId === a.id;
    const editNeedsLimit = requiresLimit(editForm.type);

    return (
      <div
        key={a.id}
        className="rounded-2xl p-4 space-y-3"
        style={{ background: t.surface, border: `1px solid ${t.border}` }}
      >
        {isEditing ? (
          <>
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-bold uppercase tracking-wider" style={{ color: t.muted }}>
                Editar
              </p>
              <button type="button" onClick={() => setEditingId(null)} className="p-1.5" style={{ color: t.muted }}>
                <X size={16} />
              </button>
            </div>
            <input
              value={editForm.name}
              onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
              className="w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none"
              style={inputStyle}
            />
            <select
              value={editForm.type}
              onChange={(e) => {
                const type = e.target.value;
                setEditForm((f) => ({ ...f, type }));
              }}
              className="w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none"
              style={inputStyle}
            >
              {ACCOUNT_TYPES.map((opt) => (
                <option key={opt.id} value={opt.id}>{opt.label}</option>
              ))}
            </select>
            {editNeedsLimit && (
              <input
                value={editForm.limit}
                onChange={(e) => setEditForm((f) => ({ ...f, limit: e.target.value }))}
                placeholder={editForm.type === 'credit' ? 'Limite do cartão' : 'Limite do vale'}
                className="w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none"
                style={inputStyle}
              />
            )}
            <input
              value={editForm.initial}
              onChange={(e) => setEditForm((f) => ({ ...f, initial: e.target.value }))}
              placeholder={
                editForm.type === 'credit'
                  ? 'Dívida inicial'
                  : editNeedsLimit
                    ? 'Saldo disponível'
                    : 'Saldo inicial'
              }
              className="w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none"
              style={inputStyle}
            />
            <ColorPicker
              value={editForm.color}
              onChange={(color) => setEditForm((f) => ({ ...f, color }))}
            />
            <div className="flex gap-2">
              <button
                type="button"
                disabled={
                  !editForm.name.trim()
                  || update.isPending
                  || (editNeedsLimit && !(Number(editForm.limit.replace(',', '.')) > 0))
                }
                onClick={() => update.mutate()}
                className="flex-1 py-2.5 rounded-xl font-bold text-white flex items-center justify-center gap-2 disabled:opacity-40"
                style={{ background: t.gradient }}
              >
                <Check size={16} /> Salvar
              </button>
              <button
                type="button"
                onClick={() => {
                  if (confirm(`Excluir "${a.name}"?`)) remove.mutate(a.id);
                }}
                className="px-4 py-2.5 rounded-xl"
                style={{ color: t.danger, background: 'rgba(239,68,68,0.12)' }}
              >
                <Trash2 size={16} />
              </button>
            </div>
          </>
        ) : isPaying ? (
          <>
            <div className="flex items-center justify-between">
              <p className="font-bold text-white">Pagar fatura — {a.name}</p>
              <button type="button" onClick={() => setPayingId(null)} style={{ color: t.muted }}>
                <X size={16} />
              </button>
            </div>
            <p className="text-xs" style={{ color: t.muted }}>
              O valor sai da conta de dinheiro e abate o em aberto do cartão (sem contar de novo como despesa).
            </p>
            {assets.length === 0 ? (
              <p className="text-sm" style={{ color: t.danger }}>
                Crie uma conta de dinheiro (ex.: corrente) antes de pagar a fatura.
              </p>
            ) : (
              <>
                <select
                  value={payFromId}
                  onChange={(e) => setPayFromId(e.target.value ? Number(e.target.value) : '')}
                  className="w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none"
                  style={inputStyle}
                >
                  {assets.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} ({formatBRL(acc.balance ?? '0')})
                    </option>
                  ))}
                </select>
                <input
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  placeholder="Valor a pagar"
                  className="w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none"
                  style={inputStyle}
                />
                <button
                  type="button"
                  disabled={!payFromId || !payAmount || payBill.isPending}
                  onClick={() => payBill.mutate()}
                  className="w-full py-2.5 rounded-xl font-bold text-white disabled:opacity-40"
                  style={{ background: t.gradient }}
                >
                  Confirmar pagamento
                </button>
              </>
            )}
          </>
        ) : (
          <div className="flex items-center gap-3">
            <div className="w-3 h-12 rounded-full shrink-0" style={{ background: a.color || t.primary }} />
            <div className="flex-1 min-w-0">
              <p className="font-bold text-white truncate">{a.name}</p>
              <p className="text-xs" style={{ color: t.muted }}>{typeLabel(a.account_type)}</p>
              <p className="text-sm font-semibold mt-0.5" style={{ color: credit ? t.expense : t.income }}>
                {credit ? 'Em aberto ' : 'Saldo '}
                {formatBRL(a.balance ?? a.initial_balance)}
              </p>
              {(credit && a.limit_amount != null) && (
                <p className="text-xs mt-0.5" style={{ color: t.muted }}>
                  Limite {formatBRL(a.limit_amount)}
                  {a.available != null ? ` · disponível ${formatBRL(a.available)}` : ''}
                </p>
              )}
              {(credit && a.installment_commitment) && (
                <p className="text-xs mt-0.5" style={{ color: t.muted }}>
                  Parcelas a vencer {formatBRL(a.installment_commitment)}
                </p>
              )}
              {voucher && (
                <p className="text-xs mt-0.5" style={{ color: t.muted }}>Pré-pago · o saldo cai a cada gasto</p>
              )}
            </div>
            {credit && (
              <button
                type="button"
                onClick={() => {
                  setPayingId(null);
                  setPlansId((id) => (id === a.id ? null : a.id));
                }}
                className="px-2.5 py-1.5 rounded-xl text-xs font-bold"
                style={{ background: plansId === a.id ? t.primary : t.primarySoft, color: plansId === a.id ? '#fff' : t.primary }}
              >
                Parcelas
              </button>
            )}
            {credit && (
              <button
                type="button"
                onClick={() => startPay(a)}
                className="px-2.5 py-1.5 rounded-xl text-xs font-bold"
                style={{ background: t.primarySoft, color: t.primary }}
              >
                Pagar
              </button>
            )}
            <button
              type="button"
              onClick={() => startEdit(a)}
              className="p-2 rounded-xl"
              style={{ color: t.primary, background: t.primarySoft }}
              aria-label={`Editar ${a.name}`}
            >
              <Pencil size={16} />
            </button>
            <button
              type="button"
              onClick={() => {
                if (confirm(`Excluir "${a.name}"?`)) remove.mutate(a.id);
              }}
              className="p-2"
              style={{ color: t.danger }}
              aria-label={`Excluir ${a.name}`}
            >
              <Trash2 size={16} />
            </button>
          </div>
        )}
        {credit && plansId === a.id && !isEditing && !isPaying && (
          <CreditPlans
            accountId={a.id}
            plans={(plansQ.data ?? []).filter((p) => p.account === a.id && p.is_active)}
            importing={importStatement.isPending}
            onFile={(file) => importStatement.mutate({ accountId: a.id, file })}
          />
        )}
      </div>
    );
  };

  return (
    <PageShell>
      <PageHeader
        title="Contas"
        subtitle="Dinheiro, cartões e vales"
      />

      <AddAccordion title="Nova conta" open={formOpen} onOpenChange={setFormOpen}>
        <input
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          placeholder={
            creatingCredit
              ? 'Nome (ex.: Nubank Roxinho)'
              : creatingNeedsLimit
                ? 'Nome (ex.: VR Sodexo)'
                : 'Nome (ex.: Conta geral)'
          }
          className="w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none"
          style={inputStyle}
        />
        <select
          value={form.type}
          onChange={(e) => {
            const type = e.target.value;
            setForm((f) => ({
              ...f,
              type,
              initial: type === 'credit' ? (f.initial || '0') : f.initial,
            }));
          }}
          className="w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none"
          style={inputStyle}
        >
          {ACCOUNT_TYPES.map((opt) => (
            <option key={opt.id} value={opt.id}>{opt.label}</option>
          ))}
        </select>
        {creatingNeedsLimit && (
          <input
            value={form.limit}
            onChange={(e) => setForm((f) => ({ ...f, limit: e.target.value }))}
            placeholder={creatingCredit ? 'Limite a consumir (ex.: 5000)' : 'Limite'}
            className="w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none"
            style={inputStyle}
          />
        )}
        <input
          value={form.initial}
          onChange={(e) => setForm((f) => ({ ...f, initial: e.target.value }))}
          placeholder={
            creatingCredit
              ? 'Dívida inicial (opcional)'
              : form.type === 'meal_voucher' || form.type === 'fuel_voucher'
                ? 'Saldo do vale (ex.: 800)'
                : 'Saldo inicial'
          }
          className="w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none"
          style={inputStyle}
        />
        <ColorPicker value={form.color} onChange={(color) => setForm((f) => ({ ...f, color }))} />
        {creatingCredit && (
          <p className="text-xs" style={{ color: t.muted }}>
            Informe o limite do cartão. Compras não saem da conta geral até pagar a fatura.
          </p>
        )}
        {(form.type === 'meal_voucher' || form.type === 'fuel_voucher') && (
          <p className="text-xs" style={{ color: t.muted }}>
            Vale pré-pago: informe o saldo carregado. Cada gasto diminui esse saldo, sem limite de crédito.
          </p>
        )}
        <button
          type="button"
          disabled={!canCreate || create.isPending}
          onClick={() => create.mutate()}
          className="w-full py-2.5 rounded-xl font-bold text-white flex items-center justify-center gap-2 disabled:opacity-40"
          style={{ background: t.gradient }}
        >
          <Plus size={16} /> Adicionar
        </button>
      </AddAccordion>

      {isLoading ? (
        <p className="text-sm text-center py-8" style={{ color: t.muted }}>Carregando…</p>
      ) : (
        <>
          <section className="space-y-2">
            <div className="flex items-center gap-2 px-1">
              <Wallet size={16} style={{ color: t.primary }} />
              <h2 className="text-sm font-bold text-white">Dinheiro</h2>
            </div>
            {assets.length === 0 ? (
              <p className="text-sm px-1" style={{ color: t.muted }}>
                Nenhuma conta de dinheiro. Crie sua conta geral (corrente).
              </p>
            ) : (
              assets.map(renderAccountCard)
            )}
          </section>

          <section className="space-y-2">
            <div className="flex items-center gap-2 px-1">
              <CreditCard size={16} style={{ color: '#f59e0b' }} />
              <h2 className="text-sm font-bold text-white">Cartões de crédito</h2>
            </div>
            {cards.length === 0 ? (
              <p className="text-sm px-1" style={{ color: t.muted }}>
                Cadastre o cartão com o limite a consumir.
              </p>
            ) : (
              cards.map(renderAccountCard)
            )}
          </section>

          <section className="space-y-2">
            <div className="flex items-center gap-2 px-1">
              <CreditCard size={16} style={{ color: '#38bdf8' }} />
              <h2 className="text-sm font-bold text-white">Vales pré-pagos</h2>
            </div>
            {vouchers.length === 0 ? (
              <p className="text-sm px-1" style={{ color: t.muted }}>
                VA/VR e combustível funcionam como cartão pré-pago: você informa o saldo, não um limite.
              </p>
            ) : (
              vouchers.map(renderAccountCard)
            )}
          </section>
        </>
      )}
    </PageShell>
  );
}
