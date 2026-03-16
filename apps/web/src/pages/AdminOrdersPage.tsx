/**
 * @fileoverview Merchant/admin order queue + all-orders search page.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { listAdminOrders } from '../api/client';
import { useAdmin } from '../admin/AdminContext';
import { useAuth } from '../auth/AuthContext';
import type { AdminOrderSummary } from '../types';

export function AdminOrdersPage() {
  const { isAuthenticated } = useAuth();
  const { isAdmin, loading: accessLoading, scope, access, setScope } = useAdmin();
  const [view, setView] = useState<'queue' | 'all'>('queue');
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<AdminOrderSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);

  const scopeOptions = useMemo(() => access?.scopes ?? [], [access]);

  useEffect(() => {
    async function load() {
      if (!scope || !isAdmin) {
        setItems([]);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const response = await listAdminOrders({
          merchantId: scope.merchantId,
          configId: scope.configId,
          view,
          q: query.trim() || undefined,
          limit: 50,
          offset: 0,
        });
        setItems(response.data.orders.items);
        setTotal(response.data.orders.meta.total);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load admin orders');
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [scope, isAdmin, view, query]);

  if (!isAuthenticated) {
    return (
      <section className="panel stack">
        <h2>Merchant admin</h2>
        <p className="muted">Log in first. The admin pages are hidden from anonymous users.</p>
      </section>
    );
  }

  if (accessLoading) {
    return <section className="panel stack"><h2>Merchant admin</h2><p className="muted">Checking admin access…</p></section>;
  }

  if (!isAdmin || !scope) {
    return (
      <section className="panel stack">
        <h2>Merchant admin</h2>
        <p className="muted">This customer is not allowlisted in the rewrite admin scope table.</p>
      </section>
    );
  }

  return (
    <section className="stack admin-page">
      <div className="page-header">
        <div>
          <h2>Merchant orders</h2>
          <p className="muted">CG-212 / CG-213 parity slice: unmarked queue, all orders, search, detail, mark-order audit.</p>
        </div>
        <Link className="button-link secondary-link" to="/admin/config">Config & upload</Link>
      </div>

      <div className="panel stack">
        <div className="admin-toolbar">
          <label>
            <span>Scope</span>
            <select
              value={`${scope.merchantId}:${scope.configId}`}
              onChange={(event) => {
                const next = scopeOptions.find((entry) => `${entry.merchantId}:${entry.configId}` === event.target.value) ?? null;
                setScope(next);
              }}
            >
              {scopeOptions.map((entry) => (
                <option key={`${entry.merchantId}:${entry.configId}`} value={`${entry.merchantId}:${entry.configId}`}>
                  {entry.merchantId}/{entry.configId}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>View</span>
            <select value={view} onChange={(event) => setView(event.target.value as 'queue' | 'all')}>
              <option value="queue">Unmarked queue</option>
              <option value="all">All submitted orders</option>
            </select>
          </label>
          <label className="grow-field">
            <span>Search</span>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="order id, email, name, product…" />
          </label>
        </div>
        <div className="row wrap-row admin-summary-row">
          <span className="session-pill">Scope {scope.merchantId}/{scope.configId}</span>
          <span className="session-pill muted-pill">{total} matching orders</span>
        </div>
      </div>

      {error && <p className="error-banner">{error}</p>}
      {loading ? <p className="muted">Loading orders…</p> : null}

      <div className="panel stack">
        <div className="table-scroll">
          <table className="data-table admin-orders-table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Customer</th>
                <th>Location</th>
                <th>Items</th>
                <th>Totals</th>
                <th>Mark state</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="muted">No orders matched this admin view.</td>
                </tr>
              ) : items.map((order) => (
                <tr key={order.orderId}>
                  <td>
                    <strong>{order.orderId}</strong>
                    <div className="muted small-text">{order.lastUpdated ?? '—'}</div>
                  </td>
                  <td>
                    <div>{order.shipName || '—'}</div>
                    <div className="muted small-text">{order.shipEmail || '—'}</div>
                  </td>
                  <td>{[order.shipCity, order.shipCountry].filter(Boolean).join(', ') || '—'}</td>
                  <td>{order.itemCount} lines / {order.totalQuantity} qty</td>
                  <td>
                    <div>Ship: {order.shippableSubtotal ?? '—'}</div>
                    <div className="muted small-text">PDF: {order.pdfTotal ?? '—'}</div>
                  </td>
                  <td>
                    {order.latestMark ? (
                      <div>
                        <strong>{order.latestMark.action}</strong>
                        <div className="muted small-text">{order.latestMark.createdAt ?? '—'}</div>
                      </div>
                    ) : <span className="queue-badge">Unmarked</span>}
                  </td>
                  <td>
                    <Link to={`/admin/orders/${encodeURIComponent(order.orderId)}`} className="button-link">Open</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
