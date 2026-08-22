/**
 * lib/api/services/prescription.ts — CHU-Front
 * Backend : relayé par notre propre API (src/prescription/ côté
 * Consultation_back), pas d'appel direct au service prescription — voir
 * lib/prescription-api.ts pour le détail (indisponible via la passerelle du
 * CHU, CORS non confirmé). Jamais figé en dur — cette URL a déjà changé une
 * fois, une valeur codée en dur pointait silencieusement vers un service mort.
 */
import { getConsultationExterneApiUrl } from '@/lib/api/consultation-config';

const API_URL = getConsultationExterneApiUrl('/prescription');

const JSON_HEADERS = { 'Content-Type': 'application/json' };

async function handleResponse(res: Response) {
  if (!res.ok) {
    let message = 'Erreur lors de la requête.';
    try { const e = await res.json(); message = e.message || message; } catch {}
    throw new Error(Array.isArray(message) ? message.join(', ') : message);
  }
  return res.json();
}

async function postP(path: string, data: unknown) {
  return handleResponse(await fetch(`${API_URL}/prescriptions/${path}`, {
    method: 'POST', headers: JSON_HEADERS, body: JSON.stringify(data),
  }));
}

export async function getPrescriptionsPatient(type: string, patientId: string) {
  return handleResponse(await fetch(
    `${API_URL}/prescriptions/${type}/patient/${patientId}`
  ));
}

export async function updateStatutPrescription(type: string, id: string, statut: string) {
  return handleResponse(await fetch(
    `${API_URL}/prescriptions/${type}/${id}/statut`,
    { method: 'PUT', headers: JSON_HEADERS, body: JSON.stringify({ statut }) }
  ));
}

export const creerPrescriptionMedicale    = (d: unknown) => postP('medicale', d);
export const creerPrescriptionNonMedicale = (d: unknown) => postP('non-medicale', d);
export const creerPrescriptionSurveillance= (d: unknown) => postP('surveillance', d);
export const creerPrescriptionTransfusion = (d: unknown) => postP('transfusion', d);
export const creerPrescriptionBloc        = (d: unknown) => postP('bloc', d);
export const creerPrescriptionLabo        = (d: unknown) => postP('labo', d);
export const creerPrescriptionImagerie    = (d: unknown) => postP('imagerie', d);
export const creerPrescriptionAnapath     = (d: unknown) => postP('anapath', d);
export const creerPrescriptionEEG         = (d: unknown) => postP('eeg', d);
export const creerPrescriptionKine        = (d: unknown) => postP('kine', d);
export const creerPrescriptionDialyse     = (d: unknown) => postP('dialyse', d);
export const creerPrescriptionEndoscopie  = (d: unknown) => postP('endoscopie', d);
