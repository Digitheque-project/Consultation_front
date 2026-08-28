"use client";

import { useState } from "react";
import {
  X,
  FolderOpen,
  Lock,
  Stethoscope,
  Activity,
  LineChart,
  Gauge,
  FlaskConical,
  DoorOpen,
  History,
} from "lucide-react";
import { ObservationPanel } from "./ObservationPanel";
import { ModuleListPanel } from "./ModuleListPanel";
import { SortiePanel } from "./SortiePanel";
import { HistoriquePanel } from "./HistoriquePanel";
import { Pill, TabButton } from "./shared";
import { getDiagnosticsByPatient, getParametresByPatient, getResultatsByPatient, getSuivisByPatient } from "@/lib/dossier-patient-api";

const TABS = [
  { key: "observation", label: "Observation médical", icon: Stethoscope },
  { key: "diagnostic", label: "Diagnostic", icon: Activity },
  { key: "suivi", label: "Suivi / Évolution", icon: LineChart },
  { key: "parametres", label: "Paramètres", icon: Gauge },
  { key: "resultats", label: "Résultats paracliniques", icon: FlaskConical },
  { key: "sortie", label: "Sortie", icon: DoorOpen },
  { key: "historique", label: "Historique", icon: History },
] as const;
type TabKey = (typeof TABS)[number]["key"];

function computeAgeYears(dateNaissance?: string): number | null {
  if (!dateNaissance) return null;
  const d = new Date(dateNaissance);
  if (Number.isNaN(d.getTime())) return null;
  const diff = Date.now() - d.getTime();
  return Math.max(0, Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000)));
}

function formatSexeLabel(value?: string): string {
  if (!value) return "—";
  const u = value.trim().toUpperCase();
  if (["M", "MALE", "MASCULIN", "HOMME"].includes(u)) return "Homme";
  if (["F", "FEMALE", "FEMININ", "FÉMININ", "FEMME"].includes(u)) return "Femme";
  return value;
}

/**
 * Dossier patient — lecture seule, agrégé sur tout le CHU (pas seulement notre
 * service). Aucune écriture n'est possible depuis cette modale.
 *
 * Sept onglets, chacun correspondant à un module réellement exposé par le
 * backend dédié "dossier_back" (registre service-service) — mêmes données
 * que celles utilisées par les autres fronts du CHU (ex. ORL, dont
 * l'implémentation a servi de référence pour cette vue, adaptée en lecture
 * seule uniquement). "Avis" et "Compte-rendu opératoire" (visibles sur
 * d'autres fronts) n'ont pas d'équivalent dans ce service et ne sont donc
 * pas proposés ici ; "Prescription" est déjà couvert par notre propre
 * module prescription, pas dupliqué ici.
 */
export function DossierPatientModal({
  patientId,
  patientName,
  patientSexe,
  patientDateNaissance,
  chuId,
  onClose,
}: {
  patientId: string;
  patientName?: string;
  patientSexe?: string;
  patientDateNaissance?: string;
  chuId?: string;
  onClose: () => void;
}) {
  const [activeTab, setActiveTab] = useState<TabKey>("observation");
  const age = computeAgeYears(patientDateNaissance);
  const sexeLabel = formatSexeLabel(patientSexe);
  const patientInfo = patientName
    ? {
        nom: patientName,
        sexe: sexeLabel !== "—" ? sexeLabel : undefined,
        dateNaissance: patientDateNaissance,
      }
    : null;

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/40 px-3 py-4 sm:px-6" onClick={onClose}>
      <div
        className="flex h-full max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* En-tête patient */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-gray-100 px-5 py-3.5 sm:px-6">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-bold text-slate-600 shadow-sm transition-colors hover:bg-slate-50"
          >
            <X className="h-3.5 w-3.5" strokeWidth={2.5} />
            Fermer
          </button>

          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#05668D] to-[#04556F] text-[13px] font-black text-white">
              {(patientName?.[0] ?? "?").toUpperCase()}
            </div>
            <div className="flex items-center gap-2">
              <FolderOpen className="h-4 w-4 text-[#006A8C]" strokeWidth={2.5} />
              <h1 className="truncate text-[15px] font-bold text-slate-900 sm:text-[16px]">{patientName ?? "Dossier patient"}</h1>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <Pill label="Âge / Sexe" value={`${age != null ? `${age} ans` : "—"} / ${sexeLabel}`} />
          </div>

          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-700 sm:ml-auto">
            <Lock className="h-3.5 w-3.5" strokeWidth={2.5} />
            Lecture seule
          </span>
        </div>

        {/* Barre d'onglets */}
        <div className="shrink-0 overflow-x-auto border-b border-gray-100 bg-slate-50 px-3 py-2">
          <div className="flex flex-nowrap items-center gap-1">
            {TABS.map((tab) => (
              <TabButton key={tab.key} active={activeTab === tab.key} onClick={() => setActiveTab(tab.key)} icon={tab.icon} label={tab.label} />
            ))}
          </div>
        </div>

        {/* Contenu de l'onglet actif */}
        <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6">
          {activeTab === "observation" && <ObservationPanel patientId={patientId} chuId={chuId} patientInfo={patientInfo} />}
          {activeTab === "diagnostic" && (
            <ModuleListPanel
              patientId={patientId}
              chuId={chuId}
              fetcher={getDiagnosticsByPatient}
              emptyLabel="Aucun diagnostic enregistré pour ce patient."
              titleOf={(d) => d.diagnosticPrincipal}
              badgeOf={(d) =>
                d.type ? (
                  <span className="rounded-full bg-purple-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-purple-700">
                    {d.type === "RETENU" ? "Retenu" : "Suspicion"}
                  </span>
                ) : null
              }
            />
          )}
          {activeTab === "suivi" && (
            <ModuleListPanel
              patientId={patientId}
              chuId={chuId}
              fetcher={getSuivisByPatient}
              emptyLabel="Aucun suivi enregistré pour ce patient."
              titleOf={(s) => s.jourHospitalisation}
            />
          )}
          {activeTab === "parametres" && (
            <ModuleListPanel
              patientId={patientId}
              chuId={chuId}
              fetcher={getParametresByPatient}
              emptyLabel="Aucun paramètre relevé pour ce patient."
              dateOf={(p) => p.mesureAt ?? p.createdAt}
            />
          )}
          {activeTab === "resultats" && (
            <ModuleListPanel
              patientId={patientId}
              chuId={chuId}
              fetcher={getResultatsByPatient}
              emptyLabel="Aucun résultat paraclinique disponible pour ce patient."
              titleOf={(r) => r.examen}
              dateOf={(r) => r.dateResultat ?? r.dateDemande}
              serviceOf={(r) => r.serviceSource}
              badgeOf={(r) =>
                r.serviceSource ? (
                  <span className="rounded-full bg-cyan-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-cyan-700">
                    {r.serviceSource}
                  </span>
                ) : null
              }
            />
          )}
          {activeTab === "sortie" && <SortiePanel patientId={patientId} chuId={chuId} />}
          {activeTab === "historique" && <HistoriquePanel patientId={patientId} chuId={chuId} />}
        </div>
      </div>
    </div>
  );
}
