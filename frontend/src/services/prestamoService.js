// frontend/src/services/prestamoService.js

import api from './api';

const prestamoService = {
  // Listar préstamos
  getAll: async (params = {}) => {
    const response = await api.get('/prestamos/', { params });
    return response.data;
  },

  // Obtener préstamo por ID
  getById: async (id) => {
    const response = await api.get(`/prestamos/${id}/`);
    return response.data;
  },

  // Crear préstamo
  create: async (data) => {
    const response = await api.post('/prestamos/', data);
    return response.data;
  },

  // Actualizar préstamo
  update: async (id, data) => {
    const response = await api.put(`/prestamos/${id}/`, data);
    return response.data;
  },

  // Cancelar préstamo
  cancelar: async (id) => {
    const response = await api.post(`/prestamos/${id}/cancelar/`);
    return response.data;
  },

  // Descargar autorización PDF
  descargarAutorizacion: async (id) => {
    const response = await api.get(`/prestamos/${id}/generar_autorizacion/`, {
      responseType: 'blob',
    });
    return response.data;
  },

  // Descargar paz y salvo PDF
  descargarPazYSalvo: async (id) => {
    const response = await api.get(`/prestamos/${id}/generar_paz_y_salvo/`, {
      responseType: 'blob',
    });
    return response.data;
  },
};

export default prestamoService;