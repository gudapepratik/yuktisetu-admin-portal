import React, { useState, useEffect } from 'react';
import { drivesApi } from '../api/drives';
import { useToast } from '../components/Toast';
import { Modal } from '../components/Modal';
import { Briefcase, Plus, Ban, CheckCircle2, RefreshCw, Mail, Phone } from 'lucide-react';

const COMPANY_TYPES = [
  { value: 'PRODUCT', label: 'Product-based' },
  { value: 'SERVICE', label: 'Service-based' },
  { value: 'HYBRID_CORE', label: 'Hybrid / Core-tech' },
];

const COMPANY_TIERS = ['SUPER_DREAM', 'DREAM', 'CORE', 'MASS', 'STARTUP', 'PSU'];

const STATUS_STYLE = {
  PROSPECT: { className: 'badge-pending', label: 'Prospect' },
  ACTIVE: { className: 'badge-active', label: 'Active' },
  ON_HOLD: { className: 'badge-pending', label: 'On hold' },
  BLACKLISTED: { className: 'badge-inactive', label: 'Blacklisted' },
  INACTIVE: { className: 'badge-inactive', label: 'Inactive' },
};

const EMPTY_FORM = {
  name: '',
  code: '',
  companyType: 'SERVICE',
  tier: 'MASS',
  website: '',
  industry: '',
  description: '',
  hqCity: '',
  primaryContactName: '',
  primaryContactDesignation: '',
  primaryContactEmail: '',
  primaryContactPhone: '',
};

/**
 * Company onboarding -- the first half of "a company comes to the TnP cell".
 * Nothing can be posted until a company exists and is ACTIVE here.
 *
 * Companies are trust-wide records shared by every PCET college, which is what
 * lets one drive target several colleges at once.
 */
export function Companies({ setActiveView }) {
  const { success, error: showError, info } = useToast();

  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const [blacklistTarget, setBlacklistTarget] = useState(null);
  const [blacklistReason, setBlacklistReason] = useState('');

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    setLoading(true);
    try {
      const page = await drivesApi.listCompanies();
      setCompanies(page?.content || []);
    } catch (err) {
      setCompanies([]);
      showError(err.message || 'Could not load companies');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const created = await drivesApi.createCompany(form);
      setCompanies((prev) => [created, ...prev]);
      setIsFormOpen(false);
      setForm(EMPTY_FORM);
      success(`${created.name} onboarded. Mark it Active before posting a drive.`);
    } catch (err) {
      showError(err.message || 'Could not onboard the company');
    } finally {
      setSaving(false);
    }
  };

  const handleActivate = async (company) => {
    try {
      const updated = await drivesApi.setCompanyStatus(company.id, 'ACTIVE');
      setCompanies((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      success(`${updated.name} is now active.`);
    } catch (err) {
      showError(err.message || 'Could not activate the company');
    }
  };

  const handleBlacklist = async (e) => {
    e.preventDefault();
    try {
      const updated = await drivesApi.setCompanyStatus(
        blacklistTarget.id,
        'BLACKLISTED',
        blacklistReason,
      );
      setCompanies((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      setBlacklistTarget(null);
      setBlacklistReason('');
      info(`${updated.name} blacklisted across the trust.`);
    } catch (err) {
      showError(err.message || 'Could not blacklist the company');
    }
  };

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  return (
    <div className="content-container">
      <div className="page-header">
        <div className="page-eyebrow">
          <Briefcase size={13} /> Recruiter Registry
        </div>
        <h1 className="page-title">Companies</h1>
        <p className="page-desc">
          Onboard a recruiter before posting a drive against it. Company records are shared across
          every college in the trust, so one drive can target several at once.
        </p>
      </div>

      <div className="panel">
        <div className="panel-header">
          <div className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Briefcase size={16} color="var(--accent-gold)" />
            <span>Registered companies</span>
            <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '11px' }}>
              {companies.length}
            </span>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn btn-ghost btn-sm" onClick={fetchCompanies} disabled={loading}>
              <RefreshCw size={12} /> Refresh
            </button>
            <button className="btn btn-primary btn-sm" onClick={() => setIsFormOpen(true)}>
              <Plus size={12} /> Onboard company
            </button>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12.5px' }}>
            Loading companies...
          </div>
        ) : companies.length === 0 ? (
          <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12.5px' }}>
            No companies yet. Onboard one to start posting drives.
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Company</th>
                  <th>Code</th>
                  <th>Type</th>
                  <th>Tier</th>
                  <th>Contact</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {companies.map((c) => {
                  const style = STATUS_STYLE[c.status] || STATUS_STYLE.PROSPECT;
                  return (
                    <tr key={c.id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{c.name}</div>
                        {c.industry && (
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{c.industry}</div>
                        )}
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: '12px' }}>{c.code}</td>
                      <td style={{ fontSize: '12px' }}>{c.companyType || '—'}</td>
                      <td style={{ fontSize: '12px' }}>{c.tier || '—'}</td>
                      <td style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                        {c.website || '—'}
                      </td>
                      <td>
                        <span className={`badge ${style.className}`}>{style.label}</span>
                      </td>
                      <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                        {c.status !== 'ACTIVE' && c.status !== 'BLACKLISTED' && (
                          <button className="btn btn-ghost btn-sm" onClick={() => handleActivate(c)}>
                            <CheckCircle2 size={12} /> Activate
                          </button>
                        )}
                        {c.status !== 'BLACKLISTED' && (
                          <button
                            className="btn btn-ghost btn-sm"
                            style={{ color: 'var(--danger)' }}
                            onClick={() => setBlacklistTarget(c)}
                          >
                            <Ban size={12} /> Blacklist
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ---------- Onboard ---------- */}
      <Modal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} title="Onboard a company" wide>
        <form onSubmit={handleCreate}>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Company name *</label>
              <input className="form-control" required placeholder="Infosys Limited"
                     value={form.name} onChange={set('name')} />
            </div>
            <div className="form-group">
              <label className="form-label">Short code *</label>
              <input className="form-control" required placeholder="INFY"
                     value={form.code} onChange={set('code')} />
            </div>

            <div className="form-group">
              <label className="form-label">Company type</label>
              <select className="form-control" value={form.companyType} onChange={set('companyType')}>
                {COMPANY_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Tier</label>
              <select className="form-control" value={form.tier} onChange={set('tier')}>
                {COMPANY_TIERS.map((t) => (
                  <option key={t} value={t}>{t.replace('_', ' ')}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Industry</label>
              <input className="form-control" placeholder="IT Services"
                     value={form.industry} onChange={set('industry')} />
            </div>
            <div className="form-group">
              <label className="form-label">Headquarters city</label>
              <input className="form-control" placeholder="Bengaluru"
                     value={form.hqCity} onChange={set('hqCity')} />
            </div>

            <div className="form-group">
              <label className="form-label">Website</label>
              <input className="form-control" placeholder="https://infosys.com"
                     value={form.website} onChange={set('website')} />
            </div>
            <div className="form-group">
              <label className="form-label">Description</label>
              <input className="form-control" placeholder="What the company does"
                     value={form.description} onChange={set('description')} />
            </div>
          </div>

          <div style={{
            borderTop: '1px solid var(--divider)', marginTop: '16px', paddingTop: '12px',
            marginBottom: '12px', fontSize: '11px', color: 'var(--text-muted)',
            fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.08em',
          }}>
            Primary contact — optional
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Contact name</label>
              <input className="form-control" placeholder="Priya Sharma"
                     value={form.primaryContactName} onChange={set('primaryContactName')} />
            </div>
            <div className="form-group">
              <label className="form-label">Designation</label>
              <input className="form-control" placeholder="Campus Hiring Lead"
                     value={form.primaryContactDesignation} onChange={set('primaryContactDesignation')} />
            </div>
            <div className="form-group">
              <label className="form-label">
                <Mail size={11} style={{ verticalAlign: '-1px' }} /> Email
              </label>
              <input className="form-control" type="email" placeholder="campus@infosys.com"
                     value={form.primaryContactEmail} onChange={set('primaryContactEmail')} />
            </div>
            <div className="form-group">
              <label className="form-label">
                <Phone size={11} style={{ verticalAlign: '-1px' }} /> Phone
              </label>
              <input className="form-control" placeholder="+91 98765 43210"
                     value={form.primaryContactPhone} onChange={set('primaryContactPhone')} />
            </div>
          </div>

          <div className="modal-footer">
            <span style={{ marginRight: 'auto', fontSize: '11.5px', color: 'var(--text-muted)' }}>
              Onboards as a prospect — activate it to post drives.
            </span>
            <button type="button" className="btn btn-ghost" onClick={() => setIsFormOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Onboarding...' : 'Onboard company'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ---------- Blacklist ---------- */}
      <Modal
        isOpen={!!blacklistTarget}
        onClose={() => setBlacklistTarget(null)}
        title={`Blacklist ${blacklistTarget?.name || ''}`}
      >
        <form onSubmit={handleBlacklist}>
          <div className="alert alert-danger" style={{ marginBottom: '14px' }}>
            This cuts the recruiter off for every college in the trust, and blocks new postings
            against them. The reason is recorded.
          </div>
          <div className="form-group" style={{ marginBottom: '12px' }}>
            <label className="form-label">Reason *</label>
            <textarea className="form-control" rows={3} required
                      placeholder="Why this company is being blacklisted"
                      value={blacklistReason}
                      onChange={(e) => setBlacklistReason(e.target.value)} />
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={() => setBlacklistTarget(null)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-danger">Blacklist company</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
