import Dexie, { type EntityTable } from 'dexie';

export interface Photo {
  url: string; // luôn là data URL base64 cục bộ, để xem được cả khi offline
  time: string;
  caption?: string;
  // Bookkeeping riêng cho đồng bộ đám mây: ảnh đã có trên Supabase Storage rồi
  // thì lần đồng bộ sau không cần tải lại, tránh gửi lại hàng chục MB mỗi lần
  // sửa một dòng nhật ký không liên quan (xem syncService.ts).
  synced?: boolean;
  storagePath?: string;
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
  // Gắn với mục tiêu khi giao dịch này là tiền nạp vào một mục tiêu tiết kiệm
  // (xem goalService.fundGoal) — dùng để loại khỏi biểu đồ chi tiêu theo danh
  // mục, và để xóa/hoàn lại đúng khi mục tiêu bị xóa.
  goalId?: string;
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
