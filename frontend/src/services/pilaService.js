// frontend/src/services/pilaService.js

import api from './api';

const pilaService = {
  // Listar todas las PILA
  getAll: async (params = {}) => {
    const response = await api.get('/pila/', { params });
    return response.data;
  },

  // Obtener una PILA por ID
  getById: async (id) => {
    const response = await api.get(`/pila/${id}/`);
    return response.data;
  },

  // Calcular PILA (mensual o quincenal, con filtro de fincas opcional)
  calcular: async (params) => {
    const response = await api.post('/pila/calcular/', params);
    return response.data;
  },

  // Marcar PILA como pagada
  marcarPagada: async (id, data) => {
    const response = await api.post(`/pila/${id}/marcar_pagada/`, data);
    return response.data;
  },

  // Obtener resumen de PILA (pendientes y porcentajes)
  getResumen: async () => {
    const response = await api.get('/pila/resumen/');
    return response.data;
  },

  // Exportar PILA a Excel (con filtro de fincas opcional)
  exportarExcel: async (id, fincas = []) => {
    const params = {};
    if (fincas.length > 0) {
      params.fincas = fincas.join(',');
    }
    const response = await api.get(`/pila/${id}/exportar_excel/`, {
      params,
      responseType: 'blob',
    });
    return response.data;
  },

  // Eliminar PILA
  delete: async (id) => {
    const response = await api.delete(`/pila/${id}/`);
    return response.data;
  },
};

export default pilaService;
