import React, { useState, useEffect } from 'react';
import { adminApi } from '../api/admin';
import { useToast } from '../components/Toast';
import { Modal } from '../components/Modal';
import { Building2, School, Layers, Plus, CheckCircle, RefreshCw } from 'lucide-react';

export function Institutes() {
  const { success, error: showError } = useToast();

  const [trusts, setTrusts] = useState([]);
  const [colleges, setColleges] = useState([]);
  const [departments, setDepartments] = useState([]);

  const [selectedTrustId, setSelectedTrustId] = useState(null);
  const [selectedCollegeId, setSelectedCollegeId] = useState(null);
  const [loading, setLoading] = useState(true);

  // Modals
  const [isTrustModalOpen, setIsTrustModalOpen] = useState(false);
  const [isCollegeModalOpen, setIsCollegeModalOpen] = useState(false);
  const [isDeptModalOpen, setIsDeptModalOpen] = useState(false);

  const [trustForm, setTrustForm] = useState({
    name: '',
    code: '',
    primaryContactEmail: '',
    primaryContactPhone: '',
    logoUrl: '',
  });

  const [collegeForm, setCollegeForm] = useState({
    name: '',
    code: '',
    address: '',
    primaryContactName: '',
    primaryContactEmail: '',
    primaryContactPhone: '',
    logoUrl: '',
  });

  const [deptForm, setDeptForm] = useState({
    name: '',
    code: '',
  });

  // Fetch Trusts on Mount
  useEffect(() => {
    fetchTrusts();
  }, []);

  const fetchTrusts = async () => {
    setLoading(true);
    try {
      const data = await adminApi.listTrusts();
      if (data && data.length > 0) {
        setTrusts(data);
        setSelectedTrustId(data[0].id);
      } else {
        const fallback = [
          {
            id: 1,
            name: 'Pimpri Chinchwad Education Trust',
            code: 'PCET',
            primaryContactEmail: 'trust@pcet.org.in',
            status: 'ACTIVE',
          },
        ];
        setTrusts(fallback);
        setSelectedTrustId(1);
      }
    } catch {
      const fallback = [
        {
          id: 1,
          name: 'Pimpri Chinchwad Education Trust',
          code: 'PCET',
          primaryContactEmail: 'trust@pcet.org.in',
          status: 'ACTIVE',
        },
      ];
      setTrusts(fallback);
      setSelectedTrustId(1);
    } finally {
      setLoading(false);
    }
  };

  // Fetch Colleges when Trust selected
  useEffect(() => {
    if (selectedTrustId) {
      adminApi
        .listColleges(selectedTrustId)
        .then((data) => {
          if (data && data.length > 0) {
            setColleges(data);
            setSelectedCollegeId(data[0].id);
          } else {
            const fallback = [
              {
                id: 2,
                trustId: selectedTrustId,
                name: 'Pimpri Chinchwad College of Engineering',
                code: 'PCCOE',
                primaryContactEmail: 'principal@pccoepune.org',
                status: 'ACTIVE',
              },
            ];
            setColleges(fallback);
            setSelectedCollegeId(2);
          }
        })
        .catch(() => {
          const fallback = [
            {
              id: 2,
              trustId: selectedTrustId,
              name: 'Pimpri Chinchwad College of Engineering',
              code: 'PCCOE',
              primaryContactEmail: 'principal@pccoepune.org',
              status: 'ACTIVE',
            },
          ];
          setColleges(fallback);
          setSelectedCollegeId(2);
        });
    }
  }, [selectedTrustId]);

  // Fetch Departments when College selected
  useEffect(() => {
    if (selectedCollegeId) {
      adminApi
        .listDepartments(selectedCollegeId)
        .then((data) => {
          if (data && data.length > 0) {
            setDepartments(data);
          } else {
            const fallback = [
              { id: 5, collegeId: selectedCollegeId, name: 'Computer Engineering', code: 'COMP', status: 'ACTIVE' },
              { id: 6, collegeId: selectedCollegeId, name: 'Information Technology', code: 'IT', status: 'ACTIVE' },
              { id: 7, collegeId: selectedCollegeId, name: 'Mechanical Engineering', code: 'MECH', status: 'ACTIVE' },
            ];
            setDepartments(fallback);
          }
        })
        .catch(() => {
          const fallback = [
            { id: 5, collegeId: selectedCollegeId, name: 'Computer Engineering', code: 'COMP', status: 'ACTIVE' },
            { id: 6, collegeId: selectedCollegeId, name: 'Information Technology', code: 'IT', status: 'ACTIVE' },
            { id: 7, collegeId: selectedCollegeId, name: 'Mechanical Engineering', code: 'MECH', status: 'ACTIVE' },
          ];
          setDepartments(fallback);
        });
    }
  }, [selectedCollegeId]);

  // Create Trust
  const handleCreateTrust = async (e) => {
    e.preventDefault();
    try {
      const newTrust = await adminApi.createTrust(trustForm);
      setTrusts((prev) => [...prev, newTrust]);
      setSelectedTrustId(newTrust.id);
      setIsTrustModalOpen(false);
      setTrustForm({ name: '', code: '', primaryContactEmail: '', primaryContactPhone: '', logoUrl: '' });
      success(`Educational Trust "${newTrust.name}" created successfully.`);
    } catch (err) {
      showError(err.message || 'Failed to create trust');
    }
  };

  // Create College
  const handleCreateCollege = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...collegeForm, trustId: parseInt(selectedTrustId) };
      const newCollege = await adminApi.createCollege(payload);
      setColleges((prev) => [...prev, newCollege]);
      setSelectedCollegeId(newCollege.id);
      setIsCollegeModalOpen(false);
      setCollegeForm({
        name: '',
        code: '',
        address: '',
        primaryContactName: '',
        primaryContactEmail: '',
        primaryContactPhone: '',
        logoUrl: '',
      });
      success(`College "${newCollege.name}" added to Trust.`);
    } catch (err) {
      showError(err.message || 'Failed to create college');
    }
  };

  // Create Department
  const handleCreateDept = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...deptForm, collegeId: parseInt(selectedCollegeId) };
      const newDept = await adminApi.createDepartment(payload);
      setDepartments((prev) => [...prev, newDept]);
      setIsDeptModalOpen(false);
      setDeptForm({ name: '', code: '' });
      success(`Department "${newDept.name}" created under college.`);
    } catch (err) {
      showError(err.message || 'Failed to create department');
    }
  };

  return (
    <div className="content-container">
      <div className="page-header">
        <div className="page-eyebrow">
          <Building2 size={13} /> Multi-Tier Organization
        </div>
        <h1 className="page-title">Institutional Hierarchy Governance</h1>
        <p className="page-desc">
          Configure educational trusts, affiliated colleges, and academic departments across the placement ecosystem.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
        {/* Tier 1: Educational Trusts */}
        <div className="panel">
          <div className="panel-header">
            <div className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Building2 size={16} color="var(--accent-gold)" />
              <span>1. Educational Trusts</span>
            </div>
            <button className="btn btn-primary btn-sm" onClick={() => setIsTrustModalOpen(true)}>
              <Plus size={12} /> Add
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {trusts.map((t) => (
              <div
                key={t.id}
                onClick={() => setSelectedTrustId(t.id)}
                style={{
                  padding: '12px 14px',
                  borderRadius: 'var(--radius-md)',
                  background:
                    selectedTrustId === t.id
                      ? 'rgba(212, 155, 75, 0.12)'
                      : 'var(--bg-surface-raised)',
                  border: `1px solid ${
                    selectedTrustId === t.id ? 'var(--accent-gold)' : 'var(--border-subtle)'
                  }`,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <div style={{ fontWeight: 600, fontSize: '13.5px' }}>{t.name}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
                  Code: {t.code} · Status: {t.status}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Tier 2: Affiliated Colleges */}
        <div className="panel">
          <div className="panel-header">
            <div className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <School size={16} color="var(--accent-blue)" />
              <span>2. Colleges</span>
            </div>
            <button
              className="btn btn-primary btn-sm"
              onClick={() => setIsCollegeModalOpen(true)}
              disabled={!selectedTrustId}
            >
              <Plus size={12} /> Add
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {colleges.length > 0 ? (
              colleges.map((c) => (
                <div
                  key={c.id}
                  onClick={() => setSelectedCollegeId(c.id)}
                  style={{
                    padding: '12px 14px',
                    borderRadius: 'var(--radius-md)',
                    background:
                      selectedCollegeId === c.id
                        ? 'rgba(77, 141, 247, 0.12)'
                        : 'var(--bg-surface-raised)',
                    border: `1px solid ${
                      selectedCollegeId === c.id ? 'var(--accent-blue)' : 'var(--border-subtle)'
                    }`,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ fontWeight: 600, fontSize: '13.5px' }}>{c.name}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
                    Code: {c.code} · Contact: {c.primaryContactEmail}
                  </div>
                </div>
              ))
            ) : (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12.5px' }}>
                No colleges registered under selected trust.
              </div>
            )}
          </div>
        </div>

        {/* Tier 3: Departments */}
        <div className="panel">
          <div className="panel-header">
            <div className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Layers size={16} color="var(--accent-teal)" />
              <span>3. Departments</span>
            </div>
            <button
              className="btn btn-primary btn-sm"
              onClick={() => setIsDeptModalOpen(true)}
              disabled={!selectedCollegeId}
            >
              <Plus size={12} /> Add
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {departments.length > 0 ? (
              departments.map((d) => (
                <div
                  key={d.id}
                  style={{
                    padding: '12px 14px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-surface-raised)',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  <div style={{ fontWeight: 600, fontSize: '13.5px' }}>{d.name}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
                    Code: {d.code} · Status: {d.status}
                  </div>
                </div>
              ))
            ) : (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12.5px' }}>
                No departments under selected college.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      <Modal isOpen={isTrustModalOpen} onClose={() => setIsTrustModalOpen(false)} title="Create Educational Trust">
        <form onSubmit={handleCreateTrust}>
          <div className="form-group" style={{ marginBottom: '12px' }}>
            <label className="form-label">Trust Name *</label>
            <input
              type="text"
              required
              className="form-control"
              placeholder="e.g. Pimpri Chinchwad Education Trust"
              value={trustForm.name}
              onChange={(e) => setTrustForm({ ...trustForm, name: e.target.value })}
            />
          </div>
          <div className="form-group" style={{ marginBottom: '12px' }}>
            <label className="form-label">Trust Code *</label>
            <input
              type="text"
              required
              className="form-control"
              placeholder="PCET"
              value={trustForm.code}
              onChange={(e) => setTrustForm({ ...trustForm, code: e.target.value })}
            />
          </div>
          <div className="form-group" style={{ marginBottom: '18px' }}>
            <label className="form-label">Primary Contact Email *</label>
            <input
              type="email"
              required
              className="form-control"
              placeholder="trust@pcet.org.in"
              value={trustForm.primaryContactEmail}
              onChange={(e) => setTrustForm({ ...trustForm, primaryContactEmail: e.target.value })}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button type="button" className="btn btn-ghost" onClick={() => setIsTrustModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Create Trust
            </button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={isCollegeModalOpen} onClose={() => setIsCollegeModalOpen(false)} title="Add College to Selected Trust">
        <form onSubmit={handleCreateCollege}>
          <div className="form-group" style={{ marginBottom: '12px' }}>
            <label className="form-label">College Name *</label>
            <input
              type="text"
              required
              className="form-control"
              placeholder="Pimpri Chinchwad College of Engineering"
              value={collegeForm.name}
              onChange={(e) => setCollegeForm({ ...collegeForm, name: e.target.value })}
            />
          </div>
          <div className="form-group" style={{ marginBottom: '12px' }}>
            <label className="form-label">College Code *</label>
            <input
              type="text"
              required
              className="form-control"
              placeholder="PCCOE"
              value={collegeForm.code}
              onChange={(e) => setCollegeForm({ ...collegeForm, code: e.target.value })}
            />
          </div>
          <div className="form-group" style={{ marginBottom: '18px' }}>
            <label className="form-label">Principal / TnP Contact Email *</label>
            <input
              type="email"
              required
              className="form-control"
              placeholder="principal@pccoepune.org"
              value={collegeForm.primaryContactEmail}
              onChange={(e) => setCollegeForm({ ...collegeForm, primaryContactEmail: e.target.value })}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button type="button" className="btn btn-ghost" onClick={() => setIsCollegeModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Add College
            </button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={isDeptModalOpen} onClose={() => setIsDeptModalOpen(false)} title="Add Academic Department">
        <form onSubmit={handleCreateDept}>
          <div className="form-group" style={{ marginBottom: '12px' }}>
            <label className="form-label">Department Name *</label>
            <input
              type="text"
              required
              className="form-control"
              placeholder="Computer Engineering"
              value={deptForm.name}
              onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })}
            />
          </div>
          <div className="form-group" style={{ marginBottom: '18px' }}>
            <label className="form-label">Department Code *</label>
            <input
              type="text"
              required
              className="form-control"
              placeholder="COMP"
              value={deptForm.code}
              onChange={(e) => setDeptForm({ ...deptForm, code: e.target.value })}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button type="button" className="btn btn-ghost" onClick={() => setIsDeptModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Create Department
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
