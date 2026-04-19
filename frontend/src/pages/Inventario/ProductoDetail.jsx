// frontend/src/pages/Inventario/ProductoDetail.jsx

import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Package, ArrowLeft, Edit2, TrendingUp, TrendingDown,
  Sliders, AlertTriangle, Clock, Plus,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import inventarioService from '../../services/inventarioService';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import MovimientoForm from './MovimientoForm';
import toast from 'react-hot-toast';

const TIPO_CONFIG = {
  ENTRADA: { label: 'Entrada',  icon: TrendingUp,   color: 'text-green-600', bg: 'bg-green-50 border-green-200' },
  SALIDA:  { label: 'Salida',   icon: TrendingDown, color: 'text-red-600',   bg: 'bg-red-50 border-red-200'     },
  AJUSTE:  { label: 'Ajuste',   icon: Sliders,      color: 'text-blue-600',  bg: 'bg-blue-50 border-blue-200'   },
};

export default function ProductoDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { canModify } = useAuth();

  const [producto, setProducto]         = useState(null);
  const [movimientos, setMovimientos]   = useState([]);
  const [totalMovs, setTotalMovs]       = useState(0);
  const [loading, setLoading]           = useState(true);
  const [showMovForm, setShowMovForm]   = useState(false);
  const [tipoMovForm, setTipoMovForm]   = useState('ENTRADA');

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const [prod, movs] = await Promise.all([
        inventarioService.getProducto(id),
        inventarioService.getMovimientosPorProducto(id, { limit: 30 }),
      ]);
      setProducto(prod);
      setMovimientos(movs.results ?? movs);
      setTotalMovs(movs.count ?? (movs.results ?? movs).length);
    } catch {
      toast.error('Error cargando el producto');
      navigate('/inventario');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => { cargar(); }, [cargar]);

  const abrirMovimiento = (tipo) => {
    setTipoMovForm(tipo);
    setShowMovForm(true);
  };

  if (loading) return <div className="flex justify-center py-20"><LoadingSpinner /></div>;
  if (!producto) return null;

  const stockBajo = producto.stock_bajo;
  const porcentaje = producto.stock_minimo > 0
    ? Math.min(100, (producto.stock_actual / producto.stock_minimo) * 100)
    : null;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">

      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/inventario')} className="text-gray-400 hover:text-gray-700">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <Package className="w-6 h-6 text-green-600" />
            <h1 className="text-2xl font-bold text-gray-900">{producto.nombre}</h1>
            {stockBajo && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                <AlertTriangle className="w-3 h-3" /> Stock bajo
              </span>
            )}
          </div>
          {producto.descripcion && <p className="text-sm text-gray-500 mt-1 ml-9">{producto.descripcion}</p>}
        </div>
        {canModify() && (
          <button
            onClick={() => navigate(`/inventario/productos/${id}/editar`)}
            className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <Edit2 className="w-4 h-4" /> Editar
          </button>
        )}
      </div>

      {/* Ficha de stock */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className={`rounded-xl border-2 p-5 ${stockBajo ? 'border-red-300 bg-red-50' : 'border-green-300 bg-green-50'}`}>
          <p className="text-sm text-gray-500 mb-1">Stock actual</p>
          <p className={`text-4xl font-bold ${stockBajo ? 'text-red-600' : 'text-green-700'}`}>
            {parseFloat(producto.stock_actual).toLocaleString('es-CO', { maximumFractionDigits: 2 })}
          </p>
          <p className="text-sm text-gray-500 mt-1">{producto.unidad_display}</p>
          {porcentaje !== null && (
            <div className="mt-3">
              <div className="h-2 rounded-full bg-gray-200">
                <div
                  className={`h-2 rounded-full ${porcentaje <= 100 ? 'bg-red-400' : 'bg-green-400'}`}
                  style={{ width: `${Math.min(porcentaje, 100)}%` }}
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">{Math.round(porcentaje)}% del mínimo</p>
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm text-gray-500 mb-1">Stock mínimo</p>
          <p className="text-3xl font-bold text-gray-700">
            {parseFloat(producto.stock_minimo).toLocaleString('es-CO', { maximumFractionDigits: 2 })}
          </p>
          <p className="text-sm text-gray-500 mt-1">{producto.unidad_display}</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Categoría</span>
            <span className="font-medium">{producto.categoria_display}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Unidad</span>
            <span className="font-medium">{producto.unidad_display}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Finca</span>
            <span className="font-medium">{producto.finca_nombre ?? '—'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Movimientos</span>
            <span className="font-medium">{totalMovs}</span>
          </div>
        </div>
      </div>

      {/* Botones de acción */}
      {canModify() && (
        <div className="flex gap-3 flex-wrap">
          <button
            onClick={() => abrirMovimiento('ENTRADA')}
            className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 text-sm"
          >
            <TrendingUp className="w-4 h-4" /> Registrar entrada
          </button>
          <button
            onClick={() => abrirMovimiento('SALIDA')}
            className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 text-sm"
          >
            <TrendingDown className="w-4 h-4" /> Registrar salida
          </button>
          <button
            onClick={() => abrirMovimiento('AJUSTE')}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm"
          >
            <Sliders className="w-4 h-4" /> Ajuste de inventario
          </button>
        </div>
      )}

      {/* Modal movimiento */}
      {showMovForm && (
        <MovimientoForm
          producto={producto}
          tipoInicial={tipoMovForm}
          onClose={() => setShowMovForm(false)}
          onSuccess={() => { setShowMovForm(false); cargar(); }}
        />
      )}

      {/* Historial de movimientos */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-gray-400" />
            <h2 className="font-semibold text-gray-800">Historial de movimientos</h2>
          </div>
          <span className="text-xs text-gray-400">{totalMovs} en total · últimos 30</span>
        </div>

        {movimientos.length === 0 ? (
          <div className="flex flex-col items-center py-12 text-gray-400 gap-2">
            <Plus className="w-8 h-8" />
            <p>Sin movimientos registrados aún.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {movimientos.map(m => {
              const cfg = TIPO_CONFIG[m.tipo] ?? TIPO_CONFIG.AJUSTE;
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
                        {signo}{parseFloat(m.cantidad).toLocaleString('es-CO', { maximumFractionDigits: 2 })} {m.producto_unidad}
                      </span>
                    </div>
                    <div className="text-xs text-gray-400 flex items-center gap-3 mt-0.5">
                      <span>{new Date(m.fecha).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                      {m.creado_por && <span>· {m.creado_por}</span>}
                      <span>· {parseFloat(m.stock_antes).toLocaleString('es-CO', { maximumFractionDigits: 2 })} → {parseFloat(m.stock_despues).toLocaleString('es-CO', { maximumFractionDigits: 2 })} {m.producto_unidad}</span>
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
    </div>
  );
}
