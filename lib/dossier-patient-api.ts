import { checkPublicEnv } from '@/lib/env';

// Origine seule (Règle 1 du projet) — le préfixe /dossier-patient est ajouté
// ici, jamais dans la variable d'environnement.
const DOSSIER_PATIENT_URL = checkPublicEnv(
  'NEXT_PUBLIC_DOSSIER_PATIENT_API_URL',
  process.env.NEXT_PUBLIC_DOSSIER_PATIENT_API_URL,
);

function apiUrl(path: string): string {
  const base = DOSSIER_PATIENT_URL.replace(/\/+$/, '');
  return `${base}/dossier-patient${path}`;
}

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return (
    localStorage.getItem('access_token') ||
    localStorage.getItem('auth_token') ||
    localStorage.getItem('token')
  );
}

export type DossierModule = 'observation' | 'diagnostic' | 'suivi' | 'parametre' | 'sortie';

export interface DossierHistoriqueEntry {
  id: string;
  module: DossierModule;
  date: string;
  serviceId: string;
  createdBy?: string;
  valeurs: Record<string, unknown>;
}

function pickList<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[];
  if (payload && typeof payload === 'object') {
    const record = payload as Record<string, unknown>;
    if (Array.isArray(record.data)) return record.data as T[];
    if (Array.isArray(record.results)) return record.results as T[];
    if (Array.isArray(record.items)) return record.items as T[];
  }
  return [];
}

/**
 * Timeline agrégée en LECTURE SEULE du dossier d'un patient — observations,
 * diagnostics, suivis, paramètres et sorties saisis par n'importe quel
 * service du CHU (pas seulement le nôtre), tel que défini par le backend
 * dédié "dossier_back" (contrat confirmé via son Swagger public).
 * `serviceId` omis volontairement : on veut TOUT le CHU, pas notre seul service.
 */
export async function getDossierPatientHistorique(
  patientId: string,
  chuId: string,
): Promise<DossierHistoriqueEntry[]> {
  if (!DOSSIER_PATIENT_URL) return [];

  const token = getToken();
  const url = `${apiUrl(`/patients/${encodeURIComponent(patientId)}/historique`)}?chuId=${encodeURIComponent(chuId)}`;

  const res = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    signal: AbortSignal.timeout(20000),
  });

  if (!res.ok) {
    throw new Error(`Dossier patient : échec du chargement (HTTP ${res.status})`);
  }

  return pickList<DossierHistoriqueEntry>(await res.json());
}
