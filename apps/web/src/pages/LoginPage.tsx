/**
 * @fileoverview Simple login form for customer authentication.
 */
import React from 'react';
import { FormEvent, useState } from 'react';
import { login, logout, me } from '../api/client';
import type { AuthUser } from '../types';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [user, setUser] = useState<AuthUser | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const loggedInUser = await login(email, password);
      setUser(loggedInUser);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleWhoAmI() {
    setError(null);
    try {
      const current = await me();
      setUser(current);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load session');
      setUser(null);
    }
  }

  async function handleLogout() {
    await logout();
    setUser(null);
  }

  return (
    <section className="panel">
      <h2>Login</h2>
      <p className="muted">Legacy-compatible login against <code>customers.ship_email</code> + <code>customer_password</code>.</p>
      <form onSubmit={handleSubmit} className="stack">
        <label>
          Email
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" />
        </label>
        <label>
          Password
          <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" />
        </label>
        <div className="row">
          <button type="submit" disabled={loading}>{loading ? 'Logging in…' : 'Login'}</button>
          <button type="button" onClick={handleWhoAmI}>Who am I?</button>
          <button type="button" onClick={handleLogout}>Logout</button>
        </div>
      </form>
      {error && <p className="error">{error}</p>}
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
