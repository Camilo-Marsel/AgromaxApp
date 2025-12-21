// frontend/src/services/tipoContratoService.js

import api from './api';

const tipoContratoService = {
  // Listar tipos de contrato
  getAll: async (params = {}) => {
    const response = await api.get('/tipos-contrato/', { params });
    return response.data;
  },

  // Obtener tipo de contrato por ID
  getById: async (id) => {
    const response = await api.get(`/tipos-contrato/${id}/`);
    return response.data;
  },

  // Crear tipo de contrato
  create: async (data) => {
    const response = await api.post('/tipos-contrato/', data);
    return response.data;
  },

  // Actualizar tipo de contrato
  update: async (id, data) => {
    const response = await api.put(`/tipos-contrato/${id}/`, data);
    return response.data;
  },

  // Eliminar tipo de contrato
  delete: async (id) => {
    const response = await api.delete(`/tipos-contrato/${id}/`);
    return response.data;
  },
};

export default tipoContratoService;