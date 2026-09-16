import { apiRequest } from './client';

export const authApi = {
  // Public Login (Email + Password -> Returns { accessToken, refreshToken, userId, email, roles })
  login: (credentials) =>
    apiRequest('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    }),

  // Refresh Token
  refreshToken: (refreshToken) =>
    apiRequest('/api/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    }),

  // Logout (Blacklist token)
  logout: (refreshToken) =>
    apiRequest('/api/auth/logout', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    }),

  // Hierarchical Child Role User Creation (Parent creates child in PENDING_ACTIVATION)
  createRoleUser: (payload) =>
    apiRequest('/api/auth/roles/users', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // Accept Invite / Activate Account (Public - Credential is token)
  acceptInvite: (payload) =>
    apiRequest('/api/auth/roles/accept-invite', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // Deactivate Role Assignment
  deactivateRole: (payload) =>
    apiRequest('/api/auth/roles/deactivate', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // Soft Delete — the ordinary, reversible delete. This is what every admin
  // screen should call. The account is flagged deleted and hidden from active
  // views, but the row and its history stay. Requires the user's roles to be
  // deactivated first.
  softDeleteUser: (targetUserId) =>
    apiRequest('/api/auth/roles/soft-delete', {
      method: 'POST',
      body: JSON.stringify({ targetUserId }),
    }),

  // IT Admin Hard Delete — PERMANENT row removal, not reversible. Only
  // succeeds for an account that is already soft-deleted and has nothing
  // referencing it; otherwise the API refuses with CASCADE_BLOCKED listing
  // what still points at the user. Do not wire this to a generic "Delete"
  // button — use softDeleteUser above for that.
  hardDeleteUser: (targetUserId) =>
    apiRequest('/api/auth/roles/hard-delete', {
      method: 'POST',
      body: JSON.stringify({ targetUserId }),
    }),
};
