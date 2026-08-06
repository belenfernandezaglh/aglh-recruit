'use client';

import React, { useState, useRef } from 'react';
import { 
  Users, 
  Search, 
  Filter, 
  UserCheck, 
  Upload,
  CheckCircle2,
  Clock,
  FileText,
  Trash2,
  BookOpen,
  Briefcase,
  MapPin,
  Building2,
  AlertCircle
} from 'lucide-react';

// Datos consolidados del Manual de Cargos Operativos
const MANUAL_CARGOS = [
  {
    id: '01',
    title: 'Peón / Operario General',
    clientesCount: 6,
    clientes: 'CVM Electroventas, Tecnobalizas, Urutrame, Frimaral, Darkstore',
    funcion: 'Tareas físicas generales: carga y descarga, apoyo en reparto, trabajo de depósito o planta sin foco específico en armado de pedidos con colector.',
    experiencia: 'No excluyente en la mayoría. Carga y descarga genérica.',
    edad: '18 a 35 años (Tecnobalizas: 20-35).',
    horario: 'Mixto Fijo o Rotativo según cliente.',
    requisitosFisicos: 'Capacidad de esfuerzo físico / trabajo de fuerza.',
    herramientas: 'CVM pide auto/moto propios. Resto no requiere libreta.',
    ubicacion: 'Montevideo y área metropolitana.',
    sexoPref: 'Masculino en la mayoría. Darkstore indistinto.',
    particularidades: 'Tecnobalizas requiere disponibilidad para viajes al interior con viáticos. Darkstore tiene turnos rotativos.'
  },
  {
    id: '02',
    title: 'Operario de Ingreso — Riogas y Acodike',
    clientesCount: 1,
    clientes: 'Riogas y Acodike',
    funcion: 'Ingreso de personal para tareas de depósito, carga y descarga en plantas sobre Cno. Francisco Lecocq.',
    experiencia: 'Sí, en depósitos o trabajos de carga y descarga.',
    edad: '20 a 35 años.',
    horario: 'Rotativo.',
    requisitosFisicos: 'Complexión media a grande (fuerza física estricta).',
    herramientas: 'No requiere libreta ni uniforme especial.',
    ubicacion: 'Camino Francisco Lecocq (Montevideo Oeste).',
    sexoPref: 'Masculino.',
    particularidades: 'Filtro físico más estricto. Cuenta de alto volumen de seguimiento diferenciado.'
  },
  {
    id: '03',
    title: 'Auxiliar / Operario de Depósito',
    clientesCount: 8,
    clientes: 'Corfrisa, Kevenoll, Disershop, Divino, Caderlux, Santa Rosa, Tienda Inglesa, Bromyros',
    funcion: 'Armado de pedidos vía colector de datos o planilla, picking, expedición, carga/descarga y paletera.',
    experiencia: 'Excluyente o muy valorada (picking, armado de pedidos). Caderlux y Santa Rosa sin experiencia.',
    edad: '20 a 35 años (Caderlux y Santa Rosa indistinto).',
    horario: 'Fijo en la mayoría. Rotativo en Corfrisa y Kevenoll.',
    requisitosFisicos: 'Exigencia de fuerza y masa muscular (Corfrisa, Kevenoll, Bromyros).',
    herramientas: 'Uso de colector de datos para preparación de pedidos.',
    ubicacion: 'Montevideo y sucursales Solymar / Saravia.',
    sexoPref: 'Masculino en la mayoría. Caderlux y Santa Rosa indistinto.',
    particularidades: 'Disershop concentra 5 sucursales. Tienda Inglesa combina con ayudante de reparto (6 a 18 hs).'
  },
  {
    id: '04',
    title: 'Auxiliar / Operario de Limpieza',
    clientesCount: 4,
    clientes: 'Atma, Orofino, Xocolat, Caderlux',
    funcion: 'Limpieza e higiene de oficinas e instalaciones del cliente.',
    experiencia: 'No excluyente. Orofino valora experiencia previa.',
    edad: '20-35 en Atma/Xocolat. Orofino acepta +35.',
    horario: 'Rotativo en Atma. Fijo en Orofino y Xocolat (6:30 a 16:00 hs).',
    requisitosFisicos: 'Sin requisitos físicos específicos.',
    herramientas: 'No aplica.',
    ubicacion: 'Montevideo y Canelones (La Paz).',
    sexoPref: 'Indistinto en Atma. Femenino en Orofino y Xocolat.',
    particularidades: 'En Caderlux el rol es combinado (limpieza + depósito).'
  },
  {
    id: '05',
    title: 'Chofer / Reparto',
    clientesCount: 2,
    clientes: 'Acra Equipamientos, UCM',
    funcion: 'Conducción y/o acompañamiento en reparto de mercadería o traslados.',
    experiencia: 'Experiencia en repartos (Acra).',
    edad: '20-35 y +35 (Acra). UCM indistinto.',
    horario: 'Fijo (Acra). Rotativo según asignación (UCM).',
    requisitosFisicos: 'Sin requisitos específicos.',
    herramientas: 'Libreta Categoría A y B (Acra). Libreta habilitante en UCM.',
    ubicacion: 'Montevideo.',
    sexoPref: 'Masculino (Acra). Indistinto (UCM).',
    particularidades: 'Búsqueda de UCM agrupa múltiples roles asignados según necesidad operativa.'
  },
  {
    id: '06',
    title: 'Personal de Atención al Cliente / Venta',
    clientesCount: 3,
    clientes: 'Pangiorno, Tienda Inglesa, Victoria\'s Secret',
    funcion: 'Atención al público, venta directa, caja, y tareas de gastronomía/panadería en Pangiorno.',
    experiencia: 'Valorada en gastronomía/ventas. Tienda Inglesa valora actitud dinámica.',
    edad: '18 a 35 años.',
    horario: 'Rotativo con amplia disponibilidad (7 a 21 hs).',
    requisitosFisicos: 'Esfuerzo moderado en Tienda Inglesa (bidones de agua).',
    herramientas: 'Carné de salud y manipulación de alimentos (Pangiorno).',
    ubicacion: 'Montevideo, Ciudad de la Costa, Maldonado, Rocha, Shoppings.',
    sexoPref: 'Indistinto en Pangiorno y Tienda Inglesa. Femenino en Victoria\'s Secret.',
    particularidades: 'Pangiorno exige locomoción propia para zona este. Victoria\'s Secret requiere imagen de marca.'
  },
  {
    id: '07',
    title: 'Operario de Producción / Técnico',
    clientesCount: 3,
    clientes: 'Neorol, Xocolat, Frimaral',
    funcion: 'Producción industrial con componente técnico: electricidad, soldadura MIG, herrería.',
    experiencia: 'Excluyente y técnica comprobable en Neorol y Frimaral.',
    edad: '20-35 (Neorol acepta +35).',
    horario: 'Rotativo (Neorol). Fijo Lunes a Viernes (Xocolat, Frimaral).',
    requisitosFisicos: 'Sin especificaciones detalladas.',
    herramientas: 'Formación técnica o certificado del oficio.',
    ubicacion: 'Montevideo.',
    sexoPref: 'Masculino en los 3 clientes.',
    particularidades: 'Único cargo que exige formación técnica o oficio certificado antes de derivar.'
  },
  {
    id: '08',
    title: 'Auditor / Control de Inventario',
    clientesCount: 2,
    clientes: 'Gi Stock, Logisfashion',
    funcion: 'Control de inventarios mediante colector de datos y computadora en tiendas y depósitos.',
    experiencia: 'Gi Stock valora experiencia. Logisfashion prefiere primera experiencia laboral.',
    edad: '20 a 35 años.',
    horario: 'Rotativo (Gi Stock). Fijo (Logisfashion).',
    requisitosFisicos: 'Sin requisitos físicos especificos.',
    herramientas: 'Manejo de colector de datos y PC.',
    ubicacion: 'Montevideo (Gi Stock) y Maldonado/Punta del Este (Logisfashion).',
    sexoPref: 'Indistinto.',
    particularidades: 'Logisfashion opera exclusivamente en Punta del Este y Maldonado para este rol.'
  },
  {
    id: '09',
    title: 'Personal de Enfermería',
    clientesCount: 1,
    clientes: 'UCM',
    funcion: 'Atención de enfermería general, gestión de insumos (ecónoma), vacunación y chequeos.',
    experiencia: 'Requerida en área de salud.',
    edad: 'Indistinto.',
    horario: 'Rotativo asignado por la empresa.',
    requisitosFisicos: 'Sin requisitos físicos relevados.',
    herramientas: 'Requiere libreta de conducir.',
    ubicacion: 'Ubicaciones rotativas según asignación de UCM.',
    sexoPref: 'Indistinto.',
    particularidades: 'Rol dentro del grupo de búsquedas conjuntas de UCM.'
  },
  {
    id: '10',
    title: 'Recepcionista',
    clientesCount: 1,
    clientes: 'UCM',
    funcion: 'Recepción, atención telefónica y tareas administrativas de escritorio.',
    experiencia: 'Requerida en recepción o administración.',
    edad: 'Indistinto.',
    horario: 'Rotativo asignado por la empresa.',
    requisitosFisicos: 'No aplica.',
    herramientas: 'Manejo de PC y sistemas.',
    ubicacion: 'Montevideo (sucursales UCM).',
    sexoPref: 'Indistinto.',
    particularidades: 'Confirmar especificaciones de la vacante puntual antes de derivar.'
  },
  {
    id: '11',
    title: 'Peón de Reparto — Logisfashion',
    clientesCount: 1,
    clientes: 'Logisfashion',
    funcion: 'Carga, descarga y acompañamiento en reparto por tiendas desde el depósito de Ruta 102.',
    experiencia: 'No excluyente.',
    edad: 'Indistinto.',
    horario: 'A convocatoria según demanda (Martes a Sábado desde 6:00 hs).',
    requisitosFisicos: 'Esfuerzo físico para carga y descarga.',
    herramientas: 'No requeridas.',
    ubicacion: 'Montevideo — Depósito Ruta 102.',
    sexoPref: 'Masculino.',
    particularidades: 'Esquema a demanda (jornalero $216/hora nominal). Incluye viático de boleto si no retorna al depósito.'
  }
];

export default function Home() {
  const [activeTab, setActiveTab] = useState<'manual' | 'candidates'>('manual');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [candidates, setCandidates] = useState<any[]>([]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      const newCandidates = Array.from(files).map((file, index) => {
        const cleanName = file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");
        return {
          id: Date.now() + index,
          name: cleanName,
          position: 'Candidato General',
          status: 'NUEVO',
          fileName: file.name,
          date: new Date().toLocaleDateString('es-ES')
        };
      });
      setCandidates((prev) => [...newCandidates, ...prev]);
      event.target.value = '';
    }
  };

  const handleDelete = (id: number) => {
    setCandidates((prev) => prev.filter(c => c.id !== id));
  };

  const filteredCargos = MANUAL_CARGOS.filter(cargo =>
    cargo.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cargo.clientes.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cargo.funcion.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredCandidates = candidates.filter(candidate => {
    const matchesSearch = candidate.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          candidate.position.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = selectedStatus === 'ALL' || candidate.status === selectedStatus;
    return matchesSearch && matchesStatus;
  });

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
              <p className="text-xs text-slate-500">Gestión de Reclutamiento & Perfiles Operativos</p>
            </div>
          </div>

          {/* Selector de Pestañas Navegables */}
          <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
            <button
              onClick={() => { setActiveTab('manual'); setSearchTerm(''); }}
              className={`flex items-center space-x-2 px-4 py-1.5 rounded-md text-xs font-semibold transition-all ${
                activeTab === 'manual' 
                  ? 'bg-white text-blue-600 shadow-sm' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>Manual de Cargos</span>
            </button>
            <button
              onClick={() => { setActiveTab('candidates'); setSearchTerm(''); }}
              className={`flex items-center space-x-2 px-4 py-1.5 rounded-md text-xs font-semibold transition-all ${
                activeTab === 'candidates' 
                  ? 'bg-white text-blue-600 shadow-sm' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Users className="w-4 h-4" />
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

      {/* Contenido según la Pestaña Activa */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* PESTAÑA 1: MANUAL DE CARGOS */}
        {activeTab === 'manual' && (
          <div>
            {/* Metricas del Manual */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center space-x-4">
                <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
                  <Briefcase className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500">Cargos Consolidados</p>
                  <p className="text-2xl font-bold text-slate-900">11 Perfiles</p>
                </div>
              </div>

              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center space-x-4">
                <div className="p-3 bg-purple-50 text-purple-600 rounded-lg">
                  <Building2 className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500">Cuentas / Clientes</p>
                  <p className="text-2xl font-bold text-slate-900">37 Cuentas Activas</p>
                </div>
              </div>

              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center space-x-4">
                <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
                  <MapPin className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500">Cobertura Operativa</p>
                  <p className="text-2xl font-bold text-slate-900">Nacional</p>
                </div>
              </div>
            </div>

            {/* Buscador de Cargos */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-6">
              <div className="relative w-full">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar cargo por nombre, cliente o tarea (ej: Riogas, picking, Chofer)..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Grid deTarjetas del Manual */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredCargos.map((cargo) => (
                <div key={cargo.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex flex-col justify-between hover:border-blue-300 transition-colors">
                  <div>
                    <div className="flex justify-between items-start mb-3">
                      <span className="text-xs font-bold px-2.5 py-1 bg-slate-900 text-white rounded-md">
                        CARGO {cargo.id}
                      </span>
                      <span className="text-xs px-2.5 py-1 bg-blue-50 text-blue-700 font-semibold rounded-full border border-blue-100">
                        {cargo.clientesCount} {cargo.clientesCount === 1 ? 'Cliente' : 'Clientes'}
                      </span>
                    </div>

                    <h3 className="text-lg font-bold text-slate-900 mb-2">{cargo.title}</h3>
                    
                    <p className="text-xs text-blue-600 font-medium mb-4 flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5 shrink-0" />
                      <span>{cargo.clientes}</span>
                    </p>

                    <div className="space-y-2 text-xs text-slate-600 border-t border-slate-100 pt-3">
                      <p><strong className="text-slate-800">Función Principal:</strong> {cargo.funcion}</p>
                      <p><strong className="text-slate-800">Experiencia:</strong> {cargo.experiencia}</p>
                      <p><strong className="text-slate-800">Rango Etario:</strong> {cargo.edad}</p>
                      <p><strong className="text-slate-800">Horario:</strong> {cargo.horario}</p>
                      <p><strong className="text-slate-800">Requisitos Físicos:</strong> {cargo.requisitosFisicos}</p>
                      <p><strong className="text-slate-800">Ubicación:</strong> {cargo.ubicacion}</p>
                      <p><strong className="text-slate-800">Preferencia de Sexo:</strong> {cargo.sexoPref}</p>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 bg-amber-50/50 p-3 rounded-lg text-xs text-amber-800 flex items-start space-x-2">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <span><strong>Particularidad:</strong> {cargo.particularidades}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* PESTAÑA 2: GESTOR DE CANDIDATOS */}
        {activeTab === 'candidates' && (
          <div>
            {/* Contadores */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center space-x-4">
                <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500">Total Candidatos</p>
                  <p className="text-2xl font-bold text-slate-900">{candidates.length}</p>
                </div>
              </div>

              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center space-x-4">
                <div className="p-3 bg-amber-50 text-amber-600 rounded-lg">
                  <Clock className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500">En Evaluación</p>
                  <p className="text-2xl font-bold text-slate-900">
                    {candidates.filter(c => c.status === 'EVALUACION').length}
                  </p>
                </div>
              </div>

              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center space-x-4">
                <div className="p-3 bg-purple-50 text-purple-600 rounded-lg">
                  <UserCheck className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500">Entrevistados</p>
                  <p className="text-2xl font-bold text-slate-900">
                    {candidates.filter(c => c.status === 'ENTREVISTA').length}
                  </p>
                </div>
              </div>

              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center space-x-4">
                <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500">Seleccionados</p>
                  <p className="text-2xl font-bold text-slate-900">
                    {candidates.filter(c => c.status === 'SELECCIONADO').length}
                  </p>
                </div>
              </div>
            </div>

            {/* Buscador */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-6 flex flex-col md:flex-row gap-4 justify-between items-center">
              <div className="relative w-full md:w-96">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar candidatos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center space-x-2 overflow-x-auto">
                <Filter className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
                {['ALL', 'NUEVO', 'EVALUACION', 'ENTREVISTA', 'SELECCIONADO'].map((status) => (
                  <button
                    key={status}
                    onClick={() => setSelectedStatus(status)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
                      selectedStatus === status
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {status === 'ALL' ? 'Todos' : status}
                  </button>
                ))}
              </div>
            </div>

            {/* Candidatos / Vacío */}
            {filteredCandidates.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredCandidates.map((candidate) => (
                  <div key={candidate.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-xs px-2.5 py-1 bg-blue-100 text-blue-700 font-medium rounded-full">
                          {candidate.status}
                        </span>
                        <button 
                          onClick={() => handleDelete(candidate.id)}
                          className="text-slate-400 hover:text-red-600 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <h4 className="font-bold text-slate-900 text-base capitalize">{candidate.name}</h4>
                      <p className="text-xs text-slate-500 mb-3">{candidate.position}</p>
                    </div>

                    <div className="border-t border-slate-100 pt-3 mt-3 flex items-center justify-between text-xs text-slate-500">
                      <div className="flex items-center space-x-1 truncate max-w-[180px]">
                        <FileText className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                        <span className="truncate">{candidate.fileName}</span>
                      </div>
                      <span>{candidate.date}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-sm">
                <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-1">No hay candidatos cargados</h3>
                <p className="text-slate-500 text-sm max-w-md mx-auto mb-6">
                  Sube currículums en PDF o Word para empezar a gestionarlos.
                </p>
                <button 
                  onClick={handleUploadClick}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg text-sm font-medium inline-flex items-center space-x-2 shadow-sm"
                >
                  <Upload className="w-4 h-4" />
                  <span>Cargar Múltiples CVs</span>
                </button>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
