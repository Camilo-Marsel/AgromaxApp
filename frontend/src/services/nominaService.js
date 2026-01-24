// frontend/src/services/nominaService.js

import api from './api';

const nominaService = {
  // Listar nóminas
  getAll: async (params = {}) => {
    const response = await api.get('/nominas/', { params });
    return response.data;
  },

  // Obtener una nómina por ID
  getById: async (id) => {
    const response = await api.get(`/nominas/${id}/`);
    return response.data;
  },

  // Actualizar ajustes manuales
  actualizarAjustes: async (nominaId, data) => {
    const response = await api.patch(`/nominas/${nominaId}/`, data);
    return response.data;
  },


  // Calcular nómina para toda la quincena
  calcularQuincena: async (quincenaId) => {
    const response = await api.post('/nominas/calcular_quincena/', {
      quincena_id: quincenaId,
    });
    return response.data;
  },

  // Recalcular nómina de un trabajador
  recalcular: async (nominaId) => {
    const response = await api.post(`/nominas/${nominaId}/recalcular/`);
    return response.data;
  },

  // Aprobar nómina
  aprobar: async (id) => {
    const response = await api.post(`/nominas/${id}/aprobar/`);
    return response.data;
  },

  // Rechazar nómina
  rechazar: async (id, motivo = '') => {
    const response = await api.post(`/nominas/${id}/rechazar/`, { motivo });
    return response.data;
  },

  // Marcar como pagada
  marcarPagada: async (id) => {
    const response = await api.post(`/nominas/${id}/marcar_pagada/`);
    return response.data;
  },

  descargarPDF: async (nominaId) => {
    const response = await api.get(`/nominas/${nominaId}/descargar_pdf/`, {
        responseType: 'blob', // IMPORTANTE: para archivos binarios
    });
    return response.data;
  },

  // Exportar lista de pagos a Excel
  exportarExcelQuincena: async (quincenaId, fincaId = '') => {
  const params = { quincena: quincenaId };
  if (fincaId) {
    params.finca = fincaId;
  }
  
  const response = await api.get('/nominas/exportar_excel_quincena/', {
    params,
    responseType: 'blob',
  });
    
    // Crear URL y descargar
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    
    // Extraer nombre del archivo de los headers si está disponible
    const contentDisposition = response.headers['content-disposition'] || response.headers['Content-Disposition'];
    let filename = `Lista_Pagos_Quincena.xlsx`;

    if (contentDisposition) {
      // Try filename="name"
      let filenameMatch = contentDisposition.match(/filename="(.+)"/);
      if (filenameMatch && filenameMatch[1]) {
        filename = filenameMatch[1];
      } else {
        // Try RFC5987 filename*=UTF-8''name.ext
        filenameMatch = contentDisposition.match(/filename\*=UTF-8''(.+)$/i);
        if (filenameMatch && filenameMatch[1]) {
          try {
            filename = decodeURIComponent(filenameMatch[1]);
          } catch (e) {
            filename = filenameMatch[1];
          }
        }
      }
    }
    
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
    
    return response;
  },

  // Aprobar masivo
  aprobarMasivo: async (quincenaId, fincaId = null) => {
    const response = await api.post('/nominas/aprobar_masivo/', {
      quincena_id: quincenaId,
      finca_id: fincaId,
    });
    return response.data;
  },

  // Rechazar masivo
  rechazarMasivo: async (quincenaId, fincaId = null, motivo = '') => {
    const response = await api.post('/nominas/rechazar_masivo/', {
      quincena_id: quincenaId,
      finca_id: fincaId,
      motivo,
    });
    return response.data;
  },

  // Marcar pagadas masivo
  marcarPagadasMasivo: async (quincenaId, fincaId = null) => {
    const response = await api.post('/nominas/marcar_pagadas_masivo/', {
      quincena_id: quincenaId,
      finca_id: fincaId,
    });
    return response.data;
  },

  // Descargar colillas consolidadas (PDF con todas las colillas)
  descargarColillasConsolidadas: async (params) => {
    const response = await api.get('/nominas/descargar_colillas_consolidadas/', {
      params,
      responseType: 'blob',
    });
    return response.data;
  },

  // Enviar recibo por correo electrónico a un trabajador
  enviarRecibo: async (nominaId) => {
    const response = await api.post(`/nominas/${nominaId}/enviar_recibo/`);
    return response.data;
  },

  // Enviar recibos masivos por correo electrónico
  enviarRecibosMasivo: async (quincenaId, fincaId = null, estados = ['PAGADA']) => {
    const response = await api.post('/nominas/enviar_recibos_masivo/', {
      quincena_id: quincenaId,
      finca_id: fincaId,
      estados,
    });
    return response.data;
  },

};

export default nominaService;