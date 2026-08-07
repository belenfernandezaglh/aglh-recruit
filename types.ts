export type CandidateStatus = 'NUEVO' | 'CONTACTADO';
export type ContactResult = 'INGRESO' | 'NO_INGRESO' | 'NO_ASISTE' | 'PENDIENTE';

export interface WorkExperience {
  company: string;
  position: string;
  functions: string;
}

export interface Candidate {
  id: string;
  created_at?: string;
  updated_at?: string;
  full_name: string;
  document_id: string;
  phone: string;
  email: string;
  address?: string;
  locality?: string;
  department?: string;
  age?: number;
  education_level?: string;
  courses?: string[];
  work_experience?: WorkExperience[];
  availability?: string;
  driver_license?: string;
  libreta_h?: boolean;
  health_card?: boolean;
  food_handler_card?: boolean;
  ai_summary?: string;
  status?: CandidateStatus;
  matches?: CandidateMatch[];
}

export interface Client {
  id: string;
  created_at?: string;
  name: string;
  executive_email?: string;
  target_profile?: string;
  match_threshold?: number;
}

export interface CandidateMatch {
  id: string;
  candidate_id: string;
  client_id: string;
  match_score: number;
  client?: Client;
}

export interface ContactRecord {
  id: string;
  created_at: string;
  candidate_id: string;
  client_id: string;
  recruiter_email?: string;
  executive_email?: string;
  result: ContactResult;
  notes?: string;
  candidate?: Candidate;
  client?: Client;
}
