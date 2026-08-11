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
  direccion?: string;
  ubicacion_url?: string;
  zona?: string;
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
  const [sidebarOpen, setSidebarOpen] = useState(false); // Contraída por defecto

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
  const [clientDireccion, setClientDireccion] = useState('');
  const [clientUbicacionUrl, setClientUbicacionUrl] = useState('');
  const [clientZona, setClientZona] = useState('');

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
        // Intenta traer todos los clientes desde la tabla 'clientes' de Supabase
        const res = await supabase.from('clientes').select('*').order('nombre', { ascending: true });
        if (res.data && res.data.length > 0) {
          clientData = res.data.map(c => ({
            id: c.id.toString(),
            name: c.nombre || c.name || 'Sin Nombre',
            executive_email: c.ejecutivo || c.executive_email || '',
            direccion: c.direccion || '',
            ubicacion_url: c.ubicacion_url || '',
            zona: c.zona || '',
            requirements: c.requirements
          }));
        } else {
          // Si no hay datos en 'clientes', consulta la tabla alternativa 'clients'
          const altRes = await supabase.from('clients').select('*').order('name', { ascending: true });
          if (altRes.data) clientData = altRes.data;
        }
      }

      if (clientData.length === 0) {
        clientData = [
          { id: 'c1', name: 'CORFRISA', executive_email: 'pablo@aglh.com.uy', zona: 'Las Piedras' },
          { id: 'c2', name: 'KEVENOLL', executive_email: 'pablo@aglh.com.uy', zona: 'Montevideo' },
          { id: 'c3', name: 'RIOGAS / ACODIKE', executive_email: 'pablo@aglh.com.uy', zona: 'Montevideo' },
          { id: 'c4', name: 'DISERSHOP', executive_email: 'pablo@aglh.com.uy', zona: 'Montevideo' }
        ];
      }

      const initialClients: Client[] = clientData.map((c: any) => {
        let reqs: Requirement = c.requirements || {
          location: c.zona || 'Montevideo',
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

  const handleSaveClientDetails = async () => {
    if (!clientName.trim()) return alert('El nombre del cliente es obligatorio');
    
    if (editingClient) {
      const updated = {
        ...editingClient,
        name: clientName,
        executive_email: clientExecEmail,
        executive_name: clientExecEmail.split('@')[0] || 'Ejecutivo',
        direccion: clientDireccion,
        ubicacion_url: clientUbicacionUrl,
        zona: clientZona
      };
      if (supabase) {
        await supabase.from('clientes').update({
          nombre: clientName,
          ejecutivo: clientExecEmail,
          direccion: clientDireccion,
          ubicacion_url: clientUbicacionUrl,
          zona: clientZona
        }).eq('id', editingClient.id);
      }
      setClients(clients.map(c => c.id === editingClient.id ? updated : c));
    } else {
      const newClientObj: any = {
        id: 'c_' + Date.now(),
        name: clientName,
        executive_email: clientExecEmail,
        executive_name: clientExecEmail.split('@')[0] || 'Ejecutivo',
        direccion: clientDireccion,
        ubicacion_url: clientUbicacionUrl,
        zona: clientZona,
        requirements: { location: clientZona || 'Montevideo', required_experience: 'General', keywords: [] }
      };
      if (supabase) {
        const { data } = await supabase.from('clientes').insert([{
          nombre: clientName,
          ejecutivo: clientExecEmail,
          direccion: clientDireccion,
          ubicacion_url: clientUbicacionUrl,
          zona: clientZona
        }]).select();
        if (data && data[0]) newClientObj.id = data[0].id.toString();
      }
      setClients([...clients, newClientObj]);
      setSelectedClientId(newClientObj.id);
    }
    setIsClientModalOpen(false);
  };

  const handleDeleteClient = async (clientId: string) => {
    if (!confirm('¿Seguro que deseas eliminar este cliente?')) return;
    if (supabase) {
      await supabase.from('clientes').delete().eq('id', clientId);
      await supabase.from('clients').delete().eq('id', clientId);
    }
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
    if (supabase) await supabase.from('clientes').update({ requirements: updatedReqs }).eq('id', editingClient.id);
    setClients(clients.map(c => c.id === editingClient.id ? { ...c, requirements: updatedReqs } : c));
    setIsEditReqModalOpen(false);
  };

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
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '16px' }}>
          <div style={{ backgroundColor: '#ffffff', padding: '32px 24px', borderRadius: '8px', width: '100%', maxWidth: '360px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
              <span style={{ fontSize: '28px', fontWeight: 'bold', color: '#8cc63f', fontStyle: 'italic' }}>aglh</span>
              <span style={{ backgroundColor: '#8cc63f', color: '#fff', fontSize: '11px', padding: '2px 8px', borderRadius: '10px', fontWeight: 'bold' }}>ATS Enterprise</span>
            </div>
            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <input type="email" placeholder="usuario@aglh.com.uy" value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} required style={{ padding: '10px', border: '1px solid #ccc', borderRadius: '4px', width: '100%', boxSizing: 'border-box' }} />
              <input type="password" placeholder="Contraseña" value={authPassword} onChange={(e) => setAuthPassword(e.target.value)} required style={{ padding: '10px', border: '1px solid #ccc', borderRadius: '4px', width: '100%', boxSizing: 'border-box' }} />
              <button type="submit" style={{ backgroundColor: '#8cc63f', color: '#fff', border: 'none', padding: '12px', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}>Iniciar Sesión</button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', width: '100vw', maxWidth: '100%', overflowX: 'hidden', fontFamily: 'Segoe UI, Helvetica, Arial, sans-serif', backgroundColor: '#e2edd0' }}>
      
      {/* BARRA LATERAL */}
      <aside style={{ width: sidebarOpen ? '220px' : '60px', minWidth: sidebarOpen ? '220px' : '60px', backgroundColor: '#4a4f56', color: '#ffffff', transition: 'all 0.2s ease', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        <div style={{ height: '56px', display: 'flex', alignItems: 'center', padding: '0 12px', justifyContent: sidebarOpen ? 'space-between' : 'center', backgroundColor: '#3e4349' }}>
          {sidebarOpen && <span style={{ fontSize: '22px', fontWeight: 'bold', color: '#8cc63f', fontStyle: 'italic' }}>aglh</span>}
          <button onClick={() => setSidebarOpen(!sidebarOpen)} style={{ background: 'none', border: 'none', color: '#ffffff', fontSize: '20px', cursor: 'pointer' }}>☰</button>
        </div>

        <nav style={{ padding: '12px 6px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <button onClick={() => setActiveTab('CLIENTES')} title="Panel Clientes" style={{ display: 'flex', alignItems: 'center', justifyContent: sidebarOpen ? 'space-between' : 'center', backgroundColor: activeTab === 'CLIENTES' ? '#8cc63f' : 'transparent', color: '#ffffff', border: 'none', padding: '10px', borderRadius: '18px', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer', overflow: 'hidden' }}>
            <span>💼 {sidebarOpen && 'Panel Clientes'}</span>
            {sidebarOpen && <span style={{ fontSize: '11px' }}>({clients.length})</span>}
          </button>

          <button onClick={() => setActiveTab('NUEVOS')} title="Candidatos Nuevos" style={{ display: 'flex', alignItems: 'center', justifyContent: sidebarOpen ? 'space-between' : 'center', backgroundColor: activeTab === 'NUEVOS' ? '#8cc63f' : 'transparent', color: '#ffffff', border: 'none', padding: '10px', borderRadius: '18px', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer', overflow: 'hidden' }}>
            <span>✉ {sidebarOpen && 'Candidatos Nuevos'}</span>
            {sidebarOpen && <span style={{ fontSize: '11px' }}>({candidates.filter(c => c.status === 'NUEVO').length})</span>}
          </button>

          <button onClick={() => setActiveTab('CONTACTADOS')} title="Módulo Contactados" style={{ display: 'flex', alignItems: 'center', justifyContent: sidebarOpen ? 'space-between' : 'center', backgroundColor: activeTab === 'CONTACTADOS' ? '#8cc63f' : 'transparent', color: '#ffffff', border: 'none', padding: '10px', borderRadius: '18px', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer', overflow: 'hidden' }}>
            <span>👤 {sidebarOpen && 'Contactados'}</span>
            {sidebarOpen && <span style={{ fontSize: '11px' }}>({contacts.length})</span>}
          </button>
        </nav>

        <div style={{ marginTop: 'auto', padding: '12px 6px', borderTop: '1px solid #5a5f66' }}>
          <button onClick={handleLogout} style={{ width: '100%', backgroundColor: 'transparent', color: '#ff6b6b', border: '1px solid #ff6b6b', padding: '6px', borderRadius: '4px', fontSize: '12px', cursor: 'pointer' }}>
            {sidebarOpen ? 'Cerrar Sesión' : '➔'}
          </button>
        </div>
      </aside>

      {/* CONTENIDO PRINCIPAL */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <header style={{ backgroundColor: '#8cc63f', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <span style={{ color: '#ffffff', fontWeight: 'bold', fontSize: '24px', fontStyle: 'italic' }}>aglh</span>
            <span style={{ backgroundColor: '#4a4f56', color: '#ffffff', fontSize: '10px', padding: '2px 8px', borderRadius: '10px', fontWeight: 'bold' }}>ATS Enterprise</span>

            <div style={{ display: 'flex', alignItems: 'center', backgroundColor: '#3e4349', padding: '3px 8px', borderRadius: '6px', color: '#fff', fontSize: '12px', gap: '6px' }}>
              <span style={{ color: '#ccc', fontWeight: 'bold' }}>Modo:</span>
              {isSuperAdminUser ? (
                <select value={viewMode} onChange={(e) => setViewMode(e.target.value as any)} style={{ backgroundColor: '#ffffff', color: '#222', border: 'none', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}>
                  <option value="Admin">Admin</option>
                  <option value="Reclutador">Reclutador</option>
                </select>
              ) : (
                <span style={{ fontWeight: 'bold', color: '#8cc63f' }}>Reclutador</span>
              )}
            </div>
          </div>
        </header>

        <main style={{ padding: '16px', flex: 1, overflowY: 'auto', boxSizing: 'border-box' }}>
          {loading ? (
            <p style={{ textAlign: 'center', color: '#555' }}>Cargando información...</p>
          ) : (
            <>
              {activeTab === 'CLIENTES' && activeClient && (
                <div style={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
                  
                  {/* BARRA SUPERIOR DE SELECTOR DE CLIENTES */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', gap: '8px', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: '200px' }}>
                      <select 
                        value={selectedClientId || ''} 
                        onChange={(e) => setSelectedClientId(e.target.value)}
                        style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #8cc63f', fontWeight: 'bold', backgroundColor: '#fff', fontSize: '13px' }}
                      >
                        {clients.map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>

                    {viewMode === 'Admin' && (
                      <button
                        onClick={() => {
                          setEditingClient(null);
                          setClientName('');
                          setClientExecEmail('');
                          setClientDireccion('');
                          setClientUbicacionUrl('');
                          setClientZona('');
                          setIsClientModalOpen(true);
                        }}
                        style={{ backgroundColor: '#8cc63f', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: '20px', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer', whiteSpace: 'nowrap' }}
                      >
                        + Nuevo Cliente
                      </button>
                    )}
                  </div>

                  {/* CABECERA DEL CLIENTE ADAPTADA CON BOTÓN GOOGLE MAPS */}
                  <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '16px', marginBottom: '16px', boxShadow: '0 2px 6px rgba(0,0,0,0.05)', boxSizing: 'border-box', width: '100%' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <h1 style={{ margin: 0, color: '#2c3137', fontSize: '20px' }}>{activeClient.name}</h1>
                            {activeClient.zona && (
                              <span style={{ fontSize: '11px', backgroundColor: '#f0f0f0', color: '#555', padding: '2px 8px', borderRadius: '10px', fontWeight: 'bold' }}>
                                {activeClient.zona}
                              </span>
                            )}
                          </div>

                          <p style={{ margin: '6px 0 0 0', fontSize: '12px', color: '#666', lineHeight: '1.4' }}>
                            Ubicación: <strong>{activeClient.requirements?.location || activeClient.zona || 'No especificada'}</strong> | Perfil: <strong>{activeClient.requirements?.required_experience || 'No especificado'}</strong> | Ejecutivo: <strong>{activeClient.executive_email || 'Sin asignar'}</strong>
                          </p>

                          {activeClient.direccion && (
                            <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#555' }}>
                              🏠 <strong>Dirección:</strong> {activeClient.direccion}
                            </p>
                          )}

                          {/* BOTÓN GOOGLE MAPS INTEGRADOR */}
                          {activeClient.ubicacion_url && (
                            <div style={{ marginTop: '10px' }}>
                              <a
                                href={activeClient.ubicacion_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: '#2563eb', color: '#ffffff', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', textDecoration: 'none' }}
                              >
                                📍 Abrir en Google Maps
                              </a>
                            </div>
                          )}
                        </div>

                        {/* BOTONES MODO ADMIN */}
                        {viewMode === 'Admin' && (
                          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                            <button
                              onClick={() => {
                                setEditingClient(activeClient);
                                setClientName(activeClient.name);
                                setClientExecEmail(activeClient.executive_email || '');
                                setClientDireccion(activeClient.direccion || '');
                                setClientUbicacionUrl(activeClient.ubicacion_url || '');
                                setClientZona(activeClient.zona || '');
                                setIsClientModalOpen(true);
                              }}
                              style={{ backgroundColor: '#4a4f56', color: '#fff', border: 'none', padding: '6px 10px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}
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
                              style={{ backgroundColor: '#383d42', color: '#fff', border: 'none', padding: '6px 10px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}
                            >
                              ⚙ Editar Requisitos
                            </button>
                            <button
                              onClick={() => handleDeleteClient(activeClient.id)}
                              style={{ backgroundColor: '#ff6b6b', color: '#fff', border: 'none', padding: '6px 10px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}
                            >
                              🗑 Eliminar
                            </button>
                          </div>
                        )}
                      </div>

                      {/* BUSCADOR Y ORDENAMIENTO */}
                      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center', backgroundColor: '#f5f9ee', padding: '10px', borderRadius: '8px' }}>
                        <input
                          type="text"
                          placeholder="🔍 Buscar por nombre, localidad o experiencia..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          style={{ flex: 1, minWidth: '220px', padding: '8px 12px', border: '1px solid #ccc', borderRadius: '6px', fontSize: '13px' }}
                        />
                        <select
                          value={sortBy}
                          onChange={(e) => setSortBy(e.target.value as SortOption)}
                          style={{ padding: '8px 12px', border: '1px solid #ccc', borderRadius: '6px', fontSize: '13px', backgroundColor: '#fff' }}
                        >
                          <option value="MATCH_DESC">Mayor % Match</option>
                          <option value="MATCH_ASC">Menor % Match</option>
                          <option value="NEWEST">Más Recientes</option>
                          <option value="OLDEST">Más Antiguos</option>
                          <option value="LOCATION">Ubicación</option>
                        </select>
                      </div>

                    </div>
                  </div>

                  {/* LISTADO DE CANDIDATOS MATCHEADOS */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '14px' }}>
                    {getFilteredAndSortedCandidates(activeClient).map((cand) => {
                      const matchPct = calculateMatch(cand, activeClient);
                      return (
                        <div key={cand.id} style={{ backgroundColor: '#ffffff', borderRadius: '10px', padding: '14px', border: '1px solid #e2edd0', boxShadow: '0 2px 4px rgba(0,0,0,0.03)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                              <h3 style={{ margin: 0, fontSize: '15px', color: '#2c3137' }}>{cand.first_name} {cand.last_name}</h3>
                              <span style={{ backgroundColor: matchPct >= 75 ? '#8cc63f' : matchPct >= 60 ? '#f39c12' : '#e74c3c', color: '#fff', fontSize: '11px', fontWeight: 'bold', padding: '2px 8px', borderRadius: '10px' }}>
                                {matchPct}% Match
                              </span>
                            </div>

                            <p style={{ margin: '0 0 6px 0', fontSize: '12px', color: '#666' }}>📍 {cand.location}</p>
                            <p style={{ margin: '0 0 10px 0', fontSize: '12px', color: '#444', lineHeight: '1.3' }}>{cand.main_experience}</p>

                            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '12px' }}>
                              {cand.skills?.map((sk, idx) => (
                                <span key={idx} style={{ backgroundColor: '#f0f0f0', color: '#555', fontSize: '10px', padding: '2px 6px', borderRadius: '4px' }}>{sk}</span>
                              ))}
                            </div>
                          </div>

                          <div style={{ display: 'flex', gap: '6px', borderTop: '1px solid #f0f0f0', paddingTop: '10px' }}>
                            <button
                              onClick={() => handleOpenCandidateModal(cand)}
                              style={{ flex: 1, backgroundColor: '#4a4f56', color: '#fff', border: 'none', padding: '6px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}
                            >
                              Ver Perfil
                            </button>
                            <button
                              onClick={() => handleContactCandidate(cand, activeClient)}
                              style={{ flex: 1, backgroundColor: '#8cc63f', color: '#fff', border: 'none', padding: '6px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}
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

              {/* PESTAÑA DE CONTACTADOS */}
              {activeTab === 'CONTACTADOS' && (
                <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '16px', boxShadow: '0 2px 6px rgba(0,0,0,0.05)' }}>
                  <h2 style={{ margin: '0 0 16px 0', fontSize: '18px', color: '#2c3137' }}>Candidatos Contactados</h2>
                  {contacts.length === 0 ? (
                    <p style={{ color: '#666', fontSize: '13px' }}>No hay candidatos registrados en estado contactado.</p>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '12px' }}>
                      {contacts.map((ct) => (
                        <div key={ct.id} style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '12px', backgroundColor: '#fafafa' }}>
                          <h4 style={{ margin: '0 0 4px 0', fontSize: '14px', color: '#222' }}>{ct.candidate?.first_name} {ct.candidate?.last_name}</h4>
                          <p style={{ margin: '0 0 4px 0', fontSize: '12px', color: '#666' }}>Cliente: <strong>{ct.client?.name || 'Cliente'}</strong></p>
                          <p style={{ margin: '0 0 8px 0', fontSize: '11px', color: '#888' }}>Contactado por: {ct.recruiter_email}</p>
                          <button
                            onClick={() => handleReturnToCandidates(ct.id, ct.candidate_id)}
                            style={{ backgroundColor: '#ff6b6b', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}
                          >
                            Devolver a Activos
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* PESTAÑA DE NUEVOS */}
              {activeTab === 'NUEVOS' && (
                <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '16px', boxShadow: '0 2px 6px rgba(0,0,0,0.05)' }}>
                  <h2 style={{ margin: '0 0 16px 0', fontSize: '18px', color: '#2c3137' }}>Candidatos Nuevos Sin Asignar</h2>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
                    {candidates.filter(c => c.status === 'NUEVO').map(cand => (
                      <div key={cand.id} style={{ border: '1px solid #e0e0e0', borderRadius: '8px', padding: '12px' }}>
                        <h3 style={{ margin: '0 0 4px 0', fontSize: '14px' }}>{cand.first_name} {cand.last_name}</h3>
                        <p style={{ margin: '0 0 6px 0', fontSize: '12px', color: '#666' }}>📍 {cand.location}</p>
                        <p style={{ margin: '0 0 8px 0', fontSize: '12px', color: '#444' }}>{cand.main_experience}</p>
                        <button
                          onClick={() => handleOpenCandidateModal(cand)}
                          style={{ backgroundColor: '#4a4f56', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', cursor: 'pointer' }}
                        >
                          Ver Detalles
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </>
          )}
        </main>
      </div>

      {/* MODAL DETALLES DE CANDIDATO */}
      {isCandidateModalOpen && selectedCandidateForModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '16px' }}>
          <div style={{ backgroundColor: '#fff', borderRadius: '12px', width: '100%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto', padding: '20px', boxSizing: 'border-box' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ margin: 0, fontSize: '18px' }}>Perfil de Candidato</h2>
              <button onClick={() => setIsCandidateModalOpen(false)} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer' }}>✕</button>
            </div>

            {!isEditingCandidate ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
                <p><strong>Nombre:</strong> {selectedCandidateForModal.first_name} {selectedCandidateForModal.last_name}</p>
                <p><strong>Email:</strong> {selectedCandidateForModal.email || 'No registrado'}</p>
                <p><strong>Teléfono:</strong> {selectedCandidateForModal.phone || 'No registrado'}</p>
                <p><strong>Ubicación:</strong> {selectedCandidateForModal.location}</p>
                <p><strong>Experiencia:</strong> {selectedCandidateForModal.main_experience}</p>
                <p><strong>Habilidades:</strong> {selectedCandidateForModal.skills?.join(', ')}</p>
                
                <div style={{ marginTop: '10px', padding: '10px', backgroundColor: '#f9f9f9', borderRadius: '6px' }}>
                  <p style={{ margin: '0 0 6px 0', fontWeight: 'bold' }}>Archivo de Curriculum (CV):</p>
                  {selectedCandidateForModal.cv_url ? (
                    <a href={selectedCandidateForModal.cv_url} target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb', fontWeight: 'bold' }}>📄 Ver Documento de CV</a>
                  ) : (
                    <p style={{ margin: 0, color: '#888' }}>Sin CV adjunto.</p>
                  )}
                  <input type="file" accept=".pdf,.doc,.docx" onChange={handleFileUpload} style={{ marginTop: '8px', fontSize: '12px' }} />
                  {uploadingCv && <p style={{ fontSize: '11px', color: '#666' }}>Subiendo archivo...</p>}
                </div>

                <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                  <button onClick={() => setIsEditingCandidate(true)} style={{ flex: 1, backgroundColor: '#4a4f56', color: '#fff', border: 'none', padding: '8px', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}>Editar Datos</button>
                  <button onClick={() => handleDeleteCandidate(selectedCandidateForModal.id)} style={{ backgroundColor: '#ff6b6b', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}>Eliminar</button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <input type="text" value={editCandData.first_name || ''} onChange={e => setEditCandData({ ...editCandData, first_name: e.target.value })} placeholder="Nombre" style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }} />
                <input type="text" value={editCandData.last_name || ''} onChange={e => setEditCandData({ ...editCandData, last_name: e.target.value })} placeholder="Apellido" style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }} />
                <input type="email" value={editCandData.email || ''} onChange={e => setEditCandData({ ...editCandData, email: e.target.value })} placeholder="Email" style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }} />
                <input type="text" value={editCandData.phone || ''} onChange={e => setEditCandData({ ...editCandData, phone: e.target.value })} placeholder="Teléfono" style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }} />
                <input type="text" value={editCandData.location || ''} onChange={e => setEditCandData({ ...editCandData, location: e.target.value })} placeholder="Ubicación" style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }} />
                <textarea value={editCandData.main_experience || ''} onChange={e => setEditCandData({ ...editCandData, main_experience: e.target.value })} placeholder="Experiencia principal" style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px', height: '60px' }} />
                
                <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                  <button onClick={handleSaveCandidateChanges} style={{ flex: 1, backgroundColor: '#8cc63f', color: '#fff', border: 'none', padding: '8px', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}>Guardar</button>
                  <button onClick={() => setIsEditingCandidate(false)} style={{ backgroundColor: '#ccc', color: '#222', border: 'none', padding: '8px', borderRadius: '4px', cursor: 'pointer' }}>Cancelar</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL CREAR / EDITAR CLIENTE */}
      {isClientModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '16px' }}>
          <div style={{ backgroundColor: '#fff', borderRadius: '12px', width: '100%', maxWidth: '420px', padding: '20px', boxSizing: 'border-box' }}>
            <h2 style={{ margin: '0 0 14px 0', fontSize: '16px' }}>{editingClient ? 'Editar Cliente' : 'Nuevo Cliente'}</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <input type="text" placeholder="Nombre de la Empresa" value={clientName} onChange={e => setClientName(e.target.value)} style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }} />
              <input type="email" placeholder="Email del Ejecutivo" value={clientExecEmail} onChange={e => setClientExecEmail(e.target.value)} style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }} />
              <input type="text" placeholder="Dirección Física" value={clientDireccion} onChange={e => setClientDireccion(e.target.value)} style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }} />
              <input type="text" placeholder="Zona / Localidad" value={clientZona} onChange={e => setClientZona(e.target.value)} style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }} />
              <input type="url" placeholder="Enlace de Google Maps (ubicacion_url)" value={clientUbicacionUrl} onChange={e => setClientUbicacionUrl(e.target.value)} style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }} />

              <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                <button onClick={handleSaveClientDetails} style={{ flex: 1, backgroundColor: '#8cc63f', color: '#fff', border: 'none', padding: '8px', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}>Guardar Cliente</button>
                <button onClick={() => setIsClientModalOpen(false)} style={{ backgroundColor: '#ccc', color: '#222', border: 'none', padding: '8px', borderRadius: '4px', cursor: 'pointer' }}>Cancelar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL EDITAR REQUISITOS */}
      {isEditReqModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '16px' }}>
          <div style={{ backgroundColor: '#fff', borderRadius: '12px', width: '100%', maxWidth: '420px', padding: '20px', boxSizing: 'border-box' }}>
            <h2 style={{ margin: '0 0 14px 0', fontSize: '16px' }}>Editar Requisitos de Búsqueda</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <input type="text" placeholder="Ubicación requerida" value={reqLocation} onChange={e => setReqLocation(e.target.value)} style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }} />
              <textarea placeholder="Perfil / Experiencia requerida" value={reqExperience} onChange={e => setReqExperience(e.target.value)} style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px', height: '60px' }} />
              <input type="text" placeholder="Palabras clave (separadas por comas)" value={reqKeywords} onChange={e => setReqKeywords(e.target.value)} style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }} />

              <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                <button onClick={handleSaveRequirements} style={{ flex: 1, backgroundColor: '#8cc63f', color: '#fff', border: 'none', padding: '8px', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}>Guardar Requisitos</button>
                <button onClick={() => setIsEditReqModalOpen(false)} style={{ backgroundColor: '#ccc', color: '#222', border: 'none', padding: '8px', borderRadius: '4px', cursor: 'pointer' }}>Cancelar</button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
