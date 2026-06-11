import { db } from '../utils/db';
import type { Transaction, Setting } from '../utils/db';

export const financeService = {
  async addTransaction(data: Omit<Transaction, 'id' | 'createdAt'>): Promise<string> {
    const id = crypto.randomUUID();
    await db.transactions.add({
      ...data,
      id,
      createdAt: Date.now()
    });
    return id;
  },

  async deleteTransaction(id: string): Promise<void> {
    await db.transactions.delete(id);
  },

  async getTransactionsByMonth(year: string, month: string): Promise<Transaction[]> {
    const prefix = `${year}-${month.padStart(2, '0')}`;
    return await db.transactions
      .filter(t => t.dateKey.startsWith(prefix))
      .toArray();
  },

  async getDashboardStats(year: string, month: string) {
    const trans = await this.getTransactionsByMonth(year, month);
    
    let totalIncome = 0;
    let totalExpense = 0;
    let todayExpense = 0;

    const todayStr = new Date().toISOString().split('T')[0];

    trans.forEach(t => {
      if (t.type === 'income') totalIncome += t.amount;
      if (t.type === 'expense') {
        totalExpense += t.amount;
        if (t.dateKey === todayStr) {
          todayExpense += t.amount;
        }
      }
    });

    const balance = totalIncome - totalExpense;
    const savingsRate = totalIncome > 0 ? ((balance / totalIncome) * 100).toFixed(1) : 0;
    
    // Avg Daily Expense calculation (based on current day of the month)
    const currentDay = new Date().getDate();
    const isCurrentMonth = new Date().getFullYear() === Number(year) && (new Date().getMonth() + 1) === Number(month);
    const daysPassed = isCurrentMonth ? currentDay : new Date(Number(year), Number(month), 0).getDate();
    
    const avgDailyExpense = daysPassed > 0 ? (totalExpense / daysPassed) : 0;

    return {
      totalIncome,
      totalExpense,
      balance,
      savingsRate,
      todayExpense,
      avgDailyExpense
    };
  },

  async getSetting<T>(key: string, defaultValue: T): Promise<T> {
    const setting = await db.settings.get(key);
    return setting ? setting.value : defaultValue;
  },

  async setSetting(key: string, value: any): Promise<void> {
    await db.settings.put({ key, value });
  },

  /**
   * Daily Budget Engine Logic
   */
  async getBudgetStatus() {
    const salaryDay = await this.getSetting<number>('salaryDay', 5); // Default mùng 5 nhận lương
    
    const now = new Date();
    let nextSalaryDate = new Date(now.getFullYear(), now.getMonth(), salaryDay);
    
    // Nếu hôm nay đã qua ngày nhận lương, ngày nhận lương tiếp theo là tháng sau
    if (now.getDate() >= salaryDay) {
      nextSalaryDate.setMonth(nextSalaryDate.getMonth() + 1);
    }
    
    const timeDiff = nextSalaryDate.getTime() - now.getTime();
    const daysToSalary = Math.ceil(timeDiff / (1000 * 3600 * 24));

    // Lấy số dư tổng (hoặc số dư tháng hiện tại tuỳ chiến lược). 
    // Theo yêu cầu "Số dư hiện tại / Ngày còn lại"
    // Tính tổng tất cả thu chi từ trước tới nay để ra Số Dư Khả Dụng thực tế
    let allIncome = 0;
    let allExpense = 0;
    await db.transactions.each(t => {
      if (t.type === 'income') allIncome += t.amount;
      else allExpense += t.amount;
    });

    const currentGlobalBalance = allIncome - allExpense;

    // Tính toán ngân sách mỗi ngày
    const safeDailyLimit = daysToSalary > 0 ? Math.floor(currentGlobalBalance / daysToSalary) : 0;

    // Chi tiêu hôm nay
    const todayStr = now.toISOString().split('T')[0];
    const todayTrans = await db.transactions.filter(t => t.dateKey === todayStr && t.type === 'expense').toArray();
    const todayExpense = todayTrans.reduce((sum, t) => sum + t.amount, 0);

    // Cảnh báo & Đánh giá
    let message = '';
    let status = 'normal'; // 'success' | 'warning' | 'danger'
    
    if (todayExpense > safeDailyLimit) {
      status = 'danger';
      message = `Cảnh báo: Hôm nay bạn đã tiêu lẹm ${ (todayExpense - safeDailyLimit).toLocaleString('vi-VN') }đ so với ngân sách an toàn.`;
    } else if (todayExpense === 0) {
      status = 'success';
      message = `Tuyệt vời! Hôm nay bạn chưa tiêu đồng nào, hãy tiếp tục phát huy!`;
    } else {
      status = 'success';
      message = `Tốt lắm! Hôm nay bạn đã tiết kiệm được ${ (safeDailyLimit - todayExpense).toLocaleString('vi-VN') }đ so với ngân sách.`;
    }

    if (currentGlobalBalance <= 0) {
      status = 'danger';
      message = 'Bạn đang cạn kiệt tiền! Hãy cẩn trọng.';
    }

    return {
      daysToSalary,
      currentGlobalBalance,
      safeDailyLimit,
      todayExpense,
      message,
      status,
      salaryDay
    };
  }
};
