import Link from 'next/link';
import { Users, Bed, User, ChevronRight, Stethoscope } from 'lucide-react';
import { fetchPatients, Patient } from '@/lib/api/services/patients';
import { fetchActiveHospitalisations } from '@/lib/api/services/hospitalisations';

const appointments = [
  { name: "M. Jean-Pierre Dupont", id: "#44920", time: "10:42", doctor: "DR RAJAO" },
  { name: "Mme Sarah Belkacem", id: "#44925", time: "10:55", doctor: "DR RABE" },
  { name: "M. Thomas Muller", id: "#44931", time: "11:05", doctor: "DR RAKOTO BE" },
];

const doctors = [
  { name: "Dr. Rakoto", dept: "Chirurgie", current: 3, max: 10, color: "bg-orange-400" },
  { name: "Dr. Rabe", dept: "GEMI", current: 7, max: 10, color: "bg-green-500" },
  { name: "Dr. Andria", dept: "Neurologie", current: 0, max: 8, color: "bg-gray-300" },
];

const formatDate = (dateString?: string): string => {
  if (!dateString) return '-';
  try {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  } catch {
    return dateString;
  }
};

const formatSexe = (sexe?: string): string => {
  if (!sexe) return '-';
  const map: Record<string, string> = {
    MALE: 'Masculin',
    FEMALE: 'Féminin',
    M: 'Masculin',
    F: 'Féminin',
  };
  return map[sexe] ?? sexe;
};

export default async function Dashboard() {
  const allPatients: Patient[] = await fetchPatients().catch(() => []);
  const todayRef = new Date().toISOString().slice(0, 10);
  const todayPatients = allPatients.filter(p => p.createdAt?.slice(0, 10) === todayRef);
  const patientCount = todayPatients.length;

  const activeHospitalisations = await fetchActiveHospitalisations();
  const hospitalisedCount = activeHospitalisations.length;

  return (
    <div className="min-h-screen bg-gray-50 font-sans">

      <main className="">
        <div className="p-8 max-w-[1280px]">

          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900">
              Bonjour Dr. Admin
            </h1>
            <p className="text-gray-600 mt-1 text-lg">
              Voici l'état actuel de votre service
            </p>
          </div>

          {/* ── Stats row ── */}
          <div className="grid grid-cols-4 gap-4 mb-6">

            {/* Patients aujourd'hui */}
            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-blue-500 mb-3">Patient</p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-500">
                  <Users size={20} />
                </div>
                <div>
                  <p className="text-3xl font-bold text-gray-900 leading-none">{patientCount}</p>
                  <p className="text-xs text-gray-400 mt-1">Aujourd'hui</p>
                </div>
              </div>
            </div>

            {/* Hospitalisés */}
            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-green-500 mb-3">Hospitalisé</p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center text-green-500">
                  <Bed size={20} />
                </div>
                <div>
                  <p className="text-3xl font-bold text-gray-900 leading-none">{hospitalisedCount}</p>
                  <p className="text-xs text-gray-400 mt-1">Patients hospitalisés</p>
                </div>
              </div>
            </div>

            {/* Consultations & Achats — spans 2 cols */}
            <div className="col-span-2 bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
              <div className="flex justify-between items-start mb-4">
                <p className="text-sm font-semibold text-gray-700">Consultations &amp; Achats Médicament</p>
                <button className="text-xs text-blue-500 hover:underline font-medium">Voir tout</button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-xl px-4 py-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-1 h-6 bg-blue-500 rounded-full inline-block"></span>
                    <p className="text-xs text-gray-500">Consultations</p>
                  </div>
                  <p className="text-2xl font-bold text-gray-900 ml-3">14</p>
                </div>
                <div className="bg-gray-50 rounded-xl px-4 py-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-1 h-6 bg-purple-500 rounded-full inline-block"></span>
                    <p className="text-xs text-gray-500">Achats médicament</p>
                  </div>
                  <p className="text-2xl font-bold text-gray-900 ml-3">32</p>
                </div>
              </div>
            </div>
          </div>

          {/* ── Middle row ── */}
          <div className="grid grid-cols-3 gap-4 mb-6">

            {/* Rendez-vous aujourd'hui */}
            <div className="col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="flex justify-between items-center px-6 py-4 border-b border-gray-50">
                <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                  <span className="text-red-500 font-bold text-base">!</span>
                  Rendez-vous aujourd'hui
                </h2>
                <span className="bg-gray-100 text-gray-500 text-xs font-medium px-3 py-1 rounded-full">
                  12 RDV programmés
                </span>
              </div>

              <div className="divide-y divide-gray-50">
                {appointments.map((rdv, i) => (
                  <div key={i} className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-9 h-9 bg-blue-50 rounded-full flex items-center justify-center text-blue-500">
                        <User size={18} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-800">{rdv.name}</p>
                        <p className="text-xs text-gray-400 mt-0.5">ID: {rdv.id} • Arrivée: {rdv.time}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg tracking-wide">
                        {rdv.doctor}
                      </span>
                      <button className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 transition-colors">
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Disponibilité médecins */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <div className="flex items-center gap-2 mb-6">
                <div className="w-7 h-7 bg-blue-50 rounded-lg flex items-center justify-center text-blue-500">
                  <Stethoscope size={14} />
                </div>
                <h2 className="text-sm font-semibold text-gray-900">Disponibilité médecins</h2>
              </div>

              <div className="space-y-5">
                {doctors.map((doc, i) => {
                  const pct = doc.max > 0 ? Math.round((doc.current / doc.max) * 100) : 0;
                  return (
                    <div key={i}>
                      <div className="flex justify-between items-baseline mb-1.5">
                        <div>
                          <p className="text-sm font-medium text-gray-800">{doc.name}</p>
                          <p className="text-xs text-gray-400">{doc.dept}</p>
                        </div>
                        <span className="text-xs text-gray-500 font-medium">{doc.current}/{doc.max}</span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${doc.color}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              <button className="mt-8 w-full text-center text-sm text-blue-600 font-semibold hover:underline">
                Voir planning
              </button>
            </div>
          </div>

          {/* ── Patients récents ── */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="flex justify-between items-center px-6 py-4 border-b border-gray-50">
              <h2 className="font-semibold text-gray-900">Patients récents</h2>
              <button className="text-xs font-semibold text-blue-500 hover:underline">Voir tout</button>
            </div>

            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-50">
                  {["ID Patient", "Nom Complet", "Naissance", "Sexe", "Téléphone"].map((h) => (
                    <th key={h} className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-blue-500">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {todayPatients.length > 0 ? (
                  todayPatients.map((p, i) => (
                    <tr key={p.id ?? i} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 text-sm font-semibold text-blue-600">{p.id}</td>
                      <td className="px-6 py-4">
                        <p className="text-sm font-semibold text-gray-800">{p.nom} {p.prenom}</p>
                        <p className="text-xs mt-0.5 text-gray-400">Patient ajouté aujourd'hui</p>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">{formatDate(p.dateNaissance)}</td>
                      <td className="px-6 py-4 text-sm text-gray-700">{formatSexe(p.sexe)}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">{p.telephone ?? '-'}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-10 text-center text-sm text-gray-500">
                      Aucun patient enregistré aujourd'hui.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            <div className="flex items-center justify-between px-6 py-3 border-t border-gray-50">
              <span className="text-xs text-gray-400">Affichage de {patientCount} sur {patientCount} résultats</span>
              <div className="flex items-center gap-1">
                <button className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M9 3L5 7l4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
                <button className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M5 3l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}