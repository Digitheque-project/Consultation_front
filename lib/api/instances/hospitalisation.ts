import { clientApi } from "@/lib/api/server";

export enum StatutDemande {
  EN_ATTENTE = 'EN_ATTENTE',
  CONSULTEE = 'CONSULTEE',
  ACCEPTE = 'ACCEPTE',
  REFUSE = 'REFUSE',
}

export interface Hospitalisation {
  id: string;
  patientId: string;
  serviceId: string;
  dateEntrer: string;
  motifHospitalisation: string;
  type: string;
  statusDemande: StatutDemande;
  litCode?: string | null;
  chambreNumero?: number | null;
  commentaire?: string | null;
}

export interface HospitalisationNotification extends Hospitalisation {
  patient?: Record<string, unknown> | null;
  receivedAt?: number;
}

type BedStatusApi = "DISPONIBLE" | "OCCUPE" | string;

export interface PlanLitHospitalisation {
  id: string;
  patientId: string;
  dateEntrer: string;
  motifHospitalisation: string;
  statutHospitalisation: string;
  diagnostic?: string | null;
  soinsCount: number;
}

export interface PlanLitBed {
  litId: string;
  codeLit: string;
  statut: BedStatusApi;
  hospitalisation?: PlanLitHospitalisation | null;
}

export interface PlanLitRoom {
  chambreId: string;
  numeroChambre: number;
  type: string;
  lits: PlanLitBed[];
}

export interface PlanLitsResponse {
  serviceId: string;
  chambres: PlanLitRoom[];
  stats: {
    totalLits: number;
    litsOccupes: number;
    totalPatients: number;
  };
}

export const hospitalisationApi = {
  getActives: async (limit?: number) => {
    return clientApi.get<Hospitalisation[]>("/hospitalisations/actives", {
      params: { limit },
    });
  },

  updateStatus: async (id: string, status: StatutDemande) => {
    return clientApi.patch<Hospitalisation>(`/hospitalisations/${id}/status`, {
      status,
    });
  },

  getNotifications: async (limit?: number) => {
    return clientApi.get<HospitalisationNotification[]>("/api/hospitalisations/notifications", {
      baseURL: "",
      params: { limit },
    });
  },

  assignBed: async (idHospitalisation: string, idLit: string) => {
    return clientApi.post("/hospitalisations/affectations-lits", {
      idHospitalisation,
      idLit,
    });
  },
  
  getAvailableBeds: async (serviceId: string) => {
    return clientApi.get(`/hospitalisations/services/${serviceId}/lits/disponibles`);
  },

  getBedPlan: async (serviceId: string) => {
    return clientApi.get<PlanLitsResponse>(`/hospitalisations/plan-lits/${serviceId}`);
  },
};
