// frontend/src/App.jsx

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useContext } from 'react';
import PropTypes from 'prop-types';
import { Toaster } from 'react-hot-toast';
import { AuthContext, AuthProvider } from './contexts/AuthContext';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import TrabajadoresList from './pages/Trabajadores/TrabajadoresList';
import TrabajadorForm from './pages/Trabajadores/TrabajadorForm';
import Navbar from './components/Layout/Navbar';
import Sidebar from './components/Layout/Sidebar';
import RegistroLabores from './pages/Registros/RegistroLabores';
import NominaList from './pages/Nomina/NominaList';
import NominaDetail from './pages/Nomina/NominaDetail';
import LaboresList from './pages/Labores/LaboresList';
import LaborForm from './pages/Labores/LaborForm';
import LaborPrecios from './pages/Labores/LaborPrecios';
import FincasList from './pages/Fincas/FincasList';
import FincaForm from './pages/Fincas/FincaForm';
import FincaLotes from './pages/Fincas/FincaLotes';
import PrestamosList from './pages/Prestamos/PrestamosList';
import PrestamoForm from './pages/Prestamos/PrestamoForm';
import PrestamoDetail from './pages/Prestamos/PrestamoDetail';
import TrabajadorDetail from './pages/Trabajadores/TrabajadorDetail';
import ContratosList from './pages/Contratos/ContratosList';
import ContratoDetail from './pages/Contratos/ContratoDetail';
import ContratoForm from './pages/Contratos/ContratoForm';
import ConfiguracionVariables from './pages/Configuracion/ConfiguracionVariables';
import ReportesList from './pages/Reportes/ReportesList';
import ReportesNomina from './pages/Reportes/ReportesNomina';
import UsuariosList from './pages/Usuarios/UsuariosList';
import UsuarioForm from './pages/Usuarios/UsuarioForm';
import HistorialRegistros from './pages/Registros/HistorialRegistros';
import ProductosList from './pages/Inventario/ProductosList';
import ProductoDetail from './pages/Inventario/ProductoDetail';
import ProductoForm from './pages/Inventario/ProductoForm';

// Obligaciones Laborales
import PILAList from './pages/ObligacionesLaborales/PILA/PILAList';
import PILADetail from './pages/ObligacionesLaborales/PILA/PILADetail';
import PrestacionesList from './pages/ObligacionesLaborales/Prestaciones/PrestacionesList';
import PrestacionesDetail from './pages/ObligacionesLaborales/Prestaciones/PrestacionesDetail';

// Componente para rutas protegidas
// adminOnly  → solo ADMINISTRADOR
// modifyOnly → ADMINISTRADOR o SUPERVISOR
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

// Layout para páginas internas
function MainLayout({ children }) {
  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar />
        <main className="flex-1 overflow-x-hidden overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster position="top-right" />
        <Routes>
          {/* Ruta pública - Landing Page */}
          <Route path="/" element={<Landing />} />
          
          {/* Ruta de Login */}
          <Route path="/login" element={<Login />} />
          
          {/* Dashboard - Redirige si está autenticado */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <Dashboard />
                </MainLayout>
              </ProtectedRoute>
            }
          />

          {/* Trabajadores */}
          <Route path="/trabajadores/:id" 
            element={
              <ProtectedRoute>
                <MainLayout>
                  <TrabajadorDetail />
                </MainLayout>
              </ProtectedRoute>
            } 
          />
          <Route
            path="/trabajadores"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <TrabajadoresList />
                </MainLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/trabajadores/nuevo"
            element={
              <ProtectedRoute modifyOnly>
                <MainLayout>
                  <TrabajadorForm />
                </MainLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/trabajadores/:id/editar"
            element={
              <ProtectedRoute modifyOnly>
                <MainLayout>
                  <TrabajadorForm />
                </MainLayout>
              </ProtectedRoute>
            }
          />

          {/* Contratos */}
          <Route
            path="/contratos"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <ContratosList />
                </MainLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/contratos/nuevo"
            element={
              <ProtectedRoute modifyOnly>
                <MainLayout>
                  <ContratoForm />
                </MainLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/contratos/:id"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <ContratoDetail />
                </MainLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/contratos/:id/editar"
            element={
              <ProtectedRoute modifyOnly>
                <MainLayout>
                  <ContratoForm />
                </MainLayout>
              </ProtectedRoute>
            }
          />

          {/* Préstamos */}
          <Route
            path="/prestamos"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <PrestamosList />
                </MainLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/prestamos/nuevo"
            element={
              <ProtectedRoute modifyOnly>
                <MainLayout>
                  <PrestamoForm />
                </MainLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/prestamos/:id"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <PrestamoDetail />
                </MainLayout>
              </ProtectedRoute>
            }
          />

          {/* Labores */}
          <Route
            path="/labores"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <LaboresList />
                </MainLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/labores/nueva"
            element={
              <ProtectedRoute adminOnly>
                <MainLayout>
                  <LaborForm />
                </MainLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/labores/:id/editar"
            element={
              <ProtectedRoute adminOnly>
                <MainLayout>
                  <LaborForm />
                </MainLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/labores/:id/precios"
            element={
              <ProtectedRoute adminOnly>
                <MainLayout>
                  <LaborPrecios />
                </MainLayout>
              </ProtectedRoute>
            }
          />

          {/* Fincas */}
          <Route
            path="/fincas"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <FincasList />
                </MainLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/fincas/nueva"
            element={
              <ProtectedRoute adminOnly>
                <MainLayout>
                  <FincaForm />
                </MainLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/fincas/:id/editar"
            element={
              <ProtectedRoute adminOnly>
                <MainLayout>
                  <FincaForm />
                </MainLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/fincas/:id/lotes"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <FincaLotes />
                </MainLayout>
              </ProtectedRoute>
            }
          />

          {/* Registros */}
          <Route
            path="/registros"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <RegistroLabores />
                </MainLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/registros/historial"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <HistorialRegistros />
                </MainLayout>
              </ProtectedRoute>
            }
          />

          {/* Inventario */}
          <Route
            path="/inventario"
            element={<ProtectedRoute><MainLayout><ProductosList /></MainLayout></ProtectedRoute>}
          />
          <Route
            path="/inventario/productos/nuevo"
            element={<ProtectedRoute modifyOnly><MainLayout><ProductoForm /></MainLayout></ProtectedRoute>}
          />
          <Route
            path="/inventario/productos/:id"
            element={<ProtectedRoute><MainLayout><ProductoDetail /></MainLayout></ProtectedRoute>}
          />
          <Route
            path="/inventario/productos/:id/editar"
            element={<ProtectedRoute modifyOnly><MainLayout><ProductoForm /></MainLayout></ProtectedRoute>}
          />

          {/* Nómina */}
          <Route
            path="/nomina"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <NominaList />
                </MainLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/nomina/:id"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <NominaDetail />
                </MainLayout>
              </ProtectedRoute>
            }
          />

          {/* Configuración */}
          <Route
            path="/configuracion/variables"
            element={
              <ProtectedRoute adminOnly>
                <MainLayout>
                  <ConfiguracionVariables />
                </MainLayout>
              </ProtectedRoute>
            }
          />

          {/* Reportes */}
          <Route
            path="/reportes"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <ReportesList />
                </MainLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/reportes/nomina"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <ReportesNomina />
                </MainLayout>
              </ProtectedRoute>
            }
          />

          {/* Obligaciones Laborales */}
          <Route
            path="/obligaciones"
            element={<Navigate to="/obligaciones/pila" replace />}
          />
          <Route
            path="/obligaciones/pila"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <PILAList />
                </MainLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/obligaciones/pila/:id"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <PILADetail />
                </MainLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/obligaciones/prestaciones"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <PrestacionesList />
                </MainLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/obligaciones/prestaciones/:id"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <PrestacionesDetail />
                </MainLayout>
              </ProtectedRoute>
            }
          />

          {/* Usuarios - Solo Administrador */}
          <Route
            path="/usuarios"
            element={
              <ProtectedRoute adminOnly>
                <MainLayout>
                  <UsuariosList />
                </MainLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/usuarios/nuevo"
            element={
              <ProtectedRoute adminOnly>
                <MainLayout>
                  <UsuarioForm />
                </MainLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/usuarios/:id/editar"
            element={
              <ProtectedRoute adminOnly>
                <MainLayout>
                  <UsuarioForm />
                </MainLayout>
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;