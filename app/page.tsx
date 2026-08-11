'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

type CandidateStatus = 'NUEVO' | 'CONTACTADO' | 'RECHAZADO' | 'CONTRATADO';
type SortOption = 'MATCH_DESC' | 'MATCH_ASC' | 'NEWEST' | 'OLDEST' | 'LOCATION';

interface Requirement {
  location: string;
  required_experience: string;
  keywords: string[];
  min_age?: number;
  max_age?: number;
}

interface Client {
  id: string;
  name: string;
  executive_email: string;
  executive_name?: string;
  requirements?: Requirement;
}

interface Candidate {
  id: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  location: string;
  main_experience: string;
  skills: string[];
  status: CandidateStatus;
  created_at: string;
}

interface ContactRecord {
  id: string;
  candidate_id: string;
  client_id: string;
  recruiter_email: string;
  created_at: string;
  candidate?: Candidate;
  client?: Client;
}

export default function Home() {
  // Autenticación
  const [userSession, setUserSession] = useState<any>(null);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');

  // Control de vista: 'Admin' o 'Reclutador'
  const [viewMode, setViewMode] = useState<'Admin' | 'Reclutador'>('Admin');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Navegación
  const [activeTab, setActiveTab] = useState<'CLIENTES' | 'NUEVOS' | 'CONTACTADOS'>('CLIENTES');
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);

  // Datos
  const [clients, setClients] = useState<Client[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [contacts, setContacts] = useState<ContactRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros y Búsqueda
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('MATCH_DESC');

  // Modales
  const [isNewClientModalOpen, setIsNewClientModalOpen] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientExecutive, setNewClientExecutive] = useState('');

  const [selectedCandidateForModal, setSelectedCandidateForModal] = useState<Candidate | null>(null);
  const [isCandidateModalOpen, setIsCandidateModalOpen] = useState(false);

  const [isEditReqModalOpen, setIsEditReqModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [reqLocation, setReqLocation] = useState('');
  const [reqExperience, setReqExperience] = useState('');
  const [reqKeywords, setReqKeywords] = useState('');

  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    setUserSession(session);
    if (session) {
      const email = session.user?.email?.toLowerCase() || '';
      const isAllowedAdmin = email.includes('anahit') || email.includes('belen');
      if (!isAllowedAdmin) setViewMode('Reclutador');
      await loadAllData();
    }
    setLoading(false);
  };

  const loadAllData = async () => {
    setLoading(true);

    // 1. Cargar Clientes
    const { data: clientData } = await supabase.from('clients').select('*').order('name', { ascending: true });
    
    // Cargar Requisitos base desde el Manual de Cargos Operativos
    const initialClients: Client[] = (clientData || []).map((c: any) => {
      let reqs: Requirement = c.requirements || {
        location: 'Montevideo',
        required_experience: 'Depósito / Carga y descarga / Operarios',
        keywords: ['deposito', 'picking', 'carga', 'fuerza']
      };

      if (c.name.toUpperCase().includes('CORFRISA')) {
        reqs = { location: 'Montevideo / Las Piedras', required_experience: 'Auxiliar / Operario de Depósito, picking con colector', keywords: ['colector', 'picking', 'fuerza', 'paletera'] };
      } else if (c.name.toUpperCase().includes('KEVENOLL')) {
        reqs = { location: 'Montevideo', required_experience: 'Peón de depósito, esfuerzo físico', keywords: ['peon', 'deposito', 'fuerza', 'carga'] };
      } else if (c.name.toUpperCase().includes('RIOGAS') || c.name.toUpperCase().includes('ACODIKE')) {
        reqs = { location: 'Camino Lecocq, Montevideo', required_experience: 'Operario de Ingreso, planta, carga pesada', keywords: ['planta', 'carga', 'pesada', 'fuerza'] };
      }

      return {
        ...c,
        executive_name: c.executive_email ? c.executive_email.split('@')[0] : 'Pablo',
        requirements: reqs
      };
    });

    setClients(initialClients);
    if (initialClients.length > 0 && !selectedClientId) {
      setSelectedClientId(initialClients[0].id);
    }

    // 2. Cargar Candidatos
    const { data: candData } = await supabase.from('candidates').select('*').order('created_at', { ascending: false });
    if (candData && candData.length > 0) {
      setCandidates(candData);
    } else {
      // Datos demo iniciales de prueba con estructura completa
      const demoCandidates: Candidate[] = [
        { id: '1', first_name: 'Gonzalo', last_name: 'Rodríguez', email: 'gonzalo@gmail.com', phone: '099123456', location: 'Montevideo', main_experience: 'Operario de depósito con uso de colector de datos y picking en Corfrisa', skills: ['colector', 'picking', 'fuerza'], status: 'NUEVO', created_at: new Date().toISOString() },
        { id: '2', first_name: 'Mariana', last_name: 'Gómez', email: 'mariana@hotmail.com', phone: '098654321', location: 'Las Piedras, Canelones', main_experience: 'Auxiliar de limpieza y empaque en planta industrial', skills: ['limpieza', 'empaque'], status: 'NUEVO', created_at: new Date().toISOString() },
        { id: '3', first_name: 'Lucas', last_name: 'Pérez', email: 'lucas@gmail.com', phone: '091888777', location: 'Montevideo', main_experience: 'Peón de carga y descarga pesada en planta de gas', skills: ['carga', 'pesada', 'fuerza', 'planta'], status: 'NUEVO', created_at: new Date().toISOString() }
      ];
      setCandidates(demoCandidates);
    }

    // 3. Cargar Contactos
    const { data: contactData } = await supabase.from('contacts').select('*, candidate:candidates(*), client:clients(*)').order('created_at', { ascending: false });
    if (contactData) setContacts(contactData);

    setLoading(false);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data, error } = await supabase.auth.signInWithPassword({ email: authEmail, password: authPassword });
    if (error) {
      alert('Error de acceso: ' + error.message);
    } else {
      setUserSession(data.session);
      const email = data.session.user?.email?.toLowerCase() || '';
      const isAllowedAdmin = email.includes('anahit') || email.includes('belen');
      setViewMode(isAllowedAdmin ? 'Admin' : 'Reclutador');
      await loadAllData();
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUserSession(null);
  };

  // ALGORITMO DE COMPATIBILIDAD (MATCH % = LOCALIDAD 30% + EXPERIENCIA 40% + REQUISITOS 30%)
  const calculateMatch = (candidate: Candidate, client?: Client): number => {
    if (!client || !client.requirements) return 70;
    
    let score = 0;
    const req = client.requirements;

    // 1. Localidad (30%)
    if (candidate.location.toLowerCase().includes(req.location.toLowerCase()) || req.location.toLowerCase().includes(candidate.location.toLowerCase())) {
      score += 30;
    } else if (candidate.location.toLowerCase().includes('montevideo') && req.location.toLowerCase().includes('montevideo')) {
      score += 25;
    } else {
      score += 10;
    }

    // 2. Experiencia (40%)
    const expText = candidate.main_experience.toLowerCase();
    const reqExpText = req.required_experience.toLowerCase();
    if (expText.includes(reqExpText) || reqExpText.includes(expText)) {
      score += 40;
    } else {
      let matches = 0;
      const words = reqExpText.split(' ');
      words.forEach(w => { if (w.length > 3 && expText.includes(w)) matches++; });
      score += Math.min(35, matches * 12);
    }

    // 3. Requisitos Clave (30%)
    let kwMatch = 0;
    if (req.keywords && req.keywords.length > 0) {
      req.keywords.forEach(kw => {
        if (candidate.skills?.includes(kw.toLowerCase()) || expText.includes(kw.toLowerCase())) {
          kwMatch += 1;
        }
      });
      score += Math.min(30, Math.round((kwMatch / req.keywords.length) * 30));
    } else {
      score += 20;
    }

    return Math.min(99, Math.max(45, score));
  };

  // REGISTRAR CONTACTO: Pasa a CONTACTADO y desaparece de vistas NUEVO de todos los clientes
  const handleContactCandidate = async (candidate: Candidate, client: Client) => {
    const recruiterEmail = userSession?.user?.email || 'reclutador@aglh.com.uy';
    
    // Actualizar estado candidato a CONTACTADO
    await supabase.from('candidates').update({ status: 'CONTACTADO' }).eq('id', candidate.id);

    // Registrar en Módulo Contactados
    await supabase.from('contacts').insert([
      { candidate_id: candidate.id, client_id: client.id, recruiter_email: recruiterEmail }
    ]);

    // Actualizar estado local
    setCandidates(candidates.map(c => c.id === candidate.id ? { ...c, status: 'CONTACTADO' } : c));
    
    const newContactRecord: ContactRecord = {
      id: Date.now().toString(),
      candidate_id: candidate.id,
      client_id: client.id,
      recruiter_email: recruiterEmail,
      created_at: new Date().toISOString(),
      candidate: candidate,
      client: client
    };
    setContacts([newContactRecord, ...contacts]);

    alert(`Candidato ${candidate.first_name} ${candidate.last_name} marcado como CONTACTADO para ${client.name}.`);
  };

  // RETORNAR CANDIDATO A BASE DE DATOS (NUEVO) DESDE CONTACTADOS
  const handleReturnToCandidates = async (contactRecordId: string, candidateId: string) => {
    if (!confirm('¿Deseas devolver este candidato a la base de candidatos activos (NUEVO)?')) return;

    await supabase.from('candidates').update({ status: 'NUEVO' }).eq('id', candidateId);
    await supabase.from('contacts').delete().eq('id', contactRecordId);

    setCandidates(candidates.map(c => c.id === candidateId ? { ...c, status: 'NUEVO' } : c));
    setContacts(contacts.filter(ct => ct.id !== contactRecordId));
  };

  // EDITAR REQUISITOS DE CLIENTE (VISTA ADMIN)
  const handleSaveRequirements = async () => {
    if (!editingClient) return;
    const updatedReqs: Requirement = {
      location: reqLocation,
      required_experience: reqExperience,
      keywords: reqKeywords.split(',').map(k => k.trim().toLowerCase())
    };

    await supabase.from('clients').update({ requirements: updatedReqs }).eq('id', editingClient.id);

    setClients(clients.map(c => c.id === editingClient.id ? { ...c, requirements: updatedReqs } : c));
    setIsEditReqModalOpen(false);
  };

  // ORDENAR Y FILTRAR CANDIDATOS
  const getFilteredAndSortedCandidates = (currentClient?: Client) => {
    let result = candidates.filter(c => c.status === 'NUEVO');

    // Búsqueda
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(c => 
        c.first_name.toLowerCase().includes(term) ||
        c.last_name.toLowerCase().includes(term) ||
        c.location.toLowerCase().includes(term) ||
        c.main_experience.toLowerCase().includes(term)
      );
    }

    // Ordenamiento
    return result.sort((a, b) => {
      const matchA = calculateMatch(a, currentClient);
      const matchB = calculateMatch(b, currentClient);

      if (sortBy === 'MATCH_DESC') return matchB - matchA;
      if (sortBy === 'MATCH_ASC') return matchA - matchB;
      if (sortBy === 'NEWEST') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      if (sortBy === 'OLDEST') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      if (sortBy === 'LOCATION') return a.location.localeCompare(b.location);
      return 0;
    });
  };

  const isSuperAdminUser = userSession?.user?.email?.toLowerCase().includes('anahit') || userSession?.user?.email?.toLowerCase().includes('belen');
  const activeClient = clients.find(c => c.id === selectedClientId) || clients[0];

  if (!userSession) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', fontFamily: 'Arial, sans-serif', backgroundColor: '#e2edd0' }}>
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ backgroundColor: '#ffffff', padding: '36px', borderRadius: '8px', width: '360px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
              <span style={{ fontSize: '28px', fontWeight: 'bold', color: '#8cc63f', fontStyle: 'italic' }}>aglh</span>
              <span style={{ backgroundColor: '#8cc63f', color: '#fff', fontSize: '11px', padding: '2px 8px', borderRadius: '10px', fontWeight: 'bold' }}>ATS Enterprise</span>
            </div>
            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <input type="email" placeholder="usuario@aglh.com.uy" value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} required style={{ padding: '10px', border: '1px solid #ccc', borderRadius: '4px' }} />
              <input type="password" placeholder="Contraseña" value={authPassword} onChange={(e) => setAuthPassword(e.target.value)} required style={{ padding: '10px', border: '1px solid #ccc', borderRadius: '4px' }} />
              <button type="submit" style={{ backgroundColor: '#8cc63f', color: '#fff', border: 'none', padding: '12px', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}>Iniciar Sesión</button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: 'Segoe UI, Helvetica, Arial, sans-serif', backgroundColor: '#e2edd0' }}>
      
      {/* BARRA LATERAL (SIDEBAR) */}
      <aside style={{ width: sidebarOpen ? '240px' : '60px', backgroundColor: '#4a4f56', color: '#ffffff', transition: 'width 0.2s ease', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        <div style={{ height: '56px', display: 'flex', alignItems: 'center', padding: '0 16px', justifyContent: sidebarOpen ? 'space-between' : 'center', backgroundColor: '#3e4349' }}>
          {sidebarOpen && <span style={{ fontSize: '22px', fontWeight: 'bold', color: '#8cc63f', fontStyle: 'italic' }}>aglh</span>}
          <button onClick={() => setSidebarOpen(!sidebarOpen)} style={{ background: 'none', border: 'none', color: '#ffffff', fontSize: '20px', cursor: 'pointer' }}>☰</button>
        </div>

        <nav style={{ padding: '16px 8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <button onClick={() => setActiveTab('CLIENTES')} style={{ display: 'flex', alignItems: 'center', justifyContent: sidebarOpen ? 'space-between' : 'center', backgroundColor: activeTab === 'CLIENTES' ? '#8cc63f' : 'transparent', color: '#ffffff', border: 'none', padding: '10px 12px', borderRadius: '18px', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer' }}>
            <span>💼 {sidebarOpen && 'Panel Clientes'}</span>
            {sidebarOpen && <span style={{ fontSize: '12px' }}>({clients.length})</span>}
          </button>

          <button onClick={() => setActiveTab('NUEVOS')} style={{ display: 'flex', alignItems: 'center', justifyContent: sidebarOpen ? 'space-between' : 'center', backgroundColor: activeTab === 'NUEVOS' ? '#8cc63f' : 'transparent', color: '#ffffff', border: 'none', padding: '10px 12px', borderRadius: '18px', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer' }}>
            <span>✉ {sidebarOpen && 'Candidatos Nuevos'}</span>
            {sidebarOpen && <span style={{ fontSize: '12px' }}>({candidates.filter(c => c.status === 'NUEVO').length})</span>}
          </button>

          <button onClick={() => setActiveTab('CONTACTADOS')} style={{ display: 'flex', alignItems: 'center', justifyContent: sidebarOpen ? 'space-between' : 'center', backgroundColor: activeTab === 'CONTACTADOS' ? '#8cc63f' : 'transparent', color: '#ffffff', border: 'none', padding: '10px 12px', borderRadius: '18px', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer' }}>
            <span>👤 {sidebarOpen && 'Módulo Contactados'}</span>
            {sidebarOpen && <span style={{ fontSize: '12px' }}>({contacts.length})</span>}
          </button>
        </nav>

        <div style={{ marginTop: 'auto', padding: '16px 8px', borderTop: '1px solid #5a5f66' }}>
          <button onClick={handleLogout} style={{ width: '100%', backgroundColor: 'transparent', color: '#ff6b6b', border: '1px solid #ff6b6b', padding: '6px', borderRadius: '4px', fontSize: '12px', cursor: 'pointer' }}>
            {sidebarOpen ? 'Cerrar Sesión' : '➔'}
          </button>
        </div>
      </aside>

      {/* ÁREA PRINCIPAL */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        
        {/* BANNER SUPERIOR */}
        <header style={{ backgroundColor: '#8cc63f', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <span style={{ color: '#ffffff', fontWeight: 'bold', fontSize: '28px', fontStyle: 'italic' }}>aglh</span>
            <span style={{ backgroundColor: '#4a4f56', color: '#ffffff', fontSize: '11px', padding: '3px 10px', borderRadius: '12px', fontWeight: 'bold' }}>ATS Enterprise</span>

            {/* SELECTOR DE MODO DESTACADO */}
            <div style={{ display: 'flex', alignItems: 'center', backgroundColor: '#3e4349', padding: '4px 10px', borderRadius: '6px', color: '#fff', fontSize: '12px', gap: '6px', marginLeft: '10px' }}>
              <span style={{ color: '#ccc', fontWeight: 'bold' }}>Modo:</span>
              {isSuperAdminUser ? (
                <select value={viewMode} onChange={(e) => setViewMode(e.target.value as any)} style={{ backgroundColor: '#ffffff', color: '#222', border: 'none', padding: '3px 8px', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}>
                  <option value="Admin">Admin</option>
                  <option value="Reclutador">Reclutador</option>
                </select>
              ) : (
                <span style={{ fontWeight: 'bold', color: '#8cc63f' }}>Reclutador</span>
              )}
            </div>
          </div>
        </header>

        {/* CONTENIDO DINÁMICO */}
        <main style={{ padding: '24px 32px', flex: 1 }}>
          {loading ? (
            <p style={{ textAlign: 'center', color: '#555' }}>Cargando información...</p>
          ) : (
            <>
              {/* VISTA 1: PANEL DE CADA CLIENTE */}
              {activeTab === 'CLIENTES' && activeClient && (
                <div>
                  {/* PESTAÑAS DE CLIENTES EN LA PARTE SUPERIOR */}
                  <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '12px', marginBottom: '16px', borderBottom: '2px solid #b8da8b' }}>
                    {clients.map(c => (
                      <button
                        key={c.id}
                        onClick={() => setSelectedClientId(c.id)}
                        style={{
                          backgroundColor: selectedClientId === c.id ? '#4a4f56' : '#ffffff',
                          color: selectedClientId === c.id ? '#ffffff' : '#333333',
                          border: 'none',
                          padding: '8px 16px',
                          borderRadius: '20px',
                          fontWeight: 'bold',
                          fontSize: '13px',
                          cursor: 'pointer',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {c.name}
                      </button>
                    ))}
                  </div>

                  {/* RESUMEN Y CONTROLES DEL CLIENTE SELECCIONADO */}
                  <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '20px', marginBottom: '20px', boxShadow: '0 2px 6px rgba(0,0,0,0.05)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                      <div>
                        <h1 style={{ margin: 0, color: '#2c3137', fontSize: '22px' }}>{activeClient.name}</h1>
                        <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#666' }}>
                          Ubicación: <strong>{activeClient.requirements?.location}</strong> | Perfil: <strong>{activeClient.requirements?.required_experience}</strong>
                        </p>
                      </div>

                      {viewMode === 'Admin' && (
                        <button
                          onClick={() => {
                            setEditingClient(activeClient);
                            setReqLocation(activeClient.requirements?.location || '');
                            setReqExperience(activeClient.requirements?.required_experience || '');
                            setReqKeywords((activeClient.requirements?.keywords || []).join(', '));
                            setIsEditReqModalOpen(true);
                          }}
                          style={{ backgroundColor: '#383d42', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}
                        >
                          ⚙ Editar Requisitos de Cliente
                        </button>
                      )}
                    </div>

                    {/* BARRA DE BUSCADOR Y FILTROS / ORDENAMIENTO */}
                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center', backgroundColor: '#f5f9ee', padding: '12px', borderRadius: '8px' }}>
                      <input
                        type="text"
                        placeholder="🔍 Buscador por nombre, localidad o experiencia..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{ flex: 1, minWidth: '240px', padding: '8px 12px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '13px' }}
                      />

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
                        <span style={{ color: '#555', fontWeight: 'bold' }}>Ordenar por:</span>
                        <select
                          value={sortBy}
                          onChange={(e) => setSortBy(e.target.value as SortOption)}
                          style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc', fontWeight: 'bold', fontSize: '12px' }}
                        >
                          <option value="MATCH_DESC">Mayor compatibilidad</option>
                          <option value="MATCH_ASC">Menor compatibilidad</option>
                          <option value="NEWEST">Más reciente</option>
                          <option value="OLDEST">Más antiguo</option>
                          <option value="LOCATION">Localidad</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* LISTA DE CANDIDATOS COMPATIBLES CON ESTE CLIENTE */}
                  <h2 style={{ fontSize: '16px', color: '#4a4f56', marginBottom: '12px' }}>
                    Candidatos Disponibles ({getFilteredAndSortedCandidates(activeClient).length})
                  </h2>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
                    {getFilteredAndSortedCandidates(activeClient).map((cand) => {
                      const matchPercent = calculateMatch(cand, activeClient);
                      return (
                        <div key={cand.id} style={{ backgroundColor: '#ffffff', borderRadius: '10px', border: '1.5px solid #d0e3b5', padding: '16px', position: 'relative' }}>
                          
                          {/* BADGE DE COMPATIBILIDAD PORCENTUAL */}
                          <div style={{ position: 'absolute', top: '14px', right: '14px', backgroundColor: matchPercent >= 80 ? '#28a745' : matchPercent >= 65 ? '#0056b3' : '#ffc107', color: '#ffffff', fontWeight: 'bold', padding: '4px 10px', borderRadius: '12px', fontSize: '13px' }}>
                            {matchPercent}% Match
                          </div>

                          <h3 style={{ margin: '0 0 6px 0', fontSize: '16px', color: '#2c3137' }}>{cand.first_name} {cand.last_name}</h3>
                          <p style={{ margin: '0 0 4px 0', fontSize: '12px', color: '#666' }}>📍 <strong>Localidad:</strong> {cand.location}</p>
                          <p style={{ margin: '0 0 12px 0', fontSize: '12px', color: '#555', height: '36px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            💼 <strong>Exp:</strong> {cand.main_experience}
                          </p>

                          <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                            <button
                              onClick={() => {
                                setSelectedCandidateForModal(cand);
                                setIsCandidateModalOpen(true);
                              }}
                              style={{ flex: 1, backgroundColor: '#f0f0f0', color: '#333', border: '1px solid #ccc', padding: '8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}
                            >
                              Ver Ficha
                            </button>
                            <button
                              onClick={() => handleContactCandidate(cand, activeClient)}
                              style={{ flex: 1, backgroundColor: '#8cc63f', color: '#ffffff', border: 'none', padding: '8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}
                            >
                              Contactar
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* VISTA 2: BASE COMPLETA DE CANDIDATOS NUEVOS */}
              {activeTab === 'NUEVOS' && (
                <div>
                  <h1 style={{ color: '#4a4f56', fontSize: '22px', fontWeight: 'bold', marginBottom: '16px' }}>
                    Base Única de Candidatos Nuevos ({candidates.filter(c => c.status === 'NUEVO').length})
                  </h1>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
                    {candidates.filter(c => c.status === 'NUEVO').map(cand => (
                      <div key={cand.id} style={{ backgroundColor: '#fff', borderRadius: '8px', padding: '16px', border: '1px solid #ccc' }}>
                        <h3 style={{ margin: 0, fontSize: '15px' }}>{cand.first_name} {cand.last_name}</h3>
                        <p style={{ fontSize: '12px', color: '#666', margin: '4px 0' }}>📍 {cand.location}</p>
                        <p style={{ fontSize: '12px', color: '#555', margin: '4px 0 12px 0' }}>💼 {cand.main_experience}</p>
                        <button onClick={() => { setSelectedCandidateForModal(cand); setIsCandidateModalOpen(true); }} style={{ width: '100%', backgroundColor: '#4a4f56', color: '#fff', border: 'none', padding: '6px', borderRadius: '4px', fontSize: '12px' }}>
                          Ver Ficha Completa
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* VISTA 3: MÓDULO CONTACTADOS CON RETORNO A CANDIDATOS */}
              {activeTab === 'CONTACTADOS' && (
                <div>
                  <h1 style={{ color: '#4a4f56', fontSize: '22px', fontWeight: 'bold', margin: '0 0 20px 0' }}>
                    Módulo Contactados ({contacts.length})
                  </h1>
                  <div style={{ backgroundColor: '#fff', borderRadius: '8px', overflow: 'hidden', border: '1px solid #ccc' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                      <thead>
                        <tr style={{ backgroundColor: '#f1f1f1', borderBottom: '1px solid #ccc', textAlign: 'left' }}>
                          <th style={{ padding: '12px' }}>Candidato</th>
                          <th style={{ padding: '12px' }}>Cliente Asignado</th>
                          <th style={{ padding: '12px' }}>Reclutador que Contactó</th>
                          <th style={{ padding: '12px' }}>Fecha Contacto</th>
                          <th style={{ padding: '12px', textAlign: 'center' }}>Acción</th>
                        </tr>
                      </thead>
                      <tbody>
                        {contacts.map((c) => (
                          <tr key={c.id} style={{ borderBottom: '1px solid #eee' }}>
                            <td style={{ padding: '12px', fontWeight: 'bold' }}>{c.candidate?.first_name} {c.candidate?.last_name}</td>
                            <td style={{ padding: '12px' }}>{c.client?.name || 'Corfrisa'}</td>
                            <td style={{ padding: '12px' }}>{c.recruiter_email}</td>
                            <td style={{ padding: '12px' }}>{new Date(c.created_at).toLocaleDateString()}</td>
                            <td style={{ padding: '12px', textAlign: 'center' }}>
                              <button
                                onClick={() => handleReturnToCandidates(c.id, c.candidate_id)}
                                style={{ backgroundColor: '#e2edd0', color: '#2c3137', border: '1px solid #8cc63f', padding: '4px 10px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}
                              >
                                ↩ Retornar a Candidatos
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {/* MODAL VER FICHA DEL CANDIDATO */}
      {isCandidateModalOpen && selectedCandidateForModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '10px', width: '450px', maxHeight: '80vh', overflowY: 'auto' }}>
            <h2 style={{ margin: '0 0 12px 0', color: '#2c3137' }}>{selectedCandidateForModal.first_name} {selectedCandidateForModal.last_name}</h2>
            <p><strong>Email:</strong> {selectedCandidateForModal.email || 'No registrado'}</p>
            <p><strong>Teléfono:</strong> {selectedCandidateForModal.phone || 'No registrado'}</p>
            <p><strong>Localidad:</strong> {selectedCandidateForModal.location}</p>
            <p><strong>Experiencia Principal:</strong> {selectedCandidateForModal.main_experience}</p>
            <p><strong>Competencias / Etiquetas:</strong> {(selectedCandidateForModal.skills || []).join(', ')}</p>
            <p><strong>Estado Actual:</strong> <span style={{ backgroundColor: '#8cc63f', color: '#fff', padding: '2px 8px', borderRadius: '4px', fontSize: '12px' }}>{selectedCandidateForModal.status}</span></p>
            
            <button onClick={() => setIsCandidateModalOpen(false)} style={{ marginTop: '16px', width: '100%', backgroundColor: '#4a4f56', color: '#fff', border: 'none', padding: '10px', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}>
              Cerrar Ficha
            </button>
          </div>
        </div>
      )}

      {/* MODAL EDITAR REQUISITOS CLIENTE (SOLO ADMIN) */}
      {isEditReqModalOpen && editingClient && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '10px', width: '400px' }}>
            <h3 style={{ margin: '0 0 16px 0' }}>Editar Requisitos: {editingClient.name}</h3>
            <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Localidad Requerida:</label>
            <input type="text" value={reqLocation} onChange={(e) => setReqLocation(e.target.value)} style={{ width: '100%', padding: '8px', marginBottom: '12px', border: '1px solid #ccc', borderRadius: '4px' }} />
            
            <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Experiencia / Perfil Buscado:</label>
            <input type="text" value={reqExperience} onChange={(e) => setReqExperience(e.target.value)} style={{ width: '100%', padding: '8px', marginBottom: '12px', border: '1px solid #ccc', borderRadius: '4px' }} />

            <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Palabras Clave (separadas por coma):</label>
            <input type="text" value={reqKeywords} onChange={(e) => setReqKeywords(e.target.value)} style={{ width: '100%', padding: '8px', marginBottom: '16px', border: '1px solid #ccc', borderRadius: '4px' }} />

            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={handleSaveRequirements} style={{ flex: 1, backgroundColor: '#8cc63f', color: '#fff', border: 'none', padding: '10px', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}>Guardar</button>
              <button onClick={() => setIsEditReqModalOpen(false)} style={{ flex: 1, backgroundColor: '#ccc', border: 'none', padding: '10px', borderRadius: '4px', cursor: 'pointer' }}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
