import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { adminApi } from '../api/admin';
import {
  Building2,
  Users,
  UploadCloud,
  Layers,
  ShieldCheck,
  ArrowRight,
  School,
} from 'lucide-react';

export function Dashboard({ setActiveView }) {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    trustsCount: 0,
    collegesCount: 0,
    departmentsCount: 0,
    loading: true,
  });

  const role = user?.primaryRole || 'TNP_SUPER_ADMIN';

  useEffect(() => {
    async function loadStats() {
      try {
        const trusts = await adminApi.listTrusts().catch(() => []);
        let collegesTotal = 0;
        let deptsTotal = 0;

        if (trusts && trusts.length > 0) {
          for (const t of trusts) {
            const cols = await adminApi.listColleges(t.id).catch(() => []);
            collegesTotal += cols.length;
            for (const c of cols) {
              const depts = await adminApi.listDepartments(c.id).catch(() => []);
              deptsTotal += depts.length;
            }
          }
        }

        setStats({
          trustsCount: trusts.length,
          collegesCount: collegesTotal,
          departmentsCount: deptsTotal,
          loading: false,
        });
      } catch {
        setStats({ trustsCount: 1, collegesCount: 1, departmentsCount: 3, loading: false });
      }
    }

    loadStats();
  }, []);

  return (
    <div className="content-container">
      {/* Page Header */}
      <div className="page-header">
        <div className="page-eyebrow">
          <ShieldCheck size={13} /> Administrative Command Center
        </div>
        <h1 className="page-title">Placement Administration Dashboard</h1>
        <p className="page-desc">
          Authenticated as <strong>{user?.email}</strong> with active role <code>{role}</code>.
        </p>
      </div>

      {/* Metric Cards Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px',
          marginBottom: '28px',
        }}
      >
        <div className="panel" style={{ padding: '18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="form-label">Educational Trusts</span>
            <Building2 size={18} color="var(--accent-gold)" />
          </div>
          <div style={{ fontSize: '28px', fontWeight: 700, marginTop: '8px' }}>
            {stats.loading ? '...' : stats.trustsCount}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
            Multi-campus governance
          </div>
        </div>

        <div className="panel" style={{ padding: '18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="form-label">Affiliated Colleges</span>
            <School size={18} color="var(--accent-blue)" />
          </div>
          <div style={{ fontSize: '28px', fontWeight: 700, marginTop: '8px' }}>
            {stats.loading ? '...' : stats.collegesCount}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
            Institutions registered in CPMS
          </div>
        </div>

        <div className="panel" style={{ padding: '18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="form-label">Departments</span>
            <Layers size={18} color="var(--accent-teal)" />
          </div>
          <div style={{ fontSize: '28px', fontWeight: 700, marginTop: '8px' }}>
            {stats.loading ? '...' : stats.departmentsCount}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
            Academic placement branches
          </div>
        </div>

        <div className="panel" style={{ padding: '18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="form-label">Role Security</span>
            <ShieldCheck size={18} color="var(--accent-purple)" />
          </div>
          <div style={{ fontSize: '14px', fontWeight: 600, marginTop: '12px', color: 'var(--accent-gold)' }}>
            {role}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
            RS256 JWT Signed Session
          </div>
        </div>
      </div>

      {/* Quick Action Cards */}
      <div style={{ marginBottom: '28px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '14px' }}>
          Administrative Workflows
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
          {/* Card 1: Student Import */}
          <div
            className="panel"
            style={{ cursor: 'pointer', transition: 'border-color 0.15s ease' }}
            onClick={() => setActiveView('import-students')}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: 'var(--radius-md)',
                  background: 'rgba(212, 155, 75, 0.14)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--accent-gold)',
                  flexShrink: 0,
                }}
              >
                <UploadCloud size={20} />
              </div>
              <div style={{ flex: 1 }}>
                <h4 style={{ fontSize: '14.5px', fontWeight: 600, marginBottom: '4px' }}>
                  Bulk Student Onboarding
                </h4>
                <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                  Upload `.xlsx` / `.csv` spreadsheets, validate row data, transform to schema, and register students via batch API.
                </p>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '12px',
                    color: 'var(--accent-gold)',
                    fontWeight: 600,
                    marginTop: '10px',
                  }}
                >
                  <span>Open Import Studio</span>
                  <ArrowRight size={13} />
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Role Management */}
          <div
            className="panel"
            style={{ cursor: 'pointer', transition: 'border-color 0.15s ease' }}
            onClick={() => setActiveView('users')}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: 'var(--radius-md)',
                  background: 'rgba(77, 141, 247, 0.14)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--accent-blue)',
                  flexShrink: 0,
                }}
              >
                <Users size={20} />
              </div>
              <div style={{ flex: 1 }}>
                <h4 style={{ fontSize: '14.5px', fontWeight: 600, marginBottom: '4px' }}>
                  Hierarchical User & Role Provisioning
                </h4>
                <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                  Invite subordinate roles (College Admins, HODs, Coordinators) with scope enforcement and activation tokens.
                </p>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '12px',
                    color: 'var(--accent-blue)',
                    fontWeight: 600,
                    marginTop: '10px',
                  }}
                >
                  <span>Manage Roles</span>
                  <ArrowRight size={13} />
                </div>
              </div>
            </div>
          </div>

          {/* Card 3: Institutional Hierarchy */}
          <div
            className="panel"
            style={{ cursor: 'pointer', transition: 'border-color 0.15s ease' }}
            onClick={() => setActiveView('institutes')}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: 'var(--radius-md)',
                  background: 'rgba(62, 200, 172, 0.14)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--accent-teal)',
                  flexShrink: 0,
                }}
              >
                <Building2 size={20} />
              </div>
              <div style={{ flex: 1 }}>
                <h4 style={{ fontSize: '14.5px', fontWeight: 600, marginBottom: '4px' }}>
                  Institutional Hierarchy Management
                </h4>
                <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                  Configure educational trusts, affiliated engineering colleges, academic departments, and contacts.
                </p>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '12px',
                    color: 'var(--accent-teal)',
                    fontWeight: 600,
                    marginTop: '10px',
                  }}
                >
                  <span>Configure Hierarchy</span>
                  <ArrowRight size={13} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
