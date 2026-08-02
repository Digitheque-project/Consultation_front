"use client";
import { useState } from "react";

const TYPE_OPTIONS = [
  { value: 'regime', label: 'Régime alimentaire' },
  { value: 'mobilisation', label: 'Mobilisation / Positionnement' },
  { value: 'hygiene', label: 'Hygiène' },
  { value: 'contention', label: 'Contention / Attelle' },
];
const TYPES_WITHOUT_FREQUENCE = ['regime', 'contention'];

export interface NonMedicamentItem {
  id: number; type: string; typeLabel: string; description: string;
  dureeJours: number; frequenceType: string; frequenceValeur: number; instructions: string;
}

interface Props {
  items: NonMedicamentItem[];
  onChange: (items: NonMedicamentItem[]) => void;
}

// Transforme la liste locale en payload attendu par creerPrescriptionNonMedicale.
export function buildNonMedicamentItems(items: NonMedicamentItem[]) {
  return items.map(i => ({ type: i.type, typeLabel: i.typeLabel, description: i.description, dureeJours: i.dureeJours || undefined, frequenceType: i.frequenceType || undefined, frequenceValeur: i.frequenceValeur || undefined, instructions: i.instructions || undefined }));
}

// Brique réutilisable de saisie de prescriptions non médicamenteuses (régime,
// mobilisation, hygiène, contention) — extraite du modèle validé, pour être
// intégrée ailleurs (ex : page de traitement) sans dupliquer la logique.
export default function NonMedicamentBuilder({ items, onChange }: Props) {
  const [type, setType] = useState("");
  const [description, setDescription] = useState("");
  const [dureeJours, setDureeJours] = useState<number>(0);
  const [frequenceType, setFrequenceType] = useState("");
  const [frequenceValeur, setFrequenceValeur] = useState<number>(0);
  const [instructions, setInstructions] = useState("");

  const showFrequence = !TYPES_WITHOUT_FREQUENCE.includes(type);
  const currentItemValid = !!type && description.trim() !== "" && (!showFrequence || (dureeJours > 0 && !!frequenceType && (frequenceType === 'SOS' || frequenceType === 'CONTINU' || frequenceValeur > 0)));

  function addItem() {
    const typeLabel = TYPE_OPTIONS.find(o => o.value === type)?.label || type;
    onChange([...items, { id: Date.now(), type, typeLabel, description: description.trim(), dureeJours, frequenceType, frequenceValeur, instructions: instructions.trim() }]);
    setType(""); setDescription(""); setDureeJours(0); setFrequenceType(""); setFrequenceValeur(0); setInstructions("");
  }

  function removeItem(id: number) {
    onChange(items.filter(i => i.id !== id));
  }

  return (
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
            type="button"
            onClick={addItem}
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
            Ajouter
          </button>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div className="card" style={{ padding: 12 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <span className="sh" style={{ margin: 0 }}>Prescriptions ajoutées</span>
            <span style={{ background: "var(--navy)", color: "#fff", borderRadius: 20, padding: "1px 8px", fontSize: 11, fontWeight: 800 }}>{items.length}</span>
          </div>
          {items.length === 0 ? (
            <div style={{ textAlign: "center", padding: "16px 0", color: "var(--txt3)", fontSize: 12 }}>
              <span className="ms" style={{ fontSize: 28, display: "block", marginBottom: 6 }}>playlist_add</span>
              Aucune prescription ajoutée.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {items.map(item => (
                <div key={item.id} style={{ display: "flex", alignItems: "flex-start", gap: 8, background: "var(--navy-lt)", border: "1.5px solid var(--navy-mid)", borderRadius: 9, padding: "8px 10px" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, color: "var(--navy)", fontWeight: 600 }}>{item.typeLabel}</div>
                    <div style={{ fontSize: 11, color: "var(--txt2)" }}>{item.description}</div>
                  </div>
                  <button type="button" onClick={() => removeItem(item.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--txt3)", padding: 2, lineHeight: 1 }}>
                    <span className="ms" style={{ fontSize: 15 }}>close</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
