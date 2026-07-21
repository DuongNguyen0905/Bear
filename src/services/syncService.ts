import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';
import { db } from '../utils/db';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isCloudConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

export const supabase: SupabaseClient | null = isCloudConfigured
  ? createClient(SUPABASE_URL as string, SUPABASE_ANON_KEY as string)
  : null;

const TABLE = 'journal_backups';
const AUTO_SYNC_DELAY_MS = 4000;

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error';

let syncTimer: ReturnType<typeof setTimeout> | null = null;
let currentStatus: SyncStatus = 'idle';
const statusListeners = new Set<(status: SyncStatus) => void>();

function setStatus(status: SyncStatus) {
  currentStatus = status;
  statusListeners.forEach((listener) => listener(status));
}

export function getSyncStatus(): SyncStatus {
  return currentStatus;
}

export function onSyncStatusChange(listener: (status: SyncStatus) => void): () => void {
  statusListeners.add(listener);
  return () => statusListeners.delete(listener);
}

export async function signUp(email: string, password: string): Promise<void> {
  if (!supabase) throw new Error('Chưa cấu hình đám mây (thiếu VITE_SUPABASE_URL/ANON_KEY).');
  const { error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
}

export async function signIn(email: string, password: string): Promise<void> {
  if (!supabase) throw new Error('Chưa cấu hình đám mây (thiếu VITE_SUPABASE_URL/ANON_KEY).');
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
}

export async function signOut(): Promise<void> {
  if (!supabase) return;
  await supabase.auth.signOut();
  setStatus('idle');
}

export async function getCurrentUser(): Promise<User | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  return data.user ?? null;
}

async function gatherLocalData() {
  const [memories, transactions, goals, settings] = await Promise.all([
    db.memories.toArray(),
    db.transactions.toArray(),
    db.goals.toArray(),
    db.settings.toArray(),
  ]);
  return { memories, transactions, goals, settings };
}

export async function pushBackup(): Promise<boolean> {
  if (!supabase) return false;
  const user = await getCurrentUser();
  if (!user) return false;

  setStatus('syncing');
  try {
    const data = await gatherLocalData();
    const { error } = await supabase.from(TABLE).upsert({
      user_id: user.id,
      data,
      updated_at: new Date().toISOString(),
    });
    if (error) throw error;
    setStatus('synced');
    return true;
  } catch (err) {
    console.error('Lỗi đồng bộ lên đám mây:', err);
    setStatus('error');
    return false;
  }
}

export async function pullBackup(): Promise<boolean> {
  if (!supabase) return false;
  const user = await getCurrentUser();
  if (!user) return false;

  setStatus('syncing');
  try {
    const { data: row, error } = await supabase
      .from(TABLE)
      .select('data, updated_at')
      .eq('user_id', user.id)
      .maybeSingle();
    if (error) throw error;
    if (!row) {
      setStatus('idle');
      return false;
    }

    const backup = (row as { data: Record<string, any[]> }).data || {};
    const { memories = [], transactions = [], goals = [], settings = [] } = backup;

    await db.transaction('rw', db.memories, db.transactions, db.goals, db.settings, async () => {
      if (memories.length) await db.memories.bulkPut(memories);
      if (transactions.length) await db.transactions.bulkPut(transactions);
      if (goals.length) await db.goals.bulkPut(goals);
      if (settings.length) await db.settings.bulkPut(settings);
    });

    setStatus('synced');
    return true;
  } catch (err) {
    console.error('Lỗi khôi phục từ đám mây:', err);
    setStatus('error');
    return false;
  }
}

// Gọi sau mỗi lần ghi dữ liệu cục bộ; gộp nhiều thay đổi liên tiếp thành một lần đẩy lên.
export function scheduleAutoSync(delayMs: number = AUTO_SYNC_DELAY_MS): void {
  if (!supabase) return;
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(() => {
    pushBackup();
  }, delayMs);
}
