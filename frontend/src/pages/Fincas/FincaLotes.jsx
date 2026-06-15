// frontend/src/pages/Fincas/FincaLotes.jsx

import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import fincaService from '../../services/fincaService';
import loteService from '../../services/loteService';
import LoadingSpinner from '../../components/Common/LoadingSpinner';
import ConfirmDialog from '../../components/Common/ConfirmDialog';
import toast from 'react-hot-toast';
import { ArrowLeft, Plus, Edit, Trash2, ChevronDown, ChevronUp } from 'lucide-react';

function fmt(v) {
  if (v == null) return '—';
  return Number(v).toLocaleString('es-CO');
}

export default function FincaLotes() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [loading, setLoading] = useState(true);
  const [finca, setFinca] = useState(null);
  const [lotes, setLotes] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingLote, setEditingLote] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState({ isOpen: false, id: null });

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm();

  useEffect(() => { loadData(); }, [id]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [fincaData, lotesData] = await Promise.all([
        fincaService.getById(id),
        loteService.getByFinca(id),
      ]);
      setFinca(fincaData);
      setLotes(lotesData.results || lotesData);
    } catch {
      toast.error('Error al cargar datos');
      navigate('/fincas');
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data) => {
    const toNum = (v) => (v === '' || v == null ? null : parseFloat(v));
    const payload = {
      finca: id,
      nombre: data.nombre,
      numero_lote: data.numero_lote ? parseInt(data.numero_lote) : null,
      canal_primario_longitud:    toNum(data.canal_primario_longitud),
      canal_primario_area:        toNum(data.canal_primario_area),
      canal_secundario_longitud:  toNum(data.canal_secundario_longitud),
      canal_secundario_area:      toNum(data.canal_secundario_area),
      canal_terciario_longitud:   toNum(data.canal_terciario_longitud),
      canal_terciario_area:       toNum(data.canal_terciario_area),
      cables_longitud:            toNum(data.cables_longitud),
      cables_area:                toNum(data.cables_area),
      area_bruta:                 toNum(data.area_bruta),
      area_neta:                  toNum(data.area_neta),
      activo: data.activo !== undefined ? data.activo : true,
    };

    try {
      if (editingLote) {
        await loteService.update(editingLote.id, payload);
        toast.success('Lote actualizado correctamente');
      } else {
        await loteService.create(payload);
        toast.success('Lote creado correctamente');
      }
      loadData();
      closeForm();
    } catch {
      toast.error('Error al guardar lote');
    }
  };

  const handleEdit = (lote) => {
    setEditingLote(lote);
    reset({
      nombre:                     lote.nombre,
      numero_lote:                lote.numero_lote ?? '',
      canal_primario_longitud:    lote.canal_primario_longitud ?? '',
      canal_primario_area:        lote.canal_primario_area ?? '',
      canal_secundario_longitud:  lote.canal_secundario_longitud ?? '',
      canal_secundario_area:      lote.canal_secundario_area ?? '',
      canal_terciario_longitud:   lote.canal_terciario_longitud ?? '',
      canal_terciario_area:       lote.canal_terciario_area ?? '',
      cables_longitud:            lote.cables_longitud ?? '',
      cables_area:                lote.cables_area ?? '',
      area_bruta:                 lote.area_bruta ?? '',
      area_neta:                  lote.area_neta ?? '',
      activo:                     lote.activo,
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingLote(null);
    reset();
  };

  const handleDelete = async (loteId) => {
    try {
      await loteService.delete(loteId);
      toast.success('Lote eliminado correctamente');
      loadData();
      setConfirmDelete({ isOpen: false, id: null });
    } catch {
      toast.error('Error al eliminar lote');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const numField = (name, label, required = false) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}{required && ' *'}
      </label>
      <input
        type="number"
        step="0.01"
        {...register(name, required ? { required: 'Requerido' } : {})}
        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
        placeholder="0.00"
      />
      {errors[name] && <span className="text-red-500 text-xs">{errors[name].message}</span>}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/fincas')} className="p-2 hover:bg-gray-100 rounded-md">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold">Lotes</h1>
            <p className="text-gray-600">{finca?.nombre}</p>
          </div>
        </div>
        <button
          onClick={() => { closeForm(); setShowForm(true); reset({ activo: true }); }}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
        >
          <Plus className="w-5 h-5" /> Nuevo Lote
        </button>
      </div>

      {/* Formulario */}
      {showForm && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">
            {editingLote ? `Editar ${editingLote.nombre}` : 'Nuevo Lote'}
          </h2>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

            {/* Identificación */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                <input
                  type="text"
                  {...register('nombre', { required: 'Requerido' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  placeholder="Lote 1"
                />
                {errors.nombre && <span className="text-red-500 text-xs">{errors.nombre.message}</span>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">N° de lote</label>
                <input
                  type="number"
                  {...register('numero_lote')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  placeholder="1"
                />
              </div>
            </div>

            {/* Canales */}
            <div>
              <p className="text-sm font-semibold text-gray-600 mb-2 uppercase tracking-wide">Canales (m / m²)</p>
              <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                {numField('canal_primario_longitud', 'Primario long.')}
                {numField('canal_primario_area', 'Primario área')}
                {numField('canal_secundario_longitud', 'Secundario long.')}
                {numField('canal_secundario_area', 'Secundario área')}
                {numField('canal_terciario_longitud', 'Terciario long.')}
                {numField('canal_terciario_area', 'Terciario área')}
              </div>
            </div>

            {/* Cables */}
            <div>
              <p className="text-sm font-semibold text-gray-600 mb-2 uppercase tracking-wide">Cables (m / m²)</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {numField('cables_longitud', 'Longitud')}
                {numField('cables_area', 'Área')}
              </div>
            </div>

            {/* Áreas totales */}
            <div>
              <p className="text-sm font-semibold text-gray-600 mb-2 uppercase tracking-wide">Áreas totales (m²)</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {numField('area_bruta', 'Área bruta')}
                {numField('area_neta', 'Área neta')}
              </div>
            </div>

            <label className="flex items-center gap-2">
              <input type="checkbox" {...register('activo')} defaultChecked className="rounded border-gray-300 text-blue-600" />
              <span className="text-sm font-medium text-gray-700">Lote activo</span>
            </label>

            <div className="flex justify-end gap-2">
              <button type="button" onClick={closeForm} className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">
                Cancelar
              </button>
              <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400">
                {editingLote ? 'Actualizar' : 'Guardar'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Lista de Lotes */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-8"></th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nombre</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Área bruta (m²)</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Área neta (m²)</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {lotes.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-4 text-center text-gray-500">No hay lotes registrados</td>
                </tr>
              ) : (
                lotes.map((lote) => (
                  <>
                    <tr key={lote.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <button onClick={() => setExpandedId(expandedId === lote.id ? null : lote.id)} className="text-gray-400 hover:text-gray-600">
                          {expandedId === lote.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{lote.nombre}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 text-right">{fmt(lote.area_bruta)}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 text-right">{fmt(lote.area_neta)}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 inline-flex text-xs font-semibold rounded-full ${lote.activo ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                          {lote.activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button onClick={() => handleEdit(lote)} className="text-yellow-600 hover:text-yellow-900" title="Editar">
                            <Edit className="w-4 h-4" />
                          </button>
                          <button onClick={() => setConfirmDelete({ isOpen: true, id: lote.id })} className="text-red-600 hover:text-red-900" title="Eliminar">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                    {expandedId === lote.id && (
                      <tr key={`${lote.id}-detail`} className="bg-gray-50">
                        <td colSpan="6" className="px-6 py-4">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <p className="text-xs text-gray-500 uppercase font-medium mb-1">Canal Primario</p>
                              <p className="text-gray-700">{fmt(lote.canal_primario_longitud)} m · {fmt(lote.canal_primario_area)} m²</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 uppercase font-medium mb-1">Canal Secundario</p>
                              <p className="text-gray-700">{fmt(lote.canal_secundario_longitud)} m · {fmt(lote.canal_secundario_area)} m²</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 uppercase font-medium mb-1">Canal Terciario</p>
                              <p className="text-gray-700">{fmt(lote.canal_terciario_longitud)} m · {fmt(lote.canal_terciario_area)} m²</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 uppercase font-medium mb-1">Cables</p>
                              <p className="text-gray-700">{fmt(lote.cables_longitud)} m · {fmt(lote.cables_area)} m²</p>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmDialog
        isOpen={confirmDelete.isOpen}
        onClose={() => setConfirmDelete({ isOpen: false, id: null })}
        onConfirm={() => handleDelete(confirmDelete.id)}
        title="Eliminar Lote"
        message="¿Está seguro que desea eliminar este lote?"
        type="danger"
      />
    </div>
  );
}
