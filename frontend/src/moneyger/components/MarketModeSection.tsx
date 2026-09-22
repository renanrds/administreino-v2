import { useMemo, useState, type CSSProperties } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Check, Plus, Play, SquareCheck, Trash2, X,
} from 'lucide-react';
import AddAccordion from './AddAccordion';
import {
  addMarketListItem,
  cancelMarketList,
  checkMarketListItem,
  completeMarketList,
  createMarketList,
  deleteMarketList,
  deleteMarketListItem,
  fetchAccounts,
  fetchMarketLists,
  formatApiError,
  marketListToTransaction,
  startMarketList,
  uncheckMarketListItem,
  type MarketList,
  type MarketListItem,
} from '../lib/moneygerApi';
import { formatBRL, moneygerTheme as t } from '../theme';
import { useAmountsHidden } from '../privacy';

function parseAmount(raw: string): number | null {
  const value = Number(raw.trim().replace(',', '.'));
  if (!raw.trim() || Number.isNaN(value) || value <= 0) return null;
  return value;
}

function checkLineTotal(price: string, qty: string): number | null {
  const unit = parseAmount(price);
  const units = parseAmount(qty || '1');
  if (unit == null || units == null) return null;
  return Math.round(unit * units * 100) / 100;
}

function formatQty(raw: string): string {
  const value = Number(raw);
  if (Number.isNaN(value)) return raw;
  return String(value);
}

function stepQty(current: string, delta: number): string {
  const value = Number(current.trim().replace(',', '.'));
  const base = Number.isNaN(value) || value <= 0 ? 1 : value;
  const next = Math.max(1, Math.round((base + delta) * 1000) / 1000);
  return String(next);
}

const STATUS_LABEL: Record<MarketList['status'], string> = {
  draft: 'Planejando',
  active: 'Em compra',
  completed: 'Concluída',
  cancelled: 'Cancelada',
};

export default function MarketModeSection() {
  const amountsHidden = useAmountsHidden((s) => s.hidden);
  const queryClient = useQueryClient();
  const [openCreate, setOpenCreate] = useState(false);
  const [title, setTitle] = useState('Lista de mercado');
  const [limit, setLimit] = useState('');
  const [draftItems, setDraftItems] = useState<string[]>(['']);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [newItemName, setNewItemName] = useState('');
  const [checkingId, setCheckingId] = useState<number | null>(null);
  const [checkPrice, setCheckPrice] = useState('');
  const [checkQty, setCheckQty] = useState('1');
  const [txAccountId, setTxAccountId] = useState<number | ''>('');

  const listsQ = useQuery({
    queryKey: ['moneyger', 'market-lists'],
    queryFn: () => fetchMarketLists(),
  });
  const accountsQ = useQuery({
    queryKey: ['moneyger', 'accounts'],
    queryFn: fetchAccounts,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['moneyger', 'market-lists'] });
    queryClient.invalidateQueries({ queryKey: ['moneyger'] });
  };

  const lists = listsQ.data ?? [];
  const selected = useMemo(
    () => lists.find((l) => l.id === activeId) ?? lists.find((l) => l.status === 'active') ?? null,
    [lists, activeId],
  );

  const create = useMutation({
    mutationFn: () => {
      const items = draftItems.map((n) => n.trim()).filter(Boolean).map((name) => ({ name }));
      return createMarketList({
        title: title.trim() || 'Lista de mercado',
        limit_amount: limit.replace(',', '.'),
        items_input: items,
      });
    },
    onSuccess: (list) => {
      setOpenCreate(false);
      setTitle('Lista de mercado');
      setLimit('');
      setDraftItems(['']);
      setActiveId(list.id);
      invalidate();
    },
    onError: (e) => alert(formatApiError(e, 'Erro ao criar lista.')),
  });

  const start = useMutation({
    mutationFn: (id: number) => startMarketList(id),
    onSuccess: (list) => {
      setActiveId(list.id);
      invalidate();
    },
    onError: (e) => alert(formatApiError(e, 'Erro ao iniciar compra.')),
  });

  const complete = useMutation({
    mutationFn: (id: number) => completeMarketList(id),
    onSuccess: (list) => {
      setActiveId(list.id);
      invalidate();
    },
    onError: (e) => alert(formatApiError(e, 'Erro ao concluir.')),
  });

  const cancel = useMutation({
    mutationFn: (id: number) => cancelMarketList(id),
    onSuccess: () => {
      setActiveId(null);
      invalidate();
    },
    onError: (e) => alert(formatApiError(e, 'Erro ao cancelar.')),
  });

  const removeList = useMutation({
    mutationFn: deleteMarketList,
    onSuccess: (_, id) => {
      if (activeId === id) setActiveId(null);
      invalidate();
    },
    onError: (e) => alert(formatApiError(e, 'Erro ao excluir lista.')),
  });

  const addItem = useMutation({
    mutationFn: ({ listId, name }: { listId: number; name: string }) =>
      addMarketListItem(listId, { name }),
    onSuccess: () => {
      setNewItemName('');
      invalidate();
    },
    onError: (e) => alert(formatApiError(e, 'Erro ao adicionar item.')),
  });

  const removeItem = useMutation({
    mutationFn: ({ listId, itemId }: { listId: number; itemId: number }) =>
      deleteMarketListItem(listId, itemId),
    onSuccess: invalidate,
    onError: (e) => alert(formatApiError(e, 'Erro ao remover item.')),
  });

  const checkItem = useMutation({
    mutationFn: ({ listId, itemId, price, units }: { listId: number; itemId: number; price: string; units: string }) =>
      checkMarketListItem(listId, itemId, price, units),
    onSuccess: () => {
      setCheckingId(null);
      setCheckPrice('');
      setCheckQty('1');
      invalidate();
    },
    onError: (e) => alert(formatApiError(e, 'Erro ao baixar item.')),
  });

  const uncheckItem = useMutation({
    mutationFn: ({ listId, itemId }: { listId: number; itemId: number }) =>
      uncheckMarketListItem(listId, itemId),
    onSuccess: invalidate,
    onError: (e) => alert(formatApiError(e, 'Erro ao desfazer baixa.')),
  });

  const toTx = useMutation({
    mutationFn: ({ listId, accountId }: { listId: number; accountId: number }) =>
      marketListToTransaction(listId, { account_id: accountId }),
    onSuccess: () => {
      setTxAccountId('');
      invalidate();
      alert('Lançamento criado a partir da lista.');
    },
    onError: (e) => alert(formatApiError(e, 'Erro ao criar lançamento.')),
  });

  const inputStyle = {
    background: '#0f0f1a',
    border: `1px solid ${t.border}`,
  } as const;

  const openLists = lists.filter((l) => l.status === 'draft' || l.status === 'active');
  const pastLists = lists.filter((l) => l.status === 'completed' || l.status === 'cancelled');
  const accounts = accountsQ.data ?? [];

  return (
    <section className="space-y-3">
      <div className="px-1 space-y-1">
        <p className="text-sm" style={{ color: t.muted }}>
          Crie a lista, inicie a compra e baixe cada item com o valor. No fim, vire um lançamento.
        </p>
      </div>

      <AddAccordion title="Nova lista de compras" open={openCreate} onOpenChange={setOpenCreate}>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Título (ex.: Mercado sábado)"
          className="w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none"
          style={inputStyle}
        />
        <input
          value={limit}
          onChange={(e) => setLimit(e.target.value)}
          placeholder="Limite da compra (ex.: 350)"
          className="w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none"
          style={inputStyle}
        />
        <p className="text-xs font-bold uppercase tracking-wider" style={{ color: t.muted }}>
          Itens
        </p>
        <div className="space-y-2">
          {draftItems.map((name, idx) => (
            <div key={idx} className="flex gap-2">
              <input
                value={name}
                onChange={(e) => {
                  const next = [...draftItems];
                  next[idx] = e.target.value;
                  setDraftItems(next);
                }}
                placeholder={`Item ${idx + 1}`}
                className="flex-1 px-3 py-2 rounded-xl text-sm text-white outline-none"
                style={inputStyle}
              />
              {draftItems.length > 1 && (
                <button
                  type="button"
                  onClick={() => setDraftItems(draftItems.filter((_, i) => i !== idx))}
                  className="p-2"
                  style={{ color: t.danger }}
                  aria-label="Remover"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          ))}
          <button
            type="button"
            onClick={() => setDraftItems([...draftItems, ''])}
            className="text-sm font-semibold flex items-center gap-1"
            style={{ color: t.primary }}
          >
            <Plus size={14} /> Item
          </button>
        </div>
        <button
          type="button"
          disabled={!limit || create.isPending}
          onClick={() => create.mutate()}
          className="w-full py-2.5 rounded-xl font-bold text-white disabled:opacity-40"
          style={{ background: t.gradient }}
        >
          Criar lista
        </button>
      </AddAccordion>

      {selected && (selected.status === 'draft' || selected.status === 'active') && (
        <MarketListPanel
          list={selected}
          inputStyle={inputStyle}
          newItemName={newItemName}
          setNewItemName={setNewItemName}
          checkingId={checkingId}
          setCheckingId={setCheckingId}
          checkPrice={checkPrice}
          setCheckPrice={setCheckPrice}
          checkQty={checkQty}
          setCheckQty={setCheckQty}
          onStart={() => start.mutate(selected.id)}
          onComplete={() => {
            if (confirm('Concluir esta compra?')) complete.mutate(selected.id);
          }}
          onCancel={() => {
            if (confirm('Cancelar esta lista?')) cancel.mutate(selected.id);
          }}
          onAddItem={() => {
            const name = newItemName.trim();
            if (!name) return;
            addItem.mutate({ listId: selected.id, name });
          }}
          onRemoveItem={(item) => {
            if (confirm(`Remover "${item.name}"?`)) {
              removeItem.mutate({ listId: selected.id, itemId: item.id });
            }
          }}
          onCheck={(item) => {
            if (!checkPrice.trim()) return;
            checkItem.mutate({
              listId: selected.id,
              itemId: item.id,
              price: checkPrice,
              units: checkQty.trim() || '1',
            });
          }}
          onUncheck={(item) => uncheckItem.mutate({ listId: selected.id, itemId: item.id })}
          starting={start.isPending}
          completing={complete.isPending}
          adding={addItem.isPending}
          checking={checkItem.isPending}
        />
      )}

      {selected && selected.status === 'completed' && (
        <div
          className="rounded-2xl p-4 space-y-3"
          style={{ background: t.surface, border: `1px solid ${t.primary}` }}
        >
          <div className="flex justify-between gap-2">
            <div>
              <p className="font-bold text-white">{selected.title}</p>
              <p className="text-xs" style={{ color: t.muted }}>
                Concluída · {selected.checked_count}/{selected.items_count} itens
              </p>
            </div>
            <p className="text-lg font-bold text-white">{formatBRL(selected.spent_total)}</p>
          </div>
          {selected.resulting_transaction ? (
            <p className="text-sm" style={{ color: t.primary }}>
              Já virou lançamento #{selected.resulting_transaction}.
            </p>
          ) : Number(selected.spent_total) > 0 ? (
            <>
              <p className="text-xs" style={{ color: t.muted }}>
                Escolha a conta (corrente, cartão, VA/VR ou vale combustível) para registrar a despesa.
              </p>
              <select
                value={txAccountId}
                onChange={(e) => setTxAccountId(e.target.value ? Number(e.target.value) : '')}
                className="w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none"
                style={inputStyle}
              >
                <option value="">Conta / cartão / vale…</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                    {a.available != null ? ` · disp. ${formatBRL(a.available)}` : ` · ${formatBRL(a.balance ?? 0)}`}
                  </option>
                ))}
              </select>
              <button
                type="button"
                disabled={!txAccountId || toTx.isPending}
                onClick={() => toTx.mutate({ listId: selected.id, accountId: Number(txAccountId) })}
                className="w-full py-2.5 rounded-xl font-bold text-white disabled:opacity-40"
                style={{ background: t.gradient }}
              >
                Virar lançamento
              </button>
            </>
          ) : (
            <p className="text-sm" style={{ color: t.muted }}>Sem itens baixados — nada a lançar.</p>
          )}
        </div>
      )}

      <div className="space-y-2">
        <h3 className="text-xs font-bold uppercase tracking-wider px-1" style={{ color: t.muted }}>
          Listas
        </h3>
        {openLists.length === 0 && pastLists.length === 0 && (
          <p className="text-sm px-1" style={{ color: t.muted }}>Nenhuma lista ainda.</p>
        )}
        {[...openLists, ...pastLists.slice(0, 5)].map((list) => {
          const spent = Number(list.spent_total || 0);
          const lim = Number(list.limit_amount);
          const pct = lim > 0 ? Math.min(100, (spent / lim) * 100) : 0;
          const isSelected = selected?.id === list.id;
          return (
            <button
              key={list.id}
              type="button"
              onClick={() => setActiveId(list.id === activeId ? null : list.id)}
              className="w-full text-left rounded-2xl p-3 space-y-2"
              style={{
                background: t.surface,
                border: `1px solid ${isSelected ? t.primary : t.border}`,
              }}
            >
              <div className="flex justify-between gap-2 items-start">
                <div className="min-w-0">
                  <p className="font-bold text-white truncate">{list.title}</p>
                  <p className="text-xs" style={{ color: t.muted }}>
                    {STATUS_LABEL[list.status]} · {list.checked_count}/{list.items_count} itens
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold text-white">
                    {formatBRL(spent)} / {formatBRL(lim)}
                  </p>
                  {(list.status === 'draft' || list.status === 'active') && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`Excluir "${list.title}"?`)) removeList.mutate(list.id);
                      }}
                      className="mt-1 p-1"
                      style={{ color: t.danger }}
                      aria-label="Excluir"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
              {(list.status === 'active' || list.status === 'completed') && (
                <div className="h-2 rounded-full overflow-hidden" style={{ background: '#0f0f1a' }}>
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: amountsHidden ? '0%' : `${pct}%`,
                      background: pct >= 100 ? t.danger : t.primary,
                    }}
                  />
                </div>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}

function MarketListPanel({
  list,
  inputStyle,
  newItemName,
  setNewItemName,
  checkingId,
  setCheckingId,
  checkPrice,
  setCheckPrice,
  checkQty,
  setCheckQty,
  onStart,
  onComplete,
  onCancel,
  onAddItem,
  onRemoveItem,
  onCheck,
  onUncheck,
  starting,
  completing,
  adding,
  checking,
}: {
  list: MarketList;
  inputStyle: CSSProperties;
  newItemName: string;
  setNewItemName: (v: string) => void;
  checkingId: number | null;
  setCheckingId: (v: number | null) => void;
  checkPrice: string;
  setCheckPrice: (v: string) => void;
  checkQty: string;
  setCheckQty: (v: string) => void;
  onStart: () => void;
  onComplete: () => void;
  onCancel: () => void;
  onAddItem: () => void;
  onRemoveItem: (item: MarketListItem) => void;
  onCheck: (item: MarketListItem) => void;
  onUncheck: (item: MarketListItem) => void;
  starting: boolean;
  completing: boolean;
  adding: boolean;
  checking: boolean;
}) {
  const amountsHidden = useAmountsHidden((s) => s.hidden);
  const spent = Number(list.spent_total || 0);
  const lim = Number(list.limit_amount);
  const remaining = Number(list.remaining || lim - spent);
  const pct = lim > 0 ? Math.min(100, (spent / lim) * 100) : 0;
  const pending = list.items.filter((i) => !i.is_checked);
  const done = list.items.filter((i) => i.is_checked);

  return (
    <div
      className="rounded-2xl p-4 space-y-3"
      style={{ background: t.surface, border: `1px solid ${t.primary}` }}
    >
      <div className="flex justify-between gap-2 items-start">
        <div>
          <p className="font-bold text-white">{list.title}</p>
          <p className="text-xs" style={{ color: t.muted }}>{STATUS_LABEL[list.status]}</p>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold text-white">{formatBRL(spent)}</p>
          <p className="text-xs" style={{ color: remaining < 0 ? t.danger : t.muted }}>
            resto {formatBRL(remaining)} · limite {formatBRL(lim)}
          </p>
        </div>
      </div>

      <div className="h-2.5 rounded-full overflow-hidden" style={{ background: '#0f0f1a' }}>
        <div
          className="h-full rounded-full transition-all"
          style={{ width: amountsHidden ? '0%' : `${pct}%`, background: pct >= 100 ? t.danger : t.primary }}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {list.status === 'draft' && (
          <button
            type="button"
            disabled={starting || list.items_count === 0}
            onClick={onStart}
            className="flex-1 min-w-[120px] py-2 rounded-xl font-bold text-white flex items-center justify-center gap-2 disabled:opacity-40"
            style={{ background: t.gradient }}
          >
            <Play size={16} /> Iniciar compra
          </button>
        )}
        {list.status === 'active' && (
          <button
            type="button"
            disabled={completing}
            onClick={onComplete}
            className="flex-1 min-w-[120px] py-2 rounded-xl font-bold text-white flex items-center justify-center gap-2 disabled:opacity-40"
            style={{ background: t.gradient }}
          >
            <SquareCheck size={16} /> Concluir
          </button>
        )}
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-2 rounded-xl text-sm font-semibold"
          style={{ color: t.danger, background: 'rgba(239,68,68,0.12)' }}
        >
          Cancelar
        </button>
      </div>

      <div className="flex gap-2">
        <input
          value={newItemName}
          onChange={(e) => setNewItemName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onAddItem();
          }}
          placeholder="Adicionar item…"
          className="flex-1 px-3 py-2 rounded-xl text-sm text-white outline-none"
          style={inputStyle}
        />
        <button
          type="button"
          disabled={!newItemName.trim() || adding}
          onClick={onAddItem}
          className="px-3 py-2 rounded-xl disabled:opacity-40"
          style={{ background: t.primarySoft, color: t.primary }}
          aria-label="Adicionar item"
        >
          <Plus size={18} />
        </button>
      </div>

      {pending.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase" style={{ color: t.muted }}>Pendentes</p>
          {pending.map((item) => (
            <div
              key={item.id}
              className="rounded-xl p-3 space-y-2"
              style={{ background: '#0f0f1a', border: `1px solid ${t.border}` }}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{item.name}</p>
                  {item.quantity ? (
                    <p className="text-xs" style={{ color: t.muted }}>{item.quantity}</p>
                  ) : null}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {list.status === 'active' && (
                    <button
                      type="button"
                      onClick={() => {
                        setCheckingId(checkingId === item.id ? null : item.id);
                        setCheckPrice('');
                        setCheckQty('1');
                      }}
                      className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-white"
                      style={{ background: t.gradient }}
                    >
                      Baixar
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => onRemoveItem(item)}
                    className="p-1.5"
                    style={{ color: t.danger }}
                    aria-label="Remover item"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              {list.status === 'active' && checkingId === item.id && (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <input
                      value={checkPrice}
                      onChange={(e) => setCheckPrice(e.target.value)}
                      placeholder="Valor unitário"
                      autoFocus
                      className="flex-1 px-3 py-2 rounded-xl text-sm text-white outline-none"
                      style={inputStyle}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') onCheck(item);
                      }}
                    />
                    <div className="flex items-center rounded-xl shrink-0" style={inputStyle}>
                      <button
                        type="button"
                        aria-label="Diminuir quantidade"
                        disabled={Number(checkQty.replace(',', '.')) <= 1}
                        onClick={() => setCheckQty(stepQty(checkQty, -1))}
                        className="w-9 h-9 font-black text-lg disabled:opacity-30"
                        style={{ color: t.primary }}
                      >
                        −
                      </button>
                      <input
                        value={checkQty}
                        onChange={(e) => setCheckQty(e.target.value)}
                        inputMode="decimal"
                        aria-label="Quantidade"
                        className="w-8 bg-transparent text-center text-sm font-bold text-white outline-none"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') onCheck(item);
                        }}
                      />
                      <button
                        type="button"
                        aria-label="Aumentar quantidade"
                        onClick={() => setCheckQty(stepQty(checkQty, 1))}
                        className="w-9 h-9 font-black text-lg"
                        style={{ color: t.primary }}
                      >
                        +
                      </button>
                    </div>
                    <button
                      type="button"
                      disabled={!checkPrice.trim() || checking}
                      onClick={() => onCheck(item)}
                      className="px-3 py-2 rounded-xl font-bold text-white disabled:opacity-40"
                      style={{ background: t.gradient }}
                    >
                      <Check size={16} />
                    </button>
                  </div>
                  {checkLineTotal(checkPrice, checkQty) != null && (
                    <p className="text-xs" style={{ color: t.muted }}>
                      Total {formatBRL(checkLineTotal(checkPrice, checkQty) as number)}
                    </p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {done.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase" style={{ color: t.muted }}>Baixados</p>
          {done.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between gap-2 rounded-xl px-3 py-2"
              style={{ background: '#0f0f1a', opacity: 0.9 }}
            >
              <div className="min-w-0">
                <p className="text-sm text-white line-through truncate">{item.name}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-sm font-semibold" style={{ color: t.primary }}>
                  {item.units && Number(item.units) !== 1 && item.unit_price
                    ? `${formatQty(item.units)} × ${formatBRL(item.unit_price)} = ${formatBRL(item.price)}`
                    : formatBRL(item.price)}
                </span>
                {list.status === 'active' && (
                  <button
                    type="button"
                    onClick={() => onUncheck(item)}
                    className="text-xs font-semibold"
                    style={{ color: t.muted }}
                  >
                    Desfazer
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
