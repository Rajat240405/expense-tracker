export interface Expense {
  id: string;
  amount: number;
  category: string;
  note?: string;
  date: string; // YYYY-MM-DD
  timestamp: number;
  currency?: string; // 'USD', 'INR', etc.
}

export interface Split {
  id: string;
  personName: string;
  amount: number;
  currency: string;
  category?: string;
  note?: string;
  direction: 'to_receive' | 'to_pay'; // I paid for them / They paid for me
  date: string; // YYYY-MM-DD
  timestamp: number;
  settled: boolean;
}

export interface CustomCurrency {
  code: string;
  symbol: string;
  name: string;
  isCustom: true;
}

export type ViewState = 'landing' | 'workspace';

export type WorkspaceView = 'expenses' | 'groups' | 'visualize';

// ─── App-level mode (top-level footer navigation) ────────────────────────────

export type AppMode = 'home' | 'groups' | 'profile';

// Sub-tabs within Home mode
export type HomeTab = 'personal' | 'splits' | 'analytics';

// ─── Group System ────────────────────────────────────────────────────────────

export interface GroupMember {
  id: string;
  name: string;
  isYou: boolean; // exactly one member per group has isYou=true
}

export interface Group {
  id: string;
  name: string;
  description?: string;
  currency: string;
  members: GroupMember[];
  createdAt: number;
}

// ─── Group Expense System ────────────────────────────────────────────────────

export type SplitType = 'equal' | 'unequal' | 'percentage';

export interface ParticipantShare {
  memberId: string;
  share: number; // resolved amount in the group's currency
}

export interface GroupExpense {
  id: string;
  groupId: string;
  description: string;
  totalAmount: number;
  currency: string;
  paidByMemberId: string;
  splitType: SplitType;
  participants: ParticipantShare[]; // resolved amounts per person
  date: string; // YYYY-MM-DD
  timestamp: number;
  category?: string;
  /** Denormalised from profiles join — available when fetched from Supabase. */
  paidByName?: string;
}

// ─── Settlement System ───────────────────────────────────────────────────────

export interface Settlement {
  id: string;
  groupId: string;
  fromMemberId: string; // who paid
  toMemberId: string;   // who received
  amount: number;
  currency: string;
  note?: string;
  date: string; // YYYY-MM-DD
  timestamp: number;
}

// ─── Balance Engine Output ───────────────────────────────────────────────────

/** Positive = this member is owed money; Negative = this member owes money */
export type NetBalanceMap = Record<string, number>;

/** A single simplified debt: fromMember pays toMember this amount */
export interface DebtInstruction {
  fromMemberId: string;
  toMemberId: string;
  amount: number;
}

// ─── Personal Expenses (Home → Personal tab) ─────────────────────────────────

export interface PersonalExpense {
  id:          string;
  userId:      string;
  amount:      number;
  currency:    string;
  category?:   string;
  description?: string;
  date:        string; // YYYY-MM-DD
  timestamp:   number;
  createdAt:   number;
}

// ─── Direct 1:1 Splits (Home → Splits tab) ───────────────────────────────────

export interface DirectSplit {
  id:        string;
  userOne:   string; // creator (auth.uid())
  userTwo:   string; // partner profile id
  label?:    string;
  currency:  string;
  createdAt: number;
}

export interface DirectExpense {
  id:          string;
  splitId:     string;
  paidBy:      string; // profile id of payer
  amount:      number;
  description?: string;
  category?:   string;
  date:        string;
  timestamp:   number;
  settled:     boolean;
  createdAt:   number;
}
