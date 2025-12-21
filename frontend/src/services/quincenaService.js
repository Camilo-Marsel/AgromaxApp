// frontend/src/services/quincenaService.js

import api from './api';

const quincenaService = {
  // Listar quincenas
  getAll: async (params = {}) => {
    const response = await api.get('/quincenas/', { params });
    return response.data;
  },

  // Obtener una quincena por ID
  getById: async (id) => {
    const response = await api.get(`/quincenas/${id}/`);
    return response.data;
  },

  // Crear quincena actual
  crearActual: async () => {
    const response = await api.post('/quincenas/crear_actual/');
    return response.data;
  },

  // Crear quincena manualmente
  create: async (data) => {
    const response = await api.post('/quincenas/', data);
    return response.data;
  },

  // Actualizar quincena
  update: async (id, data) => {
    const response = await api.put(`/quincenas/${id}/`, data);
    return response.data;
  },

  // Cerrar quincena
  cerrar: async (id) => {
    const response = await api.post(`/quincenas/${id}/cerrar/`);
    return response.data;
  },

  // Obtener estadísticas
  getEstadisticas: async (id) => {
    const response = await api.get(`/quincenas/${id}/estadisticas/`);
    return response.data;
  },
};

export default quincenaService;