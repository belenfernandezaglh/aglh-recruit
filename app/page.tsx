// app/page.tsx
'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Candidate, CandidateStatus, GrupoOperativa } from '../types';
import { OPERATIVAS_BASE } from '../data/mockData';
import { createClient } from '@supabase/supabase-js';

// Inicialización del cliente Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

type ViewMode = 'busqueda' | 'candidates' | 'solicitudes' | 'reportes' | 'configuracion';

export default function Home() {
  const [activeTab, setActiveTab] = useState<ViewMode>('busqueda');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);
  
  // Filtros de Búsqueda
  const [searchZone, setSearchZone] = useState('');
  const [searchExp, setSearchExp] = useState('');
  const [selectedClientFilter, setSelectedClientFilter] = useState('');
  
  // Drag & Drop y Modal
  const [isDragging, setIsDragging] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);

  const [operativas, setOperativas] = useState<GrupoOperativa[]>(OPERATIVAS_BASE);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cargar candidatos desde Supabase al iniciar
  useEffect(() => {
    fetchCandidates();
  }, []);

  const fetchCandidates = async () => {
    try {
      const { data, error } = await supabase
        .from('candidates')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error al cargar candidatos:', error);
        return;
      }

      if (data) {
        const formatted: Candidate[] = data.map((item) => ({
          id: String(item.id),
          name: item.name || 'Sin Nombre',
          phone: item.phone || '',
          position: item.position || 'Postulante General',
          status: (item.status as CandidateStatus) || 'NUEVO',
          fileName: item.file_name || 'Documento.pdf',
          date: item.created_at ? new Date(item.created_at).toLocaleString('es-ES') : '',
          matchedOperativas: item.matched_operativas || []
        }));
        setCandidates(formatted);
      }
    } catch (err) {
      console.error('Error general al conectar con Supabase:', err);
    }
  };

  // Función de eliminación
  const handleDeleteCandidate = async (e: React.MouseEvent, candidateId: string) => {
    e.stopPropagation(); // Evita abrir o reabrir la ficha modal

    if (!candidateId) {
      alert('Error: El candidato no tiene un ID válido para eliminar.');
      return;
    }

    const confirmDelete = window.confirm('¿Confirmas que deseas eliminar permanentemente este candidato?');
    if (!confirmDelete) return;

    // 1. Eliminar visualmente de inmediato en la UI
    setCandidates((prev) => prev.filter((c) => String(c.id) !== String(candidateId)));
    
    if (selectedCandidate && String(selectedCandidate.id) === String(candidateId)) {
      setSelectedCandidate(null);
    }

    // 2. Ejecutar la baja en Supabase
    const { error } = await supabase
      .from('candidates')
      .delete()
      .eq('id', candidateId);

    if (error) {
      console.error('Error al eliminar en Supabase:', error);
      alert('No se pudo borrar de la base de datos remota. Recargá la página.');
    }
  };

  // Extraer lista única de empresas clientes
  const allClients = Array.from(
    new Set(operativas.flatMap(group => group.cuentas.map(c => c.cliente)))
  );

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  // Procesamiento e indexación de nuevos CVs
  const processFiles = async (files: FileList | File[]) => {
    if (files && files.length > 0) {
      const zonasMock = ['Montevideo (Centro)', 'Montevideo (Paso Carrasco)', 'Canelones (Ciudad de la Costa)', 'San José', 'Maldonado'];
      const updatedOperativas = [...operativas];
      const newCandidatesToInsert: any[] = [];

      Array.from(files).forEach((file) => {
        const cleanName = file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");
        const fakePhone = `09${Math.floor(10000000 + Math.random() * 9000000)}`;
        const assignedZone = zonasMock[Math.floor(Math.random() * zonasMock.length)];
        
        const matchedClienteNames: string[] = [];

        updatedOperativas.forEach(group => {
          group.cuentas.forEach(cuenta => {
            matchedClienteNames.push(cuenta.cliente);
            cuenta.contactos.push(`${cleanName} (${assignedZone})`);
          });
        });

        const sugeridos = matchedClienteNames.slice(0, 2);

        newCandidatesToInsert.push({
          name: cleanName,
          phone: fakePhone,
          position: 'Postulante General',
          status: 'NUEVO',
          file_name: file.name,
          matched_operativas: sugeridos
        });
      });

      const { data, error } = await supabase
        .from('candidates')
        .insert(newCandidatesToInsert)
        .select();

      if (error) {
        console.error('Error insertando en Supabase:', error);
        alert('Ocurrió un error al guardar en Supabase.');
      } else if (data) {
        const createdCandidates: Candidate[] = data.map((item) => ({
          id: String(item.id),
          name: item.name,
          phone: item.phone,
          position: item.position,
          status: item.status as CandidateStatus,
          fileName: item.file_name,
          date: new Date(item.created_at).toLocaleString('es-ES'),
          matchedOperativas: item.matched_operativas
        }));

        setCandidates((prev) => [...createdCandidates, ...prev]);
        setOperativas(updatedOperativas);
      }
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      processFiles(event.target.files);
      event.target.value = '';
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  const getStatusBadgeStyle = (status: CandidateStatus) => {
    switch (status) {
      case 'NUEVO':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'EVALUACION':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'ENTREVISTA':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'SELECCIONADO':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  // Filtrado de candidatos
  const candidatesMatch = candidates.filter(candidate => {
    const matchClient = selectedClientFilter === '' || candidate.matchedOperativas?.includes(selectedClientFilter);
    const matchZone = searchZone === '' || candidate.name.toLowerCase().includes(searchZone.toLowerCase()) || candidate.fileName.toLowerCase().includes(searchZone.toLowerCase());
    const matchExp = searchExp === '' || candidate.fileName.toLowerCase().includes(searchExp.toLowerCase());

    return matchClient && matchZone && matchExp;
  });

  return (
    <div 
      className="min-h-screen bg-[#f3f4f6] text-slate-800 flex"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        accept=".pdf,.doc,.docx" 
        multiple 
        className="hidden" 
      />

      {/* Overlay Drag & Drop */}
      {isDragging && (
        <div className="fixed inset-0 bg-[#8cb800]/20 backdrop-blur-sm border-4 border-dashed border-[#8cb800] z-50 flex items-center justify-center pointer-events-none">
          <div className="bg-white p-8 rounded-2xl shadow-2xl text-center border border-slate-100">
            <p className="text-xl font-bold text-slate-800">Suelte los CVs para alimentar la Base de Datos</p>
            <p className="text-xs text-slate-500 mt-1">Soporta PDF, DOC y DOCX</p>
          </div>
        </div>
      )}

      {/* Sidebar Izquierda */}
      <aside className={`${isSidebarCollapsed ? 'w-16' : 'w-56'} bg-[#1f2937] text-white flex flex-col py-4 transition-all duration-300 shrink-0 border-r border-slate-800 z-30`}>
        <div className="px-3 pb-3 border-b border-slate-700/60 flex items-center justify-between">
          <button 
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="w-10 h-10 rounded-lg hover:bg-slate-700/60 flex items-center justify-center text-slate-300 transition-colors mx-auto"
            title="Expandir / Contraer menú"
          >
            <span className="text-lg">☰</span>
          </button>
          {!isSidebarCollapsed && (
            <span className="text-xs font-bold text-slate-400 tracking-wider uppercase pr-2">Navegación</span>
          )}
        </div>

        <nav className="flex-1 space-y-1.5 px-2 mt-4">
          <button
            onClick={() => setActiveTab('busqueda')}
            className={`w-full h-10 rounded-lg flex items-center px-3 transition-colors ${
              activeTab === 'busqueda' ? 'bg-[#8cb800] text-white font-bold' : 'text-slate-300 hover:bg-slate-700/60'
            }`}
            title="Match por Empresa"
          >
            <span className="text-base min-w-[24px] text-center">🏢</span>
            {!isSidebarCollapsed && <span className="text-xs ml-3 truncate">Match por Empresa</span>}
          </button>

          <button
            onClick={() => setActiveTab('candidates')}
            className={`w-full h-10 rounded-lg flex items-center px-3 transition-colors ${
              activeTab === 'candidates' ? 'bg-[#8cb800] text-white font-bold' : 'text-slate-300 hover:bg-slate-700/60'
            }`}
            title="Base General CVs"
          >
            <span className="text-base min-w-[24px] text-center">👤</span>
            {!isSidebarCollapsed && <span className="text-xs ml-3 truncate">Base de CVs ({candidates.length})</span>}
          </button>

          <button
            onClick={() => setActiveTab('solicitudes')}
            className={`w-full h-10 rounded-lg flex items-center px-3 transition-colors ${
              activeTab === 'solicitudes' ? 'bg-[#8cb800] text-white font-bold' : 'text-slate-300 hover:bg-slate-700/60'
            }`}
            title="Solicitudes de Clientes"
          >
            <span className="text-base min-w-[24px] text-center">✉</span>
            {!isSidebarCollapsed && <span className="text-xs ml-3 truncate">Solicitudes Clientes</span>}
          </button>

          <button
            onClick={() => setActiveTab('reportes')}
            className={`w-full h-10 rounded-lg flex items-center px-3 transition-colors ${
              activeTab === 'reportes' ? 'bg-[#8cb800] text-white font-bold' : 'text-slate-300 hover:bg-slate-700/60'
            }`}
            title="Analítica de Talentos"
          >
            <span className="text-base min-w-[24px] text-center">📊</span>
            {!isSidebarCollapsed && <span className="text-xs ml-3 truncate">Analítica</span>}
          </button>

          <button
            onClick={() => setActiveTab('configuracion')}
            className={`w-full h-10 rounded-lg flex items-center px-3 transition-colors ${
              activeTab === 'configuracion' ? 'bg-[#8cb800] text-white font-bold' : 'text-slate-300 hover:bg-slate-700/60'
            }`}
            title="Ajustes"
          >
            <span className="text-base min-w-[24px] text-center">⚙</span>
            {!isSidebarCollapsed && <span className="text-xs ml-3 truncate">Ajustes</span>}
          </button>
        </nav>
      </aside>

      {/* Contenido Principal */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-[#8cb800] text-white h-16 px-6 flex items-center justify-between shadow-sm">
          <div className="flex items-center space-x-3">
            <div className="font-extrabold text-2xl tracking-tight text-white flex items-center">
              <span>aglh</span>
              <span className="text-[10px] font-normal tracking-normal ml-2 hidden sm:inline-block border-l border-white/40 pl-2 uppercase">
                Base de Datos — Match Directo por Empresa Cliente
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button 
              onClick={handleUploadClick}
              className="bg-[#1f2937] hover:bg-black text-white px-4 py-1.5 rounded-lg text-xs font-bold transition-colors shadow-sm"
            >
              + Indexar Nuevos CVs
            </button>
          </div>
        </header>

        {/* Bar Superior */}
        <div className="bg-white border-b border-slate-200 px-8 py-2.5 flex justify-between items-center text-xs text-slate-600">
          <div className="flex space-x-8">
            <div>Total CVs Registrados: <strong className="text-slate-900">{candidates.length}</strong></div>
            <div>Compatibles Filtrados: <strong className="text-[#8cb800]">{candidatesMatch.length}</strong></div>
          </div>
          <span className="text-slate-400 text-[11px]">Servicios Humanos Integrales</span>
        </div>

        <main className="p-8 max-w-6xl mx-auto w-full">
          
          {/* VISTA 1: BÚSQUEDA Y MATCH POR EMPRESA CLIENTE (🏢) */}
          {activeTab === 'busqueda' && (
            <div className="space-y-6">
              <div className="text-center max-w-2xl mx-auto mb-6">
                <h2 className="text-2xl font-light text-slate-700">Compatibilidad Candidato — Empresa Cliente</h2>
                <p className="text-xs text-slate-500 mt-1">
                  Filtrá y evaluá la compatibilidad de los postulantes con cada empresa cliente según su zona geográfica y trayectoria laboral.
                </p>
              </div>

              {/* Panel de Filtros */}
              <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Empresa Cliente Target</label>
                  <select
                    value={selectedClientFilter}
                    onChange={(e) => setSelectedClientFilter(e.target.value)}
                    className="w-full border border-slate-300 rounded p-2 text-xs focus:outline-none focus:border-[#8cb800]"
                  >
                    <option value="">Todas las Empresas Clientes</option>
                    {allClients.map((clientName, idx) => (
                      <option key={idx} value={clientName}>{clientName}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Zona / Barrio de residencia</label>
                  <input
                    type="text"
                    placeholder="Ej: Paso Carrasco, Centro, Canelones..."
                    value={searchZone}
                    onChange={(e) => setSearchZone(e.target.value)}
                    className="w-full border border-slate-300 rounded p-2 text-xs focus:outline-none focus:border-[#8cb800]"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Experiencia / Tarea Relevante</label>
                  <input
                    type="text"
                    placeholder="Ej: Depósito, Manejo de autoelevador, Limpieza..."
                    value={searchExp}
                    onChange={(e) => setSearchExp(e.target.value)}
                    className="w-full border border-slate-300 rounded p-2 text-xs focus:outline-none focus:border-[#8cb800]"
                  />
                </div>
              </div>

              {/* Lista de Resultados */}
              <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                <h3 className="text-xs font-bold text-slate-700 mb-3 uppercase tracking-wider">
                  Candidatos Evaluados ({candidatesMatch.length})
                </h3>

                {candidatesMatch.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {candidatesMatch.map((candidate) => (
                      <div 
                        key={candidate.id}
                        onClick={() => setSelectedCandidate(candidate)}
                        className="p-4 border border-slate-200 rounded-lg hover:border-[#8cb800] cursor-pointer transition-colors bg-slate-50/50 flex flex-col justify-between relative group"
                      >
                        <div>
                          <div className="flex justify-between items-start">
                            <h4 className="font-bold text-xs text-slate-800">{candidate.name}</h4>
                            <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${getStatusBadgeStyle(candidate.status)}`}>
                              {candidate.status}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 mt-2">
                            <strong>Teléfono:</strong> <span className="font-mono">{candidate.phone}</span>
                          </p>

                          <div className="mt-3 pt-2 border-t border-slate-200/60">
                            <span className="text-[10px] text-slate-400 block mb-1 font-semibold">Empresas Compatibles:</span>
                            <div className="flex flex-wrap gap-1">
                              {candidate.matchedOperativas?.map((cliente, i) => (
                                <span key={i} className="bg-emerald-50 text-emerald-800 text-[10px] px-2 py-0.5 rounded border border-emerald-200 font-semibold">
                                  {cliente}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Botón Rojo visible en cada tarjeta */}
                        <div className="mt-4 pt-2 border-t border-slate-200 flex justify-between items-center">
                          <span className="text-[10px] text-slate-400 font-mono">ID: {candidate.id.substring(0, 6)}...</span>
                          <button
                            type="button"
                            onClick={(e) => handleDeleteCandidate(e, candidate.id)}
                            className="bg-red-50 text-red-600 hover:bg-red-600 hover:text-white border border-red-200 text-[11px] font-bold px-2.5 py-1 rounded transition-colors flex items-center space-x-1"
                          >
                            <span>🗑️</span>
                            <span>Eliminar</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-400 text-xs">
                    No hay perfiles ingresados o ninguno coincide con la empresa/zona filtrada.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* VISTA 2: BASE GENERAL DE CVs (👤) */}
          {activeTab === 'candidates' && (
            <div className="space-y-6">
              <h2 className="text-center text-2xl font-light text-slate-700 mb-6">
                Base General de CVs Registrados
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {candidates.map((candidate) => (
                  <div 
                    key={candidate.id}
                    onClick={() => setSelectedCandidate(candidate)}
                    className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm hover:border-[#8cb800] cursor-pointer transition-colors flex flex-col justify-between"
                  >
                    <div>
                      <h4 className="font-bold text-xs text-slate-800">{candidate.name}</h4>
                      <p className="text-xs text-slate-500 font-mono mt-1">{candidate.phone}</p>
                      <p className="text-[10px] text-slate-400 mt-2">Documento: {candidate.fileName}</p>
                    </div>

                    <div className="mt-3 pt-2 border-t border-slate-100 flex justify-end">
                      <button
                        type="button"
                        onClick={(e) => handleDeleteCandidate(e, candidate.id)}
                        className="bg-red-50 text-red-600 hover:bg-red-600 hover:text-white border border-red-200 text-[11px] font-bold px-2.5 py-1 rounded transition-colors flex items-center space-x-1"
                      >
                        <span>🗑️</span>
                        <span>Eliminar</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* VISTA 3: SOLICITUDES (✉) */}
          {activeTab === 'solicitudes' && (
            <div className="space-y-6">
              <h2 className="text-center text-2xl font-light text-slate-700 mb-6">
                Solicitudes Recibidas de Empresas Clientes
              </h2>
              <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm text-center">
                <p className="text-sm text-slate-600">Bandeja para requerimientos y especificaciones directo de los clientes.</p>
              </div>
            </div>
          )}

          {/* VISTA 4: REPORTES (📊) */}
          {activeTab === 'reportes' && (
            <div className="space-y-6">
              <h2 className="text-center text-2xl font-light text-slate-700 mb-6">
                Métricas de la Base de Datos
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
                  <p className="text-xs text-slate-500 uppercase font-semibold">Total CVs Indexados</p>
                  <p className="text-3xl font-bold text-[#8cb800] mt-1">{candidates.length}</p>
                </div>
                <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
                  <p className="text-xs text-slate-500 uppercase font-semibold">Empresas Clientes Activas</p>
                  <p className="text-3xl font-bold text-slate-800 mt-1">{allClients.length}</p>
                </div>
              </div>
            </div>
          )}

          {/* VISTA 5: CONFIGURACIÓN (⚙) */}
          {activeTab === 'configuracion' && (
            <div className="space-y-6">
              <h2 className="text-center text-2xl font-light text-slate-700 mb-6">
                Configuración del Sistema
              </h2>
              <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm max-w-lg mx-auto space-y-3 text-xs">
                <div>
                  <label className="font-semibold text-slate-700 block">Estrategia de Asignación</label>
                  <input type="text" value="Match Geográfico y Experiencia por Empresa Cliente" disabled className="w-full border border-slate-200 rounded p-2 bg-slate-50 mt-1" />
                </div>
              </div>
            </div>
          )}

        </main>
      </div>

      {/* Modal Ficha del Candidato */}
      {selectedCandidate && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full border border-slate-200 shadow-2xl p-6">
            <div className="flex justify-between items-start border-b border-slate-100 pb-3 mb-3">
              <div>
                <h3 className="text-base font-bold text-slate-800">{selectedCandidate.name}</h3>
                <p className="text-xs text-slate-500 font-mono mt-0.5">{selectedCandidate.phone}</p>
              </div>
              <button onClick={() => setSelectedCandidate(null)} className="text-slate-400 hover:text-slate-600 text-sm font-bold">✕</button>
            </div>

            <div className="space-y-2 text-xs">
              <p><strong>ID Ficha:</strong> <span className="font-mono text-slate-500">{selectedCandidate.id}</span></p>
              <p><strong>Archivo CV:</strong> {selectedCandidate.fileName}</p>
              <p><strong>Fecha de Ingreso:</strong> {selectedCandidate.date}</p>
              
              {selectedCandidate.matchedOperativas && selectedCandidate.matchedOperativas.length > 0 && (
                <div className="mt-3 pt-2 border-t border-slate-100">
                  <p className="font-bold text-slate-700 mb-1.5">Empresas clientes compatibles:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedCandidate.matchedOperativas.map((cliente, i) => (
                      <span key={i} className="bg-emerald-50 text-emerald-800 text-[11px] px-2.5 py-1 rounded border border-emerald-200 font-semibold">
                        🏢 {cliente}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 pt-3 border-t border-slate-100 flex justify-between items-center">
              <button
                type="button"
                onClick={(e) => handleDeleteCandidate(e, selectedCandidate.id)}
                className="bg-red-600 hover:bg-red-700 text-white px-3.5 py-1.5 rounded text-xs font-bold transition-colors flex items-center space-x-1"
              >
                <span>🗑️</span>
                <span>Eliminar Candidato</span>
              </button>

              <button 
                type="button"
                onClick={() => setSelectedCandidate(null)} 
                className="bg-[#1f2937] hover:bg-black text-white px-4 py-1.5 rounded text-xs font-semibold"
              >
                Cerrar Ficha
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
