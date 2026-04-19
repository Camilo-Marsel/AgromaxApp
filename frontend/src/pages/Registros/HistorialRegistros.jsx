// frontend/src/pages/Registros/HistorialRegistros.jsx

import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { Plus, Trash2, Lock, ClipboardList, Calendar, ChevronDown, ChevronUp } from 'lucide-react';
import toast from 'react-hot-toast';

import registroLaborService from '../../services/registroLaborService';
import trabajadorService from '../../services/trabajadorService';
import laborService from '../../services/laborService';
import quincenaService from '../../services/quincenaService';
import fincaService from '../../services/fincaService';
import nominaService from '../../services/nominaService';
import { useAuth } from '../../hooks/useAuth';
import LoadingSpinner from '../../components/Common/LoadingSpinner';
import ConfirmDialog from '../../components/Common/ConfirmDialog';
import MultipleDatePicker from '../../components/Common/MultipleDatePicker';

// ─── helpers ────────────────────────────────────────────────────────────────

const MESES = [
  '', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const formatQuincena = (q) =>
  `Q${q.numero} - ${MESES[q.mes]} ${q.año}`;

const formatFecha = (iso) => {
  const [, , dd] = iso.split('-');
  return `${dd}/${iso.split('-')[1]}`;
};

const getDiasQuincena = (quincena) => {
  const dias = [];
  const fin = new Date(quincena.fecha_fin + 'T00:00:00');
  let cur = new Date(quincena.fecha_inicio + 'T00:00:00');
  while (cur <= fin) {
    dias.push(cur.toISOString().split('T')[0]);
    cur.setDate(cur.getDate() + 1);
  }
  return dias;
};

const LABORES_TIPO_DIA = [
  'Día Básico', 'Embarque', 'Resiembra', 'Fumigación', 'Repique',
  'Permiso Remunerado', 'Permiso No Remunerado', 'Ausencia No Justificada',
  'Incapacidad Médica', 'Oficios Varios', 'Desmache',
];

// ─── mini calendario ─────────────────────────────────────────────────────────

function MiniCalendario({ quincena, registros }) {
  const dias = getDiasQuincena(quincena);
  const registrosPorFecha = {};
  registros.forEach((r) => {
    if (!registrosPorFecha[r.fecha]) registrosPorFecha[r.fecha] = [];
    registrosPorFecha[r.fecha].push(r.labor_info?.nombre || '?');
  });

  const DIAS_SEMANA = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

  return (
    <div>
      <div className="grid grid-cols-7 gap-1 mb-1">
        {DIAS_SEMANA.map((d) => (
          <div key={d} className="text-center text-xs font-semibold text-gray-500">{d}</div>
        ))}
      </div>

      {/* spacer for first day of week */}
      {(() => {
        const firstDay = new Date(dias[0] + 'T00:00:00');
        // weekday: 0=Mon … 6=Sun
        const offset = (firstDay.getDay() + 6) % 7;
        const cells = [];
        for (let i = 0; i < offset; i++) cells.push(<div key={`pad-${i}`} />);
        dias.forEach((fecha) => {
          const labores = registrosPorFecha[fecha] || [];
          const tiene = labores.length > 0;
          const esDomingo = new Date(fecha + 'T00:00:00').getDay() === 0;
          cells.push(
            <div
              key={fecha}
              title={labores.join(', ')}
              className={`
                aspect-square flex flex-col items-center justify-center rounded text-xs
                ${esDomingo ? 'bg-gray-100 text-gray-400' : tiene ? 'bg-green-100 text-green-800 font-semibold' : 'bg-white border border-gray-200 text-gray-400'}
              `}
            >
              <span>{parseInt(fecha.split('-')[2])}</span>
              {tiene && <span className="text-green-600 text-[8px] leading-none">●</span>}
            </div>
          );
        });
        return <div className="grid grid-cols-7 gap-1">{cells}</div>;
      })()}

      <div className="mt-2 flex gap-3 text-xs text-gray-500">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-100 inline-block" /> Con registro</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded border border-gray-200 inline-block" /> Sin registro</span>
      </div>
    </div>
  );
}

// ─── página principal ────────────────────────────────────────────────────────

export default function HistorialRegistros() {
  const { canModify } = useAuth();

  // Maestros
  const [fincas, setFincas] = useState([]);
  const [quincenas, setQuincenas] = useState([]);
  const [trabajadores, setTrabajadores] = useState([]);
  const [labores, setLabores] = useState([]);

  // Filtros
  const [fincaId, setFincaId] = useState('');
  const [quincenaId, setQuincenaId] = useState('');
  const [trabajadorId, setTrabajadorId] = useState('');

  // Datos
  const [registros, setRegistros] = useState([]);
  const [resumen, setResumen] = useState(null);
  const [nominaEstado, setNominaEstado] = useState(null); // 'APROBADA' | 'PENDIENTE' | null
  const [quincenaObj, setQuincenaObj] = useState(null);

  // UI
  const [loading, setLoading] = useState(true);
  const [loadingRegistros, setLoadingRegistros] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState({ isOpen: false, id: null });

  // Form add
  const [laborSeleccionada, setLaborSeleccionada] = useState(null);
  const [esTipoDia, setEsTipoDia] = useState(false);
  const [esDesmache, setEsDesmache] = useState(false);
  const [fechasSeleccionadas, setFechasSeleccionadas] = useState([]);
  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm();
  const laborWatch = watch('labor');

  // ── efectos ─────────────────────────────────────────────────────────────

  useEffect(() => {
    const loadMaestros = async () => {
      try {
        const [fincasData, quincenasData, laboresData] = await Promise.all([
          fincaService.getAll(),
          quincenaService.getAll(),
          laborService.getAll(),
        ]);
        setFincas(fincasData.results || fincasData);
        setQuincenas(quincenasData.results || quincenasData);
        setLabores(laboresData.results || laboresData);
      } catch {
        toast.error('Error al cargar datos');
      } finally {
        setLoading(false);
      }
    };
    loadMaestros();
  }, []);

  useEffect(() => {
    if (!fincaId) { setTrabajadores([]); setTrabajadorId(''); return; }
    trabajadorService.getAll({ finca: fincaId })
      .then((d) => setTrabajadores(d.results || d))
      .catch(() => toast.error('Error al cargar trabajadores'));
    setTrabajadorId('');
  }, [fincaId]);

  useEffect(() => {
    setQuincenaObj(quincenas.find((q) => q.id === parseInt(quincenaId)) || null);
  }, [quincenaId, quincenas]);

  useEffect(() => {
    if (!laborWatch) return;
    const labor = labores.find((l) => l.id === parseInt(laborWatch));
    setLaborSeleccionada(labor || null);
    setEsTipoDia(labor ? LABORES_TIPO_DIA.includes(labor.nombre) : false);
    setEsDesmache(labor ? labor.nombre === 'Desmache' : false);
    setFechasSeleccionadas([]);
  }, [laborWatch, labores]);

  const cargarDatos = useCallback(async () => {
    if (!trabajadorId || !quincenaId) return;
    setLoadingRegistros(true);
    try {
      const [regs, res, nominas] = await Promise.all([
        registroLaborService.getByTrabajadorQuincena(trabajadorId, quincenaId),
        registroLaborService.getResumen(trabajadorId, quincenaId),
        nominaService.getAll({ trabajador: trabajadorId, quincena: quincenaId }),
      ]);
      setRegistros(regs.results || regs);
      setResumen(res);
      const nominasArr = nominas.results || nominas;
      setNominaEstado(nominasArr.length > 0 ? nominasArr[0].estado : null);
    } catch {
      toast.error('Error al cargar registros');
    } finally {
      setLoadingRegistros(false);
    }
  }, [trabajadorId, quincenaId]);

  useEffect(() => {
    if (trabajadorId && quincenaId) cargarDatos();
    else { setRegistros([]); setResumen(null); setNominaEstado(null); }
  }, [trabajadorId, quincenaId, cargarDatos]);

  // ── acciones ─────────────────────────────────────────────────────────────

  const nominaAprobada = nominaEstado === 'APROBADA';
  const canEdit = canModify() && !nominaAprobada;

  const handleDelete = async (id) => {
    try {
      await registroLaborService.delete(id);
      toast.success('Registro eliminado');
      setConfirmDelete({ isOpen: false, id: null });
      cargarDatos();
    } catch {
      toast.error('Error al eliminar registro');
    }
  };

  const onSubmit = async (data) => {
    try {
      setSubmitting(true);

      if (esDesmache) {
        if (!fechasSeleccionadas.length) return toast.error('Seleccione al menos una fecha');
        if (!data.cantidad) return toast.error('Ingrese la cantidad total de hectáreas');
        const result = await registroLaborService.crearMultiples({
          trabajador: trabajadorId,
          labor: data.labor,
          fechas: fechasSeleccionadas,
          quincena: quincenaId,
          observaciones: data.observaciones || '',
          cantidad_total: data.cantidad,
        });
        result.errores?.forEach((e) => toast.error(e));
        toast.success(result.message);
      } else if (esTipoDia) {
        if (!fechasSeleccionadas.length) return toast.error('Seleccione al menos una fecha');
        const result = await registroLaborService.crearMultiples({
          trabajador: trabajadorId,
          labor: data.labor,
          fechas: fechasSeleccionadas,
          quincena: quincenaId,
          observaciones: data.observaciones || '',
        });
        result.errores?.forEach((e) => toast.error(e));
        toast.success(result.message);
      } else {
        const fecha = fechasSeleccionadas[0];
        if (!fecha) return toast.error('Seleccione una fecha');
        if (!data.cantidad) return toast.error('Ingrese la cantidad');
        await registroLaborService.create({
          trabajador: trabajadorId,
          labor: data.labor,
          fecha,
          cantidad: data.cantidad,
          quincena: quincenaId,
          observaciones: data.observaciones || '',
        });
        toast.success('Registro creado correctamente');
      }

      reset({ labor: '', cantidad: '', observaciones: '' });
      setFechasSeleccionadas([]);
      setLaborSeleccionada(null);
      setEsTipoDia(false);
      setEsDesmache(false);
      cargarDatos();
    } catch (error) {
      const errData = error.response?.data;
      if (errData) Object.values(errData).forEach((e) => toast.error(Array.isArray(e) ? e[0] : e));
      else toast.error('Error al crear registro');
    } finally {
      setSubmitting(false);
    }
  };

  // ── render ───────────────────────────────────────────────────────────────

  if (loading) return <div className="flex justify-center items-center h-64"><LoadingSpinner size="lg" /></div>;

  const registrosDetallados = registros.map((r) => ({ fecha: r.fecha, labor_nombre: r.labor_info?.nombre || '' }));
  const registrosExistentes = registros.map((r) => r.fecha);

  const trabajadorObj = trabajadores.find((t) => t.id === parseInt(trabajadorId));

  return (
    <div className="space-y-5">
      {/* Encabezado */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ClipboardList className="w-6 h-6 text-blue-600" />
          Historial de Registros de Labores
        </h1>
        <p className="text-gray-500 text-sm mt-1">Consulta y gestión de registros por trabajador y quincena</p>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Finca */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Finca</label>
            <select
              value={fincaId}
              onChange={(e) => setFincaId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Seleccione una finca...</option>
              {fincas.map((f) => <option key={f.id} value={f.id}>{f.nombre}</option>)}
            </select>
          </div>

          {/* Quincena */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Quincena</label>
            <select
              value={quincenaId}
              onChange={(e) => setQuincenaId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Seleccione una quincena...</option>
              {quincenas.map((q) => (
                <option key={q.id} value={q.id}>{formatQuincena(q)}</option>
              ))}
            </select>
          </div>

          {/* Trabajador */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Trabajador</label>
            <select
              value={trabajadorId}
              onChange={(e) => setTrabajadorId(e.target.value)}
              disabled={!fincaId}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
            >
              <option value="">Seleccione un trabajador...</option>
              {trabajadores.map((t) => <option key={t.id} value={t.id}>{t.nombre_completo}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Estado vacío */}
      {(!trabajadorId || !quincenaId) && (
        <div className="bg-white rounded-lg shadow p-12 text-center text-gray-400">
          <Calendar className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p className="text-lg">Seleccione una finca, quincena y trabajador para ver los registros</p>
        </div>
      )}

      {/* Contenido principal */}
      {trabajadorId && quincenaId && (
        <>
          {/* Banner de estado */}
          <div className="flex flex-wrap items-center gap-3">
            {quincenaObj && (
              <span className="text-sm text-gray-600 bg-white px-3 py-1 rounded-full border">
                {quincenaObj.fecha_inicio} → {quincenaObj.fecha_fin}
              </span>
            )}
            {nominaEstado === 'APROBADA' && (
              <span className="flex items-center gap-1 text-sm font-medium text-red-700 bg-red-50 border border-red-200 px-3 py-1 rounded-full">
                <Lock className="w-4 h-4" /> Nómina aprobada — solo lectura
              </span>
            )}
            {nominaEstado === 'PENDIENTE' && (
              <span className="text-sm font-medium text-yellow-700 bg-yellow-50 border border-yellow-200 px-3 py-1 rounded-full">
                Nómina pendiente de aprobación
              </span>
            )}
            {nominaEstado === null && (
              <span className="text-sm text-gray-500 bg-gray-50 border border-gray-200 px-3 py-1 rounded-full">
                Sin nómina calculada
              </span>
            )}
          </div>

          {loadingRegistros ? (
            <div className="flex justify-center py-12"><LoadingSpinner size="lg" /></div>
          ) : (
            <>
              {/* Resumen */}
              {resumen && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-white rounded-lg shadow p-4 text-center">
                    <p className="text-3xl font-bold text-blue-600">{resumen.total_dias}</p>
                    <p className="text-sm text-gray-500 mt-1">Días con registro</p>
                  </div>
                  <div className="bg-white rounded-lg shadow p-4 text-center">
                    <p className="text-3xl font-bold text-green-600">{resumen.total_registros}</p>
                    <p className="text-sm text-gray-500 mt-1">Total registros</p>
                  </div>
                  {resumen.por_labor.slice(0, 2).map((lb) => (
                    <div key={lb.labor} className="bg-white rounded-lg shadow p-4 text-center">
                      <p className="text-2xl font-bold text-purple-600">{parseFloat(lb.cantidad).toLocaleString('es-CO')}</p>
                      <p className="text-xs text-gray-500 mt-1 truncate" title={lb.labor}>{lb.labor}</p>
                      <p className="text-xs text-gray-400">{lb.unidad}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Cuerpo: calendario + tabla */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

                {/* Columna izquierda: calendario + resumen por labor completo */}
                <div className="space-y-4">
                  {quincenaObj && (
                    <div className="bg-white rounded-lg shadow p-4">
                      <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                        <Calendar className="w-4 h-4" /> {formatQuincena(quincenaObj)}
                      </h3>
                      <MiniCalendario quincena={quincenaObj} registros={registros} />
                    </div>
                  )}

                  {resumen && resumen.por_labor.length > 0 && (
                    <div className="bg-white rounded-lg shadow p-4">
                      <h3 className="text-sm font-semibold text-gray-700 mb-3">Totales por labor</h3>
                      <div className="space-y-2">
                        {resumen.por_labor.map((lb) => (
                          <div key={lb.labor} className="flex justify-between items-center text-sm">
                            <span className="text-gray-700 truncate max-w-[60%]" title={lb.labor}>{lb.labor}</span>
                            <span className="font-medium text-gray-900">
                              {parseFloat(lb.cantidad).toLocaleString('es-CO')} <span className="text-gray-400 text-xs">{lb.unidad}</span>
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Columna derecha: tabla de registros */}
                <div className="lg:col-span-2 bg-white rounded-lg shadow">
                  <div className="p-4 border-b flex items-center justify-between">
                    <h3 className="font-semibold text-gray-800">
                      Registros {trabajadorObj ? `— ${trabajadorObj.nombre_completo}` : ''}
                    </h3>
                    {canEdit && (
                      <button
                        onClick={() => setShowAddForm((v) => !v)}
                        className="flex items-center gap-1 text-sm bg-blue-600 text-white px-3 py-1.5 rounded-md hover:bg-blue-700"
                      >
                        <Plus className="w-4 h-4" />
                        {showAddForm ? 'Cerrar' : 'Agregar registro'}
                        {showAddForm ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      </button>
                    )}
                  </div>

                  {/* Formulario de agregar (expandible) */}
                  {canEdit && showAddForm && quincenaObj && (
                    <div className="p-4 bg-blue-50 border-b">
                      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {/* Labor */}
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Labor *</label>
                            <select
                              {...register('labor', { required: true })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="">Seleccione...</option>
                              {labores.map((l) => <option key={l.id} value={l.id}>{l.nombre}</option>)}
                            </select>
                          </div>

                          {/* Cantidad (no-día) */}
                          {(!esTipoDia || esDesmache) && laborSeleccionada && (
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                {esDesmache ? 'Cantidad total (ha) *' : 'Cantidad *'}
                              </label>
                              <input
                                type="text"
                                inputMode="decimal"
                                {...register('cantidad', {
                                  required: !esTipoDia || esDesmache,
                                  pattern: { value: /^\d+(\.\d{1,4})?$/, message: 'Número inválido' },
                                })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Ej: 1.5"
                              />
                              {errors.cantidad && <span className="text-red-500 text-xs">{errors.cantidad.message}</span>}
                            </div>
                          )}
                        </div>

                        {/* Selector de fecha(s) */}
                        {laborSeleccionada && (
                          <MultipleDatePicker
                            quincena={quincenaObj}
                            onSelectionChange={setFechasSeleccionadas}
                            registrosExistentes={registrosExistentes}
                            registrosDetallados={registrosDetallados}
                            laborActualNombre={laborSeleccionada?.nombre || ''}
                            singleSelection={!esTipoDia && !esDesmache}
                          />
                        )}

                        {/* Observaciones */}
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Observaciones</label>
                          <input
                            type="text"
                            {...register('observaciones')}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>

                        <div className="flex gap-2">
                          <button
                            type="submit"
                            disabled={submitting}
                            className="flex items-center gap-1 bg-blue-600 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-700 disabled:bg-gray-400"
                          >
                            {submitting ? <LoadingSpinner size="sm" /> : <Plus className="w-4 h-4" />}
                            Guardar
                          </button>
                          <button
                            type="button"
                            onClick={() => { setShowAddForm(false); reset(); setLaborSeleccionada(null); setFechasSeleccionadas([]); }}
                            className="px-4 py-2 rounded-md text-sm border border-gray-300 hover:bg-gray-50"
                          >
                            Cancelar
                          </button>
                        </div>
                      </form>
                    </div>
                  )}

                  {/* Tabla */}
                  <div className="overflow-x-auto">
                    {registros.length === 0 ? (
                      <p className="text-center text-gray-400 py-12">No hay registros para este trabajador en la quincena seleccionada</p>
                    ) : (
                      <table className="min-w-full divide-y divide-gray-200 text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Labor</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cantidad</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Observaciones</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Registrado por</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha registro</th>
                            {canEdit && <th className="px-4 py-3" />}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {registros
                            .slice()
                            .sort((a, b) => a.fecha.localeCompare(b.fecha))
                            .map((r) => (
                              <tr key={r.id} className="hover:bg-gray-50">
                                <td className="px-4 py-2 font-medium text-gray-900">{formatFecha(r.fecha)}</td>
                                <td className="px-4 py-2 text-gray-700">{r.labor_info?.nombre}</td>
                                <td className="px-4 py-2 text-gray-700">
                                  {r.cantidad} <span className="text-gray-400 text-xs">{r.labor_info?.unidad_medida_info?.simbolo}</span>
                                </td>
                                <td className="px-4 py-2 text-gray-500 max-w-[160px] truncate" title={r.observaciones}>
                                  {r.observaciones || '—'}
                                </td>
                                <td className="px-4 py-2 text-gray-600">
                                  {r.created_by_info?.nombre_completo || r.created_by_info?.username || '—'}
                                </td>
                                <td className="px-4 py-2 text-gray-400 text-xs whitespace-nowrap">
                                  {r.created_at ? new Date(r.created_at).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' }) : '—'}
                                </td>
                                {canEdit && (
                                  <td className="px-4 py-2">
                                    <button
                                      onClick={() => setConfirmDelete({ isOpen: true, id: r.id })}
                                      className="text-red-500 hover:text-red-700"
                                      title="Eliminar registro"
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
            </>
          )}
        </>
      )}

      <ConfirmDialog
        isOpen={confirmDelete.isOpen}
        onClose={() => setConfirmDelete({ isOpen: false, id: null })}
        onConfirm={() => handleDelete(confirmDelete.id)}
        title="Eliminar registro"
        message="¿Está seguro que desea eliminar este registro? La acción quedará registrada en auditoría."
        type="danger"
      />
    </div>
  );
}
