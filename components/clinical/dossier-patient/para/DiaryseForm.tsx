"use client";
import { useState } from "react";
import { openSummaryWindow } from '@/lib/printPrescription';
import { creerPrescriptionDialyse } from '@/lib/api';

type Urgence = "n" | "u" | "tu";
const urgenceClasses: Record<Urgence, string> = { n: "un", u: "uu", tu: "utu" };
const DIALYSE_TYPES = ["HD conventionnelle","HDF on-line","Hémofiltration","DPCA","DPA automatisée"];

interface Props { patient: { id: string; nom?: string; prenom?: string }; prescripteur: { nom?: string; prenom?: string; service?: string }; }

export default function DiaryseForm({ patient, prescripteur }: Props) {
  const [urgence, setUrgence] = useState<Urgence>("n"); const [alertes, setAlertes] = useState("");
  const [renseignements, setRenseign] = useState(""); const [dialType, setDialType] = useState("");
  const [remarques, setRemarques] = useState(""); const [showModal, setShowModal] = useState(false);
  const [toast, setToast] = useState(""); const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState("");
  const isFormValid = !!renseignements.trim() && !!dialType;
  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(""), 2800); }

  function buildDialyseSummary(): string {
    const now = new Date().toLocaleString('fr-FR');
    let html = `<div class="card"><div class="patient">Date : ${now}</div>`;
    html += `<div class="medicament"><span class="nom">Type :</span> <span class="detail">${dialType}</span></div>`;
    if (renseignements) html += `<div class="medicament"><span class="nom">Renseignements :</span> <span class="detail">${renseignements}</span></div>`;
    if (remarques) html += `<div class="notice">📌 ${remarques}</div>`;
    if (alertes) html += `<div class="notice">⚠️ ${alertes}</div>`;
    html += `</div>`;
    return html;
  }

  async function handleSubmit() {
    setShowModal(false); setLoading(true); setApiError("");
    try {
      await creerPrescriptionDialyse({ patientId: patient.id, urgence, alertes, renseignements, typeDialyse: dialType, remarques });
      openSummaryWindow('Dialyse', buildDialyseSummary());
      showToast("Prescription dialyse transmise"); setUrgence("n"); setAlertes(""); setRenseign(""); setDialType(""); setRemarques("");
    } catch { setApiError("Erreur lors de l'envoi."); }
    finally { setLoading(false); }
  }

  return (
    <div>
      {apiError && <div style={{background:"var(--red-lt)",border:"1px solid var(--red-bdr)",borderRadius:8,padding:"10px 12px",fontSize:12,color:"var(--red)",marginBottom:12}}>{apiError}</div>}
      <div className="g2-form mb12">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="card" style={{ padding: 12 }}><label className="lbl">Renseignements cliniques <span className="req">*</span></label><textarea rows={3} value={renseignements} onChange={e => setRenseign(e.target.value)} placeholder="Insuffisance rénale..." /></div>
          <div className="card" style={{ padding: 12 }}><div className="mb12"><label className="lbl">Type de dialyse <span className="req">*</span></label><div style={{display:"flex",flexDirection:"column",gap:8,marginTop:8}}>{DIALYSE_TYPES.map(t => <label key={t} className="rc"><input type="radio" name="dial-type" checked={dialType===t} onChange={()=>setDialType(t)} style={{accentColor:"var(--navy)"}}/><span>{t}</span></label>)}</div></div></div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="card" style={{ padding: 8 }}><label className="lbl">Degré d'urgence <span className="req">*</span></label><div className={`urgr ${urgenceClasses[urgence]}`} style={{ marginBottom:8 }}><div className="urgd" /><select className="urgs" value={urgence} onChange={e => setUrgence(e.target.value as Urgence)}><option value="n">Normal</option><option value="u">Urgent</option><option value="tu">STAT</option></select></div><div style={{display:"flex",alignItems:"center",gap:6,marginBottom:4}}><span className="ms" style={{fontSize:16,color:"var(--red)"}}>warning</span><span className="lbl" style={{margin:0}}>Précautions &amp; Alertes</span></div><textarea rows={1} value={alertes} onChange={e => setAlertes(e.target.value)} placeholder="Accès vasculaire..." style={{background:"var(--red-lt)",border:"1.5px solid var(--red-bdr)",padding:'8px 12px'}} /></div>
          <div className="card" style={{ padding: 12 }}><label className="lbl">Autres remarques</label><textarea rows={3} value={remarques} onChange={e => setRemarques(e.target.value)} placeholder="Durée, débit..." /></div>
          <button className="bp" onClick={() => setShowModal(true)} style={{ opacity: isFormValid && !loading ? 1 : 0.5, pointerEvents: isFormValid && !loading ? "auto" : "none", marginTop:0 }}><span className="ms">check_circle</span>{loading ? "Envoi..." : "Valider la prescription"}</button>
        </div>
      </div>
      {showModal && <div className="mb op" onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}><div className="mbox"><h3>Confirmer ?</h3><p>La prescription sera transmise au service de dialyse.</p><div className="mbtns"><button className="bca" onClick={()=>setShowModal(false)}>Annuler</button><button className="bok" onClick={handleSubmit}>Confirmer</button></div></div></div>}
      {toast && <div className="tst on"><span className="ms">check_circle</span>{toast}</div>}
    </div>
  );
}
