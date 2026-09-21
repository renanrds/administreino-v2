import { formatBRL, moneygerTheme as t } from '../theme';
import { useAmountsHidden } from '../privacy';

type Slice = { label: string; value: number; color: string };

function polar(cx: number, cy: number, r: number, angleDeg: number) {
  const a = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
}

function arcPath(cx: number, cy: number, r: number, start: number, end: number) {
  const s = polar(cx, cy, r, end);
  const e = polar(cx, cy, r, start);
  const large = end - start <= 180 ? 0 : 1;
  return `M ${s.x} ${s.y} A ${r} ${r} 0 ${large} 0 ${e.x} ${e.y}`;
}

/** Donut de categorias (SVG puro). */
export function DonutChart({
  slices,
  size = 160,
  thickness = 22,
  centerLabel,
  centerSub,
}: {
  slices: Slice[];
  size?: number;
  thickness?: number;
  centerLabel?: string;
  centerSub?: string;
}) {
  const hidden = useAmountsHidden((s) => s.hidden);
  const total = slices.reduce((s, x) => s + x.value, 0);
  const cx = size / 2;
  const cy = size / 2;
  const r = (size - thickness) / 2 - 2;

  if (total <= 0) {
    return (
      <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
        <svg width={size} height={size}>
          <circle cx={cx} cy={cy} r={r} fill="none" stroke={t.border} strokeWidth={thickness} />
        </svg>
        <p className="absolute text-xs" style={{ color: t.muted }}>Sem dados</p>
      </div>
    );
  }

  let angle = 0;
  const paths = slices
    .filter((s) => s.value > 0)
    .map((s) => {
      const sweep = Math.min((s.value / total) * 360, 359.99);
      const start = angle;
      const end = angle + Math.max(sweep, 0.8);
      angle += (s.value / total) * 360;
      return { ...s, d: arcPath(cx, cy, r, start, end) };
    });

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={t.border} strokeWidth={thickness} />
        {!hidden && paths.map((p) => (
          <path
            key={p.label}
            d={p.d}
            fill="none"
            stroke={p.color}
            strokeWidth={thickness}
            strokeLinecap="butt"
          />
        ))}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center px-4 text-center">
        {centerSub && (
          <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: t.muted }}>
            {centerSub}
          </span>
        )}
        {centerLabel && (
          <span className="text-sm font-black text-white leading-tight">{centerLabel}</span>
        )}
      </div>
    </div>
  );
}

/** Barras horizontais (categorias / orçamentos). */
export function HBarList({
  items,
  max,
}: {
  items: { label: string; value: number; color: string; right?: string }[];
  max?: number;
}) {
  const hidden = useAmountsHidden((s) => s.hidden);
  const peak = max ?? Math.max(...items.map((i) => i.value), 1);
  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item.label}>
          <div className="flex justify-between gap-2 text-xs mb-1">
            <span className="truncate font-medium" style={{ color: t.muted }}>{item.label}</span>
            <span className="font-bold text-white whitespace-nowrap">
              {item.right ?? formatBRL(item.value)}
            </span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: '#0f0f1a' }}>
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: hidden ? '0%' : `${Math.min(100, (item.value / peak) * 100)}%`,
                background: item.color,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Comparativo receitas × despesas. */
export function FlowCompare({
  income,
  expense,
}: {
  income: number;
  expense: number;
}) {
  const hidden = useAmountsHidden((s) => s.hidden);
  const peak = Math.max(income, expense, 1);
  const net = income - expense;
  return (
    <div className="space-y-3">
      <div>
        <div className="flex justify-between text-xs mb-1">
          <span style={{ color: t.income }} className="font-bold">Receitas</span>
          <span className="text-white font-bold">{formatBRL(income)}</span>
        </div>
        <div className="h-3 rounded-full overflow-hidden" style={{ background: '#0f0f1a' }}>
          <div
            className="h-full rounded-full"
            style={{ width: hidden ? '0%' : `${(income / peak) * 100}%`, background: t.income }}
          />
        </div>
      </div>
      <div>
        <div className="flex justify-between text-xs mb-1">
          <span style={{ color: t.expense }} className="font-bold">Despesas</span>
          <span className="text-white font-bold">{formatBRL(expense)}</span>
        </div>
        <div className="h-3 rounded-full overflow-hidden" style={{ background: '#0f0f1a' }}>
          <div
            className="h-full rounded-full"
            style={{ width: hidden ? '0%' : `${(expense / peak) * 100}%`, background: t.expense }}
          />
        </div>
      </div>
      <div
        className="flex items-center justify-between rounded-xl px-3 py-2"
        style={{ background: '#0f0f1a' }}
      >
        <span className="text-xs font-bold" style={{ color: t.muted }}>Resultado do mês</span>
        <span className="text-sm font-black" style={{ color: net >= 0 ? t.income : t.expense }}>
          {net >= 0 ? '+' : ''}{formatBRL(net)}
        </span>
      </div>
    </div>
  );
}

/** Mini barras de saldo por conta. */
export function AccountBars({
  accounts,
}: {
  accounts: { id: number; name: string; balance: number; color: string; liability?: boolean }[];
}) {
  const hidden = useAmountsHidden((s) => s.hidden);
  const assets = accounts.filter((a) => !a.liability);
  const peak = Math.max(...assets.map((a) => Math.abs(a.balance)), 1);
  if (accounts.length === 0) return null;
  return (
    <div className="space-y-2.5">
      {accounts.map((a) => (
        <div key={a.id}>
          <div className="flex justify-between text-xs mb-1 gap-2">
            <span className="truncate" style={{ color: t.muted }}>{a.name}</span>
            <span className="font-bold whitespace-nowrap" style={{ color: a.liability ? t.expense : 'white' }}>
              {a.liability ? `−${formatBRL(a.balance)}` : formatBRL(a.balance)}
            </span>
          </div>
          {!a.liability && (
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: '#0f0f1a' }}>
              <div
                className="h-full rounded-full"
                style={{
                  width: hidden ? '0%' : `${Math.min(100, (Math.abs(a.balance) / peak) * 100)}%`,
                  background: a.color || t.primary,
                }}
              />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
