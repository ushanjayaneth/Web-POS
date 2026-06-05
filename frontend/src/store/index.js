import { create } from 'zustand';
import api from '../utils/api';

export const useAuthStore = create((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  login: async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    if (res.success) {
      localStorage.setItem('accessToken', res.data.accessToken);
      localStorage.setItem('refreshToken', res.data.refreshToken);
      set({ user: res.data.user, isAuthenticated: true });
    }
    return res;
  },
  register: async (data) => {
    const res = await api.post('/auth/register', data);
    if (res.success) {
      localStorage.setItem('accessToken', res.data.accessToken);
      localStorage.setItem('refreshToken', res.data.refreshToken);
      set({ user: res.data.user, isAuthenticated: true });
    }
    return res;
  },
  logout: async () => {
    try {
      await api.post('/auth/logout', { refreshToken: localStorage.getItem('refreshToken') });
    } catch (err) {
      console.error(err);
    } finally {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      set({ user: null, isAuthenticated: false });
    }
  },
  fetchUser: async () => {
    try {
      const res = await api.get('/auth/me');
      if (res.success) {
        set({ user: res.data, isAuthenticated: true, isLoading: false });
      }
    } catch (err) {
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  }
}));

export const useCartStore = create((set, get) => ({
  items: [],
  subtotal: 0,
  itemCount: 0,
  isLoading: false,
  fetchCart: async () => {
    set({ isLoading: true });
    try {
      const res = await api.get('/cart');
      if (res.success) {
        set({ items: res.data.items, subtotal: res.data.subtotal, itemCount: res.data.item_count, isLoading: false });
      }
    } catch (err) {
      set({ isLoading: false });
    }
  },
  addToCart: async (productId, quantity = 1, variant = null) => {
    const res = await api.post('/cart', { product_id: productId, quantity, variant });
    if (res.success) {
      await get().fetchCart();
    }
    return res;
  },
  updateQuantity: async (id, quantity) => {
    const res = await api.put(`/cart/${id}`, { quantity });
    if (res.success) {
      await get().fetchCart();
    }
    return res;
  },
  removeFromCart: async (id) => {
    const res = await api.delete(`/cart/${id}`);
    if (res.success) {
      await get().fetchCart();
    }
    return res;
  },
  clearCart: async () => {
    const res = await api.delete('/cart');
    if (res.success) {
      set({ items: [], subtotal: 0, itemCount: 0 });
    }
    return res;
  }
}));
