// frontend/src/pages/Reportes/ReportesAmarre.jsx

import { useState, useEffect, useMemo } from 'react';
import api from '../../services/api';
import fincaService from '../../services/fincaService';
import LoadingSpinner from '../../components/Common/LoadingSpinner';
import { Layers, ChevronDown, ChevronUp } from 'lucide-react';

function semanaLabel(key) {
  // "2026-W27" → "Sem 27 / 2026"
  const [año, sem] = key.split('-W');
  return `Sem ${parseInt(sem)} / ${año}`;
}

export default function ReportesAmarre() {
  const [fincas, setFincas] = useState([]);
  const [fincaId, setFincaId] = useState('');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [agrupar, setAgrupar] = useState('lote'); // 'lote' | 'semana'
  const [expandidas, setExpandidas] = useState({});

  useEffect(() => {
    fincaService.getAll().then((res) => setFincas(res.results ?? res));
    // Fechas por defecto: últimas 8 semanas
    const hoy = new Date();
    const hace8 = new Date(hoy);
    hace8.setDate(hoy.getDate() - 56);
    setFechaDesde(hace8.toISOString().slice(0, 10));
    setFechaHasta(hoy.toISOString().slice(0, 10));
  }, []);

  async function buscar() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (fincaId) params.set('finca', fincaId);
      if (fechaDesde) params.set('fecha_desde', fechaDesde);
      if (fechaHasta) params.set('fecha_hasta', fechaHasta);
      const res = await api.get(`/registros-labor/amarre_por_lote/?${params}`);
      setData(res.data);
      setExpandidas({});
    } finally {
      setLoading(false);
    }
  }

  // Pivotar filas para tabla: semanas como columnas, lotes como filas
  const { semanas, lotes, labores, matriz } = useMemo(() => {
    if (!data) return { semanas: [], lotes: [], labores: [], matriz: {} };

    const semsSet = new Set();
    const lotesSet = new Set();
    const laboresSet = new Set();
    const mat = {}; // mat[lote][semana][labor] = cantidad

    for (const fila of data.filas) {
      semsSet.add(fila.semana);
      lotesSet.add(fila.lote);
      laboresSet.add(fila.labor);
      if (!mat[fila.lote]) mat[fila.lote] = {};
      if (!mat[fila.lote][fila.semana]) mat[fila.lote][fila.semana] = {};
      mat[fila.lote][fila.semana][fila.labor] = (mat[fila.lote][fila.semana][fila.labor] || 0) + fila.cantidad;
    }

    return {
      semanas: [...semsSet].sort(),
      lotes: [...lotesSet].sort(),
      labores: [...laboresSet].sort(),
      matriz: mat,
    };
  }, [data]);

  function toggleLote(lote) {
    setExpandidas((p) => ({ ...p, [lote]: !p[lote] }));
  }

  const totalGeneral = data?.totales_por_lote?.reduce((s, x) => s + x.total, 0) ?? 0;

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-6">
        <Layers className="w-7 h-7 text-green-600" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Amarre por Lote y Semana</h1>
          <p className="text-sm text-gray-500">Rendimiento de labores de amarre agrupado por lote y período</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 mb-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Finca</label>
            <select value={fincaId} onChange={(e) => setFincaId(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
              <option value="">Todas las fincas</option>
              {fincas.map((f) => <option key={f.id} value={f.id}>{f.nombre}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Desde</label>
            <input type="date" value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Hasta</label>
            <input type="date" value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div className="flex items-end">
            <button onClick={buscar} disabled={loading}
              className="w-full bg-green-600 hover:bg-green-700 text-white rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-60">
              {loading ? 'Cargando...' : 'Consultar'}
            </button>
          </div>
        </div>
      </div>

      {loading && <LoadingSpinner />}

      {data && !loading && (
        <>
          {/* Resumen rápido */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 text-center">
              <p className="text-2xl font-bold text-green-600">{totalGeneral.toLocaleString('es-CO', { maximumFractionDigits: 2 })}</p>
              <p className="text-xs text-gray-500 mt-1">Total amarres (unidades)</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 text-center">
              <p className="text-2xl font-bold text-blue-600">{lotes.length}</p>
              <p className="text-xs text-gray-500 mt-1">Lotes con registro</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 text-center">
              <p className="text-2xl font-bold text-purple-600">{semanas.length}</p>
              <p className="text-xs text-gray-500 mt-1">Semanas cubiertas</p>
            </div>
          </div>

          {/* Tabla pivote: lotes × semanas */}
          {semanas.length === 0 ? (
            <div className="text-center py-16 text-gray-400">No hay registros de amarre para este período.</div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mb-6">
              <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
                <p className="font-semibold text-gray-800 text-sm">Detalle por lote y semana</p>
                <p className="text-xs text-gray-400">Expandir lote para ver desglose por tipo de amarre</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="text-left px-4 py-3 font-medium text-gray-600 whitespace-nowrap sticky left-0 bg-gray-50 z-10 min-w-[160px]">Lote</th>
                      {semanas.map((s) => (
                        <th key={s} className="text-right px-3 py-3 font-medium text-gray-600 whitespace-nowrap min-w-[90px]">
                          {semanaLabel(s)}
                        </th>
                      ))}
                      <th className="text-right px-4 py-3 font-semibold text-gray-700 whitespace-nowrap bg-gray-50">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lotes.map((lote) => {
                      const totalLote = data.totales_por_lote.find((t) => t.lote === lote)?.total ?? 0;
                      const isOpen = expandidas[lote];
                      return [
                        // Fila del lote (totales por semana)
                        <tr key={lote} className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer"
                          onClick={() => toggleLote(lote)}>
                          <td className="px-4 py-2.5 font-medium text-gray-800 sticky left-0 bg-white hover:bg-gray-50 flex items-center gap-2">
                            {isOpen ? <ChevronUp className="w-3.5 h-3.5 text-gray-400 shrink-0" /> : <ChevronDown className="w-3.5 h-3.5 text-gray-400 shrink-0" />}
                            {lote}
                          </td>
                          {semanas.map((s) => {
                            const subtotal = labores.reduce((acc, l) => acc + (matriz[lote]?.[s]?.[l] ?? 0), 0);
                            return (
                              <td key={s} className="text-right px-3 py-2.5 tabular-nums text-gray-700">
                                {subtotal > 0 ? subtotal.toLocaleString('es-CO', { maximumFractionDigits: 2 }) : <span className="text-gray-300">—</span>}
                              </td>
                            );
                          })}
                          <td className="text-right px-4 py-2.5 font-semibold text-gray-800 tabular-nums">
                            {totalLote.toLocaleString('es-CO', { maximumFractionDigits: 2 })}
                          </td>
                        </tr>,
                        // Filas de desglose por tipo de amarre
                        ...(isOpen ? labores.map((labor) => {
                          const tieneAlgo = semanas.some((s) => (matriz[lote]?.[s]?.[labor] ?? 0) > 0);
                          if (!tieneAlgo) return null;
                          return (
                            <tr key={`${lote}-${labor}`} className="border-b border-gray-50 bg-green-50/30">
                              <td className="pl-10 pr-4 py-1.5 text-xs text-gray-500 sticky left-0 bg-green-50/30">{labor}</td>
                              {semanas.map((s) => {
                                const val = matriz[lote]?.[s]?.[labor] ?? 0;
                                return (
                                  <td key={s} className="text-right px-3 py-1.5 tabular-nums text-xs text-gray-600">
                                    {val > 0 ? val.toLocaleString('es-CO', { maximumFractionDigits: 2 }) : <span className="text-gray-200">—</span>}
                                  </td>
                                );
                              })}
                              <td className="px-4 py-1.5" />
                            </tr>
                          );
                        }).filter(Boolean) : []),
                      ];
                    })}
                    {/* Fila de totales por semana */}
                    <tr className="bg-gray-50 font-semibold border-t-2 border-gray-200">
                      <td className="px-4 py-3 text-gray-700 sticky left-0 bg-gray-50">Total semana</td>
                      {semanas.map((s) => {
                        const tot = data.totales_por_semana.find((x) => x.semana === s)?.total ?? 0;
                        return (
                          <td key={s} className="text-right px-3 py-3 tabular-nums text-gray-800">
                            {tot.toLocaleString('es-CO', { maximumFractionDigits: 2 })}
                          </td>
                        );
                      })}
                      <td className="text-right px-4 py-3 tabular-nums text-green-700 text-base">
                        {totalGeneral.toLocaleString('es-CO', { maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Ranking de lotes */}
          {data.totales_por_lote.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <p className="font-semibold text-gray-800 text-sm mb-4">Ranking por lote — período completo</p>
              <div className="space-y-2">
                {[...data.totales_por_lote].sort((a, b) => b.total - a.total).map((item, i) => {
                  const pct = totalGeneral > 0 ? (item.total / totalGeneral) * 100 : 0;
                  return (
                    <div key={item.lote} className="flex items-center gap-3">
                      <span className="text-xs text-gray-400 w-5 text-right">{i + 1}</span>
                      <span className="text-sm text-gray-700 w-36 truncate">{item.lote}</span>
                      <div className="flex-1 bg-gray-100 rounded-full h-2">
                        <div className="bg-green-500 h-2 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-sm font-medium text-gray-800 w-20 text-right tabular-nums">
                        {item.total.toLocaleString('es-CO', { maximumFractionDigits: 2 })}
                      </span>
                      <span className="text-xs text-gray-400 w-10 text-right">{pct.toFixed(1)}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
