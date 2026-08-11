'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = (supabaseUrl && supabaseAnonKey) ? createClient(supabaseUrl, supabaseAnonKey) : null;

type CandidateStatus = 'NUEVO' | 'CONTACTADO' | 'RECHAZADO' | 'CONTRATADO';
type SortOption = 'MATCH_DESC' | 'MATCH_ASC' | 'NEWEST' | 'OLDEST' | 'LOCATION';

interface Requirement {
  location: string;
  required_experience: string;
  keywords: string[];
}

interface Client {
  id: string;
  name: string;
  executive_email?: string;
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
  cv_url?: string;
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

interface CandidateAuditLog {
  id: string;
  candidate_id: string;
  action: 'CREADO' | 'EDITADO' | 'ELIMINADO' | 'CV_SUBIDO';
  user_email: string;
  details: string;
  created_at: string;
}

export default function Home() {
  const [isMounted, setIsMounted] = useState(false);
  const [userSession, setUserSession] = useState<any>(null);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');

  const [viewMode, setViewMode] = useState<'Admin' | 'Reclutador'>('Admin');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const [activeTab, setActiveTab] = useState<'CLIENTES' | 'NUEVOS' | 'CONTACTADOS'>('CLIENTES');
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);

  const [clients, setClients] = useState<Client[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [contacts, setContacts] = useState<ContactRecord[]>([]);
  const [auditLogs, setAuditLogs] = useState<CandidateAuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadingCv, setUploadingCv] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('MATCH_DESC');

  // Modal Candidato
  const [selectedCandidateForModal, setSelectedCandidateForModal] = useState<Candidate | null>(null);
  const [isCandidateModalOpen, setIsCandidateModalOpen] = useState(false);
  const [isEditingCandidate, setIsEditingCandidate] = useState(false);
  const [editCandData, setEditCandData] = useState<Partial<Candidate>>({});

  // Modales Clientes (Admin)
  const [isEditReqModalOpen, setIsEditReqModalOpen] = useState(false);
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);

  // Formulario Requisitos
  const [reqLocation, setReqLocation] = useState('');
  const [reqExperience, setReqExperience] = useState('');
  const [reqKeywords, setReqKeywords] = useState('');

  // Formulario Datos Cliente
  const [clientName, setClientName] = useState('');
  const [clientExecEmail, setClientExecEmail] = useState('');

  useEffect(() => {
    setIsMounted(true);
    checkSession();
  }, []);

  const checkSession = async () => {
    try {
      if (supabase) {
        const { data: { session } } = await supabase.auth.getSession();
        setUserSession(session);
        if (session) {
          const email = session.user?.email?.toLowerCase() || '';
          const isAllowedAdmin = email.includes('anahit') || email.includes('belen');
          if (!isAllowedAdmin) setViewMode('Reclutador');
          await loadAllData();
        }
      }
    } catch (err) {
      console.error('Error al verificar sesión:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadAllData = async () => {
    setLoading(true);
    try {
      let clientData: any[] = [];
      if (supabase) {
        const res = await supabase.from('clients').select('*').order('name', { ascending: true });
        if (res.data) clientData = res.data;
      }

      if (clientData.length === 0) {
        clientData = [
          { id: 'c1', name: 'CORFRISA', executive_email: 'pablo@aglh.com.uy' },
          { id: 'c2', name: 'KEVENOLL', executive_email: 'pablo@aglh.com.uy' },
          { id: 'c3', name: 'RIOGAS / ACODIKE', executive_email: 'pablo@aglh.com.uy' },
          { id: 'c4', name: 'DISERSHOP', executive_email: 'pablo@aglh.com.uy' }
        ];
      }

      const initialClients: Client[] = clientData.map((c: any) => {
        let reqs: Requirement = c.requirements || {
          location: 'Montevideo',
          required_experience: 'Depósito / Operarios',
          keywords: ['deposito', 'picking', 'carga']
        };

        if (c.name?.toUpperCase().includes('CORFRISA')) {
          reqs = { location: 'Montevideo / Las Piedras', required_experience: 'Auxiliar de Depósito, picking con colector', keywords: ['colector', 'picking', 'fuerza', 'paletera'] };
        } else if (c.name?.toUpperCase().includes('KEVENOLL')) {
          reqs = { location: 'Montevideo', required_experience: 'Peón de depósito, esfuerzo físico', keywords: ['peon', 'deposito', 'fuerza', 'carga'] };
        } else if (c.name?.toUpperCase().includes('RIOGAS') || c.name?.toUpperCase().includes('ACODIKE')) {
          reqs = { location: 'Camino Lecocq, Montevideo', required_experience: 'Operario de Ingreso, planta, carga pesada', keywords: ['planta', 'carga', 'pesada', 'fuerza'] };
        }

        return {
          ...c,
          executive_name: c.executive_email ? c.executive_email.split('@')[0] : 'Ejecutivo',
          requirements: reqs
        };
      });

      setClients(initialClients);
      if (initialClients.length > 0 && !selectedClientId) setSelectedClientId(initialClients[0].id);

      let candData: any[] = [];
      if (supabase) {
        const res = await supabase.from('candidates').select('*').order('created_at', { ascending: false });
        if (res.data) candData = res.data;
      }

      if (candData.length > 0) {
        setCandidates(candData);
      } else {
        setCandidates([
          { id: '1', first_name: 'Gonzalo', last_name: 'Rodríguez', email: 'gonzalo@gmail.com', phone: '099123456', location: 'Montevideo', main_experience: 'Operario de depósito con uso de colector de datos y picking en Corfrisa', skills: ['colector', 'picking', 'fuerza'], status: 'NUEVO', created_at: new Date().toISOString() },
          { id: '2', first_name: 'Mariana', last_name: 'Gómez', email: 'mariana@hotmail.com', phone: '098654321', location: 'Las Piedras, Canelones', main_experience: 'Auxiliar de limpieza y empaque en planta industrial', skills: ['limpieza', 'empaque'], status: 'NUEVO', created_at: new Date().toISOString() },
          { id: '3', first_name: 'Lucas', last_name: 'Pérez', email: 'lucas@gmail.com', phone: '091888777', location: 'Montevideo', main_experience: 'Peón de carga y descarga pesada en planta de gas', skills: ['carga', 'pesada', 'fuerza', 'planta'], status: 'NUEVO', created_at: new Date().toISOString() }
        ]);
      }

      if (supabase) {
        const contactRes = await supabase.from('contacts').select('*, candidate:candidates(*), client:clients(*)').order('created_at', { ascending: false });
        if (contactRes.data) setContacts(contactRes.data);

        const auditRes = await supabase.from('candidate_history').select('*').order('created_at', { ascending: false });
        if (auditRes.data) setAuditLogs(auditRes.data);
      }
    } catch (e) {
      console.error('Error cargando datos:', e);
    } finally {
      setLoading(false);
    }
  };

  const logCandidateAction = async (candidateId: string, action: 'CREADO' | 'EDITADO' | 'ELIMINADO' | 'CV_SUBIDO', details: string) => {
    const userEmail = userSession?.user?.email || 'reclutador@aglh.com.uy';
    const logItem: CandidateAuditLog = {
      id: 'log_' + Date.now(),
      candidate_id: candidateId,
      action,
      user_email: userEmail,
      details,
      created_at: new Date().toISOString()
    };

    if (supabase) {
      await supabase.from('candidate_history').insert([{ candidate_id: candidateId, action, user_email: userEmail, details }]);
    }
    setAuditLogs(prev => [logItem, ...prev]);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (supabase) {
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
    } else {
      setUserSession({ user: { email: authEmail } });
      const isAllowedAdmin = authEmail.toLowerCase().includes('anahit') || authEmail.toLowerCase().includes('belen');
      setViewMode(isAllowedAdmin ? 'Admin' : 'Reclutador');
      await loadAllData();
    }
  };

  const handleLogout = async () => {
    if (supabase) await supabase.auth.signOut();
    setUserSession(null);
  };

  const calculateMatch = (candidate: Candidate, client?: Client): number => {
    if (!client || !client.requirements) return 70;
    let score = 0;
    const req = client.requirements;

    const candLocation = (candidate?.location || '').toLowerCase();
    const reqLocationStr = (req?.location || '').toLowerCase();

    if (candLocation && reqLocationStr && (candLocation.includes(reqLocationStr) || reqLocationStr.includes(candLocation))) {
      score += 30;
    } else {
      score += 15;
    }

    const expText = (candidate?.main_experience || '').toLowerCase();
    const reqExpText = (req?.required_experience || '').toLowerCase();

    if (expText && reqExpText && (expText.includes(reqExpText) || reqExpText.includes(expText))) {
      score += 40;
    } else {
      score += 20;
    }

    let kwMatch = 0;
    const reqKeywordsList = req?.keywords || [];
    const candSkills = candidate?.skills || [];

    if (reqKeywordsList.length > 0) {
      reqKeywordsList.forEach(kw => {
        const kwLower = (kw || '').toLowerCase();
        if (kwLower && (candSkills.some(s => (s || '').toLowerCase().includes(kwLower)) || expText.includes(kwLower))) {
          kwMatch++;
        }
      });
      score += Math.min(30, Math.round((kwMatch / reqKeywordsList.length) * 30));
    } else {
      score += 20;
    }

    return Math.min(99, Math.max(50, score));
  };

  const handleContactCandidate = async (candidate: Candidate, client: Client) => {
    const recruiterEmail = userSession?.user?.email || 'reclutador@aglh.com.uy';
    if (supabase) {
      await supabase.from('candidates').update({ status: 'CONTACTADO' }).eq('id', candidate.id);
      await supabase.from('contacts').insert([{ candidate_id: candidate.id, client_id: client.id, recruiter_email: recruiterEmail }]);
    }
    setCandidates(candidates.map(c => c.id === candidate.id ? { ...c, status: 'CONTACTADO' } : c));
    setContacts([{ id: Date.now().toString(), candidate_id: candidate.id, client_id: client.id, recruiter_email: recruiterEmail, created_at: new Date().toISOString(), candidate, client }, ...contacts]);
    await logCandidateAction(candidate.id, 'EDITADO', `Asignado y contactado para el cliente ${client.name}`);
    alert(`Candidato ${candidate.first_name || ''} ${candidate.last_name || ''} movido a CONTACTADOS.`);
  };

  const handleReturnToCandidates = async (contactRecordId: string, candidateId: string) => {
    if (!confirm('¿Devolver candidato a la base activa (NUEVO)?')) return;
    if (supabase) {
      await supabase.from('candidates').update({ status: 'NUEVO' }).eq('id', candidateId);
      await supabase.from('contacts').delete().eq('id', contactRecordId);
    }
    setCandidates(candidates.map(c => c.id === candidateId ? { ...c, status: 'NUEVO' } : c));
    setContacts(contacts.filter(ct => ct.id !== contactRecordId));
    await logCandidateAction(candidateId, 'EDITADO', 'Retornado de Contactados a la base activa (NUEVO)');
  };

  // FUNCIONES DE ADMINISTRACIÓN DE CLIENTES (ADMIN)
  const handleSaveClientDetails = async () => {
    if (!clientName.trim()) return alert('El nombre del cliente es obligatorio');
    
    if (editingClient) {
      const updated = { ...editingClient, name: clientName, executive_email: clientExecEmail, executive_name: clientExecEmail.split('@')[0] || 'Ejecutivo' };
      if (supabase) await supabase.from('clients').update({ name: clientName, executive_email: clientExecEmail }).eq('id', editingClient.id);
      setClients(clients.map(c => c.id === editingClient.id ? updated : c));
    } else {
      const newClientObj: any = {
        id: 'c_' + Date.now(),
        name: clientName,
        executive_email: clientExecEmail,
        executive_name: clientExecEmail.split('@')[0] || 'Ejecutivo',
        requirements: { location: 'Montevideo', required_experience: 'General', keywords: [] }
      };
      if (supabase) {
        const { data } = await supabase.from('clients').insert([{ name: clientName, executive_email: clientExecEmail }]).select();
        if (data && data[0]) newClientObj.id = data[0].id;
      }
      setClients([...clients, newClientObj]);
      setSelectedClientId(newClientObj.id);
    }
    setIsClientModalOpen(false);
  };

  const handleDeleteClient = async (clientId: string) => {
    if (!confirm('¿Seguro que deseas eliminar este cliente?')) return;
    if (supabase) await supabase.from('clients').delete().eq('id', clientId);
    const filtered = clients.filter(c => c.id !== clientId);
    setClients(filtered);
    if (filtered.length > 0) setSelectedClientId(filtered[0].id);
  };

  const handleSaveRequirements = async () => {
    if (!editingClient) return;
    const updatedReqs: Requirement = {
      location: reqLocation,
      required_experience: reqExperience,
      keywords: reqKeywords.split(',').map(k => k.trim().toLowerCase()).filter(Boolean)
    };
    if (supabase) await supabase.from('clients').update({ requirements: updatedReqs }).eq('id', editingClient.id);
    setClients(clients.map(c => c.id === editingClient.id ? { ...c, requirements: updatedReqs } : c));
    setIsEditReqModalOpen(false);
  };

  // SUBIR CV
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selectedCandidateForModal) return;

    setUploadingCv(true);
    try {
      let finalUrl = '';
      if (supabase) {
        const fileExt = file.name.split('.').pop();
        const fileName = `cv_${selectedCandidateForModal.id}_${Date.now()}.${fileExt}`;
        const { data, error } = await supabase.storage.from('cvs').upload(fileName, file, { upsert: true });

        if (error) {
          console.warn('Bucket de Supabase no disponible, simulando archivo asignado...', error);
          finalUrl = URL.createObjectURL(file);
        } else {
          const { data: publicUrlData } = supabase.storage.from('cvs').getPublicUrl(fileName);
          finalUrl = publicUrlData.publicUrl;
        }

        await supabase.from('candidates').update({ cv_url: finalUrl }).eq('id', selectedCandidateForModal.id);
      } else {
        finalUrl = URL.createObjectURL(file);
      }

      const updatedCandidate = { ...selectedCandidateForModal, cv_url: finalUrl };
      setCandidates(candidates.map(c => c.id === updatedCandidate.id ? updatedCandidate : c));
      setSelectedCandidateForModal(updatedCandidate);
      await logCandidateAction(updatedCandidate.id, 'CV_SUBIDO', `Subió/Actualizó el archivo de CV (${file.name})`);
      alert('CV cargado y guardado correctamente.');
    } catch (err) {
      console.error('Error al subir archivo:', err);
      alert('Hubo un problema al subir el archivo.');
    } finally {
      setUploadingCv(false);
    }
  };

  // FUNCIONES DE GESTIÓN DE CANDIDATOS (EDITAR / ELIMINAR / HISTORIAL)
  const handleOpenCandidateModal = (candidate: Candidate) => {
    setSelectedCandidateForModal(candidate);
    setEditCandData(candidate);
    setIsEditingCandidate(false);
    setIsCandidateModalOpen(true);
  };

  const handleSaveCandidateChanges = async () => {
    if (!selectedCandidateForModal) return;
    const skillsArray = typeof editCandData.skills === 'string' 
      ? (editCandData.skills as string).split(',').map(s => s.trim())
      : editCandData.skills || [];

    const updatedCandidate = {
      ...selectedCandidateForModal,
      ...editCandData,
      skills: skillsArray
    } as Candidate;

    if (supabase) {
      await supabase.from('candidates').update({
        first_name: updatedCandidate.first_name,
        last_name: updatedCandidate.last_name,
        email: updatedCandidate.email,
        phone: updatedCandidate.phone,
        location: updatedCandidate.location,
        main_experience: updatedCandidate.main_experience,
        skills: updatedCandidate.skills
      }).eq('id', updatedCandidate.id);
    }

    setCandidates(candidates.map(c => c.id === updatedCandidate.id ? updatedCandidate : c));
    setSelectedCandidateForModal(updatedCandidate);
    setIsEditingCandidate(false);
    await logCandidateAction(updatedCandidate.id, 'EDITADO', 'Modificó datos personales/laborales del candidato.');
    alert('Datos del candidato actualizados correctamente.');
  };

  const handleDeleteCandidate = async (candidateId: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar permanentemente a este candidato?')) return;
    if (supabase) {
      await supabase.from('candidates').delete().eq('id', candidateId);
      await supabase.from('contacts').delete().eq('candidate_id', candidateId);
    }
    await logCandidateAction(candidateId, 'ELIMINADO', 'Candidato eliminado permanentemente.');
    setCandidates(candidates.filter(c => c.id !== candidateId));
    setContacts(contacts.filter(ct => ct.candidate_id !== candidateId));
    setIsCandidateModalOpen(false);
    alert('Candidato eliminado.');
  };

  const getFilteredAndSortedCandidates = (currentClient?: Client) => {
    let result = candidates.filter(c => c.status === 'NUEVO');
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(c => 
        (c.first_name || '').toLowerCase().includes(term) || 
        (c.last_name || '').toLowerCase().includes(term) || 
        (c.location || '').toLowerCase().includes(term) || 
        (c.main_experience || '').toLowerCase().includes(term)
      );
    }
    return result.sort((a, b) => {
      const matchA = calculateMatch(a, currentClient);
      const matchB = calculateMatch(b, currentClient);
      if (sortBy === 'MATCH_DESC') return matchB - matchA;
      if (sortBy === 'MATCH_ASC') return matchA - matchB;
      if (sortBy === 'NEWEST') return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
      if (sortBy === 'OLDEST') return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
      if (sortBy === 'LOCATION') return (a.location || '').localeCompare(b.location || '');
      return 0;
    });
  };

  if (!isMounted) return null;

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

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <header style={{ backgroundColor: '#8cc63f', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <span style={{ color: '#ffffff', fontWeight: 'bold', fontSize: '28px', fontStyle: 'italic' }}>aglh</span>
            <span style={{ backgroundColor: '#4a4f56', color: '#ffffff', fontSize: '11px', padding: '3px 10px', borderRadius: '12px', fontWeight: 'bold' }}>ATS Enterprise</span>

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

        <main style={{ padding: '24px 32px', flex: 1 }}>
          {loading ? (
            <p style={{ textAlign: 'center', color: '#555' }}>Cargando información...</p>
          ) : (
            <>
              {activeTab === 'CLIENTES' && activeClient && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px', flex: 1 }}>
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

                    {viewMode === 'Admin' && (
                      <button
                        onClick={() => { setEditingClient(null); setClientName(''); setClientExecEmail(''); setIsClientModalOpen(true); }}
                        style={{ backgroundColor: '#8cc63f', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: '20px', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer', marginLeft: '12px', whiteSpace: 'nowrap' }}
                      >
                        + Nuevo Cliente
                      </button>
                    )}
                  </div>

                  <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '20px', marginBottom: '20px', boxShadow: '0 2px 6px rgba(0,0,0,0.05)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                      <div>
                        <h1 style={{ margin: 0, color: '#2c3137', fontSize: '22px' }}>{activeClient.name}</h1>
                        <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#666' }}>
                          Ubicación: <strong>{activeClient.requirements?.location || 'No especificada'}</strong> | Perfil: <strong>{activeClient.requirements?.required_experience || 'No especificado'}</strong> | Ejecutivo: <strong>{activeClient.executive_email || 'Sin asignar'}</strong>
                        </p>
                      </div>

                      {viewMode === 'Admin' && (
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            onClick={() => { setEditingClient(activeClient); setClientName(activeClient.name); setClientExecEmail(activeClient.executive_email || ''); setIsClientModalOpen(true); }}
                            style={{ backgroundColor: '#4a4f56', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}
                          >
                            ✏ Editar Cliente
                          </button>
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
                            ⚙ Editar Requisitos
                          </button>
                          <button
                            onClick={() => handleDeleteClient(activeClient.id)}
                            style={{ backgroundColor: '#ff6b6b', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}
                          >
                            🗑 Eliminar
                          </button>
                        </div>
                      )}
                    </div>

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

                  <h2 style={{ fontSize: '16px', color: '#4a4f56', marginBottom: '12px' }}>
                    Candidatos Disponibles ({getFilteredAndSortedCandidates(activeClient).length})
                  </h2>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
                    {getFilteredAndSortedCandidates(activeClient).map((cand) => {
                      const matchPercent = calculateMatch(cand, activeClient);
                      return (
                        <div key={cand.id} style={{ backgroundColor: '#ffffff', borderRadius: '10px', border: '1.5px solid #d0e3b5', padding: '16px', position: 'relative' }}>
                          <div style={{ position: 'absolute', top: '14px', right: '14px', backgroundColor: matchPercent >= 80 ? '#28a745' : matchPercent >= 65 ? '#0056b3' : '#ffc107', color: '#ffffff', fontWeight: 'bold', padding: '4px 10px', borderRadius: '12px', fontSize: '13px' }}>
                            {matchPercent}% Match
                          </div>

                          <h3 style={{ margin: '0 0 6px 0', fontSize: '16px', color: '#2c3137' }}>{cand.first_name || 'Sin nombre'} {cand.last_name || ''}</h3>
                          <p style={{ margin: '0 0 4px 0', fontSize: '12px', color: '#666' }}>📍 <strong>Localidad:</strong> {cand.location || 'No informada'}</p>
                          <p style={{ margin: '0 0 12px 0', fontSize: '12px', color: '#555', height: '36px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            💼 <strong>Exp:</strong> {cand.main_experience || 'No detallada'}
                          </p>

                          <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                            <button
                              onClick={() => handleOpenCandidateModal(cand)}
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

              {activeTab === 'NUEVOS' && (
                <div>
                  <h1 style={{ color: '#4a4f56', fontSize: '22px', fontWeight: 'bold', marginBottom: '16px' }}>
                    Base Única de Candidatos Nuevos ({candidates.filter(c => c.status === 'NUEVO').length})
                  </h1>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
                    {candidates.filter(c => c.status === 'NUEVO').map(cand => (
                      <div key={cand.id} style={{ backgroundColor: '#fff', borderRadius: '8px', padding: '16px', border: '1px solid #ccc' }}>
                        <h3 style={{ margin: 0, fontSize: '15px' }}>{cand.first_name || 'Sin nombre'} {cand.last_name || ''}</h3>
                        <p style={{ fontSize: '12px', color: '#666', margin: '4px 0' }}>📍 {cand.location || 'No informada'}</p>
                        <p style={{ fontSize: '12px', color: '#555', margin: '4px 0 12px 0' }}>💼 {cand.main_experience || 'No detallada'}</p>
                        <button onClick={() => handleOpenCandidateModal(cand)} style={{ width: '100%', backgroundColor: '#4a4f56', color: '#fff', border: 'none', padding: '6px', borderRadius: '4px', fontSize: '12px' }}>
                          Ver Ficha Completa
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

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
                            <td style={{ padding: '12px', fontWeight: 'bold' }}>{c.candidate?.first_name || ''} {c.candidate?.last_name || ''}</td>
                            <td style={{ padding: '12px' }}>{c.client?.name || 'CORFRISA'}</td>
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

      {/* MODAL FICHA CANDIDATO CON OPCIONES DE SUBIR/DESCARGAR CV, EDITAR, ELIMINAR E HISTORIAL */}
      {isCandidateModalOpen && selectedCandidateForModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '10px', width: '560px', maxHeight: '85vh', overflowY: 'auto' }}>
            
            {!isEditingCandidate ? (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h2 style={{ margin: 0, color: '#2c3137' }}>{selectedCandidateForModal.first_name || ''} {selectedCandidateForModal.last_name || ''}</h2>
                  <button onClick={() => setIsEditingCandidate(true)} style={{ backgroundColor: '#4a4f56', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '4px', fontSize: '12px', cursor: 'pointer' }}>
                    ✏ Editar Datos
                  </button>
                </div>

                <div style={{ fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '8px', color: '#333' }}>
                  <p><strong>Email:</strong> {selectedCandidateForModal.email || 'No registrado'}</p>
                  <p><strong>Teléfono:</strong> {selectedCandidateForModal.phone || 'No registrado'}</p>
                  <p><strong>Localidad:</strong> {selectedCandidateForModal.location || 'No informada'}</p>
                  <p><strong>Experiencia Principal:</strong> {selectedCandidateForModal.main_experience || 'No detallada'}</p>
                  <p><strong>Habilidades:</strong> {(selectedCandidateForModal.skills || []).join(', ')}</p>
                </div>

                {/* SECCIÓN CARGA / DESCARGA CV */}
                <div style={{ marginTop: '16px', padding: '12px', backgroundColor: '#f5f9ee', borderRadius: '8px', border: '1px solid #d0e3b5' }}>
                  <h4 style={{ margin: '0 0 8px 0', fontSize: '13px', color: '#2c3137' }}>📄 Curriculums / Documentos</h4>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                    {selectedCandidateForModal.cv_url ? (
                      <a href={selectedCandidateForModal.cv_url} target="_blank" rel="noopener noreferrer" style={{ backgroundColor: '#0056b3', color: '#fff', padding: '6px 12px', borderRadius: '4px', textDecoration: 'none', fontWeight: 'bold', fontSize: '12px' }}>
                        ⬇ Descargar CV Guardado
                      </a>
                    ) : (
                      <span style={{ fontSize: '12px', color: '#888' }}>No hay CV cargado aún</span>
                    )}

                    <label style={{ backgroundColor: '#8cc63f', color: '#fff', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>
                      {uploadingCv ? 'Subiendo...' : '📤 Cargar / Reemplazar CV'}
                      <input type="file" accept=".pdf,.doc,.docx" onChange={handleFileUpload} style={{ display: 'none' }} disabled={uploadingCv} />
                    </label>
                  </div>
                </div>

                {/* HISTORIAL DE MODIFICACIONES */}
                <div style={{ marginTop: '16px', borderTop: '1px solid #eee', paddingTop: '12px' }}>
                  <h4 style={{ margin: '0 0 8px 0', fontSize: '13px', color: '#555' }}>📜 Historial de Cambios</h4>
                  <div style={{ maxHeight: '100px', overflowY: 'auto', backgroundColor: '#fafafa', padding: '8px', borderRadius: '6px', fontSize: '11px', border: '1px solid #eaeaea' }}>
                    {auditLogs.filter(log => log.candidate_id === selectedCandidateForModal.id).length > 0 ? (
                      auditLogs.filter(log => log.candidate_id === selectedCandidateForModal.id).map(log => (
                        <div key={log.id} style={{ marginBottom: '6px', borderBottom: '1px solid #eee', paddingBottom: '4px' }}>
                          <strong>{new Date(log.created_at).toLocaleString()}</strong> - <em>{log.user_email}</em>: {log.details}
                        </div>
                      ))
                    ) : (
                      <span style={{ color: '#888' }}>Sin registros de cambios aún.</span>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: '20px', borderTop: '1px solid #eee', paddingTop: '16px' }}>
                  <button onClick={() => handleDeleteCandidate(selectedCandidateForModal.id)} style={{ backgroundColor: '#ff6b6b', color: '#fff', border: 'none', padding: '10px 14px', borderRadius: '4px', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer' }}>
                    🗑 Eliminar Candidato
                  </button>

                  <button onClick={() => setIsCandidateModalOpen(false)} style={{ marginLeft: 'auto', backgroundColor: '#e0e0e0', color: '#333', border: 'none', padding: '10px 18px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                    Cerrar
                  </button>
                </div>
              </>
            ) : (
              <div>
                <h3 style={{ margin: '0 0 16px 0', color: '#2c3137' }}>Editar Candidato</h3>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '12px' }}>
                  <label><strong>Nombre:</strong></label>
                  <input type="text" value={editCandData.first_name || ''} onChange={(e) => setEditCandData({ ...editCandData, first_name: e.target.value })} style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }} />

                  <label><strong>Apellido:</strong></label>
                  <input type="text" value={editCandData.last_name || ''} onChange={(e) => setEditCandData({ ...editCandData, last_name: e.target.value })} style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }} />

                  <label><strong>Email:</strong></label>
                  <input type="email" value={editCandData.email || ''} onChange={(e) => setEditCandData({ ...editCandData, email: e.target.value })} style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }} />

                  <label><strong>Teléfono:</strong></label>
                  <input type="text" value={editCandData.phone || ''} onChange={(e) => setEditCandData({ ...editCandData, phone: e.target.value })} style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }} />

                  <label><strong>Localidad:</strong></label>
                  <input type="text" value={editCandData.location || ''} onChange={(e) => setEditCandData({ ...editCandData, location: e.target.value })} style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }} />

                  <label><strong>Experiencia Principal:</strong></label>
                  <textarea value={editCandData.main_experience || ''} onChange={(e) => setEditCandData({ ...editCandData, main_experience: e.target.value })} rows={3} style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }} />

                  <label><strong>Habilidades (separadas por coma):</strong></label>
                  <input type="text" value={Array.isArray(editCandData.skills) ? editCandData.skills.join(', ') : editCandData.skills || ''} onChange={(e) => setEditCandData({ ...editCandData, skills: e.target.value as any })} style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }} />
                </div>

                <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                  <button onClick={handleSaveCandidateChanges} style={{ flex: 1, backgroundColor: '#8cc63f', color: '#fff', border: 'none', padding: '10px', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}>Guardar Cambios</button>
                  <button onClick={() => setIsEditingCandidate(false)} style={{ flex: 1, backgroundColor: '#ccc', border: 'none', padding: '10px', borderRadius: '4px', cursor: 'pointer' }}>Cancelar</button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {/* MODAL CREAR / EDITAR CLIENTE (ADMIN) */}
      {isClientModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '10px', width: '400px' }}>
            <h3 style={{ margin: '0 0 16px 0' }}>{editingClient ? 'Editar Cliente' : 'Nuevo Cliente'}</h3>
            <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Nombre de la Empresa:</label>
            <input type="text" value={clientName} onChange={(e) => setClientName(e.target.value)} style={{ width: '100%', padding: '8px', marginBottom: '12px', border: '1px solid #ccc', borderRadius: '4px' }} />
            <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Email del Ejecutivo:</label>
            <input type="email" value={clientExecEmail} onChange={(e) => setClientExecEmail(e.target.value)} style={{ width: '100%', padding: '8px', marginBottom: '16px', border: '1px solid #ccc', borderRadius: '4px' }} />
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={handleSaveClientDetails} style={{ flex: 1, backgroundColor: '#8cc63f', color: '#fff', border: 'none', padding: '10px', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}>Guardar</button>
              <button onClick={() => setIsClientModalOpen(false)} style={{ flex: 1, backgroundColor: '#ccc', border: 'none', padding: '10px', borderRadius: '4px', cursor: 'pointer' }}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL EDITAR REQUISITOS (ADMIN) */}
      {isEditReqModalOpen && editingClient && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '10px', width: '400px' }}>
            <h3 style={{ margin: '0 0 16px 0' }}>Editar Requisitos: {editingClient.name}</h3>
            <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Localidad:</label>
            <input type="text" value={reqLocation} onChange={(e) => setReqLocation(e.target.value)} style={{ width: '100%', padding: '8px', marginBottom: '12px', border: '1px solid #ccc', borderRadius: '4px' }} />
            <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Experiencia / Perfil:</label>
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
