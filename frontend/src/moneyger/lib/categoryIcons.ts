import type { LucideIcon } from 'lucide-react';
import {
  Banknote,
  BookOpen,
  Briefcase,
  Car,
  Circle,
  Coffee,
  Gamepad2,
  Gift,
  Heart,
  Home,
  PawPrint,
  Phone,
  Plane,
  Plus,
  Repeat,
  ShoppingCart,
  Tag,
  TrendingUp,
  Utensils,
  Wrench,
} from 'lucide-react';

/** Mapa slug (backend) → ícone Lucide. */
export const CATEGORY_ICON_MAP: Record<string, LucideIcon> = {
  home: Home,
  'shopping-cart': ShoppingCart,
  utensils: Utensils,
  car: Car,
  heart: Heart,
  'gamepad-2': Gamepad2,
  repeat: Repeat,
  book: BookOpen,
  wrench: Wrench,
  circle: Circle,
  banknote: Banknote,
  briefcase: Briefcase,
  'trending-up': TrendingUp,
  plus: Plus,
  paw: PawPrint,
  plane: Plane,
  gift: Gift,
  phone: Phone,
  coffee: Coffee,
  tag: Tag,
};

/** Ícones disponíveis ao criar categoria. */
export const CATEGORY_ICON_CHOICES = [
  'home',
  'shopping-cart',
  'utensils',
  'car',
  'heart',
  'gamepad-2',
  'repeat',
  'book',
  'wrench',
  'paw',
  'plane',
  'gift',
  'phone',
  'coffee',
  'banknote',
  'briefcase',
  'trending-up',
  'plus',
  'tag',
  'circle',
] as const;

export function resolveCategoryIcon(icon?: string | null): LucideIcon {
  if (icon && CATEGORY_ICON_MAP[icon]) return CATEGORY_ICON_MAP[icon];
  return Tag;
}
