import axios from 'axios';

// Module-level slots injected by AuthProvider on mount
// This pattern avoids a circular dependency:
//   AuthContext -> apiClient -> AuthContext (would break)
// Instead, AuthProvider calls setTokenGetter() and setSessionExpiredHandler() once so apiClient can access the current token without importing the context

let getToken: () => string | null = () => null;
let onSessionExpired: () => void = () => {};

// Called once by AuthProvider after it mounts
export function setTokenGetter(fn: () => string | null): void {
  getToken = fn;
}

// Called once by AuthProvider after it mounts (Triggers logout + /login redirect)
export function setSessionExpiredHandler(fn: () => void): void {
  onSessionExpired = fn;
}

// Axios instance

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL as string,
  // Must be true so the browser sends the httpOnly refreshToken cookie automatically on every request (including /auth/refresh)
  withCredentials: true,
});

// Request interceptor (attach Bearer token to every outgoing request)

apiClient.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});


// Response interceptor (silent token refresh on 401)
//
// Flow:
//   1. Request fails with 401
//   2. Call POST /auth/refresh (raw axios, not the instance : avoids loop) -> backend reads the httpOnly cookie and returns a new accessToken
//   3. Store the new token via onTokenRefreshed()
//   4. Retry the original request once with the new token
//   5. If /auth/refresh also 401s -> session is dead -> call onSessionExpired()

// Prevents multiple concurrent requests from each triggering their own refresh
// While a refresh is in flight, subsequent 401s queue up and share the result
let isRefreshing = false;
let refreshQueue: Array<{
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
}> = [];

// Flush the queue after a refresh succeeds or fails
function flushQueue(error: unknown, token: string | null): void {
  refreshQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
    } else {
      resolve(token!);
    }
  });
  refreshQueue = [];
}

// Injected by AuthProvider so the interceptor can update the stored token after a successful silent refresh
let onTokenRefreshed: (newToken: string) => void = () => {};

// Called once by AuthProvider after it mounts
export function setTokenRefreshedHandler(fn: (newToken: string) => void): void {
  onTokenRefreshed = fn;
}

apiClient.interceptors.response.use(
  // Pass-through for all successful responses
  (response) => response,

  async (error: unknown) => {
    // Only handle AxiosErrors with a 401 status
    if (!axios.isAxiosError(error)) return Promise.reject(error);

    const originalRequest = error.config;

    // If the failed request IS the refresh call itself -> session is dead
    if (originalRequest?.url?.includes('/auth/refresh')) {
      onSessionExpired();
      return Promise.reject(error);
    }

    if (error.response?.status !== 401 || !originalRequest) {
      return Promise.reject(error);
    }

    // Avoid retrying the same request more than once
    const retried = (originalRequest as typeof originalRequest & { _retried?: boolean })._retried;
    if (retried) {
      onSessionExpired();
      return Promise.reject(error);
    }

    if (isRefreshing) {
      // Another refresh is in-flight (wait for it to resolve then retry)
      return new Promise<string>((resolve, reject) => {
        refreshQueue.push({ resolve, reject });
      }).then((newToken) => {
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return apiClient(originalRequest);
      });
    }

    // Mark as retried before the async gap to prevent race conditions
    (originalRequest as typeof originalRequest & { _retried?: boolean })._retried = true;
    isRefreshing = true;

    try {
      // Use a raw axios call (not the instance) to avoid triggering this interceptor again and causing an infinite loop
      const { data } = await axios.post<{ accessToken: string }>(
        `${import.meta.env.VITE_API_BASE_URL as string}/auth/refresh`,
        {},
        { withCredentials: true },
      );

      const newToken = data.accessToken;

      // Update the token in AuthContext
      onTokenRefreshed(newToken);

      // Flush any queued requests with the new token
      flushQueue(null, newToken);

      // Retry the original request
      originalRequest.headers.Authorization = `Bearer ${newToken}`;
      return apiClient(originalRequest);
    } catch (refreshError) {
      flushQueue(refreshError, null);
      onSessionExpired();
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);
