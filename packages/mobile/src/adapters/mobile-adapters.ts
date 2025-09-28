/**
 * MOBILE ADAPTERS - React Native/Expo
 * ===================================
 * Adapters pour utiliser le DataEngine avec React Native
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { DataEngine } from '@gestion-chantier/core';
import type { StorageAdapter, NetworkAdapter } from '@gestion-chantier/core';

// ===== STORAGE ADAPTER (AsyncStorage) =====

export class AsyncStorageAdapter implements StorageAdapter {
  async get(key: string): Promise<any> {
    try {
      const value = await AsyncStorage.getItem(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.warn('AsyncStorage get error:', error);
      return null;
    }
  }

  async set(key: string, value: any): Promise<void> {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.warn('AsyncStorage set error:', error);
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.warn('AsyncStorage delete error:', error);
    }
  }

  async clear(): Promise<void> {
    try {
      await AsyncStorage.clear();
    } catch (error) {
      console.warn('AsyncStorage clear error:', error);
    }
  }

  async keys(): Promise<string[]> {
    try {
      return await AsyncStorage.getAllKeys();
    } catch (error) {
      console.warn('AsyncStorage keys error:', error);
      return [];
    }
  }
}

// ===== NETWORK ADAPTER (React Native fetch) =====

export class ReactNativeNetworkAdapter implements NetworkAdapter {
  private baseUrl: string;
  private onlineStatus: boolean = true;
  private onlineCallbacks: ((online: boolean) => void)[] = [];

  constructor(baseUrl: string = 'http://localhost:3001') {
    this.baseUrl = baseUrl;
    
    // Note: Pour React Native, la détection online/offline nécessite @react-native-netinfo
    // Pour simplifier, on considère toujours online pour l'instant
    this.onlineStatus = true;
  }

  async request<T>(method: string, endpoint: string, data?: any): Promise<any> {
    const url = `${this.baseUrl}${endpoint}`;
    
    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: data ? JSON.stringify(data) : undefined,
      });

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
      console.warn('Network request error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
        timestamp: Date.now()
      };
    }
  }

  isOnline(): boolean {
    return this.onlineStatus;
  }

  onlineStatusChanged(callback: (online: boolean) => void): void {
    this.onlineCallbacks.push(callback);
  }

  // Method pour simuler changement de statut (à remplacer par NetInfo)
  private updateOnlineStatus(online: boolean) {
    if (this.onlineStatus !== online) {
      this.onlineStatus = online;
      this.onlineCallbacks.forEach(callback => callback(online));
    }
  }
}

// ===== FACTORY POUR CREER LE DATA ENGINE MOBILE =====

export function createMobileDataEngine(apiUrl?: string): DataEngine {
  const storageAdapter = new AsyncStorageAdapter();
  const networkAdapter = new ReactNativeNetworkAdapter(apiUrl);
  
  return new DataEngine(storageAdapter, networkAdapter);
}

// ===== CONSTANTS MOBILES =====

export const MOBILE_CONFIG = {
  API_URL: 'http://10.0.2.2:3001', // URL pour émulateur Android (localhost de l'host)
  API_URL_IOS: 'http://localhost:3001', // URL pour simulateur iOS
  STORAGE_PREFIX: 'gestion_chantier_',
  CACHE_TTL: 300000, // 5 minutes
} as const;

// Helper pour obtenir l'URL API selon la plateforme
export const getApiUrlForPlatform = (): string => {
  // TODO: Détecter la plateforme et retourner l'URL appropriée
  // Pour l'instant, utilise une URL générique
  return MOBILE_CONFIG.API_URL;
};