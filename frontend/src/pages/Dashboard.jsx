// frontend/src/pages/Dashboard.jsx

import { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { healthCheck } from '../services/api';
import toast from 'react-hot-toast';

export default function Dashboard() {
  const { user, logout } = useContext(AuthContext);
  const [apiStatus, setApiStatus] = useState('Verificando...');

  useEffect(() => {
    // Verificar conexión con API
    const checkAPI = async () => {
      try {
        const data = await healthCheck();
        setApiStatus(data.message);
        toast.success('Conexión con API exitosa');
      } catch (error) {
        setApiStatus('Error al conectar con API');
        toast.error('Error al conectar con API');
      }
    };

    checkAPI();
  }, []);

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Navbar */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold">Gestión Finca Platanera</h1>
            </div>
            <div className="flex items-center">
              <button
                onClick={logout}
                className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700"
              >
                Cerrar Sesión
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-bold mb-4">Dashboard</h2>
            
            <div className="space-y-4">
              <div className="p-4 bg-green-50 border border-green-200 rounded-md">
                <p className="text-green-800">
                  <strong>Estado API:</strong> {apiStatus}
                </p>
              </div>

              <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
                <p className="text-blue-800">
                  ¡Bienvenido! El sistema está configurado correctamente.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                <div className="p-6 bg-white border rounded-lg shadow-sm">
                  <h3 className="font-semibold text-lg mb-2">Trabajadores</h3>
                  <p className="text-gray-600">Próximamente...</p>
                </div>
                
                <div className="p-6 bg-white border rounded-lg shadow-sm">
                  <h3 className="font-semibold text-lg mb-2">Nómina</h3>
                  <p className="text-gray-600">Próximamente...</p>
                </div>
                
                <div className="p-6 bg-white border rounded-lg shadow-sm">
                  <h3 className="font-semibold text-lg mb-2">Reportes</h3>
                  <p className="text-gray-600">Próximamente...</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}