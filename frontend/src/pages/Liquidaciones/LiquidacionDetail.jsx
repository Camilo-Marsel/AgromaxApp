// frontend/src/pages/Liquidaciones/LiquidacionDetail.jsx

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import liquidacionService from '../../services/liquidacionService';
import trabajadorService from '../../services/trabajadorService';
import LoadingSpinner from '../../components/Common/LoadingSpinner';
import toast from 'react-hot-toast';
import {
  ArrowLeft, CheckCircle, Clock, Download, RotateCcw,
  User, Calendar, Building2, FileText,
} from 'lucide-react';

function fmt(v) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency', currency: 'COP', maximumFractionDigits: 0,
  }).format(v || 0);
}
function fmtFecha(s) {
  if (!s) return '—';
  const [y, m, d] = String(s).split('-');
  return `${d}/${m}/${y}`;
}
function fmtDT(s) {
  if (!s) return '—';
  return new Date(s).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' });
}

export default function LiquidacionDetail() {
  const { id }    = useParams();
  const navigate  = useNavigate();
  const [liq, setLiq]         = useState(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);

  useEffect(() => {
    liquidacionService.getById(id)
      .then(setLiq)
      .catch(() => toast.error('No se encontró la liquidación'))
      .finally(() => setLoading(false));
  }, [id]);

  const aprobar = async () => {
    setWorking(true);
    try {
      const updated = await liquidacionService.aprobar(id);
      setLiq(updated);
      toast.success('Liquidación aprobada');
    } catch (err) {
      toast.error(err.response?.data?.error ?? 'Error al aprobar');
    } finally {
      setWorking(false);
    }
  };

  const revertir = async () => {
    setWorking(true);
    try {
      const updated = await liquidacionService.revertir(id);
      setLiq(updated);
      toast.success('Liquidación revertida a borrador');
    } catch (err) {
      toast.error(err.response?.data?.error ?? 'Error al revertir');
    } finally {
      setWorking(false);
    }
  };

  const descargarPDF = async () => {
    setWorking(true);
    try {
      const blob = await trabajadorService.descargarLiquidacionPDF(
        liq.trabajador, liq.fecha_retiro
      );
      const url  = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href     = url;
      link.download = `liquidacion_${liq.trabajador_cedula}_${liq.fecha_retiro}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error('Error al generar el PDF');
    } finally {
      setWorking(false);
    }
  };

  if (loading) return <div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div>;
  if (!liq)    return <div className="text-center py-20 text-gray-400">Liquidación no encontrada</div>;

  const aprobada = liq.estado === 'APROBADA';

  const conceptos = [
    { label: 'Cesantías',               valor: liq.cesantias,           desc: '8.33% sobre salario devengado' },
    { label: 'Intereses sobre cesantías', valor: liq.intereses_cesantias, desc: '12% anual prorateado' },
    { label: 'Prima de servicios',       valor: liq.prima,               desc: '8.33% sobre salario devengado' },
    { label: 'Vacaciones',               valor: liq.vacaciones,          desc: '4.17% sobre salario devengado' },
  ];

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {/* Nav */}
      <button onClick={() => navigate('/liquidaciones')} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
        <ArrowLeft className="w-4 h-4" /> Volver a liquidaciones
      </button>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Liquidación #{liq.id}</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Creada {fmtDT(liq.created_at)}{liq.created_by_nombre ? ` por ${liq.created_by_nombre}` : ''}
          </p>
        </div>
        <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${
          aprobada ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
        }`}>
          {aprobada ? <CheckCircle className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
          {liq.estado_display}
        </span>
      </div>

      {/* Info trabajador */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 grid grid-cols-2 gap-4">
        <div className="flex items-start gap-3">
          <User className="w-5 h-5 text-gray-400 mt-0.5" />
          <div>
            <p className="text-xs text-gray-400">Trabajador</p>
            <p className="font-semibold text-gray-900">{liq.trabajador_nombre}</p>
            <p className="text-sm text-gray-500">{liq.trabajador_cedula}</p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <Building2 className="w-5 h-5 text-gray-400 mt-0.5" />
          <div>
            <p className="text-xs text-gray-400">Finca</p>
            <p className="font-semibold text-gray-900">{liq.finca_nombre ?? '—'}</p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
          <div>
            <p className="text-xs text-gray-400">Período</p>
            <p className="font-semibold text-gray-900">{fmtFecha(liq.fecha_ingreso)} — {fmtFecha(liq.fecha_retiro)}</p>
            <p className="text-sm text-gray-500">{liq.dias_trabajados} días · {liq.meses_calculados} meses calculados</p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <FileText className="w-5 h-5 text-gray-400 mt-0.5" />
          <div>
            <p className="text-xs text-gray-400">Fuente del cálculo</p>
            <p className="font-semibold text-gray-900">{liq.fuente_display}</p>
            {liq.contrato_numero && <p className="text-sm text-gray-500">Contrato {liq.contrato_numero}</p>}
          </div>
        </div>
      </div>

      {/* Base salarial */}
      <div className="bg-gray-50 rounded-xl border border-gray-100 px-5 py-3 flex justify-between items-center">
        <span className="text-sm text-gray-500">Base salarial acumulada</span>
        <span className="font-semibold text-gray-800">{fmt(liq.salario_base_total)}</span>
      </div>

      {/* Conceptos */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-indigo-50">
            <tr>
              <th className="text-left px-5 py-3 text-xs font-semibold text-indigo-700">Concepto</th>
              <th className="text-right px-5 py-3 text-xs font-semibold text-indigo-700">Valor</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {conceptos.map(c => (
              <tr key={c.label} className="hover:bg-gray-50">
                <td className="px-5 py-3">
                  <p className="font-medium text-gray-800">{c.label}</p>
                  <p className="text-xs text-gray-400">{c.desc}</p>
                </td>
                <td className="px-5 py-3 text-right font-semibold text-gray-900">{fmt(c.valor)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Total */}
      <div className="bg-green-50 border border-green-200 rounded-xl px-5 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-green-600" />
          <span className="font-semibold text-green-800">Total a pagar</span>
        </div>
        <span className="text-2xl font-bold text-green-700">{fmt(liq.total)}</span>
      </div>

      {/* Notas */}
      {liq.notas && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <p className="text-xs text-gray-400 mb-1">Notas</p>
          <p className="text-sm text-gray-700">{liq.notas}</p>
        </div>
      )}

      {/* Aprobación info */}
      {aprobada && liq.aprobada_at && (
        <div className="text-xs text-gray-400 text-right">
          Aprobada {fmtDT(liq.aprobada_at)}{liq.aprobada_by_nombre ? ` por ${liq.aprobada_by_nombre}` : ''}
        </div>
      )}

      {/* Acciones */}
      <div className="flex gap-3 pt-2 flex-wrap">
        {!aprobada && (
          <button
            onClick={aprobar}
            disabled={working}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm font-medium"
          >
            {working ? <LoadingSpinner size="sm" /> : <CheckCircle className="w-4 h-4" />}
            Aprobar liquidación
          </button>
        )}
        {aprobada && (
          <button
            onClick={revertir}
            disabled={working}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 disabled:opacity-50 text-sm"
          >
            {working ? <LoadingSpinner size="sm" /> : <RotateCcw className="w-4 h-4" />}
            Revertir a borrador
          </button>
        )}
        <button
          onClick={descargarPDF}
          disabled={working}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 text-sm font-medium"
        >
          {working ? <LoadingSpinner size="sm" /> : <Download className="w-4 h-4" />}
          Descargar PDF
        </button>
      </div>
    </div>
  );
}
