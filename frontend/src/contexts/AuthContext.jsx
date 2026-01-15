// frontend/src/contexts/AuthContext.jsx

import { createContext, useState, useEffect } from 'react';
import { authService } from '../services/api';
import { ROLES } from '../constants/roles';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const initializeAuth = async () => {
      const token = localStorage.getItem('access_token');

      if (token) {
        try {
          const userInfo = await authService.getCurrentUser();
          if (isMounted) {
            setUser(userInfo);
          }
        } catch {
          // Si falla, limpiar tokens
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
        }
      }

      if (isMounted) {
        setLoading(false);
      }
    };

    initializeAuth();

    return () => {
      isMounted = false;
    };
  }, []);

  const login = async (username, password) => {
    try {
      const data = await authService.login(username, password);
      localStorage.setItem('access_token', data.access);
      localStorage.setItem('refresh_token', data.refresh);

      // Cargar información completa del usuario
      const userInfo = await authService.getCurrentUser();
      setUser(userInfo);

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.detail || 'Error al iniciar sesión',
      };
    }
  };

  const logout = () => {
    authService.logout();
    setUser(null);
  };

  // Helpers para verificar roles
  const isAdmin = () => user?.rol?.nombre === ROLES.ADMINISTRADOR;
  const isSupervisor = () => user?.rol?.nombre === ROLES.SUPERVISOR;
  const isConsulta = () => user?.rol?.nombre === ROLES.CONSULTA;

  // Verificar si puede modificar datos (ADMINISTRADOR o SUPERVISOR)
  const canModify = () => isAdmin() || isSupervisor();

  // Verificar si puede ver el menú de usuarios (solo ADMINISTRADOR)
  const canManageUsers = () => isAdmin();

  const value = {
    user,
    loading,
    login,
    logout,
    isAuthenticated: !!user,
    // Helpers de roles
    isAdmin,
    isSupervisor,
    isConsulta,
    canModify,
    canManageUsers,
    ROLES,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};