import axios from 'axios';

// Always use the hardcoded production URL in production builds.
// In development, proxy to localhost via Vite's /api proxy.
const API_BASE_URL = import.meta.env.PROD
  ? 'https://web-pos-henna.vercel.app/api'
  : '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const isSellerReq = config.url && (config.url.startsWith('/sellers') || config.url.startsWith('sellers'));
  const token = isSellerReq 
    ? (localStorage.getItem('sellerAccessToken') || localStorage.getItem('accessToken'))
    : localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      const isSellerReq = originalRequest.url && (originalRequest.url.startsWith('/sellers') || originalRequest.url.startsWith('sellers'));
      if (isSellerReq) {
        originalRequest._retry = true;
        try {
          const refreshToken = localStorage.getItem('sellerRefreshToken');
          if (!refreshToken) throw new Error('No seller refresh token');
          const res = await axios.post(`${api.defaults.baseURL}/sellers/refresh`, { refreshToken });
          const newAccess = res.data.data.accessToken;
          const newRefresh = res.data.data.refreshToken;
          localStorage.setItem('sellerAccessToken', newAccess);
          localStorage.setItem('sellerRefreshToken', newRefresh);
          originalRequest.headers.Authorization = `Bearer ${newAccess}`;
          return api(originalRequest);
        } catch (err) {
          localStorage.removeItem('sellerAccessToken');
          localStorage.removeItem('sellerRefreshToken');
          window.location.href = '/seller/login';
          return Promise.reject(err);
        }
      } else if (error.response?.data?.code === 'TOKEN_EXPIRED') {
        originalRequest._retry = true;
        try {
          const refreshToken = localStorage.getItem('refreshToken');
          if (!refreshToken) throw new Error('No refresh token');
          
          const res = await axios.post(`${api.defaults.baseURL}/auth/refresh`, { refreshToken });
          localStorage.setItem('accessToken', res.data.accessToken);
          localStorage.setItem('refreshToken', res.data.refreshToken);
          
          originalRequest.headers.Authorization = `Bearer ${res.data.accessToken}`;
          return api(originalRequest);
        } catch (err) {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          window.location.href = '/login';
          return Promise.reject(err);
        }
      }
    }
    return Promise.reject(error.response?.data || error.message);
  }
);

export default api;
