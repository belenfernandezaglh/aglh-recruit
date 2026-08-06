// app/page.tsx
'use client';

import React, { useState, useRef } from 'react';
import { Candidate, CandidateStatus, GrupoOperativa } from '../types';
import { OPERATIVAS_BASE, MANUAL_CARGOS_BASE } from '../data/mockData';

type ViewMode = 'operativas' | 'manual' | 'candidates' | 'solicitudes' | 'reportes' | 'configuracion';

export default function Home() {
  const [activeTab, setActiveTab] = useState<ViewMode>('operativas');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);
  
  // Estados para búsqueda y filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [manualSearchTerm, setManualSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('TODOS');
  
  // Drag & Drop y Modal
  const [isDragging, setIsDragging] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);

  const [operativas, setOperativas] = useState<GrupoOperativa[]>(OPERATIVAS_BASE);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Métricas
  const totalVacantes = operativas.reduce((acc, group) => 
    acc + group.cuentas.reduce((cAcc, cuenta) => cAcc + cuenta.vacantes, 0), 0);
  
  const totalCubiertas = operativas.reduce((acc, group) => 
    acc + group.cuentas.reduce((cAcc, cuenta) => cAcc + Math.min(cuenta.contactos.length, cuenta.vacantes), 0), 0);

  const porcentajeAbastecimiento = totalVacantes > 0 ? Math.round((totalCubiertas / totalVacantes) * 100) : 0;

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const processFiles = (files: FileList | File[]) => {
    if (files && files.length > 0) {
      const newCandidates: Candidate[] = [];
      const updatedOperativas = [...operativas];

      Array.from(files).forEach((file, index) => {
        const cleanName = file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");
        const fakePhone = `09${Math.floor(10000000 + Math.random() * 9000000)}`;
        
        let assignedCargo = '01'; 
        const lowerName = file.name.toLowerCase();
        
        if (lowerName.includes('limpieza') || lowerName.includes('auxiliar')) assignedCargo = '04';
        else if (lowerName.includes('deposito') || lowerName.includes('picker')) assignedCargo = '03';
        else if (lowerName.includes('tecnico') || lowerName.includes('soldador')) assignedCargo = '07';
        else if (lowerName.includes('venta') || lowerName.includes('caja')) assignedCargo = '06';

        const matchedClienteNames: string[] = [];

        updatedOperativas.forEach(group => {
          group.cuentas.forEach(cuenta => {
            if (cuenta.cargoAsociado === assignedCargo) {
              cuenta.contactos.push(`${fakePhone} — ${cleanName}`);
              matchedClienteNames.push(cuenta.cliente);
            }
          });
        });

        const initialCandidate: Candidate = {
          id: (Date.now() + index).toString(),
          name: cleanName,
          phone: fakePhone,
          position: MANUAL_CARGOS_BASE.find(c => c.id === assignedCargo)?.title || 'Operario',
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

  const handleStatusChange = (candidateId: string, newStatus: CandidateStatus) => {
    setCandidates((prev) =>
      prev.map((c) => (c.id === candidateId ? { ...c, status: newStatus } : c))
    );
    if (selectedCandidate && selectedCandidate.id === candidateId) {
      setSelectedCandidate((prev) => prev ? { ...prev, status: newStatus } : null);
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

  const filteredCargos = MANUAL_CARGOS_BASE.filter(cargo => 
    cargo.title.toLowerCase().includes(manualSearchTerm.toLowerCase()) ||
    cargo.funcion.toLowerCase().includes(manualSearchTerm.toLowerCase()) ||
    cargo.id.includes(manualSearchTerm)
  );

  const filteredCandidates = candidates.filter(candidate => {
    if (statusFilter === 'TODOS') return true;
    return candidate.status === statusFilter;
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
            <p className="text-xl font-bold text-slate-800">Suelta los CVs aquí para procesar</p>
            <p className="text-xs text-slate-500 mt-1">Soporta documentos PDF, DOC y DOCX</p>
          </div>
        </div>
      )}

      {/* Sidebar Dinámico Interactiva */}
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
            <span className="text-xs font-bold text-slate-400 tracking-wider uppercase pr-2">Menú</span>
          )}
        </div>

        <nav className="flex-1 space-y-1.5 px-2 mt-4">
          {/* Solicitudes */}
          <button
            onClick={() => setActiveTab('solicitudes')}
            className={`w-full h-10 rounded-lg flex items-center px-3 transition-colors ${
              activeTab === 'solicitudes' ? 'bg-[#8cb800] text-white font-bold' : 'text-slate-300 hover:bg-slate-700/60'
            }`}
            title="Solicitudes"
          >
            <span className="text-base min-w-[24px] text-center">✉</span>
            {!isSidebarCollapsed && <span className="text-xs ml-3 truncate">Solicitudes</span>}
          </button>

          {/* Manual de Cargos */}
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

          {/* Postulantes */}
          <button
            onClick={() => setActiveTab('candidates')}
            className={`w-full h-10 rounded-lg flex items-center px-3 transition-colors ${
              activeTab === 'candidates' ? 'bg-[#8cb800] text-white font-bold' : 'text-slate-300 hover:bg-slate-700/60'
            }`}
            title="Postulantes"
          >
            <span className="text-base min-w-[24px] text-center">👤</span>
            {!isSidebarCollapsed && <span className="text-xs ml-3 truncate">Postulantes</span>}
          </button>

          {/* Abastecimiento / Operativas */}
          <button
            onClick={() => setActiveTab('operativas')}
            className={`w-full h-10 rounded-lg flex items-center px-3 transition-colors ${
              activeTab === 'operativas' ? 'bg-[#8cb800] text-white font-bold' : 'text-slate-300 hover:bg-slate-700/60'
            }`}
            title="Abastecimiento"
          >
            <span className="text-base min-w-[24px] text-center">💼</span>
            {!isSidebarCollapsed && <span className="text-xs ml-3 truncate">Abastecimiento</span>}
          </button>

          {/* Métricas / Reportes */}
          <button
            onClick={() => setActiveTab('reportes')}
            className={`w-full h-10 rounded-lg flex items-center px-3 transition-colors ${
              activeTab === 'reportes' ? 'bg-[#8cb800] text-white font-bold' : 'text-slate-300 hover:bg-slate-700/60'
            }`}
            title="Reportes"
          >
            <span className="text-base min-w-[24px] text-center">📊</span>
            {!isSidebarCollapsed && <span className="text-xs ml-3 truncate">Reportes & KPIs</span>}
          </button>

          {/* Ajustes */}
          <button
            onClick={() => setActiveTab('configuracion')}
            className={`w-full h-10 rounded-lg flex items-center px-3 transition-colors ${
              activeTab === 'configuracion' ? 'bg-[#8cb800] text-white font-bold' : 'text-slate-300 hover:bg-slate-700/60'
            }`}
            title="Configuración"
          >
            <span className="text-base min-w-[24px] text-center">⚙</span>
            {!isSidebarCollapsed && <span className="text-xs ml-3 truncate">Configuración</span>}
          </button>
        </nav>
      </aside>

      {/* Contenido Principal */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Banner Superior Verde AGLH */}
        <header className="bg-[#8cb800] text-white h-16 px-6 flex items-center justify-between shadow-sm">
          <div className="flex items-center space-x-3">
            <div className="font-extrabold text-2xl tracking-tight text-white flex items-center">
              <span>aglh</span>
              <span className="text-[10px] font-normal tracking-normal ml-2 hidden sm:inline-block border-l border-white/40 pl-2">
                SERVICIOS HUMANOS INTEGRALES
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <span className="text-xs font-semibold bg-white/20 px-3 py-1 rounded-full uppercase tracking-wider">
              {activeTab}
            </span>
            <button 
              onClick={handleUploadClick}
              className="bg-[#1f2937] hover:bg-black text-white px-4 py-1.5 rounded-lg text-xs font-bold transition-colors shadow-sm"
            >
              + Cargar CVs
            </button>
          </div>
        </header>

        {/* Bar de KPIs Superior */}
        <div className="bg-white border-b border-slate-200 px-8 py-2.5 flex justify-between items-center text-xs text-slate-600">
          <div className="flex space-x-8">
            <div>Total Vacantes: <strong className="text-slate-900">{totalVacantes}</strong></div>
            <div>Postulantes Asignados: <strong className="text-[#8cb800]">{totalCubiertas}</strong></div>
            <div>Nivel Cobertura: <strong className="text-slate-900">{porcentajeAbastecimiento}%</strong></div>
          </div>
          <span className="text-slate-400 text-[11px]">Panel Interno / Outsourcing</span>
        </div>

        {/* Vista dinámica según selección de la Sidebar */}
        <main className="p-8 max-w-6xl mx-auto w-full">
          
          {/* VISTA 1: ABASTECIMIENTO / OPERATIVAS (💼) */}
          {activeTab === 'operativas' && (
            <div className="space-y-6">
              <h2 className="text-center text-2xl font-light text-slate-700 mb-6">
                Lista de abastecimiento de Talentos
              </h2>

              <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                <label className="text-xs text-[#8cb800] font-semibold block mb-1">Operativa / Cliente</label>
                <input
                  type="text"
                  placeholder="Filtrar por cliente..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full border border-slate-300 rounded p-2 text-sm focus:outline-none focus:border-[#8cb800]"
                />
              </div>

              {operativas.map((group, gIdx) => (
                <div key={gIdx} className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden mb-6">
                  <div className="bg-slate-50 border-b border-slate-200 px-4 py-3 font-semibold text-xs text-slate-700 uppercase tracking-wider flex justify-between">
                    <span>Ejecutivo: {group.ejecutivo}</span>
                    <span>{group.cuentas.length} Cuentas</span>
                  </div>

                  <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {group.cuentas
                      .filter(c => c.cliente.toLowerCase().includes(searchTerm.toLowerCase()))
                      .map((cuenta) => {
                        const isCovered = cuenta.contactos.length >= cuenta.vacantes;
                        return (
                          <div key={cuenta.id} className="border border-slate-200 rounded p-3 bg-white hover:border-[#8cb800] transition-colors">
                            <div className="flex justify-between items-center mb-2 pb-1 border-b border-slate-100">
                              <span className="font-bold text-xs text-slate-800">{cuenta.cliente}</span>
                              <span className={`text-[10px] px-2 py-0.5 rounded font-semibold ${
                                isCovered ? 'bg-[#8cb800]/15 text-[#8cb800]' : 'bg-amber-100 text-amber-800'
                              }`}>
                                {cuenta.contactos.length} / {cuenta.vacantes}
                              </span>
                            </div>

                            <div className="space-y-1">
                              {cuenta.contactos.length > 0 ? (
                                cuenta.contactos.map((contacto, idx) => (
                                  <p key={idx} className="text-xs text-slate-600 font-mono truncate">
                                    • {contacto}
                                  </p>
                                ))
                              ) : (
                                <p className="text-xs text-slate-400 italic">Sin postulantes...</p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* VISTA 2: MANUAL DE CARGOS (🏷) */}
          {activeTab === 'manual' && (
            <div className="space-y-6">
              <h2 className="text-center text-2xl font-light text-slate-700 mb-6">
                Manual de Cargos
              </h2>

              <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                <input
                  type="text"
                  placeholder="Buscar por código, título o descripción..."
                  value={manualSearchTerm}
                  onChange={(e) => setManualSearchTerm(e.target.value)}
                  className="w-full border border-slate-300 rounded p-2 text-sm focus:outline-none focus:border-[#8cb800]"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredCargos.map((cargo) => (
                  <div key={cargo.id} className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm hover:border-[#8cb800]">
                    <span className="text-[10px] font-bold text-[#8cb800] uppercase">Código {cargo.id}</span>
                    <h3 className="font-bold text-slate-800 text-sm mt-1">{cargo.title}</h3>
                    <p className="text-xs text-slate-600 mt-2 leading-relaxed">{cargo.funcion}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* VISTA 3: POSTULANTES (👤) */}
          {activeTab === 'candidates' && (
            <div className="space-y-6">
              <h2 className="text-center text-2xl font-light text-slate-700 mb-6">
                Base General de Candidatos
              </h2>

              <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm flex justify-between items-center">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-700 focus:outline-none focus:border-[#8cb800]"
                >
                  <option value="TODOS">Todas las etapas</option>
                  <option value="NUEVO">NUEVO</option>
                  <option value="EVALUACION">EVALUACIÓN</option>
                  <option value="ENTREVISTA">ENTREVISTA</option>
                  <option value="SELECCIONADO">SELECCIONADO</option>
                </select>
                <span className="text-xs text-slate-500">{filteredCandidates.length} Candidatos registrados</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {filteredCandidates.map((candidate) => (
                  <div 
                    key={candidate.id}
                    onClick={() => setSelectedCandidate(candidate)}
                    className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm hover:border-[#8cb800] cursor-pointer transition-colors"
                  >
                    <div className="flex justify-between items-start">
                      <h4 className="font-bold text-xs text-slate-800">{candidate.name}</h4>
                      <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${getStatusBadgeStyle(candidate.status)}`}>
                        {candidate.status}
                      </span>
                    </div>
                    <p className="text-xs text-[#8cb800] font-semibold mt-1">{candidate.position}</p>
                    <p className="text-xs text-slate-500 font-mono mt-1">{candidate.phone}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* VISTA 4: SOLICITUDES (✉) */}
          {activeTab === 'solicitudes' && (
            <div className="space-y-6">
              <h2 className="text-center text-2xl font-light text-slate-700 mb-6">
                Bandeja de Solicitudes de Personal
              </h2>
              <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm text-center">
                <p className="text-sm text-slate-600 mb-4">No hay nuevas solicitudes pendientes de revisión por parte de los clientes.</p>
                <button 
                  onClick={() => setActiveTab('operativas')}
                  className="bg-[#8cb800] text-white text-xs px-4 py-2 rounded font-bold"
                >
                  Ir a Mesa de Abastecimiento
                </button>
              </div>
            </div>
          )}

          {/* VISTA 5: REPORTES (📊) */}
          {activeTab === 'reportes' && (
            <div className="space-y-6">
              <h2 className="text-center text-2xl font-light text-slate-700 mb-6">
                Indicadores y Reportes
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
                  <p className="text-xs text-slate-500 uppercase font-semibold">Vacantes Requeridas</p>
                  <p className="text-2xl font-bold text-slate-800 mt-1">{totalVacantes}</p>
                </div>
                <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
                  <p className="text-xs text-slate-500 uppercase font-semibold">Candidatos Asignados</p>
                  <p className="text-2xl font-bold text-[#8cb800] mt-1">{totalCubiertas}</p>
                </div>
                <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
                  <p className="text-xs text-slate-500 uppercase font-semibold">Porcentaje de Cobertura</p>
                  <p className="text-2xl font-bold text-blue-600 mt-1">{porcentajeAbastecimiento}%</p>
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
              <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm max-w-lg mx-auto space-y-4">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block">Nombre del Portal</label>
                  <input type="text" value="AGLH Recruit" disabled className="w-full border border-slate-200 rounded p-2 text-xs bg-slate-50 mt-1" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block">Unidad de Negocio</label>
                  <input type="text" value="Outsourcing & Selección de Personal" disabled className="w-full border border-slate-200 rounded p-2 text-xs bg-slate-50 mt-1" />
                </div>
              </div>
            </div>
          )}

        </main>
      </div>

      {/* Modal Expediente de Candidato */}
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
              <p><strong>Documento:</strong> {selectedCandidate.fileName}</p>
              <p><strong>Fecha:</strong> {selectedCandidate.date}</p>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-100 flex justify-end">
              <button onClick={() => setSelectedCandidate(null)} className="bg-[#1f2937] text-white px-4 py-1.5 rounded text-xs font-semibold">
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
