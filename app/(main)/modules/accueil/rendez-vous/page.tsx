'use client';

import { useState } from 'react';
import {
  CheckCircle, Eye, FileText, MoreVertical,
  ChevronLeft, ChevronRight, SlidersHorizontal, ChevronDown
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────
type Statut = 'PLANIFIÉ' | 'EN COURS' | 'EN ATTENTE' | 'TERMINÉ';
type TabId  = 'consultation' | 'paraclinique' | 'controle';

// ── Data ──────────────────────────────────────────────────────────
const RDV = [
  { id: 'RDV-2023-001', nom: 'Marc Lemoine',    patientId: '#CHUA-00441', service: 'Cardiologie',   medecin: 'Dr. Sarah K.',  jour: "Aujourd'hui", heure: '09:30', statut: 'PLANIFIÉ'   as Statut },
  { id: 'RDV-2023-004', nom: 'Sophie Girard',   patientId: '#CHUA-00441', service: 'Neurologie',    medecin: 'Dr. Pierre M.', jour: "Aujourd'hui", heure: '10:15', statut: 'EN COURS'   as Statut },
  { id: 'RDV-2023-012', nom: 'Julien Masson',   patientId: '#CHUA-00441', service: 'Ophtalmologie', medecin: 'Dr. Claire T.', jour: "Aujourd'hui", heure: '11:00', statut: 'EN ATTENTE' as Statut },
  { id: 'RDV-2022-872', nom: 'Alain Bernard',   patientId: '#CHUA-00441', service: 'Radiologie',    medecin: 'Equipe B',      jour: 'Hier',        heure: '08:00', statut: 'TERMINÉ'    as Statut },
  { id: 'RDV-2023-004', nom: 'Sophie Girard',   patientId: '#CHUA-00441', service: 'Neurologie',    medecin: 'Dr. Pierre M.', jour: "Aujourd'hui", heure: '10:15', statut: 'EN COURS'   as Statut },
];

const STATUT_STYLE: Record<Statut, string> = {
  'PLANIFIÉ':   'text-blue-600 bg-blue-50 border border-blue-200',
  'EN COURS':   'text-orange-500 bg-orange-50 border border-orange-200',
  'EN ATTENTE': 'text-purple-600 bg-purple-50 border border-purple-200',
  'TERMINÉ':    'text-green-600 bg-green-50 border border-green-200',
};

const TABS: { id: TabId; label: string }[] = [
  { id: 'consultation',  label: 'Consultation externe' },
  { id: 'paraclinique',  label: 'Examen paraclinique' },
  { id: 'controle',      label: 'Contrôle' },
];

const STATS = [
  { label: 'RDV DU JOUR', value: '42', sub: "Aujourd'hui", accent: 'text-gray-900',   border: 'border-l-4 border-blue-600' },
  { label: 'EN ATTENTE',  value: '14', sub: 'En salle',    accent: 'text-amber-500',  border: '' },
  { label: 'EN COURS',    value: '28', sub: 'Patients',    accent: 'text-blue-600',   border: '' },
  { label: 'TERMINÉS',    value: '28', sub: 'Patients',    accent: 'text-green-600',  border: '' },
];

// ── Component ─────────────────────────────────────────────────────
export default function RendezVousMain() {
  const [activeTab, setActiveTab] = useState<TabId>('consultation');
  const [statut, setStatut]       = useState('Tous');
  const [date, setDate]           = useState('2023-10-12');
  const [page, setPage]           = useState(1);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-8 max-w-7xl mx-auto space-y-6">

        {/* ── Title ── */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Listes des rendez-vous</h1>
          <p className="text-sm text-gray-400 mt-1">
            Gérez les flux de patients et les plannings cliniques en temps réel.
          </p>
        </div>

        {/* ── Stats row ── */}
        <div className="grid grid-cols-4 gap-4">
          {STATS.map((s, i) => (
            <div
              key={i}
              className={`bg-white rounded-2xl border border-gray-100 shadow-sm px-6 py-5 ${s.border}`}
            >
              <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-2">
                {s.label}
              </p>
              <div className="flex items-baseline gap-2">
                <p className={`text-4xl font-bold leading-none ${s.accent}`}>{s.value}</p>
                <p className="text-sm text-gray-400">{s.sub}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── Main table card ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

          {/* Toolbar */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-50 gap-4 flex-wrap">

            {/* Tabs */}
            <div className="flex gap-1">
              {TABS.map(tab => (
                <button
                  type="button"
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-5 py-2 rounded-xl text-sm font-medium transition-all ${
                    activeTab === tab.id
                      ? 'bg-blue-50 text-blue-600 font-semibold'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Right controls */}
            <div className="flex items-center gap-3">
              {/* Statut select */}
              <div className="relative flex items-center">
                <select
                  value={statut}
                  onChange={e => setStatut(e.target.value)}
                  className="appearance-none pl-3 pr-8 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-600 focus:outline-none focus:border-blue-400 cursor-pointer"
                >
                  <option>Tous</option>
                  <option>Planifié</option>
                  <option>En cours</option>
                  <option>Terminé</option>
                </select>
                <ChevronDown size={13} className="absolute right-2.5 text-gray-400 pointer-events-none" />
                <span className="absolute left-3 -top-2 text-[10px] font-semibold text-gray-400 bg-white px-0.5">
                  Statut
                </span>
              </div>

              {/* Date input */}
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-600 focus:outline-none focus:border-blue-400"
              />

              {/* Filter icon */}
              <button
                type="button"
                className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-400 transition-colors"
              >
                <SlidersHorizontal size={15} />
              </button>
            </div>
          </div>

          {/* Table */}
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-50">
                {['ID RDV', 'PATIENT', 'SERVICE &\nMÉDECIN', 'DATE &\nHEURE', 'STATUT', 'ACTIONS'].map(h => (
                  <th
                    key={h}
                    className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400 whitespace-pre-line"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {RDV.map((rdv, i) => (
                <tr key={i} className="border-b border-gray-50 hover:bg-gray-50/60 transition-colors">

                  {/* ID RDV */}
                  <td className="px-6 py-5">
                    <p className="text-sm font-bold text-blue-600 leading-tight">
                      {rdv.id.replace('-', '-\n')}
                    </p>
                  </td>

                  {/* Patient */}
                  <td className="px-6 py-5">
                    <p className="text-sm font-semibold text-gray-800">{rdv.nom}</p>
                    <p className="text-xs text-gray-400 mt-0.5">ID: {rdv.patientId}</p>
                  </td>

                  {/* Service & Médecin */}
                  <td className="px-6 py-5">
                    <p className="text-sm text-gray-700">{rdv.service}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{rdv.medecin}</p>
                  </td>

                  {/* Date & Heure */}
                  <td className="px-6 py-5">
                    <p className="text-sm text-gray-700">{rdv.jour}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{rdv.heure}</p>
                  </td>

                  {/* Statut */}
                  <td className="px-6 py-5">
                    <span className={`inline-block text-[11px] font-bold px-3 py-1 rounded-lg tracking-wide ${STATUT_STYLE[rdv.statut]}`}>
                      {rdv.statut}
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="px-6 py-5 text-right">
                    {rdv.statut === 'PLANIFIÉ' && (
                      <button
                        type="button"
                        className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 active:scale-[0.98] text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-all shadow-sm shadow-green-200"
                      >
                        <CheckCircle size={15} />
                        Confirmer l'arrivée
                      </button>
                    )}
                    {(rdv.statut === 'EN COURS' || rdv.statut === 'EN ATTENTE') && (
                      <button
                        type="button"
                        className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 border border-gray-200 hover:bg-gray-50 px-5 py-2.5 rounded-xl transition-colors"
                      >
                        <Eye size={14} className="text-gray-400" />
                        Voir détails
                      </button>
                    )}
                    {rdv.statut === 'TERMINÉ' && (
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 transition-colors"
                        >
                          <FileText size={15} />
                        </button>
                        <button
                          type="button"
                          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 transition-colors"
                        >
                          <MoreVertical size={15} />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          <div className="flex items-center justify-between px-6 py-3 border-t border-gray-50">
            <p className="text-xs text-gray-400">
              Affichage de 1 à 10 sur 1,284 résultats
            </p>
            <div className="flex items-center gap-1">
              <button
                type="button"
                className="w-7 h-7 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-100 text-gray-400 transition-colors"
              >
                <ChevronLeft size={14} />
              </button>
              {[1, 2, 3].map(p => (
                <button
                  type="button"
                  key={p}
                  onClick={() => setPage(p)}
                  className={`w-7 h-7 flex items-center justify-center rounded-lg text-xs font-semibold transition-colors ${
                    page === p
                      ? 'bg-blue-600 text-white'
                      : 'border border-gray-200 text-gray-500 hover:bg-gray-100'
                  }`}
                >
                  {p}
                </button>
              ))}
              <button
                type="button"
                className="w-7 h-7 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-100 text-gray-400 transition-colors"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}