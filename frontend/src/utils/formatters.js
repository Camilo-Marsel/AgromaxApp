// frontend/src/utils/formatters.js

/**
 * Formatea una fecha para mostrar en formato largo (ej: "2 de enero de 2025")
 * Evita el desfase de zona horaria agregando T12:00:00
 */
export const formatDate = (dateString) => {
  if (!dateString) return '';
  // Las fechas ISO sin hora se interpretan como UTC y se desfasan al convertir a hora local
  // Agregamos T12:00:00 para evitar el desfase
  const dateStr = dateString.includes('T') ? dateString : `${dateString}T12:00:00`;
  return new Date(dateStr).toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

/**
 * Formatea una fecha en formato corto (ej: "2 ene 2025")
 */
export const formatDateShort = (dateString) => {
  if (!dateString) return '';
  const dateStr = dateString.includes('T') ? dateString : `${dateString}T12:00:00`;
  return new Date(dateStr).toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

/**
 * Formatea una fecha y hora (ej: "2 ene 2025, 10:30")
 */
export const formatDateTime = (dateString) => {
  if (!dateString) return '';
  return new Date(dateString).toLocaleString('es-CO', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

/**
 * Formatea un valor monetario en pesos colombianos
 */
export const formatMoney = (value) => {
  if (value === null || value === undefined) return '$0';
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(value);
};

/**
 * Formatea un número con separadores de miles
 */
export const formatNumber = (value) => {
  if (value === null || value === undefined) return '0';
  return new Intl.NumberFormat('es-CO').format(value);
};

/**
 * Formatea un porcentaje
 */
export const formatPercent = (value, decimals = 0) => {
  if (value === null || value === undefined) return '0%';
  return `${Number(value).toFixed(decimals)}%`;
};
