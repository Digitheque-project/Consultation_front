'use client';

import React, { useState, useEffect } from 'react';
import { dossierPatientApi as api } from '@/lib/clinical/dossier-patient-api';
import {
  Microscope,
  Image,
  Activity,
  FileText,
  Stethoscope,
  File,
  X,
} from 'lucide-react';
import { EhrFormSection } from '@/components/clinical/dossier-patient/EhrFormSection';
import { ehr } from '@/lib/clinical/ehr-theme';

type TypeExamen = 'laboratoire' | 'imagerie' | 'endoscopie' | 'anatomopathologie' | 'autre';
type Statut = 'demande' | 'en_cours' | 'disponible' | 'lu';

interface ResultatParaclinique {
  id: string;
  type: TypeExamen;
  examen: string;
  dateDemande: string;
  dateResultat: string | null;
  resultatTexte: string | null;
  resultatFichiers: string[] | null;
  prescripteur: string | null;
  statut: Statut;
  commentaire: string | null;
}

interface Props {
  patientId: string;
}

const typeIcons = {
  laboratoire: <Microscope size={20} />,
  imagerie: <Image size={20} />,
  endoscopie: <Activity size={20} />,
  anatomopathologie: <FileText size={20} />,
  autre: <Stethoscope size={20} />,
};

const typeLabels = {
  laboratoire: 'Laboratoire',
  imagerie: 'Imagerie',
  endoscopie: 'Endoscopie',
  anatomopathologie: 'Anatomopathologie',
  autre: 'Autre',
};

const statutPillStyle: Record<Statut, React.CSSProperties> = {
  demande: { backgroundColor: '#f3f4f6', color: '#374151' },
  en_cours: { backgroundColor: '#fef9c3', color: '#a16207' },
  disponible: { backgroundColor: '#dcfce7', color: '#15803d' },
  lu: { backgroundColor: ehr.highlightBlueTint, color: ehr.primary },
};

const selectStyle: React.CSSProperties = {
  border: `1px solid ${ehr.border}`,
  borderRadius: 6,
  padding: '6px 10px',
  fontSize: 13,
  backgroundColor: ehr.white,
  color: ehr.text,
};

const statutLabels = {
  demande: 'Demandé',
  en_cours: 'En cours',
  disponible: 'Disponible',
  lu: 'Lu',
};

export default function ResultatsParacliniquesTab({ patientId }: Props) {
  const [resultats, setResultats] = useState<ResultatParaclinique[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<TypeExamen | 'tous'>('tous');
  const [filterStatut, setFilterStatut] = useState<Statut | 'tous'>('tous');
  const [selectedResult, setSelectedResult] = useState<ResultatParaclinique | null>(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    fetchResultats();
  }, [patientId]);

  const fetchResultats = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/patients/${patientId}/resultats`);
      setResultats(res.data);
    } catch (err) {
      console.error('Erreur chargement résultats:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleMarquerLu = async (id: string) => {
    try {
      await api.patch(`/patients/${patientId}/resultats/${id}/lu`);
      await fetchResultats();
      if (selectedResult?.id === id) {
        setSelectedResult({ ...selectedResult, statut: 'lu' });
      }
    } catch (err) {
      console.error('Erreur mise à jour statut:', err);
    }
  };

  const openDetail = (result: ResultatParaclinique) => {
    setSelectedResult(result);
    setShowModal(true);
    if (result.statut !== 'lu') {
      handleMarquerLu(result.id);
    }
  };

  const filteredResultats = resultats.filter(r => {
    if (filterType !== 'tous' && r.type !== filterType) return false;
    if (filterStatut !== 'tous' && r.statut !== filterStatut) return false;
    return true;
  });

  return (
    <div style={{ fontFamily: "'Inter', sans-serif" }}>
      <EhrFormSection title="Filtres" subtitle="Affiner la liste des examens paracliniques" sectionBadge="01" collapsible defaultOpen>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'flex-end' }}>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: ehr.textMuted, marginBottom: 6 }}>TYPE</label>
            <select value={filterType} onChange={e => setFilterType(e.target.value as TypeExamen | 'tous')} style={selectStyle}>
              <option value="tous">Tous</option>
              <option value="laboratoire">Laboratoire</option>
              <option value="imagerie">Imagerie</option>
              <option value="endoscopie">Endoscopie</option>
              <option value="anatomopathologie">Anatomopathologie</option>
              <option value="autre">Autre</option>
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: ehr.textMuted, marginBottom: 6 }}>STATUT</label>
            <select value={filterStatut} onChange={e => setFilterStatut(e.target.value as Statut | 'tous')} style={selectStyle}>
              <option value="tous">Tous</option>
              <option value="demande">Demandé</option>
              <option value="en_cours">En cours</option>
              <option value="disponible">Disponible</option>
              <option value="lu">Lu</option>
            </select>
          </div>
        </div>
      </EhrFormSection>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: ehr.textMuted }}>Chargement...</div>
      ) : filteredResultats.length === 0 ? (
        <EhrFormSection title="Résultats paracliniques" subtitle="Aucun élément pour ces filtres" sectionBadge="02" collapsible defaultOpen>
          <p style={{ margin: 0, color: ehr.textMuted, textAlign: 'center', padding: '16px 0' }}>Aucun résultat paraclinique trouvé.</p>
        </EhrFormSection>
      ) : (
        filteredResultats.map((result, idx) => (
          <div key={result.id} onClick={() => openDetail(result)} role="presentation" style={{ cursor: 'pointer' }}>
            <EhrFormSection
              title={result.examen}
              subtitle={`${typeLabels[result.type]} · Demandé le ${new Date(result.dateDemande).toLocaleDateString('fr-FR')}${
                result.dateResultat ? ` · Résultat le ${new Date(result.dateResultat).toLocaleDateString('fr-FR')}` : ''
              }`}
              sectionBadge={String(idx + 1).padStart(2, '0')}
              complete={result.statut === 'lu'}
              headerExtra={
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                  <span
                    style={{
                      fontSize: 11,
                      padding: '4px 10px',
                      borderRadius: 999,
                      fontWeight: 600,
                      ...statutPillStyle[result.statut],
                    }}
                  >
                    {statutLabels[result.statut]}
                  </span>
                  {result.statut !== 'lu' && (
                    <span style={{ backgroundColor: '#fee2e2', color: '#b91c1c', fontSize: 11, padding: '4px 10px', borderRadius: 999, fontWeight: 600 }}>
                      Nouveau
                    </span>
                  )}
                </div>
              }
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <div style={{ color: ehr.primary, flexShrink: 0 }}>{typeIcons[result.type]}</div>
                <div style={{ minWidth: 0 }}>
                  {result.prescripteur && (
                    <div style={{ fontSize: 12, color: ehr.textMuted }}>Prescrit par : {result.prescripteur}</div>
                  )}
                </div>
              </div>
            </EhrFormSection>
          </div>
        ))
      )}

      {/* Modal détail */}
      {showModal && selectedResult && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
              <div className="flex items-center gap-2">
                {typeIcons[selectedResult.type]}
                <h3 className="text-xl font-semibold">{selectedResult.examen}</h3>
              </div>
              <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-gray-700">
                <X size={24} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="font-medium">Type:</span> {typeLabels[selectedResult.type]}</div>
                <div><span className="font-medium">Statut:</span> {statutLabels[selectedResult.statut]}</div>
                <div><span className="font-medium">Date de demande:</span> {new Date(selectedResult.dateDemande).toLocaleString()}</div>
                {selectedResult.dateResultat && <div><span className="font-medium">Date de résultat:</span> {new Date(selectedResult.dateResultat).toLocaleString()}</div>}
                {selectedResult.prescripteur && <div><span className="font-medium">Prescripteur:</span> {selectedResult.prescripteur}</div>}
              </div>

              {selectedResult.resultatTexte && (
                <div>
                  <h4 className="font-medium mb-2">Résultat</h4>
                  <div className="bg-gray-50 p-4 rounded whitespace-pre-wrap">{selectedResult.resultatTexte}</div>
                </div>
              )}

              {selectedResult.resultatFichiers && selectedResult.resultatFichiers.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Fichiers joints</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedResult.resultatFichiers.map((file, idx) => (
                      <a key={idx} href="#" className="flex items-center gap-1 text-[#05668D] hover:underline">
                        <File size={16} /> {file}
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {selectedResult.commentaire && (
                <div>
                  <h4 className="font-medium mb-2">Commentaire</h4>
                  <p className="text-gray-700">{selectedResult.commentaire}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
