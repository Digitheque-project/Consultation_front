'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  ArrowLeft, Check, Plus, Trash2, Send,
  Stethoscope, BedDouble, FlaskConical, Pill,
  Sun, Sunset, Info, AlertTriangle, Clock,
  Activity, Microscope,
} from 'lucide-react';
import { createHospitalisationRequest, type HospitalisationCreationPayload } from '@/lib/api/services/hospitalisations';
import { cn } from '@/lib/utils';

interface TriageOrientationProps {
  patient?: {
    nom?: string;
    prenom?: string;
    id?: string;
    age?: string;
    genre?: string;
    motif?: string;
  };
  onRetour?: () => void;
  registrationSaved?: boolean;
}

type Parcours  = 'consultation' | 'hospitalisation' | 'pharmacie' | 'paraclinique';
type Priority  = 'normal' | 'urgent' | 'critique';

// ─── Styles ──────────────────────────────────────────────────────────────────

const INPUT =
  'w-full px-3 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm text-gray-800 placeholder-gray-300 focus:outline-none focus:border-blue-300 focus:bg-white transition-colors';

const LABEL =
  'block text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-1.5';

// ─── Data ────────────────────────────────────────────────────────────────────

const PARCOURS: {
  id: Parcours; icon: React.ElementType; title: string; desc: string;
  iconColor: string; iconBg: string;
}[] = [
  { id: 'consultation',    icon: Stethoscope, title: 'Consultation',    desc: 'Suivi programmé ou avis spécialisé.',      iconColor: 'text-blue-500',   iconBg: 'bg-blue-50'   },
  { id: 'hospitalisation', icon: BedDouble,   title: 'Hospitalisation', desc: 'Admission en unité de soins.',             iconColor: 'text-violet-500', iconBg: 'bg-violet-50' },
  { id: 'paraclinique',    icon: Microscope,  title: 'Paraclinique',    desc: 'Examens biologiques et imagerie.',         iconColor: 'text-teal-500',   iconBg: 'bg-teal-50'   },
  { id: 'pharmacie',       icon: Pill,        title: 'Pharmacie',       desc: 'Médicaments et dispositifs médicaux.',     iconColor: 'text-amber-500',  iconBg: 'bg-amber-50'  },
];

const WEEK = [
  { day: 'Lun 13', matin: { label: '08:00–12:00', status: 'dispo'    }, apmidi: { label: '14:00–18:00', status: 'dispo'    } },
  { day: 'Mar 14', matin: { label: '10:00–12:00', status: 'dispo'    }, apmidi: { label: '14:00–17:00', status: 'dispo'    } },
  { day: 'Mer 15', matin: { label: '08:15–11:30', status: 'selected' }, apmidi: { label: '15:00–18:00', status: 'dispo'    } },
  { day: 'Jeu 16', matin: { label: 'Indisponible',  status: 'indispo' }, apmidi: { label: '14:00–16:00', status: 'dispo'    } },
  { day: 'Ven 17', matin: { label: '08:00–12:00', status: 'dispo'    }, apmidi: { label: '14:00–18:00', status: 'dispo'    } },
  { day: 'Sam 18', matin: { label: '09:00–11:30', status: 'dispo'    }, apmidi: { label: 'Fermé',       status: 'ferme'    } },
];

interface PharmLine  { id: number; category: string; name: string; form: string; dosage: string; unit: string; qty: number }
interface ExamenLine { id: number; type: 'biologie' | 'imagerie' | 'autre'; nom: string; precision: string; urgence: boolean }

const PRIORITY_CFG: Record<string, { label: string; dot: string; active: string }> = {
  normal:   { label: 'Normal',   dot: 'bg-emerald-500', active: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
  urgent:   { label: 'Urgent',   dot: 'bg-orange-400',  active: 'border-orange-200 bg-orange-50 text-orange-700'   },
  critique: { label: 'Critique', dot: 'bg-red-500',     active: 'border-red-200 bg-red-50 text-red-700'            },
};

const TYPE_CFG: Record<string, { label: string; active: string }> = {
  biologie: { label: 'Biologie', active: 'bg-blue-50 text-blue-600 border-blue-200'     },
  imagerie: { label: 'Imagerie', active: 'bg-violet-50 text-violet-600 border-violet-200' },
  autre:    { label: 'Autre',    active: 'bg-gray-100 text-gray-600 border-gray-200'     },
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('bg-white rounded-2xl border border-gray-100 overflow-hidden', className)}>
      {children}
    </div>
  );
}

function CardHeader({ title, accent }: { title: string; accent?: string }) {
  return (
    <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-50">
      <span className={cn('w-1 h-4 rounded-full', accent ?? 'bg-blue-500')} />
      <h2 className="text-sm font-medium text-gray-800">{title}</h2>
    </div>
  );
}

function PriorityBtn({ value, current, onChange }: { value: string; current: string; onChange: (v: string) => void }) {
  const cfg = PRIORITY_CFG[value];
  const on  = current === value;
  return (
    <button
      type="button"
      onClick={() => onChange(value)}
      className={cn(
        'flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border text-xs font-medium transition-colors',
        on ? cfg.active : 'border-gray-100 text-gray-400 hover:bg-gray-50',
      )}
    >
      <span className={cn('w-1.5 h-1.5 rounded-full', on ? cfg.dot : 'bg-gray-300')} />
      {cfg.label}
    </button>
  );
}

function ActionBar({ label, onSubmit, onCancel }: { label: string; onSubmit?: () => void; onCancel?: () => void }) {
  return (
    <div className="px-6 py-4 border-t border-gray-50 flex items-center justify-end gap-3">
      <button
        type="button"
        onClick={onCancel}
        className="px-4 py-2 text-xs font-medium text-gray-500 border border-gray-100 rounded-xl hover:bg-gray-50 transition-colors"
      >
        Annuler
      </button>
      <button
        type="button"
        onClick={onSubmit}
        className="flex items-center gap-2 px-5 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 active:scale-[0.98] rounded-xl transition-all"
      >
        <Send size={13} />
        {label}
      </button>
    </div>
  );
}

// ─── Main ────────────────────────────────────────────────────────────────────

export default function TriageOrientation({ patient, onRetour, registrationSaved }: TriageOrientationProps) {
  const router = useRouter();
  const [parcours, setParcours]         = useState<Parcours>('consultation');
  const [selectedSlot, setSelectedSlot] = useState('Mer15-matin');
  const [priority, setPriority]         = useState<Priority>('normal');

  const [pharmLines, setPharmLines] = useState<PharmLine[]>([
    { id: 1, category: 'Médicament',              name: 'Paracétamol',     form: 'Comprimé',     dosage: '1000 mg', unit: 'Boîte', qty: 2 },
    { id: 2, category: 'Premiers soins',           name: 'Biseptine Spray', form: 'Antiseptique', dosage: '',        unit: 'Unité', qty: 1 },
    { id: 3, category: 'Compléments alimentaires', name: 'Vitamine C',      form: 'Vitamines',    dosage: '1000 mg', unit: 'Boîte', qty: 3 },
  ]);
  const [pharmPriority, setPharmPriority] = useState<'standard' | 'urgent'>('standard');

  const [hospServiceId, setHospServiceId]     = useState('MEDECINE_INTERNE');
  const [hospCommentaire, setHospCommentaire] = useState('');
  const [hospError, setHospError]             = useState<string | null>(null);
  const [hospLoading, setHospLoading]         = useState(false);

  const [examens, setExamens] = useState<ExamenLine[]>([
    { id: 1, type: 'biologie', nom: 'NFS complète',        precision: 'Avec formule leucocytaire', urgence: false },
    { id: 2, type: 'biologie', nom: 'Glycémie à jeun',     precision: '',                          urgence: false },
    { id: 3, type: 'imagerie', nom: 'Radiographie thorax', precision: 'Face + profil',             urgence: true  },
  ]);
  const [paraMotif, setParaMotif]       = useState('');
  const [paraPriority, setParaPriority] = useState<Priority>('normal');

  const handleHospSubmit = async () => {
    setHospError(null);
    setHospLoading(true);
    if (!patient?.id) { setHospError('Identifiant patient manquant.'); setHospLoading(false); return; }
    try {
      await createHospitalisationRequest({
        patientId: patient.id,
        serviceId: hospServiceId,
        dateEntrer: new Date().toISOString(),
        motifHospitalisation: patient.motif || "Demande d'hospitalisation",
        type: 'Hospitalisation',
        commentaire: hospCommentaire,
      });
      router.push('/modules/accueil/hospitalisation');
    } catch (err) {
      setHospError(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setHospLoading(false);
    }
  };

  const pt = patient ?? { nom: 'RAKOTOMALALA', prenom: 'Jean', id: '#CHUA-00441', age: '45 ans', genre: 'Masculin', motif: '' };

  const addPharmLine    = () => setPharmLines(p => [...p, { id: Date.now(), category: 'Médicament', name: '', form: '', dosage: '', unit: 'Boîte', qty: 1 }]);
  const removePharmLine = (id: number) => setPharmLines(p => p.filter(l => l.id !== id));
  const updatePharmLine = (id: number, f: string, v: string | number) => setPharmLines(p => p.map(l => l.id === id ? { ...l, [f]: v } : l));

  const addExamen    = () => setExamens(e => [...e, { id: Date.now(), type: 'biologie', nom: '', precision: '', urgence: false }]);
  const removeExamen = (id: number) => setExamens(e => e.filter(l => l.id !== id));
  const updateExamen = (id: number, f: string, v: string | boolean) => setExamens(e => e.map(l => l.id === id ? { ...l, [f]: v } : l));

  const slotCls = (status: string, key: string) => {
    if (selectedSlot === key)      return 'bg-blue-600 text-white font-medium cursor-pointer';
    if (status === 'dispo')        return 'bg-white text-green-700 border border-green-100 hover:border-green-300 hover:bg-green-50 cursor-pointer';
    if (status === 'indispo')      return 'bg-gray-50 text-gray-300 border border-gray-100 cursor-not-allowed';
    return 'bg-gray-50 text-gray-300 border border-gray-100 cursor-not-allowed';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-6 lg:p-8 max-w-6xl mx-auto space-y-5">

        {/* Bandeau succès inscription */}
        {registrationSaved && (
          <div className="flex items-center gap-2.5 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            <Check size={15} className="shrink-0 text-emerald-500" />
            Patient enregistré avec succès.
          </div>
        )}

        {/* ── Header ── */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {onRetour && (
              <button
                type="button"
                onClick={onRetour}
                className="w-9 h-9 flex items-center justify-center rounded-xl bg-white border border-gray-100 hover:bg-gray-50 text-gray-400 transition-colors"
              >
                <ArrowLeft size={15} />
              </button>
            )}
            <div>
              <h1 className="text-xl font-medium text-gray-900">Triage &amp; Orientation</h1>
              <p className="text-xs text-gray-400 mt-0.5">Orientez le patient vers le bon service</p>
            </div>
          </div>
          <div className="flex items-center gap-2 px-3.5 py-2 bg-white border border-gray-100 rounded-xl">
            <Activity size={12} className="text-emerald-500" />
            <span className="text-xs text-gray-500">Système opérationnel</span>
          </div>
        </div>

        {/* ── Carte patient ── */}
        <Card>
          <div className="px-6 py-4 flex items-center gap-5">
            {/* Avatar */}
            <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0 border border-blue-100">
              <span className="text-sm font-semibold text-blue-500">
                {(pt.nom?.[0] ?? '') + (pt.prenom?.[0] ?? '')}
              </span>
            </div>

            {/* Infos */}
            <div className="flex-1 grid grid-cols-4 gap-6">
              <div>
                <p className={LABEL}>Nom complet</p>
                <p className="text-sm font-medium text-gray-900">{pt.nom} {pt.prenom}</p>
              </div>
              <div>
                <p className={LABEL}>ID Patient</p>
                <span className="inline-block text-[11px] font-medium text-blue-600 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-lg">
                  {pt.id}
                </span>
              </div>
              <div>
                <p className={LABEL}>Âge</p>
                <p className="text-sm font-medium text-gray-900">{pt.age}</p>
              </div>
              <div>
                <p className={LABEL}>Genre</p>
                <span className={cn(
                  'inline-flex text-[11px] font-medium px-2.5 py-0.5 rounded-full border',
                  pt.genre === 'Féminin'
                    ? 'bg-pink-50 text-pink-600 border-pink-100'
                    : 'bg-sky-50 text-sky-600 border-sky-100',
                )}>
                  {pt.genre}
                </span>
              </div>
            </div>
          </div>
          {pt.motif && (
            <div className="px-6 pb-4">
              <div className="flex items-start gap-2.5 bg-gray-50 rounded-xl px-4 py-3">
                <Info size={12} className="text-gray-400 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-gray-500 leading-relaxed">{pt.motif}</p>
              </div>
            </div>
          )}
        </Card>

        {/* ── Étape 1 : Parcours ── */}
        <div className="space-y-3">
          <div className="flex items-center gap-2.5">
            <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] font-semibold flex items-center justify-center">1</span>
            <h2 className="text-sm font-medium text-blue-600">Sélectionner le parcours</h2>
          </div>

          <div className="grid grid-cols-4 gap-3">
            {PARCOURS.map((p) => {
              const on   = parcours === p.id;
              const Icon = p.icon;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setParcours(p.id)}
                  className={cn(
                    'relative text-left p-5 rounded-2xl border-2 transition-all',
                    on
                      ? 'border-blue-500 bg-white'
                      : 'border-gray-100 bg-white hover:border-gray-200',
                  )}
                >
                  {on && (
                    <span className="absolute top-3 right-3 w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center">
                      <Check size={10} className="text-white" strokeWidth={3} />
                    </span>
                  )}
                  <div className={cn(
                    'w-9 h-9 rounded-xl flex items-center justify-center mb-3',
                    on ? p.iconBg : 'bg-gray-100',
                  )}>
                    <Icon size={16} className={on ? p.iconColor : 'text-gray-400'} />
                  </div>
                  <p className={cn('text-[13px] font-medium leading-snug mb-1', on ? 'text-blue-700' : 'text-gray-700')}>
                    {p.title}
                  </p>
                  <p className="text-[11px] text-gray-400 leading-relaxed">{p.desc}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Étape 2 : Formulaire ── */}
        <div className="space-y-3">
          <div className="flex items-center gap-2.5">
            <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] font-semibold flex items-center justify-center">2</span>
            <h2 className="text-sm font-medium text-blue-600">Renseigner les informations</h2>
          </div>

          {/* ══ CONSULTATION ══ */}
          {parcours === 'consultation' && (
            <Card>
              <CardHeader title="Affectation — Consultation externe" />
              <div className="p-6">
                <div className="grid grid-cols-12 gap-6">

                  {/* Params */}
                  <div className="col-span-4 space-y-4">
                    <div>
                      <label className={LABEL}>Spécialité</label>
                      <select className={INPUT}>
                        <option>Cardiologie</option>
                        <option>Généraliste</option>
                        <option>Pédiatrie</option>
                        <option>Neurologie</option>
                      </select>
                    </div>
                    <div>
                      <label className={LABEL}>Médecin</label>
                      <select className={INPUT}>
                        <option>Dr Sarah Randriamampionona</option>
                        <option>Dr Rakoto Jean</option>
                        <option>Dr Rabe Hanta</option>
                      </select>
                    </div>
                    <div>
                      <label className={LABEL}>Semaine du</label>
                      <input type="date" defaultValue="2024-05-13" className={INPUT} />
                    </div>
                    <div>
                      <label className={LABEL}>Priorité</label>
                      <div className="flex gap-1.5">
                        {(['normal', 'urgent', 'critique'] as Priority[]).map(v => (
                          <PriorityBtn key={v} value={v} current={priority} onChange={x => setPriority(x as Priority)} />
                        ))}
                      </div>
                    </div>
                    {selectedSlot && (
                      <div className="p-3 bg-blue-50 rounded-xl border border-blue-100 flex items-center gap-2.5">
                        <Clock size={12} className="text-blue-400 flex-shrink-0" />
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-widest text-blue-400 mb-0.5">Créneau sélectionné</p>
                          <p className="text-xs font-medium text-blue-700">
                            {selectedSlot.replace(/-matin/, ' · Matin').replace(/-apmidi/, ' · Après-midi')}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Calendrier */}
                  <div className="col-span-8">
                    <div className="bg-gray-50 rounded-2xl border border-gray-100 p-4 h-full flex flex-col">
                      <div className="flex items-center justify-between mb-4 flex-shrink-0">
                        <p className="text-xs font-medium text-gray-600">Disponibilités — 13 au 18 Mai 2024</p>
                        <div className="flex items-center gap-4 text-[10px] text-gray-400">
                          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-green-400" />Disponible</span>
                          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-gray-300" />Indisponible</span>
                          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-600" />Sélectionné</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-6 gap-2 flex-1">
                        {WEEK.map((day) => {
                          const mKey = day.day.replace(/\s/g, '') + '-matin';
                          const aKey = day.day.replace(/\s/g, '') + '-apmidi';
                          const active = selectedSlot === mKey || selectedSlot === aKey;
                          return (
                            <div
                              key={day.day}
                              className={cn(
                                'flex flex-col rounded-xl border p-2.5 transition-colors',
                                active ? 'border-blue-200 bg-blue-50/60' : 'border-gray-100 bg-white',
                              )}
                            >
                              <p className={cn('text-[10px] font-semibold mb-3', active ? 'text-blue-700' : 'text-gray-500')}>
                                {day.day}
                              </p>
                              <div className="flex flex-col gap-2 flex-1">
                                {[
                                  { key: mKey, slot: day.matin,  Icon: Sun,    label: 'Matin' },
                                  { key: aKey, slot: day.apmidi, Icon: Sunset, label: 'A-midi' },
                                ].map(({ key, slot, Icon, label }) => (
                                  <div key={key} className="flex-1 flex flex-col">
                                    <p className="text-[9px] text-gray-400 flex items-center gap-1 mb-1 font-semibold uppercase tracking-wide">
                                      <Icon size={8} /> {label}
                                    </p>
                                    <div
                                      onClick={() => (slot.status === 'dispo' || slot.status === 'selected') && setSelectedSlot(key)}
                                      className={cn(
                                        'flex-1 flex items-center justify-center text-[10px] py-1.5 px-1 rounded-lg text-center transition-colors leading-tight',
                                        slotCls(slot.status, key),
                                      )}
                                    >
                                      {slot.label}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <ActionBar label="Confirmer le rendez-vous" />
            </Card>
          )}

          {/* ══ HOSPITALISATION ══ */}
          {parcours === 'hospitalisation' && (
            <Card>
              <CardHeader title="Demande d'hospitalisation" />
              <div className="p-6 grid grid-cols-12 gap-6">

                <div className="col-span-5 space-y-4">
                  <div>
                    <label className={LABEL}>Motif</label>
                    <div className="w-full px-3 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm text-gray-500 cursor-default">
                      {pt.motif || '—'}
                    </div>
                  </div>
                  <div>
                    <label className={LABEL}>Service de destination</label>
                    <select className={INPUT} value={hospServiceId} onChange={e => setHospServiceId(e.target.value)}>
                      <option value="MEDECINE_INTERNE">Médecine Interne</option>
                      <option value="chirurgie">Chirurgie</option>
                      <option value="PEDIATRIE">Pédiatrie</option>
                      <option value="CARDIOLOGIE">Cardiologie</option>
                      <option value="NEUROLOGIE">Neurologie</option>
                    </select>
                  </div>
                  <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-100">
                    <div className="flex items-start gap-2">
                      <Info size={12} className="text-gray-400 mt-0.5 flex-shrink-0" />
                      <p className="text-[11px] text-gray-500 leading-relaxed">
                        L'admission requiert la validation du chef de service. Un lit sera pré-réservé après l'envoi.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="col-span-7 flex flex-col gap-3">
                  <div>
                    <label className={LABEL}>Informations complémentaires</label>
                    <textarea
                      rows={9}
                      placeholder="Diagnostics évoqués, antécédents pertinents, traitements en cours…"
                      className={cn(INPUT, 'resize-none leading-relaxed')}
                      value={hospCommentaire}
                      onChange={e => setHospCommentaire(e.target.value)}
                    />
                  </div>
                  {hospError && (
                    <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-xs text-red-600">{hospError}</div>
                  )}
                  {hospLoading && (
                    <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-xs text-gray-500">
                      Envoi en cours…
                    </div>
                  )}
                </div>
              </div>
              <ActionBar label="Envoyer la demande d'admission" onSubmit={handleHospSubmit} />
            </Card>
          )}

          {/* ══ PARACLINIQUE ══ */}
          {parcours === 'paraclinique' && (
            <Card>
              <CardHeader title="Demande d'examens paracliniques" accent="bg-teal-500" />
              <div className="p-6 space-y-5">

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className={LABEL}>Médecin prescripteur</label>
                    <input type="text" defaultValue="Dr. Jean Dupont" className={INPUT} />
                  </div>
                  <div>
                    <label className={LABEL}>Service demandeur</label>
                    <select className={INPUT}>
                      <option>Urgences</option><option>Médecine Interne</option>
                      <option>Chirurgie</option><option>Consultation externe</option>
                    </select>
                  </div>
                  <div>
                    <label className={LABEL}>Priorité globale</label>
                    <div className="flex gap-1.5">
                      {(['normal', 'urgent', 'critique'] as Priority[]).map(v => (
                        <PriorityBtn key={v} value={v} current={paraPriority} onChange={x => setParaPriority(x as Priority)} />
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pb-3 border-b border-gray-50">
                  <div className="flex items-center gap-2">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">Examens demandés</p>
                    <span className="text-[11px] font-medium text-teal-600 bg-teal-50 border border-teal-100 px-2 py-0.5 rounded-full">
                      {examens.length}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={addExamen}
                    className="flex items-center gap-1.5 text-xs font-medium text-white bg-teal-600 hover:bg-teal-700 active:scale-[0.98] px-4 py-2 rounded-xl transition-all"
                  >
                    <Plus size={13} /> Ajouter un examen
                  </button>
                </div>

                <div className="space-y-2.5">
                  {examens.map((exam, idx) => (
                    <div key={exam.id} className="border border-gray-100 rounded-2xl p-4 bg-gray-50/30 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-teal-100 text-teal-600 text-[10px] font-semibold flex items-center justify-center">
                            {idx + 1}
                          </span>
                          <div className="flex gap-1">
                            {(['biologie', 'imagerie', 'autre'] as const).map(t => (
                              <button
                                key={t}
                                type="button"
                                onClick={() => updateExamen(exam.id, 'type', t)}
                                className={cn(
                                  'text-[11px] font-medium px-2.5 py-1 rounded-lg border transition-colors',
                                  exam.type === t ? TYPE_CFG[t].active : 'bg-white text-gray-400 border-gray-100 hover:bg-gray-50',
                                )}
                              >
                                {TYPE_CFG[t].label}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => updateExamen(exam.id, 'urgence', !exam.urgence)}
                            className={cn(
                              'flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-lg border transition-colors',
                              exam.urgence
                                ? 'bg-orange-50 text-orange-600 border-orange-200'
                                : 'bg-white text-gray-400 border-gray-100 hover:bg-gray-50',
                            )}
                          >
                            <AlertTriangle size={11} /> Urgent
                          </button>
                          <button
                            type="button"
                            onClick={() => removeExamen(exam.id)}
                            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-400 transition-colors"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                      <div className="grid grid-cols-12 gap-3">
                        <div className="col-span-5">
                          <label className={LABEL}>Nom de l'examen</label>
                          <input
                            type="text" value={exam.nom}
                            onChange={e => updateExamen(exam.id, 'nom', e.target.value)}
                            className={INPUT}
                            placeholder={exam.type === 'biologie' ? 'ex: NFS, CRP…' : exam.type === 'imagerie' ? 'ex: Radio thorax…' : 'ex: ECG…'}
                          />
                        </div>
                        <div className="col-span-7">
                          <label className={LABEL}>Précisions / indications</label>
                          <input
                            type="text" value={exam.precision}
                            onChange={e => updateExamen(exam.id, 'precision', e.target.value)}
                            className={INPUT} placeholder="Contexte clinique, préparation requise…"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="pt-4 border-t border-gray-50">
                  <label className={LABEL}>Motif clinique de la demande</label>
                  <textarea
                    rows={3} value={paraMotif}
                    onChange={e => setParaMotif(e.target.value)}
                    placeholder="Symptômes, diagnostic évoqué, contexte justifiant les examens…"
                    className={cn(INPUT, 'resize-none')}
                  />
                </div>
              </div>
              <ActionBar label="Envoyer au laboratoire / imagerie" />
            </Card>
          )}

          {/* ══ PHARMACIE ══ */}
          {parcours === 'pharmacie' && (
            <Card>
              <CardHeader title="Bon d'achat pharmacie" accent="bg-amber-500" />
              <div className="p-6 space-y-5">

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className={LABEL}>Médecin prescripteur</label>
                    <input type="text" defaultValue="Dr. Jean Dupont" className={INPUT} />
                  </div>
                  <div>
                    <label className={LABEL}>N° ONM</label>
                    <input type="text" defaultValue="12345-INT" className={INPUT} />
                  </div>
                  <div>
                    <label className={LABEL}>Unité de soins</label>
                    <select className={INPUT}>
                      <option>Urgences</option><option>Médecine Interne</option><option>Chirurgie</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-between pb-3 border-b border-gray-50">
                  <div className="flex items-center gap-2">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">Produits &amp; dispositifs</p>
                    <span className="text-[11px] font-medium text-blue-600 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-full">
                      {pharmLines.length}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={addPharmLine}
                    className="flex items-center gap-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 active:scale-[0.98] px-4 py-2 rounded-xl transition-all"
                  >
                    <Plus size={13} /> Ajouter une ligne
                  </button>
                </div>

                <div className="space-y-2.5">
                  {pharmLines.map((line, idx) => (
                    <div key={line.id} className="border border-gray-100 rounded-2xl p-4 bg-gray-50/30 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 text-[10px] font-semibold flex items-center justify-center">
                            {idx + 1}
                          </span>
                          <select
                            value={line.category}
                            onChange={e => updatePharmLine(line.id, 'category', e.target.value)}
                            className="text-xs font-medium text-gray-600 bg-transparent border-none outline-none cursor-pointer"
                          >
                            <option>Médicament</option>
                            <option>Premiers soins</option>
                            <option>Compléments alimentaires</option>
                            <option>Dispositif médical</option>
                          </select>
                        </div>
                        <button
                          type="button"
                          onClick={() => removePharmLine(line.id)}
                          className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-400 transition-colors"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                      <div className="grid grid-cols-12 gap-3">
                        <div className="col-span-4">
                          <label className={LABEL}>{line.category === 'Médicament' ? 'Nom du médicament' : 'Nom du produit'}</label>
                          <input type="text" value={line.name} onChange={e => updatePharmLine(line.id, 'name', e.target.value)} className={INPUT} placeholder="Nom…" />
                        </div>
                        <div className="col-span-3">
                          <label className={LABEL}>{line.category === 'Médicament' ? 'Forme galénique' : 'Type'}</label>
                          <select value={line.form} onChange={e => updatePharmLine(line.id, 'form', e.target.value)} className={INPUT}>
                            <option value="">—</option>
                            <option>Comprimé</option><option>Antiseptique</option><option>Vitamines</option>
                            <option>Sirop</option><option>Injection</option><option>Crème</option><option>Gélule</option>
                          </select>
                        </div>
                        <div className="col-span-2">
                          <label className={LABEL}>Dosage</label>
                          <input type="text" value={line.dosage} onChange={e => updatePharmLine(line.id, 'dosage', e.target.value)} className={INPUT} placeholder="500 mg" />
                        </div>
                        <div className="col-span-2">
                          <label className={LABEL}>Unité</label>
                          <select value={line.unit} onChange={e => updatePharmLine(line.id, 'unit', e.target.value)} className={INPUT}>
                            <option>Boîte</option><option>Unité</option><option>Flacon</option><option>Sachet</option><option>Tube</option>
                          </select>
                        </div>
                        <div className="col-span-1">
                          <label className={LABEL}>Qté</label>
                          <input type="number" min={1} value={line.qty} onChange={e => updatePharmLine(line.id, 'qty', parseInt(e.target.value) || 1)} className={INPUT} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-5 pt-4 border-t border-gray-50">
                  <div>
                    <label className={LABEL}>Priorité de délivrance</label>
                    <div className="flex gap-2">
                      {[
                        { id: 'standard' as const, icon: <Info size={12} />,          label: 'Standard' },
                        { id: 'urgent'   as const, icon: <AlertTriangle size={12} />, label: 'Urgent'   },
                      ].map(p => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => setPharmPriority(p.id)}
                          className={cn(
                            'flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border text-xs font-medium transition-colors',
                            pharmPriority === p.id
                              ? p.id === 'urgent'
                                ? 'border-orange-200 bg-orange-50 text-orange-700'
                                : 'border-blue-200 bg-blue-50 text-blue-700'
                              : 'border-gray-100 text-gray-400 hover:bg-gray-50',
                          )}
                        >
                          {p.icon} {p.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className={LABEL}>Instructions au pharmacien</label>
                    <textarea
                      rows={3}
                      placeholder="Substitut autorisé, conseils d'utilisation…"
                      className={cn(INPUT, 'resize-none text-xs')}
                    />
                  </div>
                </div>
              </div>
              <ActionBar label="Envoyer à la pharmacie" />
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}