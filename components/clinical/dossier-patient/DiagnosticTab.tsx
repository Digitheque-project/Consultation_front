'use client';

import { useState, useEffect } from 'react';
import { ClipboardList, Calendar, User, Check, LayoutPanelTop } from 'lucide-react';
import { dossierPatientApi as api } from '@/lib/clinical/dossier-patient-api';
import { ehr } from '@/lib/clinical/ehr-theme';

interface Diagnostic {
  id: string;
  diagnosticPrincipal: string;
  diagnosticsSecondaires?: string;
  justificationClinique?: string;
  diagnosticsDifferentiels?: string;
  graviteStade?: string;
  medecinResponsable?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Props {
  patientId: string;
  medecinNom?: string;
}

const emptyForm = {
  diagnosticPrincipal: '',
  diagnosticsSecondaires: '',
  justificationClinique: '',
  diagnosticsDifferentiels: '',
  graviteStade: '',
  medecinResponsable: 'Dr. Jean Pierre',
};

export function DiagnosticTab({ patientId, medecinNom = 'Dr. Jean Pierre' }: Props) {
  const [current, setCurrent] = useState<Diagnostic | null>(null);
  const [anterieurs, setAnterieurs] = useState<Diagnostic[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState({ ...emptyForm, medecinResponsable: medecinNom });

  useEffect(() => { load(); }, [patientId]);

  const load = async () => {
    try {
      const [allRes, activeRes] = await Promise.all([
        api.get(`/patients/${patientId}/diagnostics`),
        api.get(`/patients/${patientId}/diagnostics/actif`),
      ]);
      const all: Diagnostic[] = allRes.data;
      const active: Diagnostic | null = activeRes.data;
      setCurrent(active);
      setAnterieurs(all.filter(d => !d.isActive));
      if (active) {
        setForm({
          diagnosticPrincipal: active.diagnosticPrincipal || '',
          diagnosticsSecondaires: active.diagnosticsSecondaires || '',
          justificationClinique: active.justificationClinique || '',
          diagnosticsDifferentiels: active.diagnosticsDifferentiels || '',
          graviteStade: active.graviteStade || '',
          medecinResponsable: active.medecinResponsable || medecinNom,
        });
        setIsEditing(false);
      } else {
        setForm({ ...emptyForm, medecinResponsable: medecinNom });
        setIsEditing(true);
      }
    } catch {
      setIsEditing(true);
    }
  };

  const handleSave = async () => {
    if (!form.diagnosticPrincipal.trim()) return;
    setIsSaving(true);
    try {
      if (current) {
        const res = await api.put(`/patients/${patientId}/diagnostics/${current.id}`, form);
        setCurrent(res.data);
      } else {
        const res = await api.post(`/patients/${patientId}/diagnostics`, form);
        setCurrent(res.data);
      }
      setIsEditing(false);
      load();
    } finally {
      setIsSaving(false);
    }
  };

  const formatDate = (dateStr: string | undefined | null) => {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return null;
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
      + ' - ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    border: `1px solid ${ehr.borderSoft}`,
    borderRadius: 10,
    padding: '12px 16px',
    fontSize: 14,
    color: ehr.text,
    outline: 'none',
    fontFamily: "'Manrope', sans-serif",
    boxSizing: 'border-box',
    backgroundColor: '#F8FAFC',
    transition: 'all 0.2s ease',
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

  return (
    <div style={{ display: 'flex', gap: '32px', fontFamily: "'Manrope', sans-serif", color: ehr.text }}>

      {/* Main Content */}
      <div style={{ flex: 1 }}>

        {/* Header Section */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 }}>
          <div>
            <div>
              <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>Diagnostic</h1>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: ehr.textMuted }}>
              <Calendar size={14} />
              <span style={{ fontSize: 13, fontWeight: 500 }}>Diagnostic de l'épisode actuel</span>
            </div>
          </div>

          {(() => {
            const formattedDate = formatDate(current?.updatedAt);
            if (!current || isEditing || !formattedDate) return null;
            return (
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontSize: 10, fontWeight: 800, color: ehr.textMuted, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 4px 0' }}>
                  Dernière mise à jour
                </p>
                <p style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>{formattedDate}</p>
                <p style={{ fontSize: 12, color: ehr.primary, fontWeight: 600, marginTop: 2 }}>{current.medecinResponsable}</p>
              </div>
            );
          })()}
        </div>

        {/* Form Fields */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

          {/* Section 1: Diagnostic Principal */}
          <div>
            <label style={labelStyle}>
              DIAGNOSTIC PRINCIPAL <span style={{ color: ehr.danger }}>*</span>
            </label>
            {isEditing ? (
              <input
                type="text"
                placeholder="Ex : Cholécystectomie par laparoscopie"
                value={form.diagnosticPrincipal}
                onChange={e => setForm({ ...form, diagnosticPrincipal: e.target.value })}
                style={{ ...inputStyle, border: `2px solid ${ehr.primary}`, backgroundColor: '#fff', fontSize: 16, fontWeight: 600 }}
              />
            ) : (
              <div style={{ ...inputStyle, backgroundColor: ehr.highlightBlueTint, border: `1px solid ${ehr.highlightBorder}`, fontSize: 16, fontWeight: 700, minHeight: 48, display: 'flex', alignItems: 'center' }}>
                {current?.diagnosticPrincipal || 'Non renseigné'}
              </div>
            )}
          </div>

          {/* Section 2: Secondaires & Justification */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            <div>
              <label style={labelStyle}>DIAGNOSTICS SECONDAIRES / ASSOCIÉS</label>
              <textarea
                placeholder="Détails additionnels..."
                disabled={!isEditing}
                value={form.diagnosticsSecondaires}
                onChange={e => setForm({ ...form, diagnosticsSecondaires: e.target.value })}
                style={{ ...inputStyle, height: 120, resize: 'none', backgroundColor: isEditing ? '#fff' : '#F8FAFC' }}
              />
            </div>
            <div>
              <label style={labelStyle}>JUSTIFICATION CLINIQUE ET PARACLINIQUE</label>
              <textarea
                placeholder="Arguments cliniques, résultats biologiques, imagerie..."
                disabled={!isEditing}
                value={form.justificationClinique}
                onChange={e => setForm({ ...form, justificationClinique: e.target.value })}
                style={{ ...inputStyle, height: 120, resize: 'none', backgroundColor: isEditing ? '#fff' : '#F8FAFC' }}
              />
            </div>
          </div>

          {/* Section 3: Différentiels & Gravité */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            <div>
              <label style={labelStyle}>DIAGNOSTICS DIFFÉRENTIELS</label>
              <textarea
                placeholder="Autres hypothèses envisagées..."
                disabled={!isEditing}
                value={form.diagnosticsDifferentiels}
                onChange={e => setForm({ ...form, diagnosticsDifferentiels: e.target.value })}
                style={{ ...inputStyle, height: 120, resize: 'none', backgroundColor: isEditing ? '#fff' : '#F8FAFC' }}
              />
            </div>
            <div>
              <label style={labelStyle}>GRAVITÉ / STADE / COMPLICATIONS</label>
              <textarea
                placeholder="Ex: Stade III, Grade B, avec sepsis..."
                disabled={!isEditing}
                value={form.graviteStade}
                onChange={e => setForm({ ...form, graviteStade: e.target.value })}
                style={{ ...inputStyle, height: 120, resize: 'none', backgroundColor: isEditing ? '#fff' : '#F8FAFC' }}
              />
            </div>
          </div>

          {/* Footer Info & Actions */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 12 }}>

            {/* Médecin Responsable Box */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '12px 20px',
              border: `1px solid ${ehr.borderSoft}`,
              borderRadius: 12,
              backgroundColor: '#fff',
              minWidth: 260
            }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', backgroundColor: ehr.highlightBlueTint, display: 'flex', alignItems: 'center', justifyContent: 'center', color: ehr.primary }}>
                <User size={20} />
              </div>
              <div>
                <p style={{ fontSize: 9, fontWeight: 800, color: ehr.textMuted, textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>
                  Médecin Responsable
                </p>
                <p style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>{isEditing ? medecinNom : (current?.medecinResponsable || medecinNom)}</p>
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: 12 }}>
              {!isEditing ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setForm({ ...emptyForm, medecinResponsable: medecinNom });
                      setIsEditing(true);
                      setCurrent(null);
                    }}
                    style={{
                      backgroundColor: ehr.primary,
                      color: '#fff',
                      border: 'none',
                      borderRadius: 10,
                      padding: '12px 24px',
                      fontSize: 14,
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    + Nouveau diagnostic
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => { setIsEditing(false); load(); }}
                    style={{
                      backgroundColor: '#fff',
                      color: ehr.textMuted,
                      border: `1px solid ${ehr.borderSoft}`,
                      borderRadius: 10,
                      padding: '12px 24px',
                      fontSize: 14,
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    Annuler
                  </button>
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={isSaving || !form.diagnosticPrincipal.trim()}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      backgroundColor: form.diagnosticPrincipal.trim() ? ehr.primary : ehr.primaryDisabled,
                      color: '#fff',
                      border: 'none',
                      borderRadius: 10,
                      padding: '12px 32px',
                      fontSize: 14,
                      fontWeight: 700,
                      cursor: form.diagnosticPrincipal.trim() ? 'pointer' : 'not-allowed',
                    }}
                  >
                    {isSaving ? 'Enregistrement...' : <><Check size={18} /> Valider le diagnostic</>}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Sidebar: Diagnostics Antérieurs */}
      <div style={{ width: 300, flexShrink: 0 }}>
        <div style={{
          border: `1px solid ${ehr.borderSoft}`,
          borderRadius: 16,
          backgroundColor: '#fff',
          overflow: 'hidden',
          boxShadow: ehr.shadowCard
        }}>
          <div style={{
            padding: '20px',
            borderBottom: `1px solid ${ehr.borderSoft}`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <h3 style={{ fontSize: 14, fontWeight: 800, margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Diagnostics antérieurs</h3>
            <LayoutPanelTop size={18} color={ehr.textMuted} />
          </div>

          <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
            {anterieurs.length === 0 ? (
              <p style={{ fontSize: 13, color: ehr.textMuted, textAlign: 'center', margin: 0 }}>Aucun diagnostic antérieur</p>
            ) : (
              anterieurs.slice(0, 6).map(d => (
                <div key={d.id} style={{
                  padding: '12px',
                  backgroundColor: '#F8FAFC',
                  borderRadius: 10,
                  border: '1px solid transparent',
                  transition: 'all 0.2s ease',
                  cursor: 'pointer'
                }}>
                  <p style={{ fontSize: 11, fontWeight: 800, color: ehr.textMuted, margin: '0 0 6px 0' }}>
                    {new Date(d.createdAt).toLocaleDateString('fr-FR')}
                  </p>
                  <p style={{ fontSize: 13, fontWeight: 700, margin: 0, lineHeight: 1.4 }}>
                    {d.diagnosticPrincipal}
                  </p>
                </div>
              ))
            )}

            {anterieurs.length > 0 && (
              <button style={{
                marginTop: 8,
                padding: '10px',
                border: 'none',
                backgroundColor: 'transparent',
                color: ehr.primary,
                fontSize: 12,
                fontWeight: 800,
                cursor: 'pointer',
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                gap: 4
              }}>
                Derniers diagnostics du patient ›
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
