import React, { useState, useEffect } from 'react';
import { drivesApi } from '../api/drives';
import { useToast } from '../components/Toast';
import { Modal } from '../components/Modal';
import { JdImport } from '../components/JdImport';
import { DriveBuilder } from './DriveBuilder';
import {
  CalendarClock, ChevronRight, Megaphone, Plus, RefreshCw, Trash2, Wand2,
} from 'lucide-react';

const JOB_TYPES = [
  'FULL_TIME', 'INTERNSHIP', 'INTERNSHIP_WITH_PPO', 'PPO',
  'APPRENTICESHIP', 'COMPETITION', 'COMPETITION_WITH_PPO',
  'COMPETITION_WITH_INTERNSHIP', 'OTHER',
];

/**
 * What each mode actually means for the TnP, shown under the selector. All
 * three run the posting's hard eligibility gates the same way -- CGPA floors,
 * backlog caps, branch and batch targeting. They differ only in who picks from
 * the survivors, and therefore in what a student can be told when they ask why
 * they were not called.
 */
const SHORTLISTING_HINT = {
  COMPOSITE_SCORE: 'The scoring engine ranks the sealed pool at the deadline; students see their factor breakdown and the weights used.',
  COMPANY_SIDE: 'No score is computed. Everyone who clears the gates goes to the company as-is and HR decides.',
  MANUAL: 'No score is computed. Everyone who clears the gates stays with the TnP, who picks the shortlist in the portal.',
};

export const POSTING_STATUS_STYLE = {
  DRAFT: { className: 'badge-pending', label: 'Draft' },
  PENDING_APPROVAL: { className: 'badge-pending', label: 'Pending approval' },
  PUBLISHED: { className: 'badge-active', label: 'Published' },
  APPLICATIONS_CLOSED: { className: 'badge-inactive', label: 'Applications closed' },
  IN_PROGRESS: { className: 'badge-active', label: 'In progress' },
  COMPLETED: { className: 'badge-inactive', label: 'Completed' },
  CANCELLED: { className: 'badge-inactive', label: 'Cancelled' },
};

/** The academic year string the backend expects, e.g. "2025-2026". */
function currentAcademicYear() {
  const now = new Date();
  const start = now.getMonth() >= 5 ? now.getFullYear() : now.getFullYear() - 1;
  return `${start}-${start + 1}`;
}

/** datetime-local gives "2026-10-20T17:30" with no zone; the API wants an instant. */
export function toInstant(localValue) {
  return localValue ? new Date(localValue).toISOString() : null;
}

/** Blank inputs must reach the API as null, not as 0 or "". */
function num(v) {
  return v === '' || v === null || v === undefined ? null : Number(v);
}

export function formatInstant(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString(undefined, {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

/**
 * Mirrors JobPostingRequest. It used to carry 14 of the 29 fields the API
 * accepts, so every drive ever published had responsibilities, skills and
 * locations empty -- the student portal has had a skills section all along and
 * it has never rendered, because the array was always [].
 */
const EMPTY_FORM = {
  companyId: '',
  postingCode: '',
  title: '',
  jobType: 'FULL_TIME',
  workMode: 'ONSITE',
  description: '',
  responsibilities: '',
  ctcMin: '',
  ctcMax: '',
  ctcCurrency: 'INR',
  packageBasis: 'CTC',
  stipendAmount: '',
  stipendPeriod: 'MONTHLY',
  internshipDurationMonths: '',
  ppoPossible: false,
  bondMonths: '',
  bondAmount: '',
  vacancyCount: '',
  academicYear: currentAcademicYear(),
  applicationOpensAt: '',
  applicationDeadline: '',
  driveDate: '',
  driveVenue: '',
  shortlistingMode: 'COMPOSITE_SCORE',
  maxApplications: '',
  marksStudentPlaced: true,
  notifyOnPublish: true,
  skills: [],        // { skill, mandatory }
  locations: [],     // { city, state, country }
};

const PACKAGE_BASES = ['CTC', 'BASE', 'STIPEND'];
const STIPEND_PERIODS = ['MONTHLY', 'TOTAL'];

/**
 * Drive list and creation. Selecting a drive opens the builder, which is where
 * targets, criteria and the re-application policy get set before publishing.
 */
export function Drives({ setActiveView }) {
  const { success, error: showError } = useToast();

  const [postings, setPostings] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState(null);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isJdOpen, setIsJdOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      // Settled, not all: these are independent, and with Promise.all a failure
      // in the postings call rejected the pair, so the company list never loaded
      // either -- the screen then claimed there were no companies when there
      // plainly were, and the New drive button stayed dead for the wrong reason.
      const [postingResult, companyResult] = await Promise.allSettled([
        drivesApi.listPostings(),
        drivesApi.listCompanies(),
      ]);

      if (postingResult.status === 'fulfilled') {
        setPostings(postingResult.value?.content || []);
      } else {
        setPostings([]);
        showError(postingResult.reason?.message || 'Could not load the drive list');
      }
      if (companyResult.status === 'rejected') {
        showError(companyResult.reason?.message || 'Could not load companies');
      }
      const companyPage = companyResult.status === 'fulfilled' ? companyResult.value : null;
      // Anything the backend will actually accept. It rejects only BLACKLISTED at
      // draft time, and BLACKLISTED or INACTIVE at publish -- a PROSPECT company
      // is perfectly postable. Filtering to ACTIVE here was stricter than the API
      // and left the New drive button dead right after onboarding a company.
      setCompanies((companyPage?.content || [])
        .filter((c) => c.status !== 'BLACKLISTED' && c.status !== 'INACTIVE'));
    } catch (err) {
      showError(err.message || 'Could not load drives');
      setPostings([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        companyId: Number(form.companyId),
        ctcMin: num(form.ctcMin),
        ctcMax: num(form.ctcMax),
        stipendAmount: num(form.stipendAmount),
        // Only meaningful alongside an amount; sending a period with no stipend
        // records a payment basis for money that does not exist.
        stipendPeriod: form.stipendAmount ? form.stipendPeriod : null,
        internshipDurationMonths: num(form.internshipDurationMonths),
        bondMonths: num(form.bondMonths),
        bondAmount: num(form.bondAmount),
        vacancyCount: num(form.vacancyCount),
        maxApplications: num(form.maxApplications),
        applicationOpensAt: toInstant(form.applicationOpensAt),
        applicationDeadline: toInstant(form.applicationDeadline),
        driveDate: toInstant(form.driveDate),
        // Blank rows are an artefact of the repeater UI, not data.
        skills: form.skills.filter((s) => s.skill.trim()),
        locations: form.locations.filter((l) => l.city.trim()),
      };
      const created = await drivesApi.createPosting(payload);
      setPostings((prev) => [created, ...prev]);
      setIsFormOpen(false);
      setForm({ ...EMPTY_FORM, academicYear: currentAcademicYear() });
      success('Draft created. Add a JD, targets, criteria and a policy before publishing.');
      setOpenId(created.id);
    } catch (err) {
      showError(err.message || 'Could not create the drive');
    } finally {
      setSaving(false);
    }
  };

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });
  const setBool = (field) => (e) => setForm({ ...form, [field]: e.target.checked });

  const addSkill = () => setForm((f) => ({ ...f, skills: [...f.skills, { skill: '', mandatory: true }] }));
  const setSkill = (i, patch) => setForm((f) => ({
    ...f, skills: f.skills.map((s, j) => (j === i ? { ...s, ...patch } : s)),
  }));
  const dropSkill = (i) => setForm((f) => ({ ...f, skills: f.skills.filter((_, j) => j !== i) }));

  const addLocation = () => setForm((f) => ({
    ...f, locations: [...f.locations, { city: '', state: '', country: 'India' }],
  }));
  const setLocation = (i, patch) => setForm((f) => ({
    ...f, locations: f.locations.map((l, j) => (j === i ? { ...l, ...patch } : l)),
  }));
  const dropLocation = (i) => setForm((f) => ({ ...f, locations: f.locations.filter((_, j) => j !== i) }));

  /**
   * Merges accepted parser output into the form. Values are MERGED, never a
   * wholesale replace: a coordinator who has already typed a title and posting
   * code must not lose them by pasting a JD afterwards. Skills arrive as two
   * flat lists and become the form's single list carrying a mandatory flag.
   */
  const applyParsed = (parsed) => {
    setForm((f) => {
      const next = { ...f };
      const scalars = ['description', 'responsibilities', 'workMode', 'jobType'];
      scalars.forEach((k) => { if (parsed[k] != null) next[k] = parsed[k]; });

      ['ctcMin', 'ctcMax', 'stipendAmount', 'internshipDurationMonths',
       'bondMonths', 'vacancyCount'].forEach((k) => {
        if (parsed[k] != null) next[k] = String(parsed[k]);
      });

      if (parsed.ppoPossible != null) next.ppoPossible = parsed.ppoPossible;

      const parsedSkills = [
        ...(parsed.mandatorySkills || []).map((skill) => ({ skill, mandatory: true })),
        ...(parsed.preferredSkills || []).map((skill) => ({ skill, mandatory: false })),
      ];
      if (parsedSkills.length > 0) {
        const existing = new Set(next.skills.map((s) => s.skill.toLowerCase()));
        next.skills = [...next.skills, ...parsedSkills.filter((s) => !existing.has(s.skill.toLowerCase()))];
      }

      if (parsed.locations?.length > 0) {
        const existing = new Set(next.locations.map((l) => l.city.toLowerCase()));
        next.locations = [...next.locations,
          ...parsed.locations.filter((l) => !existing.has(l.city.toLowerCase()))];
      }
      return next;
    });
  };

  if (openId) {
    return (
      <DriveBuilder
        postingId={openId}
        onBack={() => {
          setOpenId(null);
          fetchAll();
        }}
      />
    );
  }

  return (
    <div className="content-container">
      <div className="page-header">
        <div className="page-eyebrow">
          <Megaphone size={13} /> Placement Drives
        </div>
        <h1 className="page-title">Drives</h1>
        <p className="page-desc">
          A drive is assembled as a draft — job description, targets, eligibility criteria and
          re-application policy — then published. Publishing opens applications and notifies every
          eligible student, so it is checked hard before it goes out.
        </p>
      </div>

      <div className="panel">
        <div className="panel-header">
          <div className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Megaphone size={16} color="var(--accent-blue)" />
            <span>All drives</span>
            <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '11px' }}>
              {postings.length}
            </span>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn btn-ghost btn-sm" onClick={fetchAll} disabled={loading}>
              <RefreshCw size={12} /> Refresh
            </button>
            <button
              className="btn btn-primary btn-sm"
              onClick={() => setIsFormOpen(true)}
              disabled={companies.length === 0}
              title={companies.length === 0 ? 'Onboard a company first' : undefined}
            >
              <Plus size={12} /> New drive
            </button>
          </div>
        </div>

        {companies.length === 0 && !loading && (
          <div className="alert" style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span>No companies yet — a drive is always posted against one.</span>
            {setActiveView && (
              <button className="btn btn-secondary btn-sm" onClick={() => setActiveView('companies')}>
                Onboard a company
              </button>
            )}
          </div>
        )}

        {loading ? (
          <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12.5px' }}>
            Loading drives...
          </div>
        ) : postings.length === 0 ? (
          <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12.5px' }}>
            No drives yet.
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Role</th>
                  <th>Company</th>
                  <th>Type</th>
                  <th>Deadline</th>
                  <th>Targets</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Open</th>
                </tr>
              </thead>
              <tbody>
                {postings.map((p) => {
                  const style = POSTING_STATUS_STYLE[p.status] || POSTING_STATUS_STYLE.DRAFT;
                  return (
                    <tr key={p.id} style={{ cursor: 'pointer' }} onClick={() => setOpenId(p.id)}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{p.title}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                          {p.postingCode}
                        </div>
                      </td>
                      <td style={{ fontSize: '12.5px' }}>{p.companyName}</td>
                      <td style={{ fontSize: '11.5px' }}>{p.jobType?.replaceAll('_', ' ')}</td>
                      <td style={{ fontSize: '11.5px', whiteSpace: 'nowrap' }}>
                        <CalendarClock size={11} style={{ verticalAlign: '-1px', marginRight: '4px' }} />
                        {formatInstant(p.applicationDeadline)}
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: '12px' }}>
                        {p.targets?.length ?? 0}
                      </td>
                      <td><span className={`badge ${style.className}`}>{style.label}</span></td>
                      <td style={{ textAlign: 'right' }}>
                        <ChevronRight size={15} color="var(--text-muted)" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} title="New drive (draft)" wide>
        <form onSubmit={handleCreate}>
          {/*
            Optional shortcut, never a requirement. The parser fills what it can
            read and leaves everything else to be typed -- it proposes, it does
            not decide.
          */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '9px 12px', marginBottom: '14px',
            background: 'var(--bg-surface-raised)', borderRadius: 'var(--radius-md)',
            border: '1px dashed var(--border-subtle)',
          }}>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Have the company's JD text? Paste it and fill most of this in.
            </span>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setIsJdOpen(true)}>
              <Wand2 size={13} /> Paste a JD
            </button>
          </div>

          <div className="form-group" style={{ marginBottom: '12px' }}>
            <label className="form-label">Company *</label>
            <select className="form-control" required value={form.companyId} onChange={set('companyId')}>
              <option value="">Select an active company</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.code}){c.status !== 'ACTIVE' ? ` — ${c.status.toLowerCase()}` : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Role title *</label>
              <input className="form-control" required placeholder="Systems Engineer"
                     value={form.title} onChange={set('title')} />
            </div>
            <div className="form-group">
              <label className="form-label">Posting code *</label>
              <input className="form-control" required placeholder="INFY-SE-2027"
                     value={form.postingCode} onChange={set('postingCode')} />
            </div>
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Job type *</label>
              <select className="form-control" required value={form.jobType} onChange={set('jobType')}>
                {JOB_TYPES.map((t) => (
                  <option key={t} value={t}>{t.replaceAll('_', ' ')}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Work mode</label>
              <select className="form-control" value={form.workMode} onChange={set('workMode')}>
                <option value="ONSITE">Onsite</option>
                <option value="REMOTE">Remote</option>
                <option value="HYBRID">Hybrid</option>
              </select>
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '12px' }}>
            <label className="form-label">Description</label>
            <textarea className="form-control" rows={3} placeholder="What the role involves"
                      value={form.description} onChange={set('description')} />
          </div>

          <div className="form-group" style={{ marginBottom: '12px' }}>
            <label className="form-label">Responsibilities</label>
            <textarea className="form-control" rows={4}
                      placeholder={'- Design and implement backend services\n- Participate in code reviews'}
                      value={form.responsibilities} onChange={set('responsibilities')} />
          </div>

          {/* Skills. The student portal renders these split by the mandatory flag. */}
          <div className="form-group" style={{ marginBottom: '12px' }}>
            <label className="form-label">Skills</label>
            {form.skills.length === 0 && (
              <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginBottom: '6px' }}>
                None yet — students see a skills section on the drive page only when this is filled.
              </div>
            )}
            {form.skills.map((s, i) => (
              <div key={i} style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '6px' }}>
                <input className="form-control" style={{ flex: 1 }} placeholder="Spring Boot"
                       value={s.skill} onChange={(e) => setSkill(i, { skill: e.target.value })} />
                <select className="form-control" style={{ width: 'auto' }}
                        value={s.mandatory ? 'yes' : 'no'}
                        onChange={(e) => setSkill(i, { mandatory: e.target.value === 'yes' })}>
                  <option value="yes">Required</option>
                  <option value="no">Preferred</option>
                </select>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => dropSkill(i)}>
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
            <button type="button" className="btn btn-ghost btn-sm" onClick={addSkill}>
              <Plus size={12} /> Add skill
            </button>
          </div>

          <div className="form-group" style={{ marginBottom: '12px' }}>
            <label className="form-label">Locations</label>
            {form.locations.map((l, i) => (
              <div key={i} style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '6px' }}>
                <input className="form-control" style={{ flex: 1 }} placeholder="Pune"
                       value={l.city} onChange={(e) => setLocation(i, { city: e.target.value })} />
                <input className="form-control" style={{ flex: 1 }} placeholder="Maharashtra"
                       value={l.state} onChange={(e) => setLocation(i, { state: e.target.value })} />
                <input className="form-control" style={{ width: '110px' }} placeholder="India"
                       value={l.country} onChange={(e) => setLocation(i, { country: e.target.value })} />
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => dropLocation(i)}>
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
            <button type="button" className="btn btn-ghost btn-sm" onClick={addLocation}>
              <Plus size={12} /> Add location
            </button>
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">CTC min (₹ / year)</label>
              <input className="form-control" type="number" step="0.01" placeholder="450000"
                     value={form.ctcMin} onChange={set('ctcMin')} />
            </div>
            <div className="form-group">
              <label className="form-label">CTC max (₹ / year)</label>
              <input className="form-control" type="number" step="0.01" placeholder="650000"
                     value={form.ctcMax} onChange={set('ctcMax')} />
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Used for the re-application uplift rule.
              </span>
            </div>
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Package basis</label>
              <select className="form-control" value={form.packageBasis} onChange={set('packageBasis')}>
                {PACKAGE_BASES.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                What the figures above mean. The uplift rule compares like with like.
              </span>
            </div>
            <div className="form-group">
              <label className="form-label">Currency</label>
              <input className="form-control" maxLength={3} placeholder="INR"
                     value={form.ctcCurrency} onChange={set('ctcCurrency')} />
            </div>
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Stipend (₹ / month)</label>
              <input className="form-control" type="number" step="0.01" placeholder="25000"
                     value={form.stipendAmount} onChange={set('stipendAmount')} />
            </div>
            <div className="form-group">
              <label className="form-label">Openings</label>
              <input className="form-control" type="number" placeholder="40"
                     value={form.vacancyCount} onChange={set('vacancyCount')} />
            </div>
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Stipend period</label>
              <select className="form-control" value={form.stipendPeriod} onChange={set('stipendPeriod')}
                      disabled={!form.stipendAmount}>
                {STIPEND_PERIODS.map((x) => <option key={x} value={x}>{x.replaceAll('_', ' ')}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Internship duration (months)</label>
              <input className="form-control" type="number" placeholder="6"
                     value={form.internshipDurationMonths} onChange={set('internshipDurationMonths')} />
            </div>
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Bond (months)</label>
              <input className="form-control" type="number" placeholder="24"
                     value={form.bondMonths} onChange={set('bondMonths')} />
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                0 means an explicit "no bond". Leave blank if the JD is silent.
              </span>
            </div>
            <div className="form-group">
              <label className="form-label">Bond amount (₹)</label>
              <input className="form-control" type="number" step="0.01" placeholder="200000"
                     value={form.bondAmount} onChange={set('bondAmount')} />
            </div>
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Academic year *</label>
              <input className="form-control" required placeholder="2025-2026"
                     value={form.academicYear} onChange={set('academicYear')} />
            </div>
            <div className="form-group">
              <label className="form-label">Applications open at</label>
              <input className="form-control" type="datetime-local"
                     value={form.applicationOpensAt} onChange={set('applicationOpensAt')} />
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Leave blank to open the moment the drive is published.
              </span>
            </div>
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Application deadline *</label>
              <input className="form-control" type="datetime-local" required
                     value={form.applicationDeadline} onChange={set('applicationDeadline')} />
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Enforced on the server clock; applications stop at this instant.
              </span>
            </div>
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Drive date</label>
              <input className="form-control" type="datetime-local"
                     value={form.driveDate} onChange={set('driveDate')} />
            </div>
            <div className="form-group">
              <label className="form-label">Shortlisting</label>
              <select className="form-control" value={form.shortlistingMode} onChange={set('shortlistingMode')}>
                <option value="COMPOSITE_SCORE">Composite score (engine)</option>
                <option value="COMPANY_SIDE">Company shortlists</option>
                <option value="MANUAL">Manual shortlist (hard gates only)</option>
              </select>
              {/*
                All three apply the eligibility gates identically. The choice is
                only about who decides afterwards, which is what governs how much
                a student can be told about their own outcome.
              */}
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                {SHORTLISTING_HINT[form.shortlistingMode]}
              </span>
            </div>
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Drive venue</label>
              <input className="form-control" placeholder="PCCOE Main Auditorium"
                     value={form.driveVenue} onChange={set('driveVenue')} />
            </div>
            <div className="form-group">
              <label className="form-label">Max applications</label>
              <input className="form-control" type="number" placeholder="unlimited"
                     value={form.maxApplications} onChange={set('maxApplications')} />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '7px', marginBottom: '4px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '12.5px' }}>
              <input type="checkbox" checked={form.ppoPossible} onChange={setBool('ppoPossible')} />
              A PPO is possible from this drive
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '12.5px' }}>
              <input type="checkbox" checked={form.marksStudentPlaced} onChange={setBool('marksStudentPlaced')} />
              Clearing this drive marks a student placed
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                — drives the re-application policy
              </span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '12.5px' }}>
              <input type="checkbox" checked={form.notifyOnPublish} onChange={setBool('notifyOnPublish')} />
              Notify every eligible student on publish
            </label>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={() => setIsFormOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Creating...' : 'Create draft'}
            </button>
          </div>
        </form>
      </Modal>

      {/*
        Rendered AFTER the drive form and marked `elevated`. It is opened from
        inside that form, so it has to sit above it -- belt and braces, because
        equal z-index alone would leave the stacking to JSX order.
      */}
      <Modal
        isOpen={isJdOpen}
        onClose={() => setIsJdOpen(false)}
        title="Read a job description"
        wide
        elevated
      >
        <JdImport onApply={applyParsed} onClose={() => setIsJdOpen(false)} />
      </Modal>
    </div>
  );
}
