import React, { useState } from 'react';
import { adminApi } from '../api/admin';
import { useToast } from '../components/Toast';
import { ExcelDropzone } from '../components/ExcelDropzone';
import { parseAndValidateStudentExcel } from '../utils/excelParser';
import {
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  Send,
  RefreshCw,
  Info,
  Filter,
} from 'lucide-react';

export function StudentImport() {
  const { success, error: showError } = useToast();

  const [parseState, setParseState] = useState({
    loading: false,
    error: '',
    result: null, // { fileName, totalRows, validCount, errorCount, rows, validStudentsPayload }
  });

  const [filterView, setFilterView] = useState('all'); // 'all' | 'valid' | 'errors'
  const [submitting, setSubmitting] = useState(false);
  const [apiResponse, setApiResponse] = useState(null);

  // Handle Excel Selection & Client Parsing
  const handleFileSelected = async (file) => {
    setParseState({ loading: true, error: '', result: null });
    setApiResponse(null);

    try {
      const parsedData = await parseAndValidateStudentExcel(file);
      setParseState({
        loading: false,
        error: '',
        result: parsedData,
      });
      success(`Spreadsheet parsed: ${parsedData.validCount} valid candidates found.`);
    } catch (err) {
      setParseState({
        loading: false,
        error: err.message || 'Failed to parse spreadsheet.',
        result: null,
      });
      showError(err.message || 'Spreadsheet parsing error');
    }
  };

  // Submit Valid JSON Batch to Backend API
  const handleBulkSubmit = async () => {
    if (!parseState.result || parseState.result.validStudentsPayload.length === 0) {
      showError('No valid student records available to import.');
      return;
    }

    setSubmitting(true);
    setApiResponse(null);

    try {
      const response = await adminApi.createBulkStudentProfile(
        parseState.result.validStudentsPayload
      );
      setApiResponse(response);
      success(
        `Batch onboarding complete! ${response.successfulCount} student(s) created in PENDING_ACTIVATION.`
      );
    } catch (err) {
      showError(err.message || 'Batch student creation failed on server.');
    } finally {
      setSubmitting(false);
    }
  };

  const resetAll = () => {
    setParseState({ loading: false, error: '', result: null });
    setApiResponse(null);
  };

  // Filter rows for preview table
  const displayedRows = parseState.result
    ? parseState.result.rows.filter((r) => {
        if (filterView === 'valid') return r.isValid;
        if (filterView === 'errors') return !r.isValid;
        return true;
      })
    : [];

  return (
    <div className="content-container">
      {/* Page Header */}
      <div className="page-header">
        <div className="page-eyebrow">
          <UploadCloud size={13} /> Batch Candidate Provisioning
        </div>
        <h1 className="page-title">Excel Student Import Studio</h1>
        <p className="page-desc">
          Upload candidate spreadsheets, run comprehensive client-side data validation, preview records, and transmit verified JSON payloads to the batch student onboarding service.
        </p>
      </div>

      {/* STEP 1: Upload Dropzone */}
      {!parseState.result && (
        <div className="panel" style={{ maxWidth: '800px', margin: '0 auto' }}>
          <ExcelDropzone
            onFileSelected={handleFileSelected}
            loading={parseState.loading}
            error={parseState.error}
          />

          <div
            style={{
              marginTop: '24px',
              padding: '16px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-surface-raised)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, fontSize: '12.5px', marginBottom: '8px' }}>
              <Info size={14} color="var(--accent-gold)" />
              <span>Spreadsheet Formatting Guidelines</span>
            </div>
            <ul style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.6, paddingLeft: '18px' }}>
              <li>
                <strong>Required Headers:</strong> <code>First Name</code>, <code>Last Name</code>, <code>Email</code>, <code>Phone</code>, <code>PRN</code>, <code>College Code</code> (e.g. PCCOE), <code>Department Code</code> (e.g. COMP).
              </li>
              <li>
                <strong>Optional Academic Columns:</strong> <code>CGPA</code> (0.0 - 10.0), <code>Sem 1 GPA</code> - <code>Sem 8 GPA</code>, <code>10th %</code>, <code>12th %</code>.
              </li>
              <li>Duplicate emails or PRNs within the same file will be highlighted for review.</li>
            </ul>
          </div>
        </div>
      )}

      {/* STEP 2: Validation Results & Interactive Preview */}
      {parseState.result && !apiResponse && (
        <div>
          {/* Summary Metric Cards */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '14px',
              marginBottom: '20px',
            }}
          >
            <div className="panel" style={{ padding: '16px' }}>
              <div className="form-label">Total Rows in File</div>
              <div style={{ fontSize: '24px', fontWeight: 700, marginTop: '4px' }}>
                {parseState.result.totalRows}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                {parseState.result.fileName}
              </div>
            </div>

            <div className="panel" style={{ padding: '16px' }}>
              <div className="form-label" style={{ color: 'var(--success)' }}>
                Valid Records (Ready)
              </div>
              <div style={{ fontSize: '24px', fontWeight: 700, marginTop: '4px', color: 'var(--success)' }}>
                {parseState.result.validCount}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                Passed format & duplicate checks
              </div>
            </div>

            <div className="panel" style={{ padding: '16px' }}>
              <div className="form-label" style={{ color: parseState.result.errorCount > 0 ? 'var(--danger)' : 'var(--text-muted)' }}>
                Validation Issues
              </div>
              <div
                style={{
                  fontSize: '24px',
                  fontWeight: 700,
                  marginTop: '4px',
                  color: parseState.result.errorCount > 0 ? 'var(--danger)' : 'var(--text-primary)',
                }}
              >
                {parseState.result.errorCount}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                Will be omitted from submission
              </div>
            </div>
          </div>

          {/* Action Toolbar */}
          <div
            className="panel"
            style={{
              padding: '14px 20px',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Filter View:
              </span>
              <button
                className={`btn btn-sm ${filterView === 'all' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setFilterView('all')}
              >
                All Records ({parseState.result.totalRows})
              </button>
              <button
                className={`btn btn-sm ${filterView === 'valid' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setFilterView('valid')}
              >
                Valid Only ({parseState.result.validCount})
              </button>
              <button
                className={`btn btn-sm ${filterView === 'errors' ? 'btn-danger' : 'btn-ghost'}`}
                onClick={() => setFilterView('errors')}
              >
                Errors Only ({parseState.result.errorCount})
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button className="btn btn-ghost btn-sm" onClick={resetAll} disabled={submitting}>
                <RefreshCw size={13} /> Upload Different File
              </button>

              <button
                className="btn btn-primary"
                onClick={handleBulkSubmit}
                disabled={submitting || parseState.result.validCount === 0}
              >
                <Send size={14} />
                {submitting
                  ? 'Transmitting Batch to Backend...'
                  : `Submit ${parseState.result.validCount} Valid Records`}
              </button>
            </div>
          </div>

          {/* Itemized Error Callout if errors exist */}
          {parseState.result.errorCount > 0 && filterView !== 'valid' && (
            <div
              className="panel"
              style={{
                marginBottom: '20px',
                borderColor: 'var(--danger-border)',
                background: 'rgba(235, 87, 87, 0.04)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--danger)', fontWeight: 600, marginBottom: '10px' }}>
                <AlertTriangle size={16} />
                <span>Validation Feedback ({parseState.result.errorCount} Rows Need Attention)</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '160px', overflowY: 'auto' }}>
                {parseState.result.rows
                  .filter((r) => !r.isValid)
                  .map((r) => (
                    <div
                      key={r.rowNumber}
                      style={{
                        padding: '6px 10px',
                        borderRadius: 'var(--radius-sm)',
                        background: 'rgba(235, 87, 87, 0.1)',
                        fontSize: '12px',
                        fontFamily: 'var(--font-mono)',
                      }}
                    >
                      <strong>Row {r.rowNumber}:</strong> {r.errors.join(' · ')}
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Data Preview Table */}
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Row</th>
                  <th>Status</th>
                  <th>Candidate Name</th>
                  <th>Email Address</th>
                  <th>Phone Number</th>
                  <th>PRN</th>
                  <th>College</th>
                  <th>Branch</th>
                  <th>CGPA</th>
                  <th>10th %</th>
                  <th>12th %</th>
                </tr>
              </thead>
              <tbody>
                {displayedRows.map((row) => (
                  <tr
                    key={row.rowNumber}
                    style={{
                      background: !row.isValid ? 'rgba(235, 87, 87, 0.06)' : undefined,
                    }}
                  >
                    <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                      #{row.rowNumber}
                    </td>
                    <td>
                      {row.isValid ? (
                        <span className="badge badge-active">✓ Valid</span>
                      ) : (
                        <span className="badge" style={{ background: 'var(--danger-bg)', color: 'var(--danger)' }}>
                          ⚠ Error
                        </span>
                      )}
                    </td>
                    <td style={{ fontWeight: 600 }}>
                      {row.data.firstName} {row.data.lastName}
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)' }}>{row.data.email}</td>
                    <td style={{ fontFamily: 'var(--font-mono)' }}>{row.data.phone}</td>
                    <td style={{ fontFamily: 'var(--font-mono)' }}>{row.data.prn}</td>
                    <td>{row.data.collegeCode}</td>
                    <td>{row.data.departmentCode}</td>
                    <td style={{ fontFamily: 'var(--font-mono)' }}>
                      {row.data.CGPA != null ? row.data.CGPA : '-'}
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)' }}>
                      {row.data.percentage10th != null ? `${row.data.percentage10th}%` : '-'}
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)' }}>
                      {row.data.percentage12th != null ? `${row.data.percentage12th}%` : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* STEP 3: API Response Telemetry */}
      {apiResponse && (
        <div className="panel">
          <div className="panel-header">
            <div className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle2 size={18} color="var(--success)" />
              <span>Backend Onboarding Telemetry</span>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={resetAll}>
              <RefreshCw size={13} /> Import Another Batch
            </button>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '14px',
              marginBottom: '24px',
            }}
          >
            <div
              style={{
                padding: '16px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-surface-raised)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <div className="form-label">Total Processed by Server</div>
              <div style={{ fontSize: '26px', fontWeight: 700, marginTop: '4px' }}>
                {apiResponse.totalProcessed}
              </div>
            </div>

            <div
              style={{
                padding: '16px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-surface-raised)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <div className="form-label" style={{ color: 'var(--success)' }}>
                Successfully Onboarded
              </div>
              <div style={{ fontSize: '26px', fontWeight: 700, marginTop: '4px', color: 'var(--success)' }}>
                {apiResponse.successfulCount}
              </div>
            </div>

            <div
              style={{
                padding: '16px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-surface-raised)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <div className="form-label" style={{ color: apiResponse.failedCount > 0 ? 'var(--danger)' : 'var(--text-muted)' }}>
                Server-Side Failures
              </div>
              <div
                style={{
                  fontSize: '26px',
                  fontWeight: 700,
                  marginTop: '4px',
                  color: apiResponse.failedCount > 0 ? 'var(--danger)' : 'var(--text-primary)',
                }}
              >
                {apiResponse.failedCount}
              </div>
            </div>
          </div>

          {/* Successful Students List */}
          {apiResponse.successfulStudents?.length > 0 && (
            <div style={{ marginBottom: '22px' }}>
              <h4 style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--success)', marginBottom: '10px' }}>
                ✓ Created Candidate Accounts (Invites Dispatched)
              </h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {apiResponse.successfulStudents.map((s, i) => (
                  <span key={i} className="badge badge-active" style={{ padding: '6px 12px', fontSize: '12px' }}>
                    {s.firstName} {s.lastName} ({s.email}) · PRN: {s.prn}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Failed Students List */}
          {apiResponse.failedStudents?.length > 0 && (
            <div>
              <h4 style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--danger)', marginBottom: '10px' }}>
                ⚠ Server Validation Rejections
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {apiResponse.failedStudents.map((f, i) => (
                  <div
                    key={i}
                    style={{
                      padding: '10px 14px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--danger-bg)',
                      border: '1px solid var(--danger-border)',
                      fontSize: '12px',
                      fontFamily: 'var(--font-mono)',
                    }}
                  >
                    <strong>{f.email || f.prn || 'Unknown'}:</strong> {f.errorMessage} (Field: {f.failedField})
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
