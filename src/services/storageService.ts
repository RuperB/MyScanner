import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppSettings, GoogleAuthTokens, GoogleUserProfile, ScannedDocument } from '../types';

const STORAGE_KEYS = {
  SETTINGS: '@myscanner_settings_v1',
  AUTH_TOKENS: '@myscanner_google_tokens_v1',
  USER_PROFILE: '@myscanner_user_profile_v1',
  DOCUMENTS: '@myscanner_documents_v1',
};

const DEFAULT_SETTINGS: AppSettings = {
  phoneNumber: '',
  baseFolderName: 'MyScanner_Documents',
  googleClientIdIos: '',
  googleClientIdAndroid: '',
  googleClientIdWeb: '',
  customDocTypes: [],
  autoUploadToDrive: true,
  defaultFilter: 'enhanced',
  compressionQuality: 0.85,
  isFirstLaunch: true,
};

export const storageService = {
  async getSettings(): Promise<AppSettings> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (data) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(data) };
      }
      return DEFAULT_SETTINGS;
    } catch (error) {
      console.error('Error reading settings from storage:', error);
      return DEFAULT_SETTINGS;
    }
  },

  async saveSettings(settings: Partial<AppSettings>): Promise<AppSettings> {
    try {
      const current = await this.getSettings();
      const updated: AppSettings = { ...current, ...settings, isFirstLaunch: false };
      await AsyncStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(updated));
      return updated;
    } catch (error) {
      console.error('Error saving settings to storage:', error);
      throw error;
    }
  },

  async getAuthTokens(): Promise<GoogleAuthTokens | null> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKENS);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Error reading auth tokens from storage:', error);
      return null;
    }
  },

  async saveAuthTokens(tokens: GoogleAuthTokens): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.AUTH_TOKENS, JSON.stringify(tokens));
    } catch (error) {
      console.error('Error saving auth tokens to storage:', error);
      throw error;
    }
  },

  async removeAuthTokens(): Promise<void> {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.AUTH_TOKENS);
    } catch (error) {
      console.error('Error removing auth tokens from storage:', error);
    }
  },

  async getUserProfile(): Promise<GoogleUserProfile | null> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.USER_PROFILE);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Error reading user profile from storage:', error);
      return null;
    }
  },

  async saveUserProfile(profile: GoogleUserProfile): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(profile));
    } catch (error) {
      console.error('Error saving user profile to storage:', error);
      throw error;
    }
  },

  async removeUserProfile(): Promise<void> {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.USER_PROFILE);
    } catch (error) {
      console.error('Error removing user profile from storage:', error);
    }
  },

  async getDocuments(): Promise<ScannedDocument[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.DOCUMENTS);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error reading documents from storage:', error);
      return [];
    }
  },

  async saveDocument(doc: ScannedDocument): Promise<void> {
    try {
      const documents = await this.getDocuments();
      const existingIndex = documents.findIndex((d) => d.id === doc.id);
      if (existingIndex >= 0) {
        documents[existingIndex] = doc;
      } else {
        documents.unshift(doc);
      }
      await AsyncStorage.setItem(STORAGE_KEYS.DOCUMENTS, JSON.stringify(documents));
    } catch (error) {
      console.error('Error saving document to storage:', error);
      throw error;
    }
  },

  async deleteDocument(id: string): Promise<void> {
    try {
      const documents = await this.getDocuments();
      const filtered = documents.filter((d) => d.id !== id);
      await AsyncStorage.setItem(STORAGE_KEYS.DOCUMENTS, JSON.stringify(filtered));
    } catch (error) {
      console.error('Error deleting document from storage:', error);
      throw error;
    }
  },

  async clearAll(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.SETTINGS,
        STORAGE_KEYS.AUTH_TOKENS,
        STORAGE_KEYS.USER_PROFILE,
        STORAGE_KEYS.DOCUMENTS,
      ]);
    } catch (error) {
      console.error('Error clearing storage:', error);
    }
  },
};
