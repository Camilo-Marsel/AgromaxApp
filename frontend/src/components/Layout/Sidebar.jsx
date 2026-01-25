// frontend/src/components/Layout/Sidebar.jsx

import { NavLink } from 'react-router-dom';
import { Home, Users, Briefcase, DollarSign, FileText, Settings, MapPin, FileCheck, UserCog } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

export default function Sidebar() {
  const { canManageUsers } = useAuth();

  const menuItems = [
    { path: '/dashboard', icon: Home, label: 'Dashboard' },
    { path: '/trabajadores', icon: Users, label: 'Trabajadores' },
    { path: '/contratos', icon: FileCheck, label: 'Contratos' },
    { path: '/fincas', icon: MapPin, label: 'Fincas' },
    { path: '/labores', icon: Briefcase, label: 'Labores' },
    { path: '/registros', icon: Briefcase, label: 'Registro Labores' },
    { path: '/nomina', icon: DollarSign, label: 'Nómina' },
    { path: '/reportes', icon: FileText, label: 'Reportes' },
    { path: '/prestamos', icon: DollarSign, label: 'Adelantos' },
    { path: '/configuracion/variables', icon: Settings, label: 'Configuración' },
    // Solo visible para ADMINISTRADOR
    { path: '/usuarios', icon: UserCog, label: 'Usuarios', adminOnly: true },
  ];

  return (
    <div className="w-64 bg-gray-800 min-h-screen">
      <div className="p-4">
        {menuItems
          .filter((item) => !item.adminOnly || canManageUsers())
          .map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-md mb-2 transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:bg-gray-700'
                }`
              }
            >
              <item.icon className="w-5 h-5" />
              <span>{item.label}</span>
            </NavLink>
          ))}
      </div>
    </div>
  );
}