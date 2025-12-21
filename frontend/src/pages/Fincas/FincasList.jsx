// frontend/src/pages/Fincas/FincasList.jsx

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import fincaService from '../../services/fincaService';
import LoadingSpinner from '../../components/Common/LoadingSpinner';
import SearchBar from '../../components/Common/SearchBar';
import ConfirmDialog from '../../components/Common/ConfirmDialog';
import toast from 'react-hot-toast';
import { Plus, Edit, Trash2, MapPin } from 'lucide-react';

export default function FincasList() {
  const navigate = useNavigate();
  const [fincas, setFincas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [confirmDelete, setConfirmDelete] = useState({ isOpen: false, id: null });

  useEffect(() => {
    loadFincas();
  }, []);

  const loadFincas = async () => {
    try {
      setLoading(true);
      const data = await fincaService.getAll();
      setFincas(data.results || data);
    } catch (error) {
      console.error('Error al cargar fincas:', error);
      toast.error('Error al cargar fincas');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await fincaService.delete(id);
      toast.success('Finca eliminada correctamente');
      loadFincas();
      setConfirmDelete({ isOpen: false, id: null });
    } catch (error) {
      console.error('Error al eliminar finca:', error);
      toast.error('Error al eliminar finca. Puede tener trabajadores o lotes asociados.');
    }
  };

  const fincasFiltradas = fincas.filter((finca) => {
    const searchLower = search.toLowerCase();
    return (
      finca.nombre.toLowerCase().includes(searchLower) ||
      (finca.ubicacion && finca.ubicacion.toLowerCase().includes(searchLower))
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
        <h1 className="text-2xl font-bold">Fincas</h1>
        <button
          onClick={() => navigate('/fincas/nueva')}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
        >
          <Plus className="w-5 h-5" />
          Nueva Finca
        </button>
      </div>

      {/* Búsqueda */}
      <div className="bg-white p-4 rounded-lg shadow">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Buscar por nombre o ubicación..."
        />
      </div>

      {/* Grid de Fincas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {fincasFiltradas.length === 0 ? (
          <div className="col-span-full text-center py-12 text-gray-500">
            No se encontraron fincas
          </div>
        ) : (
          fincasFiltradas.map((finca) => (
            <div
              key={finca.id}
              className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-6"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {finca.nombre}
                  </h3>
                  {finca.ubicacion && (
                    <p className="text-sm text-gray-600 flex items-center gap-1 mt-1">
                      <MapPin className="w-4 h-4" />
                      {finca.ubicacion}
                    </p>
                  )}
                </div>
                <span
                  className={`px-2 py-1 text-xs font-semibold rounded-full ${
                    finca.activa
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {finca.activa ? 'Activa' : 'Inactiva'}
                </span>
              </div>

              <div className="mb-4">
                <p className="text-sm text-gray-600">
                  {finca.total_lotes} lote(s)
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => navigate(`/fincas/${finca.id}/lotes`)}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-green-50 text-green-700 rounded-md hover:bg-green-100"
                >
                  <MapPin className="w-4 h-4" />
                  Lotes
                </button>
                <button
                  onClick={() => navigate(`/fincas/${finca.id}/editar`)}
                  className="px-3 py-2 bg-yellow-50 text-yellow-700 rounded-md hover:bg-yellow-100"
                  title="Editar"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setConfirmDelete({ isOpen: true, id: finca.id })}
                  className="px-3 py-2 bg-red-50 text-red-700 rounded-md hover:bg-red-100"
                  title="Eliminar"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        isOpen={confirmDelete.isOpen}
        onClose={() => setConfirmDelete({ isOpen: false, id: null })}
        onConfirm={() => handleDelete(confirmDelete.id)}
        title="Eliminar Finca"
        message="¿Está seguro que desea eliminar esta finca? Esta acción no se puede deshacer y puede afectar trabajadores y lotes asociados."
        type="danger"
      />
    </div>
  );
}