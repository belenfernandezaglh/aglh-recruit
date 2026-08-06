// data/mockData.ts
import { GrupoOperativa, Cargo } from '@/types';

export const MANUAL_CARGOS_BASE: Cargo[] = [
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

export const OPERATIVAS_BASE: GrupoOperativa[] = [
  {
    ejecutivo: 'Mesa de Operaciones — Outsourcing / Reclutamiento',
    cuentas: [
      { id: 'procil', cliente: 'PROCIL', cargoAsociado: '04', vacantes: 2, contactos: [] },
      { id: 'montecable', cliente: 'MONTECABLE', cargoAsociado: '06', vacantes: 3, contactos: [] },
      { id: 'rafap', cliente: 'R. AFAP (Maldonado)', cargoAsociado: '06', vacantes: 1, contactos: [] },
      { id: 'promotora', cliente: 'Promotora — Mvdeo.', cargoAsociado: '06', vacantes: 4, contactos: [] },
      { id: 'velcro', cliente: 'VELCRO', cargoAsociado: '04', vacantes: 1, contactos: [] },
      { id: 'ucm_rec', cliente: 'UCM — Recepcionistas', cargoAsociado: '10', vacantes: 2, contactos: [] },
      { id: 'darkstore', cliente: 'DARKSTORE', cargoAsociado: '01', vacantes: 5, contactos: [] },
      { id: 'caderlux', cliente: 'CADERLUX', cargoAsociado: '03', vacantes: 2, contactos: [] },
      { id: 'tecnobalizas', cliente: 'TECNOBALIZAS', cargoAsociado: '01', vacantes: 1, contactos: [] },
      { id: 'pangiorno', cliente: 'PANGIORNO', cargoAsociado: '06', vacantes: 2, contactos: [] },
      { id: 'santarosa', cliente: 'SANTA ROSA', cargoAsociado: '03', vacantes: 1, contactos: [] },
      { id: 'frimaral', cliente: 'FRIMARAL', cargoAsociado: '07', vacantes: 3, contactos: [] },
      { id: 'tienda_inglesa', cliente: 'TIENDA INGLESA (Saravia / Solymar)', cargoAsociado: '03', vacantes: 6, contactos: [] },
      { id: 'riogas', cliente: 'RIOGAS / ACODIKE', cargoAsociado: '02', vacantes: 8, contactos: [] },
      { id: 'tiendas_varias', cliente: 'TIENDA Montevideo / CdLC / Atlántida', cargoAsociado: '06', vacantes: 4, contactos: [] },
      { id: 'ehub', cliente: 'EHUB — Roti/Pana', cargoAsociado: '06', vacantes: 2, contactos: [] },
      { id: 'bromyros', cliente: 'BROMYROS', cargoAsociado: '03', vacantes: 1, contactos: [] },
      { id: 'pepsico', cliente: 'PEPSICO', cargoAsociado: '01', vacantes: 10, contactos: [] },
      { id: 'sodimac', cliente: 'SODIMAC (S - 40/44 / S - 30)', cargoAsociado: '03', vacantes: 5, contactos: [] },
      { id: 'logisfashion', cliente: 'LOGISFASHION', cargoAsociado: '08', vacantes: 3, contactos: [] },
      { id: 'neorol', cliente: 'NEOROL', cargoAsociado: '07', vacantes: 2, contactos: [] },
      { id: 'corfrisa', cliente: 'CORFRISA', cargoAsociado: '03', vacantes: 2, contactos: [] },
      { id: 'disershop', cliente: 'DISERSHOP', cargoAsociado: '03', vacantes: 1, contactos: [] },
      { id: 'kevenoll', cliente: 'KEVENOLL', cargoAsociado: '03', vacantes: 1, contactos: [] },
      { id: 'divino', cliente: 'DIVINO Tacuarembó', cargoAsociado: '03', vacantes: 2, contactos: [] }
    ]
  }
];
