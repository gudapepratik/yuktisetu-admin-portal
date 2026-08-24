import React, { useState, useEffect } from 'react';
import { authApi } from '../api/auth';
import { KeyRound, CheckCircle2, AlertCircle, ArrowLeft, ShieldCheck } from 'lucide-react';

export function AcceptInvite({ setActiveView }) {
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [userRole, setUserRole] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tokenParam = urlParams.get('token');
    if (tokenParam) {
      setToken(tokenParam);
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match. Please re-enter.');
      return;
    }

    setLoading(true);

    try {
      const response = await authApi.acceptInvite({
        token: token.trim(),
        newPassword: password,
      });
      setUserRole(response.role || 'UNKNOWN');
      setIsAdmin(response.isAdmin || false);
      setSuccess(true);
    } catch (err) {
      setError(
        err.message ||
          'Failed to activate account. The invitation token may be invalid, expired, or already used.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleProceedToLogin = () => {
    if (isAdmin) {
      setActiveView('login');
    } else {
      window.location.href = 'http://localhost:3001/login';
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        background: 'radial-gradient(ellipse at top, rgba(62,200,172,0.08), transparent 70%), var(--bg-app)',
      }}
    >
      <div
        className="panel"
        style={{
          width: '100%',
          maxWidth: '440px',
          boxShadow: 'var(--shadow-lg)',
          border: '1px solid var(--border-strong)',
        }}
      >
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div
            className="brand-icon"
            style={{
              width: '48px',
              height: '48px',
              margin: '0 auto 12px',
              background: 'linear-gradient(135deg, #3ec8ac, #4d8df7)',
            }}
          >
            <KeyRound size={22} color="#fff" />
          </div>
          <h2 style={{ fontSize: '22px', fontWeight: 700, letterSpacing: '-0.3px' }}>
            Activate YuktiSetu Account
          </h2>
          <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginTop: '4px' }}>
            Set your permanent security credentials to complete onboarding.
          </p>
        </div>

        {success ? (
          <div style={{ textAlign: 'center', padding: '12px 0' }}>
            <div
              style={{
                width: '54px',
                height: '54px',
                borderRadius: '50%',
                background: 'var(--success-bg)',
                color: 'var(--success)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
              }}
            >
              <CheckCircle2 size={32} />
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)' }}>
              Account Activated!
            </h3>
            <p
              style={{
                fontSize: '13px',
                color: 'var(--text-secondary)',
                marginTop: '8px',
                marginBottom: '24px',
                lineHeight: 1.5,
              }}
            >
              Your security password has been configured and your status is now{' '}
              <span className="badge badge-active">ACTIVE</span>.
              <br />
              Role: <strong>{userRole}</strong>
            </p>

            <button
              className="btn btn-primary"
              style={{ width: '100%' }}
              onClick={handleProceedToLogin}
            >
              Proceed to {isAdmin ? 'Admin Portal Sign In' : 'Student Portal Sign In'}
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            {error && (
              <div className="alert alert-danger">
                <AlertCircle size={16} flexShrink={0} />
                <span>{error}</span>
              </div>
            )}

            <div className="form-group" style={{ marginBottom: '14px' }}>
              <label className="form-label">Invitation Token *</label>
              <input
                type="text"
                required
                className="form-control"
                placeholder="e.g. 4f9b87e2-8921-42e7-a9a3-97b11c09e39b"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                style={{ fontFamily: 'var(--font-mono)', fontSize: '12px' }}
              />
            </div>

            <div className="form-group" style={{ marginBottom: '14px' }}>
              <label className="form-label">New Security Password *</label>
              <input
                type="password"
                required
                className="form-control"
                placeholder="Minimum 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <div className="form-group" style={{ marginBottom: '20px' }}>
              <label className="form-label">Confirm Security Password *</label>
              <input
                type="password"
                required
                className="form-control"
                placeholder="Re-enter password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', padding: '10px 16px' }}
              disabled={loading}
            >
              <ShieldCheck size={16} />
              {loading ? 'Activating Credentials...' : 'Set Password & Activate'}
            </button>

            <div style={{ marginTop: '20px', textAlign: 'center' }}>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setActiveView('login')}
              >
                <ArrowLeft size={13} /> Back to Sign In
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
