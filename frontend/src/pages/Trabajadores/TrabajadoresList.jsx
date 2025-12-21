// frontend/src/pages/Trabajadores/TrabajadoresList.jsx

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import trabajadorService from '../../services/trabajadorService';
import fincaService from '../../services/fincaService';
import LoadingSpinner from '../../components/Common/LoadingSpinner';
import SearchBar from '../../components/Common/SearchBar';
import ConfirmDialog from '../../components/Common/ConfirmDialog';
import toast from 'react-hot-toast';
import { UserPlus, Eye, Edit, UserCheck, UserX, Briefcase } from 'lucide-react';

export default function TrabajadoresList() {
  const navigate = useNavigate();
  const [trabajadores, setTrabajadores] = useState([]);
  const [fincas, setFincas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('ACTIVO');
  const [filtroFinca, setFiltroFinca] = useState('');
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: null,
    type: 'warning',
  });

  useEffect(() => {
    loadFincas();
    loadTrabajadores();
  }, [filtroEstado, filtroFinca]);

  const loadFincas = async () => {
    try {
      const data = await fincaService.getAll();
      setFincas(data.results || data);
    } catch (error) {
      console.error('Error al cargar fincas:', error);
    }
  };

  const loadTrabajadores = async () => {
    try {
      setLoading(true);
      const params = {
        estado: filtroEstado,
      };
      
      // Agregar filtro de finca si está seleccionada
      if (filtroFinca) {
        params.finca = filtroFinca;
      }
      
      const data = await trabajadorService.getAll(params);
      setTrabajadores(data.results || data);
    } catch (error) {
      console.error('Error al cargar trabajadores:', error);
      toast.error('Error al cargar trabajadores');
    } finally {
      setLoading(false);
    }
  };

  const handleActivar = async (id) => {
    try {
      await trabajadorService.activar(id);
      toast.success('Trabajador activado correctamente');
      loadTrabajadores();
    } catch (error) {
      console.error('Error al activar trabajador:', error);
      toast.error('Error al activar trabajador');
    }
  };

  const handleInactivar = async (id) => {
    try {
      await trabajadorService.inactivar(id);
      toast.success('Trabajador inactivado correctamente');
      loadTrabajadores();
    } catch (error) {
      console.error('Error al inactivar trabajador:', error);
      toast.error('Error al inactivar trabajador');
    }
  };

  const openConfirmDialog = (title, message, onConfirm, type = 'warning') => {
    setConfirmDialog({
      isOpen: true,
      title,
      message,
      onConfirm,
      type,
    });
  };

  const closeConfirmDialog = () => {
    setConfirmDialog({
      isOpen: false,
      title: '',
      message: '',
      onConfirm: null,
      type: 'warning',
    });
  };

  const formatMoney = (value) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(value);
  };

  // Filtrar trabajadores por búsqueda
  const trabajadoresFiltrados = trabajadores.filter((trabajador) => {
    const searchLower = search.toLowerCase();
    return (
      trabajador.nombre_completo.toLowerCase().includes(searchLower) ||
      trabajador.numero_documento.includes(search)
    );
  });

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
        <h1 className="text-2xl font-bold">Trabajadores</h1>
        <button
          onClick={() => navigate('/trabajadores/nuevo')}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
        >
          <UserPlus className="w-5 h-5" />
          Nuevo Trabajador
        </button>
      </div>

      {/* Filtros */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <SearchBar
              value={search}
              onChange={setSearch}
              placeholder="Buscar por nombre o documento..."
            />
          </div>
          
          <div>
            <select
              value={filtroFinca}
              onChange={(e) => setFiltroFinca(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todas las fincas</option>
              {fincas.map((finca) => (
                <option key={finca.id} value={finca.id}>
                  {finca.nombre}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ACTIVO">Activos</option>
              <option value="INACTIVO">Inactivos</option>
              <option value="">Todos</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Nombre
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Documento
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Finca
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Tipo Contrato
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Estado
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {trabajadoresFiltrados.length === 0 ? (
              <tr>
                <td colSpan="6" className="px-6 py-4 text-center text-gray-500">
                  No se encontraron trabajadores
                </td>
              </tr>
            ) : (
              trabajadoresFiltrados.map((trabajador) => (
                <tr key={trabajador.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-start gap-2">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {trabajador.nombre_completo}
                        </div>
                        {trabajador.es_administrativo && (
                          <div className="flex items-center gap-1 mt-1">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                              <Briefcase className="w-3 h-3" />
                              Administrativo
                            </span>
                            {trabajador.salario_quincenal && (
                              <span className="text-xs text-purple-600 font-medium">
                                {formatMoney(trabajador.salario_quincenal)}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {trabajador.tipo_documento_display}
                    </div>
                    <div className="text-sm text-gray-500">
                      {trabajador.numero_documento}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {trabajador.finca_info?.nombre || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {trabajador.tipo_contrato_info?.nombre_display}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        trabajador.estado === 'ACTIVO'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {trabajador.estado_display}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => navigate(`/trabajadores/${trabajador.id}`)}
                        className="text-blue-600 hover:text-blue-900"
                        title="Ver detalle"
                      >
                        <Eye className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => navigate(`/trabajadores/${trabajador.id}/editar`)}
                        className="text-yellow-600 hover:text-yellow-900"
                        title="Editar"
                      >
                        <Edit className="w-5 h-5" />
                      </button>
                      {trabajador.estado === 'ACTIVO' ? (
                        <button
                          onClick={() =>
                            openConfirmDialog(
                              'Inactivar Trabajador',
                              `¿Está seguro que desea inactivar a ${trabajador.nombre_completo}?`,
                              () => {
                                handleInactivar(trabajador.id);
                                closeConfirmDialog();
                              },
                              'warning'
                            )
                          }
                          className="text-red-600 hover:text-red-900"
                          title="Inactivar"
                        >
                          <UserX className="w-5 h-5" />
                        </button>
                      ) : (
                        <button
                          onClick={() =>
                            openConfirmDialog(
                              'Activar Trabajador',
                              `¿Está seguro que desea activar a ${trabajador.nombre_completo}?`,
                              () => {
                                handleActivar(trabajador.id);
                                closeConfirmDialog();
                              },
                              'info'
                            )
                          }
                          className="text-green-600 hover:text-green-900"
                          title="Activar"
                        >
                          <UserCheck className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={closeConfirmDialog}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        message={confirmDialog.message}
        type={confirmDialog.type}
      />
    </div>
  );
}