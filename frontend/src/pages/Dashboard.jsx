// frontend/src/pages/Dashboard.jsx

import { useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import api from '../services/api';
import toast from 'react-hot-toast';
import {
  Users, DollarSign, AlertTriangle, Calendar,
  Package, FileText, TrendingUp, ChevronRight,
  CheckCircle, Clock, AlertCircle,
} from 'lucide-react';
import LoadingSpinner from '../components/Common/LoadingSpinner';

function fmt(value) {
  if (value == null) return '—';
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value);
}

function EstadoBadge({ estado }) {
  const map = {
    ABIERTA: { color: 'bg-blue-100 text-blue-800', label: 'Abierta' },
    CALCULADA: { color: 'bg-yellow-100 text-yellow-800', label: 'Calculada' },
    APROBADA: { color: 'bg-green-100 text-green-800', label: 'Aprobada' },
    CERRADA: { color: 'bg-gray-100 text-gray-700', label: 'Cerrada' },
  };
  const { color, label } = map[estado] || { color: 'bg-gray-100 text-gray-700', label: estado };
  return <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${color}`}>{label}</span>;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get('/dashboard/resumen/')
      .then(r => setData(r.data))
      .catch(() => toast.error('Error al cargar el dashboard'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const { trabajadores, quincena_actual, ultima_nomina, adelantos, alertas_stock, alertas_contratos } = data || {};

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-800">
          Bienvenido, {user?.nombre_completo || user?.username}
        </h1>
        <p className="text-gray-500 text-sm">{new Date().toLocaleDateString('es-CO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </div>

      {/* KPIs principales */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Trabajadores activos */}
        <div
          className="bg-white rounded-xl shadow p-5 cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => navigate('/trabajadores')}
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Trabajadores activos</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{trabajadores?.total ?? '—'}</p>
              <p className="text-xs text-gray-400 mt-1">{trabajadores?.por_finca?.length ?? 0} finca(s)</p>
            </div>
            <div className="bg-blue-50 p-2 rounded-lg"><Users className="w-6 h-6 text-blue-600" /></div>
          </div>
        </div>

        {/* Quincena actual */}
        <div
          className="bg-white rounded-xl shadow p-5 cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => navigate('/nomina')}
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Quincena actual</p>
              {quincena_actual ? (
                <>
                  <div className="mt-1"><EstadoBadge estado={quincena_actual.estado} /></div>
                  <p className="text-xs text-gray-500 mt-1">{quincena_actual.nombre}</p>
                  <p className="text-xs text-gray-400">
                    {quincena_actual.nominas_aprobadas}/{quincena_actual.total_nominas} aprobadas
                  </p>
                </>
              ) : (
                <p className="text-sm text-gray-400 mt-1">Sin quincena</p>
              )}
            </div>
            <div className="bg-purple-50 p-2 rounded-lg"><Calendar className="w-6 h-6 text-purple-600" /></div>
          </div>
        </div>

        {/* Última nómina */}
        <div
          className="bg-white rounded-xl shadow p-5 cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => navigate('/nomina')}
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Última nómina pagada</p>
              <p className="text-xl font-bold text-green-700 mt-1">{fmt(ultima_nomina?.total_neto)}</p>
              <p className="text-xs text-gray-400 mt-1">{ultima_nomina?.quincena || '—'}</p>
            </div>
            <div className="bg-green-50 p-2 rounded-lg"><DollarSign className="w-6 h-6 text-green-600" /></div>
          </div>
        </div>

        {/* Adelantos activos */}
        <div
          className="bg-white rounded-xl shadow p-5 cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => navigate('/prestamos')}
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Adelantos pendientes</p>
              <p className="text-xl font-bold text-orange-700 mt-1">{fmt(adelantos?.total_pendiente)}</p>
              <p className="text-xs text-gray-400 mt-1">{adelantos?.count ?? 0} adelanto(s) activo(s)</p>
            </div>
            <div className="bg-orange-50 p-2 rounded-lg"><TrendingUp className="w-6 h-6 text-orange-600" /></div>
          </div>
        </div>
      </div>

      {/* Fila de alertas + detalle quincena */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Trabajadores por finca */}
        <div className="bg-white rounded-xl shadow p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-500" /> Trabajadores por finca
          </h2>
          {trabajadores?.por_finca?.length > 0 ? (
            <ul className="space-y-2">
              {trabajadores.por_finca.map(f => (
                <li key={f.finca_id ?? f.finca} className="flex justify-between items-center text-sm">
                  <span className="text-gray-600 truncate">{f.finca}</span>
                  <span className="font-semibold text-gray-900 ml-2">{f.total}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-400">Sin trabajadores activos</p>
          )}
        </div>

        {/* Contratos vencidos o por vencer */}
        <div className="bg-white rounded-xl shadow p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <FileText className="w-4 h-4 text-yellow-500" /> Contratos críticos
          </h2>
          {alertas_contratos?.length > 0 ? (
            <ul className="space-y-2">
              {alertas_contratos.map(c => (
                <li
                  key={c.contrato_id}
                  className="flex justify-between items-start text-sm cursor-pointer hover:bg-gray-50 rounded p-1 -mx-1"
                  onClick={() => navigate('/contratos')}
                >
                  <div>
                    <p className="font-medium text-gray-800">{c.trabajador}</p>
                    <p className="text-xs text-gray-400">{c.finca}</p>
                  </div>
                  {c.vencido ? (
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full ml-2 whitespace-nowrap bg-red-100 text-red-700">
                      Vencido
                    </span>
                  ) : c.dias_restantes <= 7 ? (
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full ml-2 whitespace-nowrap bg-red-100 text-red-700">
                      {c.dias_restantes}d
                    </span>
                  ) : (
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full ml-2 whitespace-nowrap bg-yellow-100 text-yellow-700">
                      {c.dias_restantes}d
                    </span>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <div className="flex items-center gap-2 text-sm text-green-600">
              <CheckCircle className="w-4 h-4" /> Sin contratos vencidos ni por vencer
            </div>
          )}
        </div>

        {/* Stock bajo */}
        <div className="bg-white rounded-xl shadow p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <Package className="w-4 h-4 text-red-500" /> Stock bajo
          </h2>
          {alertas_stock?.length > 0 ? (
            <ul className="space-y-2">
              {alertas_stock.map((s, i) => (
                <li
                  key={i}
                  className="text-sm cursor-pointer hover:bg-gray-50 rounded p-1 -mx-1"
                  onClick={() => navigate('/inventario')}
                >
                  <p className="font-medium text-gray-800 truncate">{s.producto}</p>
                  <p className="text-xs text-gray-400">{s.bodega} · {s.stock_actual} / mín {s.stock_minimo} {s.unidad}</p>
                </li>
              ))}
            </ul>
          ) : (
            <div className="flex items-center gap-2 text-sm text-green-600">
              <CheckCircle className="w-4 h-4" /> Todo el stock en niveles normales
            </div>
          )}
        </div>
      </div>

      {/* Accesos rápidos */}
      <div>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Accesos rápidos</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Registrar Labores', icon: Clock, path: '/registros', color: 'blue' },
            { label: 'Calcular Nómina', icon: DollarSign, path: '/nomina', color: 'green' },
            { label: 'Nuevo Trabajador', icon: Users, path: '/trabajadores/nuevo', color: 'purple' },
            { label: 'Ver Reportes', icon: TrendingUp, path: '/reportes', color: 'orange' },
          ].map(({ label, icon: Icon, path, color }) => (
            <button
              key={path}
              onClick={() => navigate(path)}
              className={`flex items-center gap-3 bg-white rounded-xl shadow p-4 hover:shadow-md transition-shadow text-left group`}
            >
              <div className={`bg-${color}-50 p-2 rounded-lg group-hover:bg-${color}-100 transition-colors`}>
                <Icon className={`w-5 h-5 text-${color}-600`} />
              </div>
              <span className="text-sm font-medium text-gray-700">{label}</span>
              <ChevronRight className="w-4 h-4 text-gray-300 ml-auto" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
