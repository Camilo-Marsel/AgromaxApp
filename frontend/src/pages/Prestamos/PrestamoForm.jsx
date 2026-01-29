// frontend/src/pages/Prestamos/PrestamoForm.jsx

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import prestamoService from '../../services/prestamoService';
import trabajadorService from '../../services/trabajadorService';
import LoadingSpinner from '../../components/Common/LoadingSpinner';
import toast from 'react-hot-toast';
import { ArrowLeft, Save, AlertCircle } from 'lucide-react';

export default function PrestamoForm() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [trabajadores, setTrabajadores] = useState([]);
  const [cuotaCalculada, setCuotaCalculada] = useState(0);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm({
    defaultValues: {
      tipo_pago: 'CUOTAS',
      numero_cuotas: 1,
      fecha_prestamo: new Date().toISOString().split('T')[0],
    },
  });

  const tipoPago = watch('tipo_pago');
  const montoTotal = watch('monto_total');
  const numeroCuotas = watch('numero_cuotas');

  useEffect(() => {
    loadTrabajadores();
  }, []);

  useEffect(() => {
    // Calcular cuota automáticamente
    if (montoTotal && numeroCuotas && tipoPago === 'CUOTAS') {
      const cuota = montoTotal / numeroCuotas;
      setCuotaCalculada(cuota);
    } else if (tipoPago === 'UNICO' && montoTotal) {
      setCuotaCalculada(montoTotal);
    } else {
      setCuotaCalculada(0);
    }
  }, [montoTotal, numeroCuotas, tipoPago]);

  const loadTrabajadores = async () => {
    try {
      // Usar endpoint sin paginación para obtener todos los trabajadores
      const data = await trabajadorService.getAllSimple({ estado: 'CONTRATADO' });
      setTrabajadores(data || []);
    } catch (error) {
      console.error('Error al cargar trabajadores:', error);
      toast.error('Error al cargar trabajadores');
    }
  };

  const onSubmit = async (data) => {
    try {
      setLoading(true);

      // Validación: monto máximo
      if (data.monto_total > 3000000) {
        toast.error('El monto máximo permitido es $3,000,000');
        return;
      }

      await prestamoService.create(data);
      toast.success('Adelanto creado correctamente');
      navigate('/prestamos');
    } catch (error) {
      console.error('Error al crear adelanto:', error);
      if (error.response?.data) {
        const errorData = error.response.data;
        Object.keys(errorData).forEach((key) => {
          const message = Array.isArray(errorData[key])
            ? errorData[key][0]
            : errorData[key];
          toast.error(`${key}: ${message}`);
        });
      } else {
        toast.error('Error al crear adelanto');
      }
    } finally {
      setLoading(false);
    }
  };

  const formatMoney = (value) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6 flex items-center gap-4">
        <button
          onClick={() => navigate('/prestamos')}
          className="p-2 hover:bg-gray-100 rounded-md"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-2xl font-bold">Nuevo Adelanto</h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Alerta Informativa */}
        <div className="bg-blue-50 border-l-4 border-blue-600 p-4 rounded-r-md">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">Información importante:</p>
              <ul className="list-disc list-inside space-y-1 text-blue-700">
                <li>Monto máximo: $3,000,000</li>
                <li>Solo un adelanto activo por trabajador</li>
                <li>El descuento se realiza automáticamente en nómina</li>
                <li>Requiere autorización firmada por el trabajador</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Datos del Adelanto */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Datos del Adelanto</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Trabajador */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Trabajador *
              </label>
              <select
                {...register('trabajador', { required: 'Este campo es requerido' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
            </div>

            {/* Monto */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Monto del Adelanto *
              </label>
              <input
                type="number"
                step="1000"
                {...register('monto_total', {
                  required: 'Este campo es requerido',
                  min: { value: 1000, message: 'Monto mínimo: $1,000' },
                  max: { value: 3000000, message: 'Monto máximo: $3,000,000' },
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="1000000"
              />
              {errors.monto_total && (
                <span className="text-red-500 text-sm">{errors.monto_total.message}</span>
              )}
            </div>

            {/* Fecha */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fecha del Adelanto *
              </label>
              <input
                type="date"
                {...register('fecha_prestamo', { required: 'Este campo es requerido' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {errors.fecha_prestamo && (
                <span className="text-red-500 text-sm">{errors.fecha_prestamo.message}</span>
              )}
            </div>

            {/* Tipo de Pago */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tipo de Pago *
              </label>
              <select
                {...register('tipo_pago', { required: 'Este campo es requerido' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="CUOTAS">Cuotas</option>
                <option value="UNICO">Pago Único</option>
              </select>
            </div>

            {/* Número de Cuotas (solo si es CUOTAS) */}
            {tipoPago === 'CUOTAS' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Número de Cuotas *
                </label>
                <input
                  type="number"
                  {...register('numero_cuotas', {
                    required: tipoPago === 'CUOTAS' ? 'Este campo es requerido' : false,
                    min: { value: 1, message: 'Mínimo 1 cuota' },
                    max: { value: 24, message: 'Máximo 24 cuotas' },
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="6"
                />
                {errors.numero_cuotas && (
                  <span className="text-red-500 text-sm">{errors.numero_cuotas.message}</span>
                )}
              </div>
            )}

            {/* Observaciones */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Observaciones
              </label>
              <textarea
                {...register('observaciones')}
                rows="3"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Información adicional sobre el adelanto..."
              />
            </div>
          </div>
        </div>

        {/* Resumen del Adelanto */}
        {montoTotal > 0 && (
          <div className="bg-green-50 p-6 rounded-lg shadow border-l-4 border-green-600">
            <h3 className="text-lg font-semibold text-green-800 mb-4">Resumen</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-green-700">Monto Total</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatMoney(montoTotal)}
                </p>
              </div>
              
              <div>
                <p className="text-sm text-green-700">
                  {tipoPago === 'CUOTAS' ? 'Número de Cuotas' : 'Tipo'}
                </p>
                <p className="text-2xl font-bold text-green-600">
                  {tipoPago === 'CUOTAS' ? numeroCuotas : 'Pago Único'}
                </p>
              </div>
              
              <div>
                <p className="text-sm text-green-700">Valor por Cuota</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatMoney(cuotaCalculada)}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Botones */}
        <div className="flex justify-end gap-4">
          <button
            type="button"
            onClick={() => navigate('/prestamos')}
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
                Guardar Adelanto
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}