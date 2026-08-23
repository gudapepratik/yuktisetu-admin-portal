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

  // --- Batch Student Onboarding ---
  createBulkStudentProfile: (studentsArray) =>
    apiRequest('/api/admin/bulk-student', {
      method: 'POST',
      body: JSON.stringify({ students: studentsArray }),
    }),
};
