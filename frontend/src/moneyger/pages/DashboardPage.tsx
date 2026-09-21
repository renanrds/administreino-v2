import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight, CalendarClock, Inbox, PlusCircle, ShoppingCart, Sparkles, Wallet,
} from 'lucide-react';
import { fetchDashboard } from '../lib/moneygerApi';
import { AccountBars, DonutChart, FlowCompare, HBarList } from '../components/charts';
import { LinkBtn, PageShell, SectionCard, SectionTitle } from '../components/ui';
import { formatBRL, moneygerTheme as t } from '../theme';
import { useAmountsHidden } from '../privacy';

export default function MoneygerDashboardPage() {
  const amountsHidden = useAmountsHidden((s) => s.hidden);
  const navigate = useNavigate();
  const now = new Date();
  const monthLabel = now.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  const { data, isLoading } = useQuery({
    queryKey: ['moneyger', 'dashboard', now.getFullYear(), now.getMonth() + 1],
    queryFn: () => fetchDashboard(now.getFullYear(), now.getMonth() + 1),
  });

  const categorySlices = useMemo(() => {
    if (!data?.by_category?.length) return [];
    return data.by_category.slice(0, 6).map((c) => ({
      label: c.name,
      value: Number(c.total),
      color: c.color || t.primary,
    }));
  }, [data]);

  const expenseTotal = Number(data?.month_expense || 0);

  if (isLoading || !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div
          className="w-10 h-10 rounded-full border-2 animate-spin"
          style={{ borderColor: t.primary, borderTopColor: 'transparent' }}
        />
      </div>
    );
  }

  const available = Number(data.available_balance ?? data.total_balance);
  const creditDebt = Number(data.credit_debt || 0);
  const income = Number(data.month_income);
  const expense = Number(data.month_expense);
  const pace = data.insights.pace_vs_prev;

  return (
    <PageShell>
      {/* Hero saldo */}
      <div
        className="rounded-3xl p-5 relative overflow-hidden"
        style={{
          background: 'linear-gradient(145deg, #163528 0%, #1a1a2e 55%, #1a1a2e 100%)',
          border: `1px solid ${t.border}`,
        }}
      >
        <div
          className="pointer-events-none absolute -right-8 -top-10 w-40 h-40 rounded-full opacity-30"
          style={{ background: `radial-gradient(circle, ${t.primary} 0%, transparent 70%)` }}
        />
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold capitalize" style={{ color: t.muted }}>{monthLabel}</p>
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: t.primarySoft }}
          >
            <Wallet size={20} style={{ color: t.primary }} />
          </div>
        </div>
        <p className="text-[11px] font-bold uppercase tracking-wider mt-3" style={{ color: t.muted }}>
          Dinheiro disponível
        </p>
        <p className="text-3xl font-black text-white mt-1 tracking-tight">{formatBRL(available)}</p>
        <div className="grid grid-cols-2 gap-2 mt-4">
          <div className="rounded-xl px-3 py-2" style={{ background: 'rgba(0,0,0,0.25)' }}>
            <p className="text-[10px] font-bold" style={{ color: t.muted }}>Fatura</p>
            <p className="text-sm font-black" style={{ color: creditDebt > 0 ? t.expense : t.muted }}>
              {formatBRL(creditDebt)}
            </p>
          </div>
          <div className="rounded-xl px-3 py-2" style={{ background: 'rgba(0,0,0,0.25)' }}>
            <p className="text-[10px] font-bold" style={{ color: t.muted }}>Líquido</p>
            <p className="text-sm font-black text-white">
              {formatBRL(data.net_worth ?? available - creditDebt)}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {([
          { to: '/moneyger/capture', label: 'Lançar', Icon: PlusCircle },
          { to: '/moneyger/budgets?aba=mercado', label: 'Mercado', Icon: ShoppingCart },
          { to: '/moneyger/accounts', label: 'Contas', Icon: Wallet },
        ] as const).map(({ to, label, Icon }) => (
          <button
            key={to}
            type="button"
            onClick={() => navigate(to)}
            className="rounded-2xl py-3 px-2 flex flex-col items-center gap-1.5"
            style={{ background: t.surface, border: `1px solid ${t.border}` }}
          >
            <Icon size={18} style={{ color: t.primary }} />
            <span className="text-xs font-bold text-white">{label}</span>
          </button>
        ))}
      </div>

      {data.inbox_count > 0 && (
        <button
          type="button"
          onClick={() => navigate('/moneyger/capture')}
          className="w-full flex items-center gap-3 p-3.5 rounded-2xl text-left"
          style={{ background: t.primarySoft, border: `1px solid ${t.primary}` }}
        >
          <Inbox size={20} style={{ color: t.primary }} />
          <div className="flex-1">
            <p className="font-bold text-white text-sm">
              {data.inbox_count} na inbox
            </p>
            <p className="text-xs" style={{ color: t.muted }}>Revisar capturas pendentes</p>
          </div>
          <ArrowRight size={16} style={{ color: t.primary }} />
        </button>
      )}

      {/* Fluxo do mês */}
      <SectionCard>
        <SectionTitle title="Fluxo do mês" />
        <FlowCompare income={income} expense={expense} />
        {pace != null && (
          <p className="text-xs mt-3" style={{ color: t.muted }}>
            Ritmo vs mês anterior:{' '}
            <span className="font-bold" style={{ color: pace > 0 ? t.expense : t.income }}>
              {amountsHidden ? '••••' : `${pace > 0 ? '+' : ''}${pace.toFixed(0)}%`}
            </span>
          </p>
        )}
      </SectionCard>

      {/* Donut + legend */}
      <SectionCard>
        <SectionTitle
          title="Gastos por categoria"
          action={<LinkBtn onClick={() => navigate('/moneyger/transactions')}>Detalhes</LinkBtn>}
        />
        {categorySlices.length === 0 ? (
          <p className="text-sm text-center py-6" style={{ color: t.muted }}>
            Sem despesas categorizadas este mês.
          </p>
        ) : (
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <DonutChart
              slices={categorySlices}
              centerSub="Total"
              centerLabel={formatBRL(expenseTotal)}
            />
            <div className="flex-1 w-full space-y-2">
              {categorySlices.map((s) => (
                <div key={s.label} className="flex items-center gap-2 text-xs">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: s.color }} />
                  <span className="flex-1 truncate" style={{ color: t.muted }}>{s.label}</span>
                  <span className="font-bold text-white">{formatBRL(s.value)}</span>
                  <span style={{ color: t.muted }}>
                    {amountsHidden ? '••••' : (expenseTotal > 0 ? `${Math.round((s.value / expenseTotal) * 100)}%` : '—')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </SectionCard>

      {/* Contas */}
      {data.accounts.length > 0 && (
        <SectionCard>
          <SectionTitle
            title="Contas"
            action={<LinkBtn onClick={() => navigate('/moneyger/accounts')}>Gerenciar</LinkBtn>}
          />
          <AccountBars
            accounts={data.accounts.map((a) => ({
              id: a.id,
              name: a.name,
              balance: Number(a.balance),
              color: a.color,
              liability: a.role === 'liability',
            }))}
          />
        </SectionCard>
      )}

      {/* Orçamentos */}
      {data.budget_progress.length > 0 && (
        <SectionCard>
          <SectionTitle
            title="Orçamentos"
            action={<LinkBtn onClick={() => navigate('/moneyger/budgets?aba=limites')}>Ver todos</LinkBtn>}
          />
          <HBarList
            items={data.budget_progress.slice(0, 4).map((b) => ({
              label: b.category,
              value: Number(b.spent),
              color: b.pct >= 100 ? t.danger : (b.color || t.primary),
              right: `${formatBRL(b.spent)} / ${formatBRL(b.limit)}`,
            }))}
            max={Math.max(...data.budget_progress.slice(0, 4).map((b) => Number(b.limit)), 1)}
          />
        </SectionCard>
      )}

      {/* Insights chips */}
      <SectionCard>
        <SectionTitle
          title="Insights"
          action={<Sparkles size={14} style={{ color: t.primary }} />}
        />
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl p-3" style={{ background: '#0f0f1a' }}>
            <p className="text-[10px] font-bold uppercase" style={{ color: t.muted }}>Média/dia</p>
            <p className="text-sm font-black text-white mt-1">
              {formatBRL(data.insights.avg_daily_expense)}
            </p>
          </div>
          <div className="rounded-xl p-3" style={{ background: '#0f0f1a' }}>
            <p className="text-[10px] font-bold uppercase" style={{ color: t.muted }}>Top categoria</p>
            <p className="text-sm font-black text-white mt-1 truncate">
              {data.insights.top_category || '—'}
            </p>
          </div>
        </div>
      </SectionCard>

      {/* Vencimentos */}
      {data.upcoming.length > 0 && (
        <SectionCard>
          <SectionTitle
            title="Próximos vencimentos"
            action={<CalendarClock size={14} style={{ color: t.muted }} />}
          />
          <div className="space-y-2">
            {data.upcoming.map((u) => (
              <div
                key={`${u.id}-${u.next_due_on}`}
                className="flex justify-between gap-2 py-2 border-b last:border-0"
                style={{ borderColor: t.border }}
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{u.description}</p>
                  <p className="text-xs" style={{ color: t.muted }}>
                    {u.next_due_on.split('-').reverse().join('/')}
                  </p>
                </div>
                <p className="text-sm font-bold" style={{ color: t.expense }}>{formatBRL(u.amount)}</p>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {/* Recentes */}
      <SectionCard>
        <SectionTitle
          title="Recentes"
          action={<LinkBtn onClick={() => navigate('/moneyger/transactions')}>Ver todos</LinkBtn>}
        />
        {data.recent_transactions.length === 0 ? (
          <p className="text-sm" style={{ color: t.muted }}>
            Nenhum lançamento este mês. Use Capturar.
          </p>
        ) : (
          <div className="space-y-0">
            {data.recent_transactions.map((tx) => (
              <div
                key={tx.id}
                className="flex justify-between gap-2 py-2.5 border-b last:border-0"
                style={{ borderColor: t.border }}
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white truncate">
                    {tx.description || tx.category_name || 'Lançamento'}
                  </p>
                  <p className="text-xs" style={{ color: t.muted }}>
                    {tx.occurred_on} · {tx.account_name}
                  </p>
                </div>
                <p
                  className="text-sm font-bold whitespace-nowrap"
                  style={{ color: tx.type === 'income' ? t.income : t.expense }}
                >
                  {tx.type === 'income' ? '+' : '−'}{formatBRL(tx.amount)}
                </p>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </PageShell>
  );
}
