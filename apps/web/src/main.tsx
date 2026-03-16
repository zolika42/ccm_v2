/**
 * @fileoverview React frontend bootstrap: router + global providers mount here.
 */
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from './App';
import { AdminProvider } from './admin/AdminContext';
import { AuthProvider } from './auth/AuthContext';
import { CartProvider } from './cart/CartContext';
import { CatalogProvider } from './catalog/CatalogContext';
import { WishlistProvider } from './wishlist/WishlistContext';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <AdminProvider>
          <CatalogProvider>
            <WishlistProvider>
              <CartProvider>
                <App />
              </CartProvider>
            </WishlistProvider>
          </CatalogProvider>
        </AdminProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
