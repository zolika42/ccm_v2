/**
 * @fileoverview Shared storefront navigation links for catalog, wishlist, cart, and account.
 */
import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { getStoredCatalogHref } from '../../catalog/catalogState';
import { CartLinkLabel } from './CartLinkLabel';

type StorefrontTopNavItem = {
  key: string;
  to: string;
  artClassName: string;
  label: ReactNode;
};

export function StorefrontTopNav() {
  const productsHref = getStoredCatalogHref();
  const items: StorefrontTopNavItem[] = [
    {
      key: 'products',
      to: productsHref,
      artClassName: 'storefront-topnav-art-products',
      label: 'Products',
    },
    {
      key: 'cart',
      to: '/cart',
      artClassName: 'storefront-topnav-art-cart',
      label: <CartLinkLabel />,
    },
    {
      key: 'checkout',
      to: '/checkout',
      artClassName: 'storefront-topnav-art-checkout',
      label: 'Checkout',
    },
    {
      key: 'wishlist',
      to: '/wishlist',
      artClassName: 'storefront-topnav-art-wishlist',
      label: 'Wishlist',
    },
    {
      key: 'library',
      to: '/library',
      artClassName: 'storefront-topnav-art-library',
      label: 'Library',
    },
    {
      key: 'account',
      to: '/login',
      artClassName: 'storefront-topnav-art-account',
      label: 'Account',
    },
    {
      key: 'admin',
      to: '/admin/orders',
      artClassName: 'storefront-topnav-art-admin',
      label: 'Admin',
    },
  ];

  return (
    <nav className="storefront-topnav" aria-label="Primary storefront navigation">
      {items.map((item) => (
        <NavLink
          key={item.key}
          to={item.to}
          className={({ isActive }) => `storefront-topnav-link${isActive ? ' active' : ''}`}
        >
          <span className="storefront-topnav-label">{item.label}</span>
          <span className={`storefront-topnav-art ${item.artClassName}`} aria-hidden="true" />
        </NavLink>
      ))}
    </nav>
  );
}
