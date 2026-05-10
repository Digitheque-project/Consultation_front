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
