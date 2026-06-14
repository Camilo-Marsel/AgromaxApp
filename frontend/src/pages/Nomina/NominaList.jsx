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
import { Calculator, Eye, AlertCircle, Download, CheckCircle, Mail, FileText } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

export default function NominaList() {
  const navigate = useNavigate();
  const { canModify } = useAuth();
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [exportando, setExportando] = useState(false);
  const [quincenas, setQuincenas] = useState([]);
  const [fincas, setFincas] = useState([]);
  const [quincenaSeleccionada, setQuincenaSeleccionada] = useState(null);
  const [fincasSeleccionadas, setFincasSeleccionadas] = useState([]);
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
  const [confirmEnviarCorreosMasivo, setConfirmEnviarCorreosMasivo] = useState(false);
  const [procesandoMasivo, setProcesandoMasivo] = useState(false);
  const [enviandoCorreos, setEnviandoCorreos] = useState(false);
  const [estadosEnvioCorreo, setEstadosEnvioCorreo] = useState(['APROBADA']);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (quincenaSeleccionada) {
      loadNominas(quincenaSeleccionada, fincasSeleccionadas);
    }
  }, [quincenaSeleccionada, fincasSeleccionadas]);

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

  const loadNominas = async (quincenaId, fincasIds = []) => {
    try {
      const params = { quincena: quincenaId };
      if (fincasIds.length > 0) {
        params.fincas = fincasIds.join(',');
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
      await loadNominas(quincenaSeleccionada, fincasSeleccionadas);
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
        fincasSeleccionadas.length > 0 ? fincasSeleccionadas.join(',') : null
      );
      toast.success(result.message);
      setConfirmAprobarMasivo(false);
      await loadNominas(quincenaSeleccionada, fincasSeleccionadas);
    } catch (error) {
      console.error('Error al aprobar masivo:', error);
      const errorMsg = error.response?.data?.error || 'Error al aprobar nóminas';
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
      // Si hay filtros de fincas, pasarlos al exportador
      await nominaService.exportarExcelQuincena(
        quincenaSeleccionada,
        fincasSeleccionadas.length > 0 ? fincasSeleccionadas.join(',') : null
      );
      toast.success('Excel generado correctamente');
    } catch (error) {
      console.error('Error al exportar Excel:', error);
      toast.error('Error al generar Excel. Verifique que haya nóminas calculadas.');
    } finally {
      setExportando(false);
    }
  };

  const handleExportarDetallado = async () => {
    if (!quincenaSeleccionada) {
      toast.error('No hay quincena seleccionada');
      return;
    }

    try {
      setExportando(true);
      // Si hay filtros de fincas, pasarlos al exportador
      await nominaService.exportarDetalladoQuincena(
        quincenaSeleccionada,
        fincasSeleccionadas.length > 0 ? fincasSeleccionadas.join(',') : null
      );
      toast.success('Reporte detallado generado correctamente');
    } catch (error) {
      console.error('Error al exportar reporte detallado:', error);
      // Mostrar mensaje de error específico si está disponible
      const errorMsg = error.message || error.response?.data?.detail || error.response?.data?.error || 'Error al generar reporte';
      toast.error(errorMsg);
    } finally {
      setExportando(false);
    }
  };

  const handleEnviarCorreosMasivo = async () => {
    try {
      setEnviandoCorreos(true);
      const result = await nominaService.enviarRecibosMasivo(
        quincenaSeleccionada,
        fincasSeleccionadas.length > 0 ? fincasSeleccionadas : null,
        estadosEnvioCorreo
      );

      if (result.exitosos > 0) {
        toast.success(`${result.exitosos} recibo(s) enviado(s) correctamente`);
      }
      if (result.fallidos > 0) {
        toast.error(`${result.fallidos} envío(s) fallido(s)`);
      }

      setConfirmEnviarCorreosMasivo(false);
    } catch (error) {
      console.error('Error al enviar correos:', error);
      const errorMsg = error.response?.data?.error || 'Error al enviar correos';
      toast.error(errorMsg);
    } finally {
      setEnviandoCorreos(false);
    }
  };

  // Contar nóminas con correo para envío masivo
  const nominasConCorreo = nominasFiltradas.filter(
    n => estadosEnvioCorreo.includes(n.estado) && n.trabajador_info?.correo
  );

  const handleDescargarPDF = async (nomina) => {
    try {
      const blob = await nominaService.descargarPDF(nomina.id);

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const meses = {1:'Enero',2:'Febrero',3:'Marzo',4:'Abril',5:'Mayo',6:'Junio',7:'Julio',8:'Agosto',9:'Septiembre',10:'Octubre',11:'Noviembre',12:'Diciembre'};
      const nombre = (nomina.trabajador_info?.nombre_completo || 'trabajador').replace(/\s+/g, '_');
      const mes = meses[nomina.quincena_info?.mes] || `Mes${nomina.quincena_info?.mes}`;
      link.download = `Colilla_${nombre}_${mes}_${nomina.quincena_info?.año}_Q${nomina.quincena_info?.numero}.pdf`;
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

  const handleEnviarCorreoIndividual = async (nomina) => {
    if (!nomina.trabajador_info?.correo) {
      toast.error(`${nomina.trabajador_info?.nombre_completo} no tiene correo registrado`);
      return;
    }

    try {
      toast.loading('Enviando correo...', { id: `email-${nomina.id}` });
      const result = await nominaService.enviarRecibo(nomina.id);
      toast.success(result.message || 'Recibo enviado correctamente', { id: `email-${nomina.id}` });
    } catch (error) {
      console.error('Error al enviar correo:', error);
      const errorMsg = error.response?.data?.error || 'Error al enviar correo';
      toast.error(errorMsg, { id: `email-${nomina.id}` });
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

          {/* Selector de Fincas (Multi-selección) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Fincas (Opcional - puede seleccionar varias)
            </label>
            <div className="border border-gray-300 rounded-md p-3 max-h-32 overflow-y-auto bg-white">
              <label className="flex items-center gap-2 mb-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={fincasSeleccionadas.length === 0}
                  onChange={() => setFincasSeleccionadas([])}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm font-semibold">Todas las fincas</span>
              </label>
              {fincas.map((finca) => (
                <label key={finca.id} className="flex items-center gap-2 mb-1 cursor-pointer hover:bg-gray-50 p-1 rounded">
                  <input
                    type="checkbox"
                    checked={fincasSeleccionadas.includes(finca.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setFincasSeleccionadas([...fincasSeleccionadas, finca.id]);
                      } else {
                        setFincasSeleccionadas(fincasSeleccionadas.filter(id => id !== finca.id));
                      }
                    }}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm">{finca.nombre}</span>
                </label>
              ))}
            </div>
            {fincasSeleccionadas.length > 0 && (
              <p className="mt-1 text-xs text-gray-600">
                {fincasSeleccionadas.length} finca{fincasSeleccionadas.length > 1 ? 's' : ''} seleccionada{fincasSeleccionadas.length > 1 ? 's' : ''}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Botones de acción */}
      <div className="flex justify-end">
        <div className="flex flex-wrap gap-2">
          {quincenaSeleccionada && (
            <>
              {/* Botones de modificación - solo para ADMINISTRADOR y SUPERVISOR */}
              {canModify() && (
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
                    disabled={nominasFiltradas.filter(n => n.estado === 'PENDIENTE').length === 0}
                    className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:bg-gray-400"
                    title="Aprobar todas las nóminas PENDIENTES"
                  >
                    <CheckCircle className="w-5 h-5" />
                    Aprobar Todas
                  </button>
                </>
              )}

              {/* Botón Exportar Excel - disponible para todos los roles */}
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

              {/* Botón Reporte Detallado */}
              <button
                onClick={handleExportarDetallado}
                disabled={exportando || nominasFiltradas.length === 0}
                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400"
                title="Exportar reporte detallado con IBC, auxilio, deducciones, etc."
              >
                {exportando ? (
                  <>
                    <LoadingSpinner size="sm" />
                    Exportando...
                  </>
                ) : (
                  <>
                    <FileText className="w-5 h-5" />
                    Reporte Detallado
                  </>
                )}
              </button>

              {/* Botón Enviar Recibos por Correo */}
              <button
                onClick={() => setConfirmEnviarCorreosMasivo(true)}
                disabled={enviandoCorreos || nominasConCorreo.length === 0}
                className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 disabled:bg-gray-400"
                title="Enviar recibos por correo electrónico"
              >
                {enviandoCorreos ? (
                  <>
                    <LoadingSpinner size="sm" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Mail className="w-5 h-5" />
                    Enviar Correos
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
            <p>¿Está seguro que desea aprobar todas las nóminas PENDIENTES?</p>
            <div className="bg-blue-50 p-3 rounded-md">
              <p className="text-sm font-medium text-blue-900">
                {nominasFiltradas.filter(n => n.estado === 'PENDIENTE').length} nómina(s) serán aprobadas
              </p>
              {fincasSeleccionadas.length > 0 && (
                <p className="text-xs text-blue-700 mt-1">
                  Solo de {fincasSeleccionadas.length} finca{fincasSeleccionadas.length > 1 ? 's' : ''} seleccionada{fincasSeleccionadas.length > 1 ? 's' : ''}
                </p>
              )}
            </div>
            <p className="text-sm text-red-600 font-medium">
              ⚠️ Una vez aprobadas, los valores quedan como oficiales.
            </p>
          </div>
        }
        confirmText={procesandoMasivo ? "Aprobando..." : "Aprobar Todas"}
        disabled={procesandoMasivo}
      />

      <ConfirmDialog
        isOpen={confirmEnviarCorreosMasivo}
        onClose={() => setConfirmEnviarCorreosMasivo(false)}
        onConfirm={handleEnviarCorreosMasivo}
        title="Enviar Recibos por Correo"
        message={
          <div className="space-y-3">
            <p>Enviar recibos de pago por correo electrónico a los trabajadores.</p>

            {/* Selector de estados */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Enviar recibos de nóminas en estado:
              </label>
              <div className="flex flex-wrap gap-2">
                {['PENDIENTE', 'APROBADA'].map((estado) => (
                  <label key={estado} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={estadosEnvioCorreo.includes(estado)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setEstadosEnvioCorreo([...estadosEnvioCorreo, estado]);
                        } else {
                          setEstadosEnvioCorreo(estadosEnvioCorreo.filter(s => s !== estado));
                        }
                      }}
                      className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      estado === 'APROBADA' ? 'bg-green-100 text-green-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {estado === 'PENDIENTE' ? 'Pendiente' : 'Aprobada'}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div className="bg-indigo-50 p-3 rounded-md">
              <p className="text-sm font-medium text-indigo-900">
                {nominasConCorreo.length} trabajador(es) con correo registrado recibirán su recibo
              </p>
              {fincasSeleccionadas.length > 0 && (
                <p className="text-xs text-indigo-700 mt-1">
                  Solo de {fincasSeleccionadas.length} finca{fincasSeleccionadas.length > 1 ? 's' : ''} seleccionada{fincasSeleccionadas.length > 1 ? 's' : ''}
                </p>
              )}
              {nominasFiltradas.filter(n => estadosEnvioCorreo.includes(n.estado) && !n.trabajador_info?.correo).length > 0 && (
                <p className="text-xs text-orange-600 mt-1">
                  ⚠️ {nominasFiltradas.filter(n => estadosEnvioCorreo.includes(n.estado) && !n.trabajador_info?.correo).length} trabajador(es) no tienen correo registrado
                </p>
              )}
            </div>
          </div>
        }
        confirmText={enviandoCorreos ? "Enviando..." : `Enviar ${nominasConCorreo.length} Correo(s)`}
        disabled={enviandoCorreos || nominasConCorreo.length === 0}
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
                            nomina.estado === 'APROBADA'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}
                        >
                          {nomina.estado_display || nomina.estado}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex gap-2">
                          <button
                            onClick={() => navigate(`/nomina/${nomina.id}`, {
                              state: {
                                nominaIds: nominasFiltradas.map(n => n.id),
                                currentIndex: nominasFiltradas.findIndex(n => n.id === nomina.id)
                              }
                            })}
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
                          <button
                            onClick={() => handleEnviarCorreoIndividual(nomina)}
                            className={`${nomina.trabajador_info?.correo ? 'text-indigo-600 hover:text-indigo-900' : 'text-gray-300 cursor-not-allowed'}`}
                            title={nomina.trabajador_info?.correo ? `Enviar a ${nomina.trabajador_info.correo}` : 'Sin correo registrado'}
                            disabled={!nomina.trabajador_info?.correo}
                          >
                            <Mail className="w-5 h-5" />
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