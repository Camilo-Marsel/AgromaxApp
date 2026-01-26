// frontend/src/services/prestacionesService.js

import api from './api';

const prestacionesService = {
  // Listar todos los resúmenes de prestaciones
  getAll: async (params = {}) => {
    const response = await api.get('/prestaciones/', { params });
    return response.data;
  },

  // Obtener un resumen por ID (con provisiones individuales)
  getById: async (id) => {
    const response = await api.get(`/prestaciones/${id}/`);
    return response.data;
  },

  // Calcular prestaciones para un mes específico
  calcular: async (mes, año) => {
    const response = await api.post('/prestaciones/calcular/', { mes, año });
    return response.data;
  },

  // Obtener acumulado del año
  getAcumuladoAño: async (año) => {
    const response = await api.get('/prestaciones/acumulado_año/', {
      params: { año },
    });
    return response.data;
  },

  // Obtener provisiones por trabajador
  getPorTrabajador: async (año, trabajadorId = null) => {
    const params = { año };
    if (trabajadorId) {
      params.trabajador = trabajadorId;
    }
    const response = await api.get('/prestaciones/por_trabajador/', { params });
    return response.data;
  },

  // Eliminar resumen de prestaciones
  delete: async (id) => {
    const response = await api.delete(`/prestaciones/${id}/`);
    return response.data;
  },
};

export default prestacionesService;
