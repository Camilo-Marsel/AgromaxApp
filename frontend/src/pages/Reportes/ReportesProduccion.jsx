// frontend/src/pages/Reportes/ReportesProduccion.jsx
import { useState, useEffect } from 'react';
import { ArrowLeft, TrendingUp, Package } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import fincaService from '../../services/fincaService';
import loteService from '../../services/loteService';
import produccionService from '../../services/produccionService';
import LoadingSpinner from '../../components/Common/LoadingSpinner';
import { COLORES_CINTA } from '../../utils/produccionUtils';

const colorLabel = (v) => COLORES_CINTA.find((c) => c.value === v)?.label || v;

function MiniBarChart({ data, valueKey, labelKey, color = 'blue' }) {
  if (!data.length) return <p className="text-xs text-gray-400">Sin datos</p>;
  const max = Math.max(...data.map((d) => d[valueKey] ?? 0), 1);
  return (
    <div className="space-y-1">
      {data.map((d, i) => (
        <div key={i} className="flex items-center gap-2 text-xs">
          <span className="w-20 text-gray-500 truncate text-right">{d[labelKey]}</span>
          <div className="flex-1 bg-gray-100 rounded h-4 overflow-hidden">
            <div className={'h-full rounded bg-' + color + '-400 transition-all'} style={{ width: ((d[valueKey] ?? 0) / max) * 100 + '%' }} />
          </div>
          <span className="w-10 text-right font-medium text-gray-700">{d[valueKey] ?? '—'}</span>
        </div>
      ))}
    </div>
  );
}

function LineChart({ data, valueKey, labelKey }) {
  if (data.length < 2) return <p className="text-xs text-gray-400">Se necesitan al menos 2 embarques.</p>;
  const values = data.map((d) => d[valueKey] ?? 0);
  const min = Math.min(...values); const max = Math.max(...values);
  const range = max - min || 1; const W = 400; const H = 120; const pad = 20;
  const points = data.map((d, i) => {
    const x = pad + (i / (data.length - 1)) * (W - pad * 2);
    const y = H - pad - ((d[valueKey] - min) / range) * (H - pad * 2);
    return [x, y, d[labelKey], d[valueKey]];
  });
  const polyline = points.map(([x, y]) => x + ',' + y).join(' ');
  return (
    <div className="overflow-x-auto">
      <svg viewBox={'0 0 ' + W + ' ' + H} className="w-full max-w-full h-32">
        <polyline fill="none" stroke="#3b82f6" strokeWidth="2" points={polyline} />
        {points.map(([x, y, label, val], i) => (
          <g key={i}><circle cx={x} cy={y} r="3" fill="#3b82f6" /><title>{label}: {val}</title></g>
        ))}
      </svg>
      <div className="flex justify-between text-xs text-gray-400 mt-1">
        <span>{data[0][labelKey]}</span><span>{data[data.length - 1][labelKey]}</span>
      </div>
    </div>
  );
}

export default function ReportesProduccion() {
  const navigate = useNavigate();
  const [fincas, setFincas] = useState([]);
  const [lotes, setLotes] = useState([]);
  const [fincaSel, setFincaSel] = useState('');
  const [loteSel, setLoteSel] = useState('');
  const [tendencia, setTendencia] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => { fincaService.getAll().then((d) => setFincas(d.results || d)).catch(() => {}); }, []);

  useEffect(() => {
    if (fincaSel) { loteService.getByFinca(fincaSel).then((d) => setLotes(d.results || d)).catch(() => setLotes([])); setLoteSel(''); }
    else setLotes([]);
  }, [fincaSel]);

  useEffect(() => {
    if (!fincaSel) { setTendencia([]); return; }
    setLoading(true);
    produccionService.getTendencia(fincaSel, loteSel || null)
      .then(setTendencia).catch(() => setTendencia([])).finally(() => setLoading(false));
  }, [fincaSel, loteSel]);

  const ratioData = tendencia.map((e) => ({ label: e.semana_año.slice(5), value: e.ratio })).filter((d) => d.value != null);
  const cajasData = tendencia.map((e) => ({ label: e.semana_año.slice(5), value: e.cajas_netas }));
  const cintasData = tendencia.map((e) => ({ label: e.semana_año.slice(5), value: e.total_cintas }));
  const avgRatio = ratioData.length ? (ratioData.reduce((s, d) => s + d.value, 0) / ratioData.length).toFixed(4) : null;
  const totalCajas = cajasData.reduce((s, d) => s + d.value, 0);
  const totalCintas = cintasData.reduce((s, d) => s + d.value, 0);
  const coloresResumen = COLORES_CINTA
    .map((c) => ({ color: c.value, label: c.label, total: tendencia.filter((e) => e.color_cinta === c.value).reduce((s, e) => s + e.cajas_netas, 0) }))
    .filter((c) => c.total > 0).sort((a, b) => b.total - a.total);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/reportes')} className="text-gray-500 hover:text-gray-700"><ArrowLeft className="w-5 h-5" /></button>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><TrendingUp className="w-6 h-6 text-green-600" /> Reportes de Produccion</h1>
          <p className="text-sm text-gray-500">Tendencias de embarque por finca</p>
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg shadow flex gap-4 flex-wrap">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs text-gray-500 mb-1">Finca *</label>
          <select value={fincaSel} onChange={(e) => setFincaSel(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm">
            <option value="">Seleccione una finca...</option>
            {fincas.map((f) => <option key={f.id} value={f.id}>{f.nombre}</option>)}
          </select>
        </div>
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs text-gray-500 mb-1">Lote (opcional)</label>
          <select value={loteSel} onChange={(e) => setLoteSel(e.target.value)} disabled={!fincaSel} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm disabled:bg-gray-100">
            <option value="">Todos los lotes</option>
            {lotes.map((l) => <option key={l.id} value={l.id}>{l.nombre}</option>)}
          </select>
        </div>
      </div>

      {!fincaSel ? (
        <div className="bg-white rounded-lg shadow p-12 text-center text-gray-400">Seleccione una finca para ver el reporte.</div>
      ) : loading ? (
        <div className="flex justify-center py-12"><LoadingSpinner size="lg" /></div>
      ) : tendencia.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center text-gray-400">Sin embarques registrados para esta finca.</div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Ratio promedio', value: avgRatio ?? '—', sub: 'matas / caja' },
              { label: 'Total cajas netas', value: totalCajas.toLocaleString('es-CO'), sub: tendencia.length + ' embarques' },
              { label: 'Total cintas', value: totalCintas.toLocaleString('es-CO'), sub: 'en empacadora' },
            ].map((k) => (
              <div key={k.label} className="bg-white rounded-lg shadow p-4 text-center">
                <p className="text-2xl font-bold text-gray-900">{k.value}</p>
                <p className="text-xs font-medium text-gray-700 mt-1">{k.label}</p>
                <p className="text-xs text-gray-400">{k.sub}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow p-5">
              <h2 className="font-semibold text-gray-800 mb-3 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-blue-500" /> Ratio historico (matas/caja)</h2>
              <LineChart data={ratioData} valueKey="value" labelKey="label" />
            </div>
            <div className="bg-white rounded-lg shadow p-5">
              <h2 className="font-semibold text-gray-800 mb-3 flex items-center gap-2"><Package className="w-4 h-4 text-green-500" /> Cajas netas por semana</h2>
              <MiniBarChart data={cajasData} valueKey="value" labelKey="label" color="green" />
            </div>
            <div className="bg-white rounded-lg shadow p-5">
              <h2 className="font-semibold text-gray-800 mb-3">Cintas por semana</h2>
              <MiniBarChart data={cintasData} valueKey="value" labelKey="label" color="blue" />
            </div>
            <div className="bg-white rounded-lg shadow p-5">
              <h2 className="font-semibold text-gray-800 mb-3">Cajas por color de cinta</h2>
              <MiniBarChart data={coloresResumen.map((c) => ({ label: c.label, value: c.total }))} valueKey="value" labelKey="label" color="purple" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {['Semana','Fecha','Color','Cintas','Cajas netas','Ratio'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {[...tendencia].reverse().map((e) => (
                  <tr key={e.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 font-medium">{e.semana_año}</td>
                    <td className="px-4 py-2 text-gray-500">{new Date(e.fecha_embarque + 'T00:00:00').toLocaleDateString('es-CO')}</td>
                    <td className="px-4 py-2"><span className="inline-flex px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-700">{colorLabel(e.color_cinta)}</span></td>
                    <td className="px-4 py-2">{e.total_cintas}</td>
                    <td className="px-4 py-2 font-semibold">{e.cajas_netas}</td>
                    <td className="px-4 py-2">{e.ratio ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}