// frontend/src/services/precioService.js

import api from './api';

const precioService = {
  // Listar precios
  getAll: async (params = {}) => {
    const response = await api.get('/lista-precios/', { params });
    return response.data;
  },

  // Obtener precio por ID
  getById: async (id) => {
    const response = await api.get(`/lista-precios/${id}/`);
    return response.data;
  },

  // Crear precio
  create: async (data) => {
    const response = await api.post('/lista-precios/', data);
    return response.data;
  },

  // Actualizar precio
  update: async (id, data) => {
    const response = await api.put(`/lista-precios/${id}/`, data);
    return response.data;
  },

  // Eliminar precio
  delete: async (id) => {
    const response = await api.delete(`/lista-precios/${id}/`);
    return response.data;
  },

  // Obtener precios de una labor
  getByLabor: async (laborId) => {
    const response = await api.get('/lista-precios/', {
      params: { labor: laborId }
    });
    return response.data;
  },
};

export default precioService;