import { playSound } from '@/lib/sounds';
import { checkPublicEnv } from '@/lib/env';

const PRESCRIPTION_URL = checkPublicEnv('NEXT_PUBLIC_PRESCRIPTION_URL', process.env.NEXT_PUBLIC_PRESCRIPTION_URL);
// Le service prescription n'expose qu'une recherche (terme obligatoire), pas de
// liste complète — pour afficher tout le catalogue on va directement à la source.
const PHARMACIE_URL = checkPublicEnv('NEXT_PUBLIC_PHARMACIE_URL', process.env.NEXT_PUBLIC_PHARMACIE_URL);

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
// Bloc opératoire → Anesthésie-Réanimation (c'est ce service qui répond au bloc).
// NB : ces UUID sont propres à ce CHU (registre service-service) — si le
// service devient multi-CHU, il faudra les résoudre dynamiquement par chuId
// au lieu de cette table figée (même limite que HOSPITALISATION_SERVICE_IDS
// côté backend).
const SERVICE_ID_DEST: Record<string, string> = {
  labo: '9b13988c-e2a8-4eec-b6e4-afac2e5422f6',
  imagerie: 'ccff72c7-12a4-4034-bf33-6f835d774535',
  eeg: 'eefa3275-bf50-4da8-9b6f-e945c2c8e757',
  kine: '0415db10-ff65-4c9c-b39c-5313111aa034',
  dialyse: '5ea47469-c69a-419b-887c-8ae243419fee',
  endoscopie: 'ab97eaaa-9239-4f37-b5d7-d652c4231cc7',
  anapath: '9e73904c-71e5-4477-9280-513e4112a468',
  transfusion: 'd7434736-f7ef-4715-835a-4b0b987f2ba3',
  bloc: '76dfc2ed-7d3e-4317-b49a-9404dcaf56a3',
  // Prescription médicamenteuse → Pharmacie (registre service-service, correspond
  // au backend pharmacie-back-1 / front pharmacie-front-1 déjà utilisés ailleurs).
  medicale: '72386b88-157f-4baa-8aae-6069223509e5',
};

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
// serviceId -> serviceIdSource, et attache automatiquement le serviceIdDest
// du service paraclinique destinataire (jamais choisi par le médecin).
function normalizePayload(data: Record<string, unknown>, type: keyof typeof SERVICE_ID_DEST): Record<string, unknown> {
  const out = { ...data };
  if (typeof out.urgence === 'string' && URGENCE_MAP[out.urgence]) {
    out.urgence = URGENCE_MAP[out.urgence];
  }
  if (out.serviceId !== undefined) {
    out.serviceIdSource = out.serviceId;
    delete out.serviceId;
  }
  out.serviceIdDest = SERVICE_ID_DEST[type];
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
    body: JSON.stringify(normalizePayload(data, 'labo')),
  });
  return handleResponse(res);
}

export async function creerPrescriptionImagerie(data: Record<string, unknown>) {
  const res = await fetch(`${PRESCRIPTION_URL}/prescriptions/imagerie`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(normalizePayload(data, 'imagerie')),
  });
  return handleResponse(res);
}

export async function creerPrescriptionEEG(data: Record<string, unknown>) {
  const { typeEEG, ...rest } = data;
  const typeEEGEnum = EEG_TYPE_MAP[typeEEG as string] ?? 'STANDARD';
  const payload = normalizePayload({ ...rest, demandes: [{ typeEEG: typeEEGEnum }] }, 'eeg');
  const res = await fetch(`${PRESCRIPTION_URL}/prescriptions/eeg`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
}

export async function creerPrescriptionKine(data: Record<string, unknown>) {
  const { typeKine, diagnostic, contreIndications, objectifs, remarques, ...rest } = data;
  const payload = normalizePayload({
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
    body: JSON.stringify(normalizePayload(data, 'dialyse')),
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

export async function creerPrescriptionEndoscopie(data: Record<string, unknown>) {
  const { typeExamen, ...rest } = data;
  const payload = normalizePayload({ ...rest, demandes: [{ typeExamen }] }, 'endoscopie');
  const res = await fetch(`${PRESCRIPTION_URL}/prescriptions/endoscopie`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
}

export async function creerPrescriptionAnapath(data: Record<string, unknown>) {
  const { typeExamen, data: examData, ...rest } = data;
  const typeExamenEnum = ANAPATH_TYPE_MAP[typeExamen as string] ?? typeExamen;
  const d = (examData ?? {}) as Record<string, unknown>;
  const t = typeExamen as string;

  let mappedData: Record<string, unknown>;
  if (t === 'bio' || t === 'pos' || t === 'poc') {
    // Backend exige: organe, localisation, nature, fixateur
    // faitA (lieu du prélèvement) → localisation
    mappedData = { ...d, localisation: d.localisation ?? d.faitA ?? String(d.organe ?? '') };
  } else if (t === 'liq') {
    // Backend exige: type_liquide (string), volume (nombre > 0)
    const vol = typeof d.volume === 'number' ? d.volume : (Number(d.volume) || 1);
    mappedData = { ...d, type_liquide: String(d.type_liquide ?? d.nature ?? ''), volume: vol };
  } else if (t === 'ext') {
    // Backend exige: organe (string), urgence_chirurgicale (boolean)
    mappedData = { ...d, urgence_chirurgicale: Boolean(d.urgence_chirurgicale ?? false) };
  } else {
    // fcv: etat_col fourni par le form | cyto: {} accepté
    mappedData = { ...d };
  }

  const payload = normalizePayload({
    ...rest,
    demandes: [{ typeExamen: typeExamenEnum, data: mappedData }],
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
  const payload = normalizePayload({
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
  const payload = normalizePayload({
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

// Catalogue complet avec stock/prix, directement depuis le service pharmacie
// (le service prescription n'expose qu'une recherche par terme, pas de liste
// complète). Toujours une lecture live, jamais de copie locale — si le
// service pharmacie est injoignable, la liste reste vide, assumé.
export async function fetchAllPharmacieArticles(chuId?: string): Promise<PharmacieArticle[]> {
  const params = new URLSearchParams({ level: 'DETAIL' });
  if (chuId) params.set('chuId', chuId);
  try {
    const res = await fetch(`${PHARMACIE_URL}/articles/stock-sale-prices?${params.toString()}`, {
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
  const payload = normalizePayload(data, 'medicale');
  const res = await fetch(`${PRESCRIPTION_URL}/prescriptions/medicale`, {
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
