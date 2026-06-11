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
        
        if (!backupData || !backupData.data) {
          alert('File sao lưu không hợp lệ!');
          resolve(false);
          return;
        }

        const { memories, transactions, goals, settings } = backupData.data;

        // Perform bulk put inside a transaction to ensure integrity
        await db.transaction('rw', db.memories, db.transactions, db.goals, db.settings, async () => {
          if (memories && Array.isArray(memories)) {
            await db.memories.bulkPut(memories);
          }
          if (transactions && Array.isArray(transactions)) {
            await db.transactions.bulkPut(transactions);
          }
          if (goals && Array.isArray(goals)) {
            await db.goals.bulkPut(goals);
          }
          if (settings && Array.isArray(settings)) {
            await db.settings.bulkPut(settings);
          }
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
