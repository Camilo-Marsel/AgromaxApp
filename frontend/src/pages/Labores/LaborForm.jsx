// frontend/src/pages/Labores/LaborForm.jsx

import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import laborService from '../../services/laborService';
import LoadingSpinner from '../../components/Common/LoadingSpinner';
import toast from 'react-hot-toast';
import { ArrowLeft, Save } from 'lucide-react';

export default function LaborForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = Boolean(id);

  const [loading, setLoading] = useState(false);
  const [unidadesMedida, setUnidadesMedida] = useState([]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm();

  useEffect(() => {
    loadUnidadesMedida();
    if (isEditing) {
      loadLabor();
    }
  }, [id]);

  const loadUnidadesMedida = async () => {
    try {
      const data = await laborService.getUnidadesMedida();
      setUnidadesMedida(data.results || data);
    } catch (error) {
      console.error('Error al cargar unidades de medida:', error);
      toast.error('Error al cargar unidades de medida');
    }
  };

  const loadLabor = async () => {
    try {
      setLoading(true);
      const data = await laborService.getById(id);
      reset(data);
    } catch (error) {
      console.error('Error al cargar labor:', error);
      toast.error('Error al cargar labor');
      navigate('/labores');
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data) => {
    try {
      setLoading(true);

      if (isEditing) {
        await laborService.update(id, data);
        toast.success('Labor actualizada correctamente');
      } else {
        await laborService.create(data);
        toast.success('Labor creada correctamente');
      }

      navigate('/labores');
    } catch (error) {
      console.error('Error al guardar labor:', error);
      if (error.response?.data) {
        const errorData = error.response.data;
        Object.keys(errorData).forEach((key) => {
          const message = Array.isArray(errorData[key])
            ? errorData[key][0]
            : errorData[key];
          toast.error(`${key}: ${message}`);
        });
      } else {
        toast.error('Error al guardar labor');
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
          onClick={() => navigate('/labores')}
          className="p-2 hover:bg-gray-100 rounded-md"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-2xl font-bold">
          {isEditing ? 'Editar Labor' : 'Nueva Labor'}
        </h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Código *
              </label>
              <input
                type="text"
                {...register('codigo', { required: 'Este campo es requerido' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ej: LAB001"
              />
              {errors.codigo && (
                <span className="text-red-500 text-sm">{errors.codigo.message}</span>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nombre *
              </label>
              <input
                type="text"
                {...register('nombre', { required: 'Este campo es requerido' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ej: Día Básico"
              />
              {errors.nombre && (
                <span className="text-red-500 text-sm">{errors.nombre.message}</span>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Unidad de Medida *
              </label>
              <select
                {...register('unidad_medida', { required: 'Este campo es requerido' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Seleccione...</option>
                {unidadesMedida.map((unidad) => (
                  <option key={unidad.id} value={unidad.id}>
                    {unidad.nombre_display}
                  </option>
                ))}
              </select>
              {errors.unidad_medida && (
                <span className="text-red-500 text-sm">{errors.unidad_medida.message}</span>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Descripción
              </label>
              <textarea
                {...register('descripcion')}
                rows="3"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Descripción de la labor (opcional)"
              />
            </div>

            <div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  {...register('activa')}
                  defaultChecked={true}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700">Labor activa</span>
              </label>
            </div>
          </div>
        </div>

        {/* Botones */}
        <div className="flex justify-end gap-4">
          <button
            type="button"
            onClick={() => navigate('/labores')}
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