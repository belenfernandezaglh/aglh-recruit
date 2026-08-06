// app/page.tsx
'use client';

import React, { useState, useRef } from 'react';
import { 
  Users, 
  Search, 
  Upload,
  BookOpen,
  Building2,
  PhoneCall,
  UserCheck,
  Filter
} from '../types'; // Mantenemos importaciones directas
import { Candidate, CandidateStatus, GrupoOperativa } from '../types';
import { OPERATIVAS_BASE, MANUAL_CARGOS_BASE } from '../data/mockData';

export default function Home() {
  const [activeTab, setActiveTab] = useState<'operativas' | 'manual' | 'candidates'>('operativas');
  
  // Estados para búsqueda y filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [manualSearchTerm, setManualSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('TODOS');
  
  const [operativas, setOperativas] = useState<GrupoOperativa[]>(OPERATIVAS_BASE);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
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

        newCandidates.push({
          id: (Date.now() + index).toString(),
          name: cleanName,
          phone: fakePhone,
          position: MANUAL_CARGOS_BASE.find(c => c.id === assignedCargo)?.title || 'Operario',
          status: 'NUEVO',
          fileName: file.name,
          date: new Date().toLocaleDateString('es-ES'),
          matchedOperativas: matchedClienteNames
        });
      });

      setCandidates((prev) => [...newCandidates, ...prev]);
      setOperativas(updatedOperativas);
      event.target.value = '';
    }
  };

  // Cambiar estado de un candidato individual
  const handleStatusChange = (candidateId: string, newStatus: CandidateStatus) => {
    setCandidates((prev) =>
      prev.map((c) => (c.id === candidateId ? { ...c, status: newStatus } : c))
    );
  };

  // Helper de estilos por estado
  const getStatusBadgeStyle = (status: CandidateStatus) => {
    switch (status) {
      case 'NUEVO':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'EVALUACION':
        return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'ENTREVISTA':
        return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'SELECCIONADO':
        return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  // Filtrado de cargos por palabra clave
  const filteredCargos = MANUAL_CARGOS_BASE.filter(cargo => 
    cargo.title.toLowerCase().includes(manualSearchTerm.toLowerCase()) ||
    cargo.funcion.toLowerCase().includes(manualSearchTerm.toLowerCase()) ||
    cargo.id.includes(manualSearchTerm)
  );

  // Filtrado de candidatos por estado
  const filteredCandidates = candidates.filter(candidate => {
    if (statusFilter === 'TODOS') return true;
    return candidate.status === statusFilter;
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        accept=".pdf,.doc,.docx" 
        multiple 
        className="hidden" 
      />

      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-blue-600 text-white p-2 rounded-lg font-bold text-xl">
              AGLH
            </div>
            <div>
              <h1 className="font-bold text-lg text-slate-900 leading-tight">AGLH Recruit</h1>
              <p className="text-xs text-slate-500">Mesa de Operaciones & Reclutamiento Outsourcing</p>
            </div>
          </div>

          <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
            <button
              onClick={() => setActiveTab('operativas')}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
                activeTab === 'operativas' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600'
              }`}
            >
              <span>Operativas</span>
            </button>
            <button
              onClick={() => setActiveTab('manual')}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
                activeTab === 'manual' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600'
              }`}
            >
              <span>Manual de Cargos</span>
            </button>
            <button
              onClick={() => setActiveTab('candidates')}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
                activeTab === 'candidates' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600'
              }`}
            >
              <span>Candidatos ({candidates.length})</span>
            </button>
          </div>
          
          <button 
            onClick={handleUploadClick}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center space-x-2 transition-colors shadow-sm"
          >
            <span>Cargar CVs</span>
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* VISTA OPERATIVAS */}
        {activeTab === 'operativas' && (
          <div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-6 flex justify-between items-center">
              <div className="relative w-96">
                <input
                  type="text"
                  placeholder="Buscar cliente o número..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-4 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="text-xs text-slate-500 flex items-center gap-2">
                <span>Abastecimiento dinámico basado en lectura de CVs</span>
              </div>
            </div>

            {operativas.map((group, gIdx) => (
              <div key={gIdx} className="mb-8">
                <div className="bg-slate-900 text-white p-3 rounded-t-xl font-bold text-sm flex justify-between items-center">
                  <span>EJECUTIVO DE CUENTA: {group.ejecutivo}</span>
                  <span className="text-xs text-slate-400">{group.cuentas.length} Clientes Asignados</span>
                </div>
                
                <div className="bg-white border border-t-0 border-slate-200 rounded-b-xl shadow-sm p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {group.cuentas
                    .filter(c => c.cliente.toLowerCase().includes(searchTerm.toLowerCase()))
                    .map((cuenta) => {
                      const isCovered = cuenta.contactos.length >= cuenta.vacantes;
                      return (
                        <div key={cuenta.id} className="border border-slate-200 rounded-lg p-3.5 hover:border-blue-300 transition-colors bg-slate-50/50">
                          <div className="border-b border-slate-200 pb-2 mb-2">
                            <div className="flex justify-between items-center">
                              <span className="font-bold text-sm text-slate-900 truncate">{cuenta.cliente}</span>
                              <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                                isCovered ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                              }`}>
                                {cuenta.contactos.length} / {cuenta.vacantes} Vacantes
                              </span>
                            </div>
                          </div>
                          
                          <div className="space-y-1 max-h-48 overflow-y-auto">
                            {cuenta.contactos.length > 0 ? (
                              cuenta.contactos.map((contacto, numIdx) => (
                                <div key={numIdx} className="text-xs text-slate-700 font-mono flex items-center space-x-1.5">
                                  <span className="text-emerald-500 font-bold">•</span>
                                  <span>{contacto}</span>
                                </div>
                              ))
                            ) : (
                              <p className="text-xs text-slate-400 italic py-2">
                                Sin postulantes compatibles cargados...
                              </p>
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

        {/* VISTA MANUAL DE CARGOS */}
        {activeTab === 'manual' && (
          <div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-6 flex justify-between items-center">
              <div className="relative w-96">
                <input
                  type="text"
                  placeholder="Buscar por cargo, tareas o palabra clave..."
                  value={manualSearchTerm}
                  onChange={(e) => setManualSearchTerm(e.target.value)}
                  className="w-full pl-4 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <span className="text-xs text-slate-500">
                Mostrando {filteredCargos.length} de {MANUAL_CARGOS_BASE.length} cargos
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredCargos.map((cargo) => (
                <div key={cargo.id} className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm hover:border-blue-300 transition-colors">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-bold px-2.5 py-1 bg-slate-900 text-white rounded-md">
                      CARGO {cargo.id}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">{cargo.title}</h3>
                  <p className="text-xs text-slate-600 mt-2 leading-relaxed">{cargo.funcion}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* VISTA CANDIDATOS */}
        {activeTab === 'candidates' && (
          <div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-6 flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-medium text-slate-600">Filtrar por estado:</span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="border border-slate-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="TODOS">Todos los estados</option>
                  <option value="NUEVO">NUEVO</option>
                  <option value="EVALUACION">EVALUACIÓN</option>
                  <option value="ENTREVISTA">ENTREVISTA</option>
                  <option value="SELECCIONADO">SELECCIONADO</option>
                </select>
              </div>
              <span className="text-xs text-slate-500">
                Total: {filteredCandidates.length} candidatos
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {filteredCandidates.length > 0 ? (
                filteredCandidates.map((candidate) => (
                  <div key={candidate.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-bold text-slate-900 text-sm">{candidate.name}</h4>
                        <select
                          value={candidate.status}
                          onChange={(e) => handleStatusChange(candidate.id, e.target.value as CandidateStatus)}
                          className={`text-[10px] font-bold px-2 py-0.5 rounded border ${getStatusBadgeStyle(candidate.status)} focus:outline-none cursor-pointer`}
                        >
                          <option value="NUEVO">NUEVO</option>
                          <option value="EVALUACION">EVALUACIÓN</option>
                          <option value="ENTREVISTA">ENTREVISTA</option>
                          <option value="SELECCIONADO">SELECCIONADO</option>
                        </select>
                      </div>
                      <p className="text-xs text-blue-600 font-medium">{candidate.position}</p>
                      <p className="text-xs text-slate-500 font-mono mt-1">{candidate.phone}</p>
                    </div>

                    {candidate.matchedOperativas.length > 0 && (
                      <div className="mt-4 pt-3 border-t border-slate-100">
                        <span className="text-[10px] text-slate-400 font-medium block mb-1">Operativas asignadas:</span>
                        <div className="flex flex-wrap gap-1">
                          {candidate.matchedOperativas.map((op, idx) => (
                            <span key={idx} className="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">
                              {op}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="col-span-3 text-center py-12 text-slate-400 bg-white rounded-xl border border-slate-200">
                  <p className="text-sm">No se encontraron candidatos con el filtro seleccionado.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
