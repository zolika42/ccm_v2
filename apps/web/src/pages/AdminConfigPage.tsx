/**
 * @fileoverview Merchant/admin config inventory/export/import and product-upload page.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  applyAdminProductUpload,
  exportAdminConfig,
  getAdminConfigInventory,
  getAdminProductUploadSettings,
  getStorefrontTheme,
  importAdminConfig,
  previewAdminProductUpload,
  updateAdminStorefrontTheme,
} from '../api/client';
import { useAdmin } from '../admin/AdminContext';
import { useAuth } from '../auth/AuthContext';
import { useStorefrontTheme } from '../storefront/StorefrontThemeContext';
import type {
  AdminConfigBundle,
  AdminConfigInventory,
  AdminProductUploadApplyResult,
  AdminProductUploadPreview,
  AdminProductUploadSettings,
  StorefrontThemeConfig,
} from '../types';

const DEFAULT_UPLOAD_SAMPLE = [
  'product_id\tproduct_description\tproduct_price\tcategory\tsub_category\tsub_category2\tproduct_status',
  'CG-NEW-1\tNew Fixture Product\t12.99\tRulebooks\tDigital Editions\tCampaign Books\tActive',
].join('\n');

export function AdminConfigPage() {
  const { isAuthenticated } = useAuth();
  const { isAdmin, loading: accessLoading, scope, access, setScope } = useAdmin();
  const scopeOptions = useMemo(() => access?.scopes ?? [], [access]);
  const [inventory, setInventory] = useState<AdminConfigInventory | null>(null);
  const [settings, setSettings] = useState<AdminProductUploadSettings | null>(null);
  const [exportBundle, setExportBundle] = useState('');
  const [importText, setImportText] = useState('');
  const [uploadText, setUploadText] = useState(DEFAULT_UPLOAD_SAMPLE);
  const [preview, setPreview] = useState<AdminProductUploadPreview | null>(null);
  const [applyResult, setApplyResult] = useState<AdminProductUploadApplyResult | null>(null);
  const [storefrontTheme, setStorefrontTheme] = useState<StorefrontThemeConfig | null>(null);
  const [themeSelection, setThemeSelection] = useState<'rewrite' | 'legacy'>('rewrite');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { refreshTheme } = useStorefrontTheme();

  async function loadConfigData() {
    if (!scope || !isAdmin) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [inventoryData, settingsData, exportData, storefrontThemeData] = await Promise.all([
        getAdminConfigInventory(scope.merchantId, scope.configId),
        getAdminProductUploadSettings(scope.merchantId, scope.configId),
        exportAdminConfig(scope.merchantId, scope.configId),
        getStorefrontTheme(scope.merchantId, scope.configId),
      ]);
      setInventory(inventoryData);
      setSettings(settingsData);
      setExportBundle(JSON.stringify(exportData, null, 2));
      setImportText(JSON.stringify(exportData, null, 2));
      setStorefrontTheme(storefrontThemeData);
      setThemeSelection(storefrontThemeData.theme);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load admin config data');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadConfigData();
  }, [scope, isAdmin]);

  async function handleImport() {
    if (!scope) return;
    setLoading(true);
    setError(null);
    try {
      const bundle = JSON.parse(importText) as AdminConfigBundle;
      await importAdminConfig({ merchantId: scope.merchantId, configId: scope.configId, bundle });
      await loadConfigData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Config import failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleStorefrontThemeSave() {
    if (!scope) return;
    setLoading(true);
    setError(null);
    try {
      const nextTheme = await updateAdminStorefrontTheme({
        merchantId: scope.merchantId,
        configId: scope.configId,
        theme: themeSelection,
      });
      setStorefrontTheme(nextTheme);
      await refreshTheme(scope.merchantId, scope.configId);
      await loadConfigData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Storefront theme update failed');
    } finally {
      setLoading(false);
    }
  }

  async function handlePreview() {
    if (!scope) return;
    setLoading(true);
    setError(null);
    setApplyResult(null);
    try {
      const nextPreview = await previewAdminProductUpload({
        merchantId: scope.merchantId,
        configId: scope.configId,
        content: uploadText,
        hasHeaderRow: true,
      });
      setPreview(nextPreview);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload preview failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleApply() {
    if (!scope) return;
    setLoading(true);
    setError(null);
    try {
      const result = await applyAdminProductUpload({
        merchantId: scope.merchantId,
        configId: scope.configId,
        content: uploadText,
        hasHeaderRow: true,
      });
      setApplyResult(result);
      await handlePreview();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload apply failed');
    } finally {
      setLoading(false);
    }
  }

  if (!isAuthenticated) {
    return <section className="panel stack"><h2>Config & upload</h2><p className="muted">Log in first.</p></section>;
  }
  if (accessLoading) {
    return <section className="panel stack"><h2>Config & upload</h2><p className="muted">Checking admin access…</p></section>;
  }
  if (!isAdmin || !scope) {
    return <section className="panel stack"><h2>Config & upload</h2><p className="muted">No admin scope for this user.</p></section>;
  }

  return (
    <section className="stack admin-page">
      <div className="page-header">
        <div>
          <h2>Config management & product upload</h2>
          <p className="muted">CG-214 / CG-215 parity slice: config inventory/export/import + TSV product table upload.</p>
        </div>
        <Link className="button-link secondary-link" to="/admin/orders">Back to orders</Link>
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
        </div>
      </div>

      <div className="panel stack">
        <h3>Storefront template</h3>
        <div className="admin-toolbar">
          <label>
            <span>Backend-selected theme</span>
            <select value={themeSelection} onChange={(event) => setThemeSelection(event.target.value as 'rewrite' | 'legacy')}>
              <option value="rewrite">Rewrite / current template</option>
              <option value="legacy">Legacy storefront theme</option>
            </select>
          </label>
          <div className="result-card">
            <strong>Current source</strong>
            <p className="muted compact-copy">{storefrontTheme?.source ?? '—'} · raw value <code>{storefrontTheme?.rawTemplateStyle ?? 'rewrite'}</code></p>
          </div>
        </div>
        <div className="row wrap-row">
          <button type="button" onClick={() => void handleStorefrontThemeSave()} disabled={loading}>Save storefront theme</button>
        </div>
      </div>

      {error && <p className="error-banner">{error}</p>}
      {loading ? <p className="muted">Working…</p> : null}

      <div className="panel stack">
        <h3>Config inventory</h3>
        {inventory ? (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Table</th>
                  <th>Present</th>
                  <th>Interesting columns</th>
                </tr>
              </thead>
              <tbody>
                {inventory.rows.map((row) => (
                  <tr key={row.table}>
                    <td>{row.table}</td>
                    <td>{row.present ? 'Yes' : 'No'}</td>
                    <td>{row.columns.slice(0, 6).join(', ')}{row.columns.length > 6 ? '…' : ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <p className="muted">No inventory loaded yet.</p>}
      </div>

      <div className="panel stack">
        <h3>Config export / import</h3>
        <div className="form-grid two-col">
          <label className="full-span">
            <span>Exported JSON bundle</span>
            <textarea value={exportBundle} readOnly rows={12} />
          </label>
          <label className="full-span">
            <span>Import JSON bundle</span>
            <textarea value={importText} onChange={(event) => setImportText(event.target.value)} rows={12} />
          </label>
        </div>
        <div className="row wrap-row">
          <button type="button" onClick={() => void handleImport()} disabled={loading}>Import scoped bundle</button>
        </div>
      </div>

      <div className="panel stack">
        <h3>Product table upload</h3>
        {settings ? (
          <div className="result-card">
            <strong>Supported input</strong>
            <p className="muted">Delimiter: {settings.supportedInput.delimiter}. Fields: {settings.fields.join(', ')}</p>
            <ul className="bullet-list compact-list">
              {settings.supportedInput.notes.map((note) => <li key={note}>{note}</li>)}
            </ul>
          </div>
        ) : null}
        <label>
          <span>Upload content</span>
          <textarea value={uploadText} onChange={(event) => setUploadText(event.target.value)} rows={10} />
        </label>
        <div className="row wrap-row">
          <button type="button" onClick={() => void handlePreview()} disabled={loading}>Preview upload</button>
          <button type="button" onClick={() => void handleApply()} disabled={loading}>Apply upload</button>
        </div>
        {preview ? (
          <div className="stack compact-stack">
            <div className="result-card">
              <strong>Preview summary</strong>
              <p>{preview.rowCount} rows · {preview.insertCount} inserts · {preview.updateCount} updates</p>
              {preview.warnings.length > 0 ? <ul className="bullet-list compact-list">{preview.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul> : null}
            </div>
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Row</th>
                    <th>Product</th>
                    <th>Mode</th>
                    <th>Description</th>
                    <th>Price</th>
                    <th>Category</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.rows.map((row) => (
                    <tr key={`${row.rowNumber}-${row.productId}`}>
                      <td>{row.rowNumber}</td>
                      <td>{row.productId}</td>
                      <td>{row.mode}</td>
                      <td>{String(row.fields.product_description ?? '—')}</td>
                      <td>{String(row.fields.product_price ?? '—')}</td>
                      <td>{[row.fields.category, row.fields.sub_category, row.fields.sub_category2].filter(Boolean).join(' / ') || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
        {applyResult ? (
          <div className="result-card">
            <strong>Apply result</strong>
            <p>{applyResult.rowCount} rows applied · {applyResult.insertCount} inserts · {applyResult.updateCount} updates</p>
            <ul className="bullet-list compact-list">
              {applyResult.notes.map((note) => <li key={note}>{note}</li>)}
            </ul>
          </div>
        ) : null}
      </div>
    </section>
  );
}
