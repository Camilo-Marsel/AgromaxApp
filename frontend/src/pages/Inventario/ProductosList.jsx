// frontend/src/pages/Inventario/ProductosList.jsx

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Package, Plus, AlertTriangle, Search, Filter,
  TrendingDown, BarChart2, ChevronRight, RefreshCw,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import inventarioService from '../../services/inventarioService';
import fincaService from '../../services/fincaService';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import toast from 'react-hot-toast';

const CATEGORIAS = [
  { value: '', label: 'Todas las categorías' },
  { value: 'AGROQUIMICOS', label: 'Agroquímicos' },
  { value: 'MATERIALES',   label: 'Materiales' },
  { value: 'HERRAMIENTAS', label: 'Herramientas' },
  { value: 'COMBUSTIBLES', label: 'Combustibles' },
  { value: 'OTROS',        label: 'Otros' },
];

const CATEGORIA_COLORS = {
  AGROQUIMICOS:  'bg-red-100 text-red-800',
  MATERIALES:    'bg-blue-100 text-blue-800',
  HERRAMIENTAS:  'bg-yellow-100 text-yellow-800',
  COMBUSTIBLES:  'bg-orange-100 text-orange-800',
  OTROS:         'bg-gray-100 text-gray-700',
};

export default function ProductosList() {
  const navigate = useNavigate();
  const { canModify } = useAuth();

  const [productos, setProductos]   = useState([]);
  const [resumen, setResumen]       = useState(null);
  const [fincas, setFincas]         = useState([]);
  const [loading, setLoading]       = useState(true);

  const [search, setSearch]         = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('');
  const [filtroFinca, setFiltroFinca]         = useState('');
  const [soloStockBajo, setSoloStockBajo]     = useState(false);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const params = { activo: true };
      if (filtroCategoria) params.categoria = filtroCategoria;
      if (filtroFinca)     params.finca     = filtroFinca;
      if (search)          params.search    = search;

      const [productosData, resumenData, fincasData] = await Promise.all([
        inventarioService.getProductos(params),
        inventarioService.getResumen(filtroFinca ? { finca: filtroFinca } : {}),
        fincaService.getAll(),
      ]);

      let lista = productosData.results ?? productosData;
      if (soloStockBajo) lista = lista.filter(p => p.stock_bajo);
      setProductos(lista);
      setResumen(resumenData);
      setFincas(fincasData.results ?? fincasData);
    } catch {
      toast.error('Error cargando inventario');
    } finally {
      setLoading(false);
    }
  }, [filtroCategoria, filtroFinca, search, soloStockBajo]);

  useEffect(() => { cargar(); }, [cargar]);

  const stockColor = (p) => {
    if (p.stock_bajo)                            return 'text-red-600 font-semibold';
    if (p.stock_minimo > 0 && p.stock_actual <= p.stock_minimo * 1.2) return 'text-yellow-600 font-semibold';
    return 'text-green-700 font-semibold';
  };

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Package className="w-7 h-7 text-green-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Inventario</h1>
            <p className="text-sm text-gray-500">Gestión de productos e insumos de la finca</p>
          </div>
        </div>
        {canModify() && (
          <button
            onClick={() => navigate('/inventario/productos/nuevo')}
            className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Nuevo producto
          </button>
        )}
      </div>

      {/* Tarjetas resumen */}
      {resumen && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Total productos</span>
              <BarChart2 className="w-5 h-5 text-blue-400" />
            </div>
            <p className="text-3xl font-bold text-gray-900 mt-1">{resumen.total_productos}</p>
          </div>

          <div className={`rounded-xl border p-5 ${resumen.productos_bajo_stock > 0 ? 'bg-red-50 border-red-200' : 'bg-white border-gray-200'}`}>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Stock bajo</span>
              <AlertTriangle className={`w-5 h-5 ${resumen.productos_bajo_stock > 0 ? 'text-red-500' : 'text-gray-300'}`} />
            </div>
            <p className={`text-3xl font-bold mt-1 ${resumen.productos_bajo_stock > 0 ? 'text-red-600' : 'text-gray-900'}`}>
              {resumen.productos_bajo_stock}
            </p>
            {resumen.productos_bajo_stock > 0 && (
              <button
                onClick={() => setSoloStockBajo(true)}
                className="text-xs text-red-600 hover:underline mt-1"
              >
                Ver productos →
              </button>
            )}
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Por categoría</span>
              <TrendingDown className="w-5 h-5 text-gray-400" />
            </div>
            <div className="mt-2 space-y-1">
              {Object.entries(resumen.por_categoria ?? {}).map(([cat, n]) => (
                <div key={cat} className="flex justify-between text-sm">
                  <span className="text-gray-600">{cat}</span>
                  <span className="font-medium">{n}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar producto…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
          </div>

          <div>
            <select
              value={filtroCategoria}
              onChange={e => setFiltroCategoria(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              {CATEGORIAS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>

          <div>
            <select
              value={filtroFinca}
              onChange={e => setFiltroFinca(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="">Todas las fincas</option>
              {fincas.map(f => <option key={f.id} value={f.id}>{f.nombre}</option>)}
            </select>
          </div>

          <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
            <input
              type="checkbox"
              checked={soloStockBajo}
              onChange={e => setSoloStockBajo(e.target.checked)}
              className="rounded text-red-600"
            />
            <span className="text-red-600 font-medium flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" /> Solo stock bajo
            </span>
          </label>

          <button
            onClick={cargar}
            className="flex items-center gap-1 px-3 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Actualizar
          </button>
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16"><LoadingSpinner /></div>
        ) : productos.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-gray-400 gap-3">
            <Package className="w-12 h-12" />
            <p className="text-lg font-medium">Sin productos</p>
            <p className="text-sm">
              {soloStockBajo ? 'Ningún producto con stock bajo.' : 'Agrega el primer producto al inventario.'}
            </p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Producto</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Categoría</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Finca</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Stock actual</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Mínimo</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">Estado</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {productos.map(p => (
                <tr
                  key={p.id}
                  onClick={() => navigate(`/inventario/productos/${p.id}`)}
                  className="hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{p.nombre}</div>
                    {p.descripcion && (
                      <div className="text-xs text-gray-400 truncate max-w-[200px]">{p.descripcion}</div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${CATEGORIA_COLORS[p.categoria] ?? 'bg-gray-100 text-gray-700'}`}>
                      {p.categoria_display}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{p.finca_nombre ?? <span className="text-gray-400">—</span>}</td>
                  <td className={`px-4 py-3 text-right ${stockColor(p)}`}>
                    {parseFloat(p.stock_actual).toLocaleString('es-CO', { maximumFractionDigits: 2 })}
                    <span className="text-xs font-normal text-gray-400 ml-1">{p.unidad_display}</span>
                  </td>
                  <td className="px-4 py-3 text-right text-gray-500">
                    {parseFloat(p.stock_minimo).toLocaleString('es-CO', { maximumFractionDigits: 2 })}
                    <span className="text-xs text-gray-400 ml-1">{p.unidad_display}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {p.stock_bajo ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                        <AlertTriangle className="w-3 h-3" /> Bajo
                      </span>
                    ) : (
                      <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                        OK
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-400">
                    <ChevronRight className="w-4 h-4" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
