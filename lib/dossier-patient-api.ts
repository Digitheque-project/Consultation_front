import { checkPublicEnv } from '@/lib/env';

// Origine seule (Règle 1 du projet) — le préfixe /dossier-patient est ajouté
// ici, jamais dans la variable d'environnement. Passerelle unique du CHU
// (même variable que tout autre service tiers, cohérent avec GATEWAY_URL
// côté backend) — pas la nôtre, jamais localhost en dev.
const DOSSIER_PATIENT_URL = checkPublicEnv(
  'NEXT_PUBLIC_GATEWAY_URL',
  process.env.NEXT_PUBLIC_GATEWAY_URL,
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

async function getJson<T>(path: string, params: Record<string, string | undefined>): Promise<T> {
  if (!DOSSIER_PATIENT_URL) throw new Error('Dossier patient : passerelle non configurée.');
  const token = getToken();
  const query = Object.entries(params)
    .filter((entry): entry is [string, string] => Boolean(entry[1]))
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
    .join('&');
  const url = `${apiUrl(path)}${query ? `?${query}` : ''}`;

  const res = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) {
    throw new Error(`Dossier patient : échec du chargement (HTTP ${res.status})`);
  }
  return res.json();
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

/**
 * Timeline agrégée en LECTURE SEULE du dossier d'un patient — observations,
 * diagnostics, suivis, paramètres et sorties saisis par n'importe quel
 * service du CHU (pas seulement le nôtre), tel que défini par le backend
 * dédié "dossier_back" (contrat confirmé via son Swagger public).
 * `serviceId` omis volontairement : on veut TOUT le CHU, pas notre seul service.
 *
 * ATTENTION : chaque entrée ne contient qu'un RÉSUMÉ des champs (`valeurs`),
 * pas l'enregistrement complet — vérifié en conditions réelles (une
 * observation avec 15 champs renseignés n'en expose que 5 ici). Utiliser les
 * fonctions dédiées ci-dessous (getObservationsByPatient, etc.) pour le
 * détail complet d'un module ; cette fonction sert à la vue "Historique"
 * (chronologie tous modules confondus) et de repli quand aucune fonction
 * dédiée n'existe (ex. Sortie, dont l'endpoint dédié exige un episodeId
 * qu'on n'a pas toujours).
 */
export async function getDossierPatientHistorique(
  patientId: string,
  chuId: string,
): Promise<DossierHistoriqueEntry[]> {
  if (!DOSSIER_PATIENT_URL) return [];
  const data = await getJson(`/patients/${encodeURIComponent(patientId)}/historique`, { chuId });
  return pickList<DossierHistoriqueEntry>(data);
}

// ─────────────────────────────────────────────────────────────────────────
// Observation médicale — détail complet (voir avertissement ci-dessus sur
// l'agrégat). Champs tels que retournés par GET /observations/patient/{id},
// confirmés en conditions réelles.
// ─────────────────────────────────────────────────────────────────────────
export interface Observation {
  id: string;
  chuId: string;
  serviceId: string;
  patientId: string;
  observationType?: string;
  urgencyLevel?: number;
  systolicBP?: string | number;
  diastolicBP?: string | number;
  heartRate?: string | number;
  temperature?: string | number;
  respiratoryRate?: string | number;
  weight?: string | number;
  height?: string | number;
  bmi?: string | number;
  oxygenSaturation?: string | number;
  /** Chaîne simple OU JSON encodé {motif, histoire} selon le front qui a saisi. */
  symptoms?: string | null;
  medicalHistory?: string | null;
  physicalExamination?: string | null;
  clinicalImpressions?: string | null;
  currentTreatments?: string | null;
  complementaryExams?: string | null;
  isDraft?: boolean;
  isSigned?: boolean;
  signedAt?: string | null;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export async function getObservationsByPatient(patientId: string, chuId: string): Promise<Observation[]> {
  if (!DOSSIER_PATIENT_URL) return [];
  const data = await getJson(`/observations/patient/${encodeURIComponent(patientId)}`, { chuId });
  return pickList<Observation>(data);
}

// ─────────────────────────────────────────────────────────────────────────
// Diagnostic — GET /diagnostics?chuId=&patientId= (patientId en query, pas
// dans le chemin, contrairement aux autres modules — vérifié).
// ─────────────────────────────────────────────────────────────────────────
export interface Diagnostic {
  id: string;
  chuId: string;
  serviceId: string;
  patientId: string;
  icdCode?: string | null;
  icdLabel?: string | null;
  type?: 'SUSPICION' | 'RETENU' | string;
  isPrimary?: boolean;
  diagnosticPrincipal?: string;
  diagnosticSecondaire?: string | null;
  justification?: string | null;
  diagnosticDifferentielle?: string | null;
  ecarteCar?: string | null;
  severityScore?: string | null;
  etiologicalHypotheses?: string | null;
  episodeId?: string | null;
  createdBy?: string;
  updatedBy?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export async function getDiagnosticsByPatient(patientId: string, chuId: string): Promise<Diagnostic[]> {
  if (!DOSSIER_PATIENT_URL) return [];
  const data = await getJson(`/diagnostics`, { chuId, patientId });
  return pickList<Diagnostic>(data);
}

// ─────────────────────────────────────────────────────────────────────────
// Suivi / Évolution — GET /patients/{patientId}/suivis?chuId=
// ─────────────────────────────────────────────────────────────────────────
export interface Suivi {
  id: string;
  chuId: string;
  serviceId: string;
  patientId: string;
  jourHospitalisation?: string;
  temperature?: number | string;
  taSystolique?: string;
  taDiastolique?: string;
  frequenceCardiaque?: string;
  frequenceRespiratoire?: string;
  evaDouleur?: number;
  glasgow?: string;
  etatGeneral?: string;
  examenClinique?: string;
  evolution?: string;
  signesAlerte?: boolean;
  auteur?: string;
  createdBy?: string;
  createdAt?: string;
}

export async function getSuivisByPatient(patientId: string, chuId: string): Promise<Suivi[]> {
  if (!DOSSIER_PATIENT_URL) return [];
  const data = await getJson(`/patients/${encodeURIComponent(patientId)}/suivis`, { chuId });
  return pickList<Suivi>(data);
}

// ─────────────────────────────────────────────────────────────────────────
// Paramètres — GET /patients/{patientId}/parametres?chuId=
// ─────────────────────────────────────────────────────────────────────────
export interface Parametre {
  id: string;
  chuId: string;
  serviceId: string;
  patientId: string;
  origine?: string;
  mesureAt?: string;
  valeurs: Record<string, unknown>;
  note?: string | null;
  createdBy?: string;
  createdAt?: string;
}

export async function getParametresByPatient(patientId: string, chuId: string): Promise<Parametre[]> {
  if (!DOSSIER_PATIENT_URL) return [];
  const data = await getJson(`/patients/${encodeURIComponent(patientId)}/parametres`, { chuId });
  return pickList<Parametre>(data);
}

// ─────────────────────────────────────────────────────────────────────────
// Résultats paracliniques — agrégés depuis tous les services (ORL, Labo,
// Imagerie...), pas seulement le nôtre. GET /patients/{patientId}/resultats?chuId=
// ─────────────────────────────────────────────────────────────────────────
export interface ResultatParaclinique {
  id: string;
  type?: string;
  examen?: string;
  dateDemande?: string;
  dateResultat?: string;
  resultatTexte?: string | null;
  resultatFichiers?: unknown;
  prescripteur?: string;
  statut?: string;
  commentaire?: string | null;
  serviceSource?: string;
  patientId: string;
  chuId: string;
}

export async function getResultatsByPatient(patientId: string, chuId: string): Promise<ResultatParaclinique[]> {
  if (!DOSSIER_PATIENT_URL) return [];
  const data = await getJson(`/patients/${encodeURIComponent(patientId)}/resultats`, { chuId });
  return pickList<ResultatParaclinique>(data);
}
