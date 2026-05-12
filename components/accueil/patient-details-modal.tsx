'use client';

import { useEffect } from 'react';
import { X } from 'lucide-react';
import type { Patient } from '@/lib/api/services/patients';

type PatientDetailsModalProps = {
  open: boolean;
  patient?: Patient | null;
  onClose: () => void;
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

export function PatientDetailsModal({ open, patient, onClose }: PatientDetailsModalProps) {
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open || !patient) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative z-10 w-full max-w-2xl rounded-3xl border border-gray-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-6 py-5">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-gray-400">Détail du patient</p>
            <h2 className="mt-2 text-xl font-semibold text-gray-900">
              {patient.nom} {patient.prenom ?? ''}
            </h2>
            <p className="text-sm text-gray-500">ID patient : {patient.id}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 transition hover:bg-gray-50"
            aria-label="Fermer"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4 px-6 py-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-3xl bg-gray-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gray-400">Date de naissance</p>
              <p className="mt-2 text-base font-medium text-gray-900">{formatDate(patient.dateNaissance)}</p>
            </div>
            <div className="rounded-3xl bg-gray-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gray-400">Sexe</p>
              <p className="mt-2 text-base font-medium text-gray-900">{formatSexe(patient.sexe)}</p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-3xl bg-gray-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gray-400">Téléphone</p>
              <p className="mt-2 text-base font-medium text-gray-900">{patient.telephone ?? '-'}</p>
            </div>
            <div className="rounded-3xl bg-gray-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gray-400">Adresse</p>
              <p className="mt-2 text-base font-medium text-gray-900">{patient.adresse ?? '-'}</p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-3xl bg-gray-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gray-400">Ajouté le</p>
              <p className="mt-2 text-base font-medium text-gray-900">{formatDate(patient.createdAt)}</p>
            </div>
            <div className="rounded-3xl bg-gray-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gray-400">Dernière mise à jour</p>
              <p className="mt-2 text-base font-medium text-gray-900">{formatDate(patient.updatedAt)}</p>
            </div>
          </div>

          <div className="rounded-3xl bg-blue-50 p-5">
            <p className="text-sm font-semibold text-blue-700">Informations complémentaires</p>
            <p className="mt-2 text-sm text-gray-600">
              Ce modal affiche les détails du patient sélectionné sans alourdir le code de la page principale.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
