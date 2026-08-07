'use client';

import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { parseCVAndMatch } from '../lib/aiParser';

export type CandidateStatus = 'NUEVO' | 'CONTACTADO';
export type ContactResult = 'INGRESO' | 'NO_INGRESO' | 'NO_ASISTE' | 'PENDIENTE';

export interface WorkExperience {
  company: string;
  position: string;
  functions: string;
}

export interface Client {
  id: string;
  created_at?: string;
  name: string;
  executive_email?: string;
  target_profile?: string;
  match_threshold?: number;
}

export interface CandidateMatch {
  id: string;
  candidate_id: string;
  client_id: string;
  match_score: number;
  client?: Client;
}

export interface Candidate {
  id: string;
  created_at?: string;
  updated_at?: string;
  full_name: string;
  document_id: string;
  phone: string;
  email: string;
  address?: string;
  locality?: string;
  department?: string;
  age?: number;
  education_level?: string;
  courses?: string[];
  work_experience?: WorkExperience[];
  availability?: string;
  driver_license?: string;
  libreta_h?: boolean;
  health_card?: boolean;
  food_handler_card?: boolean;
  ai_summary?: string;
  status?: CandidateStatus;
  matches?: CandidateMatch[];
}

export interface ContactRecord {
  id: string;
  created_at: string;
  candidate_id: string;
  client_id: string;
  recruiter_email?: string;
  executive_email?: string;
  result: ContactResult;
  notes?: string;
  candidate?: Candidate;
  client?: Client;
}

type ViewMode = 'clientes' | 'candidates' | 'contactados';

export default function Home() {
  const [activeTab, setActiveTab] = useState<ViewMode>('clientes');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const [clients, setClients] = useState<Client[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [contacts, setContacts] = useState<ContactRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterLibretaH, setFilterLibretaH] = useState(false);
  const [filterHealthCard, setFilterHealthCard] = useState(false);

  const [contactModalCandidate, setContactModalCandidate] = useState<Candidate | null>(null);
  const [contactClientTarget, setContactClientTarget] = useState<string>('');
  const [contactNotes, setContactNotes] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const { data: clientsData } = await supabase
        .from('clients')
        .select('*')
        .order('name');

      if (clientsData) setClients(clientsData);

      const { data: candidatesData } = await supabase
        .from('candidates')
        .select(`
          *,
          matches:candidate_client_matches(
            id, match_score, client_id,
            client:clients(*)
          )
        `)
        .order('created_at', { ascending: false });

      if (candidatesData) setCandidates(candidatesData as Candidate[]);

      const { data: contactsData } = await supabase
        .from('contacts')
        .select(`
          *,
          candidate:candidates(*),
          client:clients(*)
        `)
        .order('created_at', { ascending: false });

      if (contactsData) setContacts(contactsData as ContactRecord[]);

    } catch (err) {
      console.error('Error general:', err);
    } finally {
      setLoading(false);
    }
  };

  const processFiles = async (files: FileList | File[]) => {
    if (!files || files.length === 0) return;
    setUploadProgress(`Procesando 0/${files.length} CVs...`);

    const fileArray = Array.from(files);
    let processedCount = 0;

    for (const file of fileArray) {
      processedCount++;
      setUploadProgress(`Analizando con IA (${processedCount}/${fileArray.length}): ${file.name}`);

      const { candidateData, matches } = parseCVAndMatch(file, clients as any);

      const { data: existing } = await supabase
        .from('candidates')
        .select('id')
        .or(`document_id.eq.${candidateData.document_id},email.eq.${candidateData.email}`)
        .maybeSingle();

      let candidateId: string;

      if (existing) {
        const { data: updated } = await supabase
          .from('candidates')
          .update({ ...candidateData, updated_at: new Date().toISOString() })
          .eq('id', existing.id)
          .select()
          .single();
        candidateId = updated.id;
      } else {
        const { data: inserted, error: insertErr } = await supabase
          .from('candidates')
          .insert([candidateData])
          .select()
          .single();

        if (insertErr || !inserted) continue;
        candidateId = inserted.id;
      }

      if (matches.length > 0) {
        const matchesToInsert = matches.map(m => ({
          candidate_id: candidateId,
          client_id: m.client_id,
          match_score: m.match_score
        }));

        await supabase
          .from('candidate_client_matches')
          .upsert(matchesToInsert, { onConflict: 'candidate_id,client_id' });
      }
    }

    setUploadProgress(null);
    await loadAllData();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processFiles(e.target.files);
      e.target.value = '';
    }
  };

  const handleConfirmContact = async (result: ContactResult) => {
    if (!contactModalCandidate || !contactClientTarget) return;

    await supabase.from('contacts').insert([{
      candidate_id: contactModalCandidate.id,
      client_id: contactClientTarget,
      recruiter_email: 'reclutador@aglh.com.uy',
      executive_email: 'ejecutivo@aglh.com.uy',
      result: result,
      notes: contactNotes
    }]);

    await supabase
      .from('candidates')
      .update({ status: 'CONTACTADO' })
      .eq('id', contactModalCandidate.id);

    closeModal();
    await loadAllData();
  };

  const closeModal = () => {
    setContactModalCandidate(null);
    setContactNotes('');
    setContactClientTarget('');
  };

  const handleRevertCandidateToNuevo = async (candidateId: string, contactId?: string) => {
    if (!confirm('¿Reintegrar candidato a la lista de disponibles (Nuevos)?')) return;

    await supabase
      .from('candidates')
      .update({ status: 'NUEVO' })
      .eq('id', candidateId);

    if (contactId) {
      await supabase.from('contacts').delete().eq('id', contactId);
    }

    await loadAllData();
  };

  const handleUpdateContactResult = async (contactId: string, newResult: ContactResult) => {
    await supabase
      .from('contacts')
      .update({ result: newResult })
      .eq('id', contactId);

    await loadAllData();
  };

  const handleDeleteCandidate = async (e: React.MouseEvent, candidateId: string) => {
    e.stopPropagation();
    if (!confirm('¿Eliminar esta ficha de la base de datos?')) return;

    setCandidates(prev => prev.filter(c => c.id !== candidateId));
    await supabase.from('candidates').delete().eq('id', candidateId);
  };

  const filteredCandidates = candidates.filter(candidate => {
    if (activeTab === 'candidates' && candidate.status === 'CONTACTADO') return false;

    if (selectedClientId) {
      const hasMatch = candidate.matches?.some(m => m.client_id === selectedClientId);
      if (!hasMatch) return false;
    }

    if (filterLibretaH && !candidate.libreta_h) return false;
    if (filterHealthCard && !candidate.health_card) return false;

    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      const matchName = candidate.full_name?.toLowerCase().includes(q);
      const matchLocality = candidate.locality?.toLowerCase().includes(q);
      const matchDept = candidate.department?.toLowerCase().includes(q);
      const matchSummary = candidate.ai_summary?.toLowerCase().includes(q);
      const matchDoc = candidate.document_id?.toLowerCase().includes(q);

      return matchName || matchLocality || matchDept || matchSummary || matchDoc;
    }

    return true;
  });

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 flex"
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
      onDrop={(e) => { e.preventDefault(); setIsDragging(false); if (e.dataTransfer.files) processFiles(e.dataTransfer.files); }}
    >
      <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".pdf,.doc,.docx" multiple className="hidden" />

      {isDragging && (
        <div className="fixed inset-0 bg-[#8cb800]/20 backdrop-blur-md border-4 border-dashed border-[#8cb800] z-50 flex items-center justify-center pointer-events-none">
          <div className="bg-white p-8 rounded-2xl shadow-2xl text-center border">
            <p className="text-xl font-bold text-slate-800">Suelte los CVs para Ingesta e Inteligencia IA</p>
          </div>
        </div>
      )}

      {uploadProgress && (
        <div className="fixed bottom-6 right-6 bg-[#1f2937] text-white px-5 py-3 rounded-xl shadow-2xl z-50 flex items-center space-x-3 text-xs font-semibold">
          <div className="animate-spin h-4 w-4 border-2 border-[#8cb800] border-t-transparent rounded-full"></div>
          <span>{uploadProgress}</span>
        </div>
      )}

      <aside className={`${isSidebarCollapsed ? 'w-16' : 'w-60'} bg-[#1f2937] text-white flex flex-col py-4 transition-all duration-300 shrink-0 border-r border-slate-800 z-30`}>
        <div className="px-4 pb-4 border-b border-slate-700/60 flex items-center justify-between">
          <button onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} className="w-9 h-9 rounded-lg hover:bg-slate-700/60 flex items-center justify-center text-slate-300">
            ☰
          </button>
        </div>

        <nav className="flex-1 space-y-1.5 px-2 mt-4">
          <button onClick={() => { setActiveTab('clientes'); setSelectedClientId(''); }} className={`w-full h-11 rounded-lg flex items-center px-3 text-xs font-bold transition-all ${activeTab === 'clientes' ? 'bg-[#8cb800] text-white shadow-md' : 'text-slate-300 hover:bg-slate-800'}`}>
            <span className="text-base">🏢</span>
            {!isSidebarCollapsed && <span className="ml-3">Gestión de Clientes ({clients.length})</span>}
          </button>

          <button onClick={() => { setActiveTab('candidates'); setSelectedClientId(''); }} className={`w-full h-11 rounded-lg flex items-center px-3 text-xs font-bold transition-all ${activeTab === 'candidates' ? 'bg-[#8cb800] text-white shadow-md' : 'text-slate-300 hover:bg-slate-800'}`}>
            <span className="text-base">👤</span>
            {!isSidebarCollapsed && <span className="ml-3">Candidatos Nuevos ({candidates.filter(c => c.status === 'NUEVO').length})</span>}
          </button>

          <button onClick={() => setActiveTab('contactados')} className={`w-full h-11 rounded-lg flex items-center px-3 text-xs font-bold transition-all ${activeTab === 'contactados' ? 'bg-[#8cb800] text-white shadow-md' : 'text-slate-300 hover:bg-slate-800'}`}>
            <span className="text-base">📞</span>
            {!isSidebarCollapsed && <span className="ml-3">Módulo Contactados ({contacts.length})</span>}
          </button>
        </nav>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-[#8cb800] text-white h-16 px-8 flex items-center justify-between shadow-sm">
          <div className="flex items-center space-x-3">
            <span className="font-extrabold text-2xl tracking-wider">aglh</span>
            <span className="text-xs bg-black/20 px-2.5 py-1 rounded-full font-medium">ATS Enterprise</span>
          </div>

          <button onClick={() => fileInputRef.current?.click()} className="bg-[#1f2937] hover:bg-slate-900 text-white px-4 py-2 rounded-lg text-xs font-bold transition-all shadow-md flex items-center space-x-2">
            <span>+ Importar CVs Masivo</span>
          </button>
        </header>

        <main className="p-8 max-w-7xl mx-auto w-full space-y-6">

          {activeTab === 'clientes' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-bold text-slate-800">Gestión de Clientes ({clients.length})</h2>
              </div>

              {loading ? (
                <p className="text-center text-xs py-8 text-slate-400">Cargando base de clientes...</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  {clients.map((client) => {
                    const clientCandidates = candidates.filter(c => c.matches?.some(m => m.client_id === client.id));
                    const nuevocount = clientCandidates.filter(c => c.status === 'NUEVO').length;
                    const avgMatch = clientCandidates.length > 0 
                      ? Math.round(clientCandidates.reduce((acc, curr) => acc + (curr.matches?.find(m => m.client_id === client.id)?.match_score || 0), 0) / clientCandidates.length)
                      : 0;

                    return (
                      <div 
                        key={client.id}
                        onClick={() => { setSelectedClientId(client.id); setActiveTab('candidates'); }}
                        className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer border-l-4 border-l-[#8cb800]"
                      >
                        <div className="flex justify-between items-start">
                          <h3 className="font-bold text-slate-900 text-base">{client.name}</h3>
                          <span className="text-xs font-bold bg-slate-100 px-2.5 py-1 rounded text-slate-700">Resp: {client.executive_email}</span>
                        </div>

                        <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t text-center">
                          <div>
                            <span className="block text-[10px] text-slate-400 font-semibold">TOTAL</span>
                            <span className="text-sm font-extrabold text-slate-800">{clientCandidates.length}</span>
                          </div>
                          <div>
                            <span className="block text-[10px] text-slate-400 font-semibold">NUEVOS</span>
                            <span className="text-sm font-extrabold text-[#8cb800]">{nuevocount}</span>
                          </div>
                          <div>
                            <span className="block text-[10px] text-slate-400 font-semibold">MATCH %</span>
                            <span className="text-sm font-extrabold text-blue-600">{avgMatch}%</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {(activeTab === 'candidates' || selectedClientId) && (
            <div className="space-y-6">
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1">
                    <label className="text-xs font-bold text-slate-600 block mb-1">Buscador Inteligente Multicriterio</label>
                    <input 
                      type="text" 
                      placeholder="Buscar por cargo, funciones, libreta, zona..." 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full border border-slate-300 rounded-lg p-2.5 text-xs focus:ring-2 focus:ring-[#8cb800] outline-none"
                    />
                  </div>

                  <div className="w-full md:w-64">
                    <label className="text-xs font-bold text-slate-600 block mb-1">Filtrar por Cliente</label>
                    <select 
                      value={selectedClientId} 
                      onChange={(e) => setSelectedClientId(e.target.value)} 
                      className="w-full border border-slate-300 rounded-lg p-2.5 text-xs font-medium focus:ring-2 focus:ring-[#8cb800] outline-none"
                    >
                      <option value="">Todos los Clientes</option>
                      {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                </div>

                <div className="flex items-center space-x-4 pt-2 border-t border-slate-100 text-xs">
                  <span className="font-bold text-slate-500">Filtros:</span>
                  <label className="flex items-center space-x-1.5 cursor-pointer">
                    <input type="checkbox" checked={filterLibretaH} onChange={(e) => setFilterLibretaH(e.target.checked)} className="rounded text-[#8cb800]" />
                    <span>Libreta H</span>
                  </label>
                  <label className="flex items-center space-x-1.5 cursor-pointer">
                    <input type="checkbox" checked={filterHealthCard} onChange={(e) => setFilterHealthCard(e.target.checked)} className="rounded text-[#8cb800]" />
                    <span>Carné de Salud</span>
                  </label>
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                  Candidatos ({filteredCandidates.length})
                </h3>

                {filteredCandidates.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredCandidates.map((candidate) => {
                      const topMatch = candidate.matches?.[0];

                      return (
                        <div 
                          key={candidate.id} 
                          className="p-5 border border-slate-200 rounded-xl hover:border-[#8cb800] transition-all bg-slate-50/50 flex flex-col justify-between"
                        >
                          <div>
                            <div className="flex justify-between items-start">
                              <h4 className="font-bold text-sm text-slate-900">{candidate.full_name}</h4>
                              {topMatch && (
                                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                                  {topMatch.match_score}% Match
                                </span>
                              )}
                            </div>

                            <p className="text-xs text-slate-500 mt-1 font-medium">{candidate.locality} ({candidate.department})</p>
                            <p className="text-xs text-slate-600 mt-2 line-clamp-2 italic bg-white p-2 rounded border border-slate-100">{candidate.ai_summary}</p>
                          </div>

                          <div className="mt-5 pt-3 border-t border-slate-200 flex justify-between items-center">
                            <button 
                              type="button"
                              onClick={() => setContactModalCandidate(candidate)}
                              className="bg-[#1f2937] hover:bg-black text-white text-[11px] font-bold px-3 py-1.5 rounded-lg"
                            >
                              📞 Contactar
                            </button>

                            <button 
                              type="button" 
                              onClick={(e) => handleDeleteCandidate(e, candidate.id)}
                              className="text-red-500 hover:text-red-700 text-xs font-bold"
                            >
                              Eliminar
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-center text-xs text-slate-400 py-10">No hay candidatos para mostrar.</p>
                )}
              </div>
            </div>
          )}

          {activeTab === 'contactados' && (
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
              <h2 className="text-sm font-extrabold uppercase text-slate-700">Historial de Contactados</h2>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100 border-b text-slate-600 font-bold">
                      <th className="p-3">Candidato</th>
                      <th className="p-3">Cliente</th>
                      <th className="p-3">Estado / Resultado</th>
                      <th className="p-3">Notas</th>
                      <th className="p-3">Fecha</th>
                      <th className="p-3 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {contacts.map((contact) => (
                      <tr key={contact.id} className="hover:bg-slate-50">
                        <td className="p-3 font-bold">{contact.candidate?.full_name || 'Desconocido'}</td>
                        <td className="p-3 font-semibold text-slate-700">{contact.client?.name || 'Gral'}</td>
                        <td className="p-3">
                          <select
                            value={contact.result}
                            onChange={(e) => handleUpdateContactResult(contact.id, e.target.value as ContactResult)}
                            className={`p-1 rounded font-bold text-[11px] outline-none border ${
                              contact.result === 'INGRESO' ? 'bg-emerald-50 text-emerald-800 border-emerald-300' :
                              contact.result === 'NO_INGRESO' ? 'bg-red-50 text-red-800 border-red-300' :
                              contact.result === 'NO_ASISTE' ? 'bg-amber-50 text-amber-800 border-amber-300' :
                              'bg-slate-100 text-slate-800 border-slate-300'
                            }`}
                          >
                            <option value="INGRESO">✓ Ingresó</option>
                            <option value="NO_INGRESO">✕ No Ingresó</option>
                            <option value="NO_ASISTE">⚠️ No Asiste / Cancela</option>
                            <option value="PENDIENTE">⏳ Pendiente</option>
                          </select>
                        </td>
                        <td className="p-3 text-slate-500 max-w-xs truncate">{contact.notes || '-'}</td>
                        <td className="p-3 text-slate-400">{new Date(contact.created_at).toLocaleString('es-ES')}</td>
                        <td className="p-3 text-right space-x-2">
                          <button
                            onClick={() => handleRevertCandidateToNuevo(contact.candidate_id, contact.id)}
                            className="bg-blue-50 text-blue-700 hover:bg-blue-100 px-2 py-1 rounded text-[10px] font-bold"
                            title="Devuelve el candidato a la lista de candidatos activos"
                          >
                            ↩️ Devolver a Activo
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </main>
      </div>

      {contactModalCandidate && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={closeModal}>
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 relative" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-bold text-base text-slate-900">Registrar Contacto: {contactModalCandidate.full_name}</h3>
              <button 
                onClick={closeModal} 
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold flex items-center justify-center text-sm transition-all"
                title="Cerrar sin guardar"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold block mb-1">Seleccionar Cliente Objetivo:</label>
                <select 
                  value={contactClientTarget} 
                  onChange={(e) => setContactClientTarget(e.target.value)} 
                  className="w-full border p-2 rounded-lg text-xs"
                >
                  <option value="">Seleccione Cliente...</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              <div>
                <label className="font-bold block mb-1">Notas:</label>
                <textarea 
                  value={contactNotes} 
                  onChange={(e) => setContactNotes(e.target.value)} 
                  placeholder="Escriba comentarios sobre la entrevista o el contacto..."
                  className="w-full border p-2 rounded-lg text-xs h-20"
                />
              </div>
            </div>

            <div className="pt-3 border-t grid grid-cols-2 gap-2">
              <button 
                onClick={() => handleConfirmContact('INGRESO')}
                disabled={!contactClientTarget}
                className="bg-emerald-600 text-white p-2 rounded-lg text-xs font-bold disabled:opacity-50 hover:bg-emerald-700 transition-all"
              >
                ✓ Ingresó
              </button>
              <button 
                onClick={() => handleConfirmContact('NO_INGRESO')}
                disabled={!contactClientTarget}
                className="bg-red-600 text-white p-2 rounded-lg text-xs font-bold disabled:opacity-50 hover:bg-red-700 transition-all"
              >
                ✕ No Ingresó
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
