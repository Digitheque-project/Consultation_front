'use client';

import { useEffect, useState } from 'react';
import {
  X,
  Edit,
  FileText,
  User,
  CreditCard,
  Calendar,
  Briefcase,
  Phone,
  AlertTriangle,
  MapPin,
  ClipboardList,
  Lock,
  Save,
  XCircle,
} from 'lucide-react';
import type { Patient } from '@/lib/api/services/patients';

type PatientDetailsModalProps = {
  open: boolean;
  patient?: Patient | null;
  onClose: () => void;
  onSave?: (updated: Patient) => void;
};

const formatDate = (dateString?: string): string => {
  if (!dateString) return '-';
  try {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  } catch {
    return dateString;
  }
};

const toInputDate = (dateString?: string): string => {
  if (!dateString) return '';
  try {
    return new Date(dateString).toISOString().split('T')[0];
  } catch {
    return '';
  }
};

const formatSexe = (sexe?: string): string => {
  if (!sexe) return '-';
  const map: Record<string, string> = {
    MALE: 'Masculin',
    FEMALE: 'Féminin',
    M: 'Masculin',
    F: 'Féminin',
  };
  return map[sexe] ?? sexe;
};

const getInitials = (nom?: string, prenom?: string): string => {
  return ((nom?.[0] ?? '') + (prenom?.[0] ?? '')).toUpperCase() || '?';
};

export function PatientDetailsModal({ open, patient, onClose, onSave }: PatientDetailsModalProps) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Partial<Patient>>({});

  useEffect(() => {
    if (!open) {
      setEditing(false);
      setForm({});
    }
  }, [open]);

  useEffect(() => {
    if (patient) setForm(patient);
  }, [patient]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (editing) {
          handleCancel();
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, editing, onClose]);

  if (!open || !patient) return null;

  const handleChange = (field: keyof Patient, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleCancel = () => {
    setForm(patient);
    setEditing(false);
  };

  const handleSave = () => {
    onSave?.({ ...patient, ...form } as Patient);
    setEditing(false);
  };

  const displayName = `${form.nom ?? patient.nom} ${form.prenom ?? patient.prenom ?? ''}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={() => (editing ? handleCancel() : onClose())}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-2xl flex flex-col max-h-[90vh] rounded-3xl border border-gray-100 bg-white shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between gap-4 px-6 py-5">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 text-base font-semibold">
              {getInitials(form.nom, form.prenom)}
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.22em] text-gray-400 font-medium">
                {editing ? 'Modification du dossier' : 'Dossier patient'}
              </p>
              <h2 className="text-xl font-semibold text-gray-900 mt-0.5 leading-tight">
                {displayName.trim() || '—'}
              </h2>
              <div className="flex items-center gap-2 mt-1">
                <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-500">
                  ID : {patient.id}
                </span>
                {editing ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-400 inline-block" />
                    En cours de modification
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-[11px] font-medium text-green-700">
                    <span className="h-1.5 w-1.5 rounded-full bg-green-500 inline-block" />
                    Actif
                  </span>
                )}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => (editing ? handleCancel() : onClose())}
            className="inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-400 transition hover:bg-gray-50 hover:text-gray-600"
            aria-label="Fermer"
          >
            <X size={16} />
          </button>
        </div>

        <div className="mx-6 border-t border-gray-100" />

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

          {/* Informations personnelles */}
          <section>
            <SectionTitle icon={<User size={12} />} label="Informations personnelles" />
            <div className="grid gap-2 sm:grid-cols-2 mb-2">
              {editing ? (
                <>
                  <EditField label="Nom" icon={<User size={13} />}>
                    <input
                      className={inputClass}
                      value={form.nom ?? ''}
                      onChange={(e) => handleChange('nom', e.target.value)}
                      placeholder="Nom"
                    />
                  </EditField>
                  <EditField label="Prénom" icon={<User size={13} />}>
                    <input
                      className={inputClass}
                      value={form.prenom ?? ''}
                      onChange={(e) => handleChange('prenom', e.target.value)}
                      placeholder="Prénom"
                    />
                  </EditField>
                </>
              ) : (
                <>
                  <Field icon={<User size={13} />} label="Nom" value={patient.nom} />
                  <Field icon={<User size={13} />} label="Prénom" value={patient.prenom ?? '-'} />
                </>
              )}
            </div>
            <div className="grid gap-2 sm:grid-cols-2 mb-2">
              <EditField label="CIN" icon={<CreditCard size={13} />} editing={editing}>
                {editing ? (
                  <input
                    className={inputClass}
                    value={form.cin ?? ''}
                    onChange={(e) => handleChange('cin', e.target.value)}
                    placeholder="CIN"
                  />
                ) : (
                  <FieldValue value={patient.cin ?? '-'} />
                )}
              </EditField>
              <EditField label="Date de naissance" icon={<Calendar size={13} />} editing={editing}>
                {editing ? (
                  <input
                    type="date"
                    className={inputClass}
                    value={toInputDate(form.dateNaissance)}
                    onChange={(e) => handleChange('dateNaissance', e.target.value)}
                  />
                ) : (
                  <FieldValue value={formatDate(patient.dateNaissance)} />
                )}
              </EditField>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <EditField label="Sexe" icon={<User size={13} />} editing={editing}>
                {editing ? (
                  <select
                    className={inputClass}
                    value={form.sexe ?? ''}
                    onChange={(e) => handleChange('sexe', e.target.value)}
                  >
                    <option value="">— Choisir —</option>
                    <option value="MALE">Masculin</option>
                    <option value="FEMALE">Féminin</option>
                  </select>
                ) : (
                  <FieldValue value={formatSexe(patient.sexe)} />
                )}
              </EditField>
              <EditField label="Profession" icon={<Briefcase size={13} />} editing={editing}>
                {editing ? (
                  <input
                    className={inputClass}
                    value={form.profession ?? ''}
                    onChange={(e) => handleChange('profession', e.target.value)}
                    placeholder="Profession"
                  />
                ) : (
                  <FieldValue value={patient.profession ?? '-'} />
                )}
              </EditField>
            </div>
          </section>

          {/* Coordonnées */}
          <section>
            <SectionTitle icon={<Phone size={12} />} label="Coordonnées" />
            <div className="grid gap-2 sm:grid-cols-2 mb-2">
              <EditField label="Téléphone" icon={<Phone size={13} />} editing={editing}>
                {editing ? (
                  <input
                    className={inputClass}
                    value={form.telephone ?? ''}
                    onChange={(e) => handleChange('telephone', e.target.value)}
                    placeholder="Téléphone"
                  />
                ) : (
                  <FieldValue value={patient.telephone ?? '-'} />
                )}
              </EditField>
              <EditField label="Contact d'urgence" icon={<AlertTriangle size={13} />} editing={editing}>
                {editing ? (
                  <input
                    className={inputClass}
                    value={form.contactUrgence ?? ''}
                    onChange={(e) => handleChange('contactUrgence', e.target.value)}
                    placeholder="Contact d'urgence"
                  />
                ) : (
                  <FieldValue value={patient.contactUrgence ?? '-'} />
                )}
              </EditField>
            </div>
            <EditField label="Adresse" icon={<MapPin size={13} />} editing={editing}>
              {editing ? (
                <input
                  className={inputClass}
                  value={form.adresse ?? ''}
                  onChange={(e) => handleChange('adresse', e.target.value)}
                  placeholder="Adresse complète"
                />
              ) : (
                <FieldValue value={patient.adresse ?? '-'} />
              )}
            </EditField>
          </section>

          {/* Informations administratives */}
          <section>
            <SectionTitle icon={<ClipboardList size={12} />} label="Informations administratives" />
            <div className="grid gap-2 sm:grid-cols-2">
              <Field icon={<ClipboardList size={13} />} label="ID prise en charge" value={patient.priseEnChargeId ?? '-'} />
              <Field icon={<Calendar size={13} />} label="Ajouté le" value={formatDate(patient.createdAt)} />
            </div>
          </section>

        </div>

        {/* Footer */}
        <div className="flex-shrink-0 flex items-center justify-between gap-4 border-t border-gray-100 px-6 py-4 bg-gray-50/60">
          <span className="flex items-center gap-1.5 text-[11px] text-gray-400">
            <Lock size={11} />
            Données confidentielles
          </span>
          <div className="flex gap-2">
            {editing ? (
              <>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50"
                >
                  <XCircle size={14} />
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
                >
                  <Save size={14} />
                  Enregistrer
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50 hover:border-gray-300"
                >
                  <Edit size={14} />
                  Modifier
                </button>
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-gray-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-700"
                >
                  <FileText size={14} />
                  Voir le dossier
                </button>
              </>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

/* Styles partagés */
const inputClass =
  'w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 placeholder:text-gray-300';

/* Composants internes */

function SectionTitle({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <span className="flex items-center justify-center h-5 w-5 rounded-md bg-gray-100 text-gray-500" aria-hidden="true">
        {icon}
      </span>
      <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400">
        {label}
      </span>
      <div className="flex-1 border-t border-gray-100" />
    </div>
  );
}

function Field({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white px-4 py-3">
      <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-400 mb-1.5">
        <span className="text-gray-300" aria-hidden="true">{icon}</span>
        {label}
      </p>
      <p className="text-sm font-medium text-gray-900">{value}</p>
    </div>
  );
}

function FieldValue({ value }: { value: string }) {
  return <p className="text-sm font-medium text-gray-900 mt-1">{value}</p>;
}

function EditField({
  label,
  icon,
  editing = true,
  children,
}: {
  label: string;
  icon: React.ReactNode;
  editing?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={`rounded-2xl border px-4 py-3 transition-colors ${editing ? 'border-blue-100 bg-blue-50/30' : 'border-gray-100 bg-white'}`}>
      <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-400 mb-1.5">
        <span className="text-gray-300" aria-hidden="true">{icon}</span>
        {label}
      </p>
      {children}
    </div>
  );
}