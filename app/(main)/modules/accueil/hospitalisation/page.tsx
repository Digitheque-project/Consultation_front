'use client';

import { useMemo, useState } from 'react';
import {
  Activity,
  BedDouble,
  Building2,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Search,
  SlidersHorizontal,
  XCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ── Types ─────────────────────────────────────────────────────────
type Priorite = 'URGENT' | 'NORMAL';
type Statut = 'EN ATTENTE' | 'ACCEPTÉE' | 'REFUSÉE';

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
  { id: '#ADM-8842', nom: 'Jean-Marc DUBOIS', ipp: '4402931', sexeAge: 'H, 64 ans', service: 'Cardiologie', medecin: 'Dr. Lebrun', priorite: 'URGENT', statut: 'EN ATTENTE', date: "Aujourd'hui, 08:14" },
  { id: '#ADM-8839', nom: 'Marie-Claire LEROY', ipp: '9021485', sexeAge: 'F, 42 ans', service: 'Neurologie', medecin: 'Dr. Martin', priorite: 'NORMAL', statut: 'ACCEPTÉE', date: "Aujourd'hui, 07:50" },
  { id: '#ADM-8835', nom: 'Thomas BERNARD', ipp: '1128374', sexeAge: 'H, 29 ans', service: 'Urgences', medecin: 'Dr. Fontaine', priorite: 'NORMAL', statut: 'REFUSÉE', date: 'Hier, 22:33' },
  { id: '#ADM-8831', nom: 'Fatou DIALLO', ipp: '3389201', sexeAge: 'F, 55 ans', service: 'Chirurgie', medecin: 'Dr. Rakoto', priorite: 'URGENT', statut: 'EN ATTENTE', date: 'Hier, 20:10' },
  { id: '#ADM-8828', nom: 'Paul RICHARD', ipp: '7712043', sexeAge: 'H, 71 ans', service: 'Gériatrie', medecin: 'Dr. Rabe', priorite: 'NORMAL', statut: 'ACCEPTÉE', date: 'Hier, 17:45' },
];

const PRIORITE_STYLE: Record<Priorite, string> = {
  URGENT: 'text-red-700 bg-red-50 border border-red-200/90 ring-red-100/50',
  NORMAL: 'text-gray-600 bg-gray-50 border border-gray-200 ring-gray-100/80',
};

const STATUT_STYLE: Record<Statut, string> = {
  'EN ATTENTE': 'text-blue-700 bg-blue-50 border border-blue-200/90 ring-blue-100/50',
  ACCEPTÉE: 'text-emerald-700 bg-emerald-50 border border-emerald-200/90 ring-emerald-100/50',
  REFUSÉE: 'text-red-700 bg-red-50 border border-red-200/90 ring-red-100/50',
};

const STATUT_LABEL: Record<Statut, string> = {
  'EN ATTENTE': 'En attente',
  ACCEPTÉE: 'Acceptée',
  REFUSÉE: 'Refusée',
};

const PER_PAGE = 6;

export default function HospitalisationMain() {
  const [search, setSearch] = useState('');
  const [statut, setStatut] = useState('Tous');
  const [service, setService] = useState('Tous');
  const [page, setPage] = useState(1);

  const setSearchQ = (v: string) => {
    setSearch(v);
    setPage(1);
  };
  const setStatutF = (v: string) => {
    setStatut(v);
    setPage(1);
  };
  const setServiceF = (v: string) => {
    setService(v);
    setPage(1);
  };

  const filtered = useMemo(
    () =>
      DEMANDES.filter(d => {
        const q = search.toLowerCase();
        const matchSearch =
          d.nom.toLowerCase().includes(q) ||
          d.id.toLowerCase().includes(q) ||
          d.ipp.includes(search);
        const matchStatut = statut === 'Tous' || d.statut === statut;
        const matchService = service === 'Tous' || d.service === service;
        return matchSearch && matchStatut && matchService;
      }),
    [search, statut, service],
  );

  const counts = useMemo(
    () => ({
      total: DEMANDES.length,
      attente: DEMANDES.filter(d => d.statut === 'EN ATTENTE').length,
      acceptee: DEMANDES.filter(d => d.statut === 'ACCEPTÉE').length,
      refusee: DEMANDES.filter(d => d.statut === 'REFUSÉE').length,
    }),
    [],
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const pageData = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const hasFilters = statut !== 'Tous' || service !== 'Tous' || search.trim() !== '';

  const clearFilters = () => {
    setSearch('');
    setStatut('Tous');
    setService('Tous');
    setPage(1);
  };

  return (
    <div className="min-h-full bg-gradient-to-b from-slate-50 via-gray-50 to-slate-100/80">
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:space-y-8 sm:px-6 sm:py-8 lg:px-8">
        {/* En-tête */}
        
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-[22px] font-semibold text-gray-900 tracking-tight">
            Demandes d'hospitalisation
            </h1>
            <p className="text-[13px] text-gray-400 mt-1">
            Gestion du flux des admissions centralisées et suivi des lits.
            </p>
          </div>
          {/* <button
            type="button"
            className="flex items-center gap-2 px-4 py-2.5 text-[13px] font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-xl transition-all shadow-sm shadow-blue-200"
          >
            <Calendar size={14} />
            Nouveau rendez-vous
          </button> */}
        </div>

        {/* Statistiques */}
        <div className="flex flex-col gap-3 sm:gap-4 lg:flex-row lg:items-stretch">
          <div className="flex shrink-0 items-center gap-4 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 px-5 py-5 text-white shadow-lg shadow-slate-900/30 ring-1 ring-white/10 sm:px-6 lg:w-52 lg:flex-col lg:items-start lg:justify-center lg:py-6">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/15">
              <Building2 className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-300">Total</p>
              <p className="mt-1 text-3xl font-bold tabular-nums leading-none sm:text-4xl">{counts.total}</p>
              <p className="mt-1 text-xs text-slate-400">demandes (jeu démo)</p>
            </div>
          </div>

          <div className="grid flex-1 grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
            {[
              {
                label: 'En attente',
                value: counts.attente,
                sub: 'à traiter',
                accent: 'text-amber-600',
                iconBg: 'bg-amber-50 ring-amber-100/80',
                Icon: Clock,
              },
              {
                label: 'Acceptées',
                value: counts.acceptee,
                sub: 'validées',
                accent: 'text-emerald-600',
                iconBg: 'bg-emerald-50 ring-emerald-100/80',
                Icon: CheckCircle2,
              },
              {
                label: 'Refusées',
                value: counts.refusee,
                sub: 'rejetées',
                accent: 'text-red-600',
                iconBg: 'bg-red-50 ring-red-100/80',
                Icon: XCircle,
              },
            ].map((s, i) => {
              const Icon = s.Icon;
              return (
                <div
                  key={i}
                  className="flex items-center gap-3 rounded-2xl border border-gray-100/90 bg-white px-4 py-4 shadow-sm shadow-gray-200/40 ring-1 ring-gray-100/80 transition-shadow hover:shadow-md sm:px-5"
                >
                  <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1', s.iconBg)}>
                    <Icon size={17} className={s.accent} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{s.label}</p>
                    <div className="mt-0.5 flex flex-wrap items-baseline gap-x-1.5">
                      <span className={cn('text-2xl font-bold tabular-nums leading-none', s.accent)}>{s.value}</span>
                      <span className="text-[11px] text-gray-400">{s.sub}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Filtres */}
        <div className="flex flex-col gap-3 rounded-2xl border border-gray-100/90 bg-white px-4 py-4 shadow-md shadow-gray-200/50 ring-1 ring-gray-100/80 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3 sm:px-5 sm:py-3.5">
          <div className="relative min-w-0 flex-1 sm:min-w-[220px]">
            <Search size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearchQ(e.target.value)}
              placeholder="Patient, IPP, n° dossier…"
              className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm text-gray-800 shadow-inner shadow-gray-100/50 placeholder:text-gray-400 focus:border-teal-500/50 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
            />
          </div>

          <div className="relative flex min-w-0 flex-1 items-center sm:max-w-[200px] sm:flex-initial">
            <SlidersHorizontal size={14} className="pointer-events-none absolute left-3 text-gray-400" />
            <select
              value={statut}
              onChange={e => setStatutF(e.target.value)}
              className="w-full cursor-pointer appearance-none rounded-xl border border-gray-200 bg-gray-50/80 py-2.5 pl-9 pr-9 text-sm text-gray-700 shadow-sm transition-colors focus:border-teal-500/50 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
            >
              <option value="Tous">Tous les statuts</option>
              <option value="EN ATTENTE">En attente</option>
              <option value="ACCEPTÉE">Acceptée</option>
              <option value="REFUSÉE">Refusée</option>
            </select>
            <ChevronDown size={14} className="pointer-events-none absolute right-3 text-gray-400" />
          </div>

          <div className="relative flex min-w-0 flex-1 items-center sm:max-w-[200px] sm:flex-initial">
            <Building2 size={14} className="pointer-events-none absolute left-3 text-gray-400" />
            <select
              value={service}
              onChange={e => setServiceF(e.target.value)}
              className="w-full cursor-pointer appearance-none rounded-xl border border-gray-200 bg-gray-50/80 py-2.5 pl-9 pr-9 text-sm text-gray-700 shadow-sm transition-colors focus:border-teal-500/50 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
            >
              <option value="Tous">Tous les services</option>
              <option>Cardiologie</option>
              <option>Neurologie</option>
              <option>Urgences</option>
              <option>Chirurgie</option>
              <option>Gériatrie</option>
            </select>
            <ChevronDown size={14} className="pointer-events-none absolute right-3 text-gray-400" />
          </div>

          {hasFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex shrink-0 items-center justify-center rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700 transition-colors hover:bg-red-100"
            >
              Réinitialiser
            </button>
          )}
        </div>

        {/* Tableau */}
        <div className="overflow-hidden rounded-2xl border border-gray-100/90 bg-white shadow-md shadow-gray-200/50 ring-1 ring-gray-100/80">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] border-collapse text-left">
              <thead>
                <tr className="border-b border-gray-200 bg-gradient-to-b from-gray-50 to-gray-50/30">
                  {[
                    { key: 'id', label: 'ID demande' },
                    { key: 'patient', label: 'Patient' },
                    { key: 'sexeAge', label: 'Sexe / âge' },
                    { key: 'service', label: 'Service' },
                    { key: 'medecin', label: 'Médecin' },
                    { key: 'priorite', label: 'Priorité' },
                    { key: 'statut', label: 'Statut' },
                    { key: 'date', label: "Date d'entrée" },
                  ].map(col => (
                    <th
                      key={col.key}
                      className="whitespace-nowrap px-4 py-3.5 text-left text-[10px] font-bold uppercase tracking-widest text-gray-500 sm:px-6"
                    >
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100/90">
                {pageData.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-16 text-center sm:px-6">
                      <div className="mx-auto flex max-w-sm flex-col items-center gap-3">
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-gray-100 to-gray-50 ring-1 ring-gray-200/80">
                          <Search className="h-6 w-6 text-gray-400" />
                        </div>
                        <p className="text-base font-semibold text-gray-700">Aucune demande trouvée</p>
                        <p className="text-sm text-gray-500">Ajustez la recherche ou les filtres.</p>
                        {hasFilters && (
                          <button
                            type="button"
                            onClick={clearFilters}
                            className="mt-1 rounded-xl bg-teal-600 px-4 py-2 text-sm font-medium text-white shadow-md shadow-teal-500/25 transition-colors hover:bg-teal-700"
                          >
                            Tout réinitialiser
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  pageData.map((d, i) => (
                    <tr
                      key={d.id + i}
                      className="group border-b border-gray-100/80 bg-white transition-colors hover:bg-gradient-to-r hover:from-teal-50/30 hover:to-transparent"
                    >
                      <td className="px-4 py-4 sm:px-6 sm:py-5">
                        <span className="inline-block rounded-lg border border-blue-100 bg-blue-50/90 px-2.5 py-1 font-mono text-xs font-bold tracking-wide text-blue-700 shadow-sm ring-1 ring-blue-100/60">
                          {d.id}
                        </span>
                      </td>
                      <td className="px-4 py-4 sm:px-6 sm:py-5">
                        <p className="text-sm font-semibold leading-tight text-gray-900">{d.nom}</p>
                        <p className="mt-0.5 text-xs text-gray-500">IPP {d.ipp}</p>
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-600 sm:px-6 sm:py-5">{d.sexeAge}</td>
                      <td className="px-4 py-4 text-sm font-medium text-gray-900 sm:px-6 sm:py-5">{d.service}</td>
                      <td className="px-4 py-4 text-sm text-gray-600 sm:px-6 sm:py-5">{d.medecin}</td>
                      <td className="px-4 py-4 sm:px-6 sm:py-5">
                        <span
                          className={cn(
                            'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold tracking-wide shadow-sm ring-1 ring-black/[0.04]',
                            PRIORITE_STYLE[d.priorite],
                          )}
                        >
                          {d.priorite === 'URGENT' ? (
                            <span className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-red-500" />
                          ) : (
                            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-gray-400" />
                          )}
                          {d.priorite}
                        </span>
                      </td>
                      <td className="px-4 py-4 sm:px-6 sm:py-5">
                        <span
                          className={cn(
                            'inline-flex rounded-full px-3 py-1.5 text-[11px] font-bold tracking-wide shadow-sm ring-1 ring-black/[0.04]',
                            STATUT_STYLE[d.statut],
                          )}
                        >
                          {STATUT_LABEL[d.statut]}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-xs leading-snug text-gray-500 sm:px-6 sm:py-5">{d.date}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-4 border-t border-gray-100 bg-gradient-to-r from-gray-50/90 via-white to-gray-50/50 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <p className="text-center text-[12px] text-gray-500 sm:text-left">
              {filtered.length === 0
                ? 'Aucun résultat'
                : `${Math.min((page - 1) * PER_PAGE + 1, filtered.length)}–${Math.min(page * PER_PAGE, filtered.length)} sur ${filtered.length} demande${filtered.length > 1 ? 's' : ''}`}
            </p>
            <div className="flex items-center justify-center gap-1 sm:justify-end">
              <button
                type="button"
                disabled={page === 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500 shadow-sm transition-all hover:border-gray-300 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft size={16} />
              </button>
              {Array.from({ length: totalPages }, (_, idx) => idx + 1).map(p => (
                <button
                  type="button"
                  key={p}
                  onClick={() => setPage(p)}
                  className={cn(
                    'flex h-9 min-w-[2.25rem] items-center justify-center rounded-xl text-xs font-semibold transition-all',
                    page === p
                      ? 'bg-gradient-to-b from-slate-800 to-slate-900 text-white shadow-md shadow-slate-900/30 ring-1 ring-slate-700/30'
                      : 'border border-gray-200 bg-white text-gray-600 shadow-sm hover:border-gray-300 hover:bg-gray-50',
                  )}
                >
                  {p}
                </button>
              ))}
              <button
                type="button"
                disabled={page === totalPages || filtered.length === 0}
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500 shadow-sm transition-all hover:border-gray-300 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
