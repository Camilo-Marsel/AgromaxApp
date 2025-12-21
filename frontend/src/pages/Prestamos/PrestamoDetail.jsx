// frontend/src/pages/Prestamos/PrestamoDetail.jsx

import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import prestamoService from '../../services/prestamoService';
import LoadingSpinner from '../../components/Common/LoadingSpinner';
import ConfirmDialog from '../../components/Common/ConfirmDialog';
import toast from 'react-hot-toast';
import { ArrowLeft, Download, CheckCircle, Ban, FileText } from 'lucide-react';

export default function PrestamoDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  
  const [prestamo, setPrestamo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [confirmCancel, setConfirmCancel] = useState(false);

  useEffect(() => {
    loadPrestamo();
  }, [id]);

  const loadPrestamo = async () => {
    try {
      setLoading(true);
      const data = await prestamoService.getById(id);
      setPrestamo(data);
    } catch (error) {
      console.error('Error al cargar préstamo:', error);
      toast.error('Error al cargar préstamo');
      navigate('/prestamos');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelar = async () => {
    try {
      await prestamoService.cancelar(id);
      toast.success('Préstamo cancelado correctamente');
      setConfirmCancel(false);
      loadPrestamo();
    } catch (error) {
      console.error('Error al cancelar préstamo:', error);
      toast.error('Error al cancelar préstamo');
    }
  };

  const handleDescargarAutorizacion = async () => {
    try {
      const blob = await prestamoService.descargarAutorizacion(id);
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `autorizacion_prestamo_${id}_${prestamo.trabajador_info?.numero_documento}.pdf`;
      document.body.appendChild(link);
      link.click();
      
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success('Autorización descargada correctamente');
    } catch (error) {
      console.error('Error al descargar autorización:', error);
      toast.error('Error al descargar autorización');
    }
  };

  const handleDescargarPazYSalvo = async () => {
    try {
      const blob = await prestamoService.descargarPazYSalvo(id);
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `paz_y_salvo_prestamo_${id}_${prestamo.trabajador_info?.numero_documento}.pdf`;
      document.body.appendChild(link);
      link.click();
      
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success('Paz y salvo descargado correctamente');
    } catch (error) {
      console.error('Error al descargar paz y salvo:', error);
      toast.error('Error al descargar paz y salvo');
    }
  };

  const formatMoney = (value) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(value);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!prestamo) return null;

  const cuotasPagadas = prestamo.cuotas?.filter(c => c.estado === 'DESCONTADA').length || 0;
  const cuotasPendientes = prestamo.cuotas?.filter(c => c.estado === 'PENDIENTE').length || 0;
  const porcentajePagado = prestamo.monto_total > 0 
    ? ((prestamo.monto_total - prestamo.saldo_pendiente) / prestamo.monto_total) * 100 
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/prestamos')}
            className="p-2 hover:bg-gray-100 rounded-md"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold">Detalle de Préstamo #{prestamo.id}</h1>
            <p className="text-gray-600">
              {prestamo.trabajador_info?.nombre_completo}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleDescargarAutorizacion}
            className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
          >
            <Download className="w-5 h-5" />
            Autorización
          </button>

          {prestamo.estado === 'PAGADO' && (
            <button
              onClick={handleDescargarPazYSalvo}
              className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700"
            >
              <CheckCircle className="w-5 h-5" />
              Paz y Salvo
            </button>
          )}

          {prestamo.estado === 'ACTIVO' && (
            <button
              onClick={() => setConfirmCancel(true)}
              className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700"
            >
              <Ban className="w-5 h-5" />
              Cancelar
            </button>
          )}
        </div>
      </div>

      {/* Información General */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-4">Información General</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-gray-600">Trabajador</p>
            <p className="font-medium">{prestamo.trabajador_info?.nombre_completo}</p>
            <p className="text-sm text-gray-500">{prestamo.trabajador_info?.numero_documento}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Fecha del Préstamo</p>
            <p className="font-medium">
              {new Date(prestamo.fecha_prestamo).toLocaleDateString('es-ES', {
                day: '2-digit',
                month: 'long',
                year: 'numeric',
              })}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Estado</p>
            <span
              className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                prestamo.estado === 'PAGADO'
                  ? 'bg-green-100 text-green-800'
                  : prestamo.estado === 'ACTIVO'
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-red-100 text-red-800'
              }`}
            >
              {prestamo.estado_display}
            </span>
          </div>
        </div>

        {prestamo.observaciones && (
          <div className="mt-4 pt-4 border-t">
            <p className="text-sm text-gray-600">Observaciones</p>
            <p className="text-gray-800 mt-1">{prestamo.observaciones}</p>
          </div>
        )}
      </div>

      {/* Resumen Financiero */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 rounded-lg shadow p-4 border-l-4 border-blue-600">
          <p className="text-sm text-blue-700">Monto Total</p>
          <p className="text-2xl font-bold text-blue-600">
            {formatMoney(prestamo.monto_total)}
          </p>
          <p className="text-xs text-blue-600 mt-1">
            {prestamo.tipo_pago_display}
          </p>
        </div>

        <div className="bg-yellow-50 rounded-lg shadow p-4 border-l-4 border-yellow-600">
          <p className="text-sm text-yellow-700">Saldo Pendiente</p>
          <p className="text-2xl font-bold text-yellow-600">
            {formatMoney(prestamo.saldo_pendiente)}
          </p>
          <p className="text-xs text-yellow-600 mt-1">
            {porcentajePagado.toFixed(1)}% pagado
          </p>
        </div>

        <div className="bg-green-50 rounded-lg shadow p-4 border-l-4 border-green-600">
          <p className="text-sm text-green-700">Total Pagado</p>
          <p className="text-2xl font-bold text-green-600">
            {formatMoney(prestamo.monto_total - prestamo.saldo_pendiente)}
          </p>
        </div>

        <div className="bg-purple-50 rounded-lg shadow p-4 border-l-4 border-purple-600">
          <p className="text-sm text-purple-700">Valor por Cuota</p>
          <p className="text-2xl font-bold text-purple-600">
            {formatMoney(prestamo.valor_cuota)}
          </p>
          {prestamo.tipo_pago === 'CUOTAS' && (
            <p className="text-xs text-purple-600 mt-1">
              {cuotasPagadas}/{prestamo.numero_cuotas} pagadas
            </p>
          )}
        </div>
      </div>

      {/* Barra de Progreso */}
      {prestamo.estado === 'ACTIVO' && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Progreso del Pago</h2>
          <div className="relative pt-1">
            <div className="flex mb-2 items-center justify-between">
              <div>
                <span className="text-xs font-semibold inline-block text-blue-600">
                  {porcentajePagado.toFixed(1)}% Completado
                </span>
              </div>
              <div className="text-right">
                <span className="text-xs font-semibold inline-block text-blue-600">
                  {formatMoney(prestamo.monto_total - prestamo.saldo_pendiente)} de {formatMoney(prestamo.monto_total)}
                </span>
              </div>
            </div>
            <div className="overflow-hidden h-4 mb-4 text-xs flex rounded bg-blue-200">
              <div
                style={{ width: `${porcentajePagado}%` }}
                className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-600 transition-all duration-500"
              ></div>
            </div>
          </div>
        </div>
      )}

      {/* Cuotas (solo si es tipo CUOTAS) */}
      {prestamo.tipo_pago === 'CUOTAS' && prestamo.cuotas && prestamo.cuotas.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Cuotas</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    #
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Valor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Quincena
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Fecha Descuento
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Estado
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {prestamo.cuotas.map((cuota) => (
                  <tr key={cuota.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      Cuota {cuota.numero_cuota}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatMoney(cuota.valor_cuota)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {cuota.quincena_info ? (
                        `Q${cuota.quincena_info.numero} - ${cuota.quincena_info.mes}/${cuota.quincena_info.año}`
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {cuota.fecha_descuento ? (
                        new Date(cuota.fecha_descuento).toLocaleDateString('es-ES')
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          cuota.estado === 'DESCONTADA'
                            ? 'bg-green-100 text-green-800'
                            : cuota.estado === 'CANCELADA'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {cuota.estado_display}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmCancel}
        onClose={() => setConfirmCancel(false)}
        onConfirm={handleCancelar}
        title="Cancelar Préstamo"
        message="¿Está seguro que desea cancelar este préstamo? Esta acción no se puede deshacer y todas las cuotas pendientes serán canceladas."
        type="danger"
      />
    </div>
  );
}