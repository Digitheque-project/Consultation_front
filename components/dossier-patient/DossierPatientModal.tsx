"use client";

import { useEffect, useState } from "react";
import { X, History, Clock, User, FolderOpen, AlertCircle } from "lucide-react";
import {
  getDossierPatientHistorique,
  type DossierHistoriqueEntry,
  type DossierModule,
} from "@/lib/dossier-patient-api";

const MODULE_LABELS: Record<DossierModule, string> = {
  observation: "Observation",
  diagnostic: "Diagnostic",
  suivi: "Suivi / Évolution",
  parametre: "Paramètres",
  sortie: "Sortie",
};

const MODULE_STYLES: Record<DossierModule, string> = {
  observation: "bg-[#EAF3FA] text-[#006A8C]",
  diagnostic: "bg-purple-50 text-purple-700",
  suivi: "bg-emerald-50 text-emerald-700",
  parametre: "bg-amber-50 text-amber-700",
  sortie: "bg-red-50 text-red-700",
};

function formatValeurs(valeurs: Record<string, unknown>) {
  const entries = Object.entries(valeurs).filter(
    ([, v]) => v !== null && v !== undefined && v !== "",
  );
  if (entries.length === 0) return null;
  return (
    <div className="mt-2 grid gap-1.5 rounded-xl bg-gray-50 p-3 text-[12px]">
      {entries.map(([key, value]) => {
        const label = key
          .replace(/([A-Z])/g, " $1")
          .replace(/^./, (c) => c.toUpperCase())
          .trim();
        const display = typeof value === "boolean" ? (value ? "Oui" : "Non") : String(value);
        return (
          <div key={key} className="text-gray-600">
            <span className="font-bold text-gray-500">{label} : </span>
            {display}
          </div>
        );
      })}
    </div>
  );
}

/**
 * Dossier patient — lecture seule, agrégé sur tout le CHU (pas seulement notre
 * service). Aucune écriture n'est possible depuis cette modale : c'est
 * uniquement une consultation de ce que les autres services ont déjà
 * enregistré (observations, diagnostics, suivis, paramètres, sorties), pour
 * que le médecin sache quels traitements ont déjà été faits avant le sien.
 *
 * Source : backend dédié "dossier_back" (registre service-service), même
 * contrat que celui utilisé par les autres fronts du CHU (ex. ORL) —
 * GET /dossier-patient/patients/{patientId}/historique?chuId=...
 */
export function DossierPatientModal({
  patientId,
  patientName,
  chuId,
  onClose,
}: {
  patientId: string;
  patientName?: string;
  chuId?: string;
  onClose: () => void;
}) {
  const [entries, setEntries] = useState<DossierHistoriqueEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterModule, setFilterModule] = useState<string>("Tous");

  useEffect(() => {
    if (!chuId) {
      setLoading(false);
      setError("CHU non identifié — impossible de charger le dossier.");
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    getDossierPatientHistorique(patientId, chuId)
      .then((data) => {
        if (!cancelled) setEntries(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Erreur inconnue");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [patientId, chuId]);

  const modules = Array.from(new Set(entries.map((e) => e.module)));
  const filtered = filterModule === "Tous" ? entries : entries.filter((e) => e.module === filterModule);

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center bg-black/40 px-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-gray-100 p-6 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-blue-50 bg-[#EAF3FA] text-[#006A8C]">
              <FolderOpen className="h-5 w-5" strokeWidth={2.5} />
            </div>
            <div>
              <h3 className="text-[16px] font-extrabold text-gray-900">Dossier patient</h3>
              {patientName && <p className="text-[13px] text-gray-500">{patientName}</p>}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-gray-400 transition-colors hover:bg-gray-50 hover:text-gray-700"
            title="Fermer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="rounded-xl mx-6 mt-4 bg-amber-50 border border-amber-100 px-3.5 py-2.5 text-[11.5px] font-semibold text-amber-700 flex items-center gap-2">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          Lecture seule — les informations viennent de tous les services du CHU. Rien ne peut être modifié depuis cette fenêtre.
        </div>

        <div className="flex-1 overflow-y-auto p-6 pt-4">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 animate-pulse rounded-xl bg-gray-100" />
              ))}
            </div>
          ) : error ? (
            <div className="py-12 text-center text-[13px] text-gray-400">
              <AlertCircle className="mx-auto mb-3 h-10 w-10 text-gray-300" />
              {error}
            </div>
          ) : entries.length === 0 ? (
            <div className="py-12 text-center text-[13px] text-gray-400">
              <History className="mx-auto mb-3 h-10 w-10 text-gray-300" />
              Aucun historique disponible pour ce patient.
            </div>
          ) : (
            <>
              {modules.length > 1 && (
                <div className="mb-4 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setFilterModule("Tous")}
                    className={`rounded-full px-3 py-1 text-[11px] font-bold transition-colors ${
                      filterModule === "Tous" ? "bg-[#006A8C] text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                    }`}
                  >
                    Tous
                  </button>
                  {modules.map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setFilterModule(m)}
                      className={`rounded-full px-3 py-1 text-[11px] font-bold transition-colors ${
                        filterModule === m ? "bg-[#006A8C] text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                      }`}
                    >
                      {MODULE_LABELS[m]}
                    </button>
                  ))}
                </div>
              )}

              <div className="space-y-3">
                {filtered.map((entry) => (
                  <div key={`${entry.module}-${entry.id}`} className="rounded-xl border border-gray-100 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${MODULE_STYLES[entry.module]}`}>
                        {MODULE_LABELS[entry.module] ?? entry.module}
                      </span>
                      <span className="flex items-center gap-1 text-[11px] font-medium text-gray-400">
                        <Clock className="h-3 w-3" />
                        {new Date(entry.date).toLocaleString("fr-FR")}
                      </span>
                    </div>
                    {entry.createdBy && (
                      <div className="mt-1.5 flex items-center gap-1 text-[11px] text-gray-400">
                        <User className="h-3 w-3" />
                        {entry.createdBy}
                      </div>
                    )}
                    {formatValeurs(entry.valeurs)}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
