// frontend/src/services/produccionService.js

import api from './api';

const produccionService = {
  // ── Matas Caídas ──────────────────────────────────────────────────────────

  getMatasCaidas: async (params = {}) => {
    const res = await api.get('/produccion/matas-caidas/', { params });
    return res.data;
  },

  createMataCaida: async (data) => {
    const res = await api.post('/produccion/matas-caidas/', data);
    return res.data;
  },

  updateMataCaida: async (id, data) => {
    const res = await api.patch(`/produccion/matas-caidas/${id}/`, data);
    return res.data;
  },

  deleteMataCaida: async (id) => {
    await api.delete(`/produccion/matas-caidas/${id}/`);
  },

  // ── Embarques ─────────────────────────────────────────────────────────────

  getEmbarques: async (params = {}) => {
    const res = await api.get('/produccion/embarques/', { params });
    return res.data;
  },

  createEmbarque: async (data) => {
    const res = await api.post('/produccion/embarques/', data);
    return res.data;
  },

  updateEmbarque: async (id, data) => {
    const res = await api.patch(`/produccion/embarques/${id}/`, data);
    return res.data;
  },

  deleteEmbarque: async (id) => {
    await api.delete(`/produccion/embarques/${id}/`);
  },

  getRatioFinca: async (fincaId, loteId = null) => {
    const params = { finca: fincaId };
    if (loteId) params.lote = loteId;
    const res = await api.get('/produccion/embarques/ratio-finca/', { params });
    return res.data;
  },

  getTendencia: async (fincaId, loteId = null, n = 12) => {
    const params = { finca: fincaId, n };
    if (loteId) params.lote = loteId;
    const res = await api.get('/produccion/embarques/tendencia/', { params });
    return res.data;
  },

  getValidacionEmbarque: async (embarqueId, params = {}) => {
    const res = await api.get(`/produccion/embarques/${embarqueId}/validacion/`, { params });
    return res.data;
  },
};

export default produccionService;
