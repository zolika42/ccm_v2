/**
 * @fileoverview Checkout UI with inline validation, billing copy action, and order submission.
 */
import React from 'react';
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { getCheckoutSummary, submitCheckout, validateCheckout } from '../api/client';
import type { CheckoutDraft, CheckoutState, CheckoutSubmission } from '../types';

const FIELD_LABELS: Record<keyof CheckoutDraft | string, string> = {
  shipName: 'Shipping name',
  shipEmail: 'Shipping email',
  shipPhone: 'Shipping phone',
  shipStreet: 'Shipping street',
  shipStreet2: 'Shipping street 2',
  shipCity: 'Shipping city',
  shipState: 'Shipping state',
  shipZip: 'Shipping zip',
  shipCountry: 'Shipping country',
  billName: 'Billing name',
  billStreet: 'Billing street',
  billStreet2: 'Billing street 2',
  billCity: 'Billing city',
  billState: 'Billing state',
  billZip: 'Billing zip',
  billCountry: 'Billing country',
  shipMethod: 'Shipping method',
  paymentType: 'Payment type',
  payCardName: 'Cardholder name',
  payCardMonth: 'Card expiration month',
  payCardYear: 'Card expiration year',
  payCardNumber: 'Card number',
  pointsApplied: 'Applied points',
  promoCode: 'Promo code',
  auth: 'Login',
  cart: 'Cart',
};

const FIELD_PLACEHOLDERS: Partial<Record<keyof CheckoutDraft, string>> = {
  shipName: 'Full name for delivery',
  shipEmail: 'you@example.com',
  shipPhone: 'Phone number for shipping updates',
  shipStreet: 'Street address',
  shipStreet2: 'Apartment, suite, building',
  shipCity: 'City',
  shipState: 'State / province',
  shipZip: 'ZIP / postal code',
  shipCountry: 'Country',
  shipMethod: 'UPS Ground / USPS / Courier',
  billName: 'Name on billing address',
  billStreet: 'Billing street address',
  billStreet2: 'Apartment, suite, building',
  billCity: 'City',
  billState: 'State / province',
  billZip: 'ZIP / postal code',
  billCountry: 'Country',
  payCardName: 'Name printed on card',
  payCardMonth: 'MM',
  payCardYear: 'YYYY',
  payCardNumber: 'Card number',
  promoCode: 'Enter promo code',
  pointsApplied: '0',
};

const FORM_FIELD_NAMES = new Set<string>(Object.keys(FIELD_PLACEHOLDERS));

function fieldLabel(name: string) {
  return FIELD_LABELS[name] ?? name;
}

function normalizeDraftSignature(value: CheckoutDraft | null) {
  return value ? JSON.stringify(value) : '';
}

export function CheckoutPage() {
  const [checkout, setCheckout] = useState<CheckoutState | null>(null);
  const [draft, setDraft] = useState<CheckoutDraft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [submitBusy, setSubmitBusy] = useState(false);
  const [submission, setSubmission] = useState<CheckoutSubmission | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const validationCounterRef = useRef(0);
  const lastValidatedSignatureRef = useRef('');

  async function loadSummary() {
    setError(null);
    try {
      const payload = await getCheckoutSummary();
      const nextSignature = normalizeDraftSignature(payload.data.draft);
      lastValidatedSignatureRef.current = nextSignature;
      setCheckout(payload.data);
      setDraft(payload.data.draft);
      setSubmission(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load checkout summary');
    }
  }

  useEffect(() => {
    void loadSummary();
  }, []);

  function setField<K extends keyof CheckoutDraft>(field: K, value: CheckoutDraft[K]) {
    setInfoMessage(null);
    setDraft((current) => (current ? { ...current, [field]: value } : current));
  }

  function copyShippingToBilling() {
    setDraft((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        billName: current.shipName,
        billStreet: current.shipStreet,
        billStreet2: current.shipStreet2,
        billCity: current.shipCity,
        billState: current.shipState,
        billZip: current.shipZip,
        billCountry: current.shipCountry,
      };
    });
    setInfoMessage('Shipping details copied into billing.');
  }

  async function runValidation(nextDraft: CheckoutDraft, options?: { keepBusy?: boolean }) {
    const requestId = ++validationCounterRef.current;
    if (!options?.keepBusy) {
      setBusy(true);
    }
    setError(null);

    try {
      const payload = await validateCheckout(nextDraft);
      if (requestId !== validationCounterRef.current) {
        return;
      }
      const nextSignature = normalizeDraftSignature(payload.data.draft);
      lastValidatedSignatureRef.current = nextSignature;
      setCheckout(payload.data);
      setDraft(payload.data.draft);
    } catch (err) {
      if (requestId !== validationCounterRef.current) {
        return;
      }
      setError(err instanceof Error ? err.message : 'Checkout validation failed');
    } finally {
      if (!options?.keepBusy && requestId === validationCounterRef.current) {
        setBusy(false);
      }
    }
  }

  useEffect(() => {
    if (!draft) {
      return;
    }

    const nextSignature = normalizeDraftSignature(draft);
    if (nextSignature === lastValidatedSignatureRef.current) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void runValidation(draft);
    }, 260);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [draft]);

  async function submitOrder(event?: FormEvent) {
    event?.preventDefault();
    if (!draft) return;
    setSubmitBusy(true);
    setError(null);
    setInfoMessage(null);
    try {
      const payload = await submitCheckout(draft);
      const nextSignature = normalizeDraftSignature(payload.data.draft);
      lastValidatedSignatureRef.current = nextSignature;
      setCheckout(payload.data);
      setDraft(payload.data.draft);
      setSubmission(payload.submission);
    } catch (err) {
      setSubmission(null);
      setError(err instanceof Error ? err.message : 'Checkout submit failed');
    } finally {
      setSubmitBusy(false);
    }
  }

  const checkoutFieldErrors = useMemo(() => checkout?.validation.errors ?? {}, [checkout]);
  const globalValidationEntries = useMemo(
    () => Object.entries(checkoutFieldErrors).filter(([field]) => !FORM_FIELD_NAMES.has(field)),
    [checkoutFieldErrors],
  );

  function fieldMessages(field: keyof CheckoutDraft) {
    return checkoutFieldErrors[field] ?? [];
  }

  function inputProps(field: keyof CheckoutDraft) {
    const messages = fieldMessages(field);
    const invalid = messages.length > 0;
    return {
      className: `checkout-field-input${invalid ? ' is-invalid' : ''}`,
      'aria-invalid': invalid || undefined,
      placeholder: invalid ? messages[0] : FIELD_PLACEHOLDERS[field],
    };
  }

  if (error) return <p className="error">{error}</p>;
  if (!checkout || !draft) return <p>Loading checkout…</p>;

  const { requirements, validation, customer, cart } = checkout;
  const usesCardPayment = ['visa', 'mastercard', 'amex'].includes(draft.paymentType);

  return (
    <section className="checkout-layout">
      <form className="stack checkout-form-stack" onSubmit={submitOrder} noValidate>
        <div className="panel checkout-hero-panel">
          <div className="page-header">
            <div>
              <h2>Checkout</h2>
              <p className="muted">Review your shipping, billing and payment details before placing the order.</p>
            </div>
            <div className="row wrap-row">
              <button type="button" onClick={() => void loadSummary()}>Refresh</button>
              <button type="submit" disabled={submitBusy || busy}>{submitBusy ? 'Placing order…' : 'Place order'}</button>
            </div>
          </div>

          {requirements.requiresLogin && !customer?.customerId ? (
            <div className="result-card checkout-login-card">
              <p className="error">Please sign in before continuing to checkout.</p>
              <Link className="button-link button-link-secondary" to="/login">Go to account</Link>
            </div>
          ) : null}

          {customer ? (
            <p className="muted">Ordering as <strong>{customer.name || customer.email}</strong> ({customer.email})</p>
          ) : null}

          {infoMessage ? <p className="success">{infoMessage}</p> : null}

          {submission ? (
            <div className="result-card success-card">
              <strong>Order placed</strong>
              <ul className="bullet-list compact-list">
                <li>Order ID: <code>{submission.orderId}</code></li>
                <li>Items recorded: {submission.store.recordedItemCount}</li>
                <li>Reward points balance: {submission.store.pointsBefore} → {submission.store.pointsAfter}</li>
                <li>Wishlist updated: {submission.wishlist.beforeCount} → {submission.wishlist.afterCount} item(s)</li>
              </ul>
            </div>
          ) : null}
        </div>

        <div className="panel form-panel checkout-section-panel">
          <div className="section-heading-row checkout-section-heading-row">
            <h3>Shipping</h3>
            <span className="checkout-section-note">We use this for delivery and order contact.</span>
          </div>
          <div className="form-grid two-col checkout-form-grid">
            <label className="checkout-field"><span>Full name</span><input {...inputProps('shipName')} value={draft.shipName} onChange={(e) => setField('shipName', e.target.value)} />{fieldMessages('shipName')[0] ? <small className="checkout-field-error">{fieldMessages('shipName')[0]}</small> : null}</label>
            <label className="checkout-field"><span>Email</span><input {...inputProps('shipEmail')} value={draft.shipEmail} onChange={(e) => setField('shipEmail', e.target.value)} type="email" autoComplete="email" />{fieldMessages('shipEmail')[0] ? <small className="checkout-field-error">{fieldMessages('shipEmail')[0]}</small> : null}</label>
            <label className="checkout-field"><span>Phone</span><input {...inputProps('shipPhone')} value={draft.shipPhone} onChange={(e) => setField('shipPhone', e.target.value)} autoComplete="tel" />{fieldMessages('shipPhone')[0] ? <small className="checkout-field-error">{fieldMessages('shipPhone')[0]}</small> : null}</label>
            <label className="checkout-field"><span>Method</span><input {...inputProps('shipMethod')} value={draft.shipMethod} onChange={(e) => setField('shipMethod', e.target.value)} />{fieldMessages('shipMethod')[0] ? <small className="checkout-field-error">{fieldMessages('shipMethod')[0]}</small> : null}</label>
            <label className="checkout-field full-span"><span>Street</span><input {...inputProps('shipStreet')} value={draft.shipStreet} onChange={(e) => setField('shipStreet', e.target.value)} autoComplete="shipping address-line1" />{fieldMessages('shipStreet')[0] ? <small className="checkout-field-error">{fieldMessages('shipStreet')[0]}</small> : null}</label>
            <label className="checkout-field full-span"><span>Street 2</span><input {...inputProps('shipStreet2')} value={draft.shipStreet2} onChange={(e) => setField('shipStreet2', e.target.value)} autoComplete="shipping address-line2" />{fieldMessages('shipStreet2')[0] ? <small className="checkout-field-error">{fieldMessages('shipStreet2')[0]}</small> : null}</label>
            <label className="checkout-field"><span>City</span><input {...inputProps('shipCity')} value={draft.shipCity} onChange={(e) => setField('shipCity', e.target.value)} autoComplete="shipping address-level2" />{fieldMessages('shipCity')[0] ? <small className="checkout-field-error">{fieldMessages('shipCity')[0]}</small> : null}</label>
            <label className="checkout-field"><span>State</span><input {...inputProps('shipState')} value={draft.shipState} onChange={(e) => setField('shipState', e.target.value)} autoComplete="shipping address-level1" />{fieldMessages('shipState')[0] ? <small className="checkout-field-error">{fieldMessages('shipState')[0]}</small> : null}</label>
            <label className="checkout-field"><span>ZIP</span><input {...inputProps('shipZip')} value={draft.shipZip} onChange={(e) => setField('shipZip', e.target.value)} autoComplete="shipping postal-code" />{fieldMessages('shipZip')[0] ? <small className="checkout-field-error">{fieldMessages('shipZip')[0]}</small> : null}</label>
            <label className="checkout-field"><span>Country</span><input {...inputProps('shipCountry')} value={draft.shipCountry} onChange={(e) => setField('shipCountry', e.target.value)} autoComplete="shipping country-name" />{fieldMessages('shipCountry')[0] ? <small className="checkout-field-error">{fieldMessages('shipCountry')[0]}</small> : null}</label>
          </div>
        </div>

        <div className="panel form-panel checkout-section-panel">
          <div className="section-heading-row checkout-section-heading-row">
            <div>
              <h3>Billing & payment</h3>
              <p className="muted compact-copy">Use the same address as shipping, or edit billing details separately.</p>
            </div>
            <button type="button" className="button-secondary" onClick={copyShippingToBilling}>Copy shipping to billing</button>
          </div>
          <div className="form-grid two-col checkout-form-grid">
            <label className="checkout-field"><span>Billing name</span><input {...inputProps('billName')} value={draft.billName} onChange={(e) => setField('billName', e.target.value)} autoComplete="billing name" />{fieldMessages('billName')[0] ? <small className="checkout-field-error">{fieldMessages('billName')[0]}</small> : null}</label>
            <label className="checkout-field">
              <span>Payment type</span>
              <select className={`checkout-field-input${fieldMessages('paymentType')[0] ? ' is-invalid' : ''}`} aria-invalid={fieldMessages('paymentType')[0] ? true : undefined} value={draft.paymentType} onChange={(e) => setField('paymentType', e.target.value)}>
                <option value="">Select a payment method</option>
                {requirements.availablePaymentTypes.map((type) => <option key={type} value={type}>{type}</option>)}
              </select>
              {fieldMessages('paymentType')[0] ? <small className="checkout-field-error">{fieldMessages('paymentType')[0]}</small> : null}
            </label>
            <label className="checkout-field full-span"><span>Billing street</span><input {...inputProps('billStreet')} value={draft.billStreet} onChange={(e) => setField('billStreet', e.target.value)} autoComplete="billing address-line1" />{fieldMessages('billStreet')[0] ? <small className="checkout-field-error">{fieldMessages('billStreet')[0]}</small> : null}</label>
            <label className="checkout-field full-span"><span>Billing street 2</span><input {...inputProps('billStreet2')} value={draft.billStreet2} onChange={(e) => setField('billStreet2', e.target.value)} autoComplete="billing address-line2" />{fieldMessages('billStreet2')[0] ? <small className="checkout-field-error">{fieldMessages('billStreet2')[0]}</small> : null}</label>
            <label className="checkout-field"><span>Billing city</span><input {...inputProps('billCity')} value={draft.billCity} onChange={(e) => setField('billCity', e.target.value)} autoComplete="billing address-level2" />{fieldMessages('billCity')[0] ? <small className="checkout-field-error">{fieldMessages('billCity')[0]}</small> : null}</label>
            <label className="checkout-field"><span>Billing state</span><input {...inputProps('billState')} value={draft.billState} onChange={(e) => setField('billState', e.target.value)} autoComplete="billing address-level1" />{fieldMessages('billState')[0] ? <small className="checkout-field-error">{fieldMessages('billState')[0]}</small> : null}</label>
            <label className="checkout-field"><span>Billing ZIP</span><input {...inputProps('billZip')} value={draft.billZip} onChange={(e) => setField('billZip', e.target.value)} autoComplete="billing postal-code" />{fieldMessages('billZip')[0] ? <small className="checkout-field-error">{fieldMessages('billZip')[0]}</small> : null}</label>
            <label className="checkout-field"><span>Billing country</span><input {...inputProps('billCountry')} value={draft.billCountry} onChange={(e) => setField('billCountry', e.target.value)} autoComplete="billing country-name" />{fieldMessages('billCountry')[0] ? <small className="checkout-field-error">{fieldMessages('billCountry')[0]}</small> : null}</label>

            {usesCardPayment ? (
              <>
                <label className="checkout-field"><span>Cardholder name</span><input {...inputProps('payCardName')} value={draft.payCardName} onChange={(e) => setField('payCardName', e.target.value)} autoComplete="cc-name" />{fieldMessages('payCardName')[0] ? <small className="checkout-field-error">{fieldMessages('payCardName')[0]}</small> : null}</label>
                <label className="checkout-field"><span>Card number</span><input {...inputProps('payCardNumber')} value={draft.payCardNumber} onChange={(e) => setField('payCardNumber', e.target.value)} autoComplete="cc-number" placeholder={fieldMessages('payCardNumber')[0] || (draft.payCardLast4 ? `Stored last4: ${draft.payCardLast4}` : FIELD_PLACEHOLDERS.payCardNumber)} />{fieldMessages('payCardNumber')[0] ? <small className="checkout-field-error">{fieldMessages('payCardNumber')[0]}</small> : null}</label>
                <label className="checkout-field"><span>Exp. month</span><input {...inputProps('payCardMonth')} value={draft.payCardMonth} onChange={(e) => setField('payCardMonth', e.target.value)} autoComplete="cc-exp-month" />{fieldMessages('payCardMonth')[0] ? <small className="checkout-field-error">{fieldMessages('payCardMonth')[0]}</small> : null}</label>
                <label className="checkout-field"><span>Exp. year</span><input {...inputProps('payCardYear')} value={draft.payCardYear} onChange={(e) => setField('payCardYear', e.target.value)} autoComplete="cc-exp-year" />{fieldMessages('payCardYear')[0] ? <small className="checkout-field-error">{fieldMessages('payCardYear')[0]}</small> : null}</label>
              </>
            ) : null}

            <label className="checkout-field"><span>Promo code</span><input {...inputProps('promoCode')} value={draft.promoCode} onChange={(e) => setField('promoCode', e.target.value)} />{fieldMessages('promoCode')[0] ? <small className="checkout-field-error">{fieldMessages('promoCode')[0]}</small> : null}</label>
            <label className="checkout-field"><span>Apply points</span><input {...inputProps('pointsApplied')} type="number" min={0} max={requirements.maxPointsApplicable} value={draft.pointsApplied} onChange={(e) => setField('pointsApplied', Number(e.target.value || 0))} />{fieldMessages('pointsApplied')[0] ? <small className="checkout-field-error">{fieldMessages('pointsApplied')[0]}</small> : null}</label>
          </div>
        </div>
      </form>

      <aside className="panel cart-summary-panel checkout-sidebar">
        <h3>Order preview</h3>
        <dl className="summary-list">
          <div><dt>Items</dt><dd>{cart.summary.itemCount}</dd></div>
          <div><dt>Subtotal</dt><dd>{cart.summary.subtotalFormatted} {cart.summary.currency}</dd></div>
          <div><dt>Paid lines</dt><dd>{cart.summary.totalItemsRequiringPayment ?? 0}</dd></div>
          <div><dt>Downloadable qty</dt><dd>{cart.summary.downloadableItemCount ?? 0}</dd></div>
          <div><dt>Shippable subtotal</dt><dd>{cart.summary.shippableSubtotalFormatted ?? cart.summary.subtotalFormatted} {cart.summary.currency}</dd></div>
        </dl>

        <div className={`result-card ${validation.isValid ? 'success-card' : 'checkout-validation-card'}`}>
          <strong>{validation.isValid ? 'Ready to place order' : 'Please fix the highlighted fields'}</strong>
          {validation.isValid ? (
            <p className="success compact-copy">Shipping, billing and payment details currently pass validation.</p>
          ) : (
            <ul className="bullet-list compact-list">
              {Object.entries(checkoutFieldErrors).map(([field, messages]) => (
                <li key={field}><strong>{fieldLabel(field)}</strong>: {messages[0]}</li>
              ))}
            </ul>
          )}
        </div>

        {globalValidationEntries.length > 0 ? (
          <div className="result-card error-list-card">
            <strong>Order checks</strong>
            <ul className="bullet-list compact-list">
              {globalValidationEntries.map(([field, messages]) => (
                <li key={field}><strong>{fieldLabel(field)}</strong>: {messages[0]}</li>
              ))}
            </ul>
          </div>
        ) : null}

        <h4>Cart items</h4>
        <div className="stack compact-stack">
          {cart.items.map((item) => (
            <div key={item.productId} className="result-card">
              <strong>{item.description}</strong>
              <div className="muted">Qty {item.quantity} · {item.lineSubtotalFormatted} {cart.summary.currency}</div>
            </div>
          ))}
        </div>
      </aside>
    </section>
  );
}
