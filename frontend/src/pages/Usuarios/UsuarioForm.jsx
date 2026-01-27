// frontend/src/pages/Usuarios/UsuarioForm.jsx

import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import usuarioService from '../../services/usuarioService';
import fincaService from '../../services/fincaService';
import LoadingSpinner from '../../components/Common/LoadingSpinner';
import toast from 'react-hot-toast';
import { Save, ArrowLeft, Eye, EyeOff, MapPin } from 'lucide-react';

export default function UsuarioForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = !!id;

  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true); // Siempre esperar carga inicial
  const [roles, setRoles] = useState([]);
  const [fincas, setFincas] = useState([]);
  const [loadingFincas, setLoadingFincas] = useState(true);
  const [selectedFincas, setSelectedFincas] = useState([]);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm();

  const password = watch('password');
  const selectedRol = watch('rol');

  // Verificar si el rol seleccionado es Administrador
  const isAdminRol = roles.find(r => r.id === parseInt(selectedRol))?.nombre === 'ADMINISTRADOR';

  useEffect(() => {
    loadInitialData();
  }, [id]);

  const loadInitialData = async () => {
    try {
      if (isEditing) setLoadingData(true);
      await Promise.all([loadRoles(), loadFincas()]);
      if (isEditing) {
        await loadUsuario();
      }
    } finally {
      setLoadingData(false);
    }
  };

  const loadRoles = async () => {
    try {
      const data = await usuarioService.getRoles();
      console.log('Roles cargados:', data); // Debug
      setRoles(data.results || data);
    } catch (error) {
      console.error('Error al cargar roles:', error);
      toast.error('Error al cargar roles');
    }
  };

  const loadFincas = async () => {
    try {
      setLoadingFincas(true);
      const data = await fincaService.getAll();
      console.log('Fincas cargadas:', data); // Debug
      setFincas(data.results || data);
    } catch (error) {
      console.error('Error al cargar fincas:', error);
      toast.error('Error al cargar fincas');
    } finally {
      setLoadingFincas(false);
    }
  };

  const loadUsuario = async () => {
    try {
      const data = await usuarioService.getById(id);
      reset({
        username: data.username,
        email: data.email,
        first_name: data.first_name,
        last_name: data.last_name,
        rol: data.rol,
        es_activo: data.es_activo,
      });
      // Cargar fincas asignadas
      if (data.fincas_asignadas) {
        setSelectedFincas(data.fincas_asignadas);
      }
    } catch (error) {
      console.error('Error al cargar usuario:', error);
      toast.error('Error al cargar usuario');
      navigate('/usuarios');
    }
  };

  const handleFincaToggle = (fincaId) => {
    setSelectedFincas(prev => {
      if (prev.includes(fincaId)) {
        return prev.filter(id => id !== fincaId);
      } else {
        return [...prev, fincaId];
      }
    });
  };

  const handleSelectAllFincas = () => {
    if (selectedFincas.length === fincas.length) {
      setSelectedFincas([]);
    } else {
      setSelectedFincas(fincas.map(f => f.id));
    }
  };

  const onSubmit = async (data) => {
    try {
      setLoading(true);

      // Preparar datos
      const submitData = {
        username: data.username,
        email: data.email,
        first_name: data.first_name,
        last_name: data.last_name,
        rol: data.rol || null,
        es_activo: data.es_activo,
        // Incluir fincas asignadas (vacío para admin ya que ve todas)
        fincas_asignadas: isAdminRol ? [] : selectedFincas,
      };

      // Solo incluir contraseña si se está creando o si se proporcionó una nueva
      if (!isEditing) {
        submitData.password = data.password;
        submitData.password_confirm = data.password_confirm;
      } else if (data.password) {
        submitData.password = data.password;
        submitData.password_confirm = data.password_confirm;
      }

      if (isEditing) {
        await usuarioService.update(id, submitData);
        toast.success('Usuario actualizado correctamente');
      } else {
        await usuarioService.create(submitData);
        toast.success('Usuario creado correctamente');
      }

      navigate('/usuarios');
    } catch (error) {
      console.error('Error al guardar usuario:', error);
      const errorMsg = error.response?.data;
      if (typeof errorMsg === 'object') {
        // Mostrar errores de validación
        Object.entries(errorMsg).forEach(([field, messages]) => {
          const msg = Array.isArray(messages) ? messages.join(', ') : messages;
          toast.error(`${field}: ${msg}`);
        });
      } else {
        toast.error('Error al guardar usuario');
      }
    } finally {
      setLoading(false);
    }
  };

  if (loadingData) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate('/usuarios')}
          className="p-2 hover:bg-gray-100 rounded-md"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-2xl font-bold">
          {isEditing ? 'Editar Usuario' : 'Nuevo Usuario'}
        </h1>
      </div>

      {/* Formulario */}
      <form onSubmit={handleSubmit(onSubmit)} className="bg-white rounded-lg shadow p-6 space-y-6">
        {/* Información de cuenta */}
        <div>
          <h2 className="text-lg font-semibold mb-4 text-gray-900">Información de Cuenta</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Username */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nombre de Usuario *
              </label>
              <input
                type="text"
                {...register('username', {
                  required: 'El nombre de usuario es requerido',
                  minLength: { value: 3, message: 'Mínimo 3 caracteres' },
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="usuario123"
              />
              {errors.username && (
                <p className="mt-1 text-sm text-red-600">{errors.username.message}</p>
              )}
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                {...register('email', {
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: 'Email inválido',
                  },
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="usuario@ejemplo.com"
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
              )}
            </div>
          </div>
        </div>

        {/* Información personal */}
        <div>
          <h2 className="text-lg font-semibold mb-4 text-gray-900">Información Personal</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Nombre */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nombre
              </label>
              <input
                type="text"
                {...register('first_name')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Juan"
              />
            </div>

            {/* Apellido */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Apellido
              </label>
              <input
                type="text"
                {...register('last_name')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Pérez"
              />
            </div>
          </div>
        </div>

        {/* Rol y Estado */}
        <div>
          <h2 className="text-lg font-semibold mb-4 text-gray-900">Rol y Permisos</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Rol */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Rol *
              </label>
              <select
                {...register('rol', { required: 'El rol es requerido' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Seleccione un rol...</option>
                {roles.map((rol) => (
                  <option key={rol.id} value={rol.id}>
                    {rol.nombre_display}
                  </option>
                ))}
              </select>
              {errors.rol && (
                <p className="mt-1 text-sm text-red-600">{errors.rol.message}</p>
              )}
            </div>

            {/* Estado */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Estado
              </label>
              <div className="flex items-center mt-2">
                <input
                  type="checkbox"
                  {...register('es_activo')}
                  defaultChecked={true}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label className="ml-2 text-sm text-gray-700">Usuario activo</label>
              </div>
            </div>
          </div>
        </div>

        {/* Fincas Asignadas */}
        <div>
          <h2 className="text-lg font-semibold mb-4 text-gray-900 flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Fincas Asignadas
          </h2>

          {isAdminRol ? (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-700">
                <strong>Nota:</strong> Los usuarios con rol Administrador tienen acceso a todas las fincas automáticamente.
              </p>
            </div>
          ) : (
            <>
              <p className="text-sm text-gray-500 mb-3">
                Seleccione las fincas que este usuario puede ver. Solo verá trabajadores, nóminas y registros de estas fincas.
              </p>

              {loadingFincas ? (
                <div className="flex items-center gap-2 p-4 bg-gray-50 rounded-lg">
                  <LoadingSpinner size="sm" />
                  <span className="text-sm text-gray-500">Cargando fincas...</span>
                </div>
              ) : fincas.length > 0 ? (
                <>
                  <div className="mb-3">
                    <button
                      type="button"
                      onClick={handleSelectAllFincas}
                      className="text-sm text-blue-600 hover:text-blue-800"
                    >
                      {selectedFincas.length === fincas.length ? 'Deseleccionar todas' : 'Seleccionar todas'}
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 p-4 bg-gray-50 rounded-lg max-h-60 overflow-y-auto">
                    {fincas.map((finca) => (
                      <label
                        key={finca.id}
                        className={`flex items-center gap-2 p-2 rounded-md cursor-pointer transition-colors ${
                          selectedFincas.includes(finca.id)
                            ? 'bg-green-100 border border-green-300'
                            : 'bg-white border border-gray-200 hover:bg-gray-100'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedFincas.includes(finca.id)}
                          onChange={() => handleFincaToggle(finca.id)}
                          className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                        />
                        <span className="text-sm text-gray-700">{finca.nombre}</span>
                      </label>
                    ))}
                  </div>
                  {selectedFincas.length === 0 && (
                    <p className="mt-2 text-sm text-amber-600">
                      Sin fincas asignadas, el usuario no podrá ver ningún dato.
                    </p>
                  )}
                </>
              ) : (
                <p className="text-sm text-gray-500 italic">No hay fincas disponibles.</p>
              )}
            </>
          )}
        </div>

        {/* Contraseña */}
        <div>
          <h2 className="text-lg font-semibold mb-4 text-gray-900">
            {isEditing ? 'Cambiar Contraseña (opcional)' : 'Contraseña'}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Contraseña {!isEditing && '*'}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  {...register('password', {
                    required: !isEditing ? 'La contraseña es requerida' : false,
                    minLength: { value: 8, message: 'Mínimo 8 caracteres' },
                  })}
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Confirmar Contraseña {!isEditing && '*'}
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  {...register('password_confirm', {
                    required: !isEditing ? 'Confirme la contraseña' : false,
                    validate: (value) => {
                      if (password && value !== password) {
                        return 'Las contraseñas no coinciden';
                      }
                      return true;
                    },
                  })}
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
              {errors.password_confirm && (
                <p className="mt-1 text-sm text-red-600">{errors.password_confirm.message}</p>
              )}
            </div>
          </div>
          {isEditing && (
            <p className="mt-2 text-sm text-gray-500">
              Deje los campos de contraseña vacíos para mantener la contraseña actual.
            </p>
          )}
        </div>

        {/* Botones */}
        <div className="flex justify-end gap-4 pt-4 border-t">
          <button
            type="button"
            onClick={() => navigate('/usuarios')}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400"
          >
            {loading ? (
              <>
                <LoadingSpinner size="sm" />
                Guardando...
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                {isEditing ? 'Actualizar' : 'Crear Usuario'}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
