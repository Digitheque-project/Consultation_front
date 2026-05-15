"use client";

import React, { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  format,
  addDays,
  startOfWeek,
  isSameDay,
  parse,
  differenceInMinutes,
  addWeeks,
  subWeeks,
  isSameWeek
} from "date-fns";
import { fr } from "date-fns/locale";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  User,
  Clock,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Calendar,
  MoreVertical,
  Search
} from "lucide-react";
import { useAllConsultations } from "@/hooks/use-consultations";
import { ConsultationApi } from "@/lib/api/consultation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

// -- Constants --
const START_HOUR = 7;
const END_HOUR = 18;
const HOUR_HEIGHT = 100; // px per hour
const TOTAL_HOURS = END_HOUR - START_HOUR;

export default function PlanningCompletPage() {
  const router = useRouter();
  const [selectedAppointment, setSelectedAppointment] = useState<ConsultationApi | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [now, setNow] = useState(new Date());
  const [isMounted, setIsMounted] = useState(false);
  const dateInputRef = React.useRef<HTMLInputElement>(null);

  // Update current time indicator every minute
  useEffect(() => {
    setIsMounted(true);
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const { data: consultations = [], isLoading: loading, error } = useAllConsultations();

  // Navigation Logic
  const startOfCurrentWeek = useMemo(() => startOfWeek(currentDate, { weekStartsOn: 1 }), [currentDate]);
  const weekDays = useMemo(() => Array.from({ length: 6 }).map((_, i) => addDays(startOfCurrentWeek, i)), [startOfCurrentWeek]);

  const handleNextWeek = () => setCurrentDate(addWeeks(currentDate, 1));
  const handlePrevWeek = () => setCurrentDate(subWeeks(currentDate, 1));
  const handleToday = () => setCurrentDate(new Date());

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = new Date(e.target.value);
    if (!isNaN(newDate.getTime())) {
      setCurrentDate(newDate);
    }
  };

  const triggerDatePicker = () => {
    if (dateInputRef.current) {
      if ('showPicker' in HTMLInputElement.prototype) {
        try {
          dateInputRef.current.showPicker();
        } catch (e) {
          dateInputRef.current.click();
        }
      } else {
        dateInputRef.current.click();
      }
    }
  };

  // Grouping consultations by day
  const groupedConsultations = useMemo(() => {
    const map: Record<string, ConsultationApi[]> = {};
    consultations.forEach(c => {
      const d = format(new Date(c.date), "yyyy-MM-dd");
      if (!map[d]) map[d] = [];
      map[d].push(c);
    });
    return map;
  }, [consultations]);

  const handleStartPrescription = async (appointment: ConsultationApi) => {
    try {
      const response = await fetch('/api/redirect/traitement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          consultationId: appointment.id,
          patientId: appointment.patientId,
          from: 'planning-complet'
        }),
      });

      if (response.ok) {
        const data = await response.json();
        router.push(data.redirectUrl);
      } else {
        router.push(`/modules/consultation-externe/traitement?id=${appointment.id}`);
      }
    } catch (err) {
      router.push(`/modules/consultation-externe/traitement?id=${appointment.id}`);
    }
  };

  // Rendering Helpers
  const renderTimeIndicator = () => {
    const isThisWeek = isSameWeek(now, startOfCurrentWeek, { weekStartsOn: 1 });
    if (!isThisWeek) return null;

    const hours = now.getHours();
    const minutes = now.getMinutes();

    if (hours < START_HOUR || hours >= END_HOUR) return null;

    const top = ((hours - START_HOUR) * HOUR_HEIGHT) + (minutes / 60 * HOUR_HEIGHT);
    const dayIndex = now.getDay() - 1; // 0 for Mon, 5 for Sat

    if (dayIndex < 0 || dayIndex > 5) return null;

    return (
      <div
        className="absolute left-0 right-0 z-20 pointer-events-none flex items-center"
        style={{ top: `${top}px` }}
      >
        <div className="bg-red-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded ml-[-35px] shadow-sm">
          {format(now, "HH:mm")}
        </div>
        <div className="flex-1 border-t-2 border-red-500 border-dashed opacity-60 ml-1"></div>
      </div>
    );
  };

  if (!isMounted) return null;

  return (
    <div className="flex-1 h-full flex flex-col bg-[#F8FAFC] overflow-hidden">
      {/* --- HEADER --- */}
      <header className="bg-white border-b border-gray-200 px-8 py-6 flex-none flex flex-col md:flex-row md:items-center justify-between gap-4 text-slate-700 z-30 shadow-sm">
        <div>
          <h1 className="text-[24px] font-black text-gray-900 tracking-tight">Planning complet de la consultation externe</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[14px] font-medium text-gray-500">Dr. Jean Pierre</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center bg-gray-50 border border-gray-200 rounded-xl p-1 shadow-sm">
            <Button variant="ghost" size="icon" onClick={handlePrevWeek} className="h-9 w-9 rounded-lg hover:bg-white hover:shadow-sm">
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            </Button>

            <div className="relative group" onClick={triggerDatePicker}>
              <input
                ref={dateInputRef}
                type="date"
                className="absolute inset-0 opacity-0 pointer-events-none"
                onChange={handleDateChange}
                value={format(currentDate, "yyyy-MM-dd")}
              />
              <div className="px-4 text-[14px] font-extrabold text-gray-800 flex items-center gap-2 cursor-pointer group-hover:text-[#005b82] transition-colors">
                Semaine du {format(weekDays[0], "dd")} au {format(weekDays[5], "dd MMMM yyyy", { locale: fr })}
                <Calendar className="w-3.5 h-3.5 text-gray-400 group-hover:text-[#005b82]" />
              </div>
            </div>

            <Button variant="ghost" size="icon" onClick={handleNextWeek} className="h-9 w-9 rounded-lg hover:bg-white hover:shadow-sm">
              <ChevronRight className="w-5 h-5 text-gray-600" />
            </Button>
          </div>

          <Button onClick={handleToday} variant="outline" className="rounded-xl font-bold text-[13px] border-gray-200 shadow-sm px-5 bg-white hover:bg-gray-50">
            Aujourd'hui
          </Button>

          <div className="relative">
            <Button className="bg-[#005b82] hover:bg-[#004a6b] text-white rounded-xl px-5 h-11 font-black text-[13px] shadow-lg shadow-blue-900/10 gap-2">
              <Plus className="w-4 h-4" strokeWidth={3} />
              NOUVEAU RENDEZ-VOUS
            </Button>
          </div>
        </div>
      </header>

      {/* --- MAIN CONTENT --- */}
      <div className="flex-1 flex overflow-hidden p-8 gap-8">
        <div className="flex-1 bg-white rounded-[32px] border border-gray-100 shadow-[0px_4px_24px_rgba(15,23,42,0.04)] flex flex-col overflow-hidden">

          {/* Grid Headers - FIXED */}
          <div className="grid grid-cols-[80px_1fr_1fr_1fr_1fr_1fr_1fr] border-b border-gray-100 bg-gray-50/50 flex-none">
            <div className="h-20 border-r border-gray-100"></div>
            {weekDays.map((day, idx) => {
              const dayStr = format(day, "yyyy-MM-dd");
              const count = groupedConsultations[dayStr]?.length || 0;
              const isToday = isSameDay(day, now);

              return (
                <div key={idx} className={cn(
                  "h-20 border-r border-gray-100 last:border-r-0 flex flex-col items-center justify-center gap-1",
                  isToday && "bg-blue-50/30"
                )}>
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{format(day, "EEE", { locale: fr })}</span>
                  <div className={cn(
                    "w-8 h-8 flex items-center justify-center rounded-full text-[16px] font-black",
                    isToday ? "bg-[#005b82] text-white shadow-md shadow-blue-200" : "text-gray-900"
                  )}>
                    {format(day, "dd")}
                  </div>
                  <span className={cn(
                    "text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-tight",
                    count >= 10 ? "bg-red-50 text-red-600" : count > 5 ? "bg-orange-50 text-orange-600" : "bg-emerald-50 text-emerald-600"
                  )}>
                    Quota: {count}/10
                  </span>
                </div>
              );
            })}
          </div>

          {/* Grid Body */}
          <div className="flex-1 overflow-y-auto relative">
            <div className="grid grid-cols-[80px_1fr_1fr_1fr_1fr_1fr_1fr] relative min-h-[1100px]">

              {/* Vertical Time Scale */}
              <div className="bg-gray-50/30 border-r border-gray-100">
                {Array.from({ length: TOTAL_HOURS }).map((_, i) => (
                  <div key={i} className="h-[100px] flex items-start justify-center pt-4 border-b border-gray-50 last:border-b-0">
                    <span className="text-[11px] font-black text-gray-400">{(START_HOUR + i).toString().padStart(2, '0')}:00</span>
                  </div>
                ))}
              </div>

              {/* Day Columns */}
              {weekDays.map((day, dayIdx) => {
                const dayStr = format(day, "yyyy-MM-dd");
                const dayAppointments = groupedConsultations[dayStr] || [];
                const isToday = isSameDay(day, now);

                return (
                  <div key={dayIdx} className={cn(
                    "relative border-r border-gray-100 last:border-r-0",
                    isToday && "bg-blue-50/10"
                  )}>
                    {/* Horizontal grid lines */}
                    {Array.from({ length: TOTAL_HOURS }).map((_, i) => (
                      <div key={i} className="h-[100px] border-b border-gray-50 last:border-b-0"></div>
                    ))}

                    {/* Appointments */}
                    {dayAppointments.map((appt) => {
                      const [h, m] = appt.heure.split(":").map(Number);
                      const top = ((h - START_HOUR) * HOUR_HEIGHT) + (m / 60 * HOUR_HEIGHT);
                      const height = 90; // Fixed height for visual consistency, or calculate based on duration

                      const isUrgent = appt.urgence;
                      const isDone = appt.termine;

                      return (
                        <div
                          key={appt.id}
                          onClick={() => setSelectedAppointment(appt)}
                          className={cn(
                            "absolute left-1 right-1 p-2.5 rounded-xl border transition-all cursor-pointer group hover:scale-[1.02] hover:shadow-xl z-10",
                            isDone ? "bg-white border-emerald-100 shadow-sm" :
                              isUrgent ? "bg-white border-red-100 shadow-md" :
                                "bg-white border-blue-100 shadow-sm"
                          )}
                          style={{ top: `${top}px`, height: `${height}px` }}
                        >
                          {/* Left Color Strip */}
                          <div className={cn(
                            "absolute left-0 top-2 bottom-2 w-1 rounded-r-full",
                            isDone ? "bg-emerald-500" : isUrgent ? "bg-red-500" : "bg-[#005b82]"
                          )} />

                          <div className="flex flex-col h-full pl-2">
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-[11px] font-black text-gray-900">{appt.heure}</span>
                              <Badge className={cn(
                                "text-[8px] px-1.5 py-0 rounded-md font-black uppercase border-none",
                                isUrgent ? "bg-red-100 text-red-700" : isDone ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-[#006A8C]"
                              )}>
                                {isUrgent ? "Urgent" : isDone ? "Terminé" : "Normal"}
                              </Badge>
                            </div>
                            <span className="text-[11px] font-black text-gray-800 truncate uppercase">Patient #{appt.patientId}</span>
                            <div className="mt-auto flex items-center justify-between">
                              <span className={cn(
                                "text-[9px] font-bold uppercase",
                                isDone ? "text-emerald-600" : isUrgent ? "text-red-500" : "text-blue-500"
                              )}>
                                {isDone ? "✓ Terminé" : isUrgent ? "• En attente" : "• En attente"}
                              </span>
                              <Button size="icon" variant="ghost" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity">
                                <MoreVertical className="w-3 h-3 text-gray-400" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}

                  </div>
                );
              })}

              {/* Render Current Time Line */}
              {renderTimeIndicator()}
            </div>
          </div>

          {/* Grid Footer - FIXED ACTION BAR */}
          <div className="grid grid-cols-[80px_1fr_1fr_1fr_1fr_1fr_1fr] border-t border-gray-100 bg-white flex-none">
            <div className="border-r border-gray-100 bg-gray-50/10"></div>
            {weekDays.map((_, idx) => (
              <div key={idx} className="p-3 border-r border-gray-100 last:border-r-0">
                <Button variant="ghost" className="w-full h-10 rounded-xl border border-dashed border-gray-200 text-gray-600 hover:text-[#005b82] hover:bg-blue-50 hover:border-blue-200 text-[11px] font-bold gap-2">
                  <Plus className="w-3 h-3" />
                  AJOUTER
                </Button>
              </div>
            ))}
          </div>

          {/* Footer Legend - FIXED */}
          <div className="p-4 bg-gray-50/50 border-t border-gray-100 flex-none flex items-center justify-center gap-8">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mr-[-20px]">STATUTS :</span>
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
              <span className="text-[11px] font-bold text-gray-600">En attente</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span className="text-[11px] font-bold text-gray-600">Terminé</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
              <span className="text-[11px] font-bold text-gray-600">Urgent</span>
            </div>
          </div>
        </div>

        {/* --- SIDEBAR --- FIXED POSITIONING */}
        <aside className="w-full lg:w-96 flex-none flex flex-col gap-8 self-start sticky top-0 h-full overflow-hidden">
          <div className="flex-1 bg-white rounded-[32px] p-8 shadow-[0px_4px_24px_rgba(15,23,42,0.04)] border border-gray-100 flex flex-col overflow-hidden">
            {selectedAppointment ? (
              <div className="w-full h-full flex flex-col animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="mb-8">
                  <div className="w-20 h-20 bg-blue-50 rounded-[24px] flex items-center justify-center text-[#005b82] mx-auto mb-4 border border-blue-100">
                    <User className="w-10 h-10" strokeWidth={2.5} />
                  </div>
                  <h3 className="text-[20px] font-black text-gray-900 uppercase">Patient #{selectedAppointment.patientId}</h3>
                  <Badge variant="outline" className="mt-2 border-gray-200 text-gray-500 font-bold px-3 py-1 rounded-full uppercase text-[10px] tracking-widest">
                    ID: {selectedAppointment.id}
                  </Badge>
                </div>

                <div className="space-y-6 text-left w-full">
                  <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100">
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-1">
                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Horaire</p>
                        <div className="flex items-center gap-2 text-[#005b82]">
                          <Clock className="w-4 h-4" />
                          <span className="text-[14px] font-black">{selectedAppointment.heure}</span>
                        </div>
                      </div>
                      <div className="space-y-1 text-right">
                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Type</p>
                        <span className={cn(
                          "text-[12px] font-black uppercase",
                          selectedAppointment.urgence ? "text-red-500" : "text-blue-500"
                        )}>
                          {selectedAppointment.urgence ? "Urgent" : "Standard"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="px-1 space-y-4">
                    <div>
                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2">Motif médical</p>
                      <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm italic text-gray-600 text-[13px] leading-relaxed">
                        "{selectedAppointment.observation?.diagnostic || "Aucun motif spécifique renseigné."}"
                      </div>
                    </div>

                    <div className="flex items-center justify-between py-4 border-t border-gray-100">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center",
                          selectedAppointment.termine ? "bg-emerald-100 text-emerald-600" : "bg-blue-100 text-blue-600"
                        )}>
                          {selectedAppointment.termine ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                        </div>
                        <span className="text-[13px] font-extrabold text-gray-700">Statut actuel</span>
                      </div>
                      <Badge className={cn(
                        "text-[10px] font-black uppercase px-4 py-1.5 rounded-full border-none",
                        selectedAppointment.termine ? "bg-emerald-500 text-white" : "bg-[#005b82] text-white"
                      )}>
                        {selectedAppointment.termine ? "Terminé" : "En attente"}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="mt-auto pt-8">
                  <Button
                    onClick={() => handleStartPrescription(selectedAppointment)}
                    className="w-full bg-[#005b82] hover:bg-[#004a6b] h-14 rounded-2xl font-black text-[14px] text-white shadow-xl shadow-blue-900/10 active:scale-[0.98] transition-all"
                  >
                    ACCÉDER AU DOSSIER
                  </Button>
                </div>
              </div>
            ) : (
              <div className="max-w-[240px]">
                <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6 border border-gray-100">
                  <Search className="w-8 h-8 text-gray-300" />
                </div>
                <h3 className="text-[16px] font-black text-gray-800 mb-2 leading-tight">Aucune consultation sélectionnée</h3>
                <p className="text-[13px] text-gray-400 font-medium">
                  Cliquez sur un rendez-vous dans le planning pour afficher les informations détaillées ici.
                </p>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
