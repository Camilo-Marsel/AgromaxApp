// frontend/src/pages/Prestamos/PrestamosList.jsx

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import prestamoService from '../../services/prestamoService';
import trabajadorService from '../../services/trabajadorService';
import LoadingSpinner from '../../components/Common/LoadingSpinner';
import SearchBar from '../../components/Common/SearchBar';
import ConfirmDialog from '../../components/Common/ConfirmDialog';
import toast from 'react-hot-toast';
import { Plus, Eye, Download, FileText, Ban, CheckCircle } from 'lucide-react';

export default function PrestamosList() {
  const navigate = useNavigate();
  const [prestamos, setprestamos] = useState([]);
  const [prestamosFiltrados, setPrestamosFiltrados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('ACTIVO');
  const [confirmCancel, setConfirmCancel] = useState({ isOpen: false, id: null });

  useEffect(() => {
    loadPrestamos();
  }, [filtroEstado]);

  useEffect(() => {
    filterPrestamos();
  }, [search, prestamos]);

  const loadPrestamos = async () => {
    try {
      setLoading(true);
      const params = {};
      if (filtroEstado) {
        params.estado = filtroEstado;
      }
      
      const data = await prestamoService.getAll(params);
      setprestamos(data.results || data);
    } catch (error) {
      console.error('Error al cargar préstamos:', error);
      toast.error('Error al cargar préstamos');
    } finally {
      setLoading(false);
    }
  };

  const filterPrestamos = () => {
    if (search.trim() === '') {
      setPrestamosFiltrados(prestamos);
    } else {
      const searchLower = search.toLowerCase();
      const filtered = prestamos.filter((prestamo) => {
        const nombreCompleto = prestamo.trabajador_info?.nombre_completo.toLowerCase() || '';
        const documento = prestamo.trabajador_info?.numero_documento || '';
        return nombreCompleto.includes(searchLower) || documento.includes(search);
      });
      setPrestamosFiltrados(filtered);
    }
  };

  const handleCancelar = async (id) => {
    try {
      await prestamoService.cancelar(id);
      toast.success('Préstamo cancelado correctamente');
      loadPrestamos();
      setConfirmCancel({ isOpen: false, id: null });
    } catch (error) {
      console.error('Error al cancelar préstamo:', error);
      toast.error('Error al cancelar préstamo');
    }
  };

  const handleDescargarAutorizacion = async (prestamo) => {
    try {
      const blob = await prestamoService.descargarAutorizacion(prestamo.id);
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `autorizacion_prestamo_${prestamo.id}_${prestamo.trabajador_info?.numero_documento}.pdf`;
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

  const handleDescargarPazYSalvo = async (prestamo) => {
    try {
      const blob = await prestamoService.descargarPazYSalvo(prestamo.id);
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `paz_y_salvo_prestamo_${prestamo.id}_${prestamo.trabajador_info?.numero_documento}.pdf`;
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

  // Calcular resumen
  const resumen = prestamosFiltrados.reduce(
    (acc, prestamo) => ({
      total_prestado: acc.total_prestado + parseFloat(prestamo.monto_total),
      total_pendiente: acc.total_pendiente + parseFloat(prestamo.saldo_pendiente),
      total_pagado: acc.total_pagado + (parseFloat(prestamo.monto_total) - parseFloat(prestamo.saldo_pendiente)),
    }),
    { total_prestado: 0, total_pendiente: 0, total_pagado: 0 }
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Préstamos</h1>
        <button
          onClick={() => navigate('/prestamos/nuevo')}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
        >
          <Plus className="w-5 h-5" />
          Nuevo Préstamo
        </button>
      </div>

      {/* Filtros */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <SearchBar
              value={search}
              onChange={setSearch}
              placeholder="Buscar por nombre o documento..."
            />
          </div>
          
          <div>
            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todos los estados</option>
              <option value="ACTIVO">Activos</option>
              <option value="PAGADO">Pagados</option>
              <option value="CANCELADO">Cancelados</option>
            </select>
          </div>
        </div>
      </div>

      {/* Resumen */}
      {prestamosFiltrados.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-blue-50 rounded-lg shadow p-4 border-l-4 border-blue-600">
            <p className="text-sm text-blue-700">Total Prestado</p>
            <p className="text-2xl font-bold text-blue-600">
              {formatMoney(resumen.total_prestado)}
            </p>
          </div>

          <div className="bg-yellow-50 rounded-lg shadow p-4 border-l-4 border-yellow-600">
            <p className="text-sm text-yellow-700">Saldo Pendiente</p>
            <p className="text-2xl font-bold text-yellow-600">
              {formatMoney(resumen.total_pendiente)}
            </p>
          </div>

          <div className="bg-green-50 rounded-lg shadow p-4 border-l-4 border-green-600">
            <p className="text-sm text-green-700">Total Recuperado</p>
            <p className="text-2xl font-bold text-green-600">
              {formatMoney(resumen.total_pagado)}
            </p>
          </div>
        </div>
      )}

      {/* Tabla */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {prestamosFiltrados.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No se encontraron préstamos
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Trabajador
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Fecha
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Monto
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Tipo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Saldo
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
                {prestamosFiltrados.map((prestamo) => (
                  <tr key={prestamo.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {prestamo.trabajador_info?.nombre_completo}
                      </div>
                      <div className="text-xs text-gray-500">
                        {prestamo.trabajador_info?.numero_documento}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(prestamo.fecha_prestamo).toLocaleDateString('es-ES')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {formatMoney(prestamo.monto_total)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {prestamo.tipo_pago_display}
                      {prestamo.tipo_pago === 'CUOTAS' && (
                        <div className="text-xs text-gray-400">
                          {prestamo.numero_cuotas} cuotas
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-yellow-600">
                      {formatMoney(prestamo.saldo_pendiente)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
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
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => navigate(`/prestamos/${prestamo.id}`)}
                          className="text-blue-600 hover:text-blue-900"
                          title="Ver detalle"
                        >
                          <Eye className="w-5 h-5" />
                        </button>
                        
                        <button
                          onClick={() => handleDescargarAutorizacion(prestamo)}
                          className="text-green-600 hover:text-green-900"
                          title="Descargar autorización"
                        >
                          <Download className="w-5 h-5" />
                        </button>

                        {prestamo.estado === 'PAGADO' && (
                          <button
                            onClick={() => handleDescargarPazYSalvo(prestamo)}
                            className="text-purple-600 hover:text-purple-900"
                            title="Descargar paz y salvo"
                          >
                            <CheckCircle className="w-5 h-5" />
                          </button>
                        )}

                        {prestamo.estado === 'ACTIVO' && (
                          <button
                            onClick={() => setConfirmCancel({ isOpen: true, id: prestamo.id })}
                            className="text-red-600 hover:text-red-900"
                            title="Cancelar préstamo"
                          >
                            <Ban className="w-5 h-5" />
                          </button>
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

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmCancel.isOpen}
        onClose={() => setConfirmCancel({ isOpen: false, id: null })}
        onConfirm={() => handleCancelar(confirmCancel.id)}
        title="Cancelar Préstamo"
        message="¿Está seguro que desea cancelar este préstamo? Esta acción no se puede deshacer."
        type="danger"
      />
    </div>
  );
}