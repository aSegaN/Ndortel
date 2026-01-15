
import { BirthCertificate, Center, User, SyncAction } from '../types';

const DB_NAME = 'NdortelDB';
const DB_VERSION = 2; // Incrémenté pour la nouvelle structure

export const DB_STORES = {
  CERTIFICATES: 'certificates',
  CENTERS: 'centers',
  USERS: 'users',
  SYNC_QUEUE: 'sync_queue',
};

class NdortelDatabase {
  private db: IDBDatabase | null = null;

  async init(): Promise<IDBDatabase> {
    if (this.db) return this.db;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(DB_STORES.CERTIFICATES)) {
          db.createObjectStore(DB_STORES.CERTIFICATES, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(DB_STORES.CENTERS)) {
          db.createObjectStore(DB_STORES.CENTERS, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(DB_STORES.USERS)) {
          db.createObjectStore(DB_STORES.USERS, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(DB_STORES.SYNC_QUEUE)) {
          db.createObjectStore(DB_STORES.SYNC_QUEUE, { keyPath: 'id' });
        }
      };

      request.onsuccess = (event) => {
        this.db = (event.target as IDBOpenDBRequest).result;
        resolve(this.db);
      };

      request.onerror = (event) => {
        reject('IndexedDB error: ' + (event.target as IDBOpenDBRequest).error);
      };
    });
  }

  async getAll<T>(storeName: string): Promise<T[]> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async put<T>(storeName: string, item: T): Promise<void> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put(item);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async putAll<T>(storeName: string, items: T[]): Promise<void> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      items.forEach(item => store.put(item));

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async delete(storeName: string, id: string): Promise<void> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async clearStore(storeName: string): Promise<void> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}

export const dbService = new NdortelDatabase();
