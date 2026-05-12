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

  assignBed: async (idHospitalisation: string, idLit: string) => {
    return clientApi.post("/hospitalisations/affectations-lits", {
      idHospitalisation,
      idLit,
    });
  },
  
  getAvailableBeds: async (serviceId: string) => {
    return clientApi.get(`/hospitalisations/services/${serviceId}/lits/disponibles`);
  }
};
