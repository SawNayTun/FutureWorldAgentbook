
import { Injectable, signal, computed } from '@angular/core';

export interface AdminSettings {
  masterPass: string;
  shopName: string;
}

export interface UserData {
  id: string;
  name:string;
  key: string;
  deviceId: string | null;
  createdAt: string;
  expiresAt: string | null;
  pin?: string;
}

export interface QuickSet {
  name: string;
  numbers: string[];
}

export interface HistoryItem {
  id: string;
  timestamp: string;
  shopName: string;
  mode: '2D' | '3D';
  currency: string;
  items: { n: string; a: number }[];
  totalAmount: number;
  totalCount: number;
}

interface Database {
  settings: AdminSettings;
  users: UserData[];
  quickSets: QuickSet[];
  history: HistoryItem[];
}

const DB_KEY = 'fw_database';

@Injectable({
  providedIn: 'root',
})
export class DataService {
  private database = signal<Database | null>(null);
  public currentUser = signal<UserData | null>(null);

  adminSettings = computed(() => this.database()?.settings ?? null);
  allUsers = computed(() => this.database()?.users ?? []);
  quickSets = computed(() => this.database()?.quickSets ?? []);
  history = computed(() => this.database()?.history ?? []);

  async initialize(): Promise<'login' | 'error'> {
    try {
      // Short delay to allow UI to show initializing state
      await new Promise(resolve => setTimeout(resolve, 50)); 
      
      const storedData = localStorage.getItem(DB_KEY);
      if (storedData) {
        const db = JSON.parse(storedData);
        // Ensure quickSets exists for backward compatibility
        if (!db.quickSets) {
          db.quickSets = [];
        }
        if (!db.history) {
          db.history = [];
        }
        this.database.set(db);
      } else {
        // Create default initial state
        const defaultDb: Database = {
            settings: {
                shopName: 'အနာဂတ်ကမ္ဘာ',
                masterPass: 'MasterSaiYan'
            },
            users: [],
            quickSets: [],
            history: []
        };
        this.database.set(defaultDb);
        this._saveDatabase();
      }
      return 'login';
    } catch (error) {
      console.error("Failed to initialize data from localStorage:", error);
      this.database.set(null);
      return 'error';
    }
  }

  private _saveDatabase(): void {
    const currentData = this.database();
    if (!currentData) return;
    try {
      localStorage.setItem(DB_KEY, JSON.stringify(currentData));
    } catch (error) {
      console.error("Failed to save data to localStorage:", error);
      alert('Failed to save data. Your browser might be in private mode or storage is full.');
    }
  }
  
  updateAdminSettings(newSettings: Partial<AdminSettings>): void {
    this.database.update(db => {
        if (!db) return null;
        return { ...db, settings: { ...db.settings, ...newSettings } };
    });
    this._saveDatabase();
  }

  createNewUser(name: string, expiresAt: string | null): void {
    let key: string;
    let isUnique = false;
    
    // Ensure key is unique
    do {
      key = `KEY-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      if (!this.allUsers().some(u => u.key === key)) {
        isUnique = true;
      }
    } while (!isUnique);

    const newUser: UserData = {
      id: crypto.randomUUID(),
      name,
      key,
      deviceId: null,
      createdAt: new Date().toISOString(),
      expiresAt
    };
    
    this.database.update(db => {
      if (!db) return null;
      return { ...db, users: [...db.users, newUser] };
    });

    this._saveDatabase();
  }

  deleteUser(userId: string): void {
    this.database.update(db => {
      if (!db) return null;
      return { ...db, users: db.users.filter(u => u.id !== userId) };
    });
    this._saveDatabase();
  }

  renewUserSubscription(userId: string, daysToAdd: number): void {
    this.database.update(db => {
        if (!db) return null;

        const userIndex = db.users.findIndex(u => u.id === userId);
        if (userIndex === -1) {
            console.warn(`User with id ${userId} not found for renewal.`);
            return db;
        }

        const users = [...db.users];
        const user = { ...users[userIndex] };

        const now = new Date();
        // Determine the base date for renewal: either the current expiry date (if it's in the future) or today.
        const baseDate = user.expiresAt && new Date(user.expiresAt) > now ? new Date(user.expiresAt) : now;
        
        const newExpiryDate = new Date(baseDate);
        newExpiryDate.setDate(newExpiryDate.getDate() + daysToAdd);

        user.expiresAt = newExpiryDate.toISOString();
        users[userIndex] = user;

        return { ...db, users };
    });
    this._saveDatabase();
  }

  linkDeviceToUser(userId: string, deviceId: string): void {
    this.database.update(db => {
      if (!db) return null;
      const users = [...db.users];
      const userIndex = users.findIndex(u => u.id === userId);
      if (userIndex !== -1) {
        users[userIndex] = { ...users[userIndex], deviceId };
      }
      return { ...db, users };
    });
    this._saveDatabase();
  }

  resetUserDevice(userId: string): void {
    this.database.update(db => {
      if (!db) return null;
      const users = [...db.users];
      const userIndex = users.findIndex(u => u.id === userId);
      if (userIndex !== -1) {
        users[userIndex] = { ...users[userIndex], deviceId: null };
      }
      return { ...db, users };
    });
    this._saveDatabase();
  }

  addQuickSet(quickSet: QuickSet): void {
    this.database.update(db => {
      if (!db) return null;
      // Prevent duplicate names
      const existing = db.quickSets.find(qs => qs.name === quickSet.name);
      if (existing) {
        alert('A Quick Set with this name already exists.');
        return db;
      }
      return { ...db, quickSets: [...db.quickSets, quickSet] };
    });
    this._saveDatabase();
  }

  deleteQuickSet(setName: string): void {
    this.database.update(db => {
      if (!db) return null;
      return { ...db, quickSets: db.quickSets.filter(qs => qs.name !== setName) };
    });
    this._saveDatabase();
  }

  addToHistory(item: HistoryItem): void {
    this.database.update(db => {
      if (!db) return null;
      // Keep only last 50 items to avoid localStorage bloat
      const newHistory = [item, ...db.history].slice(0, 50);
      return { ...db, history: newHistory };
    });
    this._saveDatabase();
  }

  deleteHistoryItem(id: string): void {
    this.database.update(db => {
      if (!db) return null;
      return { ...db, history: db.history.filter(h => h.id !== id) };
    });
    this._saveDatabase();
  }

  clearHistory(): void {
    this.database.update(db => {
      if (!db) return null;
      return { ...db, history: [] };
    });
    this._saveDatabase();
  }


  factoryReset(): void {
    if (confirm('Are you sure you want to delete ALL users and settings? This action cannot be undone. It is recommended to backup data first.')) {
        try {
            localStorage.removeItem(DB_KEY);
            localStorage.removeItem('fw_device_id');
            alert('All local data has been deleted. The application will now reload.');
            location.reload();
        } catch(error) {
            console.error('Factory reset failed:', error);
            alert('Factory reset failed. Could not clear local storage.');
        }
    }
  }

  backupData(): void {
    const data = this.database();
    if (!data) {
      alert('No data to back up.');
      return;
    }
    try {
      const json = JSON.stringify(data, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const date = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `future-world-backup-${date}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Backup failed:', error);
      alert('Could not create backup file.');
    }
  }

  importData(jsonString: string): boolean {
    try {
      const data: Database = JSON.parse(jsonString);
      // Basic validation to ensure the file is roughly the correct structure
      if (data && data.settings && Array.isArray(data.users)) {
        if (!data.quickSets) { // Ensure quicksets exists for older backups
          data.quickSets = [];
        }
        this.database.set(data);
        this._saveDatabase();
        return true;
      } else {
        return false;
      }
    } catch (error) {
      console.error('Import failed:', error);
      return false;
    }
  }
}
