// frontend/src/components/Layout/Sidebar.jsx

import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  Home, Users, Briefcase, DollarSign, FileText, Settings,
  MapPin, FileCheck, UserCog, Shield, ClipboardList, Package,
  Warehouse, Layers, Leaf, Ship, ChevronDown, ChevronRight,
  BarChart2,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

const GROUPS = [
  {
    label: null, // sin encabezado — solo Dashboard
    items: [
      { path: '/dashboard', icon: Home, label: 'Dashboard' },
    ],
  },
  {
    label: 'Personal',
    items: [
      { path: '/trabajadores', icon: Users, label: 'Trabajadores' },
      { path: '/contratos', icon: FileCheck, label: 'Contratos' },
    ],
  },
  {
    label: 'Campo',
    items: [
      { path: '/fincas', icon: MapPin, label: 'Fincas' },
      { path: '/labores', icon: Briefcase, label: 'Labores' },
      { path: '/registros', icon: Briefcase, label: 'Registro Labores' },
      { path: '/registros/historial', icon: ClipboardList, label: 'Historial' },
    ],
  },
  {
    label: 'Producción',
    items: [
      { path: '/produccion/matas-caidas', icon: Leaf, label: 'Matas Caídas' },
      { path: '/produccion/embarques', icon: Ship, label: 'Embarques' },
    ],
  },
  {
    label: 'Inventario',
    items: [
      { path: '/inventario', icon: Package, label: 'Productos' },
      { path: '/inventario/bodegas', icon: Warehouse, label: 'Bodegas' },
      { path: '/labores/insumos', icon: Layers, label: 'Labor → Insumo', adminOnly: true },
    ],
  },
  {
    label: 'Finanzas',
    items: [
      { path: '/nomina', icon: DollarSign, label: 'Nómina' },
      { path: '/prestamos', icon: DollarSign, label: 'Adelantos' },
      { path: '/obligaciones', icon: Shield, label: 'Obligaciones' },
    ],
  },
  {
    label: 'Reportes',
    items: [
      { path: '/reportes', icon: BarChart2, label: 'Reportes' },
    ],
  },
  {
    label: 'Sistema',
    adminOnly: true,
    items: [
      { path: '/configuracion/variables', icon: Settings, label: 'Configuración' },
      { path: '/usuarios', icon: UserCog, label: 'Usuarios' },
    ],
  },
];

export default function Sidebar() {
  const { canManageUsers } = useAuth();
  const location = useLocation();
  const isAdmin = canManageUsers();

  // Determine which group is active based on current path
  const activeGroupLabel = GROUPS.find((g) =>
    g.items.some((item) => location.pathname.startsWith(item.path) && item.path !== '/dashboard')
  )?.label ?? null;

  const [open, setOpen] = useState(() => {
    const initial = {};
    GROUPS.forEach((g) => {
      if (g.label) initial[g.label] = g.label === activeGroupLabel;
    });
    return initial;
  });

  const toggle = (label) => setOpen((prev) => ({ ...prev, [label]: !prev[label] }));

  return (
    <div className="w-56 bg-gray-900 flex flex-col h-screen overflow-y-auto flex-shrink-0">
      {/* Logo */}
      <div className="px-4 py-4 border-b border-gray-700">
        <span className="text-white font-bold text-lg tracking-wide">AgroMax</span>
      </div>

      <nav className="flex-1 px-2 py-3 space-y-0.5">
        {GROUPS.map((group) => {
          if (group.adminOnly && !isAdmin) return null;

          const visibleItems = group.items.filter((i) => !i.adminOnly || isAdmin);
          if (visibleItems.length === 0) return null;

          if (!group.label) {
            // Dashboard — always visible, no header
            return visibleItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  'flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors ' +
                  (isActive ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-700 hover:text-white')
                }
              >
                <item.icon className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">{item.label}</span>
              </NavLink>
            ));
          }

          const isGroupOpen = !!open[group.label];
          const isGroupActive = visibleItems.some((i) => location.pathname.startsWith(i.path));

          return (
            <div key={group.label}>
              <button
                onClick={() => toggle(group.label)}
                className={
                  'w-full flex items-center justify-between px-3 py-1.5 rounded-md text-xs font-semibold uppercase tracking-wider transition-colors ' +
                  (isGroupActive ? 'text-blue-400' : 'text-gray-500 hover:text-gray-300')
                }
              >
                <span>{group.label}</span>
                {isGroupOpen
                  ? <ChevronDown className="w-3 h-3" />
                  : <ChevronRight className="w-3 h-3" />
                }
              </button>

              {isGroupOpen && (
                <div className="mt-0.5 space-y-0.5">
                  {visibleItems.map((item) => (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      end={item.path === '/registros'}
                      className={({ isActive }) =>
                        'flex items-center gap-2.5 pl-5 pr-3 py-2 rounded-md text-sm transition-colors ' +
                        (isActive ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-700 hover:text-white')
                      }
                    >
                      <item.icon className="w-4 h-4 flex-shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>
    </div>
  );
}