"use client";

import React, { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  format,
  addDays,
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  isSameDay,
  isSameMonth,
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
  Search,
  ArrowLeft,
  X,
  MapPin,
  Phone,
  Building2,
  CalendarDays,
  Calendar,
  Briefcase,
  Activity,
  AlertCircle,
  HelpCircle,
  MoreVertical
} from "lucide-react";
import { useAllConsultations } from "@/hooks/use-consultations";
import { usePlanning, useCreatePlanning, useDeletePlanning, useUpdatePlanning } from "@/hooks/use-planning";
import { ConsultationApi } from "@/lib/api/consultation";
import { useQuery } from '@tanstack/react-query';
import { planningApi } from '@/lib/api/planning';
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from '@/context/AuthContext';

// -- Constants --
const START_HOUR = 7;
const END_HOUR = 18;
const HOUR_HEIGHT = 95; // px per hour
const TOTAL_HOURS = END_HOUR - START_HOUR;

type CalendarViewMode = 'day' | 'week' | 'month';

export default function PlanningCompletPage() {
  const router = useRouter();
  const [selectedAppointment, setSelectedAppointment] = useState<ConsultationApi | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [now, setNow] = useState(new Date());
  const [isMounted, setIsMounted] = useState(false);
  const dateInputRef = React.useRef<HTMLInputElement>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalDate, setModalDate] = useState<Date | null>(null);
  const [isFixedDate, setIsFixedDate] = useState(true);
  const [planningForm, setPlanningForm] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    heureDebut: '08:00',
    heureFin: '12:00',
    quota: 1,
    disponible: true,
    notes: '',
    medecinId: 0 as number | null,
  });
  const [selectedDoctorId, setSelectedDoctorId] = useState<number | null>(null);
  const [viewedDoctorId, setViewedDoctorId] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<CalendarViewMode>('week');
  const { medecin, role } = useAuth();
  const { data: planning = [], isLoading: loadingPlanning } = usePlanning();
  const { data: availableMedecins = [] } = useQuery({
    queryKey: ['medecins'],
    queryFn: planningApi.getMedecins,
    enabled: role === 'admin',
  });
  const createPlanning = useCreatePlanning();
  const updatePlanning = useUpdatePlanning();
  const deletePlanning = useDeletePlanning();

  // Update current time indicator every minute
  useEffect(() => {
    setIsMounted(true);
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (medecin?.id) {
      setSelectedDoctorId((current) => current ?? medecin.id);
      setPlanningForm((current) => ({ ...current, medecinId: current.medecinId ?? medecin.id }));
    }
  }, [medecin?.id]);

  const canManagePlanning = role === 'admin';

  const filteredPlanning = useMemo(() => {
    if (!canManagePlanning || viewedDoctorId === null || viewedDoctorId === 0) {
      return planning;
    }

    return planning.filter((slot) => slot.medecinId === viewedDoctorId);
  }, [canManagePlanning, planning, viewedDoctorId]);

  const { data: consultations = [], isLoading: loading, error } = useAllConsultations();

  // Navigation Logic
  const startOfCurrentWeek = useMemo(() => startOfWeek(currentDate, { weekStartsOn: 1 }), [currentDate]);
  const weekDays = useMemo(() => Array.from({ length: 6 }).map((_, i) => addDays(startOfCurrentWeek, i)), [startOfCurrentWeek]);
  const monthDays = useMemo(() => {
    const firstDayOfMonth = startOfMonth(currentDate);
    const firstVisibleDay = startOfWeek(firstDayOfMonth, { weekStartsOn: 1 });
    const lastVisibleDay = endOfWeek(endOfMonth(currentDate), { weekStartsOn: 1 });
    const days: Date[] = [];
    let cursor = new Date(firstVisibleDay);

    while (cursor <= lastVisibleDay) {
      days.push(new Date(cursor));
      cursor = addDays(cursor, 1);
    }

    return days;
  }, [currentDate]);
  const displayedDays = useMemo(() => {
    if (viewMode === 'day') {
      return [currentDate];
    }

    return weekDays;
  }, [currentDate, viewMode, weekDays]);

  const handleNextPeriod = () => {
    if (viewMode === 'day') {
      setCurrentDate(addDays(currentDate, 1));
      return;
    }

    if (viewMode === 'month') {
      setCurrentDate(addMonths(currentDate, 1));
      return;
    }

    setCurrentDate(addWeeks(currentDate, 1));
  };

  const handlePrevPeriod = () => {
    if (viewMode === 'day') {
      setCurrentDate(subWeeks(currentDate, 1));
      return;
    }

    if (viewMode === 'month') {
      setCurrentDate(subMonths(currentDate, 1));
      return;
    }

    setCurrentDate(subWeeks(currentDate, 1));
  };

  const handleToday = () => setCurrentDate(new Date());

  const periodLabel = useMemo(() => {
    if (viewMode === 'day') {
      return `Jour du ${format(currentDate, 'dd MMMM yyyy', { locale: fr })}`;
    }

    if (viewMode === 'month') {
      return `Mois de ${format(currentDate, 'MMMM yyyy', { locale: fr })}`;
    }

    return `Semaine du ${format(weekDays[0], 'dd')} au ${format(weekDays[5], 'dd MMMM yyyy', { locale: fr })}`;
  }, [currentDate, viewMode, weekDays]);

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = new Date(e.target.value);
    if (!isNaN(newDate.getTime())) {
      setCurrentDate(newDate);
    }
  };

  const openAddModal = (date: Date, fixed = true) => {
    setModalDate(date);
    setIsFixedDate(fixed);
    setSelectedDoctorId((current) => current ?? viewedDoctorId ?? medecin?.id ?? null);
    setPlanningForm((current) => ({ ...current, medecinId: medecin?.id ?? current.medecinId }));
    setIsModalOpen(true);
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

  const doctorName = medecin ? `Dr. ${medecin.prenom} ${medecin.nom}` : 'Dr. connecté';

  const planningByDay = useMemo(() => {
    const map: Record<string, typeof filteredPlanning> = {};
    filteredPlanning.forEach((slot) => {
      const day = slot.date.split('T')[0];
      if (!map[day]) map[day] = [];
      map[day].push(slot);
    });
    return map;
  }, [filteredPlanning]);

  const handleSavePlanning = async () => {
    if (!medecin?.id || !planningForm.date || !planningForm.heureDebut || !planningForm.heureFin) return;

    try {
      await createPlanning.mutateAsync({
        medecinId: canManagePlanning ? (selectedDoctorId ?? medecin.id) : medecin.id,
        date: planningForm.date,
        heureDebut: planningForm.heureDebut,
        heureFin: planningForm.heureFin,
        quota: Number(planningForm.quota || 1),
        disponible: planningForm.disponible,
        notes: planningForm.notes || undefined,
      });
      setIsModalOpen(false);
      setPlanningForm({
        date: format(new Date(), 'yyyy-MM-dd'),
        heureDebut: '08:00',
        heureFin: '12:00',
        quota: 1,
        disponible: true,
        notes: '',
        medecinId: medecin.id,
      });
    } catch (error) {
      console.error(error);
    }
  };

  const togglePlanningAvailability = async (slot: any) => {
    try {
      await updatePlanning.mutateAsync({
        id: slot.id,
        payload: { disponible: !slot.disponible }
      });
    } catch (error) {
      console.error(error);
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
      <div className="fixed bottom-4 right-4 z-40 w-[calc(100vw-2rem)] max-w-md md:w-full pointer-events-none">
        <div className="pointer-events-auto ml-auto">
        </div>
      </div>

      {/* --- HEADER --- */}
      <header className="bg-white border-b border-gray-200 px-8 py-6 flex-none flex flex-col md:flex-row md:items-center justify-between gap-4 text-slate-700 z-30 shadow-sm">
        <div className="flex items-start gap-5">
          <Link
            href="/modules/consultation-externe"
            className="group inline-flex items-center justify-center p-3 rounded-2xl bg-white shadow-sm border border-gray-100 hover:bg-[#EAF3FA] transition-all text-[#006A8C] hover:scale-105 active:scale-95 mt-1"
            title="Retour"
          >
            <ArrowLeft className="h-5 w-5" strokeWidth={2.5} />
          </Link>
          <div>
            <h1 className="text-[24px] font-black text-gray-900 tracking-tight">Planning complet de la consultation externe</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[14px] font-medium text-gray-500">{doctorName}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {canManagePlanning ? (
            <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 shadow-sm">
              <label className="text-[12px] font-semibold text-gray-600">Afficher</label>
              <select
                value={viewedDoctorId ?? ''}
                onChange={(e) => setViewedDoctorId(e.target.value ? Number(e.target.value) : null)}
                className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-[12px] font-semibold text-gray-700 outline-none"
              >
                <option value="">Tous les médecins</option>
                {availableMedecins.map((doctor) => (
                  <option key={doctor.id} value={doctor.id}>
                    {doctor.prenom} {doctor.nom}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          <div className="flex items-center bg-gray-50 border border-gray-200 rounded-xl p-1 shadow-sm">
            <div className="flex items-center rounded-xl border border-gray-200 bg-gray-50 p-1 shadow-sm">
              {(['day', 'week', 'month'] as CalendarViewMode[]).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={cn(
                    'rounded-lg px-3 py-2 text-[12px] font-semibold capitalize transition-all',
                    viewMode === mode ? 'bg-white text-[#005b82] shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  )}
                >
                  {mode === 'day' ? 'Jour' : mode === 'week' ? 'Semaine' : 'Mois'}
                </button>
              ))}
            </div>

            <Button variant="ghost" size="icon" onClick={handlePrevPeriod} className="h-9 w-9 rounded-lg hover:bg-white hover:shadow-sm">
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
                {periodLabel}
                <Calendar className="w-3.5 h-3.5 text-gray-400 group-hover:text-[#005b82]" />
              </div>
            </div>

            <Button variant="ghost" size="icon" onClick={handleNextPeriod} className="h-9 w-9 rounded-lg hover:bg-white hover:shadow-sm">
              <ChevronRight className="w-5 h-5 text-gray-600" />
            </Button>
          </div>

          <Button onClick={handleToday} variant="outline" className="rounded-xl font-bold text-[13px] border-gray-200 shadow-sm px-5 bg-white hover:bg-gray-50">
            Aujourd'hui
          </Button>

          {canManagePlanning ? (
            <div className="relative">
              <Button
                onClick={() => openAddModal(new Date(), false)}
                className="bg-[#005b82] cursor-pointer hover:bg-[#004a6b] text-white rounded-xl px-5 h-11 font-black text-[13px] shadow-lg shadow-blue-900/10 gap-2"
              >
                <Plus className="w-4 h-4" strokeWidth={3} />
                NOUVEAU CRÉNEAU
              </Button>
            </div>
          ) : null}
        </div>
      </header>

      {/* --- MAIN CONTENT --- */}
      <div className="flex-1 flex overflow-hidden p-6 gap-4 lg:gap-6">
        <div className="flex-1 bg-white rounded-[32px] border border-gray-100 shadow-[0px_4px_24px_rgba(15,23,42,0.04)] flex flex-col overflow-hidden">
          {viewMode === 'month' ? (
            <div className="flex-1 overflow-auto p-6 sm:p-8">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Vue mois</p>
                  <h3 className="text-[18px] font-black text-gray-900 mt-1">{format(currentDate, 'MMMM yyyy', { locale: fr })}</h3>
                </div>
                <div className="rounded-full bg-gray-50 px-3 py-1 text-[12px] font-semibold text-gray-500">
                  Cliquez sur un jour pour ouvrir la vue journée
                </div>
              </div>

              <div className="mt-6 grid grid-cols-7 gap-2">
                {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map((label) => (
                  <div key={label} className="text-center text-[11px] font-black uppercase tracking-widest text-gray-400 py-2">
                    {label}
                  </div>
                ))}

                {monthDays.map((day) => {
                  const dayStr = format(day, 'yyyy-MM-dd');
                  const count = groupedConsultations[dayStr]?.length || 0;
                  const isCurrentMonth = isSameMonth(day, currentDate);
                  const isToday = isSameDay(day, now);

                  return (
                    <button
                      key={dayStr}
                      onClick={() => {
                        setCurrentDate(day);
                        setViewMode('day');
                      }}
                      className={cn(
                        'min-h-[92px] rounded-2xl border p-3 text-left transition-all',
                        isCurrentMonth ? 'border-gray-100 bg-white hover:border-[#005b82] hover:shadow-sm' : 'border-transparent bg-gray-50/70 text-gray-400',
                        isToday && 'ring-2 ring-[#005b82]/20'
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className={cn('text-[13px] font-black', isCurrentMonth ? 'text-gray-800' : 'text-gray-400')}>
                          {format(day, 'dd')}
                        </span>
                        {count > 0 ? (
                          <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-black text-[#005b82]">
                            {count}
                          </span>
                        ) : null}
                      </div>
                      <div className="mt-4 text-[10px] font-semibold text-gray-500">
                        {count > 0 ? `${count} consultation${count > 1 ? 's' : ''}` : 'Libre'}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <>
              {/* Grid Headers - FIXED */}
              <div className={cn("grid border-b border-gray-100 bg-gray-50/50 flex-none", viewMode === 'day' ? 'grid-cols-[80px_1fr]' : 'grid-cols-[80px_1fr_1fr_1fr_1fr_1fr_1fr]')}>
                <div className="h-20 border-r border-gray-100"></div>
                {displayedDays.map((day, idx) => {
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
                <div className={cn("grid relative min-h-[1250px]", viewMode === 'day' ? 'grid-cols-[80px_1fr]' : 'grid-cols-[80px_1fr_1fr_1fr_1fr_1fr_1fr]')}>

                  {/* Vertical Time Scale */}
                  <div className="bg-gray-50/30 border-r border-gray-100">
                    {Array.from({ length: TOTAL_HOURS }).map((_, i) => (
                      <div key={i} className="h-[95px] flex items-start justify-center pt-4 border-b border-gray-50 last:border-b-0">
                        <span className="text-[11px] font-black text-gray-400">{(START_HOUR + i).toString().padStart(2, '0')}:00</span>
                      </div>
                    ))}
                  </div>

                  {/* Day Columns */}
                  {displayedDays.map((day, dayIdx) => {
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
                          <div key={i} className="h-[95px] border-b border-gray-50 last:border-b-0"></div>
                        ))}

                        {/* Planning slots */}
                        {planningByDay[dayStr]?.map((slot) => {
                          const start = slot.heureDebut.split(':').map(Number);
                          const end = slot.heureFin.split(':').map(Number);
                          const slotTop = ((start[0] - START_HOUR) * HOUR_HEIGHT) + (start[1] / 60 * HOUR_HEIGHT);
                          const slotHeight = ((end[0] - start[0]) * HOUR_HEIGHT) + ((end[1] - start[1]) / 60 * HOUR_HEIGHT);

                          return (
                            <div
                              key={slot.id}
                              className={cn(
                                'absolute left-1 right-1 rounded-xl border px-2 py-2 z-10 shadow-sm',
                                slot.disponible ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'
                              )}
                              style={{ top: `${Math.max(0, slotTop)}px`, height: `${Math.max(40, slotHeight)}px` }}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-[10px] font-black text-gray-900">{slot.heureDebut} - {slot.heureFin}</span>
                                {canManagePlanning ? (
                                  <button
                                    onClick={() => togglePlanningAvailability(slot)}
                                    className={cn(
                                      'text-[9px] font-bold rounded-full px-2 py-1',
                                      slot.disponible ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
                                    )}
                                  >
                                    {slot.disponible ? 'Disponible' : 'Indisponible'}
                                  </button>
                                ) : null}
                              </div>
                              <div className="mt-1 text-[9px] font-semibold text-gray-700">
                                Quota : {slot.quota ?? 1} patient{(slot.quota ?? 1) > 1 ? 's' : ''}
                              </div>
                              {slot.notes && (
                                <p className="mt-1 text-[9px] text-gray-600 truncate">{slot.notes}</p>
                              )}
                            </div>
                          );
                        })}

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
              <div className={cn("grid border-t border-gray-100 bg-white flex-none", viewMode === 'day' ? 'grid-cols-[80px_1fr]' : 'grid-cols-[80px_1fr_1fr_1fr_1fr_1fr_1fr]')}>
                <div className="border-r border-gray-100 bg-gray-50/10"></div>
                {displayedDays.map((day, idx) => (
                  <div key={idx} className="p-3 border-r border-gray-100 last:border-r-0">
                    {canManagePlanning ? (
                      <Button
                        onClick={() => {
                          setPlanningForm(prev => ({ ...prev, date: format(day, 'yyyy-MM-dd') }));
                          setIsModalOpen(true);
                        }}
                        variant="ghost"
                        className="w-full h-10 cursor-pointer rounded-xl border border-dashed border-gray-200 text-gray-600 hover:text-[#005b82] hover:bg-blue-50 hover:border-blue-200 text-[11px] font-bold gap-2"
                      >
                        <Plus className="w-3 h-3" />
                        AJOUTER CRÉNEAU
                      </Button>
                    ) : (
                      <div className="w-full h-10 rounded-xl border border-dashed border-gray-100 bg-gray-50 text-[11px] font-semibold text-gray-400 flex items-center justify-center">
                        Lecture seule
                      </div>
                    )}
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
            </>
          )}
        </div>

        {/* --- SIDEBAR --- FIXED POSITIONING */}
        {selectedAppointment ? (
          <aside className="w-full lg:w-[360px] flex-none flex flex-col gap-8 self-start sticky top-0 h-full overflow-hidden">
            <div className="flex-1 bg-white rounded-[32px] p-6 shadow-[0px_4px_24px_rgba(15,23,42,0.04)] border border-gray-100 flex flex-col overflow-y-auto">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Consultation sélectionnée</p>
                  <h3 className="text-[18px] font-black text-gray-900 mt-1">Patient #{selectedAppointment.patientId}</h3>
                </div>
                <button
                  onClick={() => setSelectedAppointment(null)}
                  className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="w-full h-full flex flex-col animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="mb-8">
                  <div className="w-20 h-20 bg-blue-50 rounded-[24px] flex items-center justify-center text-[#005b82] mx-auto mb-4 border border-blue-100">
                    <User className="w-10 h-10" strokeWidth={2.5} />
                  </div>
                  <h3 className="text-[20px] font-black text-gray-900 uppercase text-center">Patient #{selectedAppointment.patientId}</h3>
                  <Badge variant="outline" className="mt-2 border-gray-200 text-gray-500 font-bold px-3 py-1 rounded-full uppercase text-[10px] tracking-widest mx-auto flex w-fit">
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
                    className="w-full bg-[#005b82] cursor-pointer hover:bg-[#004a6b] h-14 rounded-2xl font-black text-[14px] text-white shadow-xl shadow-blue-900/10 active:scale-[0.98] transition-all flex items-center justify-center gap-3"
                  >
                    <CheckCircle2 className="w-5 h-5" />
                    TRAITER
                  </Button>
                </div>
              </div>
            </div>
          </aside>
        ) : null}
      </div>

      {/* --- PLANNING MODAL --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* Overlay */}
          <div
            className="absolute inset-0 bg-gray-900/40 backdrop-blur-[2px]"
            onClick={() => setIsModalOpen(false)}
          />

          {/* Modal Content */}
          <div className="relative w-full max-w-3xl bg-white rounded-[32px] shadow-[0px_32px_64px_-12px_rgba(0,0,0,0.14)] overflow-hidden animate-in fade-in zoom-in duration-200">
            {/* Header */}
            <div className="px-8 py-6 border-b border-gray-50 flex items-center justify-between">
              <h2 className="text-[20px] font-black text-gray-900">Ajouter un créneau</h2>
              <div className="flex items-center gap-6">
                {isFixedDate ? (
                  <span className="text-[14px] font-bold text-[#005b82] uppercase tracking-tight">
                    {modalDate && format(modalDate, "EEEE, dd MMMM yyyy", { locale: fr })}
                  </span>
                ) : (
                  <div className="relative flex items-center gap-2 bg-[#F1F5F9] rounded-xl px-3 py-2 border border-blue-100 hover:border-blue-300 transition-all group">
                    <Calendar className="w-3.5 h-3.5 text-[#005b82]" />
                    <input
                      type="date"
                      value={modalDate ? format(modalDate, "yyyy-MM-dd") : ""}
                      onChange={(e) => setModalDate(new Date(e.target.value))}
                      className="bg-transparent border-none text-[12px] font-black text-[#005b82] uppercase tracking-tight outline-none cursor-pointer"
                    />
                  </div>
                )}
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 hover:bg-gray-100 cursor-pointer rounded-full transition-colors text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-8 max-h-[80vh] overflow-y-auto custom-scrollbar">
              <div className="space-y-6">
                <section className="space-y-5">
                  <div className="flex items-center gap-2 text-[#005b82]">
                    <CalendarDays className="w-4 h-4" strokeWidth={2.5} />
                    <h3 className="text-[11px] font-black uppercase tracking-[0.15em]">Informations du créneau</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Date</label>
                      <input
                        type="date"
                        value={planningForm.date}
                        onChange={(e) => setPlanningForm(prev => ({ ...prev, date: e.target.value }))}
                        className="w-full h-11 bg-[#F1F5F9]/80 border-none rounded-xl px-4 text-[13px] font-bold text-gray-900 focus:ring-2 focus:ring-blue-100"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Disponibilité</label>
                      <select
                        value={planningForm.disponible ? 'disponible' : 'indisponible'}
                        onChange={(e) => setPlanningForm(prev => ({ ...prev, disponible: e.target.value === 'disponible' }))}
                        className="w-full h-11 bg-[#F1F5F9]/80 border-none rounded-xl px-4 text-[13px] font-bold text-gray-900 focus:ring-2 focus:ring-blue-100 outline-none"
                      >
                        <option value="disponible">Disponible</option>
                        <option value="indisponible">Indisponible</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {canManagePlanning ? (
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Médecin</label>
                        <select
                          value={selectedDoctorId ?? ''}
                          onChange={(e) => setSelectedDoctorId(Number(e.target.value))}
                          className="w-full h-11 bg-[#F1F5F9]/80 border-none rounded-xl px-4 text-[13px] font-bold text-gray-900 focus:ring-2 focus:ring-blue-100 outline-none"
                        >
                          {availableMedecins.map((doctor) => (
                            <option key={doctor.id} value={doctor.id}>
                              {doctor.prenom} {doctor.nom}
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : null}
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Quota de patients</label>
                      <input
                        type="number"
                        min="1"
                        value={planningForm.quota}
                        onChange={(e) => setPlanningForm(prev => ({ ...prev, quota: Number(e.target.value || 1) }))}
                        className="w-full h-11 bg-[#F1F5F9]/80 border-none rounded-xl px-4 text-[13px] font-bold text-gray-900 focus:ring-2 focus:ring-blue-100"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Heure de début</label>
                      <input
                        type="time"
                        value={planningForm.heureDebut}
                        onChange={(e) => setPlanningForm(prev => ({ ...prev, heureDebut: e.target.value }))}
                        className="w-full h-11 bg-[#F1F5F9]/80 border-none rounded-xl px-4 text-[13px] font-bold text-gray-900 focus:ring-2 focus:ring-blue-100"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Heure de fin</label>
                      <input
                        type="time"
                        value={planningForm.heureFin}
                        onChange={(e) => setPlanningForm(prev => ({ ...prev, heureFin: e.target.value }))}
                        className="w-full h-11 bg-[#F1F5F9]/80 border-none rounded-xl px-4 text-[13px] font-bold text-gray-900 focus:ring-2 focus:ring-blue-100"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Note</label>
                    <textarea
                      value={planningForm.notes}
                      onChange={(e) => setPlanningForm(prev => ({ ...prev, notes: e.target.value }))}
                      placeholder="Ex : réunion, congé, etc."
                      className="w-full h-24 bg-[#F1F5F9]/80 border-none rounded-xl px-4 py-3 text-[13px] font-bold text-gray-900 focus:ring-2 focus:ring-blue-100 resize-none"
                    />
                  </div>
                </section>
              </div>
            </div>

            <div className="px-8 py-5 bg-gray-50/50 border-t border-gray-100 flex items-center justify-end gap-6">
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-[13px] cursor-pointer font-bold text-gray-500 hover:text-gray-700 transition-colors"
              >
                Fermer
              </button>
              <Button
                onClick={handleSavePlanning}
                className="bg-[#005b82] cursor-pointer hover:bg-[#004a6b] text-white rounded-full px-8 h-11 font-black text-[13px] shadow-lg shadow-blue-900/10 gap-2"
              >
                <Plus className="w-4 h-4" strokeWidth={3} />
                ENREGISTRER
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
