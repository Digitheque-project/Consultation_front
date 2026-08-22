"use client";

import { useEffect, useState } from "react";
import { EmptyState, LoadingSkeleton, RecordCard, renderValue } from "./shared";

interface RecordWithDate {
  id: string;
  createdAt?: string;
}

/**
 * Liste lecture seule générique pour un module du dossier patient (chaque
 * enregistrement rendu via le même moteur récursif que l'onglet Observation)
 * — utilisée pour Diagnostic, Suivi / Évolution, Paramètres et Résultats
 * paracliniques : leurs enregistrements sont des objets à plat (pas de
 * sous-sections imbriquées comme l'observation), donc une carte générique
 * par entrée suffit, sans dupliquer une mise en page dédiée par module.
 */
export function ModuleListPanel<T extends RecordWithDate>({
  patientId,
  chuId,
  fetcher,
  emptyLabel,
  badgeOf,
  titleOf,
  dateOf,
}: {
  patientId: string;
  chuId?: string;
  fetcher: (patientId: string, chuId: string) => Promise<T[]>;
  emptyLabel: string;
  badgeOf?: (record: T) => React.ReactNode;
  titleOf?: (record: T) => string | undefined;
  dateOf?: (record: T) => string | undefined;
}) {
  const [records, setRecords] = useState<T[]>([]);
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
    fetcher(patientId, chuId)
      .then((list) => {
        if (cancelled) return;
        const sorted = [...list].sort(
          (a, b) => new Date((dateOf?.(b) ?? b.createdAt) ?? 0).getTime() - new Date((dateOf?.(a) ?? a.createdAt) ?? 0).getTime(),
        );
        setRecords(sorted);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId, chuId]);

  if (loading) return <LoadingSkeleton />;
  if (error) return <EmptyState label={error} />;
  if (records.length === 0) return <EmptyState label={emptyLabel} />;

  return (
    <div className="space-y-3">
      {records.map((record) => (
        <RecordCard
          key={record.id}
          title={titleOf?.(record)}
          date={dateOf?.(record) ?? record.createdAt}
          badge={badgeOf?.(record)}
        >
          {renderValue(record)}
        </RecordCard>
      ))}
    </div>
  );
}
