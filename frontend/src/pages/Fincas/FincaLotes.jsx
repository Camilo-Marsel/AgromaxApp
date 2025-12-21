// frontend/src/pages/Fincas/FincaLotes.jsx

import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import fincaService from '../../services/fincaService';
import loteService from '../../services/loteService';
import LoadingSpinner from '../../components/Common/LoadingSpinner';
import ConfirmDialog from '../../components/Common/ConfirmDialog';
import toast from 'react-hot-toast';
import { ArrowLeft, Plus, Edit, Trash2 } from 'lucide-react';

export default function FincaLotes() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [loading, setLoading] = useState(true);
  const [finca, setFinca] = useState(null);
  const [lotes, setLotes] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingLote, setEditingLote] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState({ isOpen: false, id: null });

  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      setLoading(true);
      const fincaData = await fincaService.getById(id);
      setFinca(fincaData);

      const lotesData = await loteService.getByFinca(id);
      setLotes(lotesData.results || lotesData);
    } catch (error) {
      console.error('Error al cargar datos:', error);
      toast.error('Error al cargar datos');
      navigate('/fincas');
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data) => {
    try {
      const payload = {
        finca: id,
        nombre: data.nombre,
        medida: parseFloat(data.medida),
        unidad_medida: data.unidad_medida,
        activo: data.activo !== undefined ? data.activo : true,
      };

      if (editingLote) {
        await loteService.update(editingLote.id, payload);
        toast.success('Lote actualizado correctamente');
      } else {
        await loteService.create(payload);
        toast.success('Lote creado correctamente');
      }

      loadData();
      setShowForm(false);
      setEditingLote(null);
      reset();
    } catch (error) {
      console.error('Error al guardar lote:', error);
      toast.error('Error al guardar lote');
    }
  };

  const handleEdit = (lote) => {
    setEditingLote(lote);
    reset({
      nombre: lote.nombre,
      medida: lote.medida,
      unidad_medida: lote.unidad_medida,
      activo: lote.activo,
    });
    setShowForm(true);
  };

  const handleDelete = async (loteId) => {
    try {
      await loteService.delete(loteId);
      toast.success('Lote eliminado correctamente');
      loadData();
      setConfirmDelete({ isOpen: false, id: null });
    } catch (error) {
      console.error('Error al eliminar lote:', error);
      toast.error('Error al eliminar lote');
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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/fincas')}
            className="p-2 hover:bg-gray-100 rounded-md"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold">Lotes</h1>
            <p className="text-gray-600">{finca?.nombre}</p>
          </div>
        </div>

        <button
          onClick={() => {
            setShowForm(true);
            setEditingLote(null);
            reset({ nombre: '', medida: '', unidad_medida: 'HECTAREA', activo: true });
          }}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
        >
          <Plus className="w-5 h-5" />
          Nuevo Lote
        </button>
      </div>

      {/* Formulario */}
      {showForm && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">
            {editingLote ? 'Editar Lote' : 'Nuevo Lote'}
          </h2>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre *
                </label>
                <input
                  type="text"
                  {...register('nombre', { required: 'Este campo es requerido' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Lote 1"
                />
                {errors.nombre && (
                  <span className="text-red-500 text-sm">{errors.nombre.message}</span>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Medida *
                </label>
                <input
                  type="number"
                  step="0.01"
                  {...register('medida', { required: 'Este campo es requerido' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="10.5"
                />
                {errors.medida && (
                  <span className="text-red-500 text-sm">{errors.medida.message}</span>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Unidad *
                </label>
                <select
                  {...register('unidad_medida', { required: 'Este campo es requerido' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="HECTAREA">Hectárea</option>
                  <option value="METRO_CUADRADO">Metro Cuadrado</option>
                </select>
              </div>
            </div>

            <div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  {...register('activo')}
                  defaultChecked={true}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700">Lote activo</span>
              </label>
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingLote(null);
                  reset();
                }}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                {editingLote ? 'Actualizar' : 'Guardar'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Lista de Lotes */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Nombre
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Medida
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Unidad
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
            {lotes.length === 0 ? (
              <tr>
                <td colSpan="5" className="px-6 py-4 text-center text-gray-500">
                  No hay lotes registrados
                </td>
              </tr>
            ) : (
              lotes.map((lote) => (
                <tr key={lote.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {lote.nombre}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {lote.medida}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {lote.unidad_medida_display}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        lote.activo
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {lote.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEdit(lote)}
                        className="text-yellow-600 hover:text-yellow-900"
                        title="Editar"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setConfirmDelete({ isOpen: true, id: lote.id })}
                        className="text-red-600 hover:text-red-900"
                        title="Eliminar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
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
        title="Eliminar Lote"
        message="¿Está seguro que desea eliminar este lote?"
        type="danger"
      />
    </div>
  );
}
