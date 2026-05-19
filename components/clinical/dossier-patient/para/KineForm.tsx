"use client";
import { useState } from "react";
import { openSummaryWindow } from '@/lib/printPrescription';
import { creerPrescriptionKine } from '@/lib/api';

type Urgence = "n" | "u" | "tu";
const urgenceClasses: Record<Urgence, string> = { n: "un", u: "uu", tu: "utu" };

const KINE_TYPES = ["Rééducation motrice (membre supérieur)","Rééducation motrice (membre inférieur)","Rééducation rachidienne / lombaire","Rééducation neurologique (AVC, SEP…)","Kinésithérapie respiratoire","Rééducation périnéale","Drainage lymphatique manuel","Massage thérapeutique","Balnéothérapie","Rééducation de la marche","Autre"];
const CONTRE_INDICATIONS = ["Pas de massage (anticoagulants, thrombose)","Pas de chaleur (infection active)","Pas de mobilisation active (fracture non consolidée)","Pas d'hydrothérapie (plaie ouverte)","Appui interdit"];

interface Props { patient: { id: string; nom?: string; prenom?: string }; prescripteur: { nom?: string; prenom?: string; service?: string }; }

export default function KineForm({ patient, prescripteur }: Props) {
  const [urgence, setUrgence] = useState<Urgence>("n"); const [alertes, setAlertes] = useState("");
  const [renseignements, setRenseign] = useState(""); const [kineType, setKineType] = useState("");
  const [kineAutre, setKineAutre] = useState(""); const [diagnostic, setDiagnostic] = useState("");
  const [ciSelected, setCiSelected] = useState<string[]>([]); const [ciAutre, setCiAutre] = useState(false); const [ciAutreText, setCiAutreText] = useState("");
  const [objectifs, setObjectifs] = useState(""); const [remarques, setRemarques] = useState("");
  const [showModal, setShowModal] = useState(false); const [toast, setToast] = useState("");
  const [loading, setLoading] = useState(false); const [apiError, setApiError] = useState("");

  function toggleCI(val: string) { setCiSelected(prev => prev.includes(val) ? prev.filter(v => v !== val) : [...prev, val]); }
  const isFormValid = !!renseignements.trim() && !!kineType && (kineType !== "Autre" || !!kineAutre.trim()) && !!diagnostic.trim() && !!objectifs.trim();
  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(""), 2800); }

  function buildKineSummary(): string {
    const now = new Date().toLocaleString('fr-FR');
    let html = `<div class="card"><div class="patient">Date : ${now}</div>`;
    html += `<div class="medicament"><span class="nom">Type :</span> <span class="detail">${kineType === "Autre" ? kineAutre : kineType}</span></div>`;
    html += `<div class="medicament"><span class="nom">Diagnostic :</span> <span class="detail">${diagnostic}</span></div>`;
    html += `<div class="medicament"><span class="nom">Objectifs :</span> <span class="detail">${objectifs}</span></div>`;
    if (ciSelected.length > 0) html += `<div class="medicament"><span class="nom">CI :</span> <span class="detail">${ciSelected.join(', ')}</span></div>`;
    if (alertes) html += `<div class="notice">⚠️ ${alertes}</div>`;
    html += `</div>`;
    return html;
  }

  async function handleSubmit() {
    setShowModal(false); setLoading(true); setApiError("");
    try {
      await creerPrescriptionKine({ patientId: patient.id, urgence, alertes, renseignements, typeKine: kineType === "Autre" ? kineAutre : kineType, diagnostic, contreIndications: [...ciSelected, ciAutre ? ciAutreText : undefined].filter(Boolean), objectifs, remarques });
      openSummaryWindow('Kinésithérapie', buildKineSummary());
      showToast("Prescription kiné transmise"); setUrgence("n"); setAlertes(""); setRenseign(""); setKineType(""); setKineAutre(""); setDiagnostic(""); setCiSelected([]); setCiAutre(false); setCiAutreText(""); setObjectifs(""); setRemarques("");
    } catch { setApiError("Erreur lors de l'envoi."); }
    finally { setLoading(false); }
  }

  return (
    <div>
      {apiError && <div style={{background:"var(--red-lt)",border:"1px solid var(--red-bdr)",borderRadius:8,padding:"10px 12px",fontSize:12,color:"var(--red)",marginBottom:12}}>{apiError}</div>}
      <div className="g2-form mb12">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="card" style={{ padding: 12 }}><label className="lbl">Renseignements cliniques <span className="req">*</span></label><textarea rows={3} value={renseignements} onChange={e => setRenseign(e.target.value)} placeholder="Contexte clinique..." /></div>
          <div className="card" style={{ padding: 12 }}>
            <div className="mb12"><label className="lbl">Type de kinésithérapie <span className="req">*</span></label><select value={kineType} onChange={e => setKineType(e.target.value)}><option value="">— Sélectionner —</option>{KINE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
            {kineType === "Autre" && <div className="mb12"><label className="lbl">Préciser <span className="req">*</span></label><input type="text" value={kineAutre} onChange={e => setKineAutre(e.target.value)} placeholder="Décrire..." /></div>}
            <div className="mb12"><label className="lbl">Diagnostic <span className="req">*</span></label><input type="text" value={diagnostic} onChange={e => setDiagnostic(e.target.value)} placeholder="Ex : fracture col fémoral..." /></div>
            <div className="mb12"><label className="lbl">Contre-indications</label><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:2,marginBottom:8}}>{CONTRE_INDICATIONS.map(ci => <label key={ci} className="cr"><span>{ci}</span><input type="checkbox" checked={ciSelected.includes(ci)} onChange={() => toggleCI(ci)} style={{accentColor:"var(--navy)"}}/></label>)}<label className="cr"><span>Autre</span><input type="checkbox" checked={ciAutre} onChange={e => setCiAutre(e.target.checked)} style={{accentColor:"var(--navy)"}}/></label></div>{ciAutre && <input type="text" value={ciAutreText} onChange={e => setCiAutreText(e.target.value)} placeholder="Préciser..." />}</div>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="card" style={{ padding: 8 }}><label className="lbl">Degré d'urgence <span className="req">*</span></label><div className={`urgr ${urgenceClasses[urgence]}`} style={{ marginBottom:8 }}><div className="urgd" /><select className="urgs" value={urgence} onChange={e => setUrgence(e.target.value as Urgence)}><option value="n">Normal</option><option value="u">Urgent</option><option value="tu">STAT</option></select></div><div style={{display:"flex",alignItems:"center",gap:6,marginBottom:4}}><span className="ms" style={{fontSize:16,color:"var(--red)"}}>warning</span><span className="lbl" style={{margin:0}}>Précautions &amp; Alertes</span></div><textarea rows={1} value={alertes} onChange={e => setAlertes(e.target.value)} placeholder="Contre-indications..." style={{background:"var(--red-lt)",border:"1.5px solid var(--red-bdr)",padding:'8px 12px'}} /></div>
          <div className="card" style={{ padding: 12 }}><label className="lbl">Objectifs thérapeutiques <span className="req">*</span></label><textarea rows={3} value={objectifs} onChange={e => setObjectifs(e.target.value)} placeholder="Ex : récupération..." /></div>
          <div className="card" style={{ padding: 12 }}><label className="lbl">Remarques complémentaires</label><textarea rows={2} value={remarques} onChange={e => setRemarques(e.target.value)} placeholder="Informations supplémentaires..." /></div>
          <button className="bp" onClick={() => setShowModal(true)} style={{ opacity: isFormValid && !loading ? 1 : 0.5, pointerEvents: isFormValid && !loading ? "auto" : "none", marginTop:0 }}><span className="ms">check_circle</span>{loading ? "Envoi..." : "Valider la prescription"}</button>
        </div>
      </div>
      {showModal && <div className="mb op" onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}><div className="mbox"><h3>Confirmer ?</h3><p>La prescription sera transmise au service de kiné.</p><div className="mbtns"><button className="bca" onClick={()=>setShowModal(false)}>Annuler</button><button className="bok" onClick={handleSubmit}>Confirmer</button></div></div></div>}
      {toast && <div className="tst on"><span className="ms">check_circle</span>{toast}</div>}
    </div>
  );
}
