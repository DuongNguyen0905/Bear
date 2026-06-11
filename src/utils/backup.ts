import { db } from './db';

export const exportDexieBackup = async () => {
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
    
    // Create a blob and trigger download
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    
    const dateStr = new Date().toISOString().split('T')[0];
    a.download = `Sotay_Backup_${dateStr}.json`;
    
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    URL.revokeObjectURL(url);
    
    return true;
  } catch (err) {
    console.error('Lỗi khi sao lưu dữ liệu:', err);
    return false;
  }
};

export const importDexieBackup = async (file: File): Promise<boolean> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const jsonString = e.target?.result as string;
        const backupData = JSON.parse(jsonString);
        
        let finalMemories: any[] = [];
        let finalTransactions: any[] = [];
        let finalGoals: any[] = [];
        let finalSettings: any[] = [];

        // Kiểm tra xem là định dạng V2 (Dexie) hay V1 (LocalForage)
        if (backupData && backupData.data) {
          // V2 Format
          finalMemories = backupData.data.memories || [];
          finalTransactions = backupData.data.transactions || [];
          finalGoals = backupData.data.goals || [];
          finalSettings = backupData.data.settings || [];
        } else if (backupData && backupData.journal_entries) {
          // V1 Format migration
          const oldEntries = backupData.journal_entries;
          for (const [dateKey, entry] of Object.entries(oldEntries)) {
            finalMemories.push({
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
                finalTransactions.push({
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
            finalSettings.push({ key: 'expenseCategories', value: backupData.expense_categories });
          }
          if (backupData.initial_balance !== undefined) {
             finalSettings.push({ key: 'initialBalance', value: Number(backupData.initial_balance) });
          }
        } else {
          alert('File sao lưu không hợp lệ hoặc không đúng định dạng!');
          resolve(false);
          return;
        }

        // Perform bulk put inside a transaction to ensure integrity
        await db.transaction('rw', db.memories, db.transactions, db.goals, db.settings, async () => {
          if (finalMemories.length > 0) await db.memories.bulkPut(finalMemories);
          if (finalTransactions.length > 0) await db.transactions.bulkPut(finalTransactions);
          if (finalGoals.length > 0) await db.goals.bulkPut(finalGoals);
          if (finalSettings.length > 0) await db.settings.bulkPut(finalSettings);
        });
        
        resolve(true);
      } catch (err) {
        console.error('Lỗi khi nhập dữ liệu:', err);
        alert('Lỗi định dạng file!');
        resolve(false);
      }
    };
    
    reader.onerror = () => {
      alert('Lỗi đọc file!');
      resolve(false);
    };
    
    reader.readAsText(file);
  });
};
