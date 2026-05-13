import axios, { isAxiosError } from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

/** Corps attendu par POST/PATCH `/patients/register` (Swagger). */
export type RegisterPatientPayload = {
  nom: string;
  prenom: string;
  sexe: 'MALE' | 'FEMALE';
  dateNaissance: string;
  cin: string;
  profession: string;
  adresse: string;
  telephone: string;
  contactUrgence: string;
  priseEnChargeCode: string;
  createdBy: string;
};

export type RegisterPatientResponse = {
  id?: string;
  patientId?: string;
};

function pickPatientId(data: unknown): string | undefined {
  if (!data || typeof data !== 'object') return undefined;
  const o = data as Record<string, unknown>;
  if (typeof o.id === 'string' && o.id.length > 0) return o.id;
  if (typeof o.patientId === 'string' && o.patientId.length > 0) return o.patientId;
  const nested = o.data;
  if (nested && typeof nested === 'object') {
    const d = nested as Record<string, unknown>;
    if (typeof d.id === 'string' && d.id.length > 0) return d.id;
    if (typeof d.patientId === 'string' && d.patientId.length > 0) return d.patientId;
  }
  return undefined;
}

export async function registerPatient(payload: RegisterPatientPayload): Promise<string> {
  const response = await axios.post<RegisterPatientResponse>(`${API_URL}/patients/register`, payload);
  const id = pickPatientId(response.data);
  if (!id) {
    throw new Error("Réponse API : identifiant patient manquant.");
  }
  return id;
}

export async function updateRegisteredPatient(
  patientId: string,
  payload: RegisterPatientPayload
): Promise<void> {
  await axios.patch(`${API_URL}/patients/${encodeURIComponent(patientId)}`, payload);
}

export function getRegisterApiErrorMessage(error: unknown): string {
  if (isAxiosError(error)) {
    const data = error.response?.data as unknown;
    if (data && typeof data === 'object') {
      const msg = (data as Record<string, unknown>).message;
      if (typeof msg === 'string' && msg.length > 0) return msg;
      const err = (data as Record<string, unknown>).error;
      if (typeof err === 'string' && err.length > 0) return err;
      return JSON.stringify(data);
    }
    if (error.response?.status) {
      return `Erreur serveur (${error.response.status}).`;
    }
  }
  if (error instanceof Error && error.message) return error.message;
  return "Impossible d'enregistrer le patient.";
}
