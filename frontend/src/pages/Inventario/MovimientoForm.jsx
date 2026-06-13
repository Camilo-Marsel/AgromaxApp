// frontend/src/pages/Inventario/MovimientoForm.jsx
// Modal para registrar entrada / salida / ajuste en un StockFinca concreto

import { useState } from 'react';
import { TrendingUp, TrendingDown, Sliders, X, Save, Warehouse } from 'lucide-react';
import inventarioService from '../../services/inventarioService';
import LoadingSpinner from '../../components/Common/LoadingSpinner';
import toast from 'react-hot-toast';

const TIPOS = [
  { value: 'ENTRADA', label: 'Entrada',  icon: TrendingUp,   color: 'text-green-600', selected: 'bg-green-600 text-white border-transparent' },
  { value: 'SALIDA',  label: 'Salida',   icon: TrendingDown, color: 'text-red-600',   selected: 'bg-red-600 text-white border-transparent'   },
  { value: 'AJUSTE',  label: 'Ajuste',   icon: Sliders,      color: 'text-blue-600',  selected: 'bg-blue-600 text-white border-transparent'  },
];

const hoy = () => new Date().toISOString().split('T')[0];

// stockFinca: objeto StockFinca con { id, stock_actual, finca_nombre, producto_nombre, producto_unidad_display }
export default function MovimientoForm({ stockFinca, tipoInicial = 'ENTRADA', onClose, onSuccess }) {
  const [tipo, setTipo]         = useState(tipoInicial);
  const [cantidad, setCantidad] = useState('');
  const [fecha, setFecha]       = useState(hoy());
  const [obs, setObs]           = useState('');
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState(null);

  const tipoActual = TIPOS.find(t => t.value === tipo);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!cantidad || Number(cantidad) <= 0) {
      setError('La cantidad debe ser mayor que cero.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await inventarioService.registrarMovimiento({
        stock_finca:   stockFinca.id,
        tipo,
        cantidad:      Number(cantidad),
        fecha,
        observaciones: obs.trim(),
      });
      toast.success(`${tipoActual.label} registrada correctamente`);
      onSuccess?.();
    } catch (err) {
      const data = err.response?.data;
      const msg = data?.cantidad?.[0]
        ?? data?.non_field_errors?.[0]
        ?? data?.stock_finca?.[0]
        ?? 'Error registrando el movimiento';
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const fincaNombre  = stockFinca.bodega_nombre ?? '—';
  const unidadLabel  = stockFinca.unidad_display ?? '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">

        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="font-semibold text-gray-900">{stockFinca.producto_nombre}</h2>
            <div className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
              <Warehouse className="w-3 h-3" />
              {fincaNombre}
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de movimiento</label>
            <div className="grid grid-cols-3 gap-2">
              {TIPOS.map(t => {
                const Icon = t.icon;
                const active = tipo === t.value;
                return (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setTipo(t.value)}
                    className={`flex flex-col items-center gap-1 py-3 rounded-xl border-2 text-sm font-medium transition-all ${active ? t.selected : `border-gray-200 ${t.color} hover:border-gray-300`}`}
                  >
                    <Icon className="w-5 h-5" />
                    {t.label}
                  </button>
                );
              })}
            </div>
            {tipo === 'AJUSTE' && (
              <p className="text-xs text-blue-600 mt-1.5 bg-blue-50 rounded px-2 py-1">
                En ajuste, ingresa el stock <strong>real actual</strong> (no la diferencia).
              </p>
            )}
          </div>

          <div className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-2 text-sm">
            <span className="text-gray-500">Stock actual</span>
            <span className="font-semibold text-gray-800">
              {parseFloat(stockFinca.stock_actual).toLocaleString('es-CO', { maximumFractionDigits: 2 })} {unidadLabel}
            </span>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {tipo === 'AJUSTE' ? 'Nuevo stock real' : 'Cantidad'} ({unidadLabel})
            </label>
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={cantidad}
              onChange={e => { setCantidad(e.target.value); setError(null); }}
              autoFocus
              placeholder="0"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
            <input
              type="date"
              value={fecha}
              onChange={e => setFecha(e.target.value)}
              max={hoy()}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Observaciones</label>
            <textarea
              value={obs}
              onChange={e => setObs(e.target.value)}
              rows={2}
              placeholder="Motivo, proveedor, referencia…"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
            />
          </div>

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
              Guardar
            </button>
            <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-gray-300 rounded-xl text-sm hover:bg-gray-50">
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
