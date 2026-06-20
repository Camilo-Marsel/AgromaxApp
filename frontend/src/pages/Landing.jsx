// frontend/src/pages/Landing.jsx

import { Link } from 'react-router-dom';
import { 
  CheckCircleIcon, 
  ClipboardDocumentCheckIcon,
  CurrencyDollarIcon,
  ChartBarIcon,
  UserGroupIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';

const Landing = () => {
  const features = [
    {
      icon: UserGroupIcon,
      title: 'Gestión de Personal',
      description: 'Control completo de trabajadores, fincas y lotes con información detallada y organizada.'
    },
    {
      icon: ClipboardDocumentCheckIcon,
      title: 'Registro de Labores',
      description: 'Registro eficiente de actividades diarias con calendario múltiple y validaciones automáticas.'
    },
    {
      icon: CurrencyDollarIcon,
      title: 'Nómina Automatizada',
      description: 'Cálculo automático quincenal con dominicales, deducciones, préstamos y ajustes manuales.'
    },
    {
      icon: DocumentTextIcon,
      title: 'Gestión de Préstamos',
      description: 'Sistema completo de préstamos con autorización, descuentos automáticos y paz y salvo en PDF.'
    },
    {
      icon: ChartBarIcon,
      title: 'Reportes Profesionales',
      description: 'Comprobantes de pago en PDF y reportes Excel con filtros por finca y período.'
    },
    {
      icon: CheckCircleIcon,
      title: 'Flujo Completo',
      description: 'Proceso estructurado: Calcular → Aprobar → Pagar con trazabilidad total.'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">A</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">AgromaxD</h1>
                <p className="text-sm text-gray-500">Sistema de Gestión de Nómina Agrícola</p>
              </div>
            </div>
            <Link
              to="/login"
              className="inline-flex items-center px-6 py-2.5 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors duration-200 shadow-md hover:shadow-lg"
            >
              Acceder al Sistema
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
        <div className="text-center">
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
            Gestiona tu Plantación
            <span className="block text-green-600 mt-2">de Forma Profesional</span>
          </h2>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Sistema completo de gestión de nómina diseñado específicamente para operaciones 
            agrícolas en Colombia. Automatiza cálculos, genera reportes y mantén el control total.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/login"
              className="inline-flex items-center justify-center px-8 py-4 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors duration-200 shadow-lg hover:shadow-xl text-lg"
            >
              Comenzar Ahora →
            </Link>
            <a
              href="#caracteristicas"
              className="inline-flex items-center justify-center px-8 py-4 bg-white text-green-600 font-semibold rounded-lg border-2 border-green-600 hover:bg-green-50 transition-colors duration-200 text-lg"
            >
              Ver Características
            </a>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="caracteristicas" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-20">
        <div className="text-center mb-12">
          <h3 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Todo lo que Necesitas en un Solo Lugar
          </h3>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Funcionalidades diseñadas para simplificar la gestión de tu operación agrícola
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="bg-white rounded-xl p-6 shadow-md hover:shadow-xl transition-shadow duration-300 border border-gray-100"
            >
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                <feature.icon className="w-6 h-6 text-green-600" />
              </div>
              <h4 className="text-xl font-semibold text-gray-900 mb-2">
                {feature.title}
              </h4>
              <p className="text-gray-600">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Stats Section */}
      <section className="bg-green-600 py-16 md:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-4xl md:text-5xl font-bold text-white mb-2">
                100%
              </div>
              <div className="text-green-100 text-lg">
                Automatización de Cálculos
              </div>
            </div>
            <div>
              <div className="text-4xl md:text-5xl font-bold text-white mb-2">
                84+
              </div>
              <div className="text-green-100 text-lg">
                Tipos de Labor Soportados
              </div>
            </div>
            <div>
              <div className="text-4xl md:text-5xl font-bold text-white mb-2">
                15 seg
              </div>
              <div className="text-green-100 text-lg">
                Tiempo de Cálculo de Nómina
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-20">
        <div className="bg-gradient-to-r from-green-600 to-blue-600 rounded-2xl p-8 md:p-12 text-center shadow-2xl">
          <h3 className="text-3xl md:text-4xl font-bold text-white mb-4">
            ¿Listo para Optimizar tu Gestión?
          </h3>
          <p className="text-xl text-green-50 mb-8 max-w-2xl mx-auto">
            Únete a los agricultores que ya confían en AgromaxD para su gestión de nómina
          </p>
          <Link
            to="/login"
            className="inline-flex items-center px-8 py-4 bg-white text-green-600 font-semibold rounded-lg hover:bg-green-50 transition-colors duration-200 shadow-lg hover:shadow-xl text-lg"
          >
            Acceder al Sistema →
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-sm">
              © 2026 AgromaxD. Sistema de Gestión de Nómina Agrícola.
            </p>
            <p className="text-xs mt-2">
              Desarrollado con tecnología profesional para operaciones agrícolas en Colombia.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
