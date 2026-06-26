import { getConsultationExterneApiUrl } from './consultation-config';

export type ConsultationHistoryEntry = {
  id: number;
  date: string;
  heure: string;
  statut: string;
  typeVisite?: string;
  ordreControle?: number | null;
  diagnostic: string;
  observations: string;
  medicaments: string[];
  nonMedicamentPrescriptions: Array<{
    rdvMotif?: string | null;
    rdvDate?: string | null;
    examenService?: string | null;
    hospitalisationService?: string | null;
  }>;
};

export type ClinicalParameter = {
  id?: number;
  nom: string;
  valeur: string;
  unite?: string | null;
};

export type ConsultationListFilters = {
  arrived?: boolean;
  date?: string;
  dateFrom?: string;
  dateTo?: string;
};

export type ConsultationApi = {
  id: number;
  date: string;
  heure: string;
  patientId: string;
  motif?: string;
  patient?: {
    id: string;
    prenom: string;
    nom: string;
    displayName: string;
    dossier: string;
    sexe?: string | null;
    dateNaissance?: string | null;
    cin?: string | null;
    telephone?: string | null;
    adresse?: string | null;
    profession?: string | null;
    contactUrgence?: string | null;
    priseEnChargeId?: string | null;
  };
  medecinId: number;
  statut: string;
  urgence: boolean;
  termine: boolean;
  arriveeAccueil?: boolean;
  arriveeAccueilAt?: string | null;
  typeVisite?: string;
  ordreControle?: number | null;
  consultationParenteId?: number | null;
  observation?: {
    diagnostic?: string;
    diagnosticSuspicion?: string | null;
    diagnosticRetenu?: string | null;
    notes?: string;
    noteControle?: string;
  } | null;
  parametresCliniques?: ClinicalParameter[];
  medicamentPrescriptions?: Array<any>;
  nonMedicamentPrescriptions?: Array<any>;
};

export const getVisiteLabel = (
  consultation: Pick<ConsultationApi, 'typeVisite' | 'ordreControle' | 'consultationParenteId'>
) => {
  const normalizedType = consultation.typeVisite?.toUpperCase();
  const hasControlFields =
    normalizedType === 'CONTROLE' ||
    consultation.ordreControle !== null && consultation.ordreControle !== undefined ||
    consultation.consultationParenteId !== null && consultation.consultationParenteId !== undefined;

  if (hasControlFields) {
    const order = consultation.ordreControle ?? 1;
    if (order === 1) {
      return '1er contrôle';
    }
    if (order > 1) {
      return `${order}e contrôle`;
    }
    return 'Contrôle';
  }

  return 'Consultation initiale';
};

const getCookieValue = (name: string): string | null => {
  if (typeof document === 'undefined') {
    return null;
  }

  const match = document.cookie.match(new RegExp(`(?:^|; )${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}=([^;]*)`));
  return match?.[1] ? decodeURIComponent(match[1]) : null;
};

const getAuthHeaderValue = (): string | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  const token =
    localStorage.getItem('access_token') ||
    localStorage.getItem('auth_token') ||
    getCookieValue('chu_auth_token') ||
    getCookieValue('auth_token') ||
    getCookieValue('access_token');

  return token ? `Bearer ${token}` : null;
};

const fetchWithAuth = async (input: string, init: RequestInit = {}) => {
  const headers = new Headers(init.headers || undefined);
  const authHeader = getAuthHeaderValue();

  if (authHeader) {
    headers.set('Authorization', authHeader);
  }

  const response = await fetch(input, {
    ...init,
    headers,
  });

  return response;
};

const consultationEndpoint = (path: string) => getConsultationExterneApiUrl(path);

export const consultationApi = {
  getWaitingConsultations: async (): Promise<ConsultationApi[]> => {
    const response = await fetchWithAuth(consultationEndpoint('/consultations/waiting-prescription'));
    if (!response.ok) throw new Error(`API error: ${response.status}`);
    return response.json();
  },

  getAllConsultations: async (filters?: ConsultationListFilters): Promise<ConsultationApi[]> => {
    const params = new URLSearchParams();
    if (filters?.arrived !== undefined) {
      params.set('arrived', String(filters.arrived));
    }
    if (filters?.date) {
      params.set('date', filters.date);
    }
    if (filters?.dateFrom) {
      params.set('dateFrom', filters.dateFrom);
    }
    if (filters?.dateTo) {
      params.set('dateTo', filters.dateTo);
    }

    const queryString = params.toString();
    const response = await fetchWithAuth(consultationEndpoint(`/consultations${queryString ? `?${queryString}` : ''}`));
    if (!response.ok) throw new Error(`API error: ${response.status}`);
    return response.json();
  },

  getConsultationById: async (id: string | number): Promise<ConsultationApi> => {
    const response = await fetchWithAuth(consultationEndpoint(`/consultations/${id}`));
    if (!response.ok) throw new Error(`API error: ${response.status}`);
    return response.json();
  },

  getPatientConsultationHistory: async (patientId: string | number): Promise<ConsultationHistoryEntry[]> => {
    const response = await fetchWithAuth(consultationEndpoint(`/consultations/patient/${patientId}/history`));
    if (!response.ok) throw new Error(`API error: ${response.status}`);
    return response.json();
  },

  getControlConsultations: async (): Promise<ConsultationApi[]> => {
    const response = await fetchWithAuth(consultationEndpoint('/consultations/controls'));
    if (!response.ok) throw new Error(`API error: ${response.status}`);
    return response.json();
  },

  saveControlNote: async (id: string | number, note: string): Promise<any> => {
    const response = await fetchWithAuth(consultationEndpoint(`/consultations/${id}/control-note`), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ noteControle: note }),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(errorData?.message || 'Erreur lors de l’enregistrement de la note');
    }
    return response.json();
  },

  saveControlPrescriptions: async (id: string | number, payload: any): Promise<any> => {
    const response = await fetchWithAuth(consultationEndpoint(`/consultations/${id}/prescriptions`), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(errorData?.message || 'Erreur lors de l’enregistrement des prescriptions');
    }
    return response.json();
  },

  markConsultationArrival: async (id: string | number, payload: { arriveeAccueil?: boolean; arriveeAccueilAt?: string | Date | null }): Promise<any> => {
    const response = await fetchWithAuth(consultationEndpoint(`/consultations/${id}/arrival`), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(errorData?.message || 'Erreur lors de la confirmation d’arrivée');
    }
    return response.json();
  },

  finalizeConsultation: async (id: string | number, payload: any): Promise<any> => {
    const response = await fetchWithAuth(consultationEndpoint(`/consultations/${id}/finalize`), {
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
  },

  traiterConsultation: async (id: string | number, action: 'ouvrir' | 'annuler' | 'terminer' | 'controle' | 'examen' | 'hospitalisation', extra?: Record<string, any>): Promise<any> => {
    const response = await fetchWithAuth(consultationEndpoint(`/consultations/${id}/traiter`), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ action, ...extra }),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(errorData?.message || 'Erreur lors du traitement de la consultation');
    }
    return response.json();
  }
};
