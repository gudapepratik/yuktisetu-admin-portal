import React, { useState } from 'react';
import { drivesApi } from '../api/drives';
import { useToast } from './Toast';
import { Wand2, Check, X, ArrowLeft, Quote } from 'lucide-react';

/**
 * Paste a job description, review what was read out of it, apply the parts you
 * accept to the drive form.
 *
 * The review step is the whole point and is not skippable. A parser that wrote
 * straight into the form would put a mis-read CTC or an invented two-year bond
 * in front of 2500 students the moment the drive published, and the coordinator
 * would have no way to know which numbers came from the JD and which came from
 * a regex having a bad day. So every proposal arrives switched on but visible,
 * quoting the exact text it came from, and nothing reaches the form until
 * "Apply" is pressed.
 *
 * Fields the parser could not determine simply do not appear. An empty box the
 * coordinator fills in is cheaper than a wrong value they have to notice first.
 */

/** Display order and formatting for each field the parser can return. */
const FIELD_SPEC = [
  { key: 'description',              label: 'Description',        kind: 'text' },
  { key: 'responsibilities',         label: 'Responsibilities',   kind: 'text' },
  { key: 'mandatorySkills',          label: 'Required skills',    kind: 'chips' },
  { key: 'preferredSkills',          label: 'Preferred skills',   kind: 'chips' },
  { key: 'locations',                label: 'Locations',          kind: 'locations' },
  { key: 'jobType',                  label: 'Job type',           kind: 'enum' },
  { key: 'workMode',                 label: 'Work mode',          kind: 'enum' },
  { key: 'ctcMin',                   label: 'CTC min',            kind: 'money' },
  { key: 'ctcMax',                   label: 'CTC max',            kind: 'money' },
  { key: 'stipendAmount',            label: 'Stipend / month',    kind: 'money' },
  { key: 'internshipDurationMonths', label: 'Internship months',  kind: 'number' },
  { key: 'bondMonths',               label: 'Bond',               kind: 'bond' },
  { key: 'vacancyCount',             label: 'Openings',           kind: 'number' },
  { key: 'ppoPossible',              label: 'PPO possible',       kind: 'bool' },
];

const rupees = (n) => `₹${Number(n).toLocaleString('en-IN')}`;

function present(value) {
  if (value === null || value === undefined) return false;
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

function renderValue(spec, value) {
  switch (spec.kind) {
    case 'money':  return rupees(value);
    case 'bool':   return value ? 'Yes' : 'No';
    case 'enum':   return String(value).replaceAll('_', ' ');
    // 0 is a real, meaningful answer here -- "no bond" is the thing students
    // ask about most, and showing it blank would lose that.
    case 'bond':   return value === 0 ? 'No bond' : `${value} months`;
    case 'number': return String(value);
    case 'text':   return value.length > 220 ? `${value.slice(0, 220)}…` : value;
    case 'chips':  return value.join(' · ');
    case 'locations': return value.map((l) => [l.city, l.state].filter(Boolean).join(', ')).join(' · ');
    default:       return String(value);
  }
}

export function JdImport({ onApply, onClose }) {
  const { success, error: showError, info } = useToast();

  const [text, setText] = useState('');
  const [parsing, setParsing] = useState(false);
  const [parsed, setParsed] = useState(null);
  const [accepted, setAccepted] = useState({});

  const runParse = async () => {
    if (!text.trim()) return;
    setParsing(true);
    try {
      const result = await drivesApi.parseJd(text);
      const found = FIELD_SPEC.filter((f) => present(result[f.key]));

      if (found.length === 0) {
        info('Nothing recognisable in that text. Fill the form in by hand.');
        return;
      }
      setParsed(result);
      setAccepted(Object.fromEntries(found.map((f) => [f.key, true])));
    } catch (err) {
      showError(err.message || 'Could not parse that job description');
    } finally {
      setParsing(false);
    }
  };

  const apply = () => {
    const payload = {};
    FIELD_SPEC.forEach((f) => {
      if (accepted[f.key] && present(parsed[f.key])) payload[f.key] = parsed[f.key];
    });
    onApply(payload);
    success(`${Object.keys(payload).length} field${Object.keys(payload).length === 1 ? '' : 's'} applied. Review before saving.`);
    onClose();
  };

  // ------------------------------------------------------------- paste step

  if (!parsed) {
    return (
      <>
        <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginBottom: '12px' }}>
          Paste the job description the company sent. Nothing is saved — you will see what was read
          out of it and choose what to keep.
        </p>
        <textarea
          className="form-control"
          rows={14}
          style={{ fontFamily: 'var(--font-mono)', fontSize: '12px' }}
          placeholder={'Key Responsibilities:\n- ...\n\nRequired Skills:\n- ...\n\nCTC: 6.5 - 8 LPA'}
          value={text}
          onChange={(e) => setText(e.target.value)}
          autoFocus
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '14px' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            {text.length.toLocaleString()} characters
          </span>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="button" className="btn btn-primary" onClick={runParse} disabled={parsing || !text.trim()}>
              <Wand2 size={14} /> {parsing ? 'Reading...' : 'Read the JD'}
            </button>
          </div>
        </div>
      </>
    );
  }

  // ------------------------------------------------------------ review step

  const rows = FIELD_SPEC.filter((f) => present(parsed[f.key]));
  const acceptedCount = rows.filter((f) => accepted[f.key]).length;
  const evidenceFor = (key) => parsed.evidence?.filter((e) => e.field === key) || [];

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', margin: 0 }}>
          {rows.length} field{rows.length === 1 ? '' : 's'} read from the text. Untick anything wrong —
          the rest of the form is untouched.
        </p>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setParsed(null)}>
          <ArrowLeft size={12} /> Edit text
        </button>
      </div>

      <div style={{ maxHeight: '52vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {rows.map((spec) => {
          const on = accepted[spec.key];
          const evidence = evidenceFor(spec.key);
          return (
            <div
              key={spec.key}
              onClick={() => setAccepted((p) => ({ ...p, [spec.key]: !p[spec.key] }))}
              style={{
                padding: '10px 12px',
                borderRadius: 'var(--radius-md)',
                background: on ? 'var(--bg-surface-raised)' : 'var(--bg-surface)',
                border: `1px solid ${on ? 'var(--accent-blue)' : 'var(--border-subtle)'}`,
                opacity: on ? 1 : 0.5,
                cursor: 'pointer',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                <div style={{ marginTop: '2px', flexShrink: 0 }}>
                  {on ? <Check size={14} color="var(--success)" /> : <X size={14} color="var(--text-muted)" />}
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    {spec.label}
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: 600, marginTop: '2px', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                    {renderValue(spec, parsed[spec.key])}
                  </div>

                  {/*
                    The justification. Without it a coordinator can only accept
                    on faith, which is exactly the failure mode this screen is
                    here to prevent.
                  */}
                  {evidence.length > 0 && (
                    <div style={{ marginTop: '5px', fontSize: '11px', color: 'var(--text-muted)', display: 'flex', gap: '5px' }}>
                      <Quote size={10} style={{ flexShrink: 0, marginTop: '3px' }} />
                      <span style={{ fontFamily: 'var(--font-mono)' }}>
                        {evidence.slice(0, 3).map((e) => e.matched).join(' | ')}
                        {evidence.length > 3 ? ` +${evidence.length - 3} more` : ''}
                        {evidence[0].section !== '(body)' ? ` — under "${evidence[0].section}"` : ''}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/*
        Named explicitly so its absence is not read as "this JD has no bond".
        Unknown and "explicitly no bond" are different answers to the question a
        student is most likely to ask.
      */}
      <div style={{ marginTop: '12px', fontSize: '11px', color: 'var(--text-muted)' }}>
        Not found in this text:{' '}
        {FIELD_SPEC.filter((f) => !present(parsed[f.key])).map((f) => f.label).join(', ') || 'nothing'}.
        {' '}The role title is never read automatically — set it yourself.
      </div>

      <div className="modal-footer" style={{ marginTop: '14px' }}>
        <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
        <button type="button" className="btn btn-primary" onClick={apply} disabled={acceptedCount === 0}>
          Apply {acceptedCount} field{acceptedCount === 1 ? '' : 's'}
        </button>
      </div>
    </>
  );
}
