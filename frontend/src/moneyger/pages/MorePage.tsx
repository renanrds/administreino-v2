import { useNavigate } from 'react-router-dom';
import { Wallet, ChevronRight, PieChart, ShoppingCart, PlusCircle, Tag } from 'lucide-react';
import { PageHeader, PageShell } from '../components/ui';
import { moneygerTheme as t } from '../theme';

export default function MoneygerMorePage() {
  const navigate = useNavigate();

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
      </div>
    </PageShell>
  );
}
