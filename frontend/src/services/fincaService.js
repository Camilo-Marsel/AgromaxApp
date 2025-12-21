// frontend/src/services/fincaService.js

import api from './api';

const fincaService = {
  // Listar fincas
  getAll: async (params = {}) => {
    const response = await api.get('/fincas/', { params });
    return response.data;
  },

  // Obtener una finca por ID
  getById: async (id) => {
    const response = await api.get(`/fincas/${id}/`);
    return response.data;
  },

  // Crear finca
  create: async (data) => {
    const response = await api.post('/fincas/', data);
    return response.data;
  },

  // Actualizar finca
  update: async (id, data) => {
    const response = await api.put(`/fincas/${id}/`, data);
    return response.data;
  },

  // AGREGAR ESTE MÉTODO:
  // Eliminar finca
  delete: async (id) => {
    const response = await api.delete(`/fincas/${id}/`);
    return response.data;
  },

  // Obtener trabajadores de una finca
  getTrabajadores: async (id) => {
    const response = await api.get(`/fincas/${id}/trabajadores/`);
    return response.data;
  },
};

export default fincaService;