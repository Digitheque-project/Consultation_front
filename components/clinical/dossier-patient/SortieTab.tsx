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
  { key: 'CONTRE_AVIS', label: 'Sortie contre avis /\nDécharge administrative', icon: <AlertTriangle size={22} /> },
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
    padding: '12px 16px',
    fontSize: 14,
    color: ehr.text,
    outline: 'none',
    fontFamily: "'Manrope', sans-serif",
    boxSizing: 'border-box',
    backgroundColor: '#F8FAFC',
    transition: 'all 0.2s ease',
  };

  const isCloture = form.statut === 'CLOTURE';

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px', color: ehr.textMuted, fontFamily: "'Manrope', sans-serif" }}>
      Chargement...
    </div>
  );

  return (
    <div style={{ fontFamily: "'Manrope', sans-serif", color: ehr.text, maxWidth: '100%', margin: '0 auto' }}>

      {/* Header Section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 }}>
        <div>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>Sortie du patient</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: ehr.textMuted }}>
              <span style={{ fontSize: 13, fontWeight: 500 }}>Clôture de l'épisode de soins et formalités</span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '8px 16px', borderRadius: 10,
            backgroundColor: isCloture ? '#F0FDF4' : '#F1F5F9',
            border: `1px solid ${isCloture ? '#BBF7D0' : ehr.borderSoft}`,
            color: isCloture ? '#16A34A' : ehr.textMuted,
            fontSize: 13, fontWeight: 700
          }}>
            {isCloture ? '✓ ÉPISODE CLÔTURÉ' : 'PATIENT HOSPITALISÉ'}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* Section 1: Type de Sortie */}
        <div style={{
          backgroundColor: '#fff',
          border: `1px solid ${ehr.borderSoft}`,
          borderRadius: 16,
          padding: 24,
          boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
        }}>
          <label style={labelStyle}>MODE DE SORTIE</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16 }}>
            {TYPES_SORTIE.map(t => (
              <button
                key={t.key}
                disabled={isCloture}
                onClick={() => setForm({ ...form, typeSortie: t.key })}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
                  padding: '20px 12px', borderRadius: 14,
                  border: `2px solid ${form.typeSortie === t.key ? ehr.primary : 'transparent'}`,
                  backgroundColor: form.typeSortie === t.key ? ehr.highlightBlueTint : '#F8FAFC',
                  color: form.typeSortie === t.key ? ehr.primary : ehr.textMuted,
                  cursor: isCloture ? 'default' : 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                <div style={{ opacity: form.typeSortie === t.key ? 1 : 0.6 }}>{t.icon}</div>
                <span style={{ fontSize: 11, fontWeight: 800, textAlign: 'center', lineHeight: 1.4, whiteSpace: 'pre-line' }}>{t.label}</span>
              </button>
            ))}
          </div>
        </div>

        {form.typeSortie === 'TRANSFERT' && (
          <div style={{
            backgroundColor: '#FFF7ED',
            border: '1px solid #FED7AA',
            borderRadius: 16,
            padding: 24
          }}>
            <label style={{ ...labelStyle, color: '#C2410C' }}>INFORMATIONS DE TRANSFERT</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 20, marginBottom: 20 }}>
              <div>
                <label style={{ ...labelStyle, fontSize: 10, marginBottom: 4 }}>Établissement receveur *</label>
                <input
                  disabled={isCloture}
                  value={form.etablissementTransfert || ''}
                  onChange={e => setForm({ ...form, etablissementTransfert: e.target.value })}
                  placeholder="Hôpital, service, clinique..."
                  style={{ ...inputStyle, backgroundColor: '#fff' }}
                />
              </div>
              <div>
                <label style={{ ...labelStyle, fontSize: 10, marginBottom: 4 }}>Statut du transfert *</label>
                <select
                  disabled={isCloture}
                  value={form.statutTransfert || ''}
                  onChange={e => setForm({ ...form, statutTransfert: e.target.value })}
                  style={{ ...inputStyle, backgroundColor: '#fff' }}
                >
                  <option value="">— Sélectionner —</option>
                  <option value="ACCEPTE">✅ Accepté</option>
                  <option value="A_VOIR">⏳ En attente</option>
                  <option value="REFUSE">❌ Refusé</option>
                </select>
              </div>
            </div>
            <div>
              <label style={{ ...labelStyle, fontSize: 10, marginBottom: 4 }}>Motif clinique & Justification</label>
              <textarea
                disabled={isCloture}
                value={form.motifTransfert || ''}
                onChange={e => setForm({ ...form, motifTransfert: e.target.value })}
                placeholder="Raison détaillée du transfert..."
                style={{ ...inputStyle, height: 80, backgroundColor: '#fff', resize: 'none' }}
              />
            </div>
          </div>
        )}

        {/* Section 2: Détails Médicaux & Planification */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 24 }}>

          <div style={{
            backgroundColor: '#fff',
            border: `1px solid ${ehr.borderSoft}`,
            borderRadius: 16,
            padding: 24
          }}>
            <h3 style={{ ...labelStyle, marginBottom: 20 }}>Détails de la Sortie</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
              <div>
                <label style={labelStyle}>DATE & HEURE PRÉVUE *</label>
                <input
                  type="datetime-local"
                  disabled={isCloture}
                  value={form.dateSortieprevue || ''}
                  onChange={e => setForm({ ...form, dateSortieprevue: e.target.value })}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>MÉDECIN VALIDANT</label>
                <input
                  disabled={isCloture}
                  value={form.medecinValidant || ''}
                  onChange={e => setForm({ ...form, medecinValidant: e.target.value })}
                  placeholder="Dr. ..."
                  style={inputStyle}
                />
              </div>
            </div>
            <div>
              <label style={labelStyle}>COMPTE-RENDU DE SORTIE</label>
              <textarea
                disabled={isCloture}
                value={form.compteRenduSortie || ''}
                onChange={e => setForm({ ...form, compteRenduSortie: e.target.value })}
                placeholder="Résumé médical, conclusion de l'hospitalisation..."
                style={{ ...inputStyle, height: 180, resize: 'none' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div style={{
              backgroundColor: '#fff',
              border: `1px solid ${ehr.borderSoft}`,
              borderRadius: 16,
              padding: 24
            }}>
              <h3 style={{ ...labelStyle, marginBottom: 20 }}>Documents & Ordonnances</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <DocumentToggle
                  icon={<FileText size={18} />}
                  label="Ordonnance de sortie"
                  active={!!form.ordonnanceSortieGeneree}
                  onClick={() => !isCloture && setForm({ ...form, ordonnanceSortieGeneree: !form.ordonnanceSortieGeneree })}
                />
                <DocumentToggle
                  icon={<ClipboardList size={18} />}
                  label="Instructions post-opératoires"
                  active={!!form.instructionsPostOpGenerees}
                  onClick={() => !isCloture && setForm({ ...form, instructionsPostOpGenerees: !form.instructionsPostOpGenerees })}
                />
              </div>
            </div>

            <div style={{
              backgroundColor: ehr.highlightBlueTint,
              border: `1px solid ${ehr.highlightBorder}`,
              borderRadius: 16,
              padding: 24
            }}>
              <label style={{ ...labelStyle, color: ehr.primary }}>SUIVI RECOMMANDÉ</label>
              <textarea
                disabled={isCloture}
                value={form.suiviPostSortie || ''}
                onChange={e => setForm({ ...form, suiviPostSortie: e.target.value })}
                placeholder="Soins à domicile, rendez-vous de contrôle..."
                style={{ ...inputStyle, height: 100, backgroundColor: '#fff', resize: 'none' }}
              />
            </div>
          </div>
        </div>

        {/* Section 3: Signature & Validation */}
        <div style={{
          backgroundColor: '#fff',
          border: `1px solid ${ehr.borderSoft}`,
          borderRadius: 16,
          padding: 24
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>SIGNATURE NUMÉRIQUE DU MÉDECIN</label>
              {isCloture && form.signatureHorodatage ? (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 16,
                  padding: 20, backgroundColor: '#F0FDF4',
                  border: '1px solid #BBF7D0', borderRadius: 12
                }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: '50%',
                    backgroundColor: '#16A34A', color: '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    <CheckCircle2 size={24} />
                  </div>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: '#16A34A' }}>Validation effectuée</div>
                    <div style={{ fontSize: 13, color: '#16A34A', opacity: 0.8 }}>Le {new Date(form.signatureHorodatage).toLocaleString('fr-FR')}</div>
                  </div>
                </div>
              ) : (
                <div style={{ width: 340 }}>
                  <div style={{
                    border: `2px solid ${ehr.borderSoft}`,
                    borderRadius: 12,
                    backgroundColor: '#FAFAFA',
                    position: 'relative',
                    overflow: 'hidden'
                  }}>
                    <canvas
                      ref={canvasRef}
                      width={336}
                      height={140}
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
                      <div style={{
                        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                        pointerEvents: 'none', opacity: 0.4
                      }}>
                        <PenTool size={24} color={ehr.textMuted} />
                        <span style={{ fontSize: 12, fontWeight: 600, color: ehr.textMuted, marginTop: 8 }}>Veuillez signer ici</span>
                      </div>
                    )}
                  </div>
                  {signed && (
                    <button
                      onClick={clearSignature}
                      style={{
                        marginTop: 10, display: 'flex', alignItems: 'center', gap: 6,
                        background: 'none', border: 'none', color: '#EF4444',
                        fontSize: 12, fontWeight: 700, cursor: 'pointer'
                      }}
                    >
                      <Trash2 size={14} /> Effacer la signature
                    </button>
                  )}
                </div>
              )}
            </div>

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 16 }}>
              {!isCloture && (
                <>
                  <button
                    onClick={handleValider}
                    disabled={saving || !signed}
                    style={{
                      backgroundColor: signed ? '#0F766E' : ehr.textMuted,
                      color: '#fff',
                      border: 'none',
                      borderRadius: 10,
                      padding: '14px 40px',
                      fontSize: 15,
                      fontWeight: 800,
                      cursor: signed ? 'pointer' : 'not-allowed',
                      boxShadow: signed ? '0 4px 12px rgba(15, 118, 110, 0.25)' : 'none',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    Valider la sortie & Clôturer
                  </button>
                </>
              )}
            </div>
          </div>

          <div style={{
            marginTop: 32, paddingTop: 24,
            borderTop: `1px solid ${ehr.borderSoft}`,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: isCloture ? '#16A34A' : ehr.primary }}></div>
              <span style={{ fontSize: 14, fontWeight: 700 }}>Statut : {isCloture ? 'Dossier clôturé' : 'Patient hospitalisé'}</span>
            </div>
            {lastUpdate && (
              <span style={{ fontSize: 12, color: ehr.textMuted, fontWeight: 600 }}>Dernière mise à jour : {new Date(lastUpdate).toLocaleString('fr-FR')}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function DocumentToggle({ icon, label, active, onClick }: {
  icon: React.ReactNode; label: string; active: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 18px', borderRadius: 12,
        backgroundColor: active ? '#F0FDF4' : '#fff',
        border: `1px solid ${active ? '#BBF7D0' : ehr.borderSoft}`,
        cursor: 'pointer', textAlign: 'left',
        transition: 'all 0.2s ease'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ color: active ? '#16A34A' : ehr.textMuted }}>{icon}</div>
        <span style={{ fontSize: 13, fontWeight: 700, color: active ? '#16A34A' : ehr.text }}>{label}</span>
      </div>
      {active && <CheckCircle2 size={16} color="#16A34A" />}
    </button>
  );
}
