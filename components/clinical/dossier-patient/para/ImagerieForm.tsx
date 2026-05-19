"use client";
import { useState } from "react";
import { openSummaryWindow } from '@/lib/printPrescription';
import { creerPrescriptionImagerie } from '@/lib/api';

type Urgence = "n" | "u" | "tu";
type ImgType = "scan" | "echo" | "rx" | "geste" | "rxsp";
const urgenceClasses: Record<Urgence, string> = { n: "un", u: "uu", tu: "utu" };

interface Props {
  patient: { id: string; nom?: string; prenom?: string };
  prescripteur: { id?: string; nom?: string; prenom?: string; service?: string };
}

export default function ImagerieForm({ patient, prescripteur }: Props) {
  const [urgence, setUrgence] = useState<Urgence>("n");
  const [alertes, setAlertes] = useState("");
  const [estHospitalise, setEstHospitalise] = useState(false);
  const [lieuHosp, setLieuHosp] = useState("");
  const [serviceHosp, setServiceHosp] = useState("");
  const [moyenDeplacement, setMoyenDeplacement] = useState("");
  const [renseignements, setRenseignements] = useState("");
  const [questionRadio, setQuestionRadio] = useState("");
  const [imgType, setImgType] = useState<ImgType>("scan");
  const [remarques, setRemarques] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [toast, setToast] = useState("");
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState("");

  // Scanner
  const [scanType, setScanType] = useState("");
  const [scanPrecisions, setScanPrecisions] = useState("");
  const [scanGlasgow, setScanGlasgow] = useState("");
  const [scanAgite, setScanAgite] = useState("");
  const [scanAllergie, setScanAllergie] = useState("");
  const [scanAllergieDetail, setScanAllergieDetail] = useState("");
  const [scanCreatinine, setScanCreatinine] = useState("");
  const [scanClearance, setScanClearance] = useState("");
  const [scanDiabete, setScanDiabete] = useState("");

  // Échographie
  const [echoType, setEchoType] = useState("");
  const [echoDoppler, setEchoDoppler] = useState(false);
  const [echoPrecisions, setEchoPrecisions] = useState("");

  // Radiographie
  const [rxType, setRxType] = useState("");
  const [rxIncidences, setRxIncidences] = useState<string[]>([]);
  const [rxPrecisions, setRxPrecisions] = useState("");

  // Geste
  const [gesteType, setGesteType] = useState("");
  const [gestePrecisions, setGestePrecisions] = useState("");

  // Radio spéciale
  const [rxspType, setRxspType] = useState("");
  const [rxspPrep, setRxspPrep] = useState("");
  const [rxspPrecisions, setRxspPrecisions] = useState("");

  function toggleIncidence(val: string) {
    setRxIncidences(prev =>
      prev.includes(val) ? prev.filter(v => v !== val) : [...prev, val]
    );
  }

  const isFormValid = (() => {
    if (!renseignements.trim()) return false;
    if (imgType === "scan") return !!scanType;
    if (imgType === "echo") return !!echoType;
    if (imgType === "rx") return !!rxType && rxIncidences.length > 0;
    if (imgType === "geste") return !!gesteType.trim();
    if (imgType === "rxsp") return !!rxspType;
    return false;
  })();

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(""), 2800); }

  function buildImagerieSummary(): string {
    const now = new Date().toLocaleString('fr-FR');
    const labels: Record<ImgType, string> = { scan: 'Scanner', echo: 'Échographie', rx: 'Radiographie', geste: 'Geste interventionnel', rxsp: 'Radio spéciale' };
    let html = `<div class="card"><div class="patient">Date : ${now}</div>`;
    html += `<div class="medicament"><span class="nom">Type d'examen :</span> <span class="detail">${labels[imgType]}</span></div>`;
    html += `<div class="medicament"><span class="nom">Renseignements :</span> <span class="detail">${renseignements}</span></div>`;
    if (questionRadio) html += `<div class="medicament"><span class="nom">Question :</span> <span class="detail">${questionRadio}</span></div>`;
    if (imgType === 'scan' && scanType) html += `<div class="medicament"><span class="nom">Scanner :</span> <span class="detail">${scanType}</span></div>`;
    if (imgType === 'echo' && echoType) html += `<div class="medicament"><span class="nom">Échographie :</span> <span class="detail">${echoType}${echoDoppler ? ' + Doppler' : ''}</span></div>`;
    if (imgType === 'rx' && rxType) html += `<div class="medicament"><span class="nom">Radiographie :</span> <span class="detail">${rxType} (${rxIncidences.join(', ')})</span></div>`;
    if (imgType === 'geste' && gesteType) html += `<div class="medicament"><span class="nom">Geste :</span> <span class="detail">${gesteType}</span></div>`;
    if (imgType === 'rxsp' && rxspType) html += `<div class="medicament"><span class="nom">Examen :</span> <span class="detail">${rxspType}</span></div>`;
    if (remarques) html += `<div class="notice">📌 ${remarques}</div>`;
    if (alertes) html += `<div class="notice">⚠️ ${alertes}</div>`;
    html += `</div>`;
    return html;
  }

  async function handleSubmit() {
    setShowModal(false);
    setLoading(true);
    setApiError("");
    const examens: any = {
      typeExamen: imgType,
      estHospitalise,
      lieuHosp,
      serviceHosp,
      moyenDeplacement,
      questionRadio,
    };
    if (imgType === "scan") {
      examens.scanner = { type: scanType, precisions: scanPrecisions, glasgow: scanGlasgow, agite: scanAgite, allergie: scanAllergie, allergieDetail: scanAllergieDetail, creatinine: scanCreatinine, clearance: scanClearance, diabete: scanDiabete };
    } else if (imgType === "echo") {
      examens.echographie = { type: echoType, doppler: echoDoppler, precisions: echoPrecisions };
    } else if (imgType === "rx") {
      examens.radiographie = { type: rxType, incidences: rxIncidences, precisions: rxPrecisions };
    } else if (imgType === "geste") {
      examens.geste = { type: gesteType, precisions: gestePrecisions };
    } else if (imgType === "rxsp") {
      examens.radioSpeciale = { type: rxspType, preparation: rxspPrep, precisions: rxspPrecisions };
    }

    try {
      await creerPrescriptionImagerie({
        patientId: patient.id,
        prescripteurId: prescripteur.id,
        urgence,
        alertes,
        renseignements,
        notes: remarques,
        examens,
      });
      openSummaryWindow('Imagerie médicale', buildImagerieSummary());
      showToast("Demande d'imagerie envoyée au service");
      // reset
      setRenseignements(""); setAlertes(""); setRemarques(""); setQuestionRadio("");
      setUrgence("n"); setImgType("scan");
      setScanType(""); setScanPrecisions(""); setScanGlasgow(""); setScanAgite("");
      setScanAllergie(""); setScanAllergieDetail(""); setScanCreatinine(""); setScanClearance(""); setScanDiabete("");
      setEchoType(""); setEchoDoppler(false); setEchoPrecisions("");
      setRxType(""); setRxIncidences([]); setRxPrecisions("");
      setGesteType(""); setGestePrecisions("");
      setRxspType(""); setRxspPrep(""); setRxspPrecisions("");
      setEstHospitalise(false); setLieuHosp(""); setServiceHosp(""); setMoyenDeplacement("");
    } catch (err: any) {
      setApiError(err.message || "Erreur lors de l'envoi de la demande d'imagerie.");
    } finally {
      setLoading(false);
    }
  }

  const tabStyle = (active: boolean): React.CSSProperties => ({
    display: "flex", alignItems: "center", gap: 6,
    padding: "8px 14px", borderRadius: 10, border: "none", cursor: "pointer",
    fontSize: 13, fontWeight: active ? 600 : 500,
    background: active ? "var(--navy)" : "var(--inp)",
    color: active ? "#fff" : "var(--txt2)", transition: "all .15s", flexShrink: 0,
  });

  return (
    <div>
      {apiError && (
        <div style={{ background: "var(--red-lt)", border: "1px solid var(--red-bdr)", borderRadius: 8, padding: "10px 12px", fontSize: 12, color: "var(--red)", marginBottom: 12 }}>
          {apiError}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 16, alignItems: 'start' }}>
        <div>
          {/* Statut du patient */}
          <div className="card mb12" style={{ padding: 12 }}>
            <div className="sh mb12">Statut du patient</div>
            <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap", marginBottom: 10 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 7, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
                <input type="checkbox" checked={estHospitalise} onChange={e => setEstHospitalise(e.target.checked)} style={{ accentColor: "var(--navy)", width: 16, height: 16 }} /> Hospitalisé
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 7, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
                <input type="checkbox" checked={!estHospitalise} onChange={e => setEstHospitalise(!e.target.checked)} style={{ accentColor: "var(--navy)", width: 16, height: 16 }} /> Externe
              </label>
            </div>
            {estHospitalise && (
              <div className="conditionnel visible" style={{ marginBottom: 10 }}>
                <div className="g3 mb8">
                  {["CHUA", "CHU-T", "Autre établissement"].map(lieu => (
                    <label key={lieu} className="rc">
                      <input type="radio" name="imag-hosp-lieu" checked={lieuHosp === lieu} onChange={() => setLieuHosp(lieu)} style={{ accentColor: "var(--navy)" }} />
                      <span>{lieu}</span>
                    </label>
                  ))}
                </div>
                <input type="text" value={serviceHosp} onChange={e => setServiceHosp(e.target.value)} placeholder="Service / Unité d'hospitalisation" />
              </div>
            )}
            <label className="lbl">Moyen de déplacement</label>
            <div className="g3">
              {[["🚑 Ambulance", "ambulance"], ["🛏 Brancard", "brancard"], ["🪑 Fauteuil", "fauteuil"]].map(([label, val]) => (
                <label key={val} className="rc">
                  <input type="radio" name="imag-trans" checked={moyenDeplacement === val} onChange={() => setMoyenDeplacement(val)} style={{ accentColor: "var(--navy)" }} />
                  <span>{label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Renseignements cliniques */}
          <div className="card mb12" style={{ padding: 12 }}>
            <div className="mb12">
              <label className="lbl">Renseignements cliniques / Diagnostic <span className="req">*</span></label>
              <textarea rows={3} value={renseignements} onChange={e => setRenseignements(e.target.value)} placeholder="Symptômes, suspicion diagnostique, contexte clinique..." />
            </div>
            <label className="lbl">Question(s) pour le radiologue</label>
            <textarea rows={2} value={questionRadio} onChange={e => setQuestionRadio(e.target.value)} placeholder="Questions spécifiques pour le radiologue..." />
          </div>

          {/* Type d'examen + panels */}
          <div className="card mb12" style={{ padding: 12 }}>
            <label className="lbl">Type d'examen <span className="req">*</span></label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
              {(["scan","echo","rx","geste","rxsp"] as ImgType[]).map(key => {
                const icons: Record<ImgType, string> = { scan:"document_scanner", echo:"radar", rx:"radiology", geste:"colorize", rxsp:"biotech" };
                const labels: Record<ImgType, string> = { scan:"Scanner", echo:"Échographie", rx:"Radiographie", geste:"Geste interventionnel", rxsp:"Radio spéciale" };
                return (
                  <button key={key} onClick={() => setImgType(key)} style={tabStyle(imgType === key)}>
                    <span className="ms" style={{ fontSize:16 }}>{icons[key]}</span>{labels[key]}
                  </button>
                );
              })}
            </div>

            {/* === SCANNER === */}
            {imgType === "scan" && (
              <div>
                <label className="lbl">Type de scanner <span className="req">*</span></label>
                <select className="mb12" value={scanType} onChange={e => setScanType(e.target.value)}>
                  <option value="">— Sélectionner —</option>
                  {["Cérébrale","Rachis cervical","Rachis dorsal / thoracique","Rachis lombaire","Thoracique (poumon)","Abdominal","Pelvien","Abdomino-pelvien","Parties molles","Coude","Bassin","Rachis cervico-thoraco-lombo-sacré","Rachis cervico-thoracique","Rachis dorso-lombaire","Genou","Épaule","Scanner PERS","Scanner urgence weekend"].map(o => <option key={o}>{o}</option>)}
                </select>
                <label className="lbl">Précisions / Zone à explorer</label>
                <textarea rows={2} className="mb12" value={scanPrecisions} onChange={e => setScanPrecisions(e.target.value)} placeholder="Précisions supplémentaires..." />
                <div style={{ background: "#fef3c7", border: "1.5px solid #fbbf24", borderRadius: 10, padding: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                    <span className="ms" style={{ color: "#d97706", fontSize: 16 }}>checklist</span>
                    <strong style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".8px", color: "#92400e" }}>Checklist obligatoire — scanner</strong>
                  </div>
                  {/* Checklist complète */}
                  <div style={{ marginBottom: 10, fontSize: 12, color: "var(--txt)" }}>
                    <div style={{ fontWeight: 700, marginBottom: 4 }}>Hémodynamique instable ou Glasgow &lt; 8 ?</div>
                    <div style={{ display: "flex", gap: 12 }}>
                      {["Oui — stabiliser avant déplacement", "Non"].map(opt => (
                        <label key={opt} style={{ display: "flex", alignItems: "center", gap: 5, cursor: "pointer" }}>
                          <input type="radio" name="sc-glasgow" value={opt} checked={scanGlasgow === opt} onChange={() => setScanGlasgow(opt)} style={{ accentColor: "var(--navy)" }} />
                          {opt}
                        </label>
                      ))}
                    </div>
                  </div>
                  <div style={{ marginBottom: 10, fontSize: 12, color: "var(--txt)" }}>
                    <div style={{ fontWeight: 700, marginBottom: 4 }}>Patient agité ?</div>
                    <div style={{ display: "flex", gap: 12 }}>
                      {["Oui — sédation préalable requise", "Non"].map(opt => (
                        <label key={opt} style={{ display: "flex", alignItems: "center", gap: 5, cursor: "pointer" }}>
                          <input type="radio" name="sc-agite" value={opt} checked={scanAgite === opt} onChange={() => setScanAgite(opt)} style={{ accentColor: "var(--navy)" }} />
                          {opt}
                        </label>
                      ))}
                    </div>
                  </div>
                  <div style={{ marginBottom: 10, fontSize: 12, color: "var(--txt)" }}>
                    <div style={{ fontWeight: 700, marginBottom: 4 }}>Allergie (surtout produit de contraste) ?</div>
                    <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                      {["Oui", "Non"].map(opt => (
                        <label key={opt} style={{ display: "flex", alignItems: "center", gap: 5, cursor: "pointer" }}>
                          <input type="radio" name="sc-allergie" value={opt} checked={scanAllergie === opt} onChange={() => setScanAllergie(opt)} style={{ accentColor: "var(--navy)" }} />
                          {opt}
                        </label>
                      ))}
                    </div>
                    {scanAllergie === "Oui" && (
                      <div style={{ marginTop: 6 }}>
                        <input type="text" value={scanAllergieDetail} onChange={e => setScanAllergieDetail(e.target.value)} placeholder="Préciser l'allergie..." />
                        <p style={{ fontSize: 10, color: "#92400e", marginTop: 4 }}>⚠ ATCD choc anaphylactique ou œdème de Quincke → médication antihistaminique obligatoire</p>
                      </div>
                    )}
                  </div>
                  <div style={{ marginBottom: 10, fontSize: 12, color: "var(--txt)" }}>
                    <div style={{ fontWeight: 700, marginBottom: 2 }}>Créatininémie (&lt; 3 mois)</div>
                    <p style={{ fontSize: 10, color: "#6b7280", marginBottom: 6, fontStyle: "italic" }}>Si avec injection : la décision finale reste au radiologue</p>
                    <div className="g2">
                      <input type="text" value={scanCreatinine} onChange={e => setScanCreatinine(e.target.value)} placeholder="Valeur créatinine" />
                      <input type="text" value={scanClearance} onChange={e => setScanClearance(e.target.value)} placeholder="Clearance (ml/min)" />
                    </div>
                    <p style={{ fontSize: 10, color: "#92400e", marginTop: 4 }}>Clearance &lt; 30 ml/mn → injection contre-indiquée · 30–60 ml/mn → réhydratation préalable</p>
                  </div>
                  <div style={{ fontSize: 12, color: "var(--txt)" }}>
                    <div style={{ fontWeight: 700, marginBottom: 4 }}>Diabète / Metformine ?</div>
                    <div style={{ display: "flex", gap: 12 }}>
                      {["Oui — arrêter le jour de l'examen, reprendre après 48h", "Non"].map(opt => (
                        <label key={opt} style={{ display: "flex", alignItems: "center", gap: 5, cursor: "pointer" }}>
                          <input type="radio" name="sc-diabete" value={opt} checked={scanDiabete === opt} onChange={() => setScanDiabete(opt)} style={{ accentColor: "var(--navy)" }} />
                          {opt}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* === ÉCHOGRAPHIE === */}
            {imgType === "echo" && (
              <div>
                <label className="lbl">Type d'échographie <span className="req">*</span></label>
                <select className="mb12" value={echoType} onChange={e => setEchoType(e.target.value)}>
                  <option value="">— Sélectionner —</option>
                  {["Obstétricale","Transfontanellaire","Cytoponction écho-guidée","Musculo-squelettique","Testiculaire","Mammaire","Parties molles","Abdominale","Pelvienne","Abdomino-pelvienne","Morphologique fœtale / Score de Manning","Thyroïdienne","Prostatique / Testiculaire","Épaule / Ostéo-articulaire","Trans-thoracique pleural","Trans-thoracique avec repérage","Thyroïdienne avec cytoponction","Des cuisses","Cervicale"].map(o => <option key={o}>{o}</option>)}
                </select>
                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13, fontWeight: 600, marginBottom: 10, padding: 10, background: "var(--inp)", borderRadius: 9 }}>
                  <input type="checkbox" checked={echoDoppler} onChange={e => setEchoDoppler(e.target.checked)} style={{ accentColor: "var(--navy)", width: 16, height: 16 }} />
                  Écho-Doppler associé
                </label>
                <label className="lbl">Précisions</label>
                <textarea rows={2} value={echoPrecisions} onChange={e => setEchoPrecisions(e.target.value)} placeholder="Précisions supplémentaires..." />
              </div>
            )}

            {/* === RADIOGRAPHIE === */}
            {imgType === "rx" && (
              <div>
                <label className="lbl">Type de radiographie <span className="req">*</span></label>
                <select className="mb12" value={rxType} onChange={e => setRxType(e.target.value)}>
                  <option value="">— Sélectionner —</option>
                  {["Crâne","Thorax","Rachis cervical","Rachis dorsal","Rachis lombaire","Épaule","Bras","Coude","Avant-bras","Poignet","Main","Abdomen sans préparation (ASP)","Bassin","Hanche","Fémur","Genou","Jambe","Cheville","Pied"].map(o => <option key={o}>{o}</option>)}
                </select>
                <label className="lbl">Incidences <span className="req">*</span></label>
                <div className="g3 mb12">
                  {["FACE", "PROFIL", "OBLIQUE"].map(inc => (
                    <label key={inc} className="rc">
                      <input type="checkbox" checked={rxIncidences.includes(inc)} onChange={() => toggleIncidence(inc)} style={{ accentColor: "var(--navy)" }} />
                      <span>{inc}</span>
                    </label>
                  ))}
                </div>
                <label className="lbl">Côté / Précisions complémentaires</label>
                <textarea rows={2} value={rxPrecisions} onChange={e => setRxPrecisions(e.target.value)} placeholder="Côté droit/gauche, comparatif bilatéral, incidences particulières..." />
              </div>
            )}

            {/* === GESTE INTERVENTIONNEL === */}
            {imgType === "geste" && (
              <div>
                <label className="lbl">Type de geste <span className="req">*</span></label>
                <input type="text" className="mb12" value={gesteType} onChange={e => setGesteType(e.target.value)} placeholder="Ex : ponction d'ascite, biopsie hépatique écho-guidée..." />
                <label className="lbl">Précisions complémentaires</label>
                <textarea rows={3} value={gestePrecisions} onChange={e => setGestePrecisions(e.target.value)} placeholder="Site, côté, technique souhaitée, précautions particulières..." />
              </div>
            )}

            {/* === RADIO SPÉCIALE === */}
            {imgType === "rxsp" && (
              <div>
                <label className="lbl">Type d'examen <span className="req">*</span></label>
                <select className="mb12" value={rxspType} onChange={e => setRxspType(e.target.value)}>
                  <option value="">— Sélectionner —</option>
                  {["UIV (Urographie intra-veineuse)","TOGD (Transit œso-gastro-duodénal)","Lavement baryté (côlon)","Hystérographie","Fistulographie","Artériographie","Phlébographie","Lymphographie","Sialographie","Dacryocystographie","Myélographie","Cystographie","Uréthrographie","Autre"].map(o => <option key={o}>{o}</option>)}
                </select>
                <label className="lbl">Préparation requise</label>
                <textarea rows={2} className="mb12" value={rxspPrep} onChange={e => setRxspPrep(e.target.value)} placeholder="Préparation digestive, hydratation, arrêt médicaments..." />
                <label className="lbl">Précisions / Question pour le radiologue</label>
                <textarea rows={2} value={rxspPrecisions} onChange={e => setRxspPrecisions(e.target.value)} placeholder="Indication précise, aspect recherché..." />
              </div>
            )}
          </div>
        </div>

        {/* COLONNE DROITE — sticky */}
        <div style={{ position: 'sticky', top: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="card" style={{ padding: 8 }}>
            <label className="lbl">Degré d'urgence <span className="req">*</span></label>
            <div className={`urgr ${urgenceClasses[urgence]}`} style={{ marginBottom: 8 }}>
              <div className="urgd" />
              <select className="urgs" value={urgence} onChange={e => setUrgence(e.target.value as Urgence)}>
                <option value="n">Normal</option>
                <option value="u">Urgent</option>
                <option value="tu">STAT</option>
              </select>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
              <span className="ms" style={{ fontSize: 16, color: "var(--red)" }}>warning</span>
              <span className="lbl" style={{ margin: 0 }}>Précautions &amp; Alertes</span>
            </div>
            <textarea rows={1} value={alertes} onChange={e => setAlertes(e.target.value)} placeholder="Allergie produit de contraste, claustrophobie, pace-maker, grossesse..." style={{ background: "var(--red-lt)", border: "1.5px solid var(--red-bdr)", padding: '8px 12px' }} />
          </div>
          <div className="card" style={{ padding: 12 }}>
            <label className="lbl">Remarques complémentaires</label>
            <textarea rows={2} value={remarques} onChange={e => setRemarques(e.target.value)} placeholder="Informations utiles pour le radiologue..." />
          </div>
          <button
            className="bp"
            onClick={() => setShowModal(true)}
            disabled={!isFormValid || loading}
            style={{ opacity: isFormValid && !loading ? 1 : 0.5, marginTop: 0 }}
          >
            <span className="ms">check_circle</span>{loading ? "Envoi..." : "Valider la prescription"}
          </button>
        </div>
      </div>

      {showModal && (
        <div className="mb op" onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}>
          <div className="mbox">
            <h3>Confirmer la demande ?</h3>
            <p>La demande d'imagerie sera transmise au service avec rendez-vous.</p>
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
