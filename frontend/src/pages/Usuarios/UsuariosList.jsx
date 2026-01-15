// frontend/src/pages/Usuarios/UsuariosList.jsx

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import usuarioService from '../../services/usuarioService';
import LoadingSpinner from '../../components/Common/LoadingSpinner';
import SearchBar from '../../components/Common/SearchBar';
import ConfirmDialog from '../../components/Common/ConfirmDialog';
import toast from 'react-hot-toast';
import { UserPlus, Edit, Trash2, Shield, ShieldCheck, ShieldAlert } from 'lucide-react';

export default function UsuariosList() {
  const navigate = useNavigate();
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [confirmDelete, setConfirmDelete] = useState({ isOpen: false, id: null, nombre: '' });

  useEffect(() => {
    loadUsuarios();
  }, []);

  const loadUsuarios = async () => {
    try {
      setLoading(true);
      const data = await usuarioService.getAll();
      setUsuarios(data.results || data);
    } catch (error) {
      console.error('Error al cargar usuarios:', error);
      toast.error('Error al cargar usuarios');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await usuarioService.delete(id);
      toast.success('Usuario eliminado correctamente');
      loadUsuarios();
      setConfirmDelete({ isOpen: false, id: null, nombre: '' });
    } catch (error) {
      console.error('Error al eliminar usuario:', error);
      toast.error(error.response?.data?.detail || 'Error al eliminar usuario');
    }
  };

  const getRolIcon = (rolNombre) => {
    switch (rolNombre) {
      case 'ADMINISTRADOR':
        return <ShieldCheck className="w-4 h-4 text-purple-600" />;
      case 'SUPERVISOR':
        return <Shield className="w-4 h-4 text-blue-600" />;
      case 'CONSULTA':
        return <ShieldAlert className="w-4 h-4 text-gray-600" />;
      default:
        return <Shield className="w-4 h-4 text-gray-400" />;
    }
  };

  const getRolBadgeClass = (rolNombre) => {
    switch (rolNombre) {
      case 'ADMINISTRADOR':
        return 'bg-purple-100 text-purple-800';
      case 'SUPERVISOR':
        return 'bg-blue-100 text-blue-800';
      case 'CONSULTA':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  // Filtrar usuarios por búsqueda
  const usuariosFiltrados = usuarios.filter((usuario) => {
    const searchLower = search.toLowerCase();
    const nombreCompleto = usuario.nombre_completo?.toLowerCase() || '';
    const username = usuario.username?.toLowerCase() || '';
    const email = usuario.email?.toLowerCase() || '';
    return (
      nombreCompleto.includes(searchLower) ||
      username.includes(searchLower) ||
      email.includes(searchLower)
    );
  });

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
        <div>
          <h1 className="text-2xl font-bold">Gestión de Usuarios</h1>
          <p className="text-gray-600 text-sm mt-1">
            Administra los usuarios y sus roles en el sistema
          </p>
        </div>
        <button
          onClick={() => navigate('/usuarios/nuevo')}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
        >
          <UserPlus className="w-5 h-5" />
          Nuevo Usuario
        </button>
      </div>

      {/* Búsqueda */}
      <div className="bg-white p-4 rounded-lg shadow">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Buscar por nombre, usuario o email..."
        />
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Usuario
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Rol
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
            {usuariosFiltrados.length === 0 ? (
              <tr>
                <td colSpan="5" className="px-6 py-4 text-center text-gray-500">
                  No se encontraron usuarios
                </td>
              </tr>
            ) : (
              usuariosFiltrados.map((usuario) => (
                <tr key={usuario.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {usuario.nombre_completo || usuario.username}
                      </div>
                      <div className="text-sm text-gray-500">@{usuario.username}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {usuario.email || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {usuario.rol_info ? (
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${getRolBadgeClass(
                          usuario.rol_info.nombre
                        )}`}
                      >
                        {getRolIcon(usuario.rol_info.nombre)}
                        {usuario.rol_info.nombre_display}
                      </span>
                    ) : (
                      <span className="text-gray-400 text-sm">Sin rol</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        usuario.es_activo
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {usuario.es_activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => navigate(`/usuarios/${usuario.id}/editar`)}
                        className="text-yellow-600 hover:text-yellow-900"
                        title="Editar"
                      >
                        <Edit className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() =>
                          setConfirmDelete({
                            isOpen: true,
                            id: usuario.id,
                            nombre: usuario.nombre_completo || usuario.username,
                          })
                        }
                        className="text-red-600 hover:text-red-900"
                        title="Eliminar"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Leyenda de roles */}
      <div className="bg-blue-50 rounded-lg p-4">
        <h3 className="text-sm font-medium text-blue-900 mb-2">Descripción de Roles</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="flex items-start gap-2">
            <ShieldCheck className="w-5 h-5 text-purple-600 mt-0.5" />
            <div>
              <span className="font-medium text-purple-800">Administrador</span>
              <p className="text-blue-800">Acceso total incluyendo gestión de usuarios</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Shield className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <span className="font-medium text-blue-800">Supervisor</span>
              <p className="text-blue-800">Puede modificar datos, excepto usuarios</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <ShieldAlert className="w-5 h-5 text-gray-600 mt-0.5" />
            <div>
              <span className="font-medium text-gray-800">Consulta</span>
              <p className="text-blue-800">Solo puede ver información y descargar reportes</p>
            </div>
          </div>
        </div>
      </div>

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        isOpen={confirmDelete.isOpen}
        onClose={() => setConfirmDelete({ isOpen: false, id: null, nombre: '' })}
        onConfirm={() => handleDelete(confirmDelete.id)}
        title="Eliminar Usuario"
        message={`¿Está seguro que desea eliminar al usuario "${confirmDelete.nombre}"? Esta acción no se puede deshacer.`}
        type="danger"
      />
    </div>
  );
}
