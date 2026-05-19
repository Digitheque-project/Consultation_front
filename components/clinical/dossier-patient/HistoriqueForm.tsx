"use client";
import { useState, useEffect } from 'react';

const API_URL = 'https://prescription-sih-api-0yj3.onrender.com';

const FILTRES = [
  { id: 'all',   label: 'Tout',             icon: 'list' },
  { id: 'med',   label: 'Médicamenteuse',   icon: 'medication' },
  { id: 'nm',    label: 'Non Médicamenteuse', icon: 'self_care' },
  { id: 'surv',  label: 'Surveillance',     icon: 'monitor_heart' },
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
  med:   '#3b82f6', nm:   '#8b5cf6', surv:  '#10b981',
  trans: '#ef4444', labo: '#f59e0b', imag:  '#06b6d4',
  eeg:   '#6366f1', kine: '#84cc16', endo:  '#f97316',
  dial:  '#14b8a6', ana:  '#ec4899', bloc:  '#1e40af',
};

const ENDPOINTS: Record<string, string> = {
  med:   'prescriptions/medicale',
  nm:    'prescriptions/non-medicale',
  surv:  'prescriptions/surveillance',
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

interface Props {
  patient?: { id?: string, idPermanent?: string };
  prescripteur?: { id?: string };
}

export default function HistoriqueForm({ patient, prescripteur }: Props) {
  const [filtre, setFiltre] = useState('all');
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { fetchHistorique(); }, [filtre]);

  async function fetchHistorique() {
    setLoading(true);
    setError('');

    try {
      const patientId = patient?.id;
      const typesToFetch = filtre === 'all' ? Object.keys(ENDPOINTS) : [filtre];
      const results: any[] = [];

      await Promise.all(typesToFetch.map(async (type) => {
        try {
          const url = `${API_URL}/${ENDPOINTS[type]}${patientId ? `/patient/${patientId}` : ''}`;
          const res = await fetch(url, {
          });
          if (!res.ok) return;
          const data = await res.json();
          const list = Array.isArray(data) ? data : data.data || [];
          list.forEach((item: any) => results.push({ ...item, _type: type }));
        } catch { /* ignore les endpoints qui échouent */ }
      }));

      // Trier par date décroissante
      results.sort((a, b) => {
        const da = new Date(a.createdAt || a.date || 0).getTime();
        const db = new Date(b.createdAt || b.date || 0).getTime();
        return db - da;
      });

      setItems(results);
    } catch (e: any) {
      setError('Erreur lors du chargement : ' + e.message);
    } finally {
      setLoading(false);
    }
  }

  function formatDate(dateStr?: string) {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('fr-FR', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' });
  }

  function getTypeLabel(type: string) {
    return FILTRES.find(f => f.id === type)?.label || type;
  }

  function getResume(item: any, type: string) {
    switch (type) {
      case 'med':   return item.medicaments?.length > 0 ? item.medicaments.map((m: any) => `${m.nom} ${m.dose}`).join(', ') : 'Prescription médicale';
      case 'nm':    return item.type || item.description || 'Non médicamenteuse';
      case 'surv':  return item.parametre || item.type || 'Surveillance';
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

  return (
    <div>
      {/* TITRE */}
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--txt)', margin: 0 }}>
          Historique des prescriptions
        </h2>
        <p style={{ fontSize: 12, color: 'var(--txt3)', marginTop: 4 }}>
          {items.length} prescription{items.length > 1 ? 's' : ''} trouvée{items.length > 1 ? 's' : ''}
        </p>
      </div>

      {/* FILTRES */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 20 }}>
        {FILTRES.map(f => {
          const active = filtre === f.id;
          return (
            <button key={f.id} onClick={() => setFiltre(f.id)} style={{
              display: 'flex', alignItems: 'center', gap: 4,
              padding: '5px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
              border: active ? 'none' : '1px solid var(--bdr)',
              background: active ? (f.id === 'all' ? 'var(--navy)' : TYPE_COLORS[f.id] || 'var(--navy)') : 'var(--card)',
              color: active ? '#fff' : 'var(--txt2)',
              cursor: 'pointer', transition: 'all .15s',
            }}>
              <span className="ms" style={{ fontSize: 14 }}>{f.icon}</span>
              {f.label}
            </button>
          );
        })}
      </div>

      {/* CONTENU */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--txt3)' }}>
          <span className="ms" style={{ fontSize: 36, display: 'block', marginBottom: 8 }}>hourglass_top</span>
          Chargement...
        </div>
      ) : error ? (
        <div style={{ background: 'var(--red-lt)', border: '1px solid var(--red-bdr)', borderRadius: 8, padding: 16, color: 'var(--red)', fontSize: 13 }}>
          {error}
        </div>
      ) : items.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--txt3)' }}>
          <span className="ms" style={{ fontSize: 36, display: 'block', marginBottom: 8 }}>inbox</span>
          Aucune prescription trouvée
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {items.map((item, i) => {
            const color = TYPE_COLORS[item._type] || 'var(--navy)';
            return (
              <div key={i} className="card" style={{
                padding: '12px 16px', borderLeft: `4px solid ${color}`,
                display: 'flex', alignItems: 'flex-start', gap: 12,
              }}>
                {/* Icône type */}
                <div style={{
                  width: 36, height: 36, borderRadius: 8, flexShrink: 0,
                  background: color + '20', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <span className="ms" style={{ fontSize: 18, color }}>{FILTRES.find(f => f.id === item._type)?.icon || 'description'}</span>
                </div>

                {/* Infos */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: '2px 7px',
                      borderRadius: 10, background: color + '20', color,
                    }}>
                      {getTypeLabel(item._type)}
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--txt3)' }}>
                      {formatDate(item.createdAt || item.date)}
                    </span>
                  </div>
                  <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--txt)', marginTop: 4 }}>
                    {getResume(item, item._type)}
                  </div>
                  {item.remarque || item.remarques || item.instructions ? (
                    <div style={{ fontSize: 11, color: 'var(--txt3)', marginTop: 3 }}>
                      {item.remarque || item.remarques || item.instructions}
                    </div>
                  ) : null}
                </div>

                {/* Statut */}
                {item.statut && (
                  <div style={{
                    fontSize: 10, fontWeight: 700, padding: '3px 8px',
                    borderRadius: 10, flexShrink: 0,
                    background: item.statut === 'validé' ? '#d1fae5' : '#fef3c7',
                    color: item.statut === 'validé' ? '#065f46' : '#92400e',
                  }}>
                    {item.statut}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
