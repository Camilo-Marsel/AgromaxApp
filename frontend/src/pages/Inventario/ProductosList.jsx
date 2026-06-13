// frontend/src/pages/Inventario/ProductosList.jsx

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Package, Plus, AlertTriangle, Search,
  TrendingDown, BarChart2, ChevronRight, RefreshCw, Warehouse,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import inventarioService from '../../services/inventarioService';
import LoadingSpinner from '../../components/Common/LoadingSpinner';
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

  // Vista: 'catalogo' muestra productos, 'stocks' muestra stocks por finca
  const [vista, setVista] = useState('catalogo');

  const [productos, setProductos] = useState([]);
  const [stocks, setStocks]       = useState([]);
  const [resumen, setResumen]     = useState(null);
  const [bodegas, setBodegas]     = useState([]);
  const [loading, setLoading]     = useState(true);

  const [search, setSearch]               = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('');
  const [filtroBodega, setFiltroBodega]       = useState('');
  const [soloStockBajo, setSoloStockBajo]     = useState(false);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const bodegasData = await inventarioService.getBodegas();
      setBodegas(bodegasData.results ?? bodegasData);

      const resumenData = await inventarioService.getResumen(
        filtroBodega ? { bodega: filtroBodega } : {},
      );
      setResumen(resumenData);

      if (vista === 'catalogo') {
        const params = { activo: true };
        if (filtroCategoria) params.categoria = filtroCategoria;
        if (search)          params.search    = search;
        const data = await inventarioService.getProductos(params);
        setProductos(data.results ?? data);
      } else {
        if (soloStockBajo) {
          const data = await inventarioService.getStockBajo(
            filtroBodega ? { bodega: filtroBodega } : {},
          );
          setStocks(data.results ?? data);
        } else {
          const params = { activo: true };
          if (filtroBodega)    params.bodega              = filtroBodega;
          if (filtroCategoria) params.producto__categoria = filtroCategoria;
          const data = await inventarioService.getStocks(params);
          setStocks(data.results ?? data);
        }
      }
    } catch {
      toast.error('Error cargando inventario');
    } finally {
      setLoading(false);
    }
  }, [vista, filtroCategoria, filtroBodega, search, soloStockBajo]);

  useEffect(() => { cargar(); }, [cargar]);

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Package className="w-7 h-7 text-green-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Inventario</h1>
            <p className="text-sm text-gray-500">Gestión de productos e insumos</p>
          </div>
        </div>
        {canModify() && (
          <button
            onClick={() => navigate('/inventario/productos/nuevo')}
            className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm"
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
              <span className="text-sm text-gray-500">Entradas de stock</span>
              <BarChart2 className="w-5 h-5 text-blue-400" />
            </div>
            <p className="text-3xl font-bold text-gray-900 mt-1">{resumen.total_productos}</p>
            <p className="text-xs text-gray-400 mt-1">
              {filtroBodega ? 'en esta bodega' : 'en todas las bodegas'}
            </p>
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
                onClick={() => { setVista('stocks'); setSoloStockBajo(true); }}
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

      {/* Tabs vista */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        <button
          onClick={() => setVista('catalogo')}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${vista === 'catalogo' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
        >
          Catálogo
        </button>
        <button
          onClick={() => setVista('stocks')}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 ${vista === 'stocks' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
        >
          <Warehouse className="w-3.5 h-3.5" />
          Stock por bodega
        </button>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-wrap gap-3 items-end">
          {vista === 'catalogo' && (
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
          )}

          <select
            value={filtroCategoria}
            onChange={e => setFiltroCategoria(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            {CATEGORIAS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>

          {vista === 'stocks' && (
            <select
              value={filtroBodega}
              onChange={e => setFiltroBodega(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="">Todas las bodegas</option>
              {bodegas.map(b => <option key={b.id} value={b.id}>{b.nombre}</option>)}
            </select>
          )}

          {vista === 'stocks' && (
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
          )}

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
        ) : vista === 'catalogo' ? (
          <CatalogoTable productos={productos} navigate={navigate} />
        ) : (
          <StocksTable stocks={stocks} navigate={navigate} />
        )}
      </div>
    </div>
  );
}

function CatalogoTable({ productos, navigate }) {
  if (productos.length === 0) {
    return (
      <div className="flex flex-col items-center py-16 text-gray-400 gap-3">
        <Package className="w-12 h-12" />
        <p className="text-lg font-medium">Sin productos</p>
        <p className="text-sm">Agrega el primer producto al catálogo.</p>
      </div>
    );
  }
  return (
    <table className="w-full text-sm">
      <thead className="bg-gray-50 border-b border-gray-200">
        <tr>
          <th className="text-left px-4 py-3 font-medium text-gray-600">Producto</th>
          <th className="text-left px-4 py-3 font-medium text-gray-600">Categoría</th>
          <th className="text-left px-4 py-3 font-medium text-gray-600">Unidad</th>
          <th className="text-center px-4 py-3 font-medium text-gray-600">Bodegas con stock</th>
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
                <div className="text-xs text-gray-400 truncate max-w-[220px]">{p.descripcion}</div>
              )}
            </td>
            <td className="px-4 py-3">
              <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${CATEGORIA_COLORS[p.categoria] ?? 'bg-gray-100 text-gray-700'}`}>
                {p.categoria_display}
              </span>
            </td>
            <td className="px-4 py-3 text-gray-500">{p.unidad_display}</td>
            <td className="px-4 py-3 text-center">
              {p.total_bodegas > 0 ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                  <Warehouse className="w-3 h-3" /> {p.total_bodegas}
                </span>
              ) : (
                <span className="text-xs text-gray-400">Sin stock</span>
              )}
            </td>
            <td className="px-4 py-3 text-gray-400">
              <ChevronRight className="w-4 h-4" />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function StocksTable({ stocks, navigate }) {
  if (stocks.length === 0) {
    return (
      <div className="flex flex-col items-center py-16 text-gray-400 gap-3">
        <Warehouse className="w-12 h-12" />
        <p className="text-lg font-medium">Sin registros de stock</p>
        <p className="text-sm">Abre un producto del catálogo y agrega su stock por finca.</p>
      </div>
    );
  }
  return (
    <table className="w-full text-sm">
      <thead className="bg-gray-50 border-b border-gray-200">
        <tr>
          <th className="text-left px-4 py-3 font-medium text-gray-600">Producto</th>
          <th className="text-left px-4 py-3 font-medium text-gray-600">Bodega</th>
          <th className="text-right px-4 py-3 font-medium text-gray-600">Stock actual</th>
          <th className="text-right px-4 py-3 font-medium text-gray-600">Mínimo</th>
          <th className="text-center px-4 py-3 font-medium text-gray-600">Estado</th>
          <th className="px-4 py-3"></th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100">
        {stocks.map(s => (
          <tr
            key={s.id}
            onClick={() => navigate(`/inventario/productos/${s.producto_id ?? s.producto?.id ?? s.producto}`)}
            className="hover:bg-gray-50 cursor-pointer transition-colors"
          >
            <td className="px-4 py-3">
              <div className="font-medium text-gray-900">{s.producto_nombre}</div>
              <div className="text-xs text-gray-400">{s.producto_categoria_display ?? s.categoria_display}</div>
            </td>
            <td className="px-4 py-3 text-gray-600">
              {s.bodega_nombre ?? <span className="text-gray-400 italic">—</span>}
            </td>
            <td className={`px-4 py-3 text-right font-semibold ${s.stock_bajo ? 'text-red-600' : 'text-green-700'}`}>
              {parseFloat(s.stock_actual).toLocaleString('es-CO', { maximumFractionDigits: 2 })}
              <span className="text-xs font-normal text-gray-400 ml-1">{s.producto_unidad_display ?? s.unidad_display}</span>
            </td>
            <td className="px-4 py-3 text-right text-gray-500">
              {parseFloat(s.stock_minimo).toLocaleString('es-CO', { maximumFractionDigits: 2 })}
            </td>
            <td className="px-4 py-3 text-center">
              {s.stock_bajo ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                  <AlertTriangle className="w-3 h-3" /> Bajo
                </span>
              ) : (
                <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">OK</span>
              )}
            </td>
            <td className="px-4 py-3 text-gray-400">
              <ChevronRight className="w-4 h-4" />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
