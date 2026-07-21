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

  async getAccumulatedSavingsDetails(targetYear: string, targetMonth: string) {
    const targetPrefix = `${targetYear}-${targetMonth.padStart(2, '0')}`;
    
    // Tìm tất cả các giao dịch
    const allTrans = await db.transactions.toArray();
    
    // Group transactions by YYYY-MM
    const monthlyStats: Record<string, { income: number, expense: number }> = {};
    for (const t of allTrans) {
       const mKey = t.dateKey.substring(0, 7); // "YYYY-MM"
       if (mKey < targetPrefix) {
         if (!monthlyStats[mKey]) monthlyStats[mKey] = { income: 0, expense: 0 };
         if (t.type === 'income') monthlyStats[mKey].income += t.amount;
         else monthlyStats[mKey].expense += t.amount;
       }
    }

    const settings = await db.settings.toArray();
    const initialBalanceKeys = settings.filter(s => s.key.startsWith('initialBalance_'));
    
    const pastMonths = new Set<string>();
    Object.keys(monthlyStats).forEach(k => pastMonths.add(k));
    initialBalanceKeys.forEach(s => {
       const mKey = s.key.split('_')[1]; // "YYYY-MM"
       if (mKey < targetPrefix) pastMonths.add(mKey);
    });

    const details = [];
    let totalSavings = 0;

    // Sắp xếp tháng gần nhất lên trước
    const sortedMonths = Array.from(pastMonths).sort((a, b) => b.localeCompare(a));

    for (const mKey of sortedMonths) {
      const initBalSetting = settings.find(s => s.key === `initialBalance_${mKey}`);
      const initBal = initBalSetting ? Number(initBalSetting.value) : 0;
      const stats = monthlyStats[mKey] || { income: 0, expense: 0 };
      
      const monthSaving = initBal + stats.income - stats.expense;
      totalSavings += monthSaving;

      details.push({
        month: mKey,
        income: stats.income,
        expense: stats.expense,
        initialBalance: initBal,
        saving: monthSaving
      });
    }

    return { totalSavings, details };
  },

  /**
   * Daily Budget Engine Logic
   */
  async getBudgetStatus(year: string, month: string) {
    const salaryDay = await this.getSetting<number>('salaryDay', 5); // Default mùng 5 nhận lương
    
    const now = new Date();
    let nextSalaryDate = new Date(now.getFullYear(), now.getMonth(), salaryDay);
    
    // Nếu hôm nay đã qua ngày nhận lương, ngày nhận lương tiếp theo là tháng sau
    if (now.getDate() >= salaryDay) {
      nextSalaryDate.setMonth(nextSalaryDate.getMonth() + 1);
    }
    
    const timeDiff = nextSalaryDate.getTime() - now.getTime();
    const daysToSalary = Math.ceil(timeDiff / (1000 * 3600 * 24));

    // Tính Current Month Balance
    const monthlyTrans = await this.getTransactionsByMonth(year, month);
    let monthIncome = 0;
    let monthExpense = 0;
    monthlyTrans.forEach(t => {
      if (t.type === 'income') monthIncome += t.amount;
      else monthExpense += t.amount;
    });

    const monthKey = `${year}-${month.padStart(2, '0')}`;
    const initialBalance = await this.getSetting<number>(`initialBalance_${monthKey}`, 0);
    const currentGlobalBalance = initialBalance + monthIncome - monthExpense;

    // Tính quỹ tiết kiệm tích luỹ
    const accumulatedData = await this.getAccumulatedSavingsDetails(year, month);
    const accumulatedSavings = accumulatedData.totalSavings;
    const accumulatedSavingsDetails = accumulatedData.details;

    // Tính toán ngân sách mỗi ngày (dựa trên số dư THÁNG NÀY)
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
      message = `Cảnh báo: Hôm nay bạn đã tiêu lẹm ${ (todayExpense - safeDailyLimit).toLocaleString('vi-VN') }đ.`;
    } else if (todayExpense === 0) {
      status = 'success';
      message = `Tuyệt vời! Hôm nay bạn chưa tiêu đồng nào, hãy tiếp tục phát huy!`;
    } else {
      status = 'success';
      message = `Tốt lắm! Hôm nay bạn đã tiết kiệm được ${ (safeDailyLimit - todayExpense).toLocaleString('vi-VN') }đ.`;
    }

    if (currentGlobalBalance <= 0) {
      status = 'danger';
      message = 'Bạn đang cạn kiệt tiền khả dụng của tháng này! Hãy cẩn trọng.';
    }

    return {
      daysToSalary,
      currentGlobalBalance,
      safeDailyLimit,
      todayExpense,
      message,
      status,
      salaryDay,
      accumulatedSavings,
      accumulatedSavingsDetails
    };
  }
};
