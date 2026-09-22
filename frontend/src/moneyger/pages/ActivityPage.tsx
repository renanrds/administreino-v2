import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { History, Undo2 } from 'lucide-react';
import { PageHeader, PageShell } from '../components/ui';
import { fetchActivity, formatApiError, undoInstallment, type MoneyActivity } from '../lib/moneygerApi';
import { moneygerTheme as t } from '../theme';

function dayKey(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
}

function timeLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

export default function MoneygerActivityPage() {
  const queryClient = useQueryClient();
  const { data = [], isLoading } = useQuery({
    queryKey: ['moneyger', 'activity'],
    queryFn: fetchActivity,
  });

  const undo = useMutation({
    mutationFn: (entry: MoneyActivity) => undoInstallment(entry.installment_plan as number),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['moneyger'] }),
    onError: (e) => alert(formatApiError(e, 'Não foi possível desfazer.')),
  });

  const grouped = useMemo(() => {
    const map = new Map<string, MoneyActivity[]>();
    for (const entry of data) {
      const key = dayKey(entry.created_at);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(entry);
    }
    return Array.from(map.entries());
  }, [data]);

  return (
    <PageShell>
      <PageHeader title="Histórico" subtitle="Parcelas e trocas de conta" />

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div
            className="w-8 h-8 rounded-full border-2 animate-spin"
            style={{ borderColor: t.primary, borderTopColor: 'transparent' }}
          />
        </div>
      ) : data.length === 0 ? (
        <div className="rounded-2xl p-6 text-center space-y-2" style={{ background: t.surface, border: `1px solid ${t.border}` }}>
          <History size={22} className="mx-auto" style={{ color: t.muted }} />
          <p className="text-sm" style={{ color: t.muted }}>
            Pagar ou marcar uma parcela, desfazer isso e mudar a conta de um lançamento aparecem aqui.
          </p>
        </div>
      ) : (
        grouped.map(([day, items]) => (
          <section key={day} className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-wider px-1" style={{ color: t.muted }}>{day}</p>
            {items.map((entry) => (
              <div
                key={entry.id}
                className="rounded-2xl p-3 flex items-start gap-3"
                style={{ background: t.surface, border: `1px solid ${t.border}` }}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white">{entry.summary}</p>
                  <p className="text-xs mt-0.5" style={{ color: t.muted }}>{timeLabel(entry.created_at)}</p>
                </div>
                {entry.undoable && entry.installment_plan && (
                  <button
                    type="button"
                    disabled={undo.isPending}
                    onClick={() => undo.mutate(entry)}
                    className="px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 shrink-0"
                    style={{ background: '#0f0f1a', color: t.primary, border: `1px solid ${t.border}` }}
                  >
                    <Undo2 size={14} /> Desfazer
                  </button>
                )}
              </div>
            ))}
          </section>
        ))
      )}
    </PageShell>
  );
}
