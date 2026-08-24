import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { LogIn, Key, Mail, AlertCircle, Shield } from 'lucide-react';

export function Login({ setActiveView }) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await login(email, password);
      // AuthProvider sets user and App.jsx transitions to 'dashboard'
    } catch (err) {
      setError(err.message || 'Invalid credentials or inactive administrative account.');
    } finally {
      setLoading(false);
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
        background: 'radial-gradient(ellipse at top, rgba(30,58,138,0.08), transparent 70%), var(--bg-app)',
      }}
    >
      <div
        className="panel"
        style={{
          width: '100%',
          maxWidth: '420px',
          boxShadow: 'var(--shadow-lg)',
          border: '1px solid var(--border-strong)',
        }}
      >
        {/* Brand Heading */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div
            className="brand-icon"
            style={{ width: '48px', height: '48px', margin: '0 auto 12px', fontSize: '20px', borderRadius: '12px', background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, letterSpacing: '-0.5px' }}
          >
            Y
          </div>
          <h2 style={{ fontSize: '22px', fontWeight: 700, letterSpacing: '-0.3px' }}>
            YuktiSetu Admin Portal
          </h2>
          <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginTop: '4px' }}>
            Central Placement Management System
          </p>
        </div>

        {error && (
          <div className="alert alert-danger">
            <AlertCircle size={16} flexShrink={0} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin}>
          <div className="form-group" style={{ marginBottom: '14px' }}>
            <label className="form-label">Administrator Email</label>
            <div style={{ position: 'relative' }}>
              <input
                type="email"
                required
                className="form-control"
                placeholder="admin@pcet.org.in"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{ paddingLeft: '34px' }}
              />
              <Mail
                size={15}
                style={{ position: 'absolute', left: '11px', top: '11px', color: 'var(--text-muted)' }}
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '20px' }}>
            <label className="form-label">Security Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type="password"
                required
                className="form-control"
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ paddingLeft: '34px' }}
              />
              <Key
                size={15}
                style={{ position: 'absolute', left: '11px', top: '11px', color: 'var(--text-muted)' }}
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', padding: '10px 16px', fontSize: '13.5px' }}
            disabled={loading}
          >
            <LogIn size={15} /> {loading ? 'Verifying Credentials...' : 'Sign in to Admin Portal'}
          </button>
        </form>

        {/* Activation Link */}
        <div
          style={{
            marginTop: '22px',
            textAlign: 'center',
            paddingTop: '16px',
            borderTop: '1px solid var(--divider)',
          }}
        >
          <span style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>
            Received an account invitation code?{' '}
          </span>
          <span
            style={{
              fontSize: '12.5px',
              color: 'var(--accent-gold)',
              fontWeight: 600,
              cursor: 'pointer',
              textDecoration: 'underline',
            }}
            onClick={() => setActiveView('accept-invite')}
          >
            Activate Account
          </span>
        </div>
      </div>
    </div>
  );
}
