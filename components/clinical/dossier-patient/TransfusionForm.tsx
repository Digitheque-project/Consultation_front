"use client";
import { useState } from 'react';
import { openSummaryWindow } from '@/lib/printPrescription';
import { creerPrescriptionTransfusion } from '@/lib/api';

type Urgence = "n" | "u" | "tu";
type ProduitSanguin = "sang-total" | "cgr" | "pfc" | "prp";
const urgenceClasses: Record<Urgence, string> = { n: "un", u: "uu", tu: "utu" };

interface Props {
  patient: { id: string; nom?: string; prenom?: string };
  prescripteur: { id?: string; nom?: string; prenom?: string; service?: string };
}

export default function TransfusionForm({ patient, prescripteur }: Props) {
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
  const isFormValid = renseignements.trim() && groupage && produit && quantite.trim();
  console.log('isFormValid', { renseignements: renseignements.trim(), groupage, produit, quantite: quantite.trim() });
  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 2800); }

  function buildTransfusionSummary(): string {
    const now = new Date().toLocaleString('fr-FR');
    const urgLabel = { n: 'Normale', u: 'Urgent', tu: 'STAT' }[urgence];
    const prodLabel = { 'sang-total': 'Sang total', cgr: 'Culot globulaire', pfc: 'Plasma frais-congelé', prp: 'Plasma riche en plaquettes' }[produit];
    let html = `<div class="card"><div class="patient">Date : ${now}</div>`;
    html += `<div class="medicament"><span class="nom">Urgence :</span> <span class="detail">${urgLabel}</span></div>`;
    html += `<div class="medicament"><span class="nom">Renseignements :</span> <span class="detail">${renseignements}</span></div>`;
    html += `<div class="medicament"><span class="nom">Groupe :</span> <span class="detail">${groupage}</span></div>`;
    if (hb) html += `<div class="medicament"><span class="nom">Hb :</span> <span class="detail">${hb} g/l</span></div>`;
    html += `<div class="medicament"><span class="nom">Produit :</span> <span class="detail">${prodLabel}</span></div>`;
    html += `<div class="medicament"><span class="nom">Quantité :</span> <span class="detail">${quantite}</span></div>`;
    if (datePrevue) html += `<div class="medicament"><span class="nom">Date prévue :</span> <span class="detail">${datePrevue}</span></div>`;
    if (alertes) html += `<div class="notice">⚠️ ${alertes}</div>`;
    if (atcd) {
      html += `<div class="notice">🔁 Antécédent de transfusion`;
      if (incident) html += ` — ${incident}`;
      html += `</div>`;
    }
    html += `</div>`;
    return html;
  }

  async function handleSubmit() {
    setShowModal(false);
    setLoading(true);
    setApiError('');
    try {
      await creerPrescriptionTransfusion({
        patientId: patient.id,
        prescripteurId: prescripteur.id,
        urgence,
        alertes,
        renseignements,
        atcdTransfusion: atcd,
        incident,
        groupage,
        hb: hb ? parseFloat(hb) : undefined,
        produit,
        plaquettes: produit === 'prp' ? plaquettes : undefined,
        quantite,
        datePrevue: datePrevue || undefined,
        notes,
      });
      openSummaryWindow('Transfusion sanguine', buildTransfusionSummary());
      showToast('Prescription transfusion envoyée au dépôt de sang');
      // reset
      setUrgence("n"); setAlertes(''); setRenseignements(''); setAtcd(false); setIncident('');
      setGroupage(''); setHb(''); setProduit('cgr'); setPlaquettes(''); setQuantite('');
      setDatePrevue(''); setNotes('');
    } catch {
      setApiError("Erreur lors de l'envoi de la prescription transfusion.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      {apiError && (
        <div style={{ background: "var(--red-lt)", border: "1px solid var(--red-bdr)", borderRadius: 8, padding: "10px 12px", fontSize: 12, color: "var(--red)", marginBottom: 12 }}>
          {apiError}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 16, alignItems: 'start' }}>
        {/* COLONNE GAUCHE */}
        <div className="card" style={{ padding: 12 }}>
          <div className="mb12"><label className="lbl">Renseignements cliniques <span className="req">*</span></label><textarea rows={3} placeholder="Pathologie, contexte, motif de la transfusion..." value={renseignements} onChange={e => setRenseignements(e.target.value)} /></div>
          <div className="mb12"><label className="lbl">Groupage sanguin <span className="req">*</span></label><select value={groupage} onChange={e => setGroupage(e.target.value)}><option value="">— Sélectionner —</option>{['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(g => <option key={g}>{g}</option>)}</select></div>
          <div className="mb12"><label className="lbl">Hémoglobine — Hb (g/l)</label><input type="number" min={0} step={0.1} placeholder="Ex : 7.5" value={hb} onChange={e => setHb(e.target.value)} /></div>
          <div className="mb12"><label className="lbl">Type de produit sanguin <span className="req">*</span></label><div className="g2" style={{ gap: 7 }}>{[{ value: 'sang-total', label: 'Sang total' },{ value: 'cgr', label: 'Culot globulaire (CGR)' },{ value: 'pfc', label: 'Plasma frais-congelé (PFC)' },{ value: 'prp', label: 'Plasma riche en plaquettes (PRP)' }].map(p => <label key={p.value} className="rc"><input type="radio" name="prod-sang" checked={produit === p.value} onChange={() => setProduit(p.value as ProduitSanguin)} /><span>{p.label}</span></label>)}</div></div>
          {produit === 'prp' && <div className="mb12"><label className="lbl">Nombre de plaquettes (G/l) <span className="req">*</span></label><input type="number" min={0} placeholder="Nombre de plaquettes en G/l" value={plaquettes} onChange={e => setPlaquettes(e.target.value)} /></div>}
          <div className="g2 mb12"><div><label className="lbl">Quantité</label><input type="text" placeholder="Ex : 2 unités, 250 ml..." value={quantite} onChange={e => setQuantite(e.target.value)} /></div><div><label className="lbl">Date prévue</label><input type="date" value={datePrevue} onChange={e => setDatePrevue(e.target.value)} /></div></div>
          <label className="lbl">Remarques / Notes</label><textarea rows={2} placeholder="Notes complémentaires pour le dépôt de sang..." value={notes} onChange={e => setNotes(e.target.value)} />
        </div>

        {/* COLONNE DROITE — sticky */}
        <div style={{ position: 'sticky', top: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="card" style={{ padding: 8 }}>
            <label className="lbl">Degré d'urgence <span className="req">*</span></label>
            <div className={`urgr ${urgenceClasses[urgence]}`} style={{ marginBottom: 8 }}>
              <div className="urgd" /><select className="urgs" value={urgence} onChange={e => setUrgence(e.target.value as Urgence)}><option value="n">Normal</option><option value="u">Urgent</option><option value="tu">STAT</option></select>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}><span className="ms" style={{ fontSize: 16, color: 'var(--red)' }}>warning</span><span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.8px', color: 'var(--red)' }}>Alertes</span></div>
            <textarea style={{ background: 'var(--red-lt)', border: '1.5px dashed var(--red-bdr)', borderRadius: 10, padding: '8px 12px', fontSize: 14, width: '100%', resize: 'none' }} rows={1} placeholder="Contre-indications..." value={alertes} onChange={e => setAlertes(e.target.value)} />
          </div>
          <div className="card" style={{ padding: 12 }}>
            <div className="togr">
              <div className="togr-l"><p>Antécédent de transfusion</p><span>Le patient a-t-il déjà reçu des produits sanguins ?</span></div>
              <label className="tog"><input type="checkbox" checked={atcd} onChange={e => setAtcd(e.target.checked)}/><span className="tog-t"></span></label>
            </div>
            {atcd && <div style={{ marginTop: 10 }}><label className="lbl">Incident transfusionnel <span className="req">*</span></label><textarea rows={2} placeholder="Décrire l'incident..." value={incident} onChange={e => setIncident(e.target.value)} /></div>}
          </div>
          <button className="bp" onClick={() => setShowModal(true)} disabled={!isFormValid || loading} style={{ opacity: isFormValid && !loading ? 1 : 0.5, marginTop: 0 }}
>
  <span className="ms">check_circle</span>{loading ? "Envoi..." : "Valider — Envoyer au dépôt de sang"}
</button>
        </div>
      </div>

      <p className="hint" style={{ textAlign: 'center', marginTop: 6 }}>La prescription sera transmise automatiquement au service dépôt de sang après validation</p>
      {showModal && <div className="mb op" onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}><div className="mbox"><h3>Valider — Transfusion Sanguine</h3><p>La prescription sera transmise au dépôt de sang.</p><div className="mbtns"><button className="bca" onClick={() => setShowModal(false)}>Annuler</button><button className="bok" onClick={handleSubmit}>Confirmer</button></div></div></div>}
      {toast && <div className="tst on"><span className="ms">check_circle</span>{toast}</div>}
    </div>
  );
}
