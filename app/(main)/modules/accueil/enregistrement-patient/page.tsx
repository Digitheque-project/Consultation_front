'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { User, MapPin, Phone, Heart, Building2, Info, CheckCircle2 } from 'lucide-react';
import TriageOrientation from './TriageOrientation';
import { fetchPriseEnCharge, PriseEnCharge } from '@/lib/api/services/prise-en-charge';

interface FormData {
  nom: string;
  prenom: string;
  sexe: string;
  dateNaissance: string;
  cin: string;
  profession: string;
  adresse: string;
  telPersonnel: string;
  telUrgence: string;
  motif: string;
  priseEnCharge: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const getAge = (dateNaissance: string): number | null => {
  if (!dateNaissance) return null;
  const diff = Date.now() - new Date(dateNaissance).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
};

const formatAge = (age: number | null, dateNaissance?: string): string => {
  if (age === null) return '';
  if (age < 0) return 'Date invalide';
  if (age < 2 && dateNaissance) {
    const birthDate = new Date(dateNaissance);
    const now = new Date();
    const months = Math.floor((now.getTime() - birthDate.getTime()) / (1000 * 60 * 60 * 24 * 30.44));
    return `${Math.max(0, months)} mois`;
  }
  return `${age} ans`;
};

const isMinor = (age: number | null): boolean => age !== null && age < 18;

// Required fields list (CIN excluded — handled separately)
const REQUIRED_FIELDS: (keyof FormData)[] = ['nom', 'sexe', 'dateNaissance'];

// ─── Styles ──────────────────────────────────────────────────────────────────

const LABEL = 'block text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-1.5';

const inputBase = (error: boolean) =>
  `w-full px-4 py-2.5 border rounded-xl text-sm placeholder-gray-400 focus:outline-none transition-colors ${error
    ? 'bg-red-50 border-red-300 text-red-800 placeholder-red-300 focus:border-red-400 focus:bg-red-50'
    : 'bg-gray-50 border-gray-200 text-gray-800 focus:border-blue-400 focus:bg-white'
  }`;

const inputBaseWithIcon = (error: boolean) => `${inputBase(error)} pl-9`;

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionHeader({ icon, title, color = 'blue' }: {
  icon: React.ReactNode;
  title: string;
  color?: 'blue' | 'amber' | 'rose';
}) {
  const styles: Record<string, { bg: string; text: string }> = {
    blue: { bg: 'bg-blue-50', text: 'text-blue-500' },
    amber: { bg: 'bg-amber-50', text: 'text-amber-500' },
    rose: { bg: 'bg-rose-50', text: 'text-rose-500' },
  };
  return (
    <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-50">
      <div className={`w-7 h-7 ${styles[color].bg} rounded-lg flex items-center justify-center`}>
        <span className={styles[color].text}>{icon}</span>
      </div>
      <h2 className="text-sm font-semibold text-gray-800">{title}</h2>
    </div>
  );
}

function Field({ label, children, className = '', required, error }: {
  label: string;
  children: React.ReactNode;
  className?: string;
  required?: boolean;
  error?: boolean;
}) {
  return (
    <div className={className}>
      <label className={`${LABEL} ${error ? 'text-red-400' : ''}`}>
        {label}
        {required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      <div className="relative">
        {children}
      </div>
      {error && (
        <p className="mt-1 text-[11px] font-medium text-red-500 flex items-center gap-1">
          <span>⚠</span> Ce champ est requis
        </p>
      )}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function EnregistrementPatient() {
  const [step, setStep] = useState<'form' | 'triage'>('form');
  const [submitted, setSubmitted] = useState(false);

  const [formData, setFormData] = useState<FormData>({
    nom: '',
    prenom: '',
    sexe: '',
    dateNaissance: '',
    cin: '',
    profession: '',
    adresse: '',
    telPersonnel: '+261 34 50 974 56',
    telUrgence: '+261 38 21 500 43',
    motif: '',
    priseEnCharge: '',
  });

  const age = getAge(formData.dateNaissance);
  const minor = isMinor(age);

  const { data: priseEnChargeOptions = [], isLoading: isLoadingPEC, isError: isErrorPEC } =
    useQuery<PriseEnCharge[], Error>({
      queryKey: ['prise-en-charge'],
      queryFn: fetchPriseEnCharge,
      staleTime: 30_000,
      retry: false,
    });

  useEffect(() => {
    if (!formData.priseEnCharge && priseEnChargeOptions.length > 0) {
      const normalOption = priseEnChargeOptions.find(opt => opt.code?.toUpperCase() === 'NORMAL');
      const defaultOption = normalOption || priseEnChargeOptions[0];
      setFormData(prev => ({ ...prev, priseEnCharge: defaultOption.code }));
    }
  }, [formData.priseEnCharge, priseEnChargeOptions]);

  // Trier les options pour mettre NORMAL en premier
  const sortedPriseEnChargeOptions = [...priseEnChargeOptions].sort((a, b) => {
    if (a.code === 'NORMAL') return -1;
    if (b.code === 'NORMAL') return 1;
    return 0;
  });

  const set = (key: keyof FormData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setFormData(prev => ({ ...prev, [key]: e.target.value }));

  // Field-level error: only show after first submit attempt
  const hasError = (field: keyof FormData) =>
    submitted && REQUIRED_FIELDS.includes(field) && !formData[field];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    const allValid = REQUIRED_FIELDS.every(f => !!formData[f]);
    if (allValid) setStep('triage');
  };

  // ── ÉTAPE 2 : Triage ──────────────────────────────────────────────────────
  if (step === 'triage') {
    return (
      <TriageOrientation
        patient={{
          nom: formData.nom || 'M. RAKOTOMALALA',
          prenom: formData.prenom || 'Jean',
          id: '#CHUA-00441',
          age: formatAge(age, formData.dateNaissance) || '45 ans',
          genre: formData.sexe === 'feminin' ? 'Féminin' : 'Masculin',
          motif: formData.motif || 'Aucun motif saisi',
        }}
        onRetour={() => setStep('form')}
      />
    );
  }

  // ── ÉTAPE 1 : Formulaire ──────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-8 max-w-7xl mx-auto mb-8">

        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-[22px] font-semibold text-gray-900 tracking-tight">
              Inscription patient
            </h1>
            <p className="text-[13px] text-gray-400 mt-1">
              Renseignez les informations du nouveau patient
            </p>
          </div>
          {/* <button
            type="button"
            className="flex items-center gap-2 px-4 py-2.5 text-[13px] font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-xl transition-all shadow-sm shadow-blue-200"
          >
            <Calendar size={14} />
            Nouveau rendez-vous
          </button> */}
        </div>

        <form onSubmit={handleSubmit} noValidate className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* ── LEFT COLUMN ─────────────────────────────────────────────── */}
          <div className="lg:col-span-8 space-y-5">

            {/* ── Identité ── */}
            <section className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <SectionHeader icon={<User size={15} />} title="Identité du patient" />

              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-5">

                <Field label="Nom" required error={hasError('nom')}>
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none">
                    <User size={14} className={hasError('nom') ? 'text-red-300' : ''} />
                  </span>
                  <input
                    type="text"
                    placeholder="Entrez le nom"
                    className={inputBaseWithIcon(hasError('nom'))}
                    value={formData.nom}
                    onChange={set('nom')}
                  />
                </Field>

                <Field label="Prénom">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                    <User size={14} className="text-gray-300" />
                  </span>
                  <input
                    type="text"
                    placeholder="Entrez le prénom"
                    className={inputBaseWithIcon(false)}
                    value={formData.prenom}
                    onChange={set('prenom')}
                  />
                </Field>

                <Field label="Sexe" required error={hasError('sexe')}>
                  <select
                    className={inputBase(hasError('sexe'))}
                    value={formData.sexe}
                    onChange={set('sexe')}
                  >
                    <option value="">Sélectionner...</option>
                    <option value="masculin">Masculin</option>
                    <option value="feminin">Féminin</option>
                  </select>
                </Field>

                <Field label="Date de naissance" required error={hasError('dateNaissance')}>
                  <input
                    type="date"
                    className={inputBase(hasError('dateNaissance'))}
                    value={formData.dateNaissance}
                    onChange={set('dateNaissance')}
                    max={new Date().toISOString().split('T')[0]}
                  />
                </Field>

                {/* Âge calculé */}
                {formData.dateNaissance && (
                  <Field label="Âge calculé">
                    <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-semibold ${minor
                        ? 'bg-amber-50 border-amber-200 text-amber-700'
                        : 'bg-gray-50 border-gray-200 text-gray-500'
                      }`}>
                      <span>{formatAge(age, formData.dateNaissance)}</span>
                      {minor && (
                        <span className="ml-auto text-[10px] font-bold uppercase tracking-widest text-amber-500 bg-amber-100 px-2 py-0.5 rounded-full">
                          Mineur
                        </span>
                      )}
                    </div>
                  </Field>
                )}

                {/* CIN — masqué si mineur */}
                {!minor && (
                  <Field label="CIN / Pièce d'identité">
                    <input
                      type="text"
                      placeholder="Numéro d'identité"
                      className={inputBase(false)}
                      value={formData.cin}
                      onChange={set('cin')}
                    />
                  </Field>
                )}

                <Field
                  label="Profession"
                  className={
                    // span 2 cols when CIN is hidden (minor) AND age is shown, to keep layout clean
                    minor && formData.dateNaissance ? 'md:col-span-2' : ''
                  }
                >
                  <input
                    type="text"
                    placeholder="Profession actuelle"
                    className={inputBase(false)}
                    value={formData.profession}
                    onChange={set('profession')}
                  />
                </Field>
              </div>
            </section>

            {/* ── Coordonnées ── */}
            <section className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <SectionHeader icon={<MapPin size={15} />} title="Coordonnées & Contact" />

              <div className="p-6 space-y-5">
                <Field label="Adresse domicile">
                  <input
                    type="text"
                    placeholder="Adresse complète..."
                    className={inputBase(false)}
                    value={formData.adresse}
                    onChange={set('adresse')}
                  />
                </Field>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <Field label="Téléphone personnel">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none">
                      <Phone size={14} />
                    </span>
                    <input
                      type="tel"
                      className={inputBaseWithIcon(false)}
                      value={formData.telPersonnel}
                      onChange={set('telPersonnel')}
                    />
                  </Field>
                  <Field label="Téléphone d'urgence">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none">
                      <Phone size={14} />
                    </span>
                    <input
                      type="tel"
                      className={inputBaseWithIcon(false)}
                      value={formData.telUrgence}
                      onChange={set('telUrgence')}
                    />
                  </Field>
                </div>
              </div>
            </section>

            {/* ── Informations cliniques ── */}
            <section className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <SectionHeader icon={<Heart size={15} />} title="Informations cliniques" color="rose" />

              <div className="p-6">
                <Field label="Motif de la visite / Plaintes">
                  <textarea
                    rows={5}
                    placeholder="Décrivez les symptômes ou le motif de consultation..."
                    className={`${inputBase(false)} resize-y leading-relaxed`}
                    value={formData.motif}
                    onChange={set('motif')}
                  />
                </Field>
              </div>
            </section>
          </div>

          {/* ── RIGHT COLUMN ─────────────────────────────────────────────── */}
          <div className="lg:col-span-4">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm sticky top-24 overflow-hidden">
              <SectionHeader icon={<Building2 size={15} />} title="Prise en charge" />

              {/* Options */}
              <div className="p-5 space-y-2">
                {isLoadingPEC ? (
                  <div className="flex items-center gap-2 text-sm text-gray-400 py-2">
                    <div className="w-4 h-4 border-2 border-blue-300 border-t-transparent rounded-full animate-spin" />
                    Chargement…
                  </div>
                ) : isErrorPEC ? (
                  <div className="text-sm text-red-500">Impossible de charger les options.</div>
                ) : priseEnChargeOptions.length === 0 ? (
                  <div className="text-sm text-gray-400">Aucune option disponible.</div>
                ) : (
                  sortedPriseEnChargeOptions.map((opt) => {
                    const isSelected = formData.priseEnCharge === opt.code;
                    return (
                      <label
                        key={opt.code}
                        className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${isSelected
                            ? 'border-blue-400 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                          }`}
                      >
                        <input
                          type="radio"
                          name="priseEnCharge"
                          value={opt.code}
                          checked={isSelected}
                          onChange={set('priseEnCharge')}
                          className="sr-only"
                        />
                        <span className={`mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${isSelected ? 'border-blue-500 bg-blue-500' : 'border-gray-300 bg-white'
                          }`}>
                          {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </span>
                        <div>
                          <p className={`text-sm font-semibold leading-tight ${isSelected ? 'text-blue-700' : 'text-gray-700'}`}>
                            {opt.libelle}
                          </p>
                          <p className={`text-xs mt-0.5 ${isSelected ? 'text-blue-500' : 'text-gray-400'}`}>
                            {opt.description || 'Aucune description'}
                          </p>
                        </div>
                      </label>
                    );
                  })
                )}
              </div>

              {/* Note assurance */}
              <div className="mx-5 mb-5 p-3.5 bg-blue-50 rounded-xl border border-blue-100">
                <div className="flex items-start gap-2">
                  <Info size={14} className="text-blue-500 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-blue-700 leading-relaxed">
                    Vérifiez les documents justificatifs pour les patients en{' '}
                    <strong>Assurance Tierce</strong> avant de valider.
                  </p>
                </div>
              </div>

              {/* Résumé erreurs si submit raté */}
              {submitted && REQUIRED_FIELDS.some(f => !formData[f]) && (
                <div className="mx-5 mb-4 p-3.5 bg-red-50 rounded-xl border border-red-200">
                  <div className="flex items-start gap-2">
                    <span className="text-red-500 text-sm mt-0.5">⚠</span>
                    <p className="text-xs text-red-600 leading-relaxed font-medium">
                      Veuillez remplir tous les champs obligatoires avant d'enregistrer.
                    </p>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="px-5 pb-5 space-y-2.5">
                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 active:scale-[0.98] text-white text-sm font-semibold py-3 rounded-xl transition-all shadow-sm shadow-green-200"
                >
                  <CheckCircle2 size={16} />
                  Enregistrer le patient
                </button>
                <button
                  type="button"
                  onClick={() => { setSubmitted(false); setFormData(prev => ({ ...prev })); }}
                  className="w-full text-sm font-medium text-gray-500 bg-gray-100 hover:bg-gray-200 active:scale-[0.98] py-3 rounded-xl transition-all"
                >
                  Annuler
                </button>
              </div>
            </div>
          </div>

        </form>
      </div>
    </div>
  );
}