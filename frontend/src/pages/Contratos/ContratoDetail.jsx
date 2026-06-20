// frontend/src/pages/Contratos/ContratoDetail.jsx

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import contratoService, { documentoContratoService } from '../../services/contratoService';
import LoadingSpinner from '../../components/Common/LoadingSpinner';
import ConfirmDialog from '../../components/Common/ConfirmDialog';
import toast from 'react-hot-toast';
import {
  ArrowLeft,
  Edit,
  FileText,
  User,
  Calendar,
  DollarSign,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Upload,
  Download,
  Trash2,
  FileCheck,
  TrendingUp,
  Printer,
  Eye,
  Calculator,
} from 'lucide-react';

export default function ContratoDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [contrato, setContrato] = useState(null);
  const [documentos, setDocumentos] = useState([]);
  const [historial, setHistorial] = useState([]);
  const [nominas, setNominas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('informacion');
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: null,
    type: 'warning',
  });
  const [generandoPdf, setGenerandoPdf] = useState(false);

  useEffect(() => {
    loadContrato();
  }, [id]);

  useEffect(() => {
    if (activeTab === 'documentos') {
      loadDocumentos();
    } else if (activeTab === 'historial') {
      loadHistorial();
    } else if (activeTab === 'nominas') {
      loadNominas();
    }
  }, [activeTab]);

  const loadContrato = async () => {
    try {
      setLoading(true);
      const data = await contratoService.getById(id);
      setContrato(data);
    } catch (error) {
      console.error('Error al cargar contrato:', error);
      toast.error('Error al cargar contrato');
      navigate('/contratos');
    } finally {
      setLoading(false);
    }
  };

  const loadDocumentos = async () => {
    try {
      const data = await documentoContratoService.getByContrato(id);
      setDocumentos(data.results || data);
    } catch (error) {
      console.error('Error al cargar documentos:', error);
      toast.error('Error al cargar documentos');
    }
  };

  const loadHistorial = async () => {
    try {
      const data = await contratoService.getHistorial(id);
      setHistorial(data);
    } catch (error) {
      console.error('Error al cargar historial:', error);
      toast.error('Error al cargar historial');
    }
  };

  const loadNominas = async () => {
    try {
      const data = await contratoService.getNominas(id);
      setNominas(data.results || data);
    } catch (error) {
      console.error('Error al cargar nóminas:', error);
      toast.error('Error al cargar nóminas');
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      setUploadingDoc(true);
      const data = {
        contrato: id,
        archivo: file,
        tipo_documento: 'CONTRATO',
        nombre: file.name,
      };

      await documentoContratoService.upload(data);
      toast.success('Documento subido correctamente');
      loadDocumentos();
    } catch (error) {
      console.error('Error al subir documento:', error);
      toast.error('Error al subir documento');
    } finally {
      setUploadingDoc(false);
    }
  };

  const handleDeleteDoc = async (docId) => {
    try {
      await documentoContratoService.delete(docId);
      toast.success('Documento eliminado correctamente');
      loadDocumentos();
    } catch (error) {
      console.error('Error al eliminar documento:', error);
      toast.error('Error al eliminar documento');
    }
  };

  const handleFinalizar = async (motivo, observaciones) => {
    try {
      await contratoService.finalizar(id, { motivo, observaciones });
      toast.success('Contrato finalizado correctamente');
      loadContrato();
    } catch (error) {
      console.error('Error al finalizar contrato:', error);
      toast.error(error.response?.data?.error || 'Error al finalizar contrato');
    }
  };

  const handleLiquidar = async () => {
    try {
      await contratoService.liquidar(id, {});
      toast.success('Contrato liquidado correctamente');
      loadContrato();
    } catch (error) {
      console.error('Error al liquidar contrato:', error);
      toast.error(error.response?.data?.error || 'Error al liquidar contrato');
    }
  };

  const handleCancelar = async (motivo) => {
    try {
      await contratoService.cancelar(id, { motivo });
      toast.success('Contrato cancelado correctamente');
      loadContrato();
    } catch (error) {
      console.error('Error al cancelar contrato:', error);
      toast.error(error.response?.data?.error || 'Error al cancelar contrato');
    }
  };

  const handleReactivar = async () => {
    try {
      await contratoService.reactivar(id, {});
      toast.success('Contrato reactivado correctamente');
      loadContrato();
    } catch (error) {
      console.error('Error al reactivar contrato:', error);
      toast.error(error.response?.data?.error || 'Error al reactivar contrato');
    }
  };

  const handleGenerarPdf = async () => {
    try {
      setGenerandoPdf(true);
      await contratoService.generarPdf(id);
      toast.success('PDF generado correctamente');
    } catch (error) {
      console.error('Error al generar PDF:', error);
      toast.error('Error al generar el PDF del contrato');
    } finally {
      setGenerandoPdf(false);
    }
  };

  const handleDescargarPdf = async () => {
    try {
      setGenerandoPdf(true);
      await contratoService.descargarPdf(id, contrato?.numero_contrato);
      toast.success('PDF descargado correctamente');
    } catch (error) {
      console.error('Error al descargar PDF:', error);
      toast.error('Error al descargar el PDF del contrato');
    } finally {
      setGenerandoPdf(false);
    }
  };

  const formatMoney = (value) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    // Agregar T12:00:00 para evitar desfase de zona horaria
    // Las fechas ISO sin hora se interpretan como UTC y se desfasan al convertir a hora local
    const dateStr = dateString.includes('T') ? dateString : `${dateString}T12:00:00`;
    return new Date(dateStr).toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatDateTime = (dateString) => {
    return new Date(dateString).toLocaleString('es-CO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getEstadoBadge = (estado) => {
    const badges = {
      ACTIVO: { bg: 'bg-green-100', text: 'text-green-800', label: 'Activo', icon: CheckCircle },
      FINALIZADO: { bg: 'bg-orange-100', text: 'text-orange-800', label: 'Finalizado', icon: Clock },
      LIQUIDADO: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Liquidado', icon: FileCheck },
      CANCELADO: { bg: 'bg-red-100', text: 'text-red-800', label: 'Cancelado', icon: XCircle },
    };

    const badge = badges[estado] || badges.ACTIVO;
    const Icon = badge.icon;

    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-semibold ${badge.bg} ${badge.text}`}>
        <Icon className="w-4 h-4" />
        {badge.label}
      </span>
    );
  };

  const openConfirmDialog = (title, message, onConfirm, type = 'warning') => {
    setConfirmDialog({ isOpen: true, title, message, onConfirm, type });
  };

  const closeConfirmDialog = () => {
    setConfirmDialog({ isOpen: false, title: '', message: '', onConfirm: null, type: 'warning' });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!contrato) return null;

  const tabs = [
    { id: 'informacion', label: 'Información', icon: FileText },
    { id: 'documentos', label: 'Documentos', icon: Upload },
    { id: 'historial', label: 'Historial', icon: Clock },
    { id: 'nominas', label: 'Nóminas', icon: DollarSign },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/contratos')}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold">{contrato.numero_contrato}</h1>
            <p className="text-gray-600">{contrato.trabajador_info?.nombre_completo}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {getEstadoBadge(contrato.estado)}

          {/* Botones de PDF */}
          <button
            onClick={handleGenerarPdf}
            disabled={generandoPdf}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Ver contrato PDF"
          >
            <Eye className="w-4 h-4" />
            {generandoPdf ? 'Generando...' : 'Ver PDF'}
          </button>

          <button
            onClick={handleDescargarPdf}
            disabled={generandoPdf}
            className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Descargar contrato PDF"
          >
            <Download className="w-4 h-4" />
            Descargar
          </button>

          {contrato.estado === 'ACTIVO' && (
            <button
              onClick={() => navigate(`/contratos/${id}/editar`)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              <Edit className="w-4 h-4" />
              Editar
            </button>
          )}
        </div>
      </div>

      {/* Alert Banner */}
      {contrato.esta_vencido && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <p className="text-red-700 font-medium">
              Este contrato está vencido desde el {formatDate(contrato.fecha_fin)}
            </p>
          </div>
        </div>
      )}

      {contrato.esta_por_vencer && !contrato.esta_vencido && (
        <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-yellow-500" />
            <p className="text-yellow-700 font-medium">
              Este contrato vence en {contrato.dias_restantes} días ({formatDate(contrato.fecha_fin)})
            </p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-6">
          {/* Tab: Información */}
          {activeTab === 'informacion' && (
            <div className="space-y-6">
              {/* Información General */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Información General</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="text-sm text-gray-600">Número de Contrato</label>
                    <p className="text-base font-medium">{contrato.numero_contrato}</p>
                  </div>

                  <div>
                    <label className="text-sm text-gray-600">Trabajador</label>
                    <p className="text-base font-medium">
                      {contrato.trabajador_info?.nombre_completo}
                    </p>
                  </div>

                  <div>
                    <label className="text-sm text-gray-600">Cargo</label>
                    <p className="text-base font-medium">{contrato.cargo}</p>
                  </div>

                  <div>
                    <label className="text-sm text-gray-600">Tipo de Contrato</label>
                    <p className="text-base font-medium">{contrato.tipo_contrato_display}</p>
                  </div>

                  <div>
                    <label className="text-sm text-gray-600">Fecha de Inicio</label>
                    <p className="text-base font-medium">{formatDate(contrato.fecha_inicio)}</p>
                  </div>

                  {contrato.fecha_fin && (
                    <div>
                      <label className="text-sm text-gray-600">Fecha de Fin</label>
                      <p className="text-base font-medium">{formatDate(contrato.fecha_fin)}</p>
                    </div>
                  )}

                  <div>
                    <label className="text-sm text-gray-600">Salario Pactado</label>
                    <p className="text-lg font-bold text-blue-600">
                      {formatMoney(contrato.salario_pactado)}
                    </p>
                  </div>

                  <div>
                    <label className="text-sm text-gray-600">Estado</label>
                    <div className="mt-1">{getEstadoBadge(contrato.estado)}</div>
                  </div>
                </div>
              </div>

              {/* Progreso del Contrato */}
              {contrato.progreso_contrato !== null && (
                <div>
                  <h3 className="text-lg font-semibold mb-4">Progreso del Contrato</h3>
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-600">Avance</span>
                        <span className="text-sm font-medium">
                          {Math.round(contrato.progreso_contrato)}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div
                          className={`h-3 rounded-full transition-all ${
                            contrato.progreso_contrato >= 90
                              ? 'bg-red-500'
                              : contrato.progreso_contrato >= 70
                              ? 'bg-yellow-500'
                              : 'bg-blue-500'
                          }`}
                          style={{ width: `${contrato.progreso_contrato}%` }}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4 text-center">
                      {contrato.duracion_meses !== null && (
                        <div className="bg-gray-50 p-4 rounded">
                          <p className="text-2xl font-bold text-gray-900">
                            {contrato.duracion_meses}
                          </p>
                          <p className="text-sm text-gray-600">Meses de duración</p>
                        </div>
                      )}

                      {contrato.dias_restantes !== null && (
                        <div className="bg-gray-50 p-4 rounded">
                          <p className="text-2xl font-bold text-gray-900">
                            {contrato.dias_restantes}
                          </p>
                          <p className="text-sm text-gray-600">Días restantes</p>
                        </div>
                      )}

                      {contrato.duracion_dias !== null && (
                        <div className="bg-gray-50 p-4 rounded">
                          <p className="text-2xl font-bold text-gray-900">
                            {contrato.duracion_dias}
                          </p>
                          <p className="text-sm text-gray-600">Días totales</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Detalles Adicionales */}
              {(contrato.motivo_finalizacion || contrato.observaciones_finalizacion) && (
                <div>
                  <h3 className="text-lg font-semibold mb-4">Información de Finalización</h3>
                  <div className="space-y-3">
                    {contrato.motivo_finalizacion && (
                      <div>
                        <label className="text-sm text-gray-600">Motivo</label>
                        <p className="text-base font-medium">{contrato.motivo_finalizacion}</p>
                      </div>
                    )}

                    {contrato.observaciones_finalizacion && (
                      <div>
                        <label className="text-sm text-gray-600">Observaciones</label>
                        <p className="text-base">{contrato.observaciones_finalizacion}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Acciones */}
              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold mb-4">Acciones</h3>
                <div className="flex flex-wrap gap-3">
                  {contrato.estado === 'ACTIVO' && (
                    <button
                      onClick={() =>
                        openConfirmDialog(
                          'Finalizar Contrato',
                          '¿Está seguro que desea finalizar este contrato?',
                          () => {
                            handleFinalizar('VENCIMIENTO_TERMINO', '');
                            closeConfirmDialog();
                          }
                        )
                      }
                      className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700"
                    >
                      Finalizar Contrato
                    </button>
                  )}

                  {contrato.estado === 'FINALIZADO' && (
                    <button
                      onClick={() =>
                        openConfirmDialog(
                          'Liquidar Contrato',
                          '¿Está seguro que desea liquidar este contrato?',
                          () => {
                            handleLiquidar();
                            closeConfirmDialog();
                          }
                        )
                      }
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                      Liquidar Contrato
                    </button>
                  )}

                  {(contrato.estado === 'FINALIZADO' || contrato.estado === 'LIQUIDADO') && (
                    <button
                      onClick={() => navigate(`/liquidaciones?trabajador=${contrato.trabajador}`)}
                      className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                    >
                      <Calculator className="w-4 h-4" />
                      Calcular liquidación
                    </button>
                  )}

                  {contrato.estado === 'ACTIVO' && (
                    <button
                      onClick={() =>
                        openConfirmDialog(
                          'Cancelar Contrato',
                          '¿Está seguro que desea cancelar este contrato?',
                          () => {
                            handleCancelar('Error en registro');
                            closeConfirmDialog();
                          },
                          'danger'
                        )
                      }
                      className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                    >
                      Cancelar Contrato
                    </button>
                  )}

                  {contrato.estado === 'CANCELADO' && !contrato.esta_vencido && (
                    <button
                      onClick={() =>
                        openConfirmDialog(
                          'Reactivar Contrato',
                          '¿Está seguro que desea reactivar este contrato?',
                          () => {
                            handleReactivar();
                            closeConfirmDialog();
                          },
                          'info'
                        )
                      }
                      className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                    >
                      Reactivar Contrato
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Tab: Documentos */}
          {activeTab === 'documentos' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Documentos del Contrato</h3>
                <label className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 cursor-pointer">
                  <Upload className="w-4 h-4" />
                  {uploadingDoc ? 'Subiendo...' : 'Subir Documento'}
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={handleFileUpload}
                    disabled={uploadingDoc}
                    className="hidden"
                  />
                </label>
              </div>

              {documentos.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <p>No hay documentos cargados</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {documentos.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <FileText className="w-8 h-8 text-blue-600" />
                        <div>
                          <p className="font-medium">{doc.nombre}</p>
                          <p className="text-sm text-gray-600">
                            {doc.tipo_documento_display} • {formatDateTime(doc.created_at)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <a
                          href={doc.archivo}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                        >
                          <Download className="w-5 h-5" />
                        </a>
                        <button
                          onClick={() =>
                            openConfirmDialog(
                              'Eliminar Documento',
                              '¿Está seguro que desea eliminar este documento?',
                              () => {
                                handleDeleteDoc(doc.id);
                                closeConfirmDialog();
                              },
                              'danger'
                            )
                          }
                          className="p-2 text-red-600 hover:bg-red-50 rounded"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tab: Historial */}
          {activeTab === 'historial' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Historial de Cambios</h3>

              {historial.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Clock className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <p>No hay historial disponible</p>
                </div>
              ) : (
                <div className="relative">
                  <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />

                  <div className="space-y-6">
                    {historial.map((item, index) => (
                      <div key={index} className="relative pl-10">
                        <div className="absolute left-2 w-4 h-4 bg-blue-500 rounded-full border-4 border-white" />
                        <div className="bg-gray-50 p-4 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <p className="font-medium">{item.accion}</p>
                            <p className="text-sm text-gray-600">{formatDateTime(item.fecha)}</p>
                          </div>
                          {item.descripcion && (
                            <p className="text-sm text-gray-700">{item.descripcion}</p>
                          )}
                          {item.usuario && (
                            <p className="text-xs text-gray-500 mt-2">Por: {item.usuario}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tab: Nóminas */}
          {activeTab === 'nominas' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Nóminas Asociadas</h3>

              {nominas.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <DollarSign className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <p>No hay nóminas asociadas a este contrato</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {nominas.map((nomina) => (
                    <div
                      key={nomina.id}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer"
                      onClick={() => navigate(`/nomina/${nomina.id}`)}
                    >
                      <div>
                        <p className="font-medium">{nomina.quincena_info?.nombre}</p>
                        <p className="text-sm text-gray-600">
                          {formatDate(nomina.quincena_info?.fecha_inicio)} -{' '}
                          {formatDate(nomina.quincena_info?.fecha_fin)}
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="font-bold text-blue-600">{formatMoney(nomina.total_pagar)}</p>
                        <p className="text-sm text-gray-600">{nomina.estado_display}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={closeConfirmDialog}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        message={confirmDialog.message}
        type={confirmDialog.type}
      />
    </div>
  );
}
