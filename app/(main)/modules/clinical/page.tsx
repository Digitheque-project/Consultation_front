"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { getClinicalServiceIdFromBrowser } from "@/lib/auth/mock-auth-browser";
import {
  Calendar,
  Stethoscope,
  FileText,
  ClipboardSignature,
  TableProperties,
  User,
  Clock
} from "lucide-react";
import {
  getDashboardStats,
  getExternalConsultations,
  getHospitalizedPatients
} from "./services/dashboard";
import type {
  DashboardStats,
  ExternalConsultation,
  HospitalizedPatient
} from "./types";

const formatTime = (isoDate: string) =>
  new Date(isoDate).toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit"
  });

const formatShortId = (id: string) => id.slice(0, 8).toUpperCase();

const getHospitalisationStatus = (status: HospitalizedPatient["statutHospitalisation"]) => {
  switch (status) {
    case "EN_COURS":
      return {
        label: "En cours",
        badgeClass:
          "bg-[#EAF3FA] text-[#006A8C] font-bold text-[9px] sm:text-[10px] px-3 sm:px-4 py-1 sm:py-1.5 rounded-full flex items-center gap-1.5 uppercase tracking-widest"
      };
    case "CLOTUREE":
      return {
        label: "Cloturee",
        badgeClass:
          "bg-[#E6F4EA] text-[#059669] font-bold text-[9px] sm:text-[10px] px-3 sm:px-4 py-1 sm:py-1.5 rounded-full flex items-center gap-1.5 uppercase tracking-widest"
      };
    default:
      return {
        label: status,
        badgeClass:
          "bg-[#F1F5F9] text-gray-500 font-bold text-[9px] sm:text-[10px] px-3 sm:px-4 py-1 sm:py-1.5 rounded-full flex items-center gap-1.5 uppercase tracking-widest"
      };
  }
};

const getLocationLabel = (item: HospitalizedPatient) => {
  if (item.chambreNumero !== null && item.chambreNumero !== undefined) {
    return `Chambre ${item.chambreNumero}`;
  }

  if (item.litCode) {
    return `Lit ${item.litCode}`;
  }

  return "Non affecte";
};

const StatCardSkeleton = () => (
  <div className="bg-white rounded-3xl p-4 sm:p-6 shadow-[0px_4px_16px_rgba(17,17,26,0.05)] border border-gray-100 flex flex-col justify-between h-auto sm:h-[135px] animate-pulse">
    <div className="flex justify-between items-start">
      <div className="h-3 w-40 rounded bg-gray-200" />
      <div className="w-[32px] h-[32px] rounded-xl bg-gray-200" />
    </div>
    <div className="flex items-baseline gap-2 mb-1">
      <div className="h-10 w-16 rounded bg-gray-200" />
      <div className="h-3 w-28 rounded bg-gray-200" />
    </div>
  </div>
);

const ListRowSkeleton = () => (
  <div className="flex flex-col gap-3 md:grid md:grid-cols-12 md:items-center animate-pulse">
    <div className="md:col-span-2 flex justify-start md:justify-center">
      <div className="h-4 w-16 bg-gray-200 rounded" />
    </div>
    <div className="md:col-span-4 md:pl-4 space-y-2">
      <div className="h-3 w-40 bg-gray-200 rounded" />
      <div className="h-3 w-56 bg-gray-200 rounded" />
    </div>
    <div className="md:col-span-3 flex justify-start md:justify-center">
      <div className="h-6 w-24 bg-gray-200 rounded-full" />
    </div>
    <div className="md:col-span-3 flex justify-start md:justify-center">
      <div className="h-6 w-24 bg-gray-200 rounded-full" />
    </div>
  </div>
);

const ConsultationCardSkeleton = () => (
  <div className="bg-white rounded-3xl p-4 sm:p-6 shadow-[0px_4px_16px_rgba(17,17,26,0.05)] border border-gray-100 animate-pulse">
    <div className="flex items-start gap-3 sm:gap-4">
      <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-200 rounded-full" />
      <div className="space-y-3 w-full">
        <div className="h-3 w-40 bg-gray-200 rounded" />
        <div className="h-3 w-56 bg-gray-200 rounded" />
        <div className="h-3 w-28 bg-gray-200 rounded" />
      </div>
    </div>
  </div>
);

export default function DashboardPage() {
  const clinicalServiceId = useMemo(() => getClinicalServiceIdFromBrowser(), []);

  const statsQuery = useQuery<DashboardStats>({
    queryKey: ["dashboard-stats", clinicalServiceId ?? "none"],
    queryFn: getDashboardStats
  });

  const hospitalizedQuery = useQuery<HospitalizedPatient[]>({
    queryKey: ["dashboard-hospitalized", clinicalServiceId ?? "none"],
    queryFn: () => getHospitalizedPatients(4)
  });

  const consultationQuery = useQuery<ExternalConsultation[]>({
    queryKey: ["dashboard-consultations", clinicalServiceId ?? "none"],
    queryFn: () => getExternalConsultations(2)
  });

  const todayLabel = useMemo(
    () =>
      new Date().toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "long",
        year: "numeric"
      }),
    []
  );

  const stats = statsQuery.data;
  const hospitalisedPatients = hospitalizedQuery.data ?? [];
  const consultations = consultationQuery.data ?? [];

  return (
    <main className="p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto">
      {/* Header Section */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-6 sm:mb-8">
        <div className="min-w-0">
          <h1 className="text-[20px] sm:text-[26px] font-extrabold text-gray-900 leading-tight tracking-tight">
            Bonjour, Dr. Jean Pierre
          </h1>
          <p className="text-[12px] sm:text-[14px] text-gray-500 mt-1.5 font-medium">
            Voici l&apos;etat actuel de votre service
          </p>
        </div>
        <div className="flex items-center justify-center sm:justify-start gap-2 bg-[#F1F5F9] px-3 sm:px-4 py-2 sm:py-2.5 rounded-[12px] text-gray-700 shadow-sm border border-[#E2E8F0] w-full sm:w-auto">
          <Calendar className="w-[16px] h-[16px] sm:w-[18px] sm:h-[18px] text-gray-500" strokeWidth={2} />
          <span className="text-[12px] sm:text-[13px] font-bold tracking-wide">{todayLabel}</span>
        </div>
      </div>

      {/* Stats Cards - Takes Full Width */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6 mb-8">
        {statsQuery.isLoading ? (
          <>
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </>
        ) : (
          <>
            <div className="bg-white rounded-3xl p-4 sm:p-6 shadow-[0px_4px_16px_rgba(17,17,26,0.05)] border border-gray-100 flex flex-col justify-between h-auto sm:h-[135px]">
              <div className="flex justify-between items-start">
                <span className="text-[10px] sm:text-[11px] font-bold text-[#64748B] uppercase tracking-[0.1em]">PATIENT(S) HOSPITALISE(S)</span>
                <div className="w-[32px] h-[32px] bg-[#F1F5F9] rounded-xl flex items-center justify-center">
                  <Stethoscope className="w-4 h-4 text-[#006A8C]" strokeWidth={2.5} />
                </div>
              </div>
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-[32px] sm:text-[44px] font-black text-gray-900 leading-none tracking-tight">
                  {stats ? stats.hospitalizedTotal : "--"}
                </span>
                <span className="text-[10px] sm:text-[11px] font-bold text-[#94A3B8]">
                  {stats
                    ? `${stats.hospitalizedNewToday} nouveaux arrive(s)`
                    : "Chargement"}
                </span>
              </div>
            </div>

            <div className="bg-white rounded-3xl p-4 sm:p-6 shadow-[0px_4px_16px_rgba(17,17,26,0.05)] border border-gray-100 flex flex-col justify-between h-auto sm:h-[135px]">
              <div className="flex justify-between items-start">
                <span className="text-[10px] sm:text-[11px] font-bold text-[#64748B] uppercase tracking-[0.1em]">CONSULTATION EXTERNE</span>
                <div className="w-[32px] h-[32px] bg-[#FFF8F1] rounded-xl flex items-center justify-center">
                  <FileText className="w-4 h-4 text-[#926020]" strokeWidth={2.5} />
                </div>
              </div>
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-[32px] sm:text-[44px] font-black text-gray-900 leading-none tracking-tight">
                  {stats ? stats.externalConsultationsTotal : "--"}
                </span>
                <span className="text-[10px] sm:text-[11px] font-bold text-[#94A3B8]">
                  {stats ? `${stats.externalConsultationsUrgent} urgences` : "Chargement"}
                </span>
              </div>
            </div>

            <div className="bg-white rounded-3xl p-4 sm:p-5 shadow-[0px_4px_16px_rgba(17,17,26,0.05)] border border-gray-100 flex flex-col justify-between h-auto sm:h-[135px]">
              <div className="flex justify-between items-start mb-2 sm:mb-3 px-1">
                <span className="text-[10px] sm:text-[11px] font-bold text-[#64748B] uppercase tracking-[0.1em]">CONTROLE</span>
                <div className="w-[32px] h-[32px] bg-[#FFF8F1] rounded-xl flex items-center justify-center">
                  <ClipboardSignature className="w-4 h-4 text-[#D97706]" strokeWidth={2.5} />
                </div>
              </div>
              <div className="flex items-center gap-3 h-full">
                <div className="flex-1 bg-[#F4F4F5] rounded-[10px] py-2 px-3 flex items-center gap-2.5">
                  <div className="w-[3px] h-[28px] bg-[#006A8C] rounded-full"></div>
                  <div>
                    <p className="text-[9px] sm:text-[10px] text-[#64748B] font-bold mb-0.5">Service</p>
                    <p className="text-[16px] sm:text-[18px] font-black text-gray-900 leading-none">
                      {stats ? stats.controlServiceTotal : "--"}
                    </p>
                  </div>
                </div>
                <div className="flex-1 bg-[#F4F4F5] rounded-[10px] py-2 px-3 flex items-center gap-2.5">
                  <div className="w-[3px] h-[28px] bg-[#059669] rounded-full"></div>
                  <div>
                    <p className="text-[9px] sm:text-[10px] text-[#64748B] font-bold mb-0.5 line-clamp-1 text-ellipsis">Consultation externe</p>
                    <p className="text-[16px] sm:text-[18px] font-black text-gray-900 leading-none">
                      {stats ? stats.controlExternalTotal : "--"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Left/Main Column */}
        <div className="xl:col-span-2 space-y-8">
          {/* Planning du Bloc Operatoire */}
          <div className="bg-white rounded-3xl p-5 sm:p-7 shadow-[0px_4px_16px_rgba(17,17,26,0.05)] border border-gray-100">
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center mb-6 sm:mb-7">
              <div className="flex items-center gap-3 text-[#006A8C]">
                <TableProperties className="w-[20px] h-[20px]" strokeWidth={2.5} />
                <h2 className="text-[15px] sm:text-[16px] font-extrabold tracking-tight">Liste patient(s) hospitalise(s)</h2>
              </div>
              <button className="text-[11px] sm:text-[12px] font-bold text-[#006A8C] hover:underline self-start sm:self-auto">
                Voir tous les patients
              </button>
            </div>

            <div className="w-full">
              {/* Header */}
              <div className="hidden lg:grid lg:grid-cols-12 text-[10px] font-bold text-gray-400 uppercase tracking-[0.1em] pb-4 border-b border-gray-100/60 mb-5">
                <div className="col-span-2 text-center">HORAIRE</div>
                <div className="col-span-4 pl-4">PATIENT & MOTIF</div>
                <div className="col-span-3 text-center">SALLE</div>
                <div className="col-span-3 text-center">STATUT</div>
              </div>

              {/* Rows */}
              <div className="space-y-6">
                {hospitalizedQuery.isLoading ? (
                  <>
                    <ListRowSkeleton />
                    <ListRowSkeleton />
                    <ListRowSkeleton />
                  </>
                ) : hospitalisedPatients.length > 0 ? (
                  hospitalisedPatients.map((item) => {
                    const status = getHospitalisationStatus(item.statutHospitalisation);
                    return (
                      <div className="flex flex-col gap-3 lg:grid lg:grid-cols-12 lg:items-center" key={item.id}>
                        <div className="lg:col-span-2 font-black text-[#006A8C] text-[14px] sm:text-[15px] text-left lg:text-center">
                          {formatTime(item.dateEntrer)}
                        </div>
                        <div className="lg:col-span-4 lg:pl-4 min-w-0">
                          <p className="font-extrabold text-[12px] sm:text-[13px] text-gray-900 uppercase tracking-tight break-words">
                            {item.patient?.prenom || "PATIENT"}
                          </p>
                          <p className="text-gray-400 text-[11px] font-medium mt-0.5 break-words">
                            {item.motifHospitalisation}
                          </p>
                        </div>
                        <div className="lg:col-span-3 flex justify-start lg:justify-center">
                          <span className="bg-[#F8F9FA] text-gray-600 font-bold text-[9px] sm:text-[10px] px-3 sm:px-4 py-1 sm:py-1.5 rounded-full uppercase tracking-widest border border-gray-100">
                            {getLocationLabel(item)}
                          </span>
                        </div>
                        <div className="lg:col-span-3 flex justify-start lg:justify-center">
                          <span className={status.badgeClass}>
                            <div className="w-1.5 h-1.5 rounded-full bg-[#006A8C]"></div> {status.label}
                          </span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center text-sm text-gray-400">
                    Aucune hospitalisation active.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Patients post-op prioritaires */}
          <div>
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-between sm:items-center mb-5 px-1">
              <h2 className="text-[15px] sm:text-[17px] font-extrabold text-gray-900 tracking-tight">Liste Consultation externe</h2>
              <span className="bg-[#E6F4EA] text-[#059669] text-[8px] sm:text-[9px] font-bold px-3 py-1.5 rounded-md uppercase tracking-[0.1em] w-fit">
                CONSULTATIONS
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {consultationQuery.isLoading ? (
                <>
                  <ConsultationCardSkeleton />
                  <ConsultationCardSkeleton />
                </>
              ) : consultations.length > 0 ? (
                consultations.map((consultation) => (
                  <div
                    className="bg-white rounded-3xl p-4 sm:p-6 shadow-[0px_4px_16px_rgba(17,17,26,0.05)] border border-gray-100 relative"
                    key={consultation.id}
                  >
                    <div className="absolute top-4 right-4 sm:top-6 sm:right-6 text-[10px] sm:text-[11px] font-bold text-gray-400">
                      {formatTime(consultation.createdAt)}
                    </div>
                    <div className="flex items-start gap-3 sm:gap-4">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 bg-[#F5F8FA] rounded-full flex items-center justify-center text-[#006A8C] shrink-0 border border-blue-50/50">
                        <User className="w-[18px] h-[18px] sm:w-[20px] sm:h-[20px]" strokeWidth={2.5} />
                      </div>
                      <div className="space-y-4 w-full">
                        <div>
                          <h3 className="text-[12px] sm:text-[14px] font-extrabold text-gray-900 uppercase">
                            PATIENT <span className="font-semibold text-gray-600">{formatShortId(consultation.patientId)}</span>
                          </h3>
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-[10px] sm:text-[11px] font-bold text-gray-500">Chirurgie :</span>
                            <span className="text-[10px] sm:text-[11px] font-bold text-gray-700">
                              {consultation.typeChirurgie}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-[9px] sm:text-[10px] font-black text-[#006A8C] uppercase tracking-[0.05em]">
                          <Clock className="w-3.5 h-3.5" strokeWidth={2.5} />
                          <span>
                            {consultation.urgence ? "URGENCE" : "STANDARD"} · ASA {consultation.asaScore}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center text-sm text-gray-400 col-span-full">
                  Aucune consultation externe recente.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-8">
          {/* ACCES RAPIDES */}
          <div className="bg-[#F5F8FA] rounded-[28px] sm:rounded-[32px] p-5 sm:p-7 border border-[#EAF3FA]">
            <h3 className="text-[10px] sm:text-[11px] font-extrabold text-[#006A8C] uppercase tracking-[0.1em] mb-5 sm:mb-6">ACCES RAPIDES</h3>
            <div className="space-y-4">
              <button className="w-full cursor-pointer bg-white hover:bg-gray-50 transition-colors text-left px-4 sm:px-5 py-3.5 sm:py-4.5 rounded-2xl flex items-center gap-3 sm:gap-4 shadow-sm border border-transparent">
                <Calendar className="w-5 h-5 text-[#006A8C]" strokeWidth={2.5} />
                <span className="text-[12px] sm:text-[13px] font-bold text-gray-900 leading-snug">Mon planning consultation externe complet</span>
              </button>
            </div>
          </div>

          {/* EQUIPE DE GARDE */}
          <div className="bg-white rounded-[28px] sm:rounded-[32px] p-5 sm:p-7 shadow-[0px_4px_16px_rgba(17,17,26,0.05)] border border-gray-100">
            <h3 className="text-[10px] sm:text-[11px] font-extrabold text-gray-400 uppercase tracking-[0.1em] mb-5 sm:mb-6">EQUIPE DE GARDE</h3>
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-900 rounded-full overflow-hidden">
                    <img src="https://i.pravatar.cc/150?u=a04258" alt="Dr Tahina" className="w-full h-full object-cover opacity-80 mix-blend-luminosity" />
                  </div>
                  <div>
                    <h4 className="text-[12px] sm:text-[13px] font-extrabold text-gray-900 mb-0.5">Dr. Tahina</h4>
                    <p className="text-[10px] sm:text-[11px] font-medium text-gray-400">Anesthesiste - Reanimateur</p>
                  </div>
                </div>
                <div className="w-2 h-2 rounded-full bg-[#059669]"></div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-[#F5F8FA] rounded-full overflow-hidden flex items-center justify-center text-[#006A8C] border border-blue-50/50">
                    <User className="w-[18px] h-[18px] sm:w-[20px] sm:h-[20px]" strokeWidth={2.5} />
                  </div>
                  <div>
                    <h4 className="text-[12px] sm:text-[13px] font-extrabold text-gray-900 mb-0.5">Inf. Principal Faly</h4>
                    <p className="text-[10px] sm:text-[11px] font-medium text-gray-400">Chef de Bloc</p>
                  </div>
                </div>
                <div className="w-2 h-2 rounded-full bg-[#059669]"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
