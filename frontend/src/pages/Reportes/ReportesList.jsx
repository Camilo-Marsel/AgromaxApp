// frontend/src/pages/Reportes/ReportesList.jsx

import { useNavigate } from 'react-router-dom';
import { FileText, DollarSign, Users, TrendingUp, ArrowRight, Leaf } from 'lucide-react';

export default function ReportesList() {
  const navigate = useNavigate();

  const reportesDisponibles = [
    {
      id: 'nomina',
      titulo: 'Reportes de Nómina',
      descripcion: 'Genere colillas consolidadas y reportes de pago en PDF y Excel',
      icono: DollarSign,
      color: 'blue',
      ruta: '/reportes/nomina',
      disponible: true,
    },
    {
      id: 'produccion',
      titulo: 'Produccion',
      descripcion: 'Tendencias de ratio, cajas por semana y analisis por color de cinta',
      icono: Leaf,
      color: 'green',
      ruta: '/reportes/produccion',
      disponible: true,
    },
    {
      id: 'trabajadores',
      titulo: 'Estadísticas de Trabajadores',
      descripcion: 'Análisis de asistencia, productividad y desempeño',
      icono: Users,
      color: 'green',
      ruta: null,
      disponible: false,
    },
    {
      id: 'costos',
      titulo: 'Análisis de Costos',
      descripcion: 'Costos por finca, labor y período de tiempo',
      icono: TrendingUp,
      color: 'purple',
      ruta: null,
      disponible: false,
    },
  ];

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <FileText className="h-8 w-8 text-blue-600" />
          <h1 className="text-3xl font-bold text-gray-900">Reportes</h1>
        </div>
        <p className="text-gray-600">
          Genere y descargue reportes detallados de su operación
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {reportesDisponibles.map((reporte) => {
          const Icon = reporte.icono;
          const colorClasses = {
            blue: 'bg-blue-100 text-blue-600 hover:bg-blue-50',
            green: 'bg-green-100 text-green-600 hover:bg-green-50',
            purple: 'bg-purple-100 text-purple-600 hover:bg-purple-50',
          };

          return (
            <div
              key={reporte.id}
              className={`
                relative bg-white rounded-lg border-2 p-6 transition-all
                ${
                  reporte.disponible
                    ? 'border-gray-200 hover:border-blue-500 hover:shadow-lg cursor-pointer'
                    : 'border-gray-100 opacity-60 cursor-not-allowed'
                }
              `}
              onClick={() => {
                if (reporte.disponible && reporte.ruta) {
                  navigate(reporte.ruta);
                }
              }}
            >
              {!reporte.disponible && (
                <div className="absolute top-3 right-3">
                  <span className="bg-gray-200 text-gray-600 text-xs px-2 py-1 rounded-full font-medium">
                    Próximamente
                  </span>
                </div>
              )}

              <div className={`inline-flex p-3 rounded-lg mb-4 ${colorClasses[reporte.color]}`}>
                <Icon className="h-6 w-6" />
              </div>

              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {reporte.titulo}
              </h3>

              <p className="text-sm text-gray-600 mb-4">
                {reporte.descripcion}
              </p>

              {reporte.disponible && (
                <div className="flex items-center text-blue-600 text-sm font-medium">
                  Acceder
                  <ArrowRight className="ml-2 h-4 w-4" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Información adicional */}
      <div className="mt-8 bg-blue-50 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-blue-900 mb-2">
          ¿Necesita un reporte personalizado?
        </h2>
        <p className="text-blue-800">
          Los reportes se irán agregando progresivamente. Si necesita un tipo de reporte
          específico, contáctenos para priorizar su desarrollo.
        </p>
      </div>
    </div>
  );
}
