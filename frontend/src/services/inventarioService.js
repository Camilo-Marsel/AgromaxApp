// frontend/src/services/inventarioService.js

import api from './api';

const inventarioService = {
  // ── Productos ────────────────────────────────────────────────────────────

  getProductos: async (params = {}) => {
    const res = await api.get('/inventario/productos/', { params });
    return res.data;
  },

  getProducto: async (id) => {
    const res = await api.get(`/inventario/productos/${id}/`);
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

  getStockBajo: async (params = {}) => {
    const res = await api.get('/inventario/productos/stock_bajo/', { params });
    return res.data;
  },

  getResumen: async (params = {}) => {
    const res = await api.get('/inventario/productos/resumen/', { params });
    return res.data;
  },

  // ── Movimientos ──────────────────────────────────────────────────────────

  getMovimientos: async (params = {}) => {
    const res = await api.get('/inventario/movimientos/', { params });
    return res.data;
  },

  getMovimientosPorProducto: async (productoId, params = {}) => {
    const res = await api.get('/inventario/movimientos/por_producto/', {
      params: { producto: productoId, ...params },
    });
    return res.data;
  },

  registrarMovimiento: async (data) => {
    const res = await api.post('/inventario/movimientos/', data);
    return res.data;
  },
};

export default inventarioService;
