// frontend/src/App.jsx

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useContext } from 'react';
import { Toaster } from 'react-hot-toast';
import { AuthContext, AuthProvider } from './contexts/AuthContext';
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
import ConfiguracionVariables from './pages/Configuracion/ConfiguracionVariables';

// Componente para rutas protegidas
function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useContext(AuthContext);

  if (loading) {
    return <div>Cargando...</div>;
  }

  return isAuthenticated ? children : <Navigate to="/login" />;
}

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
          <Route path="/login" element={<Login />} />
          
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
          <Route path="/trabajadores/:id" 
          element={
              <ProtectedRoute>
                <MainLayout>
                  <TrabajadorDetail />
                </MainLayout>
              </ProtectedRoute>} />
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
              <ProtectedRoute>
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
              <ProtectedRoute>
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
          <Route
            path="/labores/nueva"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <LaborForm />
                </MainLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/labores/:id/editar"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <LaborForm />
                </MainLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/labores/:id/precios"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <LaborPrecios />
                </MainLayout>
              </ProtectedRoute>
            }
          />

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
              <ProtectedRoute>
                <MainLayout>
                  <FincaForm />
                </MainLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/fincas/:id/editar"
            element={
              <ProtectedRoute>
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

          <Route
            path="/trabajadores/nuevo"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <TrabajadorForm />
                </MainLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/trabajadores/:id/editar"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <TrabajadorForm />
                </MainLayout>
              </ProtectedRoute>
            }
          />

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

          <Route
            path="/configuracion/variables"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <ConfiguracionVariables />
                </MainLayout>
              </ProtectedRoute>
            }
          />

          <Route path="/" element={<Navigate to="/dashboard" />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;