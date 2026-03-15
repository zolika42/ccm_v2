/**
 * @fileoverview Application shell: top navigation and route table for the React frontend.
 */
import React from 'react';
import { Link, Route, Routes } from 'react-router-dom';
import { useAuth } from './auth/AuthContext';
import { useCart } from './cart/CartContext';
import { CartPage } from './pages/CartPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { LibraryPage } from './pages/LibraryPage';
import { LoginPage } from './pages/LoginPage';
import { ProductDetailPage } from './pages/ProductDetailPage';
import { ProductListPage } from './pages/ProductListPage';


function SessionStatus() {
  const { user, loading, isAuthenticated } = useAuth();

  if (loading) {
    return <span className="session-pill muted-pill">Checking session…</span>;
  }

  if (!isAuthenticated || !user) {
    return <span className="session-pill muted-pill">Guest</span>;
  }

  return <span className="session-pill">Signed in as {user.name || user.email}</span>;
}

function CartLinkLabel() {
  const { summary, loading } = useCart();
  if (loading) {
    return <>Cart</>;
  }

  return <>Cart{summary ? ` (${summary.itemCount})` : ''}</>;
}

export function App() {
  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="container topbar-inner">
          <h1 className="brand">ColumbiaGames Rewrite</h1>
          <div className="topbar-meta">
            <SessionStatus />
            <nav>
            <Link to="/products">Products</Link>
            <Link to="/cart"><CartLinkLabel /></Link>
            <Link to="/checkout">Checkout</Link>
            <Link to="/library">Library</Link>
            <Link to="/login">Login</Link>
            </nav>
          </div>
        </div>
      </header>
      <main className="container page-content">
        <Routes>
          <Route path="/" element={<ProductListPage />} />
          <Route path="/products" element={<ProductListPage />} />
          <Route path="/products/:productId" element={<ProductDetailPage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/library" element={<LibraryPage />} />
          <Route path="/login" element={<LoginPage />} />
        </Routes>
      </main>
    </div>
  );
}
