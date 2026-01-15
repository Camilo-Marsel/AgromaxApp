// frontend/src/pages/Labores/LaborPrecios.jsx

import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import laborService from '../../services/laborService';
import precioService from '../../services/precioService';
import LoadingSpinner from '../../components/Common/LoadingSpinner';
import ConfirmDialog from '../../components/Common/ConfirmDialog';
import toast from 'react-hot-toast';
import { ArrowLeft, Plus, Edit, Trash2 } from 'lucide-react';

export default function LaborPrecios() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [loading, setLoading] = useState(true);
  const [labor, setLabor] = useState(null);
  const [precios, setPrecios] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingPrecio, setEditingPrecio] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState({ isOpen: false, id: null });

  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      setLoading(true);
      const laborData = await laborService.getById(id);
      setLabor(laborData);

      const preciosData = await precioService.getByLabor(id);
      setPrecios(preciosData.results || preciosData);
    } catch (error) {
      console.error('Error al cargar datos:', error);
      toast.error('Error al cargar datos');
      navigate('/labores');
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data) => {
    try {
      const payload = {
        labor: id,
        precio: parseFloat(data.precio),
        fecha_inicio_vigencia: data.fecha_inicio_vigencia,
        fecha_fin_vigencia: data.fecha_fin_vigencia || null,
      };

      if (editingPrecio) {
        await precioService.update(editingPrecio.id, payload);
        toast.success('Precio actualizado correctamente');
      } else {
        await precioService.create(payload);
        toast.success('Precio creado correctamente');
      }

      loadData();
      setShowForm(false);
      setEditingPrecio(null);
      reset();
    } catch (error) {
      console.error('Error al guardar precio:', error);
      toast.error('Error al guardar precio');
    }
  };

  const handleEdit = (precio) => {
    setEditingPrecio(precio);
    // Usar undefined en lugar de '' para campos de fecha vacíos
    // ya que react-hook-form maneja mejor undefined para inputs tipo date
    reset({
      precio: precio.precio,
      fecha_inicio_vigencia: precio.fecha_inicio_vigencia || '',
      fecha_fin_vigencia: precio.fecha_fin_vigencia ? precio.fecha_fin_vigencia : '',
    });
    setShowForm(true);
  };

  const handleDelete = async (precioId) => {
    try {
      await precioService.delete(precioId);
      toast.success('Precio eliminado correctamente');
      loadData();
      setConfirmDelete({ isOpen: false, id: null });
    } catch (error) {
      console.error('Error al eliminar precio:', error);
      toast.error('Error al eliminar precio');
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/labores')}
            className="p-2 hover:bg-gray-100 rounded-md"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold">Precios de Labor</h1>
            <p className="text-gray-600">{labor?.nombre}</p>
          </div>
        </div>

        <button
          onClick={() => {
            setShowForm(true);
            setEditingPrecio(null);
            reset({ precio: '', fecha_inicio_vigencia: '', fecha_fin_vigencia: '' });
          }}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
        >
          <Plus className="w-5 h-5" />
          Nuevo Precio
        </button>
      </div>

      {/* Formulario */}
      {showForm && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">
            {editingPrecio ? 'Editar Precio' : 'Nuevo Precio'}
          </h2>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Precio *
                </label>
                <input
                  type="number"
                  step="0.01"
                  {...register('precio', { required: 'Este campo es requerido' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="47450"
                />
                {errors.precio && (
                  <span className="text-red-500 text-sm">{errors.precio.message}</span>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fecha Inicio Vigencia *
                </label>
                <input
                  type="date"
                  {...register('fecha_inicio_vigencia', { required: 'Este campo es requerido' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {errors.fecha_inicio_vigencia && (
                  <span className="text-red-500 text-sm">{errors.fecha_inicio_vigencia.message}</span>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fecha Fin Vigencia
                </label>
                <input
                  type="date"
                  {...register('fecha_fin_vigencia')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">Dejar vacío si es vigente</p>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingPrecio(null);
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
                {editingPrecio ? 'Actualizar' : 'Guardar'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Lista de Precios */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Precio
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Vigencia Desde
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Vigencia Hasta
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
            {precios.length === 0 ? (
              <tr>
                <td colSpan="5" className="px-6 py-4 text-center text-gray-500">
                  No hay precios registrados
                </td>
              </tr>
            ) : (
              precios.map((precio) => (
                <tr key={precio.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {formatMoney(precio.precio)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(precio.fecha_inicio_vigencia).toLocaleDateString('es-ES')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {precio.fecha_fin_vigencia
                      ? new Date(precio.fecha_fin_vigencia).toLocaleDateString('es-ES')
                      : 'Vigente'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        !precio.fecha_fin_vigencia
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {!precio.fecha_fin_vigencia ? 'Vigente' : 'Histórico'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEdit(precio)}
                        className="text-yellow-600 hover:text-yellow-900"
                        title="Editar"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setConfirmDelete({ isOpen: true, id: precio.id })}
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
        title="Eliminar Precio"
        message="¿Está seguro que desea eliminar este precio?"
        type="danger"
      />
    </div>
  );
}