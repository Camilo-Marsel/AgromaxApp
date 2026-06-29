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
  { value: 'MORADA',   label: 'Morada' },
  { value: 'CAFE',     label: 'Café' },
  { value: 'NEGRA',    label: 'Negra' },
  { value: 'NARANJA',  label: 'Naranja' },
  { value: 'VERDE',    label: 'Verde' },
  { value: 'AMARILLO', label: 'Amarillo' },
  { value: 'BLANCA',   label: 'Blanca' },
  { value: 'AZUL',     label: 'Azul' },
  { value: 'HABANO',   label: 'Habano' },
  { value: 'GRIS',     label: 'Gris' },
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
  const [esFumigacion, setEsFumigacion] = useState(false);
  const [fechasSeleccionadas, setFechasSeleccionadas] = useState([]);

  // Agroquímicos para Fumigación al Día
  const [agroquimicosDisponibles, setAgroquimicosDisponibles] = useState([]);
  const [filasAgroquimicos, setFilasAgroquimicos] = useState([]);

  // Filas multi-entrada para Embolse
  const [filasEmbolse, setFilasEmbolse] = useState([]);

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
        // Normaliza tildes/mayúsculas para comparar nombres de labor
        const normalizar = (s) => s?.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
        const nombreNorm = normalizar(labor.nombre);
        const esFumig = nombreNorm.includes('fumigac') && nombreNorm.includes('dia');
        setEsTipoDia(laboresTipoDia.some((l) => normalizar(l) === nombreNorm) || esFumig);
        setEsDesmache(nombreNorm === normalizar('Desmache'));
        setEsFumigacion(esFumig);

        // Load LaborInsumo config for this labor
        laborInsumoService.getByLabor(labor.id).then((data) => {
          const items = data.results || data;
          setLaborInsumo(items.length > 0 ? items[0] : null);
        }).catch(() => {});

        // Cargar agroquímicos disponibles para Fumigación al Día
        if (esFumig && fincaData?.bodega) {
          inventarioService.getStocks({ bodega: fincaData.bodega, producto__categoria: 'AGROQUIMICOS' })
            .then((data) => {
              const items = data.results || data;
              setAgroquimicosDisponibles(items);
              setFilasAgroquimicos([{ uid: Date.now(), stockFincaId: '', cantidad: '' }]);
            }).catch(() => {});
        } else {
          setAgroquimicosDisponibles([]);
          setFilasAgroquimicos([]);
        }
      } else {
        setEsFumigacion(false);
        setAgroquimicosDisponibles([]);
        setFilasAgroquimicos([]);
      }

      setFechasSeleccionadas([]);

      // Inicializar fila vacía si es Embolse
      if (labor?.nombre === 'Embolse') {
        setFilasEmbolse([{ uid: Date.now(), cantidad: '', color_cinta: '', lote: '' }]);
      } else {
        setFilasEmbolse([]);
      }
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

  // Registra un movimiento de salida de bodega usando el stock_finca correcto
  const registrarSalidaBodega = async ({ stockFincaId, cantidad, fecha, registroId, laborNombre, trabajadorId }) => {
    try {
      await inventarioService.registrarMovimiento({
        tipo: 'SALIDA',
        stock_finca: stockFincaId,
        cantidad,
        fecha,
        fecha_consumo: fecha,
        trabajador: trabajadorId,
        referencia_tipo: 'RegistroLabor',
        referencia_id: registroId,
        observaciones: `Auto: ${laborNombre}`,
      });
    } catch (err) {
      const msg = err.response?.data;
      const text = msg ? (typeof msg === 'string' ? msg : JSON.stringify(msg)) : 'Error al registrar salida de bodega';
      toast.error(text);
    }
  };

  // Descuenta automáticamente el insumo asociado a la labor (ej. pitas)
  const autoDescontarInsumoLabor = async (registroCreado, cantidadLabor, fecha) => {
    if (!laborInsumo || !fincaData?.bodega) return;
    const cantidadPropuesta = parseFloat(
      (parseFloat(cantidadLabor) / parseFloat(laborInsumo.factor)).toFixed(2)
    );
    // Buscar el stock_finca que une este producto con la bodega de la finca
    try {
      const stocks = await inventarioService.getStocks({
        bodega: fincaData.bodega,
        producto: laborInsumo.producto,
      });
      const items = stocks.results || stocks;
      if (!items.length) { toast.error('No se encontró stock del insumo en la bodega'); return; }
      await registrarSalidaBodega({
        stockFincaId: items[0].id,
        cantidad: cantidadPropuesta,
        fecha,
        registroId: registroCreado.id,
        laborNombre: laborSeleccionada?.nombre,
        trabajadorId: trabajadorWatch,
      });
      toast.success(`Salida de bodega registrada: ${cantidadPropuesta} de ${laborInsumo.producto_nombre}`);
    } catch {
      toast.error('Error al buscar stock del insumo');
    }
  };

  // Descuenta agroquímicos seleccionados manualmente en Fumigación al Día
  const descontarAgroquimicos = async (registroId, fecha) => {
    const filas = filasAgroquimicos.filter((f) => f.stockFincaId && parseFloat(f.cantidad) > 0);
    if (!filas.length) return;
    await Promise.all(filas.map((f) =>
      registrarSalidaBodega({
        stockFincaId: f.stockFincaId,
        cantidad: parseFloat(f.cantidad),
        fecha,
        registroId,
        laborNombre: 'Fumigación al Día',
        trabajadorId: trabajadorWatch,
      })
    ));
    if (filas.length) toast.success(`${filas.length} agroquímico(s) descontados de bodega`);
  };

  // ── Helpers multi-fila Agroquímicos ────────────────────────────────────
  const agregarFilaAgroquimico = () =>
    setFilasAgroquimicos((prev) => [...prev, { uid: Date.now(), stockFincaId: '', cantidad: '' }]);

  const eliminarFilaAgroquimico = (uid) =>
    setFilasAgroquimicos((prev) => prev.filter((f) => f.uid !== uid));

  const updateFilaAgroquimico = (uid, field, value) =>
    setFilasAgroquimicos((prev) => prev.map((f) => f.uid === uid ? { ...f, [field]: value } : f));

  // ── Helpers multi-fila Embolse ──────────────────────────────────────────
  const agregarFilaEmbolse = () => {
    setFilasEmbolse((prev) => [
      ...prev,
      { uid: Date.now(), cantidad: '', color_cinta: '', lote: '' },
    ]);
  };

  const eliminarFilaEmbolse = (uid) => {
    setFilasEmbolse((prev) => prev.filter((f) => f.uid !== uid));
  };

  const updateFilaEmbolse = (uid, field, value) => {
    setFilasEmbolse((prev) =>
      prev.map((f) => (f.uid === uid ? { ...f, [field]: value } : f))
    );
  };

  const validarFilasEmbolse = (fecha) => {
    // Todos con cantidad
    for (let i = 0; i < filasEmbolse.length; i++) {
      if (!filasEmbolse[i].cantidad || parseFloat(filasEmbolse[i].cantidad) <= 0) {
        toast.error(`Fila ${i + 1}: ingresa una cantidad válida`);
        return false;
      }
    }
    // Sin duplicados color+lote dentro de las filas
    const combos = new Set();
    for (const fila of filasEmbolse) {
      const key = `${fila.color_cinta}|${fila.lote}`;
      if (combos.has(key)) {
        toast.error('Dos filas tienen el mismo color y lote. Corrígelas antes de guardar.');
        return false;
      }
      combos.add(key);
    }
    // Sin duplicados contra registros ya guardados en BD
    for (const fila of filasEmbolse) {
      const existente = registros.find(
        (r) =>
          r.labor_info?.nombre === 'Embolse' &&
          r.fecha === fecha &&
          (r.color_cinta || '') === (fila.color_cinta || '') &&
          String(r.lote ?? '') === String(fila.lote ?? '')
      );
      if (existente) {
        const colorLabel = COLORES_CINTA.find((c) => c.value === fila.color_cinta)?.label || 'Sin color';
        const loteLabel = lotes.find((l) => String(l.id) === String(fila.lote))?.nombre || 'Sin lote';
        toast.error(
          `Ya existe un Embolse con "${colorLabel}" en "${loteLabel}" para esta fecha (registro #${existente.id}). Elimínalo si deseas corregirlo.`,
          { duration: 6000 }
        );
        return false;
      }
    }
    return true;
  };
  // ────────────────────────────────────────────────────────────────────────

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

      } else if (esFumigacion) {
        const fecha = fechasSeleccionadas.length > 0 ? fechasSeleccionadas[0] : null;
        if (!fecha) { toast.error('Seleccione una fecha'); return; }

        const payload = {
          trabajador: data.trabajador,
          labor: data.labor,
          fecha,
          cantidad: 1,
          quincena: quincenaActual.id,
          observaciones: data.observaciones || '',
          lote: data.lote || null,
          color_cinta: '',
        };
        const registro = await registroLaborService.create(payload);
        toast.success('Registro creado correctamente');
        await descontarAgroquimicos(registro.id, fecha);

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

      } else if (esEmbolse) {
        const fecha = fechasSeleccionadas.length > 0 ? fechasSeleccionadas[0] : null;
        if (!fecha) { toast.error('Seleccione una fecha'); return; }
        if (filasEmbolse.length === 0) { toast.error('Agrega al menos una fila de embolse'); return; }
        if (!validarFilasEmbolse(fecha)) return;

        await Promise.all(
          filasEmbolse.map((fila) =>
            registroLaborService.create({
              trabajador: data.trabajador,
              labor: data.labor,
              fecha,
              cantidad: fila.cantidad,
              quincena: quincenaActual.id,
              observaciones: data.observaciones || '',
              lote: fila.lote || null,
              color_cinta: fila.color_cinta || '',
            })
          )
        );
        toast.success(
          filasEmbolse.length === 1
            ? 'Registro de Embolse creado'
            : `${filasEmbolse.length} registros de Embolse creados`
        );

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

        // Descontar insumos de bodega automáticamente (sin confirmación)
        if (esFumigacion) {
          await descontarAgroquimicos(registro.id, fecha);
        } else if (laborInsumo && fincaData?.bodega) {
          await autoDescontarInsumoLabor(registro, data.cantidad, fecha);
        }
      }

      // Recargar registros del panel derecho
      const trabajadorId = trabajadorWatch || trabajadorFiltro;
      if (trabajadorId && quincenaActual) {
        await loadRegistrosByTrabajadorQuincena(trabajadorId, quincenaActual.id);
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
      setFilasEmbolse([]);
    } catch (error) {
      console.error('Error al crear registro:', error);
      // Recargar de todos modos para reflejar lo que sí se guardó
      const trabajadorId = trabajadorWatch || trabajadorFiltro;
      if (trabajadorId && quincenaActual) {
        loadRegistrosByTrabajadorQuincena(trabajadorId, quincenaActual.id);
      }
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

  const esEmbolse = laborSeleccionada?.nombre === 'Embolse';

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
                  singleSelection={(!esTipoDia && !esDesmache) || esFumigacion}
                />
              )}

              {/* Cantidad — solo para labores no-Embolse */}
              {(!esTipoDia || esDesmache) && !esFumigacion && laborSeleccionada && !esEmbolse && (
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

              {/* Lote — labores con LaborInsumo o que requieren trazabilidad de lote */}
              {!esEmbolse && (laborInsumo || laborSeleccionada?.nombre === 'Amarre 3 pitas vieja') && lotes.length > 0 && (
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

              {/* ── EMBOLSE: tabla multi-fila ─────────────────────────────── */}
              {esEmbolse && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-sm font-medium text-gray-700">
                      Embolses <span className="text-gray-400 font-normal">(cantidad · color · lote)</span>
                    </label>
                    <button
                      type="button"
                      onClick={agregarFilaEmbolse}
                      className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium"
                    >
                      <Plus className="w-3.5 h-3.5" /> Agregar fila
                    </button>
                  </div>

                  <div className="border border-gray-200 rounded-md overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-2 py-2 text-left text-xs text-gray-500 font-medium w-20">Cant. *</th>
                          <th className="px-2 py-2 text-left text-xs text-gray-500 font-medium">Color cinta</th>
                          <th className="px-2 py-2 text-left text-xs text-gray-500 font-medium">Lote</th>
                          <th className="w-8"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {filasEmbolse.map((fila, idx) => (
                          <tr key={fila.uid} className="bg-white">
                            <td className="px-2 py-1.5">
                              <input
                                type="text"
                                inputMode="decimal"
                                value={fila.cantidad}
                                onChange={(e) => updateFilaEmbolse(fila.uid, 'cantidad', e.target.value)}
                                className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                                placeholder="0"
                              />
                            </td>
                            <td className="px-2 py-1.5">
                              <select
                                value={fila.color_cinta}
                                onChange={(e) => updateFilaEmbolse(fila.uid, 'color_cinta', e.target.value)}
                                className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                              >
                                <option value="">Sin color</option>
                                {COLORES_CINTA.map((c) => (
                                  <option key={c.value} value={c.value}>{c.label}</option>
                                ))}
                              </select>
                            </td>
                            <td className="px-2 py-1.5">
                              <select
                                value={fila.lote}
                                onChange={(e) => updateFilaEmbolse(fila.uid, 'lote', e.target.value)}
                                className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                              >
                                <option value="">Sin lote</option>
                                {lotes.map((lote) => (
                                  <option key={lote.id} value={lote.id}>{lote.nombre}</option>
                                ))}
                              </select>
                            </td>
                            <td className="px-1 py-1.5 text-center">
                              {filasEmbolse.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => eliminarFilaEmbolse(fila.uid)}
                                  className="text-red-400 hover:text-red-600"
                                  title="Eliminar fila"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {filasEmbolse.length > 1 && (
                    <p className="text-xs text-gray-400">
                      Total: {filasEmbolse.reduce((s, f) => s + (parseFloat(f.cantidad) || 0), 0).toFixed(2)} unidades en {filasEmbolse.length} filas
                    </p>
                  )}
                </div>
              )}
              {/* ── Agroquímicos para Fumigación al Día ───────────────────── */}
              {esFumigacion && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-sm font-medium text-gray-700">
                      Agroquímicos usados <span className="text-gray-400 font-normal">(producto · litros)</span>
                    </label>
                    <button
                      type="button"
                      onClick={agregarFilaAgroquimico}
                      className="flex items-center gap-1 text-xs text-green-600 hover:text-green-800 font-medium"
                    >
                      <Plus className="w-3.5 h-3.5" /> Agregar producto
                    </button>
                  </div>

                  {agroquimicosDisponibles.length === 0 ? (
                    <p className="text-xs text-amber-600 bg-amber-50 rounded px-3 py-2">
                      No hay agroquímicos registrados en la bodega de esta finca.
                    </p>
                  ) : (
                    <div className="border border-gray-200 rounded-md overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-green-50">
                          <tr>
                            <th className="px-2 py-2 text-left text-xs text-gray-600 font-medium">Producto</th>
                            <th className="px-2 py-2 text-left text-xs text-gray-600 font-medium w-24">Litros *</th>
                            <th className="w-8"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {filasAgroquimicos.map((fila, idx) => (
                            <tr key={fila.uid} className="bg-white">
                              <td className="px-2 py-1.5">
                                <select
                                  value={fila.stockFincaId}
                                  onChange={(e) => updateFilaAgroquimico(fila.uid, 'stockFincaId', e.target.value)}
                                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-green-500"
                                >
                                  <option value="">Seleccionar...</option>
                                  {agroquimicosDisponibles.map((s) => (
                                    <option key={s.id} value={s.id}>
                                      {s.producto_nombre} ({s.stock_actual} {s.producto_unidad || 'L'} disp.)
                                    </option>
                                  ))}
                                </select>
                              </td>
                              <td className="px-2 py-1.5">
                                <input
                                  type="number"
                                  min="0"
                                  step="0.1"
                                  value={fila.cantidad}
                                  onChange={(e) => updateFilaAgroquimico(fila.uid, 'cantidad', e.target.value)}
                                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-green-500"
                                  placeholder="0.0"
                                />
                              </td>
                              <td className="px-2 py-1.5 text-center">
                                {filasAgroquimicos.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => eliminarFilaAgroquimico(fila.uid)}
                                    className="text-red-400 hover:text-red-600"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  <p className="text-xs text-gray-400">
                    Los productos se descontarán automáticamente de la bodega al guardar.
                  </p>
                </div>
              )}
              {/* ──────────────────────────────────────────────────────────── */}

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

    </div>
  );
}
