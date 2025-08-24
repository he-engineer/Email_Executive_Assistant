import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User as GoogleUser } from '@react-native-google-signin/google-signin';
import AuthService from '../services/AuthService';
import { GoogleAccount } from '../types';

interface AuthContextType {
  user: GoogleUser | null;
  accounts: GoogleAccount[];
  isLoading: boolean;
  isAuthenticated: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshAccounts: () => Promise<void>;
  setPrimaryAccount: (accountId: string) => Promise<void>;
  removeAccount: (accountId: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<GoogleUser | null>(null);
  const [accounts, setAccounts] = useState<GoogleAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const refreshAccounts = async () => {
    try {
      const accountsList = await AuthService.getAccounts();
      setAccounts(accountsList);
    } catch (error) {
      console.error('Error refreshing accounts:', error);
    }
  };

  const checkAuthStatus = async () => {
    try {
      setIsLoading(true);
      const signedIn = await AuthService.isSignedIn();
      
      if (signedIn) {
        const currentUser = await AuthService.getCurrentUser();
        setUser(currentUser);
        setIsAuthenticated(true);
        await refreshAccounts();
      } else {
        setUser(null);
        setIsAuthenticated(false);
        setAccounts([]);
      }
    } catch (error) {
      console.error('Auth check error:', error);
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  const signIn = async () => {
    try {
      setIsLoading(true);
      const account = await AuthService.signIn();
      const currentUser = await AuthService.getCurrentUser();
      
      setUser(currentUser);
      setIsAuthenticated(true);
      await refreshAccounts();
    } catch (error) {
      console.error('Sign in error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setIsLoading(true);
      await AuthService.signOut();
      setUser(null);
      setIsAuthenticated(false);
      setAccounts([]);
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const setPrimaryAccount = async (accountId: string) => {
    try {
      await AuthService.setPrimaryAccount(accountId);
      await refreshAccounts();
    } catch (error) {
      console.error('Error setting primary account:', error);
      throw error;
    }
  };

  const removeAccount = async (accountId: string) => {
    try {
      await AuthService.removeAccount(accountId);
      await refreshAccounts();
    } catch (error) {
      console.error('Error removing account:', error);
      throw error;
    }
  };

  useEffect(() => {
    // Configure AuthService with your web client ID
    // You'll need to replace this with your actual Google OAuth web client ID
    AuthService.configure('YOUR_GOOGLE_WEB_CLIENT_ID');
    checkAuthStatus();
  }, []);

  const value: AuthContextType = {
    user,
    accounts,
    isLoading,
    isAuthenticated,
    signIn,
    signOut,
    refreshAccounts,
    setPrimaryAccount,
    removeAccount,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};