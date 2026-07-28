'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, Clock, User, ArrowRight, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useControlConsultations } from '@/hooks/use-consultations';
import { useAuth } from '@/context/AuthContext';
import { getVisiteLabel } from '@/lib/api/consultation';
import { PriseEnChargeBadge } from '@/components/patient-prise-en-charge-badge';

export default function ControlePage() {
  const router = useRouter();
  const { medecin } = useAuth();
  const { data: consultations = [], isLoading, error } = useControlConsultations();

  const doctorName = medecin ? `Dr. ${medecin.prenom} ${medecin.nom}` : 'Dr. connecté';

  const patients = useMemo(() => {
    return consultations
      .filter((consultation) => consultation.termine)
      .map((consultation) => ({
        id: consultation.id,
        time: consultation.heure,
        date: new Date(consultation.date).toLocaleDateString('fr-FR'),
        name: consultation.patient?.displayName ?? ([consultation.patient?.prenom, consultation.patient?.nom].filter(Boolean).join(' ') || 'Patient inconnu'),
        priseEnCharge: consultation.patient?.priseEnCharge ?? null,
        motif: consultation.motif ?? consultation.observation?.diagnostic ?? '',
        diagnostic: consultation.observation?.diagnostic ?? '',
        noteControle: consultation.observation?.noteControle ?? '',
        isUrgent: consultation.urgence,
        visiteLabel: getVisiteLabel(consultation),
      }))
      .sort((a, b) => (a.isUrgent === b.isUrgent ? a.time.localeCompare(b.time) : a.isUrgent ? -1 : 1));
  }, [consultations]);

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-extrabold text-slate-900">Liste des contrôles</h1>
              <p className="text-sm text-slate-500">{doctorName}</p>
            </div>
            <Link href="/modules/consultation-externe">
              <Button variant="outline" className="rounded-full">Retour consultations</Button>
            </Link>
          </div>
        </div>

        {isLoading ? (
          <div className="rounded-2xl bg-white p-8 text-slate-500">Chargement des contrôles...</div>
        ) : error ? (
          <div className="rounded-2xl bg-red-50 p-8 text-red-700">Impossible de charger les contrôles.</div>
        ) : patients.length === 0 ? (
          <div className="rounded-2xl bg-white p-8 text-slate-500">Aucune consultation disponible pour contrôle aujourd’hui.</div>
        ) : (
          <div className="grid gap-4">
            {patients.map((patient) => (
              <Card key={patient.id} className="rounded-3xl border border-slate-100 shadow-sm">
                <CardContent className="p-5">
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="flex flex-1 gap-4">
                      <div className="flex min-w-[76px] flex-col items-center justify-center rounded-2xl bg-slate-50 p-3">
                        <span className="text-sm font-black text-[#006A8C]">{patient.time}</span>
                        <span className="text-[10px] uppercase text-slate-400">{patient.date}</span>
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <h2 className="text-base font-bold text-slate-900">{patient.name}</h2>
                          <Badge className="bg-[#EAF3FA] text-[#006A8C]">{patient.visiteLabel}</Badge>
                          {patient.isUrgent && <Badge className="bg-red-50 text-red-700">Urgence</Badge>}
                          <PriseEnChargeBadge priseEnCharge={patient.priseEnCharge} />
                        </div>
                        <p className="text-sm text-slate-500">{patient.motif || 'Aucun motif renseigné'}</p>
                        {patient.diagnostic && <p className="text-xs text-slate-400">Diagnostic : {patient.diagnostic}</p>}
                        {patient.noteControle && <p className="text-xs text-slate-500">Note de contrôle : {patient.noteControle}</p>}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() => router.push(`/modules/consultation-externe/traitement?id=${patient.id}&mode=controle`)}
                        className="rounded-full"
                      >
                        <ArrowRight className="mr-2 h-4 w-4" />
                        Ouvrir dans l’interface de consultation
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}