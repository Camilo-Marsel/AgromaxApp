// frontend/src/pages/Contratos/ContratoForm.jsx

import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import contratoService from '../../services/contratoService';
import trabajadorService from '../../services/trabajadorService';
import LoadingSpinner from '../../components/Common/LoadingSpinner';
import toast from 'react-hot-toast';
import { ArrowLeft, Save, User, AlertCircle } from 'lucide-react';

export default function ContratoForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = Boolean(id);

  const [loading, setLoading] = useState(false);
  const [trabajadores, setTrabajadores] = useState([]);
  const [selectedTrabajador, setSelectedTrabajador] = useState(null);
  const [duracionCalculada, setDuracionCalculada] = useState(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
  } = useForm({
    defaultValues: {
      tipo_contrato: 'TERMINO_INDEFINIDO',
    },
  });

  const tipoContrato = watch('tipo_contrato');
  const fechaInicio = watch('fecha_inicio');
  const fechaFin = watch('fecha_fin');
  const trabajadorId = watch('trabajador');

  useEffect(() => {
    loadTrabajadores();
  }, []);

  useEffect(() => {
    if (isEditing) {
      loadContrato();
    }
  }, [id]);

  // Validar que trabajador tenga tipo CON_CONTRATO
  useEffect(() => {
    if (trabajadorId) {
      const trabajador = trabajadores.find((t) => t.id === parseInt(trabajadorId));
      setSelectedTrabajador(trabajador);
    } else {
      setSelectedTrabajador(null);
    }
  }, [trabajadorId, trabajadores]);

  // Calcular duración automáticamente
  useEffect(() => {
    if (fechaInicio && fechaFin) {
      const inicio = new Date(fechaInicio);
      const fin = new Date(fechaFin);

      if (fin > inicio) {
        const diffTime = Math.abs(fin - inicio);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        const diffMonths =
          (fin.getFullYear() - inicio.getFullYear()) * 12 +
          (fin.getMonth() - inicio.getMonth());

        setDuracionCalculada({
          dias: diffDays,
          meses: diffMonths,
        });
      } else {
        setDuracionCalculada(null);
      }
    } else {
      setDuracionCalculada(null);
    }
  }, [fechaInicio, fechaFin]);

  const loadTrabajadores = async () => {
    try {
      // Solo cargar trabajadores CON_CONTRATO activos
      const data = await trabajadorService.getAll({
        estado: 'ACTIVO',
      });

      // Filtrar solo trabajadores CON_CONTRATO
      const trabajadoresConContrato = (data.results || data).filter(
        (t) => t.tipo_contrato_info?.nombre === 'CON_CONTRATO'
      );

      setTrabajadores(trabajadoresConContrato);
    } catch (error) {
      console.error('Error al cargar trabajadores:', error);
      toast.error('Error al cargar trabajadores');
    }
  };

  const loadContrato = async () => {
    try {
      setLoading(true);
      const data = await contratoService.getById(id);

      // Formatear fechas para el formulario
      const formattedData = {
        ...data,
        trabajador: data.trabajador,
        fecha_inicio: data.fecha_inicio,
        fecha_fin: data.fecha_fin || '',
      };

      reset(formattedData);
    } catch (error) {
      console.error('Error al cargar contrato:', error);
      toast.error('Error al cargar contrato');
      navigate('/contratos');
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data) => {
    try {
      setLoading(true);

      // Validaciones adicionales
      if (!selectedTrabajador) {
        toast.error('Debe seleccionar un trabajador');
        return;
      }

      if (
        selectedTrabajador.tipo_contrato_info?.nombre !== 'CON_CONTRATO'
      ) {
        toast.error('El trabajador debe ser de tipo CON_CONTRATO');
        return;
      }

      // Limpiar fecha_fin si es término indefinido
      if (data.tipo_contrato === 'TERMINO_INDEFINIDO') {
        data.fecha_fin = null;
      }

      // Validar que término fijo tenga fecha fin
      if (data.tipo_contrato === 'TERMINO_FIJO' && !data.fecha_fin) {
        toast.error('Los contratos a término fijo deben tener fecha de fin');
        return;
      }

      // Validar que fecha fin sea mayor a fecha inicio
      if (data.fecha_fin) {
        const inicio = new Date(data.fecha_inicio);
        const fin = new Date(data.fecha_fin);

        if (fin <= inicio) {
          toast.error('La fecha de fin debe ser posterior a la fecha de inicio');
          return;
        }
      }

      if (isEditing) {
        await contratoService.update(id, data);
        toast.success('Contrato actualizado correctamente');
      } else {
        await contratoService.create(data);
        toast.success('Contrato creado correctamente');
      }

      navigate('/contratos');
    } catch (error) {
      console.error('Error al guardar contrato:', error);
      if (error.response?.data) {
        const errorData = error.response.data;
        Object.keys(errorData).forEach((key) => {
          const message = Array.isArray(errorData[key])
            ? errorData[key][0]
            : errorData[key];
          toast.error(`${key}: ${message}`);
        });
      } else {
        toast.error('Error al guardar contrato');
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
          onClick={() => navigate('/contratos')}
          className="p-2 hover:bg-gray-100 rounded-md"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-2xl font-bold">
          {isEditing ? 'Editar Contrato' : 'Nuevo Contrato'}
        </h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Información del Trabajador */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Información del Trabajador</h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Trabajador *
              </label>
              <select
                {...register('trabajador', { required: 'Este campo es requerido' })}
                disabled={isEditing}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
              >
                <option value="">Seleccione un trabajador...</option>
                {trabajadores.map((trabajador) => (
                  <option key={trabajador.id} value={trabajador.id}>
                    {trabajador.nombre_completo} - {trabajador.numero_documento}
                  </option>
                ))}
              </select>
              {errors.trabajador && (
                <span className="text-red-500 text-sm">{errors.trabajador.message}</span>
              )}
              {isEditing && (
                <p className="text-xs text-gray-500 mt-1">
                  El trabajador no puede ser modificado en un contrato existente
                </p>
              )}
            </div>

            {/* Preview del trabajador seleccionado */}
            {selectedTrabajador && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <User className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">
                      {selectedTrabajador.nombre_completo}
                    </p>
                    <p className="text-sm text-gray-600">
                      {selectedTrabajador.tipo_documento_display}:{' '}
                      {selectedTrabajador.numero_documento}
                    </p>
                    <p className="text-sm text-gray-600">
                      Finca: {selectedTrabajador.finca_info?.nombre || 'N/A'}
                    </p>
                    <p className="text-sm text-gray-600">
                      Tipo: {selectedTrabajador.tipo_contrato_info?.nombre_display}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {trabajadores.length === 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-yellow-800">
                      No hay trabajadores disponibles
                    </p>
                    <p className="text-sm text-yellow-700 mt-1">
                      Solo los trabajadores de tipo CON_CONTRATO pueden tener contratos formales.
                      Verifica que existan trabajadores activos de este tipo.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Información del Contrato */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Información del Contrato</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tipo de Contrato *
              </label>
              <select
                {...register('tipo_contrato', { required: 'Este campo es requerido' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="TERMINO_INDEFINIDO">Término Indefinido</option>
                <option value="TERMINO_FIJO">Término Fijo</option>
                <option value="OBRA_LABOR">Obra o Labor</option>
              </select>
              {errors.tipo_contrato && (
                <span className="text-red-500 text-sm">{errors.tipo_contrato.message}</span>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cargo *
              </label>
              <input
                type="text"
                {...register('cargo', {
                  required: 'Este campo es requerido',
                  maxLength: { value: 100, message: 'Máximo 100 caracteres' },
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ej: Operario de Campo"
              />
              {errors.cargo && (
                <span className="text-red-500 text-sm">{errors.cargo.message}</span>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fecha de Inicio *
              </label>
              <input
                type="date"
                {...register('fecha_inicio', { required: 'Este campo es requerido' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {errors.fecha_inicio && (
                <span className="text-red-500 text-sm">{errors.fecha_inicio.message}</span>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fecha de Fin {tipoContrato === 'TERMINO_FIJO' && '*'}
              </label>
              <input
                type="date"
                {...register('fecha_fin', {
                  required:
                    tipoContrato === 'TERMINO_FIJO'
                      ? 'Este campo es requerido para contratos a término fijo'
                      : false,
                })}
                disabled={tipoContrato === 'TERMINO_INDEFINIDO'}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
              />
              {errors.fecha_fin && (
                <span className="text-red-500 text-sm">{errors.fecha_fin.message}</span>
              )}
              {tipoContrato === 'TERMINO_INDEFINIDO' && (
                <p className="text-xs text-gray-500 mt-1">
                  No aplica para contratos a término indefinido
                </p>
              )}
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Salario Pactado *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-gray-500">$</span>
                <input
                  type="number"
                  step="0.01"
                  {...register('salario_pactado', {
                    required: 'Este campo es requerido',
                    min: { value: 0, message: 'El salario debe ser mayor a 0' },
                  })}
                  className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0.00"
                />
              </div>
              {errors.salario_pactado && (
                <span className="text-red-500 text-sm">{errors.salario_pactado.message}</span>
              )}
            </div>

            {/* Duración calculada */}
            {duracionCalculada && (
              <div className="md:col-span-2">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="font-medium text-green-800 mb-2">Duración del Contrato:</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-2xl font-bold text-green-900">
                        {duracionCalculada.meses}
                      </p>
                      <p className="text-sm text-green-700">Meses</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-green-900">
                        {duracionCalculada.dias}
                      </p>
                      <p className="text-sm text-green-700">Días</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Descripción del Cargo
              </label>
              <textarea
                {...register('descripcion_cargo')}
                rows="3"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Descripción detallada de las funciones y responsabilidades..."
              />
            </div>
          </div>
        </div>

        {/* Observaciones */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Observaciones</h3>

          <div>
            <textarea
              {...register('observaciones')}
              rows="4"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Observaciones adicionales sobre el contrato..."
            />
          </div>
        </div>

        {/* Botones de Acción */}
        <div className="flex items-center justify-end gap-4">
          <button
            type="button"
            onClick={() => navigate('/contratos')}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
            disabled={loading}
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
          >
            <Save className="w-4 h-4" />
            {loading ? 'Guardando...' : isEditing ? 'Actualizar' : 'Crear Contrato'}
          </button>
        </div>
      </form>
    </div>
  );
}
