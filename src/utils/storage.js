import localforage from 'localforage';
import { memoryService } from '../services/memoryService';

// Configure localforage
localforage.config({
  name: 'DailyJournalApp',
  storeName: 'daily_data',
  description: 'Stores user photos, diaries, emotions, and expenses'
});

const STORE_KEY = 'journal_entries';
const BALANCE_KEY = 'global_balance';
const INITIAL_BALANCE_KEY = 'initial_balance';
const EXPENSE_CATEGORIES_KEY = 'expense_categories';
const BUDGETS_KEY = 'category_budgets';

// Expense Categories
export const getExpenseCategories = async () => {
  try {
    const cats = await localforage.getItem(EXPENSE_CATEGORIES_KEY);
    return cats || ['Ăn uống', 'Giải trí', 'Di chuyển', 'Mua sắm', 'Đau ốm', 'Tiền trọ'];
  } catch (err) {
    return ['Ăn uống', 'Giải trí', 'Di chuyển', 'Mua sắm', 'Đau ốm', 'Tiền trọ'];
  }
};

export const saveExpenseCategories = async (categories) => {
  await localforage.setItem(EXPENSE_CATEGORIES_KEY, categories);
};

// Budgets
export const getBudgets = async () => {
  try {
    const budgets = await localforage.getItem(BUDGETS_KEY);
    return budgets || {};
  } catch (err) {
    return {};
  }
};

export const saveBudgets = async (budgets) => {
  await localforage.setItem(BUDGETS_KEY, budgets);
};

// Initial Balance
export const getInitialBalance = async () => {
  try {
    const balance = await localforage.getItem(INITIAL_BALANCE_KEY);
    return balance || 0;
  } catch (err) {
    return 0;
  }
};

export const setInitialBalance = async (balance) => {
  try {
    await localforage.setItem(INITIAL_BALANCE_KEY, balance);
    return true;
  } catch (err) {
    return false;
  }
};

// Helper to get today's date string (YYYY-MM-DD)
export const getTodayKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// Global Balance
export const getGlobalBalance = async () => {
  try {
    const balance = await localforage.getItem(BALANCE_KEY);
    return balance || 0;
  } catch (err) {
    return 0;
  }
};

export const updateGlobalBalance = async (amountChange) => {
  try {
    const currentBalance = await getGlobalBalance();
    const newBalance = currentBalance + amountChange;
    await localforage.setItem(BALANCE_KEY, newBalance);
    return newBalance;
  } catch (err) {
    console.error('Error updating balance:', err);
    return null;
  }
};

// Get all entries (Legacy bridge)
export const getAllEntries = async () => {
  return await memoryService.getAllLegacy();
};

// Get entry for a specific date
export const getEntryByDate = async (dateKey) => {
  return await memoryService.getByDate(dateKey);
};

// Save partial data for a date
export const savePartialEntry = async (dateKey, dataToUpdate) => {
  return await memoryService.updatePartial(dateKey, dataToUpdate);
};

// Export all application data as a single JSON object
export const exportBackupData = async () => {
  try {
    const entries = await localforage.getItem(STORE_KEY) || {};
    const balance = await localforage.getItem(BALANCE_KEY) || 0;
    const initialBalance = await localforage.getItem(INITIAL_BALANCE_KEY) || 0;
    const categories = await localforage.getItem(EXPENSE_CATEGORIES_KEY) || [];
    const budgets = await localforage.getItem(BUDGETS_KEY) || {};

    return JSON.stringify({
      version: '1.0.0',
      journal_entries: entries,
      global_balance: balance,
      initial_balance: initialBalance,
      expense_categories: categories,
      category_budgets: budgets
    }, null, 2);
  } catch (err) {
    console.error('Error exporting backup:', err);
    return null;
  }
};

// Import application data from JSON backup object
export const importBackupData = async (jsonDataString) => {
  try {
    const rawData = JSON.parse(jsonDataString);
    if (!rawData || typeof rawData !== 'object') return false;

    // Tìm kiếm đệ quy tất cả các key mục tiêu trong file backup thô
    const targetKeys = ['journal_entries', 'global_balance', 'initial_balance', 'expense_categories', 'category_budgets'];
    const extracted = {};
    
    function search(current) {
      if (!current || typeof current !== 'object') return;
      
      for (const key of targetKeys) {
        if (current.hasOwnProperty(key)) {
          extracted[key] = current[key];
        }
      }
      
      for (const k in current) {
        if (current.hasOwnProperty(k) && current[k] && typeof current[k] === 'object') {
          search(current[k]);
        }
      }
    }
    
    search(rawData);

    // Khôi phục các key nếu tìm thấy dữ liệu
    if (extracted.journal_entries) await localforage.setItem(STORE_KEY, extracted.journal_entries);
    if (extracted.hasOwnProperty('global_balance')) await localforage.setItem(BALANCE_KEY, Number(extracted.global_balance));
    if (extracted.hasOwnProperty('initial_balance')) await localforage.setItem(INITIAL_BALANCE_KEY, Number(extracted.initial_balance));
    if (extracted.expense_categories) await localforage.setItem(EXPENSE_CATEGORIES_KEY, extracted.expense_categories);
    if (extracted.category_budgets) await localforage.setItem(BUDGETS_KEY, extracted.category_budgets);

    return true;
  } catch (err) {
    console.error('Error importing backup:', err);
    return false;
  }
};
