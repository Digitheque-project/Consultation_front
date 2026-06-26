import { getConsultationExterneApiUrl } from './consultation-config';

export type MedecinOption = {
  id: number;
  nom: string;
  prenom: string;
  email: string;
  specialite?: string | null;
  role?: string | null;
};

export type DoctorPlanning = {
  id: number;
  medecinId: number;
  date: string;
  heureDebut: string;
  heureFin: string;
  quota?: number;
  disponible: boolean;
  notes?: string | null;
  medecin?: {
    id: number;
    nom: string;
    prenom: string;
    email: string;
  };
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

  getByMedecin: async (medecinId: number, startDate?: string, endDate?: string): Promise<DoctorPlanning[]> => {
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

  deletePlanning: async (id: number): Promise<void> => {
    const response = await fetchWithAuth(planningEndpoint(`/planning/${id}`), {
      method: 'DELETE',
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(errorData?.message || 'Erreur lors de la suppression du créneau');
    }
  },
};
