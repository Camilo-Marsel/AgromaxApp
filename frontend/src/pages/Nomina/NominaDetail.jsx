// frontend/src/pages/Nomina/NominaDetail.jsx

import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import nominaService from '../../services/nominaService';
import LoadingSpinner from '../../components/Common/LoadingSpinner';
import ConfirmDialog from '../../components/Common/ConfirmDialog';
import toast from 'react-hot-toast';
import { ArrowLeft, Download, Edit2, Save, X, CheckCircle, Mail } from 'lucide-react';

export default function NominaDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  
  const [nomina, setNomina] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editandoAjustes, setEditandoAjustes] = useState(false);
  const [guardandoAjustes, setGuardandoAjustes] = useState(false);
  const [confirmAprobar, setConfirmAprobar] = useState(false);
  const [confirmRechazar, setConfirmRechazar] = useState(false);
  const [motivoRechazo, setMotivoRechazo] = useState('');
  const [procesando, setProcesando] = useState(false);
  const [enviandoCorreo, setEnviandoCorreo] = useState(false);

  const { register, handleSubmit, reset, watch } = useForm();

  useEffect(() => {
    loadNomina();
  }, [id]);

  const loadNomina = async () => {
    try {
      setLoading(true);
      const data = await nominaService.getById(id);
      setNomina(data);
      reset({
        devengos_adicionales: data.devengos_adicionales || 0,
        descripcion_devengos_adicionales: data.descripcion_devengos_adicionales || '',
        deducciones_adicionales: data.deducciones_adicionales || 0,
        descripcion_deducciones_adicionales: data.descripcion_deducciones_adicionales || '',
      });
    } catch (error) {
      console.error('Error al cargar nómina:', error);
      toast.error('Error al cargar nómina');
      navigate('/nomina');
    } finally {
      setLoading(false);
    }
  };

  const handleGuardarAjustes = async (data) => {
    try {
      setGuardandoAjustes(true);
      
      // Actualizar ajustes
      await nominaService.actualizarAjustes(id, {
        devengos_adicionales: parseFloat(data.devengos_adicionales) || 0,
        descripcion_devengos_adicionales: data.descripcion_devengos_adicionales || '',
        deducciones_adicionales: parseFloat(data.deducciones_adicionales) || 0,
        descripcion_deducciones_adicionales: data.descripcion_deducciones_adicionales || '',
      });

      // Recalcular nómina
      await nominaService.recalcular(id);
      
      toast.success('Ajustes guardados y nómina recalculada');
      setEditandoAjustes(false);
      await loadNomina();
    } catch (error) {
      console.error('Error al guardar ajustes:', error);
      toast.error('Error al guardar ajustes');
    } finally {
      setGuardandoAjustes(false);
    }
  };

  const handleDescargarPDF = async () => {
    try {
      const blob = await nominaService.descargarPDF(id);
      
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

  const handleAprobar = async () => {
    try {
      setProcesando(true);
      await nominaService.aprobar(id);
      toast.success('Nómina aprobada correctamente');
      setConfirmAprobar(false);
      await loadNomina();
    } catch (error) {
      console.error('Error al aprobar nómina:', error);
      toast.error('Error al aprobar nómina');
    } finally {
      setProcesando(false);
    }
  };

  const handleRechazar = async () => {
    try {
      setProcesando(true);
      await nominaService.rechazar(id, motivoRechazo);
      toast.success('Nómina rechazada correctamente');
      setConfirmRechazar(false);
      setMotivoRechazo('');
      await loadNomina();
    } catch (error) {
      console.error('Error al rechazar nómina:', error);
      toast.error('Error al rechazar nómina');
    } finally {
      setProcesando(false);
    }
  };


  const handleEnviarCorreo = async () => {
    if (!nomina.trabajador_info?.correo) {
      toast.error(`El trabajador ${nomina.trabajador_info?.nombre_completo} no tiene correo registrado`);
      return;
    }

    try {
      setEnviandoCorreo(true);
      const result = await nominaService.enviarRecibo(id);
      toast.success(result.message || 'Recibo enviado correctamente');
    } catch (error) {
      console.error('Error al enviar correo:', error);
      const errorMsg = error.response?.data?.error || 'Error al enviar correo';
      toast.error(errorMsg);
    } finally {
      setEnviandoCorreo(false);
    }
  };

  const formatMoney = (value) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(value);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!nomina) return null;

  // Agrupar detalles por tipo
  const devengos = nomina.detalles?.filter(d => d.tipo === 'DEVENGO') || [];
  const deducciones = nomina.detalles?.filter(d => d.tipo === 'DEDUCCION') || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/nomina')}
            className="p-2 hover:bg-gray-100 rounded-md"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold">Detalle de Nómina</h1>
            <p className="text-gray-600">
              {nomina.trabajador_info?.nombre_completo} - Quincena {nomina.quincena_info?.numero}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleDescargarPDF}
            className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
          >
            <Download className="w-5 h-5" />
            Descargar PDF
          </button>

          {/* Botón enviar por correo */}
          <button
            onClick={handleEnviarCorreo}
            disabled={enviandoCorreo}
            className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 disabled:bg-gray-400"
            title={nomina.trabajador_info?.correo ? `Enviar a ${nomina.trabajador_info.correo}` : 'Sin correo registrado'}
          >
            {enviandoCorreo ? (
              <>
                <LoadingSpinner size="sm" />
                Enviando...
              </>
            ) : (
              <>
                <Mail className="w-5 h-5" />
                Enviar por Correo
              </>
            )}
          </button>

          {/* Botones según estado */}
          {nomina.estado === 'PENDIENTE' && (
            <button
              onClick={() => setConfirmAprobar(true)}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
            >
              <CheckCircle className="w-5 h-5" />
              Aprobar Nómina
            </button>
          )}

          {nomina.estado === 'APROBADA' && (
            <button
              onClick={() => setConfirmRechazar(true)}
              className="flex items-center gap-2 bg-yellow-600 text-white px-4 py-2 rounded-md hover:bg-yellow-700"
            >
              <X className="w-5 h-5" />
              Rechazar
            </button>
          )}
        </div>
      </div>

      {/* Info General */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-4">Información General</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-gray-600">Trabajador</p>
            <p className="font-medium">{nomina.trabajador_info?.nombre_completo}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Documento</p>
            <p className="font-medium">{nomina.trabajador_info?.numero_documento}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Quincena</p>
            <p className="font-medium">
              Q{nomina.quincena_info?.numero} - {nomina.quincena_info?.mes}/{nomina.quincena_info?.año}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Estado</p>
            <span
              className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                nomina.estado === 'APROBADA'
                  ? 'bg-green-100 text-green-800'
                  : 'bg-yellow-100 text-yellow-800'
              }`}
            >
              {nomina.estado_display}
            </span>
          </div>
        </div>
      </div>

      {/* Ajustes Manuales */}
      {nomina.estado === 'PENDIENTE' && (
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Ajustes Manuales</h2>
            {!editandoAjustes ? (
              <button
                onClick={() => setEditandoAjustes(true)}
                className="flex items-center gap-2 text-blue-600 hover:text-blue-800"
              >
                <Edit2 className="w-4 h-4" />
                Editar Ajustes
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setEditandoAjustes(false);
                    reset({
                      devengos_adicionales: nomina.devengos_adicionales || 0,
                      descripcion_devengos_adicionales: nomina.descripcion_devengos_adicionales || '',
                      deducciones_adicionales: nomina.deducciones_adicionales || 0,
                      descripcion_deducciones_adicionales: nomina.descripcion_deducciones_adicionales || '',
                    });
                  }}
                  className="flex items-center gap-2 text-gray-600 hover:text-gray-800"
                >
                  <X className="w-4 h-4" />
                  Cancelar
                </button>
              </div>
            )}
          </div>

          {editandoAjustes ? (
            <form onSubmit={handleSubmit(handleGuardarAjustes)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Devengos Adicionales */}
                <div className="border-l-4 border-green-500 pl-4 bg-green-50 p-4 rounded-r-md">
                  <h3 className="font-medium text-green-800 mb-2">Devengos Adicionales</h3>
                  <div className="space-y-2">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Valor
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        {...register('devengos_adicionales')}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Descripción
                      </label>
                      <textarea
                        {...register('descripcion_devengos_adicionales')}
                        rows="2"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                        placeholder="Ej: Bono por productividad"
                        disabled={!watch('devengos_adicionales') || watch('devengos_adicionales') <= 0}
                      />
                    </div>
                  </div>
                </div>

                {/* Deducciones Adicionales */}
                <div className="border-l-4 border-red-500 pl-4 bg-red-50 p-4 rounded-r-md">
                  <h3 className="font-medium text-red-800 mb-2">Deducciones Adicionales</h3>
                  <div className="space-y-2">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Valor
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        {...register('deducciones_adicionales')}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Descripción
                      </label>
                      <textarea
                        {...register('descripcion_deducciones_adicionales')}
                        rows="2"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                        placeholder="Ej: Sanción por llegada tarde"
                        disabled={!watch('deducciones_adicionales') || watch('deducciones_adicionales') <= 0}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={guardandoAjustes}
                  className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400"
                >
                  {guardandoAjustes ? (
                    <>
                      <LoadingSpinner size="sm" />
                      Guardando...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Guardar y Recalcular
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Mostrar ajustes actuales */}
              <div className="border-l-4 border-green-500 pl-4 bg-green-50 p-4 rounded-r-md">
                <h3 className="font-medium text-green-800 mb-2">Devengos Adicionales</h3>
                {nomina.devengos_adicionales > 0 ? (
                  <>
                    <p className="text-2xl font-bold text-green-600">
                      {formatMoney(nomina.devengos_adicionales)}
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      {nomina.descripcion_devengos_adicionales}
                    </p>
                  </>
                ) : (
                  <p className="text-gray-500">Sin ajustes</p>
                )}
              </div>

              <div className="border-l-4 border-red-500 pl-4 bg-red-50 p-4 rounded-r-md">
                <h3 className="font-medium text-red-800 mb-2">Deducciones Adicionales</h3>
                {nomina.deducciones_adicionales > 0 ? (
                  <>
                    <p className="text-2xl font-bold text-red-600">
                      {formatMoney(nomina.deducciones_adicionales)}
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      {nomina.descripcion_deducciones_adicionales}
                    </p>
                  </>
                ) : (
                  <p className="text-gray-500">Sin ajustes</p>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Detalles - Devengos */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-4 text-green-700">Devengos</h2>
        <table className="min-w-full">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2">Concepto</th>
              <th className="text-right py-2">Cantidad</th>
              <th className="text-right py-2">Valor Unitario</th>
              <th className="text-right py-2">Total</th>
            </tr>
          </thead>
          <tbody>
            {devengos.map((detalle) => (
              <tr key={detalle.id} className="border-b">
                <td className="py-2">{detalle.descripcion}</td>
                <td className="text-right py-2">{detalle.cantidad || '-'}</td>
                <td className="text-right py-2">
                  {detalle.valor_unitario ? formatMoney(detalle.valor_unitario) : '-'}
                </td>
                <td className="text-right py-2 font-medium">
                  {formatMoney(detalle.valor_total)}
                </td>
              </tr>
            ))}
            <tr className="font-bold bg-green-50">
              <td colSpan="3" className="py-2 text-right">Total Devengado:</td>
              <td className="py-2 text-right text-green-600">
                {formatMoney(nomina.total_devengado)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Detalles - Deducciones */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-4 text-red-700">Deducciones</h2>
        <table className="min-w-full">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2">Concepto</th>
              <th className="text-right py-2">Valor</th>
            </tr>
          </thead>
          <tbody>
            {deducciones.map((detalle) => (
              <tr key={detalle.id} className="border-b">
                <td className="py-2">{detalle.descripcion}</td>
                <td className="text-right py-2 font-medium">
                  {formatMoney(detalle.valor_total)}
                </td>
              </tr>
            ))}
            <tr className="font-bold bg-red-50">
              <td className="py-2 text-right">Total Deducciones:</td>
              <td className="py-2 text-right text-red-600">
                {formatMoney(nomina.total_deducciones)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Diálogos de Confirmación */}
      <ConfirmDialog
        isOpen={confirmAprobar}
        onClose={() => setConfirmAprobar(false)}
        onConfirm={handleAprobar}
        title="Aprobar Nómina"
        message="¿Está seguro que desea aprobar esta nómina? Una vez aprobada, no se podrán editar los ajustes manuales."
        confirmText={procesando ? "Aprobando..." : "Aprobar"}
        disabled={procesando}
      />

      <ConfirmDialog
        isOpen={confirmRechazar}
        onClose={() => {
          setConfirmRechazar(false);
          setMotivoRechazo('');
        }}
        onConfirm={handleRechazar}
        title="Rechazar Nómina"
        message={
          <div className="space-y-3">
            <p>¿Está seguro que desea rechazar esta nómina? Regresará al estado PENDIENTE.</p>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Motivo del rechazo (opcional):
              </label>
              <textarea
                value={motivoRechazo}
                onChange={(e) => setMotivoRechazo(e.target.value)}
                rows="3"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
                placeholder="Ej: Error en cálculo de dominicales"
              />
            </div>
          </div>
        }
        confirmText={procesando ? "Rechazando..." : "Rechazar"}
        type="warning"
        disabled={procesando}
      />

      {/* Total Neto */}
      <div className="bg-blue-50 p-6 rounded-lg shadow border-l-4 border-blue-600">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-blue-900">Total Neto a Pagar</h2>
          <p className="text-3xl font-bold text-blue-600">
            {formatMoney(nomina.total_neto)}
          </p>
        </div>
      </div>
    </div>
  );
}