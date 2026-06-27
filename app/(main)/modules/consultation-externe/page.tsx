"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, CalendarRange, CalendarClock, CalendarX, ArrowLeftRight, Search, Filter, X } from "lucide-react";
import { cn } from "@/lib/utils";

import { useAllConsultations, useConsultationEventsSubscription, usePatientConsultationHistory, useTraiterConsultation } from '@/hooks/use-consultations';
import { useMedecins } from '@/hooks/use-planning';
import { consultationApi, getVisiteLabel } from '@/lib/api/consultation';
import { PatientInfoModal } from "@/components/notification/PatientInfoModal";
import { PatientInfo } from "@/stores/notification-store";
import { useAuth } from '@/context/AuthContext';

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
  medecinId: number;
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

  const hasDateRange = Boolean(dateFrom || dateTo);
  const hasActiveFilters = hasDateRange || searchQuery.trim().length > 0 || statusFilter !== 'TOUS' || visitTypeFilter !== 'TOUS' || viewMode !== 'today';

  const queryFilters = hasDateRange
    ? { dateFrom: dateFrom || undefined, dateTo: dateTo || undefined }
    : viewMode === 'today'
      ? { arrived: true, date: getTodayDateKey() }
      : undefined;

  const { data: consultations = [], isLoading: loading, error } = useAllConsultations(queryFilters);
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

  if (!isLoading && !isAuthenticated) {
    if (typeof window !== "undefined") {
      window.location.assign("/login?from=/modules/consultation-externe");
    }
    return null;
  }

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
        consultation.patient?.displayName ?? `Patient #${consultation.patientId}`,
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
        name: consultation.patient?.displayName ?? `Patient #${consultation.patientId}`,
        date: formattedDate,
        dateKey,
        urgencyLabel: consultation.urgence ? 'Urgence' : 'Normal',
        status: normalizedStatus,
        isUrgent: consultation.urgence,
        action: consultation.termine ? "done" : "start",
        visitLabel: isControl ? controlLabel : visitLabel,
        isControl,
        motif: consultation.motif || consultation.observation?.diagnostic || '',
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
          from: appt.isControl ? 'controle' : 'prescription'
        }),
      });

      if (redirectResponse.ok) {
        const data = await redirectResponse.json();
        router.push(data.redirectUrl);
      } else {
        console.error('Erreur lors de la redirection');
        const mode = appt.isControl ? '&mode=controle' : '';
        router.push(`/modules/consultation-externe/traitement?id=${appt.id}${mode}`);
      }
    } catch (error) {
      console.error('Erreur réseau:', error);
      const mode = appt.isControl ? '&mode=controle' : '';
      router.push(`/modules/consultation-externe/traitement?id=${appt.id}${mode}`);
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
          medecinId: reportMedecinId ? Number(reportMedecinId) : undefined,
        },
      });
      handleCloseReport();
    } catch (err) {
      setReportError(err instanceof Error ? err.message : 'Erreur lors du report de la consultation.');
    }
  };

  const doctorName = medecin ? `Dr. ${medecin.prenom} ${medecin.nom}` : 'Dr. connecté';

  // calculate stats
  const totalConsultations = patients.length;
  const completedConsultations = patients.filter(p => p.status === "EFFECTUÉ").length;
  const quota = 10;
  const progressPercent = Math.min((totalConsultations / quota) * 100, 100);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">

      <div className="fixed bottom-4 right-4 z-40 w-[calc(100vw-2rem)] max-w-md md:w-full pointer-events-none">
        <div className="pointer-events-auto ml-auto">
        </div>
      </div>

      <div className="p-4 sm:p-6 lg:p-8 flex-1">
        <div className="max-w-[1400px] mx-auto grid grid-cols-1 xl:grid-cols-3 gap-8">

          {/* Left Column: Consultation List */}
          <div className="xl:col-span-2">
            <div className="mb-6 sm:mb-8">
              <h1 className="text-[20px] sm:text-[26px] font-extrabold text-gray-900 leading-tight tracking-tight">Mes consultations du jour</h1>
              <p className="text-[12px] sm:text-[14px] text-gray-500 mt-1.5 font-medium">{doctorName}</p>
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
                <div className='p-6 bg-red-50 text-red-700 rounded-lg'>Erreur de chargement des données.</div>
              ) : (
                <Card className="border border-gray-100 shadow-[0px_4px_16px_rgba(17,17,26,0.05)] rounded-3xl bg-white overflow-hidden">
                  <CardContent className="p-0">

                    <div className="overflow-x-visible">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-50 text-left text-gray-500">
                          <tr>
                            <th className="px-2 py-3 font-semibold whitespace-nowrap text-[12px]">Date & heure</th>
                            <th className="px-2 py-3 font-semibold">Patient</th>
                            <th className="px-2 py-3 font-semibold whitespace-nowrap text-[12px]">Urgence</th>
                            <th className="px-2 py-3 font-semibold">Motif</th>
                            <th className="px-2 py-3 font-semibold whitespace-nowrap text-[12px]">Statut</th>
                            <th className="px-2 py-3 font-semibold text-right whitespace-nowrap text-[12px]">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredPatients.length === 0 && (
                            <tr>
                              <td colSpan={6} className="px-2 py-10 text-center text-[13px] text-slate-400 font-medium">
                                Aucune consultation ne correspond à ces filtres.
                              </td>
                            </tr>
                          )}
                          {filteredPatients.map((patient) => (
                            <tr key={patient.id} className="border-t border-gray-100 hover:bg-slate-50 align-top">
                              <td className="px-2 py-3 whitespace-nowrap">
                                <div className="flex flex-col gap-1">
                                  <div className="flex items-center gap-2">
                                    {patient.isUrgent && <span className="h-2 w-2 rounded-full bg-red-500" />}
                                    <span className={cn(
                                      "font-semibold",
                                      patient.status === "EFFECTUÉ" ? "text-slate-400" : "text-[#005b82]"
                                    )}>{patient.time}</span>
                                  </div>
                                  <span className="text-[11px] text-gray-500">{patient.date}</span>
                                </div>
                              </td>
                              <td className="px-2 py-3 max-w-[220px]">
                                <div>
                                  <p className="font-semibold text-gray-900 leading-tight">{patient.name}</p>
                                  <div className="mt-1 flex flex-wrap gap-1">
                                    <Badge className={cn(
                                      "border-none px-2.5 py-1 rounded-full font-semibold text-[9px] uppercase tracking-wider",
                                      patient.isControl ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-700"
                                    )}>
                                      {patient.visitLabel}
                                    </Badge>
                                    <Badge className={cn(
                                      "border-none px-2.5 py-1 rounded-full font-semibold text-[9px] uppercase tracking-wider",
                                      patient.isArrived ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-700"
                                    )}>
                                      {patient.arrivalLabel}{patient.arrivalTime ? ` · ${patient.arrivalTime}` : ''}
                                    </Badge>
                                    {patient.isControl && (
                                      <Badge className="border-none px-2.5 py-1 rounded-full font-semibold text-[9px] uppercase tracking-wider bg-blue-50 text-blue-700">
                                        Suivi
                                      </Badge>
                                    )}
                                    {patient.isReport && (
                                      <Badge className="border-none px-2.5 py-1 rounded-full font-semibold text-[9px] uppercase tracking-wider bg-orange-50 text-orange-700">
                                        Reporté · priorité
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td className="px-2 py-3 whitespace-nowrap">
                                <Badge className={cn(
                                  "border-none px-2.5 py-1 rounded-full font-bold text-[10px] uppercase tracking-wider",
                                  patient.isUrgent ? "bg-red-50 text-red-700" : "bg-slate-100 text-slate-700"
                                )}>
                                  {patient.urgencyLabel}
                                </Badge>
                              </td>
                              <td className="px-2 py-3 max-w-[220px]">
                                <p className="text-gray-600 line-clamp-2 leading-snug text-[12px]">{patient.motif || '—'}</p>
                              </td>
                              <td className="px-2 py-3 whitespace-nowrap">
                                <Badge className={cn(
                                  "border-none px-3 py-1 rounded-full font-bold text-[10px] uppercase tracking-wider",
                                  patient.status === "EFFECTUÉ" ? "bg-[#E6F4EA] text-[#059669]" : patient.isUrgent ? "bg-red-50 text-red-700" : "bg-[#EAF3FA] text-[#006A8C]"
                                )}>
                                  {patient.status}
                                </Badge>
                              </td>
                              <td className="px-2 py-3 whitespace-nowrap">
                                <div className="flex justify-end gap-1.5">
                                  {patient.action === "start" ? (
                                    <>
                                      <Button onClick={() => handleStart(patient)} className="bg-[#005b82] hover:bg-[#004a6b] text-white rounded-xl px-3 py-2 h-auto text-[11px] font-bold whitespace-nowrap">
                                        Ouvrir
                                      </Button>
                                      <Button variant="ghost" onClick={() => handleOpenPatientInfo(patient)} className="text-[#005b82] hover:bg-slate-50 h-auto px-2.5 py-2 text-[11px] font-bold whitespace-nowrap">
                                        Infos
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        title="Reporter à un autre jour"
                                        onClick={() => handleOpenReport(patient)}
                                        className="text-orange-600 hover:bg-orange-50 h-auto px-2.5 py-2 text-[11px] font-bold whitespace-nowrap"
                                      >
                                        <CalendarClock className="h-3.5 w-3.5" />
                                      </Button>
                                    </>
                                  ) : (
                                    <Button disabled className="bg-gray-50 text-gray-400 rounded-xl px-3 py-2 h-auto text-[11px] font-bold border border-gray-100 whitespace-nowrap">
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
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          {/* Right Column: Overview */}
          <div className="space-y-8 sticky top-8 self-start">
            {/* Stats Widget */}
            <div className="space-y-6">
              <div className="flex items-center gap-2 text-[#005b82] font-extrabold uppercase tracking-[0.1em] text-[11px] px-1">
                <Calendar className="w-4 h-4" />
                <span>Vue d'ensemble</span>
              </div>

              <div className="bg-white rounded-[28px] sm:rounded-[32px] p-6 sm:p-7 shadow-[0px_4px_16px_rgba(17,17,26,0.05)] border border-gray-100">
                <div className="flex justify-between items-end mb-4">
                  <span className="text-[10px] sm:text-[11px] font-bold text-gray-400 uppercase tracking-[0.1em]">MON QUOTA AUJOURD'HUI</span>
                  <span className="text-[13px] sm:text-[14px] font-black text-[#005b82]">{totalConsultations}/{quota}</span>
                </div>
                <div className="w-full bg-[#F1F5F9] h-2.5 rounded-full overflow-hidden">
                  <div className="bg-[#005b82] h-full rounded-full" style={{ width: `${progressPercent}%` }}></div>
                </div>

                <div className="flex justify-between mt-8 gap-4">
                  <div className="flex-1 bg-[#F8FAFC] rounded-2xl p-4 flex flex-col items-center">
                    <span className="text-[9px] sm:text-[10px] font-bold text-gray-400 tracking-widest mb-2 uppercase">Consultation</span>
                    <span className="text-2xl sm:text-3xl font-black text-[#005b82] leading-none">{totalConsultations < 10 ? `0${totalConsultations}` : totalConsultations}</span>
                  </div>
                  <div className="flex-1 bg-[#F8FAFC] rounded-2xl p-4 flex flex-col items-center">
                    <span className="text-[9px] sm:text-[10px] font-bold text-gray-400 tracking-widest mb-2 uppercase">Effectuées</span>
                    <span className="text-2xl sm:text-3xl font-black text-[#059669] leading-none">{completedConsultations < 10 ? `0${completedConsultations}` : completedConsultations}</span>
                  </div>
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
