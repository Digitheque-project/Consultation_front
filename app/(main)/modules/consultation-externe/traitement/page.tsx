'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { useConsultation, useFinalizeConsultation, usePatientConsultationHistory } from '@/hooks/use-consultations';
import { ConsultationApi, consultationApi } from '@/lib/api/consultation';
import {
  ArrowLeft,
  User,
  Stethoscope,
  Clock,
  FileText,
  Plus,
  Trash2,
  CheckCircle2,
  Save,
  ClipboardList,
  Calendar,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type Appointment = {
  id: number;
  patientId: string;
  t: string;
  n: string;
  a: string;
  g: string;
  s: string;
  u?: number;
  d?: number;
  motif?: string;
  diagnostic?: string;
  notes?: string;
};


const examenServices = [
  'Imagerie',
  'Dialyse',
  'Endoscopie',
  'Laboratoire',
  'EEG',
  'Kinésithérapie',
  'Anatomie pathologie',
];

const hospitalisationServices = [
  'GEMI',
  'Chirurgie',
  'Neurologie',
  'Stomatologie',
  'Pédiatrie',
  'Cardiologie',
  'Urgences',
];

const defaultClinicalParameters = [
  { id: 1, nom: 'Tension', valeur: '', unite: 'mmHg' },
  { id: 2, nom: 'Température', valeur: '', unite: '°C' },
  { id: 3, nom: 'Poids', valeur: '', unite: 'kg' },
  { id: 4, nom: 'Taille', valeur: '', unite: 'cm' },
  { id: 5, nom: 'Fréquence cardiaque', valeur: '', unite: 'bpm' },
  { id: 6, nom: 'Saturation O2', valeur: '', unite: '%' },
];

const mapConsultation = (consultation: ConsultationApi): Appointment => ({
  id: consultation.id,
  patientId: consultation.patientId,
  t: consultation.heure,
  n: consultation.patient?.displayName ?? `Patient #${consultation.patientId}`,
  a: new Date(consultation.date).toLocaleDateString('fr-FR'),
  g: consultation.urgence ? 'Urgence' : 'Normal',
  s: consultation.statut?.toUpperCase().replace(/_/g, ' ') || 'EN ATTENTE',
  u: consultation.urgence ? 1 : undefined,
  motif: consultation.motif ?? '',
  diagnostic: consultation.observation?.diagnosticRetenu ?? consultation.observation?.diagnostic ?? '',
  notes: consultation.observation?.notes ?? '',
});

const TreatmentSkeleton = () => (
  <div className="bg-[#F5F8FA] min-h-screen py-8 px-6 animate-pulse">
    <div className="max-w-7xl mx-auto">
      {/* Header Skeleton */}
      <div className="mb-10 flex items-start gap-5">
        <div className="w-12 h-12 bg-slate-200 rounded-2xl" />
        <div className="flex flex-col gap-2">
          <div className="h-8 w-64 bg-slate-200 rounded-lg" />
          <div className="h-4 w-48 bg-slate-100 rounded-md" />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        {/* Main Card Skeleton */}
        <div className="rounded-[32px] bg-white border border-gray-100 p-7 space-y-8 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-slate-100 rounded-2xl" />
              <div className="space-y-2">
                <div className="h-5 w-40 bg-slate-200 rounded" />
                <div className="h-3 w-24 bg-slate-100 rounded" />
              </div>
            </div>
            <div className="h-7 w-24 bg-slate-100 rounded-full" />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="h-20 bg-slate-50 rounded-[20px] border border-gray-100" />
            <div className="h-20 bg-slate-50 rounded-[20px] border border-gray-100" />
          </div>

          <div className="h-24 bg-slate-50 rounded-3xl border border-gray-100" />

          <div className="space-y-6">
            <div className="space-y-3">
              <div className="h-3 w-32 bg-slate-100 rounded" />
              <div className="h-32 bg-white border border-gray-100 rounded-[24px]" />
            </div>
            <div className="space-y-3">
              <div className="h-3 w-32 bg-slate-100 rounded" />
              <div className="h-14 bg-white border border-gray-100 rounded-2xl" />
            </div>
          </div>
        </div>

        {/* Sidebar Skeleton */}
        <div className="space-y-6">
          <div className="rounded-[28px] bg-white border border-gray-100 p-7 space-y-6 shadow-sm">
            <div className="h-3 w-24 bg-slate-200 rounded" />
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="h-3 w-16 bg-slate-100 rounded" />
                <div className="h-4 w-32 bg-slate-200 rounded" />
              </div>
              <div className="h-px bg-slate-50" />
              <div className="h-10 w-full bg-slate-100 rounded-lg" />
            </div>
          </div>
          <div className="h-40 bg-[#EAF3FA] rounded-[28px] border border-[#D1E5F5]" />
        </div>
      </div>

      {/* Tabs Card Skeleton */}
      <div className="mt-10 rounded-[32px] bg-white border border-gray-100 overflow-hidden shadow-sm">
        <div className="flex gap-10 border-b border-gray-100 px-8 py-6">
          <div className="h-4 w-40 bg-slate-200 rounded" />
          <div className="h-4 w-40 bg-slate-100 rounded" />
        </div>
        <div className="p-8 space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <div className="h-6 w-48 bg-slate-200 rounded" />
              <div className="h-3 w-64 bg-slate-100 rounded" />
            </div>
            <div className="h-8 w-32 bg-slate-100 rounded-full" />
          </div>
          <div className="h-64 bg-slate-50 border border-gray-100 rounded-[20px]" />
        </div>
      </div>
    </div>
  </div>
);

export default function TraitementPage() {
  const router = useRouter();
  const [appointmentId, setAppointmentId] = useState<string | null>(null);
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [activeSection, setActiveSection] = useState<'medicament' | 'non-medicamentaux'>('medicament');
  const [isControlMode, setIsControlMode] = useState(false);
  const [followUpSummary, setFollowUpSummary] = useState<{ id: number; date: string; motif: string } | null>(null);

  const { data: consultationData, isLoading: loading, error: queryError } = useConsultation(appointmentId);
  const { mutateAsync: finalizeMutation, isPending: saving } = useFinalizeConsultation();
  const { data: historyData = [] } = usePatientConsultationHistory(appointment?.patientId ?? null);

  const hasExistingClinicalSummary = Boolean(appointment?.diagnostic?.trim() || appointment?.notes?.trim());
  const hasMotif = Boolean(appointment?.motif?.trim());
  const hasHistory = historyData.length > 0;

  // États pour les données dynamiques
  const [observation, setObservation] = useState({ diagnosticSuspicion: '', diagnosticRetenu: '', notes: '' });
  const [parametres, setParametres] = useState<Array<{ id: number; nom: string; valeur: string; unite: string }>>(defaultClinicalParameters);
  const [medicaments, setMedicaments] = useState<Array<{
    id: number;
    medicament: string;
    forme: string;
    dosage: string;
    voie: string;
    posologie: string;
    duree: string;
    instructions: string;
  }>>([]);
  const [nonMedicaments, setNonMedicaments] = useState({
    recommandationsNotes: '',
    rdvMotif: '',
    rdvNiveau: 'NIVEAU_1' as 'NIVEAU_1' | 'NIVEAU_2' | 'NIVEAU_3' | 'NIVEAU_4',
    rdvDate: '',
    examenService: '',
    examenMotif: '',
    examenPriorite: 'NORMALE' as 'STAT' | 'URGENTE' | 'NORMALE',
    hospitalisationMotif: '',
    hospitalisationService: '',
    hospitalisationStatus: 'EN_ATTENTE' as 'EN_ATTENTE' | 'VALIDE' | 'REFUSE',
  });

  // Fonctions pour gérer les médicaments
  const addMedicament = () => {
    setMedicaments([...medicaments, {
      id: Date.now(),
      medicament: '',
      forme: '',
      dosage: '',
      voie: '',
      posologie: '',
      duree: '',
      instructions: '',
    }]);
  };

  const updateMedicament = (id: number, field: string, value: string) => {
    setMedicaments(medicaments.map(med =>
      med.id === id ? { ...med, [field]: value } : med
    ));
  };

  const removeMedicament = (id: number) => {
    setMedicaments(medicaments.filter(med => med.id !== id));
  };

  const addParametre = () => {
    setParametres([...parametres, { id: Date.now(), nom: '', valeur: '', unite: '' }]);
  };

  const updateParametre = (id: number, field: 'nom' | 'valeur' | 'unite', value: string) => {
    setParametres(parametres.map((param) => (param.id === id ? { ...param, [field]: value } : param)));
  };

  const removeParametre = (id: number) => {
    setParametres(parametres.filter((param) => param.id !== id));
  };

  // Fonction pour finaliser la consultation
  const finalizeConsultation = async () => {
    if (!appointmentId) return;

    try {
      const payload = {
        observation: (observation.diagnosticSuspicion.trim() || observation.diagnosticRetenu.trim() || observation.notes.trim()) ? {
          diagnosticSuspicion: observation.diagnosticSuspicion,
          diagnosticRetenu: observation.diagnosticRetenu,
          notes: observation.notes,
        } : null,
        medicaments: medicaments.filter(med => med.medicament.trim() !== ''),
        nonMedicaments: (
          nonMedicaments.recommandationsNotes.trim() ||
          nonMedicaments.rdvMotif.trim() ||
          nonMedicaments.examenService.trim() ||
          nonMedicaments.examenMotif.trim() ||
          nonMedicaments.hospitalisationMotif.trim() ||
          nonMedicaments.hospitalisationService.trim()
        ) ? nonMedicaments : null,
        parametres: parametres
          .filter((param) => param.nom.trim() || param.valeur.trim())
          .map((param) => ({
            nom: param.nom.trim(),
            valeur: param.valeur.trim(),
            unite: param.unite.trim(),
          })),
      };

      const result = await finalizeMutation({ id: appointmentId, payload });
      const followUp = result?.followUp;

      if (followUp?.id) {
        setFollowUpSummary({
          id: followUp.id,
          date: followUp.date ? new Date(followUp.date).toLocaleDateString('fr-FR') : 'à définir',
          motif: followUp.motif || 'Contrôle de suivi',
        });
        router.push(`/modules/consultation-externe/traitement?id=${followUp.id}&mode=controle`);
        return;
      }

      router.push('/modules/consultation-externe');
    } catch (err) {
      alert('Erreur lors de la sauvegarde: ' + (err instanceof Error ? err.message : 'Erreur inconnue'));
    }
  };

  const handleCancelAndGoBack = async (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();

    if (appointmentId) {
      try {
        await consultationApi.traiterConsultation(appointmentId, 'annuler');
      } catch (error) {
        console.error('Impossible de remettre la consultation en attente:', error);
      }
    }

    router.push('/modules/consultation-externe');
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const params = new URLSearchParams(window.location.search);
    const consultationId = params.get('consultationId') ?? params.get('id');
    const patientId = params.get('patientId');
    const mode = params.get('mode');

    console.log('URL params:', window.location.search);
    console.log('consultationId from URL:', consultationId);
    console.log('patientId from URL:', patientId);

    if (consultationId) {
      setAppointmentId(consultationId);
    }

    setIsControlMode(mode === 'controle');
  }, []);

  useEffect(() => {
    if (consultationData) {
      setAppointment(mapConsultation(consultationData));

      if (consultationData.observation) {
        setObservation({
          diagnosticSuspicion: consultationData.observation.diagnosticSuspicion ?? '',
          diagnosticRetenu: consultationData.observation.diagnosticRetenu ?? consultationData.observation.diagnostic ?? '',
          notes: consultationData.observation.notes ?? '',
        });
      }

      if (consultationData.parametresCliniques && consultationData.parametresCliniques.length > 0) {
        setParametres(
          consultationData.parametresCliniques.map((param, index) => ({
            id: param.id ?? index + 1,
            nom: param.nom,
            valeur: param.valeur,
            unite: param.unite ?? '',
          })),
        );
      } else {
        setParametres(defaultClinicalParameters);
      }

      const existingNonMed = consultationData.nonMedicamentPrescriptions?.[0];
      if (existingNonMed) {
        setNonMedicaments({
          recommandationsNotes: existingNonMed.recommandationsNotes ?? '',
          rdvMotif: existingNonMed.rdvMotif ?? '',
          rdvNiveau: (existingNonMed.rdvNiveau as 'NIVEAU_1' | 'NIVEAU_2' | 'NIVEAU_3' | 'NIVEAU_4') ?? 'NIVEAU_1',
          rdvDate: existingNonMed.rdvDate ? new Date(existingNonMed.rdvDate).toISOString().slice(0, 10) : '',
          examenService: existingNonMed.examenService ?? '',
          examenMotif: existingNonMed.examenMotif ?? '',
          examenPriorite: (existingNonMed.examenPriorite as 'STAT' | 'URGENTE' | 'NORMALE') ?? 'NORMALE',
          hospitalisationMotif: existingNonMed.hospitalisationMotif ?? '',
          hospitalisationService: existingNonMed.hospitalisationService ?? '',
          hospitalisationStatus: (existingNonMed.hospitalisationStatus as 'EN_ATTENTE' | 'VALIDE' | 'REFUSE') ?? 'EN_ATTENTE',
        });
      }
    }
  }, [consultationData]);

  if (loading) {
    return <TreatmentSkeleton />;
  }

  if (queryError || (!loading && !appointment && appointmentId)) {
    return (
      <div className="min-h-screen bg-slate-50 px-6 py-10">
        <div className="max-w-5xl mx-auto rounded-3xl bg-white p-10 shadow-sm border border-slate-200 text-slate-700">
          <p className="text-lg font-semibold mb-4">Impossible d'ouvrir la consultation</p>
          <p className="mb-6 text-slate-500">{queryError ? 'Erreur de chargement de la consultation' : 'Aucune consultation trouvée.'}</p>
          <Link href="/modules/consultation-externe/prescription" className="inline-flex rounded-full bg-blue-700 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-800">
            Retour à la prescription
          </Link>
        </div>
      </div>
    );
  }

  if (!appointment) return null;

  const pageTitle = isControlMode ? 'Gestion du contrôle' : 'Traitement de consultation';
  const pageSubtitle = isControlMode
    ? 'Le contrôle est désormais géré dans l’interface de consultation.'
    : 'Interface de prescription et de suivi du patient.';

  return (
    <Suspense fallback={<TreatmentSkeleton />}>
      <div className="bg-[#F5F8FA] min-h-screen py-8 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="fixed bottom-4 right-4 z-40 w-[calc(100vw-2rem)] max-w-md md:w-full pointer-events-none">
            <div className="pointer-events-auto ml-auto">
            </div>
          </div>

          {/* Header Section */}
          <div className="mb-10 flex items-start gap-5">
            <Link
              href="/modules/consultation-externe"
              onClick={handleCancelAndGoBack}
              className="group inline-flex items-center justify-center p-3 rounded-2xl bg-white shadow-sm border border-gray-100 hover:bg-[#EAF3FA] transition-all text-[#006A8C] hover:scale-105 active:scale-95 mt-1"
              title="Retour"
            >
              <ArrowLeft className="h-5 w-5" strokeWidth={2.5} />
            </Link>

            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-3">
                <h1 className="text-[28px] font-extrabold text-gray-900 leading-tight tracking-tight">
                  {pageTitle}
                </h1>
                {isControlMode && (
                  <Badge className="bg-[#EAF3FA] text-[#006A8C]">Contrôle</Badge>
                )}
              </div>
              <p className="text-[14px] text-gray-500 font-medium">
                {pageSubtitle}
              </p>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
            <Card className="rounded-[32px] border-gray-100 shadow-[0px_4px_16px_rgba(17,17,26,0.05)] overflow-hidden">
              <CardHeader className="p-7 pb-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-[#EAF3FA] rounded-2xl flex items-center justify-center text-[#006A8C] border border-blue-50">
                      <User className="w-6 h-6" strokeWidth={2.5} />
                    </div>
                    <div>
                      <CardTitle className="text-[14px] sm:text-[16px] font-extrabold uppercase text-gray-900 tracking-tight">
                        {appointment.n}
                      </CardTitle>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">{appointment.a}</span>
                        <div className="w-1 h-1 rounded-full bg-gray-300"></div>
                        <span className="text-[11px] font-bold text-[#006A8C] uppercase tracking-widest">{appointment.g}</span>
                      </div>
                    </div>
                  </div>
                  <Badge variant={appointment.s.includes('ATTENTE') ? 'warning' : 'success'} className="px-4 py-1.5 text-[10px] uppercase tracking-[0.1em]">
                    {appointment.s}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="p-7 space-y-8">
                {followUpSummary && (
                  <div className="rounded-[20px] border border-emerald-200 bg-emerald-50 p-4">
                    <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-emerald-700">Contrôle de suivi programmé</p>
                    <p className="mt-2 text-[13px] font-semibold text-emerald-800">
                      {followUpSummary.motif} — {followUpSummary.date}
                    </p>
                  </div>
                )}

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-[20px] bg-[#F8FAFC] border border-gray-100 p-4">
                    <p className="text-[10px] font-bold text-[#64748B] uppercase tracking-[0.15em]">Horaire Rendez-vous</p>
                    <div className="mt-2 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-[#006A8C]" strokeWidth={2.5} />
                      <p className="text-[15px] font-black text-gray-900">{appointment.t}</p>
                    </div>
                  </div>
                  <div className="rounded-[20px] bg-[#F8FAFC] border border-gray-100 p-4">
                    <p className="text-[10px] font-bold text-[#64748B] uppercase tracking-[0.15em]">Priorité</p>
                    <div className="mt-2 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-orange-500" strokeWidth={2.5} />
                      <p className="text-[15px] font-black text-gray-900">{appointment.g}</p>
                    </div>
                  </div>
                </div>

                {hasMotif && (
                  <div className="rounded-3xl border border-gray-100 bg-[#F5F8FA]/50 p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <Stethoscope className="h-4 w-4 text-[#006A8C]" strokeWidth={2.5} />
                      <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#64748B]">Motif de consultation</p>
                    </div>
                    <p className="text-[13px] font-medium text-gray-600 leading-relaxed">{appointment.motif}</p>
                  </div>
                )}

                {hasExistingClinicalSummary && (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {appointment.diagnostic?.trim() && (
                      <div className="rounded-[20px] bg-[#F8FAFC] border border-gray-100 p-4">
                        <p className="text-[10px] font-bold text-[#64748B] uppercase tracking-[0.15em]">Diagnostic retenu</p>
                        <p className="mt-2 text-[13px] font-semibold text-gray-900 leading-relaxed">{appointment.diagnostic}</p>
                      </div>
                    )}
                    {appointment.notes?.trim() && (
                      <div className="rounded-[20px] bg-[#F8FAFC] border border-gray-100 p-4">
                        <p className="text-[10px] font-bold text-[#64748B] uppercase tracking-[0.15em]">Notes existantes</p>
                        <p className="mt-2 text-[13px] font-semibold text-gray-900 leading-relaxed">{appointment.notes}</p>
                      </div>
                    )}
                  </div>
                )}

                <div className="space-y-6 pt-2">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="text-[11px] font-bold text-[#64748B] uppercase tracking-[0.15em] mb-3 block">Suspicion diagnostique</label>
                      <textarea
                        value={observation.diagnosticSuspicion}
                        onChange={(e) => setObservation({ ...observation, diagnosticSuspicion: e.target.value })}
                        className="w-full min-h-[112px] rounded-[24px] border border-gray-100 bg-white p-5 text-[14px] text-gray-700 shadow-sm focus:border-[#006A8C] focus:ring-1 focus:ring-[#006A8C] outline-none transition-all placeholder:text-gray-400"
                        placeholder="Écrire la suspicion clinique..."
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-[#64748B] uppercase tracking-[0.15em] mb-3 block">Diagnostic retenu</label>
                      <textarea
                        value={observation.diagnosticRetenu}
                        onChange={(e) => setObservation({ ...observation, diagnosticRetenu: e.target.value })}
                        className="w-full min-h-[112px] rounded-[24px] border border-gray-100 bg-white p-5 text-[14px] text-gray-700 shadow-sm focus:border-[#006A8C] focus:ring-1 focus:ring-[#006A8C] outline-none transition-all placeholder:text-gray-400"
                        placeholder="Écrire le diagnostic retenu..."
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-[#64748B] uppercase tracking-[0.15em] mb-3 block">Observations médicales</label>
                    <textarea
                      value={observation.notes}
                      onChange={(e) => setObservation({ ...observation, notes: e.target.value })}
                      className="w-full min-h-[140px] rounded-[24px] border border-gray-100 bg-white p-5 text-[14px] text-gray-700 shadow-sm focus:border-[#006A8C] focus:ring-1 focus:ring-[#006A8C] outline-none transition-all placeholder:text-gray-400"
                      placeholder="Saisir les notes d'observation clinique..."
                    />
                  </div>
                  <div className="rounded-[24px] border border-gray-100 bg-[#F8FAFC] p-5">
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#64748B]">Paramètres cliniques</p>
                        <p className="text-[12px] text-gray-500">Tension, température, poids, saturation, etc.</p>
                      </div>
                      <Button type="button" variant="outline" className="rounded-full" onClick={addParametre}>
                        <Plus className="mr-2 h-4 w-4" />
                        Ajouter
                      </Button>
                    </div>
                    <div className="space-y-3">
                      {parametres.map((param) => (
                        <div key={param.id} className="grid gap-3 md:grid-cols-[1.2fr_0.9fr_0.7fr_auto]">
                          <input
                            value={param.nom}
                            onChange={(e) => updateParametre(param.id, 'nom', e.target.value)}
                            placeholder="Nom du paramètre"
                            className="rounded-2xl border border-gray-200 bg-white px-3 py-2 text-[13px] text-gray-700 outline-none focus:border-[#006A8C]"
                          />
                          <input
                            value={param.valeur}
                            onChange={(e) => updateParametre(param.id, 'valeur', e.target.value)}
                            placeholder="Valeur"
                            className="rounded-2xl border border-gray-200 bg-white px-3 py-2 text-[13px] text-gray-700 outline-none focus:border-[#006A8C]"
                          />
                          <input
                            value={param.unite}
                            onChange={(e) => updateParametre(param.id, 'unite', e.target.value)}
                            placeholder="Unité"
                            className="rounded-2xl border border-gray-200 bg-white px-3 py-2 text-[13px] text-gray-700 outline-none focus:border-[#006A8C]"
                          />
                          <Button type="button" variant="ghost" className="h-10 w-10 rounded-full p-0" onClick={() => removeParametre(param.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <aside className="space-y-6">
              <Card className="rounded-[28px] border-gray-100 shadow-[0px_4px_16px_rgba(17,17,26,0.05)] p-7">
                <h3 className="text-[11px] font-extrabold text-[#006A8C] uppercase tracking-[0.1em] mb-6 flex items-center gap-2">
                  <User className="h-4 w-4" /> Détails Patient
                </h3>
                <div className="space-y-6">
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Identité</p>
                    <p className="mt-1 text-[13px] font-extrabold text-gray-900">{appointment.n}</p>
                    <p className="text-[12px] font-medium text-gray-500">Dossier : #PAT-{appointment.id}</p>
                  </div>
                  <div className="pt-4 border-t border-gray-50">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Urgence</p>
                    <div className="mt-2 flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${appointment.g === 'Urgence' ? 'bg-red-500' : 'bg-emerald-500'}`}></div>
                      <p className="text-[13px] font-bold text-gray-900">{appointment.g}</p>
                    </div>
                  </div>
                  <div className="pt-4 border-t border-gray-50">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Allergies connues</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Badge variant="destructive" className="bg-red-50 text-red-600 border-red-100 px-3 py-1 text-[10px]">
                        Aucune signalée
                      </Badge>
                    </div>
                  </div>
                </div>
              </Card>

              {hasHistory && (
                <div className="rounded-[28px] border border-slate-200 bg-white p-7 shadow-sm">
                  <h3 className="text-[10px] font-extrabold text-[#006A8C] uppercase tracking-[0.15em] mb-4">Historique clinique</h3>
                  <div className="space-y-3">
                    {historyData.slice().reverse().map((entry) => (
                      <div key={entry.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500">{entry.typeVisite || 'Consultation'}</p>
                          <p className="text-[10px] text-slate-500">{new Date(entry.date).toLocaleDateString('fr-FR')}</p>
                        </div>
                        <p className="mt-2 text-[12px] font-semibold text-slate-700">{entry.diagnostic || 'Aucun diagnostic enregistré'}</p>
                        <p className="mt-1 text-[12px] text-slate-600 line-clamp-3">{entry.observations || 'Aucune observation détaillée'}</p>
                        {entry.medicaments.length > 0 && (
                          <p className="mt-2 text-[11px] text-[#006A8C]">Médicaments : {entry.medicaments.join(', ')}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {hasHistory && (
                <div className="bg-[#EAF3FA] rounded-[28px] p-7 border border-[#D1E5F5]">
                  <h3 className="text-[10px] font-extrabold text-[#006A8C] uppercase tracking-[0.15em] mb-4">Aide au diagnostic</h3>
                  <p className="text-[12px] text-[#006A8C] font-medium leading-relaxed opacity-80">
                    Consultez les antécédents médicaux complets du patient pour affiner votre diagnostic.
                  </p>
                  <Button variant="link" className="text-[#006A8C] p-0 h-auto font-bold text-[12px] mt-4 hover:no-underline">
                    Consulter le dossier historique →
                  </Button>
                </div>
              )}
            </aside>
          </div>

          <Card className="mt-10 rounded-[32px] border-gray-100 shadow-[0px_4px_16px_rgba(17,17,26,0.05)] overflow-hidden">
            <div className="flex items-center gap-10 border-b border-gray-100 px-8">
              <button
                onClick={() => setActiveSection('medicament')}
                className={`flex items-center cursor-pointer gap-2.5 py-6 transition-all relative ${activeSection === 'medicament' ? 'text-[#006A8C] font-bold' : 'text-gray-400 hover:text-gray-600 font-medium'}`}
              >
                <FileText className="h-4.5 w-4.5" />
                <span className="text-[13px] uppercase tracking-wider">Prescriptions médicamenteuses</span>
                {activeSection === 'medicament' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#006A8C] rounded-t-full"></div>}
              </button>
              <button
                onClick={() => setActiveSection('non-medicamentaux')}
                className={`flex items-center cursor-pointer gap-2.5 py-6 transition-all relative ${activeSection === 'non-medicamentaux' ? 'text-[#006A8C] font-bold' : 'text-gray-400 hover:text-gray-600 font-medium'}`}
              >
                <ClipboardList className="h-4.5 w-4.5" />
                <span className="text-[13px] uppercase tracking-wider">Prescriptions non médicamenteuses</span>
                {activeSection === 'non-medicamentaux' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#006A8C] rounded-t-full"></div>}
              </button>
            </div>

            <CardContent className="p-8">
              {activeSection === 'medicament' ? (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h4 className="text-[18px] font-extrabold text-gray-900 tracking-tight">Liste des médicaments</h4>
                      <p className="text-[12px] text-gray-500 font-medium">Ajoutez les produits et posologies nécessaires.</p>
                    </div>
                    <Badge variant="info" className="bg-[#EAF3FA] text-[#006A8C] border-none px-3 py-1 font-bold">
                      {medicaments.length} MÉDICAMENT(S)
                    </Badge>
                  </div>

                  <div className="border border-gray-100 rounded-[20px] overflow-hidden shadow-sm">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-[#F8FAFC] border-b border-gray-100">
                          <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Médicament</th>
                          <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Type / Dosage</th>
                          <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Voie / Qté</th>
                          <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Durée / Instructions</th>
                          <th className="px-6 py-4 w-10"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {medicaments.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="px-6 py-12 text-center">
                              <div className="flex flex-col items-center gap-3">
                                <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center text-gray-300">
                                  <FileText className="w-6 h-6" />
                                </div>
                                <p className="text-[13px] text-gray-400 font-medium">Aucune prescription ajoutée pour le moment.</p>
                              </div>
                            </td>
                          </tr>
                        ) : medicaments.map((med) => (
                          <tr key={med.id} className="hover:bg-[#F8FAFC]/50 transition-colors">
                            <td className="px-4 py-4 align-top">
                              <input
                                type="text"
                                value={med.medicament}
                                onChange={(e) => updateMedicament(med.id, 'medicament', e.target.value)}
                                className="w-full text-[13px] font-bold bg-white border border-gray-100 rounded-xl focus:border-[#006A8C] focus:ring-1 focus:ring-[#006A8C] p-3 transition-all"
                                placeholder="Nom du médicament..."
                              />
                            </td>
                            <td className="px-4 py-4 space-y-2 align-top">
                              <input
                                type="text"
                                value={med.forme}
                                onChange={(e) => updateMedicament(med.id, 'forme', e.target.value)}
                                className="w-full text-[12px] bg-white border border-gray-100 rounded-xl focus:border-[#006A8C] p-2.5 transition-all"
                                placeholder="Forme (ex: Comprimé)..."
                              />
                              <input
                                type="text"
                                value={med.dosage}
                                onChange={(e) => updateMedicament(med.id, 'dosage', e.target.value)}
                                className="w-full text-[12px] bg-white border border-gray-100 rounded-xl focus:border-[#006A8C] p-2.5 transition-all"
                                placeholder="Dosage (ex: 500mg)..."
                              />
                            </td>
                            <td className="px-4 py-4 space-y-2 align-top">
                              <input
                                type="text"
                                value={med.voie}
                                onChange={(e) => updateMedicament(med.id, 'voie', e.target.value)}
                                className="w-full text-[12px] bg-white border border-gray-100 rounded-xl focus:border-[#006A8C] p-2.5 transition-all"
                                placeholder="Voie (ex: Orale)..."
                              />
                              <input
                                type="text"
                                value={med.posologie}
                                onChange={(e) => updateMedicament(med.id, 'posologie', e.target.value)}
                                className="w-full text-[12px] bg-white border border-gray-100 rounded-xl focus:border-[#006A8C] p-2.5 transition-all"
                                placeholder="Posologie/Quantité..."
                              />
                            </td>
                            <td className="px-4 py-4 space-y-2 align-top">
                              <input
                                type="text"
                                value={med.duree}
                                onChange={(e) => updateMedicament(med.id, 'duree', e.target.value)}
                                className="w-full text-[12px] bg-white border border-gray-100 rounded-xl focus:border-[#006A8C] p-2.5 transition-all"
                                placeholder="Durée du traitement..."
                              />
                              <textarea
                                value={med.instructions}
                                onChange={(e) => updateMedicament(med.id, 'instructions', e.target.value)}
                                className="w-full text-[11px] bg-white border border-gray-100 rounded-xl focus:border-[#006A8C] p-2.5 transition-all h-10 min-h-[40px]"
                                placeholder="Instructions complémentaires..."
                              />
                            </td>
                            <td className="px-4 py-4 align-middle">
                              <button
                                type="button"
                                onClick={() => removeMedicament(med.id)}
                                className="p-2.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                              >
                                <Trash2 className="h-5 w-5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="p-6 bg-[#F8FAFC]/30">
                      <button
                        type="button"
                        onClick={addMedicament}
                        className="w-full py-4 cursor-pointer border-2 border-dashed border-gray-200 rounded-[20px] text-[#006A8C] font-extrabold text-[13px] flex items-center justify-center gap-2 hover:bg-white hover:border-[#006A8C] hover:shadow-sm transition-all group"
                      >
                        <Plus className="h-5 w-5 group-hover:scale-110 transition-transform" />
                        AJOUTER UN MÉDICAMENT À LA LISTE
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-10 pt-8 border-t border-gray-50">
                    <Button variant="outline" className="rounded-full px-10 h-12 text-[13px] font-bold text-gray-500 border-gray-200 hover:bg-gray-50 transition-all w-full sm:w-auto">
                      ANNULER LES MODIFICATIONS
                    </Button>
                    <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                      <Button
                        type="button"
                        onClick={finalizeConsultation}
                        disabled={saving}
                        className="rounded-full px-8 h-12 bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-100 font-bold text-[13px] transition-all w-full sm:w-auto disabled:opacity-50 gap-2 shadow-none"
                      >
                        <Save className="w-4 h-4" />
                        {saving ? 'SAUVEGARDE...' : 'VALIDER LA PRESCRIPTION'}
                      </Button>
                      <Button
                        type="button"
                        onClick={finalizeConsultation}
                        disabled={saving}
                        className="rounded-full px-10 h-12 bg-[#006A8C] text-white hover:bg-[#004d66] font-extrabold text-[13px] transition-all w-full sm:w-auto disabled:opacity-50 gap-2 shadow-lg shadow-blue-900/10"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        {saving ? 'TRAITEMENT...' : 'TERMINER LA CONSULTATION'}
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-4">
                    <div className="bg-white rounded-[24px] p-6 shadow-sm border-t-4 border-blue-400 border-x border-b border-gray-100">
                      <div className="flex items-center gap-3 text-[#006A8C] mb-5">
                        <div className="p-2 bg-blue-50 rounded-lg">
                          <FileText className="w-4.5 h-4.5" />
                        </div>
                        <h4 className="font-extrabold text-[13px] uppercase tracking-wider">Recommandations & Notes</h4>
                      </div>
                      <textarea
                        value={nonMedicaments.recommandationsNotes}
                        onChange={(e) => setNonMedicaments({ ...nonMedicaments, recommandationsNotes: e.target.value })}
                        className="w-full h-36 bg-[#F8FAFC] border-none rounded-2xl p-5 text-[14px] text-gray-700 focus:ring-2 focus:ring-[#006A8C]/20 transition-all placeholder:text-gray-400"
                        placeholder="Ex: Régime hyposodé, repos strict, arrêt de travail..."
                      />
                    </div>

                    <div className="bg-white rounded-[24px] p-6 shadow-sm border-t-4 border-blue-400 border-x border-b border-gray-100">
                      <div className="flex items-center gap-3 text-[#006A8C] mb-3">
                        <div className="p-2 bg-blue-50 rounded-lg">
                          <Calendar className="w-4.5 h-4.5" />
                        </div>
                        <h4 className="font-extrabold text-[13px] uppercase tracking-wider">Contrôle / RDV de suivi</h4>
                      </div>
                      <p className="text-[12px] text-gray-500 mb-4">
                        Ce bloc sert à planifier le prochain contrôle : motif + date prévue.
                      </p>
                      <div className="space-y-4">
                        <textarea
                          value={nonMedicaments.rdvMotif}
                          onChange={(e) => setNonMedicaments({ ...nonMedicaments, rdvMotif: e.target.value })}
                          className="w-full h-16 bg-[#F8FAFC] border-none rounded-2xl p-4 text-[13px] text-gray-700 focus:ring-2 focus:ring-[#006A8C]/20 transition-all"
                          placeholder="Motif du prochain contrôle..."
                        />
                        <div className="flex flex-col sm:flex-row items-center gap-4">
                          <div className="flex bg-[#F1F5F9] p-1.5 rounded-xl gap-1">
                            {(['NIVEAU_1', 'NIVEAU_2', 'NIVEAU_3', 'NIVEAU_4'] as const).map((niveau) => (
                              <button
                                key={niveau}
                                onClick={() => setNonMedicaments({ ...nonMedicaments, rdvNiveau: niveau })}
                                className={`w-8 h-8 rounded-lg text-[11px] font-black flex items-center justify-center transition-all ${nonMedicaments.rdvNiveau === niveau
                                  ? 'bg-white text-[#006A8C] shadow-sm'
                                  : 'text-gray-400 hover:text-gray-600'
                                  }`}
                              >
                                {niveau.split('_')[1]}
                              </button>
                            ))}
                          </div>
                          <div className="relative flex-1 w-full">
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <input
                              value={nonMedicaments.rdvDate}
                              onChange={(e) => setNonMedicaments({ ...nonMedicaments, rdvDate: e.target.value })}
                              className="w-full bg-[#F8FAFC] border-none rounded-xl pl-10 pr-4 py-2.5 text-[13px] text-gray-700 focus:ring-2 focus:ring-[#006A8C]/20"
                              type="date"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-8">
                    <div className="bg-white rounded-[24px] p-6 shadow-sm border-t-4 border-blue-400 border-x border-b border-gray-100">
                      <div className="flex items-center gap-3 text-[#006A8C] mb-5">
                        <div className="p-2 bg-blue-50 rounded-lg">
                          <Stethoscope className="w-4.5 h-4.5" />
                        </div>
                        <h4 className="font-extrabold text-[13px] uppercase tracking-wider">Examens para-cliniques</h4>
                      </div>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Service destinataire</label>
                          <select
                            value={nonMedicaments.examenService}
                            onChange={(e) => setNonMedicaments({ ...nonMedicaments, examenService: e.target.value })}
                            className="w-full bg-[#F8FAFC] border border-gray-100 rounded-xl p-3 text-[13px] text-gray-700 focus:border-[#006A8C] outline-none"
                          >
                            <option value="">Sélectionner un plateau technique...</option>
                            {examenServices.map((service) => (
                              <option key={service} value={service}>{service}</option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Description de l'examen</label>
                          <textarea
                            value={nonMedicaments.examenMotif}
                            onChange={(e) => setNonMedicaments({ ...nonMedicaments, examenMotif: e.target.value })}
                            className="w-full bg-[#F8FAFC] border border-gray-100 rounded-xl p-4 text-[13px] text-gray-700 focus:border-[#006A8C] transition-all min-h-[100px]"
                            placeholder="Détails de l'examen demandé..."
                          />
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          {(['STAT', 'URGENTE', 'NORMALE'] as const).map((priorite) => (
                            <button
                              key={priorite}
                              onClick={() => setNonMedicaments({ ...nonMedicaments, examenPriorite: priorite })}
                              className={`py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${nonMedicaments.examenPriorite === priorite
                                ? priorite === 'STAT' ? 'bg-red-600 text-white shadow-lg shadow-red-200' :
                                  priorite === 'URGENTE' ? 'bg-orange-500 text-white shadow-lg shadow-orange-200' :
                                    'bg-[#006A8C] text-white shadow-lg shadow-blue-200'
                                : 'bg-gray-50 text-gray-400 hover:bg-gray-100'
                                }`}
                            >
                              {priorite}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="bg-white rounded-[24px] p-6 shadow-sm border-t-4 border-blue-400 border-x border-b border-gray-100">
                      <div className="flex items-center justify-between mb-5">
                        <div className="flex items-center gap-3 text-[#006A8C]">
                          <div className="p-2 bg-blue-50 rounded-lg">
                            <Stethoscope className="w-4.5 h-4.5" />
                          </div>
                          <h4 className="font-extrabold text-[13px] uppercase tracking-wider">Demande d'hospitalisation</h4>
                        </div>
                        <Badge className="bg-[#EAF3FA] text-[#006A8C] border-none font-black text-[9px] px-2 py-0.5">EN ATTENTE</Badge>
                      </div>
                      <div className="space-y-4">
                        <textarea
                          value={nonMedicaments.hospitalisationMotif}
                          onChange={(e) => setNonMedicaments({ ...nonMedicaments, hospitalisationMotif: e.target.value })}
                          className="w-full h-24 bg-[#F8FAFC] border border-gray-100 rounded-xl p-4 text-[13px] text-gray-700 focus:border-[#006A8C] transition-all"
                          placeholder="Motif justifiant l'hospitalisation..."
                        />
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Service d'accueil</label>
                          <select
                            value={nonMedicaments.hospitalisationService}
                            onChange={(e) => setNonMedicaments({ ...nonMedicaments, hospitalisationService: e.target.value })}
                            className="w-full bg-[#F8FAFC] border border-gray-100 rounded-xl p-3 text-[13px] text-gray-700 focus:border-[#006A8C] outline-none"
                          >
                            <option value="">Sélectionner un service clinique...</option>
                            {hospitalisationServices.map((service) => (
                              <option key={service} value={service}>{service}</option>
                            ))}
                          </select>
                        </div>
                        <div className="pt-2">
                          <p className="text-[11px] text-gray-400 italic">La validation finale sera effectuée par le chef de service.</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-10 pt-8 border-t border-gray-50">
                    <Button variant="outline" className="rounded-full px-8 h-12 text-[13px] font-bold text-gray-500 border-gray-200">
                      ANNULER
                    </Button>
                    <div className="flex gap-4">
                      <Button
                        onClick={finalizeConsultation}
                        disabled={saving}
                        className="rounded-full px-8 h-12 bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-100 font-bold text-[13px] gap-2 shadow-none"
                      >
                        <Save className="w-4 h-4" />
                        <span>{saving ? 'SAUVEGARDE...' : 'VALIDER LA PRESCRIPTION'}</span>
                      </Button>
                      <Button
                        onClick={finalizeConsultation}
                        disabled={saving}
                        className="rounded-full px-10 h-12 bg-[#006A8C] text-white hover:bg-[#004d66] font-extrabold text-[13px] gap-2 shadow-lg shadow-blue-900/10"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>{saving ? 'TRAITEMENT...' : 'TERMINER LA CONSULTATION'}</span>
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Suspense>
  );
}
