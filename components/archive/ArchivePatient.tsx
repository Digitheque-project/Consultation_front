"use client";

import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { consultationApi, type ArchivePatientApi } from "@/lib/api/consultation";
import { ParcoursArchive } from "./ParcoursArchive";

/**
 * Archive d'un patient : une seule fiche, qui liste toutes ses prises en charge
 * (chacune = consultation initiale + ses contrôles), avec leurs dates. Un
 * patient revenu dix fois a dix parcours ici, du plus récent au plus ancien.
 */

const dateFr = (d?: string | null) => (d ? new Date(d).toLocaleDateString("fr-FR") : "—");

export function ArchivePatient({
  patientId,
  chuId,
  consultationOuverte,
}: {
  patientId: string;
  chuId?: string;
  consultationOuverte?: number;
}) {
  const [archive, setArchive] = useState<ArchivePatientApi | null>(null);
  const [erreur, setErreur] = useState(false);
  const [ouverts, setOuverts] = useState<Set<number>>(new Set());

  useEffect(() => {
    let annule = false;
    consultationApi
      .getParcoursPatient(patientId)
      .then((a) => {
        if (annule) return;
        setArchive(a);
        // Ouvert d'office : le parcours de la ligne cliquée, sinon le plus récent.
        const i = a.parcours.findIndex((p) => p.etapes.some((e) => e.id === consultationOuverte));
        setOuverts(new Set([i >= 0 ? i : 0]));
      })
      .catch(() => !annule && setErreur(true));
    return () => {
      annule = true;
    };
  }, [patientId, consultationOuverte]);

  if (erreur) return <p className="rounded-2xl bg-red-50 p-4 text-[13px] text-red-700">Impossible de charger l&apos;archive de ce patient.</p>;
  if (!archive) return <p className="py-8 text-center text-[13px] text-slate-400">Chargement de l&apos;archive…</p>;
  if (!archive.parcours.length) return <p className="text-[13px] italic text-slate-400">Aucune prise en charge archivée.</p>;

  const basculer = (i: number) =>
    setOuverts((o) => {
      const n = new Set(o);
      if (n.has(i)) n.delete(i);
      else n.add(i);
      return n;
    });

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[13px] font-bold text-slate-700">
          {archive.parcours.length} prise{archive.parcours.length > 1 ? "s" : ""} en charge
        </p>
        <div className="flex gap-2 print:hidden">
          <button
            type="button"
            onClick={() => setOuverts(new Set(archive.parcours.map((_, i) => i)))}
            className="rounded-full border border-slate-200 px-3 py-1 text-[11px] font-bold text-[#005b82] hover:bg-slate-50"
          >
            Tout déplier
          </button>
          <button
            type="button"
            onClick={() => setOuverts(new Set())}
            className="rounded-full border border-slate-200 px-3 py-1 text-[11px] font-bold text-slate-500 hover:bg-slate-50"
          >
            Tout replier
          </button>
        </div>
      </div>

      {archive.parcours.map((p, i) => {
        const ouvert = ouverts.has(i);
        const nbControles = p.etapes.filter((e) => e.isControl).length;
        const diagnostic =
          [...p.etapes].reverse().map((e) => e.observation?.diagnosticRetenu || e.observation?.diagnostic).find((d) => d?.trim()) ?? "";
        return (
          <section key={p.etapes[0].id} className="break-inside-avoid rounded-2xl border border-slate-200 bg-white">
            <button
              type="button"
              onClick={() => basculer(i)}
              className="flex w-full items-start justify-between gap-3 px-4 py-3 text-left"
            >
              <div className="min-w-0">
                <p className="text-[14px] font-extrabold text-slate-900">
                  Du {dateFr(p.debut)} au {dateFr(p.fin)}
                  {!p.termine && <span className="ml-2 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">En cours</span>}
                </p>
                <p className="mt-0.5 text-[12px] text-slate-500">
                  {p.etapes[0].motif?.trim() || "Motif non renseigné"}
                  {" · "}
                  {nbControles ? `consultation initiale + ${nbControles} contrôle${nbControles > 1 ? "s" : ""}` : "consultation initiale"}
                </p>
                <p className={cn("mt-0.5 text-[12px]", diagnostic ? "text-slate-700" : "italic text-slate-400")}>
                  Diagnostic retenu : {diagnostic || "non renseigné"}
                </p>
              </div>
              <ChevronDown className={cn("mt-1 h-4 w-4 shrink-0 text-slate-400 transition-transform print:hidden", ouvert && "rotate-180")} />
            </button>
            {ouvert && (
              <div className="border-t border-slate-100 px-4 py-4">
                <ParcoursArchive parcours={p} chuId={chuId} selectionId={consultationOuverte} />
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
