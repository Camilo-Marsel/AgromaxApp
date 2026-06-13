// frontend/src/pages/Labores/LaborInsumos.jsx

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Edit2, Trash2, X, Save, ArrowRight } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import laborInsumoService from '../../services/laborInsumoService';
import laborService from '../../services/laborService';
import inventarioService from '../../services/inventarioService';
import LoadingSpinner from '../../components/Common/LoadingSpinner';
import ConfirmDialog from '../../components/Common/ConfirmDialog';
import toast from 'react-hot-toast';

function LaborInsumoModal({ item, labores, productos, onClose, onSuccess }) {
  const isEditing = Boolean(item);
  const [labor, setLabor] = useState(item?.labor ?? '');
  const [producto, setProducto] = useState(item?.producto ?? '');
  const [factor, setFactor] = useState(item?.factor ?? '');
  const [esAproximado, setEsAproximado] = useState(item?.es_aproximado ?? false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!labor || !producto || !factor) {
      setError('Labor, producto y factor son obligatorios.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload = {
        labor: Number(labor),
        producto: Number(producto),
        factor: parseFloat(factor),
        es_aproximado: esAproximado,
      };
      if (isEditing) {
        await laborInsumoService.update(item.id, payload);
        toast.success('Configuración actualizada');
      } else {
        await laborInsumoService.create(payload);
        toast.success('Configuración creada');
      }
      onSuccess();
      onClose();
    } catch (err) {
      const data = err.response?.data;
      if (data) {
        const msgs = Object.values(data).flat().join(' ');
        setError(msgs);
      } else {
        setError('Error al guardar.');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">
            {isEditing ? 'Editar' : 'Nueva'} Conversión Labor → Insumo
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Labor *</label>
            <select
              value={labor}
              onChange={(e) => setLabor(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
              disabled={isEditing}
            >
              <option value="">Seleccione una labor...</option>
              {labores.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.nombre}
                </option>
              ))}
            </select>
            {isEditing && (
              <p className="text-xs text-gray-400 mt-1">La labor no se puede cambiar.</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Producto de bodega *
            </label>
            <select
              value={producto}
              onChange={(e) => setProducto(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Seleccione un producto...</option>
              {productos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Factor *
            </label>
            <input
              type="number"
              step="0.0001"
              min="0.0001"
              value={factor}
              onChange={(e) => setFactor(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Ej: 130 (130 unidades de labor = 1 unidad del producto)"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Unidades de labor por cada 1 unidad del producto a descontar de bodega.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="esAproximado"
              checked={esAproximado}
              onChange={(e) => setEsAproximado(e.target.checked)}
              className="rounded"
            />
            <label htmlFor="esAproximado" className="text-sm text-gray-700">
              Conversión aproximada
            </label>
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 p-2 rounded">{error}</p>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400 text-sm font-medium"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-50 text-sm"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function LaborInsumos() {
  const { canModify } = useAuth();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [labores, setLabores] = useState([]);
  const [productos, setProductos] = useState([]);
  const [modal, setModal] = useState(null); // null | 'new' | item object
  const [confirmDelete, setConfirmDelete] = useState({ isOpen: false, id: null });

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [insumosData, laboresData, productosData] = await Promise.all([
        laborInsumoService.getAll(),
        laborService.getAll({ activa: true }),
        inventarioService.getProductos({ activo: true }),
      ]);
      setItems(insumosData.results || insumosData);
      setLabores(laboresData.results || laboresData);
      setProductos(productosData.results || productosData);
    } catch {
      toast.error('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await laborInsumoService.delete(id);
      toast.success('Configuración eliminada');
      setItems((prev) => prev.filter((i) => i.id !== id));
    } catch {
      toast.error('Error al eliminar');
    } finally {
      setConfirmDelete({ isOpen: false, id: null });
    }
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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Labor → Insumo</h1>
          <p className="text-gray-500 text-sm mt-1">
            Configura qué producto de bodega consume cada labor y el factor de conversión.
          </p>
        </div>
        {canModify() && (
          <button
            onClick={() => setModal('new')}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            Nueva configuración
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center text-gray-400">
          <p className="text-lg font-medium mb-1">Sin configuraciones</p>
          <p className="text-sm">
            Agrega una configuración para que el sistema proponga movimientos de inventario al
            registrar una labor.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Labor
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                  —
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Producto en bodega
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Factor
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Tipo
                </th>
                {canModify() && (
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Acciones
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {items.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">
                    {item.labor_nombre}
                  </td>
                  <td className="px-4 py-3 text-center text-gray-400">
                    <ArrowRight className="w-4 h-4 inline" />
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {item.producto_nombre}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    ÷ {item.factor}
                    <span className="text-gray-400 text-xs ml-1">
                      ({item.factor} labor = 1 {item.unidad_display || item.producto_unidad})
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {item.es_aproximado ? (
                      <span className="inline-flex px-2 py-0.5 text-xs rounded-full bg-amber-100 text-amber-700">
                        Aproximado
                      </span>
                    ) : (
                      <span className="inline-flex px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-700">
                        Exacto
                      </span>
                    )}
                  </td>
                  {canModify() && (
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setModal(item)}
                          className="text-blue-600 hover:text-blue-800"
                          title="Editar"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setConfirmDelete({ isOpen: true, id: item.id })}
                          className="text-red-600 hover:text-red-800"
                          title="Eliminar"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <LaborInsumoModal
          item={modal === 'new' ? null : modal}
          labores={labores}
          productos={productos}
          onClose={() => setModal(null)}
          onSuccess={loadAll}
        />
      )}

      <ConfirmDialog
        isOpen={confirmDelete.isOpen}
        onClose={() => setConfirmDelete({ isOpen: false, id: null })}
        onConfirm={() => handleDelete(confirmDelete.id)}
        title="Eliminar configuración"
        message="¿Está seguro? Esto no afecta registros existentes pero el sistema dejará de proponer movimientos para esta labor."
        type="danger"
      />
    </div>
  );
}
