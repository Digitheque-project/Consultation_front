"use client";

import React from "react";
import { Search, User, BarChart2, ClipboardList, CheckCircle2, CheckCircle } from "lucide-react";

export default function NotificationPage() {
  return (
    <div className="min-h-full bg-[#F8F9FB] p-6 lg:p-8 xl:p-10 font-sans">
      <h1 className="text-2xl lg:text-[28px] font-extrabold text-[#111827] mb-8 tracking-tight">
        Notifications
      </h1>

      {/* Top Bar: Search and Tabs */}
      <div className="flex items-center bg-[#F1F5F9] p-1.5 rounded-[16px] w-fit mb-8 shadow-sm">
        <div className="relative w-[320px] mr-2">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher par nom ou ID patient..."
            className="w-full pl-10 pr-4 py-2.5 rounded-[12px] text-[13px] font-medium border-none focus:outline-none focus:ring-2 focus:ring-[#006A8C] text-gray-900 bg-white shadow-[0px_2px_6px_rgba(0,0,0,0.02)] placeholder:text-gray-400"
          />
        </div>
        <button className="px-6 py-2.5 bg-white rounded-[12px] text-[13px] font-bold text-[#006A8C] shadow-[0px_2px_8px_rgba(0,0,0,0.06)]">
          Toutes
        </button>
        <button className="px-6 py-2.5 text-[13px] font-bold text-gray-500 flex items-center gap-2.5 hover:bg-gray-200/50 rounded-[12px] transition-colors">
          En attente <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B]"></span>
        </button>
        <button className="px-6 py-2.5 text-[13px] font-bold text-gray-500 flex items-center gap-2.5 hover:bg-gray-200/50 rounded-[12px] transition-colors">
          Acceptées <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]"></span>
        </button>
        <button className="px-6 py-2.5 text-[13px] font-bold text-gray-500 flex items-center gap-2.5 hover:bg-gray-200/50 rounded-[12px] transition-colors">
          Refusées <span className="w-1.5 h-1.5 rounded-full bg-[#94A3B8]"></span>
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 lg:gap-8 items-start">
        {/* Left Column: Notification List */}
        <div className="xl:col-span-8 2xl:col-span-8 flex flex-col gap-5">
          {/* Card 1 */}
          <div className="bg-white rounded-[20px] p-6 shadow-[0px_4px_20px_rgba(0,0,0,0.02)]">
            <div className="flex justify-between items-center mb-6">
              <span className="text-[11px] font-bold text-gray-300 tracking-wider">#FH-2024-8901</span>
              <div className="flex items-center gap-2">
                <span className="text-[12px] font-semibold text-gray-500">Il y a 25 min</span>
                <span className="w-2 h-2 rounded-full bg-[#0EA5E9]"></span>
              </div>
            </div>

            <div className="grid grid-cols-[1fr_1.5fr] gap-6 mb-8">
              <div>
                <div className="flex items-center gap-3">
                  <h3 className="text-[16px] font-extrabold text-gray-900">Hospitalisation</h3>
                  <span className="px-2.5 py-1 rounded-full bg-[#D1FAE5] text-[#059669] text-[9.5px] font-bold uppercase tracking-wide">Banque</span>
                </div>
              </div>
              <div>
                <p className="text-[9px] font-extrabold text-gray-400 uppercase tracking-widest mb-1.5">Motif clinique</p>
                <p className="text-[13px] font-medium text-gray-600 line-clamp-1">Suspicion d'appendicite aiguë perforé...</p>
              </div>
            </div>

            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3.5">
                <div className="w-9 h-9 rounded-full bg-[#F1F5F9] flex items-center justify-center">
                  <User className="w-4 h-4 text-gray-400" />
                </div>
                <div>
                  <p className="text-[12.5px] font-extrabold text-gray-900">RAKOTOMALALA Sitraka</p>
                  <p className="text-[9.5px] font-bold text-gray-400 tracking-wider uppercase mt-0.5">42 ANS • HOMME</p>
                </div>
              </div>
              <div className="flex items-center gap-2.5">
                <button className="px-5 py-2 rounded-[10px] border-[1.5px] border-red-100 text-[#E11D48] text-[12.5px] font-bold hover:bg-red-50 transition-colors">
                  Refuser
                </button>
                <button className="px-5 py-2 rounded-[10px] border-[1.5px] border-gray-200 text-gray-500 text-[12.5px] font-bold hover:bg-gray-50 transition-colors">
                  A voir
                </button>
                <button className="px-6 py-2 rounded-[10px] bg-[#006A8C] text-white text-[12.5px] font-bold hover:bg-[#005a76] transition-colors shadow-sm">
                  Accepter
                </button>
              </div>
            </div>
          </div>

          {/* Card 2 */}
          <div className="bg-white rounded-[20px] p-6 shadow-[0px_4px_20px_rgba(0,0,0,0.02)]">
            <div className="flex justify-between items-center mb-6">
              <span className="text-[11px] font-bold text-gray-300 tracking-wider">#FH-2024-7742</span>
              <div className="flex items-center gap-2">
                <span className="text-[12px] font-semibold text-gray-500">Il y a 1h 12min</span>
              </div>
            </div>

            <div className="grid grid-cols-[1fr_1.5fr] gap-6 mb-8">
              <div>
                <div className="flex items-center gap-3">
                  <h3 className="text-[16px] font-extrabold text-gray-900">Consultation externe</h3>
                  <span className="px-2.5 py-1 rounded-full bg-[#F1F5F9] text-gray-600 text-[9.5px] font-bold uppercase tracking-wide">Pivot</span>
                </div>
              </div>
              <div>
                <p className="text-[9px] font-extrabold text-gray-400 uppercase tracking-widest mb-1.5">Motif clinique</p>
                <p className="text-[13px] font-medium text-gray-600 line-clamp-1">Suivi post-opératoire lithiase biliaire,...</p>
              </div>
            </div>

            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3.5">
                <div className="w-9 h-9 rounded-full bg-[#F1F5F9] flex items-center justify-center">
                  <User className="w-4 h-4 text-gray-400" />
                </div>
                <div>
                  <p className="text-[12.5px] font-extrabold text-gray-900">ANDRIAMORASATA Fara</p>
                  <p className="text-[9.5px] font-bold text-gray-400 tracking-wider uppercase mt-0.5">65 ANS • FEMME</p>
                </div>
              </div>
              <div className="flex items-center gap-2.5">
                <button className="px-5 py-2 rounded-[10px] border-[1.5px] border-red-100 text-[#E11D48] text-[12.5px] font-bold hover:bg-red-50 transition-colors">
                  Refuser
                </button>
                <button className="px-5 py-2 rounded-[10px] border-[1.5px] border-gray-200 text-gray-500 text-[12.5px] font-bold hover:bg-gray-50 transition-colors">
                  A voir
                </button>
                <button className="px-6 py-2 rounded-[10px] bg-[#006A8C] text-white text-[12.5px] font-bold hover:bg-[#005a76] transition-colors shadow-sm">
                  Accepter
                </button>
              </div>
            </div>
          </div>

          {/* Card 3 */}
          <div className="bg-white rounded-[20px] p-6 shadow-[0px_4px_20px_rgba(0,0,0,0.02)]">
            <div className="flex justify-between items-center mb-6">
              <span className="text-[11px] font-bold text-gray-300 tracking-wider">#FH-2024-8901</span>
              <div className="flex items-center gap-2">
                <span className="text-[12px] font-semibold text-gray-500">Il y a 25 min</span>
                <span className="w-2 h-2 rounded-full bg-[#0EA5E9]"></span>
              </div>
            </div>

            <div className="grid grid-cols-[1fr_1.5fr] gap-6 mb-8">
              <div>
                <div className="flex items-center gap-3">
                  <h3 className="text-[16px] font-extrabold text-gray-900">Hospitalisation</h3>
                  <span className="px-2.5 py-1 rounded-full bg-[#D1FAE5] text-[#059669] text-[9.5px] font-bold uppercase tracking-wide">Banque</span>
                </div>
              </div>
              <div>
                <p className="text-[9px] font-extrabold text-gray-400 uppercase tracking-widest mb-1.5">Motif clinique</p>
                <p className="text-[13px] font-medium text-gray-600 line-clamp-1">Suspicion d'appendicite aiguë perforé...</p>
              </div>
            </div>

            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3.5">
                <div className="w-9 h-9 rounded-full bg-[#F1F5F9] flex items-center justify-center">
                  <User className="w-4 h-4 text-gray-400" />
                </div>
                <div>
                  <p className="text-[12.5px] font-extrabold text-gray-900">RAKOTOMALALA Sitraka</p>
                  <p className="text-[9.5px] font-bold text-gray-400 tracking-wider uppercase mt-0.5">42 ANS • HOMME</p>
                </div>
              </div>
              <div className="flex items-center gap-2.5">
                <button className="px-5 py-2 rounded-[10px] border-[1.5px] border-gray-200 text-gray-500 text-[12.5px] font-bold hover:bg-gray-50 transition-colors">
                  A voir
                </button>
                <button className="px-6 py-2 rounded-[10px] bg-[#10B981] text-white text-[12.5px] font-bold hover:bg-[#059669] transition-colors shadow-sm">
                  Attribuer chambre / Lit
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Service Overview */}
        <div className="xl:col-span-4 2xl:col-span-4 sticky top-6">
          <div className="bg-white rounded-[24px] p-7 shadow-[0px_4px_24px_rgba(0,0,0,0.03)] border border-[#F1F5F9]">
            <div className="flex items-center gap-3.5 mb-10">
              <div className="w-9 h-9 rounded-xl bg-[#F0F7FF] flex items-center justify-center text-[#006A8C]">
                <BarChart2 className="w-[18px] h-[18px] stroke-[2.5]" />
              </div>
              <h2 className="text-[17px] font-extrabold text-gray-900 tracking-tight">Aperçu du service</h2>
            </div>

            <div className="mb-8">
              <div className="flex justify-between items-end mb-3.5">
                <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-[0.1em]">Capacité des lits</span>
                <span className="text-[18px] font-extrabold text-[#006A8C]">28 <span className="text-gray-300 font-bold">/ 32</span></span>
              </div>
              
              <div className="h-[7px] w-full bg-gray-100 rounded-full mb-4 flex overflow-hidden">
                <div className="h-full bg-[#0EA5E9] rounded-full" style={{ width: '87.5%' }}></div>
              </div>
              
              <div className="flex justify-between items-center text-[11px] font-bold">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#0EA5E9]"></span>
                  <span className="text-gray-600">Occupés</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-300"></span>
                  <span className="text-gray-400">Disponibles (4)</span>
                </div>
              </div>
            </div>

            <div className="h-[1px] w-full bg-gray-100 mb-7"></div>

            <div className="mb-8">
              <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-[0.1em] mb-5">Résumé des notifications</p>
              <div className="space-y-4">
                <div className="flex items-start gap-3.5">
                  <div className="mt-0.5 text-[#0EA5E9]">
                    <ClipboardList className="w-[18px] h-[18px] stroke-[2.5]" />
                  </div>
                  <span className="text-[13.5px] font-extrabold text-gray-700 pt-0.5">8 Dossiers en attente</span>
                </div>
                <div className="flex items-start gap-3.5">
                  <div className="mt-0.5 text-[#10B981]">
                    <CheckCircle2 className="w-[18px] h-[18px] stroke-[2.5]" />
                  </div>
                  <span className="text-[13.5px] font-extrabold text-gray-700 pt-0.5">4 Consultation externe en attente</span>
                </div>
                <div className="flex items-start gap-3.5">
                  <div className="mt-0.5 text-[#10B981]">
                    <CheckCircle className="w-[20px] h-[20px] fill-[#10B981] text-white stroke-[2]" />
                  </div>
                  <div className="pt-0.5">
                    <p className="text-[13.5px] font-extrabold text-gray-700">3 Dossiers acceptés</p>
                    <p className="text-[11px] font-bold text-gray-400 mt-0.5">En attente d'attribution chambre / Lit</p>
                  </div>
                </div>
              </div>
            </div>

            <button className="w-full py-3.5 rounded-[12px] border-[1.5px] border-[#006A8C]/20 text-[#006A8C] text-[13px] font-bold hover:bg-[#F0F7FF] transition-colors">
              Générer le rapport quotidien
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
