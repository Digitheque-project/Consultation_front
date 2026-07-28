'use client';

/**
 * PrescriptionsTab.tsx — CHU-Front
 *
 * Wrapper autour de PrescriptionLayout (importé depuis prescription_frontend).
 * Toute la logique métier (API, états, handlers) est conservée ici.
 * Le rendu visuel est délégué à PrescriptionLayout + les sous-formulaires.
 *
 * CHANGEMENTS vs version précédente :
 *  - Suppression des états activeMainTab / activeFormTab (remplacés par Section de PrescriptionLayout)
 *  - Suppression de tout le JSX inline des formulaires
 *  - Ajout des imports des sous-formulaires
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { RefreshCw } from 'lucide-react';

import { EhrFormSection } from '@/components/clinical/dossier-patient/EhrFormSection';
import { ehr } from '@/lib/clinical/ehr-theme';
import { readDossierPatientPrefill } from '@/lib/clinical/dossier-patient-prefill';
import { useAuth } from '@/context/AuthContext';
import { checkPublicEnv } from '@/lib/env';

// ── Nouveau layout + sous-formulaires ──────────────────────────────────────
import PrescriptionLayout, { type Section } from '@/components/clinical/dossier-patient/PrescriptionLayout';
import MedicaleForm      from '@/components/clinical/dossier-patient/MedicaleForm';
import NonMedicaleForm   from '@/components/clinical/dossier-patient/NonMedicaleForm';
import SurveillanceForm  from '@/components/clinical/dossier-patient/SurveillanceForm';
import TransfusionForm   from '@/components/clinical/dossier-patient/TransfusionForm';
import BlocForm          from '@/components/clinical/dossier-patient/BlocForm';
import HistoriqueForm    from '@/components/clinical/dossier-patient/HistoriqueForm';
import LaboForm          from '@/components/clinical/dossier-patient/para/LaboForm';
import ImagerieForm      from '@/components/clinical/dossier-patient/para/ImagerieForm';
import EEGForm           from '@/components/clinical/dossier-patient/para/EEGForm';
import KineForm          from '@/components/clinical/dossier-patient/para/KineForm';
import EndoscopieForm    from '@/components/clinical/dossier-patient/para/EndoscopieForm';
import DiaryseForm       from '@/components/clinical/dossier-patient/para/DiaryseForm';
import AnapathForm       from '@/components/clinical/dossier-patient/para/AnapathForm';
// ───────────────────────────────────────────────────────────────────────────

const PRESCRIPTION_API_URL      = checkPublicEnv('NEXT_PUBLIC_PRESCRIPTION_URL', process.env.NEXT_PUBLIC_PRESCRIPTION_URL);
const PRESCRIPTION_TOKEN        = process.env.NEXT_PUBLIC_PRESCRIPTION_TOKEN;
const PRESCRIPTION_FRONTEND_URL = process.env.NEXT_PUBLIC_PRESCRIPTION_FRONTEND_URL;
const APP_PUBLIC_URL            = (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_APP_URL) || '';

// ── Types ──────────────────────────────────────────────────────────────────

interface PrescriptionRender {
  id: string;
  patientId: string;
  statut?: string;
  remarques?: string;
  createdAt: string;
  categoriePrescription?: string;
  medicaments?: {
    id: string;
    nom: string;
    dose: string;
    quantite: number;
    voie: string;
    frequence: string;
    duree: string;
  }[];
}


// ── Helpers (conservés intégralement) ─────────────────────────────────────

function stripDiacritics(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}
function normalizeCompact(s: string): string {
  return stripDiacritics(s.toLowerCase()).replace(/[\s_-]+/g, '');
}
function isTypeSansStatut(categorieRaw: string | undefined): boolean {
  const k = normalizeCompact(categorieRaw || '');
  if (!k) return false;
  if (k === 'surveillance' || k.includes('surveillance')) return true;
  if (k.includes('nonmedic') || k === 'nonmedicamenteuse' || k === 'nonmedicamenteux') return true;
  if (k === 'medicamenteuse' || k === 'medicamenteux' || k === 'medicament') return true;
  return false;
}
function extractPrescriptionCategory(item: unknown): string {
  if (!item || typeof item !== 'object') return '';
  const o = item as Record<string, unknown>;
  const keys = [
    'type', 'categorie', 'typePrescription', 'naturePrescription',
    'categoriePrescription', 'kind', 'prescriptionType', 'typeOrdonnance',
    'libelleType',
  ] as const;
  for (const key of keys) {
    const v = o[key];
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  const nested = o.prescription;
  if (nested && typeof nested === 'object') {
    const n = nested as Record<string, unknown>;
    for (const key of keys) {
      const v = n[key];
      if (typeof v === 'string' && v.trim()) return v.trim();
    }
  }
  return '';
}
const TYPE_LABELS: Record<string, string> = {
  'medicale': 'Médicale',
  'non-medicale': 'Non médicamenteuse',
  'surveillance': 'Surveillance',
  'transfusion': 'Transfusion',
  'bloc': 'Bloc opératoire',
  'labo': 'Laboratoire',
  'imagerie': 'Imagerie',
  'anapath': 'Anapath',
  'eeg': 'EEG',
  'kine': 'Kinésithérapie',
  'dialyse': 'Dialyse',
  'endoscopie': 'Endoscopie',
};

function enrichPrescription(item: unknown): PrescriptionRender {
  const base = item as PrescriptionRender;
  const _type = (base as unknown as Record<string, unknown>)['_type'] as string | undefined;
  const categorie = (_type && TYPE_LABELS[_type]) || extractPrescriptionCategory(item) || base.categoriePrescription || '';
  return { ...base, categoriePrescription: categorie || undefined };
}
function normalizePrescriptionList(payload: unknown): PrescriptionRender[] {
  if (Array.isArray(payload)) return payload as PrescriptionRender[];
  if (payload && typeof payload === 'object' && Array.isArray((payload as { data?: unknown }).data)) {
    return (payload as { data: PrescriptionRender[] }).data;
  }
  return [];
}
function isStatutValide(statut: string | undefined): boolean {
  if (!statut) return false;
  const s = stripDiacritics(statut.toLowerCase());
  return s.includes('valid') || s.includes('validee') || s === 'valide' ||
    s.includes('emis') || s.includes('signe') || s.includes('approuv') ||
    s.includes('finalis') || s.includes('termine');
}
function isStatutRefuse(statut: string | undefined): boolean {
  if (!statut) return false;
  const s = stripDiacritics(statut.toLowerCase());
  return s.includes('refus') || s.includes('reject') || s.includes('denied') ||
    s.includes('annul') || s.includes('rejet');
}
function isStatutEnAttente(statut: string | undefined): boolean {
  if (!statut) return true;
  if (isStatutValide(statut) || isStatutRefuse(statut)) return false;
  const s = stripDiacritics(statut.toLowerCase());
  return s.includes('attente') || s.includes('pending') || s.includes('brouillon') ||
    s.includes('draft') || s.includes('encours') || s.includes('en cours') ||
    s.includes('soumis') || s.includes('submitted') || s.includes('a valider') ||
    s.includes('await') || s.includes('nouveau') || s.includes('propose') ||
    s.includes('waiting');
}
type StatutVisuelPrescription = 'valide' | 'attente' | 'refuse' | 'neutre';
function getStatutPrescriptionVisuel(statut: string | undefined): { visuel: StatutVisuelPrescription; label: string } {
  const raw = (statut || '').trim();
  if (!raw) return { visuel: 'attente', label: 'En attente' };
  if (isStatutRefuse(statut)) return { visuel: 'refuse', label: 'Refusé' };
  if (isStatutValide(statut)) return { visuel: 'valide', label: 'Validé' };
  if (isStatutEnAttente(statut)) return { visuel: 'attente', label: 'En attente' };
  return { visuel: 'neutre', label: raw };
}
function statutPillColors(visuel: StatutVisuelPrescription): { bg: string; color: string } {
  switch (visuel) {
    case 'valide':  return { bg: ehr.highlightBlueTint, color: ehr.primary };
    case 'refuse':  return { bg: '#fee2e2', color: '#b91c1c' };
    case 'attente': return { bg: '#fef9c3', color: '#a16207' };
    default:        return { bg: '#f1f5f9', color: '#475569' };
  }
}
function sortPrescriptions(list: PrescriptionRender[]): PrescriptionRender[] {
  const rank = (p: PrescriptionRender): number => {
    if (isTypeSansStatut(p.categoriePrescription)) return 1;
    if (isStatutValide(p.statut)) return 3;
    if (isStatutRefuse(p.statut)) return 0;
    return 2;
  };
  return [...list].sort((a, b) => {
    const ra = rank(a), rb = rank(b);
    if (ra !== rb) return rb - ra;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

// ── Composant principal ────────────────────────────────────────────────────

export function PrescriptionsTab({ patientId }: { patientId: string }) {

  // ── Patient + Prescripteur depuis les sources CHU ───────────────────────
  const prefill = useMemo(() => readDossierPatientPrefill(patientId), [patientId]);
  const { medecin } = useAuth();

  const patient = useMemo(() => {
    const p = prefill?.patient as Record<string, unknown> | null | undefined;
    if (!p) return undefined;
    const pick = (keys: string[]) => keys.map(k => p[k]).find(v => typeof v === 'string' && v) as string | undefined;
    return {
      id:            patientId,
      nom:           pick(['nom', 'lastName', 'familyName', 'name']),
      prenom:        pick(['prenom', 'firstName', 'givenName']),
      dateNaissance: pick(['dateNaissance', 'birthDate', 'date_naissance']),
      sexe:          pick(['sexe', 'gender']),
      groupeSanguin: pick(['groupeSanguin', 'groupe_sanguin', 'bloodGroup']),
      allergies:     Array.isArray(p['allergiesListe']) ? p['allergiesListe'] as string[] : undefined,
      service:       pick(['service', 'ward']),
      chambre:       prefill?.chambreNumero != null ? String(prefill.chambreNumero) : undefined,
      lit:           prefill?.codeLit,
      idPermanent:   patientId.length >= 8
        ? `CHU-${patientId.slice(0, 4).toUpperCase()}-${patientId.slice(4, 8).toUpperCase()}`
        : patientId,
    };
  }, [prefill, patientId]);

  const prescripteur = useMemo(() => ({
    id:      medecin?.id ?? 'user-inconnu',
    nom:     medecin ? `${medecin.prenom} ${medecin.nom}` : 'Médecin',
    prenoms: medecin?.prenom,
    poste:   medecin?.specialite ?? '',
    service: medecin?.specialite ?? '',
  }), [medecin]);

  // Objet patient simplifié pour les sous-formulaires (ils attendent { id, nom, prenom })
  const patientForForms = useMemo(() => ({
    id:     patientId,
    nom:    patient?.nom,
    prenom: patient?.prenom,
  }), [patientId, patient]);

  // Objet prescripteur pour les sous-formulaires
  const prescripteurForForms = useMemo(() => ({
    id:      prescripteur.id,
    nom:     prescripteur.nom,
    prenom:  prescripteur.prenoms,
    service: prescripteur.service,
  }), [prescripteur]);

  // API historique
  const [prescriptions, setPrescriptions] = useState<PrescriptionRender[]>([]);
  const [loading, setLoading]             = useState(false);
  const [error, setError]                 = useState<string | null>(null);

  // ── Fetch historique ────────────────────────────────────────────────────
  const fetchPrescriptions = useCallback(async () => {
    if (!PRESCRIPTION_API_URL || !patientId) return;
    setLoading(true);
    setError(null);
    try {
      const TYPES = [
        'medicale','non-medicale','surveillance','transfusion','bloc',
        'labo','imagerie','anapath','eeg','kine','dialyse','endoscopie',
      ];
      const results = await Promise.allSettled(
        TYPES.map(type =>
          fetch(`${PRESCRIPTION_API_URL}/prescriptions/${type}/patient/${patientId}`)
            .then(r => r.ok ? r.json() : [])
            .then(data => Array.isArray(data) ? data.map((item: unknown) => ({ ...(item as object), _type: type })) : [])
        )
      );
      const all = results.flatMap(r => r.status === 'fulfilled' ? r.value : []);
      const list = normalizePrescriptionList(all).map(enrichPrescription);
      setPrescriptions(sortPrescriptions(list));
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => { fetchPrescriptions(); }, [fetchPrescriptions]);


  // ── Rendu du sous-formulaire actif ──────────────────────────────────────
  const renderForm = (section: Section) => {
    if (section === 'hist') {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <p style={{ fontSize: 13, color: ehr.textMuted, margin: 0 }}>
              Prescriptions créées pour ce patient avec leur statut.
            </p>
            <button
              onClick={fetchPrescriptions}
              disabled={loading}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '6px 12px', borderRadius: 8, border: `1px solid ${ehr.border}`,
                background: 'white', color: ehr.text, fontSize: 12,
                fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              <RefreshCw size={13} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
              Actualiser
            </button>
          </div>
          {error && (
            <div style={{ padding: 12, color: '#b91c1c', background: '#fee2e2', borderRadius: 8, fontSize: 13 }}>
              {error}
            </div>
          )}
          {prescriptions.length === 0 ? (
            <div style={{
              textAlign: 'center', padding: '40px 16px',
              color: ehr.textMuted, border: `1px dashed ${ehr.border}`,
              borderRadius: 12, background: ehr.pageBg,
            }}>
              <p style={{ margin: '0 0 8px', fontWeight: 600 }}>Aucune prescription pour ce patient.</p>
              <p style={{ fontSize: 12, color: ehr.textMuted }}>Saisissez une ordonnance ou cliquez sur Actualiser.</p>
            </div>
          ) : (
            prescriptions.map((pres, idx) => {
              const sansStatut = isTypeSansStatut(pres.categoriePrescription);
              const { visuel, label } = getStatutPrescriptionVisuel(pres.statut);
              const pill = statutPillColors(visuel);
              return (
                <EhrFormSection
                  key={pres.id}
                  title={`${pres.categoriePrescription ? pres.categoriePrescription.charAt(0).toUpperCase() + pres.categoriePrescription.slice(1).toLowerCase() : 'Prescription'} — ${new Date(pres.createdAt).toLocaleString('fr-FR')}`}
                  sectionBadge={String(idx + 1).padStart(2, '0')}
                  complete={!sansStatut && isStatutValide(pres.statut)}
                  collapsible
                  defaultOpen={idx === 0}
                  headerExtra={
                    sansStatut ? null : (
                      <span style={{
                        fontSize: 11, padding: '4px 10px', borderRadius: 999,
                        fontWeight: 600, background: pill.bg, color: pill.color,
                      }}>
                        {label}
                      </span>
                    )
                  }
                >
                  {pres.categoriePrescription && (
                    <p style={{ fontSize: 12, color: ehr.textMuted, margin: '0 0 10px' }}>
                      Type : <strong style={{ color: ehr.text }}>{pres.categoriePrescription}</strong>
                    </p>
                  )}
                  {(pres.medicaments || []).length === 0 ? (
                    <p style={{ fontSize: 13, color: ehr.textMuted, fontStyle: 'italic' }}>
                      Aucun médicament listé (soins cliniques uniquement).
                    </p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {pres.medicaments!.map((med, mi) => (
                        <div key={med.id} style={{
                          borderTop: mi === 0 ? 'none' : `1px solid ${ehr.borderSoft}`,
                          paddingTop: mi === 0 ? 0 : 12,
                        }}>
                          <div style={{ fontWeight: 600, color: ehr.text, fontSize: 14 }}>{med.nom}</div>
                          <div style={{
                            fontSize: 12, color: ehr.textMuted, marginTop: 4,
                            display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px 16px',
                          }}>
                            <span>Dose : <strong>{med.dose}</strong></span>
                            <span>Voie : <strong>{med.voie}</strong></span>
                            <span>Fréquence : <strong>{med.frequence}</strong></span>
                            <span>Durée : <strong>{med.duree}</strong></span>
                            <span>Quantité : <strong>{med.quantite}</strong></span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </EhrFormSection>
              );
            })
          )}
        </div>
      );
    }

    const formMap: Partial<Record<Section, React.ReactNode>> = {
      med:  <MedicaleForm     patient={patientForForms} prescripteur={prescripteurForForms} />,
      nm:   <NonMedicaleForm  patient={patientForForms} prescripteur={prescripteurForForms} />,
      surv: <SurveillanceForm patient={patientForForms} prescripteur={prescripteurForForms} />,
      trans:<TransfusionForm  patient={patientForForms} prescripteur={prescripteurForForms} />,
      bloc: <BlocForm         patient={patientForForms} prescripteur={prescripteurForForms} />,
      labo: <LaboForm         patient={patientForForms} prescripteur={prescripteurForForms} />,
      imag: <ImagerieForm     patient={patientForForms} prescripteur={prescripteurForForms} />,
      eeg:  <EEGForm          patient={patientForForms} prescripteur={prescripteurForForms} />,
      kine: <KineForm         patient={patientForForms} prescripteur={prescripteurForForms} />,
      endo: <EndoscopieForm   patient={patientForForms} prescripteur={prescripteurForForms} />,
      dial: <DiaryseForm      patient={patientForForms} prescripteur={prescripteurForForms} />,
      ana:  <AnapathForm      patient={patientForForms} prescripteur={prescripteurForForms} />,
    };

    return formMap[section] ?? (
      <div style={{ color: ehr.textMuted, fontSize: 13, padding: 16 }}>Section non disponible.</div>
    );
  };

  // ── Rendu principal ─────────────────────────────────────────────────────
  return (
    <>
      <PrescriptionLayout patient={patient} prescripteur={prescripteur}>
        {(activeSection: Section) => renderForm(activeSection)}
      </PrescriptionLayout>

    </>
  );
}
