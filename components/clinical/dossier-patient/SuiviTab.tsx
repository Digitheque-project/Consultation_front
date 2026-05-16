'use client';

import { useState, useEffect } from 'react';
import { History, Thermometer, Activity, Heart, Wind, Stethoscope, Plus, Check, Calendar, User, ChevronRight, AlertCircle } from 'lucide-react';
import { dossierPatientApi as api } from '@/lib/clinical/dossier-patient-api';
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
  Stable: { bg: '#dcfce7', color: '#16a34a', label: 'STABLE' },
  Amélioré: { bg: '#fef9c3', color: '#ca8a04', label: 'AMÉLIORÉ' },
  Aggravé: { bg: '#fee2e2', color: '#dc2626', label: 'AGGRAVÉ' },
  Critique: { bg: '#fee2e2', color: '#dc2626', label: 'CRITIQUE' },
  Guéri: { bg: '#dcfce7', color: '#16a34a', label: 'GUÉRI' },
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

  const getTempColor = (temp?: number) => {
    if (!temp) return ehr.text;
    if (temp >= 38.5) return ehr.danger;
    if (temp >= 37.5) return '#f97316';
    return ehr.text;
  };

  const getEvaColor = (eva?: number) => {
    if (eva === undefined || eva === null) return ehr.text;
    if (eva >= 7) return ehr.danger;
    if (eva >= 4) return '#f97316';
    return ehr.primary;
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: 11,
    fontWeight: 800,
    color: ehr.textMuted,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: 8,
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    border: `1px solid ${ehr.borderSoft}`,
    borderRadius: 10,
    padding: '10px 14px',
    fontSize: 14,
    color: ehr.text,
    outline: 'none',
    fontFamily: "'Manrope', sans-serif",
    boxSizing: 'border-box',
    backgroundColor: '#F8FAFC',
    transition: 'all 0.2s ease',
  };

  return (
    <div style={{ display: 'flex', gap: '32px', fontFamily: "'Manrope', sans-serif", color: ehr.text }}>

      {/* Main Content: Timeline */}
      <div style={{ flex: 1 }}>

        {/* Header Section */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 }}>
          <div>
            <div>
              <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>Suivi / Évolution</h1>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: ehr.textMuted }}>
              <Calendar size={14} />
              <span style={{ fontSize: 13, fontWeight: 500 }}>Observations et constantes de l'épisode actuel</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowForm(!showForm)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              backgroundColor: ehr.primary,
              color: '#fff',
              border: 'none',
              borderRadius: 10,
              padding: '12px 24px',
              fontSize: 14,
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(5, 102, 141, 0.15)',
              transition: 'all 0.2s ease',
            }}
          >
            <Plus size={18} /> Ajouter une observation
          </button>
        </div>

        {loading && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
            <div style={{ color: ehr.textMuted, fontSize: 14, fontWeight: 600 }}>Chargement du suivi...</div>
          </div>
        )}

        {!loading && suivis.length === 0 && (
          <div style={{
            textAlign: 'center',
            padding: '80px 0',
            backgroundColor: '#fff',
            borderRadius: 16,
            border: `1px dashed ${ehr.border}`,
            color: ehr.textMuted
          }}>
            <History size={48} strokeWidth={1} style={{ marginBottom: 16, opacity: 0.5 }} />
            <p style={{ fontSize: 16, fontWeight: 700, margin: 0, color: ehr.text }}>Aucune observation enregistrée</p>
            <p style={{ fontSize: 14, marginTop: 8 }}>Cliquez sur le bouton ci-dessus pour ajouter le premier suivi.</p>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 0, paddingLeft: 12 }}>
          {suivis.map((s, index) => {
            const es = etatColors[s.etatGeneral || 'Stable'] || etatColors['Stable'];
            return (
              <div key={s.id} style={{ display: 'flex', gap: '24px', position: 'relative', paddingBottom: 40 }}>
                {/* Ligne verticale timeline */}
                {index < suivis.length - 1 && (
                  <div style={{
                    position: 'absolute',
                    left: '9px',
                    top: '24px',
                    bottom: 0,
                    width: '2px',
                    backgroundColor: ehr.borderSoft,
                    zIndex: 0
                  }} />
                )}

                {/* Point Timeline */}
                <div style={{ flexShrink: 0, zIndex: 1, marginTop: 6 }}>
                  <div style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    backgroundColor: index === 0 ? ehr.primary : '#fff',
                    border: `4px solid ${index === 0 ? ehr.highlightBlueTint : ehr.borderSoft}`,
                    boxShadow: index === 0 ? '0 0 0 2px rgba(5, 102, 141, 0.1)' : 'none',
                  }} />
                </div>

                {/* Card Contenu */}
                <div style={{
                  flex: 1,
                  backgroundColor: '#fff',
                  borderRadius: 16,
                  border: `1px solid ${ehr.borderSoft}`,
                  padding: '20px',
                  boxShadow: index === 0 ? '0 4px 20px rgba(0,0,0,0.03)' : 'none',
                }}>
                  {/* Card Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
                        <span style={{ fontSize: 16, fontWeight: 800 }}>{formatDate(s.createdAt)}</span>
                        <span style={{
                          fontSize: 11,
                          fontWeight: 800,
                          color: ehr.primary,
                          backgroundColor: ehr.highlightBlueTint,
                          padding: '2px 8px',
                          borderRadius: 6
                        }}>
                          {s.jourHospitalisation || `J${suivis.length - index}`}
                        </span>
                        {s.signesAlerte && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 800, color: ehr.danger, backgroundColor: '#fee2e2', padding: '2px 8px', borderRadius: 6 }}>
                            <AlertCircle size={12} /> ALERTE
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: ehr.textMuted }}>
                        <User size={12} />
                        <span style={{ fontSize: 12, fontWeight: 600 }}>{s.auteur || 'Dr. Jean Pierre'} • {formatTime(s.createdAt)}</span>
                      </div>
                    </div>

                    <div style={{
                      fontSize: 10,
                      fontWeight: 800,
                      color: es.color,
                      backgroundColor: es.bg,
                      padding: '4px 12px',
                      borderRadius: 8,
                      letterSpacing: '0.05em'
                    }}>
                      {es.label}
                    </div>
                  </div>

                  {/* Constantes Grid */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
                    gap: 20,
                    backgroundColor: '#F8FAFC',
                    padding: '16px',
                    borderRadius: 12,
                    marginBottom: 20
                  }}>
                    {s.temperature && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ color: getTempColor(s.temperature) }}><Thermometer size={18} /></div>
                        <div>
                          <p style={labelStyle}>TEMP</p>
                          <p style={{ fontSize: 15, fontWeight: 800, margin: 0, color: getTempColor(s.temperature) }}>{s.temperature}°C</p>
                        </div>
                      </div>
                    )}
                    {(s.taSystolique || s.taDiastolique) && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ color: ehr.primary }}><Activity size={18} /></div>
                        <div>
                          <p style={labelStyle}>TA</p>
                          <p style={{ fontSize: 15, fontWeight: 800, margin: 0 }}>{s.taSystolique}/{s.taDiastolique}</p>
                        </div>
                      </div>
                    )}
                    {s.frequenceCardiaque && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ color: '#ef4444' }}><Heart size={18} /></div>
                        <div>
                          <p style={labelStyle}>FC</p>
                          <p style={{ fontSize: 15, fontWeight: 800, margin: 0 }}>{s.frequenceCardiaque} <span style={{ fontSize: 10, fontWeight: 600, color: ehr.textMuted }}>bpm</span></p>
                        </div>
                      </div>
                    )}
                    {s.frequenceRespiratoire && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ color: '#3b82f6' }}><Wind size={18} /></div>
                        <div>
                          <p style={labelStyle}>FR</p>
                          <p style={{ fontSize: 15, fontWeight: 800, margin: 0 }}>{s.frequenceRespiratoire} <span style={{ fontSize: 10, fontWeight: 600, color: ehr.textMuted }}>m/m</span></p>
                        </div>
                      </div>
                    )}
                    {s.evaDouleur !== undefined && s.evaDouleur !== null && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ color: getEvaColor(s.evaDouleur) }}><Stethoscope size={18} /></div>
                        <div>
                          <p style={labelStyle}>EVA</p>
                          <p style={{ fontSize: 15, fontWeight: 800, margin: 0, color: getEvaColor(s.evaDouleur) }}>{s.evaDouleur}/10</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Notes & Commentaires */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {s.evolution && (
                      <div style={{ display: 'flex', gap: 10 }}>
                        <div style={{ color: ehr.primary, marginTop: 2 }}><ChevronRight size={14} strokeWidth={3} /></div>
                        <div>
                          <span style={{ fontSize: 11, fontWeight: 800, color: ehr.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Évolution / Note</span>
                          <p style={{ fontSize: 14, fontWeight: 600, margin: '2px 0 0 0', lineHeight: 1.5 }}>{s.evolution}</p>
                        </div>
                      </div>
                    )}
                    {s.examenClinique && (
                      <div style={{ display: 'flex', gap: 10 }}>
                        <div style={{ color: ehr.primary, marginTop: 2 }}><ChevronRight size={14} strokeWidth={3} /></div>
                        <div>
                          <span style={{ fontSize: 11, fontWeight: 800, color: ehr.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Examen Clinique</span>
                          <p style={{ fontSize: 14, fontWeight: 600, margin: '2px 0 0 0', lineHeight: 1.5 }}>{s.examenClinique}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Side Panel: Formulaire d'ajout */}
      {showForm && (
        <div style={{ width: 340, flexShrink: 0 }}>
          <div style={{
            backgroundColor: '#fff',
            borderRadius: 16,
            border: `1px solid ${ehr.borderSoft}`,
            boxShadow: '0 10px 30px rgba(0,0,0,0.05)',
            position: 'sticky',
            top: 20,
            overflow: 'hidden'
          }}>
            <div style={{
              padding: '24px',
              borderBottom: `1px solid ${ehr.borderSoft}`,
              backgroundColor: ehr.highlightBlueTint
            }}>
              <h3 style={{ fontSize: 16, fontWeight: 800, margin: 0 }}>Nouvelle observation</h3>
              <p style={{ fontSize: 12, color: ehr.textMuted, margin: '4px 0 0 0', fontWeight: 500 }}>Saisie des constantes et notes</p>
            </div>

            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 20 }}>

              {/* Température */}
              <div>
                <label style={labelStyle}>Température (°C)</label>
                <input
                  type="number" step="0.1" placeholder="Ex: 37.2"
                  value={form.temperature}
                  onChange={e => setForm({ ...form, temperature: e.target.value })}
                  style={inputStyle}
                />
              </div>

              {/* TA Grid */}
              <div>
                <label style={labelStyle}>Tension Artérielle (Syst/Diast)</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <input
                    type="text" placeholder="120"
                    value={form.taSystolique}
                    onChange={e => setForm({ ...form, taSystolique: e.target.value })}
                    style={inputStyle}
                  />
                  <input
                    type="text" placeholder="80"
                    value={form.taDiastolique}
                    onChange={e => setForm({ ...form, taDiastolique: e.target.value })}
                    style={inputStyle}
                  />
                </div>
              </div>

              {/* FC + FR Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={labelStyle}>FC (bpm)</label>
                  <input
                    type="text" placeholder="75"
                    value={form.frequenceCardiaque}
                    onChange={e => setForm({ ...form, frequenceCardiaque: e.target.value })}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>FR (m/m)</label>
                  <input
                    type="text" placeholder="16"
                    value={form.frequenceRespiratoire}
                    onChange={e => setForm({ ...form, frequenceRespiratoire: e.target.value })}
                    style={inputStyle}
                  />
                </div>
              </div>

              {/* EVA Slider */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <label style={{ ...labelStyle, marginBottom: 0 }}>Douleur (EVA)</label>
                  <span style={{ fontSize: 14, fontWeight: 800, color: getEvaColor(form.evaDouleur) }}>{form.evaDouleur}/10</span>
                </div>
                <input
                  type="range" min="0" max="10"
                  value={form.evaDouleur}
                  onChange={e => setForm({ ...form, evaDouleur: parseInt(e.target.value) })}
                  style={{ width: '100%', cursor: 'pointer', accentColor: ehr.primary }}
                />
              </div>

              {/* État Général */}
              <div>
                <label style={labelStyle}>État Général</label>
                <select
                  value={form.etatGeneral}
                  onChange={e => setForm({ ...form, etatGeneral: e.target.value })}
                  style={{ ...inputStyle, appearance: 'none', backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke=\'%2364748b\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'2\' d=\'M19 9l-7 7-7-7\'/%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center', backgroundSize: '16px' }}
                >
                  <option value="Stable">Stable</option>
                  <option value="Amélioré">Amélioré</option>
                  <option value="Aggravé">Aggravé</option>
                  <option value="Critique">Critique</option>
                  <option value="Guéri">Guéri</option>
                </select>
              </div>

              {/* Notes */}
              <div>
                <label style={labelStyle}>Évolution / Commentaires</label>
                <textarea
                  placeholder="Observations sur l'état du patient..."
                  value={form.evolution}
                  onChange={e => setForm({ ...form, evolution: e.target.value })}
                  style={{ ...inputStyle, height: 80, resize: 'none' }}
                />
              </div>

              {/* Signes Alerte */}
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '12px',
                borderRadius: 10,
                backgroundColor: form.signesAlerte ? '#fee2e2' : '#F8FAFC',
                border: `1px solid ${form.signesAlerte ? ehr.danger : ehr.borderSoft}`,
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}>
                <input
                  type="checkbox"
                  checked={form.signesAlerte}
                  onChange={e => setForm({ ...form, signesAlerte: e.target.checked })}
                  style={{ width: 18, height: 18, accentColor: ehr.danger }}
                />
                <span style={{ fontSize: 13, fontWeight: 700, color: form.signesAlerte ? ehr.danger : ehr.text }}>Signes d'alerte détectés</span>
              </label>

              {/* Actions Button */}
              <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  style={{
                    flex: 1,
                    backgroundColor: '#fff',
                    color: ehr.textMuted,
                    border: `1px solid ${ehr.borderSoft}`,
                    borderRadius: 10,
                    padding: '12px',
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={saving}
                  style={{
                    flex: 1,
                    backgroundColor: ehr.primary,
                    color: '#fff',
                    border: 'none',
                    borderRadius: 10,
                    padding: '12px',
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6
                  }}
                >
                  {saving ? '...' : <><Check size={18} /> Enregistrer</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
