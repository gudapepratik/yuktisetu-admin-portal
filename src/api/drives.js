import { apiRequest } from './client';

/**
 * Company onboarding, drive authoring and the applicant pool.
 *
 * Everything here lives under /api/admin -- every administrative operation is
 * served by admin-service so that admins never queue behind drive-service while
 * it is busy serving students mid-drive. The student-facing endpoints
 * (/api/drive/...) are deliberately absent from this portal.
 */
export const drivesApi = {
  // ---------------- Companies ----------------

  listCompanies: ({ status, page = 0, size = 50 } = {}) => {
    const query = new URLSearchParams({ page, size });
    if (status) query.append('status', status);
    return apiRequest(`/api/admin/companies?${query.toString()}`);
  },

  getCompany: (id) => apiRequest(`/api/admin/companies/${id}`),

  createCompany: (data) =>
    apiRequest('/api/admin/companies', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateCompany: (id, data) =>
    apiRequest(`/api/admin/companies/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  /** Also the blacklist path -- the backend demands a reason for BLACKLISTED. */
  setCompanyStatus: (id, status, reason) =>
    apiRequest(`/api/admin/companies/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, reason }),
    }),

  listCompanyContacts: (id) => apiRequest(`/api/admin/companies/${id}/contacts`),

  addCompanyContact: (id, data) =>
    apiRequest(`/api/admin/companies/${id}/contacts`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // ---------------- Drive authoring ----------------

  listPostings: ({ status, companyId, page = 0, size = 50 } = {}) => {
    const query = new URLSearchParams({ page, size });
    if (status) query.append('status', status);
    if (companyId) query.append('companyId', companyId);
    return apiRequest(`/api/admin/postings?${query.toString()}`);
  },

  getPosting: (id) => apiRequest(`/api/admin/postings/${id}`),

  /**
   * Reads pasted JD text into drive fields. Writes nothing and takes no posting
   * id -- it runs before a drive exists, so a coordinator can paste, look, fix
   * the text and paste again at no cost.
   */
  parseJd: (text) =>
    apiRequest('/api/admin/postings/parse-jd', {
      method: 'POST',
      body: JSON.stringify({ text }),
    }),


  createPosting: (data) =>
    apiRequest('/api/admin/postings', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updatePosting: (id, data) =>
    apiRequest(`/api/admin/postings/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  /**
   * Registers a document already uploaded to object storage -- the bytes never
   * pass through admin-service. Publishing refuses a posting with no JD attached,
   * so this is a required step, not a convenience.
   */
  addDocument: (id, data) =>
    apiRequest(`/api/admin/postings/${id}/documents`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  /**
   * Uploads the JD itself and registers it in one synchronous call, returning
   * the stored key. The drafter attaches a file rather than pasting a storage
   * key by hand -- a mistyped key registered cleanly and only surfaced as a
   * dead JD link after the drive was published to the whole cohort.
   */
  uploadDocument: (id, file, docType = 'JD', primary = true) => {
    const body = new FormData();
    body.append('file', file);
    const query = new URLSearchParams({ docType, primary: String(primary) });
    return apiRequest(`/api/admin/postings/${id}/documents/upload?${query.toString()}`, {
      method: 'POST',
      body,
    });
  },

  listDocuments: (id) => apiRequest(`/api/admin/postings/${id}/documents`),

  /** Replaces the whole target set; a half-edited audience is how the wrong batch gets notified. */
  setTargets: (id, targets) =>
    apiRequest(`/api/admin/postings/${id}/targets`, {
      method: 'PUT',
      body: JSON.stringify({ targets }),
    }),

  getCriteria: (id) => apiRequest(`/api/admin/postings/${id}/criteria`),

  setCriteria: (id, data) =>
    apiRequest(`/api/admin/postings/${id}/criteria`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  getReapplicationPolicy: (id) => apiRequest(`/api/admin/postings/${id}/reapplication-policy`),

  setReapplicationPolicy: (id, data) =>
    apiRequest(`/api/admin/postings/${id}/reapplication-policy`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  /** The irreversible step: opens applications and queues the student notification. */
  publish: (id) => apiRequest(`/api/admin/postings/${id}/publish`, { method: 'POST' }),

  close: (id, reason) =>
    apiRequest(`/api/admin/postings/${id}/close`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),

  cancel: (id, reason) =>
    apiRequest(`/api/admin/postings/${id}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),

  // ---------------- Applicant pool ----------------

  listApplicants: (id, { status, page = 0, size = 50 } = {}) => {
    const query = new URLSearchParams({ page, size });
    if (status) query.append('status', status);
    return apiRequest(`/api/admin/postings/${id}/applications?${query.toString()}`);
  },

  applicantCounts: (id) => apiRequest(`/api/admin/postings/${id}/applications/counts`),

  listEligibilityRuns: (id) => apiRequest(`/api/admin/postings/${id}/eligibility/runs`),

  /**
   * Returns 202 with a RUNNING run to poll -- resolution is a cohort-sized batch
   * job and the screen is never held open for it.
   */
  reEvaluate: (id) =>
    apiRequest(`/api/admin/postings/${id}/eligibility/re-evaluate`, { method: 'POST' }),

  /** Bypasses the eligibility gate by design; audited as TNP_ADDED with a mandatory reason. */
  addApplicants: (id, studentUserIds, reason) =>
    apiRequest(`/api/admin/postings/${id}/applications`, {
      method: 'POST',
      body: JSON.stringify({ studentUserIds, reason }),
    }),

  disqualify: (id, applicationId, reason) =>
    apiRequest(`/api/admin/postings/${id}/applications/${applicationId}/disqualify`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),
};
