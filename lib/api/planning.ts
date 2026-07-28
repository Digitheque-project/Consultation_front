import { getConsultationExterneApiUrl } from './consultation-config';

export type MedecinOption = {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  specialite?: string | null;
  role?: string | null;
};

export type PlanningServiceOption = {
  id: string;
  name: string;
};

export type ServiceDoctorOption = {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  specialite?: string | null;
};

export type DoctorPlanning = {
  id: number;
  medecinId: string;
  date: string;
  heureDebut: string;
  heureFin: string;
  quota?: number;
  disponible: boolean;
  notes?: string | null;
  seriesId?: string | null;
  medecin?: {
    id: string;
    nom: string;
    prenom: string;
    email: string;
  };
};

export type CreateRecurringPlanningPayload = {
  medecinId: string;
  startDate: string;
  endDate: string;
  daysOfWeek: number[];
  heureDebut: string;
  heureFin: string;
  quota: number;
  disponible: boolean;
  notes?: string;
  skipDates?: string[];
};

export type CreateUnavailabilityPayload = {
  medecinId: string;
  startDate: string;
  endDate: string;
  notes?: string;
  conflictStrategy?: 'keep' | 'replace';
};

export type UpdatePlanningSeriesPayload = {
  fromDate: string;
  heureDebut?: string;
  heureFin?: string;
  quota?: number;
  disponible?: boolean;
  notes?: string;
};

const getAuthHeaderValue = (): string | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  const token = localStorage.getItem('access_token') || localStorage.getItem('auth_token');
  return token ? `Bearer ${token}` : null;
};

const fetchWithAuth = async (input: string, init: RequestInit = {}) => {
  const headers = new Headers(init.headers || undefined);
  const authHeader = getAuthHeaderValue();

  if (authHeader) {
    headers.set('Authorization', authHeader);
  }

  return fetch(input, {
    ...init,
    headers,
  });
};

const planningEndpoint = (path: string) => getConsultationExterneApiUrl(path);

export const planningApi = {
  getMyPlanning: async (): Promise<DoctorPlanning[]> => {
    const response = await fetchWithAuth(planningEndpoint('/planning'));
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    return response.json();
  },

  getMedecins: async (): Promise<MedecinOption[]> => {
    const response = await fetchWithAuth(planningEndpoint('/medecins'));
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    return response.json();
  },

  // Ne jamais afficher un medecinId brut à l'écran — toujours résoudre le nom via cet appel.
  getMedecinById: async (id: string): Promise<MedecinOption | null> => {
    const response = await fetchWithAuth(planningEndpoint(`/medecins/${id}`));
    if (!response.ok) return null;
    return response.json();
  },

  createPlanning: async (payload: Omit<DoctorPlanning, 'id' | 'medecin'>): Promise<DoctorPlanning> => {
    const response = await fetchWithAuth(planningEndpoint('/planning'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(errorData?.message || 'Erreur lors de la création du créneau');
    }
    return response.json();
  },

  updatePlanning: async (id: number, payload: Partial<DoctorPlanning>): Promise<DoctorPlanning> => {
    const response = await fetchWithAuth(planningEndpoint(`/planning/${id}`), {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(errorData?.message || 'Erreur lors de la mise à jour du créneau');
    }
    return response.json();
  },

  getByMedecin: async (medecinId: string, startDate?: string, endDate?: string): Promise<DoctorPlanning[]> => {
    const params = new URLSearchParams();
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);

    const path = `/planning/medecin/${medecinId}${params.toString() ? `?${params.toString()}` : ''}`;
    const response = await fetchWithAuth(planningEndpoint(path));
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    return response.json();
  },

  // Départements médicaux (registre service-service, type=CLINIQUE) pour la Vue par service — admin uniquement.
  getServices: async (): Promise<PlanningServiceOption[]> => {
    const response = await fetchWithAuth(planningEndpoint('/planning/services'));
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    return response.json();
  },

  getServiceDoctors: async (serviceId: string): Promise<ServiceDoctorOption[]> => {
    const response = await fetchWithAuth(planningEndpoint(`/planning/services/${serviceId}/doctors`));
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    return response.json();
  },

  deletePlanning: async (id: number): Promise<void> => {
    const response = await fetchWithAuth(planningEndpoint(`/planning/${id}`), {
      method: 'DELETE',
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(errorData?.message || 'Erreur lors de la suppression du créneau');
    }
  },

  createRecurringPlanning: async (payload: CreateRecurringPlanningPayload): Promise<{ seriesId: string; slots: DoctorPlanning[] }> => {
    const response = await fetchWithAuth(planningEndpoint('/planning/recurring'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(errorData?.message || 'Erreur lors de la création du créneau récurrent');
    }
    return response.json();
  },

  createUnavailability: async (payload: CreateUnavailabilityPayload): Promise<{ seriesId: string; slots: DoctorPlanning[]; deletedCount: number }> => {
    const response = await fetchWithAuth(planningEndpoint('/planning/unavailability'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(errorData?.message || "Erreur lors de l'enregistrement de l'indisponibilité");
    }
    return response.json();
  },

  getConflicts: async (medecinId: string, startDate: string, endDate: string): Promise<DoctorPlanning[]> => {
    const params = new URLSearchParams({ medecinId, startDate, endDate });
    const response = await fetchWithAuth(planningEndpoint(`/planning/conflicts?${params.toString()}`));
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    return response.json();
  },

  updatePlanningSeries: async (seriesId: string, payload: UpdatePlanningSeriesPayload): Promise<{ count: number; slots: DoctorPlanning[] }> => {
    const response = await fetchWithAuth(planningEndpoint(`/planning/series/${seriesId}`), {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(errorData?.message || 'Erreur lors de la mise à jour de la série');
    }
    return response.json();
  },
};
