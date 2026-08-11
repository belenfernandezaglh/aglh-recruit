'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

// Definimos la estructura del cliente
interface Cliente {
  id: number;
  nombre: string;
  ejecutivo: string;
  direccion?: string;
  ubicacion_url?: string;
  zona?: string;
}

export default function Home() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function fetchClientes() {
      const { data, error } = await supabase
        .from('clientes')
        .select('*')
        .order('nombre', { ascending: true });

      if (error) {
        console.error('Error al obtener clientes:', error);
      } else if (data) {
        setClientes(data);
      }
      setLoading(false);
    }

    fetchClientes();
  }, []);

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Cargando clientes...</div>;
  }

  return (
    <main className="max-w-6xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">Listado de Clientes</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {clientes.map((cliente) => (
          <div key={cliente.id} className="border rounded-xl p-5 shadow-sm bg-white flex flex-col justify-between hover:shadow-md transition">
            <div>
              <div className="flex justify-between items-start mb-2">
                <h2 className="text-lg font-bold text-gray-900">{cliente.nombre}</h2>
                <span className="text-xs bg-gray-100 text-gray-600 font-medium px-2 py-1 rounded">
                  {cliente.zona || 'Sin zona'}
                </span>
              </div>

              <p className="text-sm text-gray-600 mb-2">
                <strong>Ejecutivo:</strong> {cliente.ejecutivo}
              </p>

              {cliente.direccion && (
                <p className="text-sm text-gray-500">
                  🏠 {cliente.direccion}
                </p>
              )}
            </div>

            <div className="mt-4 pt-3 border-t">
              {cliente.ubicacion_url ? (
                <a
                  href={cliente.ubicacion_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full inline-flex justify-center items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg text-sm transition"
                >
                  📍 Abrir en Google Maps
                </a>
              ) : (
                <span className="text-xs text-gray-400 italic block text-center py-2">
                  Sin mapa registrado
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
