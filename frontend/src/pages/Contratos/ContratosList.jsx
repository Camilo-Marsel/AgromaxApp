// frontend/src/pages/Contratos/ContratosList.jsx

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import contratoService from '../../services/contratoService';
import LoadingSpinner from '../../components/Common/LoadingSpinner';
import SearchBar from '../../components/Common/SearchBar';
import toast from 'react-hot-toast';
import {
  FileText,
  Plus,
  Eye,
  Edit,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp,
  Users,
  FileCheck
} from 'lucide-react';

export default function ContratosList() {
  const navigate = useNavigate();
  const [contratos, setContratos] = useState([]);
  const [estadisticas, setEstadisticas] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('');

  useEffect(() => {
    loadData();
  }, [filtroEstado, filtroTipo]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [contratosData, statsData] = await Promise.all([
        contratoService.getAll({
          estado: filtroEstado,
          tipo_contrato: filtroTipo,
        }),
        contratoService.getEstadisticas(),
      ]);

      setContratos(contratosData.results || contratosData);
      setEstadisticas(statsData);
    } catch (error) {
      console.error('Error al cargar contratos:', error);
      toast.error('Error al cargar contratos');
    } finally {
      setLoading(false);
    }
  };

  const formatMoney = (value) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getEstadoBadge = (estado) => {
    const badges = {
      ACTIVO: { bg: 'bg-green-100', text: 'text-green-800', label: 'Activo', icon: CheckCircle },
      FINALIZADO: { bg: 'bg-orange-100', text: 'text-orange-800', label: 'Finalizado', icon: Clock },
      LIQUIDADO: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Liquidado', icon: FileCheck },
      CANCELADO: { bg: 'bg-red-100', text: 'text-red-800', label: 'Cancelado', icon: XCircle },
    };

    const badge = badges[estado] || badges.ACTIVO;
    const Icon = badge.icon;

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${badge.bg} ${badge.text}`}>
        <Icon className="w-3 h-3" />
        {badge.label}
      </span>
    );
  };

  const getAlertaBadge = (contrato) => {
    if (contrato.esta_vencido) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800">
          <AlertCircle className="w-3 h-3" />
          Vencido
        </span>
      );
    }

    if (contrato.esta_por_vencer) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800">
          <Clock className="w-3 h-3" />
          {contrato.dias_restantes} días
        </span>
      );
    }

    return null;
  };

  // Filtrar contratos por búsqueda
  const contratosFiltrados = contratos.filter((contrato) => {
    const searchLower = search.toLowerCase();
    return (
      contrato.numero_contrato.toLowerCase().includes(searchLower) ||
      contrato.trabajador_info?.nombre_completo.toLowerCase().includes(searchLower) ||
      contrato.cargo.toLowerCase().includes(searchLower)
    );
  });

  // Quick filters
  const quickFilters = [
    { label: 'Todos', value: '', count: estadisticas?.total_contratos || 0 },
    { label: 'Activos', value: 'ACTIVO', count: estadisticas?.activos || 0 },
    { label: 'Por Vencer', value: 'POR_VENCER', count: estadisticas?.por_vencer || 0 },
    { label: 'Vencidos', value: 'VENCIDO', count: estadisticas?.vencidos || 0 },
  ];

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Contratos Laborales</h1>
        <button
          onClick={() => navigate('/contratos/nuevo')}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
        >
          <Plus className="w-5 h-5" />
          Nuevo Contrato
        </button>
      </div>

      {/* Stats Dashboard */}
      {estadisticas && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Contratos</p>
                <p className="text-2xl font-bold text-gray-900">{estadisticas.total_contratos}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Activos</p>
                <p className="text-2xl font-bold text-green-600">{estadisticas.activos}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Por Vencer</p>
                <p className="text-2xl font-bold text-yellow-600">{estadisticas.por_vencer}</p>
              </div>
              <div className="p-3 bg-yellow-100 rounded-full">
                <Clock className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Vencidos</p>
                <p className="text-2xl font-bold text-red-600">{estadisticas.vencidos}</p>
              </div>
              <div className="p-3 bg-red-100 rounded-full">
                <AlertCircle className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Filter Tabs */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            {quickFilters.map((filter) => (
              <button
                key={filter.value}
                onClick={() => setFiltroEstado(filter.value)}
                className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                  filtroEstado === filter.value
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {filter.label}
                <span className="ml-2 px-2 py-0.5 rounded-full bg-gray-100 text-xs">
                  {filter.count}
                </span>
              </button>
            ))}
          </nav>
        </div>

        {/* Filtros adicionales */}
        <div className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <SearchBar
                value={search}
                onChange={setSearch}
                placeholder="Buscar por número, trabajador o cargo..."
              />
            </div>

            <div>
              <select
                value={filtroTipo}
                onChange={(e) => setFiltroTipo(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Todos los tipos</option>
                <option value="TERMINO_FIJO">Término Fijo</option>
                <option value="TERMINO_INDEFINIDO">Término Indefinido</option>
                <option value="OBRA_LABOR">Obra o Labor</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Contratos Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {contratosFiltrados.length === 0 ? (
          <div className="col-span-full bg-white p-8 rounded-lg shadow text-center">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No se encontraron contratos</p>
          </div>
        ) : (
          contratosFiltrados.map((contrato) => (
            <div
              key={contrato.id}
              className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => navigate(`/contratos/${contrato.id}`)}
            >
              {/* Card Header */}
              <div className="p-4 border-b border-gray-200">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">
                      {contrato.numero_contrato}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {contrato.trabajador_info?.nombre_completo}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {getEstadoBadge(contrato.estado)}
                    {getAlertaBadge(contrato)}
                  </div>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-4 space-y-3">
                <div>
                  <p className="text-xs text-gray-500">Cargo</p>
                  <p className="text-sm font-medium text-gray-900">{contrato.cargo}</p>
                </div>

                <div>
                  <p className="text-xs text-gray-500">Tipo de Contrato</p>
                  <p className="text-sm font-medium text-gray-900">
                    {contrato.tipo_contrato_display}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-xs text-gray-500">Inicio</p>
                    <p className="text-sm font-medium text-gray-900">
                      {formatDate(contrato.fecha_inicio)}
                    </p>
                  </div>
                  {contrato.fecha_fin && (
                    <div>
                      <p className="text-xs text-gray-500">Fin</p>
                      <p className="text-sm font-medium text-gray-900">
                        {formatDate(contrato.fecha_fin)}
                      </p>
                    </div>
                  )}
                </div>

                <div>
                  <p className="text-xs text-gray-500 mb-1">Salario Pactado</p>
                  <p className="text-lg font-bold text-blue-600">
                    {formatMoney(contrato.salario_pactado)}
                  </p>
                </div>

                {/* Progress Bar (solo para contratos activos con fecha fin) */}
                {contrato.estado === 'ACTIVO' && contrato.progreso_contrato !== null && (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs text-gray-500">Progreso</p>
                      <p className="text-xs font-medium text-gray-700">
                        {Math.round(contrato.progreso_contrato)}%
                      </p>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all ${
                          contrato.progreso_contrato >= 90
                            ? 'bg-red-500'
                            : contrato.progreso_contrato >= 70
                            ? 'bg-yellow-500'
                            : 'bg-blue-500'
                        }`}
                        style={{ width: `${contrato.progreso_contrato}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Card Footer */}
              <div className="px-4 py-3 bg-gray-50 rounded-b-lg">
                <div className="flex items-center justify-between">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/contratos/${contrato.id}`);
                    }}
                    className="flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm font-medium"
                  >
                    <Eye className="w-4 h-4" />
                    Ver Detalle
                  </button>

                  {contrato.estado === 'ACTIVO' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/contratos/${contrato.id}/editar`);
                      }}
                      className="flex items-center gap-1 text-gray-600 hover:text-gray-800 text-sm"
                    >
                      <Edit className="w-4 h-4" />
                      Editar
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
