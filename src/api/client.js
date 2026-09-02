import axios from 'axios';

// Detect active port dynamically or fallback to 8001 / 8000
const initialBaseURL = import.meta.env.VITE_API_BASE_URL || 'http://192.168.68.104:8001/api';

const apiClient = axios.create({
  baseURL: initialBaseURL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 12000,
});

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
