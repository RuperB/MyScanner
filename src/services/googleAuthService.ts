import { Platform } from 'react-native';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { GoogleAuthTokens, GoogleUserProfile } from '../types';
import { storageService } from './storageService';

WebBrowser.maybeCompleteAuthSession();

// Google OAuth Endpoints
const GOOGLE_AUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO_ENDPOINT = 'https://www.googleapis.com/oauth2/v2/userinfo';

export const GOOGLE_SCOPES = [
  'openid',
  'profile',
  'email',
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/drive.file',
];

// Default public OAuth client IDs (loaded from environment or public config)
export const DEFAULT_GOOGLE_CLIENT_IDS = {
  web: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB || '496114489346-7g9ko7dpntknd0rucnrfvda89af067m9.apps.googleusercontent.com',
  ios: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS || '496114489346-8781kjc9vstk9rgidn26oe8r3n0ftt94.apps.googleusercontent.com',
  android: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID || '496114489346-8besnte5oqemdkqr5vasr1oqtdfic750.apps.googleusercontent.com',
};

export const DEFAULT_GOOGLE_CLIENT_SECRET = '';

export function cleanGoogleToken(rawToken: string): string {
  let token = rawToken.trim();
  // If user pasted `"access_token": "ya29..."`
  if (token.includes('"access_token"')) {
    const match = token.match(/"access_token"\s*:\s*"([^"]+)"/);
    if (match && match[1]) {
      token = match[1];
    }
  }
  // Remove surrounding quotes, double quotes, and trailing commas
  token = token.replace(/^["']+|["',]+$/g, '');
  // Remove "Bearer " prefix if user included it
  token = token.replace(/^Bearer\s+/i, '');
  return token.trim();
}

export const googleAuthService = {
  getRedirectUri(clientId?: string): string {
    if ((Platform.OS === 'ios' || Platform.OS === 'android') && clientId && clientId.includes('.apps.googleusercontent.com')) {
      const reversed = 'com.googleusercontent.apps.' + clientId.replace('.apps.googleusercontent.com', '');
      return `${reversed}:/oauthredirect`;
    }
    return AuthSession.makeRedirectUri({
      scheme: 'myscanner',
    });
  },

  /**
   * Performs interactive Google Sign-In with OAuth 2.0 (Requesting offline access for Refresh Token)
   */
  async loginWithGoogleOAuth(customClientId?: string): Promise<{ tokens: GoogleAuthTokens; profile: GoogleUserProfile }> {
    const settings = await storageService.getSettings();
    const defaultForPlatform =
      Platform.OS === 'ios'
        ? DEFAULT_GOOGLE_CLIENT_IDS.ios
        : Platform.OS === 'android'
        ? DEFAULT_GOOGLE_CLIENT_IDS.android
        : DEFAULT_GOOGLE_CLIENT_IDS.web;
    const clientId = (
      customClientId ||
      (Platform.OS === 'ios'
        ? settings.googleClientIdIos
        : Platform.OS === 'android'
        ? settings.googleClientIdAndroid
        : settings.googleClientIdWeb) ||
      defaultForPlatform ||
      DEFAULT_GOOGLE_CLIENT_IDS.web ||
      ''
    ).trim();

    if (!clientId) {
      throw new Error(
        'Aún no has configurado tu Google Client ID. Puedes vincular tu cuenta pegando tu Token en "Opciones avanzadas / Token manual" o continuar en Modo Local.'
      );
    }

    const redirectUri = this.getRedirectUri(clientId);

    const authUrl =
      `${GOOGLE_AUTH_ENDPOINT}?` +
      `client_id=${encodeURIComponent(clientId)}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `response_type=code&` +
      `scope=${encodeURIComponent(GOOGLE_SCOPES.join(' '))}&` +
      `access_type=offline&` +
      `prompt=consent`;

    const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri);

    if (result.type === 'success' && result.url) {
      // Extract 'code' parameter from response URL
      const match = result.url.match(/[?&]code=([^&#]+)/);
      const authCode = match ? decodeURIComponent(match[1]) : null;

      if (!authCode) {
        throw new Error('No se recibió el código de autorización de Google.');
      }

      // Exchange authorization code for tokens (access_token + refresh_token)
      const tokenBody: Record<string, string> = {
        code: authCode,
        client_id: clientId,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      };
      // Native iOS and Android clients are public OAuth clients (no client_secret needed)
      if (Platform.OS !== 'ios' && Platform.OS !== 'android' && DEFAULT_GOOGLE_CLIENT_SECRET) {
        tokenBody.client_secret = DEFAULT_GOOGLE_CLIENT_SECRET;
      }

      const tokenRes = await fetch(GOOGLE_TOKEN_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(tokenBody).toString(),
      });

      if (!tokenRes.ok) {
        const errText = await tokenRes.text();
        throw new Error(`Error al intercambiar código por tokens (${tokenRes.status}): ${errText}`);
      }

      const tokenData = await tokenRes.json();
      const tokens: GoogleAuthTokens = {
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        expiresIn: tokenData.expires_in || 3600,
        tokenType: tokenData.token_type || 'Bearer',
        issuedAt: Date.now(),
      };

      await storageService.saveAuthTokens(tokens);
      const profile = await this.fetchUserProfile(tokens.accessToken);
      return { tokens, profile };
    } else if (result.type === 'cancel' || result.type === 'dismiss') {
      throw new Error('Inicio de sesión cancelado por el usuario.');
    } else {
      throw new Error('No se pudo completar la autenticación con Google.');
    }
  },

  /**
   * Refreshes the Access Token in the background using the stored Refresh Token
   */
  async refreshAccessToken(): Promise<string | null> {
    const tokens = await storageService.getAuthTokens();
    if (!tokens || !tokens.refreshToken) {
      return null;
    }

    const settings = await storageService.getSettings();
    const defaultForPlatform =
      Platform.OS === 'ios'
        ? DEFAULT_GOOGLE_CLIENT_IDS.ios
        : Platform.OS === 'android'
        ? DEFAULT_GOOGLE_CLIENT_IDS.android
        : DEFAULT_GOOGLE_CLIENT_IDS.web;
    const clientId = (
      (Platform.OS === 'ios'
        ? settings.googleClientIdIos
        : Platform.OS === 'android'
        ? settings.googleClientIdAndroid
        : settings.googleClientIdWeb) ||
      defaultForPlatform ||
      DEFAULT_GOOGLE_CLIENT_IDS.web
    );

    try {
      const refreshBody: Record<string, string> = {
        client_id: clientId,
        refresh_token: tokens.refreshToken,
        grant_type: 'refresh_token',
      };
      // Native iOS and Android clients are public OAuth clients (no client_secret needed)
      if (Platform.OS !== 'ios' && Platform.OS !== 'android' && DEFAULT_GOOGLE_CLIENT_SECRET) {
        refreshBody.client_secret = DEFAULT_GOOGLE_CLIENT_SECRET;
      }

      const res = await fetch(GOOGLE_TOKEN_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(refreshBody).toString(),
      });

      if (res.ok) {
        const data = await res.json();
        const updatedTokens: GoogleAuthTokens = {
          ...tokens,
          accessToken: data.access_token,
          expiresIn: data.expires_in || 3600,
          issuedAt: Date.now(),
        };

        await storageService.saveAuthTokens(updatedTokens);
        return updatedTokens.accessToken;
      } else {
        console.warn('Could not refresh Google token:', await res.text());
        return null;
      }
    } catch (error) {
      console.error('Error refreshing Google token:', error);
      return null;
    }
  },

  /**
   * Returns a guaranteed valid access token, auto-refreshing in the background if expired
   */
  async getValidAccessToken(forceRefresh: boolean = false): Promise<string | null> {
    const tokens = await storageService.getAuthTokens();
    if (!tokens || !tokens.accessToken) {
      return null;
    }

    const expiresInMs = (tokens.expiresIn || 3600) * 1000;
    const isExpired = Date.now() > tokens.issuedAt + expiresInMs - 300000; // 5 min margin

    if ((forceRefresh || isExpired) && tokens.refreshToken) {
      const refreshed = await this.refreshAccessToken();
      if (refreshed) return refreshed;
    }

    return cleanGoogleToken(tokens.accessToken);
  },

  async fetchUserProfile(rawAccessToken: string): Promise<GoogleUserProfile> {
    const accessToken = cleanGoogleToken(rawAccessToken);
    try {
      // 1. Try Google Drive v3 about endpoint
      const driveAboutRes = await fetch(
        'https://www.googleapis.com/drive/v3/about?fields=user(displayName,emailAddress,photoLink)',
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      if (driveAboutRes.ok) {
        const driveData = await driveAboutRes.json();
        if (driveData.user) {
          const profile: GoogleUserProfile = {
            id: driveData.user.emailAddress || 'drive_user',
            email: driveData.user.emailAddress || 'Google Drive Conectado',
            name: driveData.user.displayName || driveData.user.emailAddress || 'Usuario Google Drive',
            picture: driveData.user.photoLink,
          };
          await storageService.saveUserProfile(profile);
          return profile;
        }
      }
    } catch (e) {
      console.log('Drive about endpoint error:', e);
    }

    try {
      // 2. Try Userinfo endpoint
      const userInfoRes = await fetch(GOOGLE_USERINFO_ENDPOINT, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (userInfoRes.ok) {
        const data = await userInfoRes.json();
        const profile: GoogleUserProfile = {
          id: data.id || 'user',
          email: data.email || 'Conectado',
          name: data.name || data.email || 'Usuario Google',
          picture: data.picture,
        };
        await storageService.saveUserProfile(profile);
        return profile;
      }
    } catch (e) {
      console.log('Userinfo endpoint error:', e);
    }

    // 3. Fallback generic profile
    const fallbackProfile: GoogleUserProfile = {
      id: 'drive_user_' + Date.now(),
      email: 'Google Drive Activo',
      name: 'Cuenta Google Conectada',
    };
    await storageService.saveUserProfile(fallbackProfile);
    return fallbackProfile;
  },

  async setManualAccessToken(rawToken: string): Promise<{ tokens: GoogleAuthTokens; profile: GoogleUserProfile }> {
    const cleanToken = cleanGoogleToken(rawToken);
    if (!cleanToken) {
      throw new Error('El token de acceso no puede estar vacío.');
    }

    const tokens: GoogleAuthTokens = {
      accessToken: cleanToken,
      issuedAt: Date.now(),
      expiresIn: 3600,
    };

    await storageService.saveAuthTokens(tokens);
    const profile = await this.fetchUserProfile(cleanToken);

    return { tokens, profile };
  },

  async logout(): Promise<void> {
    await storageService.removeAuthTokens();
    await storageService.removeUserProfile();
  },
};
