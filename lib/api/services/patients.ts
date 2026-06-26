import axios from 'axios';

export type Patient = {
  id: string;
  nom: string;
  prenom?: string;
  sexe?: string;
  dateNaissance?: string;
  cin?: string;
  profession?: string;
  adresse?: string;
  telephone?: string;
  contactUrgence?: string;
  priseEnChargeId?: number;
  /** Code métier (ex. NORMAL) — renvoyé par l’API si disponible */
  priseEnChargeCode?: string;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export async function fetchPatients(): Promise<Patient[]> {
  try {
    const response = await axios.get<Patient[]>(`${API_URL}/patients`, {
      timeout: 8000,
    });
    return response.data;
  } catch (error) {
    console.error('Erreur lors de la récupération des patients:', error);
    return [];
  }
}

export async function fetchPatientById(id: string): Promise<Patient | null> {
  try {
    const response = await axios.get<Patient>(`${API_URL}/patients/${encodeURIComponent(id)}`, {
      timeout: 8000,
    });
    return response.data;
  } catch (error) {
    console.error(`Erreur lors de la récupération du patient ${id}:`, error);
    return null;
  }
}
