"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { EmptyState, LoadingSkeleton, RecordCard, prune, renderValue } from "./shared";

interface RecordWithDate {
  id: string;
  createdAt?: string;
}

/** Insensible aux accents/casse — "creatinine" doit trouver "Créatinine". */
function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

/**
 * Liste lecture seule générique pour un module du dossier patient (chaque
 * enregistrement rendu via le même moteur récursif que l'onglet Observation)
 * — utilisée pour Diagnostic, Suivi / Évolution, Paramètres et Résultats
 * paracliniques : leurs enregistrements sont des objets à plat (pas de
 * sous-sections imbriquées comme l'observation), donc une carte générique
 * par entrée suffit, sans dupliquer une mise en page dédiée par module.
 *
 * Recherche texte libre : indexée sur l'intégralité des champs renseignés
 * (pas seulement le titre) pour retrouver un examen précis sans avoir à
 * connaître le libellé exact utilisé par le service source.
 *
 * Filtre par service (optionnel, via `serviceOf`) : n'affiche la barre de
 * puces que si le module expose réellement une notion de service d'origine
 * (cas des résultats paracliniques — ORL, Labo, Imagerie...), sur le même
 * principe que le filtre par service ajouté sur la page Rendez-vous d'accueil.
 */
export function ModuleListPanel<T extends RecordWithDate>({
  patientId,
  chuId,
  fetcher,
  emptyLabel,
  badgeOf,
  titleOf,
  dateOf,
  serviceOf,
}: {
  patientId: string;
  chuId?: string;
  fetcher: (patientId: string, chuId: string) => Promise<T[]>;
  emptyLabel: string;
  badgeOf?: (record: T) => React.ReactNode;
  titleOf?: (record: T) => string | undefined;
  dateOf?: (record: T) => string | undefined;
  /** Regroupement pour le filtre par puces (ex. service source d'un résultat paraclinique). */
  serviceOf?: (record: T) => string | undefined;
}) {
  const [records, setRecords] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [serviceFilter, setServiceFilter] = useState<string>("Tous");

  useEffect(() => {
    if (!chuId) {
      setLoading(false);
      setError("CHU non identifié — impossible de charger ces données.");
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    setQuery("");
    setServiceFilter("Tous");
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

  // Services distincts réellement présents dans les données chargées (pas un
  // référentiel figé) — la barre de puces ne s'affiche que si `serviceOf` est
  // fourni et qu'il y a effectivement plus d'un service à distinguer.
  const services = useMemo(() => {
    if (!serviceOf) return [];
    const seen = new Map<string, string>();
    for (const record of records) {
      const raw = serviceOf(record)?.trim();
      if (!raw) continue;
      const key = normalize(raw);
      if (!seen.has(key)) seen.set(key, raw);
    }
    return Array.from(seen.entries()).sort((a, b) => a[1].localeCompare(b[1], "fr"));
  }, [records, serviceOf]);

  const visibleRecords = useMemo(() => {
    const q = normalize(query);
    return records.filter((record) => {
      if (serviceOf && serviceFilter !== "Tous") {
        const raw = serviceOf(record)?.trim();
        if (normalize(raw ?? "") !== normalize(serviceFilter)) return false;
      }
      if (!q) return true;
      const haystack = normalize(`${titleOf?.(record) ?? ""} ${JSON.stringify(prune(record) ?? "")}`);
      return haystack.includes(q);
    });
  }, [records, query, serviceFilter, serviceOf, titleOf]);

  if (loading) return <LoadingSkeleton />;
  if (error) return <EmptyState label={error} />;
  if (records.length === 0) return <EmptyState label={emptyLabel} />;

  const hasActiveFilter = query.trim().length > 0 || serviceFilter !== "Tous";

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" strokeWidth={2.5} />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher un examen, un mot-clé..."
            className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-8 pr-8 text-[13px] text-slate-800 placeholder:text-slate-400 focus:border-[#006A8C] focus:outline-none focus:ring-1 focus:ring-[#006A8C]"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            >
              <X className="h-3.5 w-3.5" strokeWidth={2.5} />
            </button>
          )}
        </div>

        {services.length > 1 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setServiceFilter("Tous")}
              className={`shrink-0 rounded-full px-3 py-1.5 text-[11.5px] font-bold transition-colors ${
                serviceFilter === "Tous" ? "bg-[#006A8C] text-white shadow-sm" : "border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              Tous les services
            </button>
            {services.map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setServiceFilter(label)}
                className={`shrink-0 rounded-full px-3 py-1.5 text-[11.5px] font-bold transition-colors ${
                  normalize(serviceFilter) === key ? "bg-[#006A8C] text-white shadow-sm" : "border border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </div>

      {visibleRecords.length === 0 ? (
        <div className="py-10 text-center">
          <p className="text-[13px] text-slate-400">Aucun résultat ne correspond à votre recherche.</p>
          {hasActiveFilter && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setServiceFilter("Tous");
              }}
              className="mt-2 text-[12px] font-bold text-[#006A8C] hover:underline"
            >
              Réinitialiser la recherche et les filtres
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {visibleRecords.map((record) => (
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
      )}
    </div>
  );
}
