/**
 * @fileoverview Authentication state provider that keeps the logged-in customer cached across the app.
 */
import React from 'react';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  getPasswordRecoveryPolicy,
  login as loginRequest,
  logout as logoutRequest,
  me as meRequest,
  register as registerRequest,
  resetPassword as resetPasswordRequest,
  updateProfile as updateProfileRequest,
} from '../api/client';
import type {
  AuthUser,
  PasswordRecoveryPolicy,
  PasswordResetPayload,
  ProfileUpdatePayload,
  RegistrationPayload,
} from '../types';

type AuthContextValue = {
  user: AuthUser | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
  recoveryPolicy: PasswordRecoveryPolicy | null;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<AuthUser>;
  register: (payload: RegistrationPayload) => Promise<AuthUser>;
  logout: () => Promise<void>;
  refresh: () => Promise<AuthUser | null>;
  updateProfile: (payload: ProfileUpdatePayload) => Promise<AuthUser>;
  resetPassword: (payload: PasswordResetPayload) => Promise<void>;
  refreshRecoveryPolicy: () => Promise<PasswordRecoveryPolicy | null>;
  clearError: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recoveryPolicy, setRecoveryPolicy] = useState<PasswordRecoveryPolicy | null>(null);

  const refreshRecoveryPolicy = useCallback(async () => {
    try {
      const policy = await getPasswordRecoveryPolicy();
      setRecoveryPolicy(policy);
      return policy;
    } catch {
      setRecoveryPolicy(null);
      return null;
    }
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const currentUser = await meRequest();
      setUser(currentUser);
      return currentUser;
    } catch {
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    void refreshRecoveryPolicy();
  }, [refresh, refreshRecoveryPolicy]);

  const login = useCallback(async (email: string, password: string, rememberMe = false) => {
    setLoading(true);
    setError(null);

    try {
      const loggedInUser = await loginRequest(email, password, rememberMe);
      setUser(loggedInUser);
      return loggedInUser;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed';
      setUser(null);
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const register = useCallback(async (payload: RegistrationPayload) => {
    setLoading(true);
    setError(null);

    try {
      const createdUser = await registerRequest(payload);
      setUser(createdUser);
      return createdUser;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Registration failed';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateProfile = useCallback(async (payload: ProfileUpdatePayload) => {
    setLoading(true);
    setError(null);

    try {
      const updated = await updateProfileRequest(payload);
      setUser(updated);
      return updated;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Profile save failed';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const resetPassword = useCallback(async (payload: PasswordResetPayload) => {
    setLoading(true);
    setError(null);

    try {
      await resetPasswordRequest(payload);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Password reset failed';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      await logoutRequest();
      setUser(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Logout failed';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: user !== null,
      loading,
      error,
      recoveryPolicy,
      login,
      register,
      logout,
      refresh,
      updateProfile,
      resetPassword,
      refreshRecoveryPolicy,
      clearError,
    }),
    [user, loading, error, recoveryPolicy, login, register, logout, refresh, updateProfile, resetPassword, refreshRecoveryPolicy, clearError],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }

  return context;
}
