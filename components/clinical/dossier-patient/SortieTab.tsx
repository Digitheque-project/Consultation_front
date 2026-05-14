'use client';

import { useState, useEffect, useRef } from 'react';
import { dossierPatientApi as api } from '@/lib/clinical/dossier-patient-api';
import { EhrFormSection } from '@/components/clinical/dossier-patient/EhrFormSection';
import { ehr } from '@/lib/clinical/ehr-theme';
import { Home, ArrowRightLeft, AlertTriangle, FileCheck, UserMinus, FileText, ClipboardList, PenTool, Trash2, CheckCircle2 } from 'lucide-react';

interface Sortie {
  id?: string;
  typeSortie?: string;
  dateSortieprevue?: string;
  medecinValidant?: string;
  compteRenduSortie?: string;
  suiviPostSortie?: string;
  etablissementTransfert?: string;
  motifTransfert?: string;
  statutTransfert?: string;
  justificationTransfert?: string;
  ordonnanceSortieGeneree?: boolean;
  instructionsPostOpGenerees?: boolean;
  signatureData?: string;
  signatureHorodatage?: string;
  statut?: string;
}

const TYPES_SORTIE = [
  { key: 'NORMALE', label: 'Sortie normale /\nRetour à domicile', icon: <Home size={22} /> },
  { key: 'TRANSFERT', label: 'Transfert vers service\n/ hôpital', icon: <ArrowRightLeft size={22} /> },
  { key: 'CONTRE_AVIS', label: 'Sortie contre avis /\nÉvadé', icon: <AlertTriangle size={22} /> },
  { key: 'DECHARGE', label: 'Décharge\nadministrative', icon: <FileCheck size={22} /> },
  { key: 'DECES', label: 'Décès', icon: <UserMinus size={22} /> },
];

export function SortieTab({ patientId }: { patientId: string }) {
  const [form, setForm] = useState<Sortie>({ typeSortie: 'NORMALE', statut: 'EN_COURS' });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [signed, setSigned] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lastPos = useRef<{ x: number; y: number } | null>(null);
  const [lastUpdate, setLastUpdate] = useState<string>('');

  useEffect(() => { fetchSortie(); }, [patientId]);

  async function fetchSortie() {
    setLoading(true);
    try {
      const res = await api.get(`/patients/${patientId}/sortie`);
      const data = Array.isArray(res.data) && res.data.length > 0 ? res.data[0] : null;
      if (data) {
        setForm(data);
        setLastUpdate(data.updatedAt || data.createdAt || '');
        if (data.signatureData) setSigned(true);
      }
    } catch { /* pas de sortie existante */ }
    finally { setLoading(false); }
  }

  async function handleSave() {
    setSaving(true);
    try {
      if (form.id) {
        const res = await api.put(`/patients/${patientId}/sortie/${form.id}`, form);
        setForm(res.data);
        setLastUpdate(res.data.updatedAt || '');
      } else {
        const res = await api.post(`/patients/${patientId}/sortie`, form);
        setForm(res.data);
        setLastUpdate(res.data.updatedAt || '');
      }
    } catch { alert('Erreur lors de la sauvegarde'); }
    finally { setSaving(false); }
  }

  async function handleValider() {
    if (!form.id) { alert('Sauvegardez d\'abord le formulaire.'); return; }
    if (!signed) { alert('La signature numérique est obligatoire.'); return; }
    if (!form.typeSortie) { alert('Le type de sortie est obligatoire.'); return; }
    if (!form.dateSortieprevue) { alert('La date de sortie est obligatoire.'); return; }
    const canvas = canvasRef.current;
    const signatureData = canvas ? canvas.toDataURL() : '';
    setSaving(true);
    try {
      const res = await api.put(`/patients/${patientId}/sortie/${form.id}/valider`, { signatureData });
      setForm(res.data);
      alert('✅ Sortie validée et dossier clôturé.');
    } catch { alert('Erreur lors de la validation.'); }
    finally { setSaving(false); }
  }

  // Canvas signature
  function getPos(e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    if ('touches' in e) {
      return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
    }
    return { x: (e as React.MouseEvent).clientX - rect.left, y: (e as React.MouseEvent).clientY - rect.top };
  }

  function startDraw(e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) {
    setIsDrawing(true);
    lastPos.current = getPos(e);
  }

  function draw(e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) {
    if (!isDrawing) return;
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(lastPos.current!.x, lastPos.current!.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = '#05668D';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.stroke();
    lastPos.current = pos;
    setSigned(true);
  }

  function stopDraw() { setIsDrawing(false); lastPos.current = null; }

  function clearSignature() {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setSigned(false);
  }

  const isCloture = form.statut === 'CLOTURE';

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px', color: '#64748b', fontFamily: "'Manrope', sans-serif" }}>
      Chargement...
    </div>
  );

  return (
    <div style={{ fontFamily: "'Manrope', sans-serif", color: ehr.text, maxWidth: '960px', margin: '0 auto', paddingBottom: '40px' }}>

      <EhrFormSection
        title="Sortie du patient"
        subtitle="Décision de sortie – Épisode actuel"
        sectionBadge="01"
        complete={!!form.typeSortie && !!form.dateSortieprevue}
        collapsible
        defaultOpen
      >
        <p style={sectionLabelStyle}>TYPE DE SORTIE</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '10px' }}>
          {TYPES_SORTIE.map(t => (
            <button
              key={t.key}
              type="button"
              disabled={isCloture}
              onClick={() => setForm({ ...form, typeSortie: t.key })}
              style={{
                padding: '16px 8px',
                borderRadius: 12,
                border: form.typeSortie === t.key ? `2px solid ${ehr.primary}` : `1px solid ${ehr.borderSoft}`,
                backgroundColor: form.typeSortie === t.key ? ehr.highlightBlueTint : ehr.pageBg,
                color: form.typeSortie === t.key ? ehr.primary : '#475569',
                cursor: isCloture ? 'default' : 'pointer',
                textAlign: 'center',
                fontFamily: "'Manrope', sans-serif",
                transition: 'all 0.15s',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px' }}>{t.icon}</div>
              <div style={{ fontSize: '11px', fontWeight: 600, lineHeight: 1.4, whiteSpace: 'pre-line' }}>{t.label}</div>
            </button>
          ))}
        </div>
      </EhrFormSection>

      {form.typeSortie === 'TRANSFERT' && (
        <EhrFormSection title="Informations de transfert" sectionBadge="02" collapsible defaultOpen>
          <div style={{ backgroundColor: '#fffbeb', border: '1px solid #fde68a', borderRadius: 12, padding: 16 }}>
            <p style={{ ...sectionLabelStyle, color: '#b45309' }}>TRANSFERT</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
              <div>
                <label style={fieldLabelStyle}>Établissement receveur *</label>
                <input
                  disabled={isCloture}
                  value={form.etablissementTransfert || ''}
                  onChange={e => setForm({ ...form, etablissementTransfert: e.target.value })}
                  placeholder="Nom de l'hôpital / service"
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={fieldLabelStyle}>Statut transfert *</label>
                <select
                  disabled={isCloture}
                  value={form.statutTransfert || ''}
                  onChange={e => setForm({ ...form, statutTransfert: e.target.value })}
                  style={{ ...inputStyle, cursor: 'pointer' }}
                >
                  <option value="">— Sélectionner —</option>
                  <option value="ACCEPTE">Accepté</option>
                  <option value="A_VOIR">À voir</option>
                  <option value="REFUSE">Refusé</option>
                </select>
              </div>
            </div>
            <div>
              <label style={fieldLabelStyle}>Motif du transfert</label>
              <textarea
                disabled={isCloture}
                value={form.motifTransfert || ''}
                onChange={e => setForm({ ...form, motifTransfert: e.target.value })}
                placeholder="Motif clinique du transfert..."
                style={{ ...inputStyle, height: '60px', resize: 'none' }}
              />
            </div>
            {form.statutTransfert === 'REFUSE' && (
              <div style={{ marginTop: '10px' }}>
                <label style={fieldLabelStyle}>Justification du refus *</label>
                <textarea
                  disabled={isCloture}
                  value={form.justificationTransfert || ''}
                  onChange={e => setForm({ ...form, justificationTransfert: e.target.value })}
                  placeholder="Raison du refus..."
                  style={{ ...inputStyle, height: '60px', resize: 'none' }}
                />
              </div>
            )}
          </div>
        </EhrFormSection>
      )}

      <EhrFormSection
        title="Planification, compte-rendu et suivi"
        subtitle="Date de sortie, médecin, documents et suivi post-sortie"
        sectionBadge="03"
        complete={!!form.dateSortieprevue && !!(form.compteRenduSortie || '').trim()}
        collapsible
        defaultOpen
      >
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>

          {/* Colonne gauche */}
          <div>
            <div style={{ marginBottom: '16px' }}>
              <label style={fieldLabelStyle}>Date et heure de sortie prévue <span style={{ color: '#ef4444' }}>*</span></label>
              <input
                type="datetime-local"
                disabled={isCloture}
                value={form.dateSortieprevue || ''}
                onChange={e => setForm({ ...form, dateSortieprevue: e.target.value })}
                style={inputStyle}
              />
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={fieldLabelStyle}>Médecin validant la sortie</label>
              <input
                disabled={isCloture}
                value={form.medecinValidant || ''}
                onChange={e => setForm({ ...form, medecinValidant: e.target.value })}
                placeholder="Dr. ..."
                style={inputStyle}
              />
            </div>
            <div>
              <label style={fieldLabelStyle}>Compte-rendu de sortie</label>
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                {!isCloture && (
                  <div style={{ display: 'flex', gap: '4px', padding: '6px 8px', borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
                    {['B', 'I', '≡'].map(btn => (
                      <button key={btn} style={{ width: '28px', height: '24px', fontSize: '12px', fontWeight: 700, border: '1px solid #e2e8f0', borderRadius: '4px', backgroundColor: 'white', cursor: 'pointer', color: '#475569' }}>
                        {btn}
                      </button>
                    ))}
                  </div>
                )}
                <textarea
                  disabled={isCloture}
                  value={form.compteRenduSortie || ''}
                  onChange={e => setForm({ ...form, compteRenduSortie: e.target.value })}
                  placeholder="Saisir le compte-rendu médical final..."
                  style={{ ...inputStyle, height: '160px', resize: 'none', border: 'none', borderRadius: 0, backgroundColor: isCloture ? '#f8fafc' : 'white' }}
                />
              </div>
            </div>
          </div>

          {/* Colonne droite */}
          <div>
            {/* Documents & Suivi */}
            <div style={{ marginBottom: '20px' }}>
              <label style={fieldLabelStyle}>Documents et Suivi</label>
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden' }}>
                <div
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: '1px solid #e2e8f0', cursor: 'pointer', backgroundColor: form.ordonnanceSortieGeneree ? '#f0fdf4' : 'white' }}
                  onClick={() => !isCloture && setForm({ ...form, ordonnanceSortieGeneree: !form.ordonnanceSortieGeneree })}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <FileText size={16} />
                    <span style={{ fontSize: '13px', fontWeight: 600, color: form.ordonnanceSortieGeneree ? '#16a34a' : '#05668D' }}>Ordonnance de sortie</span>
                  </div>
                  <span style={{ fontSize: '13px', color: '#94a3b8' }}>{form.ordonnanceSortieGeneree ? <CheckCircle2 size={16} color="#16a34a" /> : '›'}</span>
                </div>
                <div
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', cursor: 'pointer', backgroundColor: form.instructionsPostOpGenerees ? '#f0fdf4' : 'white' }}
                  onClick={() => !isCloture && setForm({ ...form, instructionsPostOpGenerees: !form.instructionsPostOpGenerees })}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <ClipboardList size={16} />
                    <span style={{ fontSize: '13px', fontWeight: 600, color: form.instructionsPostOpGenerees ? '#16a34a' : '#475569' }}>Instructions de sortie post-op</span>
                  </div>
                  <span style={{ fontSize: '13px', color: '#94a3b8' }}>{form.instructionsPostOpGenerees ? <CheckCircle2 size={16} color="#16a34a" /> : '›'}</span>
                </div>
              </div>
            </div>

            {/* Suivi post-sortie */}
            <div>
              <label style={fieldLabelStyle}>Suivi post-sortie recommandé</label>
              <textarea
                disabled={isCloture}
                value={form.suiviPostSortie || ''}
                onChange={e => setForm({ ...form, suiviPostSortie: e.target.value })}
                placeholder="Détails du suivi (ex: Infirmière à domicile, rdv dans 15 jours...)"
                style={{ ...inputStyle, height: '120px', resize: 'none' }}
              />
            </div>
          </div>
        </div>
      </EhrFormSection>

      <EhrFormSection
        title="Signature et validation"
        subtitle="Signature obligatoire avant clôture du dossier"
        sectionBadge="04"
        complete={signed || (!!(isCloture && form.signatureHorodatage))}
        collapsible
        defaultOpen
      >
        <p style={sectionLabelStyle}>SIGNATURE NUMÉRIQUE DU MÉDECIN</p>
        {isCloture && form.signatureHorodatage ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '14px 18px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', width: 'fit-content' }}>
            <CheckCircle2 size={18} color="#16a34a" />
            <div>
              <p style={{ fontSize: '13px', fontWeight: 600, color: '#16a34a', margin: 0 }}>Signature validée</p>
              <p style={{ fontSize: '11px', color: '#64748b', margin: 0 }}>
                {new Date(form.signatureHorodatage).toLocaleString('fr-FR')}
              </p>
            </div>
          </div>
        ) : (
          <div style={{ width: '300px' }}>
            <div style={{ border: `1px solid ${ehr.borderSoft}`, borderRadius: '10px', overflow: 'hidden', backgroundColor: '#fafafa' }}>
              <canvas
                ref={canvasRef}
                width={298}
                height={120}
                onMouseDown={startDraw}
                onMouseMove={draw}
                onMouseUp={stopDraw}
                onMouseLeave={stopDraw}
                onTouchStart={startDraw}
                onTouchMove={draw}
                onTouchEnd={stopDraw}
                style={{ display: 'block', cursor: 'crosshair', touchAction: 'none' }}
              />
              {!signed && (
                <div style={{ position: 'absolute', pointerEvents: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '298px', marginTop: '-120px', height: '120px' }}>
                  <PenTool size={20} color="#cbd5e1" />
                  <span style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>Cliquer pour signer</span>
                </div>
              )}
            </div>
            {signed && (
              <button
                type="button"
                onClick={clearSignature}
                style={{ marginTop: '6px', fontSize: '11px', color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <Trash2 size={12} /> Effacer la signature
              </button>
            )}
          </div>
        )}

        {!isCloture && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '20px', marginTop: '8px', borderTop: `1px solid ${ehr.borderSoft}` }}>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              style={{ padding: '10px 20px', fontSize: '13px', fontWeight: 600, backgroundColor: '#f1f5f9', color: '#475569', border: `1px solid ${ehr.borderSoft}`, borderRadius: '8px', cursor: 'pointer' }}
            >
              {saving ? 'Sauvegarde...' : '💾 Sauvegarder le brouillon'}
            </button>
            <button
              type="button"
              onClick={handleValider}
              disabled={saving || !signed}
              style={{
                padding: '12px 28px', fontSize: '14px', fontWeight: 700,
                backgroundColor: signed ? '#0f766e' : '#94a3b8',
                color: 'white', border: 'none', borderRadius: '10px',
                cursor: signed ? 'pointer' : 'not-allowed',
                boxShadow: signed ? '0 2px 8px rgba(15,118,110,0.3)' : 'none',
              }}
            >
              Valider la sortie et clôturer le dossier
            </button>
          </div>
        )}
      </EhrFormSection>

      <EhrFormSection title="Statut du dossier" sectionBadge="05" collapsible defaultOpen>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: isCloture ? '#16a34a' : '#3b82f6' }} />
          <span style={{ fontSize: '14px', fontWeight: 700, color: '#1e293b' }}>
            {isCloture ? 'Dossier clôturé' : 'Statut actuel : Patient hospitalisé'}
          </span>
        </div>
        {lastUpdate && (
          <p style={{ fontSize: '11px', color: '#94a3b8', margin: '4px 0 0 16px' }}>
            Dernière mise à jour : {new Date(lastUpdate).toLocaleString('fr-FR')}
          </p>
        )}
        {isCloture && (
          <div style={{ marginTop: '16px', textAlign: 'center', fontSize: '12px', color: '#94a3b8', fontStyle: 'italic' }}>
            La validation de la sortie clôture définitivement l'épisode d'hospitalisation et génère le compte-rendu de sortie.
          </div>
        )}
      </EhrFormSection>
    </div>
  );
}

const sectionLabelStyle: React.CSSProperties = {
  fontSize: '11px', fontWeight: 700, color: '#94a3b8',
  textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 12px 0',
};
const fieldLabelStyle: React.CSSProperties = {
  display: 'block', fontSize: '11px', fontWeight: 600, color: '#64748b',
  marginBottom: '5px',
};
const inputStyle: React.CSSProperties = {
  width: '100%', border: '1px solid #e2e8f0', borderRadius: '8px',
  padding: '9px 12px', fontSize: '13px', color: '#1e293b',
  outline: 'none', fontFamily: "'Manrope', sans-serif",
  boxSizing: 'border-box', backgroundColor: '#ffffff',
};
