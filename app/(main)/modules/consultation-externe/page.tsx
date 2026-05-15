"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, CalendarX, ArrowLeftRight } from "lucide-react";
import { cn } from "@/lib/utils";

import { useWaitingConsultations } from '@/hooks/use-consultations';
import { consultationApi } from '@/lib/api/consultation';

type Appointment = {
  id: number;
  time: string;
  name: string;
  date: string;
  type: string;
  status: string;
  isUrgent: boolean;
  action: string;
  motif?: string;
  coverage?: string;
  idNumber?: string;
  profession?: string;
  phone?: string;
  address?: string;
  emergencyContact?: string;
  patientId: number;
};

export default function ConsultationExternePage() {
  const router = useRouter();
  const [patientInfo, setPatientInfo] = useState<Appointment | null>(null);


  const { data: consultations = [], isLoading: loading, error } = useWaitingConsultations();

  const patients: Appointment[] = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const filteredConsultations = consultations.filter((consultation) => {
      if (consultation.termine) {
        const consultationDate = new Date(consultation.date);
        consultationDate.setHours(0, 0, 0, 0);
        return consultationDate.getTime() === today.getTime();
      }
      return true;
    });

    const mapped = filteredConsultations.map((consultation) => ({
      id: consultation.id,
      time: consultation.heure,
      name: `Patient #${consultation.patientId}`,
      date: new Date(consultation.date).toLocaleDateString('fr-FR'),
      type: consultation.urgence ? 'Urgence' : 'Normal',
      status: consultation.termine ? "EFFECTUÉ" : (consultation.statut?.toUpperCase().replace(/_/g, ' ') || "EN ATTENTE"),
      isUrgent: consultation.urgence,
      action: consultation.termine ? "done" : "start",
      motif: consultation.observation?.diagnostic ?? '',
      patientId: consultation.patientId,
    }));

    return mapped.sort((a, b) => {
      const aUrgent = a.isUrgent && a.status !== "EFFECTUÉ";
      const bUrgent = b.isUrgent && b.status !== "EFFECTUÉ";
      if (aUrgent && !bUrgent) return -1;
      if (!aUrgent && bUrgent) return 1;

      const aCompleted = a.status === "EFFECTUÉ";
      const bCompleted = b.status === "EFFECTUÉ";
      if (aCompleted && !bCompleted) return 1;
      if (!aCompleted && bCompleted) return -1;

      return a.time.localeCompare(b.time);
    });
  }, [consultations]);

  const handleStart = async (appt: Appointment) => {
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
          from: 'prescription'
        }),
      });

      if (redirectResponse.ok) {
        const data = await redirectResponse.json();
        router.push(data.redirectUrl);
      } else {
        console.error('Erreur lors de la redirection');
        router.push(`/modules/consultation-externe/traitement?id=${appt.id}`);
      }
    } catch (error) {
      console.error('Erreur réseau:', error);
      router.push(`/modules/consultation-externe/traitement?id=${appt.id}`);
    }
  };

  const handleOpenPatientInfo = (appt: Appointment) => {
    setPatientInfo(appt);
  };

  const handleClosePatientInfo = () => {
    setPatientInfo(null);
  };

  // calculate stats
  const totalConsultations = patients.length;
  const completedConsultations = patients.filter(p => p.status === "EFFECTUÉ").length;
  const quota = 10;
  const progressPercent = Math.min((totalConsultations / quota) * 100, 100);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">

      <div className="p-4 sm:p-6 lg:p-8 flex-1">
        <div className="max-w-[1400px] mx-auto grid grid-cols-1 xl:grid-cols-3 gap-8">

          {/* Left Column: Consultation List */}
          <div className="xl:col-span-2">
            <div className="mb-6 sm:mb-8">
              <h1 className="text-[20px] sm:text-[26px] font-extrabold text-gray-900 leading-tight tracking-tight">Mes consultations du jour</h1>
              <p className="text-[12px] sm:text-[14px] text-gray-500 mt-1.5 font-medium">Dr. Jean Pierre (Chirurgie Viscérale)</p>
            </div>

            <div className="space-y-6">
              {loading ? (
                <div className='p-6 text-slate-600'>Chargement des consultations...</div>
              ) : error ? (
                <div className='p-6 bg-red-50 text-red-700 rounded-lg'>Erreur de chargement des données.</div>
              ) : patients.length === 0 ? (
                <div className='p-6 bg-slate-100 text-slate-500 rounded-lg'>Aucune consultation en attente pour le moment.</div>
              ) : (
                patients.map((patient) => (
                  <Card key={patient.id} className="relative overflow-hidden border border-gray-100 shadow-[0px_4px_16px_rgba(17,17,26,0.05)] rounded-3xl bg-white">
                    {/* Left Color Strip for Urgency */}
                    {patient.isUrgent && (
                      <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-red-600"></div>
                    )}

                    <CardContent className="p-4 sm:p-6">
                      <div className="flex flex-col md:flex-row items-center gap-6 justify-between">
                        {/* Time & Status */}
                        <div className="flex flex-col items-center justify-center min-w-[70px]">
                          <span className={cn(
                            "text-[14px] sm:text-[15px] font-black",
                            patient.status === "EFFECTUÉ" ? "text-slate-300" : "text-[#005b82]"
                          )}>
                            {patient.time}
                          </span>
                          <span className="text-[9px] sm:text-[10px] font-bold text-gray-400 mt-1 uppercase tracking-widest text-center leading-tight whitespace-pre-line">
                            {patient.status === "EN ATTENTE" ? "EN\nATTENTE" : patient.status}
                          </span>
                        </div>

                        {/* Vertical Divider */}
                        <div className="hidden md:block w-px h-10 bg-slate-100"></div>

                        {/* Patient Info */}
                        <div className="flex-1 flex flex-col items-center md:items-start w-full text-center md:text-left">
                          <div className="flex items-center gap-3 mb-1">
                            <span className={cn(
                              "text-[12px] sm:text-[13px] font-extrabold uppercase tracking-tight",
                              patient.status === "EFFECTUÉ" ? "text-gray-400" : "text-gray-900"
                            )}>
                              {patient.name}
                            </span>
                            <Badge className={cn(
                              "border-none px-3 sm:px-4 py-1 sm:py-1.5 rounded-full font-bold text-[9px] sm:text-[10px] uppercase tracking-widest",
                              patient.isUrgent ? "bg-red-50 text-red-700" :
                                patient.status === "EFFECTUÉ" ? "bg-[#E6F4EA] text-[#059669]" : "bg-[#EAF3FA] text-[#006A8C]"
                            )}>
                              {patient.isUrgent ? "URGENCE" : patient.status === "EFFECTUÉ" ? "TERMINÉ" : "EN ATTENTE"}
                            </Badge>
                          </div>
                          <span className="text-[11px] font-medium text-gray-400">
                            {patient.date} • {patient.type}
                          </span>
                          {patient.motif ? <p className='text-gray-400 text-[11px] font-medium mt-1'>{patient.motif}</p> : null}
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col items-center gap-2 w-full md:w-auto">
                          {patient.action === "start" ? (
                            <>
                              <Button onClick={() => handleStart(patient)} className="w-full md:w-auto bg-[#005b82] hover:bg-[#004a6b] text-white rounded-xl px-5 py-2.5 h-auto text-[12px] sm:text-[13px] font-bold cursor-pointer transition-all shadow-sm">
                                Commencer la consultation
                              </Button>
                              <Button variant="ghost" onClick={() => handleOpenPatientInfo(patient)} className="text-[#005b82] hover:text-[#004a6b] hover:bg-transparent h-8 text-[11px] font-bold cursor-pointer uppercase tracking-wider">
                                Infos patient
                              </Button>
                            </>
                          ) : (
                            <Button disabled className="w-full md:w-auto bg-gray-50 text-gray-400 rounded-xl px-6 py-2.5 h-auto text-[12px] sm:text-[13px] font-bold border border-gray-100">
                              Consultation terminée
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
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

        {patientInfo ? (
          <div className='fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4'>
            <div className='relative w-full max-w-3xl rounded-[32px] bg-white shadow-[0_32px_120px_rgba(15,23,42,0.18)] ring-1 ring-slate-200 border border-slate-100 max-h-[calc(100vh-4rem)] overflow-hidden'>
              <div className='flex h-full flex-col'>
                <div className='flex flex-col gap-6 border-b border-slate-200 bg-white px-8 py-8 sm:flex-row sm:items-center sm:justify-between'>
                  <div>
                    <p className='text-[11px] uppercase tracking-[0.35em] text-slate-400 font-semibold mb-2'>Informations du patient</p>
                    <div className='flex flex-wrap items-center gap-3'>
                      <h2 className='text-3xl font-extrabold text-slate-900'>{patientInfo.name}</h2>
                      {patientInfo.coverage ? (
                        <span className='rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-semibold uppercase text-emerald-700'>{patientInfo.coverage}</span>
                      ) : null}
                    </div>
                    <div className='mt-3 flex flex-wrap items-center gap-3 text-sm text-slate-500'>
                      <span>{patientInfo.date}</span>
                      <span className='inline-flex h-1 w-1 rounded-full bg-slate-300' />
                      <span>{patientInfo.type}</span>
                    </div>
                  </div>
                  <button onClick={handleClosePatientInfo} className='rounded-full border border-slate-200 bg-slate-50 p-3 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900'>
                    <span className='text-xl leading-none'>×</span>
                  </button>
                </div>

                <div className='min-h-0 overflow-y-auto bg-slate-50 px-8 py-6'>
                  <div className='grid gap-6 lg:grid-cols-2'>
                    <div className='rounded-[28px] bg-white p-6 shadow-sm border border-slate-200'>
                      <div className='grid gap-4 sm:grid-cols-2'>
                        <div>
                          <p className='text-[10px] uppercase tracking-[0.35em] text-slate-400 font-bold mb-2'>Nom complet</p>
                          <p className='text-sm font-semibold text-slate-900'>{patientInfo.name}</p>
                        </div>
                        <div>
                          <p className='text-[10px] uppercase tracking-[0.35em] text-slate-400 font-bold mb-2'>Type</p>
                          <p className='text-sm font-semibold text-slate-900'>{patientInfo.type}</p>
                        </div>
                        <div>
                          <p className='text-[10px] uppercase tracking-[0.35em] text-slate-400 font-bold mb-2'>Date</p>
                          <p className='text-sm font-semibold text-slate-900'>{patientInfo.date}</p>
                        </div>
                        <div>
                          <p className='text-[10px] uppercase tracking-[0.35em] text-slate-400 font-bold mb-2'>CIN / ID</p>
                          <p className='text-sm font-semibold text-slate-900'>{patientInfo.idNumber ?? '-'}</p>
                        </div>
                        <div>
                          <p className='text-[10px] uppercase tracking-[0.35em] text-slate-400 font-bold mb-2'>Profession</p>
                          <p className='text-sm font-semibold text-slate-900'>{patientInfo.profession ?? '-'}</p>
                        </div>
                        <div>
                          <p className='text-[10px] uppercase tracking-[0.35em] text-slate-400 font-bold mb-2'>Téléphone</p>
                          <p className='text-sm font-semibold text-slate-900'>{patientInfo.phone ?? '-'}</p>
                        </div>
                      </div>
                    </div>
                    <div className='rounded-[28px] bg-white p-6 shadow-sm border border-slate-200'>
                      <div className='grid gap-4 sm:grid-cols-2'>
                        <div>
                          <p className='text-[10px] uppercase tracking-[0.35em] text-slate-400 font-bold mb-2'>Adresse</p>
                          <p className='text-sm font-semibold text-slate-900'>{patientInfo.address ?? '-'}</p>
                        </div>
                        <div>
                          <p className='text-[10px] uppercase tracking-[0.35em] text-slate-400 font-bold mb-2'>Contact d'urgence</p>
                          <p className='text-sm font-semibold text-[#005b82]'>{patientInfo.emergencyContact ?? '-'}</p>
                        </div>
                        <div className='sm:col-span-2'>
                          <p className='text-[10px] uppercase tracking-[0.35em] text-slate-400 font-bold mb-2'>Motif de consultation</p>
                          <div className='rounded-3xl bg-slate-100 p-4 text-sm text-slate-600'>"{patientInfo.motif ?? 'Aucun motif renseigné.'}"</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className='space-y-4 border-t border-slate-200 bg-white px-8 py-6 sm:flex sm:items-center sm:justify-between sm:space-y-0'>
                  <button onClick={handleClosePatientInfo} className='w-full rounded-full border border-slate-200 bg-slate-50 px-8 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-100 sm:w-auto'>Fermer</button>
                  <button onClick={() => {
                    if (!patientInfo) return;
                    handleStart(patientInfo);
                    handleClosePatientInfo();
                  }} className='w-full rounded-full bg-[#005b82] px-8 py-3 text-sm font-bold text-white transition hover:bg-[#004a6b] sm:w-auto'>Commencer la consultation</button>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
