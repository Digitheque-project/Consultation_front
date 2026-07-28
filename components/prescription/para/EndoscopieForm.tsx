"use client";
import { useState } from "react";
import { creerPrescriptionEndoscopie } from '@/lib/prescription-api';

type Urgence = "n" | "u" | "tu";
const urgenceClasses: Record<Urgence, string> = { n: "un", u: "uu", tu: "utu" };
const TYPES_ENDO = ["Fibroscopie digestive haute (FOGD)","Coloscopie","Recto-sigmoïdoscopie","Ligature de varices œsophagiennes","Dilatation pneumatique","GPE (Gastrostomie percutanée endoscopique)"];

interface Props { patient: { id: string; nom?: string; prenom?: string; sexe?: string; dateNaissance?: string; allergies?: string[]; groupeSanguin?: string }; prescripteur: { id?: string; nom?: string; prenom?: string; service?: string; chuId?: string; serviceId?: string }; onAddToCart?: (item: { label: string; count: number; submit: () => Promise<unknown> }) => void; }
function calcAge(d?: string): number | null { if (!d) return null; return Math.floor((Date.now() - new Date(d).getTime()) / (1000 * 60 * 60 * 24 * 365.25)); }
interface ValidatedPrescription { urgence: Urgence; alertes: string; renseignements: string; typeExamen: string; remarques: string; patient: Props["patient"] & { age: number | null; sexeLabel?: string }; prescripteur: Props["prescripteur"]; date: string; }

export default function EndoscopieForm({ patient, prescripteur, onAddToCart }: Props) {
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
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [validatedPrescription, setValidatedPrescription] = useState<ValidatedPrescription | null>(null);

  const age = calcAge(patient?.dateNaissance);
  const sexeLabel = patient?.sexe === 'M' ? 'Masculin' : patient?.sexe === 'F' ? 'Féminin' : patient?.sexe;
  const typeEffectif = typeExamen === "Autre" ? typeAutre.trim() : typeExamen;
  const isFormValid = renseignements.trim() !== "" && typeEffectif !== "";
  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(""), 2800); }

  async function handleSubmit() {
    setShowModal(false); setLoading(true); setApiError("");
    try {
      await creerPrescriptionEndoscopie({ patientId: patient.id, prescripteurId: prescripteur.id, chuId: prescripteur.chuId, serviceId: prescripteur.serviceId, urgence, alertes, renseignements, typeExamen: typeEffectif, remarques });
      setValidatedPrescription({ urgence, alertes, renseignements, typeExamen: typeEffectif, remarques, patient: { ...patient, age, sexeLabel }, prescripteur, date: new Date().toLocaleString('fr-FR') });
      setShowValidationModal(true);
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
          <div className="card" style={{ padding: 12 }}><div className="mb12"><label className="lbl">Type d&apos;examen <span className="req">*</span></label><div className="rg">{TYPES_ENDO.map(t => <label className="rc" key={t}><input type="radio" name="endo-type" value={t} checked={typeExamen===t} onChange={()=>setTypeExamen(t)} /><span>{t}</span></label>)}<label className="rc"><input type="radio" name="endo-type" value="Autre" checked={typeExamen==="Autre"} onChange={()=>setTypeExamen("Autre")} /><span>Autre</span></label></div>{typeExamen==="Autre" && <input type="text" style={{marginTop:8}} placeholder="Précisez..." value={typeAutre} onChange={e => setTypeAutre(e.target.value)} />}</div></div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="card" style={{ padding: 8 }}><label className="lbl">Degré d&apos;urgence <span className="req">*</span></label><div className={`urgr ${urgenceClasses[urgence]}`} style={{ marginBottom:8 }}><div className="urgd" /><select className="urgs" value={urgence} onChange={e => setUrgence(e.target.value as Urgence)}><option value="n">Normal</option><option value="u">Urgent</option><option value="tu">TRES_URGENT</option></select></div><div className="ah"><span className="ms">warning</span><span>Précautions &amp; Alertes</span></div><textarea className="af" rows={1} value={alertes} onChange={e => setAlertes(e.target.value)} placeholder="Allergies anesthésiques..." style={{padding:'8px 12px'}} /></div>
          <div className="card" style={{ padding: 12 }}><label className="lbl">Remarques complémentaires</label><textarea rows={2} value={remarques} onChange={e => setRemarques(e.target.value)} placeholder="Informations supplémentaires..." /></div>
          <button className="bp" onClick={() => setShowModal(true)} style={{ opacity: isFormValid && !loading ? 1 : 0.5, pointerEvents: isFormValid && !loading ? "auto" : "none", marginTop:0 }}><span className="ms">check_circle</span>{loading ? "Envoi..." : "Valider la prescription"}</button>
        </div>
      </div>
      {showModal && <div className="mb op" onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}><div className="mbox"><h3>Confirmer ?</h3><p>La prescription d&apos;endoscopie sera transmise à l&apos;équipe concernée.</p><div className="mbtns"><button className="bca" onClick={()=>setShowModal(false)}>Annuler</button><button className="bok" onClick={() => { if (onAddToCart) { const snap = { patientId: patient.id, prescripteurId: prescripteur.id, chuId: prescripteur.chuId, serviceId: prescripteur.serviceId, urgence, alertes, renseignements, typeExamen: typeEffectif, remarques }; onAddToCart({ label: `Endoscopie — ${typeEffectif}`, count: 1, submit: () => creerPrescriptionEndoscopie(snap) }); setShowModal(false); } else { handleSubmit(); } }}>Confirmer</button></div></div></div>}
      {showValidationModal && validatedPrescription && (
        <div className="mb op" onClick={e => { if (e.target === e.currentTarget) setShowValidationModal(false); }}>
          <div className="mbox" style={{ maxWidth: 560, width: '95%', maxHeight: '85vh', overflowY: 'auto' }}>
            <div style={{ background: 'var(--navy)', color: '#fff', padding: '16px 20px', borderRadius: '20px 20px 0 0', display: 'flex', alignItems: 'center', gap: 12 }}><span className="ms" style={{ fontSize: 24 }}>check_circle</span><div><h3 style={{ fontFamily: '"Manrope", sans-serif', fontSize: 18, fontWeight: 800, margin: 0 }}>Prescription endoscopie validée</h3><p style={{ fontSize: 12, opacity: 0.9, margin: '4px 0 0 0' }}>{validatedPrescription.date}</p></div></div>
            <div style={{ padding: '20px' }}>
              <div style={{ background: '#fff', border: '1px solid var(--bdr)', borderRadius: 10, padding: '12px 14px', marginBottom: 8 }}><div style={{ fontSize: 14, fontWeight: 700, color: 'var(--txt)', marginBottom: 4 }}>Renseignements cliniques</div><div style={{ fontSize: 12, color: 'var(--txt2)' }}>{validatedPrescription.renseignements}</div></div>
              <div style={{ background: '#fff', border: '1px solid var(--bdr)', borderRadius: 10, padding: '12px 14px', marginBottom: 8 }}><div style={{ fontSize: 14, fontWeight: 700, color: 'var(--txt)', marginBottom: 4 }}>Type d&apos;examen</div><div style={{ fontSize: 12, color: 'var(--txt2)' }}>{validatedPrescription.typeExamen}</div></div>
              <div style={{ background: validatedPrescription.urgence === 'n' ? '#dbeafe' : validatedPrescription.urgence === 'u' ? '#fef3c7' : '#fee2e2', borderRadius: 10, padding: '12px 14px', marginBottom: 16 }}><div style={{ fontSize: 13, fontWeight: 700, color: validatedPrescription.urgence === 'n' ? '#1e40af' : validatedPrescription.urgence === 'u' ? '#92400e' : '#991b1b' }}>{validatedPrescription.urgence === 'n' ? 'Normal' : validatedPrescription.urgence === 'u' ? 'Urgent' : 'TRES_URGENT'}</div></div>
              {validatedPrescription.alertes && (<div style={{ background: 'var(--red-lt)', borderRadius: 10, padding: '12px 14px', marginBottom: 16 }}><div style={{ fontSize: 13, color: 'var(--txt)' }}>{validatedPrescription.alertes}</div></div>)}
              {validatedPrescription.remarques && (<div style={{ background: 'var(--bg)', borderRadius: 10, padding: '12px 14px', marginBottom: 16 }}><div style={{ fontSize: 13, color: 'var(--txt)' }}>{validatedPrescription.remarques}</div></div>)}
              <div className="mbtns" style={{ marginTop: 20 }}><button className="bok" onClick={() => setShowValidationModal(false)}>Fermer</button></div>
            </div>
          </div>
        </div>
      )}
      {toast && <div className="tst on"><span className="ms">check_circle</span>{toast}</div>}
    </div>
  );
}
