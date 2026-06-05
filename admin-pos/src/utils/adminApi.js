import { auth } from '../firebase';

const API_BASE_URL = import.meta.env.VITE_ADMIN_API_URL || '/api';

const getAuthHeaders = async () => {
  const user = auth.currentUser;

  if (!user) {
    throw new Error('Admin session expired. Please sign in again.');
  }

  const token = await user.getIdToken();

  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
};

const request = async (path, options = {}) => {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      ...headers,
      ...(options.headers || {}),
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok || data.success === false) {
    const message = data.message || data.errors?.[0]?.msg || 'Request failed.';
    throw new Error(message);
  }

  return data;
};

const adminApi = {
  getProducts: () => request('/admin/products?include_inactive=true'),
  createProduct: (payload) => request('/admin/products', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
  updateProduct: (id, payload) => request(`/admin/products/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  }),
  deleteProduct: (id) => request(`/admin/products/${id}`, {
    method: 'DELETE',
  }),
  getSales: () => request('/admin/sales'),
  createSale: (payload) => request('/admin/sales', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
  settleLoan: (id) => request(`/admin/sales/${id}/settle`, {
    method: 'PUT',
  }),
};

export default adminApi;
