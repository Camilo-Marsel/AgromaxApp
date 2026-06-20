// frontend/src/services/liquidacionService.js

import api from './api';

const liquidacionService = {
  getAll: async (params = {}) => {
    const response = await api.get('/liquidaciones/', { params });
    return response.data;
  },

  getById: async (id) => {
    const response = await api.get(`/liquidaciones/${id}/`);
    return response.data;
  },

  create: async (data) => {
    const response = await api.post('/liquidaciones/', data);
    return response.data;
  },

  aprobar: async (id) => {
    const response = await api.post(`/liquidaciones/${id}/aprobar/`);
    return response.data;
  },

  revertir: async (id) => {
    const response = await api.post(`/liquidaciones/${id}/revertir/`);
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/liquidaciones/${id}/`);
    return response.data;
  },
};

export default liquidacionService;
