/**
 * @fileoverview Legacy themed floating cart drawer with compact cart summary.
 */
import { useCallback, useEffect, useRef, useState, type FocusEvent } from 'react';
import { useCart } from '../../cart/CartContext';
import { LegacyQuickLink } from './LegacyQuickLink';

const CART_FLASH_MS = 900;
const CART_AUTO_CLOSE_MS = 1800;

export function LegacyCartDrawer() {
  const { summary } = useCart();
  const itemCount = summary?.itemCount ?? 0;
  const [isOpen, setIsOpen] = useState(false);
  const [isFlashing, setIsFlashing] = useState(false);
  const [pulseVersion, setPulseVersion] = useState(0);
  const closeTimeoutRef = useRef<number | null>(null);
  const flashTimeoutRef = useRef<number | null>(null);
  const isPointerInsideRef = useRef(false);
  const previousItemCountRef = useRef<number | null>(null);

  const clearCloseTimeout = useCallback(() => {
    if (closeTimeoutRef.current !== null) {
      window.clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
  }, []);

  const clearFlashTimeout = useCallback(() => {
    if (flashTimeoutRef.current !== null) {
      window.clearTimeout(flashTimeoutRef.current);
      flashTimeoutRef.current = null;
    }
  }, []);

  const stopFlash = useCallback(() => {
    clearFlashTimeout();
    setIsFlashing(false);
  }, [clearFlashTimeout]);

  const closeDrawer = useCallback(() => {
    clearCloseTimeout();
    stopFlash();
    setIsOpen(false);
  }, [clearCloseTimeout, stopFlash]);

  const scheduleAutoClose = useCallback((delay = CART_AUTO_CLOSE_MS) => {
    clearCloseTimeout();
    closeTimeoutRef.current = window.setTimeout(() => {
      if (!isPointerInsideRef.current) {
        closeDrawer();
      }
    }, delay);
  }, [clearCloseTimeout, closeDrawer]);

  const openDrawer = useCallback((options?: { flash?: boolean; autoClose?: boolean }) => {
    clearCloseTimeout();
    setIsOpen(true);

    if (options?.flash) {
      clearFlashTimeout();
      setPulseVersion((value) => value + 1);
      setIsFlashing(true);
      flashTimeoutRef.current = window.setTimeout(() => {
        setIsFlashing(false);
        flashTimeoutRef.current = null;
      }, CART_FLASH_MS);
    }

    if (options?.autoClose && !isPointerInsideRef.current) {
      scheduleAutoClose();
    }
  }, [clearCloseTimeout, clearFlashTimeout, scheduleAutoClose]);

  const registerPointerEnter = useCallback(() => {
    isPointerInsideRef.current = true;
    clearCloseTimeout();
    setIsOpen(true);
  }, [clearCloseTimeout]);

  const registerPointerLeave = useCallback(() => {
    isPointerInsideRef.current = false;
    closeDrawer();
  }, [closeDrawer]);

  const handleTabClick = useCallback(() => {
    if (isOpen) {
      closeDrawer();
      return;
    }

    openDrawer();
  }, [closeDrawer, isOpen, openDrawer]);

  const handleBlurCapture = useCallback((event: FocusEvent<HTMLElement>) => {
    if (event.currentTarget.contains(event.relatedTarget as Node | null)) {
      return;
    }

    isPointerInsideRef.current = false;
    closeDrawer();
  }, [closeDrawer]);

  useEffect(() => {
    const previousItemCount = previousItemCountRef.current;
    previousItemCountRef.current = itemCount;

    if (previousItemCount === null || itemCount <= previousItemCount) {
      return;
    }

    openDrawer({ flash: true, autoClose: true });
  }, [itemCount, openDrawer]);

  useEffect(() => {
    return () => {
      clearCloseTimeout();
      clearFlashTimeout();
    };
  }, [clearCloseTimeout, clearFlashTimeout]);

  return (
    <aside
      className={`legacy-cart-drawer${isOpen ? ' is-open' : ''}${isFlashing ? ' is-flashing' : ''}`}
      aria-label="Cart snapshot"
      onMouseEnter={registerPointerEnter}
      onMouseLeave={registerPointerLeave}
      onFocusCapture={registerPointerEnter}
      onBlurCapture={handleBlurCapture}
    >
      <button
        type="button"
        className="legacy-cart-drawer-tab"
        aria-expanded={isOpen}
        aria-controls="legacy-cart-drawer-panel"
        onClick={handleTabClick}
      >
        <span className="legacy-cart-drawer-tab-title">Cart</span>
        <span className="legacy-cart-drawer-tab-art" aria-hidden="true" />
      </button>

      <section id="legacy-cart-drawer-panel" className="legacy-floating-cart" data-pulse-version={pulseVersion}>
        <button type="button" className="legacy-cart-drawer-close" aria-label="Close cart drawer" onClick={closeDrawer}>
          ×
        </button>

        <div className="legacy-floating-cart-section">
          <h3>Cart</h3>
          <dl className="summary-list compact-summary-list">
            <div><dt>Items</dt><dd>{summary?.itemCount ?? 0}</dd></div>
            <div><dt>Unique</dt><dd>{summary?.uniqueItemCount ?? 0}</dd></div>
            <div><dt>Subtotal</dt><dd>{summary?.subtotalFormatted ?? '0.00'}</dd></div>
          </dl>
          <LegacyQuickLink to="/checkout" label="Checkout" className="legacy-quicklink-checkout" onInteract={openDrawer} />
        </div>
      </section>
    </aside>
  );
}
