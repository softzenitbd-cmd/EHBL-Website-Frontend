import axios from 'axios';

// Detect active port dynamically or fallback to VPS backend
const initialBaseURL = import.meta.env.VITE_API_BASE_URL || 'https://server-ehblbackend-lynwib-9e6748-62-84-177-235.sslip.io/api';

const apiClient = axios.create({
  baseURL: initialBaseURL,
  headers: {
    'Content-Type': 'application/json',
  },
  // The full invoice list (with every line) is large; at 12s it was cut off
  // whenever the server was busy, and that page simply showed nothing.
  timeout: 60000,
});

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Request Interceptor to auto-inject JWT token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('ehbl_token') || localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor with Automatic Port Fallback & 401 Auto-Redirect
apiClient.interceptors.response.use(
  (response) => {
    return response.data;
  },
  async (error) => {
    const config = error.config;

    // A read that timed out, lost the connection, or hit a server hiccup
    // (502/503/504 while a deploy restarts) is tried again, up to twice.
    // Only GETs: repeating a save could save it twice.
    const status = error.response?.status;
    const transient = !error.response || [502, 503, 504].includes(status);
    if (config && transient && (config.method || 'get').toLowerCase() === 'get') {
      config._retries = (config._retries || 0) + 1;
      if (config._retries <= 2) {
        await sleep(1000 * config._retries);
        return apiClient(config);
      }
    }
    
    // Auto-switch between 8000 and 8001 if server is running on either port
    if (!error.response && config && !config._retryPort) {
      config._retryPort = true;
      const currentUrl = config.baseURL || apiClient.defaults.baseURL || '';
      
      let newBaseURL = '';
      if (currentUrl.includes(':8000')) {
        newBaseURL = currentUrl.replace(':8000', ':8001');
      } else if (currentUrl.includes(':8001')) {
        newBaseURL = currentUrl.replace(':8001', ':8000');
      }

      if (newBaseURL) {
        console.warn(`[API] Connection failed on ${currentUrl}. Auto-switching to ${newBaseURL}...`);
        config.baseURL = newBaseURL;
        apiClient.defaults.baseURL = newBaseURL;
        return apiClient(config);
      }
    }

    // If 401 Unauthorized, clear stale token and redirect to Login
    if (error.response?.status === 401) {
      console.warn('[API Auth] 401 Unauthorized. Stale token detected. Clearing session...');
      localStorage.removeItem('ehbl_token');
      localStorage.removeItem('token');
      if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
