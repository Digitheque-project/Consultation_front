"use client";
import { useState, useEffect, Fragment } from "react";
import { openSummaryWindow } from '@/lib/printPrescription';
import { creerPrescriptionDialyse, getCreneauxDialyse } from '@/lib/prescription-api';

type Urgence = "n" | "u" | "tu";
const urgenceClasses: Record<Urgence, string> = { n: "un", u: "uu", tu: "utu" };
const MACHINES = ['Machine 1', 'Machine 2', 'Machine 3'];
const HEURES = ['07:00', '11:00', '15:00'];

interface Props {
  patient: { id: string; nom?: string; prenom?: string; sexe?: string; dateNaissance?: string; allergies?: string[]; groupeSanguin?: string; };
  prescripteur: { id?: string; nom?: string; prenom?: string; service?: string; chuId?: string; serviceId?: string };
  onAddToCart?: (item: { label: string; count: number; submit: () => Promise<unknown> }) => void;
}

function calcAge(dateNaissance?: string): number | null {
  if (!dateNaissance) return null;
  const diff = Date.now() - new Date(dateNaissance).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
}

export default function DiaryseForm({ patient, prescripteur, onAddToCart }: Props) {
  const [urgence, setUrgence] = useState<Urgence>("n");
  const [alertes, setAlertes] = useState("");
  const [renseignements, setRenseign] = useState("");
  const [remarques, setRemarques] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [creneaux, setCreneaux] = useState<{ machine: string; heure: string; disponible: boolean; rdvId?: number }[]>([]);
  const [selectedMachine, setSelectedMachine] = useState('');
  const [selectedHeure, setSelectedHeure] = useState('');
  const [loadingCreneaux, setLoadingCreneaux] = useState(false);
  const [dateError, setDateError] = useState('');
  const [fallbackRdv, setFallbackRdv] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [toast, setToast] = useState("");
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState("");
  const [showValidationModal, setShowValidationModal] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [validatedPrescription, setValidatedPrescription] = useState<any>(null);

  const age = calcAge(patient?.dateNaissance);
  const isValidDialyseDay = (value: string) => { const d = new Date(value); const day = d.getDay(); return [1, 3, 5].includes(day); };

  const isFormValid = !!renseignements.trim() && ((!!selectedMachine && !!selectedHeure) || (!!fallbackRdv && fallbackRdv.trim()));

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(""), 2800); }
  function getSlotKey(machine: string, heure: string) { return `${machine}_${heure}`; }

  function buildDialyseSummary(): string {
    const now = new Date().toLocaleString('fr-FR');
    let html = '<div class="card"><div class="patient">Date : ' + now + '</div>';
    if (selectedMachine && selectedHeure) {
      html += '<div class="medicament"><span class="nom">Créneau :</span> <span class="detail">' + selectedMachine + ' — ' + selectedHeure + '</span></div>';
    } else if (fallbackRdv) {
      html += '<div class="medicament"><span class="nom">Créneau :</span> <span class="detail">' + fallbackRdv + '</span></div>';
    }
    html += '<div class="medicament"><span class="nom">Renseignements :</span> <span class="detail">' + renseignements + '</span></div>';
    if (remarques) html += '<div class="notice">📌 ' + remarques + '</div>';
    if (alertes) html += '<div class="notice">⚠️ ' + alertes + '</div>';
    html += '</div>';
    return html;
  }

  useEffect(() => {
    async function fetchCreneaux() {
      if (!isValidDialyseDay(date)) {
        setCreneaux([]); setSelectedMachine(''); setSelectedHeure('');
        setDateError('Veuillez sélectionner un lundi, mercredi ou vendredi.'); return;
      }
      setDateError(''); setLoadingCreneaux(true);
      try {
        const data = await getCreneauxDialyse(date);
        setCreneaux(Array.isArray(data) ? data : []);
        setSelectedMachine(''); setSelectedHeure('');
      } catch { setCreneaux([]); }
      finally { setLoadingCreneaux(false); }
    }
    fetchCreneaux();
  }, [date]);

  // Le contrat prescription n'a pas de champ dédié pour le créneau (machine/heure) :
  // on garde dateSouhaitee (jour) et on décrit le créneau choisi dans remarques.
  function buildRemarquesAvecCreneau(): string {
    const parts: string[] = [];
    if (selectedMachine && selectedHeure) parts.push(`Créneau souhaité : ${selectedMachine} — ${selectedHeure}`);
    else if (fallbackRdv) parts.push(`Créneau souhaité (saisie manuelle) : ${fallbackRdv}`);
    if (remarques.trim()) parts.push(remarques.trim());
    return parts.join("\n");
  }

  async function handleSubmit() {
    setShowModal(false); setLoading(true); setApiError("");
    try {
      const rdvDateTime = selectedMachine && selectedHeure ? `${date}T${selectedHeure}:00` : fallbackRdv || undefined;
      const rdvMachine = selectedMachine || undefined;
      await creerPrescriptionDialyse({ patientId: patient.id, prescripteurId: prescripteur.id, chuId: prescripteur.chuId, serviceId: prescripteur.serviceId, urgence, alertes, renseignements, dateSouhaitee: date, remarques: buildRemarquesAvecCreneau() });
      openSummaryWindow('Dialyse', buildDialyseSummary());
      setValidatedPrescription({ urgence, alertes, renseignements, rdvMachine, rdvDateTime, remarques, patient: { ...patient, age }, prescripteur, date: new Date().toLocaleString('fr-FR') });
      setShowValidationModal(true);
      showToast("Prescription dialyse transmise");
      setUrgence("n"); setAlertes(""); setRenseign(""); setSelectedMachine(''); setSelectedHeure(''); setFallbackRdv(''); setRemarques("");
    } catch { setApiError("Erreur lors de l'envoi."); }
    finally { setLoading(false); }
  }

  const selectedSlot = selectedMachine && selectedHeure ? `${selectedMachine} — ${selectedHeure}` : fallbackRdv ? `Saisie manuelle : ${fallbackRdv}` : 'Aucun créneau sélectionné';

  return (
    <div>
      {apiError && <div style={{ background: "var(--red-lt)", border: "1px solid var(--red-bdr)", borderRadius: 8, padding: "10px 12px", fontSize: 12, color: "var(--red)", marginBottom: 12 }}>{apiError}</div>}
      <div className="g2-form mb12">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="card" style={{ padding: 12 }}>
            <label className="lbl">Renseignements cliniques <span className="req">*</span></label>
            <textarea rows={3} value={renseignements} onChange={e => setRenseign(e.target.value)} placeholder="Insuffisance rénale..." />
          </div>
          <div className="card" style={{ padding: 12 }}>
            <label className="lbl">Date du RDV <span className="req">*</span></label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} style={{ width: '100%', marginTop: 8 }} />
            {dateError && <div style={{ marginTop: 8, color: 'var(--red)', fontSize: 12 }}>{dateError}</div>}
            <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <div><div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6 }}>Jour autorisé</div><div style={{ fontSize: 12, color: 'var(--txt2)' }}>Lundi, mercredi, vendredi</div></div>
              <div style={{ fontSize: 12, color: 'var(--txt3)' }}>Créneau sélectionné : {selectedSlot}</div>
            </div>
            <div style={{ marginTop: 16 }}>
              {loadingCreneaux ? (
                <div style={{ padding: 16, textAlign: 'center', color: 'var(--txt3)' }}>Chargement des créneaux...</div>
              ) : creneaux.length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: 8 }}>
                  <div />
                  {MACHINES.map(machine => <div key={machine} style={{ fontSize: 12, fontWeight: 700, color: 'var(--txt)', textAlign: 'center' }}>{machine}</div>)}
                  {HEURES.map(heure => (
                    <Fragment key={heure}>
                      <div key={`${heure}_label`} style={{ fontSize: 12, fontWeight: 700, color: 'var(--txt)', paddingTop: 8 }}>{heure}</div>
                      {MACHINES.map(machine => {
                        const slot = creneaux.find(s => s.machine === machine && s.heure === heure);
                        const selected = selectedMachine === machine && selectedHeure === heure;
                        return (
                          <button key={getSlotKey(machine, heure)} type="button"
                            onClick={() => { if (!slot?.disponible) return; setSelectedMachine(machine); setSelectedHeure(heure); setFallbackRdv(''); }}
                            disabled={!slot?.disponible}
                            style={{ padding: '10px 8px', minHeight: 42, borderRadius: 10, border: selected ? '2px solid var(--navy)' : '1px solid var(--bdr)', background: slot?.disponible ? (selected ? 'var(--navy)' : 'var(--bg)') : 'var(--txt-lt)', color: selected ? '#fff' : slot?.disponible ? 'var(--txt)' : 'var(--txt3)', cursor: slot?.disponible ? 'pointer' : 'not-allowed' }}>
                            {slot?.disponible ? 'Disponible' : 'Occupé'}
                          </button>
                        );
                      })}
                    </Fragment>
                  ))}
                </div>
              ) : (
                <div style={{ marginTop: 12, padding: 16, borderRadius: 12, background: 'var(--bg)', border: '1px solid var(--bdr)' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Créneaux indisponibles — saisie manuelle</div>
                  <div style={{ fontSize: 12, color: 'var(--txt2)', marginBottom: 12 }}>Vous pouvez saisir un rendez-vous manuel.</div>
                  <input type="datetime-local" value={fallbackRdv} onChange={e => { setFallbackRdv(e.target.value); setSelectedMachine(''); setSelectedHeure(''); }} style={{ width: '100%' }} />
                </div>
              )}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="card" style={{ padding: 8 }}>
            <label className="lbl">Degré d&apos;urgence <span className="req">*</span></label>
            <div className={`urgr ${urgenceClasses[urgence]}`} style={{ marginBottom: 8 }}><div className="urgd" /><select className="urgs" value={urgence} onChange={e => setUrgence(e.target.value as Urgence)}><option value="n">Normal</option><option value="u">Urgent</option><option value="tu">TRES_URGENT</option></select></div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}><span className="ms" style={{ fontSize: 16, color: 'var(--red)' }}>warning</span><span className="lbl" style={{ margin: 0 }}>Précautions &amp; Alertes</span></div>
            <textarea rows={2} value={alertes} onChange={e => setAlertes(e.target.value)} placeholder="Accès vasculaire..." style={{ background: 'var(--red-lt)', border: '1.5px solid var(--red-bdr)', padding: '8px 12px' }} />
          </div>
          <div className="card" style={{ padding: 12 }}><label className="lbl">Autres remarques</label><textarea rows={3} value={remarques} onChange={e => setRemarques(e.target.value)} placeholder="Durée, débit..." /></div>
          <button className="bp" onClick={() => setShowModal(true)} style={{ opacity: isFormValid && !loading ? 1 : 0.5, pointerEvents: isFormValid && !loading ? 'auto' : 'none', marginTop: 0 }}><span className="ms">check_circle</span>{loading ? 'Envoi...' : 'Valider la prescription'}</button>
        </div>
      </div>

      {showModal && <div className="mb op" onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}><div className="mbox"><h3>Confirmer ?</h3><p>La prescription sera transmise au service de dialyse.</p><div className="mbtns"><button className="bca" onClick={() => setShowModal(false)}>Annuler</button><button className="bok" onClick={() => { if (onAddToCart) { const snap = { patientId: patient.id, prescripteurId: prescripteur.id, chuId: prescripteur.chuId, serviceId: prescripteur.serviceId, urgence, alertes, renseignements, dateSouhaitee: date, remarques: buildRemarquesAvecCreneau() }; onAddToCart({ label: "Dialyse", count: 1, submit: () => creerPrescriptionDialyse(snap) }); setShowModal(false); } else { handleSubmit(); } }}>Confirmer</button></div></div></div>}

      {showValidationModal && validatedPrescription && (
        <div className="mb op" onClick={e => { if (e.target === e.currentTarget) setShowValidationModal(false); }}>
          <div className="mbox" style={{ maxWidth: 560, width: '95%', maxHeight: '85vh', overflowY: 'auto' }}>
            <div style={{ background: 'var(--navy)', color: '#fff', padding: '16px 20px', borderRadius: '20px 20px 0 0', display: 'flex', alignItems: 'center', gap: 12 }}><span className="ms" style={{ fontSize: 24 }}>check_circle</span><div><h3 style={{ fontFamily: '"Manrope", sans-serif', fontSize: 18, fontWeight: 800, margin: 0 }}>Prescription dialyse validée</h3><p style={{ fontSize: 12, opacity: 0.9, margin: '4px 0 0 0' }}>{validatedPrescription.date}</p></div></div>
            <div style={{ padding: '20px' }}>
              <div style={{ background: '#fff', border: '1px solid var(--bdr)', borderRadius: 10, padding: '12px 14px', marginBottom: 8 }}><div style={{ fontSize: 14, fontWeight: 700, color: 'var(--txt)', marginBottom: 4 }}>Renseignements cliniques</div><div style={{ fontSize: 12, color: 'var(--txt2)' }}>{validatedPrescription.renseignements}</div></div>
              <div style={{ background: '#fff', border: '1px solid var(--bdr)', borderRadius: 10, padding: '12px 14px', marginBottom: 8 }}><div style={{ fontSize: 14, fontWeight: 700, color: 'var(--txt)', marginBottom: 4 }}>Créneau</div><div style={{ fontSize: 12, color: 'var(--txt2)' }}>{validatedPrescription.rdvMachine ? `${validatedPrescription.rdvMachine} — ${new Date(validatedPrescription.rdvDateTime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}` : validatedPrescription.rdvDateTime || 'Non spécifié'}</div></div>
              <div style={{ background: validatedPrescription.urgence === 'n' ? '#dbeafe' : validatedPrescription.urgence === 'u' ? '#fef3c7' : '#fee2e2', borderRadius: 10, padding: '12px 14px', marginBottom: 16 }}><div style={{ fontSize: 13, fontWeight: 700, color: validatedPrescription.urgence === 'n' ? '#1e40af' : validatedPrescription.urgence === 'u' ? '#92400e' : '#991b1b' }}>{validatedPrescription.urgence === 'n' ? 'Normal' : validatedPrescription.urgence === 'u' ? 'Urgent' : 'TRES_URGENT'}</div></div>
              {validatedPrescription.alertes && <div style={{ background: 'var(--red-lt)', borderRadius: 10, padding: '12px 14px', marginBottom: 16 }}><div style={{ fontSize: 13, color: 'var(--txt)' }}>{validatedPrescription.alertes}</div></div>}
              {validatedPrescription.remarques && <div style={{ background: 'var(--bg)', borderRadius: 10, padding: '12px 14px', marginBottom: 16 }}><div style={{ fontSize: 13, color: 'var(--txt)' }}>{validatedPrescription.remarques}</div></div>}
              <div className="mbtns" style={{ marginTop: 20 }}><button className="bok" onClick={() => setShowValidationModal(false)}>Fermer</button></div>
            </div>
          </div>
        </div>
      )}

      {toast && <div className="tst on"><span className="ms">check_circle</span>{toast}</div>}
    </div>
  );
}
