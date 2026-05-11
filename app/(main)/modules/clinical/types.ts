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
