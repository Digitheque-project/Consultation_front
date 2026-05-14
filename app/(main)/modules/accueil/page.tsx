import { Users, Bed, User, ChevronRight, Stethoscope } from 'lucide-react';
import { fetchPatients, Patient } from '@/lib/api/services/patients';
import { fetchActiveHospitalisations } from '@/lib/api/services/hospitalisations';

const appointments = [
  { name: "M. Jean-Pierre Dupont", id: "#44920", time: "10:42", doctor: "DR RAJAO" },
  { name: "Mme Sarah Belkacem", id: "#44925", time: "10:55", doctor: "DR RABE" },
  { name: "M. Thomas Muller", id: "#44931", time: "11:05", doctor: "DR RAKOTO BE" },
];

const doctors = [
  { name: "Dr. Rakoto", dept: "Chirurgie", current: 3, max: 10, color: "bg-amber-400" },
  { name: "Dr. Rabe", dept: "GEMI", current: 7, max: 10, color: "bg-emerald-500" },
  { name: "Dr. Andria", dept: "Neurologie", current: 0, max: 8, color: "bg-gray-300" },
];

const formatDate = (dateString?: string): string => {
  if (!dateString) return '—';
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
  if (!sexe) return '—';
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
      <main>
        <div className="p-6 lg:p-8 max-w-6xl mx-auto">

          {/* ── Header ── */}
          <div className="mb-6">
            <h1 className="text-xl font-medium text-gray-900">
              Bonjour, Mme Rasoa
            </h1>
            <p className="text-xs text-gray-500 mt-1">
              Voici l'état actuel de votre service
            </p>
          </div>

          {/* ── Stats row ── */}
          <div className="grid grid-cols-4 gap-3 mb-4">

            {/* Patients aujourd'hui */}
            <div className="bg-white rounded-xl p-4 border border-gray-100">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-blue-500 mb-3">
                Patient
              </p>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center text-blue-500 flex-shrink-0">
                  <Users size={17} />
                </div>
                <div>
                  <p className="text-2xl font-medium text-gray-900 leading-none">{patientCount}</p>
                  <p className="text-[11px] text-gray-400 mt-1">Aujourd'hui</p>
                </div>
              </div>
            </div>

            {/* Hospitalisés */}
            <div className="bg-white rounded-xl p-4 border border-gray-100">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-emerald-500 mb-3">
                Hospitalisé
              </p>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-emerald-50 rounded-lg flex items-center justify-center text-emerald-500 flex-shrink-0">
                  <Bed size={17} />
                </div>
                <div>
                  <p className="text-2xl font-medium text-gray-900 leading-none">{hospitalisedCount}</p>
                  <p className="text-[11px] text-gray-400 mt-1">Patients hospitalisés</p>
                </div>
              </div>
            </div>

            {/* Consultations & Achats */}
            <div className="col-span-2 bg-white rounded-xl p-4 border border-gray-100">
              <div className="flex justify-between items-center mb-3">
                <p className="text-sm font-medium text-gray-800">Consultations &amp; Achats médicament</p>
                <button className="text-[11px] text-blue-500 hover:underline font-medium">Voir tout</button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-gray-50 rounded-lg px-4 py-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-[3px] h-5 bg-blue-500 rounded-full inline-block" />
                    <p className="text-[11px] text-gray-500">Consultations</p>
                  </div>
                  <p className="text-xl font-medium text-gray-900 pl-[11px]">14</p>
                </div>
                <div className="bg-gray-50 rounded-lg px-4 py-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-[3px] h-5 bg-violet-500 rounded-full inline-block" />
                    <p className="text-[11px] text-gray-500">Achats médicament</p>
                  </div>
                  <p className="text-xl font-medium text-gray-900 pl-[11px]">32</p>
                </div>
              </div>
            </div>
          </div>

          {/* ── Middle row ── */}
          <div className="grid grid-cols-3 gap-3 mb-4">

            {/* Rendez-vous */}
            <div className="col-span-2 bg-white rounded-xl border border-gray-100 overflow-hidden">
              <div className="flex justify-between items-center px-5 py-3.5 border-b border-gray-100">
                <h2 className="text-sm font-medium text-gray-900 flex items-center gap-2">
                  <span className="text-red-500 font-bold text-sm leading-none">!</span>
                  Rendez-vous aujourd'hui
                </h2>
                <span className="bg-gray-100 text-gray-500 text-[11px] font-medium px-3 py-1 rounded-full">
                  12 RDV programmés
                </span>
              </div>

              <div>
                {appointments.map((rdv, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between px-5 py-3.5 border-b border-gray-50 last:border-b-0 hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-50 rounded-full flex items-center justify-center text-blue-500 flex-shrink-0">
                        <User size={15} />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-800">{rdv.name}</p>
                        <p className="text-[11px] text-gray-400 mt-0.5">ID: {rdv.id} · Arrivée: {rdv.time}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md tracking-wide">
                        {rdv.doctor}
                      </span>
                      <button className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 transition-colors">
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Disponibilité médecins */}
            <div className="bg-white rounded-xl border border-gray-100 p-5">
              <div className="flex items-center gap-2 mb-5">
                <div className="w-7 h-7 bg-blue-50 rounded-lg flex items-center justify-center text-blue-500">
                  <Stethoscope size={14} />
                </div>
                <h2 className="text-sm font-medium text-gray-900">Disponibilité médecins</h2>
              </div>

              <div className="space-y-5">
                {doctors.map((doc, i) => {
                  const pct = doc.max > 0 ? Math.round((doc.current / doc.max) * 100) : 0;
                  return (
                    <div key={i}>
                      <div className="flex justify-between items-baseline mb-1.5">
                        <div>
                          <p className="text-sm font-medium text-gray-800">{doc.name}</p>
                          <p className="text-[11px] text-gray-400">{doc.dept}</p>
                        </div>
                        <span className="text-[11px] text-gray-500 font-medium">{doc.current}/{doc.max}</span>
                      </div>
                      <div className="h-[5px] bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${doc.color}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              <button className="mt-6 w-full text-center text-xs text-blue-600 font-medium hover:underline">
                Voir planning
              </button>
            </div>
          </div>

          {/* ── Patients récents ── */}
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <div className="flex justify-between items-center px-5 py-3.5 border-b border-gray-100">
              <h2 className="text-sm font-medium text-gray-900">Patients récents</h2>
              <button className="text-[11px] font-medium text-blue-500 hover:underline">Voir tout</button>
            </div>

            <table className="w-full table-fixed">
              <thead>
                <tr className="border-b border-gray-50">
                  {[
                    { label: "ID Patient", w: "w-[100px]" },
                    { label: "Nom Complet", w: "w-auto" },
                    { label: "Naissance", w: "w-[120px]" },
                    { label: "Sexe", w: "w-[100px]" },
                    { label: "Téléphone", w: "w-[160px]" },
                  ].map(({ label, w }) => (
                    <th
                      key={label}
                      className={`px-5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-blue-500 ${w}`}
                    >
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {todayPatients.length > 0 ? (
                  todayPatients.map((p, i) => (
                    <tr
                      key={p.id ?? i}
                      className="border-b border-gray-50 last:border-b-0 hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-5 py-3.5 text-sm font-medium text-blue-600">{p.id}</td>
                      <td className="px-5 py-3.5">
                        <p className="text-sm font-medium text-gray-800">{p.nom} {p.prenom}</p>
                        <p className="text-[11px] mt-0.5 text-gray-400">Ajouté aujourd'hui</p>
                      </td>
                      <td className="px-5 py-3.5 text-sm text-gray-500">{formatDate(p.dateNaissance)}</td>
                      <td className="px-5 py-3.5 text-sm text-gray-600">{formatSexe(p.sexe)}</td>
                      <td className="px-5 py-3.5 text-sm text-gray-500">{p.telephone ?? '—'}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-5 py-10 text-center text-sm text-gray-400">
                      Aucun patient enregistré aujourd'hui.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            <div className="flex items-center justify-between px-5 py-2.5 border-t border-gray-50">
              <span className="text-[11px] text-gray-400">
                Affichage de {patientCount} sur {patientCount} résultats
              </span>
              <div className="flex items-center gap-1">
                <button className="w-6 h-6 flex items-center justify-center rounded-md border border-gray-100 hover:bg-gray-100 text-gray-400 transition-colors">
                  <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                    <path d="M9 3L5 7l4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
                <button className="w-6 h-6 flex items-center justify-center rounded-md border border-gray-100 hover:bg-gray-100 text-gray-400 transition-colors">
                  <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
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