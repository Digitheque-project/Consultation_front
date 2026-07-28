"use client";

import { useMemo } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DoctorPlanning, PlanningServiceOption, ServiceDoctorOption } from "@/lib/api/planning";

type ServiceGridViewProps = {
  services: PlanningServiceOption[];
  doctorsByService: Record<string, ServiceDoctorOption[]>;
  planning: DoctorPlanning[];
  days: Date[];
  canManagePlanning: boolean;
  isPastSlotDate: (dateStr: string) => boolean;
  onCellAdd: (date: Date, doctor: ServiceDoctorOption) => void;
  onSlotEdit: (slot: DoctorPlanning, doctor: ServiceDoctorOption) => void;
};

// Vue "grille par service" — reproduit le planning papier : colonnes =
// départements médicaux (registre service-service), avec un médecin par
// sous-colonne ; lignes = jours affichés (dépend du mode Jour/Semaine/Mois,
// calculé par le parent — ce composant reste purement présentationnel).
export function ServiceGridView({
  services,
  doctorsByService,
  planning,
  days,
  canManagePlanning,
  isPastSlotDate,
  onCellAdd,
  onSlotEdit,
}: ServiceGridViewProps) {
  // Un médecin peut avoir plusieurs créneaux le même jour — regroupés ici par
  // "medecinId_date" pour tout afficher dans la case correspondante.
  const slotsByDoctorAndDay = useMemo(() => {
    const map: Record<string, DoctorPlanning[]> = {};
    planning.forEach((slot) => {
      const day = slot.date.split('T')[0];
      const key = `${slot.medecinId}_${day}`;
      if (!map[key]) map[key] = [];
      map[key].push(slot);
    });
    return map;
  }, [planning]);

  const hasAnyDoctor = services.some((s) => (doctorsByService[s.id]?.length ?? 0) > 0);

  if (services.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-10 text-center">
        <p className="text-[13px] font-semibold text-slate-400">
          Aucun service clinique enregistré pour ce CHU. Les départements apparaîtront ici automatiquement dès qu'ils seront ajoutés au registre.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto custom-scrollbar">
      <table className="border-collapse min-w-full">
        <thead>
          <tr>
            <th className="sticky top-0 left-0 z-30 bg-gray-50 border-b border-r border-gray-100 px-3 py-3 min-w-[110px] text-[11px] font-black uppercase tracking-widest text-gray-400 text-left">
              Jour
            </th>
            {services.map((service) => {
              const doctors = doctorsByService[service.id] ?? [];
              const colSpan = Math.max(doctors.length, 1);
              return (
                <th
                  key={service.id}
                  colSpan={colSpan}
                  className="sticky top-0 z-20 bg-[#EAF3FA] border-b border-r border-gray-100 px-3 py-2 text-[11px] font-black uppercase tracking-widest text-[#005b82] text-center"
                >
                  {service.name}
                </th>
              );
            })}
          </tr>
          <tr>
            <th className="sticky top-[41px] left-0 z-30 bg-gray-50 border-b border-r border-gray-100" />
            {services.map((service) => {
              const doctors = doctorsByService[service.id] ?? [];
              if (doctors.length === 0) {
                return (
                  <th key={service.id} className="sticky top-[41px] z-10 bg-gray-50 border-b border-r border-gray-100 px-3 py-2 text-[10px] font-semibold text-gray-300">
                    Aucun médecin
                  </th>
                );
              }
              return doctors.map((doctor) => (
                <th
                  key={doctor.id}
                  className="sticky top-[41px] z-10 bg-gray-50 border-b border-r border-gray-100 px-3 py-2 text-[10px] font-bold text-gray-600 whitespace-nowrap min-w-[150px]"
                >
                  Dr. {doctor.prenom} {doctor.nom}
                </th>
              ));
            })}
          </tr>
        </thead>
        <tbody>
          {days.map((day) => {
            const dateStr = format(day, 'yyyy-MM-dd');
            const isPast = isPastSlotDate(dateStr);
            return (
              <tr key={dateStr}>
                <td className="sticky left-0 z-10 bg-white border-b border-r border-gray-100 px-3 py-3 align-top">
                  <p className="text-[12px] font-black text-gray-800 capitalize">{format(day, 'EEEE', { locale: fr })}</p>
                  <p className="text-[10px] text-gray-400">{format(day, 'dd MMM', { locale: fr })}</p>
                </td>
                {services.map((service) => {
                  const doctors = doctorsByService[service.id] ?? [];
                  if (doctors.length === 0) {
                    return <td key={service.id} className="border-b border-r border-gray-100 bg-gray-50/40" />;
                  }
                  return doctors.map((doctor) => {
                    const key = `${doctor.id}_${dateStr}`;
                    const slots = slotsByDoctorAndDay[key] ?? [];
                    return (
                      <td key={doctor.id} className="border-b border-r border-gray-100 px-2 py-2 align-top min-w-[150px]">
                        <div className="flex flex-col gap-1">
                          {slots.map((slot) => (
                            <button
                              key={slot.id}
                              disabled={!canManagePlanning || isPast}
                              onClick={() => onSlotEdit(slot, doctor)}
                              className={cn(
                                "text-left rounded-lg px-2 py-1.5 text-[10px] font-bold transition-colors",
                                slot.disponible ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100" : "bg-red-50 text-red-700 hover:bg-red-100",
                                (!canManagePlanning || isPast) && "cursor-default opacity-70"
                              )}
                            >
                              <span>{slot.heureDebut} - {slot.heureFin}</span>
                              {slot.quota ? <span className="block text-[9px] font-semibold opacity-80">{slot.quota} patient{slot.quota > 1 ? 's' : ''}</span> : null}
                            </button>
                          ))}
                          {canManagePlanning && !isPast ? (
                            <button
                              onClick={() => onCellAdd(day, doctor)}
                              className="print:hidden flex items-center justify-center gap-1 rounded-lg border border-dashed border-gray-200 px-2 py-1.5 text-[9px] font-bold text-gray-400 hover:border-[#005b82] hover:text-[#005b82] transition-colors"
                            >
                              <Plus className="w-3 h-3" />
                              Ajouter
                            </button>
                          ) : null}
                        </div>
                      </td>
                    );
                  });
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
      {!hasAnyDoctor ? (
        <p className="px-6 py-4 text-[11px] text-slate-400">
          Aucun médecin trouvé pour les services listés — vérifiez que les médecins sont bien affectés à ces services dans le service d'authentification.
        </p>
      ) : null}
    </div>
  );
}
