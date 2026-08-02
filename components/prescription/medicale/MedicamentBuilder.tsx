"use client";
import { useState } from "react";
import { PharmacieArticle } from '@/lib/prescription-api';
import { MedicamentAutocomplete } from '@/components/prescription/medicament-autocomplete';

const QUANTITE_TYPES = ['COMPRIME', 'GELULE', 'CACHET', 'ML', 'G', 'MG', 'GOUTTE', 'FLACON', 'SACHET', 'AMPOULE', 'SERINGUE', 'PATCH', 'SUPPOSITOIRE', 'POMMADE_TUBE', 'SPRAY', 'INHALATEUR'];
const VOIES = ['Orale (per os)', 'Intraveineuse (IV)', 'Intramusculaire (IM)', 'Sous-cutanée (SC)', 'Rectale', 'Topique / locale', 'Inhalation', 'Sublinguale'];

export interface Medicament {
  id: number; nom: string; dose: string; quantite: number; quantiteType: string; voie: string;
  frequenceType: string; frequenceValeur: number; dureeJours: number; instructions: string; remarques: string;
  prixUnitaire?: number; articleId?: string;
}

interface Props {
  medicaments: Medicament[];
  onChange: (medicaments: Medicament[]) => void;
  chuId?: string;
}

// Transforme la liste locale en payload attendu par creerPrescriptionMedicale /
// creerOrdonnanceMedicale — même mapping partout où des médicaments sont envoyés.
export function buildMedicamentsPayload(items: Medicament[]) {
  return items.map(m => ({
    nom: m.nom, dose: m.dose, quantite: m.quantite,
    quantiteType: m.quantiteType || undefined, voie: m.voie || undefined,
    frequenceType: m.frequenceType || undefined, frequenceValeur: m.frequenceValeur || undefined,
    dureeJours: m.dureeJours || undefined, instructions: m.instructions || undefined, remarques: m.remarques || undefined,
    prixUnitaire: m.prixUnitaire, articleId: m.articleId,
  }));
}

// Brique réutilisable de saisie de médicaments (recherche stock pharmacie,
// dose, quantité, voie, fréquence, durée) — extraite du modèle de
// prescription médicamenteuse validé, pour être intégrée ailleurs (ex :
// page de traitement) sans dupliquer la logique.
export default function MedicamentBuilder({ medicaments, onChange, chuId }: Props) {
  const [nom, setNom] = useState("");
  const [dose, setDose] = useState("");
  const [quantite, setQuantite] = useState(1);
  const [quantiteType, setQuantiteType] = useState("COMPRIME");
  const [voie, setVoie] = useState("");
  const [frequenceType, setFrequenceType] = useState("");
  const [frequenceValeur, setFrequenceValeur] = useState<number>(0);
  const [dureeJours, setDureeJours] = useState<number>(0);
  const [instructions, setInstructions] = useState("");
  const [remarques, setRemarques] = useState("");
  const [selectedPrix, setSelectedPrix] = useState<number | undefined>(undefined);
  const [selectedArticleId, setSelectedArticleId] = useState<string | undefined>(undefined);

  // Sélection d'un article dans le catalogue pharmacie (MedicamentAutocomplete
  // charge et affiche tout le catalogue au focus, coloré par niveau de stock).
  function selectArticle(a: PharmacieArticle) {
    setNom(`${a.dci}${a.dosage ? ` ${a.dosage}` : ''}${a.conditionnement ? ` — ${a.conditionnement}` : ''}`);
    setDose(a.dosage || "");
    setSelectedPrix(a.sale_price != null ? Number(a.sale_price) : undefined);
    setSelectedArticleId(String(a.id));
  }

  const isAddValid = nom.trim() !== "" && dose.trim() !== "" && dureeJours > 0
    && !!frequenceType && (frequenceType === 'SOS' || frequenceType === 'CONTINU' || frequenceValeur > 0);

  function addMedicament() {
    onChange([...medicaments, {
      id: Date.now(), nom, dose, quantite, quantiteType, voie, frequenceType, frequenceValeur, dureeJours,
      instructions, remarques, prixUnitaire: selectedPrix, articleId: selectedArticleId,
    }]);
    setNom(""); setDose(""); setQuantite(1); setQuantiteType("COMPRIME"); setVoie("");
    setFrequenceType(""); setFrequenceValeur(0); setDureeJours(0); setInstructions(""); setRemarques("");
    setSelectedPrix(undefined); setSelectedArticleId(undefined);
  }

  function removeMedicament(id: number) {
    onChange(medicaments.filter(m => m.id !== id));
  }

  return (
    <div className="g2-form mb12">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div className="card" style={{ padding: 12 }}>
          <div className="mb12" style={{ position: 'relative' }}>
            <label className="lbl">Médicament <span className="req">*</span></label>
            <MedicamentAutocomplete
              value={nom}
              onChangeText={setNom}
              onSelectArticle={selectArticle}
              chuId={chuId}
              placeholder="Rechercher dans le stock pharmacie..."
            />
          </div>
          <div className="g2 mb12">
            <div><label className="lbl">Dose <span className="req">*</span></label><input type="text" value={dose} onChange={e => setDose(e.target.value)} placeholder="Ex : 500mg" /></div>
            <div><label className="lbl">Quantité</label><input type="number" min={1} value={quantite} onChange={e => setQuantite(Math.max(1, parseInt(e.target.value) || 1))} /></div>
          </div>
          <div className="g2 mb12">
            <div><label className="lbl">Type</label><select value={quantiteType} onChange={e => setQuantiteType(e.target.value)}>{QUANTITE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
            <div><label className="lbl">Voie</label><select value={voie} onChange={e => setVoie(e.target.value)}><option value="">— Sélectionner —</option>{VOIES.map(v => <option key={v} value={v}>{v}</option>)}</select></div>
          </div>
          <div className="g2 mb12">
            <div><label className="lbl">Fréquence <span className="req">*</span></label>
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
          {(frequenceType === 'HEURES' || frequenceType === 'PAR_JOUR') && (
            <div className="mb12"><label className="lbl">Valeur <span className="req">*</span></label><input type="number" min={1} value={frequenceValeur || ''} onChange={e => setFrequenceValeur(parseInt(e.target.value) || 0)} placeholder={frequenceType === 'HEURES' ? 'Ex : 8h' : 'Ex : 3x'} /></div>
          )}
          <div className="mb12"><label className="lbl">Instructions</label><input type="text" value={instructions} onChange={e => setInstructions(e.target.value)} placeholder="Ex : à prendre après les repas..." /></div>
          <label className="lbl">Remarques</label>
          <input type="text" value={remarques} onChange={e => setRemarques(e.target.value)} placeholder="Précisions complémentaires..." />
          <button
            type="button"
            onClick={addMedicament}
            disabled={!isAddValid}
            style={{
              marginTop: 12, width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
              padding: "11px 16px", border: "2px dashed", borderColor: isAddValid ? "var(--navy)" : "var(--bdr)",
              borderRadius: 10, background: isAddValid ? "var(--navy-lt)" : "transparent",
              color: isAddValid ? "var(--navy)" : "var(--txt3)",
              cursor: isAddValid ? "pointer" : "not-allowed", fontSize: 13, fontWeight: 700,
            }}
          >
            <span className="ms" style={{ fontSize: 18 }}>add_circle</span>
            Ajouter à la prescription
          </button>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div className="card" style={{ padding: 12 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <span className="sh" style={{ margin: 0 }}>Médicaments ajoutés</span>
            <span style={{ background: "var(--navy)", color: "#fff", borderRadius: 20, padding: "1px 8px", fontSize: 11, fontWeight: 800 }}>{medicaments.length}</span>
          </div>
          {medicaments.length === 0 ? (
            <div style={{ textAlign: "center", padding: "16px 0", color: "var(--txt3)", fontSize: 12 }}>
              <span className="ms" style={{ fontSize: 28, display: "block", marginBottom: 6 }}>medication</span>
              Aucun médicament ajouté.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {medicaments.map(m => (
                <div key={m.id} style={{ display: "flex", alignItems: "flex-start", gap: 8, background: "var(--navy-lt)", border: "1.5px solid var(--navy-mid)", borderRadius: 9, padding: "8px 10px" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, color: "var(--navy)", fontWeight: 600 }}>{m.nom} {m.dose}</div>
                    <div style={{ fontSize: 11, color: "var(--txt2)" }}>qté {m.quantite} {m.quantiteType}</div>
                  </div>
                  <button type="button" onClick={() => removeMedicament(m.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--txt3)", padding: 2, lineHeight: 1 }}>
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
