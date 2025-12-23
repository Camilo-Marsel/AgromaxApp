// frontend/src/services/api.js

import axios from 'axios';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

// ============================================================================
// COLD START DETECTION (Para Render Free Tier)
// ============================================================================
let isFirstRequest = true;
let coldStartToastId = null;
let coldStartTimer = null;

const showColdStartMessage = () => {
  coldStartToastId = toast.loading(
    '⏳ Activando servidor...\nEsto puede tomar 20-30 segundos la primera vez.\nPor favor no recargues la página.',
    {
      duration: Infinity,
      style: {
        background: '#3B82F6',
        color: '#fff',
        padding: '16px',
        borderRadius: '8px',
      },
    }
  );
};

const hideColdStartMessage = () => {
  if (coldStartToastId) {
    toast.dismiss(coldStartToastId);
    coldStartToastId = null;
  }
  if (coldStartTimer) {
    clearTimeout(coldStartTimer);
    coldStartTimer = null;
  }
};

// ============================================================================
// CREAR INSTANCIA DE AXIOS
// ============================================================================
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
  timeout: 60000, // 60 segundos para cold start
});

// ============================================================================
// INTERCEPTOR REQUEST - Detectar Cold Start
// ============================================================================
api.interceptors.request.use(
  (config) => {
    // Agregar token
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Detectar posible cold start solo en la primera request
    if (isFirstRequest) {
      // Mostrar mensaje después de 2 segundos si no hay respuesta
      coldStartTimer = setTimeout(() => {
        showColdStartMessage();
      }, 2000);
      
      isFirstRequest = false;
    }

    return config;
  },
  (error) => {
    hideColdStartMessage();
    return Promise.reject(error);
  }
);

// ============================================================================
// INTERCEPTOR RESPONSE - Limpiar mensajes y manejar errores
// ============================================================================
api.interceptors.response.use(
  (response) => {
    // Ocultar mensaje de cold start cuando llegue la primera respuesta
    hideColdStartMessage();
    
    return response;
  },
  async (error) => {
    // Ocultar mensaje de cold start en caso de error
    hideColdStartMessage();

    const originalRequest = error.config;

    // Manejar timeout específicamente
    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      toast.error('El servidor tardó demasiado en responder. Por favor intenta de nuevo.', {
        duration: 5000,
      });
      return Promise.reject(error);
    }

    // Si el token expiró, intentar refrescarlo
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refresh_token');
        const response = await axios.post(`${API_URL}/auth/refresh/`, {
          refresh: refreshToken,
        });

        const { access } = response.data;
        localStorage.setItem('access_token', access);

        // Reintentar request original con nuevo token
        originalRequest.headers.Authorization = `Bearer ${access}`;
        return api(originalRequest);
      } catch (refreshError) {
        // Si falla el refresh, logout
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;

// ============================================================================
// SERVICIOS DE AUTENTICACIÓN
// ============================================================================

export const authService = {
  login: async (username, password) => {
    const response = await axios.post(`${API_URL}/auth/login/`, {
      username,
      password,
    });
    return response.data;
  },

  logout: () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  },

  getCurrentUser: async () => {
    const response = await api.get('/auth/me/');
    return response.data;
  }
};

// ============================================================================
// SERVICIOS GENERALES
// ============================================================================

export const healthCheck = async () => {
  const response = await api.get('/health/');
  return response.data;
};