// frontend/src/pages/ObligacionesLaborales/Prestaciones/PrestacionesList.jsx

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import prestacionesService from '../../../services/prestacionesService';
import pilaService from '../../../services/pilaService';
import fincaService from '../../../services/fincaService';
import LoadingSpinner from '../../../components/Common/LoadingSpinner';
import ConfirmDialog from '../../../components/Common/ConfirmDialog';
import toast from 'react-hot-toast';
import {
  Eye, Trash2, Calculator, TrendingUp,
  PiggyBank, Calendar, Users, Building2,
} from 'lucide-react';

const MESES = ['', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

const currentYear = new Date().getFullYear();
const AÑOS = Array.from({ length: 4 }, (_, i) => currentYear - i);

function fmt(value) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency', currency: 'COP', minimumFractionDigits: 0,
  }).format(value || 0);
}

export default function PrestacionesList() {
  const navigate = useNavigate();
  const [resumenes, setResumenes]       = useState([]);
  const [acumulado, setAcumulado]       = useState(null);
  const [porcentajes, setPorcentajes]   = useState(null);
  const [fincas, setFincas]             = useState([]);
  const [loading, setLoading]           = useState(true);
  const [filtroAño, setFiltroAño]       = useState(currentYear);

  // Modal calcular
  const [showModal, setShowModal]       = useState(false);
  const [mesCalc, setMesCalc]           = useState(new Date().getMonth() + 1);
  const [añoCalc, setAñoCalc]           = useState(currentYear);
  const [fincaCalc, setFincaCalc]       = useState('');   // '' = todas
  const [calculando, setCalculando]     = useState(false);

  const [confirmDelete, setConfirmDelete] = useState({ isOpen: false, id: null });

  useEffect(() => { loadData(); }, [filtroAño]);
  useEffect(() => { loadFincas(); }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [resumenesData, acumuladoData, pilaResumen] = await Promise.all([
        prestacionesService.getAll({ año: filtroAño }),
        prestacionesService.getAcumuladoAño(filtroAño),
        pilaService.getResumen(),
      ]);
      setResumenes(resumenesData.results || resumenesData);
      setAcumulado(acumuladoData);
      setPorcentajes(pilaResumen?.porcentajes?.prestaciones);
    } catch {
      toast.error('Error al cargar prestaciones');
    } finally {
      setLoading(false);
    }
  };

  const loadFincas = async () => {
    try {
      const data = await fincaService.getAll({ todas: 'true' });
      setFincas(data.results || data);
    } catch {
      // silencioso
    }
  };

  const handleCalcular = async () => {
    try {
      setCalculando(true);
      await prestacionesService.calcular(mesCalc, añoCalc, fincaCalc || null);
      const fincaNombre = fincas.find(f => f.id === Number(fincaCalc))?.nombre ?? 'todas las fincas';
      toast.success(`Prestaciones calculadas para ${MESES[mesCalc]}/${añoCalc} — ${fincaNombre}`);
      setShowModal(false);
      setFincaCalc('');
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al calcular prestaciones');
    } finally {
      setCalculando(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await prestacionesService.delete(id);
      toast.success('Provisión eliminada correctamente');
      setConfirmDelete({ isOpen: false, id: null });
      loadData();
    } catch {
      toast.error('Error al eliminar provisión');
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64"><LoadingSpinner size="lg" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Prestaciones Sociales</h1>
          <p className="text-gray-600">Provisiones mensuales por finca</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700"
        >
          <Calculator className="w-5 h-5" />
          Calcular Provisiones
        </button>
      </div>

      {/* Porcentajes vigentes */}
      {porcentajes && (
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-6 rounded-lg shadow border border-purple-200">
          <h2 className="text-lg font-semibold text-purple-800 mb-4 flex items-center gap-2">
            <PiggyBank className="w-5 h-5" />
            Porcentajes de Provisión
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[
              { label: 'Cesantías',      value: porcentajes.cesantias,           color: 'text-purple-600' },
              { label: 'Int. Cesantías', value: porcentajes.intereses_cesantias, color: 'text-pink-600' },
              { label: 'Prima',          value: porcentajes.prima,               color: 'text-indigo-600' },
              { label: 'Vacaciones',     value: porcentajes.vacaciones,          color: 'text-blue-600' },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-white p-3 rounded-lg shadow-sm">
                <p className="text-xs text-gray-600">{label}</p>
                <p className={`text-xl font-bold ${color}`}>{value}%</p>
              </div>
            ))}
            <div className="bg-purple-100 p-3 rounded-lg shadow-sm">
              <p className="text-xs text-purple-700">Total Mensual</p>
              <p className="text-xl font-bold text-purple-800">{porcentajes.total?.toFixed(2)}%</p>
            </div>
          </div>
        </div>
      )}

      {/* Acumulado del año */}
      {acumulado?.acumulado && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-purple-600" />
            Acumulado {filtroAño} ({acumulado.meses_calculados} meses)
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            {[
              { label: 'Cesantías',        value: acumulado.acumulado.total_cesantias,   cls: 'bg-purple-50 text-purple-700' },
              { label: 'Int. Cesantías',   value: acumulado.acumulado.total_intereses,   cls: 'bg-pink-50 text-pink-700' },
              { label: 'Prima',            value: acumulado.acumulado.total_prima,        cls: 'bg-indigo-50 text-indigo-700' },
              { label: 'Vacaciones',       value: acumulado.acumulado.total_vacaciones,  cls: 'bg-blue-50 text-blue-700' },
              { label: 'Base Salarial',    value: acumulado.acumulado.total_salarios,    cls: 'bg-gray-50 text-gray-700' },
              { label: 'Total Provisionado', value: acumulado.acumulado.total_provisiones, cls: 'bg-green-50 text-green-700 border-2 border-green-200' },
            ].map(({ label, value, cls }) => (
              <div key={label} className={`p-4 rounded-lg ${cls}`}>
                <p className="text-xs opacity-75">{label}</p>
                <p className="text-lg font-bold">{fmt(value)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filtro año */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium text-gray-700">Año:</label>
          <select
            value={filtroAño}
            onChange={(e) => setFiltroAño(parseInt(e.target.value))}
            className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            {AÑOS.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {resumenes.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No se encontraron provisiones para {filtroAño}.
            <br />
            <span className="text-sm">Use "Calcular Provisiones" para generar el registro de un mes.</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {['Período', 'Finca', 'Cesantías', 'Int. Cesantías', 'Prima', 'Vacaciones', 'Total', 'Trabajadores', 'Acciones'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {resumenes.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span className="font-medium">{MESES[r.mes]} {r.año}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm">
                      {r.finca_nombre ? (
                        <span className="flex items-center gap-1 text-gray-700">
                          <Building2 className="w-3.5 h-3.5 text-gray-400" />
                          {r.finca_nombre}
                        </span>
                      ) : (
                        <span className="text-gray-400 italic text-xs">Todas</span>
                      )}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-purple-600">{fmt(r.total_cesantias)}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-pink-600">{fmt(r.total_intereses_cesantias)}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-indigo-600">{fmt(r.total_prima)}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-blue-600">{fmt(r.total_vacaciones)}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-green-600">{fmt(r.total_provisiones)}</td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className="flex items-center gap-1 text-sm text-gray-600">
                        <Users className="w-4 h-4" />{r.num_trabajadores}
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => navigate(`/obligaciones/prestaciones/${r.id}`)}
                          className="text-purple-600 hover:text-purple-900"
                          title="Ver detalle"
                        >
                          <Eye className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => setConfirmDelete({ isOpen: true, id: r.id })}
                          className="text-red-600 hover:text-red-900"
                          title="Eliminar"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Calcular */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-2">Calcular Provisiones</h3>
            <p className="text-sm text-gray-600 mb-5">
              Seleccione el período y la finca. Si deja "Todas las fincas" se calculan
              todas juntas como un único registro.
            </p>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mes</label>
                <select
                  value={mesCalc}
                  onChange={(e) => setMesCalc(parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  {MESES.slice(1).map((m, i) => (
                    <option key={i + 1} value={i + 1}>{m}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Año</label>
                <select
                  value={añoCalc}
                  onChange={(e) => setAñoCalc(parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  {AÑOS.map((a) => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">Finca</label>
              <select
                value={fincaCalc}
                onChange={(e) => setFincaCalc(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="">Todas las fincas</option>
                {fincas.map((f) => (
                  <option key={f.id} value={f.id}>{f.nombre}</option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => { setShowModal(false); setFincaCalc(''); }}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleCalcular}
                disabled={calculando}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:bg-gray-400"
              >
                {calculando ? <><LoadingSpinner size="sm" /> Calculando...</> : <><Calculator className="w-4 h-4" /> Calcular</>}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={confirmDelete.isOpen}
        onClose={() => setConfirmDelete({ isOpen: false, id: null })}
        onConfirm={() => handleDelete(confirmDelete.id)}
        title="Eliminar Provisión"
        message="¿Está seguro que desea eliminar esta provisión? Esta acción no se puede deshacer."
        type="danger"
      />
    </div>
  );
}
