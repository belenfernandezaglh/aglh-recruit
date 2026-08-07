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
  const [userSession, setUserSession] = useState<any>(null);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');

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

  // Modal para Administradores
  const [showNewClientModal, setShowNewClientModal] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientExecutive, setNewClientExecutive] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // PERMISOS ADMIN PARA BELÉN Y ANAHIT
  const isAdmin = 
    userSession?.email === 'belen.fernandez@aglh.com.uy' || 
    userSession?.email === 'anahit.armandugon@aglh.com.uy';

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserSession(session);
      if (session) loadAllData();
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserSession(session);
      if (session) loadAllData();
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    if (!loginEmail.toLowerCase().endsWith('@aglh.com.uy')) {
      setLoginError('Acceso restringido únicamente a correos corporativos @aglh.com.uy');
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password: loginPassword,
    });

    if (error) setLoginError(error.message);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUserSession(null);
  };

  const loadAllData = async () => {
    setLoading(true);
    try {
      const { data: clientsData } = await supabase.from('clients').select('*').order('name');
      if (clientsData) setClients(clientsData);

      const { data: candidatesData } = await supabase
        .from('candidates')
        .select(`*, matches:candidate_client_matches(id, match_score, client_id, client:clients(*))`)
        .order('created_at', { ascending: false });
      if (candidatesData) setCandidates(candidatesData as Candidate[]);

      const { data: contactsData } = await supabase
        .from('contacts')
        .select(`*, candidate:candidates(*), client:clients(*)`)
        .order('created_at', { ascending: false });
      if (contactsData) setContacts(contactsData as ContactRecord[]);

    } catch (err) {
      console.error('Error al cargar datos:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin || !newClientName || !newClientExecutive) return;

    await supabase.from('clients').insert([{
      name: newClientName,
      executive_email: newClientExecutive
    }]);

    setNewClientName('');
    setNewClientExecutive('');
    setShowNewClientModal(false);
    await loadAllData();
  };

  const handleUpdateExecutive = async (clientId: string, newExecutiveEmail: string) => {
    if (!isAdmin) return;
    await supabase.from('clients').update({ executive_email: newExecutiveEmail }).eq('id', clientId);
    await loadAllData();
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
      recruiter_email: userSession?.email,
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
    if (!confirm('¿Reintegrar candidato a la lista de disponibles?')) return;

    await supabase.from('candidates').update({ status: 'NUEVO' }).eq('id', candidateId);
    if (contactId) await supabase.from('contacts').delete().eq('id', contactId);
    await loadAllData();
  };

  const handleUpdateContactResult = async (contactId: string, newResult: ContactResult) => {
    await supabase.from('contacts').update({ result: newResult }).eq('id', contactId);
    await loadAllData();
  };

  const handleDeleteCandidate = async (e: React.MouseEvent, candidateId: string) => {
    e.stopPropagation();
    if (!confirm('¿Eliminar esta ficha de la base de datos?')) return;

    setCandidates(prev => prev.filter(c => c.id !== candidateId));
    await supabase.from('candidates').delete().eq('id', candidateId);
  };

  if (!userSession) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <span className="font-extrabold text-3xl tracking-wider text-[#8cb800]">aglh</span>
            <h1 className="text-xl font-bold text-slate-800">Acceso ATS Enterprise</h1>
            <p className="text-xs text-slate-500">Ingrese sus credenciales de dominio @aglh.com.uy</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Correo Corporativo</label>
              <input
                type="email"
                required
                placeholder="usuario@aglh.com.uy"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                className="w-full border p-2.5 rounded-lg text-xs outline-none focus:ring-2 focus:ring-[#8cb800]"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Contraseña</label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                className="w-full border p-2.5 rounded-lg text-xs outline-none focus:ring-2 focus:ring-[#8cb800]"
              />
            </div>

            {loginError && <p className="text-xs text-red-600 font-medium text-center">{loginError}</p>}

            <button type="submit" className="w-full bg-[#8cb800] text-white py-2.5 rounded-lg text-xs font-bold hover:bg-[#7ba300] transition-all shadow-md">
              Iniciar Sesión
            </button>
          </form>
        </div>
      </div>
    );
  }

  const filteredCandidates = candidates.filter(candidate => {
    if (activeTab === 'candidates' && candidate.status === 'CONTACTADO') return false;
    if (selectedClientId && !candidate.matches?.some(m => m.client_id === selectedClientId)) return false;
    if (filterLibretaH && !candidate.libreta_h) return false;
    if (filterHealthCard && !candidate.health_card) return false;

    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      return candidate.full_name?.toLowerCase().includes(q) ||
             candidate.locality?.toLowerCase().includes(q) ||
             candidate.department?.toLowerCase().includes(q) ||
             candidate.ai_summary?.toLowerCase().includes(q);
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

          <div className="flex items-center space-x-4">
            <button onClick={() => fileInputRef.current?.click()} className="bg-[#1f2937] hover:bg-slate-900 text-white px-4 py-2 rounded-lg text-xs font-bold transition-all shadow-md">
              + Importar CVs Masivo
            </button>

            <div className="flex items-center space-x-3 pl-4 border-l border-white/20">
              <span className="text-xs font-semibold">{userSession.email}</span>
              <button onClick={handleLogout} className="bg-black/30 hover:bg-black/50 text-white px-3 py-1.5 rounded-lg text-xs font-bold">
                Cerrar Sesión
              </button>
            </div>
          </div>
        </header>

        <main className="p-8 max-w-7xl mx-auto w-full space-y-6">

          {activeTab === 'clientes' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-bold text-slate-800">Gestión de Clientes ({clients.length})</h2>
                {isAdmin && (
                  <button onClick={() => setShowNewClientModal(true)} className="bg-[#8cb800] text-white px-4 py-2 rounded-lg text-xs font-bold shadow hover:bg-[#7ba300]">
                    + Crear Nuevo Cliente
                  </button>
                )}
              </div>

              {loading ? (
                <p className="text-center text-xs py-8 text-slate-400">Cargando base de clientes...</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  {clients.map((client) => {
                    const clientCandidates = candidates.filter(c => c.matches?.some(m => m.client_id === client.id));
                    const nuevocount = clientCandidates.filter(c => c.status === 'NUEVO').length;

                    return (
                      <div key={client.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3 border-l-4 border-l-[#8cb800]">
                        <div className="flex justify-between items-start">
                          <h3 className="font-bold text-slate-900 text-base">{client.name}</h3>
                        </div>

                        {isAdmin ? (
                          <div>
                            <label className="text-[10px] font-bold text-slate-400 block mb-1">Ejecutivo A Cargo:</label>
                            <input
                              type="email"
                              defaultValue={client.executive_email || ''}
                              onBlur={(e) => handleUpdateExecutive(client.id, e.target.value)}
                              className="w-full border p-1 rounded text-xs"
                            />
                          </div>
                        ) : (
                          <span className="text-xs font-bold bg-slate-100 px-2.5 py-1 rounded text-slate-700 block">Resp: {client.executive_email}</span>
                        )}

                        <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t text-center">
                          <div onClick={() => { setSelectedClientId(client.id); setActiveTab('candidates'); }} className="cursor-pointer">
                            <span className="block text-[10px] text-slate-400 font-semibold">CANDIDATOS</span>
                            <span className="text-sm font-extrabold text-slate-800">{clientCandidates.length}</span>
                          </div>
                          <div>
                            <span className="block text-[10px] text-slate-400 font-semibold">NUEVOS</span>
                            <span className="text-sm font-extrabold text-[#8cb800]">{nuevocount}</span>
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
                      className="w-full border border-slate-300 rounded-lg p-2.5 text-xs outline-none focus:ring-2 focus:ring-[#8cb800]"
                    />
                  </div>

                  <div className="w-full md:w-64">
                    <label className="text-xs font-bold text-slate-600 block mb-1">Filtrar por Cliente</label>
                    <select 
                      value={selectedClientId} 
                      onChange={(e) => setSelectedClientId(e.target.value)} 
                      className="w-full border border-slate-300 rounded-lg p-2.5 text-xs outline-none focus:ring-2 focus:ring-[#8cb800]"
                    >
                      <option value="">Todos los Clientes</option>
                      {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
                <h3 className="text-xs font-extrabold uppercase text-slate-500">Candidatos ({filteredCandidates.length})</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredCandidates.map((candidate) => (
                    <div key={candidate.id} className="p-5 border border-slate-200 rounded-xl bg-slate-50/50 flex flex-col justify-between">
                      <div>
                        <h4 className="font-bold text-sm text-slate-900">{candidate.full_name}</h4>
                        <p className="text-xs text-slate-500 mt-1 font-medium">{candidate.locality} ({candidate.department})</p>
                        <p className="text-xs text-slate-600 mt-2 italic bg-white p-2 rounded border border-slate-100">{candidate.ai_summary}</p>
                      </div>

                      <div className="mt-5 pt-3 border-t border-slate-200 flex justify-between items-center">
                        <button onClick={() => setContactModalCandidate(candidate)} className="bg-[#1f2937] hover:bg-black text-white text-[11px] font-bold px-3 py-1.5 rounded-lg">
                          📞 Contactar
                        </button>
                        <button onClick={(e) => handleDeleteCandidate(e, candidate.id)} className="text-red-500 hover:text-red-700 text-xs font-bold">
                          Eliminar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
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
                      <th className="p-3">Estado</th>
                      <th className="p-3">Reclutador</th>
                      <th className="p-3 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {contacts.map((contact) => (
                      <tr key={contact.id} className="hover:bg-slate-50">
                        <td className="p-3 font-bold">{contact.candidate?.full_name || 'Desconocido'}</td>
                        <td className="p-3">{contact.client?.name || 'Gral'}</td>
                        <td className="p-3">
                          <select
                            value={contact.result}
                            onChange={(e) => handleUpdateContactResult(contact.id, e.target.value as ContactResult)}
                            className="p-1 rounded font-bold text-[11px] border"
                          >
                            <option value="INGRESO">✓ Ingresó</option>
                            <option value="NO_INGRESO">✕ No Ingresó</option>
                            <option value="NO_ASISTE">⚠️ No Asiste / Cancela</option>
                            <option value="PENDIENTE">⏳ Pendiente</option>
                          </select>
                        </td>
                        <td className="p-3 text-slate-500">{contact.recruiter_email}</td>
                        <td className="p-3 text-right">
                          <button onClick={() => handleRevertCandidateToNuevo(contact.candidate_id, contact.id)} className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-[10px] font-bold">
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

      {showNewClientModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <form onSubmit={handleCreateClient} className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <h3 className="font-bold text-slate-900 text-sm">Crear Nuevo Cliente</h3>
            <input
              type="text"
              placeholder="Nombre del Cliente"
              required
              value={newClientName}
              onChange={(e) => setNewClientName(e.target.value)}
              className="w-full border p-2 rounded text-xs"
            />
            <input
              type="email"
              placeholder="Correo Ejecutivo a Cargo"
              required
              value={newClientExecutive}
              onChange={(e) => setNewClientExecutive(e.target.value)}
              className="w-full border p-2 rounded text-xs"
            />
            <div className="flex justify-end space-x-2 pt-2">
              <button type="button" onClick={() => setShowNewClientModal(false)} className="px-3 py-1 text-xs">Cancelar</button>
              <button type="submit" className="bg-[#8cb800] text-white px-3 py-1 rounded text-xs font-bold">Crear</button>
            </div>
          </form>
        </div>
      )}

      {contactModalCandidate && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={closeModal}>
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 relative" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-bold text-base text-slate-900">Registrar Contacto: {contactModalCandidate.full_name}</h3>
              <button onClick={closeModal} className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 font-bold flex items-center justify-center text-sm">✕</button>
            </div>
            
            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold block mb-1">Cliente Objetivo:</label>
                <select value={contactClientTarget} onChange={(e) => setContactClientTarget(e.target.value)} className="w-full border p-2 rounded text-xs">
                  <option value="">Seleccione Cliente...</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              <div>
                <label className="font-bold block mb-1">Notas:</label>
                <textarea value={contactNotes} onChange={(e) => setContactNotes(e.target.value)} className="w-full border p-2 rounded text-xs h-20" />
              </div>
            </div>

            <div className="pt-3 border-t grid grid-cols-2 gap-2">
              <button onClick={() => handleConfirmContact('INGRESO')} disabled={!contactClientTarget} className="bg-emerald-600 text-white p-2 rounded text-xs font-bold disabled:opacity-50">✓ Ingresó</button>
              <button onClick={() => handleConfirmContact('NO_INGRESO')} disabled={!contactClientTarget} className="bg-red-600 text-white p-2 rounded text-xs font-bold disabled:opacity-50">✕ No Ingresó</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
