// frontend/src/pages/ObligacionesLaborales/PILA/PILAList.jsx

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import pilaService from '../../../services/pilaService';
import LoadingSpinner from '../../../components/Common/LoadingSpinner';
import ConfirmDialog from '../../../components/Common/ConfirmDialog';
import toast from 'react-hot-toast';
import {
  Plus, Eye, CheckCircle, Trash2, Calculator,
  Shield, DollarSign, Users, Calendar
} from 'lucide-react';

export default function PILAList() {
  const navigate = useNavigate();
  const [pilas, setPilas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [resumen, setResumen] = useState(null);
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
      const [pilasData, resumenData] = await Promise.all([
        pilaService.getAll({ año: filtroAño }),
        pilaService.getResumen(),
      ]);
      setPilas(pilasData.results || pilasData);
      setResumen(resumenData);
    } catch (error) {
      console.error('Error al cargar datos:', error);
      toast.error('Error al cargar datos de PILA');
    } finally {
      setLoading(false);
    }
  };

  const handleCalcular = async () => {
    try {
      setCalculando(true);
      await pilaService.calcular(mesCalcular, añoCalcular);
      toast.success(`PILA calculada para ${mesCalcular}/${añoCalcular}`);
      setShowCalcularModal(false);
      loadData();
    } catch (error) {
      console.error('Error al calcular PILA:', error);
      const errorMsg = error.response?.data?.error || 'Error al calcular PILA';
      toast.error(errorMsg);
    } finally {
      setCalculando(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await pilaService.delete(id);
      toast.success('PILA eliminada correctamente');
      setConfirmDelete({ isOpen: false, id: null });
      loadData();
    } catch (error) {
      console.error('Error al eliminar PILA:', error);
      toast.error('Error al eliminar PILA');
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
          <h1 className="text-2xl font-bold">Seguridad Social (PILA)</h1>
          <p className="text-gray-600">Planilla Integrada de Liquidación de Aportes</p>
        </div>
        <button
          onClick={() => setShowCalcularModal(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
        >
          <Calculator className="w-5 h-5" />
          Calcular PILA
        </button>
      </div>

      {/* Porcentajes Vigentes */}
      {resumen?.porcentajes && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg shadow border border-blue-200">
          <h2 className="text-lg font-semibold text-blue-800 mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Porcentajes Vigentes (Aportes Empleador)
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-white p-3 rounded-lg shadow-sm">
              <p className="text-xs text-gray-600">Salud</p>
              <p className="text-xl font-bold text-blue-600">
                {resumen.porcentajes.seguridad_social.salud}%
              </p>
            </div>
            <div className="bg-white p-3 rounded-lg shadow-sm">
              <p className="text-xs text-gray-600">Pensión</p>
              <p className="text-xl font-bold text-green-600">
                {resumen.porcentajes.seguridad_social.pension}%
              </p>
            </div>
            <div className="bg-white p-3 rounded-lg shadow-sm">
              <p className="text-xs text-gray-600">ARL</p>
              <p className="text-xl font-bold text-yellow-600">
                {resumen.porcentajes.seguridad_social.arl}%
              </p>
            </div>
            <div className="bg-white p-3 rounded-lg shadow-sm">
              <p className="text-xs text-gray-600">Caja Compensación</p>
              <p className="text-xl font-bold text-purple-600">
                {resumen.porcentajes.seguridad_social.caja_compensacion}%
              </p>
            </div>
            <div className="bg-blue-100 p-3 rounded-lg shadow-sm">
              <p className="text-xs text-blue-700">Total Mensual</p>
              <p className="text-xl font-bold text-blue-800">
                {resumen.porcentajes.seguridad_social.total.toFixed(2)}%
              </p>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-3">
            * Empresa exonerada de SENA e ICBF. ARL Nivel I (0.522%)
          </p>
        </div>
      )}

      {/* Resumen Pendientes */}
      {resumen && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-yellow-50 rounded-lg shadow p-4 border-l-4 border-yellow-600">
            <p className="text-sm text-yellow-700">PILAs Pendientes de Pago</p>
            <p className="text-2xl font-bold text-yellow-600">{resumen.pilas_pendientes}</p>
          </div>
          <div className="bg-red-50 rounded-lg shadow p-4 border-l-4 border-red-600">
            <p className="text-sm text-red-700">Total por Pagar</p>
            <p className="text-2xl font-bold text-red-600">
              {formatMoney(resumen.total_pendiente)}
            </p>
          </div>
          <div className="bg-blue-50 rounded-lg shadow p-4 border-l-4 border-blue-600">
            <p className="text-sm text-blue-700">Mes Actual</p>
            <p className="text-lg font-bold text-blue-600">
              {resumen.pila_mes_actual
                ? resumen.pila_mes_actual.estado_display
                : 'Sin calcular'}
            </p>
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
            className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {años.map((año) => (
              <option key={año} value={año}>{año}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Tabla de PILAs */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {pilas.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No se encontraron PILAs para {filtroAño}
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
                    IBC Total
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Total Aportes
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Trabajadores
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {pilas.map((pila) => (
                  <tr key={pila.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span className="font-medium">
                          {meses[pila.mes]} {pila.año}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatMoney(pila.total_ibc)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">
                      {formatMoney(pila.total_aportes)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-1 text-sm text-gray-600">
                        <Users className="w-4 h-4" />
                        {pila.num_trabajadores}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          pila.estado === 'PAGADA'
                            ? 'bg-green-100 text-green-800'
                            : pila.estado === 'CALCULADA'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {pila.estado_display}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => navigate(`/obligaciones/pila/${pila.id}`)}
                          className="text-blue-600 hover:text-blue-900"
                          title="Ver detalle"
                        >
                          <Eye className="w-5 h-5" />
                        </button>
                        {pila.estado !== 'PAGADA' && (
                          <>
                            <button
                              onClick={() => navigate(`/obligaciones/pila/${pila.id}/pagar`)}
                              className="text-green-600 hover:text-green-900"
                              title="Registrar pago"
                            >
                              <CheckCircle className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => setConfirmDelete({ isOpen: true, id: pila.id })}
                              className="text-red-600 hover:text-red-900"
                              title="Eliminar"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Calcular PILA */}
      {showCalcularModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Calcular PILA</h3>
            <p className="text-sm text-gray-600 mb-4">
              Seleccione el mes y año para calcular los aportes de seguridad social
              basados en las nóminas aprobadas.
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
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
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
        title="Eliminar PILA"
        message="¿Está seguro que desea eliminar esta PILA? Esta acción no se puede deshacer."
        type="danger"
      />
    </div>
  );
}
