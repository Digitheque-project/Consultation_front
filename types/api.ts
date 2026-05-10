export interface ApiSuccess<T> {
  data: T;
  message?: string;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface PatientSearchFilters {
  gender?: "M" | "F";
  minAge?: number;
  maxAge?: number;
  city?: string;
}

export interface LinkGlobalIdentityPayload {
  patientId: string;
  mpiId: string;
}

// Clinical Module Types
export interface ClinicalStats {
  hospitalized: number;
  externalConsultations: number;
  controls: number;
}

export interface OperatingRoomPlanning {
  id: string;
  patientName: string;
  time: string;
  surgeon: string;
  procedure: string;
  status: "completed" | "ongoing" | "pending";
  room: string;
}

export interface PrioritizePatient {
  id: string;
  name: string;
  age: number;
  priority: "high" | "medium" | "low";
  sccreScore: number;
  evaScore: number;
  diagnosis: string;
}

export interface GuardTeamMember {
  id: string;
  name: string;
  role: string;
  specialty: string;
  avatar?: string;
  status: "present" | "absent" | "on-call";
}

export interface QuickAccessAction {
  id: string;
  label: string;
  description?: string;
  icon: string;
  color?: string;
}

export interface ProtocolCard {
  id: string;
  title: string;
  description: string;
  link: string;
}

export interface DashboardStats {
  hospitalizedTotal: number;
  hospitalizedNewToday: number;
  externalConsultationsTotal: number;
  externalConsultationsUrgent: number;
  controlServiceTotal: number;
  controlExternalTotal: number;
}

export interface HospitalizedPatient {
  id: string;
  patientId: string;
  dateEntrer: string;
  motifHospitalisation: string;
  serviceId: string;
  statutHospitalisation: "EN_COURS" | "CLOTUREE";
  litCode?: string | null;
  chambreNumero?: number | null;
}

export interface ExternalConsultation {
  id: string;
  patientId: string;
  typeChirurgie: string;
  chirurgien: string;
  asaScore: number;
  urgence: boolean;
  createdAt: string;
}
