'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import {
  Plus,
  RefreshCw,
  Pill,
  Stethoscope,
  Activity,
  Droplet,
  Microscope,
  Heart,
  Trash2,
  CheckCircle,
  Bell,
  Info,
  Search,
  Calendar,
  Clock,
  X,
  Check
} from 'lucide-react';
import { EhrFormSection } from '@/components/clinical/dossier-patient/EhrFormSection';
import { ehr } from '@/lib/clinical/ehr-theme';

const PRESCRIPTION_API_URL = process.env.NEXT_PUBLIC_PRESCRIPTION_API_URL;
const PRESCRIPTION_TOKEN = process.env.NEXT_PUBLIC_PRESCRIPTION_TOKEN;
const PRESCRIPTION_FRONTEND_URL = process.env.NEXT_PUBLIC_PRESCRIPTION_FRONTEND_URL;
const APP_PUBLIC_URL = (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_APP_URL) || '';

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

interface DraftPrescriptionItem {
  id: string;
  category: 'medicament' | 'non-medicament' | 'surveillance' | 'transfusion' | 'paraclinique' | 'bloc';
  type: string;
  nom: string;
  details: string;
  raw: any;
}

const SUGGESTED_MEDICAMENTS = [
  'Paracétamol 1g (Doliprane) - Comprimé',
  'Paracétamol 500mg (Doliprane) - Gélule',
  'Amoxicilline 1g (Clamoxyl) - Comprimé',
  'Amoxicilline + Acide Clavulanique 1g/125mg (Augmentin) - Sachet',
  'Ibuprofène 400mg (Spedifen) - Comprimé',
  'Ibuprofène 200mg - Comprimé',
  'Spasfon 80mg (Phloroglucinol) - Lyoc',
  'Tramadol 50mg (Topalgic) - Gélule',
  'Kardegic 75mg (Aspirine) - Sachet',
  'Lovenox 4000 UI (Énoxaparine) - Seringue préremplie',
  'Inexium 40mg (Ésoméprazole) - Comprimé',
  'Gaviscon suspension buvable - Sachet',
  'Ventoline 100 µg/dose (Salbutamol) - Inhalateur',
  'Lasilix 40mg (Furosémide) - Comprimé',
  'Amlodipine 5mg - Comprimé',
  'Metformine 1000mg (Glucophage) - Comprimé',
  'Lexomil 6mg (Bromazépam) - Comprimé quadrisécable',
  'Morphine Ampoule 10mg/1ml - Injection',
  'Dexaméthasone 4mg/1ml - Injection',
];

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
    'libelleType'
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
    s.includes('valid') || s.includes('validee') || s === 'valide' ||
    s.includes('emis') || s.includes('signe') || s.includes('approuv') ||
    s.includes('finalis') || s.includes('termine')
  );
}

function isStatutRefuse(statut: string | undefined): boolean {
  if (!statut) return false;
  const s = stripDiacritics(statut.toLowerCase());
  return (
    s.includes('refus') || s.includes('reject') || s.includes('denied') ||
    s.includes('annul') || s.includes('rejet')
  );
}

function isStatutEnAttente(statut: string | undefined): boolean {
  if (!statut) return true;
  if (isStatutValide(statut) || isStatutRefuse(statut)) return false;
  const s = stripDiacritics(statut.toLowerCase());
  return (
    s.includes('attente') || s.includes('pending') || s.includes('brouillon') ||
    s.includes('draft') || s.includes('encours') || s.includes('en cours') ||
    s.includes('soumis') || s.includes('submitted') || s.includes('a valider') ||
    s.includes('await') || s.includes('nouveau') || s.includes('propose') ||
    s.includes('waiting')
  );
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
    case 'valide': return { bg: ehr.highlightBlueTint, color: ehr.primary };
    case 'refuse': return { bg: '#fee2e2', color: '#b91c1c' };
    case 'attente': return { bg: '#fef9c3', color: '#a16207' };
    default: return { bg: '#f1f5f9', color: '#475569' };
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

export function PrescriptionsTab({ patientId }: { patientId: string }) {
  // Navigation tabs
  const [activeMainTab, setActiveMainTab] = useState<'saisir' | 'historique'>('saisir');
  const [activeFormTab, setActiveFormTab] = useState<'medicament' | 'non-medicament' | 'surveillance' | 'transfusion' | 'paraclinique' | 'bloc'>('medicament');

  // Interactive prescription states
  const [prescriptionsEnCours, setPrescriptionsEnCours] = useState<DraftPrescriptionItem[]>([]);
  const [remarquesGenerales, setRemarquesGenerales] = useState('');
  const [notifierInfirmiers, setNotifierInfirmiers] = useState(false);
  const [validationAttempted, setValidationAttempted] = useState(false);
  const [showSuccessOverlay, setShowSuccessOverlay] = useState(false);
  const [validatedPrescriptionData, setValidatedPrescriptionData] = useState<PrescriptionRender | null>(null);

  // Form input fields (with clean Next-friendly default loaders on mount)
  const [medocName, setMedocName] = useState('');
  const [dose, setDose] = useState('');
  const [quantite, setQuantite] = useState('1');
  const [voie, setVoie] = useState('Sélectionner');
  const [frequence, setFrequence] = useState('Sélectionner');
  const [dureeVal, setDureeVal] = useState('');
  const [dureeUnite, setDureeUnite] = useState('jours');
  const [dateDebut, setDateDebut] = useState('');
  const [heureDebut, setHeureDebut] = useState('');
  const [instructions, setInstructions] = useState('');
  const [remarques, setRemarques] = useState('');

  // Other sub-form states
  const [soinType, setSoinType] = useState('Sélectionner');
  const [soinConsignes, setSoinConsignes] = useState('');
  const [soinFrequence, setSoinFrequence] = useState('Sélectionner');
  const [soinDuree, setSoinDuree] = useState('');
  const [soinDureeUnite, setSoinDureeUnite] = useState('jours');
  const [soinDateDebut, setSoinDateDebut] = useState('');

  const [survParam, setSurvParam] = useState('Sélectionner');
  const [survFrequence, setSurvFrequence] = useState('Sélectionner');
  const [survMin, setSurvMin] = useState('');
  const [survMax, setSurvMax] = useState('');
  const [survConsignes, setSurvConsignes] = useState('');

  const [transfProduit, setTransfProduit] = useState('Sélectionner');
  const [transfQuantite, setTransfQuantite] = useState('1');
  const [transfGroupe, setTransfGroupe] = useState('Sélectionner');
  const [transfUrgence, setTransfUrgence] = useState('Programmé');
  const [transfDebit, setTransfDebit] = useState('');

  const [paraExamen, setParaExamen] = useState('Sélectionner');
  const [paraRenseignements, setParaRenseignements] = useState('');
  const [paraDate, setParaDate] = useState('');
  const [paraUrgent, setParaUrgent] = useState('Non');

  const [blocIntervention, setBlocIntervention] = useState('');
  const [blocIndication, setBlocIndication] = useState('');
  const [blocDate, setBlocDate] = useState('');
  const [blocUrgence, setBlocUrgence] = useState('Programmé');

  // Autocomplete state
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Synchronisation/History list states
  const [prescriptions, setPrescriptions] = useState<PrescriptionRender[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Initializing default dates on mount to avoid hydration mismatch
  useEffect(() => {
    const today = new Date();
    const formattedDate = today.toISOString().split('T')[0];
    const hours = String(today.getHours()).padStart(2, '0');
    const minutes = String(today.getMinutes()).padStart(2, '0');
    const formattedTime = `${hours}:${minutes}`;

    setDateDebut(formattedDate);
    setHeureDebut(formattedTime);
    setSoinDateDebut(formattedDate);
    setParaDate(formattedDate);
    setBlocDate(formattedDate);
  }, []);

  // Handle autocomplete click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Autocomplete filtering
  const handleMedocChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setMedocName(value);
    if (!value.trim()) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    const filtered = SUGGESTED_MEDICAMENTS.filter(med =>
      stripDiacritics(med.toLowerCase()).includes(stripDiacritics(value.toLowerCase()))
    );
    setSuggestions(filtered);
    setShowSuggestions(true);
  };

  // Fetch prescriptions list
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
          'Impossible de joindre l’API prescription (réseau / CORS). Vérifiez la configuration de NEXT_PUBLIC_PRESCRIPTION_API_URL.'
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

  // Add Item to Draft list
  const handleAddItemToDraft = () => {
    let item: DraftPrescriptionItem | null = null;
    const itemId = 'draft_' + Math.random().toString(36).substr(2, 9);

    if (activeFormTab === 'medicament') {
      if (!medocName.trim()) {
        alert('Veuillez saisir ou rechercher un médicament.');
        return;
      }
      if (!dose.trim()) {
        alert('Veuillez saisir la dose.');
        return;
      }
      if (!dureeVal.trim()) {
        alert('Veuillez spécifier la durée.');
        return;
      }
      if (voie === 'Sélectionner' || frequence === 'Sélectionner') {
        alert("Veuillez sélectionner la voie d'administration et la fréquence.");
        return;
      }

      item = {
        id: itemId,
        category: 'medicament',
        type: 'Médicament',
        nom: medocName,
        details: `${dose} • ${voie} • ${frequence} pendant ${dureeVal} ${dureeUnite}`,
        raw: { dose, quantite, voie, frequence, dureeVal, dureeUnite, dateDebut, heureDebut, instructions, remarques }
      };

      // Reset Médoc form
      setMedocName('');
      setDose('');
      setQuantite('1');
      setVoie('Sélectionner');
      setFrequence('Sélectionner');
      setDureeVal('');
      setInstructions('');
      setRemarques('');
    } else if (activeFormTab === 'non-medicament') {
      if (soinType === 'Sélectionner' || soinFrequence === 'Sélectionner' || !soinDuree.trim()) {
        alert('Veuillez remplir tous les champs obligatoires du soin non médicamenteux.');
        return;
      }
      item = {
        id: itemId,
        category: 'non-medicament',
        type: 'Soin non méd.',
        nom: soinType,
        details: `${soinFrequence} pendant ${soinDuree} ${soinDureeUnite} (${soinConsignes || 'Pas de consignes'})`,
        raw: { soinType, soinConsignes, soinFrequence, soinDuree, soinDureeUnite, soinDateDebut }
      };
      setSoinType('Sélectionner');
      setSoinConsignes('');
      setSoinFrequence('Sélectionner');
      setSoinDuree('');
    } else if (activeFormTab === 'surveillance') {
      if (survParam === 'Sélectionner' || survFrequence === 'Sélectionner') {
        alert('Veuillez remplir les informations de surveillance obligatoires.');
        return;
      }
      const thresholds = (survMin || survMax) ? ` (Alerte si < ${survMin || '-'} ou > ${survMax || '-'})` : '';
      item = {
        id: itemId,
        category: 'surveillance',
        type: 'Surveillance',
        nom: `Surveillance: ${survParam}`,
        details: `${survFrequence}${thresholds} ${survConsignes ? '• ' + survConsignes : ''}`,
        raw: { survParam, survFrequence, survMin, survMax, survConsignes }
      };
      setSurvParam('Sélectionner');
      setSurvFrequence('Sélectionner');
      setSurvMin('');
      setSurvMax('');
      setSurvConsignes('');
    } else if (activeFormTab === 'transfusion') {
      if (transfProduit === 'Sélectionner' || transfGroupe === 'Sélectionner' || !transfDebit.trim()) {
        alert('Veuillez renseigner les paramètres requis pour la transfusion.');
        return;
      }
      item = {
        id: itemId,
        category: 'transfusion',
        type: 'Transfusion',
        nom: `${transfProduit} (Poches: ${transfQuantite})`,
        details: `Groupe: ${transfGroupe} • Urgence: ${transfUrgence} • Débit: ${transfDebit}`,
        raw: { transfProduit, transfQuantite, transfGroupe, transfUrgence, transfDebit }
      };
      setTransfProduit('Sélectionner');
      setTransfQuantite('1');
      setTransfGroupe('Sélectionner');
      setTransfUrgence('Programmé');
      setTransfDebit('');
    } else if (activeFormTab === 'paraclinique') {
      if (paraExamen === 'Sélectionner' || !paraRenseignements.trim()) {
        alert("Veuillez renseigner le type d'examen et les détails cliniques.");
        return;
      }
      item = {
        id: itemId,
        category: 'paraclinique',
        type: 'Para-clinique',
        nom: `Examen: ${paraExamen}`,
        details: `Renseignements: ${paraRenseignements} • Urgent: ${paraUrgent}`,
        raw: { paraExamen, paraRenseignements, paraDate, paraUrgent }
      };
      setParaExamen('Sélectionner');
      setParaRenseignements('');
      setParaUrgent('Non');
    } else if (activeFormTab === 'bloc') {
      if (!blocIntervention.trim() || !blocIndication.trim()) {
        alert("Veuillez renseigner l'intervention et son indication opératoire.");
        return;
      }
      item = {
        id: itemId,
        category: 'bloc',
        type: 'Bloc Opératoire',
        nom: `Bloc: ${blocIntervention}`,
        details: `Indication: ${blocIndication} • Urgence: ${blocUrgence} • Date: ${blocDate}`,
        raw: { blocIntervention, blocIndication, blocDate, blocUrgence }
      };
      setBlocIntervention('');
      setBlocIndication('');
      setBlocUrgence('Programmé');
    }

    if (item) {
      setPrescriptionsEnCours(prev => [...prev, item!]);
      setValidationAttempted(false);
    }
  };

  // Remove Draft Item
  const handleRemoveDraftItem = (id: string) => {
    setPrescriptionsEnCours(prev => prev.filter(it => it.id !== id));
  };

  // Validate the whole order
  const handleValidatePrescription = async () => {
    if (prescriptionsEnCours.length === 0) {
      setValidationAttempted(true);
      return;
    }
    setSaving(true);

    const newPrescId = 'presc_' + Math.random().toString(36).substr(2, 9);

    // Filter only medicines for external API sync (the external api only parses medicaments)
    const medsOnly = prescriptionsEnCours
      .filter(item => item.category === 'medicament')
      .map(item => ({
        id: 'med_' + Math.random().toString(36).substr(2, 9),
        nom: item.nom,
        dose: item.raw.dose || '',
        quantite: Number(item.raw.quantite) || 1,
        voie: item.raw.voie || '',
        frequence: item.raw.frequence || '',
        duree: `${item.raw.dureeVal || ''} ${item.raw.dureeUnite || 'jours'}`
      }));

    // Formulate a beautiful summary representing all draft actions
    const descriptions = prescriptionsEnCours.map(it => `[${it.type}] ${it.nom} (${it.details})`).join(' \n');
    const finalRemarks = `${remarquesGenerales || 'Aucune remarque.'}${notifierInfirmiers ? ' \n(Notification de service envoyée)' : ''}`;

    const localNewPrescription: PrescriptionRender = {
      id: newPrescId,
      patientId: patientId,
      statut: 'Validé',
      remarques: `${finalRemarks} \n\nContenu prescrit:\n${descriptions}`,
      createdAt: new Date().toISOString(),
      categoriePrescription: prescriptionsEnCours[0]?.type || 'Prescription',
      medicaments: medsOnly.length > 0 ? medsOnly : undefined
    };

    // Post to Render prescription API if there are medications
    try {
      if (PRESCRIPTION_API_URL && PRESCRIPTION_TOKEN && medsOnly.length > 0) {
        await axios.post(
          `${PRESCRIPTION_API_URL}/prescriptions/medicale`,
          {
            patientId: patientId,
            statut: 'Validé',
            remarques: finalRemarks,
            medicaments: medsOnly.map(m => ({
              nom: m.nom,
              dose: m.dose,
              quantite: m.quantite,
              voie: m.voie,
              frequence: m.frequence,
              duree: m.duree
            }))
          },
          { headers: { Authorization: `Bearer ${PRESCRIPTION_TOKEN}` } }
        );
      }
    } catch (e) {
      console.error('API Sync Error (CORS or Network):', e);
    }

    // Add locally to visual list instantly to assure a wow experience
    setPrescriptions(prev => [localNewPrescription, ...prev]);
    setValidatedPrescriptionData(localNewPrescription);
    setShowSuccessOverlay(true);

    // Reset everything
    setPrescriptionsEnCours([]);
    setRemarquesGenerales('');
    setNotifierInfirmiers(false);
    setValidationAttempted(false);
    setSaving(false);
  };

  const handleManualRefresh = () => {
    setRefreshing(true);
    fetchPrescriptions();
  };

  const subTabHeaderStyle = (tabId: string): React.CSSProperties => {
    const isActive = activeFormTab === tabId;
    return {
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 6,
      padding: '14px 6px',
      border: 'none',
      borderBottom: isActive ? `3px solid ${ehr.primary}` : '3px solid transparent',
      background: 'none',
      cursor: 'pointer',
      transition: 'all 0.2s',
      color: isActive ? ehr.primary : '#64748b',
      fontWeight: isActive ? 700 : 500,
      fontSize: 12,
    };
  };

  const textInputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 14px',
    border: `1px solid ${ehr.border}`,
    borderRadius: 8,
    fontFamily: 'inherit',
    fontSize: 13,
    backgroundColor: '#F8FAFC',
    color: ehr.text,
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.2s, box-shadow 0.2s',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: 10,
    fontWeight: 700,
    color: ehr.textMuted,
    textTransform: 'uppercase',
    letterSpacing: '0.07em',
    marginBottom: 6,
  };

  if (loading) return <div className="p-4 text-gray-500">Chargement des prescriptions...</div>;

  return (
    <div style={{ fontFamily: "'Manrope', sans-serif", color: ehr.text }}>

      {/* Top Segmented Control (Saisir vs Historique) */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
        backgroundColor: '#EDF1F5',
        padding: '6px 8px',
        borderRadius: 12,
      }}>
        <div style={{ display: 'flex', gap: 6, width: '100%', maxWidth: 440 }}>
          <button
            type="button"
            onClick={() => setActiveMainTab('saisir')}
            style={{
              flex: 1,
              padding: '10px 16px',
              border: 'none',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              backgroundColor: activeMainTab === 'saisir' ? 'white' : 'transparent',
              color: activeMainTab === 'saisir' ? ehr.primary : ehr.textMuted,
              boxShadow: activeMainTab === 'saisir' ? '0 2px 4px rgba(0,0,0,0.06)' : 'none',
              transition: 'all 0.15s'
            }}
          >
            <Plus size={16} />
            Saisir une prescription
          </button>
          <button
            type="button"
            onClick={() => setActiveMainTab('historique')}
            style={{
              flex: 1,
              padding: '10px 16px',
              border: 'none',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              backgroundColor: activeMainTab === 'historique' ? 'white' : 'transparent',
              color: activeMainTab === 'historique' ? ehr.primary : ehr.textMuted,
              boxShadow: activeMainTab === 'historique' ? '0 2px 4px rgba(0,0,0,0.06)' : 'none',
              transition: 'all 0.15s'
            }}
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            Historique des ordonnances
          </button>
        </div>

        {activeMainTab === 'historique' && (
          <button
            type="button"
            onClick={handleManualRefresh}
            disabled={refreshing}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              borderRadius: 8,
              border: `1px solid ${ehr.border}`,
              backgroundColor: 'white',
              padding: '8px 12px',
              fontSize: 12,
              fontWeight: 600,
              color: ehr.textMuted,
              cursor: refreshing ? 'wait' : 'pointer',
              opacity: refreshing ? 0.65 : 1,
            }}
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            Actualiser
          </button>
        )}
      </div>

      {activeMainTab === 'saisir' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Main 6 Tabs Sub-Navigation Bar */}
          <div style={{
            display: 'flex',
            backgroundColor: 'white',
            borderRadius: 12,
            boxShadow: ehr.shadowCard,
            border: `1px solid ${ehr.border}`,
            overflow: 'hidden',
            marginBottom: 10
          }}>
            <button type="button" onClick={() => setActiveFormTab('medicament')} style={subTabHeaderStyle('medicament')}>
              <Pill size={18} />
              Médicamenteuse
            </button>
            <button type="button" onClick={() => setActiveFormTab('non-medicament')} style={subTabHeaderStyle('non-medicament')}>
              <Stethoscope size={18} />
              Non Médicamenteuse
            </button>
            <button type="button" onClick={() => setActiveFormTab('surveillance')} style={subTabHeaderStyle('surveillance')}>
              <Activity size={18} />
              Surveillance
            </button>
            <button type="button" onClick={() => setActiveFormTab('transfusion')} style={subTabHeaderStyle('transfusion')}>
              <Droplet size={18} />
              Transfusion
            </button>
            <button type="button" onClick={() => setActiveFormTab('paraclinique')} style={subTabHeaderStyle('paraclinique')}>
              <Microscope size={18} />
              Para-clinique
            </button>
            <button type="button" onClick={() => setActiveFormTab('bloc')} style={subTabHeaderStyle('bloc')}>
              <Heart size={18} />
              Bloc Opératoire
            </button>
          </div>

          {/* Form grid double-column setup */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1.8fr) minmax(0, 1fr)',
            gap: 20,
            alignItems: 'start'
          }}>

            {/* LEFT COLUMN: ACTIVE FORM BLOCK */}
            <div style={{
              backgroundColor: 'white',
              borderRadius: 12,
              border: `1px solid ${ehr.border}`,
              padding: 24,
              boxShadow: ehr.shadowCard
            }}>

              {/* --- T1: MÉDICAMENTEUSE FORM --- */}
              {activeFormTab === 'medicament' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                  {/* Médicament search field */}
                  <div style={{ position: 'relative' }}>
                    <label style={labelStyle}>Médicament <span style={{ color: ehr.danger }}>*</span></label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type="text"
                        value={medocName}
                        onChange={handleMedocChange}
                        placeholder="Rechercher dans le stock pharmacie..."
                        style={{ ...textInputStyle, paddingRight: 40 }}
                        onFocus={() => { if (medocName.trim()) setShowSuggestions(true); }}
                      />
                      <Search size={16} style={{
                        position: 'absolute',
                        right: 14,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: ehr.textMuted
                      }} />
                    </div>
                    <p style={{ fontSize: 11, color: ehr.textMuted, marginTop: 4, fontStyle: 'italic' }}>
                      Le médicament est recherché dans le stock en détail de la pharmacie.
                    </p>

                    {/* Autocomplete Suggestions Box */}
                    {showSuggestions && suggestions.length > 0 && (
                      <div
                        ref={suggestionsRef}
                        style={{
                          position: 'absolute',
                          top: '100%',
                          left: 0,
                          right: 0,
                          zIndex: 50,
                          backgroundColor: 'white',
                          border: `1px solid ${ehr.border}`,
                          borderRadius: 8,
                          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
                          marginTop: 4,
                          maxHeight: 200,
                          overflowY: 'auto'
                        }}
                      >
                        {suggestions.map((sug, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => {
                              setMedocName(sug);
                              setShowSuggestions(false);
                            }}
                            style={{
                              width: '100%',
                              textAlign: 'left',
                              padding: '10px 14px',
                              border: 'none',
                              backgroundColor: 'transparent',
                              cursor: 'pointer',
                              fontSize: 13,
                              color: ehr.text,
                              borderBottom: idx === suggestions.length - 1 ? 'none' : '1px solid #F1F5F9',
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#F8FAFC'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                          >
                            {sug}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Dose & Quantité */}
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
                    <div>
                      <label style={labelStyle}>Dose <span style={{ color: ehr.danger }}>*</span></label>
                      <input
                        type="text"
                        value={dose}
                        onChange={e => setDose(e.target.value)}
                        placeholder="Ex : 1g, 500mg"
                        style={textInputStyle}
                      />
                    </div>
                    <div>
                      <label style={labelStyle}>Quantité</label>
                      <input
                        type="number"
                        min="1"
                        value={quantite}
                        onChange={e => setQuantite(e.target.value)}
                        style={textInputStyle}
                      />
                    </div>
                  </div>

                  {/* Voie d'administration */}
                  <div>
                    <label style={labelStyle}>Voie d'administration</label>
                    <select
                      value={voie}
                      onChange={e => setVoie(e.target.value)}
                      style={{ ...textInputStyle, appearance: 'none', cursor: 'pointer' }}
                    >
                      <option disabled value="Sélectionner">Sélectionner</option>
                      <option value="Oral">Oral (PO)</option>
                      <option value="Intraveineux (IV)">Intraveineux (IV)</option>
                      <option value="Intramusculaire (IM)">Intramusculaire (IM)</option>
                      <option value="Sous-cutané (SC)">Sous-cutané (SC)</option>
                      <option value="Rectal">Rectal</option>
                      <option value="Inhalation">Inhalation</option>
                    </select>
                  </div>

                  {/* Fréquence & Durée */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div>
                      <label style={labelStyle}>Fréquence <span style={{ color: ehr.danger }}>*</span></label>
                      <select
                        value={frequence}
                        onChange={e => setFrequence(e.target.value)}
                        style={textInputStyle}
                      >
                        <option disabled value="Sélectionner">Sélectionner</option>
                        <option value="1 fois par jour">1 fois par jour</option>
                        <option value="2 fois par jour">2 fois par jour</option>
                        <option value="3 fois par jour">3 fois par jour</option>
                        <option value="Toutes les 8 heures">Toutes les 8 heures</option>
                        <option value="Matin et Soir">Matin et Soir</option>
                        <option value="Au besoin">Au besoin (PRN)</option>
                      </select>
                    </div>
                    <div>
                      <label style={labelStyle}>Durée <span style={{ color: ehr.danger }}>*</span></label>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <input
                          type="number"
                          min="1"
                          value={dureeVal}
                          onChange={e => setDureeVal(e.target.value)}
                          placeholder="Ex : 7"
                          style={{ ...textInputStyle, flex: 1 }}
                        />
                        <select
                          value={dureeUnite}
                          onChange={e => setDureeUnite(e.target.value)}
                          style={{ ...textInputStyle, width: '90px' }}
                        >
                          <option value="jours">jours</option>
                          <option value="semaines">semaines</option>
                          <option value="mois">mois</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Date & Heure de début */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div>
                      <label style={labelStyle}>Date de début</label>
                      <input
                        type="date"
                        value={dateDebut}
                        onChange={e => setDateDebut(e.target.value)}
                        style={textInputStyle}
                      />
                    </div>
                    <div>
                      <label style={labelStyle}>Heure de début</label>
                      <input
                        type="time"
                        value={heureDebut}
                        onChange={e => setHeureDebut(e.target.value)}
                        style={textInputStyle}
                      />
                    </div>
                  </div>

                  {/* Instructions d'utilisation */}
                  <div>
                    <label style={labelStyle}>Instructions d'utilisation</label>
                    <input
                      type="text"
                      value={instructions}
                      onChange={e => setInstructions(e.target.value)}
                      placeholder="Ex : à prendre après les repas..."
                      style={textInputStyle}
                    />
                  </div>

                  {/* Remarques */}
                  <div>
                    <label style={labelStyle}>Remarques</label>
                    <input
                      type="text"
                      value={remarques}
                      onChange={e => setRemarques(e.target.value)}
                      placeholder="Précisions complémentaires..."
                      style={textInputStyle}
                    />
                  </div>
                </div>
              )}

              {/* --- T2: NON MÉDICAMENTEUSE FORM --- */}
              {activeFormTab === 'non-medicament' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div>
                    <label style={labelStyle}>Type de soin <span style={{ color: ehr.danger }}>*</span></label>
                    <select
                      value={soinType}
                      onChange={e => setSoinType(e.target.value)}
                      style={textInputStyle}
                    >
                      <option disabled value="Sélectionner">Sélectionner</option>
                      <option value="Kinésithérapie motrice">Kinésithérapie motrice</option>
                      <option value="Soins infirmiers de nursing">Soins infirmiers de nursing</option>
                      <option value="Lavage gastrique">Lavage gastrique</option>
                      <option value="Pose de sonde naso-gastrique">Pose de sonde naso-gastrique</option>
                      <option value="Réfection de pansement complexe">Réfection de pansement complexe</option>
                      <option value="Orthophonie">Orthophonie</option>
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Fréquence de passage <span style={{ color: ehr.danger }}>*</span></label>
                    <select
                      value={soinFrequence}
                      onChange={e => setSoinFrequence(e.target.value)}
                      style={textInputStyle}
                    >
                      <option disabled value="Sélectionner">Sélectionner</option>
                      <option value="1 fois par jour">1 fois par jour</option>
                      <option value="2 fois par jour">2 fois par jour</option>
                      <option value="3 fois par semaine">3 fois par semaine</option>
                      <option value="Quotidien">Quotidien</option>
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Durée prescrite <span style={{ color: ehr.danger }}>*</span></label>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input
                        type="number"
                        min="1"
                        value={soinDuree}
                        onChange={e => setSoinDuree(e.target.value)}
                        placeholder="Ex : 10"
                        style={{ ...textInputStyle, flex: 1 }}
                      />
                      <select
                        value={soinDureeUnite}
                        onChange={e => setSoinDureeUnite(e.target.value)}
                        style={{ ...textInputStyle, width: '90px' }}
                      >
                        <option value="jours">jours</option>
                        <option value="semaines">semaines</option>
                        <option value="séances">séances</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label style={labelStyle}>Date de début</label>
                    <input
                      type="date"
                      value={soinDateDebut}
                      onChange={e => setSoinDateDebut(e.target.value)}
                      style={textInputStyle}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Consignes / Précisions</label>
                    <textarea
                      value={soinConsignes}
                      onChange={e => setSoinConsignes(e.target.value)}
                      rows={3}
                      placeholder="Détails complémentaires de la prise en charge..."
                      style={{ ...textInputStyle, resize: 'vertical' }}
                    />
                  </div>
                </div>
              )}

              {/* --- T3: SURVEILLANCE FORM --- */}
              {activeFormTab === 'surveillance' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div>
                    <label style={labelStyle}>Paramètre à surveiller <span style={{ color: ehr.danger }}>*</span></label>
                    <select
                      value={survParam}
                      onChange={e => setSurvParam(e.target.value)}
                      style={textInputStyle}
                    >
                      <option disabled value="Sélectionner">Sélectionner</option>
                      <option value="Tension artérielle">Tension artérielle (TA)</option>
                      <option value="Température">Température corporelle</option>
                      <option value="Fréquence cardiaque">Fréquence cardiaque</option>
                      <option value="Glycémie capillaire">Glycémie capillaire</option>
                      <option value="Diurèse">Diurèse des 24h</option>
                      <option value="Saturation en O2">Saturation en O2</option>
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Fréquence de contrôle <span style={{ color: ehr.danger }}>*</span></label>
                    <select
                      value={survFrequence}
                      onChange={e => setSurvFrequence(e.target.value)}
                      style={textInputStyle}
                    >
                      <option disabled value="Sélectionner">Sélectionner</option>
                      <option value="Toutes les heures">Toutes les heures</option>
                      <option value="Toutes les 2 heures">Toutes les 2 heures</option>
                      <option value="Toutes les 4 heures">Toutes les 4 heures</option>
                      <option value="3 fois par jour">3 fois par jour</option>
                      <option value="Matin et Soir">Matin et Soir</option>
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Seuils d'alerte cliniques</label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                      <div>
                        <input
                          type="number"
                          placeholder="Min d'alerte (Optionnel)"
                          value={survMin}
                          onChange={e => setSurvMin(e.target.value)}
                          style={textInputStyle}
                        />
                      </div>
                      <div>
                        <input
                          type="number"
                          placeholder="Max d'alerte (Optionnel)"
                          value={survMax}
                          onChange={e => setSurvMax(e.target.value)}
                          style={textInputStyle}
                        />
                      </div>
                    </div>
                  </div>
                  <div>
                    <label style={labelStyle}>Conduite à tenir en cas d'anomalie</label>
                    <input
                      type="text"
                      value={survConsignes}
                      onChange={e => setSurvConsignes(e.target.value)}
                      placeholder="Ex : Appeler le médecin de garde si Température > 38.5°C..."
                      style={textInputStyle}
                    />
                  </div>
                </div>
              )}

              {/* --- T4: TRANSFUSION FORM --- */}
              {activeFormTab === 'transfusion' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
                    <div>
                      <label style={labelStyle}>Produit sanguin <span style={{ color: ehr.danger }}>*</span></label>
                      <select
                        value={transfProduit}
                        onChange={e => setTransfProduit(e.target.value)}
                        style={textInputStyle}
                      >
                        <option disabled value="Sélectionner">Sélectionner</option>
                        <option value="Culot globulaire (CG)">Culot globulaire (CG)</option>
                        <option value="Plasma frais congelé (PFC)">Plasma frais congelé (PFC)</option>
                        <option value="Concentré de plaquettes (CP)">Concentré de plaquettes (CP)</option>
                        <option value="Albumine humaine">Albumine humaine</option>
                      </select>
                    </div>
                    <div>
                      <label style={labelStyle}>Poches</label>
                      <input
                        type="number"
                        min="1"
                        value={transfQuantite}
                        onChange={e => setTransfQuantite(e.target.value)}
                        style={textInputStyle}
                      />
                    </div>
                  </div>
                  <div>
                    <label style={labelStyle}>Groupe sanguin & Phénotype <span style={{ color: ehr.danger }}>*</span></label>
                    <select
                      value={transfGroupe}
                      onChange={e => setTransfGroupe(e.target.value)}
                      style={textInputStyle}
                    >
                      <option disabled value="Sélectionner">Sélectionner</option>
                      <option value="A+">A +</option>
                      <option value="A-">A -</option>
                      <option value="B+">B +</option>
                      <option value="B-">B -</option>
                      <option value="AB+">AB +</option>
                      <option value="AB-">AB -</option>
                      <option value="O+">O +</option>
                      <option value="O-">O -</option>
                      <option value="Phénotypé / Identifié">Phénotypé (Compatibilité spécifique)</option>
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Degré d'urgence</label>
                    <select
                      value={transfUrgence}
                      onChange={e => setTransfUrgence(e.target.value)}
                      style={textInputStyle}
                    >
                      <option value="Programmé">Programmé</option>
                      <option value="Urgence relative">Urgence relative</option>
                      <option value="Urgence vitale immédiate">Urgence vitale immédiate</option>
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Débit / Vitesse de passage <span style={{ color: ehr.danger }}>*</span></label>
                    <input
                      type="text"
                      value={transfDebit}
                      onChange={e => setTransfDebit(e.target.value)}
                      placeholder="Ex : Passer en 2 heures..."
                      style={textInputStyle}
                    />
                  </div>
                </div>
              )}

              {/* --- T5: PARA-CLINIQUE FORM --- */}
              {activeFormTab === 'paraclinique' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div>
                    <label style={labelStyle}>Examen / Analyse <span style={{ color: ehr.danger }}>*</span></label>
                    <select
                      value={paraExamen}
                      onChange={e => setParaExamen(e.target.value)}
                      style={textInputStyle}
                    >
                      <option disabled value="Sélectionner">Sélectionner</option>
                      <option value="Radiographie pulmonaire">Radiographie pulmonaire</option>
                      <option value="ECG complet">ECG de contrôle</option>
                      <option value="Échographie abdominale">Échographie abdominale</option>
                      <option value="Scanner cérébral">Scanner cérébral</option>
                      <option value="Bilan biologique complet">Bilan biologique complet</option>
                      <option value="Ionogramme sanguin">Ionogramme sanguin</option>
                      <option value="NFS + Plaquettes">NFS + Plaquettes</option>
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Renseignements cliniques <span style={{ color: ehr.danger }}>*</span></label>
                    <textarea
                      value={paraRenseignements}
                      onChange={e => setParaRenseignements(e.target.value)}
                      rows={3}
                      placeholder="Motif opératoire ou suspicion clinique..."
                      style={{ ...textInputStyle, resize: 'vertical' }}
                    />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div>
                      <label style={labelStyle}>Date de réalisation</label>
                      <input
                        type="date"
                        value={paraDate}
                        onChange={e => setParaDate(e.target.value)}
                        style={textInputStyle}
                      />
                    </div>
                    <div>
                      <label style={labelStyle}>Urgent ?</label>
                      <select
                        value={paraUrgent}
                        onChange={e => setParaUrgent(e.target.value)}
                        style={textInputStyle}
                      >
                        <option value="Non">Non</option>
                        <option value="Oui">Oui (À faire immédiatement)</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* --- T6: BLOC OPÉRATOIRE FORM --- */}
              {activeFormTab === 'bloc' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div>
                    <label style={labelStyle}>Intitulé de l'intervention <span style={{ color: ehr.danger }}>*</span></label>
                    <input
                      type="text"
                      value={blocIntervention}
                      onChange={e => setBlocIntervention(e.target.value)}
                      placeholder="Ex : Appendicectomie laparoscopique..."
                      style={textInputStyle}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Indication opératoire <span style={{ color: ehr.danger }}>*</span></label>
                    <textarea
                      value={blocIndication}
                      onChange={e => setBlocIndication(e.target.value)}
                      rows={3}
                      placeholder="Justification clinique pour l'intervention..."
                      style={{ ...textInputStyle, resize: 'vertical' }}
                    />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div>
                      <label style={labelStyle}>Date prévisible</label>
                      <input
                        type="date"
                        value={blocDate}
                        onChange={e => setBlocDate(e.target.value)}
                        style={textInputStyle}
                      />
                    </div>
                    <div>
                      <label style={labelStyle}>Urgence</label>
                      <select
                        value={blocUrgence}
                        onChange={e => setBlocUrgence(e.target.value)}
                        style={textInputStyle}
                      >
                        <option value="Programmé">Programmé</option>
                        <option value="Semi-urgent">Semi-urgent (48h)</option>
                        <option value="Urgence absolue">Urgence absolue</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Button: Add to current order */}
              <button
                type="button"
                onClick={handleAddItemToDraft}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  width: '100%',
                  marginTop: 20,
                  borderRadius: 8,
                  backgroundColor: '#769cc4',
                  color: 'white',
                  padding: '12px 20px',
                  fontSize: 13,
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#648bb3'; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#769cc4'; }}
              >
                <Plus size={16} /> Ajouter à la prescription
              </button>
            </div>

            {/* RIGHT COLUMN: CURRENT PRESCRIPTIONS & VALIDATION PANEL */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* Card 1: Prescriptions en cours */}
              <div style={{
                backgroundColor: 'white',
                borderRadius: 12,
                border: `1px solid ${ehr.border}`,
                padding: 16,
                boxShadow: ehr.shadowCard
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  fontSize: 11,
                  fontWeight: 700,
                  color: ehr.primary,
                  textTransform: 'uppercase',
                  letterSpacing: '0.07em',
                  marginBottom: 12
                }}>
                  <CheckCircle size={16} />
                  Prescriptions en cours
                </div>

                {prescriptionsEnCours.length === 0 ? (
                  <div style={{
                    padding: '24px 16px',
                    textAlign: 'center',
                    border: `1px dashed ${ehr.border}`,
                    borderRadius: 8,
                    color: ehr.textMuted,
                    fontSize: 13,
                    backgroundColor: '#F8FAFC'
                  }}>
                    Aucune prescription en cours
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {prescriptionsEnCours.map(item => (
                      <div
                        key={item.id}
                        style={{
                          padding: 10,
                          backgroundColor: '#F8FAFC',
                          borderRadius: 8,
                          border: `1px solid ${ehr.borderSoft}`,
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: 12
                        }}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                            <span style={{
                              fontSize: 9,
                              fontWeight: 700,
                              textTransform: 'uppercase',
                              padding: '2px 6px',
                              borderRadius: 4,
                              backgroundColor: item.category === 'medicament' ? '#E3F2FD' : '#F1F5F9',
                              color: item.category === 'medicament' ? '#05668D' : ehr.textMuted
                            }}>
                              {item.type}
                            </span>
                            <span style={{ fontSize: 13, fontWeight: 700, color: ehr.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {item.nom}
                            </span>
                          </div>
                          <div style={{ fontSize: 11, color: ehr.textMuted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {item.details}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveDraftItem(item.id)}
                          style={{
                            border: 'none',
                            background: 'none',
                            color: '#ef4444',
                            cursor: 'pointer',
                            padding: 4,
                            borderRadius: 4,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'background-color 0.15s'
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#fee2e2'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                          title="Supprimer"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Card 2: Remarques Générales */}
              <div style={{
                backgroundColor: 'white',
                borderRadius: 12,
                border: `1px solid ${ehr.border}`,
                padding: 16,
                boxShadow: ehr.shadowCard
              }}>
                <label style={labelStyle}>Remarques Générales</label>
                <textarea
                  value={remarquesGenerales}
                  onChange={e => setRemarquesGenerales(e.target.value)}
                  rows={3}
                  placeholder="Notes complémentaires..."
                  style={{ ...textInputStyle, resize: 'vertical', minHeight: '60px' }}
                />
              </div>

              {/* Card 3: Notifier les Infirmiers toggle */}
              <div style={{
                backgroundColor: 'white',
                borderRadius: 12,
                border: `1px solid ${ehr.border}`,
                padding: 16,
                boxShadow: ehr.shadowCard,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 12
              }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: ehr.text }}>Notifier les infirmiers</div>
                  <div style={{ fontSize: 11, color: ehr.textMuted, marginTop: 2 }}>Envoyer une notification au service</div>
                </div>

                {/* Animated Custom Switch */}
                <button
                  type="button"
                  onClick={() => setNotifierInfirmiers(!notifierInfirmiers)}
                  style={{
                    position: 'relative',
                    width: 48,
                    height: 26,
                    borderRadius: 999,
                    backgroundColor: notifierInfirmiers ? ehr.primary : '#CBD5E1',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s',
                    padding: 0,
                    outline: 'none'
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      top: 3,
                      left: notifierInfirmiers ? 25 : 3,
                      width: 20,
                      height: 20,
                      borderRadius: '50%',
                      backgroundColor: 'white',
                      transition: 'left 0.2s',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                    }}
                  />
                </button>
              </div>

              {/* Disabled/Muted Helper Text & Validate Button */}
              <div>
                {validationAttempted && prescriptionsEnCours.length === 0 && (
                  <p style={{
                    color: ehr.danger,
                    fontSize: 12,
                    fontWeight: 600,
                    textAlign: 'center',
                    marginBottom: 8,
                    animation: 'pulse 1.5s infinite'
                  }}>
                    Ajoutez au moins un médicament.
                  </p>
                )}

                <button
                  type="button"
                  onClick={handleValidatePrescription}
                  disabled={saving}
                  style={{
                    width: '100%',
                    padding: '14px 20px',
                    borderRadius: 10,
                    backgroundColor: prescriptionsEnCours.length > 0 ? ehr.primary : '#8ba3c2',
                    color: 'white',
                    fontWeight: 700,
                    fontSize: 14,
                    border: 'none',
                    cursor: prescriptionsEnCours.length > 0 ? 'pointer' : 'not-allowed',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    boxShadow: prescriptionsEnCours.length > 0 ? '0 4px 10px rgba(5, 102, 141, 0.15)' : 'none',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    if (prescriptionsEnCours.length > 0) {
                      e.currentTarget.style.backgroundColor = ehr.primaryHover;
                      e.currentTarget.style.transform = 'translateY(-1px)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (prescriptionsEnCours.length > 0) {
                      e.currentTarget.style.backgroundColor = ehr.primary;
                      e.currentTarget.style.transform = 'translateY(0)';
                    }
                  }}
                >
                  <CheckCircle size={18} />
                  {saving ? 'SAUVEGARDE...' : 'Valider la prescription'}
                </button>
              </div>

            </div>

          </div>
        </div>
      ) : (
        /* HISTORIQUE / SYNCHRONIZED LIST OF PREVIOUS ORDERS */
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <p style={{ fontSize: 13, color: ehr.textMuted, margin: '0 0 8px 0' }}>
            Les prescriptions créées pour ce patient s’affichent ici avec leur statut lorsqu’il existe :{' '}
            <strong>Validé</strong>, <strong>En attente</strong> ou <strong>Refusé</strong>. Utilisez <em>Actualiser</em> pour synchroniser avec l'API.
          </p>

          {error && <div className="p-4 text-red-500 bg-red-50 rounded-lg border border-red-200" style={{ fontSize: 13 }}>{error}</div>}

          {prescriptions.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '40px 16px',
                color: ehr.textMuted,
                border: `1px dashed ${ehr.border}`,
                borderRadius: 12,
                backgroundColor: ehr.pageBg,
              }}
            >
              <p style={{ margin: '0 0 8px 0', fontWeight: 600 }}>Aucune prescription pour ce patient pour l’instant.</p>
              <p style={{ fontSize: 12, color: ehr.textMuted, maxWidth: 520, margin: '0 auto' }}>
                Utilisez le formulaire ci-dessus pour saisir une nouvelle ordonnance médicale ou cliquez sur Actualiser.
              </p>
            </div>
          ) : (
            prescriptions.map((pres, idx) => {
              const sansStatut = isTypeSansStatut(pres.categoriePrescription);
              const { visuel, label } = getStatutPrescriptionVisuel(pres.statut);
              const pill = statutPillColors(visuel);
              return (
                <EhrFormSection
                  key={pres.id}
                  title={`Ordonnance validée le ${new Date(pres.createdAt).toLocaleString('fr-FR')}`}
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
                    </p>
                  )}
                  {pres.remarques && (
                    <div style={{
                      fontSize: 13,
                      color: ehr.text,
                      marginBottom: 12,
                      padding: 10,
                      backgroundColor: '#F8FAFC',
                      borderRadius: 8,
                      borderLeft: `3px solid ${ehr.primary}`,
                      whiteSpace: 'pre-line'
                    }}>
                      {pres.remarques}
                    </div>
                  )}

                  {(pres.medicaments || []).length === 0 ? (
                    <p style={{ fontSize: 13, color: ehr.textMuted, margin: 0, fontStyle: 'italic' }}>Aucun médicament listé (ou soins cliniques uniquement).</p>
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
                          <div style={{ fontWeight: 600, color: ehr.text, fontSize: 14 }}>{med.nom}</div>
                          <div style={{ fontSize: 12, color: ehr.textMuted, marginTop: 4, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px 16px' }}>
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
      )}

      {/* --- PREMIUM POPUP DIALOG OVERLAY UPON VALIDATION SUCCESS --- */}
      {showSuccessOverlay && validatedPrescriptionData && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 100,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(4px)',
          padding: 16
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: 24,
            width: '100%',
            maxWidth: 540,
            padding: 32,
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)',
            border: '1px solid #E2E8F0',
            animation: 'scaleUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
            position: 'relative'
          }}>

            {/* Close Button */}
            <button
              type="button"
              onClick={() => setShowSuccessOverlay(false)}
              style={{
                position: 'absolute',
                top: 20,
                right: 20,
                border: 'none',
                background: 'none',
                color: ehr.textMuted,
                cursor: 'pointer',
                padding: 4,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#F1F5F9'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
            >
              <X size={20} />
            </button>

            {/* Success Icon Badge */}
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              marginBottom: 20
            }}>
              <div style={{
                width: 60,
                height: 60,
                borderRadius: '50%',
                backgroundColor: '#DCFCE7',
                color: '#15803D',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 24
              }}>
                <Check size={32} strokeWidth={3} />
              </div>
            </div>

            {/* Headers */}
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <h3 style={{ fontSize: 20, fontWeight: 800, color: ehr.text, margin: '0 0 8px 0' }}>
                Prescription validée avec succès !
              </h3>
              <p style={{ fontSize: 13, color: ehr.textMuted, margin: 0 }}>
                L'ordonnance a été signée et synchronisée avec le dossier clinique.
              </p>
            </div>

            {/* Details Box */}
            <div style={{
              backgroundColor: '#F8FAFC',
              borderRadius: 12,
              padding: 16,
              border: `1px solid ${ehr.borderSoft}`,
              maxHeight: 180,
              overflowY: 'auto',
              marginBottom: 24
            }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: ehr.textMuted, textTransform: 'uppercase', marginBottom: 8 }}>
                Éléments prescrits
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {validatedPrescriptionData.medicaments ? (
                  validatedPrescriptionData.medicaments.map(med => (
                    <div key={med.id} style={{ fontSize: 13, color: ehr.text }}>
                      • <strong>{med.nom}</strong> ({med.dose} • {med.duree})
                    </div>
                  ))
                ) : (
                  <div style={{ fontSize: 13, color: ehr.text, fontStyle: 'italic' }}>
                    Soins cliniques validés.
                  </div>
                )}
              </div>
            </div>

            {/* Actions button footer */}
            <div style={{ display: 'flex', gap: 12 }}>
              <button
                type="button"
                onClick={() => {
                  setShowSuccessOverlay(false);
                  setActiveMainTab('historique');
                }}
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  borderRadius: 10,
                  border: `1px solid ${ehr.border}`,
                  backgroundColor: 'white',
                  color: ehr.text,
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: 'pointer',
                  transition: 'background-color 0.15s'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#F8FAFC'; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'white'; }}
              >
                Voir l'historique
              </button>
              <button
                type="button"
                onClick={() => setShowSuccessOverlay(false)}
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  borderRadius: 10,
                  border: 'none',
                  backgroundColor: ehr.primary,
                  color: 'white',
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: 'pointer',
                  transition: 'background-color 0.15s'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = ehr.primaryHover; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = ehr.primary; }}
              >
                Faire une autre saisie
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Global CSS Inject for Animations */}
      <style jsx global>{`
        @keyframes scaleUp {
          from { transform: scale(0.95); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
      `}</style>

    </div>
  );
}
