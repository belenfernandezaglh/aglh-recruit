'use client';

import React, { useState, useRef } from 'react';
import { 
  Users, 
  Search, 
  Filter, 
  Plus, 
  UserCheck, 
  Upload,
  CheckCircle2,
  Clock,
  FileText,
  Trash2
} from 'lucide-react';

export default function Home() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [candidates, setCandidates] = useState<any[]>([]);
  
  // Referencia para activar el selector de archivos oculto
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Función para abrir la carpeta de archivos al hacer clic en "Cargar CV"
  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  // Función que procesa el archivo seleccionado y crea un candidato
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Extrae el nombre del archivo eliminando la extensión para usarlo como nombre provisorio
      const cleanName = file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");
      
      const newCandidate = {
        id: Date.now(),
        name: cleanName,
        position: 'Candidato General',
        status: 'NUEVO',
        fileName: file.name,
        date: new Date().toLocaleDateString('es-ES')
      };

      setCandidates((prev) => [newCandidate, ...prev]);
      
      // Limpia el input para permitir volver a subir el mismo archivo si se desea
      event.target.value = '';
    }
  };

  // Eliminar candidato de la lista
  const handleDelete = (id: number) => {
    setCandidates((prev) => prev.filter(c => c.id !== id));
  };

  // Filtrado de candidatos
  const filteredCandidates = candidates.filter(candidate => {
    const matchesSearch = candidate.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          candidate.position.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = selectedStatus === 'ALL' || candidate.status === selectedStatus;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      {/* Input Oculto para Selección de Archivos */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        accept=".pdf,.doc,.docx" 
        className="hidden" 
      />

      {/* Header Principal */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-blue-600 text-white p-2 rounded-lg font-bold text-xl">
              AGLH
            </div>
            <div>
              <h1 className="font-bold text-lg text-slate-900 leading-tight">AGLH Recruit</h1>
              <p className="text-xs text-slate-500">Plataforma de Gestión de Reclutamiento</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <button 
              onClick={handleUploadClick}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center space-x-2 transition-colors shadow-sm"
            >
              <Upload className="w-4 h-4" />
              <span>Cargar CV</span>
            </button>
          </div>
        </div>
      </header>

      {/* Contenido Principal */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Contadores dinámicos */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center space-x-4">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Total Candidatos</p>
              <p className="text-2xl font-bold text-slate-900">{candidates.length}</p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center space-x-4">
            <div className="p-3 bg-amber-50 text-amber-600 rounded-lg">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">En Evaluación</p>
              <p className="text-2xl font-bold text-slate-900">
                {candidates.filter(c => c.status === 'EVALUACION').length}
              </p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center space-x-4">
            <div className="p-3 bg-purple-50 text-purple-600 rounded-lg">
              <UserCheck className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Entrevistados</p>
              <p className="text-2xl font-bold text-slate-900">
                {candidates.filter(c => c.status === 'ENTREVISTA').length}
              </p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center space-x-4">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Seleccionados</p>
              <p className="text-2xl font-bold text-slate-900">
                {candidates.filter(c => c.status === 'SELECCIONADO').length}
              </p>
            </div>
          </div>
        </div>

        {/* Buscador y Filtros */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-6 flex flex-col md:flex-row gap-4 justify-between items-center">
          <div className="relative w-full md:w-96">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar candidatos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center space-x-2 overflow-x-auto">
            <Filter className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
            {['ALL', 'NUEVO', 'EVALUACION', 'ENTREVISTA', 'SELECCIONADO'].map((status) => (
              <button
                key={status}
                onClick={() => setSelectedStatus(status)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
                  selectedStatus === status
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {status === 'ALL' ? 'Todos' : status}
              </button>
            ))}
          </div>
        </div>

        {/* Vista de Lista o Estado Vacío */}
        {filteredCandidates.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCandidates.map((candidate) => (
              <div key={candidate.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs px-2.5 py-1 bg-blue-100 text-blue-700 font-medium rounded-full">
                      {candidate.status}
                    </span>
                    <button 
                      onClick={() => handleDelete(candidate.id)}
                      className="text-slate-400 hover:text-red-600 transition-colors"
                      title="Eliminar candidato"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <h4 className="font-bold text-slate-900 text-base capitalize">{candidate.name}</h4>
                  <p className="text-xs text-slate-500 mb-3">{candidate.position}</p>
                </div>

                <div className="border-t border-slate-100 pt-3 mt-3 flex items-center justify-between text-xs text-slate-500">
                  <div className="flex items-center space-x-1 truncate max-w-[180px]">
                    <FileText className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                    <span className="truncate">{candidate.fileName}</span>
                  </div>
                  <span>{candidate.date}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-sm">
            <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-1">No hay candidatos registrados</h3>
            <p className="text-slate-500 text-sm max-w-md mx-auto mb-6">
              Sube un archivo PDF o Word para probar cómo se agregan los candidatos a la lista.
            </p>
            <div className="flex justify-center">
              <button 
                onClick={handleUploadClick}
                className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg text-sm font-medium flex items-center space-x-2 shadow-sm transition-colors"
              >
                <Upload className="w-4 h-4" />
                <span>Seleccionar y Cargar CV</span>
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
