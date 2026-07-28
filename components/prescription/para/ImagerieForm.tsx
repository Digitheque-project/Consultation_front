"use client";
import { useState } from "react";
import { creerPrescriptionImagerie } from '@/lib/prescription-api';

type Urgence = "n" | "u" | "tu";
type ImgType = "scan" | "echo" | "rx" | "geste" | "rxsp";

const urgenceClasses: Record<Urgence, string> = { n: "un", u: "uu", tu: "utu" };
const TYPE_LABELS: Record<ImgType, string> = { scan: "Scanner", echo: "Échographie", rx: "Radiographie", geste: "Geste interventionnel", rxsp: "Radio spéciale" };
const TYPE_ICONS: Record<ImgType, string> = { scan: "document_scanner", echo: "radar", rx: "radiology", geste: "colorize", rxsp: "biotech" };

// ── Exam item types ────────────────────────────────────────────
type ScanItem  = { id: number; type: "scan";  data: { type: string; precisions: string; glasgow: string; agite: string; allergie: string; allergieDetail: string; creatinine: string; clearance: string; diabete: string } };
type EchoItem  = { id: number; type: "echo";  data: { type: string; doppler: boolean; precisions: string } };
type RxItem    = { id: number; type: "rx";    data: { type: string; incidences: string[]; precisions: string } };
type GesteItem = { id: number; type: "geste"; data: { type: string; precisions: string } };
type RxspItem  = { id: number; type: "rxsp";  data: { type: string; preparation: string; precisions: string } };
type CartItem  = ScanItem | EchoItem | RxItem | GesteItem | RxspItem;

interface Props {
  patient: { id: string; nom?: string; prenom?: string; sexe?: string; dateNaissance?: string; allergies?: string[]; groupeSanguin?: string };
  prescripteur: { id?: string; nom?: string; prenom?: string; service?: string; chuId?: string; serviceId?: string };
  onAddToCart?: (item: { label: string; count: number; submit: () => Promise<unknown> }) => void;
}

function calcAge(dn?: string) {
  if (!dn) return null;
  return Math.floor((Date.now() - new Date(dn).getTime()) / (1000 * 60 * 60 * 24 * 365.25));
}

function itemSummary(item: CartItem): string {
  if (item.type === "scan")  return `Scanner — ${item.data.type}`;
  if (item.type === "echo")  return `Écho — ${item.data.type}${item.data.doppler ? " + Doppler" : ""}`;
  if (item.type === "rx")    return `Radio — ${item.data.type} (${item.data.incidences.join(", ")})`;
  if (item.type === "geste") return `Geste — ${item.data.type}`;
  if (item.type === "rxsp")  return `Spéciale — ${item.data.type}`;
  return "Examen";
}

function buildExamens(cart: CartItem[]) {
  const scanner       = cart.filter(i => i.type === "scan").map(i => (i as ScanItem).data);
  const echographie   = cart.filter(i => i.type === "echo").map(i => (i as EchoItem).data);
  const radiographie  = cart.filter(i => i.type === "rx").map(i => (i as RxItem).data);
  const geste         = cart.filter(i => i.type === "geste").map(i => (i as GesteItem).data);
  const radioSpeciale = cart.filter(i => i.type === "rxsp").map(i => (i as RxspItem).data);
  const out: Record<string, unknown[]> = {};
  if (scanner.length)       out.scanner       = scanner;
  if (echographie.length)   out.echographie   = echographie;
  if (radiographie.length)  out.radio         = radiographie;
  if (geste.length)         out.geste         = geste;
  if (radioSpeciale.length) out.radioSpeciale = radioSpeciale;
  return out;
}

export default function ImagerieForm({ patient, prescripteur, onAddToCart }: Props) {
  const age = calcAge(patient?.dateNaissance);
  const sexeLabel = patient?.sexe === 'M' ? 'Masculin' : patient?.sexe === 'F' ? 'Féminin' : patient?.sexe;

  // ── Global fields ────────────────────────────────────────────
  const [urgence, setUrgence]               = useState<Urgence>("n");
  const [alertes, setAlertes]               = useState("");
  const [estHospitalise, setEstHospitalise] = useState(false);
  const [lieuHosp, setLieuHosp]             = useState("");
  const [serviceHosp, setServiceHosp]       = useState("");
  const [moyenDeplacement, setMoyenDeplacement] = useState("");
  const [renseignements, setRenseignements] = useState("");
  const [questionRadio, setQuestionRadio]   = useState("");
  const [remarques, setRemarques]           = useState("");

  // ── Cart ─────────────────────────────────────────────────────
  const [cart, setCart] = useState<CartItem[]>([]);
  const removeItem = (id: number) => setCart(prev => prev.filter(i => i.id !== id));

  // ── Active type tab ──────────────────────────────────────────
  const [imgType, setImgType] = useState<ImgType>("scan");

  // ── Scanner fields ───────────────────────────────────────────
  const [scanType, setScanType]                 = useState("");
  const [scanPrecisions, setScanPrecisions]     = useState("");
  const [scanGlasgow, setScanGlasgow]           = useState("");
  const [scanAgite, setScanAgite]               = useState("");
  const [scanAllergie, setScanAllergie]         = useState("");
  const [scanAllergieDetail, setScanAllergieDetail] = useState("");
  const [scanCreatinine, setScanCreatinine]     = useState("");
  const [scanClearance, setScanClearance]       = useState("");
  const [scanDiabete, setScanDiabete]           = useState("");

  // ── Échographie fields ───────────────────────────────────────
  const [echoType, setEchoType]         = useState("");
  const [echoDoppler, setEchoDoppler]   = useState(false);
  const [echoPrecisions, setEchoPrecisions] = useState("");

  // ── Radiographie fields ──────────────────────────────────────
  const [rxType, setRxType]             = useState("");
  const [rxIncidences, setRxIncidences] = useState<string[]>([]);
  const [rxPrecisions, setRxPrecisions] = useState("");
  function toggleIncidence(v: string) { setRxIncidences(p => p.includes(v) ? p.filter(x => x !== v) : [...p, v]); }

  // ── Geste fields ─────────────────────────────────────────────
  const [gesteType, setGesteType]           = useState("");
  const [gestePrecisions, setGestePrecisions] = useState("");

  // ── Radio spéciale fields ────────────────────────────────────
  const [rxspType, setRxspType]       = useState("");
  const [rxspPrep, setRxspPrep]       = useState("");
  const [rxspPrecisions, setRxspPrecisions] = useState("");

  // ── UI state ─────────────────────────────────────────────────
  const [showModal, setShowModal]           = useState(false);
  const [showValidationModal, setShowValidationModal] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [validatedPrescription, setValidatedPrescription] = useState<any>(null);
  const [toast, setToast]   = useState("");
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState("");

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(""), 2800); }

  // ── Validation per type ──────────────────────────────────────
  const currentTypeValid = (() => {
    if (imgType === "scan")  return !!scanType;
    if (imgType === "echo")  return !!echoType;
    if (imgType === "rx")    return !!rxType && rxIncidences.length > 0;
    if (imgType === "geste") return !!gesteType.trim();
    if (imgType === "rxsp")  return !!rxspType;
    return false;
  })();

  // ── Add current type exam to cart ────────────────────────────
  function addToCart() {
    const id = Date.now();
    if (imgType === "scan") {
      setCart(p => [...p, { id, type: "scan", data: { type: scanType, precisions: scanPrecisions, glasgow: scanGlasgow, agite: scanAgite, allergie: scanAllergie, allergieDetail: scanAllergieDetail, creatinine: scanCreatinine, clearance: scanClearance, diabete: scanDiabete } }]);
      setScanType(""); setScanPrecisions(""); setScanGlasgow(""); setScanAgite(""); setScanAllergie(""); setScanAllergieDetail(""); setScanCreatinine(""); setScanClearance(""); setScanDiabete("");
    } else if (imgType === "echo") {
      setCart(p => [...p, { id, type: "echo", data: { type: echoType, doppler: echoDoppler, precisions: echoPrecisions } }]);
      setEchoType(""); setEchoDoppler(false); setEchoPrecisions("");
    } else if (imgType === "rx") {
      setCart(p => [...p, { id, type: "rx", data: { type: rxType, incidences: rxIncidences, precisions: rxPrecisions } }]);
      setRxType(""); setRxIncidences([]); setRxPrecisions("");
    } else if (imgType === "geste") {
      setCart(p => [...p, { id, type: "geste", data: { type: gesteType, precisions: gestePrecisions } }]);
      setGesteType(""); setGestePrecisions("");
    } else if (imgType === "rxsp") {
      setCart(p => [...p, { id, type: "rxsp", data: { type: rxspType, preparation: rxspPrep, precisions: rxspPrecisions } }]);
      setRxspType(""); setRxspPrep(""); setRxspPrecisions("");
    }
  }

  const canSubmit = cart.length > 0 && renseignements.trim().length > 0;

  // Le contrat prescription n'a pas de champ dédié pour la question au radiologue
  // ni le statut d'hospitalisation/moyen de déplacement : on les intègre à `notes`.
  function buildNotes(): string {
    const parts: string[] = [];
    if (remarques.trim()) parts.push(remarques.trim());
    if (questionRadio.trim()) parts.push(`Question au radiologue : ${questionRadio.trim()}`);
    parts.push(`Statut : ${estHospitalise ? "Hospitalisé" : "Externe"}`);
    if (estHospitalise && (lieuHosp || serviceHosp)) {
      parts.push(`Lieu/service d'hospitalisation : ${[lieuHosp, serviceHosp].filter(Boolean).join(" — ")}`);
    }
    if (moyenDeplacement) parts.push(`Moyen de déplacement : ${moyenDeplacement}`);
    return parts.join("\n");
  }

  async function handleSubmit() {
    setShowModal(false); setLoading(true); setApiError("");
    try {
      const result = await creerPrescriptionImagerie({
        patientId: patient.id, prescripteurId: prescripteur.id,
        chuId: prescripteur.chuId, serviceId: prescripteur.serviceId,
        urgence, alertes, renseignements, notes: buildNotes(),
        examens: buildExamens(cart),
      });
      setValidatedPrescription({ cart: [...cart], urgence, alertes, renseignements, questionRadio, remarques, patient: { ...patient, age, sexeLabel }, prescripteur, date: new Date().toLocaleString('fr-FR'), result });
      setShowValidationModal(true);
      showToast("Demande d'imagerie transmise");
      // Reset everything
      setCart([]); setRenseignements(""); setAlertes(""); setRemarques(""); setQuestionRadio(""); setUrgence("n");
      setEstHospitalise(false); setLieuHosp(""); setServiceHosp(""); setMoyenDeplacement("");
    } catch (err: unknown) {
      setApiError((err instanceof Error ? err.message : null) || "Erreur lors de l'envoi.");
    } finally { setLoading(false); }
  }

  const tabStyle = (active: boolean, count: number): React.CSSProperties => ({
    display: "flex", alignItems: "center", gap: 6, padding: "8px 12px", borderRadius: 10,
    border: count > 0 ? `2px solid var(--navy)` : "none",
    cursor: "pointer", fontSize: 13, fontWeight: active ? 600 : 500,
    background: active ? "var(--navy)" : count > 0 ? "var(--navy-lt)" : "var(--inp)",
    color: active ? "#fff" : count > 0 ? "var(--navy)" : "var(--txt2)",
    transition: "all .15s", flexShrink: 0, position: "relative",
  });

  const countByType = (t: ImgType) => cart.filter(i => i.type === t).length;

  return (
    <div>
      {apiError && <div style={{ background:"var(--red-lt)", border:"1px solid var(--red-bdr)", borderRadius:8, padding:"10px 12px", fontSize:12, color:"var(--red)", marginBottom:12 }}>{apiError}</div>}

      <div className="g2-form">
        {/* ── Main column ── */}
        <div>
          {/* Statut patient */}
          <div className="card mb12" style={{ padding:12 }}>
            <div className="sh mb12">Statut du patient</div>
            <div style={{ display:"flex", gap:20, flexWrap:"wrap", marginBottom:10 }}>
              <label style={{ display:"flex", alignItems:"center", gap:7, cursor:"pointer", fontSize:13, fontWeight:600 }}>
                <input type="checkbox" checked={estHospitalise} onChange={e => setEstHospitalise(e.target.checked)} style={{ accentColor:"var(--navy)", width:16, height:16 }} /> Hospitalisé
              </label>
              <label style={{ display:"flex", alignItems:"center", gap:7, cursor:"pointer", fontSize:13, fontWeight:600 }}>
                <input type="checkbox" checked={!estHospitalise} onChange={e => setEstHospitalise(!e.target.checked)} style={{ accentColor:"var(--navy)", width:16, height:16 }} /> Externe
              </label>
            </div>
            {estHospitalise && (
              <div style={{ marginBottom:10 }}>
                <div className="g3 mb8">
                  {["CHUA","CHU-T","Autre établissement"].map(lieu => (
                    <label key={lieu} className="rc"><input type="radio" name="imag-lieu" checked={lieuHosp===lieu} onChange={()=>setLieuHosp(lieu)} style={{ accentColor:"var(--navy)" }} /><span>{lieu}</span></label>
                  ))}
                </div>
                <input type="text" value={serviceHosp} onChange={e=>setServiceHosp(e.target.value)} placeholder="Service / Unité" />
              </div>
            )}
            <label className="lbl">Moyen de déplacement</label>
            <div className="g3">
              {[["🚑 Ambulance","ambulance"],["🛏 Brancard","brancard"],["🪑 Fauteuil","fauteuil"]].map(([lbl,val])=>(
                <label key={val} className="rc"><input type="radio" name="imag-trans" checked={moyenDeplacement===val} onChange={()=>setMoyenDeplacement(val)} style={{ accentColor:"var(--navy)" }} /><span>{lbl}</span></label>
              ))}
            </div>
          </div>

          {/* Renseignements cliniques */}
          <div className="card mb12" style={{ padding:12 }}>
            <div className="mb12">
              <label className="lbl">Renseignements cliniques / Diagnostic <span className="req">*</span></label>
              <textarea rows={3} value={renseignements} onChange={e=>setRenseignements(e.target.value)} placeholder="Symptômes, suspicion diagnostique, contexte clinique..." />
            </div>
            <label className="lbl">Question(s) pour le radiologue</label>
            <textarea rows={2} value={questionRadio} onChange={e=>setQuestionRadio(e.target.value)} placeholder="Questions spécifiques pour le radiologue..." />
          </div>

          {/* Exam builder */}
          <div className="card" style={{ padding:12 }}>
            {/* Type tabs avec badges */}
            <div style={{ display:"flex", flexWrap:"wrap", gap:7, marginBottom:14 }}>
              {(["scan","echo","rx","geste","rxsp"] as ImgType[]).map(key => {
                const cnt = countByType(key);
                return (
                  <button key={key} onClick={()=>setImgType(key)} style={tabStyle(imgType===key, cnt)}>
                    <span className="ms" style={{ fontSize:15 }}>{TYPE_ICONS[key]}</span>
                    {TYPE_LABELS[key]}
                    {cnt > 0 && (
                      <span style={{ background: imgType===key ? "rgba(255,255,255,.3)" : "var(--navy)", color: imgType===key ? "#fff" : "#fff", borderRadius:"50%", width:18, height:18, display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, fontWeight:800, marginLeft:2 }}>{cnt}</span>
                    )}
                  </button>
                );
              })}
            </div>

            <div style={{ fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:".8px", color:"var(--txt2)", marginBottom:10 }}>
              Configurer : {TYPE_LABELS[imgType]}
            </div>

            {/* Scanner */}
            {imgType === "scan" && (
              <div>
                <label className="lbl">Type de scanner <span className="req">*</span></label>
                <select className="mb12" value={scanType} onChange={e=>setScanType(e.target.value)}>
                  <option value="">— Sélectionner —</option>
                  {["Cérébrale","Rachis cervical","Rachis dorsal / thoracique","Rachis lombaire","Thoracique (poumon)","Abdominal","Pelvien","Abdomino-pelvien","Parties molles","Coude","Bassin","Rachis cervico-thoraco-lombo-sacré","Rachis cervico-thoracique","Rachis dorso-lombaire","Genou","Épaule","Scanner PERS","Scanner urgence weekend"].map(o=><option key={o}>{o}</option>)}
                </select>
                <label className="lbl">Précisions / Zone à explorer</label>
                <textarea rows={2} className="mb12" value={scanPrecisions} onChange={e=>setScanPrecisions(e.target.value)} placeholder="Précisions supplémentaires..." />
                <div style={{ background:"#fef3c7", border:"1.5px solid #fbbf24", borderRadius:10, padding:12 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:10 }}><span className="ms" style={{ color:"#d97706", fontSize:16 }}>checklist</span><strong style={{ fontSize:11, textTransform:"uppercase", letterSpacing:".8px", color:"#92400e" }}>Checklist obligatoire</strong></div>
                  <div style={{ marginBottom:10, fontSize:12 }}>
                    <div style={{ fontWeight:700, marginBottom:4 }}>Hémodynamique instable ou Glasgow &lt; 8 ?</div>
                    <div style={{ display:"flex", gap:12, flexWrap:"wrap" }}>{["Oui — stabiliser avant déplacement","Non"].map(opt=><label key={opt} style={{ display:"flex", alignItems:"center", gap:5, cursor:"pointer" }}><input type="radio" name="sc-glasgow" value={opt} checked={scanGlasgow===opt} onChange={()=>setScanGlasgow(opt)} style={{ accentColor:"var(--navy)" }} />{opt}</label>)}</div>
                  </div>
                  <div style={{ marginBottom:10, fontSize:12 }}>
                    <div style={{ fontWeight:700, marginBottom:4 }}>Patient agité ?</div>
                    <div style={{ display:"flex", gap:12, flexWrap:"wrap" }}>{["Oui — sédation préalable requise","Non"].map(opt=><label key={opt} style={{ display:"flex", alignItems:"center", gap:5, cursor:"pointer" }}><input type="radio" name="sc-agite" value={opt} checked={scanAgite===opt} onChange={()=>setScanAgite(opt)} style={{ accentColor:"var(--navy)" }} />{opt}</label>)}</div>
                  </div>
                  <div style={{ marginBottom:10, fontSize:12 }}>
                    <div style={{ fontWeight:700, marginBottom:4 }}>Allergie (produit de contraste) ?</div>
                    <div style={{ display:"flex", gap:12, flexWrap:"wrap" }}>{["Oui","Non"].map(opt=><label key={opt} style={{ display:"flex", alignItems:"center", gap:5, cursor:"pointer" }}><input type="radio" name="sc-allergie" value={opt} checked={scanAllergie===opt} onChange={()=>setScanAllergie(opt)} style={{ accentColor:"var(--navy)" }} />{opt}</label>)}</div>
                    {scanAllergie==="Oui" && <div style={{ marginTop:6 }}><input type="text" value={scanAllergieDetail} onChange={e=>setScanAllergieDetail(e.target.value)} placeholder="Préciser l'allergie..." /><p style={{ fontSize:10, color:"#92400e", marginTop:4 }}>⚠ ATCD choc anaphylactique → antihistaminique obligatoire</p></div>}
                  </div>
                  <div style={{ marginBottom:10, fontSize:12 }}>
                    <div style={{ fontWeight:700, marginBottom:2 }}>Créatininémie (&lt; 3 mois)</div>
                    <div className="g2"><input type="text" value={scanCreatinine} onChange={e=>setScanCreatinine(e.target.value)} placeholder="Créatinine" /><input type="text" value={scanClearance} onChange={e=>setScanClearance(e.target.value)} placeholder="Clearance (ml/min)" /></div>
                    <p style={{ fontSize:10, color:"#92400e", marginTop:4 }}>Clearance &lt; 30 → injection contre-indiquée · 30–60 → réhydratation préalable</p>
                  </div>
                  <div style={{ fontSize:12 }}>
                    <div style={{ fontWeight:700, marginBottom:4 }}>Diabète / Metformine ?</div>
                    <div style={{ display:"flex", gap:12, flexWrap:"wrap" }}>{["Oui — arrêter le jour J, reprendre après 48h","Non"].map(opt=><label key={opt} style={{ display:"flex", alignItems:"center", gap:5, cursor:"pointer" }}><input type="radio" name="sc-diabete" value={opt} checked={scanDiabete===opt} onChange={()=>setScanDiabete(opt)} style={{ accentColor:"var(--navy)" }} />{opt}</label>)}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Échographie */}
            {imgType === "echo" && (
              <div>
                <label className="lbl">Type d&apos;échographie <span className="req">*</span></label>
                <select className="mb12" value={echoType} onChange={e=>setEchoType(e.target.value)}>
                  <option value="">— Sélectionner —</option>
                  {["Obstétricale","Transfontanellaire","Cytoponction écho-guidée","Musculo-squelettique","Testiculaire","Mammaire","Parties molles","Abdominale","Pelvienne","Abdomino-pelvienne","Morphologique fœtale / Score de Manning","Thyroïdienne","Prostatique / Testiculaire","Épaule / Ostéo-articulaire","Trans-thoracique pleural","Trans-thoracique avec repérage","Thyroïdienne avec cytoponction","Des cuisses","Cervicale"].map(o=><option key={o}>{o}</option>)}
                </select>
                <label style={{ display:"flex", alignItems:"center", gap:8, cursor:"pointer", fontSize:13, fontWeight:600, marginBottom:10, padding:10, background:"var(--inp)", borderRadius:9 }}>
                  <input type="checkbox" checked={echoDoppler} onChange={e=>setEchoDoppler(e.target.checked)} style={{ accentColor:"var(--navy)", width:16, height:16 }} />Écho-Doppler associé
                </label>
                <label className="lbl">Précisions</label>
                <textarea rows={2} value={echoPrecisions} onChange={e=>setEchoPrecisions(e.target.value)} placeholder="Précisions supplémentaires..." />
              </div>
            )}

            {/* Radiographie */}
            {imgType === "rx" && (
              <div>
                <label className="lbl">Type de radiographie <span className="req">*</span></label>
                <select className="mb12" value={rxType} onChange={e=>setRxType(e.target.value)}>
                  <option value="">— Sélectionner —</option>
                  {["Crâne","Thorax","Rachis cervical","Rachis dorsal","Rachis lombaire","Épaule","Bras","Coude","Avant-bras","Poignet","Main","Abdomen sans préparation (ASP)","Bassin","Hanche","Fémur","Genou","Jambe","Cheville","Pied"].map(o=><option key={o}>{o}</option>)}
                </select>
                <label className="lbl">Incidences <span className="req">*</span></label>
                <div className="g3 mb12">{["FACE","PROFIL","OBLIQUE"].map(inc=><label key={inc} className="rc"><input type="checkbox" checked={rxIncidences.includes(inc)} onChange={()=>toggleIncidence(inc)} style={{ accentColor:"var(--navy)" }} /><span>{inc}</span></label>)}</div>
                <label className="lbl">Côté / Précisions complémentaires</label>
                <textarea rows={2} value={rxPrecisions} onChange={e=>setRxPrecisions(e.target.value)} placeholder="Côté droit/gauche, comparatif bilatéral..." />
              </div>
            )}

            {/* Geste interventionnel */}
            {imgType === "geste" && (
              <div>
                <label className="lbl">Type de geste <span className="req">*</span></label>
                <input type="text" className="mb12" value={gesteType} onChange={e=>setGesteType(e.target.value)} placeholder="Ex : ponction d'ascite, biopsie hépatique écho-guidée..." />
                <label className="lbl">Précisions complémentaires</label>
                <textarea rows={3} value={gestePrecisions} onChange={e=>setGestePrecisions(e.target.value)} placeholder="Site, côté, technique souhaitée..." />
              </div>
            )}

            {/* Radio spéciale */}
            {imgType === "rxsp" && (
              <div>
                <label className="lbl">Type d&apos;examen <span className="req">*</span></label>
                <select className="mb12" value={rxspType} onChange={e=>setRxspType(e.target.value)}>
                  <option value="">— Sélectionner —</option>
                  {["UIV (Urographie intra-veineuse)","TOGD (Transit œso-gastro-duodénal)","Lavement baryté (côlon)","Hystérographie","Fistulographie","Artériographie","Phlébographie","Lymphographie","Sialographie","Dacryocystographie","Myélographie","Cystographie","Uréthrographie","Autre"].map(o=><option key={o}>{o}</option>)}
                </select>
                <label className="lbl">Préparation requise</label>
                <textarea rows={2} className="mb12" value={rxspPrep} onChange={e=>setRxspPrep(e.target.value)} placeholder="Préparation digestive, hydratation, arrêt médicaments..." />
                <label className="lbl">Précisions / Question pour le radiologue</label>
                <textarea rows={2} value={rxspPrecisions} onChange={e=>setRxspPrecisions(e.target.value)} placeholder="Indication précise, aspect recherché..." />
              </div>
            )}

            {/* Add to cart button */}
            <button
              onClick={addToCart}
              disabled={!currentTypeValid}
              style={{
                marginTop:14, width:"100%", display:"flex", alignItems:"center", justifyContent:"center", gap:7,
                padding:"11px 16px", border:"2px dashed", borderColor: currentTypeValid ? "var(--navy)" : "var(--bdr)",
                borderRadius:10, background: currentTypeValid ? "var(--navy-lt)" : "transparent",
                color: currentTypeValid ? "var(--navy)" : "var(--txt3)",
                cursor: currentTypeValid ? "pointer" : "not-allowed", fontSize:13, fontWeight:700,
                transition:"all .15s",
              }}
            >
              <span className="ms" style={{ fontSize:18 }}>add_circle</span>
              Ajouter cet examen à la prescription
            </button>
          </div>
        </div>

        {/* ── Right sidebar ── */}
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          {/* Urgence */}
          <div className="card" style={{ padding:8 }}>
            <label className="lbl">Degré d&apos;urgence <span className="req">*</span></label>
            <div className={`urgr ${urgenceClasses[urgence]}`} style={{ marginBottom:8 }}>
              <div className="urgd" />
              <select className="urgs" value={urgence} onChange={e=>setUrgence(e.target.value as Urgence)}>
                <option value="n">Normal</option><option value="u">Urgent</option><option value="tu">TRES_URGENT</option>
              </select>
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:4 }}>
              <span className="ms" style={{ fontSize:16, color:"var(--red)" }}>warning</span>
              <span className="lbl" style={{ margin:0 }}>Précautions &amp; Alertes</span>
            </div>
            <textarea rows={2} value={alertes} onChange={e=>setAlertes(e.target.value)} placeholder="Allergie contraste, claustrophobie, pace-maker, grossesse..." style={{ background:"var(--red-lt)", border:"1.5px solid var(--red-bdr)", padding:"8px 12px" }} />
          </div>

          {/* Remarques */}
          <div className="card" style={{ padding:12 }}>
            <label className="lbl">Remarques complémentaires</label>
            <textarea rows={2} value={remarques} onChange={e=>setRemarques(e.target.value)} placeholder="Informations utiles pour le radiologue..." />
          </div>

          {/* Cart / Récapitulatif */}
          <div className="card" style={{ padding:12 }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:8 }}>
              <span className="sh" style={{ margin:0 }}>Examens prescrits</span>
              <span style={{ background:"var(--navy)", color:"#fff", borderRadius:20, padding:"1px 8px", fontSize:11, fontWeight:800 }}>{cart.length}</span>
            </div>
            {cart.length === 0 ? (
              <div style={{ textAlign:"center", padding:"16px 0", color:"var(--txt3)", fontSize:12 }}>
                <span className="ms" style={{ fontSize:28, display:"block", marginBottom:6 }}>playlist_add</span>
                Aucun examen ajouté.<br />Configurez un examen et cliquez sur <strong>Ajouter</strong>.
              </div>
            ) : (
              <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                {cart.map(item => (
                  <div key={item.id} style={{ display:"flex", alignItems:"flex-start", gap:8, background:"var(--navy-lt)", border:"1.5px solid var(--navy-mid)", borderRadius:9, padding:"8px 10px" }}>
                    <span className="ms" style={{ fontSize:16, color:"var(--navy)", marginTop:1 }}>{TYPE_ICONS[item.type]}</span>
                    <span style={{ flex:1, fontSize:12, color:"var(--navy)", fontWeight:600, lineHeight:1.4 }}>{itemSummary(item)}</span>
                    <button onClick={()=>removeItem(item.id)} style={{ background:"none", border:"none", cursor:"pointer", color:"var(--txt3)", padding:2, lineHeight:1 }}>
                      <span className="ms" style={{ fontSize:15 }}>close</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Validate */}
          <button
            className="bp"
            onClick={()=>setShowModal(true)}
            disabled={!canSubmit || loading}
            style={{ opacity: canSubmit && !loading ? 1 : 0.45, marginTop:0 }}
          >
            <span className="ms">check_circle</span>
            {loading ? "Envoi..." : `Valider la prescription (${cart.length})`}
          </button>
          {!renseignements.trim() && cart.length > 0 && (
            <p style={{ fontSize:11, color:"var(--red)", textAlign:"center", marginTop:-8 }}>⚠ Renseignements cliniques requis</p>
          )}
        </div>
      </div>

      {/* Confirmation modal */}
      {showModal && (
        <div className="mb op" onClick={e=>{ if(e.target===e.currentTarget) setShowModal(false); }}>
          <div className="mbox">
            <h3>Confirmer la demande ?</h3>
            <p>{cart.length} examen(s) d&apos;imagerie seront transmis au service de radiologie.</p>
            <ul style={{ margin:"0 0 16px", padding:"0 0 0 16px", fontSize:13, color:"var(--txt2)" }}>
              {cart.map(i=><li key={i.id}>{itemSummary(i)}</li>)}
            </ul>
            <div className="mbtns"><button className="bca" onClick={()=>setShowModal(false)}>Annuler</button><button className="bok" onClick={() => { if (onAddToCart) { const snapCart = [...cart]; const snap = { patientId: patient.id, prescripteurId: prescripteur.id, chuId: prescripteur.chuId, serviceId: prescripteur.serviceId, urgence, alertes, renseignements, notes: buildNotes(), examens: buildExamens(snapCart) }; onAddToCart({ label: `Imagerie — ${snapCart.length} examen${snapCart.length > 1 ? "s" : ""}`, count: snapCart.length, submit: () => creerPrescriptionImagerie(snap) }); setShowModal(false); setCart([]); } else { handleSubmit(); } }}>Confirmer</button></div>
          </div>
        </div>
      )}

      {/* Validation recap modal */}
      {showValidationModal && validatedPrescription && (
        <div className="mb op" onClick={e=>{ if(e.target===e.currentTarget) setShowValidationModal(false); }}>
          <div className="mbox" style={{ maxWidth:540, width:"95%", maxHeight:"85vh", overflowY:"auto" }}>
            <div style={{ background:"var(--navy)", color:"#fff", padding:"16px 20px", borderRadius:"20px 20px 0 0", display:"flex", alignItems:"center", gap:12 }}>
              <span className="ms" style={{ fontSize:24 }}>check_circle</span>
              <div>
                <h3 style={{ fontFamily:'"Manrope",sans-serif', fontSize:18, fontWeight:800, margin:0 }}>Demande d&apos;imagerie validée</h3>
                <p style={{ fontSize:12, opacity:.9, margin:"4px 0 0" }}>{validatedPrescription.date}</p>
              </div>
            </div>
            <div style={{ padding:20 }}>
              <div style={{ fontWeight:700, fontSize:13, color:"var(--navy)", marginBottom:8 }}>Examens prescrits ({validatedPrescription.cart.length})</div>
              {validatedPrescription.cart.map((item: CartItem) => (
                <div key={item.id} style={{ display:"flex", gap:8, alignItems:"center", background:"var(--navy-lt)", borderRadius:9, padding:"8px 12px", marginBottom:6 }}>
                  <span className="ms" style={{ fontSize:16, color:"var(--navy)" }}>{TYPE_ICONS[item.type]}</span>
                  <span style={{ fontSize:13, fontWeight:600, color:"var(--navy)" }}>{itemSummary(item)}</span>
                </div>
              ))}
              {validatedPrescription.renseignements && (
                <div style={{ marginTop:12, background:"var(--bg2)", borderRadius:9, padding:"10px 12px", fontSize:12, color:"var(--txt2)" }}>
                  <strong>Renseignements : </strong>{validatedPrescription.renseignements}
                </div>
              )}
              <div className="mbtns" style={{ marginTop:20 }}>
                <button className="bok" onClick={()=>setShowValidationModal(false)}>Fermer</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {toast && <div className="tst on"><span className="ms">check_circle</span>{toast}</div>}
    </div>
  );
}
