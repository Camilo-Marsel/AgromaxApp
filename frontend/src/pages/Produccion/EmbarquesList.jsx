// frontend/src/pages/Produccion/EmbarquesList.jsx

import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, X, Save, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { COLORES_CINTA, getSemanasOpciones, getSemanaActual } from '../../utils/produccionUtils';
import { useAuth } from '../../hooks/useAuth';
import produccionService from '../../services/produccionService';
import fincaService from '../../services/fincaService';
import loteService from '../../services/loteService';
import LoadingSpinner from '../../components/Common/LoadingSpinner';
import ConfirmDialog from '../../components/Common/ConfirmDialog';
import toast from 'react-hot-toast';

function ValidacionPanel({ embarqueId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!embarqueId) return;
    setLoading(true);
    produccionService.getValidacionEmbarque(embarqueId)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [embarqueId]);

  if (loading) return <div className="p-3 text-xs text-gray-400">Calculando validación...</div>;
  if (!data) return null;

  const hayAlerta = data.alerta_desviacion || data.alerta_matas_sin_reportar;
  const scopeLabel = data.scope === 'lote' ? 'lote' : 'finca';

  return (
    <div className={`mt-3 rounded-md border p-3 text-xs ${hayAlerta ? 'border-amber-300 bg-amber-50' : 'border-green-300 bg-green-50'}`}>
      <div className="flex items-center gap-1.5 font-semibold mb-2">
        {hayAlerta
          ? <><AlertTriangle className="w-3.5 h-3.5 text-amber-600" /><span className="text-amber-700">Alertas de discrepancia</span></>
          : <><CheckCircle className="w-3.5 h-3.5 text-green-600" /><span className="text-green-700">Validación correcta</span></>
        }
        <span className="ml-auto text-gray-400 font-normal">Scope: {scopeLabel}</span>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-gray-700">
        <span>Encintadas (Control):</span><span className="font-medium">{data.encintadas}</span>
        <span>Caídas reportadas:</span><span className="font-medium">{data.caidas_reportadas}</span>
        <span>Esperadas en corte:</span><span className="font-medium">{data.esperadas}</span>
        <span>Matas cortadas:</span><span className="font-medium">{data.matas_corte}</span>
        <span className={data.alerta_matas_sin_reportar ? 'text-amber-700 font-semibold' : ''}>Sin reportar:</span>
        <span className={`font-medium ${data.alerta_matas_sin_reportar ? 'text-amber-700' : ''}`}>{data.matas_sin_reportar}</span>
        <span>Ratio actual:</span><span className="font-medium">{data.ratio_actual ?? '—'}</span>
        <span>Cajas esperadas:</span><span className="font-medium">{data.cajas_esperadas ?? '—'}</span>
        <span>Cajas netas:</span><span className="font-medium">{data.cajas_netas}</span>
        <span className={data.alerta_desviacion ? 'text-amber-700 font-semibold' : ''}>Desviación:</span>
        <span className={`font-medium ${data.alerta_desviacion ? 'text-amber-700' : ''}`}>
          {data.desviacion_pct != null ? `${data.desviacion_pct}%` : '—'}
          {data.alerta_desviacion && ` ⚠️ (umbral: ${data.umbral_desviacion_pct}%)`}
        </span>
      </div>
    </div>
  );
}

function EmbarqueModal({ item, fincas, onClose, onSuccess }) {
  const isEditing = Boolean(item);
  const [form, setForm] = useState({
    finca: item?.finca ?? '',
    lote: item?.lote ?? '',
    fecha_embarque: item?.fecha_embarque ?? new Date().toISOString().slice(0, 10),
    semana_año: item?.semana_año ?? getSemanaActual(),
    color_cinta: item?.color_cinta ?? '',
    cintas_semana_actual: item?.cintas_semana_actual ?? 0,
    cintas_semana_anterior: item?.cintas_semana_anterior ?? 0,
    cintas_semana_siguiente: item?.cintas_semana_siguiente ?? 0,
    cajas_empacadas: item?.cajas_empacadas ?? '',
    cajas_rechazadas: item?.cajas_rechazadas ?? 0,
    observaciones: item?.observaciones ?? '',
  });
  const [lotes, setLotes] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [ratioInfo, setRatioInfo] = useState(null);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    if (form.finca) {
      loteService.getByFinca(form.finca)
        .then((d) => setLotes(d.results || d))
        .catch(() => setLotes([]));
      produccionService.getRatioFinca(form.finca, form.lote || null)
        .then(setRatioInfo)
        .catch(() => setRatioInfo(null));
    } else {
      setLotes([]);
      setRatioInfo(null);
    }
  }, [form.finca, form.lote]);

  const totalCintas =
    Number(form.cintas_semana_actual) +
    Number(form.cintas_semana_anterior) +
    Number(form.cintas_semana_siguiente);
  const cajasNetas = Math.max(0, Number(form.cajas_empacadas) - Number(form.cajas_rechazadas));
  const ratioEstimado = cajasNetas > 0 ? (totalCintas / cajasNetas).toFixed(4) : null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.finca || !form.color_cinta || !form.cajas_empacadas) {
      setError('Finca, color de cinta y cajas empacadas son obligatorios.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload = {
        finca: Number(form.finca),
        lote: form.lote ? Number(form.lote) : null,
        fecha_embarque: form.fecha_embarque,
        semana_año: form.semana_año,
        color_cinta: form.color_cinta,
        cintas_semana_actual: Number(form.cintas_semana_actual),
        cintas_semana_anterior: Number(form.cintas_semana_anterior),
        cintas_semana_siguiente: Number(form.cintas_semana_siguiente),
        cajas_empacadas: Number(form.cajas_empacadas),
        cajas_rechazadas: Number(form.cajas_rechazadas),
        observaciones: form.observaciones,
      };
      if (isEditing) {
        await produccionService.updateEmbarque(item.id, payload);
        toast.success('Embarque actualizado');
      } else {
        await produccionService.createEmbarque(payload);
        toast.success('Embarque registrado');
      }
      onSuccess();
      onClose();
    } catch (err) {
      const data = err.response?.data;
      setError(data ? Object.values(data).flat().join(' ') : 'Error al guardar.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6 my-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">{isEditing ? 'Editar' : 'Registrar'} Embarque</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Finca */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Finca *</label>
            <select value={form.finca} onChange={(e) => { set('finca', e.target.value); set('lote', ''); }} required
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm">
              <option value="">Seleccione una finca...</option>
              {fincas.map((f) => <option key={f.id} value={f.id}>{f.nombre}</option>)}
            </select>
          </div>

          {/* Lote (opcional) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Lote <span className="text-gray-400 font-normal">(opcional)</span>
            </label>
            <select value={form.lote} onChange={(e) => set('lote', e.target.value)}
              disabled={!form.finca}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm disabled:bg-gray-100">
              <option value="">Sin lote específico</option>
              {lotes.map((l) => <option key={l.id} value={l.id}>{l.nombre}</option>)}
            </select>
          </div>

          {/* Ratio info */}
          {ratioInfo?.ratio_actual && (
            <div className="flex items-center gap-2 text-xs text-blue-600 bg-blue-50 px-3 py-1.5 rounded">
              <Info className="w-3.5 h-3.5 flex-shrink-0" />
              Ratio actual {form.lote ? 'del lote' : 'de la finca'} (últ. {ratioInfo.embarques_usados} embarques):
              <strong className="ml-1">{ratioInfo.ratio_actual}</strong>
            </div>
          )}

          {/* Fecha + Semana + Color */}
          {(() => {
            const semanas = getSemanasOpciones();
            const semSel = semanas.find((s) => s.value === form.semana_año);
            const colorEsperado = semSel ? semSel.colorEsperado : null;
            const colorMismatch = colorEsperado && form.color_cinta && form.color_cinta !== colorEsperado;
            return (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Fecha *</label>
                    <input type="date" value={form.fecha_embarque} onChange={(e) => set('fecha_embarque', e.target.value)} required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Semana *</label>
                    <select value={form.semana_año} onChange={(e) => {
                      const opt = semanas.find((s) => s.value === e.target.value);
                      set('semana_año', e.target.value);
                      if (opt && !form.color_cinta) set('color_cinta', opt.colorEsperado);
                    }} required className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm">
                      {semanas.map((s) => (
                        <option key={s.value} value={s.value}>{s.label} — {COLORES_CINTA.find((c)=>c.value===s.colorEsperado)?.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Color de cinta *</label>
                  <select value={form.color_cinta} onChange={(e) => set('color_cinta', e.target.value)} required
                    className={'w-full px-3 py-2 border rounded-md text-sm ' + (colorMismatch ? 'border-amber-400 bg-amber-50' : 'border-gray-300')}>
                    <option value="">Seleccione color...</option>
                    {COLORES_CINTA.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                  {colorMismatch && (
                    <p className="text-xs text-amber-600 mt-0.5 flex items-center gap-1">
                      <Info className="w-3 h-3" /> Para esta semana se esperaba: {COLORES_CINTA.find((c)=>c.value===colorEsperado)?.label}
                    </p>
                  )}
                </div>
              </div>
            );
          })()}

          {/* Cintas */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cintas contadas en empacadora</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { key: 'cintas_semana_anterior', label: 'Semana anterior' },
                { key: 'cintas_semana_actual', label: 'Semana actual' },
                { key: 'cintas_semana_siguiente', label: 'Semana siguiente' },
              ].map(({ key, label }) => (
                <div key={key}>
                  <label className="block text-xs text-gray-500 mb-1">{label}</label>
                  <input type="number" min="0" value={form[key]} onChange={(e) => set(key, e.target.value)}
                    className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm" />
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-1">Total cintas: <strong>{totalCintas}</strong></p>
          </div>

          {/* Cajas */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cajas empacadas *</label>
              <input type="number" min="0" value={form.cajas_empacadas} onChange={(e) => set('cajas_empacadas', e.target.value)} required
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cajas rechazadas</label>
              <input type="number" min="0" value={form.cajas_rechazadas} onChange={(e) => set('cajas_rechazadas', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
            </div>
          </div>
          {cajasNetas > 0 && (
            <p className="text-xs text-gray-500">
              Cajas netas: <strong>{cajasNetas}</strong>
              {ratioEstimado && <> · Ratio este embarque: <strong>{ratioEstimado}</strong></>}
            </p>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Observaciones</label>
            <textarea value={form.observaciones} onChange={(e) => set('observaciones', e.target.value)} rows="2"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
          </div>

          {error && <p className="text-sm text-red-600 bg-red-50 p-2 rounded">{error}</p>}

          <div className="flex gap-3 pt-1">
            <button type="submit" disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400 text-sm font-medium">
              <Save className="w-4 h-4" />
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
            <button type="button" onClick={onClose}
              className="flex-1 border border-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-50 text-sm">
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function EmbarquesList() {
  const { canModify } = useAuth();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [fincas, setFincas] = useState([]);
  const [lotes, setLotes] = useState([]);
  const [filtroFinca, setFiltroFinca] = useState('');
  const [filtroLote, setFiltroLote] = useState('');
  const [filtroColor, setFiltroColor] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [modal, setModal] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState({ isOpen: false, id: null });

  useEffect(() => {
    fincaService.getAll().then((d) => setFincas(d.results || d)).catch(() => {});
    loadItems();
  }, []);

  useEffect(() => {
    if (filtroFinca) {
      loteService.getByFinca(filtroFinca).then((d) => setLotes(d.results || d)).catch(() => setLotes([]));
    } else {
      setLotes([]);
      setFiltroLote('');
    }
  }, [filtroFinca]);

  useEffect(() => { loadItems(); }, [filtroFinca, filtroLote, filtroColor]);

  const loadItems = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filtroFinca) params.finca = filtroFinca;
      if (filtroLote) params.lote = filtroLote;
      if (filtroColor) params.color_cinta = filtroColor;
      const data = await produccionService.getEmbarques(params);
      setItems(data.results || data);
    } catch {
      toast.error('Error al cargar embarques');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await produccionService.deleteEmbarque(id);
      toast.success('Embarque eliminado');
      setItems((prev) => prev.filter((i) => i.id !== id));
    } catch {
      toast.error('Error al eliminar');
    } finally {
      setConfirmDelete({ isOpen: false, id: null });
    }
  };

  const colorLabel = (c) => COLORES_CINTA.find((x) => x.value === c)?.label || c;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Embarques</h1>
          <p className="text-gray-500 text-sm mt-1">
            Registro de corte y empaque por finca. Expande un embarque para ver la validación cruzada.
          </p>
        </div>
        {canModify() && (
          <button onClick={() => setModal('new')}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 text-sm font-medium">
            <Plus className="w-4 h-4" /> Registrar embarque
          </button>
        )}
      </div>

      {/* Filtros */}
      <div className="bg-white p-4 rounded-lg shadow flex gap-4 flex-wrap">
        <div className="flex-1 min-w-[160px]">
          <label className="block text-xs text-gray-500 mb-1">Finca</label>
          <select value={filtroFinca} onChange={(e) => { setFiltroFinca(e.target.value); setFiltroLote(''); }}
            className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm">
            <option value="">Todas</option>
            {fincas.map((f) => <option key={f.id} value={f.id}>{f.nombre}</option>)}
          </select>
        </div>
        <div className="flex-1 min-w-[160px]">
          <label className="block text-xs text-gray-500 mb-1">Lote</label>
          <select value={filtroLote} onChange={(e) => setFiltroLote(e.target.value)}
            disabled={!filtroFinca}
            className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm disabled:bg-gray-100">
            <option value="">Todos</option>
            {lotes.map((l) => <option key={l.id} value={l.id}>{l.nombre}</option>)}
          </select>
        </div>
        <div className="flex-1 min-w-[140px]">
          <label className="block text-xs text-gray-500 mb-1">Color cortado</label>
          <select value={filtroColor} onChange={(e) => setFiltroColor(e.target.value)}
            className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm">
            <option value="">Todos</option>
            {COLORES_CINTA.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="flex justify-center py-12"><LoadingSpinner size="lg" /></div>
      ) : items.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center text-gray-400">
          No hay embarques con los filtros seleccionados.
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.id} className="bg-white rounded-lg shadow overflow-hidden">
              <div
                className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-50"
                onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
              >
                <div className="flex items-center gap-4">
                  <div>
                    <p className="font-medium text-sm">
                      {item.finca_nombre}
                      {item.lote_nombre && <span className="text-gray-400 font-normal"> · {item.lote_nombre}</span>}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(item.fecha_embarque + 'T00:00:00').toLocaleDateString('es-CO')} · Sem {item.semana_año}
                    </p>
                  </div>
                  <span className="inline-flex px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-700">
                    {colorLabel(item.color_cinta)}
                  </span>
                </div>
                <div className="flex items-center gap-6 text-sm">
                  <div className="text-right">
                    <p className="text-xs text-gray-500">Total cintas</p>
                    <p className="font-semibold">{item.total_cintas}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">Cajas netas</p>
                    <p className="font-semibold">{item.cajas_netas}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">Ratio</p>
                    <p className="font-semibold">{item.ratio ?? '—'}</p>
                  </div>
                  {canModify() && (
                    <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => setModal(item)} className="text-blue-600 hover:text-blue-800">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => setConfirmDelete({ isOpen: true, id: item.id })}
                        className="text-red-600 hover:text-red-800">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {expandedId === item.id && (
                <div className="border-t border-gray-100 px-4 pb-4">
                  <div className="grid grid-cols-3 gap-4 py-3 text-xs text-gray-600 border-b border-gray-100">
                    <div><span className="text-gray-400">Ant:</span> {item.cintas_semana_anterior}</div>
                    <div><span className="text-gray-400">Act:</span> {item.cintas_semana_actual}</div>
                    <div><span className="text-gray-400">Sig:</span> {item.cintas_semana_siguiente}</div>
                    <div><span className="text-gray-400">Empacadas:</span> {item.cajas_empacadas}</div>
                    <div><span className="text-gray-400">Rechazadas:</span> {item.cajas_rechazadas}</div>
                    {item.observaciones && <div className="col-span-3 text-gray-500 italic">{item.observaciones}</div>}
                  </div>
                  <ValidacionPanel embarqueId={item.id} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {modal && (
        <EmbarqueModal
          item={modal === 'new' ? null : modal}
          fincas={fincas}
          onClose={() => setModal(null)}
          onSuccess={loadItems}
        />
      )}

      <ConfirmDialog
        isOpen={confirmDelete.isOpen}
        onClose={() => setConfirmDelete({ isOpen: false, id: null })}
        onConfirm={() => handleDelete(confirmDelete.id)}
        title="Eliminar embarque"
        message="¿Está seguro de eliminar este embarque?"
        type="danger"
      />
    </div>
  );
}
