import * as XLSX from 'xlsx';

/**
 * Exports an applicant pool to .xlsx.
 *
 * This sheet is the artefact that actually leaves the building: the TnP mails it
 * to the company, and HR works through it without ever touching the portal. That
 * is the whole reason the resume column carries a live hyperlink rather than a
 * storage key -- a key is meaningless to a recruiter, and asking them to log in
 * to fetch each CV is how a drive stalls.
 *
 * Delivery URLs are public and non-expiring by design (see FileStorageService),
 * so a sheet sent in March still opens in June. The trade-off was made
 * deliberately: a dead link surfaces as "why was my document not opened when it
 * was needed", which is a far worse conversation to have with a student than the
 * exposure of an unguessable URL.
 */

const COLUMNS = [
  { header: 'Name',            get: (a) => a.studentName || '' },
  { header: 'Email',           get: (a) => a.email || '' },
  { header: 'Phone',           get: (a) => a.phone || '' },
  { header: 'Batch',           get: (a) => a.batchYear ?? '' },
  { header: 'CGPA',            get: (a) => a.cgpa ?? '' },
  { header: 'Active backlogs', get: (a) => a.activeBacklogs ?? '' },
  { header: 'Status',          get: (a) => a.status || '' },
  { header: 'Source',          get: (a) => (a.source || '').replaceAll('_', ' ') },
  { header: 'Applied at',      get: (a) => (a.appliedAt ? new Date(a.appliedAt).toLocaleString('en-IN') : '') },
  // Kept as its own column so a recruiter scanning the sheet can see at a glance
  // who has no CV attached, rather than discovering it by clicking an empty cell.
  { header: 'Resume',          get: (a) => (a.resumeUrl ? (a.resumeFileName || 'Resume') : 'Not submitted'), link: true },
];

const COLUMN_WIDTHS = [26, 30, 15, 8, 8, 9, 14, 16, 20, 34];

/** Excel refuses these in a sheet name, and silently mangles an over-long one. */
function safeSheetName(name) {
  return (name || 'Applicants').replace(/[\\/?*[\]:]/g, '-').slice(0, 31) || 'Applicants';
}

function safeFileName(name) {
  return (name || 'applicants').replace(/[^A-Za-z0-9._-]+/g, '_').replace(/_{2,}/g, '_');
}

/**
 * @param applicants rows as returned by GET /postings/{id}/applications
 * @param meta       { postingCode, companyName, title, statusLabel }
 */
export function exportApplicants(applicants, meta = {}) {
  const rows = [
    COLUMNS.map((c) => c.header),
    ...applicants.map((a) => COLUMNS.map((c) => c.get(a))),
  ];

  const sheet = XLSX.utils.aoa_to_sheet(rows);
  sheet['!cols'] = COLUMN_WIDTHS.map((w) => ({ wch: w }));
  sheet['!autofilter'] = { ref: XLSX.utils.encode_range({
    s: { r: 0, c: 0 },
    e: { r: rows.length - 1, c: COLUMNS.length - 1 },
  }) };
  sheet['!freeze'] = { xSplit: 0, ySplit: 1 };

  // Hyperlinks are attached cell-by-cell after the sheet is built: SheetJS has no
  // way to express one through aoa_to_sheet, and a plain string would land in the
  // recipient's Excel as inert text.
  COLUMNS.forEach((col, c) => {
    if (!col.link) return;
    applicants.forEach((a, i) => {
      if (!a.resumeUrl) return;
      const ref = XLSX.utils.encode_cell({ r: i + 1, c });
      const cell = sheet[ref];
      if (!cell) return;
      cell.l = { Target: a.resumeUrl, Tooltip: `Download ${a.resumeFileName || 'resume'}` };
      cell.s = { font: { color: { rgb: '0563C1' }, underline: true } };
    });
  });

  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, safeSheetName(meta.statusLabel || 'Applicants'));

  const stamp = new Date().toISOString().slice(0, 10);
  const parts = [meta.companyName, meta.postingCode, meta.statusLabel, stamp].filter(Boolean);
  XLSX.writeFile(book, `${safeFileName(parts.join('_'))}.xlsx`);

  return { rows: applicants.length, withResume: applicants.filter((a) => a.resumeUrl).length };
}
