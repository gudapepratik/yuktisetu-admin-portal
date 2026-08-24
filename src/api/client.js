/**
 * Centralized HTTP Client for CPMS Admin Portal
 * Handles automatic JWT injection, error normalization, token refresh, and standard HTTP verbs.
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

const performRefresh = async () => {
  const refreshToken = localStorage.getItem('cpms_refresh_token');
  if (!refreshToken) throw new Error('No refresh token');

  const response = await fetch(`${AUTH_BASE_URL}/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });

  if (!response.ok) {
    const error = new Error('Token refresh failed');
    error.status = response.status;
    throw error;
  }

  const data = await response.json();
  localStorage.setItem('cpms_access_token', data.accessToken);
  if (data.refreshToken) {
    localStorage.setItem('cpms_refresh_token', data.refreshToken);
  }

  return data.accessToken;
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
    localStorage.removeItem('cpms_access_token');
    localStorage.removeItem('cpms_refresh_token');
    window.location.href = '/login';
    throw error;
  } finally {
    isRefreshing = false;
  }
};

export async function apiRequest(endpoint, options = {}) {
  const token = localStorage.getItem('cpms_access_token');

  const headers = {
    'Content-Type': 'application/json',
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

    if (response.status === 204) {
      return null;
    }

    const contentType = response.headers.get('content-type');
    const isJson = contentType && contentType.includes('application/json');
    const data = isJson ? await response.json() : await response.text();

    if (!response.ok) {
      const errorMessage =
        (typeof data === 'object' && (data.message || data.error || data.code)) ||
        `Request failed with status ${response.status}`;

      const error = new Error(errorMessage);
      error.status = response.status;
      error.code = data?.code;
      error.payload = data;
      throw error;
    }

    return data;
  } catch (err) {
    if (err.status === 401 && !endpoint.includes('/login') && !endpoint.includes('/refresh') && !endpoint.includes('/accept-invite')) {
      console.warn('Session expired or unauthorized request:', endpoint);
    }
    throw err;
  }
}