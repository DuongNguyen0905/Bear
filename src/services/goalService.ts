import { db } from '../utils/db';
import type { Goal } from '../utils/db';

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

  async updateGoalProgress(id: string, amountToAdd: number): Promise<void> {
    const goal = await db.goals.get(id);
    if (goal) {
      goal.currentAmount += amountToAdd;
      if (goal.currentAmount < 0) goal.currentAmount = 0;
      await db.goals.put(goal);
    }
  },

  async deleteGoal(id: string): Promise<void> {
    await db.goals.delete(id);
  },

  async getAllGoals(): Promise<Goal[]> {
    return await db.goals.orderBy('createdAt').reverse().toArray();
  }
};
