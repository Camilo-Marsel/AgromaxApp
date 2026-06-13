// frontend/src/pages/Inventario/StockFincaForm.jsx
// Modal para agregar un nuevo registro de stock (producto + bodega)

import { useState, useEffect } from 'react';
import { X, Save, Warehouse } from 'lucide-react';
import inventarioService from '../../services/inventarioService';
import LoadingSpinner from '../../components/Common/LoadingSpinner';
import toast from 'react-hot-toast';

export default function StockFincaForm({ producto, stocksExistentes = [], onClose, onSuccess }) {
  const [bodegas, setBodegas]        = useState([]);
  const [bodega, setBodega]          = useState('');
  const [stockMinimo, setStockMin]   = useState('0');
  const [stockInicial, setStockIni]  = useState('0');
  const [saving, setSaving]          = useState(false);
  const [error, setError]            = useState(null);

  useEffect(() => {
    inventarioService.getBodegas({ activa: true })
      .then(d => setBodegas(d.results ?? d))
      .catch(() => {});
  }, []);

  // IDs de bodegas que ya tienen stock para este producto
  const bodegasOcupadas = new Set(stocksExistentes.map(s => s.bodega));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!bodega) {
      setError('Selecciona una bodega.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await inventarioService.createStock({
        producto:      producto.id,
        bodega:        Number(bodega),
        stock_minimo:  Number(stockMinimo),
        stock_inicial: Number(stockInicial),
      });
      toast.success('Stock agregado correctamente');
      onSuccess?.();
    } catch (err) {
      const data = err.response?.data;
      if (data?.non_field_errors) {
        setError(data.non_field_errors[0]);
      } else if (typeof data === 'object') {
        setError(Object.values(data).flat()[0] ?? 'Error guardando');
      } else {
        setError('Error guardando el stock');
      }
    } finally {
      setSaving(false);
    }
  };

  const bodegaOcupada = bodega !== '' && bodegasOcupadas.has(Number(bodega));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">

        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Warehouse className="w-5 h-5 text-green-600" />
            <h2 className="font-semibold text-gray-900">Agregar stock — {producto.nombre}</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Bodega
            </label>
            <select
              value={bodega}
              onChange={e => { setBodega(e.target.value); setError(null); }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="">Selecciona una bodega…</option>
              {bodegas.map(b => (
                <option key={b.id} value={b.id}>{b.nombre}</option>
              ))}
            </select>
            {bodegaOcupada && (
              <p className="text-xs text-amber-600 mt-1">
                Esta bodega ya tiene stock para este producto. Usa un movimiento de ajuste para modificarlo.
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Stock mínimo ({producto.unidad_display})
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={stockMinimo}
                onChange={e => setStockMin(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              <p className="text-xs text-gray-400 mt-1">Alerta cuando baje de este valor.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Stock inicial ({producto.unidad_display})
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={stockInicial}
                onChange={e => setStockIni(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              <p className="text-xs text-gray-400 mt-1">Cantidad disponible ahora.</p>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="submit"
              disabled={saving || bodegaOcupada || !bodega}
              className="flex-1 flex items-center justify-center gap-2 bg-green-600 text-white py-2.5 rounded-xl hover:bg-green-700 disabled:opacity-50 font-medium text-sm"
            >
              {saving ? <LoadingSpinner size="sm" /> : <Save className="w-4 h-4" />}
              Agregar stock
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
