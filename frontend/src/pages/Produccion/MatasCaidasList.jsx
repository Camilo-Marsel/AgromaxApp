// frontend/src/pages/Produccion/MatasCaidasList.jsx

import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, X, Save, Info } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import produccionService from '../../services/produccionService';
import fincaService from '../../services/fincaService';
import loteService from '../../services/loteService';
import { COLORES_CINTA, getSemanasOpciones, getSemanaActual, getColorParaSemana } from '../../utils/produccionUtils';
import LoadingSpinner from '../../components/Common/LoadingSpinner';
import ConfirmDialog from '../../components/Common/ConfirmDialog';
import toast from 'react-hot-toast';

function MataCaidaModal({ item, fincas, onClose, onSuccess }) {
  const isEditing = Boolean(item);
  const [form, setForm] = useState({
    finca: item?.finca ?? '',
    lote: item?.lote ?? '',
    color_cinta: item?.color_cinta ?? '',
    semana_año: item?.semana_año ?? getSemanaActual(),
    cantidad_caidas: item?.cantidad_caidas ?? '',
    fecha_reporte: item?.fecha_reporte ?? new Date().toISOString().slice(0, 10),
    observaciones: item?.observaciones ?? '',
  });
  const [lotes, setLotes] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    if (form.finca) {
      loteService.getByFinca(form.finca)
        .then((d) => setLotes(d.results || d))
        .catch(() => setLotes([]));
    } else {
      setLotes([]);
    }
  }, [form.finca]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.finca || !form.color_cinta || !form.semana_año || !form.cantidad_caidas || !form.fecha_reporte) {
      setError('Finca, color, semana, cantidad y fecha son obligatorios.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload = {
        finca: Number(form.finca),
        lote: form.lote ? Number(form.lote) : null,
        color_cinta: form.color_cinta,
        semana_año: form.semana_año,
        cantidad_caidas: Number(form.cantidad_caidas),
        fecha_reporte: form.fecha_reporte,
        observaciones: form.observaciones,
      };
      if (isEditing) {
        await produccionService.updateMataCaida(item.id, payload);
        toast.success('Registro actualizado');
      } else {
        await produccionService.createMataCaida(payload);
        toast.success('Registro creado');
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">{isEditing ? 'Editar' : 'Registrar'} Mata Caída</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Finca */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Finca *</label>
            <select value={form.finca} onChange={(e) => { set('finca', e.target.value); set('lote', ''); }} required
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
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
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100">
              <option value="">Sin lote específico</option>
              {lotes.map((l) => <option key={l.id} value={l.id}>{l.nombre}</option>)}
            </select>
          </div>

          {/* Semana + color */}
          {(() => {
            const semanas = getSemanasOpciones();
            const semSel = semanas.find((s) => s.value === form.semana_año);
            const colorEsperado = semSel ? semSel.colorEsperado : null;
            const colorMismatch = colorEsperado && form.color_cinta && form.color_cinta !== colorEsperado;
            return (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Semana encintado *</label>
                  <select value={form.semana_año} onChange={(e) => {
                    const opt = semanas.find((s) => s.value === e.target.value);
                    set('semana_año', e.target.value);
                    if (opt && !form.color_cinta) set('color_cinta', opt.colorEsperado);
                  }} required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    {semanas.map((s) => (
                      <option key={s.value} value={s.value}>{s.label} — {COLORES_CINTA.find((c)=>c.value===s.colorEsperado)?.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Color de cinta *</label>
                  <select value={form.color_cinta} onChange={(e) => set('color_cinta', e.target.value)} required
                    className={'w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ' + (colorMismatch ? 'border-amber-400 bg-amber-50' : 'border-gray-300')}>
                    <option value="">Seleccione...</option>
                    {COLORES_CINTA.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                  {colorMismatch && (
                    <p className="text-xs text-amber-600 mt-0.5 flex items-center gap-1">
                      <Info className="w-3 h-3" /> Esperado para esa semana: {COLORES_CINTA.find((c)=>c.value===colorEsperado)?.label}
                    </p>
                  )}
                </div>
              </div>
            );
          })()}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cantidad caídas *</label>
              <input type="number" min="1" value={form.cantidad_caidas} onChange={(e) => set('cantidad_caidas', e.target.value)} required
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha reporte *</label>
              <input type="date" value={form.fecha_reporte} onChange={(e) => set('fecha_reporte', e.target.value)} required
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Observaciones</label>
            <textarea value={form.observaciones} onChange={(e) => set('observaciones', e.target.value)} rows="2"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
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

export default function MatasCaidasList() {
  const { canModify } = useAuth();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [fincas, setFincas] = useState([]);
  const [lotes, setLotes] = useState([]);
  const [filtroFinca, setFiltroFinca] = useState('');
  const [filtroLote, setFiltroLote] = useState('');
  const [filtroColor, setFiltroColor] = useState('');
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
      const data = await produccionService.getMatasCaidas(params);
      setItems(data.results || data);
    } catch {
      toast.error('Error al cargar registros');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await produccionService.deleteMataCaida(id);
      toast.success('Registro eliminado');
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
          <h1 className="text-2xl font-bold">Matas Caídas</h1>
          <p className="text-gray-500 text-sm mt-1">Registro de matas caídas por finca, color de cinta y semana de encintado.</p>
        </div>
        {canModify() && (
          <button onClick={() => setModal('new')}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 text-sm font-medium">
            <Plus className="w-4 h-4" /> Registrar
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
          <label className="block text-xs text-gray-500 mb-1">Color de cinta</label>
          <select value={filtroColor} onChange={(e) => setFiltroColor(e.target.value)}
            className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm">
            <option value="">Todos</option>
            {COLORES_CINTA.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>
      </div>

      {/* Tabla */}
      {loading ? (
        <div className="flex justify-center py-12"><LoadingSpinner size="lg" /></div>
      ) : items.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center text-gray-400">
          No hay registros con los filtros seleccionados.
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {['Finca', 'Lote', 'Color', 'Semana', 'Caídas', 'Fecha reporte', canModify() ? 'Acciones' : ''].filter(Boolean).map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {items.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{item.finca_nombre}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{item.lote_nombre ?? <span className="text-gray-300">—</span>}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-700">
                      {colorLabel(item.color_cinta)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">{item.semana_año}</td>
                  <td className="px-4 py-3 text-sm font-semibold text-red-600">{item.cantidad_caidas}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {new Date(item.fecha_reporte + 'T00:00:00').toLocaleDateString('es-CO')}
                  </td>
                  {canModify() && (
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button onClick={() => setModal(item)} className="text-blue-600 hover:text-blue-800"><Edit2 className="w-4 h-4" /></button>
                        <button onClick={() => setConfirmDelete({ isOpen: true, id: item.id })} className="text-red-600 hover:text-red-800"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <MataCaidaModal
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
        title="Eliminar registro"
        message="¿Está seguro de eliminar este registro de mata caída?"
        type="danger"
      />
    </div>
  );
}
