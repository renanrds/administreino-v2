export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface User {
  id: number;
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  is_staff?: boolean;
  is_superuser?: boolean;
  plan_type?: 'free' | 'premium';
  is_premium?: boolean;
  max_routines?: number;
  max_ai_generations_per_day?: number;
  has_administreino_access?: boolean;
  has_adminisgrana_access?: boolean;
  avatar?: string;
  bio?: string;
  weight?: number;
  height?: number;
  wellhub_enabled?: boolean;
  gym_app_preference?: 'none' | 'wellhub' | 'totalpass' | 'both';
  gender?: 'male' | 'female' | 'non_binary' | 'other' | 'prefer_not_to_say' | '';
  experience_level?: 'beginner' | 'intermediate' | 'advanced';
  age?: number;
  primary_goal?: string;
  weekly_training_days?: number;
  terms_accepted?: boolean;
}

export interface AuthTokens {
  access: string;
  refresh: string;
  user: User;
}

export type FinanceGoal = 'control_spending' | 'build_reserve' | 'pay_debts' | 'invest_better';

export type FinanceRiskProfile = 'conservative' | 'balanced' | 'bold';

export type FinancePlanningStyle = 'simple' | 'guided' | 'detailed';

export type FinanceWalletType = 'cash' | 'checking' | 'savings' | 'investment';

export type FinanceTransactionType = 'expense' | 'income';

export interface FinancialProfile {
  monthly_income: number;
  monthly_fixed_expenses: number;
  savings_target_percent: number;
  payday_day: number;
  financial_goal: FinanceGoal;
  risk_profile: FinanceRiskProfile;
  planning_style: FinancePlanningStyle;
  onboarding_completed: boolean;
}

export interface FinanceWallet {
  id: number;
  name: string;
  wallet_type: FinanceWalletType;
  initial_balance: number;
  current_balance: number;
  is_primary: boolean;
  include_in_dashboard: boolean;
  created_at: string;
}

export interface FinanceCategory {
  id: number;
  name: string;
  category_type: FinanceTransactionType;
  color: string;
  icon: string;
  is_default: boolean;
}

export interface FinanceTransaction {
  id: number;
  wallet: number;
  wallet_name: string;
  category?: number;
  category_name?: string;
  transaction_type: FinanceTransactionType;
  description: string;
  amount: number;
  transaction_date: string;
  notes?: string;
  created_at: string;
}

export interface FinanceExpenseBreakdownItem {
  category: string;
  color: string;
  total: number;
}

export interface FinanceDashboardSummary {
  total_balance: number;
  income_total: number;
  expense_total: number;
  monthly_goal: number;
  savings_now: number;
}

export interface FinanceDashboardData {
  onboarding_completed: boolean;
  profile: FinancialProfile | null;
  summary: FinanceDashboardSummary;
  wallets: FinanceWallet[];
  recent_transactions: FinanceTransaction[];
  expense_breakdown: FinanceExpenseBreakdownItem[];
  insights: string[];
}

export type MuscleGroup =
  | 'chest' | 'back' | 'shoulders' | 'biceps' | 'triceps'
  | 'legs' | 'glutes' | 'abs' | 'calves' | 'forearms'
  | 'full_body' | 'cardio';

export type WorkoutType =
  | 'strength' | 'hypertrophy' | 'endurance'
  | 'cardio' | 'hiit' | 'flexibility' | 'functional';

export interface Exercise {
  id: number;
  name: string;
  muscle_group: MuscleGroup;
  muscle_group_display: string;
  sets: number;
  reps: number;
  min_reps?: number;
  max_reps?: number;
  reps_display?: string;
  rest_seconds: number;
  weight_kg?: number;
  notes?: string;
  order: number;
  created_at: string;
}

export interface Workout {
  id: number;
  name: string;
  description?: string;
  workout_type: WorkoutType;
  workout_type_display: string;
  is_active: boolean;
  exercises: Exercise[];
  total_exercises: number;
  created_at: string;
  updated_at: string;
}

export type SessionStatus = 'in_progress' | 'completed' | 'cancelled';

export interface ExerciseLog {
  id: number;
  exercise: number;
  exercise_name: string;
  exercise_muscle_group: string;
  set_number: number;
  planned_reps?: number;
  planned_min_reps?: number;
  planned_max_reps?: number;
  reps_done: number;
  weight_kg?: number;
  rest_seconds_taken?: number;
  is_completed: boolean;
  notes?: string;
  logged_at: string;
}

export interface RecommendedWorkout {
  next_workout_id: number | null;
  active_program_name?: string;
  last_workout_name?: string | null;
  reason?: string;
}

export interface WorkoutSession {
  id: number;
  workout: number;
  workout_name: string;
  workout_type: WorkoutType;
  status: SessionStatus;
  status_display: string;
  started_at: string;
  finished_at?: string;
  total_duration_seconds?: number;
  notes?: string;
  exercise_logs: ExerciseLog[];
  completion_percentage: number;
  created_at: string;
}

export interface DashboardStats {
  total_sessions: number;
  sessions_this_week: number;
  sessions_this_month: number;
  avg_duration_seconds: number;
  total_workouts: number;
}

export interface DashboardData {
  active_session: WorkoutSession | null;
  stats: DashboardStats;
  recent_sessions: WorkoutSession[];
  gym_coordinates?: Coordinates;
}

export const MUSCLE_GROUP_LABELS: Record<MuscleGroup, string> = {
  chest: 'Peito',
  back: 'Costas',
  shoulders: 'Ombros',
  biceps: 'Bíceps',
  triceps: 'Tríceps',
  legs: 'Pernas',
  glutes: 'Glúteos',
  abs: 'Abdômen',
  calves: 'Panturrilha',
  forearms: 'Antebraço',
  full_body: 'Corpo Inteiro',
  cardio: 'Cardio',
};

export const WORKOUT_TYPE_LABELS: Record<WorkoutType, string> = {
  strength: 'Força',
  hypertrophy: 'Hipertrofia',
  endurance: 'Resistência',
  cardio: 'Cardio',
  hiit: 'HIIT',
  flexibility: 'Flexibilidade',
  functional: 'Funcional',
};

export const MUSCLE_GROUP_COLORS: Record<MuscleGroup, string> = {
  chest: '#ef4444',
  back: '#3b82f6',
  shoulders: '#ff5a00',
  biceps: '#f59e0b',
  triceps: '#f97316',
  legs: '#10b981',
  glutes: '#ec4899',
  abs: '#06b6d4',
  calves: '#84cc16',
  forearms: '#a78bfa',
  full_body: '#ff8a1f',
  cardio: '#14b8a6',
};
