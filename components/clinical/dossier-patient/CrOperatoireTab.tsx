'use client';

import { useState, useEffect } from 'react';
import { dossierPatientApi as api } from '@/lib/clinical/dossier-patient-api';
import { EhrFormSection } from '@/components/clinical/dossier-patient/EhrFormSection';
import { ehr } from '@/lib/clinical/ehr-theme';

interface ChecklistMoment {
  items: Record<string, boolean>;
  valideA: string;
  commentaire: string;
}

interface CrOperatoire {
  id?: string;
  patientId?: string;
  numeroOp?: string;
  nomIntervention?: string;
  dateIntervention?: string;
  duree?: string;
  chirurgienPrincipal?: string;
  aideOperatoire?: string;
  anesthesiste?: string;
  typeAnesthesie?: string;
  classeAsa?: string;
  checklistAvantInduction?: ChecklistMoment;
  checklistAvantIncision?: ChecklistMoment;
  checklistAvantSortie?: ChecklistMoment;
  installation?: string;
  exploration?: string;
  geste?: string;
  prelevements?: string;
  scoreSccre?: string;
  complications?: string;
  statut?: string;
}

const defaultChecklist = (): ChecklistMoment => ({
  items: {},
  valideA: '',
  commentaire: '',
});

const defaultCr = (): CrOperatoire => ({
  numeroOp: '',
  nomIntervention: '',
  dateIntervention: '',
  duree: '',
  chirurgienPrincipal: '',
  aideOperatoire: '',
  anesthesiste: '',
  typeAnesthesie: '',
  classeAsa: '',
  checklistAvantInduction: defaultChecklist(),
  checklistAvantIncision: defaultChecklist(),
  checklistAvantSortie: defaultChecklist(),
  installation: '',
  exploration: '',
  geste: '',
  prelevements: '',
  scoreSccre: '',
  complications: '',
  statut: 'PLANIFIE',
});

const CHECKLIST_INDUCTION = [
  'Identité confirmée',
  'Site marqué',
  'Consentement signé',
  'Matériel vérifié',
  'Risque hémorragique évalué',
  'Allergies vérifiées',
];
const CHECKLIST_INCISION = [
  'Équipe introduite',
  'Confirmation patient/site/procédure',
  'Antibioprophylaxie administrée',
  'Imagerie disponible',
  'Problèmes anticipés discutés',
];
const CHECKLIST_SORTIE = [
  'Instruments/compresses vérifiés',
  'Pièce anatomique labellisée',
  'Problèmes équipement signalés',
  'Consignes post-op transmises',
];

const ASA_COLORS: Record<string, string> = {
  '1': '#22c55e', '2': '#3b82f6', '3': '#f59e0b', '4': '#ef4444', '5': '#7c3aed', '6': '#1e293b',
};

export function CrOperatoireTab({ patientId }: { patientId: string }) {
  const [list, setList] = useState<CrOperatoire[]>([]);
  const [selected, setSelected] = useState<CrOperatoire | null>(null);
  const [form, setForm] = useState<CrOperatoire>(defaultCr());
  const [mode, setMode] = useState<'view' | 'edit' | 'new'>('view');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchList();
  }, [patientId]);

  async function fetchList() {
    setLoading(true);
    try {
      const res = await api.get(`/patients/${patientId}/cr-operatoire`);
      const data = Array.isArray(res.data) ? res.data : [];
      setList(data);
      if (data.length > 0) {
        setSelected(data[0]);
        setForm(data[0]);
        setMode('view');
      } else {
        setMode('new');
        setForm(defaultCr());
      }
    } catch {
      setList([]);
      setMode('new');
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      let saved: CrOperatoire;
      if (form.id) {
        const res = await api.put(`/patients/${patientId}/cr-operatoire/${form.id}`, form);
        saved = res.data;
      } else {
        const res = await api.post(`/patients/${patientId}/cr-operatoire`, form);
        saved = res.data;
      }
      await fetchList();
      setSelected(saved);
      setForm(saved);
      setMode('view');
    } catch (e) {
      alert('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  }

  function setChecklist(
    key: 'checklistAvantInduction' | 'checklistAvantIncision' | 'checklistAvantSortie',
    field: string,
    value: boolean | string,
  ) {
    setForm(prev => ({
      ...prev,
      [key]: {
        ...(prev[key] || defaultChecklist()),
        ...(field === 'valideA' || field === 'commentaire'
          ? { [field]: value }
          : { items: { ...(prev[key]?.items || {}), [field]: value } }),
      },
    }));
  }

  function getJPostOp(): string {
    if (!form.dateIntervention) return '';
    const op = new Date(form.dateIntervention);
    const today = new Date();
    const diff = Math.floor((today.getTime() - op.getTime()) / (1000 * 60 * 60 * 24));
    return diff >= 0 ? `J${diff} post-op` : '';
  }

  function isChecklistValid(cl?: ChecklistMoment): boolean {
    return !!cl?.valideA;
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px', color: ehr.textMuted, fontFamily: "'Manrope', sans-serif" }}>
        Chargement...
      </div>
    );
  }

  const isView = mode === 'view';

  const opHeaderExtra =
    isView && form.numeroOp ? (
      <span style={{ backgroundColor: '#f1f5f9', border: `1px solid ${ehr.borderSoft}`, borderRadius: 8, padding: '4px 12px', fontSize: 13, fontWeight: 600, color: '#475569' }}>
        # {form.numeroOp}
      </span>
    ) : !isView ? (
      <input
        placeholder="N° opération (ex: OP-2026-442)"
        value={form.numeroOp || ''}
        onChange={e => setForm({ ...form, numeroOp: e.target.value })}
        style={{ ...inputStyle, width: 220 }}
      />
    ) : null;

  return (
    <div style={{ fontFamily: "'Manrope', sans-serif", color: ehr.text, maxWidth: '960px', margin: '0 auto', paddingBottom: '40px' }}>

      {/* Barre liste + actions */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {list.map((cr, i) => (
            <button
              key={cr.id}
              onClick={() => { setSelected(cr); setForm(cr); setMode('view'); }}
              style={{
                padding: '6px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: 600,
                border: selected?.id === cr.id ? '2px solid #05668D' : '1px solid #e2e8f0',
                backgroundColor: selected?.id === cr.id ? '#EBF5FB' : '#f8fafc',
                color: selected?.id === cr.id ? '#05668D' : '#475569',
                cursor: 'pointer',
              }}
            >
              {cr.numeroOp || `OP #${i + 1}`}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {isView && selected && (
            <button
              onClick={() => setMode('edit')}
              style={{ padding: '8px 16px', fontSize: '12px', fontWeight: 600, backgroundColor: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0', borderRadius: '8px', cursor: 'pointer' }}
            >
              ✏️ Modifier
            </button>
          )}
          <button
            onClick={() => { setForm(defaultCr()); setSelected(null); setMode('new'); }}
            style={{ padding: '8px 16px', fontSize: '12px', fontWeight: 600, backgroundColor: '#05668D', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
          >
            + Nouveau CR
          </button>
        </div>
      </div>

      <EhrFormSection
        title="Compte-rendu opératoire"
        subtitle="Intervention, date et repère opératoire"
        sectionBadge="01"
        complete={!!(form.nomIntervention?.trim() && form.dateIntervention)}
        collapsible
        defaultOpen
        headerExtra={opHeaderExtra}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#475569', fontSize: 14 }}>
          <span>📅</span>
          {isView ? (
            <span style={{ fontWeight: 500 }}>
              {form.nomIntervention || '—'}
              {form.dateIntervention ? ` – ${new Date(form.dateIntervention).toLocaleDateString('fr-FR')}` : ''}
              {getJPostOp() ? ` (${getJPostOp()})` : ''}
            </span>
          ) : (
            <div style={{ display: 'flex', gap: '10px', flex: 1, flexWrap: 'wrap' }}>
              <input
                placeholder="Nom de l'intervention *"
                value={form.nomIntervention || ''}
                onChange={e => setForm({ ...form, nomIntervention: e.target.value })}
                style={{ ...inputStyle, flex: 2, minWidth: '200px' }}
              />
              <input
                type="datetime-local"
                value={form.dateIntervention || ''}
                onChange={e => setForm({ ...form, dateIntervention: e.target.value })}
                style={{ ...inputStyle, flex: 1, minWidth: '180px' }}
              />
            </div>
          )}
        </div>
      </EhrFormSection>

      <EhrFormSection title="Bloc · équipe · checklist" sectionBadge="02" collapsible defaultOpen>
        <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: '24px' }}>
          <div>
            <div style={{ marginBottom: '24px' }}>
              <p style={sectionLabelStyle}>INFORMATIONS OPÉRATOIRES</p>
              <InfoField label="CHIRURGIEN PRINCIPAL" value={form.chirurgienPrincipal} isView={isView} placeholder="Dr. ..." onChange={v => setForm({ ...form, chirurgienPrincipal: v })} required />
              <InfoField label="AIDE-OPÉRATOIRE" value={form.aideOperatoire} isView={isView} placeholder="Dr. ..." onChange={v => setForm({ ...form, aideOperatoire: v })} />
              <InfoField label="ANESTHÉSISTE" value={form.anesthesiste} isView={isView} placeholder="Dr. ..." onChange={v => setForm({ ...form, anesthesiste: v })} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <InfoField
                  label="DATE/HEURE"
                  value={
                    isView && form.dateIntervention
                      ? new Date(form.dateIntervention).toLocaleString('fr-FR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : form.dateIntervention
                  }
                  isView={isView}
                  placeholder="JJ/MM/AAAA"
                  onChange={v => setForm({ ...form, dateIntervention: v })}
                  hideInput
                />
                <InfoField label="DURÉE" value={form.duree} isView={isView} placeholder="ex: 1h15" onChange={v => setForm({ ...form, duree: v })} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <InfoField label="ANESTHÉSIE" value={form.typeAnesthesie} isView={isView} placeholder="Générale / Loco..." onChange={v => setForm({ ...form, typeAnesthesie: v })} />
                <div>
                  <p style={{ ...fieldLabelStyle, marginTop: '10px' }}>CLASSE ASA</p>
                  {isView ? (
                    <span style={{ fontSize: '15px', fontWeight: 700, color: ASA_COLORS[form.classeAsa || ''] || '#1e293b' }}>{form.classeAsa || '—'}</span>
                  ) : (
                    <select value={form.classeAsa || ''} onChange={e => setForm({ ...form, classeAsa: e.target.value })} style={{ ...inputStyle, height: '36px' }}>
                      <option value="">—</option>
                      {['1', '2', '3', '4', '5', '6', 'ASAE'].map(v => (
                        <option key={v} value={v}>
                          {v}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
            </div>
            <div>
              <p style={sectionLabelStyle}>CHECKLIST SÉCURITÉ OMS</p>
              <ChecklistBlock
                label="Avant l'induction"
                items={CHECKLIST_INDUCTION}
                data={form.checklistAvantInduction || defaultChecklist()}
                isView={isView}
                onChange={(f, v) => setChecklist('checklistAvantInduction', f, v)}
              />
              <ChecklistBlock
                label="Avant l'incision"
                items={CHECKLIST_INCISION}
                data={form.checklistAvantIncision || defaultChecklist()}
                isView={isView}
                onChange={(f, v) => setChecklist('checklistAvantIncision', f, v)}
              />
              <ChecklistBlock
                label="Sortie du bloc"
                items={CHECKLIST_SORTIE}
                data={form.checklistAvantSortie || defaultChecklist()}
                isView={isView}
                onChange={(f, v) => setChecklist('checklistAvantSortie', f, v)}
              />
            </div>
          </div>
          <div>
            <p style={sectionLabelStyle}>DESCRIPTION CHIRURGICALE / TECHNIQUE OPÉRATOIRE</p>
            <div style={{ backgroundColor: '#f8fafc', border: `1px solid ${ehr.borderSoft}`, borderRadius: 12, padding: '18px' }}>
              <TextBlock label="Installation :" value={form.installation} isView={isView} placeholder="Positionnement du patient, installation de l'équipe..." onChange={v => setForm({ ...form, installation: v })} />
              <TextBlock label="Exploration :" value={form.exploration} isView={isView} placeholder="Findings per-opératoires, anatomie observée..." onChange={v => setForm({ ...form, exploration: v })} />
              <TextBlock label="Geste :" value={form.geste} isView={isView} placeholder="Description détaillée du geste chirurgical..." onChange={v => setForm({ ...form, geste: v })} last />
            </div>
          </div>
        </div>
      </EhrFormSection>

      <EhrFormSection title="Prélèvements & évolution post-op" sectionBadge="03" collapsible defaultOpen>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div style={{ backgroundColor: ehr.highlightBlueTint, border: `1px solid ${ehr.highlightBorder}`, borderRadius: 12, padding: '16px' }}>
            <p style={{ ...sectionLabelStyle, color: ehr.primary }}>PRÉLÈVEMENTS & HISTOLOGIE</p>
            {isView ? (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '13px', color: '#1e293b' }}>
                <span>🔬</span>
                <span>{form.prelevements || 'Aucun prélèvement renseigné'}</span>
              </div>
            ) : (
              <textarea
                placeholder="Ex: Pièce de cholécystectomie envoyée en anapath..."
                value={form.prelevements || ''}
                onChange={e => setForm({ ...form, prelevements: e.target.value })}
                style={{ ...inputStyle, height: '80px', resize: 'none', fontSize: '12px' }}
              />
            )}
          </div>
          <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '12px', padding: '16px' }}>
            <p style={{ ...sectionLabelStyle, color: '#16a34a' }}>ÉVOLUTION POST-OP IMMÉDIATE</p>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>SCORE SCCRE</span>
              {isView ? (
                <span style={{ fontSize: '16px', fontWeight: 700, color: Number(form.scoreSccre) >= 9 ? '#16a34a' : '#ef4444' }}>{form.scoreSccre || '—'}/10</span>
              ) : (
                <select value={form.scoreSccre || ''} onChange={e => setForm({ ...form, scoreSccre: e.target.value })} style={{ ...inputStyle, width: '80px', height: '32px', textAlign: 'center' }}>
                  <option value="">—</option>
                  {Array.from({ length: 11 }, (_, i) => (
                    <option key={i} value={String(i)}>
                      {i}
                    </option>
                  ))}
                </select>
              )}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>COMPLICATIONS</span>
              {isView ? (
                <span style={{ fontSize: '13px', fontWeight: 600, color: form.complications && form.complications !== 'Aucune' ? '#ef4444' : '#16a34a' }}>{form.complications || 'Aucune'}</span>
              ) : (
                <input value={form.complications || ''} onChange={e => setForm({ ...form, complications: e.target.value })} placeholder="Aucune" style={{ ...inputStyle, width: '130px', height: '32px', fontSize: '12px' }} />
              )}
            </div>
            {Number(form.scoreSccre) >= 9 && (
              <div style={{ fontSize: '11px', color: '#16a34a', fontWeight: 500 }}>✅ Score SCCRE ≥ 9 — Sortie de salle de réveil autorisée</div>
            )}
            {form.scoreSccre && Number(form.scoreSccre) < 9 && (
              <div style={{ fontSize: '11px', color: '#ef4444', fontWeight: 500 }}>
                ⚠️ Score SCCRE {'<'} 9 — Maintien en salle de réveil requis
              </div>
            )}
          </div>
        </div>
      </EhrFormSection>

      {!isView && (
        <EhrFormSection title="Enregistrement du compte-rendu" sectionBadge="04" collapsible defaultOpen>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', flexWrap: 'wrap' }}>
            {list.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setForm(selected || list[0]);
                  setMode('view');
                }}
                style={{ padding: '10px 20px', fontSize: '13px', fontWeight: 600, backgroundColor: '#f8fafc', color: '#475569', border: `1px solid ${ehr.borderSoft}`, borderRadius: '8px', cursor: 'pointer' }}
              >
                Annuler
              </button>
            )}
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              style={{ padding: '10px 24px', fontSize: '13px', fontWeight: 600, backgroundColor: ehr.primary, color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', opacity: saving ? 0.7 : 1 }}
            >
              {saving ? 'Sauvegarde...' : '💾 Valider le CR opératoire'}
            </button>
          </div>
        </EhrFormSection>
      )}

      {isView && form.statut === 'TERMINE' && (
        <EhrFormSection title="Traçabilité" subtitle="Compte-rendu validé" collapsible defaultOpen={false}>
          <div style={{ textAlign: 'center', fontSize: 12, color: '#94a3b8' }}>🔒 Compte-rendu opératoire validé – Traçabilité complète exigée par le SIH CHU</div>
        </EhrFormSection>
      )}
    </div>
  );
}

// ─── Sous-composants ───────────────────────────────────────────────────────────

function InfoField({ label, value, isView, placeholder, onChange, required, hideInput }: {
  label: string; value?: string; isView: boolean; placeholder?: string;
  onChange: (v: string) => void; required?: boolean; hideInput?: boolean;
}) {
  return (
    <div style={{ marginBottom: '10px' }}>
      <p style={fieldLabelStyle}>{label}{required && <span style={{ color: '#ef4444' }}> *</span>}</p>
      {isView || hideInput ? (
        <p style={{ fontSize: '14px', fontWeight: 600, color: '#1e293b', margin: 0 }}>{value || '—'}</p>
      ) : (
        <input value={value || ''} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={inputStyle} />
      )}
    </div>
  );
}

function TextBlock({ label, value, isView, placeholder, onChange, last }: {
  label: string; value?: string; isView: boolean; placeholder?: string;
  onChange: (v: string) => void; last?: boolean;
}) {
  return (
    <div style={{ marginBottom: last ? 0 : '16px' }}>
      <p style={{ fontSize: '13px', fontWeight: 700, color: '#05668D', margin: '0 0 6px 0' }}>{label}</p>
      {isView ? (
        <p style={{ fontSize: '13px', color: '#334155', margin: 0, lineHeight: 1.6 }}>{value || '—'}</p>
      ) : (
        <textarea value={value || ''} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={{ ...inputStyle, height: '80px', resize: 'vertical', fontSize: '13px' }} />
      )}
    </div>
  );
}

function ChecklistBlock({ label, items, data, isView, onChange }: {
  label: string;
  items: string[];
  data: ChecklistMoment;
  isView: boolean;
  onChange: (field: string, value: boolean | string) => void;
}) {
  const allChecked = items.every(item => data.items?.[item]);
  const validated = !!data.valideA;

  return (
    <div style={{ marginBottom: '12px', backgroundColor: validated ? '#f0fdf4' : '#f8fafc', border: `1px solid ${validated ? '#bbf7d0' : '#e2e8f0'}`, borderRadius: '10px', padding: '12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '20px', height: '20px', borderRadius: '50%', backgroundColor: validated ? '#16a34a' : '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', color: 'white', fontWeight: 700 }}>
            {validated ? '✓' : ''}
          </div>
          <span style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>{label}</span>
        </div>
        {validated && <span style={{ fontSize: '11px', color: '#16a34a', fontWeight: 500 }}>Validé ({data.valideA})</span>}
      </div>

      {!isView && (
        <>
          {items.map(item => (
            <label key={item} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '5px', cursor: 'pointer', fontSize: '12px', color: '#475569' }}>
              <input type="checkbox" checked={!!data.items?.[item]} onChange={e => onChange(item, e.target.checked)} />
              {item}
            </label>
          ))}
          {allChecked && (
            <div style={{ marginTop: '8px' }}>
              <label style={{ fontSize: '11px', color: '#64748b', display: 'block', marginBottom: '3px' }}>Heure de validation</label>
              <input
                type="time"
                value={data.valideA || ''}
                onChange={e => onChange('valideA', e.target.value)}
                style={{ ...inputStyle, height: '30px', fontSize: '12px', width: '100px' }}
              />
            </div>
          )}
        </>
      )}

      {isView && !validated && (
        <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0, fontStyle: 'italic' }}>Non validé</p>
      )}
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const sectionLabelStyle: React.CSSProperties = {
  fontSize: '11px', fontWeight: 700, color: '#94a3b8',
  textTransform: 'uppercase', letterSpacing: '0.08em',
  margin: '0 0 12px 0',
};
const fieldLabelStyle: React.CSSProperties = {
  fontSize: '10px', fontWeight: 600, color: '#94a3b8',
  textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 3px 0',
};
const inputStyle: React.CSSProperties = {
  width: '100%', border: '1px solid #e2e8f0', borderRadius: '8px',
  padding: '7px 10px', fontSize: '13px', color: '#1e293b',
  outline: 'none', fontFamily: "'Manrope', sans-serif",
  boxSizing: 'border-box', backgroundColor: '#ffffff',
};
