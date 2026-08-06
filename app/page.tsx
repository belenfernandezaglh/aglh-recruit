'use client';

import React, { useState, useRef } from 'react';
import { 
  Users, 
  Search, 
  Upload,
  Clock,
  FileText,
  Trash2,
  BookOpen,
  Briefcase,
  MapPin,
  Building2,
  AlertCircle,
  PhoneCall,
  UserCheck,
  CheckCircle2,
  Filter,
  UserPlus
} from 'lucide-react';

// 1. Estructura de Clientes vinculados a Ejecutivos de Cuenta
const OPERATIVAS_BASE = [
  {
    ejecutivo: 'Mesa de Operaciones — Outsourcing / Reclutamiento',
    cuentas: [
      { id: 'procil', cliente: 'PROCIL', cargoAsociado: '04', contactos: [] },
      { id: 'montecable', cliente: 'MONTECABLE', cargoAsociado: '06', contactos: [] },
      { id: 'rafap', cliente: 'R. AFAP (Maldonado)', cargoAsociado: '06', contactos: [] },
      { id: 'promotora', cliente: 'Promotora — Mvdeo.', cargoAsociado: '06', contactos: [] },
      { id: 'velcro', cliente: 'VELCRO', cargoAsociado: '04', contactos: [] },
      { id: 'ucm_rec', cliente: 'UCM — Recepcionistas', cargoAsociado: '10', contactos: [] },
      { id: 'darkstore', cliente: 'DARKSTORE', cargoAsociado: '01', contactos: [] },
      { id: 'caderlux', cliente: 'CADERLUX', cargoAsociado: '03', contactos: [] },
      { id: 'tecnobalizas', cliente: 'TECNOBALIZAS', cargoAsociado: '01', contactos: [] },
      { id: 'pangiorno', cliente: 'PANGIORNO', cargoAsociado: '06', contactos: [] },
      { id: 'santarosa', cliente: 'SANTA ROSA', cargoAsociado: '03', contactos: [] },
      { id: 'frimaral', cliente: 'FRIMARAL', cargoAsociado: '07', contactos: [] },
      { id: 'tienda_inglesa', cliente: 'TIENDA INGLESA (Saravia / Solymar)', cargoAsociado: '03', contactos: [] },
      { id: 'riogas', cliente: 'RIOGAS / ACODIKE', cargoAsociado: '02', contactos: [] },
      { id: 'tiendas_varias', cliente: 'TIENDA Montevideo / CdLC / Atlántida', cargoAsociado: '06', contactos: [] },
      { id: 'ehub', cliente: 'EHUB — Roti/Pana', cargoAsociado: '06', contactos: [] },
      { id: 'bromyros', cliente: 'BROMYROS', cargoAsociado: '03', contactos: [] },
      { id: 'pepsico', cliente: 'PEPSICO', cargoAsociado: '01', contactos: [] },
      { id: 'sodimac', cliente: 'SODIMAC (S - 40/44 / S - 30)', cargoAsociado: '03', contactos: [] },
      { id: 'logisfashion', cliente: 'LOGISFASHION', cargoAsociado: '08', contactos: [] },
      { id: 'neorol', cliente: 'NEOROL', cargoAsociado: '07', contactos: [] },
      { id: 'corfrisa', cliente: 'CORFRISA', cargoAsociado: '03', contactos: [] },
      { id: 'disershop', cliente: 'DISERSHOP', cargoAsociado: '03', contactos: [] },
      { id: 'kevenoll', cliente: 'KEVENOLL', cargoAsociado: '03', contactos: [] },
      { id: 'divino', cliente: 'DIVINO Tacuarembó', cargoAsociado: '03', contactos: [] }
    ]
  }
];

// 2. Fichas del Manual de Cargos para realizar el Match
const MANUAL_CARGOS = [
  { id: '01', title: 'Peón / Operario General', funcion: 'Carga y descarga, esfuerzo físico.' },
  { id: '02', title: 'Operario de Ingreso — Riogas y Acodike', funcion: 'Planta de gas, esfuerzo físico alto.' },
  { id: '03', title: 'Auxiliar / Operario de Depósito', funcion: 'Picking, colector de datos, depósito.' },
  { id: '04', title: 'Auxiliar / Operario de Limpieza', funcion: 'Limpieza de instalaciones y oficinas.' },
  { id: '05', title: 'Chofer / Reparto', funcion: 'Reparto, libreta de conducir.' },
  { id: '06', title: 'Personal de Atención al Cliente / Venta', funcion: 'Atención al público, ventas, caja.' },
  { id: '07', title: 'Operario de Producción / Técnico', funcion: 'Oficio técnico, soldadura, electricidad.' },
  { id: '08', title: 'Auditor / Control de Inventario', funcion: 'Inventarios, colector y PC.' },
  { id: '09', title: 'Personal de Enfermería', funcion: 'Enfermería, salud, libreta.' },
  { id: '10', title: 'Recepcionista', funcion: 'Recepción y atención administrativa.' },
  { id: '11', title: 'Peón de Reparto — Logisfashion', funcion: 'Acompañante de reparto a demanda.' }
];

export default function Home() {
  const [activeTab, setActiveTab] = useState<'operativas' | 'manual' | 'candidates'>('operativas');
  const [searchTerm, setSearchTerm] = useState('');
  const [operativas, setOperativas] = useState(OPERATIVAS_BASE);
  const [candidates, setCandidates] = useState<any[]>([]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  // Función de lectura y match automático de CVs con las operativas
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      const newCandidates: any[] = [];
      const updatedOperativas = [...operativas];

      Array.from(files).forEach((file, index) => {
        // Extraer nombre y simular lectura de perfil/teléfono desde el archivo
        const cleanName = file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");
        const fakePhone = `09${Math.floor(10000000 + Math.random() * 9000000)}`;
        
        // Asignación automática de cargo por palabras clave
        let assignedCargo = '01'; 
        const lowerName = file.name.toLowerCase();
        
        if (lowerName.includes('limpieza') || lowerName.includes('auxiliar')) assignedCargo = '04';
        else if (lowerName.includes('deposito') || lowerName.includes('picker')) assignedCargo = '03';
        else if (lowerName.includes('tecnico') || lowerName.includes('soldador')) assignedCargo = '07';
        else if (lowerName.includes('venta') || lowerName.includes('caja')) assignedCargo = '06';

        // Agregar candidato
        newCandidates.push({
          id: Date.now() + index,
          name: cleanName,
          phone: fakePhone,
          position: MANUAL_CARGOS.find(c => c.id === assignedCargo)?.title || 'Operario',
          status: 'EVALUACION',
          fileName: file.name,
          date: new Date().toLocaleDateString('es-ES')
        });

        // Completar línea en la Operativa del Cliente que coincida con el puesto
        updatedOperativas.forEach(group => {
          group.cuentas.forEach(cuenta => {
            if (cuenta.cargoAsociado === assignedCargo) {
              cuenta.contactos.push(`${fakePhone} — ${cleanName}`);
            }
          });
        });
      });

      setCandidates((prev) => [...newCandidates, ...prev]);
      setOperativas(updatedOperativas);
      event.target.value = '';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        accept=".pdf,.doc,.docx" 
        multiple 
        className="hidden" 
      />

      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-blue-600 text-white p-2 rounded-lg font-bold text-xl">
              AGLH
            </div>
            <div>
              <h1 className="font-bold text-lg text-slate-900 leading-tight">AGLH Recruit</h1>
              <p className="text-xs text-slate-500">Mesa de Operaciones & Reclutamiento Outsourcing</p>
            </div>
          </div>

          <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
            <button
              onClick={() => setActiveTab('operativas')}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
                activeTab === 'operativas' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600'
              }`}
            >
              <PhoneCall className="w-3.5 h-3.5" />
              <span>Operativas</span>
            </button>
            <button
              onClick={() => setActiveTab('manual')}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
                activeTab === 'manual' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Manual de Cargos</span>
            </button>
            <button
              onClick={() => setActiveTab('candidates')}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
                activeTab === 'candidates' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Candidatos ({candidates.length})</span>
            </button>
          </div>
          
          <button 
            onClick={handleUploadClick}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center space-x-2 transition-colors shadow-sm"
          >
            <Upload className="w-4 h-4" />
            <span>Cargar CVs</span>
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* VISTA OPERATIVAS */}
        {activeTab === 'operativas' && (
          <div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-6 flex justify-between items-center">
              <div className="relative w-96">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar cliente o número..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="text-xs text-slate-500 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-blue-600" />
                <span>Líneas completadas dinámicamente mediante coincidencia con CVs</span>
              </div>
            </div>

            {operativas.map((group, gIdx) => (
              <div key={gIdx} className="mb-8">
                <div className="bg-slate-900 text-white p-3 rounded-t-xl font-bold text-sm flex justify-between items-center">
                  <span>EJECUTIVO DE CUENTA: {group.ejecutivo}</span>
                  <span className="text-xs text-slate-400">{group.cuentas.length} Clientes Asignados</span>
                </div>
                
                <div className="bg-white border border-t-0 border-slate-200 rounded-b-xl shadow-sm p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {group.cuentas
                    .filter(c => c.cliente.toLowerCase().includes(searchTerm.toLowerCase()))
                    .map((cuenta, cIdx) => (
                      <div key={cIdx} className="border border-slate-200 rounded-lg p-3.5 hover:border-blue-300 transition-colors bg-slate-50/50">
                        <div className="font-bold text-sm text-slate-900 border-b border-slate-200 pb-2 mb-2 flex justify-between items-center">
                          <span className="truncate">{cuenta.cliente}</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                            cuenta.contactos.length > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'
                          }`}>
                            {cuenta.contactos.length} Matched
                          </span>
                        </div>
                        
                        <div className="space-y-1 max-h-48 overflow-y-auto">
                          {cuenta.contactos.length > 0 ? (
                            cuenta.contactos.map((contacto, numIdx) => (
                              <div key={numIdx} className="text-xs text-slate-700 font-mono flex items-center space-x-1.5">
                                <span className="text-emerald-500 font-bold">•</span>
                                <span>{contacto}</span>
                              </div>
                            ))
                          ) : (
                            <p className="text-xs text-slate-400 italic py-2">
                              A la espera de carga de CVs compatibles...
                            </p>
                          )}
                        </div>
                      </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* VISTA MANUAL */}
        {activeTab === 'manual' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {MANUAL_CARGOS.map((cargo) => (
              <div key={cargo.id} className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                <span className="text-xs font-bold px-2.5 py-1 bg-slate-900 text-white rounded-md">
                  CARGO {cargo.id}
                </span>
                <h3 className="text-lg font-bold text-slate-900 mt-2">{cargo.title}</h3>
                <p className="text-xs text-slate-600 mt-2">{cargo.funcion}</p>
              </div>
            ))}
          </div>
        )}

        {/* VISTA CANDIDATOS */}
        {activeTab === 'candidates' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {candidates.map((candidate) => (
              <div key={candidate.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                <h4 className="font-bold text-slate-900">{candidate.name}</h4>
                <p className="text-xs text-blue-600 font-medium">{candidate.position}</p>
                <p className="text-xs text-slate-500 font-mono mt-1">{candidate.phone}</p>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
