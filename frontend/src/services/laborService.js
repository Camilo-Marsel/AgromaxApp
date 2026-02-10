// frontend/src/services/laborService.js

import api from './api';

const laborService = {
  // Listar labores
  getAll: async (params = {}) => {
    const response = await api.get('/labores/', { params });
    return response.data;
  },

  // Obtener labor por ID
  getById: async (id) => {
    const response = await api.get(`/labores/${id}/`);
    return response.data;
  },

  // Crear labor
  create: async (data) => {
    const response = await api.post('/labores/', data);
    return response.data;
  },

  // Actualizar labor
  update: async (id, data) => {
    const response = await api.put(`/labores/${id}/`, data);
    return response.data;
  },

  // Eliminar labor
  delete: async (id) => {
    const response = await api.delete(`/labores/${id}/`);
    return response.data;
  },

  // Obtener unidades de medida
  getUnidadesMedida: async () => {
    const response = await api.get('/unidades-medida/');
    return response.data;
  },

  // Exportar labores a Excel
  exportarExcel: async () => {
    const response = await api.get('/labores/exportar-excel/', {
      responseType: 'blob' // Importante para descargar archivos
    });
    return response;
  },
};

export default laborService;