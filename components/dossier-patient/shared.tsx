"use client";

import React from "react";
import { User, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Rendu générique et lecture seule de données structurées (observations,
 * diagnostics, suivis, paramètres, résultats...), adapté de l'implémentation
 * de référence (Digitheque-project/orl_front, composants dossier-patient) —
 * même backend "dossier_back" pour tous les fronts du CHU, donc même forme
 * de données, mais simplifié pour un usage lecture seule uniquement (aucune
 * des fonctions d'édition/formulaire n'est nécessaire ici).
 */

// Libellés lisibles pour les clés techniques les plus fréquentes, tous
// modules confondus (observation, diagnostic, suivi, paramètres...).
export const KEY_LABELS: Record<string, string> = {
  // Observation — identification / motif / antécédents
  nom: "Nom",
  prenom: "Prénom(s)",
  dateNaissance: "Date de naissance",
  adresse: "Adresse",
  sexe: "Sexe",
  profession: "Profession",
  contact: "Contact patient",
  contactUrgence: "Contact urgence",
  motif: "Motif principal",
  motifPrincipal: "Motif principal",
  histoire: "Histoire de la maladie",
  modeEntree: "Mode d'entrée",
  delaiEvolution: "Délai d'évolution",
  degreUrgence: "Degré d'urgence",
  // Observation — constantes
  observationType: "Type d'observation",
  urgencyLevel: "Niveau d'urgence",
  systolicBP: "Tension systolique",
  diastolicBP: "Tension diastolique",
  heartRate: "Fréquence cardiaque",
  temperature: "Température",
  respiratoryRate: "Fréquence respiratoire",
  weight: "Poids",
  height: "Taille",
  bmi: "IMC",
  oxygenSaturation: "Saturation O2",
  symptoms: "Symptômes",
  medicalHistory: "Antécédents",
  physicalExamination: "Examen physique",
  clinicalImpressions: "Diagnostic clinique",
  currentTreatments: "Traitements en cours",
  complementaryExams: "Examens complémentaires",
  isDraft: "Brouillon",
  isSigned: "Signée",
  signedAt: "Signée le",
  // Diagnostic
  icdCode: "Code CIM-10",
  icdLabel: "Libellé CIM-10",
  type: "Type",
  isPrimary: "Retenu comme diagnostic principal",
  diagnosticPrincipal: "Diagnostic principal",
  diagnosticSecondaire: "Diagnostic secondaire",
  justification: "Justification",
  diagnosticDifferentielle: "Diagnostic différentiel",
  ecarteCar: "Écarté car",
  severityScore: "Score de sévérité",
  etiologicalHypotheses: "Hypothèses étiologiques",
  // Suivi / Évolution
  jourHospitalisation: "Jour d'hospitalisation",
  taSystolique: "TA systolique",
  taDiastolique: "TA diastolique",
  frequenceCardiaque: "Fréquence cardiaque",
  frequenceRespiratoire: "Fréquence respiratoire",
  evaDouleur: "EVA douleur",
  glasgow: "Score de Glasgow",
  etatGeneral: "État général",
  examenClinique: "Examen clinique",
  evolution: "Évolution",
  signesAlerte: "Signes d'alerte",
  auteur: "Auteur",
  // Paramètres
  origine: "Origine",
  mesureAt: "Mesuré le",
  note: "Note",
  // Résultats paracliniques
  examen: "Examen",
  dateDemande: "Date de demande",
  dateResultat: "Date de résultat",
  resultatTexte: "Résultat",
  prescripteur: "Prescripteur",
  statut: "Statut",
  commentaire: "Commentaire",
  serviceSource: "Service source",
};

const VALUE_LABELS: Record<string, string> = {
  suspicion: "Suspicion diagnostique",
  SUSPICION: "Suspicion",
  RETENU: "Retenu",
  retenu: "Diagnostic retenu",
  NORMAL: "Normal",
  URGENT: "Urgent",
  TRES_URGENT: "Très urgent",
  GENERAL: "Général",
  RELEVE_MANUEL: "Relevé manuel",
};

export function formatKey(key: string): string {
  if (KEY_LABELS[key]) return KEY_LABELS[key];
  const spaced = key.replace(/([A-Z])/g, " $1").trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

// Champs techniques/administratifs : identité (déjà connue du contexte —
// on regarde toujours le dossier d'UN patient précis), auteur (UUID brut,
// pas un nom lisible sans service d'annuaire dédié) et horodatages (déjà
// affichés séparément par RecordCard) — jamais utiles dans le corps d'un
// enregistrement affiché en lecture seule.
const ADMIN_KEYS = new Set([
  "chuid",
  "serviceid",
  "patientid",
  "createdby",
  "updatedby",
  "createdat",
  "updatedat",
  "episodeid",
]);

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;

function formatScalar(value: string | number | boolean): string {
  if (typeof value === "boolean") return value ? "Oui" : "Non";
  const asString = String(value);
  if (ISO_DATE_RE.test(asString)) return formatDateTime(asString);
  return VALUE_LABELS[asString] ?? asString;
}

/**
 * Nettoyage récursif : chaînes vides, `false`, tableaux/objets vides et
 * valeurs nulles ne sont jamais affichés — un dossier lecture seule ne doit
 * montrer que ce qui a réellement été renseigné.
 */
export function prune(value: unknown): unknown {
  if (value === null || value === undefined) return undefined;
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }
  if (typeof value === "boolean") return value ? true : undefined;
  if (typeof value === "number") return Number.isFinite(value) ? value : undefined;
  if (Array.isArray(value)) {
    const items = value.map(prune).filter((v) => v !== undefined);
    return items.length > 0 ? items : undefined;
  }
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
      if (key.toLowerCase() === "id") continue;
      const cleaned = prune(raw);
      if (cleaned !== undefined) out[key] = cleaned;
    }
    return Object.keys(out).length > 0 ? out : undefined;
  }
  return undefined;
}

/** Tente un JSON.parse ; sinon retourne la chaîne brute sous `fallbackKey` (anciens formats / saisie simple). */
export function parseJsonOrPlain(raw: string | null | undefined, fallbackKey: string): Record<string, unknown> | undefined {
  if (!raw) return undefined;
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed as Record<string, unknown>;
    return { [fallbackKey]: parsed };
  } catch {
    return { [fallbackKey]: raw };
  }
}

/** Rendu récursif et lecture seule d'une valeur arbitraire (scalaire, tableau, objet imbriqué). */
export function renderValue(value: unknown, depth = 0): React.ReactNode {
  const cleaned = depth === 0 ? prune(value) : value;
  if (cleaned === null || cleaned === undefined || cleaned === "") return null;

  if (typeof cleaned !== "object") {
    return <span className="whitespace-pre-wrap break-words">{formatScalar(cleaned as string | number | boolean)}</span>;
  }

  if (Array.isArray(cleaned)) {
    if (cleaned.length === 0) return null;
    return (
      <ul className="mt-2 list-disc space-y-2 pl-5 marker:text-slate-400 sm:pl-6">
        {cleaned.map((item, idx) => (
          <li key={idx}>{renderValue(item, depth + 1)}</li>
        ))}
      </ul>
    );
  }

  const entries = Object.entries(cleaned as Record<string, unknown>).filter(([key]) => {
    const lower = key.toLowerCase();
    return lower !== "id" && !(depth === 0 && ADMIN_KEYS.has(lower));
  });
  if (entries.length === 0) return null;

  return (
    <dl
      className={
        depth === 0
          ? "grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2 sm:gap-y-5"
          : "mt-2 space-y-3 border-l-2 border-slate-200 pl-3 sm:pl-4"
      }
    >
      {entries.map(([key, v]) => {
        const rendered = renderValue(v, depth + 1);
        if (rendered === null) return null;
        const isBlock = typeof v === "object" && v !== null;
        return (
          <div key={key} className={isBlock && depth === 0 ? "sm:col-span-2" : undefined}>
            <dt className="break-words text-[11px] font-bold leading-snug text-slate-500">{formatKey(key)}</dt>
            <dd className="mt-1 break-words text-[13.5px] leading-6 text-slate-800">{rendered}</dd>
          </div>
        );
      })}
    </dl>
  );
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("fr-FR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

/** Carte lecture seule pour un enregistrement daté (observation, diagnostic, suivi...). */
export function RecordCard({
  title,
  date,
  author,
  badge,
  children,
}: {
  title?: string;
  date?: string | null;
  author?: string | null;
  badge?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-slate-50 px-4 py-2.5">
        <div className="flex items-center gap-2">
          {badge}
          {title && <span className="text-[12.5px] font-bold text-slate-700">{title}</span>}
        </div>
        <div className="flex items-center gap-3 text-[11px] text-slate-400">
          {author && (
            <span className="flex items-center gap-1">
              <User className="h-3 w-3" />
              {author}
            </span>
          )}
          {date && (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatDateTime(date)}
            </span>
          )}
        </div>
      </div>
      <div className="px-4 py-4">{children}</div>
    </div>
  );
}

export function EmptyState({ label }: { label: string }) {
  return <div className="py-12 text-center text-[13px] text-slate-400">{label}</div>;
}

export function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-20 animate-pulse rounded-xl bg-slate-100" />
      ))}
    </div>
  );
}

export function Pill({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <span className="inline-flex items-baseline gap-1 rounded-md bg-slate-100 px-2 py-1 text-[12px]">
      <span className="font-semibold text-slate-500">{label} :</span>
      <span className="font-bold text-slate-800">{value}</span>
    </span>
  );
}

export function TabButton({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-[12.5px] font-semibold transition-colors",
        active ? "bg-[#006A8C] text-white shadow-sm" : "text-slate-600 hover:bg-white hover:text-[#006A8C]",
      )}
    >
      <Icon className="h-4 w-4 shrink-0" strokeWidth={2} />
      <span>{label}</span>
    </button>
  );
}
