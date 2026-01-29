// frontend/src/pages/Dashboard.jsx

import { useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import quincenaService from '../services/quincenaService';
import trabajadorService from '../services/trabajadorService';
import contratoService from '../services/contratoService';
import toast from 'react-hot-toast';
import { Calendar, Users, AlertCircle, CheckCircle, Clock, FileText } from 'lucide-react';
import LoadingSpinner from '../components/Common/LoadingSpinner';

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  const [quincenaActual, setQuincenaActual] = useState(null);
  const [estadisticas, setEstadisticas] = useState(null);
  const [trabajadoresActivos, setTrabajadoresActivos] = useState(0);
  const [contratosStats, setContratosStats] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      // Crear/obtener quincena actual
      const quincenaData = await quincenaService.crearActual();
      const quincena = quincenaData.data || quincenaData;
      setQuincenaActual(quincena);

      // Obtener estadísticas de la quincena
      const stats = await quincenaService.getEstadisticas(quincena.id);
      setEstadisticas(stats);

      // Obtener trabajadores activos
      const trabajadores = await trabajadorService.getAll({ estado: 'CONTRATADO' });
      const trabajadoresArray = trabajadores.results || trabajadores;
      setTrabajadoresActivos(Array.isArray(trabajadoresArray) ? trabajadoresArray.length : 0);

      // Obtener estadísticas de contratos
      try {
        const contratosData = await contratoService.getEstadisticas();
        setContratosStats(contratosData);
      } catch (err) {
        console.log('Contratos no disponibles:', err);
        setContratosStats(null);
      }

    } catch (error) {
      console.error('Error al cargar datos:', error);
      toast.error('Error al cargar información del dashboard');
    } finally {
      setLoading(false);
    }
  };

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
      <div>
        <h1 className="text-2xl font-bold text-gray-800">
          Bienvenido, {user?.username}
        </h1>
        <p className="text-gray-600">
          Sistema de Gestión de Finca Platanera
        </p>
      </div>

      {/* Quincena Actual */}
      {quincenaActual && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <Calendar className="w-6 h-6 text-blue-600" />
            <div>
              <h3 className="font-semibold text-blue-900">Quincena Actual</h3>
              <p className="text-sm text-blue-700">
                {quincenaActual.año} - Mes {quincenaActual.mes} - Quincena {quincenaActual.numero}
              </p>
              <p className="text-sm text-blue-600">
                {new Date(quincenaActual.fecha_inicio).toLocaleDateString()} al{' '}
                {new Date(quincenaActual.fecha_fin).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tarjetas de Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Trabajadores Activos */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Trabajadores Activos</p>
              <p className="text-3xl font-bold text-gray-900">{trabajadoresActivos}</p>
            </div>
            <Users className="w-12 h-12 text-blue-500" />
          </div>
        </div>

        {/* Con Registros */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Con Registros</p>
              <p className="text-3xl font-bold text-green-600">
                {estadisticas?.trabajadores_con_registros || 0}
              </p>
            </div>
            <CheckCircle className="w-12 h-12 text-green-500" />
          </div>
        </div>

        {/* Sin Registros */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Sin Registros</p>
              <p className="text-3xl font-bold text-red-600">
                {estadisticas?.trabajadores_sin_registros || 0}
              </p>
            </div>
            <AlertCircle className="w-12 h-12 text-red-500" />
          </div>
        </div>

        {/* Total Registros */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Registros</p>
              <p className="text-3xl font-bold text-gray-900">
                {estadisticas?.total_registros || 0}
              </p>
            </div>
            <Clock className="w-12 h-12 text-purple-500" />
          </div>
        </div>
      </div>

      {/* Alertas */}
      {estadisticas && estadisticas.trabajadores_sin_registros > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-yellow-900">
                Trabajadores sin registros
              </h3>
              <p className="text-sm text-yellow-700 mt-1">
                Hay {estadisticas.trabajadores_sin_registros} trabajadores sin registros
                en la quincena actual. Es importante registrar las labores diarias.
              </p>
              <button
                onClick={() => navigate('/registros')}
                className="mt-3 px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 text-sm"
              >
                Ir a Registro de Labores
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Accesos Rápidos */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button
          onClick={() => navigate('/registros')}
          className="bg-white border-2 border-gray-200 rounded-lg p-6 hover:border-blue-500 hover:shadow-md transition-all text-left"
        >
          <h3 className="font-semibold text-lg mb-2">📝 Registrar Labores</h3>
          <p className="text-sm text-gray-600">
            Ingresar las labores realizadas por los trabajadores
          </p>
        </button>

        <button
          onClick={() => navigate('/trabajadores')}
          className="bg-white border-2 border-gray-200 rounded-lg p-6 hover:border-blue-500 hover:shadow-md transition-all text-left"
        >
          <h3 className="font-semibold text-lg mb-2">👥 Trabajadores</h3>
          <p className="text-sm text-gray-600">
            Gestionar información de trabajadores
          </p>
        </button>

        <button
          onClick={() => navigate('/nomina')}
          className="bg-white border-2 border-gray-200 rounded-lg p-6 hover:border-blue-500 hover:shadow-md transition-all text-left"
        >
          <h3 className="font-semibold text-lg mb-2">💰 Nómina</h3>
          <p className="text-sm text-gray-600">
            Calcular y gestionar nómina quincenal
          </p>
        </button>
      </div>
    </div>
  );
}