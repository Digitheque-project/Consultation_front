"use client";
import { useState } from "react";
import { creerPrescriptionORL } from '@/lib/prescription-api';

type Urgence = "n" | "u" | "tu";
const urgenceClasses: Record<Urgence, string> = { n: "un", u: "uu", tu: "utu" };
const TYPES_ORL = ["Audiométrie", "Tympanométrie"];

interface Props { patient: { id: string; nom?: string; prenom?: string; sexe?: string; dateNaissance?: string; allergies?: string[]; groupeSanguin?: string }; prescripteur: { id?: string; nom?: string; prenom?: string; service?: string; chuId?: string; serviceId?: string }; onAddToCart?: (item: { label: string; count: number; submit: () => Promise<unknown> }) => void; }
interface DemandeItem { id: number; typeExamen: string; renseignements: string; remarques: string }

export default function ORLForm({ patient, prescripteur, onAddToCart }: Props) {
  const [urgence, setUrgence] = useState<Urgence>("n");
  const [alertes, setAlertes] = useState("");

  const [renseignements, setRenseignements] = useState("");
  const [typeExamen, setTypeExamen] = useState("");
  const [typeAutre, setTypeAutre] = useState("");
  const [remarques, setRemarques] = useState("");

  const [cart, setCart] = useState<DemandeItem[]>([]);
  const removeItem = (id: number) => setCart(prev => prev.filter(i => i.id !== id));

  const [showModal, setShowModal] = useState(false);
  const [toast, setToast] = useState("");
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState("");

  const typeEffectif = typeExamen === "Autre" ? typeAutre.trim() : typeExamen;
  const currentDemandeValid = renseignements.trim() !== "" && typeEffectif !== "";
  const canSubmit = cart.length > 0;
  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(""), 2800); }

  function addToCart() {
    setCart(prev => [...prev, { id: Date.now(), typeExamen: typeEffectif, renseignements, remarques }]);
    setRenseignements(""); setTypeExamen(""); setTypeAutre(""); setRemarques("");
  }

  function buildDemandes(items: DemandeItem[]) {
    return items.map(i => ({ typeExamen: i.typeExamen, renseignementsCliniques: i.renseignements, remarques: i.remarques }));
  }

  async function handleSubmit() {
    setShowModal(false); setLoading(true); setApiError("");
    try {
      await creerPrescriptionORL({ patientId: patient.id, prescripteurId: prescripteur.id, chuId: prescripteur.chuId, serviceId: prescripteur.serviceId, urgence, alertes, demandes: buildDemandes(cart) });
      showToast(`${cart.length} examen(s) ORL envoyé(s)`);
      setCart([]); setAlertes(""); setUrgence("n");
    } catch { setApiError("Erreur lors de l'envoi."); }
    finally { setLoading(false); }
  }

  return (
    <div>
      {apiError && <div style={{background:"var(--red-lt)",border:"1px solid var(--red-bdr)",borderRadius:8,padding:"10px 12px",fontSize:12,color:"var(--red)",marginBottom:12}}>{apiError}</div>}
      <div className="g2-form mb12">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="card" style={{ padding: 12 }}><label className="lbl">Renseignements cliniques <span className="req">*</span></label><textarea rows={3} value={renseignements} onChange={e => setRenseignements(e.target.value)} placeholder="Motif, symptômes..." /></div>
          <div className="card" style={{ padding: 12 }}>
            <div className="mb12"><label className="lbl">Type d&apos;examen <span className="req">*</span></label><div className="rg">{TYPES_ORL.map(t => <label className="rc" key={t}><input type="radio" name="orl-type" value={t} checked={typeExamen===t} onChange={()=>setTypeExamen(t)} /><span>{t}</span></label>)}<label className="rc"><input type="radio" name="orl-type" value="Autre" checked={typeExamen==="Autre"} onChange={()=>setTypeExamen("Autre")} /><span>Autre</span></label></div>{typeExamen==="Autre" && <input type="text" style={{marginTop:8}} placeholder="Précisez..." value={typeAutre} onChange={e => setTypeAutre(e.target.value)} />}</div>
            <label className="lbl">Remarques (pour cet examen)</label>
            <textarea rows={2} value={remarques} onChange={e => setRemarques(e.target.value)} placeholder="Informations spécifiques..." />
            <button
              onClick={addToCart}
              disabled={!currentDemandeValid}
              style={{
                marginTop: 12, width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
                padding: "11px 16px", border: "2px dashed", borderColor: currentDemandeValid ? "var(--navy)" : "var(--bdr)",
                borderRadius: 10, background: currentDemandeValid ? "var(--navy-lt)" : "transparent",
                color: currentDemandeValid ? "var(--navy)" : "var(--txt3)",
                cursor: currentDemandeValid ? "pointer" : "not-allowed", fontSize: 13, fontWeight: 700,
              }}
            >
              <span className="ms" style={{ fontSize: 18 }}>add_circle</span>
              Ajouter cet examen à la prescription
            </button>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="card" style={{ padding: 8 }}><label className="lbl">Degré d&apos;urgence <span className="req">*</span></label><div className={`urgr ${urgenceClasses[urgence]}`} style={{ marginBottom:8 }}><div className="urgd" /><select className="urgs" value={urgence} onChange={e => setUrgence(e.target.value as Urgence)}><option value="n">Normal</option><option value="u">Urgent</option><option value="tu">TRES_URGENT</option></select></div><div className="ah"><span className="ms">warning</span><span>Précautions &amp; Alertes</span></div><textarea className="af" rows={1} value={alertes} onChange={e => setAlertes(e.target.value)} placeholder="Allergies..." style={{padding:'8px 12px'}} /></div>

          <div className="card" style={{ padding: 12 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <span className="sh" style={{ margin: 0 }}>Examens prescrits</span>
              <span style={{ background: "var(--navy)", color: "#fff", borderRadius: 20, padding: "1px 8px", fontSize: 11, fontWeight: 800 }}>{cart.length}</span>
            </div>
            {cart.length === 0 ? (
              <div style={{ textAlign: "center", padding: "16px 0", color: "var(--txt3)", fontSize: 12 }}>
                <span className="ms" style={{ fontSize: 28, display: "block", marginBottom: 6 }}>playlist_add</span>
                Aucun examen ajouté.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {cart.map(item => (
                  <div key={item.id} style={{ display: "flex", alignItems: "flex-start", gap: 8, background: "var(--navy-lt)", border: "1.5px solid var(--navy-mid)", borderRadius: 9, padding: "8px 10px" }}>
                    <span style={{ flex: 1, fontSize: 12, color: "var(--navy)", fontWeight: 600, lineHeight: 1.4 }}>{item.typeExamen}</span>
                    <button onClick={() => removeItem(item.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--txt3)", padding: 2, lineHeight: 1 }}>
                      <span className="ms" style={{ fontSize: 15 }}>close</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button className="bp" onClick={() => setShowModal(true)} disabled={!canSubmit || loading} style={{ opacity: canSubmit && !loading ? 1 : 0.5, marginTop:0 }}><span className="ms">check_circle</span>{loading ? "Envoi..." : `Valider la prescription (${cart.length})`}</button>
        </div>
      </div>
      {showModal && <div className="mb op" onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}><div className="mbox"><h3>Confirmer ?</h3><p>{cart.length} examen(s) ORL seront transmis au service concerné.</p><ul style={{ margin: "0 0 16px", padding: "0 0 0 16px", fontSize: 13, color: "var(--txt2)" }}>{cart.map(i => <li key={i.id}>{i.typeExamen}</li>)}</ul><div className="mbtns"><button className="bca" onClick={()=>setShowModal(false)}>Annuler</button><button className="bok" onClick={() => { if (onAddToCart) { const snapCart = [...cart]; const snap = { patientId: patient.id, prescripteurId: prescripteur.id, chuId: prescripteur.chuId, serviceId: prescripteur.serviceId, urgence, alertes, demandes: buildDemandes(snapCart) }; onAddToCart({ label: `ORL — ${snapCart.length} examen${snapCart.length > 1 ? "s" : ""}`, count: snapCart.length, submit: () => creerPrescriptionORL(snap) }); setShowModal(false); setCart([]); } else { handleSubmit(); } }}>Confirmer</button></div></div></div>}
      {toast && <div className="tst on"><span className="ms">check_circle</span>{toast}</div>}
    </div>
  );
}
