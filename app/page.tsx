// app/page.tsx
'use client';

import React, { useState, useRef } from 'react';
import { Candidate, CandidateStatus, GrupoOperativa } from '../types';
import { OPERATIVAS_BASE, MANUAL_CARGOS_BASE } from '../data/mockData';

type ViewMode = 'busqueda' | 'candidates' | 'manual' | 'solicitudes' | 'reportes' | 'configuracion';

export default function Home() {
  const [activeTab, setActiveTab] = useState<ViewMode>('busqueda');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);
  
  // Filtros de Búsqueda de Talentos (Match por zona y experiencia)
  const [searchZone, setSearchZone] = useState('');
  const [searchExp, setSearchExp] = useState('');
  const [selectedCargoFilter, setSelectedCargoFilter] = useState('');
  
  // Drag & Drop y Modal
  const [isDragging, setIsDragging] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);

  const [operativas, setOperativas] = useState<GrupoOperativa[]>(OPERATIVAS_BASE);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  // Procesamiento de CVs para extracción e indexación en la Base
  const processFiles = (files: FileList | File[]) => {
    if (files && files.length > 0) {
      const newCandidates: Candidate[] = [];
      const updatedOperativas = [...operativas];

      const zonasMock = ['Montevideo (Centro)', 'Montevideo (Paso Carrasco)', 'Canelones (Ciudad de la Costa)', 'San José', 'Maldonado'];

      Array.from(files).forEach((file, index) => {
        const cleanName = file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");
        const fakePhone = `09${Math.floor(10000000 + Math.random() * 9000000)}`;
        const assignedZone = zonasMock[Math.floor(Math.random() * zonasMock.length)];
        
        let assignedCargo = '01'; 
        const lowerName = file.name.toLowerCase();
        
        if (lowerName.includes('limpieza') || lowerName.includes('auxiliar')) assignedCargo = '04';
        else if (lowerName.includes('deposito') || lowerName.includes('picker') || lowerName.includes('logistica')) assignedCargo = '03';
        else if (lowerName.includes('tecnico') || lowerName.includes('soldador')) assignedCargo = '07';
        else if (lowerName.includes('venta') || lowerName.includes('caja')) assignedCargo = '06';

        const matchedClienteNames: string[] = [];

        // Identificar compatibilidad con cuentas activas
        updatedOperativas.forEach(group => {
          group.cuentas.forEach(cuenta => {
            if (cuenta.cargoAsociado === assignedCargo) {
              cuenta.contactos.push(`${cleanName} (${assignedZone})`);
              matchedClienteNames.push(cuenta.cliente);
            }
          });
        });

        const initialCandidate: Candidate = {
          id: (Date.now() + index).toString(),
          name: cleanName,
          phone: fakePhone,
          position: MANUAL_CARGOS_BASE.find(c => c.id === assignedCargo)?.title || 'Operario General',
          status: 'NUEVO',
          fileName: file.name,
          date: new Date().toLocaleDateString('es-ES') + ' ' + new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
          matchedOperativas: matchedClienteNames
        };

        newCandidates.push(initialCandidate);
      });

      setCandidates((prev) => [...newCandidates, ...prev]);
      setOperativas(updatedOperativas);
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

  // Filtrado de candidatos para Match de Zona y Experiencia
  const candidatesMatch = candidates.filter(candidate => {
    const matchCargo = selectedCargoFilter === '' || candidate.position === selectedCargoFilter;
    const matchZone = searchZone === '' || candidate.name.toLowerCase().includes(searchZone.toLowerCase()) || candidate.fileName.toLowerCase().includes(searchZone.toLowerCase());
    const matchExp = searchExp === '' || candidate.position.toLowerCase().includes(searchExp.toLowerCase()) || candidate.fileName.toLowerCase().includes(searchExp.toLowerCase());

    return matchCargo && matchZone && matchExp;
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
            title="Búsqueda & Match"
          >
            <span className="text-base min-w-[24px] text-center">🔍</span>
            {!isSidebarCollapsed && <span className="text-xs ml-3 truncate">Búsqueda & Match</span>}
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
            onClick={() => setActiveTab('manual')}
            className={`w-full h-10 rounded-lg flex items-center px-3 transition-colors ${
              activeTab === 'manual' ? 'bg-[#8cb800] text-white font-bold' : 'text-slate-300 hover:bg-slate-700/60'
            }`}
            title="Manual de Cargos"
          >
            <span className="text-base min-w-[24px] text-center">🏷</span>
            {!isSidebarCollapsed && <span className="text-xs ml-3 truncate">Manual de Cargos</span>}
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
                Base de Datos & Abastecimiento Preventivo
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

        {/* Bar Superior de Estado de la Banco de Talentos */}
        <div className="bg-white border-b border-slate-200 px-8 py-2.5 flex justify-between items-center text-xs text-slate-600">
          <div className="flex space-x-8">
            <div>Total CVs Indexados: <strong className="text-slate-900">{candidates.length}</strong></div>
            <div>Compatibles Activos: <strong className="text-[#8cb800]">{candidatesMatch.length}</strong></div>
          </div>
          <span className="text-slate-400 text-[11px]">Servicios Humanos Integrales</span>
        </div>

        <main className="p-8 max-w-6xl mx-auto w-full">
          
          {/* VISTA 1: BÚSQUEDA Y MATCH POR ZONA Y EXPERIENCIA (🔍) */}
          {activeTab === 'busqueda' && (
            <div className="space-y-6">
              <div className="text-center max-w-2xl mx-auto mb-6">
                <h2 className="text-2xl font-light text-slate-700">Filtro de Compatibilidad de Talentos</h2>
                <p className="text-xs text-slate-500 mt-1">
                  Encontrá rápidamente candidatos según su zona de residencia, experiencia comprobada y especialidad laboral.
                </p>
              </div>

              {/* Panel de Filtros Inteligentes */}
              <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Zona / Lugar de residencia</label>
                  <input
                    type="text"
                    placeholder="Ej: Montevideo, Paso Carrasco, Canelones..."
                    value={searchZone}
                    onChange={(e) => setSearchZone(e.target.value)}
                    className="w-full border border-slate-300 rounded p-2 text-xs focus:outline-none focus:border-[#8cb800]"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Experiencia / Palabra Clave</label>
                  <input
                    type="text"
                    placeholder="Ej: Depósito, Operario, Limpieza, Ventas..."
                    value={searchExp}
                    onChange={(e) => setSearchExp(e.target.value)}
                    className="w-full border border-slate-300 rounded p-2 text-xs focus:outline-none focus:border-[#8cb800]"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Cargo Objetivo</label>
                  <select
                    value={selectedCargoFilter}
                    onChange={(e) => setSelectedCargoFilter(e.target.value)}
                    className="w-full border border-slate-300 rounded p-2 text-xs focus:outline-none focus:border-[#8cb800]"
                  >
                    <option value="">Todos los cargos</option>
                    {MANUAL_CARGOS_BASE.map(cargo => (
                      <option key={cargo.id} value={cargo.title}>{cargo.title}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Resultados de Coincidencia */}
              <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                <h3 className="text-xs font-bold text-slate-700 mb-3 uppercase tracking-wider">
                  Candidatos Compatibles ({candidatesMatch.length})
                </h3>

                {candidatesMatch.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {candidatesMatch.map((candidate) => (
                      <div 
                        key={candidate.id}
                        onClick={() => setSelectedCandidate(candidate)}
                        className="p-4 border border-slate-200 rounded-lg hover:border-[#8cb800] cursor-pointer transition-colors bg-slate-50/50"
                      >
                        <div className="flex justify-between items-start">
                          <h4 className="font-bold text-xs text-slate-800">{candidate.name}</h4>
                          <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${getStatusBadgeStyle(candidate.status)}`}>
                            {candidate.status}
                          </span>
                        </div>
                        <p className="text-xs text-[#8cb800] font-semibold mt-1">{candidate.position}</p>
                        <p className="text-xs text-slate-500 mt-2">
                          <strong>Tel:</strong> <span className="font-mono">{candidate.phone}</span>
                        </p>
                        <div className="mt-3 pt-2 border-t border-slate-200/60 flex justify-between items-center text-[11px] text-slate-500">
                          <span>📄 {candidate.fileName}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-400 text-xs">
                    No se encontraron perfiles que coincidan con los filtros aplicados o no se han cargado CVs aún.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* VISTA 2: BASE GENERAL DE CVs (👤) */}
          {activeTab === 'candidates' && (
            <div className="space-y-6">
              <h2 className="text-center text-2xl font-light text-slate-700 mb-6">
                Base General de CVs Procesados
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {candidates.map((candidate) => (
                  <div 
                    key={candidate.id}
                    onClick={() => setSelectedCandidate(candidate)}
                    className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm hover:border-[#8cb800] cursor-pointer transition-colors"
                  >
                    <h4 className="font-bold text-xs text-slate-800">{candidate.name}</h4>
                    <p className="text-xs text-[#8cb800] font-semibold mt-1">{candidate.position}</p>
                    <p className="text-xs text-slate-500 font-mono mt-1">{candidate.phone}</p>
                    <p className="text-[10px] text-slate-400 mt-2">Ingresado: {candidate.date}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* VISTA 3: MANUAL DE CARGOS (🏷) */}
          {activeTab === 'manual' && (
            <div className="space-y-6">
              <h2 className="text-center text-2xl font-light text-slate-700 mb-6">
                Manual de Cargos
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {MANUAL_CARGOS_BASE.map((cargo) => (
                  <div key={cargo.id} className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm hover:border-[#8cb800]">
                    <span className="text-[10px] font-bold text-[#8cb800] uppercase">Código {cargo.id}</span>
                    <h3 className="font-bold text-slate-800 text-sm mt-1">{cargo.title}</h3>
                    <p className="text-xs text-slate-600 mt-2 leading-relaxed">{cargo.funcion}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* VISTA 4: SOLICITUDES (✉) */}
          {activeTab === 'solicitudes' && (
            <div className="space-y-6">
              <h2 className="text-center text-2xl font-light text-slate-700 mb-6">
                Solicitudes de Demanda de Clientes
              </h2>
              <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm text-center">
                <p className="text-sm text-slate-600">Bandeja para recibir solicitudes directas de empresas clientes.</p>
              </div>
            </div>
          )}

          {/* VISTA 5: REPORTES (📊) */}
          {activeTab === 'reportes' && (
            <div className="space-y-6">
              <h2 className="text-center text-2xl font-light text-slate-700 mb-6">
                Estadísticas del Banco de CVs
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
                  <p className="text-xs text-slate-500 uppercase font-semibold">Total CVs Indexados</p>
                  <p className="text-3xl font-bold text-[#8cb800] mt-1">{candidates.length}</p>
                </div>
                <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
                  <p className="text-xs text-slate-500 uppercase font-semibold">Perfil más recurrente</p>
                  <p className="text-xl font-bold text-slate-800 mt-1">Operario de Depósito / Logística</p>
                </div>
              </div>
            </div>
          )}

          {/* VISTA 6: CONFIGURACIÓN (⚙) */}
          {activeTab === 'configuracion' && (
            <div className="space-y-6">
              <h2 className="text-center text-2xl font-light text-slate-700 mb-6">
                Configuración del Sistema
              </h2>
              <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm max-w-lg mx-auto space-y-3 text-xs">
                <div>
                  <label className="font-semibold text-slate-700 block">Modo de Operación</label>
                  <input type="text" value="Base de Datos y Match Preventivo" disabled className="w-full border border-slate-200 rounded p-2 bg-slate-50 mt-1" />
                </div>
              </div>
            </div>
          )}

        </main>
      </div>

      {/* Modal Ficha de Candidato */}
      {selectedCandidate && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full border border-slate-200 shadow-2xl p-6">
            <div className="flex justify-between items-start border-b border-slate-100 pb-3 mb-3">
              <div>
                <h3 className="text-base font-bold text-slate-800">{selectedCandidate.name}</h3>
                <p className="text-xs text-[#8cb800] font-semibold">{selectedCandidate.position}</p>
              </div>
              <button onClick={() => setSelectedCandidate(null)} className="text-slate-400 hover:text-slate-600 text-sm font-bold">✕</button>
            </div>

            <div className="space-y-2 text-xs">
              <p><strong>Teléfono:</strong> <span className="font-mono">{selectedCandidate.phone}</span></p>
              <p><strong>Archivo CV:</strong> {selectedCandidate.fileName}</p>
              <p><strong>Fecha de alta:</strong> {selectedCandidate.date}</p>
              
              {selectedCandidate.matchedOperativas && selectedCandidate.matchedOperativas.length > 0 && (
                <div className="mt-3 pt-2 border-t border-slate-100">
                  <p className="font-bold text-slate-700 mb-1">Cuentas/Clientes donde tiene alta compatibilidad:</p>
                  <div className="flex flex-wrap gap-1">
                    {selectedCandidate.matchedOperativas.map((c, i) => (
                      <span key={i} className="bg-emerald-50 text-emerald-800 text-[10px] px-2 py-0.5 rounded border border-emerald-200">
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-5 pt-3 border-t border-slate-100 flex justify-end">
              <button onClick={() => setSelectedCandidate(null)} className="bg-[#1f2937] text-white px-4 py-1.5 rounded text-xs font-semibold">
                Cerrar Ficha
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
