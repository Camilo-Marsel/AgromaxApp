// frontend/src/pages/Reportes/ReportesList.jsx

import { FileText } from 'lucide-react';

export default function ReportesList() {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center py-16">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-blue-100 mb-6">
          <FileText className="h-10 w-10 text-blue-600" />
        </div>

        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Módulo de Reportes
        </h1>

        <p className="text-lg text-gray-600 mb-8">
          Este módulo está en construcción y estará disponible próximamente.
        </p>

        <div className="bg-gray-50 rounded-lg p-6 max-w-2xl mx-auto">
          <h2 className="text-lg font-semibold text-gray-800 mb-3">
            Funcionalidades planeadas:
          </h2>
          <ul className="text-left text-gray-600 space-y-2">
            <li className="flex items-start">
              <span className="text-blue-500 mr-2">•</span>
              <span>Reportes de nómina por período</span>
            </li>
            <li className="flex items-start">
              <span className="text-blue-500 mr-2">•</span>
              <span>Estadísticas de trabajadores</span>
            </li>
            <li className="flex items-start">
              <span className="text-blue-500 mr-2">•</span>
              <span>Análisis de costos por finca</span>
            </li>
            <li className="flex items-start">
              <span className="text-blue-500 mr-2">•</span>
              <span>Exportación de datos históricos</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
