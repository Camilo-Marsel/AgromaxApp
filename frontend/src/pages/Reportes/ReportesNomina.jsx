// frontend/src/pages/Reportes/ReportesNomina.jsx

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import quincenaService from '../../services/quincenaService';
import fincaService from '../../services/fincaService';
import nominaService from '../../services/nominaService';
import LoadingSpinner from '../../components/Common/LoadingSpinner';
import toast from 'react-hot-toast';
import { ArrowLeft, FileText, Download, FileSpreadsheet } from 'lucide-react';

export default function ReportesNomina() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [generando, setGenerando] = useState(false);
  const [quincenas, setQuincenas] = useState([]);
  const [fincas, setFincas] = useState([]);

  // Filtros
  const [quincenaSeleccionada, setQuincenaSeleccionada] = useState('');
  const [fincaSeleccionada, setFincaSeleccionada] = useState('');
  const [estadosSeleccionados, setEstadosSeleccionados] = useState({
    PENDIENTE: true,
    APROBADA: true,
  });

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      setLoading(true);

      // Cargar quincenas
      const quincenasData = await quincenaService.getAll();
      const quincenasArray = quincenasData.results || quincenasData;
      setQuincenas(quincenasArray);

      // Cargar fincas
      const fincasData = await fincaService.getAll();
      setFincas(fincasData.results || fincasData);

      // Seleccionar la quincena más reciente por defecto
      if (quincenasArray.length > 0) {
        setQuincenaSeleccionada(quincenasArray[0].id);
      }
    } catch (error) {
      console.error('Error al cargar datos:', error);
      toast.error('Error al cargar datos iniciales');
    } finally {
      setLoading(false);
    }
  };

  const handleEstadoChange = (estado) => {
    setEstadosSeleccionados(prev => ({
      ...prev,
      [estado]: !prev[estado]
    }));
  };

  const handleGenerarColillasConsolidadas = async () => {
    if (!quincenaSeleccionada) {
      toast.error('Debe seleccionar una quincena');
      return;
    }

    // Validar que al menos un estado esté seleccionado
    const algunEstadoSeleccionado = Object.values(estadosSeleccionados).some(val => val);
    if (!algunEstadoSeleccionado) {
      toast.error('Debe seleccionar al menos un estado');
      return;
    }

    try {
      setGenerando(true);

      // Construir parámetros
      const params = {
        quincena: quincenaSeleccionada,
      };

      if (fincaSeleccionada) {
        params.finca = fincaSeleccionada;
      }

      // Agregar estados seleccionados
      const estadosArray = Object.keys(estadosSeleccionados).filter(
        estado => estadosSeleccionados[estado]
      );
      params.estados = estadosArray.join(',');

      // Llamar al endpoint (lo crearemos en el backend)
      const response = await nominaService.descargarColillasConsolidadas(params);

      // Crear enlace de descarga
      const url = window.URL.createObjectURL(response);
      const link = document.createElement('a');
      link.href = url;

      // Nombre del archivo
      const quincena = quincenas.find(q => q.id === quincenaSeleccionada);
      const finca = fincas.find(f => f.id === fincaSeleccionada);
      const fincaNombre = finca ? `_${finca.nombre}` : '';
      const nombreArchivo = `Colillas_Q${quincena?.numero}_${quincena?.año}${fincaNombre}.pdf`;

      link.setAttribute('download', nombreArchivo);
      document.body.appendChild(link);
      link.click();

      link.remove();
      window.URL.revokeObjectURL(url);

      toast.success('Colillas consolidadas generadas correctamente');
    } catch (error) {
      console.error('Error al generar colillas:', error);
      toast.error(error.response?.data?.error || 'Error al generar colillas consolidadas');
    } finally {
      setGenerando(false);
    }
  };

  const handleExportarExcel = async () => {
    if (!quincenaSeleccionada) {
      toast.error('Debe seleccionar una quincena');
      return;
    }

    try {
      setGenerando(true);
      await nominaService.exportarExcelQuincena(quincenaSeleccionada, fincaSeleccionada);
      toast.success('Excel generado correctamente');
    } catch (error) {
      console.error('Error al exportar Excel:', error);
      toast.error('Error al generar Excel');
    } finally {
      setGenerando(false);
    }
  };

  const getQuincenaDisplay = (quincena) => {
    const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    return `Q${quincena.numero} - ${meses[quincena.mes - 1]} ${quincena.año}`;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/reportes')}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div>
          <h1 className="text-2xl font-bold">Reportes de Nómina</h1>
          <p className="text-gray-600">Genere reportes consolidados de nómina</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-4">Filtros</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Quincena */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Quincena <span className="text-red-500">*</span>
            </label>
            <select
              value={quincenaSeleccionada}
              onChange={(e) => setQuincenaSeleccionada(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Seleccione una quincena</option>
              {quincenas.map((quincena) => (
                <option key={quincena.id} value={quincena.id}>
                  {getQuincenaDisplay(quincena)} - {quincena.estado_display}
                </option>
              ))}
            </select>
          </div>

          {/* Finca */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Finca (Opcional)
            </label>
            <select
              value={fincaSeleccionada}
              onChange={(e) => setFincaSeleccionada(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todas las fincas</option>
              {fincas.map((finca) => (
                <option key={finca.id} value={finca.id}>
                  {finca.nombre}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Estados */}
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Estados de Nómina
          </label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={estadosSeleccionados.PENDIENTE}
                onChange={() => handleEstadoChange('PENDIENTE')}
                className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-sm">Pendientes</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={estadosSeleccionados.APROBADA}
                onChange={() => handleEstadoChange('APROBADA')}
                className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-sm">Aprobadas</span>
            </label>
          </div>
        </div>
      </div>

      {/* Reportes Disponibles */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-4">Reportes Disponibles</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Colillas Consolidadas */}
          <div className="border border-gray-200 rounded-lg p-4 hover:border-blue-500 transition-colors">
            <div className="flex items-start gap-3">
              <FileText className="w-8 h-8 text-red-600 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">Colillas Consolidadas (PDF)</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Genera un PDF con todas las colillas de pago de los trabajadores.
                  Una página por trabajador.
                </p>
                <button
                  onClick={handleGenerarColillasConsolidadas}
                  disabled={generando || !quincenaSeleccionada}
                  className="mt-3 flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 disabled:bg-gray-400 transition-colors"
                >
                  {generando ? (
                    <>
                      <LoadingSpinner size="sm" />
                      Generando...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      Generar PDF
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Resumen Excel */}
          <div className="border border-gray-200 rounded-lg p-4 hover:border-green-500 transition-colors">
            <div className="flex items-start gap-3">
              <FileSpreadsheet className="w-8 h-8 text-green-600 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">Resumen de Nómina (Excel)</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Exporta un resumen detallado de la nómina con todos los devengos y deducciones.
                </p>
                <button
                  onClick={handleExportarExcel}
                  disabled={generando || !quincenaSeleccionada}
                  className="mt-3 flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:bg-gray-400 transition-colors"
                >
                  {generando ? (
                    <>
                      <LoadingSpinner size="sm" />
                      Exportando...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      Exportar Excel
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Nota informativa */}
        <div className="mt-4 p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Nota:</strong> Los reportes respetarán los filtros seleccionados.
            Las colillas consolidadas incluirán solo las nóminas en los estados seleccionados.
          </p>
        </div>
      </div>
    </div>
  );
}
