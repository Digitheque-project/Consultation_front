"use client";
import { useState } from 'react';
import { creerPrescriptionTransfusion } from '@/lib/prescription-api';

type Urgence = "n" | "u" | "tu";
type ProduitSanguin = "sang-total" | "cgr" | "pfc" | "prp";
const urgenceClasses: Record<Urgence, string> = { n: "un", u: "uu", tu: "utu" };

interface Props {
  patient: { id: string; nom?: string; prenom?: string; sexe?: string; dateNaissance?: string; allergies?: string[]; groupeSanguin?: string; };
  prescripteur: { id?: string; nom?: string; prenom?: string; service?: string; chuId?: string; serviceId?: string };
  onAddToCart?: (item: { label: string; count: number; submit: () => Promise<unknown> }) => void;
}

function calcAge(dateNaissance?: string): number | null {
  if (!dateNaissance) return null;
  const diff = Date.now() - new Date(dateNaissance).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
}

interface ValidatedPrescription {
  urgence: Urgence; alertes: string; renseignements: string; atcd: boolean; incident: string; groupage: string; hb: string; produit: ProduitSanguin; plaquettes: string; quantite: string; datePrevue: string; notes: string;
  patient: Props["patient"] & { age: number | null; sexeLabel?: string };
  prescripteur: Props["prescripteur"]; date: string;
}

export default function TransfusionForm({ patient, prescripteur, onAddToCart }: Props) {
  const [urgence, setUrgence] = useState<Urgence>("n");
  const [alertes, setAlertes] = useState('');
  const [renseignements, setRenseignements] = useState('');
  const [atcd, setAtcd] = useState(false);
  const [incident, setIncident] = useState('');
  const [groupage, setGroupage] = useState('');
  const [hb, setHb] = useState('');
  const [produit, setProduit] = useState<ProduitSanguin>('cgr');
  const [plaquettes, setPlaquettes] = useState('');
  const [quantite, setQuantite] = useState('');
  const [datePrevue, setDatePrevue] = useState('');
  const [notes, setNotes] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [toast, setToast] = useState('');
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState('');
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [validatedPrescription, setValidatedPrescription] = useState<ValidatedPrescription | null>(null);

  const age = calcAge(patient?.dateNaissance);
  const sexeLabel = patient?.sexe === 'M' ? 'Masculin' : patient?.sexe === 'F' ? 'Féminin' : patient?.sexe;

  const isFormValid = !!(renseignements.trim() && groupage && produit && quantite.trim());
  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 2800); }

  async function handleSubmit() {
    setShowModal(false); setLoading(true); setApiError('');
    try {
      await creerPrescriptionTransfusion({ patientId: patient.id, prescripteurId: prescripteur.id, chuId: prescripteur.chuId, serviceId: prescripteur.serviceId, urgence, alertes, renseignements, atcdTransfusion: atcd, incident, groupage, hb: hb ? parseFloat(hb) : undefined, produit, plaquettes: produit === 'prp' ? plaquettes : undefined, quantite, datePrevue: datePrevue || undefined, notes });
      setValidatedPrescription({ urgence, alertes, renseignements, atcd, incident, groupage, hb, produit, plaquettes, quantite, datePrevue, notes, patient: { ...patient, age, sexeLabel }, prescripteur, date: new Date().toLocaleString('fr-FR') });
      setShowValidationModal(true);
      showToast('Prescription transfusion envoyée au dépôt de sang');
      setUrgence("n"); setAlertes(''); setRenseignements(''); setAtcd(false); setIncident('');
      setGroupage(''); setHb(''); setProduit('cgr'); setPlaquettes(''); setQuantite(''); setDatePrevue(''); setNotes('');
    } catch { setApiError("Erreur lors de l'envoi de la prescription transfusion."); }
    finally { setLoading(false); }
  }

  return (
    <div>
      {apiError && <div style={{ background: "var(--red-lt)", border: "1px solid var(--red-bdr)", borderRadius: 8, padding: "10px 12px", fontSize: 12, color: "var(--red)", marginBottom: 12 }}>{apiError}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 16, alignItems: 'start' }}>
        <div className="card" style={{ padding: 12 }}>
          <div className="mb12"><label className="lbl">Renseignements cliniques <span className="req">*</span></label><textarea rows={3} placeholder="Pathologie, contexte, motif de la transfusion..." value={renseignements} onChange={e => setRenseignements(e.target.value)} /></div>
          <div className="mb12"><label className="lbl">Groupage sanguin <span className="req">*</span></label><select value={groupage} onChange={e => setGroupage(e.target.value)}><option value="">— Sélectionner —</option>{['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(g => <option key={g}>{g}</option>)}</select></div>
          <div className="mb12"><label className="lbl">Hémoglobine — Hb (g/l)</label><input type="number" min={0} step={0.1} placeholder="Ex : 7.5" value={hb} onChange={e => setHb(e.target.value)} /></div>
          <div className="mb12"><label className="lbl">Type de produit sanguin <span className="req">*</span></label><div className="g2" style={{ gap: 7 }}>{[{ value: 'sang-total', label: 'Sang total' },{ value: 'cgr', label: 'Culot globulaire (CGR)' },{ value: 'pfc', label: 'Plasma frais-congelé (PFC)' },{ value: 'prp', label: 'Plasma riche en plaquettes (PRP)' }].map(p => <label key={p.value} className="rc"><input type="radio" name="prod-sang" checked={produit === p.value} onChange={() => setProduit(p.value as ProduitSanguin)} /><span>{p.label}</span></label>)}</div></div>
          {produit === 'prp' && <div className="mb12"><label className="lbl">Nombre de plaquettes (G/l) <span className="req">*</span></label><input type="number" min={0} placeholder="Nombre de plaquettes en G/l" value={plaquettes} onChange={e => setPlaquettes(e.target.value)} /></div>}
          <div className="g2 mb12"><div><label className="lbl">Quantité <span className="req">*</span></label><input type="text" placeholder="Ex : 2 unités, 250 ml..." value={quantite} onChange={e => setQuantite(e.target.value)} /></div><div><label className="lbl">Date prévue</label><input type="date" value={datePrevue} onChange={e => setDatePrevue(e.target.value)} /></div></div>
          <label className="lbl">Remarques / Notes</label><textarea rows={2} placeholder="Notes complémentaires pour le dépôt de sang..." value={notes} onChange={e => setNotes(e.target.value)} />
        </div>

        <div style={{ position: 'sticky', top: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="card" style={{ padding: 8 }}>
            <label className="lbl">Degré d&apos;urgence <span className="req">*</span></label>
            <div className={`urgr ${urgenceClasses[urgence]}`} style={{ marginBottom: 8 }}><div className="urgd" /><select className="urgs" value={urgence} onChange={e => setUrgence(e.target.value as Urgence)}><option value="n">Normal</option><option value="u">Urgent</option><option value="tu">TRES_URGENT</option></select></div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}><span className="ms" style={{ fontSize: 16, color: 'var(--red)' }}>warning</span><span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.8px', color: 'var(--red)' }}>Alertes</span></div>
            <textarea style={{ background: 'var(--red-lt)', border: '1.5px dashed var(--red-bdr)', borderRadius: 10, padding: '8px 12px', fontSize: 14, width: '100%', resize: 'none' }} rows={1} placeholder="Contre-indications..." value={alertes} onChange={e => setAlertes(e.target.value)} />
          </div>
          <div className="card" style={{ padding: 12 }}>
            <div className="togr">
              <div className="togr-l"><p>Antécédent de transfusion</p><span>Le patient a-t-il déjà reçu des produits sanguins ?</span></div>
              <label className="tog"><input type="checkbox" checked={atcd} onChange={e => setAtcd(e.target.checked)}/><span className="tog-t"></span></label>
            </div>
            {atcd && <div style={{ marginTop: 10 }}><label className="lbl">Incident transfusionnel</label><textarea rows={2} placeholder="Décrire l'incident..." value={incident} onChange={e => setIncident(e.target.value)} /></div>}
          </div>
          <button className="bp" onClick={() => setShowModal(true)} disabled={!isFormValid || loading} style={{ opacity: isFormValid && !loading ? 1 : 0.5, marginTop: 0 }}>
            <span className="ms">check_circle</span>{loading ? "Envoi..." : "Valider — Envoyer au dépôt de sang"}
          </button>
        </div>
      </div>

      <p className="hint" style={{ textAlign: 'center', marginTop: 6 }}>La prescription sera transmise automatiquement au service dépôt de sang après validation</p>
      {showModal && <div className="mb op" onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}><div className="mbox"><h3>Valider — Transfusion Sanguine</h3><p>La prescription sera transmise au dépôt de sang.</p><div className="mbtns"><button className="bca" onClick={() => setShowModal(false)}>Annuler</button><button className="bok" onClick={() => { if (onAddToCart) { const snap = { patientId: patient.id, prescripteurId: prescripteur.id, chuId: prescripteur.chuId, serviceId: prescripteur.serviceId, urgence, alertes, renseignements, atcdTransfusion: atcd, incident, groupage, hb: hb ? parseFloat(hb) : undefined, produit, plaquettes: produit === "prp" ? plaquettes : undefined, quantite, datePrevue: datePrevue || undefined, notes }; onAddToCart({ label: `Transfusion — ${produit}`, count: 1, submit: () => creerPrescriptionTransfusion(snap) }); setShowModal(false); } else { handleSubmit(); } }}>Confirmer</button></div></div></div>}

      {showValidationModal && validatedPrescription && (
        <div className="mb op" onClick={e => { if (e.target === e.currentTarget) setShowValidationModal(false); }}>
          <div className="mbox" style={{ maxWidth: 600, width: '95%', maxHeight: '85vh', overflowY: 'auto' }}>
            <div style={{ background: 'var(--navy)', color: '#fff', padding: '16px 20px', borderRadius: '20px 20px 0 0', display: 'flex', alignItems: 'center', gap: 12 }}><span className="ms" style={{ fontSize: 24 }}>check_circle</span><div><h3 style={{ fontFamily: '"Manrope", sans-serif', fontSize: 18, fontWeight: 800, margin: 0 }}>Transfusion sanguine validée</h3><p style={{ fontSize: 12, opacity: 0.9, margin: '4px 0 0 0' }}>{validatedPrescription.date}</p></div></div>
            <div style={{ padding: '20px' }}>
              <div style={{ background: 'var(--navy-lt)', borderRadius: 12, padding: '14px 16px', marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}><div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--navy)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span className="ms" style={{ fontSize: 22, color: '#fff' }}>person</span></div><div><div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--txt3)', marginBottom: 2 }}>Patient</div><div style={{ fontSize: 15, fontWeight: 700, color: 'var(--navy)' }}>{validatedPrescription.patient.prenom} {validatedPrescription.patient.nom}</div></div></div>
                {validatedPrescription.patient.allergies && validatedPrescription.patient.allergies.length > 0 && (<div style={{ marginTop: 8, padding: '8px 12px', background: '#fef3c7', border: '1px solid #fbbf24', borderRadius: 8, fontSize: 12, color: '#92400e', display: 'flex', alignItems: 'center', gap: 6 }}><span className="ms" style={{ fontSize: 14 }}>warning</span><strong>Allergies:</strong> {validatedPrescription.patient.allergies.join(', ')}</div>)}
              </div>
              <div style={{ marginBottom: 16 }}>
                <div style={{ background: '#fff', border: '1px solid var(--bdr)', borderRadius: 10, padding: '12px 14px', marginBottom: 8 }}><div style={{ fontSize: 14, fontWeight: 700, color: 'var(--txt)', marginBottom: 4 }}>Renseignements cliniques</div><div style={{ fontSize: 12, color: 'var(--txt2)' }}>{validatedPrescription.renseignements}</div></div>
                <div style={{ background: '#fff', border: '1px solid var(--bdr)', borderRadius: 10, padding: '12px 14px', marginBottom: 8 }}><div style={{ fontSize: 14, fontWeight: 700, color: 'var(--txt)', marginBottom: 4 }}>Produit sanguin</div><div style={{ fontSize: 12, color: 'var(--txt2)' }}>{validatedPrescription.produit === 'sang-total' ? 'Sang total' : validatedPrescription.produit === 'cgr' ? 'Culot globulaire (CGR)' : validatedPrescription.produit === 'pfc' ? 'Plasma frais-congelé (PFC)' : 'Plasma riche en plaquettes (PRP)'}</div></div>
                <div style={{ background: '#fff', border: '1px solid var(--bdr)', borderRadius: 10, padding: '12px 14px', marginBottom: 8 }}><div style={{ fontSize: 14, fontWeight: 700, color: 'var(--txt)', marginBottom: 4 }}>Groupage / Quantité</div><div style={{ fontSize: 12, color: 'var(--txt2)' }}>{validatedPrescription.groupage} — {validatedPrescription.quantite}</div></div>
                {validatedPrescription.datePrevue && <div style={{ background: '#fff', border: '1px solid var(--bdr)', borderRadius: 10, padding: '12px 14px', marginBottom: 8 }}><div style={{ fontSize: 14, fontWeight: 700, color: 'var(--txt)', marginBottom: 4 }}>Date prévue</div><div style={{ fontSize: 12, color: 'var(--txt2)' }}>{validatedPrescription.datePrevue}</div></div>}
              </div>
              <div style={{ background: validatedPrescription.urgence === 'n' ? '#dbeafe' : validatedPrescription.urgence === 'u' ? '#fef3c7' : '#fee2e2', borderRadius: 10, padding: '12px 14px', marginBottom: 16 }}><div style={{ fontSize: 13, fontWeight: 700, color: validatedPrescription.urgence === 'n' ? '#1e40af' : validatedPrescription.urgence === 'u' ? '#92400e' : '#991b1b' }}>{validatedPrescription.urgence === 'n' ? 'Normal' : validatedPrescription.urgence === 'u' ? 'Urgent' : 'TRES_URGENT'}</div></div>
              {validatedPrescription.alertes && <div style={{ background: 'var(--red-lt)', borderRadius: 10, padding: '12px 14px', marginBottom: 16 }}><div style={{ fontSize: 13, color: 'var(--txt)' }}>{validatedPrescription.alertes}</div></div>}
              {validatedPrescription.atcd && <div style={{ background: 'var(--navy-lt)', borderRadius: 10, padding: '12px 14px', marginBottom: 16 }}><div style={{ fontSize: 13, color: 'var(--txt)' }}>Antécédent de transfusion : Oui{validatedPrescription.incident ? ` — Incident: ${validatedPrescription.incident}` : ''}</div></div>}
              {validatedPrescription.notes && <div style={{ background: 'var(--bg)', borderRadius: 10, padding: '12px 14px', marginBottom: 16 }}><div style={{ fontSize: 13, color: 'var(--txt)' }}>{validatedPrescription.notes}</div></div>}
              <div className="mbtns" style={{ marginTop: 20 }}><button className="bok" onClick={() => setShowValidationModal(false)}>Fermer</button></div>
            </div>
          </div>
        </div>
      )}

      {toast && <div className="tst on"><span className="ms">check_circle</span>{toast}</div>}
    </div>
  );
}
