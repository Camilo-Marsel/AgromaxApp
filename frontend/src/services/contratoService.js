// frontend/src/services/contratoService.js

import api from './api';

const contratoService = {
  // Listar contratos con filtros
  getAll: async (params = {}) => {
    const response = await api.get('/contratos/', { params });
    return response.data;
  },

  // Obtener un contrato por ID
  getById: async (id) => {
    const response = await api.get(`/contratos/${id}/`);
    return response.data;
  },

  // Crear contrato
  create: async (data) => {
    const response = await api.post('/contratos/', data);
    return response.data;
  },

  // Actualizar contrato
  update: async (id, data) => {
    const response = await api.put(`/contratos/${id}/`, data);
    return response.data;
  },

  // Actualización parcial
  partialUpdate: async (id, data) => {
    const response = await api.patch(`/contratos/${id}/`, data);
    return response.data;
  },

  // Eliminar contrato
  delete: async (id) => {
    const response = await api.delete(`/contratos/${id}/`);
    return response.data;
  },

  // Estadísticas de contratos
  getEstadisticas: async () => {
    const response = await api.get('/contratos/estadisticas/');
    return response.data;
  },

  // Finalizar contrato
  finalizar: async (id, data) => {
    const response = await api.post(`/contratos/${id}/finalizar/`, data);
    return response.data;
  },

  // Liquidar contrato
  liquidar: async (id, data) => {
    const response = await api.post(`/contratos/${id}/liquidar/`, data);
    return response.data;
  },

  // Cancelar contrato
  cancelar: async (id, data) => {
    const response = await api.post(`/contratos/${id}/cancelar/`, data);
    return response.data;
  },

  // Reactivar contrato
  reactivar: async (id, data) => {
    const response = await api.post(`/contratos/${id}/reactivar/`, data);
    return response.data;
  },

  // Obtener historial de cambios
  getHistorial: async (id) => {
    const response = await api.get(`/contratos/${id}/historial/`);
    return response.data;
  },

  // Obtener nóminas asociadas al contrato
  getNominas: async (id, params = {}) => {
    const response = await api.get(`/contratos/${id}/nominas/`, { params });
    return response.data;
  },

  // Generar PDF del contrato (abre en nueva pestaña)
  generarPdf: async (id) => {
    const response = await api.get(`/contratos/${id}/generar_pdf/`, {
      responseType: 'blob',
    });
    // Crear URL del blob y abrir en nueva pestaña
    const blob = new Blob([response.data], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    window.open(url, '_blank');
    return url;
  },

  // Descargar PDF del contrato
  descargarPdf: async (id, numeroContrato) => {
    const response = await api.get(`/contratos/${id}/descargar_pdf/`, {
      responseType: 'blob',
    });
    // Crear enlace de descarga
    const blob = new Blob([response.data], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `contrato_${numeroContrato || id}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  },

  // Obtener alertas de contratos (por vencer y vencidos)
  getAlertas: async () => {
    const response = await api.get('/contratos/alertas/');
    return response.data;
  },
};

// Servicio para documentos de contrato
export const documentoContratoService = {
  // Listar documentos de un contrato
  getByContrato: async (contratoId, params = {}) => {
    const response = await api.get('/documentos-contrato/', {
      params: { ...params, contrato: contratoId },
    });
    return response.data;
  },

  // Obtener un documento por ID
  getById: async (id) => {
    const response = await api.get(`/documentos-contrato/${id}/`);
    return response.data;
  },

  // Subir documento
  upload: async (data) => {
    const formData = new FormData();
    Object.keys(data).forEach((key) => {
      formData.append(key, data[key]);
    });

    const response = await api.post('/documentos-contrato/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Eliminar documento
  delete: async (id) => {
    const response = await api.delete(`/documentos-contrato/${id}/`);
    return response.data;
  },

  // Descargar documento
  download: async (id) => {
    const response = await api.get(`/documentos-contrato/${id}/`, {
      responseType: 'blob',
    });
    return response.data;
  },
};

export default contratoService;
