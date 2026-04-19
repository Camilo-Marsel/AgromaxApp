// frontend/src/services/api.js

import axios from 'axios';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

// ============================================================================
// TOKEN EN MEMORIA (nunca en localStorage — no accesible desde JS externo)
// ============================================================================
let _accessToken = null;

export const setAccessToken = (token) => { _accessToken = token; };
export const clearAccessToken = () => { _accessToken = null; };

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
  withCredentials: true, // necesario para enviar la cookie de refresh
  timeout: 60000,
});

// ============================================================================
// INTERCEPTOR REQUEST
// ============================================================================
api.interceptors.request.use(
  (config) => {
    if (_accessToken) {
      config.headers.Authorization = `Bearer ${_accessToken}`;
    }

    if (isFirstRequest) {
      coldStartTimer = setTimeout(showColdStartMessage, 2000);
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
// INTERCEPTOR RESPONSE — refresh silencioso cuando expira el access token
// ============================================================================
let _refreshPromise = null;

api.interceptors.response.use(
  (response) => {
    hideColdStartMessage();
    return response;
  },
  async (error) => {
    hideColdStartMessage();

    const originalRequest = error.config;

    if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      toast.error('El servidor tardó demasiado en responder. Por favor intenta de nuevo.', {
        duration: 5000,
      });
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      // Si ya hay un refresh en curso, esperar el mismo en vez de lanzar otro
      if (!_refreshPromise) {
        _refreshPromise = axios
          .post(`${API_URL}/auth/refresh/`, {}, { withCredentials: true })
          .then((res) => {
            setAccessToken(res.data.access);
            return res.data.access;
          })
          .catch((err) => {
            clearAccessToken();
            globalThis.location.href = '/login';
            throw err;
          })
          .finally(() => {
            _refreshPromise = null;
          });
      }

      try {
        const newToken = await _refreshPromise;
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch {
        return Promise.reject(error);
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
    // La cookie de refresh la setea el backend automáticamente
    const response = await axios.post(
      `${API_URL}/auth/login/`,
      { username, password },
      { withCredentials: true }
    );
    return response.data; // solo contiene { access }
  },

  refreshToken: async () => {
    // La cookie se envía automáticamente gracias a withCredentials
    const response = await axios.post(
      `${API_URL}/auth/refresh/`,
      {},
      { withCredentials: true }
    );
    return response.data.access;
  },

  logout: async () => {
    clearAccessToken();
    try {
      await axios.post(`${API_URL}/auth/logout/`, {}, { withCredentials: true });
    } catch {
      // Si falla el logout en el servidor igual limpiamos el estado local
    }
  },

  getCurrentUser: async () => {
    const response = await api.get('/auth/me/');
    return response.data;
  },
};

// ============================================================================
// SERVICIOS GENERALES
// ============================================================================

export const healthCheck = async () => {
  const response = await api.get('/health/');
  return response.data;
};
