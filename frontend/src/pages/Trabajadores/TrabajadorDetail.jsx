// frontend/src/pages/Trabajadores/TrabajadorDetail.jsx

import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import trabajadorService from '../../services/trabajadorService';
import prestamoService from '../../services/prestamoService';
import nominaService from '../../services/nominaService';
import LoadingSpinner from '../../components/Common/LoadingSpinner';
import LiquidacionModal from './LiquidacionModal';
import toast from 'react-hot-toast';
import {
  ArrowLeft, Edit, UserCheck, UserX, DollarSign,
  FileText, Calendar, Briefcase, MapPin, Phone,
  Mail, CreditCard, Building2, Plus, Eye, Download,
  Calculator,
} from 'lucide-react';

export default function TrabajadorDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  
  const [trabajador, setTrabajador] = useState(null);
  const [prestamos, setPrestamos] = useState([]);
  const [nominas, setNominas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('info'); // info, prestamos, nominas
  const [showLiquidacion, setShowLiquidacion] = useState(false);

  useEffect(() => {
    if (id) {
      loadAllData();
    }
  }, [id]);

  const loadAllData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadTrabajador(),
        loadPrestamos(),
        loadNominas(),
      ]);
    } catch (error) {
      console.error('Error al cargar datos:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTrabajador = async () => {
    try {
      const data = await trabajadorService.getById(id);
      setTrabajador(data);
    } catch (error) {
      console.error('Error al cargar trabajador:', error);
      toast.error('Error al cargar trabajador');
      navigate('/trabajadores');
    }
  };

  const loadPrestamos = async () => {
    try {
      const data = await prestamoService.getAll({ trabajador: id });
      setPrestamos(data.results || data);
    } catch (error) {
      console.error('Error al cargar adelantos:', error);
    }
  };

  const loadNominas = async () => {
    try {
      const data = await nominaService.getAll({ trabajador: id, page_size: 100 });
      setNominas(data.results || data);
    } catch (error) {
      console.error('Error al cargar nóminas:', error);
    }
  };

  const handleDescargarPDF = async (nominaId, documento) => {
    try {
      const blob = await nominaService.descargarPDF(nominaId);
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `comprobante_${documento}_nomina_${nominaId}.pdf`;
      document.body.appendChild(link);
      link.click();
      
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success('PDF descargado correctamente');
    } catch (error) {
      console.error('Error al descargar PDF:', error);
      toast.error('Error al descargar PDF');
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

  if (!trabajador) return null;

  // Calcular totales de préstamos
  const prestamosActivos = prestamos.filter(p => p.estado === 'ACTIVO');
  const totalPrestado = prestamos.reduce((sum, p) => sum + parseFloat(p.monto_total), 0);
  const totalPendiente = prestamos.reduce((sum, p) => sum + parseFloat(p.saldo_pendiente), 0);

  // Calcular total de nóminas
  const totalNominas = nominas.reduce((sum, n) => sum + parseFloat(n.total_neto), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div className="flex items-start gap-4">
          <button
            onClick={() => navigate('/trabajadores')}
            className="p-2 hover:bg-gray-100 rounded-md mt-1"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{trabajador.nombre_completo}</h1>
              <span
                className={`px-3 py-1 text-sm font-semibold rounded-full ${
                  trabajador.estado === 'CONTRATADO'
                    ? 'bg-green-100 text-green-800'
                    : trabajador.estado === 'SIN_CONTRATO'
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-red-100 text-red-800'
                }`}
              >
                {trabajador.estado_display}
              </span>
              {trabajador.es_administrativo && (
                <span className="px-3 py-1 text-sm font-semibold rounded-full bg-purple-100 text-purple-800 flex items-center gap-1">
                  <Briefcase className="w-4 h-4" />
                  Administrativo
                </span>
              )}
            </div>
            <div className="flex items-center gap-4 mt-2 text-gray-600">
              <span className="flex items-center gap-1">
                <FileText className="w-4 h-4" />
                {trabajador.tipo_documento_display}: {trabajador.numero_documento}
              </span>
              {trabajador.finca_info && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  {trabajador.finca_info.nombre}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowLiquidacion(true)}
            className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
          >
            <Calculator className="w-5 h-5" />
            Liquidación
          </button>
          <button
            onClick={() => navigate(`/trabajadores/${id}/editar`)}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            <Edit className="w-5 h-5" />
            Editar
          </button>
        </div>
      </div>

      {/* Resumen Rápido */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 rounded-lg shadow p-4 border-l-4 border-blue-600">
          <p className="text-sm text-blue-700 flex items-center gap-1">
            <FileText className="w-4 h-4" />
            Nóminas Generadas
          </p>
          <p className="text-2xl font-bold text-blue-600">{nominas.length}</p>
          <p className="text-xs text-blue-600 mt-1">Total: {formatMoney(totalNominas)}</p>
        </div>

        <div className="bg-purple-50 rounded-lg shadow p-4 border-l-4 border-purple-600">
          <p className="text-sm text-purple-700 flex items-center gap-1">
            <DollarSign className="w-4 h-4" />
            Adelantos
          </p>
          <p className="text-2xl font-bold text-purple-600">{prestamos.length}</p>
          <p className="text-xs text-purple-600 mt-1">
            {prestamosActivos.length} activo{prestamosActivos.length !== 1 ? 's' : ''}
          </p>
        </div>

        <div className="bg-yellow-50 rounded-lg shadow p-4 border-l-4 border-yellow-600">
          <p className="text-sm text-yellow-700">Saldo Adelantos</p>
          <p className="text-2xl font-bold text-yellow-600">{formatMoney(totalPendiente)}</p>
        </div>

        <div className="bg-green-50 rounded-lg shadow p-4 border-l-4 border-green-600">
          <p className="text-sm text-green-700">Antigüedad</p>
          <p className="text-2xl font-bold text-green-600">
            {Math.floor((new Date() - new Date(trabajador.fecha_ingreso)) / (1000 * 60 * 60 * 24 * 30))} meses
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveTab('info')}
              className={`px-6 py-3 border-b-2 font-medium text-sm ${
                activeTab === 'info'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Información Personal
            </button>
            <button
              onClick={() => setActiveTab('prestamos')}
              className={`px-6 py-3 border-b-2 font-medium text-sm ${
                activeTab === 'prestamos'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Adelantos ({prestamos.length})
            </button>
            <button
              onClick={() => setActiveTab('nominas')}
              className={`px-6 py-3 border-b-2 font-medium text-sm ${
                activeTab === 'nominas'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Historial Nóminas ({nominas.length})
            </button>
          </nav>
        </div>

        <div className="p-6">
          {/* TAB: Información Personal */}
          {activeTab === 'info' && (
            <div className="space-y-6">
              {/* Información Personal */}
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <UserCheck className="w-5 h-5" />
                  Información Personal
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Nombres</p>
                    <p className="font-medium">{trabajador.nombres}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Apellidos</p>
                    <p className="font-medium">{trabajador.apellidos}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Fecha de Nacimiento</p>
                    <p className="font-medium">
                      {new Date(trabajador.fecha_nacimiento).toLocaleDateString('es-ES')}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 flex items-center gap-1">
                      <Phone className="w-4 h-4" />
                      Teléfono
                    </p>
                    <p className="font-medium">{trabajador.telefono || 'No registrado'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 flex items-center gap-1">
                      <Mail className="w-4 h-4" />
                      Email
                    </p>
                    <p className="font-medium">{trabajador.email || 'No registrado'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Dirección</p>
                    <p className="font-medium">{trabajador.direccion || 'No registrada'}</p>
                  </div>
                </div>
              </div>

              {/* Información Laboral */}
              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Briefcase className="w-5 h-5" />
                  Información Laboral
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Tipo de Contrato</p>
                    <p className="font-medium">{trabajador.tipo_contrato_info?.nombre_display}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Fecha de Ingreso</p>
                    <p className="font-medium">
                      {new Date(trabajador.fecha_ingreso).toLocaleDateString('es-ES')}
                    </p>
                  </div>
                  {trabajador.fecha_retiro && (
                    <div>
                      <p className="text-sm text-gray-600">Fecha de Retiro</p>
                      <p className="font-medium">
                        {new Date(trabajador.fecha_retiro).toLocaleDateString('es-ES')}
                      </p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-gray-600 flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      Finca
                    </p>
                    <p className="font-medium">{trabajador.finca_info?.nombre || 'No asignada'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">ARL</p>
                    <p className="font-medium">{trabajador.arl || 'No registrada'}</p>
                  </div>
                  {trabajador.es_administrativo && (
                    <div>
                      <p className="text-sm text-gray-600">Salario Quincenal</p>
                      <p className="font-medium text-purple-600">
                        {formatMoney(trabajador.salario_quincenal)}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Información Bancaria */}
              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <CreditCard className="w-5 h-5" />
                  Información Bancaria
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-gray-600 flex items-center gap-1">
                      <Building2 className="w-4 h-4" />
                      Banco
                    </p>
                    <p className="font-medium">{trabajador.banco || 'No registrado'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Tipo de Cuenta</p>
                    <p className="font-medium">{trabajador.tipo_cuenta_bancaria || 'No registrado'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Número de Cuenta</p>
                    <p className="font-medium">{trabajador.numero_cuenta_bancaria || 'No registrado'}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: Adelantos */}
          {activeTab === 'prestamos' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Adelantos del Trabajador</h3>
                <button
                  onClick={() => navigate('/prestamos/nuevo', { state: { trabajadorId: id } })}
                  className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4" />
                  Nuevo Adelanto
                </button>
              </div>

              {prestamos.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <DollarSign className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                  <p className="text-lg font-medium">No hay adelantos registrados</p>
                  <p className="text-sm mt-2">Crea el primer adelanto para este trabajador</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {prestamos.map((prestamo) => (
                    <div
                      key={prestamo.id}
                      className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => navigate(`/prestamos/${prestamo.id}`)}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <p className="text-lg font-bold text-gray-900">
                              {formatMoney(prestamo.monto_total)}
                            </p>
                            <span
                              className={`px-2 py-1 text-xs font-semibold rounded-full ${
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
                          
                          <div className="flex gap-4 text-sm text-gray-600">
                            <span>
                              📅 {new Date(prestamo.fecha_prestamo).toLocaleDateString('es-ES')}
                            </span>
                            <span>
                              {prestamo.tipo_pago_display}
                              {prestamo.tipo_pago === 'CUOTAS' && ` (${prestamo.numero_cuotas} cuotas)`}
                            </span>
                          </div>

                          {prestamo.estado === 'ACTIVO' && (
                            <div className="mt-3">
                              <div className="flex justify-between text-xs text-gray-600 mb-1">
                                <span>Saldo: {formatMoney(prestamo.saldo_pendiente)}</span>
                                <span>
                                  {((prestamo.monto_total - prestamo.saldo_pendiente) / prestamo.monto_total * 100).toFixed(0)}% pagado
                                </span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                  className="bg-blue-600 h-2 rounded-full transition-all"
                                  style={{
                                    width: `${(prestamo.monto_total - prestamo.saldo_pendiente) / prestamo.monto_total * 100}%`
                                  }}
                                ></div>
                              </div>
                            </div>
                          )}
                        </div>

                        <Eye className="w-5 h-5 text-gray-400" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB: Historial Nóminas */}
          {activeTab === 'nominas' && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Historial de Nóminas</h3>
              
              {nominas.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <FileText className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                  <p className="text-lg font-medium">No hay nóminas generadas</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Quincena
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Devengado
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Deducciones
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Neto
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
                      {nominas.map((nomina) => (
                        <tr key={nomina.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            Q{nomina.quincena_info?.numero} - {nomina.quincena_info?.mes}/{nomina.quincena_info?.año}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                            {formatMoney(nomina.total_devengado)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-red-600">
                            {formatMoney(nomina.total_deducciones)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-blue-600">
                            {formatMoney(nomina.total_neto)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                nomina.estado === 'APROBADA'
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-yellow-100 text-yellow-800'
                              }`}
                            >
                              {nomina.estado_display}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex gap-2">
                              <button
                                onClick={() => navigate(`/nomina/${nomina.id}`)}
                                className="text-blue-600 hover:text-blue-900"
                                title="Ver detalle"
                              >
                                <Eye className="w-5 h-5" />
                              </button>
                              <button
                                onClick={() => handleDescargarPDF(nomina.id, trabajador.numero_documento)}
                                className="text-green-600 hover:text-green-900"
                                title="Descargar PDF"
                              >
                                <Download className="w-5 h-5" />
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
          )}
        </div>
      </div>

      {showLiquidacion && (
        <LiquidacionModal
          trabajador={trabajador}
          onClose={() => setShowLiquidacion(false)}
        />
      )}
    </div>
  );
}