'use client';

import React, { useState, useEffect } from 'react';
import { dossierPatientApi as api } from '@/lib/clinical/dossier-patient-api';
import { History, Clock, User, Edit, Eye, Trash2, ArrowRight } from 'lucide-react';

type TypeAction = 'creation' | 'modification' | 'consultation' | 'suppression' | 'sortie' | 'transfert';

interface HistoriqueEntry {
  id: string;
  action: TypeAction;
  module: string;
  anciennesValeurs: any;
  nouvellesValeurs: any;
  utilisateur: string;
  commentaire: string;
  dateAction: string;
}

interface Props {
  patientId: string;
}

const actionLabels: Record<TypeAction, string> = {
  creation: 'Création',
  modification: 'Modification',
  consultation: 'Consultation',
  suppression: 'Suppression',
  sortie: 'Sortie',
  transfert: 'Transfert',
};

const actionColors: Record<TypeAction, string> = {
  creation: 'bg-green-100 text-green-700',
  modification: 'bg-[#EBF5FB] text-[#05668D]',
  consultation: 'bg-gray-100 text-gray-700',
  suppression: 'bg-red-100 text-red-700',
  sortie: 'bg-purple-100 text-purple-700',
  transfert: 'bg-orange-100 text-orange-700',
};

export default function HistoriqueTab({ patientId }: Props) {
  const [historique, setHistorique] = useState<HistoriqueEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistorique();
  }, [patientId]);

  const fetchHistorique = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/patients/${patientId}/historique`);
      setHistorique(res.data);
    } catch (err) {
      console.error('Erreur chargement historique:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8 text-gray-500">Chargement de l'historique...</div>;
  }

  if (historique.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <History size={48} className="mx-auto mb-3 text-gray-300" />
        <p>Aucun historique disponible pour ce patient.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-gray-600 border-b pb-2">
        <History size={20} />
        <h3 className="font-medium">Journal des actions</h3>
      </div>
      <div className="space-y-3">
        {historique.map(entry => (
          <div key={entry.id} className="border rounded-lg p-4 bg-white hover:shadow-sm transition">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="flex items-center gap-3">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${actionColors[entry.action]}`}>
                  {actionLabels[entry.action]}
                </span>
                {entry.module && (
                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">{entry.module}</span>
                )}
              </div>
              <div className="text-xs text-gray-400 flex items-center gap-1">
                <Clock size={12} />
                {new Date(entry.dateAction).toLocaleString()}
              </div>
            </div>
            <div className="mt-2 text-sm text-gray-700">
              {entry.utilisateur && (
                <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                  <User size={12} /> {entry.utilisateur}
                </div>
              )}
              {entry.commentaire && <p className="text-gray-600 mt-1">{entry.commentaire}</p>}
              {(entry.anciennesValeurs || entry.nouvellesValeurs) && (
                <details className="mt-2 text-xs bg-gray-50 p-2 rounded">
                  <summary className="cursor-pointer text-gray-500">Détails des modifications</summary>
                  <div className="mt-2">
                    {entry.anciennesValeurs && (
                      <div className="mb-1">
                        <strong>Anciennes valeurs :</strong>
                        <pre className="bg-gray-100 p-1 rounded mt-1 overflow-x-auto">{JSON.stringify(entry.anciennesValeurs, null, 2)}</pre>
                      </div>
                    )}
                    {entry.nouvellesValeurs && (
                      <div>
                        <strong>Nouvelles valeurs :</strong>
                        <pre className="bg-gray-100 p-1 rounded mt-1 overflow-x-auto">{JSON.stringify(entry.nouvellesValeurs, null, 2)}</pre>
                      </div>
                    )}
                  </div>
                </details>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
