'use client';

import { useWaitingConsultations } from '@/hooks/use-consultations';

export default function ConsultationsPage() {
  const { data: consultations = [], isLoading: loading, error } = useWaitingConsultations();

  if (loading) return <div className="p-8">Chargement...</div>;

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">Consultations en attente de prescription</h1>

      {error && <div className="bg-red-100 text-red-700 p-4 rounded mb-4">Erreur de chargement des données.</div>}

      {consultations.length === 0 ? (
        <div className="bg-blue-50 p-4 rounded text-blue-900">Aucune consultation en attente</div>
      ) : (
        <div className="space-y-4">
          {consultations.map((consultation) => (
            <div key={consultation.id} className="border border-gray-300 rounded-lg p-4 bg-white hover:shadow-lg">
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-gray-500">Date</p>
                  <p className="font-semibold">{new Date(consultation.date).toLocaleDateString('fr-FR')}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Heure</p>
                  <p className="font-semibold">{consultation.heure}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Patient ID</p>
                  <p className="font-semibold">{consultation.patientId}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Statut</p>
                  <p className={`font-semibold ${consultation.urgence ? 'text-red-600' : 'text-green-600'}`}>
                    {consultation.urgence ? 'URGENCE' : 'Normal'}
                  </p>
                </div>
              </div>

              {consultation.observation && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-500">Diagnostic</p>
                      <p className="text-sm">{consultation.observation.diagnostic}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Notes</p>
                      <p className="text-sm">{consultation.observation.notes}</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-4 flex gap-2">
                <button className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
                  Prescrire médicament
                </button>
                <button className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600">
                  Prescrire examen
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
