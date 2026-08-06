'use client';

import React, { useState } from 'react';
import { 
  Users, Briefcase, FileText, CheckCircle2, Search, Filter, Plus, 
  BarChart3, UserCheck, Settings, ShieldAlert, Sparkles, Building2, Upload
} from 'lucide-react';

export default function AGLHRecruitApp() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'candidates' | 'audit'>('dashboard');
  const [selectedExecutive, setSelectedExecutive] = useState<string>('todos');
  const [selectedClient, setSelectedClient] = useState<string>('todos');

  // Datos de prueba para simular el sistema
  const executives = ['Anahit Armandugon', 'Jordan', 'Jorge', 'Pablo', 'Fernando', 'Belén'];
  const clients = ['Banco Itaú', 'Mercado Libre', 'Globant', 'PedidosYa', 'ZonaAmerica'];

  const candidates = [
    { id: 1, name: 'María González', role: 'Desarrollador Senior React', client: 'Banco Itaú', executive: 'Anahit Armandugon', match: 95, status: 'En Evaluación' },
    { id: 2, name: 'Lucas Rossi', role: 'Analista de Datos', client: 'Mercado Libre', executive: 'Jordan', match: 88, status: 'Entrevista Cliente' },
    { id: 3, name: 'Camila Silva', role: 'UX/UI Designer', client: 'Globant', executive: 'Belén', match: 92, status: 'Contactado' },
    { id: 4, name: 'Rodrigo Pérez', role: 'DevOps Engineer', client: 'PedidosYa', executive: 'Jorge', match: 84, status: 'Contratado' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* Barra Superior / Header */}
      <header className="border-b bg-white px-6 py-4 shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 font-bold text-white shadow-md">
              AG
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-800">AGLH Recruit</h1>
              <p className="text-xs font-medium text-slate-500">Gestión Inteligente de Selección</p>
            </div>
          </div>

          {/* Navegación Principal */}
          <nav className="flex items-center gap-2 rounded-lg bg-slate-100 p-1">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold transition-all ${
                activeTab === 'dashboard' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BarChart3 className="h-4 w-4" />
              Dashboard
            </button>
            <button
              onClick={() => setActiveTab('candidates')}
              className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold transition-all ${
                activeTab === 'candidates' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Users className="h-4 w-4" />
              Candidatos
            </button>
            <button
              onClick={() => setActiveTab('audit')}
              className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold transition-all ${
                activeTab === 'audit' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ShieldAlert className="h-4 w-4" />
              Auditoría
            </button>
          </nav>

          <button className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-blue-700">
            <Plus className="h-4 w-4" />
            Nuevo Proceso
          </button>
        </div>
      </header>

      {/* Contenido Principal */}
      <main className="mx-auto max-w-7xl p-6">
        {/* Barra de Filtros por Ejecutivo y Cliente */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <Filter className="h-4 w-4 text-blue-600" />
              Filtros:
            </div>

            {/* Selector de Ejecutivos */}
            <select
              value={selectedExecutive}
              onChange={(e) => setSelectedExecutive(e.target.value)}
              className="rounded-lg border border-slate-300 bg-slate-50 px-3 py-1.5 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="todos">Todos los Ejecutivos</option>
              {executives.map((exec) => (
                <option key={exec} value={exec}>{exec}</option>
              ))}
            </select>

            {/* Selector de Clientes */}
            <select
              value={selectedClient}
              onChange={(e) => setSelectedClient(e.target.value)}
              className="rounded-lg border border-slate-300 bg-slate-50 px-3 py-1.5 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="todos">Todos los Clientes</option>
              {clients.map((cli) => (
                <option key={cli} value={cli}>{cli}</option>
              ))}
            </select>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar candidato o puesto..."
              className="w-64 rounded-lg border border-slate-300 pl-9 pr-4 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Vista: Dashboard */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* Tarjetas de Métricas */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-500">Procesos Activos</span>
                  <Briefcase className="h-5 w-5 text-blue-600" />
                </div>
                <p className="mt-2 text-3xl font-bold text-slate-900">18</p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-500">Candidatos Evaluados</span>
                  <Users className="h-5 w-5 text-indigo-600" />
                </div>
                <p className="mt-2 text-3xl font-bold text-slate-900">142</p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-500">Presentados a Cliente</span>
                  <UserCheck className="h-5 w-5 text-emerald-600" />
                </div>
                <p className="mt-2 text-3xl font-bold text-slate-900">35</p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-500">Match Promedio IA</span>
                  <Sparkles className="h-5 w-5 text-amber-500" />
                </div>
                <p className="mt-2 text-3xl font-bold text-slate-900">89%</p>
              </div>
            </div>

            {/* Carga de CV con Clasificación por IA */}
            <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center shadow-sm">
              <Upload className="mx-auto h-12 w-12 text-blue-500" />
              <h3 className="mt-3 text-lg font-bold text-slate-800">Carga Masiva de CVs para Clasificación IA</h3>
              <p className="mt-1 text-sm text-slate-500">Arrastra aquí los currículums en PDF o Word para analizarlos y asignarlos automáticamente.</p>
              <button className="mt-4 rounded-lg bg-slate-900 px-5 py-2 text-sm font-medium text-white hover:bg-slate-800">
                Seleccionar Archivos
              </button>
            </div>
          </div>
        )}

        {/* Vista: Lista de Candidatos */}
        {activeTab === 'candidates' && (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="border-b bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-6 py-3 font-semibold">Candidato</th>
                  <th className="px-6 py-3 font-semibold">Puesto</th>
                  <th className="px-6 py-3 font-semibold">Cliente</th>
                  <th className="px-6 py-3 font-semibold">Ejecutivo Asignado</th>
                  <th className="px-6 py-3 font-semibold">Match IA</th>
                  <th className="px-6 py-3 font-semibold">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {candidates.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 font-bold text-slate-900">{c.name}</td>
                    <td className="px-6 py-4">{c.role}</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                        <Building2 className="h-3 w-3" />
                        {c.client}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-700">{c.executive}</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1 font-bold text-emerald-600">
                        <Sparkles className="h-3.5 w-3.5" />
                        {c.match}%
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                        {c.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Vista: Auditoría */}
        {activeTab === 'audit' && (
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-bold text-slate-800">Registro de Cambios e Interacciones</h3>
            <p className="text-sm text-slate-500 mb-4">Mapeo automático de movimientos realizados por el equipo sin requerir confirmación manual.</p>
            <div className="space-y-3">
              <div className="rounded-lg border border-slate-100 bg-slate-50 p-3 text-xs text-slate-600">
                <span className="font-bold text-slate-800">Anahit Armandugon</span> actualizó la etapa de <span className="font-medium text-slate-800">María González</span> a "En Evaluación" • Hace 10 minutos
              </div>
              <div className="rounded-lg border border-slate-100 bg-slate-50 p-3 text-xs text-slate-600">
                <span className="font-bold text-slate-800">Belén</span> asignó 3 nuevos candidatos a <span className="font-medium text-slate-800">Globant</span> • Hace 1 hora
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
