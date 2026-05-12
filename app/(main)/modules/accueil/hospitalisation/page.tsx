'use client';

import { useState } from 'react';
import {
  Search, SlidersHorizontal, Building2,
  ChevronLeft, ChevronRight, ChevronDown
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────
type Priorite = 'URGENT' | 'NORMAL';
type Statut   = 'EN ATTENTE' | 'ACCEPTÉE' | 'REFUSÉE';

interface Demande {
  id: string;
  nom: string;
  ipp: string;
  sexeAge: string;
  service: string;
  medecin: string;
  priorite: Priorite;
  statut: Statut;
  date: string;
}

// ── Data ──────────────────────────────────────────────────────────
const DEMANDES: Demande[] = [
  { id: '#ADM-8842', nom: 'Jean-Marc DUBOIS',    ipp: '4402931', sexeAge: 'H, 64 ans', service: 'Cardiologie', medecin: 'Dr. Lebrun',   priorite: 'URGENT', statut: 'EN ATTENTE', date: "Aujourd'hui, 08:14" },
  { id: '#ADM-8839', nom: 'Marie-Claire LEROY',  ipp: '9021485', sexeAge: 'F, 42 ans', service: 'Neurologie',  medecin: 'Dr. Martin',   priorite: 'NORMAL', statut: 'ACCEPTÉE',   date: "Aujourd'hui, 07:50" },
  { id: '#ADM-8835', nom: 'Thomas BERNARD',      ipp: '1128374', sexeAge: 'H, 29 ans', service: 'Urgences',    medecin: 'Dr. Fontaine', priorite: 'NORMAL', statut: 'REFUSÉE',    date: 'Hier, 22:33' },
  { id: '#ADM-8831', nom: 'Fatou DIALLO',        ipp: '3389201', sexeAge: 'F, 55 ans', service: 'Chirurgie',   medecin: 'Dr. Rakoto',   priorite: 'URGENT', statut: 'EN ATTENTE', date: 'Hier, 20:10' },
  { id: '#ADM-8828', nom: 'Paul RICHARD',        ipp: '7712043', sexeAge: 'H, 71 ans', service: 'Gériatrie',   medecin: 'Dr. Rabe',     priorite: 'NORMAL', statut: 'ACCEPTÉE',   date: 'Hier, 17:45' },
];

// ── Style maps ────────────────────────────────────────────────────
const PRIORITE_STYLE: Record<Priorite, string> = {
  URGENT: 'text-red-600 bg-red-50 border border-red-200',
  NORMAL: 'text-gray-500 bg-gray-50 border border-gray-200',
};

const STATUT_STYLE: Record<Statut, string> = {
  'EN ATTENTE': 'text-blue-600 bg-blue-50 border border-blue-200',
  'ACCEPTÉE':   'text-green-600 bg-green-50 border border-green-200',
  'REFUSÉE':    'text-red-600 bg-red-50 border border-red-200',
};

const STATS = [
  { label: 'TOTAL',      value: '142', accent: 'text-gray-900' },
  { label: 'EN ATTENTE', value: '28',  accent: 'text-amber-500' },
  { label: 'ACCEPTÉES',  value: '104', accent: 'text-green-600' },
  { label: 'REFUSÉES',   value: '10',  accent: 'text-red-500' },
];

// ── Component ─────────────────────────────────────────────────────
export default function HospitalisationMain() {
  const [search, setSearch]   = useState('');
  const [statut, setStatut]   = useState('Tous');
  const [service, setService] = useState('Tous');
  const [page, setPage]       = useState(1);

  const filtered = DEMANDES.filter(d => {
    const matchSearch  = d.nom.toLowerCase().includes(search.toLowerCase()) ||
                         d.id.toLowerCase().includes(search.toLowerCase()) ||
                         d.ipp.includes(search);
    const matchStatut  = statut  === 'Tous' || d.statut  === statut;
    const matchService = service === 'Tous' || d.service === service;
    return matchSearch && matchStatut && matchService;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-8 max-w-7xl mx-auto space-y-6">

        {/* ── Header row: title + stats inline ── */}
        <div className="flex items-start justify-between gap-8 flex-wrap">

          {/* Title */}
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight leading-tight">
              Demandes<br />d'Hospitalisation
            </h1>
            <p className="text-sm text-gray-400 mt-1.5 max-w-xs leading-relaxed">
              Gestion du flux des admissions centralisées.
            </p>
          </div>

          {/* Stats — inline on the right */}
          <div className="flex-1 min-w-0">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-6 py-4 grid grid-cols-4 gap-6">
              {STATS.map((s, i) => (
                <div key={i} className={i > 0 ? 'border-l border-gray-100 pl-6' : ''}>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-1">
                    {s.label}
                  </p>
                  <p className={`text-3xl font-bold leading-none ${s.accent}`}>{s.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Search + filters bar ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-3.5 flex items-center gap-3 flex-wrap">
          {/* Search */}
          <div className="relative flex-1 min-w-[220px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Patient, IPP, n° dossier..."
              className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:border-blue-400 focus:bg-white transition-colors"
            />
          </div>

          {/* Statut filter */}
          <div className="relative flex items-center">
            <SlidersHorizontal size={14} className="absolute left-3 text-gray-400 pointer-events-none" />
            <select
              value={statut}
              onChange={e => setStatut(e.target.value)}
              className="appearance-none pl-9 pr-8 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-600 focus:outline-none focus:border-blue-400 cursor-pointer"
            >
              <option value="Tous">Tous les Statuts</option>
              <option value="EN ATTENTE">En attente</option>
              <option value="ACCEPTÉE">Acceptée</option>
              <option value="REFUSÉE">Refusée</option>
            </select>
            <ChevronDown size={12} className="absolute right-2.5 text-gray-400 pointer-events-none" />
          </div>

          {/* Service filter */}
          <div className="relative flex items-center">
            <Building2 size={14} className="absolute left-3 text-gray-400 pointer-events-none" />
            <select
              value={service}
              onChange={e => setService(e.target.value)}
              className="appearance-none pl-9 pr-8 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-600 focus:outline-none focus:border-blue-400 cursor-pointer"
            >
              <option value="Tous">Tous les Services</option>
              <option>Cardiologie</option>
              <option>Neurologie</option>
              <option>Urgences</option>
              <option>Chirurgie</option>
              <option>Gériatrie</option>
            </select>
            <ChevronDown size={12} className="absolute right-2.5 text-gray-400 pointer-events-none" />
          </div>
        </div>

        {/* ── Table card ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-50">
                {[
                  { key: 'id',       label: 'ID\nDEMANDE' },
                  { key: 'patient',  label: 'PATIENT' },
                  { key: 'sexeAge',  label: 'SEXE/\nÂGE' },
                  { key: 'service',  label: 'SERVICE' },
                  { key: 'medecin',  label: 'MÉDECIN' },
                  { key: 'priorite', label: 'PRIORITÉ' },
                  { key: 'statut',   label: 'STATUT' },
                  { key: 'date',     label: "DATE D'ENTRÉE" },
                ].map(col => (
                  <th
                    key={col.key}
                    className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400 whitespace-pre-line"
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-sm text-gray-400">
                    Aucune demande trouvée
                  </td>
                </tr>
              ) : (
                filtered.map((d, i) => (
                  <tr
                    key={i}
                    className="border-b border-gray-50 hover:bg-gray-50/60 transition-colors cursor-pointer"
                  >
                    {/* ID */}
                    <td className="px-6 py-5">
                      <p className="text-sm font-bold text-blue-600 leading-tight whitespace-pre-line">
                        {d.id.replace('-', '-\n')}
                      </p>
                    </td>

                    {/* Patient */}
                    <td className="px-6 py-5">
                      <p className="text-sm font-semibold text-gray-800 leading-tight">{d.nom}</p>
                      <p className="text-xs text-gray-400 mt-0.5">IPP: {d.ipp}</p>
                    </td>

                    {/* Sexe / Âge */}
                    <td className="px-6 py-5 text-sm text-gray-600 whitespace-nowrap">{d.sexeAge}</td>

                    {/* Service */}
                    <td className="px-6 py-5 text-sm font-medium text-gray-700">{d.service}</td>

                    {/* Médecin */}
                    <td className="px-6 py-5 text-sm text-gray-600">{d.medecin}</td>

                    {/* Priorité */}
                    <td className="px-6 py-5">
                      <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-3 py-1 rounded-lg tracking-wide ${PRIORITE_STYLE[d.priorite]}`}>
                        {d.priorite === 'URGENT' && (
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
                        )}
                        {d.priorite}
                      </span>
                    </td>

                    {/* Statut */}
                    <td className="px-6 py-5">
                      <span className={`inline-block text-[11px] font-bold px-3 py-1 rounded-lg tracking-wide ${STATUT_STYLE[d.statut]}`}>
                        {d.statut}
                      </span>
                    </td>

                    {/* Date */}
                    <td className="px-6 py-5 text-xs text-gray-400 leading-snug whitespace-nowrap">
                      {d.date}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {/* Pagination */}
          <div className="flex items-center justify-between px-6 py-3 border-t border-gray-50">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
              Affichage de 1–{filtered.length} sur 142 demandes
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
                      ? 'bg-gray-900 text-white'
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