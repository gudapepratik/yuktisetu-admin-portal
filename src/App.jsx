import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './components/Toast';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { UserManagement } from './pages/UserManagement';
import { StudentImport } from './pages/StudentImport';
import { Institutes } from './pages/Institutes';
import { Companies } from './pages/Companies';
import { Drives } from './pages/Drives';
import { AcceptInvite } from './pages/AcceptInvite';
import './styles/admin.css';


/**
 * Is this page load an invite activation?
 *
 * Read synchronously during the first render, not in an effect. An effect runs
 * after the first paint, so the visitor briefly saw the Login screen before the
 * invite form replaced it -- and anyone who typed into that flash got an
 * invalid-credentials error for an account that does not have a password yet.
 */
function isInviteLink() {
  const params = new URLSearchParams(window.location.search);
  return Boolean(params.get('token')) || window.location.pathname.includes('/accept-invite');
}

function MainApp() {
  const { isAuthenticated, loading } = useAuth();
  const [activeView, setActiveView] = useState(() => (isInviteLink() ? 'accept-invite' : 'dashboard'));

  // Activating an invite comes BEFORE the auth gate, and before the loading
  // gate. Someone opening an invite link in a browser where an admin is already
  // signed in used to fall straight through to the authenticated shell, where
  // 'accept-invite' matches no view and the content area simply rendered blank.
  // The invited person is not the signed-in person, so the session is irrelevant
  // here.
  if (activeView === 'accept-invite') {
    return <AcceptInvite setActiveView={setActiveView} />;
  }

  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--bg-app)',
          color: 'var(--text-muted)',
          fontFamily: 'var(--font-mono)',
          fontSize: '13px',
        }}
      >
        Authenticating CPMS Admin Session...
      </div>
    );
  }

  // Unauthenticated routing
  if (!isAuthenticated) {
    return <Login setActiveView={setActiveView} />;
  }

  // Authenticated Admin Shell
  return (
    <div className="app-shell">
      <Sidebar activeView={activeView} setActiveView={setActiveView} />

      <div className="main-viewport">
        <Header />

        <main>
          {activeView === 'dashboard' && <Dashboard setActiveView={setActiveView} />}
          {activeView === 'users' && <UserManagement />}
          {activeView === 'import-students' && <StudentImport />}
          {activeView === 'institutes' && <Institutes />}
          {activeView === 'companies' && <Companies setActiveView={setActiveView} />}
          {activeView === 'drives' && <Drives setActiveView={setActiveView} />}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ToastProvider>
          <MainApp />
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
