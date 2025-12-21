// frontend/src/services/loteService.js

import api from './api';

const loteService = {
  // Listar lotes
  getAll: async (params = {}) => {
    const response = await api.get('/lotes/', { params });
    return response.data;
  },

  // Obtener lotes por finca
  getByFinca: async (fincaId) => {
    const response = await api.get('/lotes/', {
      params: { finca: fincaId }
    });
    return response.data;
  },

  // Obtener un lote por ID
  getById: async (id) => {
    const response = await api.get(`/lotes/${id}/`);
    return response.data;
  },

  // Crear lote
  create: async (data) => {
    const response = await api.post('/lotes/', data);
    return response.data;
  },

  // Actualizar lote
  update: async (id, data) => {
    const response = await api.put(`/lotes/${id}/`, data);
    return response.data;
  },

  // AGREGAR ESTE MÉTODO:
  // Eliminar lote
  delete: async (id) => {
    const response = await api.delete(`/lotes/${id}/`);
    return response.data;
  },
};

export default loteService;