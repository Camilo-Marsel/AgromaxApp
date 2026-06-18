// frontend/src/services/trabajadorService.js

import api from './api';

const trabajadorService = {
  // Listar trabajadores con filtros
  getAll: async (params = {}) => {
    const response = await api.get('/trabajadores/', { params });
    return response.data;
  },
  // Obtener todos los trabajadores sin paginación (para selects en formularios)
  getAllSimple: async (params = {}) => {
    const response = await api.get('/trabajadores/lista-simple/', { params });
    return response.data;
  },

  // Obtener un trabajador por ID
  getById: async (id) => {
    const response = await api.get(`/trabajadores/${id}/`);
    return response.data;
  },

  // Crear trabajador
  create: async (data) => {
    const response = await api.post('/trabajadores/', data);
    return response.data;
  },

  // Actualizar trabajador
  update: async (id, data) => {
    const response = await api.put(`/trabajadores/${id}/`, data);
    return response.data;
  },

  // Actualización parcial
  partialUpdate: async (id, data) => {
    const response = await api.patch(`/trabajadores/${id}/`, data);
    return response.data;
  },

  // Eliminar trabajador
  delete: async (id) => {
    const response = await api.delete(`/trabajadores/${id}/`);
    return response.data;
  },

  // Retirar trabajador (requiere motivo_retiro)
  retirar: async (id, data) => {
    const response = await api.post(`/trabajadores/${id}/retirar/`, data);
    return response.data;
  },

  // Reactivar trabajador retirado (vuelve a SIN_CONTRATO)
  reactivar: async (id) => {
    const response = await api.post(`/trabajadores/${id}/reactivar/`);
    return response.data;
  },

  // Obtener tipos de contrato
  getTiposContrato: async () => {
    const response = await api.get('/tipos-contrato/');
    return response.data;
  },

  // Calcular liquidación de contrato
  getLiquidacion: async (id, fechaRetiro) => {
    const response = await api.get(`/trabajadores/${id}/liquidacion/`, {
      params: { fecha_retiro: fechaRetiro },
    });
    return response.data;
  },

  // Descargar PDF de liquidación
  descargarLiquidacionPDF: async (id, fechaRetiro) => {
    const response = await api.get(`/trabajadores/${id}/liquidacion/`, {
      params: { fecha_retiro: fechaRetiro, pdf: 'true' },
      responseType: 'blob',
    });
    return response.data;
  },
};

export default trabajadorService;