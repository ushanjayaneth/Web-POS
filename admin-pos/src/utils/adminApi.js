import { auth } from '../firebase';

const PRODUCTION_API_URL = 'https://web-pos-henna.vercel.app/api';
const configuredApiUrl = import.meta.env.VITE_ADMIN_API_URL;
const isLocalApiUrl = configuredApiUrl
  && /^(https?:\/\/)?(localhost|127\.0\.0\.1)(:\d+)?\/api\/?$/i.test(configuredApiUrl);

const API_BASE_URL = import.meta.env.PROD
  ? (configuredApiUrl && !isLocalApiUrl ? configuredApiUrl : PRODUCTION_API_URL)
  : (configuredApiUrl || '/api');

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
  const { headers: optionHeaders, ...restOptions } = options;

  const response = await fetch(`${API_BASE_URL}${path}`, {
    cache: 'no-store',
    ...restOptions,
    headers: {
      ...headers,
      ...(optionHeaders || {}),
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
  getProducts: () => request(`/admin/products?include_inactive=true&_ts=${Date.now()}`),
  // Lightweight POS payload: cover image only, no cost price.
  getPosProducts: () => request(`/admin/products?include_inactive=true&pos_mode=true&_ts=${Date.now()}`),
  getOrders: () => request('/admin/orders'),
  updateOrderStatus: (id, status) => request(`/admin/orders/${id}/status`, {
    method: 'PUT',
    body: JSON.stringify({ status }),
  }),
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
  processReturn: (saleId, itemIdx, type) => request(`/admin/sales/${saleId}/return`, {
    method: 'POST',
    body: JSON.stringify({ itemIdx, type }),
  }),
  getSupplierReturns: () => request('/admin/supplier-returns'),
  createSupplierReturn: (payload) => request('/admin/supplier-returns', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
  deleteSupplierReturn: (id) => request(`/admin/supplier-returns/${id}`, {
    method: 'DELETE',
  }),
  getLoanCustomers: () => request('/admin/loan-customers'),
  createLoanCustomer: (payload) => request('/admin/loan-customers', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
  updateLoanCustomer: (id, payload) => request(`/admin/loan-customers/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  }),
  deleteLoanCustomer: (id) => request(`/admin/loan-customers/${id}`, {
    method: 'DELETE',
  }),
  getLoans: () => request('/admin/loans'),
  createLoan: (payload) => request('/admin/loans', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
  updateLoan: (id, payload) => request(`/admin/loans/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  }),
  recordLoanPayment: (id, payload) => request(`/admin/loans/${id}/payment`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  }),
  markInstallmentPaid: (id, idx) => request(`/admin/loans/${id}/installment/${idx}`, {
    method: 'PUT',
  }),
  deleteLoan: (id) => request(`/admin/loans/${id}`, {
    method: 'DELETE',
  }),
};

export default adminApi;
