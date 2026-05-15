export type ConsultationApi = {
  id: number;
  date: string;
  heure: string;
  patientId: number;
  medecinId: number;
  statut: string;
  urgence: boolean;
  termine: boolean;
  observation?: {
    diagnostic: string;
    notes: string;
  } | null;
  medicamentPrescriptions?: Array<any>;
  nonMedicamentPrescriptions?: Array<any>;
};

const getBackendUrl = () => process.env.NEXT_PUBLIC_CONSULTATION_EXTERNE_URL || 'http://localhost:3333';

export const consultationApi = {
  getWaitingConsultations: async (): Promise<ConsultationApi[]> => {
    const response = await fetch(`${getBackendUrl()}/consultations/waiting-prescription`);
    if (!response.ok) throw new Error(`API error: ${response.status}`);
    return response.json();
  },

  getAllConsultations: async (): Promise<ConsultationApi[]> => {
    const response = await fetch(`${getBackendUrl()}/consultations`);
    if (!response.ok) throw new Error(`API error: ${response.status}`);
    return response.json();
  },

  getConsultationById: async (id: string | number): Promise<ConsultationApi> => {
    const response = await fetch(`${getBackendUrl()}/consultations/${id}`);
    if (!response.ok) throw new Error(`API error: ${response.status}`);
    return response.json();
  },

  finalizeConsultation: async (id: string | number, payload: any): Promise<any> => {
    const response = await fetch(`${getBackendUrl()}/consultations/${id}/finalize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(errorData?.message || 'Erreur lors de la sauvegarde');
    }
    return response.json();
  }
};
