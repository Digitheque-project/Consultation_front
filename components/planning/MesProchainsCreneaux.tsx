"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { CalendarRange } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAllConsultations } from "@/hooks/use-consultations";
import type { DoctorPlanning } from "@/lib/api/planning";

/**
 * Jours de consultation à venir du médecin connecté : ses créneaux (posés par
 * l'accueil ou l'admin), le quota de chacun, les patients déjà planifiés et les
 * places encore libres. Même règle de comptage que le backend
 * (ensureMedecinQuota) : un rendez-vous compte dans le créneau qui contient son
 * heure, sauf s'il a été reporté.
 */

const JOURS = 14;

const cle = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
// Le créneau est stocké à minuit UTC du jour : sa date est la partie AAAA-MM-JJ.
const jourDuCreneau = (date: string) => date.slice(0, 10);

export function MesProchainsCreneaux({ plannings }: { plannings: DoctorPlanning[] }) {
  const router = useRouter();
  const { debut, fin } = useMemo(() => {
    const d = new Date();
    const f = new Date();
    f.setDate(f.getDate() + JOURS - 1);
    return { debut: cle(d), fin: cle(f) };
  }, []);

  const { data: enCours = [] } = useAllConsultations({ dateFrom: debut, dateTo: fin });
  // Les consultations déjà terminées aujourd'hui occupent aussi leur place.
  const { data: terminees = [] } = useAllConsultations({ date: debut, archived: true });

  const jours = useMemo(() => {
    const vues = new Set<number>();
    const planifies = [...enCours, ...terminees].filter((c) => {
      if (vues.has(c.id) || c.statut?.toUpperCase() === "REPORTEE") return false;
      vues.add(c.id);
      return true;
    });
    const parJour = new Map<string, DoctorPlanning[]>();
    for (const p of plannings) {
      const j = jourDuCreneau(p.date);
      if (j < debut || j > fin) continue;
      parJour.set(j, [...(parJour.get(j) ?? []), p]);
    }
    return [...parJour.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([jour, creneaux]) => ({
        jour,
        creneaux: creneaux
          .sort((a, b) => a.heureDebut.localeCompare(b.heureDebut))
          .map((c) => {
            const pris = planifies.filter((x) => {
              const heure = (x.heure ?? "").slice(0, 5);
              return cle(new Date(x.date)) === jour && heure >= c.heureDebut && heure < c.heureFin;
            }).length;
            const quota = c.quota ?? 0;
            return { ...c, pris, libres: Math.max(0, quota - pris), quota };
          }),
      }));
  }, [plannings, enCours, terminees, debut, fin]);

  const libelleJour = (jour: string) => {
    const d = new Date(`${jour}T12:00:00`);
    if (jour === debut) return "Aujourd'hui";
    const demain = new Date();
    demain.setDate(demain.getDate() + 1);
    if (jour === cle(demain)) return "Demain";
    return d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
  };

  return (
    <div className="bg-white rounded-[28px] sm:rounded-[32px] p-6 sm:p-7 shadow-[0px_4px_16px_rgba(17,17,26,0.05)] border border-gray-100">
      <div className="flex items-center justify-between gap-2 mb-4">
        <span className="flex items-center gap-2 text-[10px] sm:text-[11px] font-bold text-gray-400 uppercase tracking-[0.1em]">
          <CalendarRange className="w-4 h-4 text-[#005b82]" />
          Mes prochains créneaux
        </span>
        <span className="text-[10px] font-semibold text-gray-400">{JOURS} jours</span>
      </div>

      {jours.length === 0 ? (
        <p className="text-[12px] text-slate-500">
          Aucun créneau de consultation prévu dans les {JOURS} prochains jours.
        </p>
      ) : (
        <ul className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
          {jours.map(({ jour, creneaux }) => (
            <li key={jour} className="rounded-2xl bg-[#F8FAFC] p-3">
              <p className="text-[12px] font-extrabold text-gray-900 first-letter:uppercase">{libelleJour(jour)}</p>
              <div className="mt-2 space-y-1.5">
                {creneaux.map((c) =>
                  c.disponible ? (
                    <div key={c.id} className="flex items-center justify-between gap-2 text-[12px]">
                      <span className="font-semibold text-gray-700">
                        {c.heureDebut} – {c.heureFin}
                      </span>
                      <span className="text-gray-500">
                        {c.pris}/{c.quota} planifié{c.pris > 1 ? "s" : ""}
                      </span>
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[10px] font-bold whitespace-nowrap",
                          c.libres === 0
                            ? "bg-red-50 text-red-600"
                            : c.libres <= Math.ceil(c.quota * 0.3)
                              ? "bg-orange-50 text-orange-600"
                              : "bg-emerald-50 text-emerald-700",
                        )}
                      >
                        {c.libres === 0 ? "Complet" : `${c.libres} place${c.libres > 1 ? "s" : ""} libre${c.libres > 1 ? "s" : ""}`}
                      </span>
                    </div>
                  ) : (
                    <div key={c.id} className="flex items-center justify-between gap-2 text-[12px]">
                      <span className="font-semibold text-gray-700">Indisponible</span>
                      {c.notes ? <span className="truncate text-gray-500">{c.notes}</span> : null}
                    </div>
                  ),
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <button
        type="button"
        onClick={() => router.push("/modules/consultation-externe/planning-complet")}
        className="mt-4 text-[12px] font-bold text-[#005b82] hover:underline"
      >
        Voir le planning complet →
      </button>
    </div>
  );
}
