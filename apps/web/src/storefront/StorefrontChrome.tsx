/**
 * @fileoverview Shared storefront chrome that renders either the current rewrite shell or the legacy-themed parchment layout.
 */
import { useMemo, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { useStorefrontTheme } from './StorefrontThemeContext';
import { LegacyCartDrawer } from './components/LegacyCartDrawer';
import { LegacyStorefrontHeader } from './components/LegacyStorefrontHeader';
import { RewriteStorefrontHeader } from './components/RewriteStorefrontHeader';

function getStorefrontPageClass(pathname: string) {
  if (pathname === '/' || pathname === '/products') return 'page-catalog';
  if (pathname.startsWith('/products/')) return 'page-product-detail';
  if (pathname.startsWith('/cart')) return 'page-cart';
  if (pathname.startsWith('/checkout')) return 'page-checkout';
  if (pathname.startsWith('/wishlist')) return 'page-wishlist';
  if (pathname.startsWith('/library')) return 'page-library';
  if (pathname.startsWith('/login')) return 'page-account';
  return 'page-generic';
}

export function StorefrontChrome({ children }: { children: ReactNode }) {
  const location = useLocation();
  const { theme } = useStorefrontTheme();

  const isAdminRoute = location.pathname.startsWith('/admin');
  const isStorefrontRoute = !isAdminRoute;
  const useLegacyShell = theme === 'legacy' && isStorefrontRoute;

  const pageClass = useMemo(() => getStorefrontPageClass(location.pathname), [location.pathname]);

  if (!useLegacyShell) {
    return (
      <div className={`app-shell storefront-theme-root theme-${theme} ${pageClass}`} data-storefront-theme={theme}>
        <RewriteStorefrontHeader />
        <main className="container page-content">{children}</main>
      </div>
    );
  }

  return (
    <div className={`app-shell storefront-theme-root legacy-theme-shell theme-${theme} ${pageClass}`} data-storefront-theme={theme}>
      <LegacyStorefrontHeader />

      <div className="container legacy-shell-frame">
        <main className="legacy-shell-main page-content">{children}</main>
        <LegacyCartDrawer />
      </div>

      <footer className="legacy-footer">
        <div className="container legacy-footer-inner" />
      </footer>
    </div>
  );
}
