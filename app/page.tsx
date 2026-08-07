'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

// Inicialización del cliente de Supabase
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
  match_score?: number; // Porcentaje de coincidencia
  experience_years?: number;
  notes?: string;
  created_at?: string;
}

interface Client {
  id: string;
  name: string;
  executive_email: string;
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
  // Autenticación y datos generales
  const [userSession, setUserSession] = useState<any>(null);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');

  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [contacts, setContacts] = useState<ContactRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Estados de interfaz y modales
  const [activeTab, setActiveTab] = useState<'NUEVOS' | 'CONTACTADOS' | 'CLIENTES'>('NUEVOS');
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [contactNotes, setContactNotes] = useState('');

  const [isNewClientModalOpen, setIsNewClientModalOpen] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientExecutive, setNewClientExecutive] = useState('');

  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    setUserSession(session);
    if (session) {
      await loadAllData();
    }
    setLoading(false);
  };

  const loadAllData = async () => {
    setLoading(true);
    
    // 1. Cargar Candidatos
    const { data: candData } = await supabase
      .from('candidates')
      .select('*')
      .order('created_at', { ascending: false });
    if (candData) setCandidates(candData);

    // 2. Cargar Clientes
    const { data: clientData } = await supabase
      .from('clients')
      .select('*')
      .order('name', { ascending: true });
    if (clientData) setClients(clientData);

    // 3. Cargar Contactos (Histórico)
    const { data: contactData } = await supabase
      .from('contacts')
      .select('*, candidate:candidates(*), client:clients(*)')
      .order('created_at', { ascending: false });
    if (contactData) setContacts(contactData);

    setLoading(false);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authEmail.endsWith('@aglh.com.uy')) {
      alert('Acceso restringido únicamente a cuentas institucionales @aglh.com.uy');
      return;
    }
    const { data, error } = await supabase.auth.signInWithPassword({
      email: authEmail,
      password: authPassword,
    });
    if (error) {
      alert('Error de acceso: ' + error.message);
    } else {
      setUserSession(data.session);
      await loadAllData();
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUserSession(null);
  };

  // Abrir Modal de Contacto
  const openContactModal = (candidate: Candidate) => {
    setSelectedCandidate(candidate);
    setSelectedClientId(clients.length > 0 ? clients[0].id : '');
    setContactNotes('');
    setIsContactModalOpen(true);
  };

  // Guardar resultado de contacto
  const handleConfirmContact = async (result: ContactResult) => {
    if (!selectedCandidate) return;
    if (!selectedClientId) {
      alert('Debes seleccionar un cliente/empresa de la lista.');
      return;
    }

    const recruiterEmail = userSession?.user?.email || 'belen.fernandez@aglh.com.uy';

    const { error: insertError } = await supabase.from('contacts').insert([
      {
        candidate_id: selectedCandidate.id,
        client_id: selectedClientId,
        recruiter_email: recruiterEmail,
        result: result,
        notes: contactNotes,
      },
    ]);

    if (insertError) {
      alert(`Error al guardar: ${insertError.message}`);
      return;
    }

    // Actualizar estado a CONTACTADO
    await supabase
      .from('candidates')
      .update({ status: 'CONTACTADO' })
      .eq('id', selectedCandidate.id);

    setIsContactModalOpen(false);
    setSelectedCandidate(null);
    await loadAllData();
  };

  // Crear cliente nuevo
  const handleCreateClient = async () => {
    if (!newClientName) {
      alert('Ingresa el nombre del cliente.');
      return;
    }
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

  // Modificar ejecutivo del cliente
  const handleUpdateExecutive = async (clientId: string, newEmail: string) => {
    const { error } = await supabase
      .from('clients')
      .update({ executive_email: newEmail })
      .eq('id', clientId);

    if (!error) {
      setClients(clients.map(c => c.id === clientId ? { ...c, executive_email: newEmail } : c));
    }
  };

  // --- LOGIN (Estética Institucional AGLH) ---
  if (!userSession) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', fontFamily: 'Segoe UI, Arial, sans-serif' }}>
        <div style={{ width: '50px', backgroundColor: '#1f2430', padding: '12px 0', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ width: '28px', height: '28px', backgroundColor: '#8cc63f', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 'bold', fontSize: '14px' }}>v</div>
        </div>
        <div style={{ flex: 1, backgroundColor: '#f8f9fa' }}>
          <header style={{ backgroundColor: '#8cc63f', height: '52px', display: 'flex', alignItems: 'center', paddingLeft: '24px' }}>
            <span style={{ color: '#ffffff', fontWeight: 'bold', fontSize: '26px', fontStyle: 'italic', letterSpacing: '0.5px' }}>aGLh</span>
            <span style={{ color: '#ffffff', fontSize: '10px', marginLeft: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Servicios Humanos Integrales</span>
          </header>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 'calc(100vh - 52px)' }}>
            <div style={{ backgroundColor: '#ffffff', padding: '36px', borderRadius: '4px', width: '100%', maxWidth: '360px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: '1px solid #e0e0e0' }}>
              <h2 style={{ textAlign: 'center', color: '#4a4a4a', fontSize: '20px', marginBottom: '24px', fontWeight: '400' }}>Acceso ATS Corporativo</h2>
              <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <input
                  type="email"
                  placeholder="usuario@aglh.com.uy"
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  required
                  style={{ padding: '10px 12px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '14px', outline: 'none' }}
                />
                <input
                  type="password"
                  placeholder="Contraseña"
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  required
                  style={{ padding: '10px 12px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '14px', outline: 'none' }}
                />
                <button type="submit" style={{ backgroundColor: '#8cc63f', color: '#fff', border: 'none', padding: '12px', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', fontSize: '14px' }}>
                  Ingresar al Sistema
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- VISTA PRINCIPAL (Estética Web AGLH + Funcionalidades Integrales) ---
  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: 'Segoe UI, Arial, sans-serif', backgroundColor: '#f8f9fa' }}>
      
      {/* Lateral Izquierdo Oscuro */}
      <aside style={{ width: '50px', backgroundColor: '#1f2430', color: '#a0a7b5', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '12px 0', gap: '22px', flexShrink: 0 }}>
        <div style={{ width: '28px', height: '28px', backgroundColor: '#8cc63f', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 'bold', fontSize: '14px' }}>v</div>
        <div style={{ width: '100%', height: '1px', backgroundColor: '#2d3446' }} />
        <div title="Nuevos" onClick={() => setActiveTab('NUEVOS')} style={{ cursor: 'pointer', fontSize: '16px', color: activeTab === 'NUEVOS' ? '#8cc63f' : 'inherit' }}>✉</div>
        <div title="Contactados" onClick={() => setActiveTab('CONTACTADOS')} style={{ cursor: 'pointer', fontSize: '16px', color: activeTab === 'CONTACTADOS' ? '#8cc63f' : 'inherit' }}>👤</div>
        <div title="Gestión de Clientes" onClick={() => setActiveTab('CLIENTES')} style={{ cursor: 'pointer', fontSize: '16px', color: activeTab === 'CLIENTES' ? '#8cc63f' : 'inherit' }}>💼</div>
        <div title="Cerrar Sesión" onClick={handleLogout} style={{ marginTop: 'auto', cursor: 'pointer', fontSize: '16px', color: '#e74c3c' }}>➔</div>
      </aside>

      {/* Contenido Principal */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        
        {/* Banner Superior Verde AGLH */}
        <header style={{ backgroundColor: '#8cc63f', height: '52px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <span style={{ color: '#ffffff', fontWeight: 'bold', fontSize: '26px', fontStyle: 'italic', letterSpacing: '0.5px' }}>aGLh</span>
            <span style={{ color: '#ffffff', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Servicios Humanos Integrales</span>
          </div>
          <div style={{ color: '#fff', fontSize: '13px', fontWeight: '500' }}>
            {userSession?.user?.email || 'belen.fernandez@aglh.com.uy'}
          </div>
        </header>

        <main style={{ padding: '30px 40px', flex: 1 }}>
          
          <h1 style={{ textAlign: 'center', color: '#4a4a4a', fontSize: '22px', fontWeight: '400', margin: '0 0 24px 0' }}>
            Lista de abastecimiento de Talentos
          </h1>

          {/* Menú de Operativa / Pestañas */}
          <div style={{ borderTop: '1px solid #e0e0e0', paddingTop: '16px', marginBottom: '20px' }}>
            <span style={{ color: '#8cc63f', fontSize: '13px', fontWeight: '600', display: 'block', marginBottom: '12px' }}>
              Operativa
            </span>

            <div style={{ display: 'flex', gap: '10px', backgroundColor: '#fff', border: '1px solid #e0e0e0', borderRadius: '4px', padding: '4px' }}>
              <button
                onClick={() => setActiveTab('NUEVOS')}
                style={{ flex: 1, padding: '9px', border: 'none', borderRadius: '3px', cursor: 'pointer', fontSize: '13px', backgroundColor: activeTab === 'NUEVOS' ? '#8cc63f' : 'transparent', color: activeTab === 'NUEVOS' ? '#fff' : '#555', fontWeight: activeTab === 'NUEVOS' ? 'bold' : 'normal' }}
              >
                Candidatos Nuevos ({candidates.filter(c => c.status === 'NUEVO').length})
              </button>
              <button
                onClick={() => setActiveTab('CONTACTADOS')}
                style={{ flex: 1, padding: '9px', border: 'none', borderRadius: '3px', cursor: 'pointer', fontSize: '13px', backgroundColor: activeTab === 'CONTACTADOS' ? '#8cc63f' : 'transparent', color: activeTab === 'CONTACTADOS' ? '#fff' : '#555', fontWeight: activeTab === 'CONTACTADOS' ? 'bold' : 'normal' }}
              >
                Módulo Contactados ({contacts.length})
              </button>
              <button
                onClick={() => setActiveTab('CLIENTES')}
                style={{ flex: 1, padding: '9px', border: 'none', borderRadius: '3px', cursor: 'pointer', fontSize: '13px', backgroundColor: activeTab === 'CLIENTES' ? '#8cc63f' : 'transparent', color: activeTab === 'CLIENTES' ? '#fff' : '#555', fontWeight: activeTab === 'CLIENTES' ? 'bold' : 'normal' }}
              >
                Gestión de Clientes ({clients.length})
              </button>
            </div>
          </div>

          {loading ? (
            <p style={{ textAlign: 'center', color: '#888', marginTop: '40px' }}>Cargando datos del portal...</p>
          ) : (
            <>
              {/* TAB 1: CANDIDATOS NUEVOS CON PORCENTAJE DE COINCIDENCIA */}
              {activeTab === 'NUEVOS' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))', gap: '16px', marginTop: '20px' }}>
                  {candidates.filter(c => c.status === 'NUEVO').map((candidate) => {
                    const match = candidate.match_score ?? Math.floor(Math.random() * 25) + 75; // Valor guardado o simulado
                    return (
                      <div key={candidate.id} style={{ backgroundColor: '#fff', padding: '18px', border: '1px solid #e0e0e0', borderRadius: '4px', position: 'relative' }}>
                        {/* Coincidencia / Match Score */}
                        <div style={{ position: 'absolute', top: '16px', right: '16px', backgroundColor: match >= 85 ? '#e8f5e9' : '#fff3e0', color: match >= 85 ? '#2e7d32' : '#e65100', border: `1px solid ${match >= 85 ? '#a5d6a7' : '#ffe0b2'}`, padding: '3px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold' }}>
                          🎯 {match}% Coincidencia
                        </div>

                        <h3 style={{ margin: '0 0 10px 0', fontSize: '15px', color: '#333', paddingRight: '110px' }}>
                          {candidate.first_name} {candidate.last_name}
                        </h3>
                        <p style={{ margin: '4px 0', fontSize: '12px', color: '#666' }}>✉ {candidate.email || 'Sin correo'}</p>
                        <p style={{ margin: '4px 0 16px 0', fontSize: '12px', color: '#666' }}>📞 {candidate.phone || 'Sin teléfono'}</p>
                        
                        <button
                          onClick={() => openContactModal(candidate)}
                          style={{ width: '100%', backgroundColor: '#8cc63f', color: '#fff', border: 'none', padding: '9px', borderRadius: '3px', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer' }}
                        >
                          Registrar Contacto
                        </button>
                      </div>
                    );
                  })}
                  {candidates.filter(c => c.status === 'NUEVO').length === 0 && (
                    <p style={{ color: '#888', gridColumn: '1 / -1', textAlign: 'center', padding: '30px' }}>No hay candidatos nuevos para gestionar.</p>
                  )}
                </div>
              )}

              {/* TAB 2: MÓDULO CONTACTADOS */}
              {activeTab === 'CONTACTADOS' && (
                <div style={{ backgroundColor: '#fff', border: '1px solid #e0e0e0', borderRadius: '4px', overflow: 'hidden', marginTop: '20px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f1f1f1', borderBottom: '1px solid #e0e0e0' }}>
                        <th style={{ padding: '12px 16px', color: '#444' }}>Candidato</th>
                        <th style={{ padding: '12px 16px', color: '#444' }}>Empresa Cliente</th>
                        <th style={{ padding: '12px 16px', color: '#444' }}>Reclutador AGLH</th>
                        <th style={{ padding: '12px 16px', color: '#444' }}>Resultado</th>
                        <th style={{ padding: '12px 16px', color: '#444' }}>Notas / Comentarios</th>
                      </tr>
                    </thead>
                    <tbody>
                      {contacts.map((item) => (
                        <tr key={item.id} style={{ borderBottom: '1px solid #f5f5f5' }}>
                          <td style={{ padding: '12px 16px', fontWeight: 'bold', color: '#333' }}>
                            {item.candidate ? `${item.candidate.first_name} ${item.candidate.last_name}` : 'Candidato'}
                          </td>
                          <td style={{ padding: '12px 16px', color: '#555' }}>
                            {item.client ? item.client.name : 'Sin asignar'}
                          </td>
                          <td style={{ padding: '12px 16px', color: '#777', fontSize: '12px' }}>{item.recruiter_email}</td>
                          <td style={{ padding: '12px 16px' }}>
                            <span style={{ padding: '4px 10px', borderRadius: '3px', fontSize: '11px', fontWeight: 'bold', backgroundColor: item.result === 'INGRESO' ? '#e8f5e9' : '#ffebee', color: item.result === 'INGRESO' ? '#2e7d32' : '#c62828' }}>
                              {item.result === 'INGRESO' ? '✓ Ingresó' : '✕ No Ingresó'}
                            </span>
                          </td>
                          <td style={{ padding: '12px 16px', color: '#666' }}>{item.notes || '-'}</td>
                        </tr>
                      ))}
                      {contacts.length === 0 && (
                        <tr>
                          <td colSpan={5} style={{ padding: '24px', textAlign: 'center', color: '#888' }}>Sin datos en el módulo contactados.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {/* TAB 3: PANEL / GESTIÓN DE CLIENTES */}
              {activeTab === 'CLIENTES' && (
                <div style={{ marginTop: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <span style={{ fontSize: '14px', color: '#555', fontWeight: '600' }}>Directorio de Empresas y Ejecutivos Asignados</span>
                    <button
                      onClick={() => setIsNewClientModalOpen(true)}
                      style={{ backgroundColor: '#8cc63f', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '3px', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer' }}
                    >
                      + Crear Nueva Empresa
                    </button>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
                    {clients.map((client) => (
                      <div key={client.id} style={{ backgroundColor: '#fff', padding: '18px', border: '1px solid #e0e0e0', borderRadius: '4px' }}>
                        <h3 style={{ margin: '0 0 12px 0', fontSize: '15px', color: '#333' }}>🏢 {client.name}</h3>
                        <label style={{ fontSize: '11px', color: '#777', display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>Ejecutivo AGLH:</label>
                        <input
                          type="email"
                          value={client.executive_email}
                          onChange={(e) => handleUpdateExecutive(client.id, e.target.value)}
                          style={{ width: '100%', padding: '7px 9px', border: '1px solid #ccc', borderRadius: '3px', fontSize: '12px', boxSizing: 'border-box' }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {/* MODAL PARA CONTACTAR Y ENVIAR A CLIENTE */}
      {isContactModalOpen && selectedCandidate && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: '#fff', borderRadius: '4px', width: '420px', padding: '24px', border: '1px solid #ccc', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
            <h3 style={{ margin: '0 0 14px 0', fontSize: '16px', color: '#333' }}>
              Gestión: {selectedCandidate.first_name} {selectedCandidate.last_name}
            </h3>
            
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '6px', color: '#444' }}>Seleccionar Cliente / Empresa *</label>
            <select
              value={selectedClientId}
              onChange={(e) => setSelectedClientId(e.target.value)}
              style={{ width: '100%', padding: '9px', borderRadius: '3px', border: '1px solid #ccc', marginBottom: '14px', fontSize: '13px' }}
            >
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>

            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '6px', color: '#444' }}>Notas / Observaciones</label>
            <textarea
              rows={3}
              placeholder="Escribe comentarios sobre la llamada o estado del candidato..."
              value={contactNotes}
              onChange={(e) => setContactNotes(e.target.value)}
              style={{ width: '100%', padding: '9px', borderRadius: '3px', border: '1px solid #ccc', marginBottom: '18px', fontSize: '13px', boxSizing: 'border-box' }}
            />

            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => handleConfirmContact('INGRESO')} style={{ flex: 1, backgroundColor: '#8cc63f', color: '#fff', border: 'none', padding: '10px', borderRadius: '3px', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px' }}>
                ✓ Ingresó
              </button>
              <button onClick={() => handleConfirmContact('NO_INGRESO')} style={{ flex: 1, backgroundColor: '#e74c3c', color: '#fff', border: 'none', padding: '10px', borderRadius: '3px', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px' }}>
                ✕ No Ingresó
              </button>
            </div>
            <button onClick={() => setIsContactModalOpen(false)} style={{ width: '100%', marginTop: '10px', background: 'none', border: 'none', color: '#777', cursor: 'pointer', fontSize: '12px' }}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* MODAL CREAR NUEVO CLIENTE */}
      {isNewClientModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: '#fff', borderRadius: '4px', width: '380px', padding: '24px', border: '1px solid #ccc', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', color: '#333' }}>Crear Empresa Cliente</h3>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px', color: '#444' }}>Nombre de la Empresa</label>
              <input
                type="text"
                placeholder="Ej. Kevenoll"
                value={newClientName}
                onChange={(e) => setNewClientName(e.target.value)}
                style={{ width: '100%', padding: '8px', borderRadius: '3px', border: '1px solid #ccc', fontSize: '13px', boxSizing: 'border-box' }}
              />
            </div>
            <div style={{ marginBottom: '18px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px', color: '#444' }}>Ejecutivo Asignado (@aglh.com.uy)</label>
              <input
                type="email"
                placeholder="ejecutivo@aglh.com.uy"
                value={newClientExecutive}
                onChange={(e) => setNewClientExecutive(e.target.value)}
                style={{ width: '100%', padding: '8px', borderRadius: '3px', border: '1px solid #ccc', fontSize: '13px', boxSizing: 'border-box' }}
              />
            </div>
            <button onClick={handleCreateClient} style={{ width: '100%', backgroundColor: '#8cc63f', color: '#fff', border: 'none', padding: '10px', borderRadius: '3px', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px' }}>
              Guardar Empresa
            </button>
            <button onClick={() => setIsNewClientModalOpen(false)} style={{ width: '100%', marginTop: '10px', background: 'none', border: 'none', color: '#777', cursor: 'pointer', fontSize: '12px' }}>
              Cancelar
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
