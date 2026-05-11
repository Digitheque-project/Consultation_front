"use client";

import { BedDouble, Plus, Users } from "lucide-react";

const DOT_STABLE = "#006A8C";
const DOT_SURVEILLANCE = "#F59E0B";
const DOT_CRITIQUE = "#E11D48";

function LegendDot({ dotColor, label }: { dotColor: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <div
        className="w-2 h-2 rounded-full"
        style={{ backgroundColor: dotColor }}
      />
      <span className="text-[10px] sm:text-[11px] font-bold text-gray-600">
        {label}
      </span>
    </div>
  );
}

function BedCard({
  litCode,
  patientName,
  diagnostic,
  allergies,
  allergiesLabel,
  traitements,
  joursEntree,
  joursPostOp,
  colorAccent,
  ribbonText,
}: {
  litCode: string;
  patientName: string;
  diagnostic?: string;
  allergies?: string;
  allergiesLabel?: boolean;
  traitements: string;
  joursEntree?: string;
  joursPostOp?: string;
  colorAccent: string;
  ribbonText: string;
}) {
  return (
    <div className="relative bg-white rounded-[16px] border border-gray-200/70 shadow-sm p-4 overflow-hidden min-h-[140px] flex flex-col justify-between">
      {/* Ribbon coin supérieur droit */}
      <div
        className="absolute overflow-hidden top-0 right-0 w-[60px] h-[60px]"
        aria-hidden
      >
        <div
          className="absolute top-[10px] right-[-22px] rotate-45 text-white text-[8px] font-extrabold px-8 py-[3px] uppercase tracking-wide"
          style={{ backgroundColor: colorAccent }}
        >
          {ribbonText}
        </div>
      </div>

      {/* Badge lit */}
      <div className="mb-2">
        <span
          className="text-[9px] font-black px-2.5 py-[3px] rounded-[6px] text-white uppercase tracking-wide"
          style={{ backgroundColor: colorAccent }}
        >
          {litCode}
        </span>
      </div>

      <div className="flex items-center justify-between gap-2">
        <div>
          {/* Nom patient */}
          <p className="text-[13px] font-extrabold text-gray-900 leading-tight mb-0.5">
            {patientName}
          </p>

          {/* Diagnostic */}
          {diagnostic && (
            <p className="text-[10px] font-medium text-gray-500 mb-1.5">
              {diagnostic}
            </p>
          )}
        </div>
        {/* Allergies */}
        {allergies && (
          <div className="mb-1.5 mr-3">
            {allergiesLabel && (
              <p className="text-[11px] font-extrabold text-[#F59E0B] uppercase tracking-wide">
                ALLERGIES
              </p>
            )}
            <p className="text-[15px] font-bold text-[#F59E0B]">
              {allergies}
            </p>
          </div>
        )}
      </div>

      {/* Traitements */}
      <div className="flex items-center gap-1.5 mb-3">
        <svg
          className="w-3 h-3 text-gray-400"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
          />
        </svg>
        <span className="text-[9px] font-bold text-gray-500">Traitements</span>
        <span className="text-[9px] font-extrabold text-[#006A8C] bg-[#EAF3FA] rounded-full px-2 py-[2px]">
          {traitements}
        </span>
      </div>

      {/* Jours */}
      <div className="flex items-center justify-between mt-auto pt-2 border-t border-gray-100">
        {joursEntree && (
          <span className="text-[9px] font-bold text-gray-500">
            {joursEntree}
          </span>
        )}
        {joursPostOp && (
          <span className="text-[9px] font-bold text-gray-500">
            {joursPostOp}
          </span>
        )}
      </div>
    </div>
  );
}

function AvailableBedCard() {
  return (
    <div className="relative bg-white rounded-[16px] border-2 border-dashed border-gray-300/70 p-4 min-h-[140px] flex flex-col items-center justify-center gap-3">
      <div className="w-8 h-8 rounded-full bg-[#F1F5F9] border border-gray-200 flex items-center justify-center text-gray-400">
        <Plus className="w-4 h-4" />
      </div>
      <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest">
        Lit disponible
      </span>
    </div>
  );
}

export default function GestionPatientsPage() {
  return (
    <main className="p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto">
      {/* En-tête */}
      <div className="mb-6 sm:mb-8">
        <h1 className="text-[22px] sm:text-[26px] font-extrabold text-gray-900 leading-tight tracking-tight">
          Gestion des Patients
        </h1>
        <p className="text-[12px] sm:text-[14px] text-gray-500 mt-1 font-medium">
          Service de Chirurgie Viscérale - Aile B
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-8">
        {/* Colonne principale */}
        <div className="space-y-6">
          {/* Barre onglets + légende */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            {/* Onglets */}
            <div className="flex items-center gap-1 bg-white rounded-[14px] p-1 border border-gray-100 shadow-sm w-fit">
              <button className="flex items-center gap-2 bg-white text-gray-900 font-extrabold text-[12px] px-4 py-2 rounded-[10px] shadow-sm border border-gray-100">
                <svg
                  className="w-3.5 h-3.5 text-gray-600"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  viewBox="0 0 24 24"
                >
                  <rect x="3" y="3" width="7" height="7" rx="1" />
                  <rect x="14" y="3" width="7" height="7" rx="1" />
                  <rect x="3" y="14" width="7" height="7" rx="1" />
                  <rect x="14" y="14" width="7" height="7" rx="1" />
                </svg>
                Plan des lits
              </button>
              <button className="text-gray-500 font-bold text-[12px] px-4 py-2 rounded-[10px] hover:bg-gray-50 transition-colors">
                Liste
              </button>
            </div>

            {/* Légende */}
            <div className="flex items-center gap-5">
              <LegendDot dotColor={DOT_STABLE} label="Stable" />
              <LegendDot dotColor={DOT_SURVEILLANCE} label="Surveillance" />
              <LegendDot dotColor={DOT_CRITIQUE} label="Critique" />
            </div>
          </div>

          {/* Chambre 101 */}
          <div className="bg-white rounded-[22px] border border-gray-100 shadow-[0px_4px_16px_rgba(17,17,26,0.05)] p-5 sm:p-6">
            <div className="flex items-center gap-2 text-gray-400 text-[10px] font-extrabold uppercase tracking-[0.2em] mb-5">
              <BedDouble className="w-3.5 h-3.5 shrink-0" />
              <span>CHAMBRE 101</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <BedCard
                litCode="Lit 101"
                patientName="RAKOTO H."
                diagnostic="Appendicite aiguë"
                allergiesLabel={false}
                traitements="3 soins"
                joursEntree="J-4"
                joursPostOp="J-2 Post-op"
                colorAccent="#0B7DB3"
                ribbonText="Admis"
              />
              <BedCard
                litCode="Lit 102"
                patientName="RANDIA M."
                diagnostic="Péritonite généralisée"
                allergies="Pénicilline"
                allergiesLabel={true}
                traitements="5 soins"
                joursEntree="J-1"
                joursPostOp="J-0 Post-op"
                colorAccent="#E11D48"
                ribbonText="Urgence"
              />
              <BedCard
                litCode="Lit 103"
                patientName="ANDRY L."
                diagnostic="Occlusion intestinale"
                allergiesLabel={false}
                traitements="4 soins"
                joursEntree="J-3"
                joursPostOp="J-5 Post-op"
                colorAccent="#0B7DB3"
                ribbonText="Admis"
              />
            </div>
          </div>

          {/* Chambre 106 */}
          <div className="bg-white rounded-[22px] border border-gray-100 shadow-[0px_4px_16px_rgba(17,17,26,0.05)] p-5 sm:p-6">
            <div className="flex items-center gap-2 text-gray-400 text-[10px] font-extrabold uppercase tracking-[0.2em] mb-5">
              <BedDouble className="w-3.5 h-3.5 shrink-0" />
              <span>CHAMBRE 106</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <BedCard
                litCode="Lit 106"
                patientName="LALA T."
                diagnostic="Lithiase vésiculaire"
                allergies="Pénicilline"
                allergiesLabel={true}
                traitements="3 soins"
                joursEntree="J-2"
                joursPostOp="J-1 Post-op"
                colorAccent="#F59E0B"
                ribbonText="Admis"
              />
              <AvailableBedCard />
              <BedCard
                litCode="Lit 108"
                patientName="NARY S."
                diagnostic="Hernie hiatale"
                allergiesLabel={false}
                traitements="3 soins"
                joursEntree="J-5"
                colorAccent="#0B7DB3"
                ribbonText="Admis"
              />
            </div>
          </div>

          {/* Chambre 108 */}
          <div className="bg-white rounded-[22px] border border-gray-100 shadow-[0px_4px_16px_rgba(17,17,26,0.05)] p-5 sm:p-6">
            <div className="flex items-center gap-2 text-gray-400 text-[10px] font-extrabold uppercase tracking-[0.2em] mb-5">
              <BedDouble className="w-3.5 h-3.5 shrink-0" />
              <span>CHAMBRE 108</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <BedCard
                litCode="Lit 106"
                patientName="LALA T."
                diagnostic="Lithiase vésiculaire"
                allergiesLabel={false}
                traitements="2 soins"
                joursEntree="J-2"
                joursPostOp="J-1 Post-op"
                colorAccent="#F59E0B"
                ribbonText="Admis"
              />
              <BedCard
                litCode="Lit 108"
                patientName="NARY S."
                diagnostic="Hernie hiatale"
                allergies="Pénicilline"
                allergiesLabel={true}
                traitements="3 soins"
                joursEntree="J-5"
                colorAccent="#0B7DB3"
                ribbonText="Admis"
              />
              <AvailableBedCard />
            </div>
          </div>
        </div>

        {/* Colonne droite */}
        <div className="space-y-5">
          {/* Panneau Aperçu rapide */}
          <div className="bg-white rounded-[22px] border border-gray-100 shadow-[0px_4px_16px_rgba(17,17,26,0.05)] p-5 min-h-[380px] flex flex-col">
            <div className="flex justify-end mb-4">
              <button className="bg-[#F1F5F9] hover:bg-[#E2E8F0] transition-colors text-gray-700 text-[11px] font-extrabold px-4 py-2 rounded-[12px] uppercase tracking-wide">
                Aperçu rapide
              </button>
            </div>
            <div className="flex-1" />
          </div>

          {/* Résumé du Service */}
          <div
            className="rounded-[22px] text-white p-6 relative overflow-hidden"
            style={{
              background: "linear-gradient(135deg, #0B6B58 0%, #0d7a65 100%)",
            }}
          >
            <div
              className="absolute -right-10 -top-10 w-[140px] h-[140px] rounded-full bg-white/10"
              aria-hidden
            />
            <div
              className="absolute -right-4 top-16 w-[80px] h-[80px] rounded-full bg-white/5"
              aria-hidden
            />

            <div className="relative">
              <p className="text-[12px] font-extrabold text-white/80 mb-3 uppercase tracking-wider">
                Résumé du Service
              </p>
              <div className="flex items-baseline gap-3 mb-5">
                <span className="text-[32px] font-black tracking-tight leading-none">
                  18
                </span>
                <span className="text-[11px] font-bold text-white/80">
                  Patients hospitalisés
                </span>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-white/80">
                    Capacité Lits
                  </span>
                  <span className="text-[11px] font-extrabold text-white">
                    75%
                  </span>
                </div>
                <div className="w-full h-[6px] rounded-full bg-white/20 overflow-hidden">
                  <div className="h-full rounded-full bg-[#34D399] w-[75%]" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
