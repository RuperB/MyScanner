import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  AppSettings,
  GoogleUserProfile,
  ScannedDocument,
  ScannedPage,
} from '../types';
import { googleAuthService } from '../services/googleAuthService';
import { storageService } from '../services/storageService';

interface AppContextType {
  // Settings
  settings: AppSettings;
  updateSettings: (newSettings: Partial<AppSettings>) => Promise<void>;

  // Auth
  userProfile: GoogleUserProfile | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  loginWithGoogle: (customClientId?: string) => Promise<void>;
  loginWithManualToken: (token: string) => Promise<void>;
  logout: () => Promise<void>;
  getFreshAccessToken: (force?: boolean) => Promise<string | null>;

  // Active Scan Session
  activePages: ScannedPage[];
  addScannedPage: (page: ScannedPage) => void;
  updateScannedPage: (page: ScannedPage) => void;
  removeScannedPage: (pageId: string) => void;
  reorderScannedPages: (pages: ScannedPage[]) => void;
  clearActiveSession: () => void;

  // Documents History
  documents: ScannedDocument[];
  saveScannedDocument: (doc: ScannedDocument) => Promise<void>;
  deleteScannedDocument: (docId: string) => Promise<void>;
  refreshDocuments: () => Promise<void>;

  // App Global State
  isLoading: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<AppSettings>({
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
  });

  const [userProfile, setUserProfile] = useState<GoogleUserProfile | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [activePages, setActivePages] = useState<ScannedPage[]>([]);
  const [documents, setDocuments] = useState<ScannedDocument[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Load initial persistent state & validate session
  useEffect(() => {
    async function initApp() {
      try {
        setIsLoading(true);
        const [savedSettings, savedTokens, savedProfile, savedDocs] = await Promise.all([
          storageService.getSettings(),
          storageService.getAuthTokens(),
          storageService.getUserProfile(),
          storageService.getDocuments(),
        ]);

        setSettings(savedSettings);

        if (savedTokens?.accessToken) {
          setAccessToken(savedTokens.accessToken);
          // Try background refresh if expired or near expiration
          googleAuthService.getValidAccessToken().then((freshToken) => {
            if (freshToken) {
              setAccessToken(freshToken);
            }
          });
        }

        if (savedProfile) {
          setUserProfile(savedProfile);
        }

        setDocuments(savedDocs);
      } catch (error) {
        console.error('Error initializing AppContext:', error);
      } finally {
        setIsLoading(false);
      }
    }

    initApp();
  }, []);

  const updateSettings = async (newSettings: Partial<AppSettings>) => {
    const updated = await storageService.saveSettings(newSettings);
    setSettings(updated);
  };

  const loginWithGoogle = async (customClientId?: string) => {
    const { tokens, profile } = await googleAuthService.loginWithGoogleOAuth(customClientId);
    setAccessToken(tokens.accessToken);
    setUserProfile(profile);
  };

  const loginWithManualToken = async (token: string) => {
    const { tokens, profile } = await googleAuthService.setManualAccessToken(token);
    setAccessToken(tokens.accessToken);
    setUserProfile(profile);
  };

  const logout = async () => {
    await googleAuthService.logout();
    setAccessToken(null);
    setUserProfile(null);
  };

  const getFreshAccessToken = async (force: boolean = false) => {
    const token = await googleAuthService.getValidAccessToken(force);
    if (token) {
      setAccessToken(token);
    }
    return token;
  };

  // Active Scan Session
  const addScannedPage = (page: ScannedPage) => {
    setActivePages((prev) => [...prev, page]);
  };

  const updateScannedPage = (page: ScannedPage) => {
    setActivePages((prev) => prev.map((p) => (p.id === page.id ? page : p)));
  };

  const removeScannedPage = (pageId: string) => {
    setActivePages((prev) => prev.filter((p) => p.id !== pageId));
  };

  const reorderScannedPages = (pages: ScannedPage[]) => {
    setActivePages(pages);
  };

  const clearActiveSession = () => {
    setActivePages([]);
  };

  // History & Documents
  const saveScannedDocument = async (doc: ScannedDocument) => {
    await storageService.saveDocument(doc);
    const updated = await storageService.getDocuments();
    setDocuments(updated);
  };

  const deleteScannedDocument = async (docId: string) => {
    await storageService.deleteDocument(docId);
    const updated = await storageService.getDocuments();
    setDocuments(updated);
  };

  const refreshDocuments = async () => {
    const updated = await storageService.getDocuments();
    setDocuments(updated);
  };

  return (
    <AppContext.Provider
      value={{
        settings,
        updateSettings,
        userProfile,
        accessToken,
        isAuthenticated: !!accessToken,
        loginWithGoogle,
        loginWithManualToken,
        logout,
        getFreshAccessToken,
        activePages,
        addScannedPage,
        updateScannedPage,
        removeScannedPage,
        reorderScannedPages,
        clearActiveSession,
        documents,
        saveScannedDocument,
        deleteScannedDocument,
        refreshDocuments,
        isLoading,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export function useApp(): AppContextType {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp debe usarse dentro de un AppProvider');
  }
  return context;
}
