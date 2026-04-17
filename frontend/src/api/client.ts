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
  consume: async (data: { hu_code: string, quantity: number, notes: string }) => {
    const res = await apiClient.post('/api/stock/consume', data);
    return res.data;
  },
  split: async (data: { parent_hu_code: string, split_quantity: number }) => {
    const res = await apiClient.post('/api/stock/split', data);
    return res.data;
  },
  moveHU: async (hu_code: string, to_zone_code: string) => {
    const res = await apiClient.post('/api/stock/move', { hu_code, to_zone_code });
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
  getLineage: async (huCode: string) => {
    const res = await apiClient.get(`/api/stock/hu/${huCode}/lineage`);
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
  provisionOrgDefaults: async (orgId: string) => {
    const res = await apiClient.post(`/api/organisations/${orgId}/provision-defaults`);
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
  getGR: async (id: number) => {
    const res = await apiClient.get(`/api/gr/${id}`);
    return res.data;
  },
  listPutawayTasks: async () => {
    const res = await apiClient.get('/api/warehouse-tasks');
    return res.data;
  },
  completePutaway: async (taskId: number, toZoneId: number) => {
    const res = await apiClient.post(`/api/warehouse-tasks/${taskId}/complete`, { to_zone_id: toZoneId });
    return res.data;
  },

  // Setup & Config
  getTenantConfig: async () => {
    const res = await apiClient.get('/api/config/tenant');
    return res.data;
  },
  updateTenantConfig: async (data: any) => {
    const res = await apiClient.put('/api/config/tenant', data);
    return res.data;
  },
  getProfiles: async () => {
    const res = await apiClient.get('/api/config/domain-profiles');
    return res.data;
  },
  applyProfile: async (profile: string) => {
    const res = await apiClient.post('/api/config/domain-profiles/apply', { profile });
    return res.data;
  },
  applySequence: async (type: string, start: number) => {
    const res = await apiClient.post('/api/config/sequences/apply', { sequence_type: type, start_from: start });
    return res.data;
  },

  // Migration
  getMigrationStatus: async () => {
    const res = await apiClient.get('/api/migration/status');
    return res.data;
  },
  importProducts: async (formData: FormData) => {
    const res = await apiClient.post('/api/migration/products', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return res.data;
  },
  importOpeningBalances: async (formData: FormData) => {
    const res = await apiClient.post('/api/migration/opening-balances', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return res.data;
  },
  updateGoLiveDate: async (date: string) => {
    const res = await apiClient.put('/api/migration/go-live-date', { date });
    return res.data;
  },
  adminReset: async (confirmation: string) => {
    const res = await apiClient.post('/api/admin/reset', { confirmation });
    return res.data;
  },

  // Stock Intelligence
  getStockOverview: async () => {
    const res = await apiClient.get('/api/stock/overview');
    return res.data;
  },
  listStockProducts: async (params: { search?: string, limit?: number, offset?: number }) => {
    const res = await apiClient.get('/api/stock/products', { params });
    return res.data;
  },
  getStockProductDetail: async (id: number) => {
    const res = await apiClient.get(`/api/stock/products/${id}`);
    return res.data;
  },
  listStockZones: async () => {
    const res = await apiClient.get('/api/stock/zones');
    return res.data;
  },
  getHUDetail: async (huCode: string) => {
    const res = await apiClient.get(`/api/stock/hu/${huCode}`);
    return res.data;
  },
  listStockMovements: async (params: { product_id?: number, zone_id?: number, event_type?: string, page?: number }) => {
    const res = await apiClient.get('/api/stock/movements', { params });
    return res.data;
  },
  getStockAlerts: async () => {
    const res = await apiClient.get('/api/stock/alerts');
    return res.data;
  },
  adjustStock: async (data: { hu_id: number, physical_count: number, reason: string }) => {
    const res = await apiClient.post('/api/stock/adjust', data);
    return res.data;
  },
  listAdjustments: async (limit = 50, offset = 0) => {
    const res = await apiClient.get(`/api/stock/adjustments?limit=${limit}&offset=${offset}`);
    return res.data;
  },

  // Phase 3: Purchasing
  listSuppliers: async (limit = 100, offset = 0) => {
    const res = await apiClient.get(`/api/suppliers?limit=${limit}&offset=${offset}`);
    return res.data;
  },
  createSupplier: async (data: any) => {
    const res = await apiClient.post('/api/suppliers', data);
    return res.data;
  },
  updateSupplier: async (id: number, data: any) => {
    const res = await apiClient.put(`/api/suppliers/${id}`, data);
    return res.data;
  },
  deleteSupplier: async (id: number) => {
    const res = await apiClient.delete(`/api/suppliers/${id}`);
    return res.data;
  },
  listPRs: async (status = '') => {
    const res = await apiClient.get(`/api/purchase-requests?status=${status}`);
    return res.data;
  },
  createPR: async (data: any) => {
    const res = await apiClient.post('/api/purchase-requests', data);
    return res.data;
  },
  getPR: async (id: number) => {
    const res = await apiClient.get(`/api/purchase-requests/${id}`);
    return res.data;
  },
  approvePR: async (id: number) => {
    const res = await apiClient.post(`/api/purchase-requests/${id}/approve`);
    return res.data;
  },
  submitPR: async (id: number) => {
    const res = await apiClient.post(`/api/purchase-requests/${id}/submit`);
    return res.data;
  },
  rejectPR: async (id: number, reason: string) => {
    const res = await apiClient.post(`/api/purchase-requests/${id}/reject`, { reason });
    return res.data;
  },
  convertPRtoPO: async (id: number, supplierId: number) => {
    const res = await apiClient.post(`/api/purchase-requests/${id}/convert`, { supplier_id: supplierId });
    return res.data;
  },
  listPOs: async (status = '') => {
    const res = await apiClient.get(`/api/purchase-orders?status=${status}`);
    return res.data;
  },
  createPO: async (data: any) => {
    const res = await apiClient.post('/api/purchase-orders', data);
    return res.data;
  },
  getPO: async (id: number) => {
    const res = await apiClient.get(`/api/purchase-orders/${id}`);
    return res.data;
  },
  approvePO: async (id: number) => {
    const res = await apiClient.post(`/api/purchase-orders/${id}/approve`);
    return res.data;
  },
  submitPO: async (id: number) => {
    const res = await apiClient.post(`/api/purchase-orders/${id}/submit`);
    return res.data;
  },
  rejectPO: async (id: number, reason: string) => {
    const res = await apiClient.post(`/api/purchase-orders/${id}/reject`, { reason });
    return res.data;
  }
}
