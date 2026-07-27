import { db } from '../utils/db';
import type { Goal } from '../utils/db';

// Danh mục riêng cho các khoản nạp vào mục tiêu — dùng để loại khỏi biểu đồ
// chi tiêu theo danh mục (Ăn uống, Di chuyển...) vì đây là tiền chuyển sang
// tiết kiệm, không phải chi tiêu thật.
export const GOAL_FUND_CATEGORY = 'Tiết kiệm mục tiêu';

export const goalService = {
  async addGoal(title: string, targetAmount: number, deadline?: string): Promise<string> {
    const id = crypto.randomUUID();
    await db.goals.add({
      id,
      title,
      targetAmount,
      currentAmount: 0,
      deadline,
      createdAt: Date.now()
    });
    return id;
  },

  // Nạp tiền vào mục tiêu: vừa tăng currentAmount, vừa tạo một khoản chi thật
  // trong ngày `dateKey` để trừ đúng vào số dư khả dụng của tháng đó — tiền
  // coi như đã "chuyển" từ số dư sang mục tiêu, không còn khả dụng để chi tiêu.
  async fundGoal(id: string, amountToAdd: number, dateKey: string): Promise<void> {
    const goal = await db.goals.get(id);
    if (!goal) return;

    goal.currentAmount += amountToAdd;
    if (goal.currentAmount < 0) goal.currentAmount = 0;
    if (!goal.completed && goal.currentAmount >= goal.targetAmount) {
      goal.completed = true;
      goal.completedAt = Date.now();
    }
    await db.goals.put(goal);

    await db.transactions.add({
      id: crypto.randomUUID(),
      dateKey,
      type: 'expense',
      amount: amountToAdd,
      category: GOAL_FUND_CATEGORY,
      note: `Nạp vào mục tiêu: ${goal.title}`,
      goalId: id,
      createdAt: Date.now()
    });
  },

  // Xóa mục tiêu: xóa luôn các khoản chi đã nạp vào nó — vì đó chính là cách
  // hoàn lại tiền, mỗi khoản chi bị xóa sẽ tự động cộng lại vào số dư của
  // đúng tháng nó từng bị trừ, không cần cộng dồn thủ công vào một tháng nào.
  async deleteGoal(id: string): Promise<void> {
    await db.transactions.filter(t => t.goalId === id).delete();
    await db.goals.delete(id);
  },

  async getAllGoals(): Promise<Goal[]> {
    // 'createdAt' không được đánh index trong schema Dexie nên không thể dùng orderBy() trên nó
    // (Dexie sẽ ném DexieError và khiến danh sách mục tiêu luôn rỗng) — sắp xếp thủ công thay thế.
    const all = await db.goals.toArray();
    return all.sort((a, b) => b.createdAt - a.createdAt);
  }
};
