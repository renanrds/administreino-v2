import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Pencil, Trash2, TrendingDown, TrendingUp, List, X } from 'lucide-react';
import CategoryExhibitor from '../components/CategoryExhibitor';
import { Chip, PageHeader, PageShell } from '../components/ui';
import {
  deleteTransaction,
  fetchCategories,
  fetchTransactions,
  formatApiError,
  type MoneyTransaction,
  updateTransaction,
} from '../lib/moneygerApi';
import { formatBRL, moneygerTheme as t } from '../theme';
import { useAmountsHidden } from '../privacy';

const METHOD_LABEL: Record<string, string> = {
  pix: 'PIX',
  boleto: 'Boleto',
  credit: 'Crédito',
  debit: 'Débito',
  cash: 'Dinheiro',
  meal_voucher: 'VA/VR',
  fuel_voucher: 'Combustível',
  other: 'Outro',
};

export default function MoneygerTransactionsPage() {
  useAmountsHidden((s) => s.hidden);
  const now = new Date();
  const [year] = useState(now.getFullYear());
  const [month] = useState(now.getMonth() + 1);
  const [typeFilter, setTypeFilter] = useState<'all' | 'expense' | 'income'>('all');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editCategoryId, setEditCategoryId] = useState<number | ''>('');
  const queryClient = useQueryClient();

  const { data = [], isLoading } = useQuery({
    queryKey: ['moneyger', 'transactions', year, month],
    queryFn: () => fetchTransactions({ year, month }),
  });

  const catsQ = useQuery({
    queryKey: ['moneyger', 'categories'],
    queryFn: fetchCategories,
  });

  const del = useMutation({
    mutationFn: deleteTransaction,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['moneyger'] }),
    onError: (e) => alert(formatApiError(e, 'Erro ao excluir.')),
  });

  const updateCat = useMutation({
    mutationFn: ({ id, category }: { id: number; category: number | null }) =>
      updateTransaction(id, { category }),
    onSuccess: () => {
      setEditingId(null);
      setEditCategoryId('');
      queryClient.invalidateQueries({ queryKey: ['moneyger'] });
    },
    onError: (e) => alert(formatApiError(e, 'Erro ao atualizar categoria.')),
  });

  const filtered = useMemo(() => {
    if (typeFilter === 'all') return data;
    return data.filter((tx) => tx.type === typeFilter);
  }, [data, typeFilter]);

  const grouped = useMemo(() => {
    const map = new Map<string, typeof filtered>();
    for (const tx of filtered) {
      const key = tx.occurred_on;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(tx);
    }
    return Array.from(map.entries());
  }, [filtered]);

  const monthLabel = now.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  const startEdit = (tx: MoneyTransaction) => {
    setEditingId(tx.id);
    setEditCategoryId(tx.category ?? '');
  };

  const categoriesFor = (tx: MoneyTransaction) => {
    const kind = tx.type === 'income' ? 'income' : 'expense';
    return (catsQ.data ?? []).filter((c) => c.kind === kind);
  };

  return (
    <PageShell>
      <PageHeader title="Lançamentos" subtitle={monthLabel} />

      <div className="flex gap-2">
        <Chip active={typeFilter === 'all'} onClick={() => setTypeFilter('all')} icon={List}>Todos</Chip>
        <Chip active={typeFilter === 'expense'} onClick={() => setTypeFilter('expense')} icon={TrendingDown}>Despesas</Chip>
        <Chip active={typeFilter === 'income'} onClick={() => setTypeFilter('income')} icon={TrendingUp}>Receitas</Chip>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div
            className="w-8 h-8 rounded-full border-2 animate-spin"
            style={{ borderColor: t.primary, borderTopColor: 'transparent' }}
          />
        </div>
      ) : grouped.length === 0 ? (
        <p className="text-sm text-center py-12" style={{ color: t.muted }}>Nenhum lançamento neste mês.</p>
      ) : (
        grouped.map(([day, items]) => (
          <section key={day} className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-wider px-1" style={{ color: t.muted }}>{day}</p>
            {items.map((tx) => {
              const isEditing = editingId === tx.id;
              return (
                <div
                  key={tx.id}
                  className="rounded-2xl p-3 space-y-3"
                  style={{ background: t.surface, border: `1px solid ${t.border}` }}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-white truncate">
                        {tx.description || tx.category_name || 'Lançamento'}
                      </p>
                      <p className="text-xs" style={{ color: t.muted }}>
                        {tx.category_name || 'Sem categoria'} · {METHOD_LABEL[tx.payment_method] || tx.payment_method} · {tx.account_name}
                      </p>
                    </div>
                    <p
                      className="font-bold whitespace-nowrap"
                      style={{ color: tx.type === 'income' ? t.income : t.expense }}
                    >
                      {tx.type === 'income' ? '+' : '−'}{formatBRL(tx.amount)}
                    </p>
                    {!isEditing && (
                      <button
                        type="button"
                        onClick={() => startEdit(tx)}
                        className="p-2"
                        style={{ color: t.muted }}
                        aria-label="Editar categoria"
                      >
                        <Pencil size={16} />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm('Excluir lançamento?')) del.mutate(tx.id);
                      }}
                      className="p-2"
                      style={{ color: t.danger }}
                      aria-label="Excluir"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  {isEditing && (
                    <div className="space-y-2 pt-1" style={{ borderTop: `1px solid ${t.border}` }}>
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-bold uppercase tracking-wider" style={{ color: t.muted }}>
                          Categoria
                        </p>
                        <button type="button" onClick={() => setEditingId(null)} style={{ color: t.muted }}>
                          <X size={16} />
                        </button>
                      </div>
                      <CategoryExhibitor
                        categories={categoriesFor(tx)}
                        selectedId={editCategoryId}
                        onSelect={(id) => setEditCategoryId(id)}
                        emptyLabel="Nenhuma categoria deste tipo"
                        columns={4}
                      />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          disabled={updateCat.isPending}
                          onClick={() => updateCat.mutate({
                            id: tx.id,
                            category: editCategoryId === '' ? null : Number(editCategoryId),
                          })}
                          className="flex-1 py-2 rounded-xl font-bold text-white flex items-center justify-center gap-2 disabled:opacity-40"
                          style={{ background: t.gradient }}
                        >
                          <Check size={16} /> Salvar
                        </button>
                        <button
                          type="button"
                          disabled={updateCat.isPending || editCategoryId === ''}
                          onClick={() => {
                            setEditCategoryId('');
                            updateCat.mutate({ id: tx.id, category: null });
                          }}
                          className="px-3 py-2 rounded-xl text-sm font-semibold disabled:opacity-40"
                          style={{ color: t.muted, border: `1px solid ${t.border}` }}
                        >
                          Limpar
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </section>
        ))
      )}
    </PageShell>
  );
}
