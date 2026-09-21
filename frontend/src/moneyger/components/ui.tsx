import type { ReactNode } from 'react';
import { moneygerTheme as t } from '../theme';

export function PageShell({ children }: { children: ReactNode }) {
  return <div className="px-4 py-5 space-y-4 animate-fade-in">{children}</div>;
}

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-2xl font-black text-white tracking-tight">{title}</h1>
        {subtitle && (
          <p className="text-sm mt-0.5 capitalize" style={{ color: t.muted }}>
            {subtitle}
          </p>
        )}
      </div>
      {action}
    </div>
  );
}

export function SectionCard({
  children,
  className = '',
  padded = true,
}: {
  children: ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    <section
      className={`rounded-2xl ${padded ? 'p-4' : ''} ${className}`}
      style={{ background: t.surface, border: `1px solid ${t.border}` }}
    >
      {children}
    </section>
  );
}

export function SectionTitle({
  title,
  action,
}: {
  title: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-2 mb-3">
      <h2 className="text-sm font-bold text-white">{title}</h2>
      {action}
    </div>
  );
}

export function Chip({
  active,
  onClick,
  children,
  icon: Icon,
}: {
  active?: boolean;
  onClick?: () => void;
  children: ReactNode;
  icon?: React.ComponentType<{ size?: number; strokeWidth?: number }>;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap"
      style={{
        background: active ? t.primarySoft : t.surface,
        border: `1px solid ${active ? t.primary : t.border}`,
        color: active ? t.primary : t.muted,
      }}
    >
      {Icon && <Icon size={13} strokeWidth={2.4} />}
      {children}
    </button>
  );
}

export function LinkBtn({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button type="button" className="text-xs font-bold" style={{ color: t.primary }} onClick={onClick}>
      {children}
    </button>
  );
}
