// frontend/src/pages/Liquidaciones/LiquidacionesList.jsx

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import liquidacionService from '../../services/liquidacionService';
import trabajadorService from '../../services/trabajadorService';
import fincaService from '../../services/fincaService';
import LiquidacionModal from '../Trabajadores/LiquidacionModal';
import ConfirmDialog from '../../components/Common/ConfirmDialog';
import LoadingSpinner from '../../components/Common/LoadingSpinner';
import toast from 'react-hot-toast';
import {
  Calculator, Search, CheckCircle, Clock, Trash2,
  Building2, User, Calendar, FileText, ChevronRight,
} from 'lucide-react';

const ESTADOS = [
  { value: '', label: 'Todos los estados' },
  { value: 'BORRADOR', label: 'Borrador' },
  { value: 'APROBADA', label: 'Aprobada' },
];

function fmt(v) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency', currency: 'COP', maximumFractionDigits: 0,
  }).format(v || 0);
}

function fmtFecha(s) {
  if (!s) return '—';
  const [y, m, d] = s.split('-');
  return `${d}/${m}/${y}`;
}

export default function LiquidacionesList() {
  const navigate = useNavigate();

  // ── Tabs ─────────────────────────────────────────────────────────────────
  const [tab, setTab] = useState('calcular'); // 'calcular' | 'registros'

  // ── Tab calcular ─────────────────────────────────────────────────────────
  const [trabajadores, setTrabajadores] = useState([]);
  const [fincas, setFincas]             = useState([]);
  const [loadingTrab, setLoadingTrab]   = useState(true);
  const [busqueda, setBusqueda]         = useState('');
  const [filtroFinca, setFiltroFinca]   = useState('');
  const [filtroEstado, setFiltroEstadoTrab] = useState('');
  const [modalTrab, setModalTrab]       = useState(null);

  // ── Tab registros ────────────────────────────────────────────────────────
  const [registros, setRegistros]       = useState([]);
  const [loadingReg, setLoadingReg]     = useState(true);
  const [busquedaReg, setBusquedaReg]   = useState('');
  const [filtroEstadoReg, setFiltroEstadoReg] = useState('');
  const [confirmDelete, setConfirmDelete] = useState({ open: false, id: null });

  // ── Load data ────────────────────────────────────────────────────────────
  const loadTrabajadores = useCallback(async () => {
    setLoadingTrab(true);
    try {
      const params = { page_size: 200 };
      if (busqueda)     params.search      = busqueda;
      if (filtroFinca)  params.finca       = filtroFinca;
      if (filtroEstado) params.estado      = filtroEstado;
      const data = await trabajadorService.getAll(params);
      setTrabajadores(data.results ?? data);
    } catch {
      toast.error('Error al cargar trabajadores');
    } finally {
      setLoadingTrab(false);
    }
  }, [busqueda, filtroFinca, filtroEstado]);

  const loadRegistros = useCallback(async () => {
    setLoadingReg(true);
    try {
      const params = {};
      if (busquedaReg)     params.search = busquedaReg;
      if (filtroEstadoReg) params.estado = filtroEstadoReg;
      const data = await liquidacionService.getAll(params);
      setRegistros(data.results ?? data);
    } catch {
      toast.error('Error al cargar liquidaciones');
    } finally {
      setLoadingReg(false);
    }
  }, [busquedaReg, filtroEstadoReg]);

  useEffect(() => { fincaService.getAll({ todas: 'true' }).then(d => setFincas(d.results ?? d)); }, []);
  useEffect(() => { if (tab === 'calcular') loadTrabajadores(); }, [tab, loadTrabajadores]);
  useEffect(() => { if (tab === 'registros') loadRegistros(); }, [tab, loadRegistros]);

  const handleAprobar = async (id) => {
    try {
      await liquidacionService.aprobar(id);
      toast.success('Liquidación aprobada');
      loadRegistros();
    } catch (err) {
      toast.error(err.response?.data?.error ?? 'Error al aprobar');
    }
  };

  const handleEliminar = async (id) => {
    try {
      await liquidacionService.delete(id);
      toast.success('Liquidación eliminada');
      setConfirmDelete({ open: false, id: null });
      loadRegistros();
    } catch {
      toast.error('Error al eliminar');
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Liquidaciones de Contrato</h1>
          <p className="text-sm text-gray-500">Calcula y registra liquidaciones de prestaciones sociales</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-6">
          {[
            { key: 'calcular',   label: 'Calcular liquidación', icon: Calculator },
            { key: 'registros',  label: 'Liquidaciones registradas', icon: FileText },
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex items-center gap-2 pb-3 text-sm font-medium border-b-2 transition-colors ${
                tab === key
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </nav>
      </div>

      {/* ── TAB: CALCULAR ── */}
      {tab === 'calcular' && (
        <div className="space-y-4">
          {/* Filtros */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex flex-wrap gap-3">
            <div className="flex-1 min-w-48 relative">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
              <input
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
                placeholder="Buscar por nombre o cédula…"
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <select
              value={filtroFinca}
              onChange={e => setFiltroFinca(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Todas las fincas</option>
              {fincas.map(f => <option key={f.id} value={f.id}>{f.nombre}</option>)}
            </select>
            <select
              value={filtroEstado}
              onChange={e => setFiltroEstadoTrab(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Todos los estados</option>
              <option value="CONTRATADO">Contratado</option>
              <option value="RETIRADO">Retirado</option>
              <option value="SIN_CONTRATO">Sin contrato</option>
            </select>
          </div>

          {/* Lista de trabajadores */}
          {loadingTrab ? (
            <div className="flex justify-center py-16"><LoadingSpinner size="lg" /></div>
          ) : trabajadores.length === 0 ? (
            <div className="text-center py-16 text-gray-400">No se encontraron trabajadores</div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <table className="min-w-full divide-y divide-gray-100">
                <thead className="bg-gray-50">
                  <tr>
                    {['Trabajador', 'Finca', 'Fecha ingreso', 'Estado', ''].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {trabajadores.map(t => (
                    <tr key={t.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900 text-sm">{t.nombre_completo}</p>
                        <p className="text-xs text-gray-400">{t.numero_documento}</p>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {t.finca_info?.nombre ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {fmtFecha(t.fecha_ingreso)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                          t.estado === 'CONTRATADO' ? 'bg-green-100 text-green-700' :
                          t.estado === 'RETIRADO'   ? 'bg-red-100 text-red-700' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          {t.estado_display ?? t.estado}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => setModalTrab(t)}
                          className="flex items-center gap-1 ml-auto px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700"
                        >
                          <Calculator className="w-3.5 h-3.5" />
                          Liquidar
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── TAB: REGISTROS ── */}
      {tab === 'registros' && (
        <div className="space-y-4">
          {/* Filtros */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex flex-wrap gap-3">
            <div className="flex-1 min-w-48 relative">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
              <input
                value={busquedaReg}
                onChange={e => setBusquedaReg(e.target.value)}
                placeholder="Buscar por nombre o cédula…"
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <select
              value={filtroEstadoReg}
              onChange={e => setFiltroEstadoReg(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {ESTADOS.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}
            </select>
          </div>

          {loadingReg ? (
            <div className="flex justify-center py-16"><LoadingSpinner size="lg" /></div>
          ) : registros.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              No hay liquidaciones registradas
              <p className="text-sm mt-1">Usa la pestaña "Calcular liquidación" para crear una</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <table className="min-w-full divide-y divide-gray-100">
                <thead className="bg-gray-50">
                  <tr>
                    {['Trabajador', 'Finca', 'Fecha retiro', 'Total', 'Fuente', 'Estado', 'Acciones'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {registros.map(r => (
                    <tr key={r.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900 text-sm">{r.trabajador_nombre}</p>
                        <p className="text-xs text-gray-400">{r.trabajador_cedula}</p>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        <span className="flex items-center gap-1">
                          <Building2 className="w-3.5 h-3.5 text-gray-400" />
                          {r.finca_nombre ?? '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-gray-400" />
                          {fmtFecha(r.fecha_retiro)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-indigo-700">
                        {fmt(r.total)}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {r.fuente === 'provisiones' ? 'Provisiones' : 'Nóminas'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                          r.estado === 'APROBADA'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {r.estado === 'APROBADA'
                            ? <CheckCircle className="w-3 h-3" />
                            : <Clock className="w-3 h-3" />}
                          {r.estado_display}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {r.estado === 'BORRADOR' && (
                            <button
                              onClick={() => handleAprobar(r.id)}
                              title="Aprobar"
                              className="text-green-600 hover:text-green-800"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => navigate(`/liquidaciones/${r.id}`)}
                            title="Ver detalle"
                            className="text-indigo-600 hover:text-indigo-800"
                          >
                            <FileText className="w-4 h-4" />
                          </button>
                          {r.estado !== 'APROBADA' && (
                            <button
                              onClick={() => setConfirmDelete({ open: true, id: r.id })}
                              title="Eliminar"
                              className="text-red-600 hover:text-red-800"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Modal liquidación */}
      {modalTrab && (
        <LiquidacionModal
          trabajador={modalTrab}
          onClose={() => setModalTrab(null)}
          onGuardada={() => {
            setModalTrab(null);
            setTab('registros');
            loadRegistros();
          }}
        />
      )}

      <ConfirmDialog
        isOpen={confirmDelete.open}
        onClose={() => setConfirmDelete({ open: false, id: null })}
        onConfirm={() => handleEliminar(confirmDelete.id)}
        title="Eliminar liquidación"
        message="¿Está seguro? Esta acción no se puede deshacer."
        type="danger"
      />
    </div>
  );
}
