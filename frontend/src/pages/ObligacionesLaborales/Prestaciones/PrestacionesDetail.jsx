// frontend/src/pages/ObligacionesLaborales/Prestaciones/PrestacionesDetail.jsx

import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import prestacionesService from '../../../services/prestacionesService';
import LoadingSpinner from '../../../components/Common/LoadingSpinner';
import toast from 'react-hot-toast';
import {
  ArrowLeft, Calendar, Users, DollarSign, PiggyBank
} from 'lucide-react';

export default function PrestacionesDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [resumen, setResumen] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadResumen();
  }, [id]);

  const loadResumen = async () => {
    try {
      setLoading(true);
      const data = await prestacionesService.getById(id);
      setResumen(data);
    } catch (error) {
      console.error('Error al cargar provisiones:', error);
      toast.error('Error al cargar provisiones');
      navigate('/obligaciones/prestaciones');
    } finally {
      setLoading(false);
    }
  };

  const formatMoney = (value) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(value || 0);
  };

  const meses = [
    '', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!resumen) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/obligaciones/prestaciones')}
            className="p-2 hover:bg-gray-100 rounded-md"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold">
              Prestaciones {meses[resumen.mes]} {resumen.año}
            </h1>
            <p className="text-gray-600">
              Detalle de provisiones por trabajador
            </p>
          </div>
        </div>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <div className="bg-purple-50 rounded-lg shadow p-4 border-l-4 border-purple-600">
          <p className="text-xs text-purple-700">Cesantías</p>
          <p className="text-xl font-bold text-purple-600">
            {formatMoney(resumen.total_cesantias)}
          </p>
        </div>
        <div className="bg-pink-50 rounded-lg shadow p-4 border-l-4 border-pink-600">
          <p className="text-xs text-pink-700">Int. Cesantías</p>
          <p className="text-xl font-bold text-pink-600">
            {formatMoney(resumen.total_intereses_cesantias)}
          </p>
        </div>
        <div className="bg-indigo-50 rounded-lg shadow p-4 border-l-4 border-indigo-600">
          <p className="text-xs text-indigo-700">Prima</p>
          <p className="text-xl font-bold text-indigo-600">
            {formatMoney(resumen.total_prima)}
          </p>
        </div>
        <div className="bg-blue-50 rounded-lg shadow p-4 border-l-4 border-blue-600">
          <p className="text-xs text-blue-700">Vacaciones</p>
          <p className="text-xl font-bold text-blue-600">
            {formatMoney(resumen.total_vacaciones)}
          </p>
        </div>
        <div className="bg-gray-50 rounded-lg shadow p-4 border-l-4 border-gray-600">
          <p className="text-xs text-gray-700">Base Salarial</p>
          <p className="text-xl font-bold text-gray-600">
            {formatMoney(resumen.total_salario_base)}
          </p>
        </div>
        <div className="bg-green-50 rounded-lg shadow p-4 border-l-4 border-green-600">
          <p className="text-xs text-green-700">Total Provisión</p>
          <p className="text-xl font-bold text-green-600">
            {formatMoney(resumen.total_provisiones)}
          </p>
        </div>
      </div>

      {/* Info Card */}
      <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
        <div className="flex items-center gap-2 text-purple-800">
          <PiggyBank className="w-5 h-5" />
          <span className="font-medium">
            {resumen.num_trabajadores} trabajadores con provisiones calculadas
          </span>
        </div>
      </div>

      {/* Tabla de Provisiones por Trabajador */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-4">Provisiones por Trabajador</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Trabajador
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Salario Base
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Cesantías
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Int. Cesantías
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Prima
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Vacaciones
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Total
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {resumen.provisiones?.map((provision) => (
                <tr key={provision.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {provision.trabajador_info?.nombres} {provision.trabajador_info?.apellidos}
                    </div>
                    <div className="text-xs text-gray-500">
                      {provision.trabajador_info?.numero_documento}
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                    {formatMoney(provision.salario_base)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-purple-600">
                    {formatMoney(provision.cesantias)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-pink-600">
                    {formatMoney(provision.intereses_cesantias)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-indigo-600">
                    {formatMoney(provision.prima)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-blue-600">
                    {formatMoney(provision.vacaciones)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-green-600">
                    {formatMoney(provision.total_provision)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-100">
              <tr>
                <td className="px-4 py-3 whitespace-nowrap text-sm font-bold text-gray-900">
                  TOTALES
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm font-bold text-gray-900">
                  {formatMoney(resumen.total_salario_base)}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm font-bold text-purple-600">
                  {formatMoney(resumen.total_cesantias)}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm font-bold text-pink-600">
                  {formatMoney(resumen.total_intereses_cesantias)}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm font-bold text-indigo-600">
                  {formatMoney(resumen.total_prima)}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm font-bold text-blue-600">
                  {formatMoney(resumen.total_vacaciones)}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm font-bold text-green-600">
                  {formatMoney(resumen.total_provisiones)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Nota Informativa */}
      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
        <h3 className="font-medium text-blue-800 mb-2">Sobre las Prestaciones Sociales</h3>
        <ul className="text-sm text-blue-700 space-y-1">
          <li><strong>Cesantías:</strong> Se consignan al fondo antes del 14 de febrero de cada año.</li>
          <li><strong>Intereses Cesantías:</strong> Se pagan al trabajador antes del 31 de enero.</li>
          <li><strong>Prima:</strong> Se paga en dos cuotas: junio y diciembre.</li>
          <li><strong>Vacaciones:</strong> Se causan al momento de disfrutar las vacaciones o en liquidación.</li>
        </ul>
      </div>
    </div>
  );
}
