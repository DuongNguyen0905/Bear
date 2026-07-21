import { db } from '../utils/db';
import type { MemoryEntry } from '../utils/db';

export const memoryService = {
  /**
   * Lấy bản ghi theo ngày, nếu chưa có thì tạo mới rỗng
   */
  async getByDate(dateKey: string): Promise<MemoryEntry> {
    const entry = await db.memories.get(dateKey);
    if (entry) return entry;
    
    return {
      dateKey,
      photos: [],
      diary: '',
      emotions: [],
      expenses: [],
      tasks: [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
  },

  /**
   * Lưu hoặc cập nhật một phần dữ liệu của ngày
   */
  async updatePartial(dateKey: string, data: Partial<MemoryEntry>): Promise<boolean> {
    try {
      const current = await this.getByDate(dateKey);
      await db.memories.put({
        ...current,
        ...data,
        updatedAt: Date.now()
      });
      return true;
    } catch (error) {
      console.error('Lỗi khi lưu Memory:', error);
      return false;
    }
  },

  /**
   * Lấy toàn bộ bản ghi (chủ yếu dùng cho việc tương thích ngược)
   */
  async getAllLegacy(): Promise<Record<string, MemoryEntry>> {
    const all = await db.memories.toArray();
    const result: Record<string, MemoryEntry> = {};
    for (const item of all) {
      result[item.dateKey] = item;
    }
    return result;
  }
};
