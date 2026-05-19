"use client";
import { useState } from "react";
import { openSummaryWindow } from '@/lib/printPrescription';
import { creerPrescriptionEndoscopie } from '@/lib/api';

type Urgence = "n" | "u" | "tu";
const urgenceClasses: Record<Urgence, string> = { n: "un", u: "uu", tu: "utu" };

const TYPES_ENDO = ["Fibroscopie digestive haute (FOGD)","Coloscopie","Recto-sigmoïdoscopie","Ligature de varices œsophagiennes","Dilatation pneumatique","GPE (Gastrostomie percutanée endoscopique)"];

interface Props { patient: { id: string; nom?: string; prenom?: string }; prescripteur: { nom?: string; prenom?: string; service?: string }; }

export default function EndoscopieForm({ patient, prescripteur }: Props) {
  const [urgence, setUrgence] = useState<Urgence>("n");
  const [alertes, setAlertes] = useState("");
  const [renseignements, setRenseignements] = useState("");
  const [typeExamen, setTypeExamen] = useState("");
  const [typeAutre, setTypeAutre] = useState("");
  const [remarques, setRemarques] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [toast, setToast] = useState("");
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState("");
  const typeEffectif = typeExamen === "Autre" ? typeAutre.trim() : typeExamen;
  const isFormValid = renseignements.trim() !== "" && typeEffectif !== "";
  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(""), 2800); }

  function buildEndoscopieSummary(): string {
    const now = new Date().toLocaleString('fr-FR');
    let html = `<div class="card"><div class="patient">Date : ${now}</div>`;
    html += `<div class="medicament"><span class="nom">Type :</span> <span class="detail">${typeEffectif}</span></div>`;
    html += `<div class="medicament"><span class="nom">Renseignements :</span> <span class="detail">${renseignements}</span></div>`;
    if (remarques) html += `<div class="notice">📌 ${remarques}</div>`;
    if (alertes) html += `<div class="notice">⚠️ ${alertes}</div>`;
    html += `</div>`;
    return html;
  }

  async function handleSubmit() {
    setShowModal(false);
    setLoading(true);
    setApiError("");
    try {
      await creerPrescriptionEndoscopie({ patientId: patient.id, urgence, alertes, renseignements, typeExamen: typeEffectif, remarques });
      openSummaryWindow('Endoscopie', buildEndoscopieSummary());
      showToast("Prescription endoscopie envoyée");
      setRenseignements(""); setTypeExamen(""); setTypeAutre(""); setRemarques(""); setAlertes(""); setUrgence("n");
    } catch { setApiError("Erreur lors de l'envoi."); }
    finally { setLoading(false); }
  }

  return (
    <div>
      {apiError && <div style={{background:"var(--red-lt)",border:"1px solid var(--red-bdr)",borderRadius:8,padding:"10px 12px",fontSize:12,color:"var(--red)",marginBottom:12}}>{apiError}</div>}
      <div className="g2-form mb12">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="card" style={{ padding: 12 }}><label className="lbl">Renseignements cliniques <span className="req">*</span></label><textarea rows={3} value={renseignements} onChange={e => setRenseignements(e.target.value)} placeholder="Motif, symptômes..." /></div>
          <div className="card" style={{ padding: 12 }}><div className="mb12"><label className="lbl">Type d'examen <span className="req">*</span></label><div className="rg">{TYPES_ENDO.map(t => <label className="rc" key={t}><input type="radio" name="endo-type" value={t} checked={typeExamen===t} onChange={()=>setTypeExamen(t)} /><span>{t}</span></label>)}<label className="rc"><input type="radio" name="endo-type" value="Autre" checked={typeExamen==="Autre"} onChange={()=>setTypeExamen("Autre")} /><span>Autre</span></label></div>{typeExamen==="Autre" && <input type="text" style={{marginTop:8}} placeholder="Précisez..." value={typeAutre} onChange={e => setTypeAutre(e.target.value)} />}</div></div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="card" style={{ padding: 8 }}><label className="lbl">Degré d'urgence <span className="req">*</span></label><div className={`urgr ${urgenceClasses[urgence]}`} style={{ marginBottom:8 }}><div className="urgd" /><select className="urgs" value={urgence} onChange={e => setUrgence(e.target.value as Urgence)}><option value="n">Normal</option><option value="u">Urgent</option><option value="tu">STAT</option></select></div><div className="ah"><span className="ms">warning</span><span>Précautions &amp; Alertes</span></div><textarea className="af" rows={1} value={alertes} onChange={e => setAlertes(e.target.value)} placeholder="Allergies anesthésiques..." style={{padding:'8px 12px'}} /></div>
          <div className="card" style={{ padding: 12 }}><label className="lbl">Remarques complémentaires</label><textarea rows={2} value={remarques} onChange={e => setRemarques(e.target.value)} placeholder="Informations supplémentaires..." /></div>
          <button className="bp" onClick={() => setShowModal(true)} style={{ opacity: isFormValid && !loading ? 1 : 0.5, pointerEvents: isFormValid && !loading ? "auto" : "none", marginTop:0 }}><span className="ms">check_circle</span>{loading ? "Envoi..." : "Valider la prescription"}</button>
        </div>
      </div>
      {showModal && <div className="mb op" onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}><div className="mbox"><h3>Confirmer ?</h3><p>La prescription d'endoscopie sera transmise à l'équipe concernée.</p><div className="mbtns"><button className="bca" onClick={()=>setShowModal(false)}>Annuler</button><button className="bok" onClick={handleSubmit}>Confirmer</button></div></div></div>}
      {toast && <div className="tst on"><span className="ms">check_circle</span>{toast}</div>}
    </div>
  );
}
