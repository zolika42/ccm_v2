/**
 * @fileoverview Checkout UI for summary, validation feedback, and order submission.
 */
import React from 'react';
import { useEffect, useState } from 'react';
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

function fieldLabel(name: string) {
  return FIELD_LABELS[name] ?? name;
}

export function CheckoutPage() {
  const [checkout, setCheckout] = useState<CheckoutState | null>(null);
  const [draft, setDraft] = useState<CheckoutDraft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [submitBusy, setSubmitBusy] = useState(false);
  const [submission, setSubmission] = useState<CheckoutSubmission | null>(null);

  async function loadSummary() {
    setError(null);
    try {
      const payload = await getCheckoutSummary();
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
    setDraft((current) => (current ? { ...current, [field]: value } : current));
  }

  async function runValidation() {
    if (!draft) return;
    setBusy(true);
    setError(null);
    try {
      const payload = await validateCheckout(draft);
      setCheckout(payload.data);
      setDraft(payload.data.draft);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Checkout validation failed');
    } finally {
      setBusy(false);
    }
  }


  async function submitOrder() {
    if (!draft) return;
    setSubmitBusy(true);
    setError(null);
    try {
      const payload = await submitCheckout(draft);
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

  if (error) return <p className="error">{error}</p>;
  if (!checkout || !draft) return <p>Loading checkout…</p>;

  const { requirements, validation, customer, cart, paymentConfig } = checkout;

  return (
    <section className="checkout-layout">
      <div className="stack">
        <div className="panel">
          <div className="page-header">
            <div>
              <h2>Checkout</h2>
              <p className="muted">Order <code>{checkout.orderId ?? 'pending'}</code> · Storage mode <code>{checkout.legacy.storage}</code></p>
            </div>
            <div className="row wrap-row">
              <button type="button" onClick={() => void loadSummary()}>Reload summary</button>
              <button type="button" disabled={busy || submitBusy} onClick={() => void runValidation()}>{busy ? 'Validating…' : 'Validate checkout'}</button>
              <button type="button" disabled={submitBusy || busy} onClick={() => void submitOrder()}>{submitBusy ? 'Submitting…' : 'Submit order'}</button>
            </div>
          </div>

          {requirements.requiresLogin && (
            <div className="result-card">
              <p className="error">Checkout is explicitly login-required in the rewrite. Anonymous checkout is disabled because the legacy submit functions write by customer id.</p>
              <p className="muted">Policy: <code>{requirements.policy}</code> · reason: <code>{requirements.policyReason}</code> · guest allowed: {requirements.guestCheckoutAllowed ? 'yes' : 'no'}</p>
              <Link to="/login">Go to account</Link>
            </div>
          )}

          <div className="result-card">
            <strong>Current status</strong>
            <ul className="bullet-list">
              <li>Shipping required: {requirements.shippingRequired ? 'yes' : 'no'}</li>
              <li>Payment required: {requirements.paymentRequired ? 'yes' : 'no'}</li>
              <li>Available payment types: {requirements.availablePaymentTypes.join(', ')}</li>
              <li>Customer points available: {requirements.maxPointsApplicable}</li>
              <li>PayflowPro config present: {paymentConfig.enabled ? 'yes' : 'no'}</li>
            </ul>
          </div>

          {customer && <p className="muted">Logged in as <strong>{customer.name || customer.email}</strong> ({customer.email})</p>}


          {submission && (
            <div className="result-card success-card">
              <strong>Order recorded</strong>
              <ul className="bullet-list compact-list">
                <li>Order ID: <code>{submission.orderId}</code></li>
                <li>Recorded items: {submission.store.recordedItemCount}</li>
                <li>Points: {submission.store.pointsBefore} → {submission.store.pointsAfter}</li>
                <li>Payment type snapshot: {submission.paymentType || 'free'}</li>
                <li>Post-submit cart items: {submission.postSubmitCart.summary.itemCount}</li>
              </ul>
            </div>
          )}
        </div>

        <div className="panel form-panel">
          <h3>Shipping</h3>
          <div className="form-grid two-col">
            <label><span>Full name</span><input value={draft.shipName} onChange={(e) => setField('shipName', e.target.value)} /></label>
            <label><span>Email</span><input value={draft.shipEmail} onChange={(e) => setField('shipEmail', e.target.value)} /></label>
            <label><span>Phone</span><input value={draft.shipPhone} onChange={(e) => setField('shipPhone', e.target.value)} /></label>
            <label><span>Method</span><input value={draft.shipMethod} onChange={(e) => setField('shipMethod', e.target.value)} placeholder="UPS Ground / USPS / etc." /></label>
            <label className="full-span"><span>Street</span><input value={draft.shipStreet} onChange={(e) => setField('shipStreet', e.target.value)} /></label>
            <label className="full-span"><span>Street 2</span><input value={draft.shipStreet2} onChange={(e) => setField('shipStreet2', e.target.value)} /></label>
            <label><span>City</span><input value={draft.shipCity} onChange={(e) => setField('shipCity', e.target.value)} /></label>
            <label><span>State</span><input value={draft.shipState} onChange={(e) => setField('shipState', e.target.value)} /></label>
            <label><span>Zip</span><input value={draft.shipZip} onChange={(e) => setField('shipZip', e.target.value)} /></label>
            <label><span>Country</span><input value={draft.shipCountry} onChange={(e) => setField('shipCountry', e.target.value)} /></label>
          </div>
        </div>

        <div className="panel form-panel">
          <h3>Billing & payment</h3>
          <div className="form-grid two-col">
            <label><span>Billing name</span><input value={draft.billName} onChange={(e) => setField('billName', e.target.value)} /></label>
            <label>
              <span>Payment type</span>
              <select value={draft.paymentType} onChange={(e) => setField('paymentType', e.target.value)}>
                <option value="">Select</option>
                {requirements.availablePaymentTypes.map((type) => <option key={type} value={type}>{type}</option>)}
              </select>
            </label>
            <label className="full-span"><span>Billing street</span><input value={draft.billStreet} onChange={(e) => setField('billStreet', e.target.value)} /></label>
            <label className="full-span"><span>Billing street 2</span><input value={draft.billStreet2} onChange={(e) => setField('billStreet2', e.target.value)} /></label>
            <label><span>Billing city</span><input value={draft.billCity} onChange={(e) => setField('billCity', e.target.value)} /></label>
            <label><span>Billing state</span><input value={draft.billState} onChange={(e) => setField('billState', e.target.value)} /></label>
            <label><span>Billing zip</span><input value={draft.billZip} onChange={(e) => setField('billZip', e.target.value)} /></label>
            <label><span>Billing country</span><input value={draft.billCountry} onChange={(e) => setField('billCountry', e.target.value)} /></label>

            {['visa', 'mastercard', 'amex'].includes(draft.paymentType) && (
              <>
                <label><span>Cardholder name</span><input value={draft.payCardName} onChange={(e) => setField('payCardName', e.target.value)} /></label>
                <label><span>Card number</span><input value={draft.payCardNumber} onChange={(e) => setField('payCardNumber', e.target.value)} placeholder={draft.payCardLast4 ? `Stored last4: ${draft.payCardLast4}` : ''} /></label>
                <label><span>Exp. month</span><input value={draft.payCardMonth} onChange={(e) => setField('payCardMonth', e.target.value)} /></label>
                <label><span>Exp. year</span><input value={draft.payCardYear} onChange={(e) => setField('payCardYear', e.target.value)} /></label>
              </>
            )}

            <label><span>Promo code</span><input value={draft.promoCode} onChange={(e) => setField('promoCode', e.target.value)} /></label>
            <label><span>Apply points</span><input type="number" min={0} max={requirements.maxPointsApplicable} value={draft.pointsApplied} onChange={(e) => setField('pointsApplied', Number(e.target.value || 0))} /></label>
          </div>
        </div>
      </div>

      <aside className="panel cart-summary-panel checkout-sidebar">
        <h3>Order preview</h3>
        <dl className="summary-list">
          <div><dt>Items</dt><dd>{cart.summary.itemCount}</dd></div>
          <div><dt>Subtotal</dt><dd>{cart.summary.subtotalFormatted} {cart.summary.currency}</dd></div>
          <div><dt>Paid lines</dt><dd>{cart.summary.totalItemsRequiringPayment ?? 0}</dd></div>
          <div><dt>Downloadable qty</dt><dd>{cart.summary.downloadableItemCount ?? 0}</dd></div>
          <div><dt>Shippable subtotal</dt><dd>{cart.summary.shippableSubtotalFormatted ?? cart.summary.subtotalFormatted} {cart.summary.currency}</dd></div>
        </dl>

        <h4>Validation</h4>
        {validation.isValid ? (
          <p className="success">The current checkout draft passes the new validation layer.</p>
        ) : (
          <div className="stack">
            {Object.entries(validation.errors).map(([field, messages]) => (
              <div key={field} className="result-card error-list-card">
                <strong>{fieldLabel(field)}</strong>
                <ul className="bullet-list compact-list">
                  {messages.map((message, index) => <li key={`${field}-${index}`}>{message}</li>)}
                </ul>
              </div>
            ))}
          </div>
        )}

        <h4>Cart items</h4>
        <div className="stack compact-stack">
          {cart.items.map((item) => (
            <div key={item.productId} className="result-card">
              <strong>{item.description}</strong>
              <div className="muted">{item.productId}</div>
              <div className="muted">Qty {item.quantity} · {item.lineSubtotalFormatted} {cart.summary.currency}</div>
            </div>
          ))}
        </div>
      </aside>
    </section>
  );
}
