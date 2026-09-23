import { apiRequest } from './client';

export const adminApi = {
  // --- Trusts ---
  listTrusts: () => apiRequest('/api/admin/trusts'),
  getTrust: (id) => apiRequest(`/api/admin/trusts/${id}`),
  createTrust: (data) =>
    apiRequest('/api/admin/trusts', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateTrust: (id, data) =>
    apiRequest(`/api/admin/trusts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  updateTrustStatus: (id, status) =>
    apiRequest(`/api/admin/trusts/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),
  softDeleteTrust: (id) =>
    apiRequest(`/api/admin/trusts/${id}/soft-delete`, { method: 'POST' }),
  restoreTrust: (id) =>
    apiRequest(`/api/admin/trusts/${id}/restore`, { method: 'POST' }),
  /** Partial update -- only the fields sent are changed. PUT replaces the whole record. */
  patchTrust: (id, data) =>
    apiRequest(`/api/admin/trusts/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  listDeletedTrusts: () => apiRequest('/api/admin/trusts/deleted'),
  /** Irreversible, IT_ADMIN only, and refused unless the row is already soft-deleted. */
  hardDeleteTrust: (id) =>
    apiRequest(`/api/admin/trusts/${id}/hard-delete`, { method: 'POST' }),

  // --- Colleges ---
  listColleges: (trustId) => {
    const query = trustId ? `?trustId=${encodeURIComponent(trustId)}` : '';
    return apiRequest(`/api/admin/colleges${query}`);
  },
  getCollege: (id) => apiRequest(`/api/admin/colleges/${id}`),
  createCollege: (data) =>
    apiRequest('/api/admin/colleges', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateCollege: (id, data) =>
    apiRequest(`/api/admin/colleges/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  updateCollegeStatus: (id, status) =>
    apiRequest(`/api/admin/colleges/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),
  softDeleteCollege: (id) =>
    apiRequest(`/api/admin/colleges/${id}/soft-delete`, { method: 'POST' }),
  restoreCollege: (id) =>
    apiRequest(`/api/admin/colleges/${id}/restore`, { method: 'POST' }),
  /** Partial update -- only the fields sent are changed. PUT replaces the whole record. */
  patchCollege: (id, data) =>
    apiRequest(`/api/admin/colleges/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  listDeletedColleges: (trustId) =>
    apiRequest(`/api/admin/colleges/deleted?trustId=${encodeURIComponent(trustId)}`),
  /** Irreversible, IT_ADMIN only, and refused unless the row is already soft-deleted. */
  hardDeleteCollege: (id) =>
    apiRequest(`/api/admin/colleges/${id}/hard-delete`, { method: 'POST' }),

  // --- Departments ---
  listDepartments: (collegeId) => {
    const query = collegeId ? `?collegeId=${encodeURIComponent(collegeId)}` : '';
    return apiRequest(`/api/admin/departments${query}`);
  },
  getDepartment: (id) => apiRequest(`/api/admin/departments/${id}`),
  createDepartment: (data) =>
    apiRequest('/api/admin/departments', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateDepartment: (id, data) =>
    apiRequest(`/api/admin/departments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  updateDepartmentStatus: (id, status) =>
    apiRequest(`/api/admin/departments/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),
  softDeleteDepartment: (id) =>
    apiRequest(`/api/admin/departments/${id}/soft-delete`, { method: 'POST' }),
  restoreDepartment: (id) =>
    apiRequest(`/api/admin/departments/${id}/restore`, { method: 'POST' }),
  /** Partial update -- only the fields sent are changed. PUT replaces the whole record. */
  patchDepartment: (id, data) =>
    apiRequest(`/api/admin/departments/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  listDeletedDepartments: (collegeId) =>
    apiRequest(`/api/admin/departments/deleted?collegeId=${encodeURIComponent(collegeId)}`),
  /** Irreversible, IT_ADMIN only, and refused unless the row is already soft-deleted. */
  hardDeleteDepartment: (id) =>
    apiRequest(`/api/admin/departments/${id}/hard-delete`, { method: 'POST' }),

  // --- Batch Student Onboarding ---
  createBulkStudentProfile: (studentsArray) =>
    apiRequest('/api/admin/bulk-student', {
      method: 'POST',
      body: JSON.stringify({ students: studentsArray }),
    }),
};
