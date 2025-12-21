// frontend/src/services/registroLaborService.js

import api from './api';

const registroLaborService = {
  // Listar registros
  getAll: async (params = {}) => {
    const response = await api.get('/registros-labor/', { params });
    return response.data;
  },

  // Obtener por ID
  getById: async (id) => {
    const response = await api.get(`/registros-labor/${id}/`);
    return response.data;
  },

  // Crear registro simple (para labores por UNIDAD/HECTÁREA/METRO)
  create: async (data) => {
    const response = await api.post('/registros-labor/', data);
    return response.data;
  },

  // NUEVO: Crear múltiples registros (para labores tipo DÍA)
  crearMultiples: async (data) => {
    const response = await api.post('/registros-labor/crear_multiples/', data);
    return response.data;
  },

  // Actualizar registro
  update: async (id, data) => {
    const response = await api.put(`/registros-labor/${id}/`, data);
    return response.data;
  },

  // Eliminar registro
  delete: async (id) => {
    const response = await api.delete(`/registros-labor/${id}/`);
    return response.data;
  },

  // Obtener registros por trabajador y quincena
  getByTrabajadorQuincena: async (trabajadorId, quincenaId) => {
    const response = await api.get('/registros-labor/', {
      params: {
        trabajador: trabajadorId,
        quincena: quincenaId,
      },
    });
    return response.data;
  },
};

export default registroLaborService;