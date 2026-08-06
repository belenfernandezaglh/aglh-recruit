// types/index.ts

export type CandidateStatus = 'NUEVO' | 'EVALUACION' | 'ENTREVISTA' | 'SELECCIONADO';

export interface Cargo {
  id: string;
  title: string;
  funcion: string;
  requisitos?: string;
  ubicacion?: string;
}

export interface ClienteCuenta {
  id: string;
  cliente: string;
  cargoAsociado: string;
  vacantes: number;
  contactos: string[];
}

export interface GrupoOperativa {
  ejecutivo: string;
  cuentas: ClienteCuenta[];
}

export interface Candidate {
  id: string;
  name: string;
  phone: string;
  email?: string;
  position: string;
  status: CandidateStatus;
  fileName: string;
  date: string;
  matchedOperativas: string[];
}
