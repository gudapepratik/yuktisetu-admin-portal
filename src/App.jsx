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
import { AcceptInvite } from './pages/AcceptInvite';
import './styles/admin.css';

function MainApp() {
  const { isAuthenticated, loading } = useAuth();
  const [activeView, setActiveView] = useState('dashboard');

  // Check if opening with an invite token in URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('token') || window.location.pathname.includes('/invite')) {
      setActiveView('accept-invite');
    }
  }, []);

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
    if (activeView === 'accept-invite') {
      return <AcceptInvite setActiveView={setActiveView} />;
    }
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
