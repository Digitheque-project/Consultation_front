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
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export async function fetchPatients(): Promise<Patient[]> {
  const response = await axios.get<Patient[]>(`${API_URL}/patients`);
  return response.data;
}
