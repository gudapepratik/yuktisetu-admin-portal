/**
 * Centralized HTTP Client for CPMS Admin Portal
 * Handles automatic JWT injection, error normalization, token refresh, and standard HTTP verbs.
 *
 * Every backend response is now { success, status, message, data, error, timestamp }
 * (YuktiSetuResponse) -- this client unwraps `.data` on success and reads
 * `.error.code` / `.error.message` on failure, so callers keep getting the
 * same plain DTOs/errors they always did.
 */

const AUTH_BASE_URL = '/api/auth';

let isRefreshing = false;
let failedQueue = [];
let proactiveRefreshTimer = null;

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) prom.reject(error);
    else prom.resolve(token);
  });
  failedQueue = [];
};

// Dispatched instead of a hard `window.location.href` redirect: this SPA has
// no router and no real "/login" route (App.jsx drives view switching off
// in-memory state), so a hard redirect previously landed on a blank/unmatched
// URL. AuthContext listens for this and resets its user state, which routes
// back to the Login view within the SPA.
function notifySessionExpired() {
  localStorage.removeItem('cpms_access_token');
  localStorage.removeItem('cpms_refresh_token');
  window.dispatchEvent(new CustomEvent('cpms:auth-expired'));
}

const performRefresh = async () => {
  const refreshToken = localStorage.getItem('cpms_refresh_token');
  if (!refreshToken) throw new Error('No refresh token');

  const response = await fetch(`${AUTH_BASE_URL}/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });

  const envelope = await response.json().catch(() => null);
  if (!response.ok || !envelope?.data?.accessToken) {
    const error = new Error(envelope?.error?.message || envelope?.message || 'Token refresh failed');
    error.status = response.status;
    throw error;
  }

  localStorage.setItem('cpms_access_token', envelope.data.accessToken);
  if (envelope.data.refreshToken) {
    localStorage.setItem('cpms_refresh_token', envelope.data.refreshToken);
  }

  return envelope.data.accessToken;
};

export const scheduleProactiveRefresh = (expiresInSeconds) => {
  if (proactiveRefreshTimer) clearTimeout(proactiveRefreshTimer);
  const refreshAt = Math.max(expiresInSeconds - 60, 30) * 1000;
  proactiveRefreshTimer = setTimeout(async () => {
    try {
      await performRefresh();
    } catch {
    }
  }, refreshAt);
};

export const cancelProactiveRefresh = () => {
  if (proactiveRefreshTimer) {
    clearTimeout(proactiveRefreshTimer);
    proactiveRefreshTimer = null;
  }
};

const refreshAccessToken = async () => {
  if (isRefreshing) {
    return new Promise((resolve, reject) => {
      failedQueue.push({ resolve, reject });
    });
  }

  isRefreshing = true;

  try {
    const newAccessToken = await performRefresh();
    processQueue(null, newAccessToken);
    return newAccessToken;
  } catch (error) {
    processQueue(error, null);
    notifySessionExpired();
    throw error;
  } finally {
    isRefreshing = false;
  }
};

export async function apiRequest(endpoint, options = {}) {
  const token = localStorage.getItem('cpms_access_token');

  // A FormData body must NOT carry an explicit Content-Type. The browser has to
  // set it itself so it can append the multipart boundary; forcing
  // application/json here makes the server reject the upload as malformed.
  // Uploads otherwise go through this same function so they inherit the 401
  // refresh-and-retry -- a resume upload failing because the token aged out
  // mid-session would be indistinguishable from the file being bad.
  const isMultipart = options.body instanceof FormData;

  const headers = {
    ...(isMultipart ? {} : { 'Content-Type': 'application/json' }),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const config = {
    ...options,
    headers,
  };

  try {
    let response = await fetch(endpoint, config);

    if (response.status === 401 && !endpoint.includes('/login') && !endpoint.includes('/refresh') && !endpoint.includes('/accept-invite')) {
      const newAccessToken = await refreshAccessToken();

      const retryConfig = {
        ...config,
        headers: {
          ...config.headers,
          Authorization: `Bearer ${newAccessToken}`,
        },
      };
      response = await fetch(endpoint, retryConfig);
    }

    // Defensive fallback -- no backend endpoint returns 204 anymore (every
    // response now carries a YuktiSetuResponse body), but keep this in case
    // something upstream ever does.
    if (response.status === 204) {
      return null;
    }

    const contentType = response.headers.get('content-type');
    const isJson = contentType && contentType.includes('application/json');
    const body = isJson ? await response.json() : await response.text();

    const envelope = body && typeof body === 'object' && 'success' in body ? body : null;

    if (!response.ok) {
      const errorMessage =
        envelope?.error?.message ||
        envelope?.message ||
        (typeof body === 'object' && (body.message || body.error)) ||
        `Request failed with status ${response.status}`;

      const error = new Error(errorMessage);
      error.status = response.status;
      error.code = envelope?.error?.code;
      error.payload = body;
      throw error;
    }

    return envelope ? envelope.data : body;
  } catch (err) {
    if (err.status === 401 && !endpoint.includes('/login') && !endpoint.includes('/refresh') && !endpoint.includes('/accept-invite')) {
      console.warn('Session expired or unauthorized request:', endpoint);
    }
    throw err;
  }
}
