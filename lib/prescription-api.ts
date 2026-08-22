import { playSound } from '@/lib/sounds';
import { getConsultationExterneApiUrl } from '@/lib/api/consultation-config';

// Relayé par notre propre backend (src/prescription/ côté Consultation_back)
// plutôt qu'appelé directement : le service prescription est indisponible
// via la passerelle du CHU (bug de préfixe, comme pharmacie) et n'a pas non
// plus d'en-tête CORS confirmé fonctionnel pour notre origine — un relais
// serveur-à-serveur évite les deux problèmes et retire une variable
// NEXT_PUBLIC_* de plus du frontend.
const PRESCRIPTION_URL = getConsultationExterneApiUrl('/prescription');

const URGENCE_MAP: Record<string, string> = {
  n: 'NORMAL',
  u: 'URGENT',
  tu: 'TRES_URGENT',
};

const EEG_TYPE_MAP: Record<string, string> = {
  'EEG standard de repos (20–30 min)': 'STANDARD',
  'EEG avec privation de sommeil': 'SOMMEIL',
  'EEG de sommeil': 'SOMMEIL',
  'Holter EEG ambulatoire (24–72h)': 'AMBULATOIRE',
  'EEG vidéo (Vidéo-EEG)': 'VIDEO_EEG',
  'EEG per-opératoire': 'STANDARD',
};

// Note: "CYT0PONCTION" uses a zero (0), not the letter O — matches production enum
const ANAPATH_TYPE_MAP: Record<string, string> = {
  fcv: 'FCV_PAP',
  cyto: 'CYT0PONCTION',
  liq: 'LIQUIDE',
  bio: 'BIOPSIE',
  pos: 'POS',
  poc: 'POC',
  ext: 'EXTEMPORANE_STAT',
};

const RISQUE_HEMO_MAP: Record<string, string> = {
  'Faible': 'FAIBLE',
  'Modéré': 'MODERE',
  'Élevé': 'ELEVE',
};

// ID du service destinataire (registre service-service) pour chaque type de
// prescription paraclinique de CE CHU — jamais choisi manuellement par le
// médecin, résolu automatiquement selon le type de prescription envoyé.
// Sans ce champ (serviceIdDest, cf. contrat du service prescription), le
// service paraclinique ne voit jamais la prescription qui lui est destinée.
//
// Résolution DYNAMIQUE (pas de table d'UUID figée) : on interroge le
// registre service-service (GET /services?chuId=) et on cherche par nom.
// Un UUID codé en dur qui se trompe de service routerait silencieusement
// une prescription vers le mauvais destinataire — bien pire que l'absence
// de la fonctionnalité. Mêmes noms de service que prescription_front
// (déjà validés en production).
const TYPE_TO_SERVICE_NAME: Record<string, string> = {
  medicale: 'Pharmacie',
  'non-medicale': 'Pharmacie',
  labo: 'Laboratoire',
  imagerie: 'Imagerie',
  anapath: 'Anatomie pathologique (Anapath)',
  eeg: 'Électroencéphalographie (EEG)',
  ecg: 'Électrocardiographie (ECG)',
  polysomnographie: 'Centre de sommeil',
  orl: 'ORL',
  'actes-orl': 'ORL',
  kine: 'Kinésiterapie',
  endoscopie: 'Endoscopie',
  dialyse: 'Dialyse',
  transfusion: 'Banque de sang',
  bloc: 'Anesthésie - Réanimation',
  // Cas spécial : reste au sein du service prescripteur (pas de registre à interroger).
  surveillance: 'USER_SERVICE',
  'soins-infirmier': 'USER_SERVICE',
};

type ServiceDest = { id: string; name: string };

let servicesCache: { chuId: string; list: ServiceDest[] } | null = null;

async function fetchServicesForChu(chuId: string): Promise<ServiceDest[]> {
  if (servicesCache && servicesCache.chuId === chuId) return servicesCache.list;
  try {
    const res = await fetch(`${PRESCRIPTION_URL}/services?chuId=${encodeURIComponent(chuId)}`, {
      headers: authHeaders(),
    });
    if (!res.ok) return [];
    const data = await res.json();
    const list: ServiceDest[] = Array.isArray(data)
      ? data.map((s: any) => ({ id: s.serviceId || s.id, name: s.name }))
      : [];
    servicesCache = { chuId, list };
    return list;
  } catch {
    return [];
  }
}

// Exposé pour les formulaires qui doivent laisser le médecin CHOISIR un
// service à notifier (ex: Soins infirmier) — pas de résolution automatique
// possible ici, contrairement à serviceIdDest.
export async function fetchServicesList(chuId?: string): Promise<ServiceDest[]> {
  if (!chuId) return [];
  return fetchServicesForChu(chuId);
}

function findServiceByName(list: ServiceDest[], name: string): ServiceDest | null {
  if (!name) return null;
  return list.find(s => s.name?.toLowerCase() === name.toLowerCase()) || null;
}

// Résout le serviceIdDest pour un type de prescription donné. `ownServiceId`
// est le service du prescripteur connecté (utilisé tel quel pour les cas
// "USER_SERVICE" — surveillance/soins infirmier restent dans le service
// d'origine, pas de registre à interroger).
async function resolveServiceIdDest(type: string, chuId?: string, ownServiceId?: string): Promise<string | undefined> {
  const serviceName = TYPE_TO_SERVICE_NAME[type];
  if (!serviceName) return undefined;
  if (serviceName === 'USER_SERVICE') return ownServiceId;
  if (!chuId) return undefined;
  const list = await fetchServicesForChu(chuId);
  const match = findServiceByName(list, serviceName);
  return match?.id;
}

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return (
    localStorage.getItem('access_token') ||
    localStorage.getItem('auth_token') ||
    localStorage.getItem('token')
  );
}

function authHeaders(): Record<string, string> {
  const token = getToken();
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) h['Authorization'] = `Bearer ${token}`;
  return h;
}

// Traduit l'urgence interne (n/u/tu) vers l'enum backend, renomme
// serviceId -> serviceIdSource, et résout dynamiquement le serviceIdDest
// du service paraclinique destinataire (jamais choisi par le médecin).
async function normalizePayload(data: Record<string, unknown>, type: string): Promise<Record<string, unknown>> {
  const out = { ...data };
  if (typeof out.urgence === 'string' && URGENCE_MAP[out.urgence]) {
    out.urgence = URGENCE_MAP[out.urgence];
  }
  const ownServiceId = typeof out.serviceId === 'string' ? out.serviceId : undefined;
  if (out.serviceId !== undefined) {
    out.serviceIdSource = out.serviceId;
    delete out.serviceId;
  }
  const chuId = typeof out.chuId === 'string' ? out.chuId : undefined;
  const serviceIdDest = await resolveServiceIdDest(type, chuId, ownServiceId);
  if (serviceIdDest) out.serviceIdDest = serviceIdDest;
  return out;
}

async function handleResponse(res: Response) {
  if (!res.ok) {
    let message = `Erreur lors de la création de la prescription (HTTP ${res.status}).`;
    try {
      const error = await res.json();
      // Les erreurs de validation NestJS renvoient souvent un tableau de messages,
      // pas une simple chaîne — sans ce cas, le message affiché devenait illisible.
      if (Array.isArray(error?.message)) {
        message = error.message.join(', ');
      } else if (error?.message) {
        message = error.message;
      }
    } catch {}
    throw new Error(message);
  }
  const result = await res.json();
  try { playSound('prescription-sent'); } catch {}
  return result;
}

export async function creerPrescriptionLabo(data: Record<string, unknown>) {
  const res = await fetch(`${PRESCRIPTION_URL}/prescriptions/labo`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(await normalizePayload(data, 'labo')),
  });
  return handleResponse(res);
}

export async function creerPrescriptionImagerie(data: Record<string, unknown>) {
  const res = await fetch(`${PRESCRIPTION_URL}/prescriptions/imagerie`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(await normalizePayload(data, 'imagerie')),
  });
  return handleResponse(res);
}

export async function creerPrescriptionEEG(data: Record<string, unknown>) {
  const { typeEEG, ...rest } = data;
  const typeEEGEnum = EEG_TYPE_MAP[typeEEG as string] ?? 'STANDARD';
  const payload = await normalizePayload({ ...rest, demandes: [{ typeEEG: typeEEGEnum }] }, 'eeg');
  const res = await fetch(`${PRESCRIPTION_URL}/prescriptions/eeg`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
}

export async function creerPrescriptionKine(data: Record<string, unknown>) {
  const { typeKine, diagnostic, contreIndications, objectifs, remarques, ...rest } = data;
  const payload = await normalizePayload({
    ...rest,
    diagnostic,
    objectifs,
    remarques,
    contreIndications,
    demandes: [{ typeKine }],
  }, 'kine');
  const res = await fetch(`${PRESCRIPTION_URL}/prescriptions/kine`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
}

export async function creerPrescriptionDialyse(data: Record<string, unknown>) {
  const res = await fetch(`${PRESCRIPTION_URL}/prescriptions/dialyse`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(await normalizePayload(data, 'dialyse')),
  });
  return handleResponse(res);
}

export async function getCreneauxDialyse(date: string) {
  const res = await fetch(
    `${PRESCRIPTION_URL}/prescriptions/dialyse/creneaux?date=${date}`,
    { headers: authHeaders() },
  );
  if (!res.ok) return [];
  return res.json();
}

// `data.demandes` : une ou plusieurs demandes d'endoscopie, chacune avec son
// propre type d'examen et ses renseignements cliniques (plusieurs demandes
// possibles en une seule prescription).
export async function creerPrescriptionEndoscopie(data: Record<string, unknown>) {
  const payload = await normalizePayload(data, 'endoscopie');
  const res = await fetch(`${PRESCRIPTION_URL}/prescriptions/endoscopie`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
}

function mapAnapathDemande(typeExamen: string, examData: Record<string, unknown>): { typeExamen: string; data: Record<string, unknown> } {
  const typeExamenEnum = ANAPATH_TYPE_MAP[typeExamen] ?? typeExamen;
  const d = examData ?? {};
  let mappedData: Record<string, unknown>;
  if (typeExamen === 'bio' || typeExamen === 'pos' || typeExamen === 'poc') {
    // Backend exige: organe, localisation, nature, fixateur
    // faitA (lieu du prélèvement) → localisation
    mappedData = { ...d, localisation: d.localisation ?? d.faitA ?? String(d.organe ?? '') };
  } else if (typeExamen === 'liq') {
    // Backend exige: type_liquide (string), volume (nombre > 0)
    const vol = typeof d.volume === 'number' ? d.volume : (Number(d.volume) || 1);
    mappedData = { ...d, type_liquide: String(d.type_liquide ?? d.nature ?? ''), volume: vol };
  } else if (typeExamen === 'ext') {
    // Backend exige: organe (string), urgence_chirurgicale (boolean)
    mappedData = { ...d, urgence_chirurgicale: Boolean(d.urgence_chirurgicale ?? false) };
  } else {
    // fcv: etat_col fourni par le form | cyto: {} accepté
    mappedData = { ...d };
  }
  return { typeExamen: typeExamenEnum, data: mappedData };
}

// `data.demandes` : un ou plusieurs examens Anapath (types bruts fcv/cyto/liq/bio/pos/poc/ext),
// envoyés en une seule prescription (plusieurs demandes possibles d'un seul coup).
export async function creerPrescriptionAnapath(data: Record<string, unknown>) {
  const { demandes, ...rest } = data;
  const rawDemandes = (demandes ?? []) as { typeExamen: string; data: Record<string, unknown> }[];
  const mappedDemandes = rawDemandes.map(d => mapAnapathDemande(d.typeExamen, d.data));

  const payload = await normalizePayload({
    ...rest,
    demandes: mappedDemandes,
  }, 'anapath');
  const res = await fetch(`${PRESCRIPTION_URL}/prescriptions/anapath`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
}

export async function creerPrescriptionTransfusion(data: Record<string, unknown>) {
  const { produit, quantite, plaquettes, datePrevue, ...rest } = data;
  // Le backend attend le code frontend brut (sang-total/cgr/pfc/prp), pas de mapping.
  const payload = await normalizePayload({
    ...rest,
    produits: [{
      produit,
      quantite: String(quantite ?? ''),
      ...(plaquettes !== undefined ? { plaquettes } : {}),
      ...(datePrevue !== undefined ? { datePrevue } : {}),
    }],
  }, 'transfusion');
  const res = await fetch(`${PRESCRIPTION_URL}/prescriptions/transfusion`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
}

export async function creerPrescriptionBloc(data: Record<string, unknown>) {
  const { libelle, typeChirurgie, risqueHemorragique, chirurgien, consignes, dateIntervention, renseignements, ...rest } = data;
  const risqueEnum = risqueHemorragique
    ? (RISQUE_HEMO_MAP[risqueHemorragique as string] ?? undefined)
    : undefined;
  // chirurgien/renseignements/dateIntervention vivent dans l'acte, pas au top-level du DTO.
  const payload = await normalizePayload({
    ...rest,
    consignes,
    actes: [{
      libelle,
      ...(typeChirurgie ? { typeChirurgie } : {}),
      ...(risqueEnum ? { risqueHemorragique: risqueEnum } : {}),
      ...(dateIntervention ? { dateIntervention } : {}),
      ...(chirurgien ? { nomChirurgien: chirurgien } : {}),
      ...(renseignements ? { renseignementsCliniques: renseignements } : {}),
    }],
  }, 'bloc');
  const res = await fetch(`${PRESCRIPTION_URL}/prescriptions/bloc`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
}

export type PharmacieArticle = {
  id: string | number;
  dci: string;
  dosage?: string;
  conditionnement?: string;
  sale_price?: string | number;
  stock_total?: number;
  stock_minimum?: number;
  stock_safety?: number;
};

export type StockLevel = 'ok' | 'low' | 'critical' | 'out';

// Ne jamais afficher le stock/seuils bruts au médecin — juste un signal de
// couleur. "critical" = sous le seuil de sécurité, "low" = sous le seuil
// minimal (mais au-dessus du seuil de sécurité), "out" = rupture totale.
export function getStockLevel(article: Pick<PharmacieArticle, 'stock_total' | 'stock_minimum' | 'stock_safety'>): StockLevel {
  const stock = article.stock_total ?? 0;
  if (stock <= 0) return 'out';
  if (article.stock_safety != null && stock <= article.stock_safety) return 'critical';
  if (article.stock_minimum != null && stock <= article.stock_minimum) return 'low';
  return 'ok';
}

// Catalogue complet avec stock/prix — relayé par NOTRE backend, pas un appel
// direct au service pharmacie : celui-ci ne renvoie aucun en-tête CORS, donc
// le navigateur bloquait silencieusement l'appel direct. Notre backend fait
// le relais serveur-à-serveur (jamais soumis à CORS) et transforme un lien
// pharmacie de plus dans .env en une simple route de notre propre API, déjà
// accessible via la passerelle du CHU. Toujours une lecture live, jamais de
// copie locale — si le service pharmacie est injoignable, la liste reste
// vide, assumé (le relais dégrade déjà côté backend).
export async function fetchAllPharmacieArticles(chuId?: string): Promise<PharmacieArticle[]> {
  const params = new URLSearchParams();
  if (chuId) params.set('chuId', chuId);
  try {
    const res = await fetch(getConsultationExterneApiUrl(`/pharmacie/articles/stock-sale-prices?${params.toString()}`), {
      headers: authHeaders(),
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

export async function creerPrescriptionMedicale(data: Record<string, unknown>) {
  const payload = await normalizePayload(data, 'medicale');
  const res = await fetch(`${PRESCRIPTION_URL}/prescriptions/medicale`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
}

// Ordonnance : sous-ensemble de la prescription médicamenteuse effectivement
// envoyé à la pharmacie (contrat backend : POST /prescriptions/medicale/{id}/ordonnance).
// Distinct de la prescription elle-même, qui reste la partie archivée.
export async function creerOrdonnanceMedicale(prescriptionId: string, medicaments: Record<string, unknown>[], serviceIdDest?: string) {
  const res = await fetch(`${PRESCRIPTION_URL}/prescriptions/medicale/${prescriptionId}/ordonnance`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ medicaments, ...(serviceIdDest ? { serviceIdDest } : {}) }),
  });
  return handleResponse(res);
}

// `data.demandes` : une ou plusieurs prescriptions non-médicamenteuses.
export async function creerPrescriptionNonMedicale(data: Record<string, unknown>) {
  const payload = await normalizePayload(data, 'non-medicale');
  const res = await fetch(`${PRESCRIPTION_URL}/prescriptions/non-medicale`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
}

export async function creerPrescriptionECG(data: Record<string, unknown>) {
  const payload = await normalizePayload(data, 'ecg');
  const res = await fetch(`${PRESCRIPTION_URL}/prescriptions/ecg`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
}

export async function creerPrescriptionPolysomnographie(data: Record<string, unknown>) {
  const payload = await normalizePayload(data, 'polysomnographie');
  const res = await fetch(`${PRESCRIPTION_URL}/prescriptions/polysomnographie`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
}

// `data.demandes` : un ou plusieurs examens ORL (audiométrie, tympanométrie...).
export async function creerPrescriptionORL(data: Record<string, unknown>) {
  const payload = await normalizePayload(data, 'orl');
  const res = await fetch(`${PRESCRIPTION_URL}/prescriptions/orl`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
}

// `data.demandes` : un ou plusieurs actes ORL (lavage auriculaire, extraction...).
export async function creerPrescriptionActesOrl(data: Record<string, unknown>) {
  const payload = await normalizePayload(data, 'actes-orl');
  const res = await fetch(`${PRESCRIPTION_URL}/prescriptions/actes-orl`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
}

// `data.parametres` : un ou plusieurs paramètres à surveiller — reste au sein
// du service prescripteur (pas de registre à interroger, cf. TYPE_TO_SERVICE_NAME).
export async function creerPrescriptionSurveillance(data: Record<string, unknown>) {
  const payload = await normalizePayload(data, 'surveillance');
  const res = await fetch(`${PRESCRIPTION_URL}/prescriptions/surveillance`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
}

// `data.items` : un ou plusieurs actes de soins infirmiers — reste au sein du
// service prescripteur, un service à notifier doit être renseigné (serviceNotifId).
export async function creerPrescriptionSoinsInfirmier(data: Record<string, unknown>) {
  const payload = await normalizePayload(data, 'soins-infirmier');
  const res = await fetch(`${PRESCRIPTION_URL}/prescriptions/soins-infirmier`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
}

export async function getPrescriptionsPatient(type: string, patientId: string) {
  const ENDPOINTS: Record<string, string> = {
    med:   'prescriptions/medicale',
    nm:    'prescriptions/non-medicale',
    surv:  'prescriptions/surveillance',
    trans: 'prescriptions/transfusion',
    labo:  'prescriptions/labo',
    imag:  'prescriptions/imagerie',
    eeg:   'prescriptions/eeg',
    kine:  'prescriptions/kine',
    endo:  'prescriptions/endoscopie',
    dial:  'prescriptions/dialyse',
    ana:   'prescriptions/anapath',
    bloc:  'prescriptions/bloc',
  };
  const endpoint = ENDPOINTS[type] || `prescriptions/${type}`;
  const res = await fetch(`${PRESCRIPTION_URL}/${endpoint}/patient/${patientId}`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error('Erreur récupération prescriptions');
  return res.json();
}
