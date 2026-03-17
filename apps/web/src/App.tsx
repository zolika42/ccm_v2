/**
 * @fileoverview Application route table mounted inside the backend-driven storefront chrome.
 */
import React from 'react';
import { Route, Routes } from 'react-router-dom';
import { CartPage } from './pages/CartPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { LibraryPage } from './pages/LibraryPage';
import { LoginPage } from './pages/LoginPage';
import { WishlistPage } from './pages/WishlistPage';
import { ProductDetailPage } from './pages/ProductDetailPage';
import { ProductListPage } from './pages/ProductListPage';
import { AdminOrdersPage } from './pages/AdminOrdersPage';
import { AdminOrderDetailPage } from './pages/AdminOrderDetailPage';
import { AdminConfigPage } from './pages/AdminConfigPage';
import { StorefrontChrome } from './storefront/StorefrontChrome';

export function App() {
  return (
    <StorefrontChrome>
      <Routes>
        <Route path="/" element={<ProductListPage />} />
        <Route path="/products" element={<ProductListPage />} />
        <Route path="/products/:productId" element={<ProductDetailPage />} />
        <Route path="/cart" element={<CartPage />} />
        <Route path="/checkout" element={<CheckoutPage />} />
        <Route path="/wishlist" element={<WishlistPage />} />
        <Route path="/library" element={<LibraryPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/admin/orders" element={<AdminOrdersPage />} />
        <Route path="/admin/orders/:orderId" element={<AdminOrderDetailPage />} />
        <Route path="/admin/config" element={<AdminConfigPage />} />
      </Routes>
    </StorefrontChrome>
  );
}
