import { useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { moneygerTheme as t } from '../theme';

type Props = {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
  /** Controlled open state (optional). */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

/** Formulário de adição recolhido por padrão. */
export default function AddAccordion({
  title,
  children,
  defaultOpen = false,
  open: controlledOpen,
  onOpenChange,
}: Props) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;

  const toggle = () => {
    const next = !open;
    if (!isControlled) setInternalOpen(next);
    onOpenChange?.(next);
  };

  return (
    <section
      className="rounded-2xl overflow-hidden"
      style={{ background: t.surface, border: `1px solid ${t.border}` }}
    >
      <button
        type="button"
        onClick={toggle}
        className="w-full flex items-center justify-between gap-3 px-4 py-3.5 text-left"
        aria-expanded={open}
      >
        <span className="text-sm font-bold text-white">{title}</span>
        <ChevronDown
          size={18}
          className="shrink-0 transition-transform duration-200"
          style={{
            color: t.muted,
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
          }}
        />
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-3 border-t" style={{ borderColor: t.border }}>
          <div className="pt-3 space-y-3">{children}</div>
        </div>
      )}
    </section>
  );
}
