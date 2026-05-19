'use client';

import { useState, useEffect } from 'react';
import { openSummaryWindow } from '@/lib/printPrescription';
import { creerPrescriptionSurveillance, getPrescriptionsPatient, updateStatutPrescription } from '@/lib/api';

interface SvItem {
  id: string; parametre: string; parametreLabel: string; customNom: string; customDesc: string;
  customUnite: string; customTarget: string; taille: string; sngTypes: string[]; sngRemarques: string;
  drainLocalisation: string; drainTypes: string[]; frequence: string; duree: string; seuil: string;
}

interface SurveillanceEnCours {
  id: string;
  parametres: { parametre: string; frequence: string; duree?: string; seuil?: string }[];
  notifierInfirmier?: boolean;
  prescripteur?: { nom: string };
}

const PARAMS = [
  { group: 'Hémodynamique', options: [
    { value: 'ta', label: 'Tension artérielle (TA)', desc: 'Mesurer TA systolique et diastolique. Alerter si > 160/90 ou < 90/60.' },
    { value: 'fc', label: 'Fréquence cardiaque (FC)', desc: 'Compter le pouls sur 1 minute. Alerter si > 120 ou < 50 bpm.' },
    { value: 'spo2', label: 'Saturation en oxygène (SpO₂)', desc: 'Mesurer avec oxymètre de pouls. Alerter si < 94%.' },
    { value: 'fr', label: 'Fréquence respiratoire (FR)', desc: 'Compter les cycles respiratoires. Alerter si > 25 ou < 10/min.' },
  ]},
  { group: 'Neurologique', options: [
    { value: 'glasgow', label: 'Score de Glasgow', desc: 'Évaluer ouverture yeux, réponse verbale, réponse motrice. Alerter si < 13.' },
    { value: 'eva', label: 'Douleur (EVA 0–10)', desc: 'Évaluation visuelle analogique. Alerter si EVA > 6.' },
  ]},
  { group: 'Métabolique / Biologique', options: [
    { value: 'temp', label: 'Température', desc: 'Mesure axillaire ou tympanique. Alerter si > 38.5°C ou < 36°C.' },
    { value: 'glyc', label: 'Glycémie capillaire', desc: 'Dextro au bout du doigt. Alerter si < 0.6 g/l ou > 2.5 g/l.' },
    { value: 'imc', label: 'IMC', desc: 'Calcul automatique à partir du poids et de la taille renseignée.' },
  ]},
  { group: 'Diurèse / Hydrique', options: [
    { value: 'diur', label: 'Diurèse', desc: 'Mesurer la quantité d\'urines émises. Alerter si < 0.5 ml/kg/h.' },
    { value: 'bilan', label: 'Bilan entrée/sortie', desc: 'Comptabiliser tous les apports (IV, oraux) et les pertes (urines, drain...).' },
    { value: 'poids', label: 'Poids', desc: 'Peser le patient dans les mêmes conditions.' },
    { value: 'perim', label: 'Périmètre abdominal', desc: 'Mesurer à ombilic. Utile pour surveillance ascite ou grossesse.' },
  ]},
  { group: 'Dispositifs médicaux', options: [
    { value: 'sng', label: 'SNG', desc: 'Surveiller la sonde naso-gastrique : résidu, perméabilité, position.' },
    { value: 'drain', label: 'Drain', desc: 'Surveiller le drain : volume, aspect, perméabilité, point d\'insertion.' },
  ]},
  { group: 'Autre', options: [
    { value: 'custom', label: 'Paramètre personnalisé', desc: '' },
  ]},
];

const PARAM_LABEL: Record<string, string> = {}; const PARAM_DESC: Record<string, string> = {}; 
PARAMS.forEach(g => g.options.forEach(o => { PARAM_LABEL[o.value] = o.label; PARAM_DESC[o.value] = o.desc; }));
const SNG_TYPES = ['Résidu gastrique', 'Volume aspiré', 'Aspect', 'Perméabilité', 'Position'];
const DRAIN_TYPES = ['Volume drainé', 'Aspect', 'Perméabilité', 'Point insertion'];
const FREQ_OPTIONS = ['Toutes les heures', 'Toutes les 2h', 'Toutes les 4h', 'Toutes les 6h', 'Toutes les 8h', 'Toutes les 12h', '1× par jour', 'Avant chaque repas', 'En continu'];

interface Props {
  patient: { id: string; nom?: string; prenom?: string };
  prescripteur: { id?: string; nom?: string; prenom?: string; service?: string };
}

export default function SurveillanceForm({ patient, prescripteur }: Props) {
  const [urgence, setUrgence] = useState<'n'|'u'|'tu'>('n');
  const [alertes, setAlertes] = useState('');
  const [parametre, setParametre] = useState(''); const [customNom, setCustomNom] = useState(''); const [customDesc, setCustomDesc] = useState('');
  const [customUnite, setCustomUnite] = useState(''); const [customTarget, setCustomTarget] = useState(''); const [taille, setTaille] = useState('');
  const [sngTypes, setSngTypes] = useState<string[]>([]); const [sngRemarques, setSngRemarques] = useState('');
  const [drainLocalisation, setDrainLocalisation] = useState(''); const [drainTypes, setDrainTypes] = useState<string[]>([]);
  const [frequence, setFrequence] = useState(''); const [duree, setDuree] = useState('');
  const [dureeUnite, setDureeUnite] = useState('jours');
  const [seuil, setSeuil] = useState('');
  const [items, setItems] = useState<SvItem[]>([]); const [notifOn, setNotifOn] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showModal, setShowModal] = useState(false); const [toast, setToast] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState('');
  const [prescriptionsEnCours, setPrescriptionsEnCours] = useState<SurveillanceEnCours[]>([]);

  const canValidate = items.length > 0;
  const isAddValid = parametre && frequence && duree.trim() && (Number(duree) > 0);
  const urgenceClasses: Record<string, string> = { n: "un", u: "uu", tu: "utu" };

  useEffect(() => {
    async function fetchSurveillances() {
      try {
        const data = await getPrescriptionsPatient('surveillance', patient.id);
        setPrescriptionsEnCours(data.filter((p: any) => p.statut === 'ACTIVE'));
      } catch {}
    }
    fetchSurveillances();
  }, [patient.id]);

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 2800); }
  function toggleCheck(list: string[], setList: (v: string[]) => void, val: string) { setList(list.includes(val) ? list.filter(x => x !== val) : [...list, val]); }

  function validateAddForm(): boolean {
    const newErrors: Record<string, string> = {};
    if (!parametre) newErrors.parametre = 'Le paramètre est requis';
    if (!frequence) newErrors.frequence = 'La fréquence est requise';
    if (!duree.trim() || isNaN(Number(duree))) newErrors.duree = 'Veuillez entrer un nombre valide';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function handleAdd() {
    if (!validateAddForm()) return;
    const dureeComplete = `${duree} ${dureeUnite}`;
    setItems(prev => [...prev, {
      id: Date.now().toString(), parametre, parametreLabel: parametre === 'custom' ? customNom || 'Paramètre personnalisé' : PARAM_LABEL[parametre] ?? parametre,
      customNom, customDesc, customUnite, customTarget, taille, sngTypes, sngRemarques,
      drainLocalisation, drainTypes, frequence, duree: dureeComplete, seuil
    }]);
    setParametre(''); setCustomNom(''); setCustomDesc(''); setCustomUnite(''); setCustomTarget(''); setTaille('');
    setSngTypes([]); setSngRemarques(''); setDrainLocalisation(''); setDrainTypes([]);
    setFrequence(''); setDuree(''); setDureeUnite('jours'); setSeuil(''); setErrors({});
  }
  function handleDelete(id: string) { setItems(prev => prev.filter(i => i.id !== id)); }

  async function refreshPrescriptions() {
    try {
      const data = await getPrescriptionsPatient('surveillance', patient.id);
      setPrescriptionsEnCours(data.filter((p: any) => p.statut === 'ACTIVE'));
    } catch {}
  }

  async function terminerPrescription(id: string) {
    try {
      await updateStatutPrescription('surveillance', id, 'TERMINEE');
      await refreshPrescriptions();
    } catch { console.error('Erreur terminaison'); }
  }

  function buildSurvSummary(itemsList: SvItem[], notifier: boolean): string {
    const now = new Date().toLocaleString('fr-FR');
    let html = `<div class="card"><div class="patient">Date : ${now}</div>`;
    itemsList.forEach(item => {
      const label = PARAM_LABEL[item.parametre] || item.parametreLabel;
      html += `
        <div class="medicament">
          <span class="nom">${label}</span>
          <span class="detail">Fréquence : ${item.frequence} · Durée : ${item.duree}${item.seuil ? ` · Seuil : ${item.seuil}` : ''}.</span>
        </div>`;
    });
    if (notifier) html += `<div class="notice"><span class="badge badge-success">✅ Infirmier notifié</span></div>`;
    html += `</div>`;
    return html;
  }

  async function handleSubmit() {
    setShowModal(false);
    setLoading(true);
    setApiError('');
    try {
      const result = await creerPrescriptionSurveillance({
        patientId: patient.id,
        prescripteurId: prescripteur.id,
        notes,
        notifierInfirmier: notifOn,
        parametres: items.map(({ id, parametreLabel, customNom, customDesc, customUnite, customTarget, taille, sngTypes, sngRemarques, drainLocalisation, drainTypes, ...rest }) => rest),
      });
      if (notifOn && result?.id) {
      }
      openSummaryWindow('Prescription de surveillance', buildSurvSummary(items, notifOn));
      showToast('Surveillance validée');
      setItems([]);
      setNotes('');
      setNotifOn(false);
      setUrgence('n');
      setAlertes('');
      await refreshPrescriptions();
    } catch {
      setApiError("Erreur lors de l'envoi. Vérifiez la connexion.");
    } finally {
      setLoading(false);
    }
  }

  const desc = PARAM_DESC[parametre] ?? '';

  return (
    <div>

      {apiError && <div style={{ background: "var(--red-lt)", border: "1px solid var(--red-bdr)", borderRadius: 8, padding: "10px 12px", fontSize: 12, color: "var(--red)", marginBottom: 12 }}>{apiError}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 16, alignItems: 'start' }}>
        {/* COLONNE GAUCHE */}
        <div>
          <div className="card mb12" style={{ padding: 12 }}>
            <div className="mb12">
              <label className="lbl">Paramètre à surveiller <span className="req">*</span></label>
              <select value={parametre} onChange={e => { setParametre(e.target.value); if (errors.parametre) setErrors({...errors, parametre: ''}); }} style={errors.parametre ? { borderColor: 'var(--red)' } : {}}>
                <option value="">Sélectionner un paramètre</option>
                {PARAMS.map(g => <optgroup key={g.group} label={g.group}>{g.options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</optgroup>)}
              </select>
              {errors.parametre && <div style={{ fontSize: 11, color: 'var(--red)', marginTop: 3 }}>{errors.parametre}</div>}
            </div>
            {desc && <div style={{ background: 'var(--navy-lt)', border: '1px solid var(--navy)', borderRadius: 9, padding: 11, marginBottom: 12, fontSize: 12, color: 'var(--navy)' }}>{desc}</div>}
            {parametre === 'custom' && (
              <div>
                <div className="mb12"><label className="lbl">Nom du paramètre <span className="req">*</span></label><input type="text" value={customNom} onChange={e => setCustomNom(e.target.value)} placeholder="Nom du paramètre à surveiller..." /></div>
                <div className="mb12"><label className="lbl">Description</label><input type="text" value={customDesc} onChange={e => setCustomDesc(e.target.value)} placeholder="Décrire ce qui doit être surveillé..." /></div>
                <div className="g2 mb12"><div><label className="lbl">Unité de mesure</label><input type="text" value={customUnite} onChange={e => setCustomUnite(e.target.value)} placeholder="Ex : ml, cm, mmHg..." /></div><div><label className="lbl">Valeurs normales</label><input type="text" value={customTarget} onChange={e => setCustomTarget(e.target.value)} placeholder="Plage de valeurs normales..." /></div></div>
              </div>
            )}
            {parametre === 'imc' && <div className="mb12"><label className="lbl">Taille du patient (cm) <span className="req">*</span></label><input type="text" value={taille} onChange={e => setTaille(e.target.value)} placeholder="Nécessaire au calcul de l'IMC" /></div>}
            {parametre === 'sng' && (
              <div className="mb12"><label className="lbl">Type de surveillance SNG</label><div className="g2 mb8">{SNG_TYPES.map(t => <label key={t} className="rc"><input type="checkbox" checked={sngTypes.includes(t)} onChange={() => toggleCheck(sngTypes, setSngTypes, t)} style={{ accentColor: 'var(--navy)' }} /><span>{t}</span></label>)}</div>
                <label className="lbl">Remarques</label><input type="text" value={sngRemarques} onChange={e => setSngRemarques(e.target.value)} placeholder="Ex : sonde CH 14..." /></div>
            )}
            {parametre === 'drain' && (
              <div className="mb12"><label className="lbl">Localisation du drain</label><input type="text" value={drainLocalisation} onChange={e => setDrainLocalisation(e.target.value)} placeholder="Ex : drain de Redon fosse iliaque droite..." className="mb12" />
                <label className="lbl">Type de surveillance drain</label><div className="g2">{DRAIN_TYPES.map(t => <label key={t} className="rc"><input type="checkbox" checked={drainTypes.includes(t)} onChange={() => toggleCheck(drainTypes, setDrainTypes, t)} style={{ accentColor: 'var(--navy)' }} /><span>{t}</span></label>)}</div>
              </div>
            )}
            <div className="g2 mb12">
              <div>
                <label className="lbl">Fréquence <span className="req">*</span></label>
                <select value={frequence} onChange={e => { setFrequence(e.target.value); if (errors.frequence) setErrors({...errors, frequence: ''}); }} style={errors.frequence ? { borderColor: 'var(--red)' } : {}}>
                  <option value="">Sélectionner</option>{FREQ_OPTIONS.map(f => <option key={f}>{f}</option>)}
                </select>
                {errors.frequence && <div style={{ fontSize: 11, color: 'var(--red)', marginTop: 3 }}>{errors.frequence}</div>}
              </div>
              <div>
                <label className="lbl">Durée</label>
                <div className="g2">
                  <input type="text" value={duree} onChange={e => { setDuree(e.target.value); if (errors.duree) setErrors({...errors, duree: ''}); }} placeholder="Ex : 48" style={errors.duree ? { borderColor: 'var(--red)' } : {}} />
                  <select value={dureeUnite} onChange={e => setDureeUnite(e.target.value)}>
                    <option value="heures">heures</option>
                    <option value="jours">jours</option>
                    <option value="mois">mois</option>
                  </select>
                </div>
                {errors.duree && <div style={{ fontSize: 11, color: 'var(--red)', marginTop: 3 }}>{errors.duree}</div>}
              </div>
            </div>
            <div className="mb12"><label className="lbl">Valeurs cibles / Seuils d'alerte</label><input type="text" value={seuil} onChange={e => setSeuil(e.target.value)} placeholder="Ex : TA > 160/90 → alerter médecin..." /></div>
            <button className="badd" onClick={handleAdd} style={{ opacity: isAddValid ? 1 : 0.5 }}><span className="ms" style={{ fontSize: 17 }}>add</span> Ajouter la surveillance</button>
          </div>

          <div className="sh">Surveillances ajoutées</div>
          <div className="mb12">
            {items.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 20, color: 'var(--txt3)', fontSize: 13 }}>Aucune surveillance ajoutée</div>
            ) : items.map(item => (
              <div key={item.id} className="rxi"><div className="rxi-ic"><span className="ms">monitor_heart</span></div><div className="rxi-m"><h4>{item.parametreLabel}</h4><p>{item.frequence}{item.duree && ` · ${item.duree}`}</p>{item.seuil && <p style={{ fontSize: 11, color: 'var(--txt3)', marginTop: 3 }}>{item.seuil}</p>}</div><button className="bdel" onClick={() => handleDelete(item.id)}><span className="ms">delete</span></button></div>
            ))}
          </div>
        </div>

        {/* COLONNE DROITE — sticky */}
        <div style={{ position: 'sticky', top: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="active-rx">
            <div className="active-rx-header"><span className="ms">pending_actions</span><span>Surveillances en cours</span></div>
            {prescriptionsEnCours.length > 0 ? prescriptionsEnCours.map(p => (
              <div key={p.id} style={{ position: 'relative' }}>
                {p.parametres?.map((param, idx) => (
                  <div key={`${p.id}-${idx}`} className="active-rx-item">
                    <strong>{PARAM_LABEL[param.parametre] || param.parametre}</strong>
                    <span> — {param.frequence}{param.duree ? ` · ${param.duree}` : ''}{param.seuil ? ` (seuil: ${param.seuil})` : ''}{p.prescripteur?.nom ? ` · Dr ${p.prescripteur.nom}` : ''}</span>
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
              <div className="active-rx-item"><span style={{ color: 'var(--txt3)' }}>Aucune surveillance en cours</span></div>
            )}
          </div>

          <div className="card" style={{ padding: 8 }}>
            <label className="lbl">Degré d'urgence <span className="req">*</span></label>
            <div className={`urgr ${urgenceClasses[urgence]}`} style={{ marginBottom: 8 }}>
              <div className="urgd" />
              <select className="urgs" value={urgence} onChange={e => setUrgence(e.target.value as 'n'|'u'|'tu')}>
                <option value="n">Normal</option>
                <option value="u">Urgent</option>
                <option value="tu">STAT</option>
              </select>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
              <span className="ms" style={{ fontSize: 16, color: "var(--red)" }}>warning</span>
              <span className="lbl" style={{ margin: 0 }}>Précautions &amp; Alertes</span>
            </div>
            <textarea rows={1} value={alertes} onChange={e => setAlertes(e.target.value)}
              placeholder="Allergies, contre-indications..."
              style={{ background: "var(--red-lt)", border: "1.5px solid var(--red-bdr)", padding: '8px 12px' }} />
          </div>
          <div className="card" style={{ padding: 12 }}>
            <label className="lbl">Notes complémentaires</label>
            <textarea rows={3} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Instructions supplémentaires pour l'équipe..." />
          </div>
          <div className="card" style={{ padding: 12 }}>
            <div className="togr">
              <div className="togr-l"><p>Notifier les infirmiers de garde</p><span>Envoyer une notification au service clinique</span></div>
              <label className="tog"><input type="checkbox" checked={notifOn} onChange={e => setNotifOn(e.target.checked)}/><span className="tog-t"></span></label>
            </div>
            {notifOn && <div className="hint"><span className="ms" style={{ fontSize: 13, verticalAlign: 'middle', color: 'var(--navy)' }}>notifications_active</span> Notification envoyée aux infirmiers de garde du service.</div>}
          </div>

          {!canValidate && (
            <div style={{ fontSize: 11, color: 'var(--red)', textAlign: 'center', marginTop: -8 }}>
              Ajoutez au moins une surveillance.
            </div>
          )}
          <button className="bp" onClick={() => setShowModal(true)}
            style={{ opacity: canValidate && !loading ? 1 : 0.5, pointerEvents: canValidate && !loading ? "auto" : "none", marginTop: 0 }}>
            <span className="ms">check_circle</span>{loading ? "Envoi..." : "Valider"}
          </button>
        </div>
      </div>

      {showModal && <div className="mb op" onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}><div className="mbox"><h3>Valider — Surveillance</h3><p>La prescription sera validée et transmise.</p><div className="mbtns"><button className="bca" onClick={() => setShowModal(false)}>Annuler</button><button className="bok" onClick={handleSubmit}>Confirmer</button></div></div></div>}
      {toast && <div className="tst on"><span className="ms">check_circle</span>{toast}</div>}
    </div>
  );
}
