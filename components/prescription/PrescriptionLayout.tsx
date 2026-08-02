"use client";
import { useState } from "react";
import LaboForm from "./para/LaboForm";
import ImagerieForm from "./para/ImagerieForm";
import EEGForm from "./para/EEGForm";
import ECGForm from "./para/ECGForm";
import PolysomnographieForm from "./para/PolysomnographieForm";
import KineForm from "./para/KineForm";
import EndoscopieForm from "./para/EndoscopieForm";
import DiaryseForm from "./para/DiaryseForm";
import AnapathForm from "./para/AnapathForm";
import ORLForm from "./para/ORLForm";
import ActesOrlForm from "./ActesOrlForm";
import TransfusionForm from "./TransfusionForm";
import BlocForm from "./BlocForm";
import HistoriqueForm from "./HistoriqueForm";
import SurveillanceForm from "./SurveillanceForm";
import SoinsInfirmierForm from "./SoinsInfirmierForm";

export interface PatientInfo {
  id: string;
  nom?: string;
  prenom?: string;
  sexe?: string;
  dateNaissance?: string;
  allergies?: string[];
  groupeSanguin?: string;
}

export interface PrescripteurInfo {
  id?: string;
  nom?: string;
  prenom?: string;
  service?: string;
  chuId?: string;
  serviceId?: string;
}

interface Props {
  patient: PatientInfo;
  prescripteur: PrescripteurInfo;
  onBack?: () => void;
}

// Médicamenteuse/Non médicamenteuse ne sont plus des onglets ici : elles sont
// intégrées à la page de traitement (finalisation de consultation), qui
// réutilise MedicamentBuilder/NonMedicamentBuilder — même modèle, un seul
// endroit pour les prescrire, plus de redondance.
type TabId = "soins-inf" | "surv" | "labo" | "imagerie" | "eeg" | "ecg" | "poly" | "kine" | "endo" | "dialyse" | "anapath" | "orl" | "actes-orl" | "trans" | "bloc" | "hist";
type GlobalCartItem = { id: number; tabId: TabId; label: string; count: number; submit: () => Promise<unknown> };

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: "soins-inf", label: "Soins infirmier", icon: "health_and_safety" },
  { id: "surv",     label: "Surveillance",   icon: "monitor_heart"    },
  { id: "labo",     label: "Laboratoire",    icon: "science"          },
  { id: "imagerie", label: "Imagerie",        icon: "radiology"        },
  { id: "eeg",      label: "EEG",             icon: "neurology"        },
  { id: "ecg",      label: "ECG",             icon: "favorite"         },
  { id: "poly",     label: "Polysomnographie", icon: "bedtime"        },
  { id: "kine",     label: "Kinésithérapie",  icon: "exercise"         },
  { id: "endo",     label: "Endoscopie",      icon: "visibility"       },
  { id: "dialyse",  label: "Dialyse",         icon: "water_full"       },
  { id: "anapath",  label: "Anapath",         icon: "biotech"          },
  { id: "orl",      label: "ORL",             icon: "hearing"          },
  { id: "actes-orl", label: "Actes ORL",     icon: "hearing"           },
  { id: "trans",    label: "Transfusion",     icon: "bloodtype"        },
  { id: "bloc",     label: "Bloc Opératoire", icon: "medical_services" },
  { id: "hist",     label: "Historique",      icon: "history"          },
];

export default function PrescriptionLayout({ patient, prescripteur, onBack }: Props) {
  const [activeTab, setActiveTab] = useState<TabId>("labo");
  // Track visited tabs so forms are mounted only when first opened (preserves state, avoids premature API calls)
  const [visitedTabs, setVisitedTabs] = useState<Set<TabId>>(new Set(["labo"]));

  const [globalCart, setGlobalCart] = useState<GlobalCartItem[]>([]);
  const [globalSubmitting, setGlobalSubmitting] = useState(false);
  const [globalResults, setGlobalResults] = useState<{ label: string; ok: boolean; error?: string }[] | null>(null);

  function addToGlobalCart(tabId: TabId, item: { label: string; count: number; submit: () => Promise<unknown> }) {
    setGlobalCart(prev => [...prev, { id: Date.now() + Math.random(), tabId, label: item.label, count: item.count, submit: item.submit }]);
  }
  function removeFromGlobalCart(id: number) {
    setGlobalCart(prev => prev.filter(p => p.id !== id));
  }
  async function submitAll() {
    if (!globalCart.length || globalSubmitting) return;
    setGlobalSubmitting(true); setGlobalResults(null);
    const snapshot = [...globalCart];
    const results = await Promise.allSettled(snapshot.map(p => p.submit()));
    setGlobalResults(snapshot.map((p, i) => {
      const result = results[i];
      const ok = result.status === "fulfilled";
      return {
        label: p.label,
        ok,
        error: ok ? undefined : (result.reason instanceof Error ? result.reason.message : "Erreur inconnue"),
      };
    }));
    setGlobalCart(prev => prev.filter(p => { const idx = snapshot.findIndex(s => s.id === p.id); return idx === -1 || results[idx].status !== "fulfilled"; }));
    setGlobalSubmitting(false);
    // Les échecs restent affichés plus longtemps (le médecin doit pouvoir lire
    // le message d'erreur), les succès disparaissent vite.
    const hasFailure = results.some(r => r.status === "rejected");
    setTimeout(() => setGlobalResults(null), hasFailure ? 15000 : 5000);
  }

  function goToTab(tab: TabId) {
    setActiveTab(tab);
    setVisitedTabs(prev => new Set([...prev, tab]));
  }

  const hasAllergies = patient.allergies && patient.allergies.length > 0;
  const patientLabel = [patient.prenom, patient.nom].filter(Boolean).join(" ") || 'Patient inconnu';
  const activeTabDef = TABS.find(t => t.id === activeTab);

  return (
    <div style={{ minHeight: "100%" }}>

      {/* ── Patient strip — sticky at top of <main> scroll container ── */}
      <div style={{
        position: "sticky", top: 0, zIndex: 20,
        background: "var(--navy)", color: "#fff",
        display: "flex", alignItems: "center", gap: 10,
        padding: "0 16px", height: "var(--rx-patient-h)",
        boxShadow: "0 2px 8px rgba(0,106,140,.18)",
      }}>
        {onBack && (
          <button
            onClick={onBack}
            title="Retour à la consultation"
            style={{
              background: "rgba(255,255,255,.15)", border: "none", borderRadius: 8,
              width: 32, height: 32, display: "flex", alignItems: "center",
              justifyContent: "center", cursor: "pointer", color: "#fff", flexShrink: 0,
              transition: "background .15s",
            }}
            onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,.25)")}
            onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,.15)")}
          >
            <span className="ms" style={{ fontSize: 18 }}>arrow_back</span>
          </button>
        )}

        <span className="ms" style={{ fontSize: 20, opacity: 0.75, flexShrink: 0 }}>medication</span>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {patientLabel}
            {patient.groupeSanguin && (
              <span style={{ marginLeft: 8, fontSize: 11, opacity: 0.8, background: "rgba(255,255,255,.15)", borderRadius: 5, padding: "1px 6px" }}>
                {patient.groupeSanguin}
              </span>
            )}
          </div>
          <div style={{ fontSize: 11, opacity: 0.65, marginTop: 1 }}>Prescriptions para-cliniques</div>
        </div>

        {hasAllergies && (
          <div style={{
            background: "rgba(220,38,38,.25)", border: "1px solid rgba(252,165,165,.5)",
            borderRadius: 7, padding: "3px 9px", fontSize: 11, fontWeight: 700,
            color: "#fecaca", display: "flex", alignItems: "center", gap: 5, flexShrink: 0,
          }}>
            <span className="ms" style={{ fontSize: 14, color: "#fca5a5" }}>warning</span>
            <span>Allergies : {patient.allergies!.join(" · ")}</span>
          </div>
        )}
        {!hasAllergies && (
          <div style={{ fontSize: 11, opacity: 0.5, flexShrink: 0 }}>Aucune allergie signalée</div>
        )}
      </div>

      {/* ── Tab bar — sticky below patient strip ── */}
      <div style={{
        position: "sticky", top: "var(--rx-patient-h)", zIndex: 19,
        background: "#fff", borderBottom: "1px solid var(--bdr)",
        padding: "0 12px", display: "flex", overflowX: "auto",
        scrollbarWidth: "none",
      }}>
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => goToTab(tab.id)}
            style={{
              display: "flex", alignItems: "center", gap: 5,
              padding: "10px 12px", border: "none", background: "transparent",
              cursor: "pointer", fontSize: 12, whiteSpace: "nowrap", flexShrink: 0,
              fontWeight: activeTab === tab.id ? 700 : 500,
              color: activeTab === tab.id ? "var(--navy)" : "var(--txt2)",
              borderBottom: activeTab === tab.id ? "2.5px solid var(--navy)" : "2.5px solid transparent",
              transition: "all .15s",
            }}
          >
            <span className="ms" style={{ fontSize: 15 }}>{tab.icon}</span>
            {tab.label}
            {globalCart.filter(i => i.tabId === tab.id).length > 0 && (
              <span style={{ background: "var(--navy)", color: "#fff", borderRadius: 20, padding: "1px 6px", fontSize: 10, fontWeight: 800, lineHeight: 1.4 }}>
                {globalCart.filter(i => i.tabId === tab.id).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Active tab title ── */}
      <div style={{ padding: "12px 20px 4px", background: "var(--bg)", display: "flex", alignItems: "center", gap: 8 }}>
        {activeTabDef && (
          <span className="ms" style={{ fontSize: 18, color: "var(--navy)" }}>{activeTabDef.icon}</span>
        )}
        <h2 style={{ fontSize: 16, fontWeight: 800, color: "var(--navy)", margin: 0, fontFamily: '"Manrope", sans-serif' }}>
          {activeTabDef?.label}
        </h2>
      </div>

      {/* ── Form area — only visited tabs are mounted; active is visible ── */}
      <div style={{ padding: "4px 16px 100px", background: "var(--bg)" }}>
        {visitedTabs.has("soins-inf") && (
          <div style={{ display: activeTab === "soins-inf" ? "block" : "none" }}>
            <SoinsInfirmierForm patient={patient} prescripteur={prescripteur} onAddToCart={item => addToGlobalCart("soins-inf", item)} />
          </div>
        )}
        {visitedTabs.has("surv") && (
          <div style={{ display: activeTab === "surv" ? "block" : "none" }}>
            <SurveillanceForm patient={patient} prescripteur={prescripteur} onAddToCart={item => addToGlobalCart("surv", item)} />
          </div>
        )}
        {visitedTabs.has("labo") && (
          <div style={{ display: activeTab === "labo" ? "block" : "none" }}>
            <LaboForm patient={patient} prescripteur={prescripteur} onAddToCart={item => addToGlobalCart("labo", item)} />
          </div>
        )}
        {visitedTabs.has("imagerie") && (
          <div style={{ display: activeTab === "imagerie" ? "block" : "none" }}>
            <ImagerieForm patient={patient} prescripteur={prescripteur} onAddToCart={item => addToGlobalCart("imagerie", item)} />
          </div>
        )}
        {visitedTabs.has("eeg") && (
          <div style={{ display: activeTab === "eeg" ? "block" : "none" }}>
            <EEGForm patient={patient} prescripteur={prescripteur} onAddToCart={item => addToGlobalCart("eeg", item)} />
          </div>
        )}
        {visitedTabs.has("ecg") && (
          <div style={{ display: activeTab === "ecg" ? "block" : "none" }}>
            <ECGForm patient={patient} prescripteur={prescripteur} onAddToCart={item => addToGlobalCart("ecg", item)} />
          </div>
        )}
        {visitedTabs.has("poly") && (
          <div style={{ display: activeTab === "poly" ? "block" : "none" }}>
            <PolysomnographieForm patient={patient} prescripteur={prescripteur} onAddToCart={item => addToGlobalCart("poly", item)} />
          </div>
        )}
        {visitedTabs.has("kine") && (
          <div style={{ display: activeTab === "kine" ? "block" : "none" }}>
            <KineForm patient={patient} prescripteur={prescripteur} onAddToCart={item => addToGlobalCart("kine", item)} />
          </div>
        )}
        {visitedTabs.has("endo") && (
          <div style={{ display: activeTab === "endo" ? "block" : "none" }}>
            <EndoscopieForm patient={patient} prescripteur={prescripteur} onAddToCart={item => addToGlobalCart("endo", item)} />
          </div>
        )}
        {visitedTabs.has("dialyse") && (
          <div style={{ display: activeTab === "dialyse" ? "block" : "none" }}>
            <DiaryseForm patient={patient} prescripteur={prescripteur} onAddToCart={item => addToGlobalCart("dialyse", item)} />
          </div>
        )}
        {visitedTabs.has("anapath") && (
          <div style={{ display: activeTab === "anapath" ? "block" : "none" }}>
            <AnapathForm patient={patient} prescripteur={prescripteur} onAddToCart={item => addToGlobalCart("anapath", item)} />
          </div>
        )}
        {visitedTabs.has("orl") && (
          <div style={{ display: activeTab === "orl" ? "block" : "none" }}>
            <ORLForm patient={patient} prescripteur={prescripteur} onAddToCart={item => addToGlobalCart("orl", item)} />
          </div>
        )}
        {visitedTabs.has("actes-orl") && (
          <div style={{ display: activeTab === "actes-orl" ? "block" : "none" }}>
            <ActesOrlForm patient={patient} prescripteur={prescripteur} onAddToCart={item => addToGlobalCart("actes-orl", item)} />
          </div>
        )}
        {visitedTabs.has("trans") && (
          <div style={{ display: activeTab === "trans" ? "block" : "none" }}>
            <TransfusionForm patient={patient} prescripteur={prescripteur} onAddToCart={item => addToGlobalCart("trans", item)} />
          </div>
        )}
        {visitedTabs.has("bloc") && (
          <div style={{ display: activeTab === "bloc" ? "block" : "none" }}>
            <BlocForm patient={patient} prescripteur={prescripteur} onAddToCart={item => addToGlobalCart("bloc", item)} />
          </div>
        )}
        {visitedTabs.has("hist") && (
          <div style={{ display: activeTab === "hist" ? "block" : "none" }}>
            <HistoriqueForm patient={{ id: patient.id }} />
          </div>
        )}
      </div>

      {/* ── Global prescription cart bar ── */}
      {(globalCart.length > 0 || globalResults) && (
        <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 100, boxShadow: "0 -4px 24px rgba(0,0,0,.18)" }}>
          {globalResults && (
            <div style={{ background: "#1a1a2e", padding: "7px 20px", display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              {globalResults.map((r, i) => (
                <span key={i} style={{ padding: "3px 10px", borderRadius: 20, fontSize: 12, background: r.ok ? "rgba(34,197,94,.2)" : "rgba(239,68,68,.2)", color: r.ok ? "#86efac" : "#fca5a5", display: "flex", alignItems: "center", gap: 5 }}>
                  <span className="ms" style={{ fontSize: 14 }}>{r.ok ? "check_circle" : "error"}</span>
                  {r.label}
                  {!r.ok && r.error && <span style={{ opacity: 0.85, fontWeight: 400 }}>— {r.error}</span>}
                </span>
              ))}
            </div>
          )}
          <div style={{ background: "var(--navy)", padding: "10px 20px", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <span className="ms" style={{ color: "#fff", fontSize: 20, flexShrink: 0 }}>medication</span>
            <span style={{ color: "rgba(255,255,255,.65)", fontSize: 12, flexShrink: 0 }}>File d&apos;attente :</span>
            <div style={{ flex: 1, display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", minWidth: 0 }}>
              {globalCart.map(item => (
                <span key={item.id} style={{ background: "rgba(255,255,255,.15)", borderRadius: 20, padding: "3px 10px", fontSize: 12, color: "#fff", display: "flex", alignItems: "center", gap: 5 }}>
                  {item.label}
                  <button
                    onClick={() => removeFromGlobalCart(item.id)}
                    style={{ background: "none", border: "none", color: "rgba(255,255,255,.6)", cursor: "pointer", padding: "0 0 0 2px", fontSize: 16, lineHeight: 1, display: "flex", alignItems: "center" }}
                    title="Retirer"
                  >×</button>
                </span>
              ))}
            </div>
            <button
              onClick={submitAll}
              disabled={globalSubmitting}
              style={{ background: "#fff", color: "var(--navy)", border: "none", borderRadius: 8, padding: "8px 18px", fontSize: 13, fontWeight: 700, cursor: globalSubmitting ? "default" : "pointer", opacity: globalSubmitting ? 0.7 : 1, display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}
            >
              <span className="ms" style={{ fontSize: 16 }}>{globalSubmitting ? "hourglass_empty" : "send"}</span>
              {globalSubmitting ? "Envoi en cours..." : `Valider ${globalCart.length} prescription${globalCart.length > 1 ? "s" : ""}`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
