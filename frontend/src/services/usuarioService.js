// frontend/src/services/usuarioService.js

import api from './api';

const usuarioService = {
  // Listar usuarios
  getAll: async (params = {}) => {
    const response = await api.get('/usuarios/', { params });
    return response.data;
  },

  // Obtener un usuario por ID
  getById: async (id) => {
    const response = await api.get(`/usuarios/${id}/`);
    return response.data;
  },

  // Crear usuario
  create: async (data) => {
    const response = await api.post('/usuarios/', data);
    return response.data;
  },

  // Actualizar usuario
  update: async (id, data) => {
    const response = await api.patch(`/usuarios/${id}/`, data);
    return response.data;
  },

  // Eliminar usuario
  delete: async (id) => {
    const response = await api.delete(`/usuarios/${id}/`);
    return response.data;
  },

  // Obtener roles disponibles
  getRoles: async () => {
    const response = await api.get('/roles/');
    return response.data;
  },
};

export default usuarioService;
