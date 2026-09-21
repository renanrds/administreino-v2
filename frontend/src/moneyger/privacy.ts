import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type PrivacyState = {
  hidden: boolean;
  toggle: () => void;
};

export const useAmountsHidden = create<PrivacyState>()(
  persist(
    (set) => ({
      hidden: false,
      toggle: () => set((s) => ({ hidden: !s.hidden })),
    }),
    { name: 'moneyger-hide-amounts' },
  ),
);

export const HIDDEN_AMOUNT = 'R$ ••••';
