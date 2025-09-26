/**
 * WEB ADAPTERS - Implémentations Web pour DataEngine
 * =================================================
 * Storage et Network adapters pour l'environnement Web
 */

// Import from core package
import { DataEngine } from '@gestion-chantier/core';
import type { 
  StorageAdapter, 
  NetworkAdapter, 
  ApiResponse
} from '@gestion-chantier/core';

// ===== WEB STORAGE ADAPTER =====

export class WebStorageAdapter implements StorageAdapter {
  private prefix: string;

  constructor(prefix = 'gestion-chantier') {
    this.prefix = prefix;
  }

  private getKey(key: string): string {
    return `${this.prefix}:${key}`;
  }

  async get(key: string): Promise<any> {
    try {
      const item = localStorage.getItem(this.getKey(key));
      return item ? JSON.parse(item) : null;
    } catch (error) {
      console.error(`Failed to get ${key} from localStorage:`, error);
      return null;
    }
  }

  async set(key: string, value: any): Promise<void> {
    try {
      localStorage.setItem(this.getKey(key), JSON.stringify(value));
    } catch (error) {
      console.error(`Failed to set ${key} in localStorage:`, error);
      throw error;
    }
  }

  async delete(key: string): Promise<void> {
    localStorage.removeItem(this.getKey(key));
  }

  async clear(): Promise<void> {
    const keys = await this.keys();
    for (const key of keys) {
      localStorage.removeItem(this.getKey(key));
    }
  }

  async keys(): Promise<string[]> {
    const allKeys = Object.keys(localStorage);
    const prefixedKeys = allKeys.filter(key => key.startsWith(`${this.prefix}:`));
    return prefixedKeys.map(key => key.substring(`${this.prefix}:`.length));
  }
}

// ===== WEB NETWORK ADAPTER =====

// Configuration centralisée
const WEB_CONFIG = {
  API_PORT: 3001,
  get DEFAULT_API_URL() {
    return process.env.NODE_ENV === 'production' 
      ? 'https://your-production-api.com'
      : `http://localhost:${this.API_PORT}`;
  }
};

export class WebNetworkAdapter implements NetworkAdapter {
  private baseUrl: string;
  private onlineCallbacks = new Set<(online: boolean) => void>();

  constructor(baseUrl = WEB_CONFIG.DEFAULT_API_URL) {
    this.baseUrl = baseUrl;
    
    // Listen to online/offline events
    window.addEventListener('online', () => this.notifyOnlineStatus(true));
    window.addEventListener('offline', () => this.notifyOnlineStatus(false));
  }

  async request<T>(method: string, endpoint: string, data?: any): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    
    try {
      const options: RequestInit = {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
      };

      if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
        options.body = JSON.stringify(data);
      }

      const response = await fetch(url, options);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      return {
        success: true,
        data: result,
        timestamp: Date.now()
      };
    } catch (error) {
      console.error(`Network request failed: ${method} ${url}`, error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown network error',
        timestamp: Date.now()
      };
    }
  }

  isOnline(): boolean {
    return navigator.onLine;
  }

  onlineStatusChanged(callback: (online: boolean) => void): void {
    this.onlineCallbacks.add(callback);
  }

  private notifyOnlineStatus(online: boolean): void {
    this.onlineCallbacks.forEach(callback => {
      try {
        callback(online);
      } catch (error) {
        console.error('Error in online status callback:', error);
      }
    });
  }
}

// ===== WEB DATA ENGINE FACTORY =====

export function createWebDataEngine(apiUrl?: string) {
  const storage = new WebStorageAdapter();
  const network = new WebNetworkAdapter(apiUrl);
  
  return new DataEngine(storage, network);
}