import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Wallet, ChevronRight, PieChart, ShoppingCart, PlusCircle, Tag, Trash2 } from 'lucide-react';
import { PageHeader, PageShell } from '../components/ui';
import { formatApiError, resetMoneygerData } from '../lib/moneygerApi';
import { moneygerTheme as t } from '../theme';

export default function MoneygerMorePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [confirmText, setConfirmText] = useState('');
  const [wipeOpen, setWipeOpen] = useState(false);

  const wipe = useMutation({
    mutationFn: resetMoneygerData,
    onSuccess: () => {
      setConfirmText('');
      setWipeOpen(false);
      queryClient.invalidateQueries({ queryKey: ['moneyger'] });
      alert('Dados do Moneyger apagados. O vínculo do Telegram foi mantido.');
    },
    onError: (e) => alert(formatApiError(e, 'Não foi possível zerar os dados.')),
  });

  const links = [
    { to: '/moneyger/capture', icon: PlusCircle, title: 'Capturar', sub: 'Texto, PIX, boleto ou comprovante' },
    { to: '/moneyger/budgets?aba=mercado', icon: ShoppingCart, title: 'Modo mercado', sub: 'Lista, baixa e lançamento' },
    { to: '/moneyger/budgets?aba=limites', icon: PieChart, title: 'Limites do mês', sub: 'Teto por categoria' },
    { to: '/moneyger/budgets?aba=categorias', icon: Tag, title: 'Categorias', sub: 'Despesas e receitas' },
    { to: '/moneyger/accounts', icon: Wallet, title: 'Contas e vales', sub: 'Dinheiro, cartão, VA/VR e combustível' },
  ];

  return (
    <PageShell>
      <PageHeader title="Mais" subtitle="Atalhos fora da barra de baixo" />

      <div className="space-y-2">
        {links.map(({ to, icon: Icon, title, sub }) => (
          <button
            key={to}
            type="button"
            onClick={() => navigate(to)}
            className="w-full flex items-center gap-3 p-4 rounded-2xl text-left active:scale-[0.99] transition-transform"
            style={{ background: t.surface, border: `1px solid ${t.border}` }}
          >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: t.primarySoft }}>
              <Icon size={20} style={{ color: t.primary }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-white">{title}</p>
              <p className="text-xs" style={{ color: t.muted }}>{sub}</p>
            </div>
            <ChevronRight size={18} style={{ color: t.muted }} />
          </button>
        ))}

        <button
          type="button"
          onClick={() => setWipeOpen((open) => !open)}
          className="w-full flex items-center gap-3 p-4 rounded-2xl text-left"
          style={{ background: t.surface, border: `1px solid ${t.border}` }}
        >
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(239,68,68,0.12)' }}>
            <Trash2 size={20} style={{ color: t.danger }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-white">Zerar dados</p>
            <p className="text-xs" style={{ color: t.muted }}>Apaga contas, lançamentos e planos. Mantém o Telegram.</p>
          </div>
          <ChevronRight size={18} style={{ color: t.muted }} />
        </button>

        {wipeOpen && (
          <div className="rounded-2xl p-4 space-y-3" style={{ background: '#1a1214', border: '1px solid rgba(239,68,68,0.35)' }}>
            <p className="text-sm text-white">
              Isso apaga todos os registros do Moneyger desta conta. Digite ZERAR para confirmar.
            </p>
            <input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="ZERAR"
              className="w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none"
              style={{ background: '#0f0f1a', border: `1px solid ${t.border}` }}
            />
            <button
              type="button"
              disabled={confirmText.trim().toUpperCase() !== 'ZERAR' || wipe.isPending}
              onClick={() => wipe.mutate()}
              className="w-full py-2.5 rounded-xl font-bold text-white disabled:opacity-40"
              style={{ background: t.danger }}
            >
              {wipe.isPending ? 'Apagando…' : 'Apagar tudo'}
            </button>
          </div>
        )}
      </div>
    </PageShell>
  );
}
