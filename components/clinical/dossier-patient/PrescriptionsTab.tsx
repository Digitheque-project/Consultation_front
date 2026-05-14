'use client';

import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Plus, RefreshCw } from 'lucide-react';
import { EhrFormSection } from '@/components/clinical/dossier-patient/EhrFormSection';
import { ehr } from '@/lib/clinical/ehr-theme';

const PRESCRIPTION_API_URL = process.env.NEXT_PUBLIC_PRESCRIPTION_API_URL;
const PRESCRIPTION_TOKEN = process.env.NEXT_PUBLIC_PRESCRIPTION_TOKEN;
const PRESCRIPTION_FRONTEND_URL = process.env.NEXT_PUBLIC_PRESCRIPTION_FRONTEND_URL;

/** Base publique du dossier patient (Vercel, Render, localhost…) pour le retour depuis l’app prescription. */
const APP_PUBLIC_URL =
  (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_APP_URL) || '';

interface PrescriptionRender {
  id: string;
  patientId: string;
  /** Statut côté Render (workflow) — absent ou ignoré pour certains types de prescription */
  statut?: string;
  remarques?: string;
  createdAt: string;
  /** Catégorie / type renvoyé par l’API (plusieurs clés possibles, voir enrichPrescription) */
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

function stripDiacritics(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function normalizeCompact(s: string): string {
  return stripDiacritics(s.toLowerCase()).replace(/[\s_-]+/g, '');
}

/** Types pour lesquels Render ne fournit pas de statut métier : on n’affiche pas de pastille. */
function isTypeSansStatut(categorieRaw: string | undefined): boolean {
  const k = normalizeCompact(categorieRaw || '');
  if (!k) return false;
  if (k === 'surveillance' || k.includes('surveillance')) return true;
  if (k.includes('nonmedic') || k === 'nonmedicamenteuse' || k === 'nonmedicamenteux') return true;
  if (k === 'medicamenteuse' || k === 'medicamenteux' || k === 'medicament') return true;
  return false;
}

/** Extrait une catégorie / type depuis la forme renvoyée par l’API Render. */
function extractPrescriptionCategory(item: unknown): string {
  if (!item || typeof item !== 'object') return '';
  const o = item as Record<string, unknown>;
  const keys = [
    'type',
    'categorie',
    'typePrescription',
    'naturePrescription',
    'categoriePrescription',
    'kind',
    'prescriptionType',
    'typeOrdonnance',
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

function enrichPrescription(item: unknown): PrescriptionRender {
  const base = item as PrescriptionRender;
  const categorie = extractPrescriptionCategory(item) || base.categoriePrescription || '';
  return {
    ...base,
    categoriePrescription: categorie || undefined,
  };
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
  return (
    s.includes('valid') ||
    s.includes('validee') ||
    s === 'valide' ||
    s.includes('emis') ||
    s.includes('signe') ||
    s.includes('approuv') ||
    s.includes('finalis') ||
    s.includes('termine')
  );
}

function isStatutRefuse(statut: string | undefined): boolean {
  if (!statut) return false;
  const s = stripDiacritics(statut.toLowerCase());
  return (
    s.includes('refus') ||
    s.includes('reject') ||
    s.includes('denied') ||
    s.includes('annul') ||
    s.includes('rejet')
  );
}

function isStatutEnAttente(statut: string | undefined): boolean {
  if (!statut) return true;
  if (isStatutValide(statut) || isStatutRefuse(statut)) return false;
  const s = stripDiacritics(statut.toLowerCase());
  return (
    s.includes('attente') ||
    s.includes('pending') ||
    s.includes('brouillon') ||
    s.includes('draft') ||
    s.includes('encours') ||
    s.includes('en cours') ||
    s.includes('soumis') ||
    s.includes('submitted') ||
    s.includes('a valider') ||
    s.includes('await') ||
    s.includes('nouveau') ||
    s.includes('propose') ||
    s.includes('waiting')
  );
}

type StatutVisuelPrescription = 'valide' | 'attente' | 'refuse' | 'neutre';

/** Libellé FR + variante couleur pour l’UI (hors types sans statut). */
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
    case 'valide':
      return { bg: ehr.highlightBlueTint, color: ehr.primary };
    case 'refuse':
      return { bg: '#fee2e2', color: '#b91c1c' };
    case 'attente':
      return { bg: '#fef9c3', color: '#a16207' };
    default:
      return { bg: '#f1f5f9', color: '#475569' };
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
    const ra = rank(a);
    const rb = rank(b);
    if (ra !== rb) return rb - ra;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

function buildNewPrescriptionUrl(patientId: string): string {
  const base = (PRESCRIPTION_FRONTEND_URL || '').replace(/\/$/, '');
  const origin = APP_PUBLIC_URL.replace(/\/$/, '') || (typeof window !== 'undefined' ? window.location.origin : '');
  const returnUrl = encodeURIComponent(`${origin}/patients/${patientId}?tab=prescription`);
  const hasQuery = base.includes('?');
  const sep = hasQuery ? '&' : '?';
  return `${base}${sep}patientId=${encodeURIComponent(patientId)}&returnUrl=${returnUrl}`;
}

export function PrescriptionsTab({ patientId }: { patientId: string }) {
  const [prescriptions, setPrescriptions] = useState<PrescriptionRender[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPrescriptions = useCallback(async () => {
    if (!PRESCRIPTION_API_URL || !PRESCRIPTION_TOKEN) {
      setError("Configuration de l'API prescription manquante");
      setLoading(false);
      return;
    }
    try {
      const response = await axios.get(
        `${PRESCRIPTION_API_URL}/prescriptions/medicale/patient/${patientId}`,
        { headers: { Authorization: `Bearer ${PRESCRIPTION_TOKEN}` } }
      );
      const raw = normalizePrescriptionList(response.data);
      const all = raw.map(enrichPrescription);
      setPrescriptions(sortPrescriptions(all));
      setError(null);
    } catch (err: unknown) {
      const ax = err as {
        code?: string;
        message?: string;
        response?: { status?: number; data?: unknown };
      };
      console.error('Erreur chargement prescriptions:', ax?.response?.data || ax?.message);
      const isNetwork =
        ax?.code === 'ERR_NETWORK' ||
        ax?.message === 'Network Error' ||
        (!ax?.response && Boolean(ax?.message));
      if (isNetwork) {
        setError(
          'Impossible de joindre l’API prescription (réseau / CORS). Vérifiez NEXT_PUBLIC_PRESCRIPTION_API_URL (HTTPS si le front est en HTTPS), que le service Render autorise l’origine de ce site, et que le jeton est valide.'
        );
      } else {
        setError(`Erreur: ${ax?.response?.status || ax?.message || 'réseau'}`);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [patientId]);

  useEffect(() => {
    setLoading(true);
    fetchPrescriptions();
  }, [fetchPrescriptions]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        setRefreshing(true);
        fetchPrescriptions();
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [fetchPrescriptions]);

  const handleNewPrescription = () => {
    if (!PRESCRIPTION_FRONTEND_URL) {
      alert("L'URL de l'interface prescription n'est pas configurée. Vérifiez NEXT_PUBLIC_PRESCRIPTION_FRONTEND_URL.");
      return;
    }
    window.location.assign(buildNewPrescriptionUrl(patientId));
  };

  const handleManualRefresh = () => {
    setRefreshing(true);
    fetchPrescriptions();
  };

  if (loading) return <div className="p-4 text-gray-500">Chargement des prescriptions...</div>;
  if (error) return <div className="p-4 text-red-500">{error}</div>;

  return (
    <div style={{ fontFamily: "'Inter', sans-serif" }}>
      <EhrFormSection
        title="Prescriptions médicales"
        subtitle="Synchronisées depuis l’application prescription (Render) : tous les statuts"
        collapsible
        defaultOpen
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <button
              type="button"
              onClick={handleManualRefresh}
              disabled={refreshing}
              title="Rafraîchir la liste (ex. après validation sur l’autre application)"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                borderRadius: 8,
                border: `1px solid ${ehr.border}`,
                backgroundColor: ehr.white,
                padding: '8px 12px',
                fontSize: 13,
                fontWeight: 600,
                color: ehr.textMuted,
                cursor: refreshing ? 'wait' : 'pointer',
                opacity: refreshing ? 0.65 : 1,
              }}
            >
              <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
              Actualiser
            </button>
            <button
              type="button"
              onClick={handleNewPrescription}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                borderRadius: 8,
                backgroundColor: ehr.primary,
                padding: '8px 16px',
                fontSize: 13,
                fontWeight: 600,
                color: ehr.white,
                border: 'none',
                cursor: 'pointer',
              }}
            >
              <Plus size={16} /> Nouvelle prescription
            </button>
          </div>
        </div>
        <p style={{ fontSize: 13, color: ehr.textMuted, margin: '0 0 16px 0' }}>
          Les prescriptions créées sur Render pour ce patient s’affichent ici avec leur statut lorsqu’il existe :{' '}
          <strong>Validé</strong>, <strong>En attente</strong> ou <strong>Refusé</strong>. Pour les types{' '}
          <em>médicamenteuse</em>, <em>non médicamenteuse</em> et <em>surveillance</em>, l’API ne fournit en général pas
          de statut : aucune pastille n’est alors affichée. Utilisez <em>Actualiser</em> après une action sur Render.
        </p>

        {prescriptions.length === 0 && (
          <div
            style={{
              textAlign: 'center',
              padding: '28px 16px',
              color: ehr.textMuted,
              border: `1px dashed ${ehr.border}`,
              borderRadius: 12,
              backgroundColor: ehr.pageBg,
            }}
          >
            <p style={{ margin: '0 0 8px 0' }}>Aucune prescription pour ce patient pour l’instant.</p>
            <p style={{ fontSize: 12, color: ehr.textMuted, maxWidth: 520, margin: '0 auto' }}>
              Vérifiez que l’API Render renvoie bien les entrées pour cet identifiant patient, le jeton
              <code style={{ background: ehr.inputBg, padding: '2px 6px', borderRadius: 4 }}>NEXT_PUBLIC_PRESCRIPTION_TOKEN</code> et
              l’URL <code style={{ background: ehr.inputBg, padding: '2px 6px', borderRadius: 4 }}>NEXT_PUBLIC_PRESCRIPTION_API_URL</code>, puis
              cliquez sur Actualiser.
            </p>
          </div>
        )}
      </EhrFormSection>

      {prescriptions.map((pres, idx) => {
        const sansStatut = isTypeSansStatut(pres.categoriePrescription);
        const { visuel, label } = getStatutPrescriptionVisuel(pres.statut);
        const pill = statutPillColors(visuel);
        return (
        <EhrFormSection
          key={pres.id}
          title={`Prescription du ${new Date(pres.createdAt).toLocaleString('fr-FR')}`}
          sectionBadge={String(idx + 1).padStart(2, '0')}
          complete={!sansStatut && isStatutValide(pres.statut)}
          collapsible
          defaultOpen={idx === 0}
          headerExtra={
            sansStatut ? null : (
            <span
              style={{
                fontSize: 11,
                padding: '4px 10px',
                borderRadius: 999,
                fontWeight: 600,
                backgroundColor: pill.bg,
                color: pill.color,
              }}
            >
              {label}
            </span>
            )
          }
        >
          {pres.categoriePrescription && (
            <p style={{ fontSize: 12, color: ehr.textMuted, margin: '0 0 10px 0' }}>
              Type : <strong style={{ color: ehr.text }}>{pres.categoriePrescription}</strong>
              {sansStatut && (
                <span style={{ color: ehr.textMuted }}> — pas de statut de workflow pour ce type</span>
              )}
            </p>
          )}
          {pres.remarques && <div style={{ fontSize: 14, color: ehr.text, marginBottom: 12 }}>{pres.remarques}</div>}
          {(pres.medicaments || []).length === 0 ? (
            <p style={{ fontSize: 14, color: ehr.textMuted, margin: 0 }}>Aucun médicament listé.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {pres.medicaments!.map((med, mi) => (
                <div
                  key={med.id}
                  style={{
                    borderTop: mi === 0 ? 'none' : `1px solid ${ehr.borderSoft}`,
                    paddingTop: mi === 0 ? 0 : 12,
                  }}
                >
                  <div style={{ fontWeight: 600, color: ehr.text }}>{med.nom}</div>
                  <div style={{ fontSize: 13, color: ehr.textMuted, marginTop: 6, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 16px' }}>
                    <span>Dose : {med.dose}</span>
                    <span>Voie : {med.voie}</span>
                    <span>Fréquence : {med.frequence}</span>
                    <span>Durée : {med.duree}</span>
                    <span>Quantité : {med.quantite}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </EhrFormSection>
        );
      })}
    </div>
  );
}
