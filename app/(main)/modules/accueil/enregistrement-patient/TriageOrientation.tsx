'use client';

import { useState } from 'react';
import {
  ArrowLeft, Check, Plus, Trash2, Send,
  Stethoscope, BedDouble, FlaskConical, Pill,
  Sun, Sunset, Info, AlertTriangle, Clock,
  ChevronRight, Activity, Microscope,
} from 'lucide-react';

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
}

type Parcours = 'consultation' | 'hospitalisation' | 'pharmacie' | 'paraclinique';
type Priority = 'normal' | 'urgent';

// ─── Styles ──────────────────────────────────────────────────────────────────

const INPUT =
  'w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-blue-400 focus:bg-white transition-colors';
const LABEL =
  'block text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-1.5';

// ─── Data ────────────────────────────────────────────────────────────────────

const PARCOURS: { id: Parcours; icon: React.ElementType; title: string; desc: string; color: string; bg: string }[] = [
  {
    id: 'consultation',
    icon: Stethoscope,
    title: 'Consultation externe',
    desc: 'Suivi programmé ou avis spécialisé.',
    color: 'text-blue-500',
    bg: 'bg-blue-50',
  },
  {
    id: 'hospitalisation',
    icon: BedDouble,
    title: 'Hospitalisation',
    desc: 'Admission en unité de soins.',
    color: 'text-violet-500',
    bg: 'bg-violet-50',
  },
  {
    id: 'paraclinique',
    icon: Microscope,
    title: 'Paraclinique',
    desc: 'Examens biologiques et imagerie.',
    color: 'text-teal-500',
    bg: 'bg-teal-50',
  },
  {
    id: 'pharmacie',
    icon: Pill,
    title: 'Achat pharmacie',
    desc: 'Médicaments et dispositifs médicaux.',
    color: 'text-amber-500',
    bg: 'bg-amber-50',
  },
];

const WEEK = [
  { day: 'Lun 13',  matin: { label: '08:00–12:00', status: 'dispo' },    apmidi: { label: '14:00–18:00', status: 'dispo' } },
  { day: 'Mar 14',  matin: { label: '10:00–12:00', status: 'dispo' },    apmidi: { label: '14:00–17:00', status: 'dispo' } },
  { day: 'Mer 15',  matin: { label: '08:15–11:30', status: 'selected' }, apmidi: { label: '15:00–18:00', status: 'dispo' } },
  { day: 'Jeu 16',  matin: { label: 'Indisponible',  status: 'indispo' }, apmidi: { label: '14:00–16:00', status: 'dispo' } },
  { day: 'Ven 17',  matin: { label: '08:00–12:00', status: 'dispo' },    apmidi: { label: '14:00–18:00', status: 'dispo' } },
  { day: 'Sam 18',  matin: { label: '09:00–11:30', status: 'dispo' },    apmidi: { label: 'Fermé',         status: 'ferme' } },
];

interface PharmLine {
  id: number;
  category: string;
  name: string;
  form: string;
  dosage: string;
  unit: string;
  qty: number;
}

interface ExamenLine {
  id: number;
  type: 'biologie' | 'imagerie' | 'autre';
  nom: string;
  precision: string;
  urgence: boolean;
}

// ─── Priority badge config ────────────────────────────────────────────────────

const PRIORITY_CONFIG: Record<string, { label: string; dot: string; border: string; bg: string; text: string }> = {
  normal:   { label: 'Normal',   dot: 'bg-green-500',  border: 'border-green-300',  bg: 'bg-green-50',  text: 'text-green-700' },
  urgent:   { label: 'Urgent',   dot: 'bg-orange-500', border: 'border-orange-300', bg: 'bg-orange-50', text: 'text-orange-700' },
  critique: { label: 'Critique', dot: 'bg-red-500',    border: 'border-red-300',    bg: 'bg-red-50',    text: 'text-red-700' },
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionCard({ title, children, footer }: { title: string; children: React.ReactNode; footer?: React.ReactNode }) {
  return (
    <section className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2.5">
        <span className="w-1 h-5 bg-blue-600 rounded-full" />
        <h2 className="text-[14px] font-semibold text-gray-900">{title}</h2>
      </div>
      <div className="p-6">{children}</div>
      {footer && (
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-3 bg-gray-50/50">
          {footer}
        </div>
      )}
    </section>
  );
}

function StepBadge({ n, label }: { n: number; label: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-[11px] font-bold flex items-center justify-center flex-shrink-0">
        {n}
      </span>
      <h2 className="text-[14px] font-semibold text-blue-600">{label}</h2>
    </div>
  );
}

function PriorityBtn({ value, current, onChange }: { value: string; current: string; onChange: (v: string) => void }) {
  const cfg = PRIORITY_CONFIG[value];
  const active = current === value;
  return (
    <button
      type="button"
      onClick={() => onChange(value)}
      className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl border text-sm font-medium transition-all ${
        active ? `${cfg.border} ${cfg.bg} ${cfg.text}` : 'border-gray-200 text-gray-500 hover:bg-gray-50'
      }`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${active ? cfg.dot : 'bg-gray-300'}`} />
      {cfg.label}
    </button>
  );
}

function SubmitBtn({ label }: { label: string }) {
  return (
    <>
      <button type="button" className="px-5 py-2.5 text-sm font-medium text-gray-500 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl transition-colors">
        Annuler
      </button>
      <button
        type="button"
        className="flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 active:scale-[0.98] rounded-xl transition-all shadow-sm shadow-blue-200"
      >
        <Send size={14} />
        {label}
      </button>
    </>
  );
}

// ─── Main ────────────────────────────────────────────────────────────────────

export default function TriageOrientation({ patient, onRetour }: TriageOrientationProps) {
  const [parcours, setParcours]         = useState<Parcours>('consultation');
  const [selectedSlot, setSelectedSlot] = useState('Mer15-matin');
  const [priority, setPriority]         = useState<Priority>('normal');

  // Pharmacie
  const [pharmLines, setPharmLines] = useState<PharmLine[]>([
    { id: 1, category: 'Médicament',              name: 'Paracétamol',     form: 'Comprimé',     dosage: '1000 mg', unit: 'Boîte', qty: 2 },
    { id: 2, category: 'Premiers soins',           name: 'Biseptine Spray', form: 'Antiseptique', dosage: '',        unit: 'Unité', qty: 1 },
    { id: 3, category: 'Compléments alimentaires', name: 'Vitamine C',      form: 'Vitamines',    dosage: '1000 mg', unit: 'Boîte', qty: 3 },
  ]);
  const [pharmPriority, setPharmPriority] = useState<'standard' | 'urgent'>('standard');

  // Paraclinique
  const [examens, setExamens] = useState<ExamenLine[]>([
    { id: 1, type: 'biologie', nom: 'NFS complète',        precision: 'Avec formule leucocytaire', urgence: false },
    { id: 2, type: 'biologie', nom: 'Glycémie à jeun',     precision: '',                          urgence: false },
    { id: 3, type: 'imagerie', nom: 'Radiographie thorax', precision: 'Face + profil',             urgence: true  },
  ]);
  const [paraMotif, setParaMotif]       = useState('');
  const [paraPriority, setParaPriority] = useState<Priority>('normal');

  const pt = patient || { nom: 'RAKOTOMALALA', prenom: 'Jean', id: '#CHUA-00441', age: '45 ans', genre: 'Masculin', motif: '' };

  const addPharmLine    = () => setPharmLines(p => [...p, { id: Date.now(), category: 'Médicament', name: '', form: '', dosage: '', unit: 'Boîte', qty: 1 }]);
  const removePharmLine = (id: number) => setPharmLines(p => p.filter(l => l.id !== id));
  const updatePharmLine = (id: number, field: string, value: string | number) =>
    setPharmLines(p => p.map(l => l.id === id ? { ...l, [field]: value } : l));

  const addExamen    = () => setExamens(e => [...e, { id: Date.now(), type: 'biologie', nom: '', precision: '', urgence: false }]);
  const removeExamen = (id: number) => setExamens(e => e.filter(l => l.id !== id));
  const updateExamen = (id: number, field: string, value: string | boolean) =>
    setExamens(e => e.map(l => l.id === id ? { ...l, [field]: value } : l));

  const slotClass = (status: string, key: string) => {
    if (selectedSlot === key)
      return 'bg-blue-600 text-white font-semibold shadow-sm shadow-blue-200 cursor-pointer';
    if (status === 'dispo')
      return 'bg-white text-green-700 border border-green-200 hover:border-green-400 hover:bg-green-50 cursor-pointer';
    if (status === 'indispo')
      return 'bg-red-50 text-red-400 border border-red-100 cursor-not-allowed';
    return 'bg-gray-100 text-gray-400 cursor-not-allowed';
  };

  const TYPE_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
    biologie: { label: 'Biologie', color: 'text-blue-600',   bg: 'bg-blue-50',   border: 'border-blue-100' },
    imagerie: { label: 'Imagerie', color: 'text-violet-600', bg: 'bg-violet-50', border: 'border-violet-100' },
    autre:    { label: 'Autre',    color: 'text-gray-600',   bg: 'bg-gray-50',   border: 'border-gray-200' },
  };

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-6 max-w-7xl mx-auto space-y-6">

        {/* ── Header ── */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {onRetour && (
              <button
                type="button"
                onClick={onRetour}
                className="w-8 h-8 flex items-center justify-center rounded-xl bg-white border border-gray-200 hover:bg-gray-50 text-gray-500 transition-colors shadow-sm"
              >
                <ArrowLeft size={15} />
              </button>
            )}
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Triage &amp; Orientation</h1>
              <p className="text-[12px] text-gray-400 mt-0.5">Orientez le patient vers le bon service</p>
            </div>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl shadow-sm">
            <Activity size={13} className="text-green-500" />
            <span className="text-[12px] font-medium text-gray-600">Système opérationnel</span>
          </div>
        </div>

        {/* ── Patient Card ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2">
            <span className="w-1 h-4 bg-blue-600 rounded-full" />
            <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400">Patient</p>
          </div>
          <div className="px-5 py-4 flex items-center gap-5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-100 to-blue-50 flex items-center justify-center flex-shrink-0 border border-blue-100">
              <span className="text-base font-bold text-blue-500">
                {(pt.nom?.[0] ?? '') + (pt.prenom?.[0] ?? '')}
              </span>
            </div>
            <div className="flex-1 grid grid-cols-4 gap-4">
              <div>
                <p className={LABEL}>Nom complet</p>
                <p className="text-[13px] font-semibold text-gray-900">{pt.nom} {pt.prenom}</p>
              </div>
              <div>
                <p className={LABEL}>ID Patient</p>
                <span className="inline-block text-[11px] font-semibold text-blue-600 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-md">
                  {pt.id}
                </span>
              </div>
              <div>
                <p className={LABEL}>Âge</p>
                <p className="text-[13px] font-semibold text-gray-900">{pt.age}</p>
              </div>
              <div>
                <p className={LABEL}>Genre</p>
                <span className={`inline-flex text-[11px] font-medium px-2 py-0.5 rounded-full border ${
                  pt.genre === 'Féminin'
                    ? 'bg-pink-50 text-pink-600 border-pink-100'
                    : 'bg-sky-50 text-sky-600 border-sky-100'
                }`}>
                  {pt.genre}
                </span>
              </div>
            </div>
          </div>
          {/* Motif affiché en bas de la carte patient */}
          
        </div>

        {/* ── ÉTAPE 1 : Parcours ── */}
        <section className="space-y-4">
          <StepBadge n={1} label="Sélectionner le parcours" />
          <div className="grid grid-cols-4 gap-3">
            {PARCOURS.map((p) => {
              const isActive = parcours === p.id;
              const Icon = p.icon;
              return (
                <button
                  type="button"
                  key={p.id}
                  onClick={() => setParcours(p.id)}
                  className={`relative text-left p-5 rounded-2xl border-2 transition-all group ${
                    isActive
                      ? 'border-blue-600 bg-white shadow-sm shadow-blue-100'
                      : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                  }`}
                >
                  {isActive && (
                    <span className="absolute top-3 right-3 w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center">
                      <Check size={11} className="text-white" strokeWidth={3} />
                    </span>
                  )}
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 transition-colors ${
                    isActive ? p.bg : 'bg-gray-100 group-hover:bg-gray-50'
                  }`}>
                    <Icon size={18} className={isActive ? p.color : 'text-gray-400'} />
                  </div>
                  <p className={`text-[13px] font-semibold leading-snug mb-1 ${isActive ? 'text-blue-700' : 'text-gray-800'}`}>
                    {p.title}
                  </p>
                  <p className="text-[11px] text-gray-400 leading-relaxed">{p.desc}</p>
                </button>
              );
            })}
          </div>
        </section>

        {/* ── ÉTAPE 2 : Formulaire ── */}
        <section className="space-y-3">
          <StepBadge n={2} label="Renseigner les informations" />

          {/* ══ CONSULTATION EXTERNE ══ */}
          {parcours === 'consultation' && (
            <SectionCard
              title="Affectation — Consultation externe"
              footer={<SubmitBtn label="Confirmer le rendez-vous" />}
            >
              <div className="grid grid-cols-12 gap-6 items-stretch">

                {/* Left: params */}
                <div className="col-span-4 flex flex-col">
                  <div className="flex-1 p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-4">
                    <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400">Paramètres</p>

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
                      <div className="flex gap-2">
                        {(['normal', 'urgent', 'critique'] as const).map(p => (
                          <PriorityBtn key={p} value={p} current={priority} onChange={v => setPriority(v as Priority)} />
                        ))}
                      </div>
                    </div>

                    {selectedSlot && (
                      <div className="mt-auto pt-2">
                        <div className="p-3 bg-blue-50 rounded-xl border border-blue-100 flex items-center gap-2.5">
                          <Clock size={13} className="text-blue-500 flex-shrink-0" />
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-blue-400 mb-0.5">Créneau sélectionné</p>
                            <p className="text-[12px] font-semibold text-blue-700">
                              {selectedSlot.replace(/-matin/, ' · Matin').replace(/-apmidi/, ' · Après-midi')}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right: calendar */}
                <div className="col-span-8 flex flex-col">
                  <div className="flex-1 p-4 bg-gray-50 rounded-2xl border border-gray-100 flex flex-col">
                    <div className="flex items-center justify-between mb-4 flex-shrink-0">
                      <p className="text-[12px] font-semibold text-gray-700">
                        Disponibilités — 13 au 18 Mai 2024
                      </p>
                      <div className="flex items-center gap-3 text-[11px] text-gray-500">
                        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-green-400" />Disponible</span>
                        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-400" />Indisponible</span>
                        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-600" />Sélectionné</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-6 gap-2 flex-1">
                      {WEEK.map((day) => {
                        const matinKey  = day.day.replace(/\s/g, '') + '-matin';
                        const apmidiKey = day.day.replace(/\s/g, '') + '-apmidi';
                        const isActiveDay = selectedSlot === matinKey || selectedSlot === apmidiKey;
                        return (
                          <div
                            key={day.day}
                            className={`flex flex-col rounded-xl border p-3 transition-all ${
                              isActiveDay ? 'border-blue-200 bg-blue-50/60' : 'border-gray-200 bg-white'
                            }`}
                          >
                            <p className={`text-[11px] font-bold mb-3 flex-shrink-0 ${isActiveDay ? 'text-blue-700' : 'text-gray-600'}`}>
                              {day.day}
                            </p>
                            <div className="flex flex-col gap-2 flex-1">
                              <div className="flex-1 flex flex-col">
                                <p className="text-[9px] text-gray-400 flex items-center gap-1 mb-1.5 font-semibold uppercase tracking-wide flex-shrink-0">
                                  <Sun size={9} /> Matin
                                </p>
                                <div
                                  onClick={() =>
                                    (day.matin.status === 'dispo' || day.matin.status === 'selected') &&
                                    setSelectedSlot(matinKey)
                                  }
                                  className={`flex-1 flex items-center justify-center text-[10px] py-2 px-1 rounded-lg text-center transition-all leading-tight ${slotClass(day.matin.status, matinKey)}`}
                                >
                                  {day.matin.label}
                                </div>
                              </div>
                              <div className="flex-1 flex flex-col">
                                <p className="text-[9px] text-gray-400 flex items-center gap-1 mb-1.5 font-semibold uppercase tracking-wide flex-shrink-0">
                                  <Sunset size={9} /> A-midi
                                </p>
                                <div
                                  onClick={() => day.apmidi.status === 'dispo' && setSelectedSlot(apmidiKey)}
                                  className={`flex-1 flex items-center justify-center text-[10px] py-2 px-1 rounded-lg text-center transition-all leading-tight ${slotClass(day.apmidi.status, apmidiKey)}`}
                                >
                                  {day.apmidi.label}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </SectionCard>
          )}

          {/* ══ HOSPITALISATION ══ */}
          {parcours === 'hospitalisation' && (
            <SectionCard
              title="Demande d'hospitalisation"
              footer={<SubmitBtn label="Envoyer la demande d'admission" />}
            >
              <div className="grid grid-cols-12 gap-6">

                {/* Left: service only */}
                <div className="col-span-5 space-y-5">
                  <div>
                    <label className={LABEL}>Service de destination</label>
                    <select className={INPUT}>
                      <option value="">Sélectionnez un service…</option>
                      <option>Médecine Interne</option>
                      <option>Chirurgie</option>
                      <option>Pédiatrie</option>
                      <option>Cardiologie</option>
                      <option>Neurologie</option>
                    </select>
                  </div>

                  <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                    <div className="flex items-start gap-2.5">
                      <Info size={14} className="text-blue-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-wider text-blue-600 mb-1">Note administrative</p>
                        <p className="text-[12px] text-blue-700 leading-relaxed">
                          L'admission requiert la validation du chef de service de destination.
                          Un lit sera pré-réservé après l'envoi de cette demande.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Motif de la visite venant de l'enregistrement */}
                  <div>
                    <p className={LABEL}>Motif de la visite</p>
                    <div className={`w-full px-4 py-3 rounded-xl border text-[13px] leading-relaxed ${
                      pt.motif
                        ? 'bg-gray-50 border-gray-200 text-gray-700'
                        : 'bg-gray-50 border-dashed border-gray-200 text-gray-400 italic'
                    }`}>
                      {pt.motif || 'Aucun motif renseigné lors de l\'enregistrement.'}
                    </div>
                    <p className="mt-1.5 text-[10px] text-gray-400 font-medium tracking-wide uppercase">
                      Saisi lors de l'enregistrement du patient
                    </p>
                  </div>
                </div>

                {/* Right: observations */}
                <div className="col-span-7 space-y-2 flex flex-col">
                  <label className={LABEL}>Information complémentaires</label>
                  <textarea
                    rows={10}
                    placeholder="Diagnostics évoqués, antécédents pertinents, traitements en cours, informations complémentaires à transmettre…"
                    className={`${INPUT} resize-none leading-relaxed flex-1`}
                  />
                  {/* <p className="text-[11px] text-gray-400">
                    Ces observations seront jointes à la demande transmise au service de destination.
                  </p> */}
                </div>
              </div>
            </SectionCard>
          )}

          {/* ══ PARACLINIQUE ══ */}
          {parcours === 'paraclinique' && (
            <SectionCard
              title="Demande d'examens paracliniques"
              footer={<SubmitBtn label="Envoyer au laboratoire / imagerie" />}
            >
              <div className="space-y-6">
                <div className="grid grid-cols-3 gap-5">
                  <div>
                    <label className={LABEL}>Médecin prescripteur</label>
                    <input type="text" defaultValue="Dr. Jean Dupont" className={INPUT} />
                  </div>
                  <div>
                    <label className={LABEL}>Service demandeur</label>
                    <select className={INPUT}>
                      <option>Urgences</option>
                      <option>Médecine Interne</option>
                      <option>Chirurgie</option>
                      <option>Consultation externe</option>
                    </select>
                  </div>
                  <div>
                    <label className={LABEL}>Priorité globale</label>
                    <div className="flex gap-2">
                      {(['normal', 'urgent', 'critique'] as const).map(p => (
                        <PriorityBtn key={p} value={p} current={paraPriority} onChange={v => setParaPriority(v as Priority)} />
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pb-1 border-b border-gray-100">
                  <div className="flex items-center gap-2">
                    <p className="text-[12px] font-bold uppercase tracking-widest text-gray-500">Examens demandés</p>
                    <span className="text-[11px] font-semibold text-teal-600 bg-teal-50 border border-teal-100 px-2 py-0.5 rounded-full">
                      {examens.length} examen{examens.length > 1 ? 's' : ''}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={addExamen}
                    className="flex items-center gap-1.5 text-[13px] font-semibold text-white bg-teal-600 hover:bg-teal-700 active:scale-[0.98] px-4 py-2 rounded-xl transition-all"
                  >
                    <Plus size={14} />
                    Ajouter un examen
                  </button>
                </div>

                <div className="space-y-3">
                  {examens.map((exam, idx) => {
                    const cfg = TYPE_CONFIG[exam.type];
                    return (
                      <div key={exam.id} className="border border-gray-100 rounded-2xl p-4 bg-gray-50/40 hover:bg-gray-50 transition-colors">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-teal-100 text-teal-600 text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                              {idx + 1}
                            </span>
                            <div className="flex gap-1">
                              {(['biologie', 'imagerie', 'autre'] as const).map(t => {
                                const c = TYPE_CONFIG[t];
                                return (
                                  <button
                                    key={t}
                                    type="button"
                                    onClick={() => updateExamen(exam.id, 'type', t)}
                                    className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg border transition-all ${
                                      exam.type === t ? `${c.bg} ${c.color} ${c.border}` : 'bg-white text-gray-400 border-gray-200 hover:bg-gray-50'
                                    }`}
                                  >
                                    {c.label}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => updateExamen(exam.id, 'urgence', !exam.urgence)}
                              className={`flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-lg border transition-all ${
                                exam.urgence
                                  ? 'bg-orange-50 text-orange-600 border-orange-200'
                                  : 'bg-white text-gray-400 border-gray-200 hover:bg-gray-50'
                              }`}
                            >
                              <AlertTriangle size={11} />
                              Urgent
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
                              type="text"
                              value={exam.nom}
                              onChange={e => updateExamen(exam.id, 'nom', e.target.value)}
                              className={INPUT}
                              placeholder={exam.type === 'biologie' ? 'ex: NFS, CRP, Glycémie…' : exam.type === 'imagerie' ? 'ex: Radio thorax, Echo abdominale…' : 'ex: ECG, EEG…'}
                            />
                          </div>
                          <div className="col-span-7">
                            <label className={LABEL}>Précisions / indications cliniques</label>
                            <input
                              type="text"
                              value={exam.precision}
                              onChange={e => updateExamen(exam.id, 'precision', e.target.value)}
                              className={INPUT}
                              placeholder="Indications, contexte clinique, préparation requise…"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="pt-2 border-t border-gray-100">
                  <label className={LABEL}>Motif clinique de la demande</label>
                  <textarea
                    rows={3}
                    value={paraMotif}
                    onChange={e => setParaMotif(e.target.value)}
                    placeholder="Symptômes, diagnostic évoqué, contexte justifiant les examens…"
                    className={`${INPUT} resize-none text-[13px]`}
                  />
                </div>
              </div>
            </SectionCard>
          )}

          {/* ══ PHARMACIE ══ */}
          {parcours === 'pharmacie' && (
            <SectionCard
              title="Bon d'achat pharmacie"
              footer={<SubmitBtn label="Envoyer à la pharmacie" />}
            >
              <div className="space-y-6">
                <div className="grid grid-cols-3 gap-5">
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
                      <option>Urgences</option>
                      <option>Médecine Interne</option>
                      <option>Chirurgie</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-between pb-1 border-b border-gray-100">
                  <div className="flex items-center gap-2">
                    <p className="text-[12px] font-bold uppercase tracking-widest text-gray-500">Produits &amp; dispositifs</p>
                    <span className="text-[11px] font-semibold text-blue-600 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-full">
                      {pharmLines.length} ligne{pharmLines.length > 1 ? 's' : ''}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={addPharmLine}
                    className="flex items-center gap-1.5 text-[13px] font-semibold text-white bg-blue-600 hover:bg-blue-700 active:scale-[0.98] px-4 py-2 rounded-xl transition-all"
                  >
                    <Plus size={14} />
                    Ajouter une ligne
                  </button>
                </div>

                <div className="space-y-3">
                  {pharmLines.map((line, idx) => (
                    <div key={line.id} className="border border-gray-100 rounded-2xl p-4 bg-gray-50/40 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                            {idx + 1}
                          </span>
                          <select
                            value={line.category}
                            onChange={e => updatePharmLine(line.id, 'category', e.target.value)}
                            className="text-[12px] font-semibold text-gray-600 bg-transparent border-none outline-none cursor-pointer"
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
                          <input type="text" value={line.dosage} onChange={e => updatePharmLine(line.id, 'dosage', e.target.value)} className={INPUT} placeholder="ex: 500 mg" />
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

                <div className="grid grid-cols-2 gap-5 pt-2 border-t border-gray-100">
                  <div>
                    <label className={LABEL}>Priorité de délivrance</label>
                    <div className="flex gap-3">
                      {[
                        { id: 'standard' as const, icon: <Info size={13} />, label: 'Standard' },
                        { id: 'urgent'   as const, icon: <AlertTriangle size={13} />, label: 'Urgent' },
                      ].map(p => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => setPharmPriority(p.id)}
                          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border text-[13px] font-medium transition-all ${
                            pharmPriority === p.id
                              ? p.id === 'urgent'
                                ? 'border-orange-300 bg-orange-50 text-orange-700'
                                : 'border-blue-300 bg-blue-50 text-blue-700'
                              : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                          }`}
                        >
                          {p.icon}{p.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className={LABEL}>Instructions au pharmacien</label>
                    <textarea rows={3} placeholder="Substitut autorisé, conseils d'utilisation spécifiques…"
                      className={`${INPUT} resize-none text-[12px]`} />
                  </div>
                </div>
              </div>
            </SectionCard>
          )}
        </section>
      </div>
    </div>
  );
}