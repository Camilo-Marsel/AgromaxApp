// frontend/src/pages/ObligacionesLaborales/Prestaciones/PrestacionesList.jsx

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import prestacionesService from '../../../services/prestacionesService';
import pilaService from '../../../services/pilaService';
import LoadingSpinner from '../../../components/Common/LoadingSpinner';
import ConfirmDialog from '../../../components/Common/ConfirmDialog';
import toast from 'react-hot-toast';
import {
  Plus, Eye, Trash2, Calculator, TrendingUp,
  PiggyBank, Calendar, Users, DollarSign
} from 'lucide-react';

export default function PrestacionesList() {
  const navigate = useNavigate();
  const [resumenes, setResumenes] = useState([]);
  const [acumulado, setAcumulado] = useState(null);
  const [porcentajes, setPorcentajes] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filtroAño, setFiltroAño] = useState(new Date().getFullYear());
  const [showCalcularModal, setShowCalcularModal] = useState(false);
  const [mesCalcular, setMesCalcular] = useState(new Date().getMonth() + 1);
  const [añoCalcular, setAñoCalcular] = useState(new Date().getFullYear());
  const [calculando, setCalculando] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState({ isOpen: false, id: null });

  useEffect(() => {
    loadData();
  }, [filtroAño]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [resumenesData, acumuladoData, pilaResumen] = await Promise.all([
        prestacionesService.getAll({ año: filtroAño }),
        prestacionesService.getAcumuladoAño(filtroAño),
        pilaService.getResumen(),
      ]);
      setResumenes(resumenesData.results || resumenesData);
      setAcumulado(acumuladoData);
      setPorcentajes(pilaResumen?.porcentajes?.prestaciones);
    } catch (error) {
      console.error('Error al cargar datos:', error);
      toast.error('Error al cargar prestaciones');
    } finally {
      setLoading(false);
    }
  };

  const handleCalcular = async () => {
    try {
      setCalculando(true);
      await prestacionesService.calcular(mesCalcular, añoCalcular);
      toast.success(`Prestaciones calculadas para ${mesCalcular}/${añoCalcular}`);
      setShowCalcularModal(false);
      loadData();
    } catch (error) {
      console.error('Error al calcular prestaciones:', error);
      const errorMsg = error.response?.data?.error || 'Error al calcular prestaciones';
      toast.error(errorMsg);
    } finally {
      setCalculando(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await prestacionesService.delete(id);
      toast.success('Provisión eliminada correctamente');
      setConfirmDelete({ isOpen: false, id: null });
      loadData();
    } catch (error) {
      console.error('Error al eliminar:', error);
      toast.error('Error al eliminar provisión');
    }
  };

  const formatMoney = (value) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(value || 0);
  };

  const meses = [
    '', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  const años = [];
  const currentYear = new Date().getFullYear();
  for (let y = currentYear; y >= currentYear - 3; y--) {
    años.push(y);
  }

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
        <div>
          <h1 className="text-2xl font-bold">Prestaciones Sociales</h1>
          <p className="text-gray-600">Provisiones mensuales para prestaciones</p>
        </div>
        <button
          onClick={() => setShowCalcularModal(true)}
          className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700"
        >
          <Calculator className="w-5 h-5" />
          Calcular Provisiones
        </button>
      </div>

      {/* Porcentajes Vigentes */}
      {porcentajes && (
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-6 rounded-lg shadow border border-purple-200">
          <h2 className="text-lg font-semibold text-purple-800 mb-4 flex items-center gap-2">
            <PiggyBank className="w-5 h-5" />
            Porcentajes de Provisión
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-white p-3 rounded-lg shadow-sm">
              <p className="text-xs text-gray-600">Cesantías</p>
              <p className="text-xl font-bold text-purple-600">
                {porcentajes.cesantias}%
              </p>
            </div>
            <div className="bg-white p-3 rounded-lg shadow-sm">
              <p className="text-xs text-gray-600">Int. Cesantías</p>
              <p className="text-xl font-bold text-pink-600">
                {porcentajes.intereses_cesantias}%
              </p>
            </div>
            <div className="bg-white p-3 rounded-lg shadow-sm">
              <p className="text-xs text-gray-600">Prima</p>
              <p className="text-xl font-bold text-indigo-600">
                {porcentajes.prima}%
              </p>
            </div>
            <div className="bg-white p-3 rounded-lg shadow-sm">
              <p className="text-xs text-gray-600">Vacaciones</p>
              <p className="text-xl font-bold text-blue-600">
                {porcentajes.vacaciones}%
              </p>
            </div>
            <div className="bg-purple-100 p-3 rounded-lg shadow-sm">
              <p className="text-xs text-purple-700">Total Mensual</p>
              <p className="text-xl font-bold text-purple-800">
                {porcentajes.total.toFixed(2)}%
              </p>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-3">
            * Provisiones mensuales sobre salario devengado. Se pagan al trabajador según calendario legal.
          </p>
        </div>
      )}

      {/* Acumulado del Año */}
      {acumulado?.acumulado && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-purple-600" />
            Acumulado {filtroAño} ({acumulado.meses_calculados} meses)
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            <div className="p-4 bg-purple-50 rounded-lg">
              <p className="text-xs text-purple-600">Cesantías</p>
              <p className="text-lg font-bold text-purple-700">
                {formatMoney(acumulado.acumulado.total_cesantias)}
              </p>
            </div>
            <div className="p-4 bg-pink-50 rounded-lg">
              <p className="text-xs text-pink-600">Int. Cesantías</p>
              <p className="text-lg font-bold text-pink-700">
                {formatMoney(acumulado.acumulado.total_intereses)}
              </p>
            </div>
            <div className="p-4 bg-indigo-50 rounded-lg">
              <p className="text-xs text-indigo-600">Prima</p>
              <p className="text-lg font-bold text-indigo-700">
                {formatMoney(acumulado.acumulado.total_prima)}
              </p>
            </div>
            <div className="p-4 bg-blue-50 rounded-lg">
              <p className="text-xs text-blue-600">Vacaciones</p>
              <p className="text-lg font-bold text-blue-700">
                {formatMoney(acumulado.acumulado.total_vacaciones)}
              </p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-600">Base Salarial</p>
              <p className="text-lg font-bold text-gray-700">
                {formatMoney(acumulado.acumulado.total_salarios)}
              </p>
            </div>
            <div className="p-4 bg-green-50 rounded-lg border-2 border-green-200">
              <p className="text-xs text-green-600">Total Provisionado</p>
              <p className="text-lg font-bold text-green-700">
                {formatMoney(acumulado.acumulado.total_provisiones)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Filtro por Año */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium text-gray-700">Año:</label>
          <select
            value={filtroAño}
            onChange={(e) => setFiltroAño(parseInt(e.target.value))}
            className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            {años.map((año) => (
              <option key={año} value={año}>{año}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Tabla de Provisiones Mensuales */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {resumenes.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No se encontraron provisiones para {filtroAño}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Periodo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Cesantías
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Int. Cesantías
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Prima
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Vacaciones
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Total
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Trabajadores
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {resumenes.map((resumen) => (
                  <tr key={resumen.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span className="font-medium">
                          {meses[resumen.mes]} {resumen.año}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-purple-600">
                      {formatMoney(resumen.total_cesantias)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-pink-600">
                      {formatMoney(resumen.total_intereses_cesantias)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-indigo-600">
                      {formatMoney(resumen.total_prima)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600">
                      {formatMoney(resumen.total_vacaciones)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                      {formatMoney(resumen.total_provisiones)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-1 text-sm text-gray-600">
                        <Users className="w-4 h-4" />
                        {resumen.num_trabajadores}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => navigate(`/obligaciones/prestaciones/${resumen.id}`)}
                          className="text-purple-600 hover:text-purple-900"
                          title="Ver detalle"
                        >
                          <Eye className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => setConfirmDelete({ isOpen: true, id: resumen.id })}
                          className="text-red-600 hover:text-red-900"
                          title="Eliminar"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Calcular Prestaciones */}
      {showCalcularModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Calcular Provisiones</h3>
            <p className="text-sm text-gray-600 mb-4">
              Seleccione el mes y año para calcular las provisiones de prestaciones
              sociales basadas en las nóminas aprobadas.
            </p>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mes
                </label>
                <select
                  value={mesCalcular}
                  onChange={(e) => setMesCalcular(parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  {meses.slice(1).map((mes, index) => (
                    <option key={index + 1} value={index + 1}>{mes}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Año
                </label>
                <select
                  value={añoCalcular}
                  onChange={(e) => setAñoCalcular(parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  {años.map((año) => (
                    <option key={año} value={año}>{año}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowCalcularModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleCalcular}
                disabled={calculando}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:bg-gray-400"
              >
                {calculando ? (
                  <>
                    <LoadingSpinner size="sm" />
                    Calculando...
                  </>
                ) : (
                  <>
                    <Calculator className="w-4 h-4" />
                    Calcular
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        isOpen={confirmDelete.isOpen}
        onClose={() => setConfirmDelete({ isOpen: false, id: null })}
        onConfirm={() => handleDelete(confirmDelete.id)}
        title="Eliminar Provisión"
        message="¿Está seguro que desea eliminar esta provisión? Esta acción no se puede deshacer."
        type="danger"
      />
    </div>
  );
}
