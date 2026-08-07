'use client';

import React, { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

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
  const supabase = createClientComponentClient();

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

  // Verificación de sesión y carga de datos
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

    // Cargar Contactos (Módulo Contactados)
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
      alert('Acceso restringido únicamente a correos @aglh.com.uy');
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

  // Permisos: Habilitado para Belén, Anahit o cualquier usuario con sesión activa
  const isAdmin = true;

  // Manejo de Modal de Contacto
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
    if (!selectedCandidate) {
      alert('Ocurrió un error: No hay candidato seleccionado.');
      return;
    }
    if (!selectedClientId) {
      alert('Atención: Debes seleccionar un cliente de la lista desplegable.');
      return;
    }

    const recruiterEmail = userSession?.user?.email || userSession?.email || 'belen.fernandez@aglh.com.uy';

    // 1. Guardar en la tabla contacts
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
      alert(`Error al registrar interacción: ${insertError.message}`);
      console.error(insertError);
      return;
    }

    // 2. Actualizar estado del candidato
    const { error: updateError } = await supabase
      .from('candidates')
      .update({ status: 'CONTACTADO' })
      .eq('id', selectedCandidate.id);

    if (updateError) {
      alert(`Aviso: Se guardó el contacto pero no se cambió el estado del candidato: ${updateError.message}`);
    }

    alert('¡Candidato registrado en Contactados exitosamente!');
    closeContactModal();
    await loadAllData(); // Forzar actualización de la pantalla
  };

  // Guardar nuevo cliente
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

  // Reasignar ejecutivo de cliente directo
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

  // Vista cuando no hay sesión iniciada
  if (!userSession) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', fontFamily: 'sans-serif' }}>
        <div style={{ backgroundColor: '#1e293b', padding: '40px', borderRadius: '12px', width: '100%', maxWidth: '400px', boxShadow: '0 10px 25px rgba(0,0,0,0.5)', color: '#fff' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '8px', textAlign: 'center', color: '#38bdf8' }}>Acceso ATS Enterprise</h2>
          <p style={{ fontSize: '14px', color: '#94a3b8', marginBottom: '24px', textAlign: 'center' }}>Ingresa tus credenciales corporativas</p>
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', color: '#cbd5e1', marginBottom: '6px' }}>Correo Corporativo</label>
              <input
                type="email"
                placeholder="usuario@aglh.com.uy"
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
                required
                style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #334155', backgroundColor: '#0f172a', color: '#fff', boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', color: '#cbd5e1', marginBottom: '6px' }}>Contraseña</label>
              <input
                type="password"
                placeholder="••••••••"
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                required
                style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #334155', backgroundColor: '#0f172a', color: '#fff', boxSizing: 'border-box' }}
              />
            </div>
            <button
              type="submit"
              style={{ marginTop: '10px', backgroundColor: '#0284c7', color: '#fff', padding: '12px', borderRadius: '6px', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}
            >
              Iniciar Sesión
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', color: '#0f172a', fontFamily: 'sans-serif' }}>
      {/* Header Superior */}
      <header style={{ backgroundColor: '#0f172a', color: '#fff', padding: '16px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 'bold', margin: 0 }}>ATS Enterprise — Panel de Control</h1>
          <span style={{ fontSize: '12px', color: '#38bdf8' }}>AGLH Consultores</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{ fontSize: '14px', color: '#cbd5e1' }}>{userSession?.user?.email || userSession?.email}</span>
          <button
            onClick={handleLogout}
            style={{ backgroundColor: '#ef4444', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold' }}
          >
            Cerrar Sesión
          </button>
        </div>
      </header>

      {/* Navegación por pestañas */}
      <div style={{ backgroundColor: '#fff', borderBottom: '1px solid #e2e8f0', padding: '0 32px', display: 'flex', gap: '24px' }}>
        <button
          onClick={() => setActiveTab('NUEVOS')}
          style={{ padding: '16px 0', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px', borderBottom: activeTab === 'NUEVOS' ? '3px solid #0284c7' : 'none', color: activeTab === 'NUEVOS' ? '#0284c7' : '#64748b' }}
        >
          Candidatos Nuevos ({candidates.filter(c => c.status === 'NUEVO').length})
        </button>
        <button
          onClick={() => setActiveTab('CONTACTADOS')}
          style={{ padding: '16px 0', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px', borderBottom: activeTab === 'CONTACTADOS' ? '3px solid #0284c7' : 'none', color: activeTab === 'CONTACTADOS' ? '#0284c7' : '#64748b' }}
        >
          Módulo Contactados ({contacts.length})
        </button>
        <button
          onClick={() => setActiveTab('CLIENTES')}
          style={{ padding: '16px 0', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px', borderBottom: activeTab === 'CLIENTES' ? '3px solid #0284c7' : 'none', color: activeTab === 'CLIENTES' ? '#0284c7' : '#64748b' }}
        >
          Gestión de Clientes ({clients.length})
        </button>
      </div>

      {/* Contenido Principal */}
      <main style={{ padding: '32px' }}>
        {loading ? (
          <p style={{ textAlign: 'center', color: '#64748b' }}>Cargando información...</p>
        ) : (
          <>
            {/* PESTAÑA: CANDIDATOS NUEVOS */}
            {activeTab === 'NUEVOS' && (
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px' }}>Candidatos Disponibles para Gestión</h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
                  {candidates.filter(c => c.status === 'NUEVO').map((candidate) => (
                    <div key={candidate.id} style={{ backgroundColor: '#fff', borderRadius: '8px', padding: '20px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                      <h3 style={{ margin: '0 0 8px 0', fontSize: '16px' }}>{candidate.first_name} {candidate.last_name}</h3>
                      <p style={{ margin: '4px 0', fontSize: '13px', color: '#64748b' }}>📧 {candidate.email || 'Sin correo'}</p>
                      <p style={{ margin: '4px 0 16px 0', fontSize: '13px', color: '#64748b' }}>📞 {candidate.phone || 'Sin teléfono'}</p>
                      <button
                        onClick={() => openContactModal(candidate)}
                        style={{ width: '100%', backgroundColor: '#0284c7', color: '#fff', border: 'none', padding: '10px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}
                      >
                        📞 Contactar
                      </button>
                    </div>
                  ))}
                  {candidates.filter(c => c.status === 'NUEVO').length === 0 && (
                    <p style={{ color: '#64748b' }}>No hay candidatos nuevos pendientes.</p>
                  )}
                </div>
              </div>
            )}

            {/* PESTAÑA: CONTACTADOS */}
            {activeTab === 'CONTACTADOS' && (
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px' }}>Histórico de Interacciones</h2>
                <div style={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
                    <thead style={{ backgroundColor: '#f1f5f9', borderBottom: '1px solid #e2e8f0' }}>
                      <tr>
                        <th style={{ padding: '12px 16px' }}>Candidato</th>
                        <th style={{ padding: '12px 16px' }}>Cliente</th>
                        <th style={{ padding: '12px 16px' }}>Reclutador</th>
                        <th style={{ padding: '12px 16px' }}>Resultado</th>
                        <th style={{ padding: '12px 16px' }}>Notas</th>
                      </tr>
                    </thead>
                    <tbody>
                      {contacts.map((item) => (
                        <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '12px 16px', fontWeight: 'bold' }}>
                            {item.candidate ? `${item.candidate.first_name} ${item.candidate.last_name}` : 'Candidato no disponible'}
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            {item.client ? item.client.name : 'Cliente no asignado'}
                          </td>
                          <td style={{ padding: '12px 16px', color: '#64748b' }}>{item.recruiter_email}</td>
                          <td style={{ padding: '12px 16px' }}>
                            <span style={{
                              padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold',
                              backgroundColor: item.result === 'INGRESO' ? '#dcfce7' : '#fee2e2',
                              color: item.result === 'INGRESO' ? '#166534' : '#991b1b'
                            }}>
                              {item.result === 'INGRESO' ? '✓ Ingresó' : '✕ No Ingresó'}
                            </span>
                          </td>
                          <td style={{ padding: '12px 16px', color: '#64748b' }}>{item.notes || '-'}</td>
                        </tr>
                      ))}
                      {contacts.length === 0 && (
                        <tr>
                          <td colSpan={5} style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>Aún no hay interacciones registradas.</td>
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h2 style={{ fontSize: '18px', fontWeight: 'bold', margin: 0 }}>Empresas y Ejecutivos Asignados</h2>
                  {isAdmin && (
                    <button
                      onClick={() => setIsNewClientModalOpen(true)}
                      style={{ backgroundColor: '#16a34a', color: '#fff', border: 'none', padding: '10px 16px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}
                    >
                      + Crear Nuevo Cliente
                    </button>
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
                  {clients.map((client) => (
                    <div key={client.id} style={{ backgroundColor: '#fff', borderRadius: '8px', padding: '20px', border: '1px solid #e2e8f0' }}>
                      <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', color: '#0f172a' }}>🏢 {client.name}</h3>
                      <label style={{ display: 'block', fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Ejecutivo de Cuenta:</label>
                      <input
                        type="email"
                        value={client.executive_email}
                        onChange={(e) => handleUpdateExecutive(client.id, e.target.value)}
                        style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* MODAL: CONTACTAR CANDIDATO */}
      {isContactModalOpen && selectedCandidate && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', zIndex: 1000 }}>
          <div style={{ backgroundColor: '#fff', borderRadius: '12px', width: '100%', maxWidth: '480px', padding: '24px', position: 'relative' }}>
            <button
              onClick={closeContactModal}
              style={{ position: 'absolute', top: '16px', right: '16px', border: 'none', background: 'none', fontSize: '20px', cursor: 'pointer', color: '#64748b' }}
            >
              ✕
            </button>
            <h3 style={{ marginTop: 0, marginBottom: '16px', fontSize: '18px' }}>Registrar Gestión: {selectedCandidate.first_name} {selectedCandidate.last_name}</h3>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '6px' }}>Seleccionar Cliente/Empresa *</label>
              <select
                value={selectedClientId}
                onChange={(e) => setSelectedClientId(e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px' }}
              >
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '6px' }}>Observaciones / Notas</label>
              <textarea
                rows={3}
                placeholder="Escribe comentarios de la llamada..."
                value={contactNotes}
                onChange={(e) => setContactNotes(e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <button
                onClick={() => handleConfirmContact('INGRESO')}
                style={{ backgroundColor: '#16a34a', color: '#fff', border: 'none', padding: '12px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}
              >
                ✓ Ingresó
              </button>
              <button
                onClick={() => handleConfirmContact('NO_INGRESO')}
                style={{ backgroundColor: '#dc2626', color: '#fff', border: 'none', padding: '12px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}
              >
                ✕ No Ingresó
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CREAR NUEVO CLIENTE */}
      {isNewClientModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', zIndex: 1000 }}>
          <div style={{ backgroundColor: '#fff', borderRadius: '12px', width: '100%', maxWidth: '400px', padding: '24px', position: 'relative' }}>
            <button
              onClick={() => setIsNewClientModalOpen(false)}
              style={{ position: 'absolute', top: '16px', right: '16px', border: 'none', background: 'none', fontSize: '20px', cursor: 'pointer', color: '#64748b' }}
            >
              ✕
            </button>
            <h3 style={{ marginTop: 0, marginBottom: '16px', fontSize: '18px' }}>Crear Nuevo Cliente</h3>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '6px' }}>Nombre de la Empresa</label>
              <input
                type="text"
                placeholder="Ej. Kevenoll"
                value={newClientName}
                onChange={(e) => setNewClientName(e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '6px' }}>Correo del Ejecutivo Asignado</label>
              <input
                type="email"
                placeholder="ejecutivo@aglh.com.uy"
                value={newClientExecutive}
                onChange={(e) => setNewClientExecutive(e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
              />
            </div>

            <button
              onClick={handleCreateClient}
              style={{ width: '100%', backgroundColor: '#16a34a', color: '#fff', border: 'none', padding: '12px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}
            >
              Guardar Empresa
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
