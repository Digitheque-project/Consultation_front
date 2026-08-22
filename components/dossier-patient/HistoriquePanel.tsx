"use client";

import { useEffect, useState } from "react";
import { getDossierPatientHistorique, type DossierHistoriqueEntry, type DossierModule } from "@/lib/dossier-patient-api";
import { cn } from "@/lib/utils";
import { EmptyState, LoadingSkeleton, RecordCard, renderValue } from "./shared";

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

/**
 * Chronologie tous modules confondus (observations, diagnostics, suivis,
 * paramètres, sorties) — vue résumée, pas le détail complet de chaque
 * enregistrement (voir avertissement dans lib/dossier-patient-api.ts). Les
 * autres onglets donnent le détail complet module par module ; celui-ci
 * sert à voir d'un coup d'œil la chronologie de tout ce qui a été fait.
 */
export function HistoriquePanel({ patientId, chuId }: { patientId: string; chuId?: string }) {
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

  if (loading) return <LoadingSkeleton />;
  if (error) return <EmptyState label={error} />;
  if (entries.length === 0) return <EmptyState label="Aucun historique disponible pour ce patient." />;

  const modules = Array.from(new Set(entries.map((e) => e.module)));
  const sorted = [...entries].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const filtered = filterModule === "Tous" ? sorted : sorted.filter((e) => e.module === filterModule);

  return (
    <div>
      {modules.length > 1 && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setFilterModule("Tous")}
            className={cn(
              "rounded-full px-3 py-1 text-[11px] font-bold transition-colors",
              filterModule === "Tous" ? "bg-[#006A8C] text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200",
            )}
          >
            Tous
          </button>
          {modules.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setFilterModule(m)}
              className={cn(
                "rounded-full px-3 py-1 text-[11px] font-bold transition-colors",
                filterModule === m ? "bg-[#006A8C] text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200",
              )}
            >
              {MODULE_LABELS[m]}
            </button>
          ))}
        </div>
      )}

      <div className="space-y-3">
        {filtered.map((entry) => (
          <RecordCard
            key={`${entry.module}-${entry.id}`}
            date={entry.date}
            author={entry.createdBy}
            badge={
              <span className={cn("rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide", MODULE_STYLES[entry.module])}>
                {MODULE_LABELS[entry.module] ?? entry.module}
              </span>
            }
          >
            {renderValue(entry.valeurs)}
          </RecordCard>
        ))}
      </div>
    </div>
  );
}
