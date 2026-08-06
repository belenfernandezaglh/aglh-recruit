// app/page.tsx
'use 'client';

import React, { useState, useRef } from 'react';
import { 
  Users, 
  Search, 
  Upload,
  BookOpen,
  Building2,
  PhoneCall,
  UserCheck
} from 'lucide-react';
import { Candidate, GrupoOperativa } from '@/types';
import { OPERATIVAS_BASE, MANUAL_CARGOS_BASE } from '@/data/mockData';

export default function Home() {
  const [activeTab, setActiveTab] = useState<'operativas' | 'manual' | 'candidates'>('operativas');
  const [searchTerm, setSearchTerm] = useState('');
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
              <PhoneCall className="w-3.5 h-3.5" />
              <span>Operativas</span>
            </button>
            <button
              onClick={() => setActiveTab('manual')}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
                activeTab === 'manual' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Manual de Cargos</span>
            </button>
            <button
              onClick={() => setActiveTab('candidates')}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
                activeTab === 'candidates' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Candidatos ({candidates.length})</span>
            </button>
          </div>
          
          <button 
            onClick={handleUploadClick}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center space-x-2 transition-colors shadow-sm"
          >
            <Upload className="w-4 h-4" />
            <span>Cargar CVs</span>
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'operativas' && (
          <div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-6 flex justify-between items-center">
              <div className="relative w-96">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar cliente o número..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="text-xs text-slate-500 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-blue-600" />
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

        {activeTab === 'manual' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {MANUAL_CARGOS_BASE.map((cargo) => (
              <div key={cargo.id} className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                <span className="text-xs font-bold px-2.5 py-1 bg-slate-900 text-white rounded-md">
                  CARGO {cargo.id}
                </span>
                <h3 className="text-lg font-bold text-slate-900 mt-2">{cargo.title}</h3>
                <p className="text-xs text-slate-600 mt-2">{cargo.funcion}</p>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'candidates' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {candidates.length > 0 ? (
              candidates.map((candidate) => (
                <div key={candidate.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                  <div className="flex justify-between items-start">
                    <h4 className="font-bold text-slate-900">{candidate.name}</h4>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-700">
                      {candidate.status}
                    </span>
                  </div>
                  <p className="text-xs text-blue-600 font-medium mt-1">{candidate.position}</p>
                  <p className="text-xs text-slate-500 font-mono mt-1">{candidate.phone}</p>
                  {candidate.matchedOperativas.length > 0 && (
                    <div className="mt-3 pt-2 border-t border-slate-100">
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
              <div className="col-span-3 text-center py-12 text-slate-400">
                <UserCheck className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No hay candidatos cargados en el sistema.</p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
