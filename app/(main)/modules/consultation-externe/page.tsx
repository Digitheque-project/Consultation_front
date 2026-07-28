"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, CalendarRange, CalendarClock, CalendarX, ArrowLeftRight, Search, Filter, X } from "lucide-react";
import { cn } from "@/lib/utils";

import { useAllConsultations, useConsultationEventsSubscription, usePatientConsultationHistory, useTraiterConsultation } from '@/hooks/use-consultations';
import { useMedecins, usePlanning } from '@/hooks/use-planning';
import { consultationApi, getVisiteLabel } from '@/lib/api/consultation';
import { PatientInfoModal } from "@/components/notification/PatientInfoModal";
import { PatientInfo } from "@/stores/notification-store";
import { useAuth } from '@/context/AuthContext';
import { AUTH_CLIENT_URL } from '@/lib/auth/constants';

const formatDateKey = (value: string | Date) => {
  const date = value instanceof Date ? value : new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getTodayDateKey = () => formatDateKey(new Date());

const getTomorrowDateKey = () => {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return formatDateKey(date);
};

type Appointment = {
  id: number;
  time: string;
  name: string;
  date: string;
  dateKey: string;
  urgencyLabel: string;
  status: string;
  isUrgent: boolean;
  action: string;
  visitLabel: string;
  isControl: boolean;
  motif?: string;
  coverage?: string;
  priseEnCharge?: { companyName: string; isActive: boolean } | null;
  idNumber?: string;
  profession?: string;
  phone?: string;
  address?: string;
  emergencyContact?: string;
  sexe?: string;
  dateNaissance?: string;
  patientId: string;
  searchText: string;
  isArrived: boolean;
  arrivalLabel: string;
  arrivalTime?: string;
  isReport: boolean;
  medecinId: string;
};

const ConsultationSkeleton = () => (
  <Card className="relative overflow-hidden border border-gray-100 shadow-[0px_4px_16px_rgba(17,17,26,0.05)] rounded-3xl bg-white animate-pulse">
    <CardContent className="p-4 sm:p-6">
      <div className="flex flex-col md:flex-row items-center gap-6 justify-between">
        {/* Time & Status Skeleton */}
        <div className="flex flex-col items-center justify-center min-w-[70px] space-y-2">
          <div className="h-5 w-12 bg-slate-200 rounded" />
          <div className="h-3 w-16 bg-slate-100 rounded" />
        </div>

        {/* Vertical Divider */}
        <div className="hidden md:block w-px h-10 bg-slate-100"></div>

        {/* Patient Info Skeleton */}
        <div className="flex-1 flex flex-col items-center md:items-start w-full space-y-3">
          <div className="flex items-center gap-3">
            <div className="h-4 w-32 bg-slate-200 rounded" />
            <div className="h-6 w-20 bg-slate-100 rounded-full" />
          </div>
          <div className="h-3 w-48 bg-slate-100 rounded" />
        </div>

        {/* Actions Skeleton */}
        <div className="flex flex-col items-center gap-2 w-full md:w-auto">
          <div className="h-10 w-48 bg-slate-200 rounded-xl" />
          <div className="h-4 w-24 bg-slate-100 rounded mt-1" />
        </div>
      </div>
    </CardContent>
  </Card>
);

export default function ConsultationExternePage() {
  const router = useRouter();
  const [patientInfo, setPatientInfo] = useState<Appointment | null>(null);
  const [reportTarget, setReportTarget] = useState<Appointment | null>(null);
  const [reportDate, setReportDate] = useState('');
  const [reportMedecinId, setReportMedecinId] = useState('');
  const [reportError, setReportError] = useState<string | null>(null);
  const { medecin, isAuthenticated, isLoading } = useAuth();
  useConsultationEventsSubscription();
  const { data: medecinsList = [] } = useMedecins();
  const { mutateAsync: traiterMutation, isPending: isReporting } = useTraiterConsultation();

  const [viewMode, setViewMode] = useState<'today' | 'all'>('today');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'TOUS' | 'EN ATTENTE' | 'EN COURS' | 'EFFECTUÉ'>('TOUS');
  const [visitTypeFilter, setVisitTypeFilter] = useState<'TOUS' | 'INITIALE' | 'CONTROLE'>('TOUS');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;

  const hasDateRange = Boolean(dateFrom || dateTo);
  const hasActiveFilters = hasDateRange || searchQuery.trim().length > 0 || statusFilter !== 'TOUS' || visitTypeFilter !== 'TOUS' || viewMode !== 'today';

  const queryFilters = hasDateRange
    ? { dateFrom: dateFrom || undefined, dateTo: dateTo || undefined }
    : viewMode === 'today'
      ? { date: getTodayDateKey() }
      : undefined;

  const { data: consultations = [], isLoading: loading, error } = useAllConsultations(queryFilters);
  const { data: todayConsultationsRaw = [] } = useAllConsultations({ date: getTodayDateKey() });
  const { data: plannings = [] } = usePlanning();
  const { data: historyData = [] } = usePatientConsultationHistory(patientInfo?.patientId ?? null);

  const handleSetViewMode = (mode: 'today' | 'all') => {
    setViewMode(mode);
    setDateFrom('');
    setDateTo('');
  };

  const handleResetFilters = () => {
    setViewMode('today');
    setSearchQuery('');
    setStatusFilter('TOUS');
    setVisitTypeFilter('TOUS');
    setDateFrom('');
    setDateTo('');
  };

  const patients: Appointment[] = useMemo(() => {
    const mapped = consultations.map((consultation) => {
      const normalizedStatus = consultation.termine ? "EFFECTUÉ" : (consultation.statut?.toUpperCase().replace(/_/g, ' ') || "EN ATTENTE");
      const formattedDate = new Date(consultation.date).toLocaleDateString('fr-FR');
      const dateKey = formatDateKey(consultation.date);
      const visitLabel = getVisiteLabel(consultation);
      const isControl =
        consultation.typeVisite?.toUpperCase() === 'CONTROLE' ||
        (consultation.ordreControle !== null && consultation.ordreControle !== undefined) ||
        (consultation.consultationParenteId !== null && consultation.consultationParenteId !== undefined);
      const controlLabel = isControl
        ? (consultation.ordreControle && consultation.ordreControle > 1
          ? `${consultation.ordreControle}e contrôle`
          : consultation.ordreControle === 1
            ? '1er contrôle'
            : 'Contrôle')
        : 'Consultation initiale';
      const searchText = [
        consultation.patient?.displayName ?? ([consultation.patient?.prenom, consultation.patient?.nom].filter(Boolean).join(' ') || 'Patient inconnu'),
        consultation.observation?.diagnostic ?? '',
        consultation.observation?.notes ?? '',
        visitLabel,
        normalizedStatus,
        formattedDate,
        consultation.heure,
        consultation.motif ?? '',
        consultation.patient?.prenom ?? '',
        consultation.patient?.nom ?? '',
        consultation.patient?.dossier ?? '',
      ].join(' ').toLowerCase();

      return {
        id: consultation.id,
        time: consultation.heure,
        name: consultation.patient?.displayName ?? ([consultation.patient?.prenom, consultation.patient?.nom].filter(Boolean).join(' ') || 'Patient inconnu'),
        date: formattedDate,
        dateKey,
        urgencyLabel: consultation.urgence ? 'Urgence' : 'Normal',
        status: normalizedStatus,
        isUrgent: consultation.urgence,
        action: consultation.termine ? "done" : "start",
        visitLabel: isControl ? controlLabel : visitLabel,
        isControl,
        motif: consultation.motif || consultation.observation?.diagnostic || '',
        priseEnCharge: consultation.patient?.priseEnCharge ?? null,
        idNumber: consultation.patient?.cin ?? undefined,
        profession: consultation.patient?.profession ?? undefined,
        phone: consultation.patient?.telephone ?? undefined,
        address: consultation.patient?.adresse ?? undefined,
        emergencyContact: consultation.patient?.contactUrgence ?? undefined,
        sexe: consultation.patient?.sexe ?? undefined,
        dateNaissance: consultation.patient?.dateNaissance ?? undefined,
        patientId: consultation.patientId,
        searchText,
        isArrived: Boolean(consultation.arriveeAccueil),
        arrivalLabel: consultation.arriveeAccueil ? 'Arrivé' : 'À confirmer',
        arrivalTime: consultation.arriveeAccueilAt ? new Date(consultation.arriveeAccueilAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : undefined,
        isReport: Boolean(consultation.estReport),
        medecinId: consultation.medecinId,
      };
    });

    return mapped.sort((a, b) => {
      const aUrgent = a.isUrgent && a.status !== "EFFECTUÉ";
      const bUrgent = b.isUrgent && b.status !== "EFFECTUÉ";
      if (aUrgent && !bUrgent) return -1;
      if (!aUrgent && bUrgent) return 1;

      const aCompleted = a.status === "EFFECTUÉ";
      const bCompleted = b.status === "EFFECTUÉ";
      if (aCompleted && !bCompleted) return 1;
      if (!aCompleted && bCompleted) return -1;

      const aReport = a.isReport && !aCompleted;
      const bReport = b.isReport && !bCompleted;
      if (aReport && !bReport) return -1;
      if (!aReport && bReport) return 1;

      const aArrived = a.isArrived && !aCompleted;
      const bArrived = b.isArrived && !bCompleted;
      if (aArrived && !bArrived) return -1;
      if (!aArrived && bArrived) return 1;

      return a.time.localeCompare(b.time);
    });
  }, [consultations]);

  const filteredPatients = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return patients.filter((patient) => {
      if (query && !patient.searchText.includes(query)) {
        return false;
      }

      if (statusFilter !== 'TOUS' && patient.status !== statusFilter) {
        return false;
      }

      if (visitTypeFilter === 'INITIALE' && patient.isControl) {
        return false;
      }
      if (visitTypeFilter === 'CONTROLE' && !patient.isControl) {
        return false;
      }

      return true;
    });
  }, [patients, searchQuery, statusFilter, visitTypeFilter]);

  // Revenir à la première page dès que les filtres ou la recherche changent —
  // sinon on peut se retrouver sur une page vide après un nouveau filtrage.
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, visitTypeFilter, viewMode, dateFrom, dateTo]);

  const totalPages = Math.max(1, Math.ceil(filteredPatients.length / PAGE_SIZE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedPatients = useMemo(() => {
    const start = (safeCurrentPage - 1) * PAGE_SIZE;
    return filteredPatients.slice(start, start + PAGE_SIZE);
  }, [filteredPatients, safeCurrentPage]);

  if (!isLoading && !isAuthenticated) {
    if (typeof window !== "undefined") {
      window.location.href = AUTH_CLIENT_URL;
    }
    return null;
  }

  const handleStart = async (appt: Appointment) => {
    try {
      await consultationApi.traiterConsultation(appt.id, 'ouvrir');
    } catch (error) {
      console.error('Impossible de marquer la consultation comme en cours:', error);
    }

    try {
      const consultationDetails = await consultationApi.getConsultationById(appt.id);
      const redirectResponse = await fetch('/api/redirect/traitement', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          consultationId: appt.id,
          patientId: consultationDetails.patientId,
          from: appt.isControl ? 'controle' : 'prescription',
          origin: 'fil-de-travail',
        }),
      });

      if (redirectResponse.ok) {
        const data = await redirectResponse.json();
        router.push(data.redirectUrl);
      } else {
        console.error('Erreur lors de la redirection');
        const mode = appt.isControl ? '&mode=controle' : '';
        router.push(`/modules/consultation-externe/traitement?id=${appt.id}${mode}&origin=fil-de-travail`);
      }
    } catch (error) {
      console.error('Erreur réseau:', error);
      const mode = appt.isControl ? '&mode=controle' : '';
      router.push(`/modules/consultation-externe/traitement?id=${appt.id}${mode}&origin=fil-de-travail`);
    }
  };

  const handleOpenPatientInfo = (appt: Appointment) => {
    setPatientInfo(appt);
  };

  const handleClosePatientInfo = () => {
    setPatientInfo(null);
  };

  const handleOpenReport = (appt: Appointment) => {
    setReportTarget(appt);
    setReportDate(getTomorrowDateKey());
    setReportMedecinId(String(appt.medecinId));
    setReportError(null);
  };

  const handleCloseReport = () => {
    setReportTarget(null);
    setReportError(null);
  };

  const handleSubmitReport = async () => {
    if (!reportTarget || !reportDate) {
      setReportError('Choisissez une date de report.');
      return;
    }

    setReportError(null);
    try {
      await traiterMutation({
        id: reportTarget.id,
        action: 'reporter',
        extra: {
          date: reportDate,
          medecinId: reportMedecinId || undefined,
        },
      });
      handleCloseReport();
    } catch (err) {
      setReportError(err instanceof Error ? err.message : 'Erreur lors du report de la consultation.');
    }
  };

  const doctorName = medecin ? `Dr. ${medecin.prenom} ${medecin.nom}` : 'Dr. connecté';

  // Quota d'aujourd'hui : indépendant des filtres de vue actifs
  const todayKey = getTodayDateKey();
  const todayTotal = todayConsultationsRaw.length;
  const todayCompleted = todayConsultationsRaw.filter(
    (c) => c.termine || c.statut?.toUpperCase() === 'TERMINE' || c.statut?.toUpperCase() === 'TERMINÉ'
  ).length;

  // Quota max depuis le planning du médecin (somme des créneaux du jour)
  const todayPlannings = plannings.filter((p) => formatDateKey(p.date) === todayKey && p.disponible);
  const quotaMax = todayPlannings.length > 0
    ? todayPlannings.reduce((sum, p) => sum + (p.quota ?? 0), 0)
    : null;

  const progressPercent = quotaMax && quotaMax > 0
    ? Math.min((todayTotal / quotaMax) * 100, 100)
    : 0;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">

      <div className="fixed bottom-4 right-4 z-40 w-[calc(100vw-2rem)] max-w-md md:w-full pointer-events-none">
        <div className="pointer-events-auto ml-auto">
        </div>
      </div>

      <div className="p-4 sm:p-6 lg:p-8 flex-1">
        {/* La colonne de droite (Vue d'ensemble) ne se met à côté du tableau qu'à
            partir de 2xl (1536px) — en dessous, avec la sidebar de navigation
            (jusqu'à 260px), le tableau n'a plus assez de place pour ses 7
            colonnes et déborde horizontalement (boutons d'action cachés). */}
        <div className="max-w-[1400px] mx-auto grid grid-cols-1 2xl:grid-cols-3 gap-8">

          {/* Left Column: Consultation List */}
          <div className="2xl:col-span-2">
            {/* Le quota du jour doit toujours rester visible sans scroller, même
                si le tableau contient des centaines de lignes (vue "Tous") — la
                carte détaillée "Vue d'ensemble" plus bas peut se retrouver très
                loin dans ce cas, donc on affiche aussi ce résumé compact ici. */}
            <div className="mb-6 sm:mb-8 flex flex-wrap items-start justify-between gap-3">
              <div>
                <h1 className="text-[20px] sm:text-[26px] font-extrabold text-gray-900 leading-tight tracking-tight">Mes consultations du jour</h1>
                <p className="text-[12px] sm:text-[14px] text-gray-500 mt-1.5 font-medium">{doctorName}</p>
              </div>
              <div className="flex items-center gap-2.5 rounded-2xl border border-gray-100 bg-white px-4 py-2.5 shadow-[0px_4px_16px_rgba(17,17,26,0.05)]">
                <div className="relative h-9 w-9 shrink-0">
                  <svg className="h-9 w-9 -rotate-90" viewBox="0 0 36 36">
                    <circle cx="18" cy="18" r="15.5" fill="none" stroke="#F1F5F9" strokeWidth="4" />
                    <circle
                      cx="18" cy="18" r="15.5" fill="none"
                      stroke={progressPercent >= 100 ? "#10B981" : "#005b82"}
                      strokeWidth="4"
                      strokeDasharray={`${(progressPercent / 100) * 97.4} 97.4`}
                      strokeLinecap="round"
                    />
                  </svg>
                </div>
                <div className="leading-tight">
                  <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Quota aujourd'hui</p>
                  <p className="text-[15px] font-black text-[#005b82]">
                    {todayTotal}<span className="text-gray-300 font-bold">/{quotaMax ?? '—'}</span>
                  </p>
                </div>
              </div>
            </div>

            <div className="mb-6 space-y-2.5 rounded-2xl border border-gray-100 bg-white p-2.5 shadow-[0px_4px_16px_rgba(17,17,26,0.04)]">
              {/* Ligne 1 : vue rapide + recherche */}
              <div className="flex flex-nowrap items-center gap-2 overflow-x-auto">
                <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleSetViewMode('today')}
                    className={cn(
                      'flex h-7 items-center gap-1.5 rounded-lg px-3 text-[12px] font-semibold transition-colors whitespace-nowrap',
                      viewMode === 'today' && !hasDateRange ? 'bg-white text-[#005b82] shadow-sm' : 'text-slate-500 hover:text-slate-700'
                    )}
                  >
                    <Filter className="w-3.5 h-3.5" />
                    Aujourd’hui
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSetViewMode('all')}
                    className={cn(
                      'h-7 rounded-lg px-3 text-[12px] font-semibold transition-colors whitespace-nowrap',
                      viewMode === 'all' && !hasDateRange ? 'bg-white text-[#005b82] shadow-sm' : 'text-slate-500 hover:text-slate-700'
                    )}
                  >
                    Tous
                  </button>
                </div>

                <div className="hidden h-6 w-px bg-slate-200 sm:block" />

                {/* Recherche */}
                <div className="relative min-w-[160px] flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Rechercher un patient, un motif..."
                    className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-8 text-[12px] font-medium text-slate-700 placeholder:text-slate-400 transition-colors focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#005b82]/30"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>

              <div className="h-px bg-slate-100" />

              {/* Ligne 2 : statut, type de visite, plage de dates */}
              <div className="flex min-w-0 items-center gap-2 overflow-hidden">
                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}
                  className="h-9 min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 text-[12px] font-semibold text-slate-600 transition-colors focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#005b82]/30"
                >
                  <option value="TOUS">Tous les statuts</option>
                  <option value="EN ATTENTE">En attente</option>
                  <option value="EN COURS">En cours</option>
                  <option value="EFFECTUÉ">Effectué</option>
                </select>

                <select
                  value={visitTypeFilter}
                  onChange={(event) => setVisitTypeFilter(event.target.value as typeof visitTypeFilter)}
                  className="h-9 min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 text-[12px] font-semibold text-slate-600 transition-colors focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#005b82]/30"
                >
                  <option value="TOUS">Tous les types</option>
                  <option value="INITIALE">Consultation initiale</option>
                  <option value="CONTROLE">Contrôle</option>
                </select>

                <div className={cn(
                  "flex h-9 min-w-0 flex-[2] items-center gap-1.5 rounded-xl border px-2.5 transition-colors",
                  hasDateRange ? "border-[#005b82]/40 bg-[#EAF3FA]" : "border-slate-200 bg-slate-50"
                )}>
                  <CalendarRange className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(event) => setDateFrom(event.target.value)}
                    className="h-full min-w-0 flex-1 bg-transparent text-[12px] font-semibold text-slate-600 focus:outline-none"
                  />
                  <span className="shrink-0 text-slate-300">→</span>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(event) => setDateTo(event.target.value)}
                    className="h-full min-w-0 flex-1 bg-transparent text-[12px] font-semibold text-slate-600 focus:outline-none"
                  />
                </div>

                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="flex h-9 shrink-0 items-center gap-1 rounded-xl px-3 text-[12px] font-semibold text-slate-500 transition-colors hover:bg-red-50 hover:text-red-600"
                  >
                    <X className="h-3.5 w-3.5" />
                    Réinitialiser
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-6">
              {loading ? (
                <>
                  <ConsultationSkeleton />
                  <ConsultationSkeleton />
                  <ConsultationSkeleton />
                </>
              ) : error ? (
                <Card className="border border-gray-100 shadow-[0px_4px_16px_rgba(17,17,26,0.05)] rounded-3xl bg-white">
                  <CardContent className="flex flex-col items-center justify-center py-16 text-center gap-3">
                    <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-300 border border-slate-100">
                      <Calendar className="w-7 h-7" />
                    </div>
                    <p className="text-[15px] font-bold text-slate-700">Aucun patient à traiter</p>
                    <p className="text-[13px] text-slate-400 font-medium max-w-xs">
                      Aucune consultation n&apos;est programmée pour aujourd&apos;hui, ou les données ne sont pas encore disponibles.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <Card className="border border-gray-100 shadow-[0px_4px_16px_rgba(17,17,26,0.05)] rounded-3xl bg-white overflow-hidden">
                  <CardContent className="p-0">

                    <div className="overflow-x-auto">
                      <table className="w-full text-sm table-fixed">
                        <thead className="bg-slate-50 text-left text-gray-500">
                          <tr>
                            <th className="px-1.5 py-2.5 font-semibold whitespace-nowrap text-[11px] w-[9%]">Date & heure</th>
                            <th className="px-1.5 py-2.5 font-semibold whitespace-nowrap text-[11px] w-[16%]">Patient</th>
                            <th className="px-1.5 py-2.5 font-semibold whitespace-nowrap text-[11px] w-[14%]">Visite</th>
                            <th className="px-1.5 py-2.5 font-semibold whitespace-nowrap text-[11px] w-[9%]">Urgence</th>
                            <th className="px-1.5 py-2.5 font-semibold w-[22%]">Motif</th>
                            <th className="px-1.5 py-2.5 font-semibold whitespace-nowrap text-[11px] w-[12%]">Statut</th>
                            <th className="px-1.5 py-2.5 font-semibold text-right whitespace-nowrap text-[11px] w-[18%]">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredPatients.length === 0 && (
                            <tr>
                              <td colSpan={7} className="px-2 py-14 text-center">
                                <div className="flex flex-col items-center gap-2">
                                  <Calendar className="w-8 h-8 text-slate-200" />
                                  <p className="text-[14px] font-semibold text-slate-500">
                                    {viewMode === 'today' && !hasDateRange
                                      ? 'Aucun patient à traiter aujourd\'hui'
                                      : 'Aucune consultation ne correspond à ces filtres'}
                                  </p>
                                  {viewMode === 'today' && !hasDateRange && (
                                    <p className="text-[12px] text-slate-400">Les patients arrivés apparaîtront ici automatiquement.</p>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                          {paginatedPatients.map((patient) => (
                            <tr key={patient.id} className={cn(
                              "border-t border-gray-100 hover:bg-slate-100 align-top transition-colors",
                              patient.priseEnCharge
                                ? (patient.priseEnCharge.isActive ? "bg-[#EAF3FA]" : "bg-amber-50")
                                : "hover:bg-slate-50"
                            )}>
                              <td className={cn(
                                "px-1.5 py-2.5 border-l-[6px]",
                                patient.priseEnCharge
                                  ? (patient.priseEnCharge.isActive ? "border-[#005b82]" : "border-amber-500")
                                  : "border-transparent"
                              )}>
                                <div className="flex flex-col gap-1">
                                  <div className="flex items-center gap-1.5">
                                    {patient.isUrgent && <span className="h-2 w-2 shrink-0 rounded-full bg-red-500" />}
                                    <span className={cn(
                                      "font-semibold text-[12px] truncate",
                                      patient.status === "EFFECTUÉ" ? "text-slate-400" : "text-[#005b82]"
                                    )}>{patient.time}</span>
                                  </div>
                                  <span className="text-[10px] text-gray-500 truncate">{patient.date}</span>
                                </div>
                              </td>
                              <td className="px-1.5 py-2.5 overflow-hidden">
                                <p className="font-semibold text-gray-900 leading-tight truncate text-[12px]">{patient.name}</p>
                                {patient.priseEnCharge && (
                                  <p
                                    title={patient.priseEnCharge.isActive ? `Pris en charge — ${patient.priseEnCharge.companyName}` : `Prise en charge inactive — ${patient.priseEnCharge.companyName}`}
                                    className={cn(
                                      "mt-0.5 text-[9px] font-bold truncate",
                                      patient.priseEnCharge.isActive ? "text-[#005b82]" : "text-amber-600"
                                    )}
                                  >
                                    {patient.priseEnCharge.companyName}
                                  </p>
                                )}
                              </td>
                              <td className="px-1.5 py-2.5 overflow-hidden">
                                <div className="flex flex-wrap gap-1">
                                  <Badge className={cn(
                                    "border-none px-2 py-0.5 rounded-full font-semibold text-[8px] uppercase tracking-wider",
                                    patient.isControl ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-700"
                                  )}>
                                    {patient.visitLabel}
                                  </Badge>
                                  {patient.isControl && (
                                    <Badge className="border-none px-2 py-0.5 rounded-full font-semibold text-[8px] uppercase tracking-wider bg-blue-50 text-blue-700">
                                      Suivi
                                    </Badge>
                                  )}
                                  {patient.isReport && (
                                    <Badge className="border-none px-2 py-0.5 rounded-full font-semibold text-[8px] uppercase tracking-wider bg-orange-50 text-orange-700">
                                      Reporté
                                    </Badge>
                                  )}
                                </div>
                              </td>
                              <td className="px-1.5 py-2.5">
                                <Badge className={cn(
                                  "border-none px-2 py-0.5 rounded-full font-bold text-[9px] uppercase tracking-wider whitespace-nowrap",
                                  patient.isUrgent ? "bg-red-50 text-red-700" : "bg-slate-100 text-slate-700"
                                )}>
                                  {patient.urgencyLabel}
                                </Badge>
                              </td>
                              <td className="px-1.5 py-2.5 overflow-hidden">
                                <p className="text-gray-600 line-clamp-2 leading-snug text-[11px]">{patient.motif || '—'}</p>
                              </td>
                              <td className="px-1.5 py-2.5">
                                <div className="flex flex-col items-start gap-1">
                                  <Badge className={cn(
                                    "border-none px-2 py-0.5 rounded-full font-bold text-[9px] uppercase tracking-wider whitespace-nowrap",
                                    patient.status === "EFFECTUÉ" ? "bg-[#E6F4EA] text-[#059669]" : patient.isUrgent ? "bg-red-50 text-red-700" : "bg-[#EAF3FA] text-[#006A8C]"
                                  )}>
                                    {patient.status}
                                  </Badge>
                                  <Badge className={cn(
                                    "border-none px-2 py-0.5 rounded-full font-semibold text-[8px] uppercase tracking-wider whitespace-nowrap",
                                    patient.isArrived ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-700"
                                  )}>
                                    {patient.arrivalLabel}{patient.arrivalTime ? ` · ${patient.arrivalTime}` : ''}
                                  </Badge>
                                </div>
                              </td>
                              <td className="px-1.5 py-2.5">
                                <div className="flex flex-wrap justify-end gap-1">
                                  {patient.action === "start" ? (
                                    <>
                                      <Button onClick={() => handleStart(patient)} className="bg-[#005b82] hover:bg-[#004a6b] text-white rounded-lg px-2 py-1.5 h-auto text-[10px] font-bold whitespace-nowrap">
                                        Ouvrir
                                      </Button>
                                      <Button variant="ghost" onClick={() => handleOpenPatientInfo(patient)} className="text-[#005b82] hover:bg-slate-50 h-auto px-1.5 py-1.5 text-[10px] font-bold whitespace-nowrap">
                                        Infos
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        title="Reporter à un autre jour"
                                        onClick={() => handleOpenReport(patient)}
                                        className="text-orange-600 hover:bg-orange-50 h-auto px-1.5 py-1.5 text-[10px] font-bold whitespace-nowrap"
                                      >
                                        <CalendarClock className="h-3.5 w-3.5" />
                                      </Button>
                                    </>
                                  ) : (
                                    <Button disabled className="bg-gray-50 text-gray-400 rounded-lg px-2 py-1.5 h-auto text-[10px] font-bold border border-gray-100 whitespace-nowrap">
                                      Terminé
                                    </Button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {filteredPatients.length > 0 && totalPages > 1 && (
                      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 px-4 py-3">
                        <p className="text-[11px] font-medium text-gray-500">
                          Affiche {(safeCurrentPage - 1) * PAGE_SIZE + 1}-{Math.min(safeCurrentPage * PAGE_SIZE, filteredPatients.length)} sur {filteredPatients.length} patient{filteredPatients.length > 1 ? 's' : ''}
                        </p>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="outline"
                            disabled={safeCurrentPage === 1}
                            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                            className="h-8 px-3 rounded-lg text-[11px] font-bold"
                          >
                            Précédent
                          </Button>
                          <div className="flex items-center gap-1 px-1">
                            {Array.from({ length: totalPages }, (_, i) => i + 1)
                              .filter((page) => page === 1 || page === totalPages || Math.abs(page - safeCurrentPage) <= 1)
                              .reduce<number[]>((acc, page, idx, arr) => {
                                if (idx > 0 && page - arr[idx - 1] > 1) acc.push(-1);
                                acc.push(page);
                                return acc;
                              }, [])
                              .map((page, idx) =>
                                page === -1 ? (
                                  <span key={`ellipsis-${idx}`} className="px-1 text-[11px] text-gray-400">…</span>
                                ) : (
                                  <button
                                    key={page}
                                    onClick={() => setCurrentPage(page)}
                                    className={cn(
                                      "h-8 w-8 rounded-lg text-[11px] font-bold transition-colors",
                                      page === safeCurrentPage ? "bg-[#005b82] text-white" : "text-gray-500 hover:bg-slate-100"
                                    )}
                                  >
                                    {page}
                                  </button>
                                )
                              )}
                          </div>
                          <Button
                            variant="outline"
                            disabled={safeCurrentPage === totalPages}
                            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                            className="h-8 px-3 rounded-lg text-[11px] font-bold"
                          >
                            Suivant
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          {/* Right Column: Overview */}
          {/* Côte à côte quand il y a de la place (le tableau est en pleine
              largeur en dessous de 2xl) ; empilé à 2xl+ où cette colonne
              redevient étroite à côté du tableau. */}
          <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-1 gap-6 sticky top-8 self-start">
            {/* Stats Widget */}
            <div className="space-y-6">
              <div className="flex items-center gap-2 text-[#005b82] font-extrabold uppercase tracking-[0.1em] text-[11px] px-1">
                <Calendar className="w-4 h-4" />
                <span>Vue d'ensemble</span>
              </div>

              <div className="bg-white rounded-[28px] sm:rounded-[32px] p-6 sm:p-7 shadow-[0px_4px_16px_rgba(17,17,26,0.05)] border border-gray-100">
                <div className="flex justify-between items-end mb-4">
                  <span className="text-[10px] sm:text-[11px] font-bold text-gray-400 uppercase tracking-[0.1em]">MON QUOTA AUJOURD'HUI</span>
                  <span className="text-[13px] sm:text-[14px] font-black text-[#005b82]">
                    {todayTotal}/{quotaMax ?? '—'}
                  </span>
                </div>
                <div className="w-full bg-[#F1F5F9] h-2.5 rounded-full overflow-hidden">
                  <div
                    className={cn("h-full rounded-full transition-all", progressPercent >= 100 ? "bg-emerald-500" : "bg-[#005b82]")}
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                {quotaMax === null && (
                  <p className="text-[10px] text-slate-400 mt-1.5">Aucun créneau planifié aujourd'hui</p>
                )}

                <div className="flex justify-between mt-8 gap-4">
                  <div className="flex-1 bg-[#F8FAFC] rounded-2xl p-4 flex flex-col items-center">
                    <span className="text-[9px] sm:text-[10px] font-bold text-gray-400 tracking-widest mb-2 uppercase">Aujourd'hui</span>
                    <span className="text-2xl sm:text-3xl font-black text-[#005b82] leading-none">
                      {todayTotal < 10 ? `0${todayTotal}` : todayTotal}
                    </span>
                  </div>
                  <div className="flex-1 bg-[#F8FAFC] rounded-2xl p-4 flex flex-col items-center">
                    <span className="text-[9px] sm:text-[10px] font-bold text-gray-400 tracking-widest mb-2 uppercase">Effectuées</span>
                    <span className="text-2xl sm:text-3xl font-black text-[#059669] leading-none">
                      {todayCompleted < 10 ? `0${todayCompleted}` : todayCompleted}
                    </span>
                  </div>
                  {quotaMax !== null && (
                    <div className="flex-1 bg-[#F8FAFC] rounded-2xl p-4 flex flex-col items-center">
                      <span className="text-[9px] sm:text-[10px] font-bold text-gray-400 tracking-widest mb-2 uppercase">Quota max</span>
                      <span className="text-2xl sm:text-3xl font-black text-slate-500 leading-none">
                        {quotaMax < 10 ? `0${quotaMax}` : quotaMax}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Access */}
            <div className="bg-[#F5F8FA] rounded-[28px] sm:rounded-[32px] p-5 sm:p-7 border border-[#EAF3FA]">
              <h3 className="text-[10px] sm:text-[11px] font-extrabold text-[#005b82] uppercase tracking-[0.1em] mb-5 sm:mb-6 px-1">ACCES RAPIDES</h3>
              <div className="space-y-3">
                <button
                  onClick={() => router.push('/modules/consultation-externe/planning-complet')}
                  className="w-full cursor-pointer bg-white hover:bg-gray-50 transition-colors text-left px-4 sm:px-5 py-3.5 rounded-2xl flex items-center gap-3 shadow-sm border border-transparent"
                >
                  <Calendar className="w-5 h-5 text-[#005b82]" strokeWidth={2.5} />
                  <span className="text-[12px] sm:text-[13px] font-bold text-gray-900 leading-snug">Planning complet</span>
                </button>
                <button className="w-full cursor-pointer bg-white hover:bg-gray-50 transition-colors text-left px-4 sm:px-5 py-3.5 rounded-2xl flex items-center gap-3 shadow-sm border border-transparent">
                  <CalendarX className="w-5 h-5 text-red-500" strokeWidth={2.5} />
                  <span className="text-[12px] sm:text-[13px] font-bold text-gray-900 leading-snug">Indisponibilité</span>
                </button>
                <button className="w-full cursor-pointer bg-white hover:bg-gray-50 transition-colors text-left px-4 sm:px-5 py-3.5 rounded-2xl flex items-center gap-3 shadow-sm border border-transparent">
                  <ArrowLeftRight className="w-5 h-5 text-[#005b82]" strokeWidth={2.5} />
                  <span className="text-[12px] sm:text-[13px] font-bold text-gray-900 leading-snug">Créneau alternatif</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {patientInfo && (
          <PatientInfoModal
            isOpen={!!patientInfo}
            onClose={handleClosePatientInfo}
            patientData={{
              nom: patientInfo.name,
              prenom: "",
              sexe: patientInfo.sexe,
              dateNaissance: patientInfo.dateNaissance,
              cin: patientInfo.idNumber,
              telephone: patientInfo.phone,
              adresse: patientInfo.address,
              contactUrgence: patientInfo.emergencyContact,
              profession: patientInfo.profession,
              motif: patientInfo.motif,
              consultationHistory: historyData,
            } as PatientInfo}
            onAction={() => handleStart(patientInfo)}
            actionLabel="Commencer la consultation"
          />
        )}

        {reportTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={handleCloseReport}>
            <div
              className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-start justify-between mb-1">
                <h2 className="text-lg font-extrabold text-[#1a1f36]">Reporter la consultation</h2>
                <button onClick={handleCloseReport} className="text-slate-400 hover:text-slate-600">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <p className="text-[13px] text-slate-500 mb-5">
                {reportTarget.name} — le patient sera marqué prioritaire au retour, en compensation de l’attente déjà subie.
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Nouvelle date</label>
                  <input
                    type="date"
                    value={reportDate}
                    min={getTodayDateKey()}
                    onChange={(event) => setReportDate(event.target.value)}
                    className="w-full h-10 rounded-xl border border-slate-200 px-3 text-[13px] font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#005b82]/30"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Médecin</label>
                  <select
                    value={reportMedecinId}
                    onChange={(event) => setReportMedecinId(event.target.value)}
                    className="w-full h-10 rounded-xl border border-slate-200 px-3 text-[13px] font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#005b82]/30"
                  >
                    {medecinsList.map((doc) => (
                      <option key={doc.id} value={doc.id}>
                        Dr. {doc.prenom} {doc.nom}{doc.specialite ? ` — ${doc.specialite}` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {reportError && (
                  <p className="text-[12px] font-medium text-red-600">{reportError}</p>
                )}

                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="ghost" onClick={handleCloseReport} className="text-slate-500 hover:bg-slate-50">
                    Annuler
                  </Button>
                  <Button
                    onClick={handleSubmitReport}
                    disabled={isReporting}
                    className="bg-orange-600 hover:bg-orange-700 text-white"
                  >
                    {isReporting ? 'Report en cours...' : 'Confirmer le report'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
