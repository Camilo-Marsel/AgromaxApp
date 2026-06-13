// frontend/src/pages/Fincas/FincaForm.jsx

import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import fincaService from '../../services/fincaService';
import inventarioService from '../../services/inventarioService';
import LoadingSpinner from '../../components/Common/LoadingSpinner';
import toast from 'react-hot-toast';
import { ArrowLeft, Save } from 'lucide-react';

export default function FincaForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = Boolean(id);

  const [loading, setLoading]   = useState(false);
  const [bodegas, setBodegas]   = useState([]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm();

  useEffect(() => {
    inventarioService.getBodegas({ activa: true })
      .then(d => setBodegas(d.results ?? d))
      .catch(() => {});
    if (isEditing) loadFinca();
  }, [id]);

  const loadFinca = async () => {
    try {
      setLoading(true);
      const data = await fincaService.getById(id);
      reset(data);
    } catch (error) {
      console.error('Error al cargar finca:', error);
      toast.error('Error al cargar finca');
      navigate('/fincas');
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data) => {
    try {
      setLoading(true);

      if (isEditing) {
        await fincaService.update(id, data);
        toast.success('Finca actualizada correctamente');
      } else {
        await fincaService.create(data);
        toast.success('Finca creada correctamente');
      }

      navigate('/fincas');
    } catch (error) {
      console.error('Error al guardar finca:', error);
      if (error.response?.data) {
        const errorData = error.response.data;
        Object.keys(errorData).forEach((key) => {
          const message = Array.isArray(errorData[key])
            ? errorData[key][0]
            : errorData[key];
          toast.error(`${key}: ${message}`);
        });
      } else {
        toast.error('Error al guardar finca');
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading && isEditing) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6 flex items-center gap-4">
        <button
          onClick={() => navigate('/fincas')}
          className="p-2 hover:bg-gray-100 rounded-md"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-2xl font-bold">
          {isEditing ? 'Editar Finca' : 'Nueva Finca'}
        </h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nombre *
              </label>
              <input
                type="text"
                {...register('nombre', { required: 'Este campo es requerido' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ej: Finca El Paraíso"
              />
              {errors.nombre && (
                <span className="text-red-500 text-sm">{errors.nombre.message}</span>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ubicación
              </label>
              <input
                type="text"
                {...register('ubicacion')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ej: Vereda La Esperanza, Turbo"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Bodega asignada
              </label>
              <select
                {...register('bodega')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="">Sin bodega asignada</option>
                {bodegas.map(b => (
                  <option key={b.id} value={b.id}>{b.nombre}</option>
                ))}
              </select>
              <p className="text-xs text-gray-400 mt-1">
                ¿No hay bodegas?{' '}
                <a href="/inventario/bodegas" className="text-blue-600 hover:underline">
                  Créalas aquí
                </a>
              </p>
            </div>

            <div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  {...register('activa')}
                  defaultChecked={true}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700">Finca activa</span>
              </label>
            </div>
          </div>
        </div>

        {/* Botones */}
        <div className="flex justify-end gap-4">
          <button
            type="button"
            onClick={() => navigate('/fincas')}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
          >
            {loading ? (
              <>
                <LoadingSpinner size="sm" />
                Guardando...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                {isEditing ? 'Actualizar' : 'Guardar'}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}