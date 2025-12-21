// frontend/src/pages/Trabajadores/TrabajadorForm.jsx

import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import trabajadorService from '../../services/trabajadorService';
import tipoContratoService from '../../services/tipoContratoService';
import fincaService from '../../services/fincaService';
import LoadingSpinner from '../../components/Common/LoadingSpinner';
import toast from 'react-hot-toast';
import { ArrowLeft, Save } from 'lucide-react';

export default function TrabajadorForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = Boolean(id);

  const [loading, setLoading] = useState(false);
  const [tiposContrato, setTiposContrato] = useState([]);
  const [fincas, setFincas] = useState([]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
  } = useForm();

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (isEditing) {
      loadTrabajador();
    }
  }, [id]);

  const loadInitialData = async () => {
    try {
      const [tiposContratoData, fincasData] = await Promise.all([
        tipoContratoService.getAll(),
        fincaService.getAll(),
      ]);

      setTiposContrato(tiposContratoData.results || tiposContratoData);
      setFincas(fincasData.results || fincasData);
    } catch (error) {
      console.error('Error al cargar datos:', error);
      toast.error('Error al cargar datos iniciales');
    }
  };

  const loadTrabajador = async () => {
    try {
      setLoading(true);
      const data = await trabajadorService.getById(id);
      reset(data);
    } catch (error) {
      console.error('Error al cargar trabajador:', error);
      toast.error('Error al cargar trabajador');
      navigate('/trabajadores');
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data) => {
    try {
      setLoading(true);

      // Limpiar salario_quincenal si no es administrativo
      if (!data.es_administrativo) {
        data.salario_quincenal = null;
      }

      if (isEditing) {
        await trabajadorService.update(id, data);
        toast.success('Trabajador actualizado correctamente');
      } else {
        await trabajadorService.create(data);
        toast.success('Trabajador creado correctamente');
      }

      navigate('/trabajadores');
    } catch (error) {
      console.error('Error al guardar trabajador:', error);
      if (error.response?.data) {
        const errorData = error.response.data;
        Object.keys(errorData).forEach((key) => {
          const message = Array.isArray(errorData[key])
            ? errorData[key][0]
            : errorData[key];
          toast.error(`${key}: ${message}`);
        });
      } else {
        toast.error('Error al guardar trabajador');
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
    <div className="max-w-4xl mx-auto">
      <div className="mb-6 flex items-center gap-4">
        <button
          onClick={() => navigate('/trabajadores')}
          className="p-2 hover:bg-gray-100 rounded-md"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-2xl font-bold">
          {isEditing ? 'Editar Trabajador' : 'Nuevo Trabajador'}
        </h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Información Personal */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Información Personal</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tipo de Documento *
              </label>
              <select
                {...register('tipo_documento', { required: 'Este campo es requerido' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Seleccione...</option>
                <option value="CC">Cédula de Ciudadanía</option>
                <option value="CE">Cédula de Extranjería</option>
                <option value="TI">Tarjeta de Identidad</option>
                <option value="PAS">Pasaporte</option>
              </select>
              {errors.tipo_documento && (
                <span className="text-red-500 text-sm">{errors.tipo_documento.message}</span>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Número de Documento *
              </label>
              <input
                type="text"
                {...register('numero_documento', { required: 'Este campo es requerido' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="1234567890"
              />
              {errors.numero_documento && (
                <span className="text-red-500 text-sm">{errors.numero_documento.message}</span>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nombres *
              </label>
              <input
                type="text"
                {...register('nombres', { required: 'Este campo es requerido' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Juan Carlos"
              />
              {errors.nombres && (
                <span className="text-red-500 text-sm">{errors.nombres.message}</span>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Apellidos *
              </label>
              <input
                type="text"
                {...register('apellidos', { required: 'Este campo es requerido' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Pérez García"
              />
              {errors.apellidos && (
                <span className="text-red-500 text-sm">{errors.apellidos.message}</span>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fecha de Nacimiento *
              </label>
              <input
                type="date"
                {...register('fecha_nacimiento', { required: 'Este campo es requerido' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {errors.fecha_nacimiento && (
                <span className="text-red-500 text-sm">{errors.fecha_nacimiento.message}</span>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Teléfono
              </label>
              <input
                type="tel"
                {...register('telefono')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="3001234567"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Dirección
              </label>
              <input
                type="text"
                {...register('direccion')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Calle 123 #45-67"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                {...register('email')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="ejemplo@correo.com"
              />
            </div>
          </div>
        </div>

        {/* Información Laboral */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Información Laboral</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tipo de Contrato *
              </label>
              <select
                {...register('tipo_contrato', { required: 'Este campo es requerido' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Seleccione...</option>
                {tiposContrato.map((tipo) => (
                  <option key={tipo.id} value={tipo.id}>
                    {tipo.nombre_display}
                  </option>
                ))}
              </select>
              {errors.tipo_contrato && (
                <span className="text-red-500 text-sm">{errors.tipo_contrato.message}</span>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Estado *
              </label>
              <select
                {...register('estado', { required: 'Este campo es requerido' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="ACTIVO">Activo</option>
                <option value="INACTIVO">Inactivo</option>
                <option value="RETIRADO">Retirado</option>
              </select>
              {errors.estado && (
                <span className="text-red-500 text-sm">{errors.estado.message}</span>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fecha de Ingreso *
              </label>
              <input
                type="date"
                {...register('fecha_ingreso', { required: 'Este campo es requerido' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {errors.fecha_ingreso && (
                <span className="text-red-500 text-sm">{errors.fecha_ingreso.message}</span>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fecha de Retiro
              </label>
              <input
                type="date"
                {...register('fecha_retiro')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Finca *
              </label>
              <select
                {...register('finca', { required: 'Este campo es requerido' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Seleccione...</option>
                {fincas.map((finca) => (
                  <option key={finca.id} value={finca.id}>
                    {finca.nombre}
                  </option>
                ))}
              </select>
              {errors.finca && (
                <span className="text-red-500 text-sm">{errors.finca.message}</span>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ARL
              </label>
              <input
                type="text"
                {...register('arl')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ej: Positiva"
              />
            </div>

            {/* NUEVO: Es Administrativo */}
            <div className="md:col-span-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  {...register('es_administrativo')}
                  onChange={(e) => {
                    // Limpiar salario si desmarca administrativo
                    if (!e.target.checked) {
                      setValue('salario_quincenal', '');
                    }
                  }}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700">
                  Es Trabajador Administrativo (salario fijo)
                </span>
              </label>
              <p className="text-xs text-gray-500 ml-6 mt-1">
                Los administrativos reciben salario fijo quincenal en lugar de pago por labores
              </p>
            </div>

            {/* NUEVO: Salario Quincenal (solo si es administrativo) */}
            {watch('es_administrativo') && (
              <div className="md:col-span-2 border-l-4 border-purple-500 pl-4 bg-purple-50 p-4 rounded-r-md">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Salario Quincenal *
                </label>
                <input
                  type="number"
                  step="0.01"
                  {...register('salario_quincenal', { 
                    required: watch('es_administrativo') ? 'Este campo es requerido para administrativos' : false,
                    min: { value: 0, message: 'El salario debe ser mayor a 0' }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="900000"
                />
                {errors.salario_quincenal && (
                  <span className="text-red-500 text-sm">
                    {errors.salario_quincenal.message}
                  </span>
                )}
                <p className="text-xs text-purple-700 mt-1">
                  💼 Ejemplo: $900,000 para administradores. Se aplicarán deducciones de salud y pensión, más auxilio de transporte.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Información Bancaria */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Información Bancaria</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Banco
              </label>
              <input
                type="text"
                {...register('banco')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Bancolombia"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tipo de Cuenta Bancaria
              </label>
              <select
                {...register('tipo_cuenta_bancaria')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Seleccione...</option>
                <option value="AHORRO">Ahorro</option>
                <option value="CORRIENTE">Corriente</option>
                <option value="NEQUI">Nequi</option>
                <option value="DAVIPLATA">Daviplata</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Número de Cuenta Bancaria
              </label>
              <input
                type="text"
                {...register('numero_cuenta_bancaria')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="1234567890"
              />
            </div>
          </div>
        </div>

        {/* Botones */}
        <div className="flex justify-end gap-4">
          <button
            type="button"
            onClick={() => navigate('/trabajadores')}
            className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
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