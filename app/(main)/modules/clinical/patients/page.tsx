"use client";

import {
  AlertTriangle,
  BedDouble,
  Calendar,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Filter,
  Plus,
  Search,
  User,
  Wrench,
} from "lucide-react";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  hospitalisationApi,
  type PlanLitBed,
  type PlanLitHospitalisation,
  type PlanLitsResponse,
  type PlanLitRoom,
} from "@/lib/api/instances/hospitalisation";
import { getHospitalizedPatients } from "../services/dashboard";
import type { HospitalizedPatient } from "../types";
import { DEFAULT_CLINICAL_SERVICE_ID } from "@/lib/auth/constants";
import { getClinicalServiceIdFromBrowser } from "@/lib/auth/mock-auth-browser";
import { cn } from "@/lib/utils";
import { writeDossierPatientPrefill } from "@/lib/clinical/dossier-patient-prefill";

const DOT_STABLE = "#006A8C";
const DOT_SURVEILLANCE = "#F59E0B";
const DOT_CRITIQUE = "#E11D48";
const DEFAULT_LIST_LIMIT = 200;

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
  chambreNumero: number | null;
  codeLit: string | null;
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

function formatDateSplit(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { dayMonth: "—", year: "" };
  const day = d.getDate().toString().padStart(2, "0");
  const month = d.toLocaleDateString("fr-FR", { month: "long" });
  const capitalizedMonth = month.charAt(0).toUpperCase() + month.slice(1);
  return {
    dayMonth: `${day} ${capitalizedMonth}`,
    year: d.getFullYear().toString(),
  };
}

function getPatientStatusInfo(id: string) {
  const charCode = id.charCodeAt(id.length - 1) || 0;
  if (charCode % 3 === 0) {
    return { label: "Critique", dot: DOT_CRITIQUE, bg: "bg-rose-50", text: "text-rose-700" };
  } else if (charCode % 3 === 1) {
    return { label: "Surveillance", dot: DOT_SURVEILLANCE, bg: "bg-amber-50", text: "text-amber-700" };
  }
  return { label: "Stable", dot: DOT_STABLE, bg: "transparent", text: "text-slate-600" };
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

/** Ruban affiché seulement si le patient a une prise en charge. */
function resolveRibbonText(
  patient: Record<string, unknown> | null,
): string {
  if (!patient) return "";
  const label = pickPriseEnChargeLabel(patient);
  if (!label || label === "—") return "";
  
  const cleanLabel = label.trim();
  return cleanLabel.length <= 10
    ? cleanLabel.toUpperCase()
    : `${cleanLabel.slice(0, 8).toUpperCase()}…`;
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

      <div className="flex items-center gap-1.5 mb-3 mt-3">
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
  const bedLabel = chambreNumero != null && codeLit
    ? `Chambre ${chambreNumero} · ${codeLit}`
    : chambreNumero != null
      ? `Chambre ${chambreNumero}`
      : codeLit
        ? `Lit ${codeLit}`
        : "Non attribue";
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
              {bedLabel}
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
          className="rounded-[12px] bg-[#F1F5F9] cursor-pointer py-3 text-center text-[11.5px] font-extrabold text-gray-700 transition-colors hover:bg-[#E2E8F0]"
        >
          Traitement
        </button>
        <button
          type="button"
          className="rounded-[12px] bg-[#F1F5F9] cursor-pointer py-3 text-center text-[11.5px] font-extrabold text-gray-700 transition-colors hover:bg-[#E2E8F0]"
          onClick={(e) => {
            e.stopPropagation();
            const { hosp, patient, chambreNumero, codeLit } = selection;
            writeDossierPatientPrefill(hosp.patientId, {
              hospitalisationId: hosp.id,
              serviceId: serviceId ?? undefined,
              chambreNumero: chambreNumero ?? undefined,
              codeLit: codeLit ?? undefined,
              patient,
            });
            const qs = new URLSearchParams();
            if (serviceId) qs.set("serviceId", serviceId);
            if (hosp.id) qs.set("hospitalisationId", hosp.id);
            const q = qs.toString();
            router.push(
              `/modules/patient/${encodeURIComponent(hosp.patientId)}/dossier${q ? `?${q}` : ""}`,
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
      ribbonText={resolveRibbonText(patient)}
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

function GestionPatientsPageContent() {
  const searchParams = useSearchParams();
  const [vue, setVue] = useState<"plan" | "liste">("plan");
  const [plan, setPlan] = useState<PlanLitsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selection, setSelection] = useState<LitSelection | null>(null);
  const [hospitalisations, setHospitalisations] = useState<HospitalizedPatient[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [itemsPerPage, setItemsPerPage] = useState(6);
  const [currentPage, setCurrentPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [dateStart, setDateStart] = useState("");
  const [dateEnd, setDateEnd] = useState("");
  const [bedFilter, setBedFilter] = useState<"all" | "assigned" | "unassigned">("all");

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

  const loadHospitalisations = useCallback(async () => {
    setListLoading(true);
    setListError(null);
    try {
      const data = await getHospitalizedPatients(DEFAULT_LIST_LIMIT);
      setHospitalisations(Array.isArray(data) ? data : []);
    } catch {
      setHospitalisations([]);
      setListError("Impossible de charger la liste des patients.");
    } finally {
      setListLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPlan();
  }, [loadPlan]);

  useEffect(() => {
    void loadHospitalisations();
  }, [loadHospitalisations]);

  const capacitePct = useMemo(() => {
    if (!plan || plan.stats.totalLits <= 0) return 0;
    return Math.round((plan.stats.litsOccupes / plan.stats.totalLits) * 100);
  }, [plan]);

  const listeRows = useMemo(() => {
    const targetServiceId = serviceId?.trim();
    if (!hospitalisations.length) return [];
    return hospitalisations
      .filter((item) => !targetServiceId || item.serviceId === targetServiceId)
      .map((item) => {
        const patientObj = (item.patient ?? null) as Record<string, unknown> | null;
        const isAssigned = item.chambreNumero != null || Boolean(item.litCode);
        const bedLabel = item.chambreNumero != null && item.litCode
          ? `Chambre ${item.chambreNumero} · Lit ${item.litCode}`
          : item.chambreNumero != null
            ? `Chambre ${item.chambreNumero}`
            : item.litCode
              ? `Lit ${item.litCode}`
              : "Non attribue";
        const bedStatusLabel = isAssigned ? "Attribue" : "Non attribue";
        const hosp: PlanLitHospitalisation = {
          id: item.id,
          patientId: item.patientId,
          dateEntrer: item.dateEntrer,
          motifHospitalisation: item.motifHospitalisation,
          statutHospitalisation: item.statutHospitalisation,
          diagnostic: null,
          soinsCount: 0,
          patient: patientObj,
        };

        return {
          rowId: item.id,
          chambreNumero: item.chambreNumero ?? null,
          lit: item.litCode ?? null,
          bedLabel,
          bedStatusLabel,
          isAssigned,
          patient: formatPlanPatientDisplay(patientObj, item.patientId),
          motif: item.motifHospitalisation,
          hosp,
          patientObj,
          age: computeAgeYears(undefined, patientObj),
          sexe: formatSexeFr(patientObj),
          dateEntree: item.dateEntrer,
          statusInfo: getPatientStatusInfo(item.patientId),
          dateSplit: formatDateSplit(item.dateEntrer),
        };
      });
  }, [hospitalisations, serviceId]);

  const filteredRows = useMemo(() => {
    return listeRows.filter((row) => {
      const q = searchQuery.toLowerCase();
      const matchSearch =
        !q ||
        row.patient.toLowerCase().includes(q) ||
        (row.lit ?? "").toLowerCase().includes(q) ||
        (row.chambreNumero != null ? String(row.chambreNumero) : "").includes(q) ||
        (row.motif && row.motif.toLowerCase().includes(q)) ||
        row.statusInfo.label.toLowerCase().includes(q) ||
        row.bedStatusLabel.toLowerCase().includes(q) ||
        row.dateSplit.dayMonth.toLowerCase().includes(q) ||
        row.dateSplit.year.includes(q);

      const matchBed =
        bedFilter === "all" ||
        (bedFilter === "assigned" ? row.isAssigned : !row.isAssigned);

      let matchDate = true;
      if (dateStart || dateEnd) {
        const rowDate = new Date(row.dateEntree).getTime();
        if (dateStart) {
          const start = new Date(dateStart).getTime();
          if (rowDate < start) matchDate = false;
        }
        if (dateEnd) {
          const end = new Date(dateEnd);
          end.setHours(23, 59, 59, 999);
          if (rowDate > end.getTime()) matchDate = false;
        }
      }

      return matchSearch && matchDate && matchBed;
    });
  }, [listeRows, searchQuery, dateStart, dateEnd, bedFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / itemsPerPage));
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredRows.slice(start, start + itemsPerPage);
  }, [filteredRows, currentPage, itemsPerPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, dateStart, dateEnd, itemsPerPage, bedFilter]);

  return (
    <main className="p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-[22px] sm:text-[26px] font-extrabold text-gray-900 leading-tight tracking-tight">
          Gestion des Patients
        </h1>
        <p className="text-[12px] sm:text-[14px] text-gray-500 mt-1 font-medium">
          {vue === "liste" ? "Liste des patients" : "Plan des lits"} · service{" "}
          <span className="font-mono text-gray-700">{serviceId}</span>
        </p>
      </div>

      {error && vue === "plan" && (
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
                className={cn(
                  "flex cursor-pointer items-center justify-center gap-2 text-[12px] px-4 py-2 rounded-[10px] border transition-colors outline-none",
                  vue === "plan"
                    ? "bg-white text-gray-900 font-extrabold shadow-sm border-gray-100"
                    : "text-gray-500 font-bold hover:bg-gray-50 border-transparent"
                )}
              >
                <svg
                  className={cn("w-3.5 h-3.5", vue === "plan" ? "text-gray-800" : "text-gray-400")}
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
                className={cn(
                  "flex cursor-pointer items-center justify-center gap-2 text-[12px] px-4 py-2 rounded-[10px] border transition-colors outline-none",
                  vue === "liste"
                    ? "bg-white text-gray-900 font-extrabold shadow-sm border-gray-100"
                    : "text-gray-500 font-bold hover:bg-gray-50 border-transparent"
                )}
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

          {vue === "liste" ? (
            <>
              {listLoading ? (
                <div className="bg-white rounded-[22px] border border-gray-100 shadow-[0px_4px_16px_rgba(17,17,26,0.05)] p-6 animate-pulse">
                  <div className="h-4 w-40 bg-gray-200 rounded mb-4" />
                  <div className="space-y-3">
                    {[1, 2, 3].map((row) => (
                      <div key={row} className="h-12 bg-gray-100 rounded" />
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {listError && (
                    <div className="rounded-[14px] border border-amber-200 bg-amber-50 px-4 py-3 text-[12px] font-semibold text-amber-800">
                      {listError}
                    </div>
                  )}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <div className="relative flex-1 sm:w-[360px]">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Recherche (nom, chambre, diagnostic, statut...)"
                      className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200/80 rounded-[12px] text-[13px] font-semibold text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#006A8C]/20 focus:border-[#006A8C] transition-all shadow-sm"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowFilters(!showFilters)}
                    className={cn(
                      "flex items-center cursor-pointer gap-2 px-4 py-2.5 border rounded-[12px] text-[13px] font-bold transition-colors shadow-sm",
                      showFilters ? "bg-sky-50 border-sky-200 text-sky-700" : "bg-white border-gray-200/80 text-gray-700 hover:bg-gray-50"
                    )}
                  >
                    <Filter className="w-4 h-4" />
                    <span className="hidden sm:inline">Filtres</span>
                  </button>
                </div>

                <div className="flex items-center gap-2 text-[12px] font-bold text-gray-600">
                  <span>Afficher :</span>
                  <select
                    value={itemsPerPage}
                    onChange={(e) => setItemsPerPage(Number(e.target.value))}
                    className="bg-white cursor-pointer border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                  >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={30}>30</option>
                  </select>
                </div>
              </div>

              {showFilters && (
                <div className="bg-white p-4 rounded-[16px] border border-gray-100 shadow-sm flex flex-col sm:flex-row gap-4 items-end animate-in fade-in slide-in-from-top-2">
                  <div className="flex-1 w-full">
                    <label className="block text-[11px] font-extrabold text-gray-500 uppercase tracking-wider mb-1.5">Date d&apos;entrée (Depuis)</label>
                    <input
                      type="date"
                      value={dateStart}
                      onChange={(e) => setDateStart(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-[10px] text-[13px] font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#006A8C]/20 focus:border-[#006A8C]"
                    />
                  </div>
                  <div className="flex-1 w-full">
                    <label className="block text-[11px] font-extrabold text-gray-500 uppercase tracking-wider mb-1.5">Date d&apos;entrée (Jusqu&apos;au)</label>
                    <input
                      type="date"
                      value={dateEnd}
                      onChange={(e) => setDateEnd(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-[10px] text-[13px] font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#006A8C]/20 focus:border-[#006A8C]"
                    />
                  </div>
                  <div className="flex-1 w-full">
                    <label className="block text-[11px] font-extrabold text-gray-500 uppercase tracking-wider mb-1.5">Attribution lit</label>
                    <select
                      value={bedFilter}
                      onChange={(e) => setBedFilter(e.target.value as "all" | "assigned" | "unassigned")}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-[10px] text-[13px] font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#006A8C]/20 focus:border-[#006A8C]"
                    >
                      <option value="all">Tous</option>
                      <option value="assigned">Attribues</option>
                      <option value="unassigned">Non attribues</option>
                    </select>
                  </div>
                  {(dateStart || dateEnd || bedFilter !== "all") && (
                    <button
                      onClick={() => { setDateStart(""); setDateEnd(""); setBedFilter("all"); }}
                      className="px-4 py-2 text-[12px] font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-[10px] transition-colors h-[38px]"
                    >
                      Effacer
                    </button>
                  )}
                </div>
              )}

              <div className="bg-white rounded-[22px] border border-gray-100 shadow-[0px_4px_16px_rgba(17,17,26,0.05)] overflow-hidden">
                {filteredRows.length === 0 ? (
                  <p className="p-6 text-[13px] text-center font-medium text-gray-500">
                    Aucun patient correspondant pour ce service.
                  </p>
                ) : (
                  <div>
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-gray-100">
                          <th className="px-6 py-4 text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">
                            Lits / Chambre
                          </th>
                          <th className="px-6 py-4 text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">
                            Nom du patient
                          </th>
                          <th className="px-6 py-4 text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">
                            Diagnostic
                          </th>
                          <th className="px-6 py-4">
                            <div className="flex items-center gap-1.5 cursor-pointer group">
                              <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider group-hover:text-gray-600 transition-colors">Date d&apos;entrée</span>
                              <ChevronDown className="w-3.5 h-3.5 text-gray-400 group-hover:text-gray-600 transition-colors" />
                            </div>
                          </th>
                          <th className="px-6 py-4 text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">
                            Statut
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {paginatedRows.map((row) => (
                          <tr
                            key={row.rowId}
                            role="button"
                            tabIndex={0}
                            onClick={() =>
                              setSelection({
                                litId: row.rowId,
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
                                  litId: row.rowId,
                                  chambreNumero: row.chambreNumero,
                                  codeLit: row.lit,
                                  hosp: row.hosp,
                                  patient: row.patientObj,
                                });
                              }
                            }}
                            className={cn(
                              "group outline-none transition-colors hover:bg-slate-50/60 cursor-pointer",
                              selection?.litId === row.rowId &&
                              "bg-sky-50/40 relative after:absolute after:left-0 after:top-0 after:bottom-0 after:w-1 after:bg-[#0EA5E9]"
                            )}
                          >
                            <td className="px-6 py-4 align-top">
                              <div className="bg-[#F8FAFC] border border-gray-100 rounded-[10px] px-3 py-2.5 flex flex-col items-start justify-center w-[120px] shadow-sm group-hover:border-gray-200 transition-colors">
                                <span className="text-[10px] font-black text-gray-800 leading-none">
                                  {row.bedLabel}
                                </span>
                                <span
                                  className={cn(
                                    "mt-1 inline-flex items-center rounded-full px-2 py-0.5 text-[8px] font-extrabold uppercase tracking-wide",
                                    row.isAssigned
                                      ? "bg-emerald-50 text-emerald-700"
                                      : "bg-amber-50 text-amber-700"
                                  )}
                                >
                                  {row.bedStatusLabel}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4 align-top">
                              <p className="text-[13px] font-black text-gray-900 leading-tight">
                                {row.patient}
                              </p>
                              <p className="text-[10px] font-extrabold text-gray-400 uppercase mt-1 tracking-wider">
                                {row.age != null ? `${row.age} ANS` : "—"} • {row.sexe}
                              </p>
                            </td>
                            <td className="px-6 py-4 align-top">
                              <div className="max-w-[160px]">
                                <p className="text-[12px] font-bold text-gray-600 leading-snug">
                                  {row.motif || "—"}
                                </p>
                              </div>
                            </td>
                            <td className="px-6 py-4 align-top">
                              <p className="text-[12px] font-black text-gray-800 leading-tight">
                                {row.dateSplit.dayMonth}
                              </p>
                              <p className="text-[11px] font-extrabold text-gray-500 mt-0.5">
                                {row.dateSplit.year}
                              </p>
                            </td>
                            <td className="px-6 py-4 align-top">
                              <div
                                className={cn(
                                  "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[8px]",
                                  row.statusInfo.bg
                                )}
                              >
                                <div
                                  className="w-1.5 h-1.5 rounded-full"
                                  style={{ backgroundColor: row.statusInfo.dot }}
                                />
                                <span
                                  className={cn(
                                    "text-[11px] font-extrabold",
                                    row.statusInfo.text
                                  )}
                                >
                                  {row.statusInfo.label}
                                </span>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    <div className="px-6 py-5 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white">
                      <span className="text-[11px] font-bold text-gray-500">
                        Affichage de <span className="text-gray-900 font-black">{filteredRows.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}</span> à <span className="text-gray-900 font-black">{Math.min(filteredRows.length, currentPage * itemsPerPage)}</span> sur <span className="text-gray-900 font-black">{filteredRows.length}</span> résultats
                      </span>
                      {totalPages > 1 && (
                        <div className="flex items-center gap-1">
                          <button
                            disabled={currentPage === 1}
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                            className="w-7 h-7 flex items-center justify-center text-gray-400 hover:bg-gray-50 rounded-[8px] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <ChevronLeft className="w-4 h-4" />
                          </button>

                          {Array.from({ length: totalPages }).map((_, idx) => {
                            const pageNumber = idx + 1;
                            if (
                              pageNumber === 1 ||
                              pageNumber === totalPages ||
                              (pageNumber >= currentPage - 1 && pageNumber <= currentPage + 1)
                            ) {
                              return (
                                <button
                                  key={pageNumber}
                                  onClick={() => setCurrentPage(pageNumber)}
                                  className={cn(
                                    "w-7 h-7 flex items-center justify-center text-[11px] font-black rounded-[8px] transition-colors",
                                    currentPage === pageNumber
                                      ? "bg-[#0B7DB3] text-white shadow-sm"
                                      : "text-gray-600 hover:bg-gray-50"
                                  )}
                                >
                                  {pageNumber}
                                </button>
                              );
                            } else if (
                              pageNumber === currentPage - 2 ||
                              pageNumber === currentPage + 2
                            ) {
                              return <span key={pageNumber} className="text-gray-400 text-xs px-1">...</span>;
                            }
                            return null;
                          })}

                          <button
                            disabled={currentPage === totalPages}
                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                            className="w-7 h-7 flex items-center justify-center text-gray-400 hover:bg-gray-50 rounded-[8px] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
                </div>
              )}
            </>
          ) : loading ? (
            <div className="space-y-6">
              {[1, 2].map((roomIndex) => (
                <div
                  key={roomIndex}
                  className="bg-white rounded-[22px] border border-gray-100 shadow-[0px_4px_16px_rgba(17,17,26,0.05)] p-5 sm:p-6"
                >
                  <div className="flex items-center gap-2 mb-5 animate-pulse">
                    <div className="w-3.5 h-3.5 bg-gray-200 rounded" />
                    <div className="h-3 w-24 bg-gray-200 rounded" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {[1, 2, 3].map((bedIndex) => (
                      <div
                        key={bedIndex}
                        className="relative bg-white rounded-[16px] border border-gray-100 shadow-sm p-4 min-h-[140px] flex flex-col justify-between animate-pulse"
                      >
                        <div className="mb-2">
                          <div className="h-5 w-12 bg-gray-200 rounded-[6px]" />
                        </div>
                        <div className="space-y-3">
                          <div className="h-3.5 w-3/4 bg-gray-200 rounded" />
                          <div className="h-2.5 w-1/2 bg-gray-100 rounded" />
                        </div>
                        <div className="flex items-center gap-2 mt-4 pt-3 border-t border-gray-50">
                          <div className="h-3 w-3 bg-gray-200 rounded-full" />
                          <div className="h-2.5 w-20 bg-gray-100 rounded" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
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

export default function GestionPatientsPage() {
  return (
    <Suspense
      fallback={
        <main className="p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto">
          <div className="animate-pulse rounded-[22px] border border-gray-100 bg-white p-6">
            Chargement de la page des patients...
          </div>
        </main>
      }
    >
      <GestionPatientsPageContent />
    </Suspense>
  );
}
