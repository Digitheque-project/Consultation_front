"use client";

import { useState, useRef, useEffect } from 'react';
import { openSummaryWindow } from '@/lib/printPrescription';
import { creerPrescriptionMedicale, getPrescriptionsPatient, updateStatutPrescription } from '@/lib/api';

interface Medicament {
  id: string;
  nom: string;
  dose: string;
  quantite: number;
  voie: string;
  frequence: string;
  duree: string;
  dateDebut: string;
  heureDebut: string;
  instructions: string;
  remarques: string;
}

interface PrescriptionEnCours {
  statut?: string;
  id: string;
  medicaments: { nom: string; dose: string; quantite: number; frequence: string; voie?: string; dateDebut?: string; duree?: string }[];
  prescripteur?: { nom: string };
  notifierInfirmier?: boolean;
  createdAt: string;
}

interface StockItem {
  code: string;
  nom: string;
  dose: string;
  conditionnement: string;
  stockDisponible: number;
}

const STOCK_MEDICAMENTS: StockItem[] = [
  { code: "PARA500", nom: "Paracétamol", dose: "500 mg", conditionnement: "1 plaquette (16 comprimés)", stockDisponible: 10 },
  { code: "PARA1G", nom: "Paracétamol", dose: "1 g", conditionnement: "1 boîte (8 comprimés effervescents)", stockDisponible: 5 },
  { code: "AMOX500", nom: "Amoxicilline", dose: "500 mg", conditionnement: "1 plaquette (12 gélules)", stockDisponible: 7 },
  { code: "AMOX1G", nom: "Amoxicilline", dose: "1 g", conditionnement: "1 flacon (poudre pour solution injectable IM/IV)", stockDisponible: 3 },
  { code: "CIPRO", nom: "Ciprofloxacine", dose: "500 mg", conditionnement: "1 boîte (10 comprimés pelliculés)", stockDisponible: 0 },
  { code: "METRO", nom: "Métronidazole", dose: "500 mg", conditionnement: "1 plaquette (20 comprimés)", stockDisponible: 4 },
  { code: "OMEP", nom: "Oméprazole", dose: "20 mg", conditionnement: "1 plaquette (14 gélules gastro-résistantes)", stockDisponible: 9 },
  { code: "FURO", nom: "Furosémide", dose: "40 mg", conditionnement: "1 boîte (30 comprimés sécables)", stockDisponible: 2 },
  { code: "METFORMIN", nom: "Metformine", dose: "500 mg", conditionnement: "1 plaquette (28 comprimés pelliculés)", stockDisponible: 6 },
  { code: "INSULINE", nom: "Insuline glargine", dose: "", conditionnement: "1 stylo prérempli (3 ml)", stockDisponible: 8 },
  { code: "SALBU", nom: "Salbutamol", dose: "100 µg/dose", conditionnement: "1 flacon aérosol inhalateur (200 doses)", stockDisponible: 0 },
  { code: "PRED", nom: "Prednisone", dose: "20 mg", conditionnement: "1 boîte (20 comprimés)", stockDisponible: 12 },
  { code: "IBU", nom: "Ibuprofène", dose: "400 mg", conditionnement: "1 boîte (30 comprimés pelliculés)", stockDisponible: 5 },
  { code: "TRAMADOL", nom: "Tramadol", dose: "50 mg", conditionnement: "1 plaquette (10 comprimés)", stockDisponible: 1 },
  { code: "CEFTRIAXONE", nom: "Ceftriaxone", dose: "1 g", conditionnement: "1 flacon (poudre pour solution injectable IM/IV)", stockDisponible: 15 },
];

interface Props {
  patient: { id: string; nom?: string; prenom?: string };
  prescripteur: { id?: string; nom?: string; prenom?: string; service?: string };
}

export default function MedicaleForm({ patient, prescripteur }: Props) {
  const [medicaments, setMedicaments] = useState<Medicament[]>([]);
  const [nom, setNom] = useState('');
  const [dose, setDose] = useState('');
  const [quantite, setQuantite] = useState(1);
  const [voie, setVoie] = useState('');
  const [frequence, setFrequence] = useState('');
  const [duree, setDuree] = useState('');
  const [dureeUnite, setDureeUnite] = useState('jours');
  const [dateDebut, setDateDebut] = useState('');
  const [heureDebut, setHeureDebut] = useState('');
  const [instructions, setInstructions] = useState('');
  const [remarques, setRemarques] = useState('');
  const [notifier, setNotifier] = useState(false);
  const [remarqueGenerale, setRemarqueGenerale] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [suggestions, setSuggestions] = useState<StockItem[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState('');
  const [toast, setToast] = useState('');
  const [showOrdModal, setShowOrdModal] = useState(false);
  const [showOrdonnanceModal, setShowOrdonnanceModal] = useState(false);
  const [ordonnanceItems, setOrdonnanceItems] = useState<Map<string, number>>(new Map());
  const [prescriptionsEnCours, setPrescriptionsEnCours] = useState<PrescriptionEnCours[]>([]);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const isFormValid = nom.trim() && dose.trim() && frequence && duree.trim() && !isNaN(Number(duree));
  const canValidate = medicaments.length > 0;

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

  function filterExpired(prescriptions: PrescriptionEnCours[]): PrescriptionEnCours[] {
    const now = Date.now();
    return prescriptions.filter(p => {
      if (p.statut !== 'ACTIVE') return false;
      return p.medicaments?.some(med => {
        if (!med.dateDebut || !med.duree) return true;
        const start = new Date(med.dateDebut).getTime();
        return (start + parseDureeMs(med.duree)) > now;
      });
    });
  }

  useEffect(() => {
    async function fetchPrescriptions() {
      try {
        const data = await getPrescriptionsPatient('medicale', patient.id);
        setPrescriptionsEnCours(filterExpired(data));
      } catch {}
    }
    fetchPrescriptions();
  }, [patient.id]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 2800); }

  const handleSearchChange = (value: string) => {
    setNom(value);
    if (value.trim().length > 0) {
      const q = value.toLowerCase();
      const filtered = STOCK_MEDICAMENTS.filter(med =>
        `${med.nom} ${med.dose} ${med.conditionnement}`.toLowerCase().includes(q)
      );
      setSuggestions(filtered);
      setShowSuggestions(filtered.length > 0);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const selectSuggestion = (med: StockItem) => {
    const nomComplet = `${med.nom} ${med.dose} — ${med.conditionnement}`;
    setNom(nomComplet);
    setShowSuggestions(false);
  };

  function validateAddForm(): boolean {
    const newErrors: Record<string, string> = {};
    if (!nom.trim()) newErrors.nom = 'Le médicament est requis';
    if (!dose.trim()) newErrors.dose = 'La dose est requise';
    if (!frequence) newErrors.frequence = 'La fréquence est requise';
    if (!duree.trim() || isNaN(Number(duree))) newErrors.duree = 'Veuillez entrer un nombre valide';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  const ajouterMedicament = () => {
    if (!validateAddForm()) return;
    const dureeComplete = `${duree} ${dureeUnite}`;
    setMedicaments([...medicaments, {
      id: Date.now().toString(),
      nom, dose, quantite, voie, frequence, duree: dureeComplete,
      dateDebut, heureDebut, instructions, remarques
    }]);
    setNom(''); setDose(''); setQuantite(1); setVoie(''); setFrequence('');
    setDuree(''); setDureeUnite('jours'); setDateDebut(''); setHeureDebut('');
    setInstructions(''); setRemarques(''); setErrors({});
    setShowSuggestions(false);
  };

  const supprimerMedicament = (id: string) => { setMedicaments(medicaments.filter(m => m.id !== id)); };

  async function refreshPrescriptionsEnCours() {
    try {
      const data = await getPrescriptionsPatient('medicale', patient.id);
      setPrescriptionsEnCours(filterExpired(data));
    } catch {}
  }

  function buildMedicaleSummary(meds: Medicament[], remarques: string, notifier: boolean): string {
    const now = new Date().toLocaleString('fr-FR');
    let html = `<div class="card"><div class="patient">Date : ${now}</div>`;
    meds.forEach(m => {
      html += `
        <div class="medicament">
          <span class="nom">${m.nom} ${m.dose}</span>
          <span class="detail">Quantité : ${m.quantite} · ${m.frequence}${m.voie ? ` · ${m.voie.toLowerCase()}` : ''} · Pendant ${m.duree}.</span>
        </div>`;
    });
    if (remarques) html += `<div class="notice">⚠️ ${remarques}</div>`;
    if (notifier) html += `<div class="notice"><span class="badge badge-success">✅ Infirmier notifié</span></div>`;
    html += `</div>`;
    return html;
  }

  async function handleSubmitPrescription() {
    if (!canValidate) return;
    setErrors({});
    setLoading(true);
    setApiError('');
    try {
      const result = await creerPrescriptionMedicale({
        patientId: patient.id,
        prescripteurId: prescripteur.id,
        remarques: remarqueGenerale,
        notifierInfirmier: notifier,
        medicaments: medicaments.map(({ id, dateDebut, heureDebut, duree, ...rest }) => ({
          ...rest,
          quantite: rest.quantite,
          duree,
          dateDebut: dateDebut || undefined,
          heureDebut: heureDebut || undefined,
        })),
      });
      if (notifier && result?.id) {

      }
      openSummaryWindow('Prescription médicamenteuse', buildMedicaleSummary(medicaments, remarqueGenerale, notifier));
      showToast('Prescription médicamenteuse validée');
      setMedicaments([]);
      setRemarqueGenerale('');
      setNotifier(false);
      await refreshPrescriptionsEnCours();
    } catch {
      setApiError("Erreur lors de l'envoi de la prescription.");
    } finally {
      setLoading(false);
    }
  }

  function openOrdonnanceModal() {
    const map = new Map<string, number>();
    medicaments.forEach(m => map.set(m.id, m.quantite));
    setOrdonnanceItems(map);
    setShowOrdModal(false);
    setShowOrdonnanceModal(true);
  }

  async function handleCreateOrdonnance() {
    if (!canValidate) return;
    setErrors({});
    setLoading(true);
    setApiError('');
    try {
      const result = await creerPrescriptionMedicale({
        patientId: patient.id,
        prescripteurId: prescripteur.id,
        remarques: remarqueGenerale,
        notifierInfirmier: notifier,
        medicaments: medicaments.map(({ id, dateDebut, heureDebut, duree, ...rest }) => ({
          ...rest,
          quantite: rest.quantite,
          duree,
          dateDebut: dateDebut || undefined,
          heureDebut: heureDebut || undefined,
        })),
      });
      if (notifier && result?.id) {

      }
      openSummaryWindow('Ordonnance transmise à la pharmacie', buildMedicaleSummary(medicaments, remarqueGenerale, notifier));
      const medsPourOrdonnance = medicaments
        .filter(m => (ordonnanceItems.get(m.id) ?? 0) > 0)
        .map(m => ({
          nom: m.nom, dose: m.dose, quantite: ordonnanceItems.get(m.id) ?? m.quantite,
        }));
      showToast('Ordonnance créée avec les médicaments sélectionnés');
      setMedicaments([]);
      setRemarqueGenerale('');
      setNotifier(false);
      setShowOrdonnanceModal(false);
      await refreshPrescriptionsEnCours();
    } catch {
      setApiError("Erreur lors de la création de l'ordonnance.");
    } finally {
      setLoading(false);
    }
  }

  async function terminerPrescription(id: string) {
    try {
      await updateStatutPrescription('medicale', id, 'TERMINEE');
      await refreshPrescriptionsEnCours();
    } catch {
      console.error('Erreur terminaison prescription');
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
          <div className="mb12" ref={wrapperRef} style={{ position: 'relative' }}>
            <label className="lbl">Médicament <span className="req">*</span></label>
            <div className="iw">
              <input type="text" value={nom}
                onChange={e => { handleSearchChange(e.target.value); if (errors.nom) setErrors({...errors, nom: ''}); }}
                onFocus={() => { if (nom.trim().length > 0) setShowSuggestions(true); }}
                placeholder="Rechercher dans le stock pharmacie..."
                style={errors.nom ? { borderColor: 'var(--red)' } : {}} />
              <span className="ico"><span className="ms">search</span></span>
            </div>
            {errors.nom && <div style={{ fontSize: 11, color: 'var(--red)', marginTop: 3 }}>{errors.nom}</div>}
            {showSuggestions && suggestions.length > 0 && (
              <ul style={{ position: 'absolute', left: 0, right: 0, top: '100%', marginTop: 2, background: 'var(--card)', border: '1px solid var(--bdr)', borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.15)', zIndex: 30, maxHeight: 200, overflowY: 'auto', listStyle: 'none', padding: 0, margin: 0 }}>
                {suggestions.map((med) => (
                  <li key={med.code} onMouseDown={() => selectSuggestion(med)}
                    style={{ padding: '8px 12px', cursor: 'pointer', fontSize: 13, borderBottom: '1px solid var(--bdr)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>{med.nom} {med.dose} — {med.conditionnement}</span>
                    <span style={{
                      fontSize: 11,
                      color: med.stockDisponible > 0 ? 'var(--green)' : 'var(--red)',
                      marginLeft: 8,
                      fontWeight: 600
                    }}>
                      {med.stockDisponible > 0 ? `${med.stockDisponible} dispo` : 'Rupture'}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <p className="hint">Le médicament est recherché dans le stock en détail de la pharmacie.</p>
          </div>
          {/* Le reste du formulaire reste inchangé */}
          <div className="g2 mb12">
            <div>
              <label className="lbl">Dose <span className="req">*</span></label>
              <input type="text" value={dose} onChange={e => { setDose(e.target.value); if (errors.dose) setErrors({...errors, dose: ''}); }} placeholder="Ex : 1g, 500mg" style={errors.dose ? { borderColor: 'var(--red)' } : {}} />
              {errors.dose && <div style={{ fontSize: 11, color: 'var(--red)', marginTop: 3 }}>{errors.dose}</div>}
            </div>
            <div><label className="lbl">Quantité</label><input type="number" min={1} value={quantite} onChange={e => setQuantite(Math.max(1, parseInt(e.target.value) || 1))} /></div>
          </div>
          <div className="mb12"><label className="lbl">Voie d'administration</label><select value={voie} onChange={e => setVoie(e.target.value)}><option value="">Sélectionner</option><option>Orale (per os)</option><option>Intraveineuse (IV)</option><option>Intramusculaire (IM)</option><option>Sous-cutanée (SC)</option><option>Rectale</option><option>Topique / locale</option><option>Inhalation</option><option>Sublinguale</option></select></div>
          <div className="g2 mb12">
            <div>
              <label className="lbl">Fréquence <span className="req">*</span></label>
              <input type="text" list="frequences-list" value={frequence} onChange={e => { setFrequence(e.target.value); if (errors.frequence) setErrors({...errors, frequence: ''}); }} placeholder="Sélectionner ou saisir..." style={errors.frequence ? { borderColor: 'var(--red)' } : {}} />
              <datalist id="frequences-list">
                <option value="1× par jour" />
                <option value="2× par jour (toutes les 12h)" />
                <option value="3× par jour (toutes les 8h)" />
                <option value="4× par jour (toutes les 6h)" />
                <option value="Toutes les 4h" />
                <option value="En continu (perfusion)" />
                <option value="Si besoin (SOS)" />
                <option value="Dose unique" />
              </datalist>
              {errors.frequence && <div style={{ fontSize: 11, color: 'var(--red)', marginTop: 3 }}>{errors.frequence}</div>}
            </div>
            <div>
              <label className="lbl">Durée <span className="req">*</span></label>
              <div className="g2">
                <input type="text" value={duree} onChange={e => { setDuree(e.target.value); if (errors.duree) setErrors({...errors, duree: ''}); }} placeholder="Ex : 7" style={errors.duree ? { borderColor: 'var(--red)' } : {}} />
                <select value={dureeUnite} onChange={e => setDureeUnite(e.target.value)}><option value="heures">heures</option><option value="jours">jours</option><option value="mois">mois</option></select>
              </div>
              {errors.duree && <div style={{ fontSize: 11, color: 'var(--red)', marginTop: 3 }}>{errors.duree}</div>}
            </div>
          </div>
          <div className="g2 mb12">
            <div><label className="lbl">Date de début</label><input type="date" value={dateDebut} onChange={e => setDateDebut(e.target.value)}/></div>
            <div><label className="lbl">Heure de début</label><input type="time" value={heureDebut} onChange={e => setHeureDebut(e.target.value)}/></div>
          </div>
          <div className="mb12"><label className="lbl">Instructions d'utilisation</label><input type="text" value={instructions} onChange={e => setInstructions(e.target.value)} placeholder="Ex : à prendre après les repas..."/></div>
          <div className="mb12"><label className="lbl">Remarques</label><input type="text" value={remarques} onChange={e => setRemarques(e.target.value)} placeholder="Précisions complémentaires..."/></div>
          <button className="badd" onClick={ajouterMedicament} style={{ opacity: isFormValid ? 1 : 0.5 }}>
            <span className="ms" style={{fontSize:17}}>add</span> Ajouter à la prescription
          </button>
        </div>

        <div className="sh mb12">Prescriptions ajoutées{' '}<span style={{background:'var(--navy)',color:'#fff',borderRadius:'10px',padding:'1px 7px',fontSize:'10px',marginLeft:'5px'}}>{medicaments.length}</span></div>
        <div className="mb12">
          {medicaments.length === 0 ? (
            <div style={{textAlign:'center',padding:'20px',color:'var(--txt3)',fontSize:'13px'}}>Aucune prescription médicamenteuse ajoutée</div>
          ) : medicaments.map(m => (
            <div key={m.id} className="rxi">
              <div className="rxi-ic"><span className="ms">medication</span></div>
              <div className="rxi-m">
                <h4>{m.nom} {m.dose} — qté : {m.quantite}</h4>
                <p>{m.frequence} · {m.duree} {m.voie && `· ${m.voie}`}</p>
                {(m.dateDebut || m.heureDebut) && <p style={{fontSize:11,color:'var(--txt3)',marginTop:3}}>{m.dateDebut && `Début : ${m.dateDebut}`}{m.heureDebut && ` à ${m.heureDebut}`}</p>}
                {m.instructions && <p style={{fontSize:11,color:'var(--txt3)',marginTop:2}}>{m.instructions}</p>}
              </div>
              <button className="bdel" onClick={() => supprimerMedicament(m.id)}><span className="ms">delete</span></button>
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
              {p.medicaments?.map((med, idx) => (
                <div key={`${p.id}-${idx}`} className="active-rx-item">
                  <strong>{med.nom} {med.dose}</strong>
                  <span> — qté: {med.quantite} · {med.frequence}{med.voie ? ` · ${med.voie}` : ''}{p.prescripteur ? ` · Dr ${p.prescripteur.nom}` : ''}</span>
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
          <label className="lbl">Remarques générales</label>
          <textarea rows={3} placeholder="Notes complémentaires..." value={remarqueGenerale} onChange={e => setRemarqueGenerale(e.target.value)}></textarea>
        </div>

        <div className="card" style={{ padding: 12 }}>
          <div className="togr">
            <div className="togr-l"><p>Notifier les infirmiers</p><span>Envoyer une notification au service</span></div>
            <label className="tog"><input type="checkbox" checked={notifier} onChange={e => setNotifier(e.target.checked)}/><span className="tog-t"></span></label>
          </div>
          {notifier && <div className="hint"><span className="ms" style={{fontSize:13,verticalAlign:'middle',color:'var(--navy)'}}>notifications_active</span> Notification envoyée aux <strong>infirmiers de garde</strong>.</div>}
        </div>

        {!canValidate && (
          <div style={{ fontSize: 11, color: 'var(--red)', textAlign: 'center', marginTop: -8 }}>
            Ajoutez au moins un médicament.
          </div>
        )}
        <button className="bp" onClick={() => setShowOrdModal(true)}
          style={{ opacity: canValidate && !loading ? 1 : 0.5, pointerEvents: canValidate && !loading ? "auto" : "none" }}>
          <span className="ms">check_circle</span>{loading ? "Envoi..." : "Valider la prescription"}
        </button>
      </div>

      {/* Première modale : démander ordonnance */}
      {showOrdModal && (
        <div className="mb op" onClick={e => { if (e.target === e.currentTarget) setShowOrdModal(false); }}>
          <div className="mbox">
            <h3>Prescription validée</h3>
            <p>Souhaitez-vous créer une ordonnance pour la pharmacie ?</p>
            <div className="mbtns">
              <button className="bca" onClick={handleSubmitPrescription} disabled={loading}>Non, merci</button>
              <button className="bok" onClick={openOrdonnanceModal} disabled={loading}>
                <span className="ms" style={{fontSize:'16px'}}>description</span> Créer une ordonnance
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Deuxième modale : ajuster les quantités pour l'ordonnance */}
      {showOrdonnanceModal && (
        <div className="mb op" onClick={e => { if (e.target === e.currentTarget) setShowOrdonnanceModal(false); }}>
          <div className="mbox" style={{ maxWidth: 500, width: '90%' }}>
            <h3>Ordonnance — Ajuster les quantités</h3>
            <p style={{ fontSize: 12, marginBottom: 16 }}>Modifiez les quantités à délivrer par la pharmacie.</p>
            <div style={{ maxHeight: 300, overflowY: 'auto', marginBottom: 16 }}>
              {medicaments.map(m => {
                const qte = ordonnanceItems.get(m.id) ?? 0;
                return (
                  <div key={m.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--bdr)' }}>
                    <div style={{ flex: 1 }}>
                      <strong style={{ fontSize: 13 }}>{m.nom} {m.dose}</strong>
                      <span style={{ fontSize: 11, color: 'var(--txt3)', display: 'block' }}>{m.frequence} · {m.duree}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <input
                        type="number"
                        min={0}
                        value={qte}
                        onChange={e => {
                          const newMap = new Map(ordonnanceItems);
                          newMap.set(m.id, Math.max(0, parseInt(e.target.value) || 0));
                          setOrdonnanceItems(newMap);
                        }}
                        style={{ width: 70, textAlign: 'center' }}
                      />
                      <button
                        onClick={() => {
                          const newMap = new Map(ordonnanceItems);
                          newMap.set(m.id, 0);
                          setOrdonnanceItems(newMap);
                        }}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--txt3)' }}
                        title="Retirer de l'ordonnance">
                        <span className="ms">delete</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mbtns">
              <button className="bca" onClick={() => setShowOrdonnanceModal(false)}>Annuler</button>
              <button className="bok" onClick={handleCreateOrdonnance} disabled={loading}>
                Valider l'ordonnance
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className="tst on"><span className="ms">check_circle</span>{toast}</div>}
    </div>
  );
}
