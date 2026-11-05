import React, { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../services/api';

interface AuthContextType {
  token: string | null;
  isAuthenticated: boolean;
  isAuthRequired: boolean;
  isLoading: boolean;
  login: (token: string) => Promise<boolean>;
  logout: () => void;
  authError: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('sentinel_admin_token'));
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isAuthRequired, setIsAuthRequired] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    checkInitialAuth();
  }, []);

  const checkInitialAuth = async () => {
    setIsLoading(true);
    setAuthError(null);
    try {
      const status = await api.getAuthStatus();
      setIsAuthRequired(status.auth_required);

      const savedToken = localStorage.getItem('sentinel_admin_token');
      if (savedToken) {
        try {
          await api.verifyToken();
          setToken(savedToken);
          setIsAuthenticated(true);
        } catch {
          // Saved token is invalid or expired
          localStorage.removeItem('sentinel_admin_token');
          setToken(null);
          setIsAuthenticated(false);
        }
      } else {
        setIsAuthenticated(!status.auth_required);
      }
    } catch (err: any) {
      console.error('Failed to query auth status:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (newToken: string): Promise<boolean> => {
    setIsLoading(true);
    setAuthError(null);
    try {
      localStorage.setItem('sentinel_admin_token', newToken.trim());
      await api.verifyToken();
      setToken(newToken.trim());
      setIsAuthenticated(true);
      return true;
    } catch (err: any) {
      localStorage.removeItem('sentinel_admin_token');
      setToken(null);
      setIsAuthenticated(false);
      setAuthError(err.detail || 'Invalid admin token');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('sentinel_admin_token');
    setToken(null);
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider
      value={{
        token,
        isAuthenticated,
        isAuthRequired,
        isLoading,
        login,
        logout,
        authError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
