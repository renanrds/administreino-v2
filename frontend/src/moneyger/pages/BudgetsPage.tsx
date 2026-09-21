import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Pencil, PieChart, Plus, ShoppingCart, Tag, Trash2, TrendingDown, TrendingUp, X } from 'lucide-react';
import AddAccordion from '../components/AddAccordion';
import CategoryExhibitor from '../components/CategoryExhibitor';
import MarketModeSection from '../components/MarketModeSection';
import { Chip, PageHeader, PageShell } from '../components/ui';
import {
  createBudget,
  createCategory,
  deleteBudget,
  deleteCategory,
  fetchBudgets,
  fetchCategories,
  formatApiError,
  type MoneyBudget,
  updateBudget,
} from '../lib/moneygerApi';
import { CATEGORY_ICON_CHOICES, resolveCategoryIcon } from '../lib/categoryIcons';
import { useAmountsHidden } from '../privacy';
import { formatBRL, moneygerTheme as t } from '../theme';

type CatTab = 'expense' | 'income' | 'new';
type Aba = 'limites' | 'mercado' | 'categorias';

const ABAS: { id: Aba; label: string; Icon: typeof PieChart }[] = [
  { id: 'limites', label: 'Limites', Icon: PieChart },
  { id: 'mercado', label: 'Mercado', Icon: ShoppingCart },
  { id: 'categorias', label: 'Categorias', Icon: Tag },
];

export default function MoneygerBudgetsPage() {
  const amountsHidden = useAmountsHidden((s) => s.hidden);
  const [searchParams, setSearchParams] = useSearchParams();
  const abaParam = searchParams.get('aba');
  const aba: Aba = abaParam === 'mercado' || abaParam === 'categorias' ? abaParam : 'limites';
  const setAba = (next: Aba) => setSearchParams(next === 'limites' ? {} : { aba: next }, { replace: true });
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const [categoryId, setCategoryId] = useState<number | ''>('');
  const [limit, setLimit] = useState('');
  const [budgetOpen, setBudgetOpen] = useState(false);
  const [catName, setCatName] = useState('');
  const [catKind, setCatKind] = useState<'expense' | 'income'>('expense');
  const [catIcon, setCatIcon] = useState<string>('tag');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editLimit, setEditLimit] = useState('');
  const [catTab, setCatTab] = useState<CatTab>('expense');
  const queryClient = useQueryClient();

  const budgetsQ = useQuery({
    queryKey: ['moneyger', 'budgets', year, month],
    queryFn: () => fetchBudgets(year, month),
  });
  const catsQ = useQuery({
    queryKey: ['moneyger', 'categories'],
    queryFn: fetchCategories,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['moneyger'] });

  const create = useMutation({
    mutationFn: () => createBudget({
      category: Number(categoryId),
      year,
      month,
      limit_amount: limit.replace(',', '.'),
    }),
    onSuccess: () => {
      setLimit('');
      setCategoryId('');
      setBudgetOpen(false);
      invalidate();
    },
    onError: (e) => alert(formatApiError(e, 'Erro ao criar orçamento.')),
  });

  const update = useMutation({
    mutationFn: () => {
      if (editingId == null) throw new Error('Sem orçamento');
      return updateBudget(editingId, { limit_amount: editLimit.replace(',', '.') });
    },
    onSuccess: () => {
      setEditingId(null);
      invalidate();
    },
    onError: (e) => alert(formatApiError(e, 'Erro ao atualizar orçamento.')),
  });

  const removeBudget = useMutation({
    mutationFn: deleteBudget,
    onSuccess: invalidate,
    onError: (e) => alert(formatApiError(e, 'Erro ao excluir orçamento.')),
  });

  const addCategory = useMutation({
    mutationFn: () => createCategory({
      name: catName.trim(),
      kind: catKind,
      icon: catIcon,
      color: catKind === 'expense' ? '#22c55e' : '#4ade80',
    }),
    onSuccess: () => {
      setCatName('');
      setCatIcon('tag');
      setCatTab(catKind);
      invalidate();
    },
    onError: (e) => alert(formatApiError(e, 'Erro ao criar categoria.')),
  });

  const removeCategory = useMutation({
    mutationFn: deleteCategory,
    onSuccess: invalidate,
    onError: (e) => alert(formatApiError(e, 'Erro ao excluir categoria.')),
  });

  const expenseCats = (catsQ.data ?? []).filter((c) => c.kind === 'expense');
  const incomeCats = (catsQ.data ?? []).filter((c) => c.kind === 'income');
  const exhibitorCats = catTab === 'income' ? incomeCats : expenseCats;

  const inputStyle = {
    background: '#0f0f1a',
    border: `1px solid ${t.border}`,
  } as const;

  const startEdit = (b: MoneyBudget) => {
    setEditingId(b.id);
    setEditLimit(String(b.limit_amount));
  };

  return (
    <PageShell>
      <PageHeader
        title="Orçamentos"
        subtitle={
          aba === 'mercado'
            ? 'Lista de compras com limite e baixa'
            : aba === 'categorias'
              ? 'Organize despesas e receitas'
              : `${now.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })} · teto por categoria`
        }
      />

      <div className="flex gap-2 overflow-x-auto pb-1">
        {ABAS.map(({ id, label, Icon }) => (
          <Chip key={id} active={aba === id} icon={Icon} onClick={() => setAba(id)}>
            {label}
          </Chip>
        ))}
      </div>

      {aba === 'mercado' && <MarketModeSection />}

      {aba === 'limites' && (
      <>
      <AddAccordion title="Novo orçamento" open={budgetOpen} onOpenChange={setBudgetOpen}>
        <p className="text-xs font-bold uppercase tracking-wider" style={{ color: t.muted }}>
          Categoria
        </p>
        <CategoryExhibitor
          categories={expenseCats}
          selectedId={categoryId}
          onSelect={setCategoryId}
          emptyLabel="Nenhuma categoria de despesa"
        />
        <input
          value={limit}
          onChange={(e) => setLimit(e.target.value)}
          placeholder="Limite (ex.: 800)"
          className="w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none"
          style={inputStyle}
        />
        <button
          type="button"
          disabled={!categoryId || !limit || create.isPending}
          onClick={() => create.mutate()}
          className="w-full py-2.5 rounded-xl font-bold text-white disabled:opacity-40"
          style={{ background: t.gradient }}
        >
          Definir limite
        </button>
      </AddAccordion>

      <section className="space-y-2">
        <h2 className="text-sm font-bold text-white px-1">Limites do mês</h2>
        {(budgetsQ.data ?? []).length === 0 ? (
          <p className="text-sm px-1" style={{ color: t.muted }}>Nenhum orçamento neste mês.</p>
        ) : (
          (budgetsQ.data ?? []).map((b) => {
            const spent = Number(b.spent || 0);
            const lim = Number(b.limit_amount);
            const pct = lim > 0 ? Math.min(100, (spent / lim) * 100) : 0;
            const isEditing = editingId === b.id;
            const cat = (catsQ.data ?? []).find((c) => c.id === b.category);
            const Icon = resolveCategoryIcon(cat?.icon);
            const color = cat?.color || t.primary;
            return (
              <div
                key={b.id}
                className="rounded-2xl p-4 space-y-2"
                style={{ background: t.surface, border: `1px solid ${t.border}` }}
              >
                {isEditing ? (
                  <>
                    <div className="flex items-center justify-between">
                      <p className="font-bold text-white">{b.category_name}</p>
                      <button type="button" onClick={() => setEditingId(null)} style={{ color: t.muted }}>
                        <X size={16} />
                      </button>
                    </div>
                    <input
                      value={editLimit}
                      onChange={(e) => setEditLimit(e.target.value)}
                      placeholder="Novo limite"
                      className="w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none"
                      style={inputStyle}
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={!editLimit || update.isPending}
                        onClick={() => update.mutate()}
                        className="flex-1 py-2 rounded-xl font-bold text-white flex items-center justify-center gap-2 disabled:opacity-40"
                        style={{ background: t.gradient }}
                      >
                        <Check size={16} /> Salvar
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`Excluir orçamento de ${b.category_name}?`)) {
                            removeBudget.mutate(b.id);
                            setEditingId(null);
                          }
                        }}
                        className="px-4 py-2 rounded-xl"
                        style={{ color: t.danger, background: 'rgba(239,68,68,0.12)' }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center gap-2">
                    <span
                      className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: `${color}22`, color }}
                    >
                      <Icon size={18} />
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between gap-2">
                        <p className="font-bold text-white truncate">{b.category_name}</p>
                        <p className="text-sm text-white font-semibold whitespace-nowrap">
                          {formatBRL(spent)} / {formatBRL(lim)}
                        </p>
                      </div>
                      <div className="h-2.5 rounded-full overflow-hidden mt-2" style={{ background: '#0f0f1a' }}>
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: amountsHidden ? '0%' : `${pct}%`,
                            background: pct >= 100 ? t.danger : color,
                          }}
                        />
                      </div>
                      <p className="text-xs mt-1" style={{ color: t.muted }}>
                        {amountsHidden ? '••••' : `${pct.toFixed(0)}% usado`}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => startEdit(b)}
                      className="p-2 rounded-xl"
                      style={{ color: t.primary, background: t.primarySoft }}
                      aria-label="Editar orçamento"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`Excluir orçamento de ${b.category_name}?`)) {
                          removeBudget.mutate(b.id);
                        }
                      }}
                      className="p-2"
                      style={{ color: t.danger }}
                      aria-label="Excluir orçamento"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </section>
      </>
      )}

      {aba === 'categorias' && (
      <section className="space-y-3">
        <h2 className="text-sm font-bold text-white px-1">Categorias</h2>
        <div className="flex flex-wrap gap-2 px-1">
          {([
            { id: 'expense' as const, label: 'Despesas', Icon: TrendingDown },
            { id: 'income' as const, label: 'Receitas', Icon: TrendingUp },
            { id: 'new' as const, label: 'Nova categoria', Icon: Plus },
          ]).map(({ id, label, Icon }) => (
            <Chip
              key={id}
              active={catTab === id}
              icon={Icon}
              onClick={() => {
                if (id === 'new') {
                  setCatKind(catTab === 'income' ? 'income' : 'expense');
                }
                setCatTab(id);
              }}
            >
              {label}
            </Chip>
          ))}
        </div>

        {catTab === 'new' ? (
          <div className="rounded-2xl p-3 space-y-3" style={{ background: t.surface, border: `1px solid ${t.border}` }}>
            <input
              value={catName}
              onChange={(e) => setCatName(e.target.value)}
              placeholder="Nome (ex.: Pets, Viagem)"
              className="w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none"
              style={inputStyle}
            />
            <select
              value={catKind}
              onChange={(e) => setCatKind(e.target.value as 'expense' | 'income')}
              className="w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none"
              style={inputStyle}
            >
              <option value="expense">Despesa</option>
              <option value="income">Receita</option>
            </select>
            <p className="text-xs font-bold uppercase tracking-wider" style={{ color: t.muted }}>
              Ícone
            </p>
            <div className="grid grid-cols-8 gap-1.5">
              {CATEGORY_ICON_CHOICES.map((slug) => {
                const Icon = resolveCategoryIcon(slug);
                const selected = catIcon === slug;
                return (
                  <button
                    key={slug}
                    type="button"
                    onClick={() => setCatIcon(slug)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center justify-self-center"
                    style={{
                      background: selected ? t.primarySoft : '#0f0f1a',
                      border: `1px solid ${selected ? t.primary : t.border}`,
                      color: selected ? t.primary : t.muted,
                    }}
                    aria-label={slug}
                  >
                    <Icon size={14} />
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              disabled={!catName.trim() || addCategory.isPending}
              onClick={() => addCategory.mutate()}
              className="w-full py-2.5 rounded-xl font-bold text-white disabled:opacity-40"
              style={{ background: t.gradient }}
            >
              Adicionar categoria
            </button>
          </div>
        ) : (
          <div className="rounded-2xl p-3" style={{ background: t.surface, border: `1px solid ${t.border}` }}>
            <CategoryExhibitor
              categories={exhibitorCats}
              onDelete={(c) => {
                if (confirm(`Arquivar categoria "${c.name}"?`)) removeCategory.mutate(c.id);
              }}
              emptyLabel={catTab === 'expense' ? 'Nenhuma despesa' : 'Nenhuma receita'}
            />
          </div>
        )}
      </section>
      )}
    </PageShell>
  );
}
