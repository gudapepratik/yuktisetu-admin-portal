import React from 'react';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Users,
  Building2,
  UploadCloud,
  LogOut,
  ShieldAlert,
} from 'lucide-react';

export function Sidebar({ activeView, setActiveView }) {
  const { user, logout } = useAuth();
  const role = user?.primaryRole || 'TNP_SUPER_ADMIN';

  // Role permissions for sidebar navigation
  const canManageInstitutes = ['TNP_SUPER_ADMIN', 'IT_ADMIN', 'TNP_COLLEGE_ADMIN'].includes(role);
  const canManageRoles = ['TNP_SUPER_ADMIN', 'IT_ADMIN', 'TNP_COLLEGE_ADMIN', 'TNP_COORDINATOR', 'HOD', 'FACULTY_DEPT_COORDINATOR'].includes(role);
  const canImportStudents = ['TNP_SUPER_ADMIN', 'IT_ADMIN', 'TNP_COLLEGE_ADMIN', 'TNP_COORDINATOR', 'HOD', 'FACULTY_DEPT_COORDINATOR'].includes(role);

  return (
    <aside className="sidebar">
      {/* Brand Header */}
      <div className="sidebar-brand">
        <div className="brand-icon" style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: '18px', letterSpacing: '-0.5px' }}>
          Y
        </div>
        <div className="brand-info">
          <span className="brand-title">YuktiSetu</span>
          <span className="brand-sub">Admin Portal</span>
        </div>
      </div>

      {/* Nav Items */}
      <div className="sidebar-nav">
        <div className="nav-section-label">General</div>
        <div
          className={`nav-item ${activeView === 'dashboard' ? 'active' : ''}`}
          onClick={() => setActiveView('dashboard')}
        >
          <LayoutDashboard size={16} />
          <span>Dashboard</span>
        </div>

        <div className="nav-section-label">Operations</div>
        {canManageRoles && (
          <div
            className={`nav-item ${activeView === 'users' ? 'active' : ''}`}
            onClick={() => setActiveView('users')}
          >
            <Users size={16} />
            <span>User & Roles</span>
          </div>
        )}

        {canImportStudents && (
          <div
            className={`nav-item ${activeView === 'import-students' ? 'active' : ''}`}
            onClick={() => setActiveView('import-students')}
          >
            <UploadCloud size={16} />
            <span>Student Import (Excel)</span>
          </div>
        )}

        {canManageInstitutes && (
          <div
            className={`nav-item ${activeView === 'institutes' ? 'active' : ''}`}
            onClick={() => setActiveView('institutes')}
          >
            <Building2 size={16} />
            <span>Institutes (Trust/Colleges)</span>
          </div>
        )}
      </div>

      {/* Sidebar Footer */}
      <div className="sidebar-footer">
        <button
          className="btn btn-ghost btn-sm"
          onClick={logout}
          style={{ width: '100%', justifyContent: 'flex-start', color: 'var(--danger)' }}
        >
          <LogOut size={15} />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
