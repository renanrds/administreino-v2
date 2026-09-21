import { Trash2 } from 'lucide-react';
import type { MoneyCategory } from '../lib/moneygerApi';
import { resolveCategoryIcon } from '../lib/categoryIcons';
import { moneygerTheme as t } from '../theme';

type Props = {
  categories: MoneyCategory[];
  /** Seleção (ex.: Novo orçamento). */
  selectedId?: number | '';
  onSelect?: (id: number) => void;
  /** Gerenciar: botão de arquivar em cada tile. */
  onDelete?: (category: MoneyCategory) => void;
  emptyLabel?: string;
  columns?: 3 | 4;
};

export default function CategoryExhibitor({
  categories,
  selectedId,
  onSelect,
  onDelete,
  emptyLabel = 'Nenhuma categoria',
  columns = 4,
}: Props) {
  if (categories.length === 0) {
    return (
      <p className="text-sm text-center py-4" style={{ color: t.muted }}>
        {emptyLabel}
      </p>
    );
  }

  const selectable = Boolean(onSelect);
  const gridClass = columns === 3 ? 'grid-cols-3' : 'grid-cols-4';

  return (
    <div className={`grid ${gridClass} gap-2`}>
      {categories.map((c) => {
        const Icon = resolveCategoryIcon(c.icon);
        const color = c.color || t.primary;
        const selected = selectedId === c.id;
        const soft = `${color}22`;

        return (
          <div key={c.id} className="relative">
            <button
              type="button"
              disabled={!selectable}
              onClick={() => onSelect?.(c.id)}
              className="w-full flex flex-col items-center gap-1.5 p-2.5 rounded-2xl text-center transition-opacity disabled:opacity-100"
              style={{
                background: selected ? soft : '#0f0f1a',
                border: `1.5px solid ${selected ? color : t.border}`,
                cursor: selectable ? 'pointer' : 'default',
              }}
              aria-pressed={selectable ? selected : undefined}
              title={c.name}
            >
              <span
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: soft, color }}
              >
                <Icon size={20} strokeWidth={2.2} />
              </span>
              <span className="text-[10px] font-semibold text-white leading-tight line-clamp-2 w-full">
                {c.name}
              </span>
            </button>
            {onDelete && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(c);
                }}
                className="absolute -top-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center"
                style={{ background: '#1a1a2e', border: `1px solid ${t.border}`, color: t.danger }}
                aria-label={`Arquivar ${c.name}`}
              >
                <Trash2 size={11} />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
