// frontend/src/pages/Registros/RegistroLabores.jsx

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import registroLaborService from '../../services/registroLaborService';
import trabajadorService from '../../services/trabajadorService';
import laborService from '../../services/laborService';
import quincenaService from '../../services/quincenaService';
import fincaService from '../../services/fincaService';
import LoadingSpinner from '../../components/Common/LoadingSpinner';
import ConfirmDialog from '../../components/Common/ConfirmDialog';
import MultipleDatePicker from '../../components/Common/MultipleDatePicker';
import toast from 'react-hot-toast';
import { Plus, Trash2, Calendar } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

export default function RegistroLabores() {
  const { canModify } = useAuth();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  // Datos maestros
  const [fincas, setFincas] = useState([]);
  const [trabajadores, setTrabajadores] = useState([]);
  const [labores, setLabores] = useState([]);
  const [quincenaActual, setQuincenaActual] = useState(null);
  
  // Filtros
  const [fincaSeleccionada, setFincaSeleccionada] = useState('');
  const [trabajadorFiltro, setTrabajadorFiltro] = useState('');
  
  // Registros
  const [registros, setRegistros] = useState([]);
  const [registrosExistentes, setRegistrosExistentes] = useState([]);
  const [registrosDetallados, setRegistrosDetallados] = useState([]); // NUEVO
  
  // Comportamiento dinámico
  const [laborSeleccionada, setLaborSeleccionada] = useState(null);
  const [esTipoDia, setEsTipoDia] = useState(false);
  const [esDesmache, setEsDesmache] = useState(false);
  const [fechasSeleccionadas, setFechasSeleccionadas] = useState([]);
  
  // Confirm dialog
  const [confirmDelete, setConfirmDelete] = useState({ isOpen: false, id: null });

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm();

  const trabajadorWatch = watch('trabajador');
  const laborWatch = watch('labor');

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (fincaSeleccionada) {
      loadTrabajadoresByFinca(fincaSeleccionada);
    } else {
      setTrabajadores([]);
    }
  }, [fincaSeleccionada]);

  useEffect(() => {
    if (laborWatch) {
      const labor = labores.find((l) => l.id === parseInt(laborWatch));
      setLaborSeleccionada(labor);
      
      // Determinar si es tipo DÍA (permite seleccionar múltiples días sin cantidad)
      const laboresTipoDia = [
        'Día Básico',
        'Embarque',
        'Resiembra',
        'Fumigación',
        'Repique',
        'Permiso Remunerado',
        'Permiso No Remunerado',
        'Ausencia No Justificada',
        'Incapacidad Médica',
        'Oficios Varios',
        'Desmache',
      ];
      setEsTipoDia(labor && laboresTipoDia.includes(labor.nombre));
      setEsDesmache(labor && labor.nombre === 'Desmache');

      // Limpiar fechas cuando cambia de labor
      setFechasSeleccionadas([]);
    }
  }, [laborWatch, labores]);

  useEffect(() => {
    if (trabajadorWatch && quincenaActual) {
      loadRegistrosByTrabajadorQuincena(trabajadorWatch, quincenaActual.id);
    }
  }, [trabajadorWatch, quincenaActual]);

  useEffect(() => {
    if (trabajadorFiltro && quincenaActual) {
      loadRegistrosByTrabajadorQuincena(trabajadorFiltro, quincenaActual.id);
    } else {
      setRegistros([]);
    }
  }, [trabajadorFiltro, quincenaActual]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      
      // Cargar fincas
      const fincasData = await fincaService.getAll();
      setFincas(fincasData.results || fincasData);
      
      // Cargar labores
      const laboresData = await laborService.getAll();
      setLabores(laboresData.results || laboresData);
      
      // Cargar quincena actual
      const quincenaData = await quincenaService.crearActual();
      setQuincenaActual(quincenaData.data || quincenaData);
    } catch (error) {
      console.error('Error al cargar datos:', error);
      toast.error('Error al cargar datos iniciales');
    } finally {
      setLoading(false);
    }
  };

  const loadTrabajadoresByFinca = async (fincaId) => {
    try {
      const data = await trabajadorService.getAll({ finca: fincaId, estado: 'CONTRATADO' });
      setTrabajadores(data.results || data);
    } catch (error) {
      console.error('Error al cargar trabajadores:', error);
      toast.error('Error al cargar trabajadores');
    }
  };

  // MODIFICADO: Ahora extrae información detallada de registros
  const loadRegistrosByTrabajadorQuincena = async (trabajadorId, quincenaId) => {
    try {
      const data = await registroLaborService.getByTrabajadorQuincena(trabajadorId, quincenaId);
      const registrosArray = data.results || data;
      setRegistros(registrosArray);
      
      // Extraer información detallada de registros (fecha + nombre de labor)
      const detalles = registrosArray.map((r) => ({
        fecha: r.fecha,
        labor_nombre: r.labor_info?.nombre || '',
      }));
      setRegistrosDetallados(detalles);
      
      // Mantener registrosExistentes por compatibilidad (solo fechas)
      const fechas = registrosArray.map((r) => r.fecha);
      setRegistrosExistentes(fechas);
    } catch (error) {
      console.error('Error al cargar registros:', error);
      toast.error('Error al cargar registros');
    }
  };

  const onSubmit = async (data) => {
    try {
      setSubmitting(true);

      if (esDesmache) {
        // Desmache: múltiples fechas + cantidad total repartida
        if (fechasSeleccionadas.length === 0) {
          toast.error('Seleccione al menos una fecha');
          return;
        }
        if (!data.cantidad) {
          toast.error('Ingrese la cantidad total de hectáreas');
          return;
        }

        const payload = {
          trabajador: data.trabajador,
          labor: data.labor,
          fechas: fechasSeleccionadas,
          quincena: quincenaActual.id,
          observaciones: data.observaciones || '',
          cantidad_total: data.cantidad,
        };

        const result = await registroLaborService.crearMultiples(payload);

        if (result.errores && result.errores.length > 0) {
          result.errores.forEach((error) => toast.error(error));
        }

        toast.success(result.message);
      } else if (esTipoDia) {
        // Labores tipo DÍA: crear múltiples registros (cantidad=1 cada uno)
        if (fechasSeleccionadas.length === 0) {
          toast.error('Seleccione al menos una fecha');
          return;
        }

        const payload = {
          trabajador: data.trabajador,
          labor: data.labor,
          fechas: fechasSeleccionadas,
          quincena: quincenaActual.id,
          observaciones: data.observaciones || '',
        };

        const result = await registroLaborService.crearMultiples(payload);

        if (result.errores && result.errores.length > 0) {
          result.errores.forEach((error) => toast.error(error));
        }

        toast.success(result.message);
      } else {
        // Labores por UNIDAD/HECTÁREA/METRO: crear un registro
        
        // Obtener la fecha desde fechasSeleccionadas
        const fecha = fechasSeleccionadas.length > 0 ? fechasSeleccionadas[0] : null;
        
        if (!fecha) {
          toast.error('Seleccione una fecha');
          return;
        }
        
        if (!data.cantidad) {
          toast.error('Ingrese la cantidad');
          return;
        }
        
        const payload = {
          trabajador: data.trabajador,
          labor: data.labor,
          fecha: fecha,
          cantidad: data.cantidad,
          quincena: quincenaActual.id,
          observaciones: data.observaciones || '',
        };

        await registroLaborService.create(payload);
        toast.success('Registro creado correctamente');
      }

      // Recargar registros
      if (trabajadorWatch && quincenaActual) {
        await loadRegistrosByTrabajadorQuincena(trabajadorWatch, quincenaActual.id);
      }
      
      // Limpiar formulario
      reset({
        trabajador: data.trabajador,
        labor: '',
        cantidad: '',
        observaciones: '',
      });
      setFechasSeleccionadas([]);
      setLaborSeleccionada(null);
      setEsTipoDia(false);
      setEsDesmache(false);
    } catch (error) {
      console.error('Error al crear registro:', error);
      if (error.response?.data) {
        const errorData = error.response.data;
        Object.values(errorData).forEach((err) => {
          toast.error(Array.isArray(err) ? err[0] : err);
        });
      } else {
        toast.error('Error al crear registro');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await registroLaborService.delete(id);
      toast.success('Registro eliminado correctamente');

      // Recargar registros - usar el trabajador del filtro O del formulario
      const trabajadorParaRecargar = trabajadorFiltro || trabajadorWatch;
      if (trabajadorParaRecargar && quincenaActual) {
        await loadRegistrosByTrabajadorQuincena(trabajadorParaRecargar, quincenaActual.id);
      }

      setConfirmDelete({ isOpen: false, id: null });
    } catch (error) {
      console.error('Error al eliminar registro:', error);
      toast.error('Error al eliminar registro');
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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Registro de Labores</h1>
          {quincenaActual && (
            <p className="text-gray-600">
              Quincena {quincenaActual.numero} - Mes {quincenaActual.mes}/{quincenaActual.año}
            </p>
          )}
        </div>
      </div>

      <div className={`grid grid-cols-1 ${canModify() ? 'lg:grid-cols-2' : ''} gap-6`}>
        {/* IZQUIERDA: Formulario - solo para roles con permisos de modificación */}
        {canModify() && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Agregar Registro
          </h2>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Finca */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Finca *
              </label>
              <select
                value={fincaSeleccionada}
                onChange={(e) => {
                  setFincaSeleccionada(e.target.value);
                  setValue('trabajador', '');
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Seleccione una finca...</option>
                {fincas.map((finca) => (
                  <option key={finca.id} value={finca.id}>
                    {finca.nombre}
                  </option>
                ))}
              </select>
            </div>

            {/* Trabajador */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Trabajador *
              </label>
              <select
                {...register('trabajador', { required: true })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={!fincaSeleccionada}
              >
                <option value="">Seleccione...</option>
                {trabajadores.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nombre_completo}
                  </option>
                ))}
              </select>
            </div>

            {/* Labor */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Labor *
              </label>
              <select
                {...register('labor', { required: true })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Seleccione...</option>
                {labores.map((labor) => (
                  <option key={labor.id} value={labor.id}>
                    {labor.nombre}
                  </option>
                ))}
              </select>
              {laborSeleccionada && (
                <p className="mt-1 text-xs text-gray-500">
                  Unidad: {laborSeleccionada.unidad_medida_info?.nombre_display}
                </p>
              )}
            </div>

            {/* Fecha o Fechas según tipo de labor */}
            {laborSeleccionada && (
              <MultipleDatePicker
                quincena={quincenaActual}
                onSelectionChange={setFechasSeleccionadas}
                registrosExistentes={registrosExistentes}
                registrosDetallados={registrosDetallados}
                laborActualNombre={laborSeleccionada?.nombre || ''}
                singleSelection={!esTipoDia && !esDesmache}
              />
            )}

            {/* Cantidad (para labores no-día y para Desmache) */}
            {(!esTipoDia || esDesmache) && laborSeleccionada && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {esDesmache ? 'Cantidad Total (hectáreas) *' : 'Cantidad *'}
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  {...register('cantidad', {
                    required: !esTipoDia || esDesmache,
                    pattern: {
                      value: /^\d+(\.\d{1,4})?$/,
                      message: 'Ingrese un número válido (ej: 1, 1.5, 2.2654)'
                    }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={esDesmache ? 'Ej: 2.2654 (total de hectáreas en los días seleccionados)' : 'Ingrese la cantidad'}
                  onWheel={(e) => e.target.blur()}
                />
                {esDesmache && fechasSeleccionadas.length > 0 && (
                  <p className="mt-1 text-xs text-gray-500">
                    Se repartirá entre {fechasSeleccionadas.length} día{fechasSeleccionadas.length > 1 ? 's' : ''} seleccionado{fechasSeleccionadas.length > 1 ? 's' : ''}
                  </p>
                )}
                {errors.cantidad && (
                  <span className="text-red-500 text-sm mt-1">{errors.cantidad.message}</span>
                )}
              </div>
            )}

            {/* Observaciones */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Observaciones
              </label>
              <textarea
                {...register('observaciones')}
                rows="2"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Botón */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400"
            >
              {submitting ? (
                <>
                  <LoadingSpinner size="sm" />
                  Guardando...
                </>
              ) : (
                <>
                  <Plus className="w-5 h-5" />
                  Agregar Registro
                </>
              )}
            </button>
          </form>
        </div>
        )}

        {/* DERECHA: Registros de la Quincena */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Registros de la Quincena
          </h2>

          {/* Filtro de trabajador */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Filtrar por Trabajador
            </label>
            <select
              value={trabajadorFiltro}
              onChange={(e) => setTrabajadorFiltro(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Seleccione un trabajador...</option>
              {trabajadores.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nombre_completo}
                </option>
              ))}
            </select>
          </div>

          {/* Lista de registros */}
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {registros.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                No hay registros para este trabajador en esta quincena
              </p>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Fecha
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Labor
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Cantidad
                    </th>
                    {canModify() && (
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Acción
                    </th>
                    )}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {registros.map((registro) => (
                    <tr key={registro.id} className="hover:bg-gray-50">
                      <td className="px-3 py-2 text-sm text-gray-900">
                        {new Date(registro.fecha + 'T00:00:00').toLocaleDateString('es-ES', {
                          day: '2-digit',
                          month: '2-digit',
                        })}
                      </td>
                      <td className="px-3 py-2 text-sm text-gray-900">
                        {registro.labor_info?.nombre}
                      </td>
                      <td className="px-3 py-2 text-sm text-gray-900">
                        {registro.cantidad} {registro.labor_info?.unidad_medida_info?.simbolo}
                      </td>
                      {canModify() && (
                      <td className="px-3 py-2 text-sm">
                        <button
                          onClick={() => setConfirmDelete({ isOpen: true, id: registro.id })}
                          className="text-red-600 hover:text-red-900"
                          title="Eliminar"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        isOpen={confirmDelete.isOpen}
        onClose={() => setConfirmDelete({ isOpen: false, id: null })}
        onConfirm={() => handleDelete(confirmDelete.id)}
        title="Eliminar Registro"
        message="¿Está seguro que desea eliminar este registro?"
        type="danger"
      />
    </div>
  );
}