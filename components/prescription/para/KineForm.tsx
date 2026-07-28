"use client";
import { useState } from "react";
import { creerPrescriptionKine } from '@/lib/prescription-api';

type Urgence = "n" | "u" | "tu";
const urgenceClasses: Record<Urgence, string> = { n: "un", u: "uu", tu: "utu" };

const KINE_TYPES = ["Rééducation motrice (membre supérieur)","Rééducation motrice (membre inférieur)","Rééducation rachidienne / lombaire","Rééducation neurologique (AVC, SEP…)","Kinésithérapie respiratoire","Rééducation périnéale","Drainage lymphatique manuel","Massage thérapeutique","Balnéothérapie","Rééducation de la marche","Autre"];
const CONTRE_INDICATIONS = ["Pas de massage (anticoagulants, thrombose)","Pas de chaleur (infection active)","Pas de mobilisation active (fracture non consolidée)","Pas d'hydrothérapie (plaie ouverte)","Appui interdit"];

interface Props { patient: { id: string; nom?: string; prenom?: string; sexe?: string; dateNaissance?: string; allergies?: string[]; groupeSanguin?: string; }; prescripteur: { id?: string; nom?: string; prenom?: string; service?: string; chuId?: string; serviceId?: string }; onAddToCart?: (item: { label: string; count: number; submit: () => Promise<unknown> }) => void; }

function calcAge(dateNaissance?: string): number | null {
  if (!dateNaissance) return null;
  const diff = Date.now() - new Date(dateNaissance).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
}

interface ValidatedPrescription {
  urgence: Urgence; alertes: string; renseignements: string; kineType: string; kineAutre: string; diagnostic: string; ciSelected: string[]; ciAutre: boolean; ciAutreText: string; objectifs: string; remarques: string;
  patient: Props["patient"] & { age: number | null; sexeLabel?: string };
  prescripteur: Props["prescripteur"]; date: string;
}

export default function KineForm({ patient, prescripteur, onAddToCart }: Props) {
  const [urgence, setUrgence] = useState<Urgence>("n"); const [alertes, setAlertes] = useState("");
  const [renseignements, setRenseign] = useState(""); const [kineType, setKineType] = useState("");
  const [kineAutre, setKineAutre] = useState(""); const [diagnostic, setDiagnostic] = useState("");
  const [ciSelected, setCiSelected] = useState<string[]>([]); const [ciAutre, setCiAutre] = useState(false); const [ciAutreText, setCiAutreText] = useState("");
  const [objectifs, setObjectifs] = useState(""); const [remarques, setRemarques] = useState("");
  const [showModal, setShowModal] = useState(false); const [toast, setToast] = useState("");
  const [loading, setLoading] = useState(false); const [apiError, setApiError] = useState("");
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [validatedPrescription, setValidatedPrescription] = useState<ValidatedPrescription | null>(null);

  const age = calcAge(patient?.dateNaissance);
  const sexeLabel = patient?.sexe === 'M' ? 'Masculin' : patient?.sexe === 'F' ? 'Féminin' : patient?.sexe;

  function toggleCI(val: string) { setCiSelected(prev => prev.includes(val) ? prev.filter(v => v !== val) : [...prev, val]); }
  const isFormValid = !!renseignements.trim() && !!kineType && (kineType !== "Autre" || !!kineAutre.trim()) && !!diagnostic.trim() && !!objectifs.trim();
  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(""), 2800); }

  async function handleSubmit() {
    setShowModal(false); setLoading(true); setApiError("");
    try {
      await creerPrescriptionKine({ patientId: patient.id, prescripteurId: prescripteur.id, chuId: prescripteur.chuId, serviceId: prescripteur.serviceId, urgence, alertes, renseignements, typeKine: kineType === "Autre" ? kineAutre : kineType, diagnostic, contreIndications: [...ciSelected, ciAutre ? ciAutreText : undefined].filter(Boolean), objectifs, remarques });
      setValidatedPrescription({ urgence, alertes, renseignements, kineType, kineAutre, diagnostic, ciSelected, ciAutre, ciAutreText, objectifs, remarques, patient: { ...patient, age, sexeLabel }, prescripteur, date: new Date().toLocaleString('fr-FR') });
      setShowValidationModal(true);
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
          <div className="card" style={{ padding: 8 }}><label className="lbl">Degré d&apos;urgence <span className="req">*</span></label><div className={`urgr ${urgenceClasses[urgence]}`} style={{ marginBottom:8 }}><div className="urgd" /><select className="urgs" value={urgence} onChange={e => setUrgence(e.target.value as Urgence)}><option value="n">Normal</option><option value="u">Urgent</option><option value="tu">TRES_URGENT</option></select></div><div style={{display:"flex",alignItems:"center",gap:6,marginBottom:4}}><span className="ms" style={{fontSize:16,color:"var(--red)"}}>warning</span><span className="lbl" style={{margin:0}}>Précautions &amp; Alertes</span></div><textarea rows={1} value={alertes} onChange={e => setAlertes(e.target.value)} placeholder="Contre-indications..." style={{background:"var(--red-lt)",border:"1.5px solid var(--red-bdr)",padding:'8px 12px'}} /></div>
          <div className="card" style={{ padding: 12 }}><label className="lbl">Objectifs thérapeutiques <span className="req">*</span></label><textarea rows={3} value={objectifs} onChange={e => setObjectifs(e.target.value)} placeholder="Ex : récupération..." /></div>
          <div className="card" style={{ padding: 12 }}><label className="lbl">Remarques complémentaires</label><textarea rows={2} value={remarques} onChange={e => setRemarques(e.target.value)} placeholder="Informations supplémentaires..." /></div>
          <button className="bp" onClick={() => setShowModal(true)} style={{ opacity: isFormValid && !loading ? 1 : 0.5, pointerEvents: isFormValid && !loading ? "auto" : "none", marginTop:0 }}><span className="ms">check_circle</span>{loading ? "Envoi..." : "Valider la prescription"}</button>
        </div>
      </div>
      {showModal && <div className="mb op" onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}><div className="mbox"><h3>Confirmer ?</h3><p>La prescription sera transmise au service de kiné.</p><div className="mbtns"><button className="bca" onClick={()=>setShowModal(false)}>Annuler</button><button className="bok" onClick={() => { if (onAddToCart) { const typeKineEffectif = kineType === "Autre" ? kineAutre : kineType; const snap = { patientId: patient.id, prescripteurId: prescripteur.id, chuId: prescripteur.chuId, serviceId: prescripteur.serviceId, urgence, alertes, renseignements, typeKine: typeKineEffectif, diagnostic, contreIndications: [...ciSelected, ciAutre ? ciAutreText : undefined].filter(Boolean) as string[], objectifs, remarques }; onAddToCart({ label: `Kiné — ${typeKineEffectif}`, count: 1, submit: () => creerPrescriptionKine(snap) }); setShowModal(false); } else { handleSubmit(); } }}>Confirmer</button></div></div></div>}
      {showValidationModal && validatedPrescription && (
        <div className="mb op" onClick={e => { if (e.target === e.currentTarget) setShowValidationModal(false); }}>
          <div className="mbox" style={{ maxWidth: 600, width: '95%', maxHeight: '85vh', overflowY: 'auto' }}>
            <div style={{ background: 'var(--navy)', color: '#fff', padding: '16px 20px', borderRadius: '20px 20px 0 0', display: 'flex', alignItems: 'center', gap: 12 }}><span className="ms" style={{ fontSize: 24 }}>check_circle</span><div><h3 style={{ fontFamily: '"Manrope", sans-serif', fontSize: 18, fontWeight: 800, margin: 0 }}>Prescription kiné validée</h3><p style={{ fontSize: 12, opacity: 0.9, margin: '4px 0 0 0' }}>{validatedPrescription.date}</p></div></div>
            <div style={{ padding: '20px' }}>
              <div style={{ background: 'var(--navy-lt)', borderRadius: 12, padding: '14px 16px', marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}><div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--navy)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span className="ms" style={{ fontSize: 22, color: '#fff' }}>person</span></div><div><div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--txt3)', marginBottom: 2 }}>Patient</div><div style={{ fontSize: 15, fontWeight: 700, color: 'var(--navy)' }}>{validatedPrescription.patient.prenom} {validatedPrescription.patient.nom}</div></div></div>
                {validatedPrescription.patient.allergies && validatedPrescription.patient.allergies.length > 0 && (<div style={{ marginTop: 8, padding: '8px 12px', background: '#fef3c7', border: '1px solid #fbbf24', borderRadius: 8, fontSize: 12, color: '#92400e', display: 'flex', alignItems: 'center', gap: 6 }}><span className="ms" style={{ fontSize: 14 }}>warning</span><strong>Allergies:</strong> {validatedPrescription.patient.allergies.join(', ')}</div>)}
              </div>
              <div style={{ marginBottom: 16 }}>
                <div style={{ background: '#fff', border: '1px solid var(--bdr)', borderRadius: 10, padding: '12px 14px', marginBottom: 8 }}><div style={{ fontSize: 14, fontWeight: 700, color: 'var(--txt)', marginBottom: 4 }}>Renseignements cliniques</div><div style={{ fontSize: 12, color: 'var(--txt2)' }}>{validatedPrescription.renseignements}</div></div>
                <div style={{ background: '#fff', border: '1px solid var(--bdr)', borderRadius: 10, padding: '12px 14px', marginBottom: 8 }}><div style={{ fontSize: 14, fontWeight: 700, color: 'var(--txt)', marginBottom: 4 }}>Type de kinésithérapie</div><div style={{ fontSize: 12, color: 'var(--txt2)' }}>{validatedPrescription.kineType === 'Autre' ? validatedPrescription.kineAutre : validatedPrescription.kineType}</div></div>
                <div style={{ background: '#fff', border: '1px solid var(--bdr)', borderRadius: 10, padding: '12px 14px', marginBottom: 8 }}><div style={{ fontSize: 14, fontWeight: 700, color: 'var(--txt)', marginBottom: 4 }}>Diagnostic</div><div style={{ fontSize: 12, color: 'var(--txt2)' }}>{validatedPrescription.diagnostic}</div></div>
                <div style={{ background: '#fff', border: '1px solid var(--bdr)', borderRadius: 10, padding: '12px 14px', marginBottom: 8 }}><div style={{ fontSize: 14, fontWeight: 700, color: 'var(--txt)', marginBottom: 4 }}>Objectifs thérapeutiques</div><div style={{ fontSize: 12, color: 'var(--txt2)' }}>{validatedPrescription.objectifs}</div></div>
                {(validatedPrescription.ciSelected.length > 0 || validatedPrescription.ciAutre) && (<div style={{ background: '#fff', border: '1px solid var(--bdr)', borderRadius: 10, padding: '12px 14px', marginBottom: 8 }}><div style={{ fontSize: 14, fontWeight: 700, color: 'var(--txt)', marginBottom: 4 }}>Contre-indications</div><div style={{ fontSize: 12, color: 'var(--txt2)' }}>{[...validatedPrescription.ciSelected, validatedPrescription.ciAutre ? validatedPrescription.ciAutreText : null].filter(Boolean).join(', ')}</div></div>)}
              </div>
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
