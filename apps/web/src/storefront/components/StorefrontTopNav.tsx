/**
 * @fileoverview Shared storefront navigation links for catalog, wishlist, cart, and account.
 */
import { NavLink } from 'react-router-dom';
import { getStoredCatalogHref } from '../../catalog/catalogState';
import { CartLinkLabel } from './CartLinkLabel';

export function StorefrontTopNav() {
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
