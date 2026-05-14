"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Calendar, dateFnsLocalizer } from "react-big-calendar";
import { format, parse, startOfWeek, getDay } from "date-fns";
import { fr } from "date-fns/locale";
import { useAllConsultations } from "@/hooks/use-consultations";
import { ConsultationApi } from "@/lib/api/consultation";

type CalendarEvent = {
  id: number;
  title: string;
  start: Date;
  end: Date;
  resource: ConsultationApi;
};

const locales = {
  "fr-FR": fr,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

export default function PlanningCompletPage() {
  const router = useRouter();
  const [selectedAppointment, setSelectedAppointment] = useState<ConsultationApi | null>(null);
  const [view, setView] = useState<"month" | "week" | "day">("week");

  const { data: consultations = [], isLoading: loading, error } = useAllConsultations();

  const events: CalendarEvent[] = useMemo(() => {
    return consultations.map((consultation) => {
      // Parse the ISO date string
      const dateObj = new Date(consultation.date);
      const year = dateObj.getFullYear();
      const month = dateObj.getMonth();
      const day = dateObj.getDate();
      
      const [hours, minutes] = consultation.heure.split(":").map(Number);
      
      const start = new Date(year, month, day, hours, minutes);
      const end = new Date(year, month, day, hours + 1, minutes);

      return {
        id: consultation.id,
        title: `Patient #${consultation.patientId}`,
        start,
        end,
        resource: consultation,
      };
    });
  }, [consultations]);

  const handleSelectEvent = (event: CalendarEvent) => {
    setSelectedAppointment(event.resource);
  };

  const handleStartPrescription = async () => {
    if (!selectedAppointment) return;

    try {
      // Utiliser la route de redirection centralisée
      const response = await fetch('/api/redirect/traitement', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          consultationId: selectedAppointment.id,
          patientId: selectedAppointment.patientId,
          from: 'planning-complet'
        }),
      });

      if (response.ok) {
        const data = await response.json();
        router.push(data.redirectUrl);
      } else {
        console.error('Erreur lors de la redirection');
        // Fallback direct en cas d'erreur
        router.push(`/modules/consultation-externe/traitement?consultationId=${selectedAppointment.id}&patientId=${selectedAppointment.patientId}`);
      }
    } catch (error) {
      console.error('Erreur réseau:', error);
      // Fallback direct en cas d'erreur
      router.push(`/modules/consultation-externe/traitement?consultationId=${selectedAppointment.id}&patientId=${selectedAppointment.patientId}`);
    }
  };

  const agendaSummary = useMemo(() => {
    return {
      total: consultations.length,
      urgent: consultations.filter((item) => item.urgence).length,
      completed: consultations.filter((item) => item.termine).length,
    };
  }, [consultations]);

  const calendarStyles = `
    .rbc-calendar {
      font-family: inherit;
    }
    
    .rbc-header {
      background-color: #f1f5f9;
      border-color: #e2e8f0;
      padding: 12px 4px;
      font-weight: 600;
      color: #475569;
    }
    
    .rbc-today {
      background-color: #f0f9ff;
    }
    
    .rbc-off-range-bg {
      background-color: #f8fafc;
    }
    
    .rbc-event {
      background-color: #3b82f6;
      border: none;
      border-radius: 8px;
      padding: 4px 8px;
      font-size: 13px;
    }
    
    .rbc-event.rbc-event-urgent {
      background-color: #ef4444;
    }
    
    .rbc-event.rbc-event-completed {
      background-color: #10b981;
    }
    
    .rbc-event-label {
      font-size: 12px;
    }
    
    .rbc-event-content {
      padding: 2px;
    }
    
    .rbc-toolbar {
      padding: 16px;
      flex-wrap: wrap;
      gap: 8px;
    }
    
    .rbc-toolbar button {
      border: 1px solid #e2e8f0;
      background-color: white;
      color: #475569;
      padding: 8px 12px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 14px;
      transition: all 0.2s;
    }
    
    .rbc-toolbar button:hover {
      background-color: #f1f5f9;
      border-color: #cbd5e1;
    }
    
    .rbc-toolbar button.rbc-active {
      background-color: #005d8f;
      color: white;
      border-color: #005d8f;
    }
    
    .rbc-toolbar-label {
      font-size: 16px;
      font-weight: 600;
      color: #1e293b;
    }
    
    .rbc-day-bg,
    .rbc-time-slot {
      border-color: #e2e8f0;
    }
    
    .rbc-timeslot-group {
      border-color: #e2e8f0;
    }
    
    .rbc-time-header-content {
      border-color: #e2e8f0;
    }
    
    .rbc-time-content {
      border-color: #e2e8f0;
    }
  `;

  return (
    <div className="flex-1 flex overflow-hidden p-6 gap-6 h-[calc(100vh-64px)] text-slate-700">
      <style>{calendarStyles}</style>
      <section className="flex-1 flex flex-col bg-white rounded-2xl shadow-sm border border-[#e2e8f0] overflow-hidden">
        <div className="p-6 border-b border-[#e2e8f0]">
          <h2 className="text-xl font-bold text-slate-800">Planning complet de la consultation externe</h2>
          <p className="text-sm text-slate-500 mt-1">Vue calendrier jour/semaine/mois des consultations enregistrées.</p>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Consultations</p>
              <p className="mt-3 text-3xl font-bold text-slate-900">{agendaSummary.total}</p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Urgentes</p>
              <p className="mt-3 text-3xl font-bold text-red-600">{agendaSummary.urgent}</p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Terminées</p>
              <p className="mt-3 text-3xl font-bold text-emerald-600">{agendaSummary.completed}</p>
            </div>
          </div>
        </div>
        <div className="flex-1 overflow-hidden bg-white">
          {loading ? (
            <div className="flex items-center justify-center h-full text-slate-600">
              <div className="text-center">
                <div className="mb-4">Chargement du calendrier...</div>
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-full">
              <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">Erreur de chargement des consultations</div>
            </div>
          ) : (
            <Calendar
              localizer={localizer}
              events={events}
              startAccessor="start"
              endAccessor="end"
              style={{ height: "100%" }}
              onSelectEvent={handleSelectEvent}
              view={view}
              onView={(v) => setView(v as "month" | "week" | "day")}
              views={["month", "week", "day"]}
              defaultDate={new Date()}
              defaultView="week"
              eventPropGetter={(event: CalendarEvent) => {
                let className = "";
                if (event.resource.urgence) {
                  className = "rbc-event-urgent";
                } else if (event.resource.termine) {
                  className = "rbc-event-completed";
                }
                return { className };
              }}
            />
          )}
        </div>
      </section>

      <aside className="w-80 flex flex-col space-y-4 overflow-y-auto">
        <div className="rounded-3xl border border-[#e2e8f0] bg-white p-6 shadow-sm">
          {selectedAppointment ? (
            <>
              <h3 className="text-lg font-bold text-slate-900">Patient #{selectedAppointment.patientId}</h3>
              <p className="mt-2 text-sm text-slate-500">Consultation #{selectedAppointment.id}</p>
              <div className="mt-4 space-y-3 text-sm text-slate-700">
                <div className="flex justify-between">
                  <span className="font-medium">Date</span>
                  <span>{selectedAppointment.date}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Heure</span>
                  <span>{selectedAppointment.heure}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Motif</span>
                  <span>{selectedAppointment.observation?.diagnostic || "-"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Statut</span>
                  <span className="font-semibold">{selectedAppointment.statut}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Urgent</span>
                  <span className={selectedAppointment.urgence ? "text-red-600 font-semibold" : "text-green-600 font-semibold"}>
                    {selectedAppointment.urgence ? "Oui" : "Non"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Terminée</span>
                  <span className={selectedAppointment.termine ? "text-green-600 font-semibold" : "text-slate-600"}>
                    {selectedAppointment.termine ? "Oui" : "Non"}
                  </span>
                </div>
              </div>
              <button
                onClick={handleStartPrescription}
                className="mt-6 w-full rounded-full bg-blue-700 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-800 transition"
              >
                Prescrire pour cette consultation
              </button>
            </>
          ) : (
            <div className="text-slate-500">
              <p className="text-sm font-bold">Aucun rendez-vous sélectionné</p>
              <p className="mt-2 text-sm">Cliquez sur un événement du calendrier pour voir les détails.</p>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
