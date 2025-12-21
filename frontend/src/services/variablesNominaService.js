import api from './api';

const variablesNominaService = {
  // Listar todas las variables
  getAll: async (params = {}) => {
    const response = await api.get('/variables-nomina/', { params });
    return response.data;
  },

  // Obtener variables vigentes
  getVigentes: async () => {
    const response = await api.get('/variables-nomina/vigentes/');
    return response.data;
  },

  // Obtener variable por ID
  getById: async (id) => {
    const response = await api.get(`/variables-nomina/${id}/`);
    return response.data;
  },

  // Actualizar variable (crea nueva versión)
  actualizar: async (data) => {
    const response = await api.post('/variables-nomina/actualizar_variable/', data);
    return response.data;
  },

  // Obtener historial de una variable
  getHistorial: async (nombre) => {
    const response = await api.get('/variables-nomina/', {
      params: { nombre }
    });
    return response.data;
  },
};

export default variablesNominaService;
