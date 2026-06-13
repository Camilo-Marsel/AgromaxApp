// frontend/src/pages/Registros/RegistroLabores.jsx

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import registroLaborService from '../../services/registroLaborService';
import trabajadorService from '../../services/trabajadorService';
import laborService from '../../services/laborService';
import laborInsumoService from '../../services/laborInsumoService';
import quincenaService from '../../services/quincenaService';
import fincaService from '../../services/fincaService';
import loteService from '../../services/loteService';
import inventarioService from '../../services/inventarioService';
import LoadingSpinner from '../../components/Common/LoadingSpinner';
import ConfirmDialog from '../../components/Common/ConfirmDialog';
import MultipleDatePicker from '../../components/Common/MultipleDatePicker';
import toast from 'react-hot-toast';
import { Plus, Trash2, Calendar, Package } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

const COLORES_CINTA = [
  { value: 'ROJO', label: 'Rojo' },
  { value: 'VERDE', label: 'Verde' },
  { value: 'AZUL', label: 'Azul' },
  { value: 'AMARILLO', label: 'Amarillo' },
  { value: 'NEGRO', label: 'Negro' },
  { value: 'BLANCO', label: 'Blanco' },
  { value: 'NARANJA', label: 'Naranja' },
  { value: 'MORADO', label: 'Morado' },
  { value: 'ROSADO', label: 'Rosado' },
  { value: 'CAFE', label: 'Café' },
];

// Modal para confirmar/ajustar el movimiento de inventario propuesto
function MovimientoProposalModal({ proposal, onConfirm, onSkip }) {
  const [cantidad, setCantidad] = useState(proposal.cantidadPropuesta);
  const [submitting, setSubmitting] = useState(false);

  const handleConfirm = async () => {
    setSubmitting(true);
    try {
      await onConfirm(parseFloat(cantidad));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-blue-100 rounded-full">
            <Package className="w-5 h-5 text-blue-600" />
          </div>
          <h2 className="text-lg font-semibold">Movimiento de Inventario</h2>
        </div>

        <p className="text-sm text-gray-600 mb-4">
          La labor <strong>{proposal.laborNombre}</strong> consume insumos de bodega.
          Se propone la siguiente salida:
        </p>

        <div className="bg-gray-50 rounded-md p-3 mb-4 text-sm space-y-1">
          <div className="flex justify-between">
            <span className="text-gray-500">Producto:</span>
            <span className="font-medium">{proposal.productoNombre}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Bodega:</span>
            <span className="font-medium">{proposal.bodegaNombre || '—'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Labor registrada:</span>
            <span className="font-medium">{proposal.cantidadLabor} unidades</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Factor:</span>
            <span className="font-medium">÷ {proposal.factor}</span>
          </div>
          {proposal.esAproximado && (
            <p className="text-amber-600 text-xs mt-1">* Conversión aproximada</p>
          )}
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Cantidad a descontar de bodega
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={cantidad}
              onChange={(e) => setCantidad(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-500">{proposal.unidadProducto}</span>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleConfirm}
            disabled={submitting || !cantidad || parseFloat(cantidad) <= 0}
            className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400 text-sm font-medium"
          >
            {submitting ? 'Registrando...' : 'Confirmar salida'}
          </button>
          <button
            onClick={onSkip}
            className="flex-1 border border-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-50 text-sm"
          >
            Omitir
          </button>
        </div>
      </div>
    </div>
  );
}

export default function RegistroLabores() {
  const { canModify } = useAuth();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Datos maestros
  const [fincas, setFincas] = useState([]);
  const [trabajadores, setTrabajadores] = useState([]);
  const [labores, setLabores] = useState([]);
  const [quincenaActual, setQuincenaActual] = useState(null);
  const [lotes, setLotes] = useState([]);

  // Filtros
  const [fincaSeleccionada, setFincaSeleccionada] = useState('');
  const [fincaData, setFincaData] = useState(null);
  const [trabajadorFiltro, setTrabajadorFiltro] = useState('');

  // Registros
  const [registros, setRegistros] = useState([]);
  const [registrosExistentes, setRegistrosExistentes] = useState([]);
  const [registrosDetallados, setRegistrosDetallados] = useState([]);

  // Comportamiento dinámico
  const [laborSeleccionada, setLaborSeleccionada] = useState(null);
  const [laborInsumo, setLaborInsumo] = useState(null);
  const [esTipoDia, setEsTipoDia] = useState(false);
  const [esDesmache, setEsDesmache] = useState(false);
  const [fechasSeleccionadas, setFechasSeleccionadas] = useState([]);

  // Modal de propuesta de movimiento
  const [movimientoProposal, setMovimientoProposal] = useState(null);

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
      const finca = fincas.find((f) => f.id === parseInt(fincaSeleccionada));
      setFincaData(finca || null);
      loadTrabajadoresByFinca(fincaSeleccionada);
      loadLotesByFinca(fincaSeleccionada);
    } else {
      setTrabajadores([]);
      setLotes([]);
      setFincaData(null);
    }
  }, [fincaSeleccionada]);

  useEffect(() => {
    if (laborWatch) {
      const labor = labores.find((l) => l.id === parseInt(laborWatch));
      setLaborSeleccionada(labor);
      setLaborInsumo(null);

      if (labor) {
        // Detect tipo-día labors
        const laboresTipoDia = [
          'Día Básico', 'Embarque', 'Resiembra', 'Fumigación', 'Repique',
          'Permiso Remunerado', 'Permiso No Remunerado', 'Ausencia No Justificada',
          'Incapacidad Médica', 'Oficios Varios', 'Desmache',
        ];
        setEsTipoDia(laboresTipoDia.includes(labor.nombre));
        setEsDesmache(labor.nombre === 'Desmache');

        // Load LaborInsumo config for this labor
        laborInsumoService.getByLabor(labor.id).then((data) => {
          const items = data.results || data;
          setLaborInsumo(items.length > 0 ? items[0] : null);
        }).catch(() => {});
      }

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
      const [fincasData, laboresData, quincenaData] = await Promise.all([
        fincaService.getAll(),
        laborService.getAll(),
        quincenaService.crearActual(),
      ]);
      setFincas(fincasData.results || fincasData);
      setLabores(laboresData.results || laboresData);
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
    } catch {
      toast.error('Error al cargar trabajadores');
    }
  };

  const loadLotesByFinca = async (fincaId) => {
    try {
      const data = await loteService.getByFinca(fincaId);
      setLotes(data.results || data);
    } catch {
      setLotes([]);
    }
  };

  const loadRegistrosByTrabajadorQuincena = async (trabajadorId, quincenaId) => {
    try {
      const data = await registroLaborService.getByTrabajadorQuincena(trabajadorId, quincenaId);
      const registrosArray = data.results || data;
      setRegistros(registrosArray);
      setRegistrosDetallados(registrosArray.map((r) => ({
        fecha: r.fecha,
        labor_nombre: r.labor_info?.nombre || '',
      })));
      setRegistrosExistentes(registrosArray.map((r) => r.fecha));
    } catch {
      toast.error('Error al cargar registros');
    }
  };

  const proposerMovimiento = (registroCreado, cantidadLabor, fecha) => {
    if (!laborInsumo || !fincaData) return null;
    const cantidadPropuesta = parseFloat(
      (parseFloat(cantidadLabor) / parseFloat(laborInsumo.factor)).toFixed(2)
    );
    return {
      registroId: registroCreado.id,
      laborNombre: laborSeleccionada?.nombre,
      productoNombre: laborInsumo.producto_nombre,
      productoId: laborInsumo.producto,
      bodegaId: fincaData.bodega,
      bodegaNombre: fincaData.bodega_nombre || '—',
      unidadProducto: laborInsumo.unidad_display || '',
      cantidadLabor,
      factor: laborInsumo.factor,
      esAproximado: laborInsumo.es_aproximado,
      cantidadPropuesta,
      fecha,
      trabajadorId: trabajadorWatch,
    };
  };

  const confirmarMovimiento = async (cantidad) => {
    if (!movimientoProposal) return;
    try {
      await inventarioService.registrarMovimiento({
        tipo: 'SALIDA',
        bodega: movimientoProposal.bodegaId,
        producto: movimientoProposal.productoId,
        cantidad,
        fecha_consumo: movimientoProposal.fecha,
        trabajador: movimientoProposal.trabajadorId,
        referencia_tipo: 'RegistroLabor',
        referencia_id: movimientoProposal.registroId,
        notas: `Auto: ${movimientoProposal.laborNombre}`,
      });
      toast.success('Salida de bodega registrada');
    } catch (err) {
      const msg = err.response?.data;
      const text = msg ? (typeof msg === 'string' ? msg : JSON.stringify(msg)) : 'Error al registrar movimiento';
      toast.error(text);
    } finally {
      setMovimientoProposal(null);
    }
  };

  const onSubmit = async (data) => {
    try {
      setSubmitting(true);

      if (esDesmache) {
        if (fechasSeleccionadas.length === 0) { toast.error('Seleccione al menos una fecha'); return; }
        if (!data.cantidad) { toast.error('Ingrese la cantidad total de hectáreas'); return; }

        const payload = {
          trabajador: data.trabajador,
          labor: data.labor,
          fechas: fechasSeleccionadas,
          quincena: quincenaActual.id,
          observaciones: data.observaciones || '',
          cantidad_total: data.cantidad,
          lote: data.lote || null,
          color_cinta: data.color_cinta || '',
        };
        const result = await registroLaborService.crearMultiples(payload);
        if (result.errores?.length > 0) result.errores.forEach((e) => toast.error(e));
        toast.success(result.message);

      } else if (esTipoDia) {
        if (fechasSeleccionadas.length === 0) { toast.error('Seleccione al menos una fecha'); return; }

        const payload = {
          trabajador: data.trabajador,
          labor: data.labor,
          fechas: fechasSeleccionadas,
          quincena: quincenaActual.id,
          observaciones: data.observaciones || '',
          lote: data.lote || null,
          color_cinta: data.color_cinta || '',
        };
        const result = await registroLaborService.crearMultiples(payload);
        if (result.errores?.length > 0) result.errores.forEach((e) => toast.error(e));
        toast.success(result.message);

      } else {
        const fecha = fechasSeleccionadas.length > 0 ? fechasSeleccionadas[0] : null;
        if (!fecha) { toast.error('Seleccione una fecha'); return; }
        if (!data.cantidad) { toast.error('Ingrese la cantidad'); return; }

        const payload = {
          trabajador: data.trabajador,
          labor: data.labor,
          fecha,
          cantidad: data.cantidad,
          quincena: quincenaActual.id,
          observaciones: data.observaciones || '',
          lote: data.lote || null,
          color_cinta: data.color_cinta || '',
        };
        const registro = await registroLaborService.create(payload);
        toast.success('Registro creado correctamente');

        // Propose inventory movement if labor has LaborInsumo
        if (laborInsumo && fincaData?.bodega) {
          const proposal = proposerMovimiento(registro, data.cantidad, fecha);
          if (proposal) {
            setMovimientoProposal(proposal);
          }
        }
      }

      if (trabajadorWatch && quincenaActual) {
        await loadRegistrosByTrabajadorQuincena(trabajadorWatch, quincenaActual.id);
      }

      reset({
        trabajador: data.trabajador,
        labor: '',
        cantidad: '',
        observaciones: '',
        lote: '',
        color_cinta: '',
      });
      setFechasSeleccionadas([]);
      setLaborSeleccionada(null);
      setLaborInsumo(null);
      setEsTipoDia(false);
      setEsDesmache(false);
    } catch (error) {
      console.error('Error al crear registro:', error);
      if (error.response?.data) {
        Object.values(error.response.data).forEach((err) => {
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
      const trabajadorParaRecargar = trabajadorFiltro || trabajadorWatch;
      if (trabajadorParaRecargar && quincenaActual) {
        await loadRegistrosByTrabajadorQuincena(trabajadorParaRecargar, quincenaActual.id);
      }
      setConfirmDelete({ isOpen: false, id: null });
    } catch {
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

  const esControl = laborSeleccionada?.nombre === 'Control';

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
        {/* IZQUIERDA: Formulario */}
        {canModify() && (
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Agregar Registro
            </h2>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* Finca */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Finca *</label>
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
                {fincaData && !fincaData.bodega && (
                  <p className="mt-1 text-xs text-amber-600">
                    Esta finca no tiene bodega asignada. El movimiento de inventario no se podrá registrar.
                  </p>
                )}
              </div>

              {/* Trabajador */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Trabajador *</label>
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Labor *</label>
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
                    {laborInsumo && (
                      <span className="ml-2 text-blue-600">
                        · Consume: {laborInsumo.producto_nombre}
                      </span>
                    )}
                  </p>
                )}
              </div>

              {/* Fecha(s) */}
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

              {/* Cantidad */}
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
                        message: 'Ingrese un número válido (ej: 1, 1.5, 2.2654)',
                      },
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder={
                      esDesmache
                        ? 'Ej: 2.2654 (total de hectáreas en los días seleccionados)'
                        : 'Ingrese la cantidad'
                    }
                    onWheel={(e) => e.target.blur()}
                  />
                  {esDesmache && fechasSeleccionadas.length > 0 && (
                    <p className="mt-1 text-xs text-gray-500">
                      Se repartirá entre {fechasSeleccionadas.length} día
                      {fechasSeleccionadas.length > 1 ? 's' : ''} seleccionado
                      {fechasSeleccionadas.length > 1 ? 's' : ''}
                    </p>
                  )}
                  {errors.cantidad && (
                    <span className="text-red-500 text-sm mt-1">{errors.cantidad.message}</span>
                  )}
                </div>
              )}

              {/* Lote — solo si la labor tiene LaborInsumo configurado */}
              {laborInsumo && lotes.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Lote <span className="text-gray-400 font-normal">(opcional)</span>
                  </label>
                  <select
                    {...register('lote')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Sin lote</option>
                    {lotes.map((lote) => (
                      <option key={lote.id} value={lote.id}>
                        {lote.nombre}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Color de Cinta — solo para labor Control */}
              {esControl && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Color de Cinta <span className="text-gray-400 font-normal">(opcional)</span>
                  </label>
                  <select
                    {...register('color_cinta')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Sin color</option>
                    {COLORES_CINTA.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
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
                        {registro.color_cinta && (
                          <span className="ml-1 text-xs text-gray-400">
                            · {registro.color_cinta_display || registro.color_cinta}
                          </span>
                        )}
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

      {/* Movimiento de Inventario Proposal Modal */}
      {movimientoProposal && (
        <MovimientoProposalModal
          proposal={movimientoProposal}
          onConfirm={confirmarMovimiento}
          onSkip={() => setMovimientoProposal(null)}
        />
      )}
    </div>
  );
}
