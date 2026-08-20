'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useConsultation, useFinalizeConsultation, usePatientConsultationHistory } from '@/hooks/use-consultations';
import { ConsultationApi, consultationApi, type HospitalisationServiceOption } from '@/lib/api/consultation';
import { useAuth } from '@/context/AuthContext';
import { checkPublicEnv } from '@/lib/env';
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
  AlertCircle,
  ExternalLink,
  FolderOpen
} from 'lucide-react';
import { DossierPatientModal } from '@/components/dossier-patient/DossierPatientModal';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PriseEnChargeBadge } from '@/components/patient-prise-en-charge-badge';
import MedicamentBuilder, { buildMedicamentsPayload, type Medicament } from '@/components/prescription/medicale/MedicamentBuilder';
import NonMedicamentBuilder, { buildNonMedicamentItems, type NonMedicamentItem } from '@/components/prescription/NonMedicamentBuilder';
import { creerPrescriptionMedicale, creerOrdonnanceMedicale, creerPrescriptionNonMedicale } from '@/lib/prescription-api';
import { cn } from '@/lib/utils';

const CE_SERVICE_ID = checkPublicEnv('NEXT_PUBLIC_CONSULTATION_EXTERNE_SERVICE_ID', process.env.NEXT_PUBLIC_CONSULTATION_EXTERNE_SERVICE_ID);

// Page d'où le médecin a ouvert cette consultation — le bouton "Retour" doit
// ramener au même endroit plutôt que toujours vers le fil de travail.
const ORIGIN_PATHS: Record<string, string> = {
  'fil-de-travail': '/modules/consultation-externe',
  'dashboard': '/modules/consultation-externe/dashboard',
  'planning-complet': '/modules/consultation-externe/planning-complet',
};
const DEFAULT_BACK_PATH = '/modules/consultation-externe';

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
  priseEnCharge?: { companyName: string; isActive: boolean } | null;
  patientNom?: string;
  patientPrenom?: string;
  patientSexe?: string;
  patientDateNaissance?: string;
};



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
  n: consultation.patient?.displayName ?? ([consultation.patient?.prenom, consultation.patient?.nom].filter(Boolean).join(' ') || 'Patient inconnu'),
  a: new Date(consultation.date).toLocaleDateString('fr-FR'),
  g: consultation.urgence ? 'Urgence' : 'Normal',
  s: consultation.statut?.toUpperCase().replace(/_/g, ' ') || 'EN ATTENTE',
  u: consultation.urgence ? 1 : undefined,
  motif: consultation.motif ?? '',
  diagnostic: consultation.observation?.diagnosticRetenu ?? consultation.observation?.diagnostic ?? '',
  notes: consultation.observation?.notes ?? '',
  priseEnCharge: consultation.patient?.priseEnCharge ?? null,
  patientNom: consultation.patient?.nom,
  patientPrenom: consultation.patient?.prenom,
  patientSexe: consultation.patient?.sexe ?? undefined,
  patientDateNaissance: consultation.patient?.dateNaissance ?? undefined,
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
  const { medecin } = useAuth();
  const [appointmentId, setAppointmentId] = useState<string | null>(null);
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [origin, setOrigin] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<'medicament' | 'non-medicamentaux'>('medicament');
  const goToParacliniques = () => {
    const params = new URLSearchParams();
    if (appointment?.patientId) params.set('patientId', appointment.patientId);
    if (appointmentId) params.set('consultationId', appointmentId);
    if (appointment?.patientNom) params.set('patientNom', appointment.patientNom);
    if (appointment?.patientPrenom) params.set('patientPrenom', appointment.patientPrenom);
    if (appointment?.patientSexe) params.set('patientSexe', appointment.patientSexe);
    if (appointment?.patientDateNaissance) params.set('patientDateNaissance', appointment.patientDateNaissance);
    if (origin) params.set('origin', origin);
    router.push(`/modules/consultation-externe/prescriptions?${params.toString()}`);
  };
  const [isControlMode, setIsControlMode] = useState(false);
  const [followUpSummary, setFollowUpSummary] = useState<{ id: number; date: string; motif: string } | null>(null);
  const [savingControle, setSavingControle] = useState(false);
  const [savedControle, setSavedControle] = useState(false);
  // Message de confirmation standardisé (uniformisation inter-services) : vert = succès, rouge = erreur.
  const [toastMsg, setToastMsg] = useState<{ text: string; variant: 'success' | 'error' } | null>(null);
  const showToast = (text: string, variant: 'success' | 'error' = 'success') => {
    setToastMsg({ text, variant });
    setTimeout(() => setToastMsg(null), 3500);
  };
  const [savingHospitalisation, setSavingHospitalisation] = useState(false);
  const [savedHospitalisation, setSavedHospitalisation] = useState(false);
  // Selon que le médecin appartient ou non au service destinataire, la confirmation
  // vaut soit admission directe (VALIDE), soit demande à valider par ce service
  // (EN_ATTENTE) — le backend tranche et renvoie le vrai statut.
  const [hospitalisationOutcome, setHospitalisationOutcome] = useState<'VALIDE' | 'EN_ATTENTE' | null>(null);
  const [showNoTreatmentReasonModal, setShowNoTreatmentReasonModal] = useState(false);
  const [showDossierPatient, setShowDossierPatient] = useState(false);
  const [noTreatmentReason, setNoTreatmentReason] = useState('');
  const [hospitalisationServiceOptions, setHospitalisationServiceOptions] = useState<HospitalisationServiceOption[]>([]);

  // Liste dynamique des services CLINIQUE (registre service-service, propre au CHU du
  // médecin connecté) — un service créé/désactivé côté registre apparaît/disparaît
  // automatiquement ici, sans rien à changer côté code.
  useEffect(() => {
    let cancelled = false;
    consultationApi.getHospitalisationServices()
      .then((services) => { if (!cancelled) setHospitalisationServiceOptions(services); })
      .catch(() => { if (!cancelled) setHospitalisationServiceOptions([]); });
    return () => { cancelled = true; };
  }, []);

  const { data: consultationData, isLoading: loading, error: queryError } = useConsultation(appointmentId);
  const { mutateAsync: finalizeMutation, isPending: saving } = useFinalizeConsultation();
  const { data: historyData = [] } = usePatientConsultationHistory(appointment?.patientId ?? null);

  const hasExistingClinicalSummary = Boolean(appointment?.diagnostic?.trim() || appointment?.notes?.trim());
  const hasMotif = Boolean(appointment?.motif?.trim());
  const hasHistory = historyData.length > 0;

  // États pour les données dynamiques
  const [observation, setObservation] = useState({ diagnosticSuspicion: '', diagnosticRetenu: '', notes: '' });
  const [parametres, setParametres] = useState<Array<{ id: number; nom: string; valeur: string; unite: string }>>(defaultClinicalParameters);
  const [medicaments, setMedicaments] = useState<Medicament[]>([]);
  const [nonMedicamentItems, setNonMedicamentItems] = useState<NonMedicamentItem[]>([]);
  const [pharmacieWarning, setPharmacieWarning] = useState<string | null>(null);
  // Étape ordonnance (contenu du modèle) : après création de la prescription,
  // le médecin choisit lesquels des médicaments prescrits partent réellement
  // à la pharmacie et ajuste les quantités, avant de terminer la consultation.
  const [pendingOrdonnance, setPendingOrdonnance] = useState<{
    id: string;
    medicaments: (Medicament & { selected: boolean; ordonnanceQuantite: number })[];
  } | null>(null);
  const [ordonnanceLoading, setOrdonnanceLoading] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pendingFollowUpRef = useRef<any>(null);
  const [nonMedicaments, setNonMedicaments] = useState({
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
      const medsToSend = medicaments.filter((med) => med.nom.trim() !== '');

      // Le rendez-vous et l'hospitalisation ont pu être confirmés individuellement pendant
      // la consultation (boutons "Valider"/"Confirmer l'hospitalisation") — dans ce cas ils
      // sont déjà enregistrés côté serveur et ne doivent pas repartir dans la finalisation,
      // sous peine de créer un rendez-vous ou une admission en double.
      const effectiveNonMedicaments = {
        ...nonMedicaments,
        rdvMotif: savedControle ? '' : nonMedicaments.rdvMotif,
        rdvDate: savedControle ? '' : nonMedicaments.rdvDate,
        hospitalisationMotif: savedHospitalisation ? '' : nonMedicaments.hospitalisationMotif,
        hospitalisationService: savedHospitalisation ? '' : nonMedicaments.hospitalisationService,
      };

      const combinedNotes = [observation.notes.trim(), noTreatmentReason.trim() ? `Motif d'absence de traitement : ${noTreatmentReason.trim()}` : '']
        .filter(Boolean)
        .join('\n\n');

      const payload = {
        observation: (observation.diagnosticSuspicion.trim() || observation.diagnosticRetenu.trim() || combinedNotes.trim()) ? {
          diagnosticSuspicion: observation.diagnosticSuspicion,
          diagnosticRetenu: observation.diagnosticRetenu,
          notes: combinedNotes,
        } : null,
        nonMedicaments: (
          effectiveNonMedicaments.rdvMotif.trim() ||
          effectiveNonMedicaments.examenService.trim() ||
          effectiveNonMedicaments.examenMotif.trim() ||
          effectiveNonMedicaments.hospitalisationMotif.trim() ||
          effectiveNonMedicaments.hospitalisationService.trim()
        ) ? effectiveNonMedicaments : null,
        parametres: parametres
          .filter((param) => param.nom.trim() || param.valeur.trim())
          .map((param) => ({
            nom: param.nom.trim(),
            valeur: param.valeur.trim(),
            unite: param.unite.trim(),
          })),
      };

      const result = await finalizeMutation({ id: appointmentId, payload });
      pendingFollowUpRef.current = result?.followUp ?? null;

      // Prescription médicamenteuse : créée immédiatement, mais l'ordonnance
      // (sous-ensemble réellement envoyé à la pharmacie, quantités ajustables)
      // reste une étape manuelle — même contrat que l'interface modèle.
      // Non bloquant pour la prescription elle-même : une erreur n'annule pas
      // la finalisation, déjà enregistrée côté clinique.
      if (medsToSend.length > 0) {
        try {
          const created = await creerPrescriptionMedicale({
            patientId: appointment?.patientId,
            prescripteurId: medecin?.id,
            urgence: appointment?.u ? 'URGENT' : undefined,
            chuId: medecin?.chuId,
            serviceId: CE_SERVICE_ID,
            medicaments: buildMedicamentsPayload(medsToSend),
          });
          const prescriptionId = (created as { id: string }).id;
          // Bascule sur l'étape ordonnance — la suite (non médicamenteuse +
          // redirection) reprend depuis handleCreerOrdonnance/handleSkipOrdonnance.
          setPendingOrdonnance({
            id: prescriptionId,
            medicaments: medsToSend.map((m) => ({ ...m, selected: true, ordonnanceQuantite: m.quantite })),
          });
          return;
        } catch (prescErr) {
          setPharmacieWarning(
            `Consultation enregistrée, mais l'envoi au service prescription a échoué (${prescErr instanceof Error ? prescErr.message : 'erreur inconnue'}). Veuillez contacter la pharmacie manuellement.`
          );
          return;
        }
      }

      await finishAfterOrdonnance();
    } catch (err) {
      showToast('Erreur lors de la sauvegarde : ' + (err instanceof Error ? err.message : 'Erreur inconnue'), 'error');
    }
  };

  // Suite de la finalisation une fois l'étape ordonnance passée (ou sautée
  // faute de médicaments) : prescription non médicamenteuse puis redirection.
  const finishAfterOrdonnance = async () => {
    if (nonMedicamentItems.length > 0) {
      try {
        await creerPrescriptionNonMedicale({
          patientId: appointment?.patientId,
          prescripteurId: medecin?.id,
          urgence: appointment?.u ? 'URGENT' : undefined,
          chuId: medecin?.chuId,
          serviceId: CE_SERVICE_ID,
          items: buildNonMedicamentItems(nonMedicamentItems),
        });
      } catch (nmErr) {
        setPharmacieWarning(
          `Consultation enregistrée, mais l'envoi de la prescription non médicamenteuse a échoué (${nmErr instanceof Error ? nmErr.message : 'erreur inconnue'}).`
        );
        return;
      }
    }

    const followUp = pendingFollowUpRef.current;
    showToast('Validé avec succès');

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
  };

  function toggleOrdonnanceMed(id: number) {
    setPendingOrdonnance((prev) => prev ? { ...prev, medicaments: prev.medicaments.map((m) => m.id === id ? { ...m, selected: !m.selected } : m) } : prev);
  }
  function updateOrdonnanceQuantite(id: number, qty: number) {
    setPendingOrdonnance((prev) => prev ? { ...prev, medicaments: prev.medicaments.map((m) => m.id === id ? { ...m, ordonnanceQuantite: Math.max(0, qty) } : m) } : prev);
  }

  async function handleCreerOrdonnance() {
    if (!pendingOrdonnance) return;
    const selected = pendingOrdonnance.medicaments.filter((m) => m.selected && m.ordonnanceQuantite > 0);
    if (selected.length === 0) return;
    setOrdonnanceLoading(true);
    try {
      await creerOrdonnanceMedicale(
        pendingOrdonnance.id,
        buildMedicamentsPayload(selected.map((m) => ({ ...m, quantite: m.ordonnanceQuantite }))),
      );
      setPendingOrdonnance(null);
      await finishAfterOrdonnance();
    } catch (pharmErr) {
      setPharmacieWarning(
        `Prescription enregistrée, mais l'envoi à la pharmacie a échoué (${pharmErr instanceof Error ? pharmErr.message : 'erreur inconnue'}). Veuillez contacter la pharmacie manuellement.`
      );
      setPendingOrdonnance(null);
    } finally {
      setOrdonnanceLoading(false);
    }
  }

  async function handleSkipOrdonnance() {
    setPendingOrdonnance(null);
    await finishAfterOrdonnance();
  }

  // Clic sur "Terminer la consultation" : si aucun médicament n'a été prescrit, on
  // exige une raison avant de clôturer (le médecin peut confirmer volontairement
  // qu'aucun traitement n'était nécessaire).
  const handleTerminerClick = () => {
    const hasTraitement = medicaments.some((med) => med.nom.trim() !== '');
    if (!hasTraitement && !noTreatmentReason.trim()) {
      setShowNoTreatmentReasonModal(true);
      return;
    }
    finalizeConsultation();
  };

  const handleSaveControle = async () => {
    if (!appointmentId) return;
    setSavingControle(true);
    try {
      await consultationApi.traiterConsultation(appointmentId, 'controle', {
        rdvMotif: nonMedicaments.rdvMotif || null,
        rdvDate: nonMedicaments.rdvDate || null,
        rdvNiveau: nonMedicaments.rdvNiveau,
      });
      setSavedControle(true);
      showToast('Validé avec succès');
      setTimeout(() => setSavedControle(false), 3500);
    } catch (err) {
      showToast('Erreur RDV : ' + (err instanceof Error ? err.message : 'Erreur inconnue'), 'error');
    } finally {
      setSavingControle(false);
    }
  };

  const handleSaveHospitalisation = async () => {
    if (!appointmentId || !nonMedicaments.hospitalisationMotif.trim()) return;
    setSavingHospitalisation(true);
    try {
      const result = await consultationApi.traiterConsultation(appointmentId, 'hospitalisation', {
        hospitalisationMotif: nonMedicaments.hospitalisationMotif,
        hospitalisationService: nonMedicaments.hospitalisationService || null,
      });
      const outcome = result?.consultation?.hospitalisationStatus === 'EN_ATTENTE' ? 'EN_ATTENTE' : 'VALIDE';
      setHospitalisationOutcome(outcome);
      setSavedHospitalisation(true);
      showToast(
        outcome === 'VALIDE'
          ? 'Hospitalisation confirmée'
          : 'Demande envoyée au service concerné, en attente de validation',
      );
      // Confirmer l'hospitalisation ne termine pas la consultation : le médecin reste
      // sur la page pour continuer à remplir le traitement, puis clique lui-même sur
      // "Terminer la consultation" quand il a fini.
    } catch (err) {
      showToast('Erreur hospitalisation : ' + (err instanceof Error ? err.message : 'Erreur inconnue'), 'error');
    } finally {
      setSavingHospitalisation(false);
    }
  };

  const backHref = (origin && ORIGIN_PATHS[origin]) || DEFAULT_BACK_PATH;

  const handleCancelAndGoBack = async (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();

    if (appointmentId) {
      try {
        await consultationApi.traiterConsultation(appointmentId, 'annuler');
      } catch (error) {
        console.error('Impossible de remettre la consultation en attente:', error);
      }
    }

    router.push(backHref);
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const params = new URLSearchParams(window.location.search);
    const consultationId = params.get('consultationId') ?? params.get('id');
    const patientId = params.get('patientId');
    const mode = params.get('mode');
    const originParam = params.get('origin');

    console.log('URL params:', window.location.search);
    console.log('consultationId from URL:', consultationId);
    console.log('patientId from URL:', patientId);

    if (consultationId) {
      setAppointmentId(consultationId);
    }

    setIsControlMode(mode === 'controle');
    setOrigin(originParam);
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
          <Link href={backHref} className="inline-flex rounded-full bg-blue-700 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-800">
            Retour
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

          {/* Avertissement envoi pharmacie */}
          {pharmacieWarning && (
            <div className="mb-6 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4">
              <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
              <div className="flex-1">
                <p className="text-[13px] font-semibold text-amber-800">Envoi à la pharmacie non effectué</p>
                <p className="text-[12px] text-amber-700 mt-0.5">{pharmacieWarning}</p>
              </div>
              <button
                onClick={() => setPharmacieWarning(null)}
                className="text-amber-400 hover:text-amber-600 transition-colors shrink-0"
              >
                ✕
              </button>
            </div>
          )}

          <div className="fixed bottom-4 right-4 z-40 w-[calc(100vw-2rem)] max-w-md md:w-full pointer-events-none">
            <div className="pointer-events-auto ml-auto">
            </div>
          </div>

          {/* Header Section */}
          <div className="mb-10 flex items-start gap-5">
            <Link
              href={backHref}
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
                <div className="flex flex-wrap items-center justify-between gap-y-3">
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
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowDossierPatient(true)}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-[#006A8C]/20 bg-[#EAF3FA] px-3.5 py-2 text-[11px] font-bold text-[#006A8C] transition-all hover:bg-[#006A8C] hover:text-white"
                      title="Consulter le dossier patient (lecture seule)"
                    >
                      <FolderOpen className="h-3.5 w-3.5" strokeWidth={2.5} />
                      Dossier patient
                    </button>
                    <Badge variant={appointment.s.includes('ATTENTE') ? 'warning' : 'success'} className="px-4 py-1.5 text-[10px] uppercase tracking-[0.1em]">
                      {appointment.s}
                    </Badge>
                  </div>
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
                  {/* Ordre logique : paramètres cliniques → observations → diagnostic */}
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
                      {parametres.map((param) => {
                        const isPredefined = [1, 2, 3, 4, 5, 6].includes(param.id);
                        return (
                          <div key={param.id} className="grid gap-3 md:grid-cols-[1.2fr_0.9fr_0.7fr_auto]">
                            {isPredefined ? (
                              <div className="rounded-2xl border border-gray-200 bg-gray-50 px-3 py-2 text-[13px] font-semibold text-gray-700 flex items-center">
                                {param.nom}
                              </div>
                            ) : (
                              <input
                                value={param.nom}
                                onChange={(e) => updateParametre(param.id, 'nom', e.target.value)}
                                placeholder="Nom du paramètre"
                                className="rounded-2xl border border-gray-200 bg-white px-3 py-2 text-[13px] text-gray-700 outline-none focus:border-[#006A8C]"
                              />
                            )}
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
                            {!isPredefined ? (
                              <Button type="button" variant="ghost" className="h-10 w-10 rounded-full p-0" onClick={() => removeParametre(param.id)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            ) : (
                              <div className="w-10" />
                            )}
                          </div>
                        );
                      })}
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
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Prise en charge</p>
                    <PriseEnChargeBadge priseEnCharge={appointment.priseEnCharge} />
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
              <button
                onClick={goToParacliniques}
                className="flex items-center cursor-pointer gap-2.5 py-6 transition-all relative text-gray-400 hover:text-gray-600 font-medium"
              >
                <Stethoscope className="h-4.5 w-4.5" />
                <span className="text-[13px] uppercase tracking-wider">Examens para-cliniques</span>
                <ExternalLink className="h-3.5 w-3.5" />
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
                  <MedicamentBuilder medicaments={medicaments} onChange={setMedicaments} chuId={medecin?.chuId} />
                </div>
              ) : (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h4 className="text-[18px] font-extrabold text-gray-900 tracking-tight">Prescriptions non médicamenteuses</h4>
                      <p className="text-[12px] text-gray-500 font-medium">Régime, mobilisation, hygiène, contention...</p>
                    </div>
                    <Badge variant="info" className="bg-[#EAF3FA] text-[#006A8C] border-none px-3 py-1 font-bold">
                      {nonMedicamentItems.length} PRESCRIPTION(S)
                    </Badge>
                  </div>
                  <NonMedicamentBuilder items={nonMedicamentItems} onChange={setNonMedicamentItems} />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Suivi & Demandes — sections déplacées hors des onglets de prescription */}
          <Card className="mt-10 rounded-[32px] border-gray-100 shadow-[0px_4px_16px_rgba(17,17,26,0.05)] overflow-hidden">
            <CardHeader className="px-8 pt-8 pb-0">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-[#EAF3FA] rounded-xl">
                  <ClipboardList className="w-5 h-5 text-[#006A8C]" />
                </div>
                <CardTitle className="text-[15px] font-extrabold text-gray-900 uppercase tracking-tight">
                  Suivi &amp; Demandes
                </CardTitle>
              </div>
              <p className="text-[12px] text-gray-400 font-medium pb-6 border-b border-gray-100">
                Contrôle de suivi, examens para-cliniques et demandes d'hospitalisation.
              </p>
            </CardHeader>
            <CardContent className="p-8">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* Contrôle / RDV de suivi */}
                <div className="bg-white rounded-[24px] p-6 shadow-sm border-t-4 border-[#006A8C] border-x border-b border-gray-100 flex flex-col">
                  <div className="flex items-center gap-3 text-[#006A8C] mb-1">
                    <div className="p-2 bg-blue-50 rounded-lg">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <h4 className="font-extrabold text-[13px] uppercase tracking-wider">Contrôle / RDV de suivi</h4>
                  </div>
                  <p className="text-[11px] text-gray-400 mb-4">Planifier le prochain rendez-vous de contrôle.</p>

                  <div className="space-y-3 flex-1">
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 block">Motif du contrôle</label>
                      <textarea
                        value={nonMedicaments.rdvMotif}
                        onChange={(e) => setNonMedicaments({ ...nonMedicaments, rdvMotif: e.target.value })}
                        className="w-full h-24 bg-[#F8FAFC] border border-gray-100 rounded-2xl p-4 text-[13px] text-gray-700 focus:border-[#006A8C] focus:ring-1 focus:ring-[#006A8C]/20 transition-all outline-none"
                        placeholder="Ex : Réévaluation tensionnelle, suivi glycémie..."
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 block">Niveau de priorité</label>
                      <div className="grid grid-cols-4 gap-1.5">
                        {([
                          { key: 'NIVEAU_1', label: 'Routine', sub: '~1 mois' },
                          { key: 'NIVEAU_2', label: 'Prioritaire', sub: '~2 sem.' },
                          { key: 'NIVEAU_3', label: 'Urgent', sub: '~1 sem.' },
                          { key: 'NIVEAU_4', label: 'STAT', sub: '< 48h' },
                        ] as const).map(({ key, label, sub }) => (
                          <button
                            key={key}
                            type="button"
                            onClick={() => setNonMedicaments({ ...nonMedicaments, rdvNiveau: key })}
                            className={`flex flex-col items-center py-2 px-1 rounded-xl text-center transition-all border ${
                              nonMedicaments.rdvNiveau === key
                                ? 'bg-[#EAF3FA] border-[#006A8C] text-[#006A8C]'
                                : 'bg-[#F8FAFC] border-gray-100 text-gray-400 hover:border-gray-200'
                            }`}
                          >
                            <span className="text-[11px] font-black">{label}</span>
                            <span className="text-[9px] mt-0.5 opacity-70">{sub}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 block">Date souhaitée</label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                        <input
                          value={nonMedicaments.rdvDate}
                          onChange={(e) => setNonMedicaments({ ...nonMedicaments, rdvDate: e.target.value })}
                          className="w-full bg-[#F8FAFC] border border-gray-100 rounded-xl pl-10 pr-4 py-2.5 text-[13px] text-gray-700 focus:border-[#006A8C] focus:ring-1 focus:ring-[#006A8C]/20 outline-none transition-all"
                          type="date"
                        />
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleSaveControle}
                    disabled={savingControle || (!nonMedicaments.rdvMotif.trim() && !nonMedicaments.rdvDate)}
                    className={`mt-4 w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-bold text-[12px] transition-all disabled:opacity-40 ${
                      savedControle
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-[#006A8C] hover:bg-[#004d66] text-white shadow-sm shadow-blue-900/10'
                    }`}
                  >
                    {savedControle ? (
                      <><CheckCircle2 className="w-4 h-4" /> RDV enregistré</>
                    ) : savingControle ? (
                      'Enregistrement...'
                    ) : (
                      <><Save className="w-3.5 h-3.5" /> Enregistrer le RDV</>
                    )}
                  </button>
                </div>

                {/* Demande d'hospitalisation */}
                <div className="bg-white rounded-[24px] p-6 shadow-sm border-t-4 border-[#006A8C] border-x border-b border-gray-100 flex flex-col">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-3 text-[#006A8C]">
                      <div className="p-2 bg-blue-50 rounded-lg">
                        <Stethoscope className="w-4 h-4" />
                      </div>
                      <h4 className="font-extrabold text-[13px] uppercase tracking-wider">Hospitalisation</h4>
                    </div>
                    <Badge className={`border-none font-black text-[9px] px-2 py-0.5 ${
                      hospitalisationOutcome === 'VALIDE' ? 'bg-emerald-50 text-emerald-700'
                        : hospitalisationOutcome === 'EN_ATTENTE' ? 'bg-amber-50 text-amber-700'
                        : 'bg-[#EAF3FA] text-[#006A8C]'
                    }`}>
                      {hospitalisationOutcome === 'VALIDE' ? 'CONFIRMÉE' : hospitalisationOutcome === 'EN_ATTENTE' ? 'DEMANDE ENVOYÉE' : 'À CONFIRMER'}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-gray-400 mb-4">Si vous appartenez au service choisi, le patient est admis directement ; sinon une demande est envoyée pour validation par ce service.</p>

                  <div className="space-y-3 flex-1">
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 block">
                        Motif d'hospitalisation <span className="text-red-400">*</span>
                      </label>
                      <textarea
                        value={nonMedicaments.hospitalisationMotif}
                        onChange={(e) => setNonMedicaments({ ...nonMedicaments, hospitalisationMotif: e.target.value })}
                        className="w-full h-28 bg-[#F8FAFC] border border-gray-100 rounded-xl p-4 text-[13px] text-gray-700 focus:border-[#006A8C] focus:ring-1 focus:ring-[#006A8C]/20 outline-none transition-all"
                        placeholder="Décrire le motif clinique justifiant l'hospitalisation..."
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 block">Service d'accueil</label>
                      <select
                        value={nonMedicaments.hospitalisationService}
                        onChange={(e) => setNonMedicaments({ ...nonMedicaments, hospitalisationService: e.target.value })}
                        className="w-full bg-[#F8FAFC] border border-gray-100 rounded-xl p-3 text-[13px] text-gray-700 focus:border-[#006A8C] outline-none transition-all"
                      >
                        <option value="">Sélectionner un service clinique...</option>
                        {hospitalisationServiceOptions.map((service) => (
                          <option key={service.id} value={service.name}>{service.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleSaveHospitalisation}
                    disabled={savingHospitalisation || !nonMedicaments.hospitalisationMotif.trim()}
                    className={`mt-4 w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-bold text-[12px] transition-all disabled:opacity-40 ${
                      hospitalisationOutcome === 'VALIDE'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : hospitalisationOutcome === 'EN_ATTENTE'
                        ? 'bg-amber-50 text-amber-700 border border-amber-200'
                        : 'bg-[#006A8C] hover:bg-[#004d66] text-white shadow-sm shadow-blue-900/10'
                    }`}
                  >
                    {hospitalisationOutcome === 'VALIDE' ? (
                      <><CheckCircle2 className="w-4 h-4" /> Hospitalisation confirmée</>
                    ) : hospitalisationOutcome === 'EN_ATTENTE' ? (
                      <><CheckCircle2 className="w-4 h-4" /> Demande envoyée</>
                    ) : savingHospitalisation ? (
                      'Confirmation en cours...'
                    ) : (
                      <><Save className="w-3.5 h-3.5" /> Confirmer l'hospitalisation</>
                    )}
                  </button>
                </div>

              </div>
            </CardContent>
          </Card>

          {/* Action finale — conclut la consultation quel que soit l'onglet actif */}
          <div className="mt-10 flex items-center justify-end">
            <Button
              type="button"
              onClick={handleTerminerClick}
              disabled={saving}
              className="rounded-full px-10 h-12 bg-[#006A8C] text-white hover:bg-[#004d66] font-extrabold text-[13px] transition-all disabled:opacity-50 gap-2 shadow-lg shadow-blue-900/10"
            >
              <CheckCircle2 className="w-4 h-4" />
              {saving ? 'TRAITEMENT...' : 'TERMINER LA CONSULTATION'}
            </Button>
          </div>

        </div>
      </div>

      {toastMsg && (
        <div
          className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] flex items-center gap-2 rounded-full px-5 py-3 text-[13px] font-bold text-white shadow-lg ${
            toastMsg.variant === 'success' ? 'bg-emerald-500' : 'bg-red-500'
          }`}
        >
          {toastMsg.variant === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {toastMsg.text}
        </div>
      )}

      {showDossierPatient && appointment && (
        <DossierPatientModal
          patientId={appointment.patientId}
          patientName={appointment.n}
          chuId={medecin?.chuId}
          onClose={() => setShowDossierPatient(false)}
        />
      )}

      {showNoTreatmentReasonModal && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-[15px] font-extrabold text-gray-800 mb-2">Aucun traitement prescrit</h3>
            <p className="text-[12px] text-gray-500 mb-4">
              Vous terminez cette consultation sans avoir prescrit de médicament. Merci d'indiquer la raison avant de continuer.
            </p>
            <textarea
              value={noTreatmentReason}
              onChange={(e) => setNoTreatmentReason(e.target.value)}
              className="w-full text-[13px] bg-white border border-gray-200 rounded-xl p-3 h-24 focus:border-[#006A8C] focus:ring-1 focus:ring-[#006A8C] transition-all"
              placeholder="Ex : patient orienté en paraclinique, aucun traitement nécessaire..."
              autoFocus
            />
            <div className="flex justify-end gap-2 mt-4">
              <button
                type="button"
                onClick={() => setShowNoTreatmentReasonModal(false)}
                className="px-4 py-2.5 text-[12px] font-bold text-gray-500 hover:bg-gray-50 rounded-xl transition-all"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={!noTreatmentReason.trim()}
                onClick={() => {
                  setShowNoTreatmentReasonModal(false);
                  finalizeConsultation();
                }}
                className="px-4 py-2.5 text-[12px] font-bold text-white bg-[#006A8C] hover:bg-[#004d66] rounded-xl disabled:opacity-40 transition-all"
              >
                Confirmer et terminer
              </button>
            </div>
          </div>
        </div>
      )}

      {pendingOrdonnance && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 max-h-[85vh] overflow-y-auto">
            <h3 className="text-[15px] font-extrabold text-gray-800 mb-1">Ordonnance à envoyer à la pharmacie</h3>
            <p className="text-[12px] text-gray-500 mb-4">
              La prescription a été enregistrée. Choisissez les médicaments à envoyer à la pharmacie et ajustez les quantités si besoin.
            </p>
            <div className="mb-4">
              {pendingOrdonnance.medicaments.map((m) => (
                <div key={m.id} className="flex items-center gap-3 py-2 border-b border-gray-100 text-[13px]">
                  <input type="checkbox" checked={m.selected} onChange={() => toggleOrdonnanceMed(m.id)} />
                  <div className="flex-1">
                    <strong className="text-gray-800">{m.nom} {m.dose}</strong>
                    <span className="block text-[11px] text-gray-400">{m.frequenceType} · {m.dureeJours} jour(s)</span>
                  </div>
                  <span className="text-[11px] text-gray-400">Qté :</span>
                  <input
                    type="number"
                    min={0}
                    value={m.ordonnanceQuantite}
                    onChange={(e) => updateOrdonnanceQuantite(m.id, parseInt(e.target.value, 10) || 0)}
                    disabled={!m.selected}
                    className="w-16 text-center text-[12px] bg-white border border-gray-200 rounded-lg p-1.5 disabled:opacity-40"
                  />
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={handleSkipOrdonnance}
                disabled={ordonnanceLoading}
                className="px-4 py-2.5 text-[12px] font-bold text-gray-500 hover:bg-gray-50 rounded-xl transition-all disabled:opacity-40"
              >
                Ne pas faire d&apos;ordonnance
              </button>
              <button
                type="button"
                onClick={handleCreerOrdonnance}
                disabled={ordonnanceLoading || pendingOrdonnance.medicaments.filter((m) => m.selected && m.ordonnanceQuantite > 0).length === 0}
                className="px-4 py-2.5 text-[12px] font-bold text-white bg-[#006A8C] hover:bg-[#004d66] rounded-xl disabled:opacity-40 transition-all"
              >
                {ordonnanceLoading ? 'Envoi...' : 'Créer et envoyer l\'ordonnance'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Suspense>
  );
}
