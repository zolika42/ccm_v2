/**
 * @fileoverview Legacy themed floating cart drawer with quick navigation links.
 */
import { useCallback, useEffect, useState } from 'react';
import { getStoredCatalogHref } from '../../catalog/catalogState';
import { useCart } from '../../cart/CartContext';
import { LegacyQuickLink } from './LegacyQuickLink';

export function LegacyCartDrawer() {
  const { summary } = useCart();
  const [isOpen, setIsOpen] = useState(false);
  const [interactionVersion, setInteractionVersion] = useState(0);

  const registerInteraction = useCallback(() => {
    setIsOpen(true);
    setInteractionVersion((value) => value + 1);
  }, []);

  const closeDrawer = useCallback(() => {
    setIsOpen(false);
  }, []);

  const handleTabClick = useCallback(() => {
    if (isOpen) {
      closeDrawer();
      return;
    }

    registerInteraction();
  }, [closeDrawer, isOpen, registerInteraction]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setIsOpen(false);
    }, 5000);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [interactionVersion, isOpen]);

  return (
    <aside
      className={`legacy-cart-drawer${isOpen ? ' is-open' : ''}`}
      aria-label="Cart snapshot"
      onMouseEnter={registerInteraction}
      onMouseMove={registerInteraction}
      onFocusCapture={registerInteraction}
    >
      <button
        type="button"
        className="legacy-cart-drawer-tab"
        aria-expanded={isOpen}
        aria-controls="legacy-cart-drawer-panel"
        onClick={handleTabClick}
        onMouseEnter={registerInteraction}
        onFocus={registerInteraction}
      >
        <span className="legacy-cart-drawer-tab-title">Cart</span>
        <span className="legacy-cart-drawer-tab-art" aria-hidden="true" />
      </button>

      <section id="legacy-cart-drawer-panel" className="legacy-floating-cart">
        <div className="legacy-floating-cart-section">
          <h3>Cart</h3>
          <dl className="summary-list compact-summary-list">
            <div><dt>Items</dt><dd>{summary?.itemCount ?? 0}</dd></div>
            <div><dt>Unique</dt><dd>{summary?.uniqueItemCount ?? 0}</dd></div>
            <div><dt>Subtotal</dt><dd>{summary?.subtotalFormatted ?? '0.00'}</dd></div>
          </dl>
          <LegacyQuickLink to="/cart" label="View cart" className="legacy-quicklink-viewcart" onInteract={registerInteraction} />
        </div>

        <div className="legacy-floating-cart-section legacy-floating-cart-menu">
          <h3>Menu</h3>
          <div className="legacy-quicklink-grid">
            <LegacyQuickLink
              to={getStoredCatalogHref()}
              label="Products"
              className="legacy-quicklink-home"
              onInteract={registerInteraction}
            />
            <LegacyQuickLink
              to="/checkout"
              label="Checkout"
              className="legacy-quicklink-checkout"
              onInteract={registerInteraction}
            />
            <LegacyQuickLink
              to="/login"
              label="Account"
              className="legacy-quicklink-account"
              onInteract={registerInteraction}
            />
          </div>
        </div>
      </section>
    </aside>
  );
}
