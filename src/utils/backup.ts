import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { db } from './db';
import type { MemoryEntry, Transaction, Goal, Setting, Photo, Emotion } from './db';

// Thư mục cố định dùng cho tính năng tự sao lưu: một app đồng bộ (Autosync
// for Google Drive, FolderSync, Solid Explorer Cloud...) trỏ vào đúng thư mục
// Documents/SoTayBackup trên CẢ HAI máy, đồng bộ qua cùng một tài khoản Drive
// — app này chỉ cần ghi/đọc đúng 1 file cố định tại đây, không tự nói chuyện
// với Google Drive (không cần OAuth).
const AUTO_BACKUP_DIR = 'SoTayBackup';
const AUTO_BACKUP_FILE = 'SoTay_AutoBackup.json';
const AUTO_BACKUP_PATH = `${AUTO_BACKUP_DIR}/${AUTO_BACKUP_FILE}`;

async function buildBackupJson(): Promise<{ json: string; timestamp: number }> {
  const memories = await db.memories.toArray();
  const transactions = await db.transactions.toArray();
  const goals = await db.goals.toArray();
  const settings = await db.settings.toArray();
  const timestamp = Date.now();
  const backupData = {
    version: '2.0.0',
    timestamp,
    data: { memories, transactions, goals, settings }
  };
  return { json: JSON.stringify(backupData), timestamp };
}

// Ghi từng phần nhỏ qua cầu nối JS↔native — cùng lý do đã ghi ở exportDexieBackup:
// một lệnh writeFile khổng lồ (dữ liệu có ảnh base64) từng làm app văng trên máy thật.
async function writeFileChunked(path: string, directory: Directory, json: string): Promise<void> {
  const CHUNK_SIZE = 1_000_000;
  await Filesystem.mkdir({ path: AUTO_BACKUP_DIR, directory, recursive: true }).catch(() => {});
  await Filesystem.writeFile({ path, data: json.slice(0, CHUNK_SIZE), directory, encoding: Encoding.UTF8 });
  for (let offset = CHUNK_SIZE; offset < json.length; offset += CHUNK_SIZE) {
    await Filesystem.appendFile({ path, data: json.slice(offset, offset + CHUNK_SIZE), directory, encoding: Encoding.UTF8 });
  }
}

// Ghi thầm lặng (không mở hộp thoại chia sẻ) vào file cố định — gọi mỗi khi
// app xuống nền, để app đồng bộ ngoài phát hiện file đổi và tự đẩy lên Drive.
export const writeAutoBackup = async (): Promise<number | null> => {
  if (!Capacitor.isNativePlatform()) return null; // trên web không có thư mục thật để ghi
  try {
    const { json, timestamp } = await buildBackupJson();
    await writeFileChunked(AUTO_BACKUP_PATH, Directory.Documents, json);
    return timestamp;
  } catch (err) {
    console.error('Lỗi tự sao lưu:', err);
    return null;
  }
};

// Đọc file tự-sao-lưu hiện có (nếu có) và trả về nội dung + mốc thời gian ghi
// — dùng để so sánh xem bản trên thư mục đồng bộ có mới hơn bản đã thấy gần
// nhất trên máy này không (tức là đến từ máy kia) trước khi hỏi người dùng.
export const readAutoBackup = async (): Promise<{ json: string; timestamp: number } | null> => {
  if (!Capacitor.isNativePlatform()) return null;
  try {
    const result = await Filesystem.readFile({ path: AUTO_BACKUP_PATH, directory: Directory.Documents, encoding: Encoding.UTF8 });
    const json = result.data as string;
    const parsed = JSON.parse(json);
    return { json, timestamp: parsed.timestamp || 0 };
  } catch {
    return null; // chưa từng có file, hoặc chưa cấu hình thư mục đồng bộ
  }
};

export const exportDexieBackup = async (): Promise<boolean> => {
  try {
    const memories = await db.memories.toArray();
    const transactions = await db.transactions.toArray();
    const goals = await db.goals.toArray();
    const settings = await db.settings.toArray();

    const backupData = {
      version: '2.0.0', // Dexie schema version
      timestamp: Date.now(),
      data: {
        memories,
        transactions,
        goals,
        settings
      }
    };

    const jsonString = JSON.stringify(backupData, null, 2);
    const dateStr = new Date().toISOString().split('T')[0];
    const fileName = `Sotay_Backup_${dateStr}.json`;

    if (Capacitor.isNativePlatform()) {
      // Trên app native (Android), tải qua thẻ <a> không thực sự lưu file xuống máy.
      // Ghi file thật vào bộ nhớ máy, sau đó mời người dùng chia sẻ ra Drive/Zalo/Gmail... để khôi phục trên máy khác.
      //
      // Dữ liệu có thể chứa hàng chục/hàng trăm MB ảnh base64 — gửi cả chuỗi khổng lồ đó
      // qua cầu nối JS↔native trong một lệnh writeFile duy nhất từng làm app văng (crash)
      // trên máy thật (dù chạy êm trên preview vì nhánh trình duyệt không qua cầu nối này).
      // Ghi từng phần nhỏ để giảm kích thước mỗi lượt truyền qua cầu nối.
      const CHUNK_SIZE = 1_000_000; // ~1MB mỗi lượt ghi
      await Filesystem.writeFile({
        path: fileName,
        data: jsonString.slice(0, CHUNK_SIZE),
        directory: Directory.Documents,
        encoding: Encoding.UTF8
      });
      for (let offset = CHUNK_SIZE; offset < jsonString.length; offset += CHUNK_SIZE) {
        await Filesystem.appendFile({
          path: fileName,
          data: jsonString.slice(offset, offset + CHUNK_SIZE),
          directory: Directory.Documents,
          encoding: Encoding.UTF8
        });
      }

      const result = await Filesystem.getUri({ path: fileName, directory: Directory.Documents });

      try {
        await Share.share({
          title: 'Sao lưu Sổ Tay',
          text: 'File sao lưu dữ liệu Sổ Tay của bạn',
          url: result.uri,
          dialogTitle: 'Lưu file sao lưu vào đâu?'
        });
      } catch {
        // Người dùng đóng hộp thoại chia sẻ — file vẫn đã được lưu vào máy.
      }
    } else {
      // Trình duyệt web: giữ cách tải file cũ qua Blob + thẻ <a>.
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;

      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      URL.revokeObjectURL(url);
    }

    return true;
  } catch (err) {
    console.error('Lỗi khi sao lưu dữ liệu:', err);
    throw err; // để nơi gọi hiện đúng lý do thất bại thay vì một câu chung
  }
};

// Hai ảnh coi như trùng nếu cùng thời điểm chụp và cùng độ dài dữ liệu — đủ để
// lọc trùng khi gộp mà không cần so sánh toàn bộ chuỗi base64 (rất nặng).
function samePhoto(a: Photo, b: Photo): boolean {
  return a.time === b.time && a.url.length === b.url.length;
}

function sameEmotion(a: Emotion, b: Emotion): boolean {
  return a.time === b.time && a.emoji === b.emoji;
}

// Gộp một ngày nhật ký đã nhập vào một ngày đã có sẵn trên máy: hợp nhất danh
// sách ảnh/cảm xúc/việc cần làm (bỏ trùng), giữ nhật ký chữ hiện có trên máy
// nếu đã có nội dung — không có trường hợp nào bị mất dữ liệu.
function mergeMemory(local: MemoryEntry | undefined, incoming: MemoryEntry): MemoryEntry {
  if (!local) return incoming;

  const mergedPhotos = [...local.photos];
  for (const p of incoming.photos || []) {
    if (!mergedPhotos.some((existing) => samePhoto(existing, p))) mergedPhotos.push(p);
  }

  const mergedEmotions = [...local.emotions];
  for (const e of incoming.emotions || []) {
    if (!mergedEmotions.some((existing) => sameEmotion(existing, e))) mergedEmotions.push(e);
  }

  const mergedTasks = [...local.tasks];
  for (const t of incoming.tasks || []) {
    if (!mergedTasks.some((existing) => existing.id === t.id)) mergedTasks.push(t);
  }

  const mergedExpenses = [...(local.expenses || [])];
  for (const ex of incoming.expenses || []) {
    if (!mergedExpenses.some((existing) => existing.id === ex.id)) mergedExpenses.push(ex);
  }

  return {
    dateKey: local.dateKey,
    photos: mergedPhotos,
    diary: local.diary && local.diary.trim() ? local.diary : incoming.diary,
    emotions: mergedEmotions,
    expenses: mergedExpenses,
    tasks: mergedTasks,
    createdAt: Math.min(local.createdAt, incoming.createdAt),
    updatedAt: Date.now(),
  };
}

// Giao dịch/mục tiêu dùng id ngẫu nhiên nên gần như không bao giờ trùng thật —
// gộp chỉ là hợp hai danh sách, giữ bản trên máy nếu (hiếm khi) trùng id.
function mergeById<T extends { id: string }>(local: T[], incoming: T[]): T[] {
  const localIds = new Set(local.map((x) => x.id));
  const merged = [...local];
  for (const item of incoming) {
    if (!localIds.has(item.id)) merged.push(item);
  }
  return merged;
}

// Cài đặt dùng key cố định (salaryDay, initialBalance_YYYY-MM...) nên có thể
// thật sự trùng — ưu tiên giữ giá trị đang có trên máy để không ghi đè cấu
// hình người dùng đã chỉnh, trừ danh mục chi tiêu thì gộp danh sách lại.
function mergeSettings(local: Setting[], incoming: Setting[]): Setting[] {
  const merged = [...local];
  for (const s of incoming) {
    const idx = merged.findIndex((m) => m.key === s.key);
    if (idx === -1) {
      merged.push(s);
    } else if (s.key === 'expenseCategories' && Array.isArray(merged[idx].value) && Array.isArray(s.value)) {
      const unionCats = [...merged[idx].value];
      for (const cat of s.value) if (!unionCats.includes(cat)) unionCats.push(cat);
      merged[idx] = { key: s.key, value: unionCats };
    } else {
      merged[idx] = s;
    }
  }
  return merged;
}

export const importDexieBackupFromString = async (jsonString: string): Promise<void> => {
  const backupData = JSON.parse(jsonString);

  let incomingMemories: MemoryEntry[] = [];
  let incomingTransactions: Transaction[] = [];
  let incomingGoals: Goal[] = [];
  let incomingSettings: Setting[] = [];

  // Kiểm tra xem là định dạng V2 (Dexie) hay V1 (LocalForage)
  if (backupData && backupData.data) {
    // V2 Format
    incomingMemories = backupData.data.memories || [];
    incomingTransactions = backupData.data.transactions || [];
    incomingGoals = backupData.data.goals || [];
    incomingSettings = backupData.data.settings || [];
  } else if (backupData && backupData.journal_entries) {
    // V1 Format migration
    const oldEntries = backupData.journal_entries;
    for (const [dateKey, entry] of Object.entries(oldEntries)) {
      incomingMemories.push({
        dateKey,
        photos: (entry as any).photos || [],
        diary: (entry as any).diary || '',
        emotions: (entry as any).emotions || [],
        expenses: (entry as any).expenses || [],
        tasks: (entry as any).tasks || [],
        createdAt: Date.now(),
        updatedAt: Date.now()
      });

      if ((entry as any).expenses && Array.isArray((entry as any).expenses)) {
        for (const exp of (entry as any).expenses) {
          incomingTransactions.push({
            id: exp.id || crypto.randomUUID(),
            dateKey,
            type: 'expense',
            amount: exp.amount,
            category: exp.category,
            note: exp.note,
            createdAt: Date.now()
          });
        }
      }
    }

    if (backupData.expense_categories) {
      incomingSettings.push({ key: 'expenseCategories', value: backupData.expense_categories });
    }
    if (backupData.initial_balance !== undefined) {
      incomingSettings.push({ key: 'initialBalance', value: Number(backupData.initial_balance) });
    }
  } else {
    throw new Error('File sao lưu không hợp lệ hoặc không đúng định dạng!');
  }

  // Gộp vào dữ liệu hiện có trên máy — không có bước nào ghi đè trắng dữ liệu cũ.
  await db.transaction('rw', db.memories, db.transactions, db.goals, db.settings, async () => {
    for (const incoming of incomingMemories) {
      const local = await db.memories.get(incoming.dateKey);
      await db.memories.put(mergeMemory(local, incoming));
    }
    if (incomingTransactions.length) {
      const localTx = await db.transactions.toArray();
      await db.transactions.bulkPut(mergeById(localTx, incomingTransactions));
    }
    if (incomingGoals.length) {
      const localGoals = await db.goals.toArray();
      await db.goals.bulkPut(mergeById(localGoals, incomingGoals));
    }
    if (incomingSettings.length) {
      const localSettings = await db.settings.toArray();
      await db.settings.bulkPut(mergeSettings(localSettings, incomingSettings));
    }
  });
};

export const importDexieBackup = async (file: File): Promise<void> => {
  const jsonString: string = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = () => reject(reader.error || new Error('Lỗi đọc file!'));
    reader.readAsText(file);
  });
  await importDexieBackupFromString(jsonString);
};
