/**
 * @fileoverview Admin access provider that keeps scoped merchant/admin capability cached for the current signed-in customer.
 */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { getAdminAccess } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import type { AdminAccess, AdminScope } from '../types';

type AdminContextValue = {
  access: AdminAccess | null;
  scope: AdminScope | null;
  loading: boolean;
  isAdmin: boolean;
  error: string | null;
  refresh: (merchantId?: string, configId?: string) => Promise<AdminAccess | null>;
  setScope: (scope: AdminScope | null) => void;
};

const AdminContext = createContext<AdminContextValue | undefined>(undefined);

export function AdminProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, user } = useAuth();
  const [access, setAccess] = useState<AdminAccess | null>(null);
  const [scope, setScope] = useState<AdminScope | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (merchantId?: string, configId?: string) => {
    if (!isAuthenticated || !user) {
      setAccess(null);
      setScope(null);
      setLoading(false);
      return null;
    }

    setLoading(true);
    setError(null);
    try {
      const nextAccess = await getAdminAccess(merchantId, configId);
      setAccess(nextAccess);
      setScope(nextAccess.defaultScope ?? nextAccess.scopes[0] ?? null);
      return nextAccess;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load admin access';
      setError(message);
      setAccess(null);
      setScope(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, user]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo<AdminContextValue>(() => ({
    access,
    scope,
    loading,
    isAdmin: !!access?.isAdmin && (access.scopes?.length ?? 0) > 0,
    error,
    refresh,
    setScope,
  }), [access, scope, loading, error, refresh]);

  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
}

export function useAdmin() {
  const context = useContext(AdminContext);
  if (!context) {
    throw new Error('useAdmin must be used inside AdminProvider');
  }
  return context;
}
