"use client";
import { useState, useEffect, useRef } from "react";
import { openSummaryWindow } from '@/lib/printPrescription';
import { creerPrescriptionAnapath } from "@/lib/api";

type Urgence = "n" | "u" | "tu";
type AnaTab = "fcv" | "cyto" | "liq" | "bio" | "pos" | "poc" | "ext";

const urgenceClasses: Record<Urgence, string> = { n: "un", u: "uu", tu: "utu" };

const TABS: { key: AnaTab; label: string }[] = [
  { key: "fcv",  label: "FCV / Pap test" },
  { key: "cyto", label: "Cytoponction" },
  { key: "liq",  label: "Liquide" },
  { key: "bio",  label: "Biopsie" },
  { key: "pos",  label: "POS" },
  { key: "poc",  label: "POC" },
  { key: "ext",  label: "Extemporané" },
];

const chipStyle = (active: boolean): React.CSSProperties => ({
  padding: "6px 12px", borderRadius: 20, border: "none", cursor: "pointer",
  fontSize: 12, fontWeight: active ? 600 : 500, flexShrink: 0,
  background: active ? "var(--navy)" : "var(--inp)",
  color: active ? "#fff" : "var(--txt2)", transition: "all .15s",
});

interface Props {
  patient: { id: string; nom?: string; prenom?: string };
  prescripteur: { id?: string; nom?: string; prenom?: string; service?: string };
}

export default function AnapathForm({ patient, prescripteur }: Props) {
  const [urgence, setUrgence]     = useState<Urgence>("n");
  const [alertes, setAlertes]     = useState("");
  const [renseign, setRenseign]   = useState("");
  const [tab, setTab]             = useState<AnaTab>("fcv");
  const [showModal, setShowModal] = useState(false);
  const [toast, setToast]         = useState("");
  const [loading, setLoading]     = useState(false);
  const [apiError, setApiError]   = useState("");

  // FCV
  const [fcvService, setFcvService]     = useState("");
  const [fcvGPA, setFcvGPA]             = useState("");
  const [fcvDDR, setFcvDDR]             = useState("");
  const [fcvMeno, setFcvMeno]           = useState("");
  const [fcvMenarche, setFcvMenarche]   = useState("");
  const [fcvRapport, setFcvRapport]     = useState("");
  const [fcvContra, setFcvContra]       = useState("");
  const [fcvTtt, setFcvTtt]             = useState("");
  const [fcvPapLieu, setFcvPapLieu]     = useState("");
  const [fcvPapNb, setFcvPapNb]         = useState("");
  const [fcvPapDate, setFcvPapDate]     = useState("");
  const [fcvPapRes, setFcvPapRes]       = useState("");
  const [fcvAtcd, setFcvAtcd]           = useState("");
  const [fcvMeth, setFcvMeth]           = useState("");
  const [fcvNote, setFcvNote]           = useState("");

  // Cytoponction
  const [cytoService, setCytoService]       = useState("");
  const [cytoSiege, setCytoSiege]           = useState("");
  const [cytoOrgane, setCytoOrgane]         = useState("");
  const [cytoFix, setCytoFix]               = useState("");
  const [cytoFixAutre, setCytoFixAutre]     = useState("");
  const [cytoNotes, setCytoNotes]           = useState("");

  // Liquide
  const [liqService, setLiqService]     = useState("");
  const [liqUnite, setLiqUnite]         = useState("");
  const [liqNat, setLiqNat]             = useState("");
  const [liqNatAutre, setLiqNatAutre]   = useState("");
  const [liqNotes, setLiqNotes]         = useState("");

  // Biopsie / POS / POC
  const [bioService, setBioService]         = useState("");
  const [bioExamAnt, setBioExamAnt]         = useState("");
  const [bioResAnt, setBioResAnt]           = useState("");
  const [bioGPA, setBioGPA]                 = useState("");
  const [bioDDR, setBioDDR]                 = useState("");
  const [bioMeno, setBioMeno]               = useState("");
  const [bioAtcd, setBioAtcd]               = useState("");
  const [bioDatePrelev, setBioDatePrelev]   = useState("");
  const [bioFixateur, setBioFixateur]       = useState("");
  const [bioOrgane, setBioOrgane]           = useState("");
  const [bioNature, setBioNature]           = useState("");
  const [bioNatureAutre, setBioNatureAutre] = useState("");
  const [bioSuspicion, setBioSuspicion]     = useState("");
  const [bioFaitA, setBioFaitA]             = useState("");
  const [bioFaitLe, setBioFaitLe]           = useState("");
  const [bioNote, setBioNote]               = useState("");

  // Extemporané
  const [extService, setExtService]           = useState("");
  const [extChirurgien, setExtChirurgien]     = useState("");
  const [extPoste, setExtPoste]               = useState("");
  const [extIntervention, setExtIntervention] = useState("");
  const [extNature, setExtNature]             = useState("");
  const [extOrgane, setExtOrgane]             = useState("");
  const [extQuestion, setExtQuestion]         = useState("");
  const [extHeure, setExtHeure]               = useState("");
  const [extNote, setExtNote]                 = useState("");

  // Minuterie
  const [timerActive, setTimerActive]   = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (timerActive) {
      timerRef.current = setInterval(() => setTimerSeconds(s => s + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [timerActive]);

  const timerMinutes = Math.floor(timerSeconds / 60);
  const timerSecs    = timerSeconds % 60;
  const timerAlert   = timerMinutes >= 25;
  const timerDisplay = `${String(timerMinutes).padStart(2,"0")}:${String(timerSecs).padStart(2,"0")}`;

  const isFormValid = (() => {
    if (!renseign.trim() && tab !== "ext") return false;
    if (tab === "fcv")  return !!fcvNote.trim();
    if (tab === "cyto") return !!cytoSiege.trim() && !!cytoOrgane.trim();
    if (tab === "liq")  return !!liqNat && !!liqNotes.trim();
    if (tab === "bio" || tab === "pos" || tab === "poc") return !!bioOrgane.trim() && !!bioNature;
    if (tab === "ext")  return !!extChirurgien.trim() && !!extPoste.trim() && !!extIntervention.trim() && !!extOrgane.trim() && !!extQuestion.trim() && !!extHeure.trim();
    return false;
  })();

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(""), 2800); }

  function buildAnapathSummary(): string {
    const now = new Date().toLocaleString('fr-FR');
    const label = TABS.find(t => t.key === tab)?.label || tab;
    let html = `<div class="card"><div class="patient">Date : ${now}</div>`;
    html += `<div class="medicament"><span class="nom">Type d'examen :</span> <span class="detail">${label}</span></div>`;
    if (renseign) html += `<div class="medicament"><span class="nom">Renseignements :</span> <span class="detail">${renseign}</span></div>`;

    if (tab === "fcv") {
      if (fcvService) html += `<div class="medicament"><span class="nom">Service demandeur :</span> <span class="detail">${fcvService}</span></div>`;
      html += `<div class="section"><span class="label">Antécédents</span></div>`;
      if (fcvGPA) html += `<div class="medicament"><span class="nom">G P A :</span> <span class="detail">${fcvGPA}</span></div>`;
      if (fcvDDR) html += `<div class="medicament"><span class="nom">DDR :</span> <span class="detail">${fcvDDR}</span></div>`;
      if (fcvMeno) html += `<div class="medicament"><span class="nom">Ménopause :</span> <span class="detail">${fcvMeno}</span></div>`;
      if (fcvMenarche) html += `<div class="medicament"><span class="nom">Âge ménarche :</span> <span class="detail">${fcvMenarche}</span></div>`;
      if (fcvRapport) html += `<div class="medicament"><span class="nom">Âge 1er rapport :</span> <span class="detail">${fcvRapport}</span></div>`;
      if (fcvContra) html += `<div class="medicament"><span class="nom">Contraception :</span> <span class="detail">${fcvContra}</span></div>`;
      if (fcvTtt) html += `<div class="medicament"><span class="nom">Traitement en cours :</span> <span class="detail">${fcvTtt}</span></div>`;
      if (fcvPapLieu || fcvPapNb || fcvPapDate || fcvPapRes) {
        html += `<div class="section"><span class="label">Examens Pap antérieurs</span></div>`;
        if (fcvPapLieu) html += `<div class="medicament"><span class="nom">Lieu :</span> <span class="detail">${fcvPapLieu}</span></div>`;
        if (fcvPapNb) html += `<div class="medicament"><span class="nom">Nombre :</span> <span class="detail">${fcvPapNb}</span></div>`;
        if (fcvPapDate) html += `<div class="medicament"><span class="nom">Date :</span> <span class="detail">${fcvPapDate}</span></div>`;
        if (fcvPapRes) html += `<div class="medicament"><span class="nom">Résultat :</span> <span class="detail">${fcvPapRes}</span></div>`;
      }
      if (fcvAtcd) html += `<div class="medicament"><span class="nom">Autres ATCD :</span> <span class="detail">${fcvAtcd}</span></div>`;
      if (fcvMeth) html += `<div class="medicament"><span class="nom">Méthode de prélèvement :</span> <span class="detail">${fcvMeth}</span></div>`;
      if (fcvNote) html += `<div class="medicament"><span class="nom">Note complémentaire :</span> <span class="detail">${fcvNote}</span></div>`;
    }

    if (tab === "cyto") {
      if (cytoService) html += `<div class="medicament"><span class="nom">Service demandeur :</span> <span class="detail">${cytoService}</span></div>`;
      if (cytoSiege) html += `<div class="medicament"><span class="nom">Siège :</span> <span class="detail">${cytoSiege}</span></div>`;
      if (cytoOrgane) html += `<div class="medicament"><span class="nom">Organe :</span> <span class="detail">${cytoOrgane}</span></div>`;
      if (cytoFix) {
        let fixDetail = cytoFix;
        if (cytoFix === "Autre" && cytoFixAutre) fixDetail += ` (${cytoFixAutre})`;
        html += `<div class="medicament"><span class="nom">Fixateur :</span> <span class="detail">${fixDetail}</span></div>`;
      }
      if (cytoNotes) html += `<div class="medicament"><span class="nom">Note :</span> <span class="detail">${cytoNotes}</span></div>`;
    }

    if (tab === "liq") {
      if (liqService) html += `<div class="medicament"><span class="nom">Service demandeur :</span> <span class="detail">${liqService}</span></div>`;
      if (liqUnite) html += `<div class="medicament"><span class="nom">Unité :</span> <span class="detail">${liqUnite}</span></div>`;
      if (liqNat) {
        let nat = liqNat;
        if (liqNat === "Autre" && liqNatAutre) nat += ` (${liqNatAutre})`;
        html += `<div class="medicament"><span class="nom">Nature :</span> <span class="detail">${nat}</span></div>`;
      }
      if (liqNotes) html += `<div class="medicament"><span class="nom">Note :</span> <span class="detail">${liqNotes}</span></div>`;
    }

    if (tab === "bio" || tab === "pos" || tab === "poc") {
      if (bioService) html += `<div class="medicament"><span class="nom">Service demandeur :</span> <span class="detail">${bioService}</span></div>`;
      html += `<div class="section"><span class="label">Antécédents</span></div>`;
      if (bioExamAnt) html += `<div class="medicament"><span class="nom">Examen antérieur :</span> <span class="detail">${bioExamAnt}</span></div>`;
      if (bioResAnt) html += `<div class="medicament"><span class="nom">Résultat antérieur :</span> <span class="detail">${bioResAnt}</span></div>`;
      if (bioGPA) html += `<div class="medicament"><span class="nom">G P A :</span> <span class="detail">${bioGPA}</span></div>`;
      if (bioDDR) html += `<div class="medicament"><span class="nom">DDR :</span> <span class="detail">${bioDDR}</span></div>`;
      if (bioMeno) html += `<div class="medicament"><span class="nom">Ménopause :</span> <span class="detail">${bioMeno}</span></div>`;
      if (bioAtcd) html += `<div class="medicament"><span class="nom">Autres ATCD :</span> <span class="detail">${bioAtcd}</span></div>`;
      html += `<div class="section"><span class="label">Prélèvement</span></div>`;
      if (bioDatePrelev) html += `<div class="medicament"><span class="nom">Date prélèvement :</span> <span class="detail">${bioDatePrelev}</span></div>`;
      if (bioFixateur) html += `<div class="medicament"><span class="nom">Fixateur :</span> <span class="detail">${bioFixateur}</span></div>`;
      if (bioOrgane) html += `<div class="medicament"><span class="nom">Organe :</span> <span class="detail">${bioOrgane}</span></div>`;
      if (bioNature) {
        let nat = bioNature;
        if (bioNature === "Autre" && bioNatureAutre) nat += ` (${bioNatureAutre})`;
        html += `<div class="medicament"><span class="nom">Nature :</span> <span class="detail">${nat}</span></div>`;
      }
      if (bioSuspicion) html += `<div class="medicament"><span class="nom">Suspicion :</span> <span class="detail">${bioSuspicion}</span></div>`;
      if (bioFaitA || bioFaitLe) {
        html += `<div class="medicament"><span class="nom">Fait à :</span> <span class="detail">${bioFaitA}${bioFaitLe ? ` le ${bioFaitLe}` : ''}</span></div>`;
      }
      if (bioNote) html += `<div class="medicament"><span class="nom">Note :</span> <span class="detail">${bioNote}</span></div>`;
    }

    if (tab === "ext") {
      if (extService) html += `<div class="medicament"><span class="nom">Service demandeur :</span> <span class="detail">${extService}</span></div>`;
      if (extChirurgien) html += `<div class="medicament"><span class="nom">Chirurgien :</span> <span class="detail">${extChirurgien}</span></div>`;
      if (extPoste) html += `<div class="medicament"><span class="nom">Poste bloc :</span> <span class="detail">${extPoste}</span></div>`;
      if (extIntervention) html += `<div class="medicament"><span class="nom">Intervention :</span> <span class="detail">${extIntervention}</span></div>`;
      if (extNature) html += `<div class="medicament"><span class="nom">Nature prélèvement :</span> <span class="detail">${extNature}</span></div>`;
      if (extOrgane) html += `<div class="medicament"><span class="nom">Organe :</span> <span class="detail">${extOrgane}</span></div>`;
      if (extQuestion) html += `<div class="medicament"><span class="nom">Question clinique :</span> <span class="detail">${extQuestion}</span></div>`;
      if (extHeure) html += `<div class="medicament"><span class="nom">Heure prélèvement :</span> <span class="detail">${extHeure}</span></div>`;
      if (extNote) html += `<div class="medicament"><span class="nom">Note :</span> <span class="detail">${extNote}</span></div>`;
    }

    if (alertes) html += `<div class="notice">⚠️ ${alertes}</div>`;
    html += `</div>`;
    return html;
  }

  function buildData() {
    if (tab === "fcv")  return { renseign, service: fcvService, gpa: fcvGPA, ddr: fcvDDR, menopause: fcvMeno, menarche: fcvMenarche, rapport: fcvRapport, contraception: fcvContra, traitement: fcvTtt, papLieu: fcvPapLieu, papNb: fcvPapNb, papDate: fcvPapDate, papRes: fcvPapRes, atcd: fcvAtcd, methode: fcvMeth, note: fcvNote };
    if (tab === "cyto") return { renseign, service: cytoService, siege: cytoSiege, organe: cytoOrgane, fixateur: cytoFix, fixateurAutre: cytoFixAutre, note: cytoNotes };
    if (tab === "liq")  return { renseign, service: liqService, unite: liqUnite, nature: liqNat, natureAutre: liqNatAutre, note: liqNotes };
    if (tab === "bio" || tab === "pos" || tab === "poc") return { renseign, service: bioService, examAnt: bioExamAnt, resAnt: bioResAnt, gpa: bioGPA, ddr: bioDDR, menopause: bioMeno, atcd: bioAtcd, datePrelev: bioDatePrelev, fixateur: bioFixateur, organe: bioOrgane, nature: bioNature, natureAutre: bioNatureAutre, suspicion: bioSuspicion, faitA: bioFaitA, faitLe: bioFaitLe, note: bioNote };
    if (tab === "ext")  return { renseign, service: extService, chirurgien: extChirurgien, poste: extPoste, intervention: extIntervention, nature: extNature, organe: extOrgane, question: extQuestion, heure: extHeure, note: extNote };
  }

  async function handleSubmit() {
    setShowModal(false); setLoading(true); setApiError("");
    try {
      await creerPrescriptionAnapath({
        patientId: patient.id,
        prescripteurId: prescripteur.id,
        urgence,
        alertes,
        typeExamen: tab,
        data: buildData(),
      });
      if (tab === "ext") setTimerActive(true);
      openSummaryWindow('Anatomie Pathologique', buildAnapathSummary());
      showToast("Demande Anapath transmise");
      setRenseign(""); setAlertes(""); setUrgence("n");
    } catch { setApiError("Erreur lors de l'envoi. Vérifiez la connexion."); }
    finally { setLoading(false); }
  }

  function bioInfoLabel() {
    if (tab === "pos") return "POS (Pièce Opératoire Simple)";
    if (tab === "poc") return "POC (Pièce Opératoire Complexe)";
    return "Biopsie";
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 16, alignItems: 'start' }}>
      {/* COLONNE GAUCHE */}
      <div>
        {tab !== "ext" && (
          <div className="card mb12">
            <label className="lbl">Renseignements cliniques <span className="req">*</span></label>
            <textarea rows={3} value={renseign} onChange={e => setRenseign(e.target.value)} placeholder="Contexte clinique, suspicion diagnostique, résultats d'imagerie..." />
          </div>
        )}

        <div className="card mb12">
          <label className="lbl">Type d'examen <span className="req">*</span></label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 4 }}>
            {TABS.map(t => (
              <button key={t.key} style={chipStyle(tab === t.key)} onClick={() => setTab(t.key)}>{t.label}</button>
            ))}
          </div>
        </div>

        {tab === "fcv" && (
          <div className="card mb12">
            <div className="mb12"><label className="lbl">Unité / Service demandeur</label><input type="text" value={fcvService} onChange={e => setFcvService(e.target.value)} placeholder="Service clinique prescripteur" /></div>
            <div className="sh mb12">Antécédents</div>
            <div className="g2 mb12">
              <div><label className="lbl">G P A</label><input type="text" value={fcvGPA} onChange={e => setFcvGPA(e.target.value)} placeholder="Ex : G3 P2 A1" /></div>
              <div><label className="lbl">DDR</label><input type="date" value={fcvDDR} onChange={e => setFcvDDR(e.target.value)} /></div>
              <div>
                <label className="lbl">Ménopause</label>
                <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                  {["OUI", "NON"].map(v => (
                    <label key={v} className="rc" style={{ flex: 1 }}>
                      <input type="radio" name="fcv-meno" checked={fcvMeno === v} onChange={() => setFcvMeno(v)} style={{ accentColor: "var(--navy)" }} />
                      <span>{v}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div><label className="lbl">Âge de la ménarche</label><input type="text" value={fcvMenarche} onChange={e => setFcvMenarche(e.target.value)} placeholder="Âge (ans)" /></div>
              <div><label className="lbl">Âge du 1er rapport sexuel</label><input type="text" value={fcvRapport} onChange={e => setFcvRapport(e.target.value)} placeholder="Âge (ans)" /></div>
              <div><label className="lbl">Contraception</label><input type="text" value={fcvContra} onChange={e => setFcvContra(e.target.value)} placeholder="Méthode, durée..." /></div>
              <div><label className="lbl">Traitement en cours</label><input type="text" value={fcvTtt} onChange={e => setFcvTtt(e.target.value)} placeholder="Médicaments, posologies..." /></div>
            </div>
            <div className="mb12">
              <label className="lbl">Examens Pap test antérieurs</label>
              <div className="g2 mb8">
                <input type="text" value={fcvPapLieu} onChange={e => setFcvPapLieu(e.target.value)} placeholder="Lieu" />
                <input type="text" value={fcvPapNb} onChange={e => setFcvPapNb(e.target.value)} placeholder="Nombre de fois" />
                <input type="date" value={fcvPapDate} onChange={e => setFcvPapDate(e.target.value)} />
                <input type="text" value={fcvPapRes} onChange={e => setFcvPapRes(e.target.value)} placeholder="Résultat" />
              </div>
            </div>
            <div className="mb12"><label className="lbl">Autres antécédents personnels et familiaux</label><textarea rows={2} value={fcvAtcd} onChange={e => setFcvAtcd(e.target.value)} placeholder="Précisez..." /></div>
            <div className="mb12">
              <label className="lbl">Méthode de prélèvement</label>
              <div className="g2">
                {["Spatule + brosse", "Milieu liquide (ThinPrep)"].map(v => (
                  <label key={v} className="rc">
                    <input type="radio" name="fcv-meth" checked={fcvMeth === v} onChange={() => setFcvMeth(v)} style={{ accentColor: "var(--navy)" }} />
                    <span>{v}</span>
                  </label>
                ))}
              </div>
            </div>
            <label className="lbl">Note complémentaire <span className="req">*</span></label>
            <textarea rows={3} value={fcvNote} onChange={e => setFcvNote(e.target.value)} placeholder="Signes cliniques, motif de la demande..." />
          </div>
        )}

        {tab === "cyto" && (
          <div className="card mb12">
            <div className="mb12"><label className="lbl">Unité / Service demandeur</label><input type="text" value={cytoService} onChange={e => setCytoService(e.target.value)} placeholder="Service clinique prescripteur" /></div>
            <div className="g2 mb12">
              <div><label className="lbl">Siège de la ponction <span className="req">*</span></label><input type="text" value={cytoSiege} onChange={e => setCytoSiege(e.target.value)} placeholder="Ex : sein gauche, creux axillaire..." /></div>
              <div><label className="lbl">Organe <span className="req">*</span></label><input type="text" value={cytoOrgane} onChange={e => setCytoOrgane(e.target.value)} placeholder="Ex : thyroïde, ganglion, kyste..." /></div>
            </div>
            <div className="mb12">
              <label className="lbl">Fixateur</label>
              <div className="g2">
                {["Cytofixe", "Autre"].map(v => (
                  <label key={v} className="rc">
                    <input type="radio" name="cyto-fix" checked={cytoFix === v} onChange={() => setCytoFix(v)} style={{ accentColor: "var(--navy)" }} />
                    <span>{v}</span>
                  </label>
                ))}
              </div>
            </div>
            {cytoFix === "Autre" && (
              <div className="mb12"><label className="lbl">Préciser le fixateur</label><input type="text" value={cytoFixAutre} onChange={e => setCytoFixAutre(e.target.value)} placeholder="Nom du fixateur utilisé..." /></div>
            )}
            <label className="lbl">Note complémentaire</label>
            <textarea rows={2} value={cytoNotes} onChange={e => setCytoNotes(e.target.value)} placeholder="Informations supplémentaires pour le pathologiste..." />
          </div>
        )}

        {tab === "liq" && (
          <div className="card mb12">
            <div className="g2 mb12">
              <div><label className="lbl">Unité / Service demandeur</label><input type="text" value={liqService} onChange={e => setLiqService(e.target.value)} placeholder="Service clinique prescripteur" /></div>
              <div><label className="lbl">Unité de soins (si hospitalisé)</label><input type="text" value={liqUnite} onChange={e => setLiqUnite(e.target.value)} placeholder="Service / Unité" /></div>
            </div>
            <div className="mb12">
              <label className="lbl">Nature du liquide <span className="req">*</span></label>
              <div className="g2">
                {["Ascite", "Pleural", "Urinaire", "Crachat", "LCR", "Autre"].map(v => (
                  <label key={v} className="rc">
                    <input type="radio" name="liq-nat" checked={liqNat === v} onChange={() => setLiqNat(v)} style={{ accentColor: "var(--navy)" }} />
                    <span>{v}</span>
                  </label>
                ))}
              </div>
            </div>
            {liqNat === "Autre" && (
              <div className="mb12"><label className="lbl">Préciser la nature du liquide <span className="req">*</span></label><input type="text" value={liqNatAutre} onChange={e => setLiqNatAutre(e.target.value)} placeholder="Nature du liquide..." /></div>
            )}
            <label className="lbl">Note complémentaire <span className="req">*</span></label>
            <textarea rows={3} value={liqNotes} onChange={e => setLiqNotes(e.target.value)} placeholder="Symptômes, antécédents, résultats d'imagerie, volume prélevé, aspect macroscopique..." />
          </div>
        )}

        {(tab === "bio" || tab === "pos" || tab === "poc") && (
          <div className="card mb12">
            <div className="mb12"><label className="lbl">Unité / Service demandeur</label><input type="text" value={bioService} onChange={e => setBioService(e.target.value)} placeholder="Service clinique prescripteur" /></div>
            <div className="sh mb12">Antécédents</div>
            <div className="g2 mb12">
              <div><label className="lbl">Examen(s) antérieur(s)</label><input type="text" value={bioExamAnt} onChange={e => setBioExamAnt(e.target.value)} placeholder="Type d'examen" /></div>
              <div><label className="lbl">Résultat(s)</label><input type="text" value={bioResAnt} onChange={e => setBioResAnt(e.target.value)} placeholder="Résultat" /></div>
              <div><label className="lbl">G P A (si applicable)</label><input type="text" value={bioGPA} onChange={e => setBioGPA(e.target.value)} placeholder="Ex : G3 P2 A1" /></div>
              <div><label className="lbl">DDR (si applicable)</label><input type="date" value={bioDDR} onChange={e => setBioDDR(e.target.value)} /></div>
            </div>
            <div className="mb12">
              <label className="lbl">Ménopause</label>
              <div className="g2">
                {["OUI", "NON"].map(v => (
                  <label key={v} className="rc">
                    <input type="radio" name="bio-meno" checked={bioMeno === v} onChange={() => setBioMeno(v)} style={{ accentColor: "var(--navy)" }} />
                    <span>{v}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="mb12"><label className="lbl">Autres antécédents personnels / familiaux</label><textarea rows={2} value={bioAtcd} onChange={e => setBioAtcd(e.target.value)} placeholder="Précisez..." /></div>
            <div style={{ height: 1, background: "var(--bdr)", margin: "12px 0" }} />
            <div className="sh mb12">Prélèvement</div>
            <div className="g2 mb12">
              <div><label className="lbl">Date du prélèvement</label><input type="date" value={bioDatePrelev} onChange={e => setBioDatePrelev(e.target.value)} /></div>
              <div>
                <label className="lbl">Fixateur</label>
                <select value={bioFixateur} onChange={e => setBioFixateur(e.target.value)}>
                  <option value="">— Sélectionner —</option>
                  {["Formol 10%", "Liquide de Bouin", "Alcool", "Autre"].map(o => <option key={o}>{o}</option>)}
                </select>
              </div>
            </div>
            <div className="mb12"><label className="lbl">Organe(s) / Site anatomique <span className="req">*</span></label><input type="text" value={bioOrgane} onChange={e => setBioOrgane(e.target.value)} placeholder="Ex : colon sigmoïde, sein droit, col utérin..." /></div>
            <div className="mb12">
              <label className="lbl">Nature du prélèvement <span className="req">*</span></label>
              <div className="g2">
                {["Biopsie", "Exérèse", "Curage ganglionnaire", "Autre"].map(v => (
                  <label key={v} className="rc">
                    <input type="radio" name="bio-nat" checked={bioNature === v} onChange={() => setBioNature(v)} style={{ accentColor: "var(--navy)" }} />
                    <span>{v}</span>
                  </label>
                ))}
              </div>
            </div>
            {bioNature === "Autre" && (
              <div className="mb12"><label className="lbl">Préciser la nature <span className="req">*</span></label><input type="text" value={bioNatureAutre} onChange={e => setBioNatureAutre(e.target.value)} placeholder="Préciser..." /></div>
            )}
            <div className="mb12"><label className="lbl">Suspicion diagnostique</label><textarea rows={2} value={bioSuspicion} onChange={e => setBioSuspicion(e.target.value)} placeholder="Hypothèse(s) diagnostique(s)..." /></div>
            <div className="g2 mb12">
              <div><label className="lbl">Fait à</label><input type="text" value={bioFaitA} onChange={e => setBioFaitA(e.target.value)} placeholder="Ville / Établissement" /></div>
              <div><label className="lbl">Le</label><input type="date" value={bioFaitLe} onChange={e => setBioFaitLe(e.target.value)} /></div>
            </div>
            <label className="lbl">Note complémentaire</label>
            <textarea rows={2} value={bioNote} onChange={e => setBioNote(e.target.value)} placeholder="Informations supplémentaires pour le pathologiste..." />
          </div>
        )}

        {tab === "ext" && (
          <div className="card mb12">
            {timerActive && (
              <div style={{ background: timerAlert ? "var(--red-lt)" : "var(--navy-lt)", border: `1.5px solid ${timerAlert ? "var(--red-bdr)" : "var(--navy-mid)"}`, borderRadius: 10, padding: 12, marginBottom: 14, display: "flex", alignItems: "center", gap: 12 }}>
                <span className="ms" style={{ color: timerAlert ? "var(--red)" : "var(--navy)", fontSize: 24 }}>timer</span>
                <div>
                  <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".8px", color: timerAlert ? "var(--red)" : "var(--navy)", marginBottom: 2 }}>{timerAlert ? "⚠ Alerte — 25 min dépassées" : "Minuterie en cours"}</p>
                  <p style={{ fontSize: 28, fontWeight: 700, color: timerAlert ? "var(--red)" : "var(--navy)", fontFamily: "monospace" }}>{timerDisplay}</p>
                </div>
                <button onClick={() => { setTimerActive(false); setTimerSeconds(0); }} style={{ marginLeft: "auto", background: "none", border: "1.5px solid var(--bdr)", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontSize: 12, color: "var(--txt2)" }}>Arrêter</button>
              </div>
            )}
            <div className="mb12"><label className="lbl">Unité / Service demandeur</label><input type="text" value={extService} onChange={e => setExtService(e.target.value)} placeholder="Service clinique prescripteur" /></div>
            <div className="g2 mb12">
              <div><label className="lbl">Chirurgien en salle <span className="req">*</span></label><input type="text" value={extChirurgien} onChange={e => setExtChirurgien(e.target.value)} placeholder="Dr. _______________" /></div>
              <div><label className="lbl">Poste téléphonique du bloc <span className="req">*</span></label><input type="text" value={extPoste} onChange={e => setExtPoste(e.target.value)} placeholder="Ex : 2741 — résultat communiqué par téléphone" /></div>
            </div>
            <div className="mb12"><label className="lbl">Type d'intervention chirurgicale en cours <span className="req">*</span></label><input type="text" value={extIntervention} onChange={e => setExtIntervention(e.target.value)} placeholder="Ex : Thyroïdectomie, résection tumorale côlon, mastectomie..." /></div>
            <div className="mb12">
              <label className="lbl">Nature du prélèvement <span className="req">*</span></label>
              <div className="g2">
                {["Tissu frais (histologique)", "Cytologique (cytoponction, apposition, liquide)"].map(v => (
                  <label key={v} className="rc">
                    <input type="radio" name="ext-nat" checked={extNature === v} onChange={() => setExtNature(v)} style={{ accentColor: "var(--navy)" }} />
                    <span>{v}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="mb12"><label className="lbl">Organe / Site anatomique prélevé <span className="req">*</span></label><input type="text" value={extOrgane} onChange={e => setExtOrgane(e.target.value)} placeholder="Ex : sein gauche, thyroïde, ganglion sentinelle, marge de résection colique..." /></div>
            <div className="mb12"><label className="lbl">Question clinique posée au pathologiste <span className="req">*</span></label><textarea rows={3} value={extQuestion} onChange={e => setExtQuestion(e.target.value)} placeholder="Ex : Marge de résection saine ? Lésion bénigne ou maligne ? Ganglion envahi ? Continuer ou arrêter la résection ?" /><p className="hint">Le pathologiste limite sa réponse à ce qui guide le chirurgien en cours d'intervention (bénin/malin, marge saine/envahie).</p></div>
            <div className="g2 mb12">
              <div>
                <label className="lbl">Heure de prélèvement <span className="req">*</span></label>
                <input type="text" value={extHeure} onChange={e => setExtHeure(e.target.value)} placeholder="HH:MM"
                  onFocus={e => { if (!e.target.value) { const n = new Date(); setExtHeure(`${String(n.getHours()).padStart(2,"0")}:${String(n.getMinutes()).padStart(2,"0")}`); }}} />
              </div>
              <div>
                <label className="lbl">Délai maximal attendu</label>
                <input type="text" readOnly value="30 minutes"
                  style={{ background: "var(--red-lt)", color: "var(--red)", fontWeight: 700, borderColor: "var(--red-bdr)" }} />
              </div>
            </div>
            <label className="lbl">Note complémentaire</label>
            <textarea rows={2} value={extNote} onChange={e => setExtNote(e.target.value)} placeholder="Informations supplémentaires pour le pathologiste..." />
          </div>
        )}
      </div>

      {/* COLONNE DROITE — sticky */}
      <div style={{ position: 'sticky', top: 16 }}>
        <div className="card mb12" style={{ padding: 10 }}>
          <label className="lbl">Degré d'urgence <span className="req">*</span></label>
          <div className={`urgr ${urgenceClasses[urgence]}`} style={{ marginBottom: 10 }}>
            <div className="urgd" />
            <select className="urgs" value={urgence} onChange={e => setUrgence(e.target.value as Urgence)}>
              <option value="n">Normal</option>
              <option value="u">Urgent</option>
              <option value="tu">STAT (Extemporané)</option>
            </select>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
            <span className="ms" style={{ fontSize: 15, color: "var(--red)" }}>warning</span>
            <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.8px', color: 'var(--red)' }}>Précautions &amp; Alertes</span>
          </div>
          <textarea rows={2} value={alertes} onChange={e => setAlertes(e.target.value)}
            placeholder="Risque infectieux, précautions particulières..."
            style={{ background: "var(--red-lt)", border: "1.5px solid var(--red-bdr)", padding: '8px 12px', boxSizing: 'border-box', width: '100%' }} />
        </div>

        <div className="card mb12" style={{ padding: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            <span className="ms" style={{ fontSize: 15, color: 'var(--navy)' }}>biotech</span>
            <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.8px', color: 'var(--navy)' }}>Examen sélectionné</span>
          </div>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--txt)' }}>
            {TABS.find(t => t.key === tab)?.label}
          </span>
        </div>

        {apiError && <div style={{background:"var(--red-lt)",border:"1px solid var(--red-bdr)",borderRadius:8,padding:"10px 12px",fontSize:12,color:"var(--red)",marginBottom:12}}>{apiError}</div>}

        <button className="bp" onClick={() => setShowModal(true)}
          style={{ opacity: isFormValid && !loading ? 1 : 0.5, pointerEvents: isFormValid && !loading ? "auto" : "none", width: '100%' }}>
          <span className="ms">check_circle</span>{loading ? "Envoi..." : "Valider"}
        </button>
      </div>

      {showModal && (
        <div className="mb op" onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}>
          <div className="mbox">
            <h3>Confirmer la demande ?</h3>
            <p>La demande sera transmise au service d'Anatomie Pathologique.{tab === "ext" && " La minuterie de 30 min démarrera à la validation."}</p>
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
