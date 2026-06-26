'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Calendar, ClipboardList, FileText, Plus, Save, Stethoscope, Trash2, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useConsultation, useSaveControlNote, useSaveControlPrescriptions } from '@/hooks/use-consultations';
import { ConsultationApi, getVisiteLabel } from '@/lib/api/consultation';

const mapConsultation = (consultation: ConsultationApi) => ({
  id: consultation.id,
  patientName: consultation.patient?.displayName ?? `Patient #${consultation.patientId}`,
  date: consultation.date,
  heure: consultation.heure,
  motif: consultation.motif ?? '',
  diagnostic: consultation.observation?.diagnostic ?? '',
  notes: consultation.observation?.notes ?? '',
  noteControle: consultation.observation?.noteControle ?? '',
  medicamentPrescriptions: consultation.medicamentPrescriptions ?? [],
  nonMedicamentPrescriptions: consultation.nonMedicamentPrescriptions ?? [],
});

const emptyMedicationRow = () => ({
  id: Date.now(),
  medicament: '',
  forme: '',
  dosage: '',
  voie: '',
  posologie: '',
  duree: '',
  instructions: '',
});

export default function ControleDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const { data: consultationData, isLoading, error } = useConsultation(id);
  const { mutateAsync: saveNote, isPending: isSavingNote } = useSaveControlNote();
  const { mutateAsync: savePrescriptions, isPending: isSavingPrescriptions } = useSaveControlPrescriptions();
  const visiteLabel = consultationData ? getVisiteLabel(consultationData) : 'Consultation';
  const [noteControle, setNoteControle] = useState('');
  const [medicaments, setMedicaments] = useState<Array<any>>([]);
  const [nonMedicaments, setNonMedicaments] = useState({
    recommandationsNotes: '',
    rdvMotif: '',
    rdvNiveau: 'NIVEAU_1' as const,
    rdvDate: '',
    examenService: '',
    examenMotif: '',
    examenPriorite: 'NORMALE' as const,
    hospitalisationMotif: '',
    hospitalisationService: '',
    hospitalisationStatus: 'EN_ATTENTE' as const,
  });

  useEffect(() => {
    if (id) {
      router.replace(`/modules/consultation-externe/traitement?id=${id}&mode=controle`);
    }
  }, [id, router]);

  useEffect(() => {
    if (consultationData?.observation?.noteControle !== undefined) {
      setNoteControle(consultationData.observation.noteControle || '');
    }
  }, [consultationData]);

  useEffect(() => {
    if (consultationData) {
      const prescriptions = consultationData.medicamentPrescriptions ?? [];
      setMedicaments(
        prescriptions.length > 0
          ? prescriptions.map((item: any) => ({
              id: item.id,
              medicament: item.medicament ?? '',
              forme: item.forme ?? '',
              dosage: item.dosage ?? '',
              voie: item.voie ?? '',
              posologie: item.posologie ?? '',
              duree: item.duree ?? '',
              instructions: item.instructions ?? '',
            }))
          : [emptyMedicationRow()],
      );

      const existingNonMed = consultationData.nonMedicamentPrescriptions?.[0];
      if (existingNonMed) {
        setNonMedicaments({
          recommandationsNotes: existingNonMed.recommandationsNotes ?? '',
          rdvMotif: existingNonMed.rdvMotif ?? '',
          rdvNiveau: existingNonMed.rdvNiveau ?? 'NIVEAU_1',
          rdvDate: existingNonMed.rdvDate ? new Date(existingNonMed.rdvDate).toISOString().slice(0, 10) : '',
          examenService: existingNonMed.examenService ?? '',
          examenMotif: existingNonMed.examenMotif ?? '',
          examenPriorite: existingNonMed.examenPriorite ?? 'NORMALE',
          hospitalisationMotif: existingNonMed.hospitalisationMotif ?? '',
          hospitalisationService: existingNonMed.hospitalisationService ?? '',
          hospitalisationStatus: existingNonMed.hospitalisationStatus ?? 'EN_ATTENTE',
        });
      }
    }
  }, [consultationData]);

  const consultation = useMemo(() => {
    if (!consultationData) return null;
    return mapConsultation(consultationData);
  }, [consultationData]);

  const updateMedication = (id: number, field: string, value: string) => {
    setMedicaments((prev) => prev.map((item) => (item.id === id ? { ...item, [field]: value } : item)));
  };

  const addMedication = () => {
    setMedicaments((prev) => [...prev, emptyMedicationRow()]);
  };

  const removeMedication = (id: number) => {
    setMedicaments((prev) => prev.filter((item) => item.id !== id));
  };

  const handleSaveNote = async () => {
    if (!id) return;
    await saveNote({ id, note: noteControle });
  };

  const hasNonMedicationData = () => {
    const meaningfulFields = [
      nonMedicaments.recommandationsNotes,
      nonMedicaments.rdvMotif,
      nonMedicaments.rdvDate,
      nonMedicaments.examenService,
      nonMedicaments.examenMotif,
      nonMedicaments.hospitalisationMotif,
      nonMedicaments.hospitalisationService,
    ];

    return meaningfulFields.some((value) => value.trim() !== '');
  };

  const handleSavePrescriptions = async () => {
    if (!id) return;
    await savePrescriptions({
      id,
      payload: {
        medicaments: medicaments.filter((item) => item.medicament.trim() !== ''),
        nonMedicaments: hasNonMedicationData() ? nonMedicaments : null,
      },
    });
  };

  if (isLoading) {
    return <div className="min-h-screen bg-slate-50 p-8">Chargement du contrôle...</div>;
  }

  if (error || !consultation) {
    return (
      <div className="min-h-screen bg-slate-50 p-8">
        <div className="rounded-2xl bg-white p-8 text-slate-700">Impossible d’ouvrir ce contrôle.</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F8FA] py-8 px-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/modules/consultation-externe/controle" className="inline-flex items-center justify-center p-3 rounded-2xl bg-white shadow-sm border border-gray-100">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900">{visiteLabel}</h1>
            <p className="text-sm text-slate-500">Réutilisation du parcours de consultation avec contexte de suivi</p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
          <Card className="rounded-[32px] border-gray-100 shadow-sm overflow-hidden">
            <CardHeader className="p-7 pb-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-[#EAF3FA] flex items-center justify-center text-[#006A8C]">
                    <User className="w-6 h-6" />
                  </div>
                  <div>
                    <CardTitle className="text-[16px] font-extrabold uppercase tracking-tight">{consultation.patientName}</CardTitle>
                    <p className="text-xs font-semibold text-slate-400 uppercase">{new Date(consultation.date).toLocaleDateString('fr-FR')}</p>
                  </div>
                </div>
                <Badge className="bg-[#EAF3FA] text-[#006A8C]">{visiteLabel}</Badge>
              </div>
            </CardHeader>
            <CardContent className="p-7 space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-[10px] uppercase tracking-wide text-slate-400">Horaire</p>
                  <div className="mt-2 flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-[#006A8C]" />
                    <span className="font-semibold">{consultation.heure}</span>
                  </div>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-[10px] uppercase tracking-wide text-slate-400">Motif</p>
                  <p className="mt-2 text-sm font-semibold text-slate-700">{consultation.motif || 'Aucun motif'}</p>
                </div>
              </div>

              <div className="rounded-3xl border border-slate-100 bg-slate-50 p-5">
                <p className="text-[10px] uppercase tracking-[0.15em] text-slate-400">Diagnostic initial</p>
                <p className="mt-2 text-sm text-slate-700">{consultation.diagnostic || 'Aucun diagnostic enregistré'}</p>
              </div>

              <div>
                <label className="mb-3 block text-[11px] font-bold uppercase tracking-[0.15em] text-slate-400">Note de contrôle</label>
                <textarea
                  value={noteControle}
                  onChange={(e) => setNoteControle(e.target.value)}
                  className="min-h-[180px] w-full rounded-3xl border border-slate-200 bg-white p-5 text-sm text-slate-700 outline-none focus:border-[#006A8C] focus:ring-1 focus:ring-[#006A8C]"
                  placeholder="Ajouter un compte rendu de contrôle..."
                />
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSaveNote} disabled={isSavingNote} className="rounded-full bg-[#006A8C] px-6">
                  <Save className="mr-2 h-4 w-4" />
                  {isSavingNote ? 'Enregistrement...' : 'Enregistrer la note'}
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card className="rounded-[28px] border-gray-100 shadow-sm">
              <CardContent className="p-6">
                <h3 className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#006A8C]">Résumé clinique</h3>
                <div className="mt-4 space-y-3 text-sm text-slate-600">
                  <p><span className="font-semibold text-slate-800">Diagnostic :</span> {consultation.diagnostic || '—'}</p>
                  <p><span className="font-semibold text-slate-800">Observations :</span> {consultation.notes || '—'}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-[28px] border-gray-100 shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center gap-2 text-[#006A8C]">
                  <ClipboardList className="h-4 w-4" />
                  <h3 className="text-[11px] font-extrabold uppercase tracking-[0.12em]">Prescriptions conservées</h3>
                </div>
                <div className="mt-4 space-y-3">
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-slate-400">Médicamenteuses</p>
                    <p className="mt-1 text-sm text-slate-700">{consultation.medicamentPrescriptions.length} prescription(s)</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-slate-400">Non médicamenteuses</p>
                    <p className="mt-1 text-sm text-slate-700">{consultation.nonMedicamentPrescriptions.length} prescription(s)</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <Card className="rounded-[32px] border-gray-100 shadow-sm overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#006A8C]">Modifier les prescriptions</h3>
                <p className="mt-1 text-sm text-slate-500">Les prescriptions peuvent être ajustées à chaque contrôle.</p>
              </div>
              <Button onClick={handleSavePrescriptions} disabled={isSavingPrescriptions} className="rounded-full bg-[#006A8C] px-6">
                <Save className="mr-2 h-4 w-4" />
                {isSavingPrescriptions ? 'Enregistrement...' : 'Enregistrer les prescriptions'}
              </Button>
            </div>

            <div className="space-y-8">
              <section>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2 text-[#006A8C]">
                    <FileText className="h-4 w-4" />
                    <h4 className="text-[11px] font-extrabold uppercase tracking-[0.12em]">Médicamenteuses</h4>
                  </div>
                  <Button variant="outline" onClick={addMedication} className="rounded-full">
                    <Plus className="mr-2 h-4 w-4" />
                    Ajouter
                  </Button>
                </div>
                <div className="space-y-3">
                  {medicaments.map((item) => (
                    <div key={item.id} className="grid gap-3 rounded-2xl border border-slate-200 p-3 md:grid-cols-5">
                      <input
                        value={item.medicament}
                        onChange={(e) => updateMedication(item.id, 'medicament', e.target.value)}
                        placeholder="Médicament"
                        className="rounded-xl border border-slate-200 p-2 text-sm"
                      />
                      <input
                        value={item.forme}
                        onChange={(e) => updateMedication(item.id, 'forme', e.target.value)}
                        placeholder="Forme"
                        className="rounded-xl border border-slate-200 p-2 text-sm"
                      />
                      <input
                        value={item.dosage}
                        onChange={(e) => updateMedication(item.id, 'dosage', e.target.value)}
                        placeholder="Dosage"
                        className="rounded-xl border border-slate-200 p-2 text-sm"
                      />
                      <input
                        value={item.posologie}
                        onChange={(e) => updateMedication(item.id, 'posologie', e.target.value)}
                        placeholder="Posologie"
                        className="rounded-xl border border-slate-200 p-2 text-sm"
                      />
                      <div className="flex gap-2">
                        <input
                          value={item.duree}
                          onChange={(e) => updateMedication(item.id, 'duree', e.target.value)}
                          placeholder="Durée"
                          className="w-full rounded-xl border border-slate-200 p-2 text-sm"
                        />
                        <button
                          type="button"
                          onClick={() => removeMedication(item.id)}
                          className="rounded-xl border border-red-200 p-2 text-red-500"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section>
                <div className="flex items-center gap-2 text-[#006A8C] mb-4">
                  <ClipboardList className="h-4 w-4" />
                  <h4 className="text-[11px] font-extrabold uppercase tracking-[0.12em]">Non médicamenteuses</h4>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <textarea
                    value={nonMedicaments.recommandationsNotes}
                    onChange={(e) => setNonMedicaments((prev) => ({ ...prev, recommandationsNotes: e.target.value }))}
                    placeholder="Recommandations / conseils"
                    className="min-h-[120px] rounded-2xl border border-slate-200 p-3 text-sm"
                  />
                  <textarea
                    value={nonMedicaments.rdvMotif}
                    onChange={(e) => setNonMedicaments((prev) => ({ ...prev, rdvMotif: e.target.value }))}
                    placeholder="Motif du rendez-vous"
                    className="min-h-[120px] rounded-2xl border border-slate-200 p-3 text-sm"
                  />
                  <input
                    value={nonMedicaments.rdvDate}
                    onChange={(e) => setNonMedicaments((prev) => ({ ...prev, rdvDate: e.target.value }))}
                    type="date"
                    className="rounded-2xl border border-slate-200 p-3 text-sm"
                  />
                  <input
                    value={nonMedicaments.examenService}
                    onChange={(e) => setNonMedicaments((prev) => ({ ...prev, examenService: e.target.value }))}
                    placeholder="Service d'examen"
                    className="rounded-2xl border border-slate-200 p-3 text-sm"
                  />
                  <textarea
                    value={nonMedicaments.examenMotif}
                    onChange={(e) => setNonMedicaments((prev) => ({ ...prev, examenMotif: e.target.value }))}
                    placeholder="Motif d'examen"
                    className="min-h-[120px] rounded-2xl border border-slate-200 p-3 text-sm md:col-span-2"
                  />
                  <input
                    value={nonMedicaments.hospitalisationMotif}
                    onChange={(e) => setNonMedicaments((prev) => ({ ...prev, hospitalisationMotif: e.target.value }))}
                    placeholder="Motif d'hospitalisation"
                    className="rounded-2xl border border-slate-200 p-3 text-sm"
                  />
                  <input
                    value={nonMedicaments.hospitalisationService}
                    onChange={(e) => setNonMedicaments((prev) => ({ ...prev, hospitalisationService: e.target.value }))}
                    placeholder="Service d'hospitalisation"
                    className="rounded-2xl border border-slate-200 p-3 text-sm"
                  />
                </div>
              </section>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}