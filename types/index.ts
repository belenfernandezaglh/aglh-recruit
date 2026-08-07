export type CandidateStatus = 'NUEVO' | 'CONTACTADO' | 'DESARTICULADO' | 'INACTIVO';
export type ContactResult = 'PENDIENTE' | 'INGRESO' | 'NO_INGRESO' | 'NO_ASISTE';

export interface WorkExperience {
  company: string;
  position: string;
  functions: string;
}

export interface Client {
  id: string;
  created_at: string;
  name: string;
  executive_email: string;
  target_profile: string;
  match_threshold: number;
}

export interface CandidateClientMatch {
  id: string;
  candidate_id: string;
  client_id: string;
  match_score: number;
  created_at: string;
  client?: Client;
}

export interface Candidate {
  id: string;
  created_at: string;
  updated_at: string;
  
  // Datos Personales
  full_name: string;
  document_id: string; // Único (CI)
  phone: string;
  email: string;
  address: string;
  locality: string;
  department: string;
  age?: number;
  
  // Formación y Requisitos
  education_level: string;
  courses: string[];
  work_experience: WorkExperience[];
  availability: string;
  driver_license: string;
  libreta_h: boolean;
  health_card: boolean;
  food_handler_card: boolean;
  
  // IA y Relaciones
  ai_summary: string;
  status: CandidateStatus;
  
  // Matches con clientes (relación)
  matches?: CandidateClientMatch[];
}

export interface ContactRecord {
  id: string;
  created_at: string;
  candidate_id: string;
  client_id: string;
  recruiter_email: string;
  executive_email: string;
  result: ContactResult;
  notes?: string;
  candidate?: Candidate;
  client?: Client;
}

export interface AuditLog {
  id: string;
  created_at: string;
  user_email: string;
  action: string;
  candidate_id?: string;
  details?: Record<string, any>;
}
