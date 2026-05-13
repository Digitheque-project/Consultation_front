"use client";

import {
  AlertTriangle,
  BedDouble,
  Calendar,
  Clock,
  Loader2,
  Plus,
  User,
  Wrench,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  hospitalisationApi,
  type PlanLitBed,
  type PlanLitHospitalisation,
  type PlanLitsResponse,
  type PlanLitRoom,
} from "@/lib/api/instances/hospitalisation";
import { DEFAULT_CLINICAL_SERVICE_ID } from "@/lib/auth/constants";
import { getClinicalServiceIdFromBrowser } from "@/lib/auth/mock-auth-browser";
import { cn } from "@/lib/utils";
import { writeDossierPatientPrefill } from "@/lib/clinical/dossier-patient-prefill";

const DOT_STABLE = "#006A8C";
const DOT_SURVEILLANCE = "#F59E0B";
const DOT_CRITIQUE = "#E11D48";

function trimServiceId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const t = value.trim();
  return t.length > 0 ? t : null;
}

function pickPatientStr(
  patient: Record<string, unknown> | null | undefined,
  keys: string[],
): string | undefined {
  if (!patient) return undefined;
  for (const key of keys) {
    const v = patient[key];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return undefined;
}

function formatPlanPatientDisplay(
  patient: Record<string, unknown> | null | undefined,
  patientId: string,
): string {
  const nom = pickPatientStr(patient, ["nom", "lastName", "familyName", "name"]);
  const prenom = pickPatientStr(patient, [
    "prenom",
    "firstName",
    "givenName",
  ]);
  if (nom && prenom) {
    const ini = prenom.trim().charAt(0).toUpperCase();
    return `${nom.toUpperCase()} ${ini}.`;
  }
  if (nom) return nom.toUpperCase();
  if (prenom) return `${prenom}`;
  return `Patient ${patientId.slice(0, 8)}`;
}

function pickAllergiesText(
  patient: Record<string, unknown> | null | undefined,
): string | undefined {
  if (!patient) return undefined;
  const direct = pickPatientStr(patient, [
    "allergies",
    "allergie",
    "allergiesTexte",
  ]);
  if (direct) return direct;
  const raw = patient["allergiesListe"] ?? patient["allergyList"];
  if (Array.isArray(raw)) {
    const parts = raw.filter(
      (x): x is string => typeof x === "string" && x.trim().length > 0,
    );
    if (parts.length) return parts.join(", ");
  }
  return undefined;
}

type LitSelection = {
  litId: string;
  chambreNumero: number;
  codeLit: string;
  hosp: PlanLitHospitalisation;
  patient: Record<string, unknown> | null;
};

function formatDetailValue(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "string") return v.trim();
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  return "";
}

function formatPatientPanelName(
  patient: Record<string, unknown> | null | undefined,
  patientId: string,
): string {
  const nom = pickPatientStr(patient, ["nom", "lastName", "familyName", "name"]);
  const prenom = pickPatientStr(patient, [
    "prenom",
    "firstName",
    "givenName",
  ]);
  const parts = [prenom, nom].filter(
    (p): p is string => typeof p === "string" && p.length > 0,
  );
  if (parts.length) return parts.join(" ");
  return `Patient ${patientId.slice(0, 8)}`;
}

function computeAgeYears(
  dateNaissance: string | undefined,
  patient: Record<string, unknown> | null,
): number | null {
  const raw =
    dateNaissance ??
    (typeof patient?.["dateNaissance"] === "string"
      ? (patient["dateNaissance"] as string)
      : undefined);
  if (!raw) return null;
  const birth = new Date(raw);
  if (Number.isNaN(birth.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age >= 0 ? age : null;
}

function formatSexeFr(patient: Record<string, unknown> | null): string {
  const raw = formatDetailValue(patient?.["sexe"] ?? patient?.["gender"]);
  if (!raw) return "—";
  const u = raw.toUpperCase();
  if (u === "M" || u === "H" || u === "MASCULIN" || u === "HOMME") return "Homme";
  if (u === "F" || u === "FÉMININ" || u === "FEMININ" || u === "FEMME")
    return "Femme";
  return raw;
}

function formatDateFrLong(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function pickPriseEnChargeLabel(
  patient: Record<string, unknown> | null,
): string {
  if (!patient) return "—";
  const v =
    formatDetailValue(patient["priseEnCharge"]) ||
    formatDetailValue(patient["modePriseEnCharge"]) ||
    formatDetailValue(patient["libellePriseEnCharge"]);
  return v || "—";
}

function pickDerniereIntervention(
  patient: Record<string, unknown> | null,
): string {
  if (!patient) return "";
  const v =
    formatDetailValue(patient["derniereIntervention"]) ||
    formatDetailValue(patient["interventionEnCours"]) ||
    formatDetailValue(patient["derniereInterventionLibelle"]);
  return v;
}

function dayCountSinceAdmission(isoDate: string): number {
  const start = new Date(isoDate);
  const now = new Date();
  if (Number.isNaN(start.getTime())) return 0;
  const startUtc = Date.UTC(
    start.getFullYear(),
    start.getMonth(),
    start.getDate(),
  );
  const nowUtc = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.max(0, Math.round((nowUtc - startUtc) / 86400000));
}

function ribbonFromMotif(motif: string): string {
  const t = motif.trim();
  if (!t) return "";
  return t.length <= 12 ? t.toUpperCase() : `${t.slice(0, 12).toUpperCase()}…`;
}

/** Ruban affiché seulement si le patient a une prise en charge (id non null). */
function resolveRibbonText(
  patient: Record<string, unknown> | null,
  motif: string,
): string {
  if (!patient) return "";
  const pec = patient["priseEnChargeId"];
  if (pec === null || pec === undefined) return "";
  return ribbonFromMotif(motif);
}

function accentForBed(lit: PlanLitBed): string {
  if (lit.statut === "MAINTENANCE") return DOT_SURVEILLANCE;
  const sh = lit.hospitalisation?.statutHospitalisation;
  if (sh === "CLOTUREE") return "#64748B";
  return "#0B7DB3";
}

function LegendDot({ dotColor, label }: { dotColor: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <div
        className="w-2 h-2 rounded-full"
        style={{ backgroundColor: dotColor }}
      />
      <span className="text-[10px] sm:text-[11px] font-bold text-gray-600">
        {label}
      </span>
    </div>
  );
}

function BedCard({
  litCode,
  patientName,
  diagnostic,
  allergies,
  allergiesLabel,
  traitements,
  joursEntree,
  joursPostOp,
  colorAccent,
  ribbonText,
  isSelected,
  onSelect,
}: {
  litCode: string;
  patientName: string;
  diagnostic?: string;
  allergies?: string;
  allergiesLabel?: boolean;
  traitements: string;
  joursEntree?: string;
  joursPostOp?: string;
  colorAccent: string;
  ribbonText: string;
  isSelected?: boolean;
  onSelect?: () => void;
}) {
  return (
    <div
      role={onSelect ? "button" : undefined}
      tabIndex={onSelect ? 0 : undefined}
      onClick={onSelect ? () => onSelect() : undefined}
      onKeyDown={
        onSelect
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelect();
              }
            }
          : undefined
      }
      className={cn(
        "relative bg-white rounded-[16px] border border-gray-200/70 shadow-sm p-4 overflow-hidden min-h-[140px] flex flex-col justify-between outline-none transition-[box-shadow,border-color]",
        onSelect && "cursor-pointer hover:shadow-md hover:border-gray-300/90",
        isSelected &&
          "ring-2 ring-[#0EA5E9] ring-offset-2 border-sky-200/80 shadow-[0px_6px_20px_rgba(14,165,233,0.12)]",
      )}
    >
      <div
        className="absolute overflow-hidden top-0 right-0 w-[60px] h-[60px]"
        aria-hidden
      >
        {ribbonText ? (
          <div
            className="absolute top-[10px] right-[-22px] rotate-45 text-white text-[8px] font-extrabold px-8 py-[3px] uppercase tracking-wide"
            style={{ backgroundColor: colorAccent }}
          >
            {ribbonText}
          </div>
        ) : null}
      </div>

      <div className="mb-2">
        <span
          className="text-[9px] font-black px-2.5 py-[3px] rounded-[6px] text-white uppercase tracking-wide"
          style={{ backgroundColor: colorAccent }}
        >
          {litCode}
        </span>
      </div>

      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-[13px] font-extrabold text-gray-900 leading-tight mb-0.5">
            {patientName}
          </p>

          {diagnostic && (
            <p className="text-[10px] font-medium text-gray-500 mb-1.5">
              {diagnostic}
            </p>
          )}
        </div>
        {allergies && (
          <div className="mb-1.5 mr-3">
            {allergiesLabel && (
              <p className="text-[11px] font-extrabold text-[#F59E0B] uppercase tracking-wide">
                ALLERGIES
              </p>
            )}
            <p className="text-[15px] font-bold text-[#F59E0B]">{allergies}</p>
          </div>
        )}
      </div>

      <div className="flex items-center gap-1.5 mb-3 mt-3 cursor-pointer">
        <svg
          className="w-3 h-3 text-gray-400"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
          />
        </svg>
        <span className="text-[11px] font-bold text-gray-500">Traitements</span>
        <span className="text-[11px] font-extrabold text-[#006A8C] bg-[#EAF3FA] rounded-full px-2 py-[2px]">
          {traitements}
        </span>
      </div>

      <div className="flex items-center justify-between mt-auto pt-2 border-t border-gray-100">
        {joursEntree && (
          <span className="text-[9px] font-bold text-gray-500">
            {joursEntree}
          </span>
        )}
        {joursPostOp && (
          <span className="text-[9px] font-bold text-gray-500">
            {joursPostOp}
          </span>
        )}
      </div>
    </div>
  );
}

function AvailableBedCard() {
  return (
    <div className="relative bg-white rounded-[16px] border-2 border-dashed border-gray-300/70 p-4 min-h-[140px] flex flex-col items-center justify-center gap-3">
      <div className="w-8 h-8 rounded-full bg-[#F1F5F9] border border-gray-200 flex items-center justify-center text-gray-400">
        <Plus className="w-4 h-4" />
      </div>
      <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest">
        Lit disponible
      </span>
    </div>
  );
}

function MaintenanceBedCard({ codeLit }: { codeLit: string }) {
  return (
    <div className="relative bg-[#FFFBEB] rounded-[16px] border border-amber-200/80 p-4 min-h-[140px] flex flex-col items-center justify-center gap-2">
      <div className="w-8 h-8 rounded-full bg-amber-100 border border-amber-200 flex items-center justify-center text-amber-700">
        <Wrench className="w-4 h-4" />
      </div>
      <span className="text-[10px] font-extrabold text-amber-800 uppercase tracking-widest text-center">
        Maintenance
      </span>
      <span className="text-[9px] font-bold text-amber-700/80">{codeLit}</span>
    </div>
  );
}

function PatientQuickPreviewPanel({
  selection,
  serviceId,
}: {
  selection: LitSelection | null;
  serviceId: string | null;
}) {
  const router = useRouter();
  if (!selection) {
    return (
      <div className="flex min-h-[380px] flex-col items-center justify-center rounded-[22px] border border-gray-100 bg-white px-6 py-12 text-center shadow-[0px_4px_16px_rgba(17,17,26,0.05)]">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F1F5F9] text-slate-400">
          <User className="h-7 w-7" strokeWidth={1.75} />
        </div>
        <p className="text-[13px] font-extrabold text-gray-700">
          Aperçu rapide
        </p>
        <p className="mt-2 max-w-[240px] text-[11px] font-medium leading-relaxed text-gray-500">
          Cliquez sur une carte lit occupée pour afficher le détail patient.
        </p>
      </div>
    );
  }

  const { chambreNumero, codeLit, hosp, patient } = selection;
  const patientName = formatPatientPanelName(patient, hosp.patientId);
  const diagnostic = hosp.diagnostic ?? hosp.motifHospitalisation;
  const allergies = pickAllergiesText(patient);
  const age = computeAgeYears(undefined, patient);
  const sexe = formatSexeFr(patient);
  const days = dayCountSinceAdmission(hosp.dateEntrer);
  const derniere = pickDerniereIntervention(patient);
  const interventionDisplay = derniere || "Non renseignée";
  const priseEnCharge = pickPriseEnChargeLabel(patient);

  return (
    <div className="flex min-h-[380px] flex-col rounded-[22px] border border-gray-100 bg-white p-5 shadow-[0px_4px_16px_rgba(17,17,26,0.05)] sm:p-6">
      <div className="relative mb-5">
        <button
          type="button"
          className="absolute right-0 top-0 rounded-full bg-[#EEF2F6] px-3.5 py-1.5 text-[9.5px] font-extrabold uppercase tracking-[0.14em] text-gray-600"
        >
          Aperçu rapide
        </button>

        <div className="flex items-start gap-3.5 pr-[120px] pt-0.5">
          <div className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-[14px] bg-[#0EA5E9] text-white shadow-[0_4px_14px_rgba(14,165,233,0.35)]">
            <User className="h-[26px] w-[26px]" strokeWidth={2} />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-[19px] font-black leading-tight tracking-tight text-gray-900">
              {patientName}
            </h2>
            <p className="mt-1 text-[12px] font-semibold text-gray-500">
              Chambre {chambreNumero} · {codeLit}
            </p>
          </div>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3">
        <div className="rounded-[12px] bg-[#F1F5F9] px-3.5 py-3">
          <p className="text-[9px] font-extrabold uppercase tracking-[0.12em] text-gray-500">
            Âge
          </p>
          <p className="mt-1 text-[15px] font-black text-gray-900 tabular-nums">
            {age != null ? `${age} ans` : "—"}
          </p>
        </div>
        <div className="rounded-[12px] bg-[#F1F5F9] px-3.5 py-3">
          <p className="text-[9px] font-extrabold uppercase tracking-[0.12em] text-gray-500">
            Sexe
          </p>
          <p className="mt-1 text-[15px] font-black text-gray-900">{sexe}</p>
        </div>
      </div>

      <div className="mb-5 rounded-[14px] border border-emerald-200/60 bg-[#ECFDF5] px-4 py-3.5">
        <p className="text-[9px] font-extrabold uppercase tracking-[0.14em] text-emerald-800/90">
          Diagnostic principal
        </p>
        <p className="mt-1.5 text-[13px] font-bold leading-snug text-emerald-950">
          {diagnostic || "—"}
        </p>
      </div>

      <div className="mb-5 flex flex-col gap-4 border-b border-gray-100 pb-5">
        <div className="flex gap-3">
          <Calendar
            className="mt-0.5 h-4 w-4 shrink-0 text-gray-400"
            strokeWidth={2}
          />
          <div className="min-w-0 flex-1">
            <p className="text-[9px] font-extrabold uppercase tracking-[0.12em] text-gray-500">
              Dernière intervention
            </p>
            <p className="mt-0.5 text-[12.5px] font-bold text-gray-900">
              {interventionDisplay}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex gap-3">
            <Calendar
              className="mt-0.5 h-4 w-4 shrink-0 text-gray-400"
              strokeWidth={2}
            />
            <div className="min-w-0">
              <p className="text-[9px] font-extrabold uppercase tracking-[0.12em] text-gray-500">
                Date d&apos;entrée
              </p>
              <p className="mt-0.5 text-[12.5px] font-bold text-gray-900">
                {formatDateFrLong(hosp.dateEntrer)}
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <Clock
              className="mt-0.5 h-4 w-4 shrink-0 text-gray-400"
              strokeWidth={2}
            />
            <div className="min-w-0">
              <p className="text-[9px] font-extrabold uppercase tracking-[0.12em] text-gray-500">
                Prise en charge
              </p>
              <p className="mt-0.5 text-[12.5px] font-bold text-gray-900">
                {priseEnCharge}
              </p>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <AlertTriangle
            className="mt-0.5 h-4 w-4 shrink-0 text-amber-500"
            strokeWidth={2}
          />
          <div className="min-w-0 flex-1">
            <p className="text-[9px] font-extrabold uppercase tracking-[0.12em] text-amber-600">
              Allergies
            </p>
            <p className="mt-0.5 text-[13px] font-bold text-amber-700">
              {allergies || "Aucune connue"}
            </p>
          </div>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4">
        <div>
          <p className="text-[20px] font-black leading-none tracking-tight text-gray-900">
            <span className="tabular-nums">
              {String(Math.max(0, days)).padStart(2, "0")}
            </span>{" "}
            <span className="text-[11px] font-extrabold uppercase text-gray-800">
              jours
            </span>
          </p>
          <p className="mt-1.5 text-[10px] font-semibold text-gray-500">
            d&apos;hospitalisation
          </p>
        </div>
        <div>
          <p className="text-[20px] font-black leading-none tracking-tight text-gray-900">
            JOUR <span className="tabular-nums">0</span>
          </p>
          <p className="mt-1.5 text-[10px] font-semibold text-gray-500">
            post opératoire
          </p>
        </div>
      </div>

      <div className="mt-auto grid grid-cols-2 gap-3">
        <button
          type="button"
          className="rounded-[12px] bg-[#F1F5F9] py-3 text-center text-[11.5px] font-extrabold text-gray-700 transition-colors hover:bg-[#E2E8F0]"
        >
          Traitement
        </button>
        <button
          type="button"
          className="rounded-[12px] bg-[#F1F5F9] py-3 text-center text-[11.5px] font-extrabold text-gray-700 transition-colors hover:bg-[#E2E8F0]"
          onClick={(e) => {
            e.stopPropagation();
            const { hosp, patient, chambreNumero, codeLit } = selection;
            writeDossierPatientPrefill(hosp.patientId, {
              hospitalisationId: hosp.id,
              serviceId: serviceId ?? undefined,
              chambreNumero,
              codeLit,
              patient,
            });
            const qs = new URLSearchParams();
            if (serviceId) qs.set("serviceId", serviceId);
            if (hosp.id) qs.set("hospitalisationId", hosp.id);
            const q = qs.toString();
            router.push(
              `/modules/clinical/patients/${encodeURIComponent(hosp.patientId)}/dossier${q ? `?${q}` : ""}`,
            );
          }}
        >
          Voir dossier
        </button>
      </div>
    </div>
  );
}

function renderLitCell(
  lit: PlanLitBed,
  chambreNumero: number,
  selection: LitSelection | null,
  onSelectOccupied: (s: LitSelection) => void,
) {
  if (lit.statut === "MAINTENANCE") {
    return <MaintenanceBedCard codeLit={lit.codeLit} />;
  }

  const hosp = lit.hospitalisation;
  const isOccupe = lit.statut === "OCCUPE" && hosp;

  if (!isOccupe) {
    return <AvailableBedCard />;
  }

  const patient = hosp.patient ?? null;
  const allergies = pickAllergiesText(patient);
  const days = dayCountSinceAdmission(hosp.dateEntrer);
  const soins =
    hosp.soinsCount === 1 ? "1 soin" : `${hosp.soinsCount} soins`;

  return (
    <BedCard
      litCode={lit.codeLit}
      patientName={formatPlanPatientDisplay(patient, hosp.patientId)}
      diagnostic={hosp.diagnostic ?? hosp.motifHospitalisation}
      allergies={allergies}
      allergiesLabel={Boolean(allergies)}
      traitements={soins}
      joursEntree={`J+${days}`}
      colorAccent={accentForBed(lit)}
      ribbonText={resolveRibbonText(patient, hosp.motifHospitalisation)}
      isSelected={selection?.litId === lit.litId}
      onSelect={() =>
        onSelectOccupied({
          litId: lit.litId,
          chambreNumero,
          codeLit: lit.codeLit,
          hosp,
          patient,
        })
      }
    />
  );
}

export default function GestionPatientsPage() {
  const searchParams = useSearchParams();
  const [vue, setVue] = useState<"plan" | "liste">("plan");
  const [plan, setPlan] = useState<PlanLitsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selection, setSelection] = useState<LitSelection | null>(null);

  const serviceId = useMemo(() => {
    const fromQuery = trimServiceId(searchParams.get("serviceId"));
    if (fromQuery) return fromQuery;
    return (
      getClinicalServiceIdFromBrowser() ?? DEFAULT_CLINICAL_SERVICE_ID
    );
  }, [searchParams]);

  const loadPlan = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await hospitalisationApi.getBedPlan(serviceId);
      const data = res.data;
      setPlan(data);
      setSelection((prev) => {
        if (!prev || !data) return null;
        for (const c of data.chambres) {
          const lit = c.lits.find((l) => l.litId === prev.litId);
          if (lit?.hospitalisation) {
            return {
              litId: lit.litId,
              chambreNumero: c.numeroChambre,
              codeLit: lit.codeLit,
              hosp: lit.hospitalisation,
              patient: lit.hospitalisation.patient ?? null,
            };
          }
        }
        return null;
      });
    } catch {
      setPlan(null);
      setSelection(null);
      setError(
        "Impossible de charger le plan des lits. Vérifiez la session et l’API hospitalisation.",
      );
    } finally {
      setLoading(false);
    }
  }, [serviceId]);

  useEffect(() => {
    void loadPlan();
  }, [loadPlan]);

  const capacitePct = useMemo(() => {
    if (!plan || plan.stats.totalLits <= 0) return 0;
    return Math.round((plan.stats.litsOccupes / plan.stats.totalLits) * 100);
  }, [plan]);

  const listeRows = useMemo(() => {
    if (!plan) return [];
    const rows: {
      litId: string;
      chambreNumero: number;
      lit: string;
      patient: string;
      motif: string;
      hosp: PlanLitHospitalisation;
      patientObj: Record<string, unknown> | null;
    }[] = [];
    for (const c of plan.chambres) {
      for (const l of c.lits) {
        const h = l.hospitalisation;
        if (!h || l.statut !== "OCCUPE") continue;
        rows.push({
          litId: l.litId,
          chambreNumero: c.numeroChambre,
          lit: l.codeLit,
          patient: formatPlanPatientDisplay(h.patient ?? null, h.patientId),
          motif: h.motifHospitalisation,
          hosp: h,
          patientObj: h.patient ?? null,
        });
      }
    }
    return rows;
  }, [plan]);

  return (
    <main className="p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-[22px] sm:text-[26px] font-extrabold text-gray-900 leading-tight tracking-tight">
          Gestion des Patients
        </h1>
        <p className="text-[12px] sm:text-[14px] text-gray-500 mt-1 font-medium">
          Plan des lits · service{" "}
          <span className="font-mono text-gray-700">{serviceId}</span>
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-[14px] border border-red-200 bg-red-50 px-4 py-3 text-[12px] font-semibold text-red-800">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_minmax(300px,380px)] gap-8">
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-1 bg-white rounded-[14px] p-1 border border-gray-100 shadow-sm w-fit">
              <button
                type="button"
                onClick={() => setVue("plan")}
                className={
                  vue === "plan"
                    ? "flex items-center gap-2 bg-white text-gray-900 font-extrabold text-[12px] px-4 py-2 rounded-[10px] shadow-sm border border-gray-100"
                    : "text-gray-500 font-bold text-[12px] px-4 py-2 rounded-[10px] hover:bg-gray-50 transition-colors"
                }
              >
                <svg
                  className="w-3.5 h-3.5 text-gray-600"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  viewBox="0 0 24 24"
                >
                  <rect x="3" y="3" width="7" height="7" rx="1" />
                  <rect x="14" y="3" width="7" height="7" rx="1" />
                  <rect x="3" y="14" width="7" height="7" rx="1" />
                  <rect x="14" y="14" width="7" height="7" rx="1" />
                </svg>
                Plan des lits
              </button>
              <button
                type="button"
                onClick={() => setVue("liste")}
                className={
                  vue === "liste"
                    ? "flex items-center gap-2 bg-white text-gray-900 font-extrabold text-[12px] px-4 py-2 rounded-[10px] shadow-sm border border-gray-100"
                    : "text-gray-500 font-bold text-[12px] px-4 py-2 rounded-[10px] hover:bg-gray-50 transition-colors"
                }
              >
                Liste
              </button>
            </div>

            <div className="flex items-center gap-5">
              <LegendDot dotColor={DOT_STABLE} label="Stable" />
              <LegendDot dotColor={DOT_SURVEILLANCE} label="Surveillance" />
              <LegendDot dotColor={DOT_CRITIQUE} label="Critique" />
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-2 rounded-[22px] border border-gray-100 bg-white py-16 text-[13px] font-semibold text-gray-500 shadow-sm">
              <Loader2 className="h-5 w-5 animate-spin text-[#006A8C]" />
              Chargement du plan des lits…
            </div>
          ) : vue === "liste" ? (
            <div className="bg-white rounded-[22px] border border-gray-100 shadow-[0px_4px_16px_rgba(17,17,26,0.05)] overflow-hidden">
              {listeRows.length === 0 ? (
                <p className="p-6 text-[13px] font-medium text-gray-500">
                  Aucune hospitalisation avec lit occupé pour ce service.
                </p>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {listeRows.map((row) => (
                    <li
                      key={row.litId}
                      role="button"
                      tabIndex={0}
                      onClick={() =>
                        setSelection({
                          litId: row.litId,
                          chambreNumero: row.chambreNumero,
                          codeLit: row.lit,
                          hosp: row.hosp,
                          patient: row.patientObj,
                        })
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setSelection({
                            litId: row.litId,
                            chambreNumero: row.chambreNumero,
                            codeLit: row.lit,
                            hosp: row.hosp,
                            patient: row.patientObj,
                          });
                        }
                      }}
                      className={cn(
                        "px-5 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 cursor-pointer outline-none transition-colors hover:bg-slate-50/90",
                        selection?.litId === row.litId &&
                          "bg-sky-50/80 ring-1 ring-inset ring-sky-200/80",
                      )}
                    >
                      <span className="text-[12px] font-extrabold text-gray-900">
                        {row.patient}
                      </span>
                      <span className="text-[11px] font-semibold text-gray-500">
                        Ch. {row.chambreNumero} · {row.lit}
                      </span>
                      <span className="text-[11px] font-medium text-gray-600 sm:text-right sm:max-w-[45%]">
                        {row.motif}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : !plan || plan.chambres.length === 0 ? (
            <div className="rounded-[22px] border border-dashed border-gray-200 bg-white p-8 text-center text-[13px] font-medium text-gray-500">
              Aucune chambre enregistrée pour ce service.
            </div>
          ) : (
            plan.chambres.map((chambre: PlanLitRoom) => (
              <div
                key={chambre.chambreId}
                className="bg-white rounded-[22px] border border-gray-100 shadow-[0px_4px_16px_rgba(17,17,26,0.05)] p-5 sm:p-6"
              >
                <div className="flex items-center gap-2 text-gray-400 text-[10px] font-extrabold uppercase tracking-[0.2em] mb-5">
                  <BedDouble className="w-3.5 h-3.5 shrink-0" />
                  <span>CHAMBRE {chambre.numeroChambre}</span>
                  {chambre.type ? (
                    <span className="font-bold normal-case tracking-normal text-gray-400">
                      · {chambre.type}
                    </span>
                  ) : null}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {chambre.lits.map((lit) => (
                    <div key={lit.litId}>
                      {renderLitCell(
                        lit,
                        chambre.numeroChambre,
                        selection,
                        setSelection,
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="space-y-5">
          <PatientQuickPreviewPanel
            selection={selection}
            serviceId={serviceId}
          />

          <div
            className="rounded-[22px] text-white p-6 relative overflow-hidden"
            style={{
              background: "linear-gradient(135deg, #0B6B58 0%, #0d7a65 100%)",
            }}
          >
            <div
              className="absolute -right-10 -top-10 w-[140px] h-[140px] rounded-full bg-white/10"
              aria-hidden
            />
            <div
              className="absolute -right-4 top-16 w-[80px] h-[80px] rounded-full bg-white/5"
              aria-hidden
            />

            <div className="relative">
              <p className="text-[12px] font-extrabold text-white/80 mb-3 uppercase tracking-wider">
                Résumé du Service
              </p>
              <div className="flex items-baseline gap-3 mb-5">
                <span className="text-[32px] font-black tracking-tight leading-none">
                  {plan?.stats.totalPatients ?? "—"}
                </span>
                <span className="text-[11px] font-bold text-white/80">
                  Patients hospitalisés
                </span>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-white/80">
                    Capacité Lits
                  </span>
                  <span className="text-[11px] font-extrabold text-white">
                    {plan && plan.stats.totalLits > 0
                      ? `${capacitePct}%`
                      : "—"}
                  </span>
                </div>
                <div className="w-full h-[6px] rounded-full bg-white/20 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[#34D399] transition-all"
                    style={{
                      width:
                        plan && plan.stats.totalLits > 0
                          ? `${capacitePct}%`
                          : "0%",
                    }}
                  />
                </div>
                <p className="text-[10px] font-bold text-white/70 pt-1">
                  {plan
                    ? `${plan.stats.litsOccupes} occupés / ${plan.stats.totalLits} lits`
                    : loading
                      ? "…"
                      : "—"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
