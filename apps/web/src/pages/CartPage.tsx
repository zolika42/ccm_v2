/**
 * @fileoverview Cart UI for inspecting items, changing quantities, and navigating to checkout.
 */
import React from 'react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getCart, removeCartItem, updateCartItem } from '../api/client';
import { useCart } from '../cart/CartContext';
import type { Cart } from '../types';

export function CartPage() {
  const [cart, setCart] = useState<Cart | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyProductId, setBusyProductId] = useState<string | null>(null);
  const { refresh } = useCart();

  async function loadCart() {
    setError(null);
    try {
      const payload = await getCart();
      setCart(payload.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load cart');
    }
  }

  useEffect(() => {
    void loadCart();
  }, []);

  async function changeQuantity(productId: string, nextQuantity: number) {
    setBusyProductId(productId);
    setError(null);
    try {
      const payload = await updateCartItem(productId, nextQuantity);
      setCart(payload.data);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update cart');
    } finally {
      setBusyProductId(null);
    }
  }

  async function remove(productId: string) {
    setBusyProductId(productId);
    setError(null);
    try {
      const payload = await removeCartItem(productId);
      setCart(payload.data);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove item');
    } finally {
      setBusyProductId(null);
    }
  }

  if (error) return <p className="error">{error}</p>;
  if (!cart) return <p>Loading cart…</p>;

  return (
    <section className="cart-layout">
      <div className="panel">
        <div className="page-header">
          <div>
            <h2>Cart</h2>
            <p className="muted">Storage mode: <code>{cart.storage}</code></p>
          </div>
          <button type="button" onClick={() => void loadCart()}>Refresh cart</button>
        </div>

        {cart.items.length === 0 ? (
          <p className="muted">Your cart is currently empty.</p>
        ) : (
          <div className="stack">
            {cart.items.map((item) => {
              const busy = busyProductId === item.productId;
              return (
                <article className="cart-item" key={item.productId}>
                  <div>
                    <div className="product-meta">{item.category} / {item.subCategory}</div>
                    <h3>{item.description}</h3>
                    <div className="product-id">{item.productId}</div>
                    <div className="muted">Unit price: {item.unitPriceFormatted} {cart.summary.currency}</div>
                  </div>
                  <div className="cart-item-actions">
                    <div className="qty-control">
                      <button type="button" disabled={busy} onClick={() => void changeQuantity(item.productId, item.quantity - 1)}>-</button>
                      <span>{item.quantity}</span>
                      <button type="button" disabled={busy} onClick={() => void changeQuantity(item.productId, item.quantity + 1)}>+</button>
                    </div>
                    <strong>{item.lineSubtotalFormatted} {cart.summary.currency}</strong>
                    <button type="button" disabled={busy} onClick={() => void remove(item.productId)}>Remove</button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      <aside className="panel cart-summary-panel">
        <h3>Summary</h3>
        <dl className="summary-list">
          <div><dt>Items</dt><dd>{cart.summary.itemCount}</dd></div>
          <div><dt>Unique products</dt><dd>{cart.summary.uniqueItemCount}</dd></div>
          <div><dt>Paid lines</dt><dd>{cart.summary.totalItemsRequiringPayment ?? 0}</dd></div>
          <div><dt>Downloadable qty</dt><dd>{cart.summary.downloadableItemCount ?? 0}</dd></div>
          <div><dt>Shippable subtotal</dt><dd>{cart.summary.shippableSubtotalFormatted ?? cart.summary.subtotalFormatted} {cart.summary.currency}</dd></div>
          <div><dt>Subtotal</dt><dd>{cart.summary.subtotalFormatted} {cart.summary.currency}</dd></div>
        </dl>
        {cart.summary.hasItems ? <Link className="button-link" to="/checkout">Continue to checkout</Link> : null}
        <p className="muted">Checkout summary and validation are now wired; order submit comes next.</p>
      </aside>
    </section>
  );
}
