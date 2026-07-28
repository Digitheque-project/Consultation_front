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
  isSameWeek,
  isBefore,
  startOfDay
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
  MoreVertical,
  Maximize2,
  Minimize2,
  Trash2,
  Printer,
  Download
} from "lucide-react";
import { useAllConsultations } from "@/hooks/use-consultations";
import { usePlanning, useCreatePlanning, useDeletePlanning, useUpdatePlanning, usePlanningServices, useServiceDoctorsMap, useCreateRecurringPlanning, useUpdatePlanningSeries, useCreateUnavailability } from "@/hooks/use-planning";
import { ConsultationApi, consultationApi } from "@/lib/api/consultation";
import { useQuery } from '@tanstack/react-query';
import { planningApi, ServiceDoctorOption, DoctorPlanning, PlanningServiceOption } from '@/lib/api/planning';
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from '@/context/AuthContext';
import { ServiceGridView } from '@/components/planning/ServiceGridView';

// -- Constants --
const START_HOUR = 7;
const END_HOUR = 18;
// Réduit de 95 à 55px/heure — à 95px, seules ~2h tenaient à l'écran sans
// scroller, rendant impossible de voir d'un coup l'étendue d'un créneau
// long (ex: 8h-17h) ou plusieurs créneaux qui se suivent dans la journée.
const HOUR_HEIGHT = 55; // px per hour
const TOTAL_HOURS = END_HOUR - START_HOUR;

type CalendarViewMode = 'day' | 'week' | 'month';
type TopTab = 'calendrier' | 'service';
type ModalMode = 'single' | 'recurring' | 'unavailability';

const toMinutes = (time: string) => {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
};

// Répartit les créneaux qui se chevauchent dans le temps en colonnes côte à
// côte (algorithme glouton classique de calendrier) — sans ça, deux créneaux
// simultanés (ex: deux médecins différents) s'affichaient l'un sur l'autre.
function layoutSlots<T extends { heureDebut: string; heureFin: string }>(slots: T[]) {
  const sorted = [...slots].sort((a, b) => toMinutes(a.heureDebut) - toMinutes(b.heureDebut));
  const columnEndTimes: number[] = [];
  const placements = sorted.map((slot) => {
    const start = toMinutes(slot.heureDebut);
    const end = toMinutes(slot.heureFin);
    let col = columnEndTimes.findIndex((endTime) => endTime <= start);
    if (col === -1) {
      col = columnEndTimes.length;
      columnEndTimes.push(end);
    } else {
      columnEndTimes[col] = end;
    }
    return { slot, col };
  });
  const totalCols = columnEndTimes.length || 1;
  return placements.map((p) => ({ ...p, totalCols }));
}

export default function PlanningCompletPage() {
  const router = useRouter();
  const [selectedAppointment, setSelectedAppointment] = useState<ConsultationApi | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [now, setNow] = useState(new Date());
  const [isMounted, setIsMounted] = useState(false);
  const dateInputRef = React.useRef<HTMLInputElement>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSlotId, setEditingSlotId] = useState<number | null>(null);
  const [planningForm, setPlanningForm] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    heureDebut: '08:00',
    heureFin: '12:00',
    quota: 1,
    disponible: true,
    notes: '',
    medecinId: null as string | null,
  });
  const [selectedDoctorId, setSelectedDoctorId] = useState<string | null>(null);
  const [viewedDoctorId, setViewedDoctorId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<CalendarViewMode>('week');
  const [topTab, setTopTab] = useState<TopTab>('calendrier');
  // Mode plein écran : masque le menu latéral et le titre de la page (via un
  // calque qui recouvre tout le viewport), ne garde que les filtres de date.
  const [isFullscreen, setIsFullscreen] = useState(false);
  // Quand la modale est ouverte depuis la Vue par service, le médecin de la
  // case cliquée est déjà connu (colonne) — pas de <select> ambigu qui ne
  // contiendrait jamais les médecins des autres départements.
  const [lockedDoctor, setLockedDoctor] = useState<{ id: string; label: string } | null>(null);
  // Service choisi dans la modale (cascade Service → Médecin) — null = repli
  // sur la liste des médecins de consultation externe (comportement d'origine).
  const [modalServiceId, setModalServiceId] = useState<string | null>(null);
  // Mode de la modale en création : créneau simple, créneau récurrent
  // (Lun/Mer/Ven... sur une période) ou indisponibilité (plage de jours entiers).
  const [modalMode, setModalMode] = useState<ModalMode>('single');
  const isRecurring = modalMode === 'recurring';
  const isUnavailability = modalMode === 'unavailability';
  const [unavailabilityEndDate, setUnavailabilityEndDate] = useState('');
  const [conflictStrategy, setConflictStrategy] = useState<'keep' | 'replace'>('replace');
  const [recurringConflictChoice, setRecurringConflictChoice] = useState<'skip' | 'create'>('skip');
  const [recurrenceDays, setRecurrenceDays] = useState<number[]>([]); // 1=Lundi ... 7=Dimanche
  const [recurrenceEndDate, setRecurrenceEndDate] = useState('');
  // Portée de modification d'un créneau appartenant à une série récurrente.
  const [editScope, setEditScope] = useState<'one' | 'following'>('one');
  const [editingSlotSeriesId, setEditingSlotSeriesId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
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
  const createRecurringPlanning = useCreateRecurringPlanning();
  const updatePlanningSeries = useUpdatePlanningSeries();
  const createUnavailability = useCreateUnavailability();

  const isAdmin = role === 'admin';
  // Chargées dès que l'admin est connecté (pas seulement sur l'onglet Vue par
  // service) pour que le filtre "Service" soit tout de suite utilisable.
  const { data: planningServices = [] } = usePlanningServices(isAdmin);
  const { map: doctorsByService } = useServiceDoctorsMap(planningServices, isAdmin);
  const [serviceFilterId, setServiceFilterId] = useState<string | null>(null);

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

  // Ajout/modification des creneaux reserve a l'admin — le medecin ne fait que consulter.
  const canManagePlanning = isAdmin;

  const filteredPlanning = useMemo(() => {
    if (!isAdmin || !viewedDoctorId) {
      return planning;
    }

    return planning.filter((slot) => slot.medecinId === viewedDoctorId);
  }, [isAdmin, planning, viewedDoctorId]);

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

  // Jours affichés dans la Vue par service — suit le meme viewMode
  // (Jour/Semaine/Mois) que le calendrier, pour que ces boutons aient un
  // effet reel quel que soit l'onglet actif.
  const serviceGridDays = useMemo(() => {
    if (viewMode === 'day') return [currentDate];
    if (viewMode === 'month') {
      const start = startOfMonth(currentDate);
      const end = endOfMonth(currentDate);
      const days: Date[] = [];
      let cursor = new Date(start);
      while (cursor <= end) {
        days.push(new Date(cursor));
        cursor = addDays(cursor, 1);
      }
      return days;
    }
    return weekDays; // Mêmes jours que la vue calendrier (Lundi-Samedi) — les créneaux du week-end doivent rester visibles ici aussi.
  }, [viewMode, currentDate, weekDays]);

  // "Afficher" (medecin) et "Service" filtrent tous les deux la grille —
  // calcules ici pour que ServiceGridView reste un composant purement
  // presentationnel, sans logique de filtre a lui.
  const filteredPlanningServices = useMemo(() => {
    if (!serviceFilterId) return planningServices;
    return planningServices.filter((s) => s.id === serviceFilterId);
  }, [planningServices, serviceFilterId]);

  const filteredDoctorsByService = useMemo(() => {
    if (!viewedDoctorId) return doctorsByService;
    const result: Record<string, ServiceDoctorOption[]> = {};
    Object.entries(doctorsByService).forEach(([serviceId, doctors]) => {
      result[serviceId] = doctors.filter((d) => d.id === viewedDoctorId);
    });
    return result;
  }, [doctorsByService, viewedDoctorId]);

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

  // Même logique que periodLabel (mêmes jours affichés, Lundi-Samedi), avec un
  // format de titre légèrement différent pour la vue par service.
  const serviceGridPeriodLabel = useMemo(() => {
    if (viewMode === 'day') {
      return format(currentDate, 'EEEE dd MMMM yyyy', { locale: fr });
    }
    if (viewMode === 'month') {
      return `Mois de ${format(currentDate, 'MMMM yyyy', { locale: fr })}`;
    }
    return `Semaine du ${format(weekDays[0], 'dd')} au ${format(weekDays[5], 'dd MMMM yyyy', { locale: fr })}`;
  }, [currentDate, viewMode, weekDays]);

  // Export PDF de la Vue par service — fichier téléchargé directement
  // (indépendant du dialogue d'impression du navigateur, qui ne propose pas
  // toujours "Enregistrer en PDF"). Ne garde que les médecins ayant au moins
  // une ligne de planning sur la période affichée. Pagination gérée
  // manuellement par groupes de MAX_DOCTORS_PER_PAGE médecins (plutôt que de
  // laisser jspdf-autotable calculer un horizontalPageBreak automatique, qui
  // ne remplissait pas la largeur de page et coupait les groupes de façon
  // imprévisible) : chaque page étire ses colonnes pour occuper toute la
  // largeur imprimable, même la dernière page si elle compte moins de
  // médecins que les précédentes.
  const handleExportServicePdf = async () => {
    try {
      const [{ jsPDF }, autoTableModule] = await Promise.all([
        import('jspdf'),
        import('jspdf-autotable'),
      ]);
      const autoTable = autoTableModule.default;

      const slotsByDoctorAndDay: Record<string, DoctorPlanning[]> = {};
      planning.forEach((slot) => {
        const day = slot.date.split('T')[0];
        const key = `${slot.medecinId}_${day}`;
        if (!slotsByDoctorAndDay[key]) slotsByDoctorAndDay[key] = [];
        slotsByDoctorAndDay[key].push(slot);
      });

      const dayStrs = serviceGridDays.map((d) => format(d, 'yyyy-MM-dd'));
      const hasAnySlotInPeriod = (doctorId: string) =>
        dayStrs.some((dateStr) => (slotsByDoctorAndDay[`${doctorId}_${dateStr}`] ?? []).length > 0);

      // Liste à plat "un médecin = une entrée" avec son service d'origine —
      // sert à reconstruire les en-têtes de service par page une fois
      // découpée en groupes de MAX_DOCTORS_PER_PAGE.
      type DoctorEntry = { service: PlanningServiceOption; doctor: ServiceDoctorOption };
      const flatEntries: DoctorEntry[] = [];
      filteredPlanningServices.forEach((service) => {
        (filteredDoctorsByService[service.id] ?? [])
          .filter((d) => hasAnySlotInPeriod(d.id))
          .forEach((doctor) => flatEntries.push({ service, doctor }));
      });

      if (flatEntries.length === 0) {
        alert('Aucun créneau planifié sur cette période — rien à exporter.');
        return;
      }

      const MAX_DOCTORS_PER_PAGE = 4;
      const chunks: DoctorEntry[][] = [];
      for (let i = 0; i < flatEntries.length; i += MAX_DOCTORS_PER_PAGE) {
        chunks.push(flatEntries.slice(i, i + MAX_DOCTORS_PER_PAGE));
      }

      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const marginX = 10;
      // printableWidth = pageWidth - marges gauche/droite ; la colonne "Jour"
      // occupe 12% de cette largeur, le reste se répartit à parts égales
      // entre les colonnes médecin de la page (recalculé plus bas par page,
      // au cas où la dernière page compte moins de médecins).
      const usableWidth = doc.internal.pageSize.getWidth() - marginX * 2;
      const dayColWidth = usableWidth * 0.12;

      chunks.forEach((chunk, chunkIndex) => {
        if (chunkIndex > 0) doc.addPage();

        doc.setFontSize(12);
        doc.text('Planning — Vue par service', marginX, 12);
        doc.setFontSize(9);
        doc.text(
          chunks.length > 1 ? `${serviceGridPeriodLabel} — page ${chunkIndex + 1}/${chunks.length}` : serviceGridPeriodLabel,
          marginX,
          18
        );

        // En-têtes de service pour ce groupe : les médecins consécutifs d'un
        // même service partagent un en-tête (colSpan), même si la coupure en
        // pages de 4 tombe au milieu d'un service.
        const head1: any[] = [{ content: 'Jour', rowSpan: 2, styles: { valign: 'middle' } }];
        chunk.forEach((entry, i) => {
          const prev = chunk[i - 1];
          if (prev && prev.service.id === entry.service.id) {
            head1[head1.length - 1].colSpan += 1;
          } else {
            head1.push({ content: entry.service.name, colSpan: 1, styles: { halign: 'center' } });
          }
        });
        const head2 = chunk.map(({ doctor }) => `Dr. ${doctor.prenom} ${doctor.nom}`);

        const body = serviceGridDays.map((day) => {
          const dateStr = format(day, 'yyyy-MM-dd');
          const row: string[] = [format(day, 'EEEE dd MMM', { locale: fr })];
          chunk.forEach(({ doctor }) => {
            const slots = slotsByDoctorAndDay[`${doctor.id}_${dateStr}`] ?? [];
            row.push(
              slots.length === 0
                ? '—'
                : slots
                    .map((s) =>
                      s.disponible
                        ? `${s.heureDebut}-${s.heureFin}${s.quota ? ` · ${s.quota} pt${s.quota > 1 ? 's' : ''}` : ''}`
                        : 'Indisponible'
                    )
                    .join('\n')
            );
          });
          return row;
        });

        // Les colonnes de cette page se répartissent toute la largeur
        // disponible en fonction du nombre réel de médecins sur CETTE page
        // (et non du total), pour qu'une dernière page partielle (ex: 1 ou 2
        // médecins) remplisse quand même toute la largeur au lieu de rester
        // étriquée à gauche.
        const dataColWidth = (usableWidth - dayColWidth) / chunk.length;
        const columnStyles: Record<number, { cellWidth: number; fontStyle?: 'bold' }> = {
          0: { fontStyle: 'bold', cellWidth: dayColWidth },
        };
        chunk.forEach((_, i) => {
          columnStyles[i + 1] = { cellWidth: dataColWidth };
        });

        // Police adaptative (9 à 12 pt) : plus il y a de place par colonne
        // (peu de médecins sur cette page), plus le texte peut grossir pour
        // occuper l'espace disponible au lieu de rester petit dans une page
        // par ailleurs pleine largeur.
        const fontSize =
          dataColWidth >= 70 ? 12 : dataColWidth >= 55 ? 11 : dataColWidth >= 40 ? 10 : 9;

        autoTable(doc, {
          startY: 22,
          margin: { left: marginX, right: marginX },
          tableWidth: usableWidth,
          head: [head1, head2],
          body,
          theme: 'grid',
          styles: { fontSize, cellPadding: 2.5, valign: 'middle', overflow: 'linebreak' },
          headStyles: { fillColor: [5, 91, 130], textColor: 255, fontStyle: 'bold', fontSize },
          columnStyles,
          didParseCell: (data) => {
            if (data.section !== 'body' || data.column.index === 0) return;
            const entry = chunk[data.column.index - 1];
            const dateStr = dayStrs[data.row.index];
            const slots = entry ? (slotsByDoctorAndDay[`${entry.doctor.id}_${dateStr}`] ?? []) : [];
            if (slots.length === 0) return;
            const anyUnavailable = slots.some((s) => !s.disponible);
            data.cell.styles.fillColor = anyUnavailable ? [253, 237, 236] : [234, 253, 243];
            data.cell.styles.textColor = anyUnavailable ? [231, 76, 60] : [46, 204, 113];
          },
        });
      });

      doc.save(`planning-service_${dayStrs[0]}_au_${dayStrs[dayStrs.length - 1]}.pdf`);
    } catch (error) {
      console.error('Export PDF error:', error);
      alert("Erreur lors de l'export PDF.");
    }
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = new Date(e.target.value);
    if (!isNaN(newDate.getTime())) {
      setCurrentDate(newDate);
    }
  };

  // Un seul champ date (celui du formulaire) fait foi désormais — plus de date
  // d'affichage séparée qui pouvait diverger de celle réellement enregistrée.
  // "doctor" est fourni quand la modale s'ouvre depuis la Vue par service : le
  // médecin est alors verrouillé (déjà déterminé par la colonne cliquée).
  const openAddModal = (date: Date, doctor?: { id: string; label: string }) => {
    setEditingSlotId(null);
    setEditingSlotSeriesId(null);
    setEditScope('one');
    setLockedDoctor(doctor ?? null);
    setModalServiceId(null);
    setModalMode('single');
    setRecurrenceDays([]);
    setRecurrenceEndDate('');
    setUnavailabilityEndDate(format(date, 'yyyy-MM-dd'));
    setConflictStrategy('replace');
    setRecurringConflictChoice('skip');
    setConfirmDelete(false);
    setSelectedDoctorId(doctor?.id ?? viewedDoctorId ?? medecin?.id ?? null);
    setPlanningForm((current) => ({ ...current, date: format(date, 'yyyy-MM-dd'), medecinId: medecin?.id ?? current.medecinId }));
    setIsModalOpen(true);
  };

  const isPastSlotDate = (dateStr: string) => isBefore(new Date(dateStr), startOfDay(new Date()));

  const openEditModal = (slot: any, doctor?: { id: string; label: string }) => {
    if (!canManagePlanning || isPastSlotDate(slot.date)) return;
    setLockedDoctor(doctor ?? null);
    setEditingSlotId(slot.id);
    setEditingSlotSeriesId(slot.seriesId ?? null);
    setEditScope('one');
    setModalServiceId(null);
    setModalMode('single');
    setRecurrenceDays([]);
    setRecurrenceEndDate('');
    setConfirmDelete(false);
    setSelectedDoctorId(slot.medecinId ?? null);
    setPlanningForm({
      date: slot.date.split('T')[0],
      heureDebut: slot.heureDebut,
      heureFin: slot.heureFin,
      quota: slot.quota ?? 1,
      disponible: slot.disponible,
      notes: slot.notes ?? '',
      medecinId: slot.medecinId ?? null,
    });
    setIsModalOpen(true);
  };

  const closePlanningModal = () => {
    setIsModalOpen(false);
    setEditingSlotId(null);
    setEditingSlotSeriesId(null);
    setLockedDoctor(null);
    setModalServiceId(null);
    setModalMode('single');
    setConfirmDelete(false);
  };

  const toggleRecurrenceDay = (day: number) => {
    setRecurrenceDays((current) => (current.includes(day) ? current.filter((d) => d !== day) : [...current, day].sort()));
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

  // Pour afficher le nom du médecin sur chaque créneau — indispensable quand
  // "Tous les médecins" est sélectionné, sinon impossible de savoir à qui appartient un créneau.
  const doctorNameById = useMemo(() => {
    const map: Record<string, string> = {};
    availableMedecins.forEach((d) => { map[d.id] = `Dr. ${d.prenom} ${d.nom}`; });
    return map;
  }, [availableMedecins]);

  // Médecin ciblé par la modale (verrouillé depuis la Vue par service, sinon le <select>).
  const targetDoctorId = lockedDoctor?.id ?? selectedDoctorId ?? medecin?.id ?? null;

  // Créneaux déjà planifiés dans la période d'indisponibilité saisie — calculés
  // depuis les données déjà chargées (aperçu instantané, sans aller-retour réseau).
  // La suppression effective reste faite côté backend, dans une transaction.
  const unavailabilityConflicts = useMemo(() => {
    if (!isUnavailability || !targetDoctorId || !planningForm.date || !unavailabilityEndDate) return [];
    if (unavailabilityEndDate < planningForm.date) return [];
    return planning
      .filter((slot) => {
        if (slot.medecinId !== targetDoctorId || !slot.disponible) return false;
        const day = slot.date.split('T')[0];
        return day >= planningForm.date && day <= unavailabilityEndDate;
      })
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [isUnavailability, targetDoctorId, planningForm.date, unavailabilityEndDate, planning]);

  // Dates qui seraient générées par la récurrence et qui tombent sur une
  // indisponibilité déjà enregistrée pour ce médecin. Même règle ISO que le
  // backend (1=Lundi) pour que l'aperçu corresponde exactement à ce qui sera créé.
  const recurringConflictDates = useMemo(() => {
    if (!isRecurring || !targetDoctorId || recurrenceDays.length === 0 || !planningForm.date || !recurrenceEndDate) return [];
    if (recurrenceEndDate < planningForm.date) return [];

    const unavailableDays = new Set(
      planning
        .filter((slot) => slot.medecinId === targetDoctorId && !slot.disponible)
        .map((slot) => slot.date.split('T')[0]),
    );

    const conflicts: string[] = [];
    const cursor = new Date(planningForm.date);
    const end = new Date(recurrenceEndDate);
    while (cursor <= end) {
      const isoDay = ((cursor.getDay() + 6) % 7) + 1;
      const key = format(cursor, 'yyyy-MM-dd');
      if (recurrenceDays.includes(isoDay) && unavailableDays.has(key)) {
        conflicts.push(key);
      }
      cursor.setDate(cursor.getDate() + 1);
    }
    return conflicts;
  }, [isRecurring, targetDoctorId, recurrenceDays, planningForm.date, recurrenceEndDate, planning]);

  const handleSavePlanning = async () => {
    if (!medecin?.id || !planningForm.date || !planningForm.heureDebut || !planningForm.heureFin) return;
    // Modification interdite sur une date passée — la création reste possible
    // (créneau rétroactif documenté au besoin), seule l'édition est bloquée.
    if (editingSlotId && isPastSlotDate(planningForm.date)) return;
    if (!editingSlotId && isRecurring && (recurrenceDays.length === 0 || !recurrenceEndDate)) return;
    if (!editingSlotId && isUnavailability && !unavailabilityEndDate) return;

    try {
      if (!editingSlotId && isUnavailability) {
        await createUnavailability.mutateAsync({
          medecinId: canManagePlanning ? (targetDoctorId ?? medecin.id) : medecin.id,
          startDate: planningForm.date,
          endDate: unavailabilityEndDate,
          notes: planningForm.notes || undefined,
          conflictStrategy,
        });
      } else if (editingSlotId && editScope === 'following' && editingSlotSeriesId) {
        await updatePlanningSeries.mutateAsync({
          seriesId: editingSlotSeriesId,
          payload: {
            fromDate: planningForm.date,
            heureDebut: planningForm.heureDebut,
            heureFin: planningForm.heureFin,
            quota: Number(planningForm.quota || 1),
            disponible: planningForm.disponible,
            notes: planningForm.notes || undefined,
          },
        });
      } else if (editingSlotId) {
        await updatePlanning.mutateAsync({
          id: editingSlotId,
          payload: {
            date: planningForm.date,
            heureDebut: planningForm.heureDebut,
            heureFin: planningForm.heureFin,
            quota: Number(planningForm.quota || 1),
            disponible: planningForm.disponible,
            notes: planningForm.notes || undefined,
          },
        });
      } else if (isRecurring) {
        await createRecurringPlanning.mutateAsync({
          medecinId: canManagePlanning ? (selectedDoctorId ?? medecin.id) : medecin.id,
          startDate: planningForm.date,
          endDate: recurrenceEndDate,
          daysOfWeek: recurrenceDays,
          heureDebut: planningForm.heureDebut,
          heureFin: planningForm.heureFin,
          quota: Number(planningForm.quota || 1),
          disponible: true,
          notes: planningForm.notes || undefined,
          skipDates: recurringConflictChoice === 'skip' && recurringConflictDates.length > 0 ? recurringConflictDates : undefined,
        });
      } else {
        await createPlanning.mutateAsync({
          medecinId: canManagePlanning ? (selectedDoctorId ?? medecin.id) : medecin.id,
          date: planningForm.date,
          heureDebut: planningForm.heureDebut,
          heureFin: planningForm.heureFin,
          quota: Number(planningForm.quota || 1),
          disponible: true,
          notes: planningForm.notes || undefined,
        });
      }
      setIsModalOpen(false);
      setEditingSlotId(null);
      setEditingSlotSeriesId(null);
      setLockedDoctor(null);
      setModalServiceId(null);
      setModalMode('single');
      setRecurrenceDays([]);
      setRecurrenceEndDate('');
      setUnavailabilityEndDate('');
      setConfirmDelete(false);
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
      const errorMsg = error instanceof Error ? error.message : "Erreur lors de l'enregistrement du créneau";
      console.error('Planning error:', error);
      alert(`Erreur : ${errorMsg}`);
    }
  };

  const handleDeleteSlot = async () => {
    if (!editingSlotId) return;
    try {
      await deletePlanning.mutateAsync(editingSlotId);
      closePlanningModal();
    } catch (error) {
      console.error(error);
    }
  };

  const togglePlanningAvailability = async (slot: any) => {
    if (!canManagePlanning || isPastSlotDate(slot.date)) return;
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
      await consultationApi.traiterConsultation(appointment.id, 'ouvrir');
    } catch (error) {
      console.error('Impossible de marquer la consultation comme en cours:', error);
    }

    try {
      const response = await fetch('/api/redirect/traitement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          consultationId: appointment.id,
          patientId: appointment.patientId,
          from: 'planning-complet',
          origin: 'planning-complet',
        }),
      });

      if (response.ok) {
        const data = await response.json();
        router.push(data.redirectUrl);
      } else {
        router.push(`/modules/consultation-externe/traitement?id=${appointment.id}&origin=planning-complet`);
      }
    } catch (err) {
      router.push(`/modules/consultation-externe/traitement?id=${appointment.id}&origin=planning-complet`);
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
    <div className={cn("flex-1 h-full flex flex-col bg-[#F8FAFC] overflow-hidden", isFullscreen && "fixed inset-0 z-[70]")}>
      <div className="fixed bottom-4 right-4 z-40 w-[calc(100vw-2rem)] max-w-md md:w-full pointer-events-none">
        <div className="pointer-events-auto ml-auto">
        </div>
      </div>

      {/* --- HEADER --- */}
      {/* Titre sur sa propre ligne (jamais compressé par les contrôles), masqué
          en plein écran. Contrôles sur une seconde ligne qui se replie
          (flex-wrap) au besoin. Les contrôles propres à la vue Calendrier
          (Afficher, Jour/Semaine/Mois, Nouveau créneau) restent toujours
          visibles et actifs même sur l'onglet Vue par service (sans effet
          sur la grille, mais rien ne doit apparaître/disparaître au
          changement d'onglet, sinon les éléments voisins sautent dans le
          flex-wrap). */}
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex-none flex flex-col gap-2.5 text-slate-700 z-30 shadow-sm">
        {!isFullscreen && (
          <div className="flex items-center gap-3">
            <Link
              href="/modules/consultation-externe"
              className="group inline-flex items-center justify-center p-2 rounded-xl bg-white shadow-sm border border-gray-100 hover:bg-[#EAF3FA] transition-all text-[#006A8C] hover:scale-105 active:scale-95 shrink-0"
              title="Retour"
            >
              <ArrowLeft className="h-4 w-4" strokeWidth={2.5} />
            </Link>
            <div className="min-w-0 flex items-baseline gap-2">
              <h1 className="text-[16px] font-black text-gray-900 tracking-tight whitespace-nowrap">Planning complet de la consultation externe</h1>
              <span className="text-[12px] font-medium text-gray-400 whitespace-nowrap">— {doctorName}</span>
            </div>
          </div>
        )}

        <div className="flex items-center flex-wrap gap-3">
          {isAdmin ? (
            <div className="flex items-center rounded-xl border border-gray-200 bg-gray-50 p-1 shadow-sm">
              {(['calendrier', 'service'] as TopTab[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setTopTab(tab)}
                  className={cn(
                    'rounded-lg px-3 py-2 text-[12px] font-semibold transition-all',
                    topTab === tab ? 'bg-white text-[#005b82] shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  )}
                >
                  {tab === 'calendrier' ? 'Calendrier' : 'Vue par service'}
                </button>
              ))}
            </div>
          ) : null}

          {isAdmin ? (
            <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 shadow-sm">
              <label className="text-[12px] font-semibold text-gray-600">Afficher</label>
              <select
                value={viewedDoctorId ?? ''}
                onChange={(e) => setViewedDoctorId(e.target.value || null)}
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

          {isAdmin ? (
            <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 shadow-sm">
              <label className="text-[12px] font-semibold text-gray-600">Service</label>
              <select
                value={serviceFilterId ?? ''}
                onChange={(e) => setServiceFilterId(e.target.value || null)}
                className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-[12px] font-semibold text-gray-700 outline-none"
              >
                <option value="">Tous les services</option>
                {planningServices.map((service) => (
                  <option key={service.id} value={service.id}>
                    {service.name}
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
                {topTab === 'service' ? serviceGridPeriodLabel : periodLabel}
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
                onClick={() => openAddModal(new Date())}
                className="bg-[#005b82] cursor-pointer hover:bg-[#004a6b] text-white rounded-xl px-5 h-11 font-black text-[13px] shadow-lg shadow-blue-900/10 gap-2"
              >
                <Plus className="w-4 h-4" strokeWidth={3} />
                NOUVEAU CRÉNEAU
              </Button>
            </div>
          ) : null}

          {topTab === 'service' ? (
            <div className="flex items-center gap-2">
              <Button
                onClick={() => window.print()}
                variant="outline"
                className="rounded-xl font-bold text-[13px] border-gray-200 shadow-sm px-5 bg-white hover:bg-gray-50 gap-2"
                title="Ouvrir l'aperçu d'impression"
              >
                <Printer className="w-4 h-4 text-gray-600" />
                Imprimer
              </Button>
              <Button
                onClick={handleExportServicePdf}
                className="rounded-xl font-bold text-[13px] bg-[#005b82] hover:bg-[#004a6b] text-white shadow-sm px-5 gap-2"
                title="Télécharger un fichier PDF"
              >
                <Download className="w-4 h-4" />
                Exporter PDF
              </Button>
            </div>
          ) : null}

          <Button
            variant="outline"
            size="icon"
            onClick={() => setIsFullscreen((v) => !v)}
            className="h-11 w-11 rounded-xl border-gray-200 shadow-sm bg-white hover:bg-gray-50 shrink-0"
            title={isFullscreen ? "Quitter le plein écran" : "Plein écran"}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4 text-gray-600" /> : <Maximize2 className="w-4 h-4 text-gray-600" />}
          </Button>
        </div>
      </header>

      {/* --- MAIN CONTENT --- */}
      <div className="flex-1 flex overflow-hidden p-2">
        <div className="flex-1 bg-white rounded-2xl border border-gray-100 shadow-[0px_4px_24px_rgba(15,23,42,0.04)] flex flex-col overflow-hidden">
          {topTab === 'service' ? (
            <div id="service-grid-print-area" className="flex-1 flex flex-col overflow-hidden">
              <div className="hidden print:block px-6 pt-4 pb-2">
                <h2 className="text-[16px] font-black text-gray-900">Planning — Vue par service</h2>
                <p className="text-[12px] font-semibold text-gray-500">{serviceGridPeriodLabel}</p>
              </div>
              <ServiceGridView
                services={filteredPlanningServices}
                doctorsByService={filteredDoctorsByService}
                planning={planning}
                days={serviceGridDays}
                canManagePlanning={canManagePlanning}
                isPastSlotDate={isPastSlotDate}
                onCellAdd={(date, doctor: ServiceDoctorOption) => openAddModal(date, { id: doctor.id, label: `Dr. ${doctor.prenom} ${doctor.nom}` })}
                onSlotEdit={(slot, doctor: ServiceDoctorOption) => openEditModal(slot, { id: doctor.id, label: `Dr. ${doctor.prenom} ${doctor.nom}` })}
              />
            </div>
          ) : viewMode === 'month' ? (
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
                  // Somme des quotas réellement configurés ce jour-là (pour le ou les
                  // médecins actuellement affichés) — plus de "/10" codé en dur, qui
                  // n'avait aucun rapport avec les créneaux réels.
                  const dayQuotaTotal = (planningByDay[dayStr] || []).reduce((sum, slot) => sum + (slot.quota ?? 0), 0);
                  const quotaLabel = dayQuotaTotal > 0 ? `${count}/${dayQuotaTotal}` : 'Aucun créneau';

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
                      <span
                        title={isAdmin && !viewedDoctorId ? "Total combiné de tous les médecins affichés" : "Quota du médecin affiché"}
                        className={cn(
                          "text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-tight",
                          dayQuotaTotal === 0 ? "bg-gray-100 text-gray-400" :
                            count >= dayQuotaTotal ? "bg-red-50 text-red-600" : count > dayQuotaTotal * 0.7 ? "bg-orange-50 text-orange-600" : "bg-emerald-50 text-emerald-600"
                        )}
                      >
                        {quotaLabel}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Grid Body */}
              <div className="flex-1 overflow-y-auto relative">
                <div
                  style={{ minHeight: `${TOTAL_HOURS * HOUR_HEIGHT}px` }}
                  className={cn("grid relative", viewMode === 'day' ? 'grid-cols-[80px_1fr]' : 'grid-cols-[80px_1fr_1fr_1fr_1fr_1fr_1fr]')}
                >

                  {/* Vertical Time Scale */}
                  <div className="bg-gray-50/30 border-r border-gray-100">
                    {Array.from({ length: TOTAL_HOURS }).map((_, i) => (
                      <div key={i} style={{ height: `${HOUR_HEIGHT}px` }} className="flex items-start justify-center pt-1.5 border-b border-gray-50 last:border-b-0">
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
                          <div key={i} style={{ height: `${HOUR_HEIGHT}px` }} className="border-b border-gray-50 last:border-b-0"></div>
                        ))}

                        {/* Planning slots — les créneaux qui se chevauchent dans le
                            temps (ex: deux médecins différents à la même heure)
                            sont répartis côte à côte au lieu de s'empiler. */}
                        {layoutSlots(planningByDay[dayStr] || []).map(({ slot, col, totalCols }) => {
                          const start = slot.heureDebut.split(':').map(Number);
                          const end = slot.heureFin.split(':').map(Number);
                          const slotTop = ((start[0] - START_HOUR) * HOUR_HEIGHT) + (start[1] / 60 * HOUR_HEIGHT);
                          const slotHeight = ((end[0] - start[0]) * HOUR_HEIGHT) + ((end[1] - start[1]) / 60 * HOUR_HEIGHT);
                          const isPast = isPastSlotDate(slot.date);
                          const editable = canManagePlanning && !isPast;
                          const widthPct = 100 / totalCols;
                          const leftPct = col * widthPct;
                          const doctorLabel = doctorNameById[slot.medecinId];
                          // Borné à la fenêtre visible : une indisponibilité journée
                          // entière (00:00-23:59) déborderait sinon très au-delà de la grille.
                          const clampedTop = Math.max(0, slotTop);
                          const clampedHeight = Math.min(
                            Math.max(40, slotHeight),
                            Math.max(40, TOTAL_HOURS * HOUR_HEIGHT - clampedTop),
                          );

                          return (
                            <div
                              key={slot.id}
                              onClick={editable ? () => openEditModal(slot) : undefined}
                              title={isPast ? "Créneau passé — modification non autorisée" : doctorLabel}
                              className={cn(
                                'absolute rounded-xl border px-2 py-2 z-10 shadow-sm overflow-hidden',
                                slot.disponible ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200',
                                isPast && 'opacity-50',
                                editable ? 'cursor-pointer hover:shadow-md hover:z-20 transition-shadow' : 'cursor-default'
                              )}
                              style={{
                                top: `${clampedTop}px`,
                                height: `${clampedHeight}px`,
                                left: `calc(${leftPct}% + 2px)`,
                                width: `calc(${widthPct}% - 4px)`,
                              }}
                            >
                              {doctorLabel ? (
                                <p className="text-[9px] font-black text-[#005b82] truncate">{doctorLabel}</p>
                              ) : null}
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-[10px] font-black text-gray-900">{slot.heureDebut} - {slot.heureFin}</span>
                                {editable && totalCols === 1 ? (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); togglePlanningAvailability(slot); }}
                                    className={cn(
                                      'text-[9px] font-bold rounded-full px-2 py-1 shrink-0',
                                      slot.disponible ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
                                    )}
                                  >
                                    {slot.disponible ? 'Disponible' : 'Indisponible'}
                                  </button>
                                ) : null}
                              </div>
                              <div className="mt-1 text-[9px] font-semibold text-gray-700">
                                {slot.disponible ? `Quota : ${slot.quota ?? 1} patient${(slot.quota ?? 1) > 1 ? 's' : ''}` : 'Indisponible'}
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
                                <span className="text-[11px] font-black text-gray-800 truncate uppercase">{appt.patient?.displayName ?? ([appt.patient?.prenom, appt.patient?.nom].filter(Boolean).join(' ') || 'Patient inconnu')}</span>
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
                        onClick={() => openAddModal(day)}
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
                  <h3 className="text-[18px] font-black text-gray-900 mt-1">{selectedAppointment.patient?.displayName ?? ([selectedAppointment.patient?.prenom, selectedAppointment.patient?.nom].filter(Boolean).join(' ') || 'Patient inconnu')}</h3>
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
                  <h3 className="text-[20px] font-black text-gray-900 uppercase text-center">{selectedAppointment.patient?.displayName ?? ([selectedAppointment.patient?.prenom, selectedAppointment.patient?.nom].filter(Boolean).join(' ') || 'Patient inconnu')}</h3>
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
            onClick={closePlanningModal}
          />

          {/* Modal Content */}
          <div className="relative w-full max-w-3xl bg-white rounded-[32px] shadow-[0px_32px_64px_-12px_rgba(0,0,0,0.14)] overflow-hidden animate-in fade-in zoom-in duration-200">
            {/* Header */}
            <div className="px-8 py-6 border-b border-gray-50 flex items-center justify-between">
              <h2 className="text-[20px] font-black text-gray-900">
                {editingSlotId ? 'Modifier le créneau' : isUnavailability ? 'Planifier une indisponibilité' : 'Ajouter un créneau'}
              </h2>
              <button
                onClick={closePlanningModal}
                className="p-2 hover:bg-gray-100 cursor-pointer rounded-full transition-colors text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-8 max-h-[80vh] overflow-y-auto custom-scrollbar">
              <div className="space-y-6">
                <section className="space-y-5">
                  <div className="flex items-center gap-2 text-[#005b82]">
                    <CalendarDays className="w-4 h-4" strokeWidth={2.5} />
                    <h3 className="text-[11px] font-black uppercase tracking-[0.15em]">
                      {isUnavailability ? "Informations de l'indisponibilité" : 'Informations du créneau'}
                    </h3>
                  </div>

                  {!editingSlotId ? (
                    <div className="flex items-center rounded-xl border border-gray-200 bg-gray-50 p-1 shadow-sm w-fit">
                      {(['single', 'recurring', 'unavailability'] as ModalMode[]).map((mode) => (
                        <button
                          key={mode}
                          type="button"
                          onClick={() => setModalMode(mode)}
                          className={cn(
                            'rounded-lg px-3 py-2 text-[12px] font-semibold transition-all',
                            modalMode === mode ? 'bg-white text-[#005b82] shadow-sm' : 'text-gray-500 hover:text-gray-700'
                          )}
                        >
                          {mode === 'single' ? 'Créneau unique' : mode === 'recurring' ? 'Créneau récurrent' : 'Indisponibilité'}
                        </button>
                      ))}
                    </div>
                  ) : null}

                  {isRecurring && !editingSlotId ? (
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Se répète les</label>
                      <div className="flex flex-wrap gap-2">
                        {[1, 2, 3, 4, 5, 6, 7].map((day) => (
                          <button
                            key={day}
                            type="button"
                            onClick={() => toggleRecurrenceDay(day)}
                            className={cn(
                              'h-9 w-14 rounded-xl text-[12px] font-bold transition-colors',
                              recurrenceDays.includes(day) ? 'bg-[#005b82] text-white' : 'bg-[#F1F5F9]/80 text-gray-500 hover:bg-gray-100'
                            )}
                          >
                            {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'][day - 1]}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {editingSlotId && editingSlotSeriesId ? (
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Portée de la modification</label>
                      <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2 text-[13px] font-semibold text-gray-700 cursor-pointer">
                          <input type="radio" checked={editScope === 'one'} onChange={() => setEditScope('one')} />
                          Seulement ce créneau
                        </label>
                        <label className="flex items-center gap-2 text-[13px] font-semibold text-gray-700 cursor-pointer">
                          <input type="radio" checked={editScope === 'following'} onChange={() => setEditScope('following')} />
                          Ce créneau et les suivants
                        </label>
                      </div>
                    </div>
                  ) : null}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                        {(isRecurring || isUnavailability) && !editingSlotId ? 'Du' : 'Date'}
                      </label>
                      <input
                        type="date"
                        value={planningForm.date}
                        onChange={(e) => setPlanningForm(prev => ({ ...prev, date: e.target.value }))}
                        className="w-full h-11 bg-[#F1F5F9]/80 border-none rounded-xl px-4 text-[13px] font-bold text-gray-900 focus:ring-2 focus:ring-blue-100"
                      />
                    </div>
                    {(isUnavailability || isRecurring) && !editingSlotId ? (
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Au</label>
                        <input
                          type="date"
                          value={isUnavailability ? unavailabilityEndDate : recurrenceEndDate}
                          min={planningForm.date}
                          onChange={(e) =>
                            isUnavailability
                              ? setUnavailabilityEndDate(e.target.value)
                              : setRecurrenceEndDate(e.target.value)
                          }
                          className="w-full h-11 bg-[#F1F5F9]/80 border-none rounded-xl px-4 text-[13px] font-bold text-gray-900 focus:ring-2 focus:ring-blue-100"
                        />
                      </div>
                    ) : null}
                  </div>

                  {/* Conflits : créneaux déjà planifiés dans la période d'indisponibilité */}
                  {isUnavailability && !editingSlotId && unavailabilityConflicts.length > 0 ? (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4 space-y-3">
                      <p className="text-[12px] font-black text-amber-800">
                        {unavailabilityConflicts.length} créneau{unavailabilityConflicts.length > 1 ? 'x' : ''} déjà planifié{unavailabilityConflicts.length > 1 ? 's' : ''} dans cette période
                      </p>
                      <ul className="space-y-1 max-h-28 overflow-y-auto">
                        {unavailabilityConflicts.map((slot) => (
                          <li key={slot.id} className="text-[11px] font-semibold text-amber-900">
                            {format(new Date(slot.date), 'EEEE dd MMM', { locale: fr })} · {slot.heureDebut}-{slot.heureFin}
                            {slot.quota ? ` · ${slot.quota} patient${slot.quota > 1 ? 's' : ''}` : ''}
                          </li>
                        ))}
                      </ul>
                      <div className="flex flex-col gap-1.5">
                        <label className="flex items-center gap-2 text-[12px] font-semibold text-amber-900 cursor-pointer">
                          <input type="radio" checked={conflictStrategy === 'replace'} onChange={() => setConflictStrategy('replace')} />
                          Supprimer ces créneaux
                        </label>
                        <label className="flex items-center gap-2 text-[12px] font-semibold text-amber-900 cursor-pointer">
                          <input type="radio" checked={conflictStrategy === 'keep'} onChange={() => setConflictStrategy('keep')} />
                          Les garder malgré l'indisponibilité
                        </label>
                      </div>
                      <p className="text-[10px] text-amber-700">Les créneaux déjà passés ne sont jamais supprimés.</p>
                    </div>
                  ) : null}

                  {/* Conflits : dates de la récurrence tombant sur une indisponibilité */}
                  {isRecurring && !editingSlotId && recurringConflictDates.length > 0 ? (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4 space-y-3">
                      <p className="text-[12px] font-black text-amber-800">
                        {recurringConflictDates.length} date{recurringConflictDates.length > 1 ? 's' : ''} de cette récurrence tombe{recurringConflictDates.length > 1 ? 'nt' : ''} sur une indisponibilité
                      </p>
                      <ul className="space-y-1 max-h-28 overflow-y-auto">
                        {recurringConflictDates.map((date) => (
                          <li key={date} className="text-[11px] font-semibold text-amber-900">
                            {format(new Date(date), 'EEEE dd MMM yyyy', { locale: fr })}
                          </li>
                        ))}
                      </ul>
                      <div className="flex flex-col gap-1.5">
                        <label className="flex items-center gap-2 text-[12px] font-semibold text-amber-900 cursor-pointer">
                          <input type="radio" checked={recurringConflictChoice === 'skip'} onChange={() => setRecurringConflictChoice('skip')} />
                          Ignorer ces dates
                        </label>
                        <label className="flex items-center gap-2 text-[12px] font-semibold text-amber-900 cursor-pointer">
                          <input type="radio" checked={recurringConflictChoice === 'create'} onChange={() => setRecurringConflictChoice('create')} />
                          Créer les créneaux quand même
                        </label>
                      </div>
                      <p className="text-[10px] text-amber-700">Vous pouvez aussi corriger les jours ou la période ci-dessus avant d'enregistrer.</p>
                    </div>
                  ) : null}

                  {!isUnavailability ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Heure de début</label>
                        <input
                          type="time"
                          value={planningForm.heureDebut}
                          onChange={(e) => setPlanningForm(prev => ({ ...prev, heureDebut: e.target.value }))}
                          className="w-full h-11 bg-[#F1F5F9]/80 border-none rounded-xl px-4 text-[13px] font-bold text-gray-900 focus:ring-2 focus:ring-blue-100"
                        />
                      </div>
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
                  ) : (
                    <p className="text-[11px] font-semibold text-gray-400">
                      L'indisponibilité couvre la journée entière, sans quota de patients.
                    </p>
                  )}

                  {isAdmin ? (
                    lockedDoctor ? (
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Médecin</label>
                        <input
                          type="text"
                          value={lockedDoctor.label}
                          disabled
                          className="w-full h-11 bg-gray-100 border-none rounded-xl px-4 text-[13px] font-bold text-gray-500"
                        />
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Service</label>
                          <select
                            value={modalServiceId ?? ''}
                            onChange={(e) => { setModalServiceId(e.target.value || null); setSelectedDoctorId(null); }}
                            className="w-full h-11 bg-[#F1F5F9]/80 border-none rounded-xl px-4 text-[13px] font-bold text-gray-900 focus:ring-2 focus:ring-blue-100 outline-none"
                          >
                            <option value="">Médecins de consultation externe</option>
                            {planningServices.map((service) => (
                              <option key={service.id} value={service.id}>{service.name}</option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Médecin</label>
                          <select
                            value={selectedDoctorId ?? ''}
                            onChange={(e) => setSelectedDoctorId(e.target.value || null)}
                            className="w-full h-11 bg-[#F1F5F9]/80 border-none rounded-xl px-4 text-[13px] font-bold text-gray-900 focus:ring-2 focus:ring-blue-100 outline-none"
                          >
                            {(modalServiceId ? (doctorsByService[modalServiceId] ?? []) : availableMedecins).map((doctor) => (
                              <option key={doctor.id} value={doctor.id}>
                                {doctor.prenom} {doctor.nom}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    )
                  ) : null}

                  {!isUnavailability ? (
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
                  ) : null}

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                      {isUnavailability ? "Motif de l'absence" : 'Note'}
                    </label>
                    <textarea
                      value={planningForm.notes}
                      onChange={(e) => setPlanningForm(prev => ({ ...prev, notes: e.target.value }))}
                      placeholder={isUnavailability ? 'Ex : congés annuels, formation, mission...' : 'Ex : réunion, congé, etc.'}
                      className="w-full h-24 bg-[#F1F5F9]/80 border-none rounded-xl px-4 py-3 text-[13px] font-bold text-gray-900 focus:ring-2 focus:ring-blue-100 resize-none"
                    />
                  </div>
                </section>
              </div>
            </div>

            <div className="px-8 py-5 bg-gray-50/50 border-t border-gray-100 flex items-center justify-between gap-6">
              <div>
                {editingSlotId ? (
                  confirmDelete ? (
                    <div className="flex items-center gap-3">
                      <span className="text-[12px] font-bold text-red-600">Supprimer ce créneau ?</span>
                      <button
                        onClick={handleDeleteSlot}
                        className="text-[12px] cursor-pointer font-black text-red-600 hover:text-red-700"
                      >
                        Oui, supprimer
                      </button>
                      <button
                        onClick={() => setConfirmDelete(false)}
                        className="text-[12px] cursor-pointer font-bold text-gray-400 hover:text-gray-600"
                      >
                        Annuler
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDelete(true)}
                      className="flex items-center gap-1.5 text-[13px] cursor-pointer font-bold text-red-600 hover:text-red-700 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                      Supprimer ce créneau
                    </button>
                  )
                ) : null}
              </div>
              <div className="flex items-center gap-6">
                <button
                  onClick={closePlanningModal}
                  className="text-[13px] cursor-pointer font-bold text-gray-500 hover:text-gray-700 transition-colors"
                >
                  Fermer
                </button>
                <Button
                  onClick={handleSavePlanning}
                  className="bg-[#005b82] cursor-pointer hover:bg-[#004a6b] text-white rounded-full px-8 h-11 font-black text-[13px] shadow-lg shadow-blue-900/10 gap-2"
                >
                  <Plus className="w-4 h-4" strokeWidth={3} />
                  {editingSlotId ? 'MODIFIER' : isUnavailability ? "ENREGISTRER L'ABSENCE" : 'ENREGISTRER'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
