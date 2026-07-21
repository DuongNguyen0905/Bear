import Dexie, { type EntityTable } from 'dexie';

export interface Photo {
  url: string;
  time: string;
  caption?: string;
}

export interface Emotion {
  time: string;
  emoji: string;
  note?: string;
  isSticker?: boolean;
}

export interface Expense {
  id: string;
  amount: number;
  category: string;
  note: string;
  time: string;
}

export interface Task {
  id: string;
  text: string;
  status: 'empty' | 'todo' | 'half' | 'done';
}

export interface MemoryEntry {
  dateKey: string; // YYYY-MM-DD
  photos: Photo[];
  diary: string;
  emotions: Emotion[];
  expenses: Expense[];
  tasks: Task[];
  createdAt: number;
  updatedAt: number;
}

export interface Goal {
  id: string;
  title: string;
  targetAmount: number;
  currentAmount: number;
  deadline?: string;
  createdAt: number;
  completed?: boolean;
  completedAt?: number;
}

export interface Transaction {
  id: string;
  dateKey: string;
  type: 'income' | 'expense';
  amount: number;
  category: string;
  note?: string;
  createdAt: number;
}

export interface Setting {
  key: string;
  value: any;
}

// Khai báo Database
class LifeDashboardDB extends Dexie {
  memories!: EntityTable<MemoryEntry, 'dateKey'>;
  transactions!: EntityTable<Transaction, 'id'>;
  goals!: EntityTable<Goal, 'id'>;
  settings!: EntityTable<Setting, 'key'>;

  constructor() {
    super('LifeDashboardDB');
    this.version(2).stores({
      memories: 'dateKey, updatedAt', 
      transactions: 'id, dateKey, type, category',
      goals: 'id',
      settings: 'key'
    });
  }
}

export const db = new LifeDashboardDB();
