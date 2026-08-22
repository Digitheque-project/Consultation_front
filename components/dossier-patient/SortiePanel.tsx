"use client";

import { useEffect, useState } from "react";
import { getDossierPatientHistorique, type DossierHistoriqueEntry } from "@/lib/dossier-patient-api";
import { EmptyState, LoadingSkeleton, RecordCard, renderValue } from "./shared";

/**
 * L'endpoint dédié aux sorties médicales exige un episodeId d'hospitalisation
 * que nous n'avons pas toujours (un patient de consultation externe n'est
 * pas nécessairement hospitalisé) — cet onglet se base donc sur l'agrégat
 * /historique, filtré sur le module "sortie", plutôt que sur l'endpoint
 * dédié. Résumé (voir avertissement dans lib/dossier-patient-api.ts), pas
 * le détail complet, mais suffisant pour ce module précis (peu de champs).
 */
export function SortiePanel({ patientId, chuId }: { patientId: string; chuId?: string }) {
  const [entries, setEntries] = useState<DossierHistoriqueEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!chuId) {
      setLoading(false);
      setError("CHU non identifié — impossible de charger ces données.");
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    getDossierPatientHistorique(patientId, chuId)
      .then((list) => {
        if (!cancelled) setEntries(list.filter((e) => e.module === "sortie"));
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
  if (entries.length === 0) return <EmptyState label="Aucune sortie médicale enregistrée pour ce patient." />;

  return (
    <div className="space-y-3">
      {entries.map((entry) => (
        <RecordCard key={entry.id} date={entry.date}>
          {renderValue(entry.valeurs)}
        </RecordCard>
      ))}
    </div>
  );
}
