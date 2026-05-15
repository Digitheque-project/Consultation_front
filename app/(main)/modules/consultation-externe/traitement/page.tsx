'use client';

import Link from 'next/link';
import { Suspense, useEffect, useState } from 'react';
import { useConsultation, useFinalizeConsultation } from '@/hooks/use-consultations';
import { ConsultationApi } from '@/lib/api/consultation';

type Appointment = {
  id: number;
  t: string;
  n: string;
  a: string;
  g: string;
  s: string;
  u?: number;
  d?: number;
  motif?: string;
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

const mapConsultation = (consultation: ConsultationApi): Appointment => ({
  id: consultation.id,
  t: consultation.heure,
  n: `Patient #${consultation.patientId}`,
  a: new Date(consultation.date).toLocaleDateString('fr-FR'),
  g: consultation.urgence ? 'Urgence' : 'Normal',
  s: consultation.statut?.toUpperCase().replace(/_/g, ' ') || 'EN ATTENTE',
  u: consultation.urgence ? 1 : undefined,
  motif: consultation.observation?.diagnostic ?? '',
});

export default function TraitementPage() {
  const [appointmentId, setAppointmentId] = useState<string | null>(null);
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [activeSection, setActiveSection] = useState<'medicament' | 'non-medicamentaux'>('medicament');

  const { data: consultationData, isLoading: loading, error: queryError } = useConsultation(appointmentId);
  const { mutateAsync: finalizeMutation, isPending: saving } = useFinalizeConsultation();

  // États pour les données dynamiques
  const [observation, setObservation] = useState({ diagnostic: '', notes: '' });
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

  // Fonction pour finaliser la consultation
  const finalizeConsultation = async () => {
    if (!appointmentId) return;

    try {
      const payload = {
        observation: (observation.diagnostic.trim() || observation.notes.trim()) ? {
          diagnostic: observation.diagnostic,
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
      };

      await finalizeMutation({ id: appointmentId, payload });

      alert('Consultation finalisée avec succès!');
      // Rediriger vers la page de prescription
      window.location.href = '/modules/consultation-externe/prescription';
    } catch (err) {
      alert('Erreur lors de la sauvegarde: ' + (err instanceof Error ? err.message : 'Erreur inconnue'));
    }
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const params = new URLSearchParams(window.location.search);
    const consultationId = params.get('consultationId') ?? params.get('id');
    const patientId = params.get('patientId');

    console.log('URL params:', window.location.search);
    console.log('consultationId from URL:', consultationId);
    console.log('patientId from URL:', patientId);

    if (consultationId) {
      setAppointmentId(consultationId);
    }
  }, []);

  useEffect(() => {
    if (consultationData) {
      setAppointment(mapConsultation(consultationData));

      if (consultationData.observation) {
        setObservation({
          diagnostic: consultationData.observation.diagnostic,
          notes: consultationData.observation.notes,
        });
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
    return (
      <div className="min-h-screen bg-slate-50 px-6 py-10">
        <div className="max-w-5xl mx-auto rounded-3xl bg-white p-10 shadow-sm border border-slate-200">
          <p className="text-slate-600">Chargement de l'interface de traitement...</p>
        </div>
      </div>
    );
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

  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50 px-6 py-10"><div className="max-w-5xl mx-auto rounded-3xl bg-white p-10 shadow-sm border border-slate-200"><p className="text-slate-600">Chargement de l'interface de traitement...</p></div></div>}>
      <div className="bg-slate-50 py-8 px-6">
        <div className="max-w-7xl mx-auto">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Traitement de consultation</h1>
            <p className="text-sm text-slate-500">Interface de prescription et de suivi du patient.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/modules/consultation-externe/prescription" className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200">
              Prescription
            </Link>
            <Link href="/modules/consultation-externe/consultations-waiting" className="rounded-full bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800">
              Consultations en attente
            </Link>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
          <section className="space-y-6 rounded-3xl bg-white p-6 shadow-sm border border-slate-100">
            <div className="flex items-center justify-between gap-6">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">{appointment.n}</h2>
                <p className="text-sm text-slate-500">{appointment.a} • {appointment.g}</p>
              </div>
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-700">{appointment.s}</span>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Rendez-vous</p>
                <p className="mt-2 text-sm font-bold text-slate-800">{appointment.t}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Statut</p>
                <p className="mt-2 text-sm font-bold text-slate-800">{appointment.s}</p>
              </div>
            </div>
            <div className="rounded-3xl border border-slate-100 bg-slate-50 p-5">
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-slate-400">Raison</p>
              <p className="mt-3 text-sm text-slate-700">{appointment.motif || 'Aucun motif renseigné.'}</p>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-bold text-slate-700">Observations médicales</label>
                <textarea
                  value={observation.notes}
                  onChange={(e) => setObservation({ ...observation, notes: e.target.value })}
                  className="mt-2 w-full min-h-[120px] rounded-3xl border border-slate-200 bg-white p-4 text-sm text-slate-700 outline-none focus:border-blue-700"
                  placeholder="Notes d'observation sur le patient..."
                />
              </div>
              <div>
                <label className="text-sm font-bold text-slate-700">Diagnostic</label>
                <input
                  type="text"
                  value={observation.diagnostic}
                  onChange={(e) => setObservation({ ...observation, diagnostic: e.target.value })}
                  className="mt-2 w-full rounded-3xl border border-slate-200 bg-white p-4 text-sm text-slate-700 outline-none focus:border-blue-700"
                  placeholder="Diagnostic principal..."
                />
              </div>
            </div>
          </section>

          <aside className="space-y-5 rounded-3xl bg-white p-6 shadow-sm border border-slate-100">
            <div>
              <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Contact</p>
              <p className="mt-2 text-sm font-semibold text-slate-900">Patient inconnu</p>
              <p className="text-sm text-slate-500">Information disponible après enregistrement.</p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Statut</p>
              <p className="mt-2 text-sm font-semibold text-slate-900">{appointment.g}</p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Allergies</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <span className="rounded-full bg-red-100 px-3 py-1 text-[11px] font-semibold text-red-600">Aucune</span>
              </div>
            </div>
          </aside>
        </div>

        <div className="mt-8 rounded-3xl bg-white p-6 shadow-sm border border-slate-100">
          <div className="flex items-center gap-8 border-b border-slate-200 pb-6">
            <button onClick={() => setActiveSection('non-medicamentaux')} className={"flex items-center gap-2 py-4 transition-all " + (activeSection === 'non-medicamentaux' ? 'text-blue-700 border-b-2 border-blue-700 font-bold' : 'text-slate-500 border-b-2 border-transparent hover:text-blue-700 font-medium')}>
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path></svg>
              <span className="text-sm">Prescriptions non médicamenteuses</span>
            </button>
            <button onClick={() => setActiveSection('medicament')} className={"flex items-center gap-2 py-4 transition-all " + (activeSection === 'medicament' ? 'text-blue-700 border-b-2 border-blue-700 font-bold' : 'text-slate-500 border-b-2 border-transparent hover:text-blue-700 font-medium')}>
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path></svg>
              <span className="text-sm">Prescriptions médicamenteuses</span>
            </button>
          </div>

          {activeSection === 'medicament' ? (
            <>
              <div className="space-y-4 pt-6">
                <h4 className="text-lg font-bold text-blue-700">Prescriptions médicamenteuses</h4>
                <div className="bg-white border border-slate-100 rounded-xl overflow-hidden shadow-sm">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-100">
                      <tr>
                        <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">MÉDICAMENT</th>
                        <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">TYPE</th>
                        <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">DOSAGE</th>
                        <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">VOIE</th>
                        <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">QUANTITE</th>
                        <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">DURÉE</th>
                        <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">INSTRUCTIONS</th>
                        <th className="px-4 py-3"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {medicaments.length === 0 ? (
                        <tr className="bg-white">
                          <td colSpan={8} className="px-4 py-8 text-center text-sm text-slate-500">
                            Aucune prescription médicamenteuse ajoutée. Cliquez sur "Ajouter un médicament" pour commencer.
                          </td>
                        </tr>
                      ) : medicaments.map((med) => (
                        <tr key={med.id}>
                          <td className="px-4 py-4">
                            <input
                              type="text"
                              value={med.medicament}
                              onChange={(e) => updateMedicament(med.id, 'medicament', e.target.value)}
                              className="w-full text-xs bg-white border border-slate-200 rounded-lg focus:ring-blue-700 p-3"
                              placeholder="Médicament..."
                            />
                          </td>
                          <td className="px-4 py-4">
                            <input
                              type="text"
                              value={med.forme}
                              onChange={(e) => updateMedicament(med.id, 'forme', e.target.value)}
                              className="w-full text-xs bg-white border border-slate-200 rounded-lg focus:ring-blue-700 p-3"
                              placeholder="Type..."
                            />
                          </td>
                          <td className="px-4 py-4">
                            <input
                              type="text"
                              value={med.dosage}
                              onChange={(e) => updateMedicament(med.id, 'dosage', e.target.value)}
                              className="w-full text-xs bg-white border border-slate-200 rounded-lg focus:ring-blue-700 p-3"
                              placeholder="Dosage..."
                            />
                          </td>
                          <td className="px-4 py-4">
                            <input
                              type="text"
                              value={med.voie}
                              onChange={(e) => updateMedicament(med.id, 'voie', e.target.value)}
                              className="w-full text-xs bg-white border border-slate-200 rounded-lg focus:ring-blue-700 p-3"
                              placeholder="Voie..."
                            />
                          </td>
                          <td className="px-4 py-4">
                            <input
                              type="text"
                              value={med.posologie}
                              onChange={(e) => updateMedicament(med.id, 'posologie', e.target.value)}
                              className="w-full text-xs bg-white border border-slate-200 rounded-lg focus:ring-blue-700 p-3"
                              placeholder="Quantité..."
                            />
                          </td>
                          <td className="px-4 py-4">
                            <input
                              type="text"
                              value={med.duree}
                              onChange={(e) => updateMedicament(med.id, 'duree', e.target.value)}
                              className="w-full text-xs bg-white border border-slate-200 rounded-lg focus:ring-blue-700 p-3"
                              placeholder="Durée..."
                            />
                          </td>
                          <td className="px-4 py-4">
                            <input
                              type="text"
                              value={med.instructions}
                              onChange={(e) => updateMedicament(med.id, 'instructions', e.target.value)}
                              className="w-full text-xs bg-white border border-slate-200 rounded-lg focus:ring-blue-700 p-3"
                              placeholder="Instructions..."
                            />
                          </td>
                          <td className="px-4 py-4">
                            <button type="button" onClick={() => removeMedicament(med.id)} className="text-slate-300 hover:text-red-500 transition-colors">
                              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path></svg>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="p-6">
                    <button type="button" onClick={addMedicament} className="w-full py-4 border-2 border-dashed border-slate-200 rounded-xl text-blue-700 font-bold text-sm flex items-center justify-center gap-2 hover:bg-slate-50 transition-colors"><svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path></svg>Ajouter un médicament</button>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between pt-6 border-t border-slate-200 flex-col gap-4 sm:flex-row sm:gap-0">
                <button type="button" className="px-8 py-3 w-full rounded-full border border-slate-200 bg-slate-100 text-sm font-bold text-slate-700 hover:bg-slate-200 transition-colors sm:w-auto">Annuler</button>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <button type="button" onClick={finalizeConsultation} disabled={saving} className="px-8 py-3 w-full rounded-full bg-emerald-100 text-emerald-700 font-bold text-sm shadow-sm hover:opacity-90 transition-colors sm:w-auto disabled:opacity-50">
                    {saving ? 'Sauvegarde...' : 'Valider la prescription'}
                  </button>
                  <button type="button" onClick={finalizeConsultation} disabled={saving} className="px-8 py-3 w-full rounded-full bg-blue-700 text-white font-bold text-sm shadow-sm hover:bg-blue-800 transition-colors sm:w-auto disabled:opacity-50">
                    {saving ? 'Sauvegarde...' : 'Terminer la consultation'}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-6 pt-6">
                <div className="bg-white rounded-2xl p-6 custom-shadow border-l-4 border-blue-400">
                  <div className="flex items-center space-x-2 text-blue-700 mb-4">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path></svg>
                    <h4 className="font-bold text-sm">Recommandations &amp; Notes</h4>
                  </div>
                  <textarea
                    value={nonMedicaments.recommandationsNotes}
                    onChange={(e) => setNonMedicaments({ ...nonMedicaments, recommandationsNotes: e.target.value })}
                    className="w-full h-32 bg-slate-50 border-none rounded-xl p-4 text-sm text-slate-600 focus:ring-1 focus:ring-blue-700 transition-all"
                    placeholder="Ex: Régime hyposodé, repos strict..."
                  />
                </div>
                <div className="bg-white rounded-2xl p-6 custom-shadow border-l-4 border-orange-400">
                  <div className="flex items-center space-x-2 text-orange-600 mb-4">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path></svg>
                    <h4 className="font-bold text-sm">Contrôle / RDV de suivi</h4>
                  </div>
                  <textarea
                    value={nonMedicaments.rdvMotif}
                    onChange={(e) => setNonMedicaments({ ...nonMedicaments, rdvMotif: e.target.value })}
                    className="w-full h-12 bg-slate-50 border-none rounded-xl p-4 text-sm text-slate-600 focus:ring-1 focus:ring-blue-700 mb-4 transition-all"
                    placeholder="Motif du rdv..."
                  />
                  <div className="flex items-center space-x-2">
                    <div className="flex space-x-1.5">
                      {(['NIVEAU_1', 'NIVEAU_2', 'NIVEAU_3', 'NIVEAU_4'] as const).map((niveau) => (
                        <button
                          key={niveau}
                          onClick={() => setNonMedicaments({ ...nonMedicaments, rdvNiveau: niveau })}
                          className={`w-6 h-6 rounded-full text-[10px] font-bold flex items-center justify-center ${
                            nonMedicaments.rdvNiveau === niveau
                              ? niveau === 'NIVEAU_1' ? 'bg-green-100 text-green-600' :
                                niveau === 'NIVEAU_2' ? 'bg-yellow-100 text-yellow-600' :
                                niveau === 'NIVEAU_3' ? 'bg-orange-100 text-orange-600 border border-orange-300' :
                                'bg-red-100 text-red-600'
                              : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {niveau.split('_')[1]}
                        </button>
                      ))}
                    </div>
                    <input
                      value={nonMedicaments.rdvDate}
                      onChange={(e) => setNonMedicaments({ ...nonMedicaments, rdvDate: e.target.value })}
                      className="flex-1 bg-slate-50 border-none rounded-lg p-2 text-xs text-slate-600"
                      placeholder="mm/dd/yyyy"
                      type="date"
                    />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-6 pt-6">
                <div className="bg-white rounded-2xl p-6 custom-shadow border-l-4 border-purple-400">
                  <div className="flex items-center space-x-2 text-purple-700 mb-4">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path></svg>
                    <h4 className="font-bold text-sm">Demande d'examen para-clinique</h4>
                  </div>
                  <div className="space-y-3">
                    <label className="text-[11px] uppercase tracking-[0.18em] text-slate-400 font-semibold">Service cible</label>
                    <select
                      value={nonMedicaments.examenService}
                      onChange={(e) => setNonMedicaments({ ...nonMedicaments, examenService: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-600 focus:ring-blue-700"
                    >
                      <option value="">Sélectionner un service</option>
                      {examenServices.map((service) => (
                        <option key={service} value={service}>{service}</option>
                      ))}
                    </select>
                    <label className="text-[11px] uppercase tracking-[0.18em] text-slate-400 font-semibold">Motif de demande</label>
                    <textarea
                      value={nonMedicaments.examenMotif}
                      onChange={(e) => setNonMedicaments({ ...nonMedicaments, examenMotif: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm text-slate-600 focus:ring-blue-700 transition-all"
                      placeholder="Motif de la demande d'examen..."
                      rows={4}
                    />
                    <div className="grid grid-cols-3 gap-2 pt-1">
                      {(['STAT', 'URGENTE', 'NORMALE'] as const).map((priorite) => (
                        <button
                          key={priorite}
                          onClick={() => setNonMedicaments({ ...nonMedicaments, examenPriorite: priorite })}
                          className={`py-2 rounded-lg text-[10px] font-bold uppercase tracking-tight ${
                            nonMedicaments.examenPriorite === priorite
                              ? priorite === 'STAT' ? 'bg-red-600 text-white' :
                                priorite === 'URGENTE' ? 'bg-slate-100 text-slate-500' :
                                'bg-slate-100 text-slate-500'
                              : 'bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors'
                          }`}
                        >
                          {priorite}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-2xl p-6 custom-shadow border-l-4 border-blue-700">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-2 text-blue-700">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path></svg>
                      <h4 className="font-bold text-sm">Demande d'hospitalisation</h4>
                    </div>
                    <span className="text-[9px] font-bold bg-blue-50 text-blue-700 px-2 py-0.5 rounded leading-tight text-right">EN<br/>ATTENTE</span>
                  </div>
                  <textarea
                    value={nonMedicaments.hospitalisationMotif}
                    onChange={(e) => setNonMedicaments({ ...nonMedicaments, hospitalisationMotif: e.target.value })}
                    className="w-full h-20 bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm text-slate-600 mb-3 transition-all focus:ring-blue-700"
                    placeholder="Motif d'hospitalisation"
                  />
                  <label className="text-[11px] uppercase tracking-[0.18em] text-slate-400 font-semibold">Service cible</label>
                  <select
                    value={nonMedicaments.hospitalisationService}
                    onChange={(e) => setNonMedicaments({ ...nonMedicaments, hospitalisationService: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-600 focus:ring-blue-700"
                  >
                    <option value="">Sélectionner un service</option>
                    {hospitalisationServices.map((service) => (
                      <option key={service} value={service}>{service}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="bg-white rounded-2xl p-4 custom-shadow flex items-center justify-between mt-8">
                <button className="text-slate-500 font-bold px-8 py-3 hover:text-slate-700">Annuler</button>
                <div className="flex space-x-4">
                  <button onClick={finalizeConsultation} disabled={saving} className="bg-emerald-100 text-slate-900 font-bold px-10 py-3 rounded-xl flex items-center space-x-2 shadow-sm hover:opacity-90 transition-opacity disabled:opacity-50">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path></svg>
                    <span>{saving ? 'Sauvegarde...' : 'Valider la prescription'}</span>
                  </button>
                  <button onClick={finalizeConsultation} disabled={saving} className="bg-blue-700 text-white font-bold px-10 py-3 rounded-xl flex items-center space-x-2 shadow-sm hover:opacity-90 transition-opacity disabled:opacity-50">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path></svg>
                    <span>{saving ? 'Sauvegarde...' : 'Terminer la consultation'}</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
    </Suspense>
  );
}
