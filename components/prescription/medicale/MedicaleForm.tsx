"use client";
import { useState, useEffect, useCallback } from "react";
import { creerPrescriptionMedicale, creerOrdonnanceMedicale, fetchAllPharmacieArticles, PharmacieArticle } from '@/lib/prescription-api';

type Urgence = "n" | "u" | "tu";
const urgenceClasses: Record<Urgence, string> = { n: "un", u: "uu", tu: "utu" };

const QUANTITE_TYPES = ['COMPRIME', 'GELULE', 'CACHET', 'ML', 'G', 'MG', 'GOUTTE', 'FLACON', 'SACHET', 'AMPOULE', 'SERINGUE', 'PATCH', 'SUPPOSITOIRE', 'POMMADE_TUBE', 'SPRAY', 'INHALATEUR'];
const VOIES = ['Orale (per os)', 'Intraveineuse (IV)', 'Intramusculaire (IM)', 'Sous-cutanée (SC)', 'Rectale', 'Topique / locale', 'Inhalation', 'Sublinguale'];

interface Props { patient: { id: string; nom?: string; prenom?: string; sexe?: string; dateNaissance?: string; allergies?: string[]; groupeSanguin?: string }; prescripteur: { id?: string; nom?: string; prenom?: string; service?: string; chuId?: string; serviceId?: string }; }

interface Medicament {
  id: number; nom: string; dose: string; quantite: number; quantiteType: string; voie: string;
  frequenceType: string; frequenceValeur: number; dureeJours: number; instructions: string; remarques: string;
  prixUnitaire?: number; articleId?: string;
  // Ordonnance tab
  selected: boolean; ordonnanceQuantite: number;
}

interface PrescriptionCree { id: string; medicaments: Medicament[] }

export default function MedicaleForm({ patient, prescripteur }: Props) {
  const [activeTab, setActiveTab] = useState<'nouvelle' | 'ordonnance'>('nouvelle');
  const [urgence, setUrgence] = useState<Urgence>("n");
  const [remarques, setRemarques] = useState("");

  // ── Champs du médicament en cours de saisie ──
  const [nom, setNom] = useState("");
  const [dose, setDose] = useState("");
  const [quantite, setQuantite] = useState(1);
  const [quantiteType, setQuantiteType] = useState("COMPRIME");
  const [voie, setVoie] = useState("");
  const [frequenceType, setFrequenceType] = useState("");
  const [frequenceValeur, setFrequenceValeur] = useState<number>(0);
  const [dureeJours, setDureeJours] = useState<number>(0);
  const [instructions, setInstructions] = useState("");
  const [medRemarques, setMedRemarques] = useState("");
  const [selectedPrix, setSelectedPrix] = useState<number | undefined>(undefined);
  const [selectedArticleId, setSelectedArticleId] = useState<string | undefined>(undefined);

  const [medicaments, setMedicaments] = useState<Medicament[]>([]);
  const removeMedicament = (id: number) => setMedicaments(prev => prev.filter(m => m.id !== id));

  const [articles, setArticles] = useState<PharmacieArticle[]>([]);
  const [suggestions, setSuggestions] = useState<PharmacieArticle[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState("");
  const [toast, setToast] = useState("");
  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(""), 2800); }

  const [prescriptionCree, setPrescriptionCree] = useState<PrescriptionCree | null>(null);
  const [ordonnanceLoading, setOrdonnanceLoading] = useState(false);
  const [ordonnanceSentMsg, setOrdonnanceSentMsg] = useState("");

  useEffect(() => {
    fetchAllPharmacieArticles(prescripteur.chuId).then(setArticles).catch(() => setArticles([]));
  }, [prescripteur.chuId]);

  const handleSearchChange = useCallback((value: string) => {
    setNom(value);
    if (value.trim().length < 1) { setSuggestions([]); setShowSuggestions(false); return; }
    const lower = value.trim().toLowerCase();
    const matched = articles.filter(a => a.dci?.toLowerCase().includes(lower)).slice(0, 15);
    setSuggestions(matched); setShowSuggestions(matched.length > 0);
  }, [articles]);

  function selectSuggestion(a: PharmacieArticle) {
    setNom(`${a.dci}${a.dosage ? ` ${a.dosage}` : ''}${a.conditionnement ? ` — ${a.conditionnement}` : ''}`);
    setDose(a.dosage || "");
    setSelectedPrix(a.sale_price != null ? Number(a.sale_price) : undefined);
    setSelectedArticleId(String(a.id));
    setShowSuggestions(false);
  }

  const isAddValid = nom.trim() !== "" && dose.trim() !== "" && dureeJours > 0
    && !!frequenceType && (frequenceType === 'SOS' || frequenceType === 'CONTINU' || frequenceValeur > 0);
  const canValidate = medicaments.length > 0;

  function addMedicament() {
    setMedicaments(prev => [...prev, {
      id: Date.now(), nom, dose, quantite, quantiteType, voie, frequenceType, frequenceValeur, dureeJours,
      instructions, remarques: medRemarques, prixUnitaire: selectedPrix, articleId: selectedArticleId,
      selected: true, ordonnanceQuantite: quantite,
    }]);
    setNom(""); setDose(""); setQuantite(1); setQuantiteType("COMPRIME"); setVoie("");
    setFrequenceType(""); setFrequenceValeur(0); setDureeJours(0); setInstructions(""); setMedRemarques("");
    setSelectedPrix(undefined); setSelectedArticleId(undefined);
  }

  function buildMedicamentsPayload(items: Medicament[], ordonnance = false) {
    return items.map(m => ({
      nom: m.nom, dose: m.dose,
      quantite: ordonnance ? m.ordonnanceQuantite : m.quantite,
      quantiteType: m.quantiteType || undefined, voie: m.voie || undefined,
      frequenceType: m.frequenceType || undefined, frequenceValeur: m.frequenceValeur || undefined,
      dureeJours: m.dureeJours || undefined, instructions: m.instructions || undefined, remarques: m.remarques || undefined,
      prixUnitaire: m.prixUnitaire, articleId: m.articleId,
    }));
  }

  // "Valider" : crée la prescription (partie archivée) sur le backend
  // immédiatement, puis bascule vers l'onglet Ordonnance pour sélectionner
  // ce qui part réellement à la pharmacie. La prescription et l'ordonnance
  // sont deux ressources distinctes côté backend.
  async function handleValider() {
    if (!canValidate) return;
    setLoading(true); setApiError("");
    try {
      const created = await creerPrescriptionMedicale({
        patientId: patient.id, prescripteurId: prescripteur.id, chuId: prescripteur.chuId, serviceId: prescripteur.serviceId,
        urgence, remarques, medicaments: buildMedicamentsPayload(medicaments),
      });
      setPrescriptionCree({ id: (created as { id: string }).id, medicaments: medicaments.map(m => ({ ...m })) });
      showToast("Prescription créée — vous pouvez générer l'ordonnance");
      setActiveTab('ordonnance');
      setMedicaments([]); setRemarques(""); setUrgence("n");
    } catch (err: unknown) {
      setApiError((err instanceof Error ? err.message : null) || "Erreur lors de la création de la prescription.");
    } finally { setLoading(false); }
  }

  function toggleOrdonnanceMed(id: number) {
    setPrescriptionCree(prev => prev ? { ...prev, medicaments: prev.medicaments.map(m => m.id === id ? { ...m, selected: !m.selected } : m) } : prev);
  }
  function updateOrdonnanceQuantite(id: number, qty: number) {
    setPrescriptionCree(prev => prev ? { ...prev, medicaments: prev.medicaments.map(m => m.id === id ? { ...m, ordonnanceQuantite: Math.max(0, qty) } : m) } : prev);
  }

  // "Créer et envoyer l'ordonnance" : sous-ensemble sélectionné, envoyé à la
  // pharmacie — endpoint distinct de la prescription elle-même.
  async function handleCreerOrdonnance() {
    if (!prescriptionCree) return;
    const selected = prescriptionCree.medicaments.filter(m => m.selected && m.ordonnanceQuantite > 0);
    if (selected.length === 0) return;
    setOrdonnanceLoading(true); setApiError("");
    try {
      await creerOrdonnanceMedicale(prescriptionCree.id, buildMedicamentsPayload(selected, true));
      setOrdonnanceSentMsg("Ordonnance créée et envoyée à la pharmacie");
      showToast("Ordonnance envoyée à la pharmacie");
      setPrescriptionCree(null);
    } catch (err: unknown) {
      setApiError((err instanceof Error ? err.message : null) || "Erreur lors de la création de l'ordonnance.");
    } finally { setOrdonnanceLoading(false); }
  }

  return (
    <div>
      {apiError && <div style={{background:"var(--red-lt)",border:"1px solid var(--red-bdr)",borderRadius:8,padding:"10px 12px",fontSize:12,color:"var(--red)",marginBottom:12}}>{apiError}</div>}

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button onClick={() => setActiveTab('nouvelle')} style={{ padding: '8px 14px', borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: activeTab === 'nouvelle' ? 700 : 500, background: activeTab === 'nouvelle' ? 'var(--navy)' : 'var(--inp)', color: activeTab === 'nouvelle' ? '#fff' : 'var(--txt2)' }}>Nouvelle prescription {medicaments.length > 0 && `(${medicaments.length})`}</button>
        <button onClick={() => setActiveTab('ordonnance')} style={{ padding: '8px 14px', borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: activeTab === 'ordonnance' ? 700 : 500, background: activeTab === 'ordonnance' ? 'var(--navy)' : 'var(--inp)', color: activeTab === 'ordonnance' ? '#fff' : 'var(--txt2)' }}>Ordonnance {prescriptionCree ? `(${prescriptionCree.medicaments.length})` : ''}</button>
      </div>

      {activeTab === 'nouvelle' && (
        <div className="g2-form mb12">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="card" style={{ padding: 12 }}>
              <div className="mb12" style={{ position: 'relative' }}>
                <label className="lbl">Médicament <span className="req">*</span></label>
                <input type="text" value={nom} onChange={e => handleSearchChange(e.target.value)} onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true); }} placeholder="Rechercher dans le stock pharmacie..." />
                {showSuggestions && suggestions.length > 0 && (
                  <ul style={{ position: 'absolute', left: 0, right: 0, top: '100%', marginTop: 2, background: 'var(--card)', border: '1px solid var(--bdr)', borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.15)', zIndex: 30, maxHeight: 200, overflowY: 'auto', listStyle: 'none', padding: 0, margin: 0 }}>
                    {suggestions.map(a => (
                      <li key={a.id} onMouseDown={() => selectSuggestion(a)} style={{ padding: '8px 12px', cursor: 'pointer', fontSize: 13, borderBottom: '1px solid var(--bdr)' }}>
                        {a.dci} {a.dosage} {a.conditionnement ? `— ${a.conditionnement}` : ''}
                      </li>
                    ))}
                  </ul>
                )}
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
              <input type="text" value={medRemarques} onChange={e => setMedRemarques(e.target.value)} placeholder="Précisions complémentaires..." />
              <button
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
            <div className="card" style={{ padding: 8 }}><label className="lbl">Degré d&apos;urgence <span className="req">*</span></label><div className={`urgr ${urgenceClasses[urgence]}`} style={{ marginBottom:8 }}><div className="urgd" /><select className="urgs" value={urgence} onChange={e => setUrgence(e.target.value as Urgence)}><option value="n">Normal</option><option value="u">Urgent</option><option value="tu">TRES_URGENT</option></select></div></div>

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
                      <button onClick={() => removeMedicament(m.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--txt3)", padding: 2, lineHeight: 1 }}>
                        <span className="ms" style={{ fontSize: 15 }}>close</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button className="bp" onClick={handleValider} disabled={!canValidate || loading} style={{ opacity: canValidate && !loading ? 1 : 0.5, marginTop:0 }}><span className="ms">check_circle</span>{loading ? "Validation..." : "Valider"}</button>
          </div>
        </div>
      )}

      {activeTab === 'ordonnance' && (
        <div style={{ maxWidth: 700 }}>
          {ordonnanceSentMsg && <div style={{ background: 'var(--green-lt, #dcfce7)', border: '1px solid var(--green-bdr, #86efac)', borderRadius: 8, padding: '10px 12px', fontSize: 12, color: 'var(--green-dk, #166534)', marginBottom: 12 }}>{ordonnanceSentMsg}</div>}
          {!prescriptionCree ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--txt3)' }}>
              <span className="ms" style={{ fontSize: 40, display: 'block', marginBottom: 8 }}>description</span>
              <p style={{ fontSize: 13 }}>Aucune ordonnance en attente</p>
              <p style={{ fontSize: 12, marginTop: 4 }}>Ajoutez des médicaments depuis l&apos;onglet <strong>Nouvelle prescription</strong> puis cliquez <strong>Valider</strong>.</p>
            </div>
          ) : (
            <div style={{ border: '1px solid var(--bdr)', borderRadius: 12, padding: 16, background: 'var(--card)' }}>
              <div style={{ fontSize: 13, color: 'var(--txt2)', marginBottom: 12 }}>
                {prescriptionCree.medicaments.filter(m => m.selected).length}/{prescriptionCree.medicaments.length} sélectionné(s) pour l&apos;ordonnance
              </div>
              {prescriptionCree.medicaments.map(m => (
                <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderBottom: '1px solid var(--bdr)', fontSize: 13 }}>
                  <input type="checkbox" checked={m.selected} onChange={() => toggleOrdonnanceMed(m.id)} />
                  <div style={{ flex: 1 }}>
                    <strong>{m.nom} {m.dose}</strong>
                    <span style={{ fontSize: 11, color: 'var(--txt3)', display: 'block' }}>{m.frequenceType} · {m.dureeJours} jour(s)</span>
                  </div>
                  <span style={{ fontSize: 11, color: 'var(--txt3)' }}>Qté:</span>
                  <input type="number" min={0} value={m.ordonnanceQuantite} onChange={e => updateOrdonnanceQuantite(m.id, parseInt(e.target.value) || 0)} disabled={!m.selected} style={{ width: 55, textAlign: 'center' }} />
                </div>
              ))}
              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <button className="bp" onClick={handleCreerOrdonnance} disabled={ordonnanceLoading || prescriptionCree.medicaments.filter(m => m.selected && m.ordonnanceQuantite > 0).length === 0} style={{ flex: 1 }}>
                  {ordonnanceLoading ? 'Envoi...' : "Créer et envoyer l'ordonnance"}
                </button>
                <button onClick={() => setPrescriptionCree(null)} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid var(--bdr)', background: 'var(--card)', cursor: 'pointer', fontSize: 13 }}>Ne pas faire d&apos;ordonnance</button>
              </div>
            </div>
          )}
        </div>
      )}

      {toast && <div className="tst on"><span className="ms">check_circle</span>{toast}</div>}
    </div>
  );
}
