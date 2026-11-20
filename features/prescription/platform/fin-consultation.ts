"use client";

/**
 * Fin de consultation : tout ce que le médecin a commencé à prescrire est
 * validé puis envoyé automatiquement quand il termine la consultation.
 *
 *  1. Chaque formulaire qui contient une saisie (affiché ou gardé en brouillon
 *     dans un autre onglet) est validé par SES PROPRES règles : un champ
 *     obligatoire vide le fait refuser, et la fin de consultation est bloquée
 *     (le médecin complète ou efface sa saisie).
 *  2. Tout ce qui attend dans le panier est envoyé à son service.
 *
 * Les formulaires s'enregistrent ici par useDraftPersistence ; le module de
 * prescription y déclare comment ouvrir un onglet, le panier comment envoyer.
 */

export type FormulaireBrouillon = {
  /** Type du brouillon (clé `draft:<type>:<patientId>`). */
  type: string;
  aDuContenu: () => boolean;
  valider: () => unknown;
};

type Panier = {
  identifiants: () => string[];
  envoyer: (prescripteurId: string) => Promise<{ allSent: boolean; errorCount: number; typesEnvoyes: string[] }>;
};

export type ResultatFinConsultation = {
  ok: boolean;
  /** Formulaires refusés (champ obligatoire vide) : libellés à afficher. */
  incomplets: string[];
  /** Envois refusés par un service. */
  erreurs: number;
  /** Types de prescriptions validées ou envoyées pendant la fin de consultation. */
  types: string[];
};

/** Libellé affiché au médecin, par type de brouillon. */
export const LIBELLES_BROUILLON: Record<string, string> = {
  medicale: "Médicamenteuse",
  "non-medicale": "Non médicamenteuse",
  "soins-infirmier": "Soins infirmiers",
  surveillance: "Surveillance",
  transfusion: "Transfusion sanguine",
  bloc: "Intervention chirurgicale",
  cpa: "CPA",
  "actes-orl": "Actes ORL",
  labo: "Laboratoire",
  imagerie: "Imagerie",
  eeg: "EEG",
  kine: "Kinésithérapie",
  endoscopie: "Endoscopie",
  dialyse: "Dialyse",
  anapath: "Anatomopathologie",
  ecg: "ECG",
  orl: "ORL",
  poly: "Polysomnographie",
};

const formulaires = new Map<string, FormulaireBrouillon>();
let ouvrirOnglet: ((type: string) => boolean) | null = null;
let panier: Panier | null = null;
let prescripteurId = "";

export function enregistrerFormulaire(f: FormulaireBrouillon) {
  formulaires.set(f.type, f);
  return () => {
    if (formulaires.get(f.type) === f) formulaires.delete(f.type);
  };
}

export function definirOuvertureOnglet(fn: ((type: string) => boolean) | null, idPrescripteur = "") {
  ouvrirOnglet = fn;
  prescripteurId = idPrescripteur;
}

export function definirPanier(p: Panier | null) {
  panier = p;
}

/** Champs pré-remplis qui ne comptent pas comme une saisie du médecin. */
const CHAMPS_PAR_DEFAUT = new Set(["urgence", "imgType", "serviceNotifId", "moyenDeplacement"]);

/** Une valeur de brouillon contient-elle une vraie saisie ? */
export function contientSaisie(valeur: unknown, cle?: string): boolean {
  if (cle && CHAMPS_PAR_DEFAUT.has(cle)) return false;
  if (typeof valeur === "string") return valeur.trim().length > 0;
  if (Array.isArray(valeur)) return valeur.length > 0;
  if (valeur && typeof valeur === "object") {
    return Object.entries(valeur as Record<string, unknown>).some(([k, v]) => contientSaisie(v, k));
  }
  return false; // nombres, booléens (cases à cocher), null
}

const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function attendre(condition: () => boolean, delaiMs: number) {
  const fin = Date.now() + delaiMs;
  while (Date.now() < fin) {
    if (condition()) return true;
    await pause(50);
  }
  return condition();
}

/** Brouillons enregistrés dans le navigateur pour ce patient, avec une saisie. */
function brouillonsStockes(patientId: string): string[] {
  const types: string[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const cle = localStorage.key(i);
      const m = cle?.match(/^draft:([^:]+):(.+)$/);
      if (!m || m[2] !== patientId || !(m[1] in LIBELLES_BROUILLON)) continue;
      const enveloppe = JSON.parse(localStorage.getItem(cle!) || "null");
      if (contientSaisie(enveloppe?.data)) types.push(m[1]);
    }
  } catch {
    /* stockage indisponible : seuls les formulaires affichés comptent */
  }
  return types;
}

export async function finaliserPrescriptions(patientId: string): Promise<ResultatFinConsultation> {
  const incomplets: string[] = [];
  const typesIncomplets: string[] = [];
  const types = new Set<string>();
  const aTraiter = new Set<string>([...formulaires.keys(), ...brouillonsStockes(patientId)]);

  for (const type of aTraiter) {
    let f = formulaires.get(type);
    if (!f) {
      // Formulaire d'un autre onglet : on l'ouvre pour qu'il se valide lui-même.
      if (!ouvrirOnglet?.(type)) continue;
      await attendre(() => formulaires.has(type), 4000);
      f = formulaires.get(type);
      // Laisse le formulaire recharger son brouillon.
      if (f) await attendre(() => f!.aDuContenu(), 1500);
    }
    if (!f) {
      incomplets.push(LIBELLES_BROUILLON[type] ?? type);
      typesIncomplets.push(type);
      continue;
    }
    if (!f.aDuContenu()) continue;

    const avant = new Set(panier?.identifiants() ?? []);
    try {
      await f.valider();
    } catch {
      /* le formulaire affiche lui-même son erreur */
    }
    const formulaire = f;
    const accepte = await attendre(
      () => (panier?.identifiants() ?? []).some((id) => !avant.has(id)) || !formulaire.aDuContenu(),
      3000,
    );
    if (accepte) types.add(type);
    else {
      incomplets.push(LIBELLES_BROUILLON[type] ?? type);
      typesIncomplets.push(type);
    }
  }

  if (incomplets.length) {
    // Laisse le médecin devant le premier formulaire refusé (son message d'erreur).
    ouvrirOnglet?.(typesIncomplets[0]);
    return { ok: false, incomplets, erreurs: 0, types: [...types] };
  }

  let erreurs = 0;
  if (panier) {
    const r = await panier.envoyer(prescripteurId);
    erreurs = r.errorCount;
    r.typesEnvoyes.forEach((t) => types.add(t));
  }
  return { ok: erreurs === 0, incomplets, erreurs, types: [...types] };
}
