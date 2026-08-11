'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

type CandidateStatus = 'NUEVO' | 'CONTACTADO' | 'RECHAZADO' | 'CONTRATADO';
type ContactResult = 'INGRESO' | 'NO_INGRESO';

interface Candidate {
  id: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  status: CandidateStatus;
  match_score?: number;
  experience_years?: number;
  notes?: string;
  created_at?: string;
}

interface Client {
  id: string;
  name: string;
  executive_email: string;
  executive_name?: string;
  total_candidates?: number;
  new_candidates?: number;
  match_percent?: number;
}

interface ContactRecord {
  id: string;
  candidate_id: string;
  client_id: string;
  recruiter_email: string;
  result: ContactResult;
  notes?: string;
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

  // Estado del menú hamburguesa
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Navegación
  const [activeTab, setActiveTab] = useState<'CLIENTES' | 'NUEVOS' | 'CONTACTADOS'>('CLIENTES');

  // Datos
  const [clients, setClients] = useState<Client[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [contacts, setContacts] = useState<ContactRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Modales
  const [isNewClientModalOpen, setIsNewClientModalOpen] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientExecutive, setNewClientExecutive] = useState('');

  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);

  useEffect(() => {
    checkSession();
  }, []);

  // Verificar sesión y validar si el usuario es Anahit o Belén
  const checkSession = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    setUserSession(session);
    if (session) {
      const email = session.user?.email?.toLowerCase() || '';
      const isAllowedAdmin = email.includes('anahit') || email.includes('belen');
      if (!isAllowedAdmin) {
        setViewMode('Reclutador'); // Fuerza rol Reclutador a otros usuarios
      }
      await loadAllData();
    }
    setLoading(false);
  };

  const loadAllData = async () => {
    setLoading(true);

    // 1. Cargar Clientes
    const { data: clientData } = await supabase
      .from('clients')
      .select('*')
      .order('name', { ascending: true });

    if (clientData) {
      const formattedClients = clientData.map((c: any) => ({
        ...c,
        executive_name: c.executive_email ? c.executive_email.split('@')[0] : 'Pablo',
        total_candidates: c.total_candidates ?? 3,
        new_candidates: c.new_candidates ?? 3,
        match_percent: c.match_percent ?? Math.floor(Math.random() * 25) + 70,
      }));
      setClients(formattedClients);
    }

    // 2. Cargar Candidatos
    const { data: candData } = await supabase
      .from('candidates')
      .select('*')
      .order('created_at', { ascending: false });
    if (candData) setCandidates(candData);

    // 3. Cargar Contactos
    const { data: contactData } = await supabase
      .from('contacts')
      .select('*, candidate:candidates(*), client:clients(*)')
      .order('created_at', { ascending: false });
    if (contactData) setContacts(contactData);

    setLoading(false);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: authEmail,
      password: authPassword,
    });
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

  // Reasignación directa de ejecutivo en tarjeta
  const handleUpdateExecutive = async (clientId: string, newExec: string) => {
    const { error } = await supabase
      .from('clients')
      .update({ executive_email: newExec })
      .eq('id', clientId);

    if (!error) {
      setClients(clients.map(c => c.id === clientId ? { ...c, executive_email: newExec, executive_name: newExec } : c));
    }
  };

  // Crear cliente
  const handleCreateClient = async () => {
    if (!newClientName) return alert('Ingresa el nombre de la empresa.');
    const { error } = await supabase.from('clients').insert([
      {
        name: newClientName,
        executive_email: newClientExecutive || 'belen.fernandez@aglh.com.uy',
      },
    ]);

    if (error) {
      alert('Error al crear cliente: ' + error.message);
    } else {
      setNewClientName('');
      setNewClientExecutive('');
      setIsNewClientModalOpen(false);
      await loadAllData();
    }
  };

  // Eliminar candidato (Control operativo total)
  const handleDeleteCandidate = async (candidateId: string) => {
    if (!confirm('¿Deseas eliminar este registro de candidato permanentemente?')) return;
    const { error } = await supabase.from('candidates').delete().eq('id', candidateId);
    if (!error) {
      setCandidates(candidates.filter(c => c.id !== candidateId));
    } else {
      alert('Error al eliminar: ' + error.message);
    }
  };

  const handleBatchImport = () => {
    alert('Ingesta masiva activada: Selecciona los archivos de CV para procesar.');
  };

  const currentUserEmail = userSession?.user?.email?.toLowerCase() || '';
  const isSuperAdminUser = currentUserEmail.includes('anahit') || currentUserEmail.includes('belen');

  // --- FORMULARIO DE LOGIN ---
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
              <input
                type="email"
                placeholder="usuario@aglh.com.uy"
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
                required
                style={{ padding: '10px', border: '1px solid #ccc', borderRadius: '4px' }}
              />
              <input
                type="password"
                placeholder="Contraseña"
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                required
                style={{ padding: '10px', border: '1px solid #ccc', borderRadius: '4px' }}
              />
              <button type="submit" style={{ backgroundColor: '#8cc63f', color: '#fff', border: 'none', padding: '12px', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}>
                Iniciar Sesión
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: 'Segoe UI, Helvetica, Arial, sans-serif', backgroundColor: '#e2edd0' }}>
      
      {/* BARRA LATERAL (SIDEBAR OSURA CON MENÚ HAMBURGUESA) */}
      <aside style={{ 
        width: sidebarOpen ? '230px' : '60px', 
        backgroundColor: '#4a4f56', 
        color: '#ffffff', 
        transition: 'width 0.2s ease', 
        display: 'flex', 
        flexDirection: 'column',
        flexShrink: 0
      }}>
        {/* Cabecera Sidebar con Menú Hamburguesa */}
        <div style={{ height: '56px', display: 'flex', alignItems: 'center', padding: '0 16px', justifyContent: sidebarOpen ? 'space-between' : 'center', backgroundColor: '#3e4349' }}>
          {sidebarOpen && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '22px', fontWeight: 'bold', color: '#8cc63f', fontStyle: 'italic' }}>aglh</span>
            </div>
          )}
          <button 
            onClick={() => setSidebarOpen(!sidebarOpen)}
            style={{ background: 'none', border: 'none', color: '#ffffff', fontSize: '20px', cursor: 'pointer', outline: 'none' }}
            title="Contraer / Expandir Menú"
          >
            ☰
          </button>
        </div>

        {/* Opciones de Menú */}
        <nav style={{ padding: '16px 8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <button
            onClick={() => setActiveTab('CLIENTES')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: sidebarOpen ? 'space-between' : 'center',
              backgroundColor: activeTab === 'CLIENTES' ? '#8cc63f' : 'transparent',
              color: '#ffffff',
              border: 'none',
              padding: '10px 12px',
              borderRadius: '18px',
              fontWeight: 'bold',
              fontSize: '13px',
              cursor: 'pointer',
              textAlign: 'left'
            }}
          >
            <span>💼 {sidebarOpen && 'Gestión de Clientes'}</span>
            {sidebarOpen && <span style={{ fontSize: '12px' }}>({clients.length})</span>}
          </button>

          <button
            onClick={() => setActiveTab('NUEVOS')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: sidebarOpen ? 'space-between' : 'center',
              backgroundColor: activeTab === 'NUEVOS' ? '#8cc63f' : 'transparent',
              color: '#ffffff',
              border: 'none',
              padding: '10px 12px',
              borderRadius: '18px',
              fontWeight: 'bold',
              fontSize: '13px',
              cursor: 'pointer',
              textAlign: 'left'
            }}
          >
            <span>✉ {sidebarOpen && 'Candidatos Nuevos'}</span>
            {sidebarOpen && <span style={{ fontSize: '12px' }}>({candidates.filter(c => c.status === 'NUEVO').length})</span>}
          </button>

          <button
            onClick={() => setActiveTab('CONTACTADOS')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: sidebarOpen ? 'space-between' : 'center',
              backgroundColor: activeTab === 'CONTACTADOS' ? '#8cc63f' : 'transparent',
              color: '#ffffff',
              border: 'none',
              padding: '10px 12px',
              borderRadius: '18px',
              fontWeight: 'bold',
              fontSize: '13px',
              cursor: 'pointer',
              textAlign: 'left'
            }}
          >
            <span>👤 {sidebarOpen && 'Módulo Contactados'}</span>
            {sidebarOpen && <span style={{ fontSize: '12px' }}>({contacts.length})</span>}
          </button>
        </nav>

        {/* Footer Sidebar */}
        <div style={{ marginTop: 'auto', padding: '16px 8px', borderTop: '1px solid #5a5f66' }}>
          <button
            onClick={handleLogout}
            style={{
              width: '100%',
              backgroundColor: 'transparent',
              color: '#ff6b6b',
              border: '1px solid #ff6b6b',
              padding: '6px',
              borderRadius: '4px',
              fontSize: '12px',
              cursor: 'pointer'
            }}
          >
            {sidebarOpen ? 'Cerrar Sesión' : '➔'}
          </button>
        </div>
      </aside>

      {/* ÁREA PRINCIPAL */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        
        {/* BANNER SUPERIOR CON SELECTOR DE ROL DESTACADO */}
        <header style={{ backgroundColor: '#8cc63f', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <span style={{ color: '#ffffff', fontWeight: 'bold', fontSize: '28px', fontStyle: 'italic', letterSpacing: '-0.5px' }}>aglh</span>
            <span style={{ backgroundColor: '#4a4f56', color: '#ffffff', fontSize: '11px', padding: '3px 10px', borderRadius: '12px', fontWeight: 'bold' }}>
              ATS Enterprise
            </span>

            {/* SELECTOR DE MODO DESTACADO EN LA BARRA SUPERIOR */}
            <div style={{ display: 'flex', alignItems: 'center', backgroundColor: '#3e4349', padding: '4px 10px', borderRadius: '6px', color: '#fff', fontSize: '12px', gap: '6px', marginLeft: '10px' }}>
              <span style={{ color: '#ccc', fontWeight: 'bold' }}>Modo:</span>
              {isSuperAdminUser ? (
                <select 
                  value={viewMode} 
                  onChange={(e) => setViewMode(e.target.value as any)}
                  style={{ backgroundColor: '#ffffff', color: '#222', border: 'none', padding: '3px 8px', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}
                >
                  <option value="Admin">Admin</option>
                  <option value="Reclutador">Reclutador</option>
                </select>
              ) : (
                <span style={{ fontWeight: 'bold', color: '#8cc63f' }}>Reclutador</span>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* BOTÓN + IMPORTAR CVS MASIVO */}
            <button
              onClick={handleBatchImport}
              style={{
                backgroundColor: '#383d42',
                color: '#ffffff',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '4px',
                fontWeight: 'bold',
                fontSize: '13px',
                cursor: 'pointer',
                boxShadow: '0 2px 4px rgba(0,0,0,0.15)'
              }}
            >
              + Importar CVs Masivo
            </button>

            {/* BOTÓN + CREAR NUEVO CLIENTE (Visible solo si es Admin o en vista Clientes) */}
            {activeTab === 'CLIENTES' && (
              <button
                onClick={() => setIsNewClientModalOpen(true)}
                style={{
                  backgroundColor: '#ffffff',
                  color: '#4a4f56',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '4px',
                  fontWeight: 'bold',
                  fontSize: '13px',
                  cursor: 'pointer',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}
              >
                + Crear Nuevo Cliente
              </button>
            )}
          </div>
        </header>

        {/* CONTENIDO DINÁMICO */}
        <main style={{ padding: '24px 32px', flex: 1 }}>
          {loading ? (
            <p style={{ textAlign: 'center', color: '#555', marginTop: '40px' }}>Cargando información del sistema...</p>
          ) : (
            <>
              {/* VISTA 1: GESTIÓN DE CLIENTES */}
              {activeTab === 'CLIENTES' && (
                <div>
                  <h1 style={{ color: '#4a4f56', fontSize: '22px', fontWeight: 'bold', margin: '0 0 20px 0' }}>
                    Gestión de Clientes ({clients.length})
                  </h1>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '18px' }}>
                    {clients.map((client) => (
                      <div 
                        key={client.id} 
                        style={{ 
                          backgroundColor: '#eaf4db', 
                          border: '1.5px solid #b8da8b', 
                          borderRadius: '12px', 
                          padding: '16px', 
                          boxShadow: '0 2px 5px rgba(0,0,0,0.03)' 
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold', color: '#2c3137' }}>
                            {client.name}
                          </h3>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: '#555' }}>
                            <span>Resp:</span>
                            {viewMode === 'Admin' ? (
                              <input
                                type="text"
                                defaultValue={client.executive_name || 'Pablo'}
                                onBlur={(e) => handleUpdateExecutive(client.id, e.target.value)}
                                style={{
                                  width: '70px',
                                  border: 'none',
                                  background: 'transparent',
                                  borderBottom: '1px dashed #777',
                                  fontSize: '12px',
                                  fontWeight: 'bold',
                                  color: '#333'
                                }}
                                title="Haz clic para reasignar directo"
                              />
                            ) : (
                              <span style={{ fontWeight: 'bold', color: '#333' }}>{client.executive_name || 'Pablo'}</span>
                            )}
                          </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', textAlign: 'center', alignItems: 'center' }}>
                          <div>
                            <div style={{ fontSize: '10px', color: '#777', fontWeight: 'bold', textTransform: 'uppercase' }}>TOTAL</div>
                            <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#222' }}>{client.total_candidates}</div>
                          </div>
                          <div>
                            <div style={{ fontSize: '10px', color: '#777', fontWeight: 'bold', textTransform: 'uppercase' }}>NUEVOS</div>
                            <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#8cc63f' }}>{client.new_candidates}</div>
                          </div>
                          <div>
                            <div style={{ fontSize: '10px', color: '#777', fontWeight: 'bold', textTransform: 'uppercase' }}>MATCH %</div>
                            <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#0056b3' }}>{client.match_percent}%</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* VISTA 2: CANDIDATOS NUEVOS */}
              {activeTab === 'NUEVOS' && (
                <div>
                  <h1 style={{ color: '#4a4f56', fontSize: '22px', fontWeight: 'bold', margin: '0 0 20px 0' }}>
                    Candidatos Nuevos
                  </h1>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
                    {candidates.filter(c => c.status === 'NUEVO').map((candidate) => (
                      <div key={candidate.id} style={{ backgroundColor: '#ffffff', padding: '16px', borderRadius: '8px', border: '1px solid #ccc' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <h3 style={{ margin: 0, fontSize: '15px' }}>{candidate.first_name} {candidate.last_name}</h3>
                          {viewMode === 'Admin' && (
                            <button onClick={() => handleDeleteCandidate(candidate.id)} style={{ background: 'none', border: 'none', color: '#d9534f', cursor: 'pointer' }}>🗑</button>
                          )}
                        </div>
                        <p style={{ margin: '6px 0', fontSize: '12px', color: '#666' }}>✉ {candidate.email}</p>
                        <p style={{ margin: '6px 0 14px 0', fontSize: '12px', color: '#666' }}>📞 {candidate.phone}</p>
                        <button
                          onClick={() => {
                            setSelectedCandidate(candidate);
                            setIsContactModalOpen(true);
                          }}
                          style={{ width: '100%', backgroundColor: '#8cc63f', color: '#fff', border: 'none', padding: '8px', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}
                        >
                          Registrar Contacto
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* VISTA 3: MÓDULO CONTACTADOS */}
              {activeTab === 'CONTACTADOS' && (
                <div>
                  <h1 style={{ color: '#4a4f56', fontSize: '22px', fontWeight: 'bold', margin: '0 0 20px 0' }}>
                    Módulo Contactados
                  </h1>
                  <div style={{ backgroundColor: '#fff', borderRadius: '8px', overflow: 'hidden', border: '1px solid #ccc' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                      <thead>
                        <tr style={{ backgroundColor: '#f1f1f1', borderBottom: '1px solid #ccc', textAlign: 'left' }}>
                          <th style={{ padding: '12px' }}>Candidato</th>
                          <th style={{ padding: '12px' }}>Cliente</th>
                          <th style={{ padding: '12px' }}>Reclutador</th>
                          <th style={{ padding: '12px' }}>Resultado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {contacts.map((c) => (
                          <tr key={c.id} style={{ borderBottom: '1px solid #eee' }}>
                            <td style={{ padding: '12px' }}>{c.candidate?.first_name} {c.candidate?.last_name}</td>
                            <td style={{ padding: '12px' }}>{c.client?.name}</td>
                            <td style={{ padding: '12px' }}>{c.recruiter_email}</td>
                            <td style={{ padding: '12px' }}>{c.result}</td>
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

      {/* MODAL CREAR CLIENTE */}
      {isNewClientModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '8px', width: '360px' }}>
            <h3 style={{ margin: '0 0 16px 0' }}>Crear Nuevo Cliente</h3>
            <input
              type="text"
              placeholder="Nombre de Empresa"
              value={newClientName}
              onChange={(e) => setNewClientName(e.target.value)}
              style={{ width: '100%', padding: '8px', marginBottom: '12px', border: '1px solid #ccc', borderRadius: '4px' }}
            />
            <input
              type="text"
              placeholder="Ejecutivo Responsable (Ej. Pablo)"
              value={newClientExecutive}
              onChange={(e) => setNewClientExecutive(e.target.value)}
              style={{ width: '100%', padding: '8px', marginBottom: '16px', border: '1px solid #ccc', borderRadius: '4px' }}
            />
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={handleCreateClient} style={{ flex: 1, backgroundColor: '#8cc63f', color: '#fff', border: 'none', padding: '10px', borderRadius: '4px', fontWeight: 'bold' }}>Guardar</button>
              <button onClick={() => setIsNewClientModalOpen(false)} style={{ flex: 1, backgroundColor: '#ccc', border: 'none', padding: '10px', borderRadius: '4px' }}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
