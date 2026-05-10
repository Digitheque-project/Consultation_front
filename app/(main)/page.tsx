import {
  Calendar,
  Stethoscope,
  FileText,
  ClipboardSignature,
  TableProperties,
  User,
  Clock,
  Info
} from "lucide-react";

export default function DashboardPage() {
  return (
    <main className="p-8 max-w-[1400px] mx-auto">
      {/* Header Section */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-[26px] font-extrabold text-gray-900 leading-tight tracking-tight">Bonjour, Dr. Jean Pierre</h1>
          <p className="text-[14px] text-gray-500 mt-1.5 font-medium">Voici l'état actuel de votre service</p>
        </div>
        <div className="flex items-center gap-2.5 bg-[#F1F5F9] px-4 py-2.5 rounded-[12px] text-gray-700 shadow-sm border border-[#E2E8F0]">
          <Calendar className="w-[18px] h-[18px] text-gray-500" strokeWidth={2} />
          <span className="text-[13px] font-bold tracking-wide">14 Octobre 2023</span>
        </div>
      </div>

      {/* Stats Cards - Takes Full Width */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Card 1 */}
        <div className="bg-white rounded-3xl p-6 shadow-[0px_4px_16px_rgba(17,17,26,0.05)] border border-gray-100 flex flex-col justify-between h-[135px]">
          <div className="flex justify-between items-start">
            <span className="text-[11px] font-bold text-[#64748B] uppercase tracking-[0.1em]">PATIENT(S) HOSPITALISÉ(S)</span>
            <div className="w-[32px] h-[32px] bg-[#F1F5F9] rounded-xl flex items-center justify-center">
               <Stethoscope className="w-4 h-4 text-[#006A8C]" strokeWidth={2.5} />
            </div>
          </div>
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-[44px] font-black text-gray-900 leading-none tracking-tight">12</span>
            <span className="text-[11px] font-bold text-[#94A3B8]">3 nouveaux arrivé(s)</span>
          </div>
        </div>

        {/* Card 2 */}
        <div className="bg-white rounded-3xl p-6 shadow-[0px_4px_16px_rgba(17,17,26,0.05)] border border-gray-100 flex flex-col justify-between h-[135px]">
          <div className="flex justify-between items-start">
            <span className="text-[11px] font-bold text-[#64748B] uppercase tracking-[0.1em]">CONSULTATION EXTERNE</span>
            <div className="w-[32px] h-[32px] bg-[#FFF8F1] rounded-xl flex items-center justify-center">
               <FileText className="w-4 h-4 text-[#926020]" strokeWidth={2.5} />
            </div>
          </div>
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-[44px] font-black text-gray-900 leading-none tracking-tight">04</span>
            <span className="text-[11px] font-bold text-[#94A3B8]">3 urgences</span>
          </div>
        </div>

        {/* Card 3 */}
        <div className="bg-white rounded-3xl p-5 shadow-[0px_4px_16px_rgba(17,17,26,0.05)] border border-gray-100 flex flex-col justify-between h-[135px]">
          <div className="flex justify-between items-start mb-3 px-1">
            <span className="text-[11px] font-bold text-[#64748B] uppercase tracking-[0.1em]">CONTRÔLE</span>
            <div className="w-[32px] h-[32px] bg-[#FFF8F1] rounded-xl flex items-center justify-center">
              <ClipboardSignature className="w-4 h-4 text-[#D97706]" strokeWidth={2.5} />
            </div>
          </div>
          <div className="flex items-center gap-3 h-full">
            <div className="flex-1 bg-[#F4F4F5] rounded-[10px] py-2 px-3 flex items-center gap-2.5">
              <div className="w-[3px] h-[28px] bg-[#006A8C] rounded-full"></div>
              <div>
                <p className="text-[10px] text-[#64748B] font-bold mb-0.5">Service</p>
                <p className="text-[18px] font-black text-gray-900 leading-none">14</p>
              </div>
            </div>
            <div className="flex-1 bg-[#F4F4F5] rounded-[10px] py-2 px-3 flex items-center gap-2.5">
              <div className="w-[3px] h-[28px] bg-[#059669] rounded-full"></div>
              <div>
                <p className="text-[10px] text-[#64748B] font-bold mb-0.5 line-clamp-1 text-ellipsis">Consultation externe</p>
                <p className="text-[18px] font-black text-gray-900 leading-none">32</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Left/Main Column */}
        <div className="xl:col-span-2 space-y-8">
          {/* Planning du Bloc Opératoire */}
          <div className="bg-white rounded-3xl p-7 shadow-[0px_4px_16px_rgba(17,17,26,0.05)] border border-gray-100">
            <div className="flex justify-between items-center mb-7">
              <div className="flex items-center gap-3 text-[#006A8C]">
                <TableProperties className="w-[20px] h-[20px]" strokeWidth={2.5} />
                <h2 className="text-[16px] font-extrabold tracking-tight">Planning du Bloc Opératoire</h2>
              </div>
              <button className="text-[12px] font-bold text-[#006A8C] hover:underline">
                Voir tout le planning
              </button>
            </div>

            <div className="w-full">
              {/* Header */}
              <div className="grid grid-cols-12 text-[10px] font-bold text-gray-400 uppercase tracking-[0.1em] pb-4 border-b border-gray-100/60 mb-5">
                <div className="col-span-2 text-center">HORAIRE</div>
                <div className="col-span-4 pl-4">PATIENT & PROCÉDURE</div>
                <div className="col-span-3 text-center">SALLE</div>
                <div className="col-span-3 text-center">STATUT</div>
              </div>
              
              {/* Rows */}
              <div className="space-y-6">
                {/* Row 1 */}
                <div className="grid grid-cols-12 items-center">
                  <div className="col-span-2 font-black text-[#006A8C] text-[15px] text-center">08:00</div>
                  <div className="col-span-4 pl-4">
                    <p className="font-extrabold text-[13px] text-gray-900 uppercase tracking-tight">RAKOTOMALALA <span className="capitalize font-semibold text-gray-600">Jean</span></p>
                    <p className="text-gray-400 text-[11px] font-medium mt-0.5">Appendicectomie laparoscopique</p>
                  </div>
                  <div className="col-span-3 flex justify-center">
                    <span className="bg-[#F8F9FA] text-gray-600 font-bold text-[10px] px-4 py-1.5 rounded-full uppercase tracking-widest border border-gray-100">Salle A1</span>
                  </div>
                  <div className="col-span-3 flex justify-center">
                    <span className="bg-[#E6F4EA] text-[#059669] font-bold text-[10px] px-4 py-1.5 rounded-full flex items-center gap-1.5 uppercase tracking-widest">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#059669]"></div> Terminé
                    </span>
                  </div>
                </div>
                
                {/* Row 2 */}
                <div className="grid grid-cols-12 items-center">
                  <div className="col-span-2 font-black text-[#006A8C] text-[15px] text-center">10:30</div>
                  <div className="col-span-4 pl-4">
                    <p className="font-extrabold text-[13px] text-gray-900 uppercase tracking-tight">ANDRIAMIFIDY <span className="capitalize font-semibold text-gray-600">Marie</span></p>
                    <p className="text-gray-400 text-[11px] font-medium mt-0.5">Cholescystectomie</p>
                  </div>
                  <div className="col-span-3 flex justify-center">
                    <span className="bg-[#F8F9FA] text-gray-600 font-bold text-[10px] px-4 py-1.5 rounded-full uppercase tracking-widest border border-gray-100">Salle B2</span>
                  </div>
                  <div className="col-span-3 flex justify-center">
                    <span className="bg-[#EAF3FA] text-[#006A8C] font-bold text-[10px] px-4 py-1.5 rounded-full flex items-center gap-1.5 uppercase tracking-widest">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#006A8C]"></div> En cours
                    </span>
                  </div>
                </div>

                {/* Row 3 */}
                <div className="grid grid-cols-12 items-center">
                  <div className="col-span-2 font-black text-[#006A8C] text-[15px] text-center">14:00</div>
                  <div className="col-span-4 pl-4">
                    <p className="font-extrabold text-[13px] text-gray-900 uppercase tracking-tight">RABE <span className="capitalize font-semibold text-gray-600">Marc</span></p>
                    <p className="text-gray-400 text-[11px] font-medium mt-0.5">Hernie Inguinale</p>
                  </div>
                  <div className="col-span-3 flex justify-center">
                    <span className="bg-[#F8F9FA] text-gray-600 font-bold text-[10px] px-4 py-1.5 rounded-full uppercase tracking-widest border border-gray-100">Salle A1</span>
                  </div>
                  <div className="col-span-3 flex justify-center">
                    <span className="bg-[#F1F5F9] text-gray-500 font-bold text-[10px] px-4 py-1.5 rounded-full flex items-center gap-1.5 uppercase tracking-widest">
                      <div className="w-1.5 h-1.5 rounded-full bg-gray-400"></div> En attente
                    </span>
                  </div>
                </div>

                {/* Row 4 */}
                <div className="grid grid-cols-12 items-center">
                  <div className="col-span-2 font-black text-[#006A8C] text-[15px] text-center">10:30</div>
                  <div className="col-span-4 pl-4">
                    <p className="font-extrabold text-[13px] text-gray-900 uppercase tracking-tight">ANDRIAMIFIDY <span className="capitalize font-semibold text-gray-600">Marie</span></p>
                    <p className="text-gray-400 text-[11px] font-medium mt-0.5">Cholescystectomie</p>
                  </div>
                  <div className="col-span-3 flex justify-center">
                    <span className="bg-[#F8F9FA] text-gray-600 font-bold text-[10px] px-4 py-1.5 rounded-full uppercase tracking-widest border border-gray-100">Salle B2</span>
                  </div>
                  <div className="col-span-3 flex justify-center">
                    <span className="bg-[#EAF3FA] text-[#006A8C] font-bold text-[10px] px-4 py-1.5 rounded-full flex items-center gap-1.5 uppercase tracking-widest">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#006A8C]"></div> En cours
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Patients post-op prioritaires */}
          <div>
            <div className="flex justify-between items-center mb-5 px-1">
              <h2 className="text-[17px] font-extrabold text-gray-900 tracking-tight">Patients post-op prioritaires</h2>
              <span className="bg-[#E6F4EA] text-[#059669] text-[9px] font-bold px-3 py-1.5 rounded-md uppercase tracking-[0.1em]">SUIVI CRITIQUE</span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Patient 1 */}
              <div className="bg-white rounded-3xl p-6 shadow-[0px_4px_16px_rgba(17,17,26,0.05)] border border-gray-100 relative">
                <div className="absolute top-6 right-6 text-[11px] font-bold text-gray-400">J+0</div>
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-[#F5F8FA] rounded-full flex items-center justify-center text-[#006A8C] shrink-0 border border-blue-50/50">
                    <User className="w-[20px] h-[20px]" strokeWidth={2.5} />
                  </div>
                  <div className="space-y-4 w-full">
                    <div>
                      <h3 className="text-[14px] font-extrabold text-gray-900 uppercase">SOANIRINA <span className="capitalize font-semibold text-gray-600">Estine</span></h3>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-[11px] font-bold text-gray-500">Score SCCRE :</span>
                        <span className="bg-[#FEE2E2] text-[#E11D48] text-[10px] font-black px-2.5 py-1 rounded-[6px]">8/10 <span className="font-semibold opacity-70 ml-1">Idéal ≥ 9</span></span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] font-black text-[#006A8C] uppercase tracking-[0.05em]">
                      <Clock className="w-3.5 h-3.5" strokeWidth={2.5} />
                      <span>PROCHAIN SOIN : 18:30 (VITALS)</span>
                    </div>
                  </div>
                </div>
              </div>

               {/* Patient 2 */}
               <div className="bg-white rounded-3xl p-6 shadow-[0px_4px_16px_rgba(17,17,26,0.05)] border border-gray-100 relative">
                <div className="absolute top-6 right-6 text-[11px] font-bold text-gray-400">J+3</div>
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-[#F5F8FA] rounded-full flex items-center justify-center text-[#006A8C] shrink-0 border border-blue-50/50">
                    <User className="w-[20px] h-[20px]" strokeWidth={2.5} />
                  </div>
                  <div className="space-y-4 w-full">
                    <div>
                      <h3 className="text-[14px] font-extrabold text-gray-900 uppercase">RASOLO <span className="capitalize font-semibold text-gray-600">Paul</span></h3>
                      <div className="flex items-center gap-2 mt-2">
                        <div className="w-2 h-2 rounded-full bg-[#059669]"></div>
                        <span className="text-[11px] font-bold text-gray-500">Douleur EVA : <span className="font-black text-[#006A8C]">3/10</span></span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] font-black text-[#006A8C] uppercase tracking-[0.05em]">
                      <Clock className="w-3.5 h-3.5" strokeWidth={2.5} />
                      <span>PROCHAIN SOIN : 18:00 (ANTALGIQUES)</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-8">
          {/* ACCÈS RAPIDES */}
          <div className="bg-[#F5F8FA] rounded-[32px] p-7 border border-[#EAF3FA]">
            <h3 className="text-[11px] font-extrabold text-[#006A8C] uppercase tracking-[0.1em] mb-6">ACCÈS RAPIDES</h3>
            <div className="space-y-4">
              <button className="w-full bg-white hover:bg-gray-50 transition-colors text-left px-5 py-4.5 rounded-2xl flex items-center gap-4 shadow-sm border border-transparent">
                <Calendar className="w-5 h-5 text-[#006A8C]" strokeWidth={2.5} />
                <span className="text-[13px] font-bold text-gray-900 leading-snug">Programmer une<br/>intervention</span>
              </button>
              <button className="w-full bg-white hover:bg-gray-50 transition-colors text-left px-5 py-4.5 rounded-2xl flex items-center gap-4 shadow-sm border border-transparent">
                <FileText className="w-5 h-5 text-[#006A8C]" strokeWidth={2.5} />
                <span className="text-[13px] font-bold text-gray-900 leading-snug">Créer un Compte-rendu<br/>Opératoire</span>
              </button>
              <button className="w-full bg-white hover:bg-gray-50 transition-colors text-left px-5 py-4.5 rounded-2xl flex items-center gap-4 shadow-sm border border-transparent">
                <Stethoscope className="w-5 h-5 text-[#006A8C]" strokeWidth={2.5} />
                <span className="text-[13px] font-bold text-gray-900 leading-snug">Demande d'examen<br/>pré-opératoire</span>
              </button>
            </div>
          </div>

          {/* ÉQUIPE DE GARDE */}
          <div className="bg-white rounded-[32px] p-7 shadow-[0px_4px_16px_rgba(17,17,26,0.05)] border border-gray-100">
            <h3 className="text-[11px] font-extrabold text-gray-400 uppercase tracking-[0.1em] mb-6">ÉQUIPE DE GARDE</h3>
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gray-900 rounded-full overflow-hidden">
                    <img src="https://i.pravatar.cc/150?u=a04258" alt="Dr Tahina" className="w-full h-full object-cover opacity-80 mix-blend-luminosity" />
                  </div>
                  <div>
                    <h4 className="text-[13px] font-extrabold text-gray-900 mb-0.5">Dr. Tahina</h4>
                    <p className="text-[11px] font-medium text-gray-400">Anesthésiste - Réanimateur</p>
                  </div>
                </div>
                <div className="w-2 h-2 rounded-full bg-[#059669]"></div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                   <div className="w-12 h-12 bg-[#F5F8FA] rounded-full overflow-hidden flex items-center justify-center text-[#006A8C] border border-blue-50/50">
                    <User className="w-[20px] h-[20px]" strokeWidth={2.5} />
                  </div>
                  <div>
                    <h4 className="text-[13px] font-extrabold text-gray-900 mb-0.5">Inf. Principal Faly</h4>
                    <p className="text-[11px] font-medium text-gray-400">Chef de Bloc</p>
                  </div>
                </div>
                <div className="w-2 h-2 rounded-full bg-[#059669]"></div>
              </div>
            </div>
          </div>

          {/* Mise à jour Protocoles */}
          <div className="bg-[#006A8C] rounded-[32px] p-7 text-white shadow-[0px_4px_16px_rgba(0,106,140,0.2)]">
            <div className="mb-5 text-[#EAF3FA]">
              <Info className="w-[24px] h-[24px]" strokeWidth={2.5} />
            </div>
            <h3 className="text-[16px] font-extrabold mb-3 tracking-tight">Mise à jour Protocoles</h3>
            <p className="text-[13px] font-medium text-[#EAF3FA] leading-relaxed mb-7">
              Les nouveaux formulaires de consentement éclairé sont désormais obligatoires pour toute chirurgie élective.
            </p>
            <button className="bg-white text-[#006A8C] font-black text-[12px] px-6 py-3.5 rounded-2xl hover:bg-gray-50 transition-colors w-max shadow-sm tracking-wide">
              Consulter
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
