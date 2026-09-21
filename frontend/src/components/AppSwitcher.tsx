import { useNavigate } from 'react-router-dom';
import { Dumbbell, Wallet, X, Check } from 'lucide-react';

type AppSwitcherProps = {
  open: boolean;
  onClose: () => void;
  current: 'administreino' | 'moneyger';
};

export default function AppSwitcher({ open, onClose, current }: AppSwitcherProps) {
  const navigate = useNavigate();
  if (!open) return null;

  const go = (app: 'administreino' | 'moneyger') => {
    onClose();
    if (app === 'moneyger') navigate('/moneyger');
    else navigate('/');
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-3"
      style={{ background: 'rgba(2,6,23,0.75)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl p-4 space-y-3 animate-fade-in"
        style={{ background: '#111827', border: '1px solid #334155' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-1">
          <p className="text-sm font-bold uppercase tracking-wider" style={{ color: '#94a3b8' }}>
            Aplicações
          </p>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg" style={{ color: '#94a3b8' }}>
            <X size={18} />
          </button>
        </div>

        <button
          type="button"
          onClick={() => go('administreino')}
          className="w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all active:scale-[0.99]"
          style={{
            background: current === 'administreino' ? 'rgba(255,138,31,0.12)' : '#0f0f1a',
            border: `1px solid ${current === 'administreino' ? '#ff8a1f' : '#2a2a4a'}`,
          }}
        >
          <div className="w-11 h-11 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #ff8a1f, #ff5a00)' }}>
            <Dumbbell size={22} className="text-white" />
          </div>
          <div className="flex-1">
            <p className="font-black text-white">
              Adminis<span style={{ color: '#ff8a1f' }}>treino</span>
            </p>
            <p className="text-xs" style={{ color: '#94a3b8' }}>Treinos e sessões</p>
          </div>
          {current === 'administreino' && <Check size={18} style={{ color: '#ff8a1f' }} />}
        </button>

        <button
          type="button"
          onClick={() => go('moneyger')}
          className="w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all active:scale-[0.99]"
          style={{
            background: current === 'moneyger' ? 'rgba(34,197,94,0.12)' : '#0f0f1a',
            border: `1px solid ${current === 'moneyger' ? '#22c55e' : '#2a2a4a'}`,
          }}
        >
          <div className="w-11 h-11 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)' }}>
            <Wallet size={22} className="text-white" />
          </div>
          <div className="flex-1">
            <p className="font-black text-white">
              Money<span style={{ color: '#22c55e' }}>ger</span>
            </p>
            <p className="text-xs" style={{ color: '#94a3b8' }}>Controle de finanças</p>
          </div>
          {current === 'moneyger' && <Check size={18} style={{ color: '#22c55e' }} />}
        </button>
      </div>
    </div>
  );
}
