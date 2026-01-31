// frontend/src/pages/ObligacionesLaborales/PILA/PILADetail.jsx

import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import pilaService from '../../../services/pilaService';
import LoadingSpinner from '../../../components/Common/LoadingSpinner';
import toast from 'react-hot-toast';
import {
  ArrowLeft, CheckCircle, Calendar, Users, DollarSign,
  FileText, Building2, Download
} from 'lucide-react';

export default function PILADetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [pila, setPila] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showPagarModal, setShowPagarModal] = useState(false);
  const [fechaPago, setFechaPago] = useState(new Date().toISOString().split('T')[0]);
  const [numeroPlanilla, setNumeroPlanilla] = useState('');
  const [procesando, setProcesando] = useState(false);

  useEffect(() => {
    loadPila();
  }, [id]);

  const loadPila = async () => {
    try {
      setLoading(true);
      const data = await pilaService.getById(id);
      setPila(data);
    } catch (error) {
      console.error('Error al cargar PILA:', error);
      toast.error('Error al cargar PILA');
      navigate('/obligaciones/pila');
    } finally {
      setLoading(false);
    }
  };

  const handleMarcarPagada = async () => {
    if (!numeroPlanilla.trim()) {
      toast.error('Ingrese el número de planilla');
      return;
    }

    try {
      setProcesando(true);
      await pilaService.marcarPagada(id, {
        fecha_pago: fechaPago,
        numero_planilla: numeroPlanilla,
      });
      toast.success('PILA marcada como pagada');
      setShowPagarModal(false);
      loadPila();
    } catch (error) {
      console.error('Error al marcar como pagada:', error);
      toast.error('Error al registrar pago');
    } finally {
      setProcesando(false);
    }
  };

  const handleExportarExcel = async () => {
    try {
      const blob = await pilaService.exportarExcel(id);
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `PILA_${pila?.mes}_${pila?.año}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Excel exportado correctamente');
    } catch (error) {
      console.error('Error al exportar Excel:', error);
      toast.error('Error al exportar Excel');
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

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!pila) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/obligaciones/pila')}
            className="p-2 hover:bg-gray-100 rounded-md"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold">
              PILA {meses[pila.mes]} {pila.año}
            </h1>
            <p className="text-gray-600">
              Detalle de aportes de seguridad social
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleExportarExcel}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            <Download className="w-5 h-5" />
            Exportar Excel
          </button>

          {pila.estado !== 'PAGADA' && (
            <button
              onClick={() => setShowPagarModal(true)}
              className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
            >
              <CheckCircle className="w-5 h-5" />
              Registrar Pago
            </button>
          )}
        </div>
      </div>

      {/* Estado y Resumen */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 rounded-lg shadow p-4 border-l-4 border-blue-600">
          <p className="text-sm text-blue-700">IBC Total</p>
          <p className="text-2xl font-bold text-blue-600">
            {formatMoney(pila.total_ibc)}
          </p>
        </div>

        <div className="bg-green-50 rounded-lg shadow p-4 border-l-4 border-green-600">
          <p className="text-sm text-green-700">Total Aportes</p>
          <p className="text-2xl font-bold text-green-600">
            {formatMoney(pila.total_aportes)}
          </p>
        </div>

        <div className="bg-purple-50 rounded-lg shadow p-4 border-l-4 border-purple-600">
          <p className="text-sm text-purple-700">Trabajadores</p>
          <p className="text-2xl font-bold text-purple-600">
            {pila.detalles?.length || 0}
          </p>
        </div>

        <div className={`rounded-lg shadow p-4 border-l-4 ${
          pila.estado === 'PAGADA'
            ? 'bg-green-50 border-green-600'
            : 'bg-yellow-50 border-yellow-600'
        }`}>
          <p className={`text-sm ${
            pila.estado === 'PAGADA' ? 'text-green-700' : 'text-yellow-700'
          }`}>Estado</p>
          <p className={`text-xl font-bold ${
            pila.estado === 'PAGADA' ? 'text-green-600' : 'text-yellow-600'
          }`}>
            {pila.estado_display}
          </p>
          {pila.fecha_pago && (
            <p className="text-xs text-gray-500 mt-1">
              Pagado: {new Date(pila.fecha_pago).toLocaleDateString('es-ES')}
            </p>
          )}
        </div>
      </div>

      {/* Desglose de Aportes */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-4">Desglose de Aportes</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">Salud (8.5%)</p>
            <p className="text-xl font-bold text-gray-800">
              {formatMoney(pila.total_salud)}
            </p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">Pensión (12%)</p>
            <p className="text-xl font-bold text-gray-800">
              {formatMoney(pila.total_pension)}
            </p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">ARL (0.522%)</p>
            <p className="text-xl font-bold text-gray-800">
              {formatMoney(pila.total_arl)}
            </p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">Caja Compensación (4%)</p>
            <p className="text-xl font-bold text-gray-800">
              {formatMoney(pila.total_caja)}
            </p>
          </div>
        </div>
      </div>

      {/* Información de Pago (si está pagada) */}
      {pila.estado === 'PAGADA' && (
        <div className="bg-green-50 p-6 rounded-lg shadow border border-green-200">
          <h2 className="text-lg font-semibold text-green-800 mb-4 flex items-center gap-2">
            <CheckCircle className="w-5 h-5" />
            Información de Pago
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-green-700">Fecha de Pago</p>
              <p className="font-medium">
                {new Date(pila.fecha_pago).toLocaleDateString('es-ES', {
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
            </div>
            <div>
              <p className="text-sm text-green-700">Número de Planilla</p>
              <p className="font-medium">{pila.numero_planilla}</p>
            </div>
            <div>
              <p className="text-sm text-green-700">Monto Pagado</p>
              <p className="font-medium text-green-600">
                {formatMoney(pila.total_aportes)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tabla de Detalles por Trabajador */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-4">Aportes por Trabajador</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Trabajador
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  IBC
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Días
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Salud
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Pensión
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  ARL
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Caja
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Total
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {pila.detalles?.map((detalle) => (
                <tr key={detalle.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {detalle.trabajador_info?.nombres} {detalle.trabajador_info?.apellidos}
                    </div>
                    <div className="text-xs text-gray-500">
                      {detalle.trabajador_info?.numero_documento}
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                    {formatMoney(detalle.ibc)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                    {detalle.dias_cotizados}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                    {formatMoney(detalle.aporte_salud)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                    {formatMoney(detalle.aporte_pension)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                    {formatMoney(detalle.aporte_arl)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                    {formatMoney(detalle.aporte_caja)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-blue-600">
                    {formatMoney(detalle.total_aportes)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-100">
              <tr>
                <td className="px-4 py-3 whitespace-nowrap text-sm font-bold text-gray-900">
                  TOTALES
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm font-bold text-gray-900">
                  {formatMoney(pila.total_ibc)}
                </td>
                <td className="px-4 py-3"></td>
                <td className="px-4 py-3 whitespace-nowrap text-sm font-bold text-gray-900">
                  {formatMoney(pila.total_salud)}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm font-bold text-gray-900">
                  {formatMoney(pila.total_pension)}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm font-bold text-gray-900">
                  {formatMoney(pila.total_arl)}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm font-bold text-gray-900">
                  {formatMoney(pila.total_caja)}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm font-bold text-blue-600">
                  {formatMoney(pila.total_aportes)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Modal Registrar Pago */}
      {showPagarModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Registrar Pago de PILA</h3>
            <p className="text-sm text-gray-600 mb-4">
              Ingrese los datos del pago realizado a través del sistema PILA.
            </p>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fecha de Pago *
                </label>
                <input
                  type="date"
                  value={fechaPago}
                  onChange={(e) => setFechaPago(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Número de Planilla *
                </label>
                <input
                  type="text"
                  value={numeroPlanilla}
                  onChange={(e) => setNumeroPlanilla(e.target.value)}
                  placeholder="Ej: 1234567890"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-sm text-gray-600">Monto a registrar:</p>
                <p className="text-xl font-bold text-green-600">
                  {formatMoney(pila.total_aportes)}
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowPagarModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleMarcarPagada}
                disabled={procesando}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400"
              >
                {procesando ? (
                  <>
                    <LoadingSpinner size="sm" />
                    Procesando...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Registrar Pago
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
