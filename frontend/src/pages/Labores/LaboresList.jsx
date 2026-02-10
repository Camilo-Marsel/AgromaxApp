// frontend/src/pages/Labores/LaboresList.jsx

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import laborService from '../../services/laborService';
import LoadingSpinner from '../../components/Common/LoadingSpinner';
import SearchBar from '../../components/Common/SearchBar';
import ConfirmDialog from '../../components/Common/ConfirmDialog';
import toast from 'react-hot-toast';
import { Plus, Edit, Trash2, DollarSign, FileSpreadsheet } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

export default function LaboresList() {
  const navigate = useNavigate();
  const { canModify } = useAuth();
  const [labores, setLabores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [confirmDelete, setConfirmDelete] = useState({ isOpen: false, id: null });

  useEffect(() => {
    loadLabores();
  }, []);

  const loadLabores = async () => {
    try {
      setLoading(true);
      const data = await laborService.getAll();
      setLabores(data.results || data);
    } catch (error) {
      console.error('Error al cargar labores:', error);
      toast.error('Error al cargar labores');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await laborService.delete(id);
      toast.success('Labor eliminada correctamente');
      loadLabores();
      setConfirmDelete({ isOpen: false, id: null });
    } catch (error) {
      console.error('Error al eliminar labor:', error);
      toast.error('Error al eliminar labor');
    }
  };

  const handleExportarExcel = async () => {
    try {
      const response = await laborService.exportarExcel();

      // Crear URL del blob y descargar
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;

      // Extraer nombre del archivo del header o usar uno por defecto
      const contentDisposition = response.headers['content-disposition'];
      let filename = 'Listado_Labores.xlsx';
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }

      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.success('Archivo descargado correctamente');
    } catch (error) {
      console.error('Error al exportar:', error);
      toast.error('Error al exportar listado');
    }
  };

  const laboresFiltradas = labores.filter((labor) => {
    const searchLower = search.toLowerCase();
    return (
      labor.nombre.toLowerCase().includes(searchLower) ||
      labor.codigo.toLowerCase().includes(searchLower)
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
        <h1 className="text-2xl font-bold">Labores</h1>
        <div className="flex gap-3">
          <button
            onClick={handleExportarExcel}
            className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
            title="Exportar listado a Excel"
          >
            <FileSpreadsheet className="w-5 h-5" />
            Exportar Excel
          </button>
          {canModify() && (
            <button
              onClick={() => navigate('/labores/nueva')}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
            >
              <Plus className="w-5 h-5" />
              Nueva Labor
            </button>
          )}
        </div>
      </div>

      {/* Búsqueda */}
      <div className="bg-white p-4 rounded-lg shadow">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Buscar por nombre o código..."
        />
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Código
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Nombre
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Unidad de Medida
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Precio Actual
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
            {laboresFiltradas.length === 0 ? (
              <tr>
                <td colSpan="6" className="px-6 py-4 text-center text-gray-500">
                  No se encontraron labores
                </td>
              </tr>
            ) : (
              laboresFiltradas.map((labor) => (
                <tr key={labor.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {labor.codigo}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {labor.nombre}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {labor.unidad_medida_info?.nombre_display}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {labor.precio_actual !== null && labor.precio_actual !== undefined ? (
                      <span className="font-semibold text-green-600">
                        ${Number(labor.precio_actual).toLocaleString('es-CO', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2
                        })}
                      </span>
                    ) : (
                      <span className="text-red-600 font-semibold">Sin precio</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        labor.activa
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {labor.activa ? 'Activa' : 'Inactiva'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => navigate(`/labores/${labor.id}/precios`)}
                        className="text-green-600 hover:text-green-900"
                        title="Ver precios"
                      >
                        <DollarSign className="w-5 h-5" />
                      </button>
                      {canModify() && (
                        <>
                          <button
                            onClick={() => navigate(`/labores/${labor.id}/editar`)}
                            className="text-yellow-600 hover:text-yellow-900"
                            title="Editar"
                          >
                            <Edit className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => setConfirmDelete({ isOpen: true, id: labor.id })}
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
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        isOpen={confirmDelete.isOpen}
        onClose={() => setConfirmDelete({ isOpen: false, id: null })}
        onConfirm={() => handleDelete(confirmDelete.id)}
        title="Eliminar Labor"
        message="¿Está seguro que desea eliminar esta labor? Esta acción no se puede deshacer."
        type="danger"
      />
    </div>
  );
}