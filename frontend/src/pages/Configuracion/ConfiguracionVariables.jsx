import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import variablesNominaService from '../../services/variablesNominaService';
import LoadingSpinner from '../../components/Common/LoadingSpinner';
import toast from 'react-hot-toast';
import { Save, TrendingUp, DollarSign, Heart, Shield, History, X, AlertTriangle, Plus } from 'lucide-react';

export default function ConfiguracionVariables() {
  const [variables, setVariables] = useState({});
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [variableEditando, setVariableEditando] = useState(null);
  const [mostrarHistorial, setMostrarHistorial] = useState(null);
  const [historial, setHistorial] = useState([]);

  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  useEffect(() => {
    loadVariables();
  }, []);

  const loadVariables = async () => {
    try {
      setLoading(true);
      const data = await variablesNominaService.getVigentes();
      setVariables(data);
    } catch (error) {
      console.error('Error al cargar variables:', error);
      toast.error('Error al cargar variables');
    } finally {
      setLoading(false);
    }
  };

  const handleEditar = (nombreVar) => {
    const variable = variables[nombreVar];
    setVariableEditando(nombreVar);
    reset({
      valor: variable.tiene_vigente ? variable.valor : '',
      fecha_inicio_vigencia: new Date().toISOString().split('T')[0],
      descripcion: '',
    });
  };

  const onSubmit = async (data) => {
    try {
      setGuardando(true);
      
      await variablesNominaService.actualizar({
        nombre: variableEditando,
        valor: parseFloat(data.valor),
        fecha_inicio_vigencia: data.fecha_inicio_vigencia,
        descripcion: data.descripcion,
      });

      toast.success('Variable actualizada correctamente');
      setVariableEditando(null);
      reset();
      await loadVariables();
    } catch (error) {
      console.error('Error al actualizar variable:', error);
      toast.error('Error al actualizar variable');
    } finally {
      setGuardando(false);
    }
  };

  const handleVerHistorial = async (nombreVar) => {
    try {
      const data = await variablesNominaService.getHistorial(nombreVar);
      setHistorial(data.results || data);
      setMostrarHistorial(nombreVar);
    } catch (error) {
      console.error('Error al cargar historial:', error);
      toast.error('Error al cargar historial');
    }
  };

  const formatMoney = (value) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const getIcono = (nombre) => {
    switch (nombre) {
      case 'SALARIO_MINIMO':
        return <DollarSign className="w-6 h-6" />;
      case 'AUXILIO_TRANSPORTE':
        return <TrendingUp className="w-6 h-6" />;
      case 'PORCENTAJE_SALUD':
        return <Heart className="w-6 h-6" />;
      case 'PORCENTAJE_PENSION':
        return <Shield className="w-6 h-6" />;
      default:
        return null;
    }
  };

  const getColor = (nombre) => {
    switch (nombre) {
      case 'SALARIO_MINIMO':
        return 'blue';
      case 'AUXILIO_TRANSPORTE':
        return 'green';
      case 'PORCENTAJE_SALUD':
        return 'red';
      case 'PORCENTAJE_PENSION':
        return 'purple';
      default:
        return 'gray';
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
      <div>
        <h1 className="text-2xl font-bold">Configuración de Variables de Nómina</h1>
        <p className="text-gray-600 mt-1">
          Gestiona los valores vigentes para cálculos de nómina
        </p>
      </div>

      {/* Alerta Informativa */}
      <div className="bg-yellow-50 border-l-4 border-yellow-600 p-4 rounded-r-md">
        <div className="flex items-start gap-3">
          <div className="text-sm text-yellow-800">
            <p className="font-medium mb-1">⚠️ Importante:</p>
            <ul className="list-disc list-inside space-y-1 text-yellow-700">
              <li>Al actualizar una variable, se crea una nueva versión con fecha de inicio</li>
              <li>La versión anterior se cierra automáticamente</li>
              <li>Los cálculos futuros usarán el nuevo valor</li>
              <li>Las nóminas anteriores mantienen sus valores originales</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Variables */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {Object.entries(variables).map(([nombreVar, variable]) => {
          const color = getColor(nombreVar);
          const editando = variableEditando === nombreVar;

          return (
            <div
              key={nombreVar}
              className={`bg-white rounded-lg shadow-md border-l-4 border-${color}-600 overflow-hidden`}
            >
              <div className={`${variable.tiene_vigente ? `bg-${color}-50` : 'bg-orange-50'} p-4 flex justify-between items-start`}>
                <div className="flex items-center gap-3">
                  <div className={variable.tiene_vigente ? `text-${color}-600` : 'text-orange-600'}>
                    {variable.tiene_vigente ? getIcono(nombreVar) : <AlertTriangle className="w-6 h-6" />}
                  </div>
                  <div>
                    <h3 className={`text-lg font-semibold ${variable.tiene_vigente ? `text-${color}-900` : 'text-orange-900'}`}>
                      {variable.nombre}
                    </h3>
                    {variable.tiene_vigente ? (
                      <p className="text-xs text-gray-600">
                        Vigente desde: {new Date(variable.fecha_inicio_vigencia).toLocaleDateString('es-ES')}
                      </p>
                    ) : (
                      <p className="text-xs text-orange-700 font-medium">
                        Sin valor vigente configurado
                      </p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => handleVerHistorial(nombreVar)}
                  className={`${variable.tiene_vigente ? `text-${color}-600 hover:text-${color}-800` : 'text-orange-600 hover:text-orange-800'}`}
                  title="Ver historial"
                >
                  <History className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4">
                {!editando ? (
                  <>
                    {variable.tiene_vigente ? (
                      <>
                        <div className="mb-4">
                          <p className="text-sm text-gray-600">Valor Actual</p>
                          <p className={`text-3xl font-bold text-${color}-600`}>
                            {nombreVar.includes('PORCENTAJE')
                              ? `${variable.valor}%`
                              : formatMoney(variable.valor)}
                          </p>
                        </div>
                        <button
                          onClick={() => handleEditar(nombreVar)}
                          className={`w-full bg-${color}-600 text-white px-4 py-2 rounded-md hover:bg-${color}-700`}
                        >
                          Actualizar Valor
                        </button>
                      </>
                    ) : (
                      <>
                        <div className="mb-4 p-3 bg-orange-100 rounded-md">
                          <p className="text-sm text-orange-800">
                            Esta variable no tiene un valor vigente. Los cálculos de nómina no podrán usar este valor hasta que se configure.
                          </p>
                        </div>
                        <button
                          onClick={() => handleEditar(nombreVar)}
                          className="w-full flex items-center justify-center gap-2 bg-orange-600 text-white px-4 py-2 rounded-md hover:bg-orange-700"
                        >
                          <Plus className="w-5 h-5" />
                          Configurar Valor
                        </button>
                      </>
                    )}
                  </>
                ) : (
                  <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Nuevo Valor *
                      </label>
                      <input
                        type="number"
                        step={nombreVar.includes('PORCENTAJE') ? '0.01' : '1'}
                        {...register('valor', {
                          required: 'Este campo es requerido',
                          min: { value: 0, message: 'El valor debe ser positivo' },
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      {errors.valor && (
                        <span className="text-red-500 text-sm">{errors.valor.message}</span>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Fecha de Inicio Vigencia *
                      </label>
                      <input
                        type="date"
                        {...register('fecha_inicio_vigencia', {
                          required: 'Este campo es requerido',
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      {errors.fecha_inicio_vigencia && (
                        <span className="text-red-500 text-sm">
                          {errors.fecha_inicio_vigencia.message}
                        </span>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Motivo del Cambio
                      </label>
                      <textarea
                        {...register('descripcion')}
                        rows="2"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Ej: Ajuste por inflación 2025"
                      />
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setVariableEditando(null);
                          reset();
                        }}
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        disabled={guardando}
                        className={`flex-1 flex items-center justify-center gap-2 bg-${color}-600 text-white px-4 py-2 rounded-md hover:bg-${color}-700 disabled:bg-gray-400`}
                      >
                        {guardando ? (
                          <>
                            <LoadingSpinner size="sm" />
                            Guardando...
                          </>
                        ) : (
                          <>
                            <Save className="w-4 h-4" />
                            Guardar
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Historial */}
      {mostrarHistorial && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[80vh] overflow-hidden">
            <div className="p-6 border-b flex justify-between items-center">
              <h2 className="text-xl font-bold">
                Historial - {variables[mostrarHistorial]?.nombre}
              </h2>
              <button
                onClick={() => setMostrarHistorial(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[60vh]">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Valor
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Vigencia
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Estado
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Motivo
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {historial.map((item) => (
                    <tr key={item.id}>
                      <td className="px-6 py-4 whitespace-nowrap font-medium">
                        {mostrarHistorial.includes('PORCENTAJE')
                          ? `${item.valor}%`
                          : formatMoney(item.valor)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {new Date(item.fecha_inicio_vigencia).toLocaleDateString('es-ES')}
                        {item.fecha_fin_vigencia && (
                          <> - {new Date(item.fecha_fin_vigencia).toLocaleDateString('es-ES')}</>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 text-xs font-semibold rounded-full ${
                            item.vigente
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {item.vigente ? 'Vigente' : 'Cerrada'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {item.descripcion || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
