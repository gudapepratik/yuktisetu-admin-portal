import React, { useState, useEffect, useCallback } from 'react';
import { adminApi } from '../api/admin';
import { useToast } from '../components/Toast';
import { Modal } from '../components/Modal';
import {
  Building2, School, Layers, Plus, RefreshCw, Pencil, Trash2,
  Power, RotateCcw, AlertTriangle, ChevronDown, ChevronRight,
} from 'lucide-react';

/**
 * The Trust -> College -> Department hierarchy, with the full set of verbs.
 *
 * Editing goes through PATCH, not PUT, and sends only the fields that actually
 * changed. PUT is a full replacement, so an admin fixing a typo in a phone
 * number would blank the logo and address simply by not resending them.
 *
 * Deletion is two-stage and the stages are deliberately unequal. Soft-delete is
 * reversible and the backend refuses it outright while anything live still
 * points at the record -- the 409 names the counts, so "3 active departments and
 * 168 active role assignments" is shown verbatim rather than a generic failure.
 * Hard-delete is irreversible, IT-Admin-only, reachable only from the Deleted
 * drawer, and requires typing the record's code.
 */

// Each tier's editable fields. Drives both the edit modal and the PATCH diff,
// so adding a field in one place is enough.
const EDIT_FIELDS = {
  trust: [
    { key: 'name', label: 'Trust name', required: true },
    { key: 'code', label: 'Trust code', required: true, mono: true },
    { key: 'primaryContactEmail', label: 'Primary contact email', type: 'email' },
    { key: 'primaryContactPhone', label: 'Primary contact phone', type: 'tel' },
    { key: 'logoUrl', label: 'Logo URL', type: 'url' },
  ],
  college: [
    { key: 'name', label: 'College name', required: true },
    { key: 'code', label: 'College code', required: true, mono: true },
    { key: 'address', label: 'Address', multiline: true },
    { key: 'primaryContactName', label: 'Primary contact name' },
    { key: 'primaryContactEmail', label: 'Primary contact email', type: 'email' },
    { key: 'primaryContactPhone', label: 'Primary contact phone', type: 'tel' },
    { key: 'logoUrl', label: 'Logo URL', type: 'url' },
  ],
  department: [
    { key: 'name', label: 'Department name', required: true },
    { key: 'code', label: 'Department code', required: true, mono: true },
  ],
};

const TIER_LABEL = { trust: 'Trust', college: 'College', department: 'Department' };

const API = {
  trust: {
    patch: adminApi.patchTrust,
    status: adminApi.updateTrustStatus,
    softDelete: adminApi.softDeleteTrust,
    restore: adminApi.restoreTrust,
    hardDelete: adminApi.hardDeleteTrust,
  },
  college: {
    patch: adminApi.patchCollege,
    status: adminApi.updateCollegeStatus,
    softDelete: adminApi.softDeleteCollege,
    restore: adminApi.restoreCollege,
    hardDelete: adminApi.hardDeleteCollege,
  },
  department: {
    patch: adminApi.patchDepartment,
    status: adminApi.updateDepartmentStatus,
    softDelete: adminApi.softDeleteDepartment,
    restore: adminApi.restoreDepartment,
    hardDelete: adminApi.hardDeleteDepartment,
  },
};

/** Sends only what changed; an unchanged field must not appear in the PATCH body. */
function diffFields(tier, original, draft) {
  const changed = {};
  EDIT_FIELDS[tier].forEach(({ key }) => {
    const before = original[key] ?? '';
    const after = draft[key] ?? '';
    if (before !== after) changed[key] = after;
  });
  return changed;
}

function StatusPill({ status }) {
  const active = status === 'ACTIVE';
  return (
    <span
      className={`badge ${active ? 'badge-active' : 'badge-inactive'}`}
      style={{ fontSize: '9.5px', padding: '1px 6px' }}
    >
      {status}
    </span>
  );
}

function RowActions({ item, tier, onEdit, onToggleStatus, onDelete }) {
  const active = item.status === 'ACTIVE';
  return (
    <div style={{ display: 'flex', gap: '2px' }} onClick={(e) => e.stopPropagation()}>
      <button className="btn btn-ghost btn-sm" title="Edit" onClick={() => onEdit(tier, item)}>
        <Pencil size={12} />
      </button>
      <button
        className="btn btn-ghost btn-sm"
        title={active ? 'Deactivate' : 'Activate'}
        onClick={() => onToggleStatus(tier, item)}
      >
        <Power size={12} color={active ? 'var(--text-muted)' : 'var(--success)'} />
      </button>
      <button className="btn btn-ghost btn-sm" title="Delete" onClick={() => onDelete(tier, item)}>
        <Trash2 size={12} color="var(--danger)" />
      </button>
    </div>
  );
}

function EntityCard({ item, tier, selected, onSelect, accent, subtitle, ...actions }) {
  return (
    <div
      onClick={onSelect}
      style={{
        padding: '10px 12px',
        borderRadius: 'var(--radius-md)',
        background: selected ? `rgba(${accent}, 0.12)` : 'var(--bg-surface-raised)',
        border: `1px solid ${selected ? `rgb(${accent})` : 'var(--border-subtle)'}`,
        cursor: onSelect ? 'pointer' : 'default',
        transition: 'all 0.15s ease',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '6px' }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</span>
            <StatusPill status={item.status} />
          </div>
          <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: '3px' }}>
            {subtitle}
          </div>
        </div>
        <RowActions item={item} tier={tier} {...actions} />
      </div>
    </div>
  );
}

/** The Deleted drawer. Collapsed by default -- it is a recovery tool, not part of the daily view. */
function DeletedDrawer({ tier, items, open, onToggle, onRestore, onHardDelete, disabled }) {
  if (disabled) return null;
  return (
    <div style={{ marginTop: '10px', borderTop: '1px solid var(--border-subtle)', paddingTop: '8px' }}>
      <button
        className="btn btn-ghost btn-sm"
        onClick={onToggle}
        style={{ fontSize: '11px', color: 'var(--text-muted)', padding: '2px 4px' }}
      >
        {open ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
        Deleted{items.length > 0 ? ` (${items.length})` : ''}
      </button>

      {open && (
        items.length === 0 ? (
          <div style={{ padding: '8px 4px', fontSize: '11px', color: 'var(--text-muted)' }}>
            Nothing deleted here.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '6px' }}>
            {items.map((d) => (
              <div
                key={d.id}
                style={{
                  padding: '8px 10px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-surface)',
                  border: '1px dashed var(--border-subtle)',
                  opacity: 0.85,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '6px' }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '12px', textDecoration: 'line-through', color: 'var(--text-muted)' }}>
                      {d.name}
                    </div>
                    <div style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                      {d.code}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '2px' }}>
                    <button className="btn btn-ghost btn-sm" title="Restore" onClick={() => onRestore(tier, d)}>
                      <RotateCcw size={12} color="var(--success)" />
                    </button>
                    <button
                      className="btn btn-ghost btn-sm"
                      title="Delete permanently"
                      onClick={() => onHardDelete(tier, d)}
                    >
                      <AlertTriangle size={12} color="var(--danger)" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}

export function Institutes() {
  const { success, error: showError, info } = useToast();

  const [trusts, setTrusts] = useState([]);
  const [colleges, setColleges] = useState([]);
  const [departments, setDepartments] = useState([]);

  const [deletedTrusts, setDeletedTrusts] = useState([]);
  const [deletedColleges, setDeletedColleges] = useState([]);
  const [deletedDepartments, setDeletedDepartments] = useState([]);
  const [openDrawer, setOpenDrawer] = useState({ trust: false, college: false, department: false });

  const [selectedTrustId, setSelectedTrustId] = useState(null);
  const [selectedCollegeId, setSelectedCollegeId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [isTrustModalOpen, setIsTrustModalOpen] = useState(false);
  const [isCollegeModalOpen, setIsCollegeModalOpen] = useState(false);
  const [isDeptModalOpen, setIsDeptModalOpen] = useState(false);

  // { tier, item, draft } while an edit is open
  const [editing, setEditing] = useState(null);
  // { tier, item, typed } while a permanent deletion is being confirmed
  const [confirming, setConfirming] = useState(null);

  const [trustForm, setTrustForm] = useState({
    name: '', code: '', primaryContactEmail: '', primaryContactPhone: '', logoUrl: '',
  });
  const [collegeForm, setCollegeForm] = useState({
    name: '', code: '', address: '', primaryContactName: '',
    primaryContactEmail: '', primaryContactPhone: '', logoUrl: '',
  });
  const [deptForm, setDeptForm] = useState({ name: '', code: '' });

  // ---------------------------------------------------------------- loading

  const loadTrusts = useCallback(async (keepSelection = false) => {
    try {
      const data = (await adminApi.listTrusts()) || [];
      setTrusts(data);
      setSelectedTrustId((prev) =>
        keepSelection && data.some((t) => t.id === prev) ? prev : (data[0]?.id ?? null));
    } catch (err) {
      setTrusts([]);
      setSelectedTrustId(null);
      showError(err.message || 'Failed to load trusts');
    }
  }, []);

  const loadColleges = useCallback(async (trustId, keepSelection = false) => {
    if (!trustId) { setColleges([]); setSelectedCollegeId(null); return; }
    try {
      const data = (await adminApi.listColleges(trustId)) || [];
      setColleges(data);
      setSelectedCollegeId((prev) =>
        keepSelection && data.some((c) => c.id === prev) ? prev : (data[0]?.id ?? null));
    } catch (err) {
      setColleges([]);
      setSelectedCollegeId(null);
      showError(err.message || 'Failed to load colleges');
    }
  }, []);

  const loadDepartments = useCallback(async (collegeId) => {
    if (!collegeId) { setDepartments([]); return; }
    try {
      setDepartments((await adminApi.listDepartments(collegeId)) || []);
    } catch (err) {
      setDepartments([]);
      showError(err.message || 'Failed to load departments');
    }
  }, []);

  // Deleted rows are fetched only while their drawer is open -- an extra call
  // per tier on every page load would be paid by everyone to serve a recovery
  // case that comes up rarely.
  const loadDeleted = useCallback(async (tier) => {
    try {
      if (tier === 'trust') setDeletedTrusts((await adminApi.listDeletedTrusts()) || []);
      if (tier === 'college' && selectedTrustId) {
        setDeletedColleges((await adminApi.listDeletedColleges(selectedTrustId)) || []);
      }
      if (tier === 'department' && selectedCollegeId) {
        setDeletedDepartments((await adminApi.listDeletedDepartments(selectedCollegeId)) || []);
      }
    } catch (err) {
      showError(err.message || `Failed to load deleted ${tier}s`);
    }
  }, [selectedTrustId, selectedCollegeId]);

  useEffect(() => { loadTrusts().finally(() => setLoading(false)); }, [loadTrusts]);
  useEffect(() => { loadColleges(selectedTrustId); }, [selectedTrustId, loadColleges]);
  useEffect(() => { loadDepartments(selectedCollegeId); }, [selectedCollegeId, loadDepartments]);

  useEffect(() => { if (openDrawer.trust) loadDeleted('trust'); }, [openDrawer.trust, loadDeleted]);
  useEffect(() => { if (openDrawer.college) loadDeleted('college'); }, [openDrawer.college, selectedTrustId, loadDeleted]);
  useEffect(() => { if (openDrawer.department) loadDeleted('department'); }, [openDrawer.department, selectedCollegeId, loadDeleted]);

  /** Re-reads whichever tier changed, plus its drawer if it happens to be open. */
  const refreshTier = async (tier) => {
    if (tier === 'trust') await loadTrusts(true);
    if (tier === 'college') await loadColleges(selectedTrustId, true);
    if (tier === 'department') await loadDepartments(selectedCollegeId);
    if (openDrawer[tier]) await loadDeleted(tier);
  };

  // ---------------------------------------------------------------- create

  const handleCreateTrust = async (e) => {
    e.preventDefault();
    try {
      const created = await adminApi.createTrust(trustForm);
      await loadTrusts(true);
      setSelectedTrustId(created.id);
      setIsTrustModalOpen(false);
      setTrustForm({ name: '', code: '', primaryContactEmail: '', primaryContactPhone: '', logoUrl: '' });
      success(`Trust "${created.name}" created.`);
    } catch (err) {
      showError(err.message || 'Failed to create trust');
    }
  };

  const handleCreateCollege = async (e) => {
    e.preventDefault();
    try {
      const created = await adminApi.createCollege({ ...collegeForm, trustId: selectedTrustId });
      await loadColleges(selectedTrustId, true);
      setSelectedCollegeId(created.id);
      setIsCollegeModalOpen(false);
      setCollegeForm({
        name: '', code: '', address: '', primaryContactName: '',
        primaryContactEmail: '', primaryContactPhone: '', logoUrl: '',
      });
      success(`College "${created.name}" added.`);
    } catch (err) {
      showError(err.message || 'Failed to create college');
    }
  };

  const handleCreateDept = async (e) => {
    e.preventDefault();
    try {
      const created = await adminApi.createDepartment({ ...deptForm, collegeId: selectedCollegeId });
      await loadDepartments(selectedCollegeId);
      setIsDeptModalOpen(false);
      setDeptForm({ name: '', code: '' });
      success(`Department "${created.name}" created.`);
    } catch (err) {
      showError(err.message || 'Failed to create department');
    }
  };

  // ---------------------------------------------------------------- verbs

  const openEdit = (tier, item) => {
    const draft = {};
    EDIT_FIELDS[tier].forEach(({ key }) => { draft[key] = item[key] ?? ''; });
    setEditing({ tier, item, draft });
  };

  const saveEdit = async (e) => {
    e.preventDefault();
    const { tier, item, draft } = editing;
    const changed = diffFields(tier, item, draft);

    if (Object.keys(changed).length === 0) {
      info('Nothing changed.');
      setEditing(null);
      return;
    }

    setBusy(true);
    try {
      await API[tier].patch(item.id, changed);
      await refreshTier(tier);
      setEditing(null);
      success(`${TIER_LABEL[tier]} updated — ${Object.keys(changed).join(', ')}.`);
    } catch (err) {
      showError(err.message || `Could not update the ${tier}`);
    } finally {
      setBusy(false);
    }
  };

  const toggleStatus = async (tier, item) => {
    const next = item.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    setBusy(true);
    try {
      await API[tier].status(item.id, next);
      await refreshTier(tier);
      success(`${item.name} is now ${next}.`);
    } catch (err) {
      showError(err.message || 'Could not change the status');
    } finally {
      setBusy(false);
    }
  };

  /**
   * The backend refuses this while anything live still references the record and
   * returns a 409 naming the counts. That message is far more useful than
   * anything this component could invent, so it is surfaced verbatim.
   */
  const softDelete = async (tier, item) => {
    setBusy(true);
    try {
      await API[tier].softDelete(item.id);
      await refreshTier(tier);
      success(`${item.name} deleted. Restore it from the Deleted drawer.`);
    } catch (err) {
      showError(err.message || `Could not delete the ${tier}`);
    } finally {
      setBusy(false);
    }
  };

  const restore = async (tier, item) => {
    setBusy(true);
    try {
      await API[tier].restore(item.id);
      await refreshTier(tier);
      success(`${item.name} restored.`);
    } catch (err) {
      showError(err.message || `Could not restore the ${tier}`);
    } finally {
      setBusy(false);
    }
  };

  const confirmHardDelete = async () => {
    const { tier, item } = confirming;
    setBusy(true);
    try {
      await API[tier].hardDelete(item.id);
      await refreshTier(tier);
      setConfirming(null);
      success(`${item.name} permanently deleted.`);
    } catch (err) {
      showError(err.message || `Could not permanently delete the ${tier}`);
    } finally {
      setBusy(false);
    }
  };

  const rowHandlers = { onEdit: openEdit, onToggleStatus: toggleStatus, onDelete: softDelete };

  if (loading) {
    return (
      <div className="content-container" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
        <RefreshCw size={20} className="spin" /> Loading hierarchy...
      </div>
    );
  }

  return (
    <div className="content-container">
      <div className="page-header">
        <div className="page-eyebrow">
          <Building2 size={13} /> Multi-Tier Organization
        </div>
        <h1 className="page-title">Institutional Hierarchy Governance</h1>
        <p className="page-desc">
          Configure educational trusts, affiliated colleges, and academic departments across the
          placement ecosystem. Deleting is refused while staff, departments or drives still point at
          a record.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
        {/* ---------------- Tier 1: Trusts ---------------- */}
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
            {trusts.length > 0 ? trusts.map((t) => (
              <EntityCard
                key={t.id}
                item={t}
                tier="trust"
                selected={selectedTrustId === t.id}
                onSelect={() => setSelectedTrustId(t.id)}
                accent="212, 155, 75"
                subtitle={`Code: ${t.code}`}
                {...rowHandlers}
              />
            )) : (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12.5px' }}>
                No trusts registered.
              </div>
            )}
          </div>

          <DeletedDrawer
            tier="trust"
            items={deletedTrusts}
            open={openDrawer.trust}
            onToggle={() => setOpenDrawer((p) => ({ ...p, trust: !p.trust }))}
            onRestore={restore}
            onHardDelete={(tier, item) => setConfirming({ tier, item, typed: '' })}
          />
        </div>

        {/* ---------------- Tier 2: Colleges ---------------- */}
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
            {colleges.length > 0 ? colleges.map((c) => (
              <EntityCard
                key={c.id}
                item={c}
                tier="college"
                selected={selectedCollegeId === c.id}
                onSelect={() => setSelectedCollegeId(c.id)}
                accent="77, 141, 247"
                subtitle={`Code: ${c.code}${c.primaryContactEmail ? ` · ${c.primaryContactEmail}` : ''}`}
                {...rowHandlers}
              />
            )) : (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12.5px' }}>
                No colleges registered under selected trust.
              </div>
            )}
          </div>

          <DeletedDrawer
            tier="college"
            items={deletedColleges}
            open={openDrawer.college}
            onToggle={() => setOpenDrawer((p) => ({ ...p, college: !p.college }))}
            onRestore={restore}
            onHardDelete={(tier, item) => setConfirming({ tier, item, typed: '' })}
            disabled={!selectedTrustId}
          />
        </div>

        {/* ---------------- Tier 3: Departments ---------------- */}
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
            {departments.length > 0 ? departments.map((d) => (
              <EntityCard
                key={d.id}
                item={d}
                tier="department"
                selected={false}
                onSelect={null}
                accent="45, 190, 165"
                subtitle={`Code: ${d.code}`}
                {...rowHandlers}
              />
            )) : (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12.5px' }}>
                No departments under selected college.
              </div>
            )}
          </div>

          <DeletedDrawer
            tier="department"
            items={deletedDepartments}
            open={openDrawer.department}
            onToggle={() => setOpenDrawer((p) => ({ ...p, department: !p.department }))}
            onRestore={restore}
            onHardDelete={(tier, item) => setConfirming({ tier, item, typed: '' })}
            disabled={!selectedCollegeId}
          />
        </div>
      </div>

      {/* ---------------- Edit (PATCH) ---------------- */}
      <Modal
        isOpen={!!editing}
        onClose={() => setEditing(null)}
        title={editing ? `Edit ${TIER_LABEL[editing.tier]}` : ''}
      >
        {editing && (
          <form onSubmit={saveEdit}>
            <p style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginBottom: '14px' }}>
              Only the fields you change are sent. Clearing an optional field blanks it.
            </p>
            {EDIT_FIELDS[editing.tier].map((f) => (
              <div key={f.key} className="form-group" style={{ marginBottom: '12px' }}>
                <label className="form-label">{f.label}{f.required ? ' *' : ''}</label>
                {f.multiline ? (
                  <textarea
                    className="form-control"
                    rows={3}
                    required={f.required}
                    value={editing.draft[f.key]}
                    onChange={(e) => setEditing({
                      ...editing, draft: { ...editing.draft, [f.key]: e.target.value },
                    })}
                  />
                ) : (
                  <input
                    type={f.type || 'text'}
                    className="form-control"
                    required={f.required}
                    style={f.mono ? { fontFamily: 'var(--font-mono)' } : undefined}
                    value={editing.draft[f.key]}
                    onChange={(e) => setEditing({
                      ...editing, draft: { ...editing.draft, [f.key]: e.target.value },
                    })}
                  />
                )}
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '18px' }}>
              <button type="button" className="btn btn-ghost" onClick={() => setEditing(null)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={busy}>
                {busy ? 'Saving...' : 'Save changes'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* ---------------- Permanent deletion ---------------- */}
      <Modal
        isOpen={!!confirming}
        onClose={() => setConfirming(null)}
        title={confirming ? `Permanently delete ${TIER_LABEL[confirming.tier]}` : ''}
      >
        {confirming && (
          <>
            <div className="alert alert-danger" style={{ marginBottom: '14px', display: 'flex', gap: '10px' }}>
              <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: '1px' }} />
              <span style={{ fontSize: '12.5px', lineHeight: 1.5 }}>
                This removes <strong>{confirming.item.name}</strong> from the database entirely. It
                cannot be restored, and the audit trail of what it was goes with it. Deactivating or
                leaving it soft-deleted is almost always the better choice.
              </span>
            </div>
            <div className="form-group" style={{ marginBottom: '18px' }}>
              <label className="form-label">
                Type <strong style={{ fontFamily: 'var(--font-mono)' }}>{confirming.item.code}</strong> to confirm
              </label>
              <input
                className="form-control"
                style={{ fontFamily: 'var(--font-mono)' }}
                value={confirming.typed}
                onChange={(e) => setConfirming({ ...confirming, typed: e.target.value })}
                autoFocus
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button className="btn btn-ghost" onClick={() => setConfirming(null)}>Keep it</button>
              <button
                className="btn btn-danger"
                disabled={busy || confirming.typed !== confirming.item.code}
                onClick={confirmHardDelete}
              >
                {busy ? 'Deleting...' : 'Delete permanently'}
              </button>
            </div>
          </>
        )}
      </Modal>

      {/* ---------------- Create: Trust ---------------- */}
      <Modal isOpen={isTrustModalOpen} onClose={() => setIsTrustModalOpen(false)} title="Create Educational Trust">
        <form onSubmit={handleCreateTrust}>
          <div className="form-group" style={{ marginBottom: '12px' }}>
            <label className="form-label">Trust Name *</label>
            <input type="text" required className="form-control"
                   placeholder="e.g. Pimpri Chinchwad Education Trust"
                   value={trustForm.name}
                   onChange={(e) => setTrustForm({ ...trustForm, name: e.target.value })} />
          </div>
          <div className="form-group" style={{ marginBottom: '12px' }}>
            <label className="form-label">Trust Code *</label>
            <input type="text" required className="form-control" placeholder="PCET"
                   value={trustForm.code}
                   onChange={(e) => setTrustForm({ ...trustForm, code: e.target.value })} />
          </div>
          <div className="form-group" style={{ marginBottom: '18px' }}>
            <label className="form-label">Primary Contact Email *</label>
            <input type="email" required className="form-control" placeholder="trust@pcet.org.in"
                   value={trustForm.primaryContactEmail}
                   onChange={(e) => setTrustForm({ ...trustForm, primaryContactEmail: e.target.value })} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button type="button" className="btn btn-ghost" onClick={() => setIsTrustModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary">Create Trust</button>
          </div>
        </form>
      </Modal>

      {/* ---------------- Create: College ---------------- */}
      <Modal isOpen={isCollegeModalOpen} onClose={() => setIsCollegeModalOpen(false)} title="Add College to Selected Trust">
        <form onSubmit={handleCreateCollege}>
          <div className="form-group" style={{ marginBottom: '12px' }}>
            <label className="form-label">College Name *</label>
            <input type="text" required className="form-control"
                   placeholder="Pimpri Chinchwad College of Engineering"
                   value={collegeForm.name}
                   onChange={(e) => setCollegeForm({ ...collegeForm, name: e.target.value })} />
          </div>
          <div className="form-group" style={{ marginBottom: '12px' }}>
            <label className="form-label">College Code *</label>
            <input type="text" required className="form-control" placeholder="PCCOE"
                   value={collegeForm.code}
                   onChange={(e) => setCollegeForm({ ...collegeForm, code: e.target.value })} />
          </div>
          <div className="form-group" style={{ marginBottom: '12px' }}>
            <label className="form-label">College Address *</label>
            <textarea required className="form-control" rows={3} placeholder="College address"
                      value={collegeForm.address}
                      onChange={(e) => setCollegeForm({ ...collegeForm, address: e.target.value })} />
          </div>
          <div className="form-group" style={{ marginBottom: '12px' }}>
            <label className="form-label">Primary Contact Name *</label>
            <input type="text" required className="form-control" placeholder="Principal / TnP Officer"
                   value={collegeForm.primaryContactName}
                   onChange={(e) => setCollegeForm({ ...collegeForm, primaryContactName: e.target.value })} />
          </div>
          <div className="form-group" style={{ marginBottom: '12px' }}>
            <label className="form-label">Primary Contact Email *</label>
            <input type="email" required className="form-control" placeholder="principal@pccoepune.org"
                   value={collegeForm.primaryContactEmail}
                   onChange={(e) => setCollegeForm({ ...collegeForm, primaryContactEmail: e.target.value })} />
          </div>
          <div className="form-group" style={{ marginBottom: '12px' }}>
            <label className="form-label">Primary Contact Phone *</label>
            <input type="tel" required className="form-control" placeholder="9876543210"
                   maxLength={10} inputMode="numeric"
                   value={collegeForm.primaryContactPhone}
                   onChange={(e) => setCollegeForm({
                     ...collegeForm,
                     primaryContactPhone: e.target.value.replace(/\D/g, '').slice(0, 10),
                   })} />
          </div>
          <div className="form-group" style={{ marginBottom: '18px' }}>
            <label className="form-label">Logo URL</label>
            <input type="url" className="form-control" placeholder="https://example.com/logo.png"
                   value={collegeForm.logoUrl}
                   onChange={(e) => setCollegeForm({ ...collegeForm, logoUrl: e.target.value })} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button type="button" className="btn btn-ghost" onClick={() => setIsCollegeModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary">Add College</button>
          </div>
        </form>
      </Modal>

      {/* ---------------- Create: Department ---------------- */}
      <Modal isOpen={isDeptModalOpen} onClose={() => setIsDeptModalOpen(false)} title="Add Academic Department">
        <form onSubmit={handleCreateDept}>
          <div className="form-group" style={{ marginBottom: '12px' }}>
            <label className="form-label">Department Name *</label>
            <input type="text" required className="form-control" placeholder="Computer Engineering"
                   value={deptForm.name}
                   onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })} />
          </div>
          <div className="form-group" style={{ marginBottom: '18px' }}>
            <label className="form-label">Department Code *</label>
            <input type="text" required className="form-control" placeholder="CS"
                   value={deptForm.code}
                   onChange={(e) => setDeptForm({ ...deptForm, code: e.target.value })} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button type="button" className="btn btn-ghost" onClick={() => setIsDeptModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary">Create Department</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
