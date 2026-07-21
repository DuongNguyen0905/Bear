import localforage from 'localforage';
import { db } from './db';

// Ensure we are reading from the old localforage store
localforage.config({
  name: 'DailyJournalApp',
  storeName: 'daily_data'
});

const STORE_KEY = 'journal_entries';
const HAS_MIGRATED_KEY = 'has_migrated_to_dexie';

export const migrateDataToDexie = async () => {
  try {
    const hasMigrated = localStorage.getItem(HAS_MIGRATED_KEY);
    if (hasMigrated === 'true') {
      console.log('Database already migrated to Dexie.js');
      return true;
    }

    console.log('Starting migration from localforage to Dexie.js...');
    const oldEntries: Record<string, any> = await localforage.getItem(STORE_KEY) || {};
    
    const memoriesToInsert: any[] = [];
    const transactionsToInsert: any[] = [];

    for (const [dateKey, entry] of Object.entries(oldEntries)) {
      // Create Memory Entry
      memoriesToInsert.push({
        dateKey,
        photos: entry.photos || [],
        diary: entry.diary || '',
        emotions: entry.emotions || [],
        expenses: entry.expenses || [],
        tasks: entry.tasks || [],
        createdAt: Date.now(),
        updatedAt: Date.now()
      });

      // Also migrate expenses to transactions table for better querying later
      if (entry.expenses && Array.isArray(entry.expenses)) {
        for (const exp of entry.expenses) {
          transactionsToInsert.push({
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

    // Perform bulk add using Dexie transaction
    await db.transaction('rw', db.memories, db.transactions, async () => {
      if (memoriesToInsert.length > 0) {
        await db.memories.bulkPut(memoriesToInsert);
      }
      if (transactionsToInsert.length > 0) {
        await db.transactions.bulkPut(transactionsToInsert);
      }
    });

    console.log('Migration completed successfully!');
    localStorage.setItem(HAS_MIGRATED_KEY, 'true');
    return true;

  } catch (err) {
    console.error('Migration failed:', err);
    return false;
  }
};
