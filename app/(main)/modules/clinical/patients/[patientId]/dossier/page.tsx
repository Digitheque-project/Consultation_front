"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { ehr } from "@/lib/clinical/ehr-theme";
import { readDossierPatientPrefill } from "@/lib/clinical/dossier-patient-prefill";
import {
  ObservationForm,
  type ObservationPatientInfo,
} from "@/components/clinical/dossier-patient/ObservationForm";
import { cn } from "@/lib/utils";

const TABS = [
  { key: "observation", label: "Observation médical" },
  { key: "diagnostic", label: "Diagnostic" },
  { key: "prescription", label: "Prescription" },
  { key: "suivi", label: "Suivi / Évolution" },
  { key: "cr_operatoire", label: "Compte-rendu opératoire" },
  { key: "resultats", label: "Résultats paracliniques" },
  { key: "sortie", label: "Sortie" },
  { key: "historique", label: "Historique" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

function pickStr(
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

function formatSexeCourtesy(
  patient: Record<string, unknown> | null | undefined,
): string {
  const raw = pickStr(patient, ["sexe", "gender", "civilite"]);
  if (raw === "M" || raw?.toLowerCase() === "masculin") return "M.";
  if (raw === "F" || raw?.toLowerCase() === "féminin" || raw?.toLowerCase() === "feminin")
    return "Mme";
  return "";
}

function computeAgeYears(
  patient: Record<string, unknown> | null | undefined,
): number | null {
  const raw =
    pickStr(patient, ["dateNaissance", "birthDate", "date_naissance"]) ?? "";
  if (!raw) return null;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return null;
  const diff = Date.now() - d.getTime();
  return Math.max(0, Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000)));
}

function pickAllergiesText(
  patient: Record<string, unknown> | null | undefined,
): string | undefined {
  if (!patient) return undefined;
  const direct = pickStr(patient, ["allergies", "allergie", "allergiesTexte"]);
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

function toObservationPatientInfo(
  patient: Record<string, unknown> | null | undefined,
): ObservationPatientInfo | null {
  if (!patient) return null;
  const nom = pickStr(patient, ["nom", "lastName", "familyName", "name"]) ?? "";
  const prenom =
    pickStr(patient, ["prenom", "firstName", "givenName"]) ?? "";
  if (!nom.trim() && !prenom.trim()) return null;
  const sexeRaw = pickStr(patient, ["sexe", "gender"]);
  const sexe =
    sexeRaw === "M"
      ? "Masculin"
      : sexeRaw === "F"
        ? "Féminin"
        : (sexeRaw ?? "");
  return {
    nom,
    prenom,
    dateNaissance:
      pickStr(patient, ["dateNaissance", "birthDate", "date_naissance"]) ?? "",
    adresse: pickStr(patient, ["adresse", "address"]) ?? "",
    sexe,
    profession: pickStr(patient, ["profession", "job"]) ?? "",
    contact: pickStr(patient, ["contact", "phone", "telephone", "tel"]) ?? "",
    contactUrgence:
      pickStr(patient, ["contactUrgence", "contact_urgence", "urgence"]) ?? "",
  };
}

export default function DossierPatientDetailPage() {
  const params = useParams<{ patientId: string }>();
  const searchParams = useSearchParams();
  const patientId = params.patientId ?? "";

  const [activeTab, setActiveTab] = useState<TabKey>("observation");

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab && TABS.some((t) => t.key === tab)) {
      setActiveTab(tab as TabKey);
    }
  }, [searchParams]);

  const selectTab = useCallback(
    (key: TabKey) => {
      setActiveTab(key);
      if (typeof globalThis.window === "undefined") return;
      const url = new URL(globalThis.window.location.href);
      url.searchParams.set("tab", key);
      globalThis.window.history.replaceState({}, "", url.toString());
    },
    [],
  );

  const prefill = useMemo(
    () => (patientId ? readDossierPatientPrefill(patientId) : null),
    [patientId],
  );

  const hydratedPatientInfo = useMemo(
    () => toObservationPatientInfo(prefill?.patient ?? null),
    [prefill],
  );

  const patient = prefill?.patient ?? null;
  const nom = pickStr(patient, ["nom", "lastName", "familyName", "name"]) ?? "";
  const prenom =
    pickStr(patient, ["prenom", "firstName", "givenName"]) ?? "";
  const groupeSanguin =
    pickStr(patient, ["groupeSanguin", "groupe_sanguin", "bloodGroup"]) ??
    "—";
  const age = computeAgeYears(patient);
  const sexeRaw = pickStr(patient, ["sexe", "gender"]);
  const sexeLabel =
    sexeRaw === "M" || sexeRaw?.toLowerCase() === "masculin"
      ? "Masculin"
      : sexeRaw === "F" ||
          sexeRaw?.toLowerCase() === "féminin" ||
          sexeRaw?.toLowerCase() === "feminin"
        ? "Féminin"
        : sexeRaw ?? "—";
  const allergies = pickAllergiesText(patient);
  const chambreLit =
    prefill?.chambreNumero != null && prefill?.codeLit
      ? `Chambre ${prefill.chambreNumero} – ${prefill.codeLit}`
      : "—";

  const displayRef =
    patientId.length >= 8
      ? `CHU-${patientId.slice(0, 4).toUpperCase()}-${patientId.slice(4, 8).toUpperCase()}`
      : patientId;

  const courtesy = formatSexeCourtesy(patient);
  const displayName =
    nom || prenom
      ? `${courtesy ? `${courtesy} ` : ""}${prenom} ${nom}`.trim()
      : `Patient ${patientId.slice(0, 8)}`;

  const backHref = useMemo(() => {
    const sid = searchParams.get("serviceId") ?? prefill?.serviceId;
    if (sid) return `/modules/clinical/patients?serviceId=${encodeURIComponent(sid)}`;
    return "/modules/clinical/patients";
  }, [searchParams, prefill?.serviceId]);

  return (
    <div className="min-h-full bg-[#F8F9FB] px-4 py-6 sm:px-6">
      <div className="mx-auto max-w-[1100px]">
        <div className="mb-4 flex items-center gap-3">
          <Link
            href={backHref}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[12px] font-bold text-slate-600 shadow-sm transition-colors hover:bg-slate-50"
          >
            <ChevronLeft className="h-4 w-4" strokeWidth={2} />
            Plan des lits
          </Link>
        </div>

        <div
          className="relative overflow-hidden rounded-[14px] border border-slate-200/80 bg-white px-5 py-5 shadow-[0_2px_8px_rgba(5,102,141,0.06)] sm:px-6"
          style={{ boxShadow: ehr.shadowCard }}
        >
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex min-w-0 flex-1 gap-4">
              <div
                className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full text-lg font-black text-white"
                style={{ backgroundColor: ehr.primary }}
              >
                {(nom?.[0] ?? prenom?.[0] ?? "?").toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-3">
                  <h1
                    className="text-[20px] font-bold tracking-tight sm:text-[22px]"
                    style={{ color: ehr.primary }}
                  >
                    {displayName}
                  </h1>
                  <span
                    className="rounded-full px-3 py-1 text-[12px] font-semibold"
                    style={{
                      backgroundColor: ehr.idPillBg,
                      color: ehr.idPillText,
                    }}
                  >
                    #{displayRef}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-x-9 gap-y-3 text-[14px] font-semibold text-slate-800">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-slate-500">
                      Groupe sanguin
                    </p>
                    <p className="mt-1">{groupeSanguin}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-slate-500">
                      Âge / Sexe
                    </p>
                    <p className="mt-1">
                      {age != null ? `${age} ans` : "—"} / {sexeLabel}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-slate-500">
                      Chambre
                    </p>
                    <p className="mt-1">{chambreLit}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex shrink-0 flex-col items-stretch gap-2 sm:items-end">
              {allergies ? (
                <div
                  className="flex max-w-full items-center gap-2 rounded-full border px-3 py-2 text-[12px] font-semibold"
                  style={{
                    borderColor: `${ehr.allergyText}44`,
                    backgroundColor: ehr.allergyBg,
                    color: ehr.allergyText,
                  }}
                >
                  <span aria-hidden>⚠</span>
                  <span className="truncate">ALLERGIES : {allergies}</span>
                </div>
              ) : (
                <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-[12px] font-medium text-slate-500">
                  Allergies non renseignées
                </div>
              )}
              <button
                type="button"
                className="rounded-lg px-5 py-2 text-[13px] font-bold text-white shadow-sm"
                style={{ backgroundColor: ehr.primary }}
              >
                BANQUE
              </button>
            </div>
          </div>
        </div>

        <p className="mb-3 mt-4 flex items-center gap-1 text-[12px] text-slate-500">
          Champ obligatoire{" "}
          <span className="text-lg font-bold" style={{ color: ehr.danger }}>
            *
          </span>
        </p>

        <div
          className="overflow-hidden rounded-[14px] border border-slate-200/80 bg-white shadow-[0_2px_8px_rgba(5,102,141,0.06)]"
          style={{ boxShadow: ehr.shadowCard }}
        >
          <div className="flex overflow-x-auto border-b border-slate-200 bg-[#F8FAFC]">
            {TABS.map((tab) => {
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => selectTab(tab.key)}
                  className={cn(
                    "relative shrink-0 px-4 py-3.5 text-[13px] font-semibold transition-colors sm:px-5",
                    isActive ? "text-[#05668D]" : "text-slate-500 hover:text-slate-700",
                  )}
                >
                  {isActive ? (
                    <span
                      className="absolute bottom-0 left-3 right-3 h-0.5 rounded-full"
                      style={{ backgroundColor: ehr.primary }}
                    />
                  ) : null}
                  <span className={cn(isActive && "font-bold")}>{tab.label}</span>
                </button>
              );
            })}
          </div>

          <div className="p-5 sm:p-6">
            {activeTab === "observation" && patientId ? (
              <ObservationForm
                patientId={patientId}
                hydratedPatientInfo={hydratedPatientInfo}
              />
            ) : activeTab !== "observation" ? (
              <p className="text-center text-[14px] font-medium text-slate-500">
                Cet onglet sera branché prochainement.
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
