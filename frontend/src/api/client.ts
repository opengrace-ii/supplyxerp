import axios from 'axios';

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE || 'http://localhost:8080',
  withCredentials: true,
});

export const api = {
  login: async (credentials: any) => {
    const res = await apiClient.post('/api/auth/login', credentials);
    return res.data;
  },
  logout: async () => {
    const res = await apiClient.post('/api/auth/logout');
    return res.data;
  },
  getMe: async () => {
    const res = await apiClient.get('/api/auth/me');
    return res.data;
  },
  scan: async (barcode: string) => {
    const res = await apiClient.post('/api/scan', { barcode });
    return res.data;
  },
  consume: async (barcode: string, quantity: number) => {
    const res = await apiClient.post('/api/consume', { barcode, quantity });
    return res.data;
  },
  split: async (barcode: string, quantity: number) => {
    const res = await apiClient.post('/api/split', { barcode, quantity });
    return res.data;
  },
  move: async (barcode: string, target_location: string) => {
    const res = await apiClient.post('/api/move', { barcode, target_location });
    return res.data;
  },
  getInventory: async () => {
    const res = await apiClient.get('/api/inventory');
    return res.data;
  },
  getLocations: async () => {
    const res = await apiClient.get('/api/locations');
    return res.data;
  },
  getLineage: async (id: string) => {
    const res = await apiClient.get(`/api/hus/${id}/lineage`);
    return res.data;
  }
};
