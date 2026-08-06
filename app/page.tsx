// app/page.tsx
'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Candidate, CandidateStatus, GrupoOperativa } from '../types';
import { OPERATIVAS_BASE } from '../data/mockData';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

type ViewMode = 'busqueda' | 'candidates' | 'solicitudes' | 'reportes' | 'configuracion';

export default function Home() {
  const [activeTab, setActiveTab] = useState<ViewMode>('busqueda');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);
  
  const [searchZone, setSearchZone] = useState('');
  const [searchExp, setSearchExp] = useState('');
  const [selectedClientFilter, setSelectedClientFilter] = useState('');
  
  const [isDragging, setIsDragging] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);

  const [operativas, setOperativas] = useState<GrupoOperativa[]>(OPERATIVAS_BASE);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchCandidates();
  }, []);

  const fetchCandidates = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('candidates')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error Supabase Fetch:', error.message);
      } else if (data) {
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
      console.error('Error de conexión:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCandidate = async (e: React.MouseEvent, candidateId: string) => {
    e.stopPropagation();

    if (!candidateId) {
      alert('Error: ID no válido.');
      return;
    }

    if (!confirm('¿Eliminar definitivamente esta ficha de Supabase?')) return;

    // Actualización optimista de UI
    setCandidates((prev) => prev.filter((c) => String(c.id) !== String(candidateId)));
    if (selectedCandidate && String(selectedCandidate.id) === String(candidateId)) {
      setSelectedCandidate(null);
    }

    const { error } = await supabase
      .from('candidates')
      .delete()
      .eq('id', candidateId);

    if (error) {
      alert(`Error al eliminar en base de datos: ${error.message}`);
      fetchCandidates(); // Revertir si hubo error en servidor
    }
  };

  const allClients = Array.from(
    new Set(operativas.flatMap(group => group.cuentas.map(c => c.cliente)))
  );

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

        newCandidatesToInsert.push({
          name: cleanName,
          phone: fakePhone,
          position: 'Postulante General',
          status: 'NUEVO',
          file_name: file.name,
          matched_operativas: matchedClienteNames.slice(0, 2)
        });
      });

      const { data, error } = await supabase
        .from('candidates')
        .insert(newCandidatesToInsert)
        .select();

      if (error) {
        alert(`Error al guardar en Supabase: ${error.message}`);
      } else if (data) {
        fetchCandidates(); // Recargar datos guardados
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processFiles(e.target.files);
      e.target.value = '';
    }
  };

  const candidatesMatch = candidates.filter(candidate => {
    const matchClient = selectedClientFilter === '' || candidate.matchedOperativas?.includes(selectedClientFilter);
    const matchZone = searchZone === '' || candidate.name.toLowerCase().includes(searchZone.toLowerCase()) || candidate.fileName.toLowerCase().includes(searchZone.toLowerCase());
    const matchExp = searchExp === '' || candidate.fileName.toLowerCase().includes(searchExp.toLowerCase());
    return matchClient && matchZone && matchExp;
  });

  return (
    <div className="min-h-screen bg-[#f3f4f6] text-slate-800 flex"
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
      onDrop={(e) => { e.preventDefault(); setIsDragging(false); if (e.dataTransfer.files) processFiles(e.dataTransfer.files); }}
    >
      <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".pdf,.doc,.docx" multiple className="hidden" />

      {isDragging && (
        <div className="fixed inset-0 bg-[#8cb800]/20 backdrop-blur-sm border-4 border-dashed border-[#8cb800] z-50 flex items-center justify-center pointer-events-none">
          <div className="bg-white p-8 rounded-2xl shadow-2xl text-center">
            <p className="text-xl font-bold text-slate-800">Suelte los CVs para guardar</p>
          </div>
        </div>
      )}

      {/* Sidebar */}
      <aside className={`${isSidebarCollapsed ? 'w-16' : 'w-56'} bg-[#1f2937] text-white flex flex-col py-4 transition-all duration-300 shrink-0 border-r border-slate-800 z-30`}>
        <div className="px-3 pb-3 border-b border-slate-700/60 flex items-center justify-between">
          <button onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} className="w-10 h-10 rounded-lg hover:bg-slate-700/60 flex items-center justify-center text-slate-300 mx-auto">
            ☰
          </button>
        </div>
        <nav className="flex-1 space-y-1.5 px-2 mt-4">
          <button onClick={() => setActiveTab('busqueda')} className={`w-full h-10 rounded-lg flex items-center px-3 ${activeTab === 'busqueda' ? 'bg-[#8cb800] text-white font-bold' : 'text-slate-300'}`}>
            <span>🏢</span>
            {!isSidebarCollapsed && <span className="text-xs ml-3">Match por Empresa</span>}
          </button>
          <button onClick={() => setActiveTab('candidates')} className={`w-full h-10 rounded-lg flex items-center px-3 ${activeTab === 'candidates' ? 'bg-[#8cb800] text-white font-bold' : 'text-slate-300'}`}>
            <span>👤</span>
            {!isSidebarCollapsed && <span className="text-xs ml-3">Base de CVs ({candidates.length})</span>}
          </button>
        </nav>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-[#8cb800] text-white h-16 px-6 flex items-center justify-between shadow-sm">
          <span className="font-extrabold text-2xl">aglh</span>
          <button onClick={() => fileInputRef.current?.click()} className="bg-[#1f2937] hover:bg-black text-white px-4 py-1.5 rounded-lg text-xs font-bold">
            + Indexar CVs
          </button>
        </header>

        <main className="p-8 max-w-6xl mx-auto w-full">
          {activeTab === 'busqueda' && (
            <div className="space-y-6">
              <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-semibold block mb-1">Empresa Cliente</label>
                  <select value={selectedClientFilter} onChange={(e) => setSelectedClientFilter(e.target.value)} className="w-full border p-2 text-xs rounded">
                    <option value="">Todas</option>
                    {allClients.map((client, idx) => <option key={idx} value={client}>{client}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold block mb-1">Zona</label>
                  <input type="text" value={searchZone} onChange={(e) => setSearchZone(e.target.value)} className="w-full border p-2 text-xs rounded" />
                </div>
                <div>
                  <label className="text-xs font-semibold block mb-1">Experiencia</label>
                  <input type="text" value={searchExp} onChange={(e) => setSearchExp(e.target.value)} className="w-full border p-2 text-xs rounded" />
                </div>
              </div>

              <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                <h3 className="text-xs font-bold mb-3 uppercase">Candidatos ({candidatesMatch.length})</h3>

                {loading ? (
                  <p className="text-center text-xs py-4">Cargando base de datos...</p>
                ) : candidatesMatch.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {candidatesMatch.map((candidate) => (
                      <div key={candidate.id} onClick={() => setSelectedCandidate(candidate)} className="p-4 border rounded-lg hover:border-[#8cb800] cursor-pointer bg-slate-50/50 flex flex-col justify-between">
                        <div>
                          <h4 className="font-bold text-xs">{candidate.name}</h4>
                          <p className="text-xs text-slate-500 mt-1">Tel: {candidate.phone}</p>
                          <p className="text-[10px] text-slate-400 mt-1">Doc: {candidate.fileName}</p>
                        </div>
                        <div className="mt-4 pt-2 border-t flex justify-between items-center">
                          <button
                            type="button"
                            onClick={(e) => handleDeleteCandidate(e, candidate.id)}
                            className="bg-red-50 text-red-600 hover:bg-red-600 hover:text-white border border-red-200 text-[11px] font-bold px-3 py-1 rounded transition-colors"
                          >
                            🗑️ Eliminar Ficha
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-xs text-slate-400 py-6">No hay registros guardados.</p>
                )}
              </div>
            </div>
          )}

          {activeTab === 'candidates' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {candidates.map((candidate) => (
                <div key={candidate.id} onClick={() => setSelectedCandidate(candidate)} className="bg-white p-4 rounded-lg border shadow-sm flex flex-col justify-between">
                  <div>
                    <h4 className="font-bold text-xs">{candidate.name}</h4>
                    <p className="text-xs text-slate-500 font-mono">{candidate.phone}</p>
                  </div>
                  <div className="mt-4 pt-2 border-t flex justify-end">
                    <button
                      type="button"
                      onClick={(e) => handleDeleteCandidate(e, candidate.id)}
                      className="bg-red-50 text-red-600 hover:bg-red-600 hover:text-white border border-red-200 text-[11px] font-bold px-3 py-1 rounded transition-colors"
                    >
                      🗑️ Eliminar Ficha
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>

      {/* Modal Ficha */}
      {selectedCandidate && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-2xl">
            <div className="flex justify-between items-start border-b pb-3 mb-3">
              <h3 className="font-bold text-base">{selectedCandidate.name}</h3>
              <button onClick={() => setSelectedCandidate(null)} className="text-sm font-bold">✕</button>
            </div>
            <div className="space-y-2 text-xs">
              <p><strong>ID BD:</strong> {selectedCandidate.id}</p>
              <p><strong>Archivo:</strong> {selectedCandidate.fileName}</p>
            </div>
            <div className="mt-6 pt-3 border-t flex justify-between">
              <button
                type="button"
                onClick={(e) => handleDeleteCandidate(e, selectedCandidate.id)}
                className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded text-xs font-bold"
              >
                🗑️ Eliminar Candidato
              </button>
              <button onClick={() => setSelectedCandidate(null)} className="bg-slate-800 text-white px-4 py-1.5 rounded text-xs">
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
