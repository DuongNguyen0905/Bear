import { db } from './db';
import { scheduleAutoSync } from '../services/syncService';

let wired = false;

// Lắng nghe mọi thay đổi trên Dexie để tự động đẩy backup lên đám mây (debounce).
export function wireAutoSync(): void {
  if (wired) return;
  wired = true;

  const tables = [db.memories, db.transactions, db.goals, db.settings];
  tables.forEach((table) => {
    table.hook('creating', () => scheduleAutoSync());
    table.hook('updating', () => scheduleAutoSync());
    table.hook('deleting', () => scheduleAutoSync());
  });
}
