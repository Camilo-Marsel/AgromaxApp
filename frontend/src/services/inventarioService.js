// frontend/src/services/inventarioService.js

import api from './api';

const inventarioService = {
  // ── Bodegas ──────────────────────────────────────────────────────────────

  getBodegas: async (params = {}) => {
    const res = await api.get('/inventario/bodegas/', { params });
    return res.data;
  },

  getBodega: async (id) => {
    const res = await api.get(`/inventario/bodegas/${id}/`);
    return res.data;
  },

  createBodega: async (data) => {
    const res = await api.post('/inventario/bodegas/', data);
    return res.data;
  },

  updateBodega: async (id, data) => {
    const res = await api.patch(`/inventario/bodegas/${id}/`, data);
    return res.data;
  },

  // ── Productos (catálogo) ─────────────────────────────────────────────────

  getProductos: async (params = {}) => {
    const res = await api.get('/inventario/productos/', { params });
    return res.data;
  },

  getProducto: async (id) => {
    const res = await api.get(`/inventario/productos/${id}/`);
    return res.data;
  },

  getProductoStocks: async (id) => {
    const res = await api.get(`/inventario/productos/${id}/stocks/`);
    return res.data;
  },

  createProducto: async (data) => {
    const res = await api.post('/inventario/productos/', data);
    return res.data;
  },

  updateProducto: async (id, data) => {
    const res = await api.patch(`/inventario/productos/${id}/`, data);
    return res.data;
  },

  deleteProducto: async (id) => {
    const res = await api.delete(`/inventario/productos/${id}/`);
    return res.data;
  },

  // ── Stocks por finca ─────────────────────────────────────────────────────

  getStocks: async (params = {}) => {
    const res = await api.get('/inventario/stocks/', { params });
    return res.data;
  },

  getStock: async (id) => {
    const res = await api.get(`/inventario/stocks/${id}/`);
    return res.data;
  },

  createStock: async (data) => {
    const res = await api.post('/inventario/stocks/', data);
    return res.data;
  },

  updateStock: async (id, data) => {
    const res = await api.patch(`/inventario/stocks/${id}/`, data);
    return res.data;
  },

  getStockBajo: async (params = {}) => {
    const res = await api.get('/inventario/stocks/stock_bajo/', { params });
    return res.data;
  },

  getResumen: async (params = {}) => {
    const res = await api.get('/inventario/stocks/resumen/', { params });
    return res.data;
  },

  // ── Movimientos ──────────────────────────────────────────────────────────

  getMovimientos: async (params = {}) => {
    const res = await api.get('/inventario/movimientos/', { params });
    return res.data;
  },

  getMovimientosPorStock: async (stockId, params = {}) => {
    const res = await api.get('/inventario/movimientos/por_stock/', {
      params: { stock_finca: stockId, ...params },
    });
    return res.data;
  },

  registrarMovimiento: async (data) => {
    const res = await api.post('/inventario/movimientos/', data);
    return res.data;
  },
};

export default inventarioService;
