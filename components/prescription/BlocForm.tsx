"use client";
import { useState } from "react";
import { creerPrescriptionBloc } from "@/lib/prescription-api";

type Urgence = "n" | "u" | "tu";
const urgenceClasses: Record<Urgence, string> = { n: "un", u: "uu", tu: "utu" };

interface Props {
  patient: { id: string; nom?: string; prenom?: string; sexe?: string; dateNaissance?: string; allergies?: string[]; groupeSanguin?: string; };
  prescripteur: { id?: string; nom?: string; prenom?: string; service?: string; chuId?: string; serviceId?: string };
  onAddToCart?: (item: { label: string; count: number; submit: () => Promise<unknown> }) => void;
}

interface ValidatedPrescription {
  urgence: Urgence; alertes: string; renseignements: string; libelle: string; dateIntervention: string; risqueHemo: string; typeChir: string; chirurgien: string; consignes: string;
  patient: Props["patient"] & { age: number | null; sexeLabel?: string };
  prescripteur: Props["prescripteur"]; date: string;
}

function calcAge(dateNaissance?: string): number | null {
  if (!dateNaissance) return null;
  const diff = Date.now() - new Date(dateNaissance).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
}

export default function BlocForm({ patient, prescripteur, onAddToCart }: Props) {
  const [urgence, setUrgence]       = useState<Urgence>("n");
  const [alertes, setAlertes]       = useState("");
  const [renseignements, setRenseignements] = useState("");
  const [libelle, setLibelle]       = useState("");
  const [dateIntervention, setDateIntervention] = useState("");
  const [risqueHemo, setRisqueHemo] = useState("");
  const [typeChir, setTypeChir]     = useState("");
  const [consignes, setConsignes]   = useState("");
  const [chirurgien, setChirurgien] = useState(prescripteur.nom ? `Dr. ${prescripteur.nom} ${prescripteur.prenom || ''}` : "");
  const [showModal, setShowModal]   = useState(false);
  const [toast, setToast]           = useState("");
  const [loading, setLoading]       = useState(false);
  const [apiError, setApiError]     = useState("");
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [validatedPrescription, setValidatedPrescription] = useState<ValidatedPrescription | null>(null);

  const age = calcAge(patient?.dateNaissance);
  const sexeLabel = patient?.sexe === 'M' ? 'Masculin' : patient?.sexe === 'F' ? 'Féminin' : patient?.sexe;

  const isFormValid = libelle.trim() !== "" && renseignements.trim() !== "";
  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(""), 2800); }

  async function handleSubmit() {
    setShowModal(false); setLoading(true); setApiError("");
    try {
      await creerPrescriptionBloc({ patientId: patient.id, prescripteurId: prescripteur.id, chuId: prescripteur.chuId, serviceId: prescripteur.serviceId, urgence, alertes, renseignements, libelle, typeChirurgie: typeChir || undefined, dateIntervention: dateIntervention || undefined, risqueHemorragique: risqueHemo || undefined, chirurgien, consignes });
      setValidatedPrescription({ urgence, alertes, renseignements, libelle, dateIntervention, risqueHemo, typeChir, chirurgien, consignes, patient: { ...patient, age, sexeLabel }, prescripteur, date: new Date().toLocaleString('fr-FR') });
      setShowValidationModal(true);
      showToast("Prescription bloc envoyée — Demande de CPA transmise");
      setUrgence("n"); setAlertes(""); setRenseignements(""); setLibelle(""); setDateIntervention(""); setRisqueHemo(""); setTypeChir(""); setConsignes("");
      setChirurgien(prescripteur.nom ? `Dr. ${prescripteur.nom} ${prescripteur.prenom || ''}` : "");
    } catch { setApiError("Erreur lors de l'envoi. Vérifiez la connexion."); }
    finally { setLoading(false); }
  }

  return (
    <div>
      {apiError && <div style={{ background: "var(--red-lt)", border: "1px solid var(--red-bdr)", borderRadius: 8, padding: "10px 12px", fontSize: 12, color: "var(--red)", marginBottom: 12 }}>{apiError}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 16, alignItems: 'start' }}>
        <div className="card" style={{ padding: 12 }}>
          <div className="mb12"><label className="lbl">Renseignements cliniques <span className="req">*</span></label><textarea rows={3} placeholder="Contexte clinique, motif de l'intervention..." value={renseignements} onChange={e => setRenseignements(e.target.value)} /></div>
          <div className="mb12"><label className="lbl">Libellé de l&apos;intervention chirurgicale <span className="req">*</span></label><textarea rows={3} placeholder="Décrire précisément l'acte opératoire à réaliser..." value={libelle} onChange={e => setLibelle(e.target.value)} /></div>
          <div className="mb12"><label className="lbl">Date souhaitée pour l&apos;intervention</label><input type="date" value={dateIntervention} onChange={e => setDateIntervention(e.target.value)} /></div>
          <div className="mb12"><label className="lbl">Risque hémorragique estimé</label><div className="g3">{["Faible", "Modéré", "Élevé"].map(v => <label key={v} className="rc"><input type="radio" name="bloc-hemo" checked={risqueHemo === v} onChange={() => setRisqueHemo(v)} style={{ accentColor: "var(--navy)" }} /><span>{v}</span></label>)}</div></div>
          <div className="mb12"><label className="lbl">Type de chirurgie</label><input type="text" value={typeChir} onChange={e => setTypeChir(e.target.value)} placeholder="Ex : chirurgie viscérale, orthopédique..." /></div>
          <label className="lbl">Consignes particulières / Matériel spécifique</label>
          <textarea rows={3} value={consignes} onChange={e => setConsignes(e.target.value)} placeholder="Ex : nécessité d'un implant, prothèse..." />
        </div>

        <div style={{ position: 'sticky', top: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="card" style={{ padding: 8 }}>
            <label className="lbl">Degré d&apos;urgence <span className="req">*</span></label>
            <div className={`urgr ${urgenceClasses[urgence]}`} style={{ marginBottom: 8 }}><div className="urgd" /><select className="urgs" value={urgence} onChange={e => setUrgence(e.target.value as Urgence)}><option value="n">Normal (programmé)</option><option value="u">Urgent</option><option value="tu">TRES_URGENT — Urgence vitale (CPA différé)</option></select></div>
            <div className="ah"><span className="ms">warning</span><span>Précautions &amp; Alertes</span></div>
            <textarea className="af" rows={2} placeholder="Allergies connues, anticoagulants, implants..." value={alertes} onChange={e => setAlertes(e.target.value)} style={alertes.trim() ? { background: "var(--red-lt)", border: "1.5px solid var(--red-bdr)", padding: '8px 12px' } : { padding: '8px 12px' }} />
          </div>
          <div className="card" style={{ padding: 12 }}>
            <div className="sh mb12">Chirurgien prescripteur</div>
            <div className="mb12"><label className="lbl">Nom du chirurgien prescripteur</label><input type="text" value={chirurgien} onChange={e => setChirurgien(e.target.value)} placeholder="Dr. ________________" /></div>
          </div>
          <button className="bp" onClick={() => setShowModal(true)} style={{ opacity: isFormValid && !loading ? 1 : 0.5, marginTop: 0 }} disabled={!isFormValid || loading}>
            <span className="ms">medical_services</span>{loading ? "Envoi..." : "Valider — Envoyer demande de CPA"}
          </button>
        </div>
      </div>

      <p className="hint" style={{ textAlign: "center", marginTop: 6 }}>Cette validation transmet automatiquement une demande de CPA au Professeur anesthésiste</p>

      {showModal && <div className="mb op" onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}><div className="mbox"><h3>Confirmer la prescription ?</h3><p>La prescription bloc opératoire sera transmise et une demande de CPA envoyée automatiquement au Professeur anesthésiste.</p><div className="mbtns"><button className="bca" onClick={() => setShowModal(false)}>Annuler</button><button className="bok" onClick={() => { if (onAddToCart) { const snap = { patientId: patient.id, prescripteurId: prescripteur.id, chuId: prescripteur.chuId, serviceId: prescripteur.serviceId, urgence, alertes, renseignements, libelle, typeChirurgie: typeChir || undefined, dateIntervention: dateIntervention || undefined, risqueHemorragique: risqueHemo || undefined, chirurgien, consignes }; onAddToCart({ label: `Bloc — ${libelle}`, count: 1, submit: () => creerPrescriptionBloc(snap) }); setShowModal(false); } else { handleSubmit(); } }}>Confirmer</button></div></div></div>}

      {showValidationModal && validatedPrescription && (
        <div className="mb op" onClick={e => { if (e.target === e.currentTarget) setShowValidationModal(false); }}>
          <div className="mbox" style={{ maxWidth: 600, width: '95%', maxHeight: '85vh', overflowY: 'auto' }}>
            <div style={{ background: 'var(--navy)', color: '#fff', padding: '16px 20px', borderRadius: '20px 20px 0 0', display: 'flex', alignItems: 'center', gap: 12 }}><span className="ms" style={{ fontSize: 24 }}>check_circle</span><div><h3 style={{ fontFamily: '"Manrope", sans-serif', fontSize: 18, fontWeight: 800, margin: 0 }}>Bloc opératoire validé</h3><p style={{ fontSize: 12, opacity: 0.9, margin: '4px 0 0 0' }}>{validatedPrescription.date}</p></div></div>
            <div style={{ padding: '20px' }}>
              <div style={{ background: 'var(--navy-lt)', borderRadius: 12, padding: '14px 16px', marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}><div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--navy)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span className="ms" style={{ fontSize: 22, color: '#fff' }}>person</span></div><div><div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--txt3)', marginBottom: 2 }}>Patient</div><div style={{ fontSize: 15, fontWeight: 700, color: 'var(--navy)' }}>{validatedPrescription.patient.prenom} {validatedPrescription.patient.nom}</div></div></div>
                {validatedPrescription.patient.allergies && validatedPrescription.patient.allergies.length > 0 && (<div style={{ marginTop: 8, padding: '8px 12px', background: '#fef3c7', border: '1px solid #fbbf24', borderRadius: 8, fontSize: 12, color: '#92400e', display: 'flex', alignItems: 'center', gap: 6 }}><span className="ms" style={{ fontSize: 14 }}>warning</span><strong>Allergies:</strong> {validatedPrescription.patient.allergies.join(', ')}</div>)}
              </div>
              <div style={{ marginBottom: 16 }}>
                <div style={{ background: '#fff', border: '1px solid var(--bdr)', borderRadius: 10, padding: '12px 14px', marginBottom: 8 }}><div style={{ fontSize: 14, fontWeight: 700, color: 'var(--txt)', marginBottom: 4 }}>Renseignements cliniques</div><div style={{ fontSize: 12, color: 'var(--txt2)' }}>{validatedPrescription.renseignements}</div></div>
                <div style={{ background: '#fff', border: '1px solid var(--bdr)', borderRadius: 10, padding: '12px 14px', marginBottom: 8 }}><div style={{ fontSize: 14, fontWeight: 700, color: 'var(--txt)', marginBottom: 4 }}>Libellé de l&apos;intervention</div><div style={{ fontSize: 12, color: 'var(--txt2)' }}>{validatedPrescription.libelle}</div></div>
                {validatedPrescription.dateIntervention && <div style={{ background: '#fff', border: '1px solid var(--bdr)', borderRadius: 10, padding: '12px 14px', marginBottom: 8 }}><div style={{ fontSize: 14, fontWeight: 700, color: 'var(--txt)', marginBottom: 4 }}>Date souhaitée</div><div style={{ fontSize: 12, color: 'var(--txt2)' }}>{validatedPrescription.dateIntervention}</div></div>}
                {validatedPrescription.risqueHemo && <div style={{ background: '#fff', border: '1px solid var(--bdr)', borderRadius: 10, padding: '12px 14px', marginBottom: 8 }}><div style={{ fontSize: 14, fontWeight: 700, color: 'var(--txt)', marginBottom: 4 }}>Risque hémorragique</div><div style={{ fontSize: 12, color: 'var(--txt2)' }}>{validatedPrescription.risqueHemo}</div></div>}
                {validatedPrescription.chirurgien && <div style={{ background: '#fff', border: '1px solid var(--bdr)', borderRadius: 10, padding: '12px 14px', marginBottom: 8 }}><div style={{ fontSize: 14, fontWeight: 700, color: 'var(--txt)', marginBottom: 4 }}>Chirurgien prescripteur</div><div style={{ fontSize: 12, color: 'var(--txt2)' }}>{validatedPrescription.chirurgien}</div></div>}
              </div>
              <div style={{ background: validatedPrescription.urgence === 'n' ? '#dbeafe' : validatedPrescription.urgence === 'u' ? '#fef3c7' : '#fee2e2', borderRadius: 10, padding: '12px 14px', marginBottom: 16 }}><div style={{ fontSize: 13, fontWeight: 700, color: validatedPrescription.urgence === 'n' ? '#1e40af' : validatedPrescription.urgence === 'u' ? '#92400e' : '#991b1b' }}>{validatedPrescription.urgence === 'n' ? 'Normal (programmé)' : validatedPrescription.urgence === 'u' ? 'Urgent' : 'TRES_URGENT'}</div></div>
              {validatedPrescription.alertes && <div style={{ background: 'var(--red-lt)', borderRadius: 10, padding: '12px 14px', marginBottom: 16 }}><div style={{ fontSize: 13, color: 'var(--txt)' }}>{validatedPrescription.alertes}</div></div>}
              {validatedPrescription.consignes && <div style={{ background: 'var(--navy-lt)', borderRadius: 10, padding: '12px 14px', marginBottom: 16 }}><div style={{ fontSize: 13, color: 'var(--txt)' }}>{validatedPrescription.consignes}</div></div>}
              <div className="mbtns" style={{ marginTop: 20 }}><button className="bok" onClick={() => setShowValidationModal(false)}>Fermer</button></div>
            </div>
          </div>
        </div>
      )}

      {toast && <div className="tst on"><span className="ms">check_circle</span>{toast}</div>}
    </div>
  );
}
