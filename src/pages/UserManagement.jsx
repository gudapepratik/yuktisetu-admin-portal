import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../api/auth';
import { adminApi } from '../api/admin';
import { useToast } from '../components/Toast';
import { getAllowedTargetRoles } from '../utils/roleHierarchy';
import { UserPlus, Shield, Building, Layers, CheckCircle2, AlertCircle } from 'lucide-react';

export function UserManagement() {
  const { user } = useAuth();
  const { success, error: showError } = useToast();

  const currentUserRole = user?.primaryRole || 'TNP_SUPER_ADMIN';
  const allowedRoles = getAllowedTargetRoles(currentUserRole);

  const [colleges, setColleges] = useState([]);
  const [departments, setDepartments] = useState([]);

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    role: allowedRoles[0]?.value || 'TNP_COLLEGE_ADMIN',
    collegeId: '',
    deptId: '',
  });

  const [loading, setLoading] = useState(false);
  const [lastCreated, setLastCreated] = useState(null);

  // Load Colleges on Mount
  useEffect(() => {
    async function loadInstitutes() {
      try {
        const trusts = await adminApi.listTrusts().catch(() => []);
        const trustId = trusts[0]?.id || 1;
        const cols = await adminApi.listColleges(trustId).catch(() => []);
        if (cols && cols.length > 0) {
          setColleges(cols);
          setForm((prev) => ({ ...prev, collegeId: cols[0].id }));
        } else {
          const fallbackCols = [{ id: 2, name: 'Pimpri Chinchwad College of Engineering', code: 'PCCOE' }];
          setColleges(fallbackCols);
          setForm((prev) => ({ ...prev, collegeId: 2 }));
        }
      } catch {
        const fallbackCols = [{ id: 2, name: 'Pimpri Chinchwad College of Engineering', code: 'PCCOE' }];
        setColleges(fallbackCols);
        setForm((prev) => ({ ...prev, collegeId: 2 }));
      }
    }
    loadInstitutes();
  }, []);

  // Load Departments when College changes
  useEffect(() => {
    if (form.collegeId) {
      adminApi.listDepartments(form.collegeId)
        .then((depts) => {
          if (depts && depts.length > 0) {
            setDepartments(depts);
            setForm((prev) => ({ ...prev, deptId: depts[0].id }));
          } else {
            const fallbackDepts = [
              { id: 5, name: 'Computer Engineering', code: 'COMP' },
              { id: 6, name: 'Information Technology', code: 'IT' },
            ];
            setDepartments(fallbackDepts);
            setForm((prev) => ({ ...prev, deptId: 5 }));
          }
        })
        .catch(() => {
          const fallbackDepts = [
            { id: 5, name: 'Computer Engineering', code: 'COMP' },
            { id: 6, name: 'Information Technology', code: 'IT' },
          ];
          setDepartments(fallbackDepts);
          setForm((prev) => ({ ...prev, deptId: 5 }));
        });
    }
  }, [form.collegeId]);

  const selectedRoleConfig = allowedRoles.find((r) => r.value === form.role) || allowedRoles[0];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setLastCreated(null);

    const payload = {
      email: form.email.trim(),
      phone: form.phone.trim(),
      firstName: form.firstName.trim(),
      lastName: form.lastName ? form.lastName.trim() : '',
      role: form.role,
      collegeId: selectedRoleConfig?.collegeScoped
        ? parseInt(form.collegeId) || colleges[0]?.id || 2
        : null,
      deptId: selectedRoleConfig?.deptScoped
        ? parseInt(form.deptId) || departments[0]?.id || 5
        : null,
    };

    try {
      await authApi.createRoleUser(payload);
      success(`User account provisioned for ${payload.email} in PENDING_ACTIVATION status.`);
      setLastCreated({
        email: payload.email,
        role: payload.role,
        name: `${payload.firstName} ${payload.lastName}`,
      });
      setForm({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        role: allowedRoles[0]?.value || 'TNP_COLLEGE_ADMIN',
        collegeId: colleges[0]?.id || '',
        deptId: departments[0]?.id || '',
      });
    } catch (err) {
      showError(err.message || 'Failed to create child role user');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="content-container">
      <div className="page-header">
        <div className="page-eyebrow">
          <Shield size={13} /> Hierarchical Access Governance
        </div>
        <h1 className="page-title">User & Role Provisioning</h1>
        <p className="page-desc">
          Create child roles according to the authorized ladder: <code>Super Admin/IT Admin → College Admin → TnP Coordinator → Ground Volunteer → HOD → Dept Coordinator → Student</code>.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 600px) 1fr', gap: '24px' }}>
        {/* Creation Form */}
        <div className="panel">
          <div className="panel-header">
            <div className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <UserPlus size={16} color="var(--accent-gold)" />
              <span>Provision Subordinate Account</span>
            </div>
            <span className="badge badge-role">Actor: {currentUserRole}</span>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-grid" style={{ marginBottom: '16px' }}>
              <div className="form-group">
                <label className="form-label">First Name *</label>
                <input
                  type="text"
                  required
                  className="form-control"
                  placeholder="e.g. Ramesh"
                  value={form.firstName}
                  onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Last Name</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Shinde"
                  value={form.lastName}
                  onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Official Email *</label>
                <input
                  type="email"
                  required
                  className="form-control"
                  placeholder="name@pccoe.edu"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Phone Number (10 digits) *</label>
                <input
                  type="text"
                  required
                  className="form-control"
                  placeholder="9822334455"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label className="form-label">Target Role * (Permitted for {currentUserRole})</label>
              <select
                className="form-control"
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
              >
                {allowedRoles.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>

            {selectedRoleConfig?.collegeScoped && (
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label className="form-label">Affiliated College *</label>
                <select
                  className="form-control"
                  value={form.collegeId}
                  onChange={(e) => setForm({ ...form, collegeId: e.target.value })}
                >
                  {colleges.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.code})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {selectedRoleConfig?.deptScoped && (
              <div className="form-group" style={{ marginBottom: '20px' }}>
                <label className="form-label">Academic Department *</label>
                <select
                  className="form-control"
                  value={form.deptId}
                  onChange={(e) => setForm({ ...form, deptId: e.target.value })}
                >
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.code})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', padding: '10px 16px' }}
              disabled={loading}
            >
              <UserPlus size={15} />
              {loading ? 'Submitting to auth-service...' : 'Create Role User & Dispatch Invite'}
            </button>
          </form>

          {lastCreated && (
            <div
              className="alert alert-success"
              style={{ marginTop: '20px', flexDirection: 'column', alignItems: 'flex-start' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}>
                <CheckCircle2 size={16} />
                <span>Subordinate User Provisioned Successfully</span>
              </div>
              <div style={{ fontSize: '12px', marginTop: '6px', lineHeight: 1.5 }}>
                Account <strong>{lastCreated.email}</strong> was saved with status{' '}
                <span className="badge badge-pending">PENDING_ACTIVATION</span> and assigned role{' '}
                <span className="badge badge-role">{lastCreated.role}</span>. An activation token was issued.
              </div>
            </div>
          )}
        </div>

        {/* Role Matrix Info Panel */}
        <div className="panel">
          <div className="panel-header">
            <div className="panel-title">Role Creation Ladder</div>
          </div>

          <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            <p style={{ marginBottom: '12px' }}>
              The Placement Management Platform enforces parent-creates-child authorization:
            </p>

            <ul style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <li>
                <strong>Super Admin & IT Admin:</strong> Can bootstrap any institutional or departmental administrator.
              </li>
              <li>
                <strong>College Admin:</strong> Can provision TnP Coordinators and Department HODs within their college.
              </li>
              <li>
                <strong>TnP Coordinator:</strong> Can invite Ground Volunteers and collaborate with HODs.
              </li>
              <li>
                <strong>Head of Department (HOD):</strong> Can provision Faculty Dept Coordinators and verify Students.
              </li>
              <li>
                <strong>Faculty Dept Coordinator:</strong> Can onboard candidate Students within their assigned branch.
              </li>
            </ul>

            <div
              style={{
                marginTop: '20px',
                padding: '12px 14px',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--bg-surface-raised)',
                border: '1px solid var(--border-subtle)',
                fontSize: '12px',
                fontFamily: 'var(--font-mono)',
              }}
            >
              <div style={{ color: 'var(--accent-gold)', fontWeight: 600, marginBottom: '4px' }}>
                SECURITY NOTICE
              </div>
              New users cannot authenticate until they activate their account using the invite token and set their permanent security password.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
