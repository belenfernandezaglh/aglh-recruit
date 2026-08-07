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
  // Estados generales
  const [userSession, setUserSession] = useState<any>(null);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');

  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [contacts, setContacts] = useState<ContactRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Estados de vista y modales
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
    
    // Cargar Candidatos
    const { data: candData } = await supabase
      .from('candidates')
      .select('*')
      .order('created_at', { ascending: false });
    if (candData) setCandidates(candData);

    // Cargar Clientes
    const { data: clientData } = await supabase
      .from('clients')
      .select('*')
      .order('name', { ascending: true });
    if (clientData) setClients(clientData);

    // Cargar Contactos
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
      alert('Acceso restringido únicamente a direcciones corporativas @aglh.com.uy');
      return;
    }
    const { data, error } = await supabase.auth.signInWithPassword({
      email: authEmail,
      password: authPassword,
    });
    if (error) {
      alert('Error de autenticación: ' + error.message);
    } else {
      setUserSession(data.session);
      await loadAllData();
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUserSession(null);
  };

  const isAdmin = true;

  const openContactModal = (candidate: Candidate) => {
    setSelectedCandidate(candidate);
    setSelectedClientId(clients.length > 0 ? clients[0].id : '');
    setContactNotes('');
    setIsContactModalOpen(true);
  };

  const closeContactModal = () => {
    setIsContactModalOpen(false);
    setSelectedCandidate(null);
  };

  const handleConfirmContact = async (result: ContactResult) => {
    if (!selectedCandidate) return;
    if (!selectedClientId) {
      alert('Debes seleccionar un cliente.');
      return;
    }

    const recruiterEmail = userSession?.user?.email || userSession?.email || 'belen.fernandez@aglh.com.uy';

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

    await supabase
      .from('candidates')
      .update({ status: 'CONTACTADO' })
      .eq('id', selectedCandidate.id);

    closeContactModal();
    await loadAllData();
  };

  const handleCreateClient = async () => {
    if (!newClientName) {
      alert('Ingresa el nombre de la empresa.');
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

  const handleUpdateExecutive = async (clientId: string, newEmail: string) => {
    const { error } = await supabase
      .from('clients')
      .update({ executive_email: newEmail })
      .eq('id', clientId);

    if (error) {
      alert('Error al actualizar ejecutivo: ' + error.message);
    } else {
      setClients(clients.map(c => c.id === clientId ? { ...c, executive_email: newEmail } : c));
    }
  };

  // --- VISTA DE LOGIN (Estética AGLH) ---
  if (!userSession) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', fontFamily: '"System-UI", -apple-system, sans-serif' }}>
        <div style={{ backgroundColor: '#ffffff', padding: '40px', borderRadius: '12px', width: '100%', maxWidth: '420px', border: '1px solid #e2e8f0', boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
          <div style={{ textAlign: 'center', marginBottom: '28px' }}>
            <h1 style={{ color: '#0f2942', fontSize: '26px', fontWeight: '800', letterSpacing: '-0.5px', margin: '0 0 6px 0' }}>AGLH <span style={{ color: '#00a896', fontWeight: '400' }}>Consultores</span></h1>
            <p style={{ fontSize: '13px', color: '#64748b', margin: 0, fontWeight: '500' }}>Gestión de Selección & Selección de Personal</p>
          </div>
          
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#1e293b', marginBottom: '6px' }}>Correo Electrónico</label>
              <input
                type="email"
                placeholder="ejemplo@aglh.com.uy"
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
                required
                style={{ width: '100%', padding: '11px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#fff', fontSize: '14px', color: '#0f172a', boxSizing: 'border-box', outline: 'none' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#1e293b', marginBottom: '6px' }}>Contraseña</label>
              <input
                type="password"
                placeholder="••••••••"
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                required
                style={{ width: '100%', padding: '11px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#fff', fontSize: '14px', color: '#0f172a', boxSizing: 'border-box', outline: 'none' }}
              />
            </div>
            <button
              type="submit"
              style={{ marginTop: '8px', backgroundColor: '#0f2942', color: '#ffffff', padding: '12px', borderRadius: '8px', border: 'none', fontWeight: '700', fontSize: '14px', cursor: 'pointer', transition: 'background-color 0.2s' }}
            >
              Ingresar al Portal
            </button>
          </form>
          <div style={{ marginTop: '24px', textAlign: 'center', borderTop: '1px solid #f1f5f9', paddingTop: '16px' }}>
            <span style={{ fontSize: '11px', color: '#94a3b8' }}>© AGLH Consultores. Todos los derechos reservados.</span>
          </div>
        </div>
      </div>
    );
  }

  // --- VISTA PRINCIPAL (Estética AGLH) ---
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', color: '#0f172a', fontFamily: '"System-UI", -apple-system, sans-serif' }}>
      
      {/* Header AGLH */}
      <header style={{ backgroundColor: '#ffffff', borderBottom: '1px solid #e2e8f0', padding: '16px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <h1 style={{ fontSize: '22px', fontWeight: '800', margin: 0, color: '#0f2942', letterSpacing: '-0.5px' }}>
            AGLH <span style={{ color: '#00a896', fontWeight: '400' }}>Consultores</span>
          </h1>
          <span style={{ backgroundColor: '#e0f2fe', color: '#0369a1', fontSize: '11px', fontWeight: '700', padding: '3px 8px', borderRadius: '12px', textTransform: 'uppercase' }}>
            Portal ATS
          </span>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ textAlign: 'right' }}>
            <span style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#0f2942' }}>{userSession?.user?.email || userSession?.email}</span>
            <span style={{ fontSize: '11px', color: '#64748b' }}>Consultor / Reclutador</span>
          </div>
          <button
            onClick={handleLogout}
            style={{ backgroundColor: '#fff', color: '#dc2626', border: '1px solid #fecaca', padding: '8px 14px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}
          >
            Cerrar Sesión
          </button>
        </div>
      </header>

      {/* Navegación por pestañas */}
      <div style={{ backgroundColor: '#ffffff', borderBottom: '1px solid #e2e8f0', padding: '0 40px', display: 'flex', gap: '32px' }}>
        <button
          onClick={() => setActiveTab('NUEVOS')}
          style={{
            padding: '16px 0', border: 'none', background: 'none', cursor: 'pointer', fontWeight: '700', fontSize: '14px',
            borderBottom: activeTab === 'NUEVOS' ? '3px solid #00a896' : '3px solid transparent',
            color: activeTab === 'NUEVOS' ? '#0f2942' : '#64748b'
          }}
        >
          Candidatos Nuevos ({candidates.filter(c => c.status === 'NUEVO').length})
        </button>
        <button
          onClick={() => setActiveTab('CONTACTADOS')}
          style={{
            padding: '16px 0', border: 'none', background: 'none', cursor: 'pointer', fontWeight: '700', fontSize: '14px',
            borderBottom: activeTab === 'CONTACTADOS' ? '3px solid #00a896' : '3px solid transparent',
            color: activeTab === 'CONTACTADOS' ? '#0f2942' : '#64748b'
          }}
        >
          Módulo Contactados ({contacts.length})
        </button>
        <button
          onClick={() => setActiveTab('CLIENTES')}
          style={{
            padding: '16px 0', border: 'none', background: 'none', cursor: 'pointer', fontWeight: '700', fontSize: '14px',
            borderBottom: activeTab === 'CLIENTES' ? '3px solid #00a896' : '3px solid transparent',
            color: activeTab === 'CLIENTES' ? '#0f2942' : '#64748b'
          }}
        >
          Gestión de Clientes ({clients.length})
        </button>
      </div>

      {/* Contenido Principal */}
      <main style={{ padding: '36px 40px', maxWidth: '1400px', margin: '0 auto' }}>
        {loading ? (
          <p style={{ textAlign: 'center', color: '#64748b', fontSize: '14px' }}>Cargando datos del sistema...</p>
        ) : (
          <>
            {/* PESTAÑA: NUEVOS CANDIDATOS */}
            {activeTab === 'NUEVOS' && (
              <div>
                <div style={{ marginBottom: '20px' }}>
                  <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#0f2942', margin: '0 0 4px 0' }}>Postulantes Ingresados</h2>
                  <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>Candidatos registrados pendientes de primer contacto corporativo.</p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
                  {candidates.filter(c => c.status === 'NUEVO').map((candidate) => (
                    <div key={candidate.id} style={{ backgroundColor: '#ffffff', borderRadius: '10px', padding: '24px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: '#0f2942' }}>{candidate.first_name} {candidate.last_name}</h3>
                        <span style={{ backgroundColor: '#f1f5f9', color: '#475569', fontSize: '11px', fontWeight: '600', padding: '2px 8px', borderRadius: '4px' }}>Nuevo</span>
                      </div>
                      <p style={{ margin: '6px 0', fontSize: '13px', color: '#475569', display: 'flex', alignItems: 'center', gap: '6px' }}>✉ {candidate.email || 'Sin correo registrado'}</p>
                      <p style={{ margin: '6px 0 20px 0', fontSize: '13px', color: '#475569', display: 'flex', alignItems: 'center', gap: '6px' }}>📞 {candidate.phone || 'Sin teléfono'}</p>
                      <button
                        onClick={() => openContactModal(candidate)}
                        style={{ width: '100%', backgroundColor: '#0f2942', color: '#ffffff', border: 'none', padding: '11px', borderRadius: '6px', fontWeight: '600', fontSize: '13px', cursor: 'pointer' }}
                      >
                        Registrar Contacto
                      </button>
                    </div>
                  ))}
                  {candidates.filter(c => c.status === 'NUEVO').length === 0 && (
                    <div style={{ backgroundColor: '#fff', padding: '32px', borderRadius: '8px', border: '1px dashed #cbd5e1', textAlign: 'center', gridColumn: '1 / -1' }}>
                      <p style={{ color: '#64748b', margin: 0 }}>No hay candidatos nuevos pendientes en este momento.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* PESTAÑA: CONTACTADOS */}
            {activeTab === 'CONTACTADOS' && (
              <div>
                <div style={{ marginBottom: '20px' }}>
                  <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#0f2942', margin: '0 0 4px 0' }}>Módulo de Interacciones & Gestión</h2>
                  <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>Historial completo de contactos realizados por los consultores de AGLH.</p>
                </div>

                <div style={{ backgroundColor: '#ffffff', borderRadius: '10px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
                    <thead style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                      <tr>
                        <th style={{ padding: '14px 20px', fontWeight: '700', color: '#0f2942' }}>Candidato</th>
                        <th style={{ padding: '14px 20px', fontWeight: '700', color: '#0f2942' }}>Cliente / Empresa</th>
                        <th style={{ padding: '14px 20px', fontWeight: '700', color: '#0f2942' }}>Reclutador AGLH</th>
                        <th style={{ padding: '14px 20px', fontWeight: '700', color: '#0f2942' }}>Resultado</th>
                        <th style={{ padding: '14px 20px', fontWeight: '700', color: '#0f2942' }}>Observaciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {contacts.map((item) => (
                        <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '14px 20px', fontWeight: '600', color: '#0f2942' }}>
                            {item.candidate ? `${item.candidate.first_name} ${item.candidate.last_name}` : 'N/D'}
                          </td>
                          <td style={{ padding: '14px 20px', color: '#334155' }}>
                            {item.client ? item.client.name : 'Sin Empresa'}
                          </td>
                          <td style={{ padding: '14px 20px', color: '#64748b', fontSize: '13px' }}>{item.recruiter_email}</td>
                          <td style={{ padding: '14px 20px' }}>
                            <span style={{
                              padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '700',
                              backgroundColor: item.result === 'INGRESO' ? '#dcfce7' : '#fee2e2',
                              color: item.result === 'INGRESO' ? '#15803d' : '#b91c1c'
                            }}>
                              {item.result === 'INGRESO' ? '✓ Ingresó' : '✕ No Ingresó'}
                            </span>
                          </td>
                          <td style={{ padding: '14px 20px', color: '#64748b', fontSize: '13px' }}>{item.notes || '-'}</td>
                        </tr>
                      ))}
                      {contacts.length === 0 && (
                        <tr>
                          <td colSpan={5} style={{ padding: '32px', textAlign: 'center', color: '#64748b' }}>Aún no existen registros de contactos en el histórico.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* PESTAÑA: CLIENTES */}
            {activeTab === 'CLIENTES' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <div>
                    <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#0f2942', margin: '0 0 4px 0' }}>Directorio de Empresas Clientes</h2>
                    <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>Asignación de ejecutivos responsables por cada cuenta cliente.</p>
                  </div>
                  {isAdmin && (
                    <button
                      onClick={() => setIsNewClientModalOpen(true)}
                      style={{ backgroundColor: '#00a896', color: '#ffffff', border: 'none', padding: '10px 18px', borderRadius: '6px', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}
                    >
                      + Nueva Empresa
                    </button>
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '20px' }}>
                  {clients.map((client) => (
                    <div key={client.id} style={{ backgroundColor: '#ffffff', borderRadius: '10px', padding: '24px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                      <h3 style={{ margin: '0 0 14px 0', fontSize: '16px', fontWeight: '700', color: '#0f2942' }}>🏢 {client.name}</h3>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#64748b', marginBottom: '6px' }}>Ejecutivo AGLH a cargo:</label>
                      <input
                        type="email"
                        value={client.executive_email}
                        onChange={(e) => handleUpdateExecutive(client.id, e.target.value)}
                        style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', color: '#0f172a', boxSizing: 'border-box' }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* MODAL REGISTRAR CONTACTO */}
      {isContactModalOpen && selectedCandidate && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(2px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', zIndex: 1000 }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', width: '100%', maxWidth: '500px', padding: '28px', border: '1px solid #e2e8f0', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)', position: 'relative' }}>
            <button
              onClick={closeContactModal}
              style={{ position: 'absolute', top: '18px', right: '18px', border: 'none', background: 'none', fontSize: '18px', cursor: 'pointer', color: '#64748b' }}
            >
              ✕
            </button>
            <h3 style={{ marginTop: 0, marginBottom: '4px', fontSize: '18px', color: '#0f2942', fontWeight: '700' }}>Gestión de Candidato</h3>
            <p style={{ margin: '0 0 20px 0', fontSize: '13px', color: '#64748b' }}>{selectedCandidate.first_name} {selectedCandidate.last_name}</p>

            <div style={{ marginBottom: '18px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#1e293b', marginBottom: '6px' }}>Seleccionar Cliente/Empresa *</label>
              <select
                value={selectedClientId}
                onChange={(e) => setSelectedClientId(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', backgroundColor: '#fff', color: '#0f172a' }}
              >
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#1e293b', marginBottom: '6px' }}>Observaciones del Reclutador</label>
              <textarea
                rows={3}
                placeholder="Detalles del contacto o entrevista..."
                value={contactNotes}
                onChange={(e) => setContactNotes(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <button
                onClick={() => handleConfirmContact('INGRESO')}
                style={{ backgroundColor: '#15803d', color: '#ffffff', border: 'none', padding: '12px', borderRadius: '6px', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}
              >
                ✓ Confirmar Ingreso
              </button>
              <button
                onClick={() => handleConfirmContact('NO_INGRESO')}
                style={{ backgroundColor: '#dc2626', color: '#ffffff', border: 'none', padding: '12px', borderRadius: '6px', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}
              >
                ✕ No Ingresó
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL NUEVO CLIENTE */}
      {isNewClientModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(2px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', zIndex: 1000 }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', width: '100%', maxWidth: '440px', padding: '28px', border: '1px solid #e2e8f0', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)', position: 'relative' }}>
            <button
              onClick={() => setIsNewClientModalOpen(false)}
              style={{ position: 'absolute', top: '18px', right: '18px', border: 'none', background: 'none', fontSize: '18px', cursor: 'pointer', color: '#64748b' }}
            >
              ✕
            </button>
            <h3 style={{ marginTop: 0, marginBottom: '18px', fontSize: '18px', color: '#0f2942', fontWeight: '700' }}>Registrar Nueva Empresa</h3>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#1e293b', marginBottom: '6px' }}>Nombre de la Empresa</label>
              <input
                type="text"
                placeholder="Ej. Kevenoll"
                value={newClientName}
                onChange={(e) => setNewClientName(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#1e293b', marginBottom: '6px' }}>Correo del Ejecutivo Asignado</label>
              <input
                type="email"
                placeholder="ejecutivo@aglh.com.uy"
                value={newClientExecutive}
                onChange={(e) => setNewClientExecutive(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }}
              />
            </div>

            <button
              onClick={handleCreateClient}
              style={{ width: '100%', backgroundColor: '#00a896', color: '#ffffff', border: 'none', padding: '12px', borderRadius: '6px', fontWeight: '700', fontSize: '14px', cursor: 'pointer' }}
            >
              Guardar Empresa
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
