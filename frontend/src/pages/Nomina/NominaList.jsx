// frontend/src/pages/Nomina/NominaList.jsx

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import nominaService from '../../services/nominaService';
import quincenaService from '../../services/quincenaService';
import fincaService from '../../services/fincaService';
import LoadingSpinner from '../../components/Common/LoadingSpinner';
import ConfirmDialog from '../../components/Common/ConfirmDialog';
import SearchBar from '../../components/Common/SearchBar';
import toast from 'react-hot-toast';
import { Calculator, Eye, AlertCircle, Download, FileSpreadsheet, CheckCircle, XCircle, DollarSign } from 'lucide-react';

export default function NominaList() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [exportando, setExportando] = useState(false);
  const [quincenas, setQuincenas] = useState([]);
  const [fincas, setFincas] = useState([]);
  const [quincenaSeleccionada, setQuincenaSeleccionada] = useState(null);
  const [fincaSeleccionada, setFincaSeleccionada] = useState('');
  const [nominas, setNominas] = useState([]);
  const [nominasFiltradas, setNominasFiltradas] = useState([]);
  const [search, setSearch] = useState('');
  const [resumen, setResumen] = useState({
    total_trabajadores: 0,
    total_devengado: 0,
    total_deducciones: 0,
    total_neto: 0,
  });

  // Estados para acciones masivas
  const [confirmAprobarMasivo, setConfirmAprobarMasivo] = useState(false);
  const [confirmRechazarMasivo, setConfirmRechazarMasivo] = useState(false);
  const [confirmPagarMasivo, setConfirmPagarMasivo] = useState(false);
  const [motivoRechazoMasivo, setMotivoRechazoMasivo] = useState('');
  const [procesandoMasivo, setProcesandoMasivo] = useState(false);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (quincenaSeleccionada) {
      loadNominas(quincenaSeleccionada, fincaSeleccionada);
    }
  }, [quincenaSeleccionada, fincaSeleccionada]);

  // Filtrar nóminas por búsqueda
  useEffect(() => {
    if (search.trim() === '') {
      setNominasFiltradas(nominas);
    } else {
      const searchLower = search.toLowerCase();
      const filtered = nominas.filter((nomina) => {
        const nombreCompleto = nomina.trabajador_info?.nombre_completo.toLowerCase() || '';
        const documento = nomina.trabajador_info?.numero_documento || '';
        return nombreCompleto.includes(searchLower) || documento.includes(search);
      });
      setNominasFiltradas(filtered);
    }
    
    // Recalcular resumen con filtradas
    calcularResumen(search.trim() === '' ? nominas : nominasFiltradas);
  }, [search, nominas]);

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
      toast.error('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  const loadNominas = async (quincenaId, fincaId = '') => {
    try {
      const params = { quincena: quincenaId };
      if (fincaId) {
        params.finca = fincaId;
      }
      
      const data = await nominaService.getAll(params);
      const nominasArray = data.results || data;
      setNominas(nominasArray);
      setNominasFiltradas(nominasArray);
      
      calcularResumen(nominasArray);
    } catch (error) {
      console.error('Error al cargar nóminas:', error);
      toast.error('Error al cargar nóminas');
    }
  };

  const calcularResumen = (nominasArray) => {
    const resumen = nominasArray.reduce(
      (acc, nomina) => ({
        total_trabajadores: acc.total_trabajadores + 1,
        total_devengado: acc.total_devengado + parseFloat(nomina.total_devengado),
        total_deducciones: acc.total_deducciones + parseFloat(nomina.total_deducciones),
        total_neto: acc.total_neto + parseFloat(nomina.total_neto),
      }),
      { total_trabajadores: 0, total_devengado: 0, total_deducciones: 0, total_neto: 0 }
    );
    setResumen(resumen);
  };

  const handleCalcularNomina = async () => {
    try {
      setCalculating(true);

      const result = await nominaService.calcularQuincena(quincenaSeleccionada);
      toast.success(result.message);

      // Recargar nóminas
      await loadNominas(quincenaSeleccionada, fincaSeleccionada);
    } catch (error) {
      console.error('Error al calcular nómina:', error);
      toast.error('Error al calcular nómina');
    } finally {
      setCalculating(false);
    }
  };

  // Handlers para acciones masivas
  const handleAprobarMasivo = async () => {
    try {
      setProcesandoMasivo(true);
      const result = await nominaService.aprobarMasivo(
        quincenaSeleccionada,
        fincaSeleccionada || null
      );
      toast.success(result.message);
      setConfirmAprobarMasivo(false);
      await loadNominas(quincenaSeleccionada, fincaSeleccionada);
    } catch (error) {
      console.error('Error al aprobar masivo:', error);
      const errorMsg = error.response?.data?.error || 'Error al aprobar nóminas';
      toast.error(errorMsg);
    } finally {
      setProcesandoMasivo(false);
    }
  };

  const handleRechazarMasivo = async () => {
    try {
      setProcesandoMasivo(true);
      const result = await nominaService.rechazarMasivo(
        quincenaSeleccionada,
        fincaSeleccionada || null,
        motivoRechazoMasivo
      );
      toast.success(result.message);
      setConfirmRechazarMasivo(false);
      setMotivoRechazoMasivo('');
      await loadNominas(quincenaSeleccionada, fincaSeleccionada);
    } catch (error) {
      console.error('Error al rechazar masivo:', error);
      const errorMsg = error.response?.data?.error || 'Error al rechazar nóminas';
      toast.error(errorMsg);
    } finally {
      setProcesandoMasivo(false);
    }
  };

  const handlePagarMasivo = async () => {
    try {
      setProcesandoMasivo(true);
      const result = await nominaService.marcarPagadasMasivo(
        quincenaSeleccionada,
        fincaSeleccionada || null
      );
      toast.success(result.message);
      setConfirmPagarMasivo(false);
      await loadNominas(quincenaSeleccionada, fincaSeleccionada);
    } catch (error) {
      console.error('Error al marcar como pagadas:', error);
      const errorMsg = error.response?.data?.error || 'Error al marcar nóminas como pagadas';
      toast.error(errorMsg);
    } finally {
      setProcesandoMasivo(false);
    }
  };

  const handleExportarExcel = async () => {
    if (!quincenaSeleccionada) {
      toast.error('No hay quincena seleccionada');
      return;
    }

    try {
      setExportando(true);
      // Si hay filtro de finca, pasarlo al exportador
      await nominaService.exportarExcelQuincena(quincenaSeleccionada, fincaSeleccionada);
      toast.success('Excel generado correctamente');
    } catch (error) {
      console.error('Error al exportar Excel:', error);
      toast.error('Error al generar Excel. Verifique que haya nóminas calculadas.');
    } finally {
      setExportando(false);
    }
  };

  const handleDescargarPDF = async (nomina) => {
    try {
      const blob = await nominaService.descargarPDF(nomina.id);
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `comprobante_${nomina.trabajador_info?.numero_documento}_Q${nomina.quincena_info?.numero}.pdf`;
      document.body.appendChild(link);
      link.click();
      
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success('PDF descargado correctamente');
    } catch (error) {
      console.error('Error al descargar PDF:', error);
      toast.error('Error al descargar PDF');
    }
  };

  const formatMoney = (value) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(value);
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
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Nómina</h1>
      </div>

      {/* Filtros: Quincena y Finca */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Selector de Quincena */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Quincena
            </label>
            <select
              value={quincenaSeleccionada || ''}
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

          {/* Selector de Finca (Opcional) */}
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
      </div>

      {/* Botones de acción */}
      <div className="flex justify-end">
        <div className="flex gap-2">
          {quincenaSeleccionada && (
            <>
              {/* Botón Calcular */}
              <button
                onClick={handleCalcularNomina}
                disabled={calculating}
                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400"
              >
                {calculating ? (
                  <>
                    <LoadingSpinner size="sm" />
                    Calculando...
                  </>
                ) : (
                  <>
                    <Calculator className="w-5 h-5" />
                    Calcular Quincena
                  </>
                )}
              </button>

              {/* Botón Aprobar Masivo */}
              <button
                onClick={() => setConfirmAprobarMasivo(true)}
                disabled={nominasFiltradas.filter(n => n.estado === 'CALCULADA').length === 0}
                className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:bg-gray-400"
                title="Aprobar todas las nóminas CALCULADAS"
              >
                <CheckCircle className="w-5 h-5" />
                Aprobar Todas
              </button>

              {/* Botón Rechazar Masivo */}
              <button
                onClick={() => setConfirmRechazarMasivo(true)}
                disabled={nominasFiltradas.filter(n => n.estado === 'APROBADA').length === 0}
                className="flex items-center gap-2 bg-yellow-600 text-white px-4 py-2 rounded-md hover:bg-yellow-700 disabled:bg-gray-400"
                title="Rechazar todas las nóminas APROBADAS"
              >
                <XCircle className="w-5 h-5" />
                Rechazar Todas
              </button>

              {/* Botón Marcar Pagadas Masivo */}
              <button
                onClick={() => setConfirmPagarMasivo(true)}
                disabled={nominasFiltradas.filter(n => n.estado === 'APROBADA').length === 0}
                className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 disabled:bg-gray-400"
                title="Marcar todas las APROBADAS como PAGADAS"
              >
                <DollarSign className="w-5 h-5" />
                Marcar Todas Pagadas
              </button>

              {/* Botón Exportar Excel */}
              <button
                onClick={handleExportarExcel}
                disabled={exportando || nominasFiltradas.length === 0}
                className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-md hover:bg-emerald-700 disabled:bg-gray-400"
              >
                {exportando ? (
                  <>
                    <LoadingSpinner size="sm" />
                    Exportando...
                  </>
                ) : (
                  <>
                    <Download className="w-5 h-5" />
                    Exportar Excel
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Barra de Búsqueda */}
      <div className="bg-white p-4 rounded-lg shadow">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Buscar por nombre o documento..."
        />
      </div>

      {/* Diálogos de Confirmación Masiva */}
      <ConfirmDialog
        isOpen={confirmAprobarMasivo}
        onClose={() => setConfirmAprobarMasivo(false)}
        onConfirm={handleAprobarMasivo}
        title="Aprobar Nóminas Masivamente"
        message={
          <div className="space-y-2">
            <p>¿Está seguro que desea aprobar todas las nóminas CALCULADAS?</p>
            <div className="bg-blue-50 p-3 rounded-md">
              <p className="text-sm font-medium text-blue-900">
                {nominasFiltradas.filter(n => n.estado === 'CALCULADA').length} nómina(s) serán aprobadas
              </p>
              {fincaSeleccionada && (
                <p className="text-xs text-blue-700 mt-1">
                  Solo de la finca seleccionada
                </p>
              )}
            </div>
            <p className="text-sm text-gray-600">
              Una vez aprobadas, no se podrán editar ajustes manuales.
            </p>
          </div>
        }
        confirmText={procesandoMasivo ? "Aprobando..." : "Aprobar Todas"}
        disabled={procesandoMasivo}
      />

      <ConfirmDialog
        isOpen={confirmRechazarMasivo}
        onClose={() => {
          setConfirmRechazarMasivo(false);
          setMotivoRechazoMasivo('');
        }}
        onConfirm={handleRechazarMasivo}
        title="Rechazar Nóminas Masivamente"
        message={
          <div className="space-y-3">
            <p>¿Está seguro que desea rechazar todas las nóminas APROBADAS?</p>
            <div className="bg-yellow-50 p-3 rounded-md">
              <p className="text-sm font-medium text-yellow-900">
                {nominasFiltradas.filter(n => n.estado === 'APROBADA').length} nómina(s) regresarán a CALCULADA
              </p>
              {fincaSeleccionada && (
                <p className="text-xs text-yellow-700 mt-1">
                  Solo de la finca seleccionada
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Motivo del rechazo (opcional):
              </label>
              <textarea
                value={motivoRechazoMasivo}
                onChange={(e) => setMotivoRechazoMasivo(e.target.value)}
                rows="3"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
                placeholder="Ej: Error en cálculo de dominicales"
              />
            </div>
          </div>
        }
        confirmText={procesandoMasivo ? "Rechazando..." : "Rechazar Todas"}
        type="warning"
        disabled={procesandoMasivo}
      />

      <ConfirmDialog
        isOpen={confirmPagarMasivo}
        onClose={() => setConfirmPagarMasivo(false)}
        onConfirm={handlePagarMasivo}
        title="Marcar Nóminas como Pagadas"
        message={
          <div className="space-y-2">
            <p>¿Confirma que estas nóminas ya fueron pagadas a los trabajadores?</p>
            <div className="bg-purple-50 p-3 rounded-md">
              <p className="text-sm font-medium text-purple-900">
                {nominasFiltradas.filter(n => n.estado === 'APROBADA').length} nómina(s) serán marcadas como PAGADAS
              </p>
              {fincaSeleccionada && (
                <p className="text-xs text-purple-700 mt-1">
                  Solo de la finca seleccionada
                </p>
              )}
            </div>
            <p className="text-sm text-red-600 font-medium">
              ⚠️ Esta acción es permanente y no se puede deshacer.
            </p>
          </div>
        }
        confirmText={procesandoMasivo ? "Procesando..." : "Confirmar Pago Masivo"}
        disabled={procesandoMasivo}
      />

      {/* Resumen */}
      {nominasFiltradas.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-600">Trabajadores</p>
            <p className="text-2xl font-bold">{resumen.total_trabajadores}</p>
          </div>

          <div className="bg-green-50 rounded-lg shadow p-4">
            <p className="text-sm text-green-700">Total Devengado</p>
            <p className="text-2xl font-bold text-green-600">
              {formatMoney(resumen.total_devengado)}
            </p>
          </div>

          <div className="bg-red-50 rounded-lg shadow p-4">
            <p className="text-sm text-red-700">Total Deducciones</p>
            <p className="text-2xl font-bold text-red-600">
              {formatMoney(resumen.total_deducciones)}
            </p>
          </div>

          <div className="bg-blue-50 rounded-lg shadow p-4">
            <p className="text-sm text-blue-700">Total Neto a Pagar</p>
            <p className="text-2xl font-bold text-blue-600">
              {formatMoney(resumen.total_neto)}
            </p>
          </div>
        </div>
      )}

      {/* Tabla de Nóminas */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {nominasFiltradas.length === 0 ? (
          <div className="p-8 text-center">
            <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-700 mb-2">
              No hay nóminas {search ? 'que coincidan con la búsqueda' : 'calculadas'}
            </h3>
            <p className="text-gray-600 mb-4">
              {search ? 'Intente con otro término de búsqueda' : 'Haz clic en "Calcular" para procesar la nómina'}
            </p>
          </div>
        ) : (
          <>
            <div className="px-4 py-2 bg-gray-50 border-b">
              <p className="text-sm text-gray-600">
                Mostrando {nominasFiltradas.length} de {nominas.length} nóminas
              </p>
            </div>
            <div className="overflow-x-auto max-h-96 overflow-y-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Trabajador
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Finca
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Devengado
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Deducciones
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Neto
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Estado
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {nominasFiltradas.map((nomina) => (
                    <tr key={nomina.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {nomina.trabajador_info?.nombre_completo}
                        </div>
                        <div className="text-xs text-gray-500">
                          {nomina.trabajador_info?.numero_documento}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {nomina.trabajador_info?.finca_info?.nombre || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-medium">
                        {formatMoney(nomina.total_devengado)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 font-medium">
                        {formatMoney(nomina.total_deducciones)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600 font-bold">
                        {formatMoney(nomina.total_neto)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            nomina.estado === 'PAGADA'
                              ? 'bg-green-100 text-green-800'
                              : nomina.estado === 'APROBADA'
                              ? 'bg-blue-100 text-blue-800'
                              : nomina.estado === 'CALCULADA'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {nomina.estado_display}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex gap-2">
                          <button
                            onClick={() => navigate(`/nomina/${nomina.id}`)}
                            className="text-blue-600 hover:text-blue-900"
                            title="Ver detalle"
                          >
                            <Eye className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleDescargarPDF(nomina)}
                            className="text-green-600 hover:text-green-900"
                            title="Descargar PDF"
                          >
                            <Download className="w-5 h-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

    </div>
  );
}