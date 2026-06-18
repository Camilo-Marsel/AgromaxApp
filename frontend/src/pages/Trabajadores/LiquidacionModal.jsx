// frontend/src/pages/Trabajadores/LiquidacionModal.jsx

import { useState } from 'react';
import { X, Calculator, Download, AlertTriangle, CheckCircle } from 'lucide-react';
import trabajadorService from '../../services/trabajadorService';
import LoadingSpinner from '../../components/Common/LoadingSpinner';
import toast from 'react-hot-toast';

function fmt(value) {
  if (value == null) return '—';
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(value);
}

function fmtFecha(str) {
  if (!str) return '—';
  const [y, m, d] = str.split('-');
  return `${d}/${m}/${y}`;
}

export default function LiquidacionModal({ trabajador, onClose }) {
  const hoy = new Date().toISOString().split('T')[0];
  const [fechaRetiro, setFechaRetiro] = useState(
    trabajador.fecha_retiro ?? hoy
  );
  const [resultado, setResultado] = useState(null);
  const [calculando, setCalculando]   = useState(false);
  const [descargando, setDescargando] = useState(false);

  const calcular = async () => {
    setCalculando(true);
    setResultado(null);
    try {
      const data = await trabajadorService.getLiquidacion(trabajador.id, fechaRetiro);
      setResultado(data);
    } catch (err) {
      const msg = err.response?.data?.error ?? 'Error al calcular la liquidación';
      toast.error(msg);
    } finally {
      setCalculando(false);
    }
  };

  const descargarPDF = async () => {
    setDescargando(true);
    try {
      const blob = await trabajadorService.descargarLiquidacionPDF(trabajador.id, fechaRetiro);
      const url  = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href     = url;
      link.download = `liquidacion_${trabajador.numero_documento}_${fechaRetiro}.pdf`;
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
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <Calculator className="w-5 h-5 text-indigo-600" />
              Liquidación de contrato
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">{trabajador.nombre_completo}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">

          {/* Fecha de retiro */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fecha de retiro
            </label>
            <div className="flex gap-2">
              <input
                type="date"
                value={fechaRetiro}
                min={trabajador.fecha_ingreso}
                max={hoy}
                onChange={e => { setFechaRetiro(e.target.value); setResultado(null); }}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                onClick={calcular}
                disabled={calculando || !fechaRetiro}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 text-sm font-medium"
              >
                {calculando ? <LoadingSpinner size="sm" /> : <Calculator className="w-4 h-4" />}
                Calcular
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Fecha de ingreso: {fmtFecha(trabajador.fecha_ingreso)}
            </p>
          </div>

          {/* Resultado */}
          {resultado && (
            <div className="space-y-3">

              {/* Resumen periodo */}
              <div className="bg-gray-50 rounded-lg px-4 py-3 text-sm flex justify-between">
                <span className="text-gray-500">Período: {fmtFecha(resultado.fecha_ingreso)} — {fmtFecha(resultado.fecha_retiro)}</span>
                <span className="text-gray-700 font-medium">{resultado.dias_trabajados} días</span>
              </div>
              <div className="bg-gray-50 rounded-lg px-4 py-2 text-xs text-gray-500 flex justify-between">
                <span>Base salarial acumulada</span>
                <span className="font-semibold text-gray-800">{fmt(resultado.salario_base_total)}</span>
              </div>

              {/* Filas de conceptos */}
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
                        <td className="px-4 py-2.5 text-right font-semibold text-gray-900">
                          {fmt(f.valor)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Total */}
              <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="font-semibold text-green-800">Total a pagar</span>
                </div>
                <span className="text-xl font-bold text-green-700">{fmt(resultado.total)}</span>
              </div>

              {/* Nota */}
              {resultado.fuente === 'nominas' && (
                <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-700">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>
                    No se encontraron provisiones PILA para este trabajador.
                    Los valores fueron estimados sobre nóminas aprobadas.
                    Verifique con el contador antes de pagar.
                  </span>
                </div>
              )}
              <p className="text-xs text-gray-400">
                * Los intereses sobre cesantías están sujetos a verificación contable (12% anual prorateado, Art. 99 Ley 50/1990).
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-gray-100">
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
          <button
            onClick={onClose}
            className="ml-auto px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
