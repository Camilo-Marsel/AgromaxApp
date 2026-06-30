// frontend/src/components/Layout/Sidebar.jsx

import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  Home, Users, Briefcase, DollarSign, FileText, Settings,
  MapPin, FileCheck, UserCog, Shield, ClipboardList, Package,
  Warehouse, Layers, Leaf, Ship, ChevronDown, ChevronRight,
  BarChart2, X, Calculator, Building2,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

const GROUPS = [
  {
    label: null,
    items: [{ path: '/dashboard', icon: Home, label: 'Dashboard' }],
  },
  {
    label: 'Personal',
    items: [
      { path: '/trabajadores', icon: Users, label: 'Trabajadores' },
      { path: '/contratos', icon: FileCheck, label: 'Contratos' },
      { path: '/contratos/plantillas', icon: FileText, label: 'Plantillas contrato' },
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
      { path: '/liquidaciones', icon: Calculator, label: 'Liquidaciones' },
      { path: '/obligaciones', icon: Shield, label: 'Seg. Social (PILA)' },
      { path: '/obligaciones/prestaciones', icon: FileText, label: 'Prestaciones' },
    ],
  },
  {
    label: 'Reportes',
    items: [{ path: '/reportes', icon: BarChart2, label: 'Reportes' }],
  },
  {
    label: 'Sistema',
    adminOnly: true,
    items: [
      { path: '/configuracion/empresa', icon: Building2, label: 'Empresa' },
      { path: '/configuracion/variables', icon: Settings, label: 'Variables' },
      { path: '/usuarios', icon: UserCog, label: 'Usuarios' },
    ],
  },
];

function SidebarContent({ onClose }) {
  const { canManageUsers } = useAuth();
  const location = useLocation();
  const isAdmin = canManageUsers();

  const activeGroupLabel = GROUPS.find((g) =>
    g.items.some((item) => location.pathname.startsWith(item.path) && item.path !== '/dashboard')
  )?.label ?? null;

  const [open, setOpen] = useState(() => {
    const initial = {};
    GROUPS.forEach((g) => { if (g.label) initial[g.label] = g.label === activeGroupLabel; });
    return initial;
  });

  const toggle = (label) => setOpen((prev) => ({ ...prev, [label]: !prev[label] }));

  return (
    <div className="w-56 bg-gray-900 flex flex-col h-full">
      <div className="px-4 py-3 border-b border-gray-700 flex items-center justify-between">
        <span className="text-white font-bold text-lg">AgromaxD</span>
        {onClose && (
          <button onClick={onClose} className="lg:hidden text-gray-400 hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>
      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
        {GROUPS.map((group) => {
          if (group.adminOnly && !isAdmin) return null;
          const visibleItems = group.items.filter((i) => !i.adminOnly || isAdmin);
          if (visibleItems.length === 0) return null;

          if (!group.label) {
            return visibleItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={onClose}
                className={({ isActive }) =>
                  'flex items-center gap-2.5 px-3 py-2 rounded-md text-lg transition-colors ' +
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
                  'w-full flex items-center justify-between px-3 py-1.5 rounded-md text-sm font-semibold uppercase tracking-wider transition-colors ' +
                  (isGroupActive ? 'text-blue-400' : 'text-gray-500 hover:text-gray-300')
                }
              >
                <span>{group.label}</span>
                {isGroupOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              </button>
              {isGroupOpen && (
                <div className="mt-0.5 space-y-0.5">
                  {visibleItems.map((item) => (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      end={item.path === '/registros'}
                      onClick={onClose}
                      className={({ isActive }) =>
                        'flex items-center gap-2.5 pl-5 pr-3 py-2 rounded-md text-lg transition-colors ' +
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

export default function Sidebar({ isOpen, onClose }) {
  return (
    <>
      {/* Desktop: always visible */}
      <div className="hidden lg:flex flex-shrink-0 h-screen">
        <SidebarContent />
      </div>

      {/* Mobile: overlay drawer */}
      {isOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black bg-opacity-50"
            onClick={onClose}
          />
          {/* Drawer */}
          <div className="relative flex flex-col h-full shadow-xl">
            <SidebarContent onClose={onClose} />
          </div>
        </div>
      )}
    </>
  );
}