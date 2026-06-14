// frontend/src/pages/Configuracion/ConfiguracionEmpresa.jsx
import { useState, useEffect } from 'react';
import { Save, Building2 } from 'lucide-react';
import api from '../../services/api';
import LoadingSpinner from '../../components/Common/LoadingSpinner';
import toast from 'react-hot-toast';

export default function ConfiguracionEmpresa() {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({});

  useEffect(() => {
    api.get('/configuracion-empresa/1/')
      .then((r) => { setConfig(r.data); setForm(r.data); })
      .catch(() => toast.error('Error al cargar configuracion'))
      .finally(() => setLoading(false));
  }, []);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const r = await api.patch('/configuracion-empresa/1/', {
        umbral_desviacion_produccion: form.umbral_desviacion_produccion,
        umbral_matas_sin_reportar: form.umbral_matas_sin_reportar,
        periodo_pago: form.periodo_pago,
      });
      setConfig(r.data);
      toast.success('Configuracion guardada');
    } catch {
      toast.error('Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex justify-center py-12"><LoadingSpinner size="lg" /></div>;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Building2 className="w-7 h-7 text-blue-600" />
        <div>
          <h1 className="text-2xl font-bold">Configuracion de Empresa</h1>
          <p className="text-gray-500 text-sm">{config?.razon_social}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Alertas de produccion */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="font-semibold text-gray-800 mb-4">Umbrales de alerta de produccion</h2>
          <p className="text-sm text-gray-500 mb-4">
            Estos valores definen cuando el sistema emite alertas en la validacion cruzada de embarques.
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Umbral desviacion produccion (%)
              </label>
              <input
                type="number" step="0.5" min="1" max="100"
                value={form.umbral_desviacion_produccion ?? ''}
                onChange={(e) => set('umbral_desviacion_produccion', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-400 mt-0.5">
                Alerta si las cajas netas se desvian mas de este % de lo esperado. Default: 10%
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Umbral matas sin reportar
              </label>
              <input
                type="number" min="0"
                value={form.umbral_matas_sin_reportar ?? ''}
                onChange={(e) => set('umbral_matas_sin_reportar', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-400 mt-0.5">
                Alerta si hay mas de este numero de matas encintadas que no llegaron al corte. Default: 5
              </p>
            </div>
          </div>
        </div>

        {/* Nomina */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="font-semibold text-gray-800 mb-4">Nomina</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Periodo de pago</label>
            <select value={form.periodo_pago ?? ''} onChange={(e) => set('periodo_pago', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="QUINCENAL">Quincenal</option>
              <option value="MENSUAL">Mensual</option>
              <option value="SEMANAL">Semanal</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end">
          <button type="submit" disabled={saving}
            className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400 text-sm font-medium">
            <Save className="w-4 h-4" />
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      </form>
    </div>
  );
}