/**
 * @fileoverview Combined login, registration, profile maintenance, and password reset page.
 */
import React from 'react';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import type { ProfileUpdatePayload, RegistrationPayload } from '../types';

function blankProfile(): ProfileUpdatePayload {
  return {
    email: '',
    name: '',
    shipPhone: '',
    shipStreet: '',
    shipStreet2: '',
    shipCity: '',
    shipState: '',
    shipZip: '',
    shipCountry: '',
    billName: '',
    billStreet: '',
    billStreet2: '',
    billCity: '',
    billState: '',
    billZip: '',
    billCountry: '',
    payCardType: '',
    payCardMonth: '',
    payCardYear: '',
    payCardName: '',
    payCardLast4: '',
  };
}

function profileFromUser(user: ReturnType<typeof useAuth>['user']): ProfileUpdatePayload {
  if (!user) {
    return blankProfile();
  }

  return {
    email: user.email,
    name: user.name,
    shipPhone: user.shipPhone ?? '',
    shipStreet: user.shipStreet ?? '',
    shipStreet2: user.shipStreet2 ?? '',
    shipCity: user.shipCity ?? '',
    shipState: user.shipState ?? '',
    shipZip: user.shipZip ?? '',
    shipCountry: user.shipCountry ?? '',
    billName: user.billName ?? '',
    billStreet: user.billStreet ?? '',
    billStreet2: user.billStreet2 ?? '',
    billCity: user.billCity ?? '',
    billState: user.billState ?? '',
    billZip: user.billZip ?? '',
    billCountry: user.billCountry ?? '',
    payCardType: user.payCardType ?? '',
    payCardMonth: user.payCardMonth ?? '',
    payCardYear: user.payCardYear ?? '',
    payCardName: user.payCardName ?? '',
    payCardLast4: user.payCardLast4 ?? '',
  };
}

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [registerForm, setRegisterForm] = useState<RegistrationPayload>({
    email: '',
    name: '',
    password: '',
    rememberMe: false,
    shipCountry: 'USA',
    billCountry: 'USA',
  });
  const [profileForm, setProfileForm] = useState<ProfileUpdatePayload>(blankProfile());
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [success, setSuccess] = useState<string | null>(null);
  const {
    user,
    loading,
    error,
    login,
    register,
    logout,
    refresh,
    updateProfile,
    resetPassword,
    recoveryPolicy,
    clearError,
    isAuthenticated,
  } = useAuth();

  useEffect(() => {
    setProfileForm(profileFromUser(user));
  }, [user]);

  const persistenceLabel = useMemo(() => {
    if (!user?.authPersistence) return 'session';
    return user.authPersistence;
  }, [user]);

  async function handleLogin(event: FormEvent) {
    event.preventDefault();
    clearError();
    setSuccess(null);
    try {
      await login(email, password, rememberMe);
      setPassword('');
      setSuccess('Login successful.');
    } catch {
      // handled by provider
    }
  }

  async function handleRegister(event: FormEvent) {
    event.preventDefault();
    clearError();
    setSuccess(null);
    try {
      await register(registerForm);
      setRegisterForm((current) => ({ ...current, password: '' }));
      setSuccess('Account created and signed in.');
    } catch {
      // handled by provider
    }
  }

  async function handleRefreshSession() {
    clearError();
    setSuccess(null);
    await refresh();
  }

  async function handleLogout() {
    clearError();
    setSuccess(null);
    try {
      await logout();
      setSuccess('Logged out.');
    } catch {
      // handled by provider
    }
  }

  async function handleProfileSave(event: FormEvent) {
    event.preventDefault();
    clearError();
    setSuccess(null);
    try {
      await updateProfile(profileForm);
      setSuccess('Profile saved.');
    } catch {
      // handled by provider
    }
  }

  async function handlePasswordReset(event: FormEvent) {
    event.preventDefault();
    clearError();
    setSuccess(null);
    try {
      await resetPassword({ currentPassword, newPassword });
      setCurrentPassword('');
      setNewPassword('');
      setSuccess('Password updated.');
    } catch {
      // handled by provider
    }
  }

  return (
    <section className="stack account-page">
      <div className="panel account-hero-panel">
        <div className="page-header">
          <div>
            <h2>Account & authentication</h2>
            <p className="muted">Sign in, create an account, or update your saved customer details from one place.</p>
          </div>
          <span className={`session-pill ${isAuthenticated ? '' : 'muted-pill'}`}>
            {isAuthenticated ? 'Authenticated' : 'Guest session'}
          </span>
        </div>

        {success && <p className="success">{success}</p>}
        {error && <p className="error">{error}</p>}

        {user ? (
          <div className="result-card account-summary-card">
            <strong>{user.name || user.email}</strong>
            <div>Email: {user.email}</div>
            <div>Reward points: {user.points}</div>
            <div>Sign-in mode: {persistenceLabel}</div>
          </div>
        ) : (
          <p className="muted">You are currently browsing as a guest.</p>
        )}

        <div className="row wrap-row">
          <button type="button" onClick={() => void handleRefreshSession()} disabled={loading}>Refresh account</button>
          <button type="button" onClick={() => void handleLogout()} disabled={loading || !isAuthenticated}>Logout</button>
        </div>
      </div>

      {!isAuthenticated && (
        <div className="panel form-panel account-panel">
          <h3>Login</h3>
          <form onSubmit={handleLogin} className="stack">
            <label>
              <span>Email</span>
              <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" autoComplete="username" />
            </label>
            <label>
              <span>Password</span>
              <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" autoComplete="current-password" />
            </label>
            <label className="checkbox-label">
              <input checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} type="checkbox" />
              <span>Remember this browser</span>
            </label>
            <div className="row wrap-row">
              <button type="submit" disabled={loading}>{loading ? 'Logging in…' : 'Login'}</button>
            </div>
          </form>
        </div>
      )}

      {!isAuthenticated && (
        <div className="panel form-panel account-panel">
          <h3>Create account</h3>
<p className="muted">Create a customer account and save your basic shipping details for faster checkout.</p>
          <form onSubmit={handleRegister} className="stack">
            <div className="form-grid two-col">
              <label><span>Name (optional)</span><input value={registerForm.name ?? ''} onChange={(e) => setRegisterForm((current) => ({ ...current, name: e.target.value }))} /></label>
              <label><span>Email</span><input value={registerForm.email ?? ''} onChange={(e) => setRegisterForm((current) => ({ ...current, email: e.target.value }))} type="email" /></label>
              <label><span>Password</span><input value={registerForm.password ?? ''} onChange={(e) => setRegisterForm((current) => ({ ...current, password: e.target.value }))} type="password" autoComplete="new-password" /></label>
              <label><span>Phone</span><input value={registerForm.shipPhone ?? ''} onChange={(e) => setRegisterForm((current) => ({ ...current, shipPhone: e.target.value }))} /></label>
              <label className="full-span"><span>Street</span><input value={registerForm.shipStreet ?? ''} onChange={(e) => setRegisterForm((current) => ({ ...current, shipStreet: e.target.value }))} /></label>
              <label><span>City</span><input value={registerForm.shipCity ?? ''} onChange={(e) => setRegisterForm((current) => ({ ...current, shipCity: e.target.value }))} /></label>
              <label><span>State</span><input value={registerForm.shipState ?? ''} onChange={(e) => setRegisterForm((current) => ({ ...current, shipState: e.target.value }))} /></label>
              <label><span>Zip</span><input value={registerForm.shipZip ?? ''} onChange={(e) => setRegisterForm((current) => ({ ...current, shipZip: e.target.value }))} /></label>
              <label><span>Country</span><input value={registerForm.shipCountry ?? ''} onChange={(e) => setRegisterForm((current) => ({ ...current, shipCountry: e.target.value }))} /></label>
            </div>
            <label className="checkbox-label">
              <input checked={!!registerForm.rememberMe} onChange={(e) => setRegisterForm((current) => ({ ...current, rememberMe: e.target.checked }))} type="checkbox" />
              <span>Keep me signed in on this browser</span>
            </label>
            <div className="row wrap-row">
              <button type="submit" disabled={loading}>{loading ? 'Creating…' : 'Create account'}</button>
            </div>
          </form>
        </div>
      )}

      <div className="panel form-panel account-panel">
        <h3>Profile details</h3>
        {!isAuthenticated ? (
          <p className="muted">Log in first to edit your saved profile details.</p>
        ) : (
          <form onSubmit={handleProfileSave} className="stack">
            <div className="form-grid two-col">
              <label><span>Name</span><input value={profileForm.name} onChange={(e) => setProfileForm((current) => ({ ...current, name: e.target.value }))} /></label>
              <label><span>Email</span><input value={profileForm.email} onChange={(e) => setProfileForm((current) => ({ ...current, email: e.target.value }))} type="email" /></label>
              <label><span>Phone</span><input value={profileForm.shipPhone ?? ''} onChange={(e) => setProfileForm((current) => ({ ...current, shipPhone: e.target.value }))} /></label>
              <label><span>Billing name</span><input value={profileForm.billName ?? ''} onChange={(e) => setProfileForm((current) => ({ ...current, billName: e.target.value }))} /></label>
              <label className="full-span"><span>Shipping street</span><input value={profileForm.shipStreet ?? ''} onChange={(e) => setProfileForm((current) => ({ ...current, shipStreet: e.target.value }))} /></label>
              <label className="full-span"><span>Shipping street 2</span><input value={profileForm.shipStreet2 ?? ''} onChange={(e) => setProfileForm((current) => ({ ...current, shipStreet2: e.target.value }))} /></label>
              <label><span>Shipping city</span><input value={profileForm.shipCity ?? ''} onChange={(e) => setProfileForm((current) => ({ ...current, shipCity: e.target.value }))} /></label>
              <label><span>Shipping state</span><input value={profileForm.shipState ?? ''} onChange={(e) => setProfileForm((current) => ({ ...current, shipState: e.target.value }))} /></label>
              <label><span>Shipping zip</span><input value={profileForm.shipZip ?? ''} onChange={(e) => setProfileForm((current) => ({ ...current, shipZip: e.target.value }))} /></label>
              <label><span>Shipping country</span><input value={profileForm.shipCountry ?? ''} onChange={(e) => setProfileForm((current) => ({ ...current, shipCountry: e.target.value }))} /></label>
              <label className="full-span"><span>Billing street</span><input value={profileForm.billStreet ?? ''} onChange={(e) => setProfileForm((current) => ({ ...current, billStreet: e.target.value }))} /></label>
              <label className="full-span"><span>Billing street 2</span><input value={profileForm.billStreet2 ?? ''} onChange={(e) => setProfileForm((current) => ({ ...current, billStreet2: e.target.value }))} /></label>
              <label><span>Billing city</span><input value={profileForm.billCity ?? ''} onChange={(e) => setProfileForm((current) => ({ ...current, billCity: e.target.value }))} /></label>
              <label><span>Billing state</span><input value={profileForm.billState ?? ''} onChange={(e) => setProfileForm((current) => ({ ...current, billState: e.target.value }))} /></label>
              <label><span>Billing zip</span><input value={profileForm.billZip ?? ''} onChange={(e) => setProfileForm((current) => ({ ...current, billZip: e.target.value }))} /></label>
              <label><span>Billing country</span><input value={profileForm.billCountry ?? ''} onChange={(e) => setProfileForm((current) => ({ ...current, billCountry: e.target.value }))} /></label>
              <label><span>Stored card type</span><input value={profileForm.payCardType ?? ''} onChange={(e) => setProfileForm((current) => ({ ...current, payCardType: e.target.value }))} /></label>
              <label><span>Stored cardholder</span><input value={profileForm.payCardName ?? ''} onChange={(e) => setProfileForm((current) => ({ ...current, payCardName: e.target.value }))} /></label>
              <label><span>Stored card exp. month</span><input value={profileForm.payCardMonth ?? ''} onChange={(e) => setProfileForm((current) => ({ ...current, payCardMonth: e.target.value }))} /></label>
              <label><span>Stored card exp. year</span><input value={profileForm.payCardYear ?? ''} onChange={(e) => setProfileForm((current) => ({ ...current, payCardYear: e.target.value }))} /></label>
              <label><span>Stored card last4</span><input value={profileForm.payCardLast4 ?? ''} onChange={(e) => setProfileForm((current) => ({ ...current, payCardLast4: e.target.value }))} /></label>
            </div>
            <div className="row wrap-row">
              <button type="submit" disabled={loading}>{loading ? 'Saving…' : 'Save profile'}</button>
            </div>
          </form>
        )}
      </div>

      <div className="panel form-panel account-panel">
        <h3>Password</h3>

        {!isAuthenticated ? (
<p className="muted">Please sign in first, then you can change your password here.</p>
        ) : (
          <form onSubmit={handlePasswordReset} className="stack">
            <label>
              <span>Current password</span>
              <input value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} type="password" autoComplete="current-password" />
            </label>
            <label>
              <span>New password</span>
              <input value={newPassword} onChange={(e) => setNewPassword(e.target.value)} type="password" autoComplete="new-password" />
            </label>
            <div className="row wrap-row">
              <button type="submit" disabled={loading}>{loading ? 'Updating…' : 'Update password'}</button>
            </div>
          </form>
        )}
      </div>
    </section>
  );
}
