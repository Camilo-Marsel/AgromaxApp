// frontend/src/App.jsx

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useContext, useState } from 'react';
import PropTypes from 'prop-types';
import { Toaster } from 'react-hot-toast';
import { AuthContext, AuthProvider } from './contexts/AuthContext';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import TrabajadoresList from './pages/Trabajadores/TrabajadoresList';
import TrabajadorForm from './pages/Trabajadores/TrabajadorForm';
import TrabajadorDetail from './pages/Trabajadores/TrabajadorDetail';
import Navbar from './components/Layout/Navbar';
import Sidebar from './components/Layout/Sidebar';
import RegistroLabores from './pages/Registros/RegistroLabores';
import HistorialRegistros from './pages/Registros/HistorialRegistros';
import NominaList from './pages/Nomina/NominaList';
import NominaDetail from './pages/Nomina/NominaDetail';
import LaboresList from './pages/Labores/LaboresList';
import LaborForm from './pages/Labores/LaborForm';
import LaborPrecios from './pages/Labores/LaborPrecios';
import LaborInsumos from './pages/Labores/LaborInsumos';
import FincasList from './pages/Fincas/FincasList';
import FincaForm from './pages/Fincas/FincaForm';
import FincaLotes from './pages/Fincas/FincaLotes';
import PrestamosList from './pages/Prestamos/PrestamosList';
import PrestamoForm from './pages/Prestamos/PrestamoForm';
import PrestamoDetail from './pages/Prestamos/PrestamoDetail';
import ContratosList from './pages/Contratos/ContratosList';
import ContratoDetail from './pages/Contratos/ContratoDetail';
import ContratoForm from './pages/Contratos/ContratoForm';
import ConfiguracionVariables from './pages/Configuracion/ConfiguracionVariables';
import ConfiguracionEmpresa from './pages/Configuracion/ConfiguracionEmpresa';
import ReportesList from './pages/Reportes/ReportesList';
import ReportesNomina from './pages/Reportes/ReportesNomina';
import ReportesProduccion from './pages/Reportes/ReportesProduccion';
import UsuariosList from './pages/Usuarios/UsuariosList';
import UsuarioForm from './pages/Usuarios/UsuarioForm';
import ProductosList from './pages/Inventario/ProductosList';
import ProductoDetail from './pages/Inventario/ProductoDetail';
import ProductoForm from './pages/Inventario/ProductoForm';
import BodegasList from './pages/Inventario/BodegasList';
import MatasCaidasList from './pages/Produccion/MatasCaidasList';
import EmbarquesList from './pages/Produccion/EmbarquesList';
import PILAList from './pages/ObligacionesLaborales/PILA/PILAList';
import PILADetail from './pages/ObligacionesLaborales/PILA/PILADetail';
import PrestacionesList from './pages/ObligacionesLaborales/Prestaciones/PrestacionesList';
import PrestacionesDetail from './pages/ObligacionesLaborales/Prestaciones/PrestacionesDetail';
import LiquidacionesList from './pages/Liquidaciones/LiquidacionesList';
import LiquidacionDetail from './pages/Liquidaciones/LiquidacionDetail';

function ProtectedRoute({ children, adminOnly = false, modifyOnly = false }) {
  const { isAuthenticated, loading, isAdmin, canModify } = useContext(AuthContext);
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (adminOnly && !isAdmin()) return <Navigate to="/dashboard" replace />;
  if (modifyOnly && !canModify()) return <Navigate to="/dashboard" replace />;
  return children;
}

ProtectedRoute.propTypes = {
  children: PropTypes.node.isRequired,
  adminOnly: PropTypes.bool,
  modifyOnly: PropTypes.bool,
};

function MainLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <Navbar onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-x-hidden overflow-y-auto p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}

const P = ({ children, admin, modify }) => (
  <ProtectedRoute adminOnly={!!admin} modifyOnly={!!modify}>
    <MainLayout>{children}</MainLayout>
  </ProtectedRoute>
);

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster position="top-right" />
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />

          <Route path="/dashboard" element={<P><Dashboard /></P>} />

          {/* Trabajadores */}
          <Route path="/trabajadores" element={<P><TrabajadoresList /></P>} />
          <Route path="/trabajadores/nuevo" element={<P modify><TrabajadorForm /></P>} />
          <Route path="/trabajadores/:id" element={<P><TrabajadorDetail /></P>} />
          <Route path="/trabajadores/:id/editar" element={<P modify><TrabajadorForm /></P>} />

          {/* Contratos */}
          <Route path="/contratos" element={<P><ContratosList /></P>} />
          <Route path="/contratos/nuevo" element={<P modify><ContratoForm /></P>} />
          <Route path="/contratos/:id" element={<P><ContratoDetail /></P>} />
          <Route path="/contratos/:id/editar" element={<P modify><ContratoForm /></P>} />

          {/* Préstamos */}
          <Route path="/prestamos" element={<P><PrestamosList /></P>} />
          <Route path="/prestamos/nuevo" element={<P modify><PrestamoForm /></P>} />
          <Route path="/prestamos/:id" element={<P><PrestamoDetail /></P>} />

          {/* Labores */}
          <Route path="/labores" element={<P><LaboresList /></P>} />
          <Route path="/labores/nueva" element={<P admin><LaborForm /></P>} />
          <Route path="/labores/:id/editar" element={<P admin><LaborForm /></P>} />
          <Route path="/labores/:id/precios" element={<P admin><LaborPrecios /></P>} />
          <Route path="/labores/insumos" element={<P admin><LaborInsumos /></P>} />

          {/* Fincas */}
          <Route path="/fincas" element={<P><FincasList /></P>} />
          <Route path="/fincas/nueva" element={<P admin><FincaForm /></P>} />
          <Route path="/fincas/:id/editar" element={<P admin><FincaForm /></P>} />
          <Route path="/fincas/:id/lotes" element={<P><FincaLotes /></P>} />

          {/* Registros */}
          <Route path="/registros" element={<P><RegistroLabores /></P>} />
          <Route path="/registros/historial" element={<P><HistorialRegistros /></P>} />

          {/* Inventario */}
          <Route path="/inventario" element={<P><ProductosList /></P>} />
          <Route path="/inventario/bodegas" element={<P><BodegasList /></P>} />
          <Route path="/inventario/productos/nuevo" element={<P modify><ProductoForm /></P>} />
          <Route path="/inventario/productos/:id" element={<P><ProductoDetail /></P>} />
          <Route path="/inventario/productos/:id/editar" element={<P modify><ProductoForm /></P>} />

          {/* Producción */}
          <Route path="/produccion/matas-caidas" element={<P modify><MatasCaidasList /></P>} />
          <Route path="/produccion/embarques" element={<P modify><EmbarquesList /></P>} />

          {/* Nómina */}
          <Route path="/nomina" element={<P><NominaList /></P>} />
          <Route path="/nomina/:id" element={<P><NominaDetail /></P>} />

          {/* Configuración */}
          <Route path="/configuracion/empresa" element={<P admin><ConfiguracionEmpresa /></P>} />
          <Route path="/configuracion/variables" element={<P admin><ConfiguracionVariables /></P>} />

          {/* Reportes */}
          <Route path="/reportes" element={<P><ReportesList /></P>} />
          <Route path="/reportes/nomina" element={<P><ReportesNomina /></P>} />
          <Route path="/reportes/produccion" element={<P><ReportesProduccion /></P>} />

          {/* Liquidaciones */}
          <Route path="/liquidaciones" element={<P><LiquidacionesList /></P>} />
          <Route path="/liquidaciones/:id" element={<P><LiquidacionDetail /></P>} />

          {/* Obligaciones Laborales */}
          <Route path="/obligaciones" element={<Navigate to="/obligaciones/pila" replace />} />
          <Route path="/obligaciones/pila" element={<P><PILAList /></P>} />
          <Route path="/obligaciones/pila/:id" element={<P><PILADetail /></P>} />
          <Route path="/obligaciones/prestaciones" element={<P><PrestacionesList /></P>} />
          <Route path="/obligaciones/prestaciones/:id" element={<P><PrestacionesDetail /></P>} />

          {/* Usuarios */}
          <Route path="/usuarios" element={<P admin><UsuariosList /></P>} />
          <Route path="/usuarios/nuevo" element={<P admin><UsuarioForm /></P>} />
          <Route path="/usuarios/:id/editar" element={<P admin><UsuarioForm /></P>} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;