import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Sun, Moon, Shield, Building, Layers } from 'lucide-react';

export function Header() {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const role = user?.primaryRole || 'ADMIN';
  const email = user?.email || 'admin@yuktisetu.org';

  return (
    <header className="top-header">
      <div className="header-left">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="badge badge-role">
            <Shield size={12} />
            {role}
          </span>

          {user?.collegeId && (
            <span className="badge badge-inactive">
              <Building size={12} />
              College ID: {user.collegeId}
            </span>
          )}

          {user?.deptId && (
            <span className="badge badge-inactive">
              <Layers size={12} />
              Dept ID: {user.deptId}
            </span>
          )}
        </div>
      </div>

      <div className="header-right">
        {/* Mechanical Theme Switcher */}
        <button
          className="btn btn-secondary btn-sm"
          onClick={toggleTheme}
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
        >
          {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
          <span style={{ fontSize: '12px' }}>{theme === 'dark' ? 'Light' : 'Dark'}</span>
        </button>

        {/* User Identity Chip */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '4px 10px',
            borderRadius: 'var(--radius-sm)',
            background: 'var(--bg-surface-raised)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <div
            style={{
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              background: 'var(--accent-gold)',
              color: '#000',
              fontWeight: 700,
              fontSize: '11px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {email.charAt(0).toUpperCase()}
          </div>
          <span
            style={{
              fontSize: '12.5px',
              fontWeight: 500,
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-mono)',
            }}
          >
            {email}
          </span>
        </div>
      </div>
    </header>
  );
}
