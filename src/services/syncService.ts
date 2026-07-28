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

export async function signUp(email: string, password: string): Promise<{ hasSession: boolean }> {
  if (!supabase) throw new Error('Chưa cấu hình đám mây (thiếu VITE_SUPABASE_URL/ANON_KEY).');
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) {
    // Supabase trả lỗi tiếng Anh "User already registered" — dịch lại và gợi ý luôn hướng xử lý
    // vì đây là lỗi thường gặp nhất (bấm nhầm Đăng Ký khi email đã có tài khoản).
    if (/already registered/i.test(error.message)) {
      throw new Error('Email này đã được đăng ký trước đó — hãy bấm "Đăng Nhập" thay vì "Đăng Ký".');
    }
    throw error;
  }
  // Nếu project tắt "Confirm email", Supabase trả về session ngay, không cần xác nhận gì thêm.
  return { hasSession: !!data.session };
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

// Trang web (GitHub Pages) dùng làm điểm quay lại khi người dùng bấm link đặt
// lại mật khẩu trong email — APK không có domain https riêng để mở link đó
// ngay trong app, nên link luôn mở ra bản web, người dùng đặt mật khẩu mới ở đó.
const RESET_PASSWORD_REDIRECT_URL = 'https://duongnguyen0905.github.io/Bear/';

export async function requestPasswordReset(email: string): Promise<void> {
  if (!supabase) throw new Error('Chưa cấu hình đám mây (thiếu VITE_SUPABASE_URL/ANON_KEY).');
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: RESET_PASSWORD_REDIRECT_URL,
  });
  if (error) throw error;
}

export async function updatePassword(newPassword: string): Promise<void> {
  if (!supabase) throw new Error('Chưa cấu hình đám mây (thiếu VITE_SUPABASE_URL/ANON_KEY).');
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
}

// Khi người dùng bấm link đặt lại mật khẩu trong email, Supabase tự nhận diện
// session khôi phục từ URL và phát ra sự kiện này — dùng để hiện form đặt mật
// khẩu mới thay vì màn hình đăng nhập bình thường.
const recoveryListeners = new Set<() => void>();

export function onPasswordRecovery(listener: () => void): () => void {
  recoveryListeners.add(listener);
  return () => recoveryListeners.delete(listener);
}

if (supabase) {
  supabase.auth.onAuthStateChange((event) => {
    if (event === 'PASSWORD_RECOVERY') {
      recoveryListeners.forEach((listener) => listener());
    }
  });
}

export async function getCurrentUser(): Promise<User | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  return data.user ?? null;
}

// getUser() luôn gọi mạng để Supabase xác thực lại token, còn getSession() chỉ đọc
// phiên đã lưu trong máy (không gọi mạng). Đồng bộ ngầm chạy sau MỖI lần sửa dữ
// liệu (mỗi từ gõ nhật ký, mỗi lần tick việc...) nên dùng getUser() ở đây từng khiến
// nhiều yêu cầu làm mới token bắn ra gần như cùng lúc — Supabase phát hiện refresh
// token bị dùng trùng lặp và tự vô hiệu hoá session (đăng xuất người dùng ngoài ý
// muốn). Dùng getSession() cho các lượt kiểm tra tần suất cao này để tránh việc đó.
async function getSessionUser(): Promise<User | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.user ?? null;
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

export async function pushBackup(knownUser?: User | null): Promise<boolean> {
  if (!supabase) return false;
  const user = knownUser ?? await getSessionUser();
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
    throw err; // để nơi gọi hiện đúng lý do thất bại thay vì một câu chung
  }
}

export async function pullBackup(knownUser?: User | null): Promise<boolean> {
  if (!supabase) return false;
  const user = knownUser ?? await getSessionUser();
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
    throw err; // để nơi gọi hiện đúng lý do thất bại thay vì một câu chung
  }
}

// Gọi sau mỗi lần ghi dữ liệu cục bộ; gộp nhiều thay đổi liên tiếp thành một lần đẩy lên.
export function scheduleAutoSync(delayMs: number = AUTO_SYNC_DELAY_MS): void {
  if (!supabase) return;
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(() => {
    pushBackup().catch(() => {}); // lỗi ở đây đã được ghi lại qua setStatus('error'); chạy ngầm nên không cần báo thêm
  }, delayMs);
}
