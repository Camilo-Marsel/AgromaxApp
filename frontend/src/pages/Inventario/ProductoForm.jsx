// frontend/src/pages/Inventario/ProductoForm.jsx

import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Package, Save } from 'lucide-react';
import inventarioService from '../../services/inventarioService';
import fincaService from '../../services/fincaService';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import toast from 'react-hot-toast';

const CATEGORIAS = [
  { value: 'AGROQUIMICOS', label: 'Agroquímicos' },
  { value: 'MATERIALES',   label: 'Materiales' },
  { value: 'HERRAMIENTAS', label: 'Herramientas' },
  { value: 'COMBUSTIBLES', label: 'Combustibles' },
  { value: 'OTROS',        label: 'Otros' },
];

const UNIDADES = [
  { value: 'KG',       label: 'Kilogramos (kg)' },
  { value: 'LITROS',   label: 'Litros (L)' },
  { value: 'UNIDADES', label: 'Unidades' },
  { value: 'ROLLOS',   label: 'Rollos' },
  { value: 'METROS',   label: 'Metros (m)' },
  { value: 'SACOS',    label: 'Sacos' },
  { value: 'CAJAS',    label: 'Cajas' },
];

export default function ProductoForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const esEdicion = Boolean(id);

  const [fincas, setFincas]     = useState([]);
  const [loading, setLoading]   = useState(esEdicion);
  const [saving, setSaving]     = useState(false);
  const [errors, setErrors]     = useState({});

  const [form, setForm] = useState({
    nombre:        '',
    descripcion:   '',
    categoria:     'MATERIALES',
    unidad:        'UNIDADES',
    stock_minimo:  '0',
    stock_inicial: '0',
    finca:         '',
    activo:        true,
  });

  useEffect(() => {
    fincaService.getAll().then(d => setFincas(d.results ?? d)).catch(() => {});

    if (esEdicion) {
      inventarioService.getProducto(id)
        .then(p => setForm({
          nombre:       p.nombre,
          descripcion:  p.descripcion ?? '',
          categoria:    p.categoria,
          unidad:       p.unidad,
          stock_minimo: p.stock_minimo,
          stock_inicial: p.stock_actual,
          finca:        p.finca ?? '',
          activo:       p.activo,
        }))
        .catch(() => { toast.error('Error cargando producto'); navigate('/inventario'); })
        .finally(() => setLoading(false));
    }
  }, [id, esEdicion, navigate]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(f => ({ ...f, [name]: type === 'checkbox' ? checked : value }));
    if (errors[name]) setErrors(e => ({ ...e, [name]: null }));
  };

  const validate = () => {
    const err = {};
    if (!form.nombre.trim())            err.nombre = 'El nombre es requerido.';
    if (Number(form.stock_minimo) < 0)  err.stock_minimo = 'No puede ser negativo.';
    if (!esEdicion && Number(form.stock_inicial) < 0) err.stock_inicial = 'No puede ser negativo.';
    setErrors(err);
    return Object.keys(err).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      const payload = {
        nombre:       form.nombre.trim(),
        descripcion:  form.descripcion.trim(),
        categoria:    form.categoria,
        unidad:       form.unidad,
        stock_minimo: form.stock_minimo,
        finca:        form.finca || null,
        activo:       form.activo,
      };
      if (!esEdicion) payload.stock_inicial = form.stock_inicial;

      if (esEdicion) {
        await inventarioService.updateProducto(id, payload);
        toast.success('Producto actualizado');
      } else {
        const nuevo = await inventarioService.createProducto(payload);
        toast.success('Producto creado');
        navigate(`/inventario/productos/${nuevo.id}`);
        return;
      }
      navigate(`/inventario/productos/${id}`);
    } catch (err) {
      const data = err.response?.data;
      if (data && typeof data === 'object') {
        setErrors(data);
        toast.error('Corrige los errores del formulario');
      } else {
        toast.error('Error guardando el producto');
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex justify-center py-20"><LoadingSpinner /></div>;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-gray-700">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2">
          <Package className="w-6 h-6 text-green-600" />
          <h1 className="text-2xl font-bold text-gray-900">
            {esEdicion ? 'Editar producto' : 'Nuevo producto'}
          </h1>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">

        {/* Nombre */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nombre <span className="text-red-500">*</span>
          </label>
          <input
            name="nombre"
            value={form.nombre}
            onChange={handleChange}
            placeholder="Ej: Pita polipropileno 5kg"
            className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 ${errors.nombre ? 'border-red-400' : 'border-gray-300'}`}
          />
          {errors.nombre && <p className="text-xs text-red-500 mt-1">{errors.nombre}</p>}
        </div>

        {/* Descripción */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
          <textarea
            name="descripcion"
            value={form.descripcion}
            onChange={handleChange}
            rows={2}
            placeholder="Descripción opcional…"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
          />
        </div>

        {/* Categoría + Unidad */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
            <select
              name="categoria"
              value={form.categoria}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              {CATEGORIAS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Unidad de medida</label>
            <select
              name="unidad"
              value={form.unidad}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              {UNIDADES.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
            </select>
          </div>
        </div>

        {/* Stock mínimo + Stock inicial */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Stock mínimo</label>
            <input
              type="number"
              name="stock_minimo"
              min="0"
              step="0.01"
              value={form.stock_minimo}
              onChange={handleChange}
              className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 ${errors.stock_minimo ? 'border-red-400' : 'border-gray-300'}`}
            />
            <p className="text-xs text-gray-400 mt-1">Alerta cuando el stock baje de este valor.</p>
            {errors.stock_minimo && <p className="text-xs text-red-500">{errors.stock_minimo}</p>}
          </div>
          {!esEdicion && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Stock inicial</label>
              <input
                type="number"
                name="stock_inicial"
                min="0"
                step="0.01"
                value={form.stock_inicial}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 ${errors.stock_inicial ? 'border-red-400' : 'border-gray-300'}`}
              />
              <p className="text-xs text-gray-400 mt-1">Cantidad disponible al crear el producto.</p>
              {errors.stock_inicial && <p className="text-xs text-red-500">{errors.stock_inicial}</p>}
            </div>
          )}
        </div>

        {/* Finca */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Finca</label>
          <select
            name="finca"
            value={form.finca}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <option value="">Sin finca específica (global)</option>
            {fincas.map(f => <option key={f.id} value={f.id}>{f.nombre}</option>)}
          </select>
        </div>

        {/* Activo */}
        {esEdicion && (
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              name="activo"
              checked={form.activo}
              onChange={handleChange}
              className="w-4 h-4 rounded text-green-600"
            />
            <span className="text-sm text-gray-700">Producto activo</span>
          </label>
        )}

        {/* Botones */}
        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 bg-green-600 text-white px-5 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm font-medium"
          >
            {saving ? <LoadingSpinner size="sm" /> : <Save className="w-4 h-4" />}
            {esEdicion ? 'Guardar cambios' : 'Crear producto'}
          </button>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="px-5 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}
