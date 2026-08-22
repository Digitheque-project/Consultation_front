"use client";
import { useState, useEffect } from 'react';
import { getConsultationExterneApiUrl } from '@/lib/api/consultation-config';

// Relayé par notre propre backend (src/prescription/ côté Consultation_back),
// comme le reste des appels prescription (voir lib/prescription-api.ts) —
// oublié lors de cette migration, appelait encore directement
// NEXT_PUBLIC_PRESCRIPTION_URL (variable qui n'existe plus).
const API_URL = getConsultationExterneApiUrl('/prescription');

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('access_token') || localStorage.getItem('auth_token') || localStorage.getItem('token');
}

const FILTRES = [
  { id: 'all',   label: 'Tout',             icon: 'list' },
  { id: 'trans', label: 'Transfusion',      icon: 'bloodtype' },
  { id: 'labo',  label: 'Laboratoire',      icon: 'science' },
  { id: 'imag',  label: 'Imagerie',         icon: 'radiology' },
  { id: 'eeg',   label: 'EEG',              icon: 'neurology' },
  { id: 'kine',  label: 'Kinésithérapie',   icon: 'exercise' },
  { id: 'endo',  label: 'Endoscopie',       icon: 'visibility' },
  { id: 'dial',  label: 'Dialyse',          icon: 'water_full' },
  { id: 'ana',   label: 'Anapath',          icon: 'biotech' },
  { id: 'bloc',  label: 'Bloc Opératoire',  icon: 'medical_services' },
];

const TYPE_COLORS: Record<string, string> = {
  trans: '#ef4444', labo: '#f59e0b', imag:  '#06b6d4',
  eeg:   '#6366f1', kine: '#84cc16', endo:  '#f97316',
  dial:  '#14b8a6', ana:  '#ec4899', bloc:  '#1e40af',
};

const ENDPOINTS: Record<string, string> = {
  trans: 'prescriptions/transfusion',
  labo:  'prescriptions/labo',
  imag:  'prescriptions/imagerie',
  eeg:   'prescriptions/eeg',
  kine:  'prescriptions/kine',
  endo:  'prescriptions/endoscopie',
  dial:  'prescriptions/dialyse',
  ana:   'prescriptions/anapath',
  bloc:  'prescriptions/bloc',
};

interface PrescriptionItem {
  _type: string;
  createdAt?: string; date?: string; statut?: string; remarque?: string; remarques?: string; instructions?: string; description?: string; nom?: string; medicament?: string; type?: string; parametre?: string; produit?: string; groupe?: string; examen?: string; analyse?: string; seance?: string; intervention?: string; urgence?: string; alertes?: string; renseignements?: string; notes?: string;
  analyses?: string[]; examens?: Record<string, string[]>; typeEEG?: string; typeKine?: string; diagnostic?: string; contreIndications?: string[]; objectifs?: string; typeExamen?: string; typeDialyse?: string;
  data?: Record<string, unknown>; libelle?: string; risqueHemorragique?: string; typeChirurgie?: string; chirurgien?: string; consignes?: string; dateIntervention?: string; atcdTransfusion?: boolean; incident?: string; groupage?: string; hb?: string; plaquettes?: string; quantite?: string; datePrevue?: string;
}

interface Props {
  patient?: { id?: string };
  prescripteur?: { id?: string };
}

export default function HistoriqueForm({ patient }: Props) {
  const [filtre, setFiltre] = useState('all');
  const [items, setItems] = useState<PrescriptionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedItem, setSelectedItem] = useState<PrescriptionItem | null>(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    async function fetchHistorique() {
      setLoading(true); setError('');
      try {
        const patientId = patient?.id;
        const typesToFetch = filtre === 'all' ? Object.keys(ENDPOINTS) : [filtre];
        const results: PrescriptionItem[] = [];
        const token = getToken();
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        await Promise.all(typesToFetch.map(async (type) => {
          try {
            const url = `${API_URL}/${ENDPOINTS[type]}${patientId ? `/patient/${patientId}` : ''}`;
            const res = await fetch(url, { headers });
            if (!res.ok) return;
            const data = await res.json();
            const list = Array.isArray(data) ? data : data.data || [];
            list.forEach((item: Partial<PrescriptionItem>) => results.push({ ...item, _type: type } as PrescriptionItem));
          } catch { /* ignore les endpoints qui échouent */ }
        }));

        results.sort((a, b) => {
          const da = new Date(a.createdAt || a.date || 0).getTime();
          const db = new Date(b.createdAt || b.date || 0).getTime();
          return db - da;
        });
        setItems(results);
      } catch (e: unknown) {
        setError('Erreur lors du chargement : ' + (e instanceof Error ? e.message : String(e)));
      } finally { setLoading(false); }
    }
    fetchHistorique();
  }, [filtre, patient?.id]);

  function formatDate(dateStr?: string) {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('fr-FR', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' });
  }

  function getTypeLabel(type: string) { return FILTRES.find(f => f.id === type)?.label || type; }

  function getResume(item: PrescriptionItem, type: string) {
    switch (type) {
      case 'trans': return item.produit || item.groupe || 'Transfusion';
      case 'labo':  return item.examen || item.analyse || 'Analyse laboratoire';
      case 'imag':  return item.examen || item.type || 'Imagerie';
      case 'eeg':   return item.type || 'EEG';
      case 'kine':  return item.type || item.seance || 'Kinésithérapie';
      case 'endo':  return item.type || 'Endoscopie';
      case 'dial':  return item.type || 'Dialyse';
      case 'ana':   return item.examen || item.type || 'Anapath';
      case 'bloc':  return item.intervention || item.type || 'Bloc opératoire';
      default:      return item.description || item.nom || '—';
    }
  }

  function handleItemClick(item: PrescriptionItem) { setSelectedItem(item); setShowModal(true); }

  function renderDetailField(label: string, value: unknown) {
    if (value === undefined || value === null || value === '') return null;
    return (
      <div style={{ marginBottom: 8 }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--txt3)' }}>{label}: </span>
        <span style={{ fontSize: 12, color: 'var(--txt)' }}>{String(value)}</span>
      </div>
    );
  }

  function getUrgenceLabel(u?: string) {
    if (!u) return '';
    switch (u.toLowerCase()) {
      case 'n':       case 'normal':     case 'normale':   return 'Normale';
      case 'u':       case 'urgent':     case 'urgente':   return 'Urgente';
      case 'tu':      case 'tres_urgent': case 'stat':      return 'TRES_URGENT (Urgence vitale)';
      default: return u;
    }
  }

  function renderPrescriptionDetails(item: PrescriptionItem, type: string) {
    const color = TYPE_COLORS[type] || 'var(--navy)';
    switch (type) {
      case 'trans':
        return (<div>{renderDetailField('Urgence', getUrgenceLabel(item.urgence))}{renderDetailField('Alertes', item.alertes)}{renderDetailField('Renseignements cliniques', item.renseignements)}{renderDetailField('Antécédents transfusionnels', item.atcdTransfusion ? 'Oui' : 'Non')}{renderDetailField('Incidents précédents', item.incident)}{renderDetailField('Groupage sanguin', item.groupage)}{renderDetailField('Hémoglobine', item.hb)}{renderDetailField('Produit', item.produit)}{renderDetailField('Plaquettes', item.plaquettes)}{renderDetailField('Quantité', item.quantite)}{renderDetailField('Date prévue', item.datePrevue)}{renderDetailField('Notes', item.notes)}</div>);
      case 'labo':
        return (<div>{renderDetailField('Urgence', getUrgenceLabel(item.urgence))}{renderDetailField('Alertes', item.alertes)}{renderDetailField('Renseignements cliniques', item.renseignements)}{item.analyses && Array.isArray(item.analyses) && item.analyses.length > 0 && (<div style={{ marginTop: 12 }}><div style={{ fontSize: 12, fontWeight: 700, color, marginBottom: 8 }}>Analyses demandées:</div><div style={{ background: 'var(--bg2)', padding: 10, borderRadius: 6 }}>{item.analyses.map((a: string, i: number) => <div key={i} style={{ fontSize: 12, marginBottom: 4 }}>• {a}</div>)}</div></div>)}{renderDetailField('Notes', item.notes)}</div>);
      case 'imag':
        return (<div>{renderDetailField('Urgence', getUrgenceLabel(item.urgence))}{renderDetailField('Alertes', item.alertes)}{renderDetailField('Renseignements cliniques', item.renseignements)}{item.examens && typeof item.examens === 'object' && Object.keys(item.examens).length > 0 && (<div style={{ marginTop: 12 }}><div style={{ fontSize: 12, fontWeight: 700, color, marginBottom: 8 }}>Examens demandés:</div>{Object.entries(item.examens).map(([t, exams]: [string, string[]]) => (<div key={t} style={{ marginBottom: 8 }}><div style={{ fontSize: 11, fontWeight: 600, color: 'var(--txt3)' }}>{t}:</div>{Array.isArray(exams) && exams.map((e: string, i: number) => <div key={i} style={{ fontSize: 12, marginLeft: 8 }}>• {e}</div>)}</div>))}</div>)}{renderDetailField('Notes', item.notes)}</div>);
      case 'eeg':
        return (<div>{renderDetailField('Urgence', getUrgenceLabel(item.urgence))}{renderDetailField('Alertes', item.alertes)}{renderDetailField('Renseignements cliniques', item.renseignements)}{renderDetailField("Type d'EEG", item.typeEEG)}{renderDetailField('Remarques', item.remarques)}</div>);
      case 'kine':
        return (<div>{renderDetailField('Urgence', getUrgenceLabel(item.urgence))}{renderDetailField('Alertes', item.alertes)}{renderDetailField('Renseignements cliniques', item.renseignements)}{renderDetailField('Type de kinésithérapie', item.typeKine)}{renderDetailField('Diagnostic', item.diagnostic)}{item.contreIndications && Array.isArray(item.contreIndications) && item.contreIndications.length > 0 && (<div style={{ marginTop: 8 }}><div style={{ fontSize: 11, fontWeight: 600, color: 'var(--txt3)' }}>Contre-indications:</div>{item.contreIndications.map((ci: string, i: number) => <div key={i} style={{ fontSize: 12, marginLeft: 8 }}>• {ci}</div>)}</div>)}{renderDetailField('Objectifs', item.objectifs)}{renderDetailField('Remarques', item.remarques)}</div>);
      case 'endo':
        return (<div>{renderDetailField('Urgence', getUrgenceLabel(item.urgence))}{renderDetailField('Alertes', item.alertes)}{renderDetailField('Renseignements cliniques', item.renseignements)}{renderDetailField("Type d'examen", item.typeExamen)}{renderDetailField('Remarques', item.remarques)}</div>);
      case 'dial':
        return (<div>{renderDetailField('Urgence', getUrgenceLabel(item.urgence))}{renderDetailField('Alertes', item.alertes)}{renderDetailField('Renseignements cliniques', item.renseignements)}{renderDetailField('Type de dialyse', item.typeDialyse)}{renderDetailField('Remarques', item.remarques)}</div>);
      case 'ana':
        return (<div>{renderDetailField('Urgence', getUrgenceLabel(item.urgence))}{renderDetailField('Alertes', item.alertes)}{renderDetailField("Type d'examen", item.typeExamen)}{item.data && typeof item.data === 'object' && Object.keys(item.data).length > 0 && (<div style={{ marginTop: 12 }}><div style={{ fontSize: 12, fontWeight: 700, color, marginBottom: 8 }}>Détails:</div>{Object.entries(item.data).map(([key, value]: [string, unknown]) => renderDetailField(key.charAt(0).toUpperCase() + key.slice(1), value))}</div>)}</div>);
      case 'bloc':
        return (<div>{renderDetailField('Urgence', getUrgenceLabel(item.urgence))}{renderDetailField('Alertes', item.alertes)}{renderDetailField('Libellé intervention', item.libelle)}{renderDetailField('Risque hémorragique', item.risqueHemorragique)}{renderDetailField('Type de chirurgie', item.typeChirurgie)}{renderDetailField('Chirurgien', item.chirurgien)}{renderDetailField('Consignes', item.consignes)}{renderDetailField('Date intervention', item.dateIntervention)}</div>);
      default:
        return (<div>{renderDetailField('Description', item.description)}{renderDetailField('Remarques', item.remarques)}</div>);
    }
  }

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--txt)', margin: 0 }}>Historique des prescriptions</h2>
        <p style={{ fontSize: 12, color: 'var(--txt3)', marginTop: 4 }}>{items.length} prescription{items.length > 1 ? 's' : ''} trouvée{items.length > 1 ? 's' : ''}</p>
      </div>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 20 }}>
        {FILTRES.map(f => {
          const active = filtre === f.id;
          return (
            <button key={f.id} onClick={() => setFiltre(f.id)} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, border: active ? 'none' : '1px solid var(--bdr)', background: active ? (f.id === 'all' ? 'var(--navy)' : TYPE_COLORS[f.id] || 'var(--navy)') : 'var(--card)', color: active ? '#fff' : 'var(--txt2)', cursor: 'pointer', transition: 'all .15s' }}>
              <span className="ms" style={{ fontSize: 14 }}>{f.icon}</span>{f.label}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--txt3)' }}><span className="ms" style={{ fontSize: 36, display: 'block', marginBottom: 8 }}>hourglass_top</span>Chargement...</div>
      ) : error ? (
        <div style={{ background: 'var(--red-lt)', border: '1px solid var(--red-bdr)', borderRadius: 8, padding: 16, color: 'var(--red)', fontSize: 13 }}>{error}</div>
      ) : items.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--txt3)' }}><span className="ms" style={{ fontSize: 36, display: 'block', marginBottom: 8 }}>inbox</span>Aucune prescription trouvée</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {items.map((item, i) => {
            const color = TYPE_COLORS[item._type] || 'var(--navy)';
            return (
              <div key={i} className="card" style={{ padding: '12px 16px', borderLeft: `4px solid ${color}`, display: 'flex', alignItems: 'flex-start', gap: 12, cursor: 'pointer' }} onClick={() => handleItemClick(item)}>
                <div style={{ width: 36, height: 36, borderRadius: 8, flexShrink: 0, background: color + '20', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span className="ms" style={{ fontSize: 18, color }}>{FILTRES.find(f => f.id === item._type)?.icon || 'description'}</span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 10, background: color + '20', color }}>{getTypeLabel(item._type)}</span>
                    <span style={{ fontSize: 11, color: 'var(--txt3)' }}>{formatDate(item.createdAt || item.date)}</span>
                  </div>
                  <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--txt)', marginTop: 4 }}>{getResume(item, item._type)}</div>
                  {(item.remarque || item.remarques || item.instructions) ? <div style={{ fontSize: 11, color: 'var(--txt3)', marginTop: 3 }}>{item.remarque || item.remarques || item.instructions}</div> : null}
                </div>
                {item.statut && (<div style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 10, flexShrink: 0, background: item.statut === 'validé' ? '#d1fae5' : '#fef3c7', color: item.statut === 'validé' ? '#065f46' : '#92400e' }}>{item.statut}</div>)}
              </div>
            );
          })}
        </div>
      )}

      {showModal && selectedItem && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setShowModal(false)}>
          <div className="card" style={{ maxWidth: 600, width: '90%', maxHeight: '80vh', overflowY: 'auto', padding: 24, borderRadius: 12 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 8, background: (TYPE_COLORS[selectedItem._type] || 'var(--navy)') + '20', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span className="ms" style={{ fontSize: 20, color: TYPE_COLORS[selectedItem._type] || 'var(--navy)' }}>{FILTRES.find(f => f.id === selectedItem._type)?.icon || 'description'}</span>
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--txt)' }}>{getTypeLabel(selectedItem._type)}</div>
                  <div style={{ fontSize: 11, color: 'var(--txt3)' }}>{formatDate(selectedItem.createdAt || selectedItem.date)}</div>
                </div>
              </div>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 24, color: 'var(--txt3)', padding: 4 }}>×</button>
            </div>
            {selectedItem.statut && (<div style={{ display: 'inline-block', fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 10, marginBottom: 16, background: selectedItem.statut === 'validé' ? '#d1fae5' : '#fef3c7', color: selectedItem.statut === 'validé' ? '#065f46' : '#92400e' }}>Statut: {selectedItem.statut}</div>)}
            <div style={{ fontSize: 12, color: 'var(--txt)', lineHeight: 1.6 }}>{renderPrescriptionDetails(selectedItem, selectedItem._type)}</div>
            <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--bdr)' }}>
              <button onClick={() => setShowModal(false)} style={{ width: '100%', padding: 10, borderRadius: 8, background: 'var(--navy)', color: '#fff', border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Fermer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
