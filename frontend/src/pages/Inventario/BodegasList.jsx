// frontend/src/pages/Inventario/BodegasList.jsx

import { useState, useEffect, useCallback } from 'react';
import { Warehouse, Plus, Edit2, MapPin, X, Save, ChevronRight } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import inventarioService from '../../services/inventarioService';
import fincaService from '../../services/fincaService';
import LoadingSpinner from '../../components/Common/LoadingSpinner';
import toast from 'react-hot-toast';

// ── Modal crear/editar bodega ─────────────────────────────────────────────────
function BodegaModal({ bodega, onClose, onSuccess }) {
  const isEditing = Boolean(bodega);
  const [nombre, setNombre]       = useState(bodega?.nombre ?? '');
  const [descripcion, setDesc]    = useState(bodega?.descripcion ?? '');
  const [activa, setActiva]       = useState(bodega?.activa ?? true);
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!nombre.trim()) { setError('El nombre es obligatorio.'); return; }
    setSaving(true);
    setError(null);
    try {
      if (isEditing) {
        await inventarioService.updateBodega(bodega.id, { nombre: nombre.trim(), descripcion, activa });
        toast.success('Bodega actualizada');
      } else {
        await inventarioService.createBodega({ nombre: nombre.trim(), descripcion, activa });
        toast.success('Bodega creada');
      }
      onSuccess();
    } catch (err) {
      const data = err.response?.data;
      const msg = data?.nombre?.[0] ?? data?.non_field_errors?.[0]
        ?? (typeof data === 'object' ? Object.values(data).flat()[0] : null)
        ?? 'Error guardando';
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Warehouse className="w-5 h-5 text-green-600" />
            <h2 className="font-semibold text-gray-900">
              {isEditing ? 'Editar bodega' : 'Nueva bodega'}
            </h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
            <input
              autoFocus
              type="text"
              value={nombre}
              onChange={e => { setNombre(e.target.value); setError(null); }}
              placeholder="Ej: Bodega Principal"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
            <textarea
              value={descripcion}
              onChange={e => setDesc(e.target.value)}
              rows={2}
              placeholder="Ubicación, notas, etc."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={activa}
              onChange={e => setActiva(e.target.checked)}
              className="rounded border-gray-300 text-green-600 focus:ring-green-500"
            />
            <span className="text-sm font-medium text-gray-700">Bodega activa</span>
          </label>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 bg-green-600 text-white py-2.5 rounded-xl hover:bg-green-700 disabled:opacity-50 font-medium text-sm"
            >
              {saving ? <LoadingSpinner size="sm" /> : <Save className="w-4 h-4" />}
              {isEditing ? 'Actualizar' : 'Crear bodega'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 border border-gray-300 rounded-xl text-sm hover:bg-gray-50"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Card de bodega ────────────────────────────────────────────────────────────
function BodegaCard({ bodega, fincas, canModify, onEdit }) {
  const fincasAsociadas = fincas.filter(f => f.bodega === bodega.id);

  return (
    <div className={`bg-white rounded-xl border-2 p-5 ${bodega.activa ? 'border-gray-200' : 'border-gray-100 opacity-60'}`}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <Warehouse className="w-5 h-5 text-green-600 shrink-0" />
          <div className="min-w-0">
            <h3 className="font-semibold text-gray-900 truncate">{bodega.nombre}</h3>
            {bodega.descripcion && (
              <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{bodega.descripcion}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {!bodega.activa && (
            <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Inactiva</span>
          )}
          {canModify && (
            <button
              onClick={() => onEdit(bodega)}
              className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
            >
              <Edit2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-gray-100">
        <p className="text-xs font-medium text-gray-500 mb-2 flex items-center gap-1">
          <MapPin className="w-3 h-3" />
          Fincas asociadas ({fincasAsociadas.length})
        </p>
        {fincasAsociadas.length === 0 ? (
          <p className="text-xs text-gray-400 italic">
            Ninguna — asigna fincas desde{' '}
            <a href="/fincas" className="text-green-600 hover:underline">Fincas → Editar</a>
          </p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {fincasAsociadas.map(f => (
              <span key={f.id} className="text-xs bg-green-50 text-green-700 border border-green-200 px-2 py-0.5 rounded-full">
                {f.nombre}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────
export default function BodegasList() {
  const { canModify } = useAuth();
  const [bodegas, setBodegas] = useState([]);
  const [fincas, setFincas]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal]     = useState(null); // null | 'new' | bodega object

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const [b, f] = await Promise.all([
        inventarioService.getBodegas(),
        fincaService.getAll(),
      ]);
      setBodegas(b.results ?? b);
      setFincas((f.results ?? f));
    } catch {
      toast.error('Error cargando bodegas');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const cerrarModal = () => setModal(null);
  const onSuccess   = () => { cerrarModal(); cargar(); };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Warehouse className="w-6 h-6 text-green-600" />
            Bodegas
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Espacios físicos de almacenamiento. Una bodega puede compartirse entre varias fincas.
          </p>
        </div>
        {canModify() && (
          <button
            onClick={() => setModal('new')}
            className="flex items-center gap-2 bg-green-600 text-white px-4 py-2.5 rounded-xl hover:bg-green-700 font-medium text-sm"
          >
            <Plus className="w-4 h-4" />
            Nueva bodega
          </button>
        )}
      </div>

      {/* Instrucción de flujo */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-sm text-blue-700 flex items-start gap-2">
        <ChevronRight className="w-4 h-4 mt-0.5 shrink-0" />
        <span>
          <strong>Flujo:</strong> Crea una bodega aquí → ve a{' '}
          <a href="/fincas" className="underline font-medium">Fincas → Editar</a>{' '}
          para asignar cada finca a su bodega → luego en Inventario podrás registrar stock por bodega.
        </span>
      </div>

      {/* Contenido */}
      {loading ? (
        <div className="flex justify-center py-20"><LoadingSpinner /></div>
      ) : bodegas.length === 0 ? (
        <div className="bg-gray-50 border border-dashed border-gray-300 rounded-xl flex flex-col items-center py-16 gap-3 text-gray-400">
          <Warehouse className="w-12 h-12" />
          <p className="text-sm font-medium">No hay bodegas creadas todavía</p>
          {canModify() && (
            <button
              onClick={() => setModal('new')}
              className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 text-sm mt-1"
            >
              <Plus className="w-4 h-4" /> Crear primera bodega
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {bodegas.map(b => (
            <BodegaCard
              key={b.id}
              bodega={b}
              fincas={fincas}
              canModify={canModify()}
              onEdit={setModal}
            />
          ))}
        </div>
      )}

      {/* Modal */}
      {modal !== null && (
        <BodegaModal
          bodega={modal === 'new' ? null : modal}
          onClose={cerrarModal}
          onSuccess={onSuccess}
        />
      )}
    </div>
  );
}
