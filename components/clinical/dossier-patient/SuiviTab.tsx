'use client';

import { useState, useEffect } from 'react';
import { dossierPatientApi as api } from '@/lib/clinical/dossier-patient-api';
import { EhrFormSection } from '@/components/clinical/dossier-patient/EhrFormSection';
import { ehr } from '@/lib/clinical/ehr-theme';

interface Suivi {
  id: string;
  jourHospitalisation?: string;
  temperature?: number;
  taSystolique?: string;
  taDiastolique?: string;
  frequenceCardiaque?: string;
  frequenceRespiratoire?: string;
  evaDouleur?: number;
  etatGeneral?: string;
  examenClinique?: string;
  evolution?: string;
  signesAlerte?: boolean;
  auteur?: string;
  createdAt: string;
}

const emptyForm = {
  temperature: '',
  taSystolique: '',
  taDiastolique: '',
  frequenceCardiaque: '',
  frequenceRespiratoire: '',
  evaDouleur: 0,
  etatGeneral: 'Stable',
  examenClinique: '',
  evolution: '',
  signesAlerte: false,
  auteur: 'Dr. Jean Pierre',
};

const etatColors: Record<string, { bg: string; color: string; label: string }> = {
  Stable:    { bg: '#dcfce7', color: '#16a34a', label: 'ÉTAT: STABLE' },
  Amélioré:  { bg: '#fef9c3', color: '#ca8a04', label: 'ÉTAT: AMÉLIORÉ' },
  Aggravé:   { bg: '#fee2e2', color: '#dc2626', label: 'ÉTAT: AGGRAVÉ' },
  Critique:  { bg: '#fee2e2', color: '#dc2626', label: 'ÉTAT: CRITIQUE' },
  Guéri:     { bg: '#dcfce7', color: '#16a34a', label: 'ÉTAT: GUÉRI' },
};

export function SuiviTab({ patientId }: { patientId: string }) {
  const [suivis, setSuivis] = useState<Suivi[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<any>({ ...emptyForm });
  const [showForm, setShowForm] = useState(false);

  useEffect(() => { load(); }, [patientId]);

  const load = async () => {
    try {
      const res = await api.get(`/patients/${patientId}/suivis`);
      setSuivis(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      await api.post(`/patients/${patientId}/suivis`, {
        ...form,
        temperature: form.temperature ? parseFloat(form.temperature) : undefined,
        evaDouleur: parseInt(form.evaDouleur),
        jourHospitalisation: `J${suivis.length + 1}`,
      });
      setForm({ ...emptyForm });
      setShowForm(false);
      load();
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  };

  const etatStyle = (etat?: string) => etatColors[etat || 'Stable'] || etatColors['Stable'];

  const getTempColor = (temp?: number) => {
    if (!temp) return '#1e293b';
    if (temp >= 38.5) return '#ef4444';
    if (temp >= 37.5) return '#f97316';
    return '#1e293b';
  };

  const getEvaColor = (eva?: number) => {
    if (!eva) return '#1e293b';
    if (eva >= 7) return '#ef4444';
    if (eva >= 4) return '#f97316';
    return '#05668D';
  };

  return (
    <div style={{ display: 'flex', gap: '24px', fontFamily: "'Inter', sans-serif" }}>

      <div style={{ flex: 1 }}>
        <EhrFormSection title="Suivi / Évolution" subtitle="Suivi de l'épisode actuel" sectionBadge="01" collapsible defaultOpen>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', flexWrap: 'wrap', gap: 12 }}>
            <div />
            <button
              type="button"
              onClick={() => setShowForm(!showForm)}
              style={{
                backgroundColor: ehr.primary,
                color: ehr.white,
                border: 'none',
                borderRadius: 8,
                padding: '10px 18px',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: "'Inter', sans-serif",
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              + Ajouter une observation
            </button>
          </div>

          {loading && (
            <p style={{ color: ehr.textMuted, textAlign: 'center', padding: '40px 0' }}>Chargement...</p>
          )}

          {!loading && suivis.length === 0 && (
            <div style={{ textAlign: 'center', padding: '48px 0', color: ehr.textMuted }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
              <p style={{ fontSize: 15, fontWeight: 500, margin: 0 }}>Aucune observation de suivi</p>
              <p style={{ fontSize: 13, marginTop: 6 }}>Ajoutez la première observation ci-dessus</p>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {suivis.map((s, index) => {
              const es = etatStyle(s.etatGeneral);
              return (
                <div key={s.id} style={{ display: 'flex', gap: '16px', paddingBottom: '24px', position: 'relative' }}>
                  {/* Ligne verticale */}
                  {index < suivis.length - 1 && (
                    <div style={{ position: 'absolute', left: '10px', top: '24px', bottom: 0, width: '2px', backgroundColor: '#e2e8f0' }} />
                  )}

                  {/* Point */}
                  <div style={{ flexShrink: 0, marginTop: '4px' }}>
                    <div style={{
                      width: '20px', height: '20px', borderRadius: '50%',
                      backgroundColor: index === 0 ? '#05668D' : '#e2e8f0',
                      border: index === 0 ? '3px solid #bfdbfe' : '2px solid #cbd5e1',
                      zIndex: 1, position: 'relative',
                    }} />
                  </div>

                  {/* Contenu */}
                  <div style={{ flex: 1 }}>
                    {/* En-tête entrée */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '15px', fontWeight: 700, color: '#1e293b' }}>
                          {formatDate(s.createdAt)} – {s.jourHospitalisation || `J${suivis.length - index}`}
                        </span>
                        <span style={{
                          fontSize: '11px', fontWeight: 700, padding: '3px 10px',
                          borderRadius: '20px', backgroundColor: es.bg, color: es.color,
                        }}>
                          • {es.label}
                        </span>
                      </div>
                      <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                        Par {s.auteur || 'Médecin'} • {formatTime(s.createdAt)}
                      </span>
                    </div>

                    {/* Constantes */}
                    <div style={{ display: 'flex', gap: '24px', marginBottom: '10px', flexWrap: 'wrap' }}>
                      {s.temperature && (
                        <div>
                          <span style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>TEMP</span>
                          <p style={{ fontSize: '14px', fontWeight: 600, color: getTempColor(s.temperature), margin: '2px 0 0 0' }}>
                            {s.temperature}°C
                          </p>
                        </div>
                      )}
                      {(s.taSystolique || s.taDiastolique) && (
                        <div>
                          <span style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>TA</span>
                          <p style={{ fontSize: '14px', fontWeight: 600, color: '#1e293b', margin: '2px 0 0 0' }}>
                            {s.taSystolique}/{s.taDiastolique}
                          </p>
                        </div>
                      )}
                      {s.frequenceCardiaque && (
                        <div>
                          <span style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>FC</span>
                          <p style={{ fontSize: '14px', fontWeight: 600, color: '#1e293b', margin: '2px 0 0 0' }}>
                            {s.frequenceCardiaque}
                          </p>
                        </div>
                      )}
                      {s.frequenceRespiratoire && (
                        <div>
                          <span style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>FR</span>
                          <p style={{ fontSize: '14px', fontWeight: 600, color: '#1e293b', margin: '2px 0 0 0' }}>
                            {s.frequenceRespiratoire}
                          </p>
                        </div>
                      )}
                      {s.evaDouleur !== undefined && s.evaDouleur !== null && (
                        <div>
                          <span style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>DOULEUR</span>
                          <p style={{ fontSize: '14px', fontWeight: 700, color: getEvaColor(s.evaDouleur), margin: '2px 0 0 0' }}>
                            EVA {s.evaDouleur}/10
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Notes */}
                    {s.evolution && (
                      <div style={{ display: 'flex', gap: '6px', marginBottom: '4px' }}>
                        <span style={{ fontSize: '13px', color: '#64748b' }}>☑</span>
                        <p style={{ fontSize: '13px', color: '#475569', margin: 0 }}>
                          <strong>Note :</strong> {s.evolution}
                        </p>
                      </div>
                    )}
                    {s.examenClinique && (
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <span style={{ fontSize: '13px', color: '#64748b' }}>☑</span>
                        <p style={{ fontSize: '13px', color: '#475569', margin: 0 }}>
                          <strong>Examen :</strong> {s.examenClinique}
                        </p>
                      </div>
                    )}
                    {s.signesAlerte && (
                      <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '6px', color: '#ef4444' }}>
                        <span>⚠</span>
                        <span style={{ fontSize: '12px', fontWeight: 600 }}>Signes d'alerte détectés</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {suivis.length > 0 && (
            <p style={{ fontSize: '12px', color: '#94a3b8', textAlign: 'center', marginTop: '8px' }}>
              Dernière mise à jour : {formatDate(suivis[0].createdAt)} {formatTime(suivis[0].createdAt)} – {suivis[0].auteur}
            </p>
          )}
        </EhrFormSection>
      </div>

      {showForm && (
        <div style={{ width: '280px', flexShrink: 0 }}>
          <EhrFormSection title="Ajouter une observation" subtitle="Saisie quotidienne du dossier patient" sectionBadge="02" collapsible defaultOpen>
            <div style={{ marginBottom: '14px' }}>
              <label style={labelStyle}>TEMPÉRATURE</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="number" step="0.1" placeholder="°C"
                  value={form.temperature}
                  onChange={e => setForm({ ...form, temperature: e.target.value })}
                  style={inputStyle}
                />
              </div>
            </div>

            {/* TA */}
            <div style={{ marginBottom: '14px' }}>
              <label style={labelStyle}>TA (SYST/DIAST)</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <input
                  type="text" placeholder="Syst."
                  value={form.taSystolique}
                  onChange={e => setForm({ ...form, taSystolique: e.target.value })}
                  style={inputStyle}
                />
                <input
                  type="text" placeholder="Diast."
                  value={form.taDiastolique}
                  onChange={e => setForm({ ...form, taDiastolique: e.target.value })}
                  style={inputStyle}
                />
              </div>
            </div>

            {/* FC + FR */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '14px' }}>
              <div>
                <label style={labelStyle}>FRÉQ. CARDIAQUE</label>
                <input
                  type="text" placeholder="bpm"
                  value={form.frequenceCardiaque}
                  onChange={e => setForm({ ...form, frequenceCardiaque: e.target.value })}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>FRÉQ. RESP.</label>
                <input
                  type="text" placeholder="mvmt/min"
                  value={form.frequenceRespiratoire}
                  onChange={e => setForm({ ...form, frequenceRespiratoire: e.target.value })}
                  style={inputStyle}
                />
              </div>
            </div>

            {/* EVA */}
            <div style={{ marginBottom: '14px' }}>
              <label style={labelStyle}>EVA DOULEUR (0-10)</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input
                  type="range" min="0" max="10"
                  value={form.evaDouleur}
                  onChange={e => setForm({ ...form, evaDouleur: parseInt(e.target.value) })}
                  style={{ flex: 1 }}
                />
                <span style={{
                  fontSize: '14px', fontWeight: 700, minWidth: '28px', textAlign: 'center',
                  color: getEvaColor(form.evaDouleur),
                }}>
                  {form.evaDouleur}
                </span>
              </div>
            </div>

            {/* État général */}
            <div style={{ marginBottom: '14px' }}>
              <label style={labelStyle}>ÉTAT GÉNÉRAL <span style={{ color: '#ef4444' }}>*</span></label>
              <select
                value={form.etatGeneral}
                onChange={e => setForm({ ...form, etatGeneral: e.target.value })}
                style={{ ...inputStyle, cursor: 'pointer' }}
              >
                <option value="Stable">Stable</option>
                <option value="Amélioré">Amélioré</option>
                <option value="Aggravé">Aggravé</option>
                <option value="Critique">Critique</option>
                <option value="Guéri">Guéri</option>
              </select>
            </div>

            {/* Examen clinique */}
            <div style={{ marginBottom: '14px' }}>
              <label style={labelStyle}>EXAMEN CLINIQUE</label>
              <textarea
                placeholder="Thorax, abdomen, membres..."
                value={form.examenClinique}
                onChange={e => setForm({ ...form, examenClinique: e.target.value })}
                style={{ ...inputStyle, height: '70px', resize: 'none' }}
              />
            </div>

            {/* Évolution */}
            <div style={{ marginBottom: '14px' }}>
              <label style={labelStyle}>ÉVOLUTION / COMMENTAIRES</label>
              <textarea
                placeholder="Observations libres..."
                value={form.evolution}
                onChange={e => setForm({ ...form, evolution: e.target.value })}
                style={{ ...inputStyle, height: '70px', resize: 'none' }}
              />
            </div>

            {/* Signes alerte */}
            <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="checkbox"
                checked={form.signesAlerte}
                onChange={e => setForm({ ...form, signesAlerte: e.target.checked })}
                style={{ width: '16px', height: '16px', cursor: 'pointer' }}
              />
              <label style={{ fontSize: '13px', color: form.signesAlerte ? '#ef4444' : '#64748b', fontWeight: form.signesAlerte ? 600 : 400, cursor: 'pointer' }}>
                ⚠ Signes d'alerte détectés
              </label>
            </div>

            {/* Boutons */}
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => setShowForm(false)}
                style={{
                  flex: 1, padding: '10px', fontSize: '13px', fontWeight: 600,
                  backgroundColor: '#f8fafc', color: '#475569',
                  border: '1px solid #e2e8f0', borderRadius: '8px', cursor: 'pointer',
                  fontFamily: "'Inter', sans-serif",
                }}
              >
                Annuler
              </button>
              <button
                onClick={handleSubmit}
                disabled={saving}
                style={{
                  flex: 1, padding: '10px', fontSize: '13px', fontWeight: 600,
                  backgroundColor: '#05668D', color: 'white',
                  border: 'none', borderRadius: '8px', cursor: 'pointer',
                  fontFamily: "'Inter', sans-serif",
                }}
              >
                {saving ? '...' : "Ajouter l'observation"}
              </button>
            </div>
          </EhrFormSection>
        </div>
      )}
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: '10px', fontWeight: 600,
  color: '#94a3b8', textTransform: 'uppercase',
  letterSpacing: '0.05em', marginBottom: '5px',
};

const inputStyle: React.CSSProperties = {
  width: '100%', border: '1px solid #e2e8f0', borderRadius: '8px',
  padding: '8px 12px', fontSize: '13px', color: '#1e293b',
  outline: 'none', fontFamily: "'Inter', sans-serif",
  boxSizing: 'border-box', backgroundColor: '#ffffff',
};

function getEvaColor(eva?: number): string {
  if (!eva) return '#1e293b';
  if (eva >= 7) return '#ef4444';
  if (eva >= 4) return '#f97316';
  return '#05668D';
}
