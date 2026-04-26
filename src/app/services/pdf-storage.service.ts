import { Injectable } from '@angular/core';

const DB_NAME = 'pdf-reader-db';
const DB_VERSION = 1;
const STORE_NAME = 'pdfs';
const PDF_KEY = 'last-pdf';

interface StoredPdf {
  key: string;
  name: string;
  data: ArrayBuffer;
  savedAt: number;
}

@Injectable({
  providedIn: 'root'
})
export class PdfStorageService {
  private db: IDBDatabase | null = null;

  private async getDb(): Promise<IDBDatabase> {
    if (this.db) {
      return this.db;
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'key' });
        }
      };

      request.onsuccess = (event) => {
        this.db = (event.target as IDBOpenDBRequest).result;
        resolve(this.db);
      };

      request.onerror = () => reject(request.error);
    });
  }

  async savePdf(file: File, arrayBuffer: ArrayBuffer): Promise<void> {
    try {
      const db = await this.getDb();
      const stored: StoredPdf = {
        key: PDF_KEY,
        name: file.name,
        data: arrayBuffer,
        savedAt: Date.now()
      };

      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const request = store.put(stored);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch {
      // Fail silently — storage is optional
    }
  }

  async loadPdf(): Promise<{ name: string; data: ArrayBuffer } | null> {
    try {
      const db = await this.getDb();

      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const request = store.get(PDF_KEY);

        request.onsuccess = () => {
          const result = request.result as StoredPdf | undefined;
          if (result) {
            resolve({ name: result.name, data: result.data });
          } else {
            resolve(null);
          }
        };

        request.onerror = () => reject(request.error);
      });
    } catch {
      return null;
    }
  }

  async clearPdf(): Promise<void> {
    try {
      const db = await this.getDb();

      return new Promise((resolve) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        store.delete(PDF_KEY);
        tx.oncomplete = () => resolve();
      });
    } catch {
      // Fail silently
    }
  }
}
