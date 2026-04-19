// frontend/src/contexts/AuthContext.jsx

import { createContext, useState, useEffect, useMemo } from 'react';
import { authService, setAccessToken, clearAccessToken } from '../services/api';
import { ROLES } from '../constants/roles';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const initializeAuth = async () => {
      try {
        // Intenta recuperar el access token usando la cookie httpOnly de refresh.
        // Si la cookie no existe o expiró, lanza 401 y el usuario queda sin sesión.
        const token = await authService.refreshToken();
        setAccessToken(token);
        const userInfo = await authService.getCurrentUser();
        if (isMounted) setUser(userInfo);
      } catch {
        clearAccessToken();
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    initializeAuth();
    return () => { isMounted = false; };
  }, []);

  const login = async (username, password) => {
    try {
      const data = await authService.login(username, password);
      setAccessToken(data.access);
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

  const logout = async () => {
    await authService.logout();
    setUser(null);
  };

  const isAdmin = () => user?.rol?.nombre === ROLES.ADMINISTRADOR;
  const isSupervisor = () => user?.rol?.nombre === ROLES.SUPERVISOR;
  const isConsulta = () => user?.rol?.nombre === ROLES.CONSULTA;
  const canModify = () => isAdmin() || isSupervisor();
  const canManageUsers = () => isAdmin();

  const value = useMemo(() => ({
    user,
    loading,
    login,
    logout,
    isAuthenticated: !!user,
    isAdmin,
    isSupervisor,
    isConsulta,
    canModify,
    canManageUsers,
    ROLES,
  }), [user, loading]); // eslint-disable-line react-hooks/exhaustive-deps

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
