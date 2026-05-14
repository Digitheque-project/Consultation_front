'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  User, MapPin, Phone, Heart, Building2, Info,
  CheckCircle2, UserPlus, AlertCircle,
} from 'lucide-react';
import TriageOrientation from './TriageOrientation';
import { fetchPriseEnCharge, PriseEnCharge } from '@/lib/api/services/prise-en-charge';
import {
  getRegisterApiErrorMessage,
  registerPatient,
  updateRegisteredPatient,
  type RegisterPatientPayload,
} from '@/lib/api/services/patient-registration';
import { readMockSessionFromBrowser } from '@/lib/auth/mock-auth-browser';
import { cn } from '@/lib/utils';

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

const INITIAL_FORM: FormData = {
  nom: '', prenom: '', sexe: '', dateNaissance: '', cin: '',
  profession: '', adresse: '', telPersonnel: '', telUrgence: '',
  motif: '', priseEnCharge: '',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getAge = (dateNaissance: string): number | null => {
  if (!dateNaissance) return null;
  const diff = Date.now() - new Date(dateNaissance).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
};

const formatAge = (age: number | null, dateNaissance?: string): string => {
  if (age === null) return '';
  if (age < 0) return 'Date invalide';
  if (age < 2 && dateNaissance) {
    const months = Math.floor(
      (Date.now() - new Date(dateNaissance).getTime()) / (1000 * 60 * 60 * 24 * 30.44)
    );
    return `${Math.max(0, months)} mois`;
  }
  return `${age} ans`;
};

const isMinor = (age: number | null): boolean => age !== null && age < 18;

function mapSexeToApi(sexe: string): 'MALE' | 'FEMALE' | null {
  if (sexe === 'masculin') return 'MALE';
  if (sexe === 'feminin') return 'FEMALE';
  return null;
}

function normalizeTel(raw: string): string {
  return raw.replace(/\s/g, '').trim();
}

function buildRegisterPayload(
  formData: FormData, minor: boolean, createdBy: string,
): RegisterPatientPayload | null {
  const sexe = mapSexeToApi(formData.sexe);
  if (!sexe) return null;
  return {
    nom: formData.nom.trim(),
    prenom: formData.prenom.trim(),
    sexe,
    dateNaissance: formData.dateNaissance,
    cin: minor ? '' : formData.cin.trim(),
    profession: formData.profession.trim(),
    adresse: formData.adresse.trim(),
    telephone: normalizeTel(formData.telPersonnel),
    contactUrgence: normalizeTel(formData.telUrgence),
    priseEnChargeCode: formData.priseEnCharge.trim() || 'NORMAL',
    createdBy,
  };
}

const REQUIRED_FIELDS: (keyof FormData)[] = ['nom', 'prenom', 'sexe', 'dateNaissance'];

function isFieldInvalid(field: keyof FormData, minor: boolean, formData: FormData) {
  if (field === 'cin') return !minor && !formData.cin.trim();
  return !formData[field];
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionCard({
  icon, title, color = 'blue', children,
}: {
  icon: React.ReactNode;
  title: string;
  color?: 'blue' | 'rose' | 'amber';
  children: React.ReactNode;
}) {
  const accent: Record<string, string> = {
    blue:  'bg-blue-50 text-blue-500',
    rose:  'bg-rose-50 text-rose-500',
    amber: 'bg-amber-50 text-amber-500',
  };
  return (
    <section className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-50">
        <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center', accent[color])}>
          {icon}
        </div>
        <h2 className="text-sm font-medium text-gray-800">{title}</h2>
      </div>
      <div className="p-6">{children}</div>
    </section>
  );
}

function Field({
  label, required, error, hint, className = '', children,
}: {
  label: string;
  required?: boolean;
  error?: boolean;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <label className={cn(
        'block text-[10px] font-semibold uppercase tracking-widest mb-1.5',
        error ? 'text-red-400' : 'text-gray-400',
      )}>
        {label}
        {required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      <div className="relative">{children}</div>
      {error && (
        <p className="mt-1.5 text-[11px] text-red-500 flex items-center gap-1">
          <AlertCircle size={11} />
          Ce champ est requis
        </p>
      )}
      {hint && !error && (
        <p className="mt-1.5 text-[11px] text-gray-400">{hint}</p>
      )}
    </div>
  );
}

const inputCls = (error: boolean, withIcon = false) =>
  cn(
    'w-full py-2.5 border rounded-xl text-sm placeholder-gray-300 transition-colors focus:outline-none',
    withIcon ? 'pl-9 pr-4' : 'px-4',
    error
      ? 'bg-red-50 border-red-200 text-red-800 placeholder-red-300 focus:border-red-400'
      : 'bg-gray-50 border-gray-100 text-gray-800 focus:border-blue-300 focus:bg-white',
  );

function InputIcon({ children }: { children: React.ReactNode }) {
  return (
    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none">
      {children}
    </span>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function EnregistrementPatient() {
  const [step, setStep]               = useState<'form' | 'triage'>('form');
  const [submitted, setSubmitted]     = useState(false);
  const [patientId, setPatientId]     = useState<string | null>(null);
  const [saveLoading, setSaveLoading] = useState(false);
  const [apiError, setApiError]       = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [formData, setFormData]       = useState<FormData>({ ...INITIAL_FORM });

  const age   = getAge(formData.dateNaissance);
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
      const normal = priseEnChargeOptions.find(o => o.code?.toUpperCase() === 'NORMAL');
      setFormData(prev => ({ ...prev, priseEnCharge: (normal ?? priseEnChargeOptions[0]).code }));
    }
  }, [formData.priseEnCharge, priseEnChargeOptions]);

  const sorted = [...priseEnChargeOptions].sort((a, b) =>
    a.code === 'NORMAL' ? -1 : b.code === 'NORMAL' ? 1 : 0,
  );

  const set = (key: keyof FormData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setFormData(prev => ({ ...prev, [key]: e.target.value }));

  const hasError = (field: keyof FormData) =>
    submitted && isFieldInvalid(field, minor, formData);

  const resetNouveauPatient = () => {
    setPatientId(null);
    setFormData({ ...INITIAL_FORM });
    setSubmitted(false);
    setApiError(null);
    setSaveSuccess(false);
    setSaveLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setApiError(null);
    const allValid =
      REQUIRED_FIELDS.every(f => !!formData[f]) && (minor || !!formData.cin.trim());
    if (!allValid) return;

    const createdBy = readMockSessionFromBrowser()?.sub ?? 'unknown';
    const payload   = buildRegisterPayload(formData, minor, createdBy);
    if (!payload) { setApiError('Veuillez sélectionner un sexe valide.'); return; }

    setSaveLoading(true);
    try {
      if (patientId) {
        await updateRegisteredPatient(patientId, payload);
      } else {
        const newId = await registerPatient(payload);
        setPatientId(newId);
      }
      setSaveSuccess(true);
      setStep('triage');
    } catch (err) {
      setApiError(getRegisterApiErrorMessage(err));
    } finally {
      setSaveLoading(false);
    }
  };

  // ── Triage ────────────────────────────────────────────────────────────────
  if (step === 'triage') {
    return (
      <TriageOrientation
        registrationSaved={saveSuccess}
        patient={{
          nom: formData.nom,
          prenom: formData.prenom,
          id: patientId ?? '—',
          age: formatAge(age, formData.dateNaissance) || '—',
          genre: formData.sexe === 'feminin' ? 'Féminin' : formData.sexe === 'masculin' ? 'Masculin' : '—',
          motif: formData.motif.trim() || 'Aucun motif saisi',
        }}
        onRetour={() => { setSaveSuccess(false); setStep('form'); }}
      />
    );
  }

  // ── Formulaire ────────────────────────────────────────────────────────────
  const hasFormErrors = submitted && (
    REQUIRED_FIELDS.some(f => !formData[f]) || (!minor && !formData.cin.trim())
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-6 lg:p-8 max-w-6xl mx-auto">

        {/* ── Header ── */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-8">
          <div>
            <h1 className="text-xl font-medium text-gray-900 tracking-tight">
              Inscription patient
            </h1>
            <p className="text-xs text-gray-400 mt-1">
              Renseignez les informations du nouveau patient
            </p>
            {patientId && (
              <p className="text-xs text-blue-600 font-medium mt-1.5">
                Dossier en cours · ID : {patientId}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={resetNouveauPatient}
            className="inline-flex items-center gap-2 self-start px-4 py-2.5 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-100 hover:bg-blue-100 rounded-xl transition-colors"
          >
            <UserPlus size={14} />
            Nouveau patient
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate className="grid grid-cols-1 lg:grid-cols-12 gap-5">

          {/* ── Colonne gauche ── */}
          <div className="lg:col-span-8 space-y-5">

            {/* Identité */}
            <SectionCard icon={<User size={14} />} title="Identité du patient">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

                <Field label="Nom" required error={hasError('nom')}>
                  <InputIcon><User size={13} className={hasError('nom') ? 'text-red-300' : ''} /></InputIcon>
                  <input
                    type="text"
                    placeholder="Nom de famille"
                    className={inputCls(hasError('nom'), true)}
                    value={formData.nom}
                    onChange={set('nom')}
                  />
                </Field>

                <Field label="Prénom">
                  <InputIcon><User size={13} /></InputIcon>
                  <input
                    type="text"
                    placeholder="Prénom(s)"
                    className={inputCls(false, true)}
                    value={formData.prenom}
                    onChange={set('prenom')}
                  />
                </Field>

                <Field label="Sexe" required error={hasError('sexe')}>
                  <select
                    className={inputCls(hasError('sexe'))}
                    value={formData.sexe}
                    onChange={set('sexe')}
                  >
                    <option value="">Sélectionner…</option>
                    <option value="masculin">Masculin</option>
                    <option value="feminin">Féminin</option>
                  </select>
                </Field>

                <Field label="Date de naissance" required error={hasError('dateNaissance')}>
                  <input
                    type="date"
                    className={inputCls(hasError('dateNaissance'))}
                    value={formData.dateNaissance}
                    onChange={set('dateNaissance')}
                    max={new Date().toISOString().split('T')[0]}
                  />
                </Field>

                {/* Âge calculé */}
                {formData.dateNaissance && (
                  <Field label="Âge calculé">
                    <div className={cn(
                      'flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium',
                      minor
                        ? 'bg-amber-50 border-amber-100 text-amber-700'
                        : 'bg-gray-50 border-gray-100 text-gray-600',
                    )}>
                      {formatAge(age, formData.dateNaissance)}
                      {minor && (
                        <span className="ml-auto text-[10px] font-semibold uppercase tracking-widest text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">
                          Mineur
                        </span>
                      )}
                    </div>
                  </Field>
                )}

                {/* CIN — masqué si mineur */}
                {!minor && (
                  <Field label="CIN / Pièce d'identité" required error={hasError('cin')}>
                    <input
                      type="text"
                      placeholder="Numéro d'identité"
                      className={inputCls(hasError('cin'))}
                      value={formData.cin}
                      onChange={set('cin')}
                    />
                  </Field>
                )}

                <Field
                  label="Profession"
                  className={minor && formData.dateNaissance ? 'md:col-span-2' : ''}
                >
                  <input
                    type="text"
                    placeholder="Profession actuelle"
                    className={inputCls(false)}
                    value={formData.profession}
                    onChange={set('profession')}
                  />
                </Field>
              </div>
            </SectionCard>

            {/* Coordonnées */}
            <SectionCard icon={<MapPin size={14} />} title="Coordonnées & Contact">
              <div className="space-y-5">
                <Field label="Adresse domicile">
                  <input
                    type="text"
                    placeholder="Adresse complète"
                    className={inputCls(false)}
                    value={formData.adresse}
                    onChange={set('adresse')}
                  />
                </Field>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <Field label="Téléphone personnel">
                    <InputIcon><Phone size={13} /></InputIcon>
                    <input
                      type="tel"
                      placeholder="+261 34 …"
                      className={inputCls(false, true)}
                      value={formData.telPersonnel}
                      onChange={set('telPersonnel')}
                    />
                  </Field>
                  <Field label="Téléphone d'urgence">
                    <InputIcon><Phone size={13} /></InputIcon>
                    <input
                      type="tel"
                      placeholder="+261 34 …"
                      className={inputCls(false, true)}
                      value={formData.telUrgence}
                      onChange={set('telUrgence')}
                    />
                  </Field>
                </div>
              </div>
            </SectionCard>

            {/* Informations cliniques */}
            <SectionCard icon={<Heart size={14} />} title="Informations cliniques" color="rose">
              <Field label="Motif de la visite">
                <textarea
                  rows={4}
                  placeholder="Décrivez les symptômes ou le motif de consultation…"
                  className={cn(inputCls(false), 'resize-y leading-relaxed')}
                  value={formData.motif}
                  onChange={set('motif')}
                />
              </Field>
            </SectionCard>
          </div>

          {/* ── Colonne droite ── */}
          <div className="lg:col-span-4">
            <div className="bg-white rounded-2xl border border-gray-100 sticky top-24 overflow-hidden">

              {/* Header prise en charge */}
              <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-50">
                <div className="w-7 h-7 bg-blue-50 text-blue-500 rounded-lg flex items-center justify-center">
                  <Building2 size={14} />
                </div>
                <h2 className="text-sm font-medium text-gray-800">Prise en charge</h2>
              </div>

              {/* Options */}
              <div className="p-4 space-y-2">
                {isLoadingPEC ? (
                  <div className="flex items-center gap-2 text-xs text-gray-400 py-2">
                    <div className="w-3.5 h-3.5 border-2 border-blue-300 border-t-transparent rounded-full animate-spin" />
                    Chargement…
                  </div>
                ) : isErrorPEC ? (
                  <p className="text-xs text-red-500">Impossible de charger les options.</p>
                ) : sorted.length === 0 ? (
                  <p className="text-xs text-gray-400">Aucune option disponible.</p>
                ) : sorted.map((opt) => {
                  const selected = formData.priseEnCharge === opt.code;
                  return (
                    <label
                      key={opt.code}
                      className={cn(
                        'flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-colors',
                        selected
                          ? 'border-blue-200 bg-blue-50'
                          : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50',
                      )}
                    >
                      <input
                        type="radio"
                        name="priseEnCharge"
                        value={opt.code}
                        checked={selected}
                        onChange={set('priseEnCharge')}
                        className="sr-only"
                      />
                      {/* Radio circle */}
                      <span className={cn(
                        'mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors',
                        selected ? 'border-blue-500 bg-blue-500' : 'border-gray-300 bg-white',
                      )}>
                        {selected && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </span>
                      <div>
                        <p className={cn(
                          'text-sm font-medium leading-tight',
                          selected ? 'text-blue-700' : 'text-gray-700',
                        )}>
                          {opt.libelle}
                        </p>
                        <p className={cn(
                          'text-xs mt-0.5 leading-snug',
                          selected ? 'text-blue-400' : 'text-gray-400',
                        )}>
                          {opt.description || 'Aucune description'}
                        </p>
                      </div>
                    </label>
                  );
                })}
              </div>

              {/* Note assurance */}
              <div className="mx-4 mb-4 p-3 bg-gray-50 rounded-xl border border-gray-100">
                <div className="flex items-start gap-2">
                  <Info size={12} className="text-gray-400 mt-0.5 flex-shrink-0" />
                  <p className="text-[11px] text-gray-500 leading-relaxed">
                    Vérifiez les documents pour les patients en{' '}
                    <strong className="text-gray-600">Assurance Tierce</strong> avant de valider.
                  </p>
                </div>
              </div>

              {/* Erreurs */}
              {hasFormErrors && (
                <div className="mx-4 mb-3 p-3 bg-red-50 rounded-xl border border-red-100">
                  <div className="flex items-start gap-2">
                    <AlertCircle size={12} className="text-red-400 mt-0.5 flex-shrink-0" />
                    <p className="text-[11px] text-red-600 leading-relaxed font-medium">
                      Veuillez remplir tous les champs obligatoires.
                    </p>
                  </div>
                </div>
              )}

              {apiError && (
                <div className="mx-4 mb-3 p-3 bg-red-50 rounded-xl border border-red-100">
                  <div className="flex items-start gap-2">
                    <AlertCircle size={12} className="text-red-400 mt-0.5 flex-shrink-0" />
                    <p className="text-[11px] text-red-600 leading-relaxed font-medium">{apiError}</p>
                  </div>
                </div>
              )}

              {/* Boutons */}
              <div className="px-4 pb-4 space-y-2">
                <button
                  type="submit"
                  disabled={saveLoading}
                  className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98] text-white text-sm font-medium py-2.5 rounded-xl transition-all"
                >
                  {saveLoading ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/60 border-t-transparent rounded-full animate-spin" />
                      Enregistrement…
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={15} />
                      Suivant
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => { setSubmitted(false); setApiError(null); }}
                  className="w-full text-xs font-medium text-gray-500 bg-gray-50 hover:bg-gray-100 active:scale-[0.98] py-2.5 rounded-xl transition-all border border-gray-100"
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