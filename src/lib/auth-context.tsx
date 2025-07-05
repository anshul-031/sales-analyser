'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';

export interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  isEmailVerified: boolean;
}

export interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  register: (data: RegisterData) => Promise<{ success: boolean; message?: string }>;
  logout: () => Promise<void>;
  forgotPassword: (email: string) => Promise<{ success: boolean; message?: string }>;
  resetPassword: (token: string, password: string) => Promise<{ success: boolean; message?: string }>;
  refreshUser: () => Promise<void>;
}

export interface RegisterData {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Check if user is authenticated on mount
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    console.log('[Auth] Checking authentication status...');
    try {
      const response = await fetch('/api/auth/me', {
        credentials: 'include',
      });
      console.log('[Auth] checkAuth response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('[Auth] checkAuth response data:', data);
        if (data.success) {
          setUser(data.user);
          console.log('[Auth] User authenticated:', data.user);
        } else {
          setUser(null); // Explicitly clear user if auth check fails but response is ok
          console.log('[Auth] Auth check failed, user cleared.');
          // Clear invalid cookie
          await clearInvalidCookie();
        }
      } else {
        setUser(null); // Explicitly clear user on non-ok responses (e.g. 401)
        console.log('[Auth] Auth check failed with non-ok response, user cleared.');
        // Clear invalid cookie when authentication fails
        await clearInvalidCookie();
      }
    } catch (error) {
      console.error('[Auth] Auth check error:', error);
      setUser(null); // Also clear user on network errors
      // Clear invalid cookie on network errors too
      await clearInvalidCookie();
    } finally {
      setLoading(false);
      console.log('[Auth] Finished auth check.');
    }
  };

  const clearInvalidCookie = async () => {
    try {
      console.log('[Auth] Clearing invalid authentication cookie...');
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
      console.log('[Auth] Invalid cookie cleared.');
    } catch (error) {
      console.error('[Auth] Error clearing invalid cookie:', error);
    }
  };

  const login = async (email: string, password: string) => {
    console.log('[Auth] Attempting to login with email:', email);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();
      console.log('[Auth] Login response data:', data);
      
      if (data.success) {
        setUser(data.user);
        console.log('[Auth] Login successful for user:', data.user);
        
        // Force a re-check of authentication to ensure consistency
        setTimeout(() => {
          checkAuth();
        }, 100);
        
        return { success: true };
      } else {
        console.log('[Auth] Login failed:', data.message);
        return { success: false, message: data.message };
      }
    } catch (error) {
      console.error('[Auth] Login error:', error);
      return { success: false, message: 'An error occurred while logging in' };
    }
  };

  const register = async (registerData: RegisterData) => {
    console.log('[Auth] Attempting to register with data:', registerData);
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(registerData),
      });

      const data = await response.json();
      console.log('[Auth] Register response data:', data);
      
      if (data.success) {
        console.log('[Auth] Registration successful');
        return { success: true, message: data.message };
      } else {
        console.log('[Auth] Registration failed:', data.message);
        return { success: false, message: data.message };
      }
    } catch (error) {
      console.error('[Auth] Registration error:', error);
      return { success: false, message: 'An error occurred while creating your account' };
    }
  };

  const logout = async () => {
    console.log('[Auth] Logging out user...');
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
      setUser(null);
      console.log('[Auth] User logged out successfully.');
    } catch (error) {
      console.error('[Auth] Logout error:', error);
      setUser(null); // Clear user even if request fails
      console.log('[Auth] User cleared from state despite logout error.');
    }
  };

  const forgotPassword = async (email: string) => {
    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();
      return { success: data.success, message: data.message };
    } catch (error) {
      console.error('Forgot password error:', error);
      return { success: false, message: 'An error occurred while processing your request' };
    }
  };

  const resetPassword = async (token: string, password: string) => {
    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token, password }),
      });

      const data = await response.json();
      return { success: data.success, message: data.message };
    } catch (error) {
      console.error('Reset password error:', error);
      return { success: false, message: 'An error occurred while resetting your password' };
    }
  };

  const refreshUser = async () => {
    await checkAuth();
  };

  const value: AuthContextType = {
    user,
    loading,
    login,
    register,
    logout,
    forgotPassword,
    resetPassword,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
