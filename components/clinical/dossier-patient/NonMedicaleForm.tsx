'use client';

import { useState, useEffect } from 'react';
import { openSummaryWindow } from '@/lib/printPrescription';
import { creerPrescriptionNonMedicale, getPrescriptionsPatient, updateStatutPrescription } from '@/lib/api';

interface NMItem {
  id: string;
  type: string;
  typeLabel: string;
  description: string;
  duree: string;
  frequence: string;
  dateDebut: string;
  heureDebut: string;
  instructions: string;
}

interface PrescriptionNonMedEnCours {
  id: string;
  items: { typeLabel: string; description: string; duree?: string; frequence?: string; dateDebut?: string }[];
  notifierInfirmier?: boolean;
  prescripteur?: { nom: string };
}

const TYPE_OPTIONS = [
  { value: 'regime', label: 'Régime alimentaire' },
  { value: 'mobilisation', label: 'Mobilisation / Positionnement' },
  { value: 'nursing', label: 'Soins infirmiers / Nursing' },
  { value: 'hygiene', label: 'Hygiène' },
  { value: 'contention', label: 'Contention / Attelle' },
  { value: 'autre', label: 'Autre' },
];

const TYPE_ICON: Record<string, string> = {
  regime: 'restaurant', mobilisation: 'accessibility_new', nursing: 'health_and_safety',
  hygiene: 'soap', contention: 'back_hand', autre: 'more_horiz',
};

interface Props {
  patient: { id: string; nom?: string; prenom?: string };
  prescripteur: { id?: string; nom?: string; prenom?: string; service?: string };
}

export default function NonMedicaleForm({ patient, prescripteur }: Props) {
  const [type, setType] = useState('');
  const [description, setDescription] = useState('');
  const [duree, setDuree] = useState('');
  const [dureeUnite, setDureeUnite] = useState('jours');
  const [frequence, setFrequence] = useState('');
  const [dateDebut, setDateDebut] = useState('');
  const [heureDebut, setHeureDebut] = useState('');
  const [instructions, setInstructions] = useState('');
  const [items, setItems] = useState<NMItem[]>([]);
  const [notifOn, setNotifOn] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showModal, setShowModal] = useState(false);
  const [toast, setToast] = useState('');
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState('');
  const [prescriptionsEnCours, setPrescriptionsEnCours] = useState<PrescriptionNonMedEnCours[]>([]);

  const canValidate = items.length > 0;
  const isAddValid = type && description.trim() && duree.trim() && (Number(duree) > 0);

  function parseDureeMs(d: string): number {
    const parts = d.split(' ');
    if (parts.length !== 2) return 0;
    const val = Number(parts[0]);
    const unit = parts[1];
    if (isNaN(val)) return 0;
    switch (unit) {
      case 'heures': return val * 3600_000;
      case 'jours':  return val * 86400_000;
      case 'mois':   return val * 30 * 86400_000;
      default: return 0;
    }
  }

  function filterExpired(prescriptions: PrescriptionNonMedEnCours[]): PrescriptionNonMedEnCours[] {
    const now = Date.now();
    return prescriptions.filter(p => {
      if ((p as any).statut !== 'ACTIVE') return false;
      return p.items?.some(item => {
        if (!item.dateDebut || !item.duree) return true;
        const start = new Date(item.dateDebut).getTime();
        return (start + parseDureeMs(item.duree)) > now;
      });
    });
  }

  useEffect(() => {
    async function fetchPrescriptions() {
      try {
        const data = await getPrescriptionsPatient('non-medicale', patient.id);
        setPrescriptionsEnCours(filterExpired(data));
      } catch {}
    }
    fetchPrescriptions();
  }, [patient.id]);

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 2800); }

  function validateAddForm(): boolean {
    const newErrors: Record<string, string> = {};
    if (!type) newErrors.type = 'Le type est requis';
    if (!description.trim()) newErrors.description = 'La description est requise';
    if (!duree.trim() || isNaN(Number(duree))) newErrors.duree = 'Veuillez entrer un nombre valide';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function handleAdd() {
    if (!validateAddForm()) return;
    const dureeComplete = `${duree} ${dureeUnite}`;
    const typeLabel = TYPE_OPTIONS.find(o => o.value === type)?.label ?? type;
    setItems(prev => [...prev, {
      id: Date.now().toString(), type, typeLabel,
      description: description.trim(), duree: dureeComplete, frequence: frequence.trim(),
      dateDebut, heureDebut, instructions: instructions.trim(),
    }]);
    setType(''); setDescription(''); setDuree(''); setDureeUnite('jours'); setFrequence('');
    setDateDebut(''); setHeureDebut(''); setInstructions(''); setErrors({});
  }

  function handleDelete(id: string) { setItems(prev => prev.filter(i => i.id !== id)); }

  async function refreshPrescriptions() {
    try {
      const data = await getPrescriptionsPatient('non-medicale', patient.id);
      setPrescriptionsEnCours(filterExpired(data));
    } catch {}
  }

  async function terminerPrescription(id: string) {
    try {
      await updateStatutPrescription('non-medicale', id, 'TERMINEE');
      await refreshPrescriptions();
    } catch { console.error('Erreur terminaison'); }
  }

  function buildNMSummary(itemsList: NMItem[], notifier: boolean): string {
    const now = new Date().toLocaleString('fr-FR');
    let html = `<div class="card"><div class="patient">Date : ${now}</div>`;
    itemsList.forEach(item => {
      html += `
        <div class="medicament">
          <span class="nom">${item.typeLabel}</span>
          <span class="detail">${item.description} · Durée : ${item.duree}${item.frequence ? ` · ${item.frequence}` : ''}${item.instructions ? ` · ${item.instructions}` : ''}.</span>
        </div>`;
    });
    if (notifier) html += `<div class="notice"><span class="badge badge-success">✅ Infirmier notifié</span></div>`;
    html += `</div>`;
    return html;
  }

  async function handleValidate() {
    setShowModal(false);
    setLoading(true);
    setApiError('');
    try {
      const result = await creerPrescriptionNonMedicale({
        patientId: patient.id,
        prescripteurId: prescripteur.id,
        notifierInfirmier: notifOn,
        items: items.map(({ id, type, typeLabel, description, duree, frequence, dateDebut, heureDebut, instructions }) => ({
          type, typeLabel, description, duree, frequence, dateDebut: dateDebut ? new Date(dateDebut) : undefined, heureDebut: heureDebut || undefined, instructions
        })),
      });
      if (notifOn && result?.id) {
      }
      openSummaryWindow('Prescription non médicamenteuse', buildNMSummary(items, notifOn));
      showToast('Prescription non médicamenteuse validée');
      setItems([]);
      setNotifOn(false);
      setInstructions('');
      await refreshPrescriptions();
    } catch {
      setApiError("Erreur lors de l'envoi. Vérifiez la connexion.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 16, alignItems: 'start' }}>
      {apiError && (
        <div style={{ gridColumn: '1 / -1', background: "var(--red-lt)", border: "1px solid var(--red-bdr)", borderRadius: 8, padding: "10px 12px", fontSize: 12, color: "var(--red)" }}>
          {apiError}
        </div>
      )}

      {/* COLONNE GAUCHE */}
      <div>
        <div className="card mb12" style={{ padding: 12 }}>
          <div className="mb12">
            <label className="lbl">Type de prescription <span className="req">*</span></label>
            <select value={type} onChange={e => { setType(e.target.value); if (errors.type) setErrors({...errors, type: ''}); }} style={errors.type ? { borderColor: 'var(--red)' } : {}}>
              <option value="">Sélectionner un type</option>
              {TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            {errors.type && <div style={{ fontSize: 11, color: 'var(--red)', marginTop: 3 }}>{errors.type}</div>}
          </div>
          <div className="mb12">
            <label className="lbl">Description précise <span className="req">*</span></label>
            <input type="text" placeholder="Ex : Régime sans sel strict..." value={description} onChange={e => { setDescription(e.target.value); if (errors.description) setErrors({...errors, description: ''}); }} style={errors.description ? { borderColor: 'var(--red)' } : {}} />
            {errors.description && <div style={{ fontSize: 11, color: 'var(--red)', marginTop: 3 }}>{errors.description}</div>}
          </div>
          <div className="g2 mb12">
            <div><label className="lbl">Fréquence</label><input type="text" placeholder="Ex : 2× par jour..." value={frequence} onChange={e => setFrequence(e.target.value)} /></div>
            <div>
              <label className="lbl">Durée</label>
              <div className="g2">
                <input type="text" value={duree} onChange={e => { setDuree(e.target.value); if (errors.duree) setErrors({...errors, duree: ''}); }} placeholder="Ex : 7" style={errors.duree ? { borderColor: 'var(--red)' } : {}} />
                <select value={dureeUnite} onChange={e => setDureeUnite(e.target.value)}>
                  <option value="heures">heures</option>
                  <option value="jours">jours</option>
                  <option value="mois">mois</option>
                </select>
              </div>
              {errors.duree && <div style={{ fontSize: 11, color: 'var(--red)', marginTop: 3 }}>{errors.duree}</div>}
            </div>
          </div>
          <div className="g2 mb12">
            <div><label className="lbl">Date de début</label><input type="date" value={dateDebut} onChange={e => setDateDebut(e.target.value)} /></div>
            <div><label className="lbl">Heure de début</label><input type="time" value={heureDebut} onChange={e => setHeureDebut(e.target.value)} /></div>
          </div>
          <button className="badd" onClick={handleAdd} style={{ opacity: isAddValid ? 1 : 0.5 }}>
            <span className="ms" style={{ fontSize: 17 }}>add</span> Ajouter
          </button>
        </div>
        <div className="sh mb12">Prescriptions non médicamenteuses ajoutées</div>
        <div className="mb12">
          {items.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 20, color: 'var(--txt3)', fontSize: 13 }}>Aucune prescription ajoutée</div>
          ) : items.map(item => (
            <div key={item.id} className="rxi">
              <div className="rxi-ic"><span className="ms">{TYPE_ICON[item.type] ?? 'self_care'}</span></div>
              <div className="rxi-m">
                <h4>{item.typeLabel}</h4><p>{item.description}</p>
                {item.duree && <p style={{ fontSize: 11, color: 'var(--txt3)', marginTop: 3 }}>{item.duree}{item.frequence ? ` · ${item.frequence}` : ''}</p>}
                {(item.dateDebut || item.heureDebut) && <p style={{ fontSize: 11, color: 'var(--txt3)', marginTop: 2 }}>{item.dateDebut && `Début : ${item.dateDebut}`}{item.heureDebut && ` à ${item.heureDebut}`}</p>}
                {item.instructions && <p style={{ fontSize: 11, color: 'var(--txt3)', marginTop: 2 }}>{item.instructions}</p>}
              </div>
              <button className="bdel" onClick={() => handleDelete(item.id)}><span className="ms">delete</span></button>
            </div>
          ))}
        </div>
      </div>

      {/* COLONNE DROITE — sticky */}
      <div style={{ position: 'sticky', top: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div className="active-rx">
          <div className="active-rx-header"><span className="ms">pending_actions</span><span>Prescriptions en cours</span></div>
          {prescriptionsEnCours.length > 0 ? prescriptionsEnCours.map(p => (
            <div key={p.id} style={{ position: 'relative' }}>
              {p.items?.map((item, idx) => (
                <div key={`${p.id}-${idx}`} className="active-rx-item">
                  <strong>{item.typeLabel}</strong>
                  <span> — {item.description}{item.duree ? ` (${item.duree})` : ''}{item.frequence ? ` · ${item.frequence}` : ''}{p.prescripteur?.nom ? ` · Dr ${p.prescripteur.nom}` : ''}</span>
                  {p.notifierInfirmier && <span style={{ display: 'block', fontSize: 10, color: 'var(--navy)', marginTop: 2 }}>Infirmier notifié</span>}
                </div>
              ))}
              <button
                onClick={() => terminerPrescription(p.id)}
                title="Terminer cette prescription"
                style={{
                  position: 'absolute',
                  right: 4,
                  top: 4,
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--txt3)',
                  fontSize: 16,
                  lineHeight: 1,
                }}
              >
                <span className="ms">check_circle</span>
              </button>
            </div>
          )) : (
            <div className="active-rx-item"><span style={{ color: 'var(--txt3)' }}>Aucune prescription en cours</span></div>
          )}
        </div>

        <div className="card" style={{ padding: 12 }}>
          <label className="lbl">Instructions pour l'équipe soignante</label>
          <textarea rows={4} placeholder="Précisions pour l'équipe..." value={instructions} onChange={e => setInstructions(e.target.value)} />
        </div>
        <div className="card" style={{ padding: 12 }}>
          <div className="togr">
            <div className="togr-l"><p>Notifier les infirmiers</p><span>Envoyer une notification au service</span></div>
            <label className="tog"><input type="checkbox" checked={notifOn} onChange={e => setNotifOn(e.target.checked)}/><span className="tog-t"></span></label>
          </div>
          {notifOn && <div className="hint"><span className="ms" style={{ fontSize: 13, verticalAlign: 'middle', color: 'var(--navy)' }}>notifications_active</span> Notification envoyée aux infirmiers de garde.</div>}
        </div>

        {!canValidate && (
          <div style={{ fontSize: 11, color: 'var(--red)', textAlign: 'center', marginTop: -8 }}>
            Ajoutez au moins un soin.
          </div>
        )}
        <button className="bp" onClick={() => setShowModal(true)}
          style={{ opacity: canValidate && !loading ? 1 : 0.5, pointerEvents: canValidate && !loading ? "auto" : "none" }}>
          <span className="ms">check_circle</span>{loading ? "Envoi..." : "Valider"}
        </button>
      </div>

      {showModal && (
        <div className="mb op" onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}>
          <div className="mbox">
            <h3>Valider — Non Médicamenteuse</h3>
            <p>La prescription sera validée et transmise.</p>
            <div className="mbtns">
              <button className="bca" onClick={() => setShowModal(false)}>Annuler</button>
              <button className="bok" onClick={handleValidate}>Confirmer</button>
            </div>
          </div>
        </div>
      )}
      {toast && <div className="tst on"><span className="ms">check_circle</span>{toast}</div>}
    </div>
  );
}
