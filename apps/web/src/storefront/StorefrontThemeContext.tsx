/**
 * @fileoverview Backend-driven storefront theme provider so the API can choose between rewrite and legacy templates.
 */
import React from 'react';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { getStorefrontTheme } from '../api/client';
import type { StorefrontThemeConfig, StorefrontThemeName } from '../types';

type StorefrontThemeContextValue = {
  config: StorefrontThemeConfig | null;
  theme: StorefrontThemeName;
  loading: boolean;
  refreshTheme: (merchantId?: string, configId?: string) => Promise<StorefrontThemeConfig | null>;
};

const StorefrontThemeContext = createContext<StorefrontThemeContextValue | undefined>(undefined);

export function StorefrontThemeProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<StorefrontThemeConfig | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshTheme = useCallback(async (merchantId?: string, configId?: string) => {
    setLoading(true);
    try {
      const nextConfig = await getStorefrontTheme(merchantId, configId);
      setConfig(nextConfig);
      return nextConfig;
    } catch {
      const fallback: StorefrontThemeConfig = {
        merchantId: merchantId ?? 'cg',
        configId: configId ?? 'default',
        theme: 'rewrite',
        rawTemplateStyle: 'rewrite',
        availableThemes: ['rewrite', 'legacy'],
        source: 'frontend-fallback',
      };
      setConfig(fallback);
      return fallback;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshTheme();
  }, [refreshTheme]);

  const value = useMemo<StorefrontThemeContextValue>(() => ({
    config,
    theme: config?.theme ?? 'rewrite',
    loading,
    refreshTheme,
  }), [config, loading, refreshTheme]);

  return <StorefrontThemeContext.Provider value={value}>{children}</StorefrontThemeContext.Provider>;
}

export function useStorefrontTheme() {
  const context = useContext(StorefrontThemeContext);
  if (!context) {
    throw new Error('useStorefrontTheme must be used inside StorefrontThemeProvider');
  }

  return context;
}
