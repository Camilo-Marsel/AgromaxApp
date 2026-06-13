// frontend/src/services/laborInsumoService.js

import api from './api';

const laborInsumoService = {
  getAll: async (params = {}) => {
    const response = await api.get('/labor-insumos/', { params });
    return response.data;
  },

  getById: async (id) => {
    const response = await api.get(`/labor-insumos/${id}/`);
    return response.data;
  },

  getByLabor: async (laborId) => {
    const response = await api.get('/labor-insumos/', { params: { labor: laborId } });
    return response.data;
  },

  create: async (data) => {
    const response = await api.post('/labor-insumos/', data);
    return response.data;
  },

  update: async (id, data) => {
    const response = await api.put(`/labor-insumos/${id}/`, data);
    return response.data;
  },

  delete: async (id) => {
    await api.delete(`/labor-insumos/${id}/`);
  },
};

export default laborInsumoService;
