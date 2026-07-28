'use client';
import { useState } from 'react';
import { creerPrescriptionLabo } from '@/lib/prescription-api';

const CATEGORIES = [
  { id: 'hemato', label: '1. Hématologie & NFS', color: '#7c3aed', textColor: '#6d28d9', tube: 'Tube violet', analyses: ['NFS complète','Réticulocytes','VSH','Frottis sanguin','Groupage ABO / Rh','Test d\'Itano (drépanocytose)'] },
  { id: 'hemostase', label: '2. Hémostase', color: '#0284c7', textColor: '#075985', tube: 'Tube bleu', analyses: ['Temps de saignement (TS)','TQ / TP','INR','TCA','D-Dimères'] },
  { id: 'biochimie', label: '3. Biochimie sérique', color: '#059669', textColor: '#065f46', tube: 'Tube vert', subGroups: [
    { label: 'Métabolisme général', analyses: ['Glucose','HbA1c','Urée','Créatinine','Acide urique','CRP','Protéines totales','Albumine'] },
    { label: 'Bilan hépatique', analyses: ['ASAT (TGO)','ALAT (TGP)','GGT','PAL','Bilirubine totale','Bilirubine directe','LDH'] },
    { label: 'Bilan lipidique & pancréas', analyses: ['Cholestérol total','HDL','LDL','Triglycérides','Lipase','Amylase'] },
    { label: 'Ionogramme & minéraux', analyses: ['Sodium (Na⁺)','Potassium (K⁺)','Calcium','Magnésium','Phosphore','Fer sérique','Ferritine','Troponine'] },
  ]},
  { id: 'serologie', label: '4. Sérologie / Immunologie', color: '#dc2626', textColor: '#991b1b', tube: 'Tube rouge', analyses: ['Hépatite B (Ag HBs)','Hépatite C (Ac anti-VHC)','VIH 1 & 2','Widal & Félix','TPHA','VDRL / RPR','Toxoplasmose','Rubéole','β-HCG','TSH','T3 / T4','PSA'] },
  { id: 'urinaire', label: '5. Biochimie urinaire', color: '#d97706', textColor: '#92400e', tube: '', subGroups: [
    { label: 'Bandelette urinaire', analyses: ['Leucocytes','Nitrites','Protéines','Glucose','Sang / Hématies','pH urinaire','ECBU (Culot urinaire)','Protéinurie 24h'] },
  ]},
  { id: 'parasito', label: '6. Parasitologie / Microbiologie', color: '#16a34a', textColor: '#14532d', tube: '', analyses: ['TDR Paludisme','GE / Frottis (GE/FM)','Examen parasitologique selles','Recherche sang occulte','Recherche microfilaires'] },
  { id: 'liquide', label: '7. Liquide de ponction', color: '#0891b2', textColor: '#164e63', tube: '', subGroups: [
    { label: 'Nature du liquide', analyses: ['LCR','Liquide d\'ascite','Liquide pleural','Liquide péricardique','Autre ponction'] },
    { label: 'Analyses sur liquide', analyses: ['Biochimie (protéines, glucose)','Cytologie','Bactériologie / Culture'] },
  ]},
];

interface Props {
  patient: { id: string; nom?: string; prenom?: string; sexe?: string; dateNaissance?: string; allergies?: string[]; groupeSanguin?: string };
  prescripteur: { id?: string; nom?: string; prenom?: string; service?: string; chuId?: string; serviceId?: string };
  onAddToCart?: (item: { label: string; count: number; submit: () => Promise<unknown> }) => void;
}

function calcAge(dateNaissance?: string): number | null {
  if (!dateNaissance) return null;
  const diff = Date.now() - new Date(dateNaissance).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
}

interface ValidatedPrescription {
  urgence: string; alertes: string; renseignements: string; selected: string[]; notes: string;
  patient: Props["patient"] & { age: number | null; sexeLabel?: string };
  prescripteur: Props["prescripteur"]; date: string;
}

export default function LaboForm({ patient, prescripteur, onAddToCart }: Props) {
  const [urgence, setUrgence] = useState('n');
  const [alertes, setAlertes] = useState('');
  const [renseignements, setRenseignements] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [toast, setToast] = useState('');
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState('');
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [validatedPrescription, setValidatedPrescription] = useState<ValidatedPrescription | null>(null);

  const age = calcAge(patient?.dateNaissance);
  const sexeLabel = patient?.sexe === 'M' ? 'Masculin' : patient?.sexe === 'F' ? 'Féminin' : patient?.sexe;

  const urgenceStyle = {
    n:  { border: '#bbf7d0', bg: 'var(--inp)', dot: '#16a34a' },
    u:  { border: '#fde68a', bg: '#fffbeb',    dot: '#d97706' },
    tu: { border: '#fca5a5', bg: '#fef2f2',    dot: '#dc2626' },
  }[urgence] ?? { border: '#bbf7d0', bg: 'var(--inp)', dot: '#16a34a' };

  function toggle(val: string) { setSelected(prev => prev.includes(val) ? prev.filter(x => x !== val) : [...prev, val]); }
  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 2800); }
  const isFormValid = selected.length > 0 && renseignements.trim();

  async function handleSubmit() {
    setShowModal(false); setLoading(true); setApiError('');
    try {
      await creerPrescriptionLabo({ patientId: patient.id, prescripteurId: prescripteur.id, chuId: prescripteur.chuId, serviceId: prescripteur.serviceId, urgence, alertes, renseignements, analyses: selected, notes });
      setValidatedPrescription({ urgence, alertes, renseignements, selected, notes, patient: { ...patient, age, sexeLabel }, prescripteur, date: new Date().toLocaleString('fr-FR') });
      setShowValidationModal(true);
      showToast('Prescription transmise au laboratoire');
      setSelected([]); setRenseignements(''); setNotes(''); setUrgence('n'); setAlertes('');
    } catch { setApiError("Erreur lors de l'envoi. Vérifiez la connexion."); }
    finally { setLoading(false); }
  }

  return (
    <div>
      {apiError && <div style={{ background: "var(--red-lt)", border: "1px solid var(--red-bdr)", borderRadius: 8, padding: "10px 12px", fontSize: 12, color: "var(--red)", marginBottom: 12 }}>{apiError}</div>}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 16, alignItems: 'start' }}>
        <div>
          <div className="card mb12"><label className="lbl">Renseignements cliniques <span className="req">*</span></label><textarea rows={2} placeholder="Motif, antécédents, suspicion diagnostique..." value={renseignements} onChange={e => setRenseignements(e.target.value)} /></div>
          {CATEGORIES.map(cat => (
            <div key={cat.id} className="card mb12">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}><div style={{ width: 10, height: 10, borderRadius: '50%', background: cat.color, flexShrink: 0 }}></div><span style={{ fontSize: 13, fontWeight: 700, color: cat.textColor }}>{cat.label}{cat.tube && ` (${cat.tube})`}</span></div>
              {cat.subGroups ? cat.subGroups.map(sg => (
                <div key={sg.label} style={{ marginBottom: 10 }}><p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'var(--txt2)', marginBottom: 6 }}>{sg.label}</p><div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>{sg.analyses.map(a => <label key={a} className="cr"><span style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--txt2)' }}>{a}</span><input type="checkbox" checked={selected.includes(a)} onChange={() => toggle(a)} style={{ accentColor: 'var(--navy)', width: 16, height: 16, flexShrink: 0 }} /></label>)}</div></div>
              )) : <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>{cat.analyses!.map(a => <label key={a} className="cr"><span style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--txt2)' }}>{a}</span><input type="checkbox" checked={selected.includes(a)} onChange={() => toggle(a)} style={{ accentColor: 'var(--navy)', width: 16, height: 16, flexShrink: 0 }} /></label>)}</div>}
            </div>
          ))}
        </div>
        <div style={{ position: 'sticky', top: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="card" style={{ padding: 8 }}>
            <label className="lbl">Degré d&apos;urgence <span className="req">*</span></label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', borderRadius: 10, background: urgenceStyle.bg, border: `1.5px solid ${urgenceStyle.border}`, marginBottom: 8 }}>
              <div style={{ width: 9, height: 9, borderRadius: '50%', background: urgenceStyle.dot, flexShrink: 0 }}></div>
              <select value={urgence} onChange={e => setUrgence(e.target.value)} style={{ flex: 1, background: 'none', border: 'none', fontSize: 14, fontWeight: 600, color: 'var(--txt)', cursor: 'pointer', outline: 'none', fontFamily: 'inherit' }}>
                <option value="n">Normal</option><option value="u">Urgent</option><option value="tu">TRES_URGENT</option>
              </select>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}><span className="ms" style={{ fontSize: 16, color: 'var(--red)' }}>warning</span><span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.8px', color: 'var(--red)' }}>Précautions &amp; Alertes</span></div>
            <textarea style={{ background: 'var(--red-lt)', border: '1.5px dashed var(--red-bdr)', borderRadius: 10, padding: '8px 12px', fontSize: 14, width: '100%', resize: 'none' }} rows={1} placeholder="Allergies, contre-indications..." value={alertes} onChange={e => setAlertes(e.target.value)} />
          </div>
          {selected.length > 0 && (
            <div style={{ background: 'var(--navy-lt)', border: '1.5px solid var(--navy-mid)', borderRadius: 12, padding: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}><span className="ms" style={{ fontSize: 16, color: 'var(--navy)' }}>science</span><span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.8px', color: 'var(--navy)' }}>{selected.length} analyse{selected.length > 1 ? 's' : ''} sélectionnée{selected.length > 1 ? 's' : ''}</span></div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>{selected.map(a => (<span key={a} style={{ background: '#fff', border: '1px solid var(--navy-mid)', borderRadius: 20, padding: '3px 10px', fontSize: 12, fontWeight: 600, color: 'var(--navy)', display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer' }} onClick={() => toggle(a)}>{a}<span className="ms" style={{ fontSize: 13 }}>close</span></span>))}</div>
            </div>
          )}
          <div className="card" style={{ padding: 12 }}><label className="lbl">Notes complémentaires</label><textarea rows={3} placeholder="Ex : patient à jeun, dernier repas à 8h..." value={notes} onChange={e => setNotes(e.target.value)} /></div>
          <button className="bp" onClick={() => setShowModal(true)} style={{ opacity: isFormValid && !loading ? 1 : 0.5, pointerEvents: isFormValid && !loading ? 'auto' : 'none', marginTop: 0 }}><span className="ms">check_circle</span>{loading ? "Envoi..." : "Valider la prescription"}</button>
        </div>
      </div>
      {showModal && <div className="mb op" onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}><div className="mbox"><h3>Valider — Laboratoire</h3><p>{selected.length} analyse{selected.length > 1 ? 's' : ''} sélectionnée{selected.length > 1 ? 's' : ''}. La prescription sera transmise au laboratoire.</p><div className="mbtns"><button className="bca" onClick={() => setShowModal(false)}>Annuler</button><button className="bok" onClick={() => { if (onAddToCart) { const snap = { patientId: patient.id, prescripteurId: prescripteur.id, chuId: prescripteur.chuId, serviceId: prescripteur.serviceId, urgence, alertes, renseignements, analyses: [...selected], notes }; onAddToCart({ label: `Labo — ${selected.length} analyse${selected.length > 1 ? "s" : ""}`, count: selected.length, submit: () => creerPrescriptionLabo(snap) }); setShowModal(false); } else { handleSubmit(); } }}>Confirmer</button></div></div></div>}
      {showValidationModal && validatedPrescription && (
        <div className="mb op" onClick={e => { if (e.target === e.currentTarget) setShowValidationModal(false); }}>
          <div className="mbox" style={{ maxWidth: 600, width: '95%', maxHeight: '85vh', overflowY: 'auto' }}>
            <div style={{ background: 'var(--navy)', color: '#fff', padding: '16px 20px', borderRadius: '20px 20px 0 0', display: 'flex', alignItems: 'center', gap: 12 }}>
              <span className="ms" style={{ fontSize: 24 }}>check_circle</span>
              <div><h3 style={{ fontFamily: '"Manrope", sans-serif', fontSize: 18, fontWeight: 800, margin: 0 }}>Prescription laboratoire validée</h3><p style={{ fontSize: 12, opacity: 0.9, margin: '4px 0 0 0' }}>{validatedPrescription.date}</p></div>
            </div>
            <div style={{ padding: '20px' }}>
              <div style={{ background: 'var(--navy-lt)', borderRadius: 12, padding: '14px 16px', marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}><div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--navy)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span className="ms" style={{ fontSize: 22, color: '#fff' }}>person</span></div><div><div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--txt3)', marginBottom: 2 }}>Patient</div><div style={{ fontSize: 15, fontWeight: 700, color: 'var(--navy)' }}>{validatedPrescription.patient.prenom} {validatedPrescription.patient.nom}</div></div></div>
                {validatedPrescription.patient.allergies && validatedPrescription.patient.allergies.length > 0 && (<div style={{ marginTop: 8, padding: '8px 12px', background: '#fef3c7', border: '1px solid #fbbf24', borderRadius: 8, fontSize: 12, color: '#92400e', display: 'flex', alignItems: 'center', gap: 6 }}><span className="ms" style={{ fontSize: 14 }}>warning</span><strong>Allergies:</strong> {validatedPrescription.patient.allergies.join(', ')}</div>)}
              </div>
              <div style={{ marginBottom: 16 }}>
                <div style={{ background: '#fff', border: '1px solid var(--bdr)', borderRadius: 10, padding: '12px 14px', marginBottom: 8 }}><div style={{ fontSize: 14, fontWeight: 700, color: 'var(--txt)', marginBottom: 4 }}>Renseignements cliniques</div><div style={{ fontSize: 12, color: 'var(--txt2)' }}>{validatedPrescription.renseignements}</div></div>
                <div style={{ background: '#fff', border: '1px solid var(--bdr)', borderRadius: 10, padding: '12px 14px', marginBottom: 8 }}><div style={{ fontSize: 14, fontWeight: 700, color: 'var(--txt)', marginBottom: 8 }}>Analyses demandées ({validatedPrescription.selected.length})</div><div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>{validatedPrescription.selected.map((a: string, i: number) => (<span key={i} style={{ background: 'var(--navy-lt)', borderRadius: 20, padding: '3px 10px', fontSize: 11, fontWeight: 600, color: 'var(--navy)' }}>{a}</span>))}</div></div>
              </div>
              <div style={{ background: validatedPrescription.urgence === 'n' ? '#dbeafe' : validatedPrescription.urgence === 'u' ? '#fef3c7' : '#fee2e2', borderRadius: 10, padding: '12px 14px', marginBottom: 16 }}><div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: validatedPrescription.urgence === 'n' ? '#1e40af' : validatedPrescription.urgence === 'u' ? '#92400e' : '#991b1b', marginBottom: 4 }}>Degré d&apos;urgence</div><div style={{ fontSize: 13, fontWeight: 700, color: validatedPrescription.urgence === 'n' ? '#1e40af' : validatedPrescription.urgence === 'u' ? '#92400e' : '#991b1b' }}>{validatedPrescription.urgence === 'n' ? 'Normal' : validatedPrescription.urgence === 'u' ? 'Urgent' : 'TRES_URGENT'}</div></div>
              {validatedPrescription.alertes && (<div style={{ background: 'var(--red-lt)', borderRadius: 10, padding: '12px 14px', marginBottom: 16 }}><div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--red)', marginBottom: 4 }}>Alertes</div><div style={{ fontSize: 13, color: 'var(--txt)' }}>{validatedPrescription.alertes}</div></div>)}
              <div className="mbtns" style={{ marginTop: 20 }}><button className="bok" onClick={() => setShowValidationModal(false)}>Fermer</button></div>
            </div>
          </div>
        </div>
      )}
      {toast && <div className="tst on"><span className="ms">check_circle</span>{toast}</div>}
    </div>
  );
}
