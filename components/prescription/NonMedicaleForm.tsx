"use client";
import { useState } from "react";
import { creerPrescriptionNonMedicale } from '@/lib/prescription-api';

type Urgence = "n" | "u" | "tu";
const urgenceClasses: Record<Urgence, string> = { n: "un", u: "uu", tu: "utu" };

const TYPE_OPTIONS = [
  { value: 'regime', label: 'Régime alimentaire' },
  { value: 'mobilisation', label: 'Mobilisation / Positionnement' },
  { value: 'hygiene', label: 'Hygiène' },
  { value: 'contention', label: 'Contention / Attelle' },
];
const TYPES_WITHOUT_FREQUENCE = ['regime', 'contention'];

interface Props { patient: { id: string; nom?: string; prenom?: string; sexe?: string; dateNaissance?: string; allergies?: string[]; groupeSanguin?: string }; prescripteur: { id?: string; nom?: string; prenom?: string; service?: string; chuId?: string; serviceId?: string }; onAddToCart?: (item: { label: string; count: number; submit: () => Promise<unknown> }) => void; }
interface ItemDemande { id: number; type: string; typeLabel: string; description: string; dureeJours: number; frequenceType: string; frequenceValeur: number; instructions: string }

export default function NonMedicaleForm({ patient, prescripteur, onAddToCart }: Props) {
  const [urgence, setUrgence] = useState<Urgence>("n");

  const [type, setType] = useState("");
  const [description, setDescription] = useState("");
  const [dureeJours, setDureeJours] = useState<number>(0);
  const [frequenceType, setFrequenceType] = useState("");
  const [frequenceValeur, setFrequenceValeur] = useState<number>(0);
  const [instructions, setInstructions] = useState("");

  const [cart, setCart] = useState<ItemDemande[]>([]);
  const removeItem = (id: number) => setCart(prev => prev.filter(i => i.id !== id));

  const [showModal, setShowModal] = useState(false);
  const [toast, setToast] = useState("");
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState("");

  const showFrequence = !TYPES_WITHOUT_FREQUENCE.includes(type);
  const currentItemValid = !!type && description.trim() !== "" && (!showFrequence || (dureeJours > 0 && !!frequenceType && (frequenceType === 'SOS' || frequenceType === 'CONTINU' || frequenceValeur > 0)));
  const canSubmit = cart.length > 0;
  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(""), 2800); }

  function addToCart() {
    const typeLabel = TYPE_OPTIONS.find(o => o.value === type)?.label || type;
    setCart(prev => [...prev, { id: Date.now(), type, typeLabel, description: description.trim(), dureeJours, frequenceType, frequenceValeur, instructions: instructions.trim() }]);
    setType(""); setDescription(""); setDureeJours(0); setFrequenceType(""); setFrequenceValeur(0); setInstructions("");
  }

  function buildItems(items: ItemDemande[]) {
    return items.map(i => ({ type: i.type, typeLabel: i.typeLabel, description: i.description, dureeJours: i.dureeJours || undefined, frequenceType: i.frequenceType || undefined, frequenceValeur: i.frequenceValeur || undefined, instructions: i.instructions || undefined }));
  }

  async function handleSubmit() {
    setShowModal(false); setLoading(true); setApiError("");
    try {
      await creerPrescriptionNonMedicale({ patientId: patient.id, prescripteurId: prescripteur.id, chuId: prescripteur.chuId, serviceId: prescripteur.serviceId, urgence, items: buildItems(cart) });
      showToast(`${cart.length} soin(s) non médicamenteux envoyé(s)`);
      setCart([]); setUrgence("n");
    } catch { setApiError("Erreur lors de l'envoi."); }
    finally { setLoading(false); }
  }

  return (
    <div>
      {apiError && <div style={{background:"var(--red-lt)",border:"1px solid var(--red-bdr)",borderRadius:8,padding:"10px 12px",fontSize:12,color:"var(--red)",marginBottom:12}}>{apiError}</div>}
      <div className="g2-form mb12">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="card" style={{ padding: 12 }}>
            <div className="mb12"><label className="lbl">Type de prescription <span className="req">*</span></label>
              <select value={type} onChange={e => setType(e.target.value)}>
                <option value="">— Sélectionner —</option>
                {TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div className="mb12"><label className="lbl">Description précise <span className="req">*</span></label><input type="text" value={description} onChange={e => setDescription(e.target.value)} placeholder="Ex : Régime sans sel strict..." /></div>
            {showFrequence && (
              <div className="g2 mb12">
                <div><label className="lbl">Type de fréquence <span className="req">*</span></label>
                  <select value={frequenceType} onChange={e => setFrequenceType(e.target.value)}>
                    <option value="">Sélectionner</option>
                    <option value="HEURES">Toutes les X heures</option>
                    <option value="PAR_JOUR">X fois par jour</option>
                    <option value="SOS">Si besoin</option>
                    <option value="CONTINU">En continu</option>
                  </select>
                </div>
                <div><label className="lbl">Durée (jours) <span className="req">*</span></label><input type="number" min={1} value={dureeJours || ''} onChange={e => setDureeJours(parseInt(e.target.value) || 0)} placeholder="Ex : 7" /></div>
              </div>
            )}
            {showFrequence && (frequenceType === 'HEURES' || frequenceType === 'PAR_JOUR') && (
              <div className="mb12"><label className="lbl">Valeur <span className="req">*</span></label><input type="number" min={1} value={frequenceValeur || ''} onChange={e => setFrequenceValeur(parseInt(e.target.value) || 0)} placeholder={frequenceType === 'HEURES' ? 'Ex : 8h' : 'Ex : 3x'} /></div>
            )}
            <label className="lbl">Instructions</label>
            <input type="text" value={instructions} onChange={e => setInstructions(e.target.value)} placeholder="Précisions pour l'équipe soignante..." />
            <button
              onClick={addToCart}
              disabled={!currentItemValid}
              style={{
                marginTop: 12, width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
                padding: "11px 16px", border: "2px dashed", borderColor: currentItemValid ? "var(--navy)" : "var(--bdr)",
                borderRadius: 10, background: currentItemValid ? "var(--navy-lt)" : "transparent",
                color: currentItemValid ? "var(--navy)" : "var(--txt3)",
                cursor: currentItemValid ? "pointer" : "not-allowed", fontSize: 13, fontWeight: 700,
              }}
            >
              <span className="ms" style={{ fontSize: 18 }}>add_circle</span>
              Ajouter à la prescription
            </button>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="card" style={{ padding: 8 }}><label className="lbl">Degré d&apos;urgence <span className="req">*</span></label><div className={`urgr ${urgenceClasses[urgence]}`} style={{ marginBottom:8 }}><div className="urgd" /><select className="urgs" value={urgence} onChange={e => setUrgence(e.target.value as Urgence)}><option value="n">Normal</option><option value="u">Urgent</option><option value="tu">TRES_URGENT</option></select></div></div>

          <div className="card" style={{ padding: 12 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <span className="sh" style={{ margin: 0 }}>Prescriptions ajoutées</span>
              <span style={{ background: "var(--navy)", color: "#fff", borderRadius: 20, padding: "1px 8px", fontSize: 11, fontWeight: 800 }}>{cart.length}</span>
            </div>
            {cart.length === 0 ? (
              <div style={{ textAlign: "center", padding: "16px 0", color: "var(--txt3)", fontSize: 12 }}>
                <span className="ms" style={{ fontSize: 28, display: "block", marginBottom: 6 }}>playlist_add</span>
                Aucune prescription ajoutée.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {cart.map(item => (
                  <div key={item.id} style={{ display: "flex", alignItems: "flex-start", gap: 8, background: "var(--navy-lt)", border: "1.5px solid var(--navy-mid)", borderRadius: 9, padding: "8px 10px" }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, color: "var(--navy)", fontWeight: 600 }}>{item.typeLabel}</div>
                      <div style={{ fontSize: 11, color: "var(--txt2)" }}>{item.description}</div>
                    </div>
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
      {showModal && <div className="mb op" onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}><div className="mbox"><h3>Confirmer ?</h3><p>{cart.length} prescription(s) non médicamenteuse(s) seront transmises.</p><ul style={{ margin: "0 0 16px", padding: "0 0 0 16px", fontSize: 13, color: "var(--txt2)" }}>{cart.map(i => <li key={i.id}>{i.typeLabel} — {i.description}</li>)}</ul><div className="mbtns"><button className="bca" onClick={()=>setShowModal(false)}>Annuler</button><button className="bok" onClick={() => { if (onAddToCart) { const snapCart = [...cart]; const snap = { patientId: patient.id, prescripteurId: prescripteur.id, chuId: prescripteur.chuId, serviceId: prescripteur.serviceId, urgence, items: buildItems(snapCart) }; onAddToCart({ label: `Non médicamenteuse — ${snapCart.length} soin${snapCart.length > 1 ? "s" : ""}`, count: snapCart.length, submit: () => creerPrescriptionNonMedicale(snap) }); setShowModal(false); setCart([]); } else { handleSubmit(); } }}>Confirmer</button></div></div></div>}
      {toast && <div className="tst on"><span className="ms">check_circle</span>{toast}</div>}
    </div>
  );
}
