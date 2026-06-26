"use client";

import React, { useEffect, useMemo, useState } from "react";
import { planningApi, DoctorPlanning } from "@/lib/api/planning";
import { format } from "date-fns";

type Props = {
  searchParams?: { medecinId?: string; startDate?: string; endDate?: string };
};

export default function PlanningPublicPage({ searchParams }: Props) {
  const medecinId = Number(searchParams?.medecinId || 16);
  const [planning, setPlanning] = useState<DoctorPlanning[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await planningApi.getByMedecin(medecinId, searchParams?.startDate, searchParams?.endDate);
        if (!mounted) return;
        setPlanning(data);
      } catch (err: any) {
        setError(err?.message || 'Erreur de récupération');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    return () => { mounted = false; };
  }, [medecinId, searchParams?.startDate, searchParams?.endDate]);

  const grouped = useMemo(() => {
    const map: Record<string, DoctorPlanning[]> = {};
    planning.forEach((p) => {
      const day = p.date.split("T")[0];
      if (!map[day]) map[day] = [];
      map[day].push(p);
    });
    return map;
  }, [planning]);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Planning public du médecin #{medecinId}</h1>

      {loading && <p>Chargement...</p>}
      {error && <p className="text-red-600">{error}</p>}

      {!loading && !error && (
        <div className="space-y-6">
          {Object.keys(grouped).length === 0 && <p>Aucun créneau trouvé.</p>}
          {Object.entries(grouped).map(([day, slots]) => (
            <div key={day} className="border rounded-lg p-4 bg-white shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <div className="font-bold text-lg">{format(new Date(day), "EEEE dd MMMM yyyy", { locale: undefined })}</div>
                <div className="text-sm text-gray-600">{slots.length} créneau(s)</div>
              </div>

              <ul className="space-y-2">
                {slots.map((s) => (
                  <li key={s.id} className="p-2 border rounded-md flex items-center justify-between">
                    <div>
                      <div className="font-semibold">{s.heureDebut} — {s.heureFin} {s.disponible ? '(Disponible)' : '(Indisponible)'}</div>
                      {s.notes && <div className="text-sm text-gray-500">{s.notes}</div>}
                    </div>
                    <div className="text-sm text-gray-400">Quota: {s.quota ?? 1}</div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
