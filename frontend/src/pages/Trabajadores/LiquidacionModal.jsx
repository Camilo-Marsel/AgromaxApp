// frontend/src/pages/Trabajadores/LiquidacionModal.jsx

import { useState, useEffect } from 'react';
import { X, Calculator, Download, AlertTriangle, CheckCircle, Save } from 'lucide-react';
import trabajadorService from '../../services/trabajadorService';
import liquidacionService from '../../services/liquidacionService';
import LoadingSpinner from '../../components/Common/LoadingSpinner';
import toast from 'react-hot-toast';

function fmt(value) {
  if (value == null) return '—';
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value);
}
function fmtFecha(str) {
  if (!str) return '—';
  const [y, m, d] = str.split('-');
  return `${d}/${m}/${y}`;
}

export default function LiquidacionModal({ trabajador: trabProp, contrato = null, onClose, onGuardada }) {
  // Cargamos el detalle completo para obtener ultima_fecha_labor y fecha_inicio_liquidacion
  const [trab, setTrab]           = useState(trabProp);
  const [loadingTrab, setLoadingTrab] = useState(!trabProp.ultima_fecha_labor);

  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaRetiro, setFechaRetiro] = useState(contrato?.fecha_fin ?? trabProp.fecha_retiro ?? '');

  const [resultado, setResultado]   = useState(null);
  const [calculando, setCalculando] = useState(false);
  const [descargando, setDescargando] = useState(false);
  const [guardando, setGuardando]   = useState(false);
  const [guardada, setGuardada]     = useState(null);

  // Carga detalle con campos extra si no los tiene ya
  useEffect(() => {
    if (trabProp.ultima_fecha_labor !== undefined) {
      setTrab(trabProp);
      setLoadingTrab(false);
      return;
    }
    trabajadorService.getById(trabProp.id)
      .then(data => {
        setTrab(data);
        if (!fechaRetiro && (contrato?.fecha_fin ?? data.fecha_retiro))
          setFechaRetiro(contrato?.fecha_fin ?? data.fecha_retiro);
      })
      .finally(() => setLoadingTrab(false));
  }, [trabProp.id]);

  // Una vez cargado, asignar fecha inicio sugerida
  useEffect(() => {
    if (!loadingTrab && !fechaInicio)
      setFechaInicio(trab.fecha_inicio_liquidacion ?? trab.fecha_ingreso ?? '');
  }, [loadingTrab]);

  const maxFechaRetiro = trab.ultima_fecha_labor ?? '';

  const calcular = async () => {
    if (!fechaInicio || !fechaRetiro) {
      toast.error('Completa las fechas de inicio y retiro');
      return;
    }
    setCalculando(true);
    setResultado(null);
    setGuardada(null);
    try {
      const data = await trabajadorService.getLiquidacion(trabProp.id, fechaRetiro);
      setResultado(data);
    } catch (err) {
      toast.error(err.response?.data?.error ?? 'Error al calcular la liquidación');
    } finally {
      setCalculando(false);
    }
  };

  const guardar = async () => {
    if (!resultado) return;
    setGuardando(true);
    try {
      const reg = await liquidacionService.create({
        trabajador: trabProp.id,
        contrato: contrato?.id ?? null,
        fecha_ingreso: fechaInicio,
        fecha_retiro: resultado.fecha_retiro,
        dias_trabajados: resultado.dias_trabajados,
        meses_calculados: resultado.meses_calculados,
        fuente: resultado.fuente,
        salario_base_total: resultado.salario_base_total,
        cesantias: resultado.cesantias,
        intereses_cesantias: resultado.intereses_cesantias,
        prima: resultado.prima,
        vacaciones: resultado.vacaciones,
        total: resultado.total,
      });
      setGuardada(reg);
      toast.success('Liquidación guardada como borrador');
      onGuardada?.(reg);
    } catch (err) {
      toast.error(err.response?.data?.error ?? 'Error al guardar la liquidación');
    } finally {
      setGuardando(false);
    }
  };

  const descargarPDF = async () => {
    setDescargando(true);
    try {
      const blob = await trabajadorService.descargarLiquidacionPDF(trabProp.id, fechaRetiro);
      const url  = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `liquidacion_${trabProp.numero_documento}_${fechaRetiro}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('PDF descargado correctamente');
    } catch {
      toast.error('Error al generar el PDF');
    } finally {
      setDescargando(false);
    }
  };

  const filas = resultado ? [
    { label: 'Cesantías',                valor: resultado.cesantias,            desc: '8.33% sobre salario devengado' },
    { label: 'Intereses sobre cesantías', valor: resultado.intereses_cesantias, desc: 'Provisión acumulada mensual' },
    { label: 'Prima de servicios',        valor: resultado.prima,               desc: '8.33% sobre salario devengado' },
    { label: 'Vacaciones',                valor: resultado.vacaciones,          desc: '4.17% sobre salario devengado' },
  ] : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
          <div>
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <Calculator className="w-5 h-5 text-indigo-600" />
              Liquidación de contrato
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">{trabProp.nombre_completo}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {loadingTrab ? (
            <div className="flex justify-center py-8"><LoadingSpinner /></div>
          ) : (
            <>
              {/* Fechas */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fecha de inicio
                  </label>
                  <input
                    type="date"
                    value={fechaInicio}
                    max={fechaRetiro || maxFechaRetiro || undefined}
                    onChange={e => { setFechaInicio(e.target.value); setResultado(null); }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <p className="text-xs text-gray-400 mt-0.5">Sugerida automáticamente</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fecha de retiro
                  </label>
                  <input
                    type="date"
                    value={fechaRetiro}
                    min={fechaInicio || undefined}
                    max={maxFechaRetiro || undefined}
                    onChange={e => { setFechaRetiro(e.target.value); setResultado(null); }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  {maxFechaRetiro && (
                    <p className="text-xs text-gray-400 mt-0.5">
                      Máx: {fmtFecha(maxFechaRetiro)} (último registro)
                    </p>
                  )}
                </div>
              </div>

              <button
                onClick={calcular}
                disabled={calculando || !fechaInicio || !fechaRetiro}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 text-sm font-medium"
              >
                {calculando ? <LoadingSpinner size="sm" /> : <Calculator className="w-4 h-4" />}
                Calcular
              </button>

              {/* Resultado */}
              {resultado && (
                <div className="space-y-3">
                  <div className="bg-gray-50 rounded-lg px-4 py-3 text-sm flex justify-between">
                    <span className="text-gray-500">Período: {fmtFecha(resultado.fecha_ingreso)} — {fmtFecha(resultado.fecha_retiro)}</span>
                    <span className="text-gray-700 font-medium">{resultado.dias_trabajados} días</span>
                  </div>
                  <div className="bg-gray-50 rounded-lg px-4 py-2 text-xs text-gray-500 flex justify-between">
                    <span>Base salarial acumulada</span>
                    <span className="font-semibold text-gray-800">{fmt(resultado.salario_base_total)}</span>
                  </div>

                  <div className="border border-gray-200 rounded-xl overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-indigo-50">
                        <tr>
                          <th className="text-left px-4 py-2 text-xs font-semibold text-indigo-700">Concepto</th>
                          <th className="text-right px-4 py-2 text-xs font-semibold text-indigo-700">Valor</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {filas.map(f => (
                          <tr key={f.label} className="hover:bg-gray-50">
                            <td className="px-4 py-2.5">
                              <p className="font-medium text-gray-800">{f.label}</p>
                              <p className="text-xs text-gray-400">{f.desc}</p>
                            </td>
                            <td className="px-4 py-2.5 text-right font-semibold text-gray-900">{fmt(f.valor)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <span className="font-semibold text-green-800">Total a pagar</span>
                    </div>
                    <span className="text-xl font-bold text-green-700">{fmt(resultado.total)}</span>
                  </div>

                  {resultado.fuente === 'nominas' && (
                    <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-700">
                      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>
                        No se encontraron provisiones PILA. Valores estimados sobre nóminas aprobadas.
                        Verifique con el contador antes de pagar.
                      </span>
                    </div>
                  )}
                  <p className="text-xs text-gray-400">
                    * Intereses cesantías sujetos a verificación contable (12% anual prorateado, Art. 99 Ley 50/1990).
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-2 px-6 py-4 border-t border-gray-100 flex-wrap sticky bottom-0 bg-white">
          {resultado && !guardada && (
            <button
              onClick={guardar}
              disabled={guardando}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 text-sm font-medium"
            >
              {guardando ? <LoadingSpinner size="sm" /> : <Save className="w-4 h-4" />}
              Guardar liquidación
            </button>
          )}
          {guardada && (
            <span className="flex items-center gap-1.5 px-3 py-2 bg-green-50 text-green-700 border border-green-200 rounded-lg text-sm">
              <CheckCircle className="w-4 h-4" />
              Guardada como borrador #{guardada.id}
            </span>
          )}
          {resultado && (
            <button
              onClick={descargarPDF}
              disabled={descargando}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm font-medium"
            >
              {descargando ? <LoadingSpinner size="sm" /> : <Download className="w-4 h-4" />}
              Descargar PDF
            </button>
          )}
          <button onClick={onClose} className="ml-auto px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
