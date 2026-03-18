/**
 * @fileoverview Shared storefront chrome that renders either the current rewrite shell or the legacy-themed parchment layout.
 */
import React from 'react';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { getStoredCatalogHref, buildCatalogHref, catalogViewStateFromSearchParams } from '../catalog/catalogState';
import { useCatalog } from '../catalog/CatalogContext';
import { useCart } from '../cart/CartContext';
import { useAuth } from '../auth/AuthContext';
import { useStorefrontTheme } from './StorefrontThemeContext';
import type { CatalogCategory } from '../types';

function SessionStatus() {
  const { loading: authLoading, isAuthenticated, user } = useAuth();
  const { loading: themeLoading, theme } = useStorefrontTheme();

  if (authLoading || themeLoading) {
    return <span className="session-pill muted-pill">Loading session…</span>;
  }

  const themeLabel = theme === 'legacy' ? 'Legacy theme' : 'Rewrite theme';
  const userLabel = isAuthenticated && user ? `Signed in as ${user.name || user.email}` : 'Guest session';
  return <span className="session-pill">{userLabel} · {themeLabel}</span>;
}

function CartLinkLabel() {
  const { summary, loading } = useCart();
  if (loading) {
    return <>Cart</>;
  }

  return <>Cart{summary ? ` (${summary.itemCount})` : ''}</>;
}

function TopNav() {
  const productsHref = getStoredCatalogHref();
  return (
    <nav className="storefront-topnav" aria-label="Primary storefront navigation">
      <NavLink to={productsHref}>Products</NavLink>
      <NavLink to="/cart"><CartLinkLabel /></NavLink>
      <NavLink to="/checkout">Checkout</NavLink>
      <NavLink to="/wishlist">Wishlist</NavLink>
      <NavLink to="/library">Library</NavLink>
      <NavLink to="/login">Account</NavLink>
      <NavLink to="/admin/orders">Admin</NavLink>
    </nav>
  );
}

function LegacyLeftRail({ categories, onNavigate }: { categories: CatalogCategory[]; onNavigate: () => void }) {
  const location = useLocation();
  const currentState = catalogViewStateFromSearchParams(new URLSearchParams(location.search));
  const featuredCategories = categories.slice(0, 12);

  return (
    <div className="legacy-rail-blocks">
      <section className="legacy-rail-block">
        <h3>Storefront</h3>
        <div className="legacy-rail-links">
          <NavLink to={getStoredCatalogHref()} onClick={onNavigate}>All products</NavLink>
          <NavLink to="/wishlist" onClick={onNavigate}>Saved wishlist</NavLink>
          <NavLink to="/library" onClick={onNavigate}>Digital library</NavLink>
          <NavLink to="/checkout" onClick={onNavigate}>Checkout flow</NavLink>
        </div>
      </section>
      <section className="legacy-rail-block">
        <h3>Categories</h3>
        <div className="legacy-category-links">
          {featuredCategories.map((category) => {
            const nextHref = buildCatalogHref({
              ...currentState,
              q: '',
              category: category.name,
              subCategory: '',
              subCategory2: '',
              page: 1,
            });
            const isActive = currentState.category === category.name;
            return (
              <NavLink key={category.name} to={nextHref} onClick={onNavigate} className={isActive ? 'is-active' : undefined}>
                <span>{category.name}</span>
                <small>{category.productCount}</small>
              </NavLink>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function LegacyRightRail() {
  const { summary } = useCart();
  return (
    <div className="legacy-rail-blocks">
      <section className="legacy-rail-block legacy-icon-rail" aria-label="Legacy storefront shortcuts">
        <NavLink to="/" className="legacy-icon-link legacy-icon-link-home" aria-label="Home">
          <span className="sr-only">Home</span>
        </NavLink>
        <NavLink to="/login" className="legacy-icon-link legacy-icon-link-account" aria-label="My account">
          <span className="sr-only">My account</span>
        </NavLink>
        <NavLink to="/cart" className="legacy-icon-link legacy-icon-link-cart" aria-label="View cart">
          <span className="sr-only">View cart</span>
        </NavLink>
        <NavLink to="/checkout" className="legacy-icon-link legacy-icon-link-checkout" aria-label="Checkout">
          <span className="sr-only">Checkout</span>
        </NavLink>
      </section>
      <section className="legacy-rail-block legacy-utility-cta">
        <h3>Storefront status</h3>
        <p>The admin/config selector now controls whether shoppers see the rewrite shell or this legacy storefront theme.</p>
        <NavLink to="/cart" className="button-link legacy-image-action legacy-image-action-viewcart">View cart</NavLink>
      </section>
      <section className="legacy-rail-block">
        <h3>Cart snapshot</h3>
        <dl className="summary-list compact-summary-list">
          <div><dt>Items</dt><dd>{summary?.itemCount ?? 0}</dd></div>
          <div><dt>Unique</dt><dd>{summary?.uniqueItemCount ?? 0}</dd></div>
          <div><dt>Subtotal</dt><dd>{summary?.subtotalFormatted ?? '0.00'}</dd></div>
        </dl>
      </section>
    </div>
  );
}

export function StorefrontChrome({ children }: { children: ReactNode }) {
  const location = useLocation();
  const { theme } = useStorefrontTheme();
  const { getCategories } = useCatalog();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [categories, setCategories] = useState<CatalogCategory[]>([]);

  const isAdminRoute = location.pathname.startsWith('/admin');
  const isStorefrontRoute = !isAdminRoute;
  const useLegacyShell = theme === 'legacy' && isStorefrontRoute;

  const pageClass = useMemo(() => {
    if (location.pathname === '/' || location.pathname === '/products') return 'page-catalog';
    if (location.pathname.startsWith('/products/')) return 'page-product-detail';
    if (location.pathname.startsWith('/cart')) return 'page-cart';
    if (location.pathname.startsWith('/checkout')) return 'page-checkout';
    if (location.pathname.startsWith('/wishlist')) return 'page-wishlist';
    if (location.pathname.startsWith('/library')) return 'page-library';
    if (location.pathname.startsWith('/login')) return 'page-account';
    return 'page-generic';
  }, [location.pathname]);

  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname, location.search]);

  useEffect(() => {
    if (!useLegacyShell) {
      return;
    }

    let cancelled = false;
    void getCategories().then((result) => {
      if (!cancelled) {
        setCategories(result.categories ?? []);
      }
    }).catch(() => {
      if (!cancelled) {
        setCategories([]);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [getCategories, useLegacyShell]);

  if (!useLegacyShell) {
    return (
      <div className={`app-shell storefront-theme-root theme-${theme} ${pageClass}`} data-storefront-theme={theme}>
        <header className="topbar">
          <div className="container topbar-inner">
            <h1 className="brand">ColumbiaGames Rewrite</h1>
            <div className="topbar-meta">
              <SessionStatus />
              <TopNav />
            </div>
          </div>
        </header>
        <main className="container page-content">{children}</main>
      </div>
    );
  }

  return (
    <div className={`app-shell storefront-theme-root legacy-theme-shell theme-${theme} ${pageClass}`} data-storefront-theme={theme}>
      <header className="topbar legacy-topbar">
        <div className="container topbar-inner legacy-topbar-inner">
          <div className="legacy-branding">
            <button type="button" className="legacy-drawer-toggle" onClick={() => setDrawerOpen((current) => !current)} aria-expanded={drawerOpen} aria-controls="legacy-left-rail">
              ☰
            </button>
            <div>
              <div className="brand brand-legacy">Columbia Games</div>
              <div className="legacy-brand-subtitle">Legacy storefront theme · selected from admin/config</div>
            </div>
          </div>
          <div className="topbar-meta legacy-topbar-meta">
            <SessionStatus />
            <TopNav />
          </div>
        </div>
      </header>

      <div className="container legacy-shell-frame">
        <div className={`legacy-shell-backdrop${drawerOpen ? ' is-drawer-open' : ''}`} onClick={() => setDrawerOpen(false)} />
        <aside id="legacy-left-rail" className={`legacy-shell-left${drawerOpen ? ' is-open' : ''}`}>
          <LegacyLeftRail categories={categories} onNavigate={() => setDrawerOpen(false)} />
        </aside>
        <main className="legacy-shell-main page-content">{children}</main>
        <aside className="legacy-shell-right">
          <LegacyRightRail />
        </aside>
      </div>

      <footer className="legacy-footer">
        <div className="container legacy-footer-inner">
          <span>Rewrite remains available as the current template.</span>
          <span>This full papyrus-and-icons design is the Legacy storefront theme.</span>
        </div>
      </footer>
    </div>
  );
}
