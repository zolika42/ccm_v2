/**
 * @fileoverview Simple login form bound to the shared auth state provider.
 */
import React from 'react';
import { FormEvent, useState } from 'react';
import { useAuth } from '../auth/AuthContext';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { user, loading, error, login, logout, refresh, clearError, isAuthenticated } = useAuth();

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    clearError();
    try {
      await login(email, password);
    } catch {
      // Error state is already handled inside the auth provider.
    }
  }

  async function handleWhoAmI() {
    clearError();
    await refresh();
  }

  async function handleLogout() {
    clearError();
    try {
      await logout();
    } catch {
      // Error state is already handled inside the auth provider.
    }
  }

  return (
    <section className="panel">
      <div className="page-header">
        <div>
          <h2>Login</h2>
          <p className="muted">Legacy-compatible login against <code>customers.ship_email</code> + <code>customer_password</code>.</p>
        </div>
        <span className={`session-pill ${isAuthenticated ? '' : 'muted-pill'}`}>
          {isAuthenticated ? 'Authenticated' : 'Guest session'}
        </span>
      </div>

      <form onSubmit={handleSubmit} className="stack">
        <label>
          Email
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" autoComplete="username" />
        </label>
        <label>
          Password
          <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" autoComplete="current-password" />
        </label>
        <div className="row wrap-row">
          <button type="submit" disabled={loading}>{loading ? 'Logging in…' : 'Login'}</button>
          <button type="button" onClick={handleWhoAmI} disabled={loading}>Refresh session</button>
          <button type="button" onClick={handleLogout} disabled={loading || !isAuthenticated}>Logout</button>
        </div>
      </form>

      {error && <p className="error">{error}</p>}
      {!loading && !user ? <p className="muted">No authenticated customer session yet.</p> : null}
      {user && (
        <div className="result-card">
          <strong>{user.name || user.email}</strong>
          <div>Email: {user.email}</div>
          <div>Customer ID: {user.customerId}</div>
          <div>Points: {user.points}</div>
        </div>
      )}
    </section>
  );
}
