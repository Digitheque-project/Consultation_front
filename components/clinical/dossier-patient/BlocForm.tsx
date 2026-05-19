"use client";
import { useState } from "react";
import { openSummaryWindow } from '@/lib/printPrescription';
import { creerPrescriptionBloc } from "@/lib/api";

type Urgence = "n" | "u" | "tu";
const urgenceClasses: Record<Urgence, string> = { n: "un", u: "uu", tu: "utu" };

interface Props {
  patient: { id: string; nom?: string; prenom?: string };
  prescripteur: { id?: string; nom?: string; prenom?: string; service?: string };
}

export default function BlocForm({ patient, prescripteur }: Props) {
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

  const isFormValid = libelle.trim() !== "" && renseignements.trim() !== "";

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(""), 2800); }

  function buildBlocSummary(): string {
    const now = new Date().toLocaleString('fr-FR');
    const urgLabel = { n: 'Normal (programmé)', u: 'Urgent', tu: 'STAT' }[urgence];
    let html = `<div class="card"><div class="patient">Date : ${now}</div>`;
    html += `<div class="medicament"><span class="nom">Urgence :</span> <span class="detail">${urgLabel}</span></div>`;
    html += `<div class="medicament"><span class="nom">Renseignements :</span> <span class="detail">${renseignements}</span></div>`;
    html += `<div class="medicament"><span class="nom">Intervention :</span> <span class="detail">${libelle}</span></div>`;
    if (dateIntervention) html += `<div class="medicament"><span class="nom">Date prévue :</span> <span class="detail">${dateIntervention}</span></div>`;
    if (risqueHemo) html += `<div class="medicament"><span class="nom">Risque hémorragique :</span> <span class="detail">${risqueHemo}</span></div>`;
    if (typeChir) html += `<div class="medicament"><span class="nom">Type de chirurgie :</span> <span class="detail">${typeChir}</span></div>`;
    if (chirurgien) html += `<div class="medicament"><span class="nom">Chirurgien :</span> <span class="detail">${chirurgien}</span></div>`;
    if (alertes) html += `<div class="notice">⚠️ ${alertes}</div>`;
    if (consignes) html += `<div class="notice">📌 ${consignes}</div>`;
    html += `</div>`;
    return html;
  }

  async function handleSubmit() {
    setShowModal(false);
    setLoading(true);
    setApiError("");
    try {
      await creerPrescriptionBloc({
        patientId: patient.id,
        prescripteurId: prescripteur.id,
        urgence,
        alertes,
        libelle,
        risqueHemorragique: risqueHemo || undefined,
        chirurgien,
        consignes,
      });
      openSummaryWindow('Bloc opératoire', buildBlocSummary());
      showToast("Prescription bloc envoyée — Demande de CPA transmise");
      // reset
      setUrgence("n"); setAlertes(""); setRenseignements(""); setLibelle("");
      setDateIntervention(""); setRisqueHemo(""); setTypeChir(""); setConsignes("");
      setChirurgien(prescripteur.nom ? `Dr. ${prescripteur.nom} ${prescripteur.prenom || ''}` : "");
    } catch {
      setApiError("Erreur lors de l'envoi. Vérifiez la connexion.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      {apiError && (
        <div style={{ background: "var(--red-lt)", border: "1px solid var(--red-bdr)", borderRadius: 8, padding: "10px 12px", fontSize: 12, color: "var(--red)", marginBottom: 12 }}>
          {apiError}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 16, alignItems: 'start' }}>
        {/* COLONNE GAUCHE */}
        <div className="card" style={{ padding: 12 }}>
          <div className="mb12">
            <label className="lbl">Renseignements cliniques <span className="req">*</span></label>
            <textarea rows={3} placeholder="Contexte clinique, motif de l'intervention..." value={renseignements} onChange={e => setRenseignements(e.target.value)} />
          </div>
          <div className="mb12">
            <label className="lbl">Libellé de l'intervention chirurgicale <span className="req">*</span></label>
            <textarea rows={3} placeholder="Décrire précisément l'acte opératoire à réaliser..." value={libelle} onChange={e => setLibelle(e.target.value)} />
          </div>
          <div className="mb12">
            <label className="lbl">Date souhaitée pour l'intervention</label>
            <input type="date" value={dateIntervention} onChange={e => setDateIntervention(e.target.value)} />
          </div>
          <div className="mb12">
            <label className="lbl">Risque hémorragique estimé</label>
            <div className="g3">
              {["Faible", "Modéré", "Élevé"].map(v => (
                <label key={v} className="rc">
                  <input type="radio" name="bloc-hemo" checked={risqueHemo === v} onChange={() => setRisqueHemo(v)} style={{ accentColor: "var(--navy)" }} />
                  <span>{v}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="mb12">
            <label className="lbl">Type de chirurgie</label>
            <input type="text" value={typeChir} onChange={e => setTypeChir(e.target.value)} placeholder="Ex : chirurgie viscérale, orthopédique..." />
          </div>
          <label className="lbl">Consignes particulières / Matériel spécifique</label>
          <textarea rows={3} value={consignes} onChange={e => setConsignes(e.target.value)} placeholder="Ex : nécessité d'un implant, prothèse..." />
        </div>

        {/* COLONNE DROITE — sticky */}
        <div style={{ position: 'sticky', top: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="card" style={{ padding: 8 }}>
            <label className="lbl">Degré d'urgence <span className="req">*</span></label>
            <div className={`urgr ${urgenceClasses[urgence]}`} style={{ marginBottom: 8 }}>
              <div className="urgd" />
              <select className="urgs" value={urgence} onChange={e => setUrgence(e.target.value as Urgence)}>
                <option value="n">Normal (programmé)</option>
                <option value="u">Urgent</option>
                <option value="tu">STAT — Urgence vitale (CPA différé)</option>
              </select>
            </div>
            <div className="ah"><span className="ms">warning</span><span>Précautions &amp; Alertes</span></div>
            <textarea
              className="af" rows={2}
              placeholder="Allergies connues, anticoagulants, implants, antécédents chirurgicaux importants..."
              value={alertes} onChange={e => setAlertes(e.target.value)}
              style={alertes.trim() ? { background: "var(--red-lt)", border: "1.5px solid var(--red-bdr)", padding: '8px 12px' } : { padding: '8px 12px' }}
            />
          </div>
          <div className="card" style={{ padding: 12 }}>
            <div className="sh mb12">Chirurgien prescripteur</div>
            <div className="mb12">
              <label className="lbl">Nom du chirurgien prescripteur</label>
              <input type="text" value={chirurgien} onChange={e => setChirurgien(e.target.value)} placeholder="Dr. ________________" />
            </div>
          </div>
          <button
            className="bp"
            onClick={() => setShowModal(true)}
            style={{ opacity: isFormValid && !loading ? 1 : 0.5, marginTop: 0 }} disabled={!isFormValid || loading}
          >
            <span className="ms">medical_services</span>{loading ? "Envoi..." : "Valider — Envoyer demande de CPA"}
          </button>
        </div>
      </div>

      <p className="hint" style={{ textAlign: "center", marginTop: 6 }}>
        Cette validation transmet automatiquement une demande de CPA au Professeur anesthésiste
      </p>

      {showModal && (
        <div className="mb op" onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}>
          <div className="mbox">
            <h3>Confirmer la prescription ?</h3>
            <p>La prescription bloc opératoire sera transmise et une demande de CPA envoyée automatiquement au Professeur anesthésiste.</p>
            <div className="mbtns">
              <button className="bca" onClick={() => setShowModal(false)}>Annuler</button>
              <button className="bok" onClick={handleSubmit}>Confirmer</button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className="tst on"><span className="ms">check_circle</span>{toast}</div>}
    </div>
  );
}
