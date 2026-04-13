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
  moveHU: async (hu_barcode: string, to_location_barcode: string) => {
    const res = await apiClient.post('/api/move', { hu_barcode, to_location_barcode });
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
  },
  getStockFlowStats: async () => {
    const res = await apiClient.get('/api/stats/stockflow');
    return res.data;
  },
  getTenants: async () => {
    const res = await apiClient.get('/api/tenants');
    return res.data;
  },
  createTenant: async (data: { name: string, slug: string }) => {
    const res = await apiClient.post('/api/tenants', data);
    return res.data;
  },
  getProducts: async (limit = 20, offset = 0) => {
    const res = await apiClient.get(`/api/products?limit=${limit}&offset=${offset}`);
    return res.data;
  },
  createProduct: async (data: any) => {
    const res = await apiClient.post('/api/products', data);
    return res.data;
  },
  updateProduct: async (id: string, data: any) => {
    const res = await apiClient.put(`/api/products/${id}`, data);
    return res.data;
  },
  updateProductUOM: async (id: string, conversions: any[]) => {
    const res = await apiClient.put(`/api/products/${id}/uom`, { conversions });
    return res.data;
  },
  registerBarcode: async (data: { code: string, entity_type: string, entity_id: number }) => {
    const res = await apiClient.post('/api/barcodes', data);
    return res.data;
  },
  deactivateBarcode: async (code: string) => {
    const res = await apiClient.delete(`/api/barcodes/${code}`);
    return res.data;
  },
  
  // Org Structure
  getOrgTree: async () => {
    const res = await apiClient.get('/api/org-tree');
    return res.data;
  },
  createOrg: async (data: any) => {
    const res = await apiClient.post('/api/organisations', data);
    return res.data;
  },
  createSite: async (orgId: string, data: any) => {
    const res = await apiClient.post(`/api/organisations/${orgId}/sites`, data);
    return res.data;
  },
  createZone: async (siteId: string, data: any) => {
    const res = await apiClient.post(`/api/sites/${siteId}/zones`, data);
    return res.data;
  },
  getSiteZones: async (siteId: string) => {
    const res = await apiClient.get(`/api/sites/${siteId}/zones`);
    return res.data;
  },

  // StockFlow GR & Tasks
  getGRStats: async () => {
    const res = await apiClient.get('/api/gr/stats');
    return res.data;
  },
  postGR: async (data: { product_id: number, quantity: number, unit: string, zone_id: number, supplier_ref?: string, notes?: string, batch_ref?: string }) => {
    const res = await apiClient.post('/api/gr', data);
    return res.data;
  },
  listGRs: async (limit = 20, offset = 0) => {
    const res = await apiClient.get(`/api/gr?limit=${limit}&offset=${offset}`);
    return res.data;
  },
  listPutawayTasks: async () => {
    const res = await apiClient.get('/api/warehouse-tasks');
    return res.data;
  },
  completePutaway: async (taskId: number, toZoneId: number) => {
    const res = await apiClient.post(`/api/warehouse-tasks/${taskId}/complete`, { to_zone_id: toZoneId });
    return res.data;
  }
};
