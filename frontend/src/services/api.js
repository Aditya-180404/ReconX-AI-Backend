import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: { 
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true'
  },
});

// Attach JWT to every request automatically
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('reconx_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Global error handler — redirect to login on 401
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('reconx_token');
      window.location.href = '/';
    }
    return Promise.reject(err);
  }
);

/* ─── Auth Services ───────────────────────────────── */
export const authService = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  register: (username, email, password) => api.post('/auth/register', { username, email, password }),
  getProfile: () => api.get('/auth/me'),
  updateProfile: (data) => api.put('/auth/profile', data),
  changePassword: (data) => api.post('/auth/change-password', data),
};

/* ─── Scan Services ───────────────────────────────── */
export const scanService = {
  start: (target_url, scan_type, user_id, custom_params) => api.post('/scans/start', { target_url, scan_type, user_id, custom_params }),
  getById: (id) => api.get(`/scans/${id}`),
  stop: (id) => api.post(`/scans/${id}/stop`),
  getAll: () => api.get('/scans/'),
  getFindings: () => api.get('/scans/findings'),
};

/* ─── Report Services ─────────────────────────────── */
export const reportService = {
  generate: (scan_id) => api.post('/reports/generate', { scan_id }),
  getAll: () => api.get('/reports/'),
};

/* ─── Chat Services ───────────────────────────────── */
export const chatService = {
  getHistory: () => api.get('/chat/history'),
  sendMessage: (message) => api.post('/chat/send', { message }, { timeout: 60000 }),
};

export default api;
