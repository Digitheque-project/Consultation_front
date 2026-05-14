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
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      {/* Conteneur principal centré pour éviter le vide à droite sur écran large */}
      <div className="max-w-[1440px] mx-auto flex flex-col lg:flex-row gap-8">

        {/* Left Column: Consultation List */}
        <div className="flex-1">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Mes consultations du jour</h1>
            <p className="text-slate-500 font-medium">Dr. Jean Pierre (Chirurgie Viscérale)</p>
          </div>

          <div className="space-y-4">
            {loading ? (
              <div className='p-6 text-slate-600'>Chargement des consultations...</div>
            ) : error ? (
              <div className='p-6 bg-red-50 text-red-700 rounded-lg'>Erreur de chargement des données.</div>
            ) : patients.length === 0 ? (
              <div className='p-6 bg-slate-100 text-slate-500 rounded-lg'>Aucune consultation en attente pour le moment.</div>
            ) : (
              patients.map((patient) => (
                <Card key={patient.id} className="relative overflow-hidden border-none shadow-sm rounded-2xl">
                  {/* Left Color Strip for Urgency */}
                  {patient.isUrgent && (
                    <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-red-600"></div>
                  )}

                  {/* CardContent affiné (py-3 au lieu de p-6) */}
                  <CardContent className="py-3 px-6">
                    <div className="flex flex-col md:flex-row items-center gap-6 justify-between">
                      {/* Time & Status */}
                      <div className="flex flex-col items-center justify-center min-w-[80px]">
                        <span className={cn(
                          "text-2xl font-bold",
                          patient.status === "EFFECTUÉ" ? "text-slate-300" : "text-slate-900"
                        )}>
                          {patient.time}
                        </span>
                        <span className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-wider text-center leading-tight whitespace-pre-line">
                          {patient.status === "EN ATTENTE" ? "EN\nATTENTE" : patient.status}
                        </span>
                      </div>

                      {/* Vertical Divider */}
                      <div className="hidden md:block w-px h-10 bg-slate-100"></div>

                      {/* Patient Info */}
                      <div className="flex-1 flex flex-col items-center md:items-start w-full text-center md:text-left">
                        <div className="flex items-center gap-3 mb-0.5">
                          <span className={cn(
                            "text-lg font-bold",
                            patient.status === "EFFECTUÉ" ? "text-slate-500" : "text-slate-900"
                          )}>
                            {patient.name}
                          </span>
                          <Badge className={cn(
                            "border-none px-2 rounded-md font-bold text-[10px] uppercase tracking-wider",
                            patient.isUrgent ? "bg-red-100 text-red-700" :
                              patient.status === "EFFECTUÉ" ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-600"
                          )}>
                            {patient.isUrgent ? "URGENCE" : patient.status === "EFFECTUÉ" ? "TERMINÉ" : "EN ATTENTE"}
                          </Badge>
                        </div>
                        <span className="text-sm font-medium text-slate-400">
                          {patient.date} • {patient.type}
                        </span>
                        {patient.motif ? <p className='text-slate-500 text-sm mt-1'>{patient.motif}</p> : null}
                      </div>

                      {/* Actions */}
                      <div className="flex flex-col items-center gap-1 w-full md:w-auto">
                        {patient.action === "start" ? (
                          <>
                            <Button onClick={() => handleStart(patient)} className="w-full md:w-auto bg-[#005b82] hover:bg-[#004a6b] text-white rounded-lg px-4 py-2 h-9 text-sm font-semibold cursor-pointer">
                              Commencer la consultation
                            </Button>
                            <Button variant="ghost" onClick={() => handleOpenPatientInfo(patient)} className="text-[#005b82] hover:text-[#004a6b] hover:bg-transparent h-8 text-xs font-bold cursor-pointer">
                              Infos patient
                            </Button>
                          </>
                        ) : (
                          <Button disabled className="w-full md:w-auto bg-slate-100 text-slate-400 rounded-lg px-6 py-2 h-10 text-sm font-semibold">
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
        <div className="w-full lg:w-80 flex-shrink-0">
          <div className="sticky top-8 space-y-8">
            {/* Stats Widget */}
            <div className="space-y-6">
              <div className="flex items-center gap-2 text-[#005b82] font-semibold">
                <Calendar className="w-5 h-5" />
                <span>Vue d'ensemble</span>
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                <div className="flex justify-between items-end mb-3">
                  <span className="text-[11px] font-bold text-slate-500 tracking-wider">MON QUOTA AUJOURD'HUI</span>
                  <span className="text-sm font-bold text-[#005b82]">{totalConsultations}/{quota}</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div className="bg-[#005b82] h-full rounded-full" style={{ width: `${progressPercent}%` }}></div>
                </div>

                <div className="flex justify-between mt-8">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-slate-400 tracking-wider mb-1 uppercase">Consultation</span>
                    <span className="text-3xl font-bold text-[#005b82]">{totalConsultations < 10 ? `0${totalConsultations}` : totalConsultations}</span>
                  </div>
                  <div className="w-px bg-slate-100 mx-4"></div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-slate-400 tracking-wider mb-1 uppercase">Effectuées</span>
                    <span className="text-3xl font-bold text-emerald-600">{completedConsultations < 10 ? `0${completedConsultations}` : completedConsultations}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Access */}
            <div className="space-y-4">
              <span className="text-[11px] font-bold text-slate-400 tracking-wider uppercase px-1">Accès rapide</span>
              <div className="space-y-1">
                <Button variant="ghost" onClick={() => router.push('/modules/consultation-externe/planning-complet')} className="w-full justify-start text-slate-700 font-semibold hover:bg-white hover:shadow-sm">
                  <Calendar className="w-4 h-4 mr-3 text-[#005b82]" />
                  Planning complet
                </Button>
                <Button variant="ghost" className="w-full justify-start text-slate-700 font-semibold hover:bg-white hover:shadow-sm">
                  <CalendarX className="w-4 h-4 mr-3 text-red-500" />
                  Indisponibilité
                </Button>
                <Button variant="ghost" className="w-full justify-start text-slate-700 font-semibold hover:bg-white hover:shadow-sm">
                  <ArrowLeftRight className="w-4 h-4 mr-3 text-[#005b82]" />
                  Créneau alternatif
                </Button>
              </div>
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
  );
}
