/**
 * Axios API Instance
 */

import axios from 'axios';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// This interceptor ref lets us eject and re-add when getToken changes
let interceptorId = null;

/**
 * Sets up the auth interceptor with Clerk's getToken function.
 * Call this once in App.jsx when the user is signed in.
 *
 * @param {() => Promise<string|null>} getToken - from Clerk's useAuth()
 */
export const setupAuthInterceptor = (getToken) => {
  // Remove old interceptor if it exists (avoids duplicates on re-render)
  if (interceptorId !== null) {
    api.interceptors.request.eject(interceptorId);
  }

  interceptorId = api.interceptors.request.use(async (config) => {
    const token = await getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });
};
