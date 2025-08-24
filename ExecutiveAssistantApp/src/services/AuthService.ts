import * as AuthSession from 'expo-auth-session';
import * as Crypto from 'expo-crypto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GoogleAccount } from '../types';

const GOOGLE_ACCOUNTS_KEY = 'google_accounts';
const PRIMARY_ACCOUNT_KEY = 'primary_account';

const discovery = {
  authorizationEndpoint: 'https://accounts.google.com/oauth/authorize',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
  revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
};

class AuthService {
  private clientId: string = '';
  private isConfigured = false;

  configure(webClientId: string) {
    this.clientId = webClientId;
    this.isConfigured = true;
  }

  async signIn(): Promise<GoogleAccount> {
    try {
      if (!this.isConfigured || !this.clientId) {
        throw new Error('AuthService not configured. Call configure() first.');
      }

      const redirectUri = AuthSession.makeRedirectUri({
        useProxy: true,
      });

      const codeChallenge = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        Math.random().toString(36).substring(2, 15),
        { encoding: Crypto.CryptoEncoding.BASE64URL }
      );

      const request = new AuthSession.AuthRequest({
        clientId: this.clientId,
        scopes: [
          'openid',
          'profile',
          'email',
          'https://www.googleapis.com/auth/gmail.readonly',
          'https://www.googleapis.com/auth/gmail.compose',
          'https://www.googleapis.com/auth/calendar.readonly',
        ],
        responseType: AuthSession.ResponseType.Code,
        redirectUri,
        codeChallenge,
        codeChallengeMethod: AuthSession.CodeChallengeMethod.S256,
      });

      const result = await request.promptAsync(discovery, {
        useProxy: true,
      });

      if (result.type === 'success') {
        const tokenResult = await AuthSession.exchangeCodeAsync(
          {
            clientId: this.clientId,
            code: result.params.code,
            redirectUri,
            codeVerifier: codeChallenge,
          },
          discovery
        );

        // Get user info
        const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
          headers: { Authorization: `Bearer ${tokenResult.accessToken}` },
        });
        const userInfo = await userInfoResponse.json();

        const account: GoogleAccount = {
          id: userInfo.id,
          email: userInfo.email,
          name: userInfo.name || '',
          isPrimary: false,
        };

        // Save account and tokens
        await this.saveAccount(account);
        await AsyncStorage.setItem(`tokens_${account.id}`, JSON.stringify(tokenResult));
        
        return account;
      } else {
        throw new Error('Sign in cancelled or failed');
      }
    } catch (error: any) {
      console.error('Sign in error:', error);
      throw new Error(error.message || 'Unknown error occurred');
    }
  }

  async signOut(): Promise<void> {
    try {
      const accounts = await this.getAccounts();
      // Remove all stored tokens
      for (const account of accounts) {
        await AsyncStorage.removeItem(`tokens_${account.id}`);
      }
      
      await AsyncStorage.removeItem(GOOGLE_ACCOUNTS_KEY);
      await AsyncStorage.removeItem(PRIMARY_ACCOUNT_KEY);
    } catch (error) {
      console.error('Sign out error:', error);
    }
  }

  async getCurrentUser(): Promise<GoogleAccount | null> {
    try {
      return await this.getPrimaryAccount();
    } catch (error) {
      return null;
    }
  }

  async isSignedIn(): Promise<boolean> {
    try {
      const accounts = await this.getAccounts();
      return accounts.length > 0;
    } catch (error) {
      return false;
    }
  }

  async getAccounts(): Promise<GoogleAccount[]> {
    try {
      const accountsData = await AsyncStorage.getItem(GOOGLE_ACCOUNTS_KEY);
      return accountsData ? JSON.parse(accountsData) : [];
    } catch (error) {
      return [];
    }
  }

  async saveAccount(account: GoogleAccount): Promise<void> {
    try {
      const accounts = await this.getAccounts();
      const existingIndex = accounts.findIndex(acc => acc.id === account.id);
      
      if (existingIndex >= 0) {
        accounts[existingIndex] = account;
      } else {
        accounts.push(account);
        // If this is the first account, make it primary
        if (accounts.length === 1) {
          account.isPrimary = true;
          await this.setPrimaryAccount(account.id);
        }
      }
      
      await AsyncStorage.setItem(GOOGLE_ACCOUNTS_KEY, JSON.stringify(accounts));
    } catch (error) {
      console.error('Error saving account:', error);
    }
  }

  async setPrimaryAccount(accountId: string): Promise<void> {
    try {
      const accounts = await this.getAccounts();
      const updatedAccounts = accounts.map(acc => ({
        ...acc,
        isPrimary: acc.id === accountId,
      }));
      
      await AsyncStorage.setItem(GOOGLE_ACCOUNTS_KEY, JSON.stringify(updatedAccounts));
      await AsyncStorage.setItem(PRIMARY_ACCOUNT_KEY, accountId);
    } catch (error) {
      console.error('Error setting primary account:', error);
    }
  }

  async getPrimaryAccount(): Promise<GoogleAccount | null> {
    try {
      const accounts = await this.getAccounts();
      return accounts.find(acc => acc.isPrimary) || null;
    } catch (error) {
      return null;
    }
  }

  async removeAccount(accountId: string): Promise<void> {
    try {
      const accounts = await this.getAccounts();
      const filteredAccounts = accounts.filter(acc => acc.id !== accountId);
      
      // If removed account was primary, make first remaining account primary
      if (filteredAccounts.length > 0) {
        const wasPrimary = accounts.find(acc => acc.id === accountId)?.isPrimary;
        if (wasPrimary) {
          filteredAccounts[0].isPrimary = true;
          await AsyncStorage.setItem(PRIMARY_ACCOUNT_KEY, filteredAccounts[0].id);
        }
      } else {
        await AsyncStorage.removeItem(PRIMARY_ACCOUNT_KEY);
      }
      
      await AsyncStorage.setItem(GOOGLE_ACCOUNTS_KEY, JSON.stringify(filteredAccounts));
    } catch (error) {
      console.error('Error removing account:', error);
    }
  }

  async getAccessToken(): Promise<string | null> {
    try {
      const primaryAccount = await this.getPrimaryAccount();
      if (!primaryAccount) return null;
      
      const tokensData = await AsyncStorage.getItem(`tokens_${primaryAccount.id}`);
      if (!tokensData) return null;
      
      const tokens = JSON.parse(tokensData);
      
      // Check if token is expired and refresh if needed
      if (tokens.expiresIn && Date.now() > tokens.issuedAt + tokens.expiresIn * 1000) {
        if (tokens.refreshToken) {
          const refreshedTokens = await AuthSession.refreshAsync(
            {
              clientId: this.clientId,
              refreshToken: tokens.refreshToken,
            },
            discovery
          );
          
          await AsyncStorage.setItem(`tokens_${primaryAccount.id}`, JSON.stringify({
            ...refreshedTokens,
            issuedAt: Date.now(),
          }));
          
          return refreshedTokens.accessToken;
        }
        return null;
      }
      
      return tokens.accessToken;
    } catch (error) {
      console.error('Error getting access token:', error);
      return null;
    }
  }
}

export default new AuthService();