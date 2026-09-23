import React, { useState, useEffect, useCallback } from 'react';
import { drivesApi } from '../api/drives';
import { adminApi } from '../api/admin';
import { useToast } from '../components/Toast';
import { Modal } from '../components/Modal';
import { POSTING_STATUS_STYLE, formatInstant } from './Drives';
import {
  ArrowLeft, FileText, Target, SlidersHorizontal, Repeat, Rocket, Users,
  Plus, Trash2, CheckCircle2, Circle, RefreshCw, AlertTriangle, Ban,
  Upload, Download, ExternalLink,
} from 'lucide-react';
import { exportApplicants } from '../utils/applicantExport';

const TABS = [
  { id: 'jd', label: 'JD document', icon: FileText },
  { id: 'targets', label: 'Targets', icon: Target },
  { id: 'criteria', label: 'Eligibility', icon: SlidersHorizontal },
  { id: 'policy', label: 'Re-application', icon: Repeat },
  { id: 'publish', label: 'Publish', icon: Rocket },
  { id: 'pool', label: 'Applicants', icon: Users },
];

/**
 * The two cuts the TnP actually exports. APPLIED is the raw pool; IN_REVIEW is
 * the sealed pool handed to shortlisting, which is what a company asks for.
 */
const POOL_FILTERS = [
  { value: '', label: 'Everyone' },
  { value: 'APPLIED', label: 'Applied' },
  { value: 'IN_REVIEW', label: 'Shortlisted' },
  { value: 'DISQUALIFIED', label: 'Disqualified' },
  { value: 'WITHDRAWN', label: 'Withdrawn' },
];

const STANCES = [
  { value: 'BLOCKED', label: 'Blocked' },
  { value: 'ALLOWED', label: 'Allowed' },
  { value: 'ALLOWED_WITH_UPLIFT', label: 'Allowed with uplift' },
];

const EMPTY_CRITERIA = {
  aggregateCgpaEnabled: false, minAggregateCgpa: '',
  tenthEnabled: false, minTenthPercentage: '',
  twelfthEnabled: false, minTwelfthPercentage: '',
  diplomaEnabled: false, minDiplomaPercentage: '',
  activeBacklogsEnabled: false, maxActiveBacklogs: '',
  totalBacklogsEnabled: false, maxTotalBacklogs: '',
  gapYearsEnabled: false, maxGapYears: '',
  cocubesEnabled: false, minCocubesScore: '',
  semesterCgpaEnabled: false,
  missingDataPolicy: 'INELIGIBLE',
  criteriaNote: '',
};

const EMPTY_POLICY = {
  placedStudentStance: 'BLOCKED',
  minPackageUpliftPercent: '',
  minAbsolutePackage: '',
  interningStudentStance: 'BLOCKED',
  minStipendUpliftPercent: '',
  pendingOfferStance: 'ALLOWED',
  maxLiveOffers: '',
  countInternshipTowardsPlacement: false,
  allowIfLastOfferDeclined: true,
  minDaysSinceLastOffer: '',
  requireAdminDecisionForPlaced: false,
};

/** A gate that is enabled but has no threshold would silently admit everyone. */
function numOrNull(v) {
  return v === '' || v === null || v === undefined ? null : Number(v);
}

/**
 * Assembles a draft into something publishable, then publishes it.
 *
 * The tab order is the order the backend's publish preconditions run in, so a
 * coordinator working left to right cannot reach Publish with something missing.
 */
export function DriveBuilder({ postingId, onBack }) {
  const { success, error: showError, info } = useToast();

  const [tab, setTab] = useState('jd');
  const [posting, setPosting] = useState(null);
  const [loading, setLoading] = useState(true);

  const [documents, setDocuments] = useState([]);
  const [criteria, setCriteria] = useState(EMPTY_CRITERIA);
  const [policy, setPolicy] = useState(EMPTY_POLICY);
  const [hasCriteria, setHasCriteria] = useState(false);
  const [hasPolicy, setHasPolicy] = useState(false);

  const [colleges, setColleges] = useState([]);
  const [departments, setDepartments] = useState({});
  const [targets, setTargets] = useState([]);
  const [targetDraft, setTargetDraft] = useState({ collegeId: '', departmentId: '', batchYear: '', degree: '' });

  const [applicants, setApplicants] = useState([]);
  const [counts, setCounts] = useState({});
  const [runs, setRuns] = useState([]);
  const [busy, setBusy] = useState(false);

  const [poolFilter, setPoolFilter] = useState('');
  const [exporting, setExporting] = useState(false);
  const [jdFile, setJdFile] = useState(null);

  const [cancelReason, setCancelReason] = useState('');
  const [isCancelOpen, setIsCancelOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const p = await drivesApi.getPosting(postingId);
      setPosting(p);
      setTargets(
        (p.targets || []).map((t) => ({
          collegeId: t.collegeId, departmentId: t.departmentId,
          batchYear: t.batchYear, degree: t.degree,
        })),
      );

      const [docs, collegeList] = await Promise.all([
        drivesApi.listDocuments(postingId).catch(() => []),
        loadAllColleges(),
      ]);
      setDocuments(docs || []);
      setColleges(collegeList);

      try {
        const c = await drivesApi.getCriteria(postingId);
        setCriteria({
          ...EMPTY_CRITERIA,
          ...Object.fromEntries(
            Object.entries(c).map(([k, v]) => [k, v === null ? '' : v]),
          ),
        });
        setHasCriteria(true);
      } catch {
        setHasCriteria(false);
      }

      try {
        const pol = await drivesApi.getReapplicationPolicy(postingId);
        setPolicy({
          ...EMPTY_POLICY,
          ...Object.fromEntries(
            Object.entries(pol).map(([k, v]) => [k, v === null ? '' : v]),
          ),
        });
        setHasPolicy(true);
      } catch {
        setHasPolicy(false);
      }
    } catch (err) {
      showError(err.message || 'Could not load the drive');
    } finally {
      setLoading(false);
    }
  }, [postingId]);

  useEffect(() => { load(); }, [load]);

  /**
   * Every college the actor can see, across every trust.
   *
   * GET /colleges requires a trustId, so the list is assembled trust by trust.
   * That is one request per trust rather than one per college — a handful of
   * calls for a trust the size of PCET, and the alternative would be asking the
   * coordinator to pick a trust before they can pick a college, which is a step
   * that means nothing to them.
   */
  const loadAllColleges = async () => {
    try {
      const trusts = await adminApi.listTrusts();
      if (!trusts || trusts.length === 0) return [];
      const perTrust = await Promise.all(
        trusts.map((tr) => adminApi.listColleges(tr.id).catch(() => [])),
      );
      return perTrust.flat();
    } catch {
      return [];
    }
  };

  // Departments are fetched per college as the coordinator picks one.
  const ensureDepartments = async (collegeId) => {
    if (!collegeId || departments[collegeId]) return;
    try {
      const list = await adminApi.listDepartments(collegeId);
      setDepartments((prev) => ({ ...prev, [collegeId]: list || [] }));
    } catch {
      setDepartments((prev) => ({ ...prev, [collegeId]: [] }));
    }
  };

  const loadPool = async (status = poolFilter) => {
    try {
      const [page, countMap, runList] = await Promise.all([
        drivesApi.listApplicants(postingId, { status: status || undefined, size: 200 }),
        drivesApi.applicantCounts(postingId).catch(() => ({})),
        drivesApi.listEligibilityRuns(postingId).catch(() => []),
      ]);
      setApplicants(page?.content || []);
      setCounts(countMap || {});
      setRuns(runList || []);
    } catch (err) {
      showError(err.message || 'Could not load the applicant pool');
    }
  };

  useEffect(() => { if (tab === 'pool') loadPool(); }, [tab, poolFilter]);

  // ---------------- actions ----------------

  /**
   * Uploads the JD and registers it in one call. The bytes go up, the storage key
   * and a public URL come straight back -- the drafter never sees a key, never
   * pastes one, and cannot attach a document that does not exist.
   */
  const uploadJd = async () => {
    if (!jdFile) return;
    setBusy(true);
    try {
      await drivesApi.uploadDocument(postingId, jdFile, 'JD', documents.length === 0);
      setJdFile(null);
      setDocuments(await drivesApi.listDocuments(postingId));
      success('JD uploaded and attached.');
    } catch (err) {
      showError(err.message || 'Could not upload the JD');
    } finally {
      setBusy(false);
    }
  };

  /**
   * Exports the pool the filter is showing.
   *
   * Pages through the whole set rather than exporting what is on screen: the
   * table is capped, and a sheet that silently stopped at the cap would send a
   * company a truncated shortlist -- a failure nobody would catch until a
   * student asked why they were never called.
   */
  const downloadPool = async () => {
    setExporting(true);
    try {
      const all = [];
      for (let page = 0; ; page += 1) {
        const result = await drivesApi.listApplicants(postingId, {
          status: poolFilter || undefined, page, size: 200,
        });
        const batch = result?.content || [];
        all.push(...batch);
        if (batch.length < 200 || result?.last || page > 50) break;
      }

      if (all.length === 0) {
        info('Nothing to export for this filter.');
        return;
      }

      const label = POOL_FILTERS.find((f) => f.value === poolFilter)?.label || 'Applicants';
      const { rows, withResume } = exportApplicants(all, {
        companyName: posting?.companyName,
        postingCode: posting?.postingCode,
        statusLabel: label,
      });

      success(
        withResume === rows
          ? `${rows} student${rows === 1 ? '' : 's'} exported, all with resumes.`
          : `${rows} exported — ${rows - withResume} without a resume.`,
      );
    } catch (err) {
      showError(err.message || 'Could not export the applicant pool');
    } finally {
      setExporting(false);
    }
  };

  const saveTargets = async () => {
    setBusy(true);
    try {
      const updated = await drivesApi.setTargets(
        postingId,
        targets.map((t) => ({
          collegeId: Number(t.collegeId),
          departmentId: t.departmentId ? Number(t.departmentId) : null,
          batchYear: Number(t.batchYear),
          degree: t.degree || null,
        })),
      );
      setPosting(updated);
      success(`${targets.length} target${targets.length === 1 ? '' : 's'} saved.`);
    } catch (err) {
      showError(err.message || 'Could not save the targets');
    } finally {
      setBusy(false);
    }
  };

  const saveCriteria = async () => {
    setBusy(true);
    try {
      await drivesApi.setCriteria(postingId, {
        ...criteria,
        minAggregateCgpa: numOrNull(criteria.minAggregateCgpa),
        minTenthPercentage: numOrNull(criteria.minTenthPercentage),
        minTwelfthPercentage: numOrNull(criteria.minTwelfthPercentage),
        minDiplomaPercentage: numOrNull(criteria.minDiplomaPercentage),
        maxActiveBacklogs: numOrNull(criteria.maxActiveBacklogs),
        maxTotalBacklogs: numOrNull(criteria.maxTotalBacklogs),
        maxGapYears: numOrNull(criteria.maxGapYears),
        minCocubesScore: numOrNull(criteria.minCocubesScore),
        twelfthOrDiplomaMode: 'EITHER_SUFFICIENT',
        semesterCriteria: [],
        aptitudeCriteria: [],
        customCriteria: [],
      });
      setHasCriteria(true);
      success('Eligibility criteria saved.');
    } catch (err) {
      showError(err.message || 'Could not save the criteria');
    } finally {
      setBusy(false);
    }
  };

  const savePolicy = async () => {
    setBusy(true);
    try {
      await drivesApi.setReapplicationPolicy(postingId, {
        ...policy,
        minPackageUpliftPercent: numOrNull(policy.minPackageUpliftPercent),
        minAbsolutePackage: numOrNull(policy.minAbsolutePackage),
        minStipendUpliftPercent: numOrNull(policy.minStipendUpliftPercent),
        maxLiveOffers: numOrNull(policy.maxLiveOffers),
        minDaysSinceLastOffer: numOrNull(policy.minDaysSinceLastOffer),
      });
      setHasPolicy(true);
      success('Re-application policy saved.');
    } catch (err) {
      showError(err.message || 'Could not save the policy');
    } finally {
      setBusy(false);
    }
  };

  const publish = async () => {
    setBusy(true);
    try {
      const updated = await drivesApi.publish(postingId);
      setPosting(updated);
      success('Drive published. Eligibility resolution has been queued.');
      setTab('pool');
    } catch (err) {
      showError(err.message || 'Could not publish the drive');
    } finally {
      setBusy(false);
    }
  };

  const reEvaluate = async () => {
    setBusy(true);
    try {
      await drivesApi.reEvaluate(postingId);
      info('Resolution started. Refresh in a moment to see the result.');
      setTimeout(loadPool, 1500);
    } catch (err) {
      showError(err.message || 'Could not start resolution');
    } finally {
      setBusy(false);
    }
  };

  const cancelDrive = async (e) => {
    e.preventDefault();
    try {
      const updated = await drivesApi.cancel(postingId, cancelReason);
      setPosting(updated);
      setIsCancelOpen(false);
      info('Drive cancelled.');
    } catch (err) {
      showError(err.message || 'Could not cancel the drive');
    }
  };

  if (loading || !posting) {
    return (
      <div className="content-container">
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
          Loading drive...
        </div>
      </div>
    );
  }

  const editable = posting.editable;
  const style = POSTING_STATUS_STYLE[posting.status] || POSTING_STATUS_STYLE.DRAFT;

  const checklist = [
    { label: 'JD document attached', done: documents.some((d) => d.docType === 'JD') },
    { label: 'At least one target', done: (posting.targets?.length ?? 0) > 0 },
    { label: 'Eligibility criteria set', done: hasCriteria },
    { label: 'Re-application policy set', done: hasPolicy },
    { label: 'Deadline in the future', done: posting.applicationDeadline && new Date(posting.applicationDeadline) > new Date() },
  ];
  const ready = checklist.every((c) => c.done);

  return (
    <div className="content-container">
      <div className="page-header">
        <button className="btn btn-ghost btn-sm" onClick={onBack} style={{ marginBottom: '10px' }}>
          <ArrowLeft size={13} /> All drives
        </button>
        <div className="page-eyebrow">
          <span>{posting.companyName}</span>
          <span style={{ fontFamily: 'var(--font-mono)' }}>· {posting.postingCode}</span>
        </div>
        <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {posting.title}
          <span className={`badge ${style.className}`} style={{ fontSize: '11px' }}>{style.label}</span>
        </h1>
        <p className="page-desc">
          Deadline {formatInstant(posting.applicationDeadline)} · {posting.jobType?.replaceAll('_', ' ')}
          {!editable && ' · published drives can no longer be edited'}
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '18px' }}>
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              className={`btn btn-sm ${tab === t.id ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setTab(t.id)}
            >
              <Icon size={13} /> {t.label}
            </button>
          );
        })}
      </div>

      {/* ---------------- JD ---------------- */}
      {tab === 'jd' && (
        <div className="panel">
          <div className="panel-header">
            <div className="panel-title">JD document</div>
          </div>
          <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginBottom: '14px' }}>
            Upload the JD and it is stored and attached in one step. Publishing refuses a drive with
            no JD attached — students must be able to read what they are applying for.
          </p>

          {documents.length > 0 && (
            <div className="table-wrapper" style={{ marginBottom: '14px' }}>
              <table className="data-table">
                <thead><tr><th>File</th><th>Type</th><th>Link</th><th>Storage key</th></tr></thead>
                <tbody>
                  {documents.map((d) => (
                    <tr key={d.id}>
                      <td>{d.fileName}</td>
                      <td>{d.docType}</td>
                      <td>
                        {d.url
                          ? <a href={d.url} target="_blank" rel="noreferrer"
                               style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}>
                              Open <ExternalLink size={11} />
                            </a>
                          : <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>—</span>}
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: '11.5px' }}>{d.storageKey}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {editable && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <input
                type="file"
                accept=".pdf,.doc,.docx"
                className="form-control"
                style={{ maxWidth: '340px' }}
                onChange={(e) => setJdFile(e.target.files?.[0] || null)}
              />
              <button className="btn btn-primary btn-sm" onClick={uploadJd} disabled={busy || !jdFile}>
                <Upload size={12} /> {busy ? 'Uploading...' : 'Upload JD'}
              </button>
              {jdFile && (
                <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                  {jdFile.name} · {(jdFile.size / 1024).toFixed(0)} KB
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* ---------------- Targets ---------------- */}
      {tab === 'targets' && (
        <div className="panel">
          <div className="panel-header">
            <div className="panel-title">Who this drive is for</div>
            {editable && (
              <button className="btn btn-primary btn-sm" onClick={saveTargets} disabled={busy || targets.length === 0}>
                Save targets
              </button>
            )}
          </div>
          <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginBottom: '14px' }}>
            One row per college × department × batch. Leaving department blank means every department
            in that college. Only students matching a row will see or receive this drive.
          </p>

          {targets.length > 0 && (
            <div className="table-wrapper" style={{ marginBottom: '14px' }}>
              <table className="data-table">
                <thead>
                  <tr><th>College</th><th>Department</th><th>Batch</th><th>Degree</th><th></th></tr>
                </thead>
                <tbody>
                  {targets.map((t, i) => (
                    <tr key={i}>
                      <td>{colleges.find((c) => c.id === Number(t.collegeId))?.name || t.collegeId}</td>
                      <td>{t.departmentId
                        ? (departments[t.collegeId]?.find((d) => d.id === Number(t.departmentId))?.name || t.departmentId)
                        : 'All departments'}</td>
                      <td style={{ fontFamily: 'var(--font-mono)' }}>{t.batchYear}</td>
                      <td>{t.degree || 'Any'}</td>
                      <td style={{ textAlign: 'right' }}>
                        {editable && (
                          <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }}
                                  onClick={() => setTargets(targets.filter((_, j) => j !== i))}>
                            <Trash2 size={12} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {editable && (
            <div className="form-grid" style={{ alignItems: 'end' }}>
              <div className="form-group">
                <label className="form-label">College</label>
                <select className="form-control" value={targetDraft.collegeId}
                        onChange={(e) => {
                          setTargetDraft({ ...targetDraft, collegeId: e.target.value, departmentId: '' });
                          ensureDepartments(e.target.value);
                        }}>
                  <option value="">Select</option>
                  {colleges.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Department</label>
                <select className="form-control" value={targetDraft.departmentId}
                        disabled={!targetDraft.collegeId}
                        onChange={(e) => setTargetDraft({ ...targetDraft, departmentId: e.target.value })}>
                  <option value="">All departments</option>
                  {(departments[targetDraft.collegeId] || []).map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Batch year</label>
                <input className="form-control" type="number" placeholder="2027"
                       value={targetDraft.batchYear}
                       onChange={(e) => setTargetDraft({ ...targetDraft, batchYear: e.target.value })} />
              </div>
              <div className="form-group">
                <button className="btn btn-secondary" type="button"
                        disabled={!targetDraft.collegeId || !targetDraft.batchYear}
                        onClick={() => {
                          setTargets([...targets, targetDraft]);
                          setTargetDraft({ collegeId: '', departmentId: '', batchYear: '', degree: '' });
                        }}>
                  <Plus size={13} /> Add target
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ---------------- Criteria ---------------- */}
      {tab === 'criteria' && (
        <div className="panel">
          <div className="panel-header">
            <div className="panel-title">Eligibility criteria</div>
            {editable && (
              <button className="btn btn-primary btn-sm" onClick={saveCriteria} disabled={busy}>
                Save criteria
              </button>
            )}
          </div>
          <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginBottom: '14px' }}>
            Each gate has its own switch. A gate left off is skipped entirely — it is not treated as a
            threshold of zero. Turn one on and you must give it a value.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {[
              ['aggregateCgpaEnabled', 'minAggregateCgpa', 'Minimum aggregate CGPA', '6.5', 0.01],
              ['tenthEnabled', 'minTenthPercentage', 'Minimum 10th %', '60', 0.01],
              ['twelfthEnabled', 'minTwelfthPercentage', 'Minimum 12th %', '60', 0.01],
              ['diplomaEnabled', 'minDiplomaPercentage', 'Minimum diploma %', '60', 0.01],
              ['activeBacklogsEnabled', 'maxActiveBacklogs', 'Maximum active backlogs', '0', 1],
              ['totalBacklogsEnabled', 'maxTotalBacklogs', 'Maximum total backlogs', '2', 1],
              ['gapYearsEnabled', 'maxGapYears', 'Maximum gap years', '1', 1],
              ['cocubesEnabled', 'minCocubesScore', 'Minimum CoCubes score', '550', 0.01],
            ].map(([flag, field, label, placeholder, step]) => (
              <div key={flag} style={{
                display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px',
                background: 'var(--bg-surface-raised)', border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
              }}>
                <input type="checkbox" checked={!!criteria[flag]} disabled={!editable}
                       onChange={(e) => setCriteria({ ...criteria, [flag]: e.target.checked })}
                       style={{ width: '16px', height: '16px', cursor: 'pointer' }} />
                <span style={{ flex: 1, fontSize: '13px', fontWeight: 500 }}>{label}</span>
                <input className="form-control" type="number" step={step} placeholder={placeholder}
                       disabled={!criteria[flag] || !editable}
                       value={criteria[field] ?? ''}
                       onChange={(e) => setCriteria({ ...criteria, [field]: e.target.value })}
                       style={{ width: '120px' }} />
              </div>
            ))}
          </div>

          <div className="form-group" style={{ marginTop: '16px' }}>
            <label className="form-label">If a student has no value for an enabled gate</label>
            <select className="form-control" value={criteria.missingDataPolicy} disabled={!editable}
                    onChange={(e) => setCriteria({ ...criteria, missingDataPolicy: e.target.value })}>
              <option value="INELIGIBLE">Treat as ineligible</option>
              <option value="ELIGIBLE">Let them through</option>
              <option value="NEEDS_REVIEW">Flag for review</option>
            </select>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              Explicit because both defaults are traps: passing lets an incomplete profile clear every
              gate, failing lets one un-synced ERP column remove a student from every drive.
            </span>
          </div>

          <div className="form-group">
            <label className="form-label">Note shown to students</label>
            <textarea className="form-control" rows={2} disabled={!editable}
                      placeholder="Anything else applicants should know about the bar"
                      value={criteria.criteriaNote || ''}
                      onChange={(e) => setCriteria({ ...criteria, criteriaNote: e.target.value })} />
          </div>
        </div>
      )}

      {/* ---------------- Policy ---------------- */}
      {tab === 'policy' && (
        <div className="panel">
          <div className="panel-header">
            <div className="panel-title">Re-application policy</div>
            {editable && (
              <button className="btn btn-primary btn-sm" onClick={savePolicy} disabled={busy}>
                Save policy
              </button>
            )}
          </div>
          <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginBottom: '14px' }}>
            Set per drive. The two halves are independent: an interning student is normally locked out
            of another internship, while a placed student may sit again above a package uplift.
          </p>

          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Already-placed students</label>
              <select className="form-control" value={policy.placedStudentStance} disabled={!editable}
                      onChange={(e) => setPolicy({ ...policy, placedStudentStance: e.target.value })}>
                {STANCES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Required uplift over current CTC (%)</label>
              <input className="form-control" type="number" step="0.01" placeholder="20"
                     disabled={!editable || policy.placedStudentStance !== 'ALLOWED_WITH_UPLIFT'}
                     value={policy.minPackageUpliftPercent ?? ''}
                     onChange={(e) => setPolicy({ ...policy, minPackageUpliftPercent: e.target.value })} />
            </div>
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Currently-interning students</label>
              <select className="form-control" value={policy.interningStudentStance} disabled={!editable}
                      onChange={(e) => setPolicy({ ...policy, interningStudentStance: e.target.value })}>
                {STANCES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Allow this for a full-time conversion drive.
              </span>
            </div>
            <div className="form-group">
              <label className="form-label">Required stipend uplift (%)</label>
              <input className="form-control" type="number" step="0.01" placeholder="25"
                     disabled={!editable || policy.interningStudentStance !== 'ALLOWED_WITH_UPLIFT'}
                     value={policy.minStipendUpliftPercent ?? ''}
                     onChange={(e) => setPolicy({ ...policy, minStipendUpliftPercent: e.target.value })} />
            </div>
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Students holding an unaccepted offer</label>
              <select className="form-control" value={policy.pendingOfferStance} disabled={!editable}
                      onChange={(e) => setPolicy({ ...policy, pendingOfferStance: e.target.value })}>
                {STANCES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Maximum live offers</label>
              <input className="form-control" type="number" placeholder="Unlimited" disabled={!editable}
                     value={policy.maxLiveOffers ?? ''}
                     onChange={(e) => setPolicy({ ...policy, maxLiveOffers: e.target.value })} />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px' }}>
            {[
              ['countInternshipTowardsPlacement', 'An internship or PPO counts as being placed'],
              ['allowIfLastOfferDeclined', 'A student whose last offer was declined may apply'],
              ['requireAdminDecisionForPlaced', 'Placed students need an individual ruling from the TnP for this drive'],
            ].map(([field, label]) => (
              <label key={field} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '12.5px', cursor: 'pointer' }}>
                <input type="checkbox" checked={!!policy[field]} disabled={!editable}
                       onChange={(e) => setPolicy({ ...policy, [field]: e.target.checked })}
                       style={{ width: '15px', height: '15px' }} />
                {label}
              </label>
            ))}
          </div>
        </div>
      )}

      {/* ---------------- Publish ---------------- */}
      {tab === 'publish' && (
        <div className="panel">
          <div className="panel-header">
            <div className="panel-title">Publish</div>
          </div>

          {posting.status === 'DRAFT' || posting.status === 'PENDING_APPROVAL' ? (
            <>
              <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginBottom: '14px' }}>
                Publishing opens applications and notifies every eligible student. It cannot be undone —
                a live drive can only be closed or cancelled.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '18px' }}>
                {checklist.map((c) => (
                  <div key={c.label} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px' }}>
                    {c.done
                      ? <CheckCircle2 size={15} color="var(--success)" />
                      : <Circle size={15} color="var(--text-muted)" />}
                    <span style={{ color: c.done ? 'var(--text-primary)' : 'var(--text-muted)' }}>{c.label}</span>
                  </div>
                ))}
              </div>

              <button className="btn btn-primary" onClick={publish} disabled={busy || !ready}>
                <Rocket size={14} /> {busy ? 'Publishing...' : 'Publish drive'}
              </button>
              {!ready && (
                <span style={{ marginLeft: '12px', fontSize: '12px', color: 'var(--text-muted)' }}>
                  Complete every step above first.
                </span>
              )}
            </>
          ) : (
            <>
              <div className="alert alert-success" style={{ marginBottom: '14px' }}>
                Published {formatInstant(posting.publishedAt)}. Applications close{' '}
                {formatInstant(posting.applicationDeadline)}.
              </div>
              {posting.status === 'PUBLISHED' && (
                <button className="btn btn-danger btn-sm" onClick={() => setIsCancelOpen(true)}>
                  <Ban size={13} /> Cancel drive
                </button>
              )}
            </>
          )}
        </div>
      )}

      {/* ---------------- Applicant pool ---------------- */}
      {tab === 'pool' && (
        <>
          <div className="panel" style={{ marginBottom: '16px' }}>
            <div className="panel-header">
              <div className="panel-title">Eligibility resolution</div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="btn btn-ghost btn-sm" onClick={loadPool}>
                  <RefreshCw size={12} /> Refresh
                </button>
                <button className="btn btn-secondary btn-sm" onClick={reEvaluate} disabled={busy}>
                  Re-run resolution
                </button>
              </div>
            </div>
            {runs.length === 0 ? (
              <div style={{ padding: '18px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12.5px' }}>
                No resolution has run yet. Publishing queues one automatically.
              </div>
            ) : (
              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr><th>Started</th><th>Reason</th><th>Status</th><th>Evaluated</th><th>Eligible</th><th>Why others missed out</th></tr>
                  </thead>
                  <tbody>
                    {runs.map((r) => (
                      <tr key={r.runId}>
                        <td style={{ fontSize: '11.5px' }}>{formatInstant(r.startedAt)}</td>
                        <td style={{ fontSize: '11.5px' }}>{r.reason}</td>
                        <td>
                          <span className={`badge ${r.status === 'COMPLETED' ? 'badge-active' : r.status === 'FAILED' ? 'badge-inactive' : 'badge-pending'}`}>
                            {r.status}
                          </span>
                        </td>
                        <td style={{ fontFamily: 'var(--font-mono)' }}>{r.candidatesEvaluated ?? '—'}</td>
                        <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--success)' }}>{r.eligibleCount ?? '—'}</td>
                        <td style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          {r.error
                            ? <span style={{ color: 'var(--danger)' }}>
                                <AlertTriangle size={11} style={{ verticalAlign: '-1px' }} /> {r.error}
                              </span>
                            : Object.entries(r.failureSummary || {}).map(([k, v]) => `${k}: ${v}`).join(' · ') || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="panel">
            <div className="panel-header">
              <div className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>Applicants</span>
                {Object.entries(counts).map(([k, v]) => (
                  <span key={k} className="badge badge-pending" style={{ fontSize: '10px' }}>{k}: {v}</span>
                ))}
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <select
                  className="form-control"
                  style={{ width: 'auto', fontSize: '12px', padding: '5px 8px' }}
                  value={poolFilter}
                  onChange={(e) => setPoolFilter(e.target.value)}
                >
                  {POOL_FILTERS.map((f) => (
                    <option key={f.value} value={f.value}>{f.label}</option>
                  ))}
                </select>
                <button className="btn btn-secondary btn-sm" onClick={downloadPool}
                        disabled={exporting || applicants.length === 0}>
                  <Download size={12} /> {exporting ? 'Preparing...' : 'Export to Excel'}
                </button>
              </div>
            </div>
            {applicants.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12.5px' }}>
                {poolFilter ? 'Nobody in this category.' : 'Nobody has applied yet.'}
              </div>
            ) : (
              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr><th>Student</th><th>Email</th><th>Batch</th><th>CGPA</th><th>Backlogs</th><th>Resume</th><th>Source</th><th>Status</th></tr>
                  </thead>
                  <tbody>
                    {applicants.map((a) => (
                      <tr key={a.applicationId}>
                        <td style={{ fontWeight: 600 }}>{a.studentName}</td>
                        <td style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>{a.email}</td>
                        <td style={{ fontFamily: 'var(--font-mono)' }}>{a.batchYear ?? '—'}</td>
                        <td style={{ fontFamily: 'var(--font-mono)' }}>{a.cgpa ?? '—'}</td>
                        <td style={{ fontFamily: 'var(--font-mono)' }}>{a.activeBacklogs ?? '—'}</td>
                        <td>
                          {a.resumeUrl
                            ? <a href={a.resumeUrl} target="_blank" rel="noreferrer" title={a.resumeFileName}
                                 style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11.5px' }}>
                                Open <ExternalLink size={11} />
                              </a>
                            : <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Not submitted</span>}
                        </td>
                        <td style={{ fontSize: '11px' }}>{a.source?.replaceAll('_', ' ')}</td>
                        <td><span className="badge badge-active">{a.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      <Modal isOpen={isCancelOpen} onClose={() => setIsCancelOpen(false)} title="Cancel this drive">
        <form onSubmit={cancelDrive}>
          <div className="alert alert-danger" style={{ marginBottom: '14px' }}>
            Students and the company have already been told about this drive. The reason is recorded.
          </div>
          <div className="form-group" style={{ marginBottom: '12px' }}>
            <label className="form-label">Reason *</label>
            <textarea className="form-control" rows={3} required value={cancelReason}
                      onChange={(e) => setCancelReason(e.target.value)} />
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={() => setIsCancelOpen(false)}>Keep drive</button>
            <button type="submit" className="btn btn-danger">Cancel drive</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
