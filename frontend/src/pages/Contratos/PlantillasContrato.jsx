// frontend/src/pages/Contratos/PlantillasContrato.jsx

import { useState, useEffect } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import LoadingSpinner from '../../components/Common/LoadingSpinner';
import { Plus, Edit2, Trash2, FileText, ChevronDown, ChevronUp, X, Check } from 'lucide-react';

const EMPTY_FORM = {
  nombre: '',
  descripcion: '',
  empleador_tipo: 'EMPRESA',
  empleador_nombre: '',
  empleador_documento: '',
  empleador_correo: '',
  empleador_telefono: '',
  empleador_direccion: '',
  cargo_predeterminado: '',
  objeto_contrato: '',
  obligaciones_adicionales: [],
  causales_terminacion_adicionales: [],
  incluir_politica_celulares: true,
  incluir_clausula_invenciones: true,
  activa: true,
};

export default function PlantillasContrato() {
  const [plantillas, setPlantillas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [expandedId, setExpandedId] = useState(null);

  // Para editar listas (obligaciones / causales)
  const [newObligacion, setNewObligacion] = useState('');
  const [newCausalTitulo, setNewCausalTitulo] = useState('');
  const [newCausalTexto, setNewCausalTexto] = useState('');

  useEffect(() => {
    fetchPlantillas();
  }, []);

  async function fetchPlantillas() {
    try {
      const res = await api.get('/plantillas-contrato/');
      setPlantillas(res.data.results ?? res.data);
    } catch {
      toast.error('Error cargando plantillas');
    } finally {
      setLoading(false);
    }
  }

  function openNew() {
    setForm(EMPTY_FORM);
    setEditId(null);
    setNewObligacion('');
    setNewCausalTitulo('');
    setNewCausalTexto('');
    setShowForm(true);
  }

  function openEdit(p) {
    setForm({
      nombre: p.nombre,
      descripcion: p.descripcion || '',
      empleador_tipo: p.empleador_tipo,
      empleador_nombre: p.empleador_nombre,
      empleador_documento: p.empleador_documento,
      empleador_correo: p.empleador_correo || '',
      empleador_telefono: p.empleador_telefono || '',
      empleador_direccion: p.empleador_direccion || '',
      cargo_predeterminado: p.cargo_predeterminado || '',
      objeto_contrato: p.objeto_contrato,
      obligaciones_adicionales: p.obligaciones_adicionales || [],
      causales_terminacion_adicionales: p.causales_terminacion_adicionales || [],
      incluir_politica_celulares: p.incluir_politica_celulares,
      incluir_clausula_invenciones: p.incluir_clausula_invenciones,
      activa: p.activa,
    });
    setEditId(p.id);
    setNewObligacion('');
    setNewCausalTitulo('');
    setNewCausalTexto('');
    setShowForm(true);
  }

  function handleField(e) {
    const { name, value, type, checked } = e.target;
    setForm((f) => ({ ...f, [name]: type === 'checkbox' ? checked : value }));
  }

  function addObligacion() {
    if (!newObligacion.trim()) return;
    setForm((f) => ({ ...f, obligaciones_adicionales: [...f.obligaciones_adicionales, newObligacion.trim()] }));
    setNewObligacion('');
  }

  function removeObligacion(idx) {
    setForm((f) => ({ ...f, obligaciones_adicionales: f.obligaciones_adicionales.filter((_, i) => i !== idx) }));
  }

  function addCausal() {
    if (!newCausalTitulo.trim() && !newCausalTexto.trim()) return;
    const causal = { titulo: newCausalTitulo.trim(), texto: newCausalTexto.trim() };
    setForm((f) => ({ ...f, causales_terminacion_adicionales: [...f.causales_terminacion_adicionales, causal] }));
    setNewCausalTitulo('');
    setNewCausalTexto('');
  }

  function removeCausal(idx) {
    setForm((f) => ({ ...f, causales_terminacion_adicionales: f.causales_terminacion_adicionales.filter((_, i) => i !== idx) }));
  }

  async function handleSave(e) {
    e.preventDefault();
    if (!form.nombre.trim() || !form.empleador_nombre.trim() || !form.objeto_contrato.trim()) {
      toast.error('Nombre, empleador y objeto del contrato son requeridos');
      return;
    }
    setSaving(true);
    try {
      if (editId) {
        await api.put(`/plantillas-contrato/${editId}/`, form);
        toast.success('Plantilla actualizada');
      } else {
        await api.post('/plantillas-contrato/', form);
        toast.success('Plantilla creada');
      }
      setShowForm(false);
      fetchPlantillas();
    } catch (err) {
      const data = err.response?.data;
      const msg = data ? Object.values(data).flat().join(' | ') : 'Error guardando plantilla';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(p) {
    if (!window.confirm(`¿Eliminar plantilla "${p.nombre}"? Los contratos vinculados quedarán sin plantilla.`)) return;
    try {
      await api.delete(`/plantillas-contrato/${p.id}/`);
      toast.success('Plantilla eliminada');
      fetchPlantillas();
    } catch {
      toast.error('Error eliminando plantilla');
    }
  }

  if (loading) return <LoadingSpinner />;

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Plantillas de Contrato</h1>
          <p className="text-sm text-gray-500 mt-1">Configura plantillas reutilizables para distintos tipos de finca o empleador</p>
        </div>
        <button
          onClick={openNew}
          className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
        >
          <Plus className="w-4 h-4" /> Nueva plantilla
        </button>
      </div>

      {plantillas.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <FileText className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p>No hay plantillas creadas aún.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {plantillas.map((p) => (
            <div key={p.id} className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4">
                <div className="flex items-center gap-3 min-w-0">
                  <FileText className="w-5 h-5 text-green-600 shrink-0" />
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 truncate">{p.nombre}</p>
                    <p className="text-xs text-gray-500 truncate">{p.empleador_nombre} · {p.empleador_tipo_display}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-4">
                  {!p.activa && (
                    <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Inactiva</span>
                  )}
                  <button
                    onClick={() => setExpandedId(expandedId === p.id ? null : p.id)}
                    className="p-1.5 text-gray-400 hover:text-gray-700 rounded"
                  >
                    {expandedId === p.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                  <button onClick={() => openEdit(p)} className="p-1.5 text-blue-500 hover:text-blue-700 rounded">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(p)} className="p-1.5 text-red-400 hover:text-red-600 rounded">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {expandedId === p.id && (
                <div className="border-t border-gray-100 px-5 py-4 text-sm text-gray-700 space-y-3">
                  {p.descripcion && <p className="text-gray-500 italic">{p.descripcion}</p>}
                  <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                    {p.empleador_documento && <span><b>Documento:</b> {p.empleador_documento}</span>}
                    {p.empleador_correo && <span><b>Correo:</b> {p.empleador_correo}</span>}
                    {p.empleador_telefono && <span><b>Teléfono:</b> {p.empleador_telefono}</span>}
                    {p.empleador_direccion && <span><b>Dirección:</b> {p.empleador_direccion}</span>}
                    {p.cargo_predeterminado && <span><b>Cargo predeterminado:</b> {p.cargo_predeterminado}</span>}
                  </div>
                  <div>
                    <p className="font-medium text-gray-800 mb-1">Objeto del contrato</p>
                    <p className="text-gray-600 whitespace-pre-wrap">{p.objeto_contrato}</p>
                  </div>
                  {p.obligaciones_adicionales?.length > 0 && (
                    <div>
                      <p className="font-medium text-gray-800 mb-1">Obligaciones adicionales</p>
                      <ul className="list-disc ml-5 space-y-0.5 text-gray-600">
                        {p.obligaciones_adicionales.map((o, i) => <li key={i}>{o}</li>)}
                      </ul>
                    </div>
                  )}
                  {p.causales_terminacion_adicionales?.length > 0 && (
                    <div>
                      <p className="font-medium text-gray-800 mb-1">Causales adicionales de terminación</p>
                      <ul className="list-disc ml-5 space-y-0.5 text-gray-600">
                        {p.causales_terminacion_adicionales.map((c, i) => (
                          <li key={i}><b>{c.titulo}:</b> {c.texto}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <div className="flex gap-4 text-xs">
                    <span className={`flex items-center gap-1 ${p.incluir_politica_celulares ? 'text-green-600' : 'text-gray-400'}`}>
                      {p.incluir_politica_celulares ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />} Política celulares
                    </span>
                    <span className={`flex items-center gap-1 ${p.incluir_clausula_invenciones ? 'text-green-600' : 'text-gray-400'}`}>
                      {p.incluir_clausula_invenciones ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />} Cláusula invenciones
                    </span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal formulario */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 overflow-y-auto py-8">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 my-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="font-semibold text-gray-900">{editId ? 'Editar plantilla' : 'Nueva plantilla'}</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="px-6 py-5 space-y-5">
              {/* Datos básicos */}
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Nombre de la plantilla *</label>
                  <input name="nombre" value={form.nombre} onChange={handleField} required
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Descripción</label>
                  <input name="descripcion" value={form.descripcion} onChange={handleField}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                </div>
              </div>

              {/* Empleador */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Datos del empleador</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Tipo de empleador</label>
                    <select name="empleador_tipo" value={form.empleador_tipo} onChange={handleField}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                      <option value="EMPRESA">Empresa / Sociedad</option>
                      <option value="PERSONA_NATURAL">Persona Natural</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Nombre / Razón social *</label>
                    <input name="empleador_nombre" value={form.empleador_nombre} onChange={handleField} required
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">NIT / Cédula *</label>
                    <input name="empleador_documento" value={form.empleador_documento} onChange={handleField}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Correo</label>
                    <input name="empleador_correo" value={form.empleador_correo} onChange={handleField} type="email"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Teléfono</label>
                    <input name="empleador_telefono" value={form.empleador_telefono} onChange={handleField}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Dirección</label>
                    <input name="empleador_direccion" value={form.empleador_direccion} onChange={handleField}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                  </div>
                </div>
              </div>

              {/* Contrato */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Configuración del contrato</p>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Cargo predeterminado</label>
                    <input name="cargo_predeterminado" value={form.cargo_predeterminado} onChange={handleField}
                      placeholder="Ej: Labores Generales de Campo"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Objeto del contrato *</label>
                    <p className="text-xs text-gray-400 mb-1">Texto completo de la cláusula Primera. Comienza con "El empleador contrata los servicios personales del trabajador y este se obliga a..."</p>
                    <textarea name="objeto_contrato" value={form.objeto_contrato} onChange={handleField} required rows={6}
                      placeholder="El empleador contrata los servicios personales del trabajador y este se obliga a: a) A poner al servicio del empleador toda su capacidad normal de trabajo, en forma exclusiva en el desempeño de todas las labores propias de una finca ganadera, tales como, pero no limitadas a ordeño, arreo y cuidado de ganado, limpieza de corrales, mantenimiento de cercas, siembra y limpieza de potreros, cuidado de animales de corral y demás tareas afines e instrucciones que le imparta el empleador. Además se obliga el trabajador a no prestar directa ni indirectamente servicios laborales a otros empleadores durante la vigencia de este contrato."
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none" />
                  </div>
                </div>
              </div>

              {/* Obligaciones adicionales */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Obligaciones adicionales del trabajador</p>
                {form.obligaciones_adicionales.map((o, i) => (
                  <div key={i} className="flex items-start gap-2 mb-1">
                    <span className="text-xs text-gray-600 flex-1 bg-gray-50 rounded px-2 py-1">{o}</span>
                    <button type="button" onClick={() => removeObligacion(i)} className="text-red-400 hover:text-red-600 mt-1">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                <div className="flex gap-2 mt-1">
                  <input value={newObligacion} onChange={(e) => setNewObligacion(e.target.value)}
                    placeholder="Nueva obligación..."
                    className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm"
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addObligacion(); } }}
                  />
                  <button type="button" onClick={addObligacion}
                    className="text-sm px-3 py-1.5 bg-green-50 text-green-700 border border-green-200 rounded-lg hover:bg-green-100">
                    + Agregar
                  </button>
                </div>
              </div>

              {/* Causales adicionales */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Causales adicionales de terminación</p>
                {form.causales_terminacion_adicionales.map((c, i) => (
                  <div key={i} className="flex items-start gap-2 mb-1">
                    <span className="text-xs text-gray-600 flex-1 bg-gray-50 rounded px-2 py-1">
                      <b>{c.titulo}:</b> {c.texto}
                    </span>
                    <button type="button" onClick={() => removeCausal(i)} className="text-red-400 hover:text-red-600 mt-1">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                <div className="grid grid-cols-3 gap-2 mt-1">
                  <input value={newCausalTitulo} onChange={(e) => setNewCausalTitulo(e.target.value)}
                    placeholder="Título (ej: Negligencia)"
                    className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm" />
                  <input value={newCausalTexto} onChange={(e) => setNewCausalTexto(e.target.value)}
                    placeholder="Descripción de la causal..."
                    className="col-span-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm" />
                  <button type="button" onClick={addCausal}
                    className="text-sm px-3 py-1.5 bg-green-50 text-green-700 border border-green-200 rounded-lg hover:bg-green-100">
                    + Agregar
                  </button>
                </div>
              </div>

              {/* Toggles */}
              <div className="flex flex-wrap gap-6">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input type="checkbox" name="incluir_politica_celulares" checked={form.incluir_politica_celulares} onChange={handleField} />
                  <span className="text-sm text-gray-700">Incluir política de celulares</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input type="checkbox" name="incluir_clausula_invenciones" checked={form.incluir_clausula_invenciones} onChange={handleField} />
                  <span className="text-sm text-gray-700">Incluir cláusula de invenciones</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input type="checkbox" name="activa" checked={form.activa} onChange={handleField} />
                  <span className="text-sm text-gray-700">Plantilla activa</span>
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-2 border-t">
                <button type="button" onClick={() => setShowForm(false)}
                  className="px-4 py-2 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50">
                  Cancelar
                </button>
                <button type="submit" disabled={saving}
                  className="px-4 py-2 text-sm bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium disabled:opacity-60">
                  {saving ? 'Guardando...' : editId ? 'Actualizar' : 'Crear plantilla'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
