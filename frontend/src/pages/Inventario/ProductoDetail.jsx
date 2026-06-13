// frontend/src/pages/Inventario/ProductoDetail.jsx

import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Package, ArrowLeft, Edit2, TrendingUp, TrendingDown,
  Sliders, AlertTriangle, Clock, Plus, Warehouse, X, Save,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import inventarioService from '../../services/inventarioService';
import LoadingSpinner from '../../components/Common/LoadingSpinner';
import MovimientoForm from './MovimientoForm';
import StockFincaForm from './StockFincaForm';
import toast from 'react-hot-toast';

const TIPO_CONFIG = {
  ENTRADA: { label: 'Entrada',  icon: TrendingUp,   color: 'text-green-600', bg: 'bg-green-50 border-green-200' },
  SALIDA:  { label: 'Salida',   icon: TrendingDown, color: 'text-red-600',   bg: 'bg-red-50 border-red-200'     },
  AJUSTE:  { label: 'Ajuste',   icon: Sliders,      color: 'text-blue-600',  bg: 'bg-blue-50 border-blue-200'   },
};

const CATEGORIA_COLORS = {
  AGROQUIMICOS:  'bg-red-100 text-red-800',
  MATERIALES:    'bg-blue-100 text-blue-800',
  HERRAMIENTAS:  'bg-yellow-100 text-yellow-800',
  COMBUSTIBLES:  'bg-orange-100 text-orange-800',
  OTROS:         'bg-gray-100 text-gray-700',
};

// ── Modal editar stock mínimo ─────────────────────────────────────────────────
function EditarMinimoModal({ stock, unidad, onClose, onSuccess }) {
  const [valor, setValor]   = useState(String(stock.stock_minimo));
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await inventarioService.updateStock(stock.id, { stock_minimo: Number(valor) });
      toast.success('Stock mínimo actualizado');
      onSuccess();
    } catch {
      toast.error('Error actualizando el mínimo');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900 text-sm">Editar stock mínimo</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700">
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Stock mínimo ({unidad}) — alerta cuando el stock baje de este valor
            </label>
            <input
              autoFocus
              type="number"
              min="0"
              step="0.01"
              value={valor}
              onChange={e => setValor(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-1.5 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm font-medium"
            >
              {saving ? <LoadingSpinner size="sm" /> : <Save className="w-3.5 h-3.5" />}
              Guardar
            </button>
            <button type="button" onClick={onClose} className="flex-1 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────
export default function ProductoDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { canModify } = useAuth();

  const [producto, setProducto]           = useState(null);
  const [stocks, setStocks]               = useState([]);
  const [stockSeleccionado, setStockSel]  = useState(null);
  const [movimientos, setMovimientos]     = useState([]);
  const [totalMovs, setTotalMovs]         = useState(0);
  const [loadingMovs, setLoadingMovs]     = useState(false);
  const [loading, setLoading]             = useState(true);

  const [showMovForm, setShowMovForm]       = useState(false);
  const [tipoMovForm, setTipoMovForm]       = useState('ENTRADA');
  const [showStockForm, setShowStockForm]   = useState(false);
  const [editandoMinimo, setEditandoMinimo] = useState(null); // stock obj | null

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const [prod, stocksData] = await Promise.all([
        inventarioService.getProducto(id),
        inventarioService.getProductoStocks(id),
      ]);
      setProducto(prod);
      const lista = stocksData.results ?? stocksData;
      setStocks(lista);
      if (lista.length > 0) setStockSel(prev => prev ?? lista[0]);
    } catch {
      toast.error('Error cargando el producto');
      navigate('/inventario');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => { cargar(); }, [cargar]);

  useEffect(() => {
    if (!stockSeleccionado) return;
    setLoadingMovs(true);
    inventarioService.getMovimientosPorStock(stockSeleccionado.id, { limit: 30 })
      .then(data => {
        setMovimientos(data.results ?? data);
        setTotalMovs(data.count ?? (data.results ?? data).length);
      })
      .catch(() => toast.error('Error cargando movimientos'))
      .finally(() => setLoadingMovs(false));
  }, [stockSeleccionado]);

  const abrirMovimiento = (tipo) => { setTipoMovForm(tipo); setShowMovForm(true); };

  const refrescarStock = (stockId) => {
    inventarioService.getStock(stockId).then(updated => {
      setStockSel(updated);
      setStocks(prev => prev.map(s => s.id === updated.id ? updated : s));
    }).catch(() => {});
  };

  if (loading) return <div className="flex justify-center py-20"><LoadingSpinner /></div>;
  if (!producto) return null;

  const hayStocks = stocks.length > 0;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">

      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/inventario')} className="text-gray-400 hover:text-gray-700">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <Package className="w-6 h-6 text-green-600 shrink-0" />
            <h1 className="text-2xl font-bold text-gray-900">{producto.nombre}</h1>
            <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${CATEGORIA_COLORS[producto.categoria] ?? 'bg-gray-100 text-gray-700'}`}>
              {producto.categoria_display}
            </span>
            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
              {producto.unidad_display}
            </span>
          </div>
          {producto.descripcion && <p className="text-sm text-gray-500 mt-1 ml-9">{producto.descripcion}</p>}
        </div>
        {canModify() && (
          <button
            onClick={() => navigate(`/inventario/productos/${id}/editar`)}
            className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 shrink-0"
          >
            <Edit2 className="w-4 h-4" /> Editar
          </button>
        )}
      </div>

      {/* Stocks por bodega */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-gray-800 flex items-center gap-2">
            <Warehouse className="w-4 h-4 text-gray-500" />
            Stock por bodega
          </h2>
          {canModify() && (
            <button
              onClick={() => setShowStockForm(true)}
              className="flex items-center gap-1.5 text-sm text-green-700 border border-green-300 px-3 py-1.5 rounded-lg hover:bg-green-50"
            >
              <Plus className="w-3.5 h-3.5" /> Agregar stock
            </button>
          )}
        </div>

        {!hayStocks ? (
          <div className="bg-gray-50 border border-dashed border-gray-300 rounded-xl flex flex-col items-center py-10 gap-3 text-gray-400">
            <Warehouse className="w-10 h-10" />
            <p className="text-sm">Este producto aún no tiene stock en ninguna bodega.</p>
            {canModify() && (
              <button
                onClick={() => setShowStockForm(true)}
                className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 text-sm"
              >
                <Plus className="w-4 h-4" /> Agregar stock
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {stocks.map(s => {
              const activo = stockSeleccionado?.id === s.id;
              const bajo   = s.stock_bajo;
              const pct    = s.stock_minimo > 0
                ? Math.min(100, (s.stock_actual / s.stock_minimo) * 100)
                : null;
              return (
                <div
                  key={s.id}
                  onClick={() => setStockSel(s)}
                  className={`rounded-xl border-2 p-4 cursor-pointer transition-all ${activo ? 'border-green-500 shadow-md' : 'border-gray-200 hover:border-gray-300'} ${bajo ? 'bg-red-50' : 'bg-white'}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-gray-700">
                      {s.bodega_nombre ?? <span className="italic text-gray-400">—</span>}
                    </span>
                    {bajo && <AlertTriangle className="w-4 h-4 text-red-500" />}
                  </div>
                  <p className={`text-2xl font-bold ${bajo ? 'text-red-600' : 'text-gray-900'}`}>
                    {Number.parseFloat(s.stock_actual).toLocaleString('es-CO', { maximumFractionDigits: 2 })}
                    <span className="text-sm font-normal text-gray-400 ml-1">{producto.unidad_display}</span>
                  </p>
                  {/* Stock mínimo con botón editar */}
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-xs text-gray-400">
                      Mínimo: {Number.parseFloat(s.stock_minimo).toLocaleString('es-CO', { maximumFractionDigits: 2 })} {producto.unidad_display}
                    </p>
                    {activo && canModify() && (
                      <button
                        onClick={e => { e.stopPropagation(); setEditandoMinimo(s); }}
                        className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-0.5 ml-2"
                        title="Editar mínimo"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                  {pct !== null && (
                    <div className="mt-1.5">
                      <div className="h-1.5 rounded-full bg-gray-200">
                        <div
                          className={`h-1.5 rounded-full ${pct <= 100 ? 'bg-red-400' : 'bg-green-400'}`}
                          style={{ width: `${Math.min(pct, 100)}%` }}
                        />
                      </div>
                    </div>
                  )}
                  {/* Botones de acción rápida en el card seleccionado */}
                  {activo && canModify() && (
                    <div className="flex gap-1.5 mt-3 pt-3 border-t border-gray-100">
                      <button
                        onClick={e => { e.stopPropagation(); abrirMovimiento('ENTRADA'); }}
                        className="flex-1 flex items-center justify-center gap-1 py-1.5 text-xs bg-green-100 text-green-700 rounded-lg hover:bg-green-200"
                      >
                        <TrendingUp className="w-3.5 h-3.5" /> Entrada
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); abrirMovimiento('SALIDA'); }}
                        className="flex-1 flex items-center justify-center gap-1 py-1.5 text-xs bg-red-100 text-red-700 rounded-lg hover:bg-red-200"
                      >
                        <TrendingDown className="w-3.5 h-3.5" /> Salida
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); abrirMovimiento('AJUSTE'); }}
                        className="flex-1 flex items-center justify-center gap-1 py-1.5 text-xs bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200"
                      >
                        <Sliders className="w-3.5 h-3.5" /> Ajuste
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Historial de movimientos del stock seleccionado */}
      {hayStocks && stockSeleccionado && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-400" />
              <h2 className="font-semibold text-gray-800">
                Historial — {stockSeleccionado.bodega_nombre ?? '—'}
              </h2>
            </div>
            <span className="text-xs text-gray-400">{totalMovs} en total · últimos 30</span>
          </div>

          {loadingMovs ? (
            <div className="flex justify-center py-10"><LoadingSpinner /></div>
          ) : movimientos.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-gray-400 gap-2">
              <Clock className="w-8 h-8" />
              <p className="text-sm">Sin movimientos en esta bodega aún.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {movimientos.map(m => {
                const cfg  = TIPO_CONFIG[m.tipo] ?? TIPO_CONFIG.AJUSTE;
                const Icon = cfg.icon;
                const signo = m.tipo === 'ENTRADA' ? '+' : m.tipo === 'SALIDA' ? '-' : '≈';
                return (
                  <div key={m.id} className="flex items-start gap-4 px-5 py-3 hover:bg-gray-50">
                    <div className={`mt-0.5 p-1.5 rounded-lg border ${cfg.bg}`}>
                      <Icon className={`w-4 h-4 ${cfg.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-sm text-gray-800">{cfg.label}</span>
                        <span className={`text-sm font-semibold ${cfg.color}`}>
                          {signo}{Number.parseFloat(m.cantidad).toLocaleString('es-CO', { maximumFractionDigits: 2 })} {producto.unidad_display}
                        </span>
                      </div>
                      <div className="text-xs text-gray-400 flex items-center gap-3 mt-0.5">
                        <span>{new Date(m.fecha).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                        {m.creado_por && <span>· {m.creado_por}</span>}
                        <span>
                          · {Number.parseFloat(m.stock_antes).toLocaleString('es-CO', { maximumFractionDigits: 2 })} → {Number.parseFloat(m.stock_despues).toLocaleString('es-CO', { maximumFractionDigits: 2 })} {producto.unidad_display}
                        </span>
                      </div>
                      {m.observaciones && (
                        <p className="text-xs text-gray-500 mt-0.5 italic">"{m.observaciones}"</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Modal: registrar movimiento */}
      {showMovForm && stockSeleccionado && (
        <MovimientoForm
          stockFinca={stockSeleccionado}
          tipoInicial={tipoMovForm}
          onClose={() => setShowMovForm(false)}
          onSuccess={() => {
            setShowMovForm(false);
            refrescarStock(stockSeleccionado.id);
            setLoadingMovs(true);
            inventarioService.getMovimientosPorStock(stockSeleccionado.id, { limit: 30 })
              .then(data => {
                setMovimientos(data.results ?? data);
                setTotalMovs(data.count ?? (data.results ?? data).length);
              })
              .finally(() => setLoadingMovs(false));
          }}
        />
      )}

      {/* Modal: agregar stock en nueva bodega */}
      {showStockForm && (
        <StockFincaForm
          producto={producto}
          stocksExistentes={stocks}
          onClose={() => setShowStockForm(false)}
          onSuccess={() => { setShowStockForm(false); cargar(); }}
        />
      )}

      {/* Modal: editar stock mínimo */}
      {editandoMinimo && (
        <EditarMinimoModal
          stock={editandoMinimo}
          unidad={producto.unidad_display}
          onClose={() => setEditandoMinimo(null)}
          onSuccess={() => {
            setEditandoMinimo(null);
            refrescarStock(editandoMinimo.id);
          }}
        />
      )}
    </div>
  );
}
