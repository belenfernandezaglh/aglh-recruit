// data/mockData.ts
import { GrupoOperativa, ManualCargo } from '../types';

export const MANUAL_CARGOS_BASE: ManualCargo[] = [
  { id: '01', title: 'Operario General', funcion: 'Tareas generales de producción y soporte.' },
  { id: '03', title: 'Operario de Depósito / Logística', funcion: 'Carga, descarga, picking y acondicionamiento.' },
  { id: '04', title: 'Auxiliar de Limpieza', funcion: 'Higienización de plantas operativas y oficinas.' },
  { id: '06', title: 'Atención al Cliente / Ventas', funcion: 'Gestión comercial y atención de mostrador.' },
  { id: '07', title: 'Oficial Técnico / Mantenimiento', funcion: 'Mantenimiento preventivo y correctivo.' },
];

export const OPERATIVAS_BASE: GrupoOperativa[] = [
  {
    categoria: 'Cuentas Industriales y Logística',
    cuentas: [
      { id: 'c1', cliente: 'Logística Sur', cargoAsociado: '03', contactos: [] },
      { id: 'c2', cliente: 'Planta Industrial Este', cargoAsociado: '01', contactos: [] }
    ]
  },
  {
    categoria: 'Servicios Generales y Mantención',
    cuentas: [
      { id: 'c3', cliente: 'Servicios Limpieza Centro', cargoAsociado: '04', contactos: [] },
      { id: 'c4', cliente: 'Distribuidora Canelones', cargoAsociado: '06', contactos: [] }
    ]
  }
];
