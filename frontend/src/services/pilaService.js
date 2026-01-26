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

  // Calcular PILA para un mes específico
  calcular: async (mes, año) => {
    const response = await api.post('/pila/calcular/', { mes, año });
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

  // Eliminar PILA
  delete: async (id) => {
    const response = await api.delete(`/pila/${id}/`);
    return response.data;
  },
};

export default pilaService;
