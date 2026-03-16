/**
 * @fileoverview Merchant/admin order detail + mark-order audit page.
 */
import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getAdminOrderDetail, markAdminOrder } from '../api/client';
import { useAdmin } from '../admin/AdminContext';
import { useAuth } from '../auth/AuthContext';
import type { AdminOrderDetail } from '../types';

export function AdminOrderDetailPage() {
  const { orderId = '' } = useParams();
  const { isAuthenticated } = useAuth();
  const { isAdmin, scope, loading: accessLoading } = useAdmin();
  const [detail, setDetail] = useState<AdminOrderDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  async function loadDetail() {
    if (!scope || !isAdmin || !orderId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await getAdminOrderDetail(orderId, scope.merchantId, scope.configId);
      setDetail(response.data.order);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load order detail');
      setDetail(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadDetail();
  }, [scope, isAdmin, orderId]);

  async function handleMark() {
    if (!scope || !orderId) return;
    setBusy(true);
    setError(null);
    try {
      await markAdminOrder(orderId, {
        merchantId: scope.merchantId,
        configId: scope.configId,
        action: 'mark',
        note: note.trim() || undefined,
      });
      setNote('');
      await loadDetail();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to mark order');
    } finally {
      setBusy(false);
    }
  }

  if (!isAuthenticated) {
    return <section className="panel stack"><h2>Order detail</h2><p className="muted">Log in first.</p></section>;
  }
  if (accessLoading) {
    return <section className="panel stack"><h2>Order detail</h2><p className="muted">Checking admin access…</p></section>;
  }
  if (!isAdmin || !scope) {
    return <section className="panel stack"><h2>Order detail</h2><p className="muted">No admin scope for this user.</p></section>;
  }

  return (
    <section className="stack admin-page">
      <div className="page-header">
        <div>
          <h2>Order detail</h2>
          <p className="muted">Scope {scope.merchantId}/{scope.configId}</p>
        </div>
        <Link className="button-link secondary-link" to="/admin/orders">Back to orders</Link>
      </div>

      {error && <p className="error-banner">{error}</p>}
      {loading || !detail ? <p className="muted">Loading order detail…</p> : (
        <>
          <div className="panel stack">
            <div className="row wrap-row admin-detail-meta">
              <span className="session-pill">Order {detail.orderId}</span>
              <span className="session-pill muted-pill">Legacy status {detail.status}</span>
              <span className="session-pill muted-pill">Updated {detail.lastUpdated ?? '—'}</span>
            </div>
            <div className="form-grid two-col">
              {Object.entries(detail.fields).map(([field, value]) => (
                <div key={field} className="detail-kv">
                  <strong>{field}</strong>
                  <span>{value || '—'}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="panel stack">
            <h3>Line items</h3>
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Description</th>
                    <th>Qty</th>
                    <th>Price</th>
                    <th>Category</th>
                    <th>Download</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.items.map((item) => (
                    <tr key={item.productId}>
                      <td>{item.productId}</td>
                      <td>{item.description || '—'}</td>
                      <td>{item.quantity}</td>
                      <td>{item.price || '—'}</td>
                      <td>{[item.category, item.subCategory, item.subCategory2].filter(Boolean).join(' / ') || '—'}</td>
                      <td>{item.isDownloadable ? 'Yes' : 'No'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="panel stack">
            <h3>Mark-order audit</h3>
            <label>
              <span>Audit note</span>
              <textarea value={note} onChange={(event) => setNote(event.target.value)} rows={3} placeholder="Optional note for the audit trail" />
            </label>
            <div className="row wrap-row">
              <button type="button" onClick={() => void handleMark()} disabled={busy}>{busy ? 'Marking…' : 'Mark order'}</button>
            </div>
            <div className="stack compact-stack">
              {detail.marks.length === 0 ? <p className="muted">No mark actions recorded yet.</p> : detail.marks.map((mark) => (
                <div key={`${mark.id ?? mark.createdAt}-${mark.action}`} className="result-card">
                  <strong>{mark.action}</strong>
                  <div className="muted small-text">Customer #{mark.customerId} · {mark.createdAt ?? '—'}</div>
                  {mark.note ? <p>{mark.note}</p> : null}
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </section>
  );
}
