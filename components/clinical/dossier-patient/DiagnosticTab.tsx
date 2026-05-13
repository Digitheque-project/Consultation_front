'use client';

import { useState, useEffect } from 'react';
import { dossierPatientApi as api } from '@/lib/clinical/dossier-patient-api';
import { EhrFormSection, ehrSectionFieldLabel } from '@/components/clinical/dossier-patient/EhrFormSection';
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

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
      + ' – ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  };

  const principalComplet = !!form.diagnosticPrincipal.trim();
  const precisionsComplet =
    !!form.diagnosticsSecondaires?.trim() ||
    !!form.justificationClinique?.trim() ||
    !!form.diagnosticsDifferentiels?.trim() ||
    !!form.graviteStade?.trim();

  const inputBase: React.CSSProperties = {
    width: '100%',
    border: `1px solid ${ehr.border}`,
    borderRadius: 8,
    padding: '10px 14px',
    fontSize: 13,
    color: ehr.text,
    outline: 'none',
    fontFamily: "'Inter', sans-serif",
    boxSizing: 'border-box',
  };

  return (
    <div style={{ display: 'flex', gap: '24px', fontFamily: "'Inter', sans-serif" }}>

      <div style={{ flex: 1 }}>
        <EhrFormSection
          title="Diagnostic principal"
          subtitle="Diagnostic de l'épisode actuel"
          sectionBadge="01"
          complete={principalComplet}
          collapsible
          defaultOpen
          headerExtra={
            current && !isEditing ? (
              <div style={{ textAlign: 'right', maxWidth: 200 }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: ehr.textMuted, textTransform: 'uppercase', letterSpacing: '0.07em', margin: 0 }}>
                  Dernière mise à jour
                </p>
                <p style={{ fontSize: 12, color: ehr.text, margin: '2px 0 0 0' }}>{formatDate(current.updatedAt)}</p>
                <p style={{ fontSize: 12, color: ehr.primary, margin: '2px 0 0 0' }}>{current.medecinResponsable}</p>
              </div>
            ) : null
          }
        >
          <p style={{ fontSize: 12, color: ehr.textMuted, marginBottom: 16 }}>
            Champ obligatoire <span style={{ color: ehr.danger }}>*</span>
          </p>
          <div style={{ marginBottom: 4 }}>
            <label style={ehrSectionFieldLabel}>
              DIAGNOSTIC PRINCIPAL <span style={{ color: ehr.danger }}>*</span>
            </label>
            {isEditing ? (
              <input
                type="text"
                placeholder="Ex : Cholécystectomie par laparoscopie"
                value={form.diagnosticPrincipal}
                onChange={e => setForm({ ...form, diagnosticPrincipal: e.target.value })}
                style={{
                  ...inputBase,
                  border: '2px solid #3b82f6',
                  fontSize: 14,
                  backgroundColor: ehr.white,
                }}
              />
            ) : (
              <div
                style={{
                  ...inputBase,
                  border: `1px solid ${ehr.highlightBorder}`,
                  backgroundColor: ehr.highlightBlueTint,
                  minHeight: 42,
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                {current?.diagnosticPrincipal}
              </div>
            )}
          </div>
        </EhrFormSection>

        <EhrFormSection
          title="Précisions diagnostiques"
          subtitle="Secondaires, justification et différentiels"
          sectionBadge="02"
          complete={precisionsComplet}
          collapsible
          defaultOpen
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div>
              <label style={ehrSectionFieldLabel}>DIAGNOSTICS SECONDAIRES / ASSOCIÉS</label>
              <textarea
                placeholder="Détails additionnels..."
                disabled={!isEditing}
                value={form.diagnosticsSecondaires}
                onChange={e => setForm({ ...form, diagnosticsSecondaires: e.target.value })}
                style={{
                  ...inputBase,
                  resize: 'none',
                  height: 110,
                  color: '#475569',
                  backgroundColor: isEditing ? ehr.white : ehr.pageBg,
                }}
              />
            </div>
            <div>
              <label style={ehrSectionFieldLabel}>JUSTIFICATION CLINIQUE ET PARACLINIQUE</label>
              <textarea
                placeholder="Arguments cliniques, résultats biologiques, imagerie..."
                disabled={!isEditing}
                value={form.justificationClinique}
                onChange={e => setForm({ ...form, justificationClinique: e.target.value })}
                style={{
                  ...inputBase,
                  resize: 'none',
                  height: 110,
                  color: '#475569',
                  backgroundColor: isEditing ? ehr.white : ehr.pageBg,
                }}
              />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label style={ehrSectionFieldLabel}>DIAGNOSTICS DIFFÉRENTIELS</label>
              <textarea
                placeholder="Autres hypothèses envisagées..."
                disabled={!isEditing}
                value={form.diagnosticsDifferentiels}
                onChange={e => setForm({ ...form, diagnosticsDifferentiels: e.target.value })}
                style={{
                  ...inputBase,
                  resize: 'none',
                  height: 110,
                  color: '#475569',
                  backgroundColor: isEditing ? ehr.white : ehr.pageBg,
                }}
              />
            </div>
            <div>
              <label style={ehrSectionFieldLabel}>GRAVITÉ / STADE / COMPLICATIONS</label>
              <textarea
                placeholder="Ex: Stade III, Grade B, avec sepsis..."
                disabled={!isEditing}
                value={form.graviteStade}
                onChange={e => setForm({ ...form, graviteStade: e.target.value })}
                style={{
                  ...inputBase,
                  resize: 'none',
                  height: 110,
                  color: '#475569',
                  backgroundColor: isEditing ? ehr.white : ehr.pageBg,
                }}
              />
            </div>
          </div>
        </EhrFormSection>

        <EhrFormSection title="Traçabilité & validation" sectionBadge="03" collapsible defaultOpen>
          {!isEditing && current && (
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottom: `1px solid ${ehr.borderSoft}`,
                paddingBottom: 16,
                marginBottom: 16,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={ehr.textMuted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                <span style={{ fontSize: 10, fontWeight: 700, color: ehr.textMuted, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Médecin responsable</span>
                <span style={{ fontSize: 13, color: ehr.text }}>{current.medecinResponsable}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={ehr.textMuted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                <span style={{ fontSize: 10, fontWeight: 700, color: ehr.textMuted, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Date de saisie</span>
                <span style={{ fontSize: 13, color: ehr.text }}>{formatDate(current.createdAt)}</span>
              </div>
            </div>
          )}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {!isEditing && current && (
              <>
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    backgroundColor: ehr.pageBg,
                    color: '#475569',
                    border: `1px solid ${ehr.borderSoft}`,
                    borderRadius: 8,
                    padding: '10px 20px',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontFamily: "'Inter', sans-serif",
                  }}
                >
                  ✏️ Modifier
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setForm({ ...emptyForm, medecinResponsable: medecinNom });
                    setIsEditing(true);
                    setCurrent(null);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    backgroundColor: ehr.primary,
                    color: ehr.white,
                    border: 'none',
                    borderRadius: 8,
                    padding: '10px 20px',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontFamily: "'Inter', sans-serif",
                  }}
                >
                  + Ajouter nouveau diagnostic
                </button>
              </>
            )}
            {isEditing && (
              <>
                {current && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditing(false);
                      load();
                    }}
                    style={{
                      backgroundColor: ehr.pageBg,
                      color: '#475569',
                      border: `1px solid ${ehr.borderSoft}`,
                      borderRadius: 8,
                      padding: '10px 20px',
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: 'pointer',
                      fontFamily: "'Inter', sans-serif",
                    }}
                  >
                    Annuler
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isSaving || !form.diagnosticPrincipal.trim()}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    backgroundColor: form.diagnosticPrincipal.trim() ? ehr.primary : ehr.primaryDisabled,
                    color: ehr.white,
                    border: 'none',
                    borderRadius: 8,
                    padding: '10px 24px',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: form.diagnosticPrincipal.trim() ? 'pointer' : 'not-allowed',
                    fontFamily: "'Inter', sans-serif",
                  }}
                >
                  {isSaving ? '⏳ Enregistrement...' : '✓ Valider le diagnostic'}
                </button>
              </>
            )}
          </div>
        </EhrFormSection>
      </div>

      <div style={{ width: 280, flexShrink: 0 }}>
        <EhrFormSection
          title="Diagnostics antérieurs"
          collapsible
          defaultOpen
          headerExtra={
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={ehr.textMuted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
          }
        >
          {anterieurs.length === 0 ? (
            <p style={{ fontSize: 12, color: ehr.textMuted, textAlign: 'center', padding: '20px 0', margin: 0 }}>
              Aucun diagnostic antérieur
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {anterieurs.slice(0, 6).map(d => (
                <div key={d.id} style={{ borderLeft: `2px solid ${ehr.borderSoft}`, paddingLeft: 10 }}>
                  <p style={{ fontSize: 11, color: ehr.textMuted, margin: '0 0 2px 0' }}>
                    {new Date(d.createdAt).toLocaleDateString('fr-FR')}
                  </p>
                  <p style={{ fontSize: 13, color: ehr.text, margin: 0, fontWeight: 500, lineHeight: 1.3 }}>
                    {d.diagnosticPrincipal}
                  </p>
                </div>
              ))}
              {anterieurs.length > 6 && (
                <p style={{ fontSize: 12, color: ehr.primary, textAlign: 'center', cursor: 'pointer', margin: 0 }}>
                  Voir tous les diagnostics →
                </p>
              )}
            </div>
          )}
        </EhrFormSection>
      </div>
    </div>
  );
}
