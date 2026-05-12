'use client';

import Link from 'next/link';
import { useState, useMemo } from 'react';
import {
  CheckCircle, Eye, FileText,
  ChevronLeft, ChevronRight, Calendar, Clock,
  Activity, TrendingUp, Stethoscope, FlaskConical,
  RefreshCcw, X, Filter, Users, Search,
} from 'lucide-react';
import {
  ALL_RDV,
  dayLabel,
  patientColor,
  rdvDisplayName,
  STATUT_CONFIG,
} from '@/lib/data/accueil-rendez-vous-mock';
import { cn } from '@/lib/utils';

type TabId  = 'consultation' | 'paraclinique' | 'controle';
type DateMode = 'single' | 'range';

const TABS: { id: TabId; icon: React.ElementType; label: string }[] = [
  { id: 'consultation', icon: Stethoscope,  label: 'Consultation externe' },
  { id: 'paraclinique', icon: FlaskConical, label: 'Paraclinique' },
  { id: 'controle',     icon: RefreshCcw,   label: 'Contrôle' },
];

const STATUT_OPTIONS = [
  { value: 'Tous',        label: 'Tous' },
  { value: 'PLANIFIÉ',   label: 'Planifié' },
  { value: 'EN COURS',   label: 'En cours' },
  { value: 'EN ATTENTE', label: 'En attente' },
  { value: 'TERMINÉ',    label: 'Terminé' },
];

export default function RendezVousMain() {
  const [activeTab, setActiveTab]     = useState<TabId>('consultation');
  const [statut, setStatut]           = useState('Tous');
  const [dateMode, setDateMode]       = useState<DateMode>('single');
  const [dateSingle, setDateSingle]   = useState('');
  const [dateFrom, setDateFrom]       = useState('');
  const [dateTo, setDateTo]           = useState('');
  const [page, setPage]               = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [search, setSearch]           = useState('');
  const PER_PAGE = 6;

  const applyStatut     = (v: string)   => { setStatut(v); setPage(1); };
  const applyDateSingle = (v: string)   => { setDateSingle(v); setPage(1); };
  const applyDateFrom   = (v: string)   => { setDateFrom(v); setPage(1); };
  const applyDateTo     = (v: string)   => { setDateTo(v); setPage(1); };
  const applyDateMode   = (v: DateMode) => { setDateMode(v); setPage(1); };
  const applySearch     = (v: string)   => { setSearch(v); setPage(1); };
  const switchTab       = (tab: TabId)  => { setActiveTab(tab); setPage(1); };

  const filtered = useMemo(() => {
    return ALL_RDV.filter(rdv => {
      const q = search.trim().toLowerCase();
      const fullName = rdvDisplayName(rdv).toLowerCase();
      const matchSearch = !q
        || fullName.includes(q)
        || rdv.patientId.toLowerCase().includes(q)
        || rdv.service.toLowerCase().includes(q)
        || rdv.medecin.toLowerCase().includes(q)
        || rdv.id.toLowerCase().includes(q);
      const matchStatut = statut === 'Tous' || rdv.statut === statut;
      let matchDate = true;
      if (dateMode === 'single' && dateSingle)       matchDate = rdv.date === dateSingle;
      else if (dateMode === 'range') {
        if (dateFrom && dateTo) matchDate = rdv.date >= dateFrom && rdv.date <= dateTo;
        else if (dateFrom)      matchDate = rdv.date >= dateFrom;
        else if (dateTo)        matchDate = rdv.date <= dateTo;
      }
      return matchSearch && matchStatut && matchDate;
    });
  }, [search, statut, dateMode, dateSingle, dateFrom, dateTo]);

  const counts = useMemo(() => ({
    total:    filtered.length,
    planifie: filtered.filter(r => r.statut === 'PLANIFIÉ').length,
    enCours:  filtered.filter(r => r.statut === 'EN COURS').length,
    attente:  filtered.filter(r => r.statut === 'EN ATTENTE').length,
    termine:  filtered.filter(r => r.statut === 'TERMINÉ').length,
  }), [filtered]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const pageData   = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const hasFilter = statut !== 'Tous'
    || (dateMode === 'single' && !!dateSingle)
    || (dateMode === 'range' && (!!dateFrom || !!dateTo));

  const clearFilters = () => {
    setStatut('Tous');
    setDateSingle('');
    setDateFrom('');
    setDateTo('');
    setSearch('');
    setPage(1);
  };

  return (
    <div className="min-h-full bg-gradient-to-b from-slate-50 via-gray-50 to-slate-100/80">
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:space-y-8 sm:px-6 sm:py-8 lg:px-8">

        {/* ── Header ── */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-[22px] font-semibold text-gray-900 tracking-tight">
              Liste des rendez-vous
            </h1>
            <p className="text-[13px] text-gray-400 mt-1">
              Gérez les flux de patients et les plannings cliniques en temps réel.
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

        {/* ── Stats ── */}
        <div className="flex flex-col gap-3 sm:gap-4 lg:flex-row lg:items-stretch">
          <div className="flex shrink-0 items-center gap-4 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 px-5 py-5 text-white shadow-lg shadow-blue-600/25 ring-1 ring-white/10 sm:px-6 lg:w-56 lg:flex-col lg:items-start lg:justify-center lg:py-6">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/20">
              <Calendar className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-blue-200/90">Total RDV</p>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-3xl font-bold tabular-nums leading-none sm:text-4xl">{counts.total}</span>
                <span className="text-xs text-blue-200/90">filtrés</span>
              </div>
            </div>
          </div>

          <div className="grid flex-1 grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {[
              { label: 'Planifiés',  value: counts.planifie, sub: 'à venir',   accent: 'text-blue-700',   iconBg: 'bg-blue-50 ring-blue-100/80',   icon: Activity },
              { label: 'En attente', value: counts.attente,  sub: 'en salle',  accent: 'text-violet-700', iconBg: 'bg-violet-50 ring-violet-100/80', icon: Users },
              { label: 'En cours',   value: counts.enCours,  sub: 'actifs',    accent: 'text-orange-600', iconBg: 'bg-orange-50 ring-orange-100/80', icon: Clock },
              { label: 'Terminés',   value: counts.termine,  sub: 'complétés', accent: 'text-emerald-700', iconBg: 'bg-emerald-50 ring-emerald-100/80', icon: TrendingUp },
            ].map((s, i) => {
              const Icon = s.icon;
              return (
                <div
                  key={i}
                  className="group flex items-center gap-3 rounded-2xl border border-gray-100/90 bg-white px-4 py-4 shadow-sm shadow-gray-200/40 ring-1 ring-gray-100/80 transition-shadow hover:shadow-md hover:ring-gray-200/90 sm:px-5 sm:py-4"
                >
                  <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1', s.iconBg)}>
                    <Icon size={17} className={s.accent} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{s.label}</p>
                    <div className="mt-0.5 flex flex-wrap items-baseline gap-x-1.5 gap-y-0">
                      <span className={cn('text-2xl font-bold tabular-nums leading-none', s.accent)}>{s.value}</span>
                      <span className="text-[11px] text-gray-400">{s.sub}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Main card ── */}
        <div className="overflow-hidden rounded-2xl border border-gray-100/90 bg-white shadow-md shadow-gray-200/50 ring-1 ring-gray-100/80">

          {/* Toolbar */}
          <div className="space-y-3 border-b border-gray-100 bg-gradient-to-b from-white to-gray-50/30 px-4 py-4 sm:px-6 sm:py-5">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">

              {/* Tabs */}
              <div className="flex flex-wrap gap-1 rounded-xl border border-gray-100 bg-gray-50/90 p-1 ring-1 ring-gray-100/60">
                {TABS.map(tab => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      type="button"
                      key={tab.id}
                      onClick={() => switchTab(tab.id)}
                      className={cn(
                        'flex items-center gap-2 rounded-lg px-3 py-2 text-[13px] font-medium transition-all sm:px-4',
                        isActive
                          ? 'border border-gray-200/80 bg-white font-semibold text-blue-700 shadow-sm shadow-gray-200/50 ring-1 ring-gray-100'
                          : 'text-gray-500 hover:bg-white/60 hover:text-gray-800',
                      )}
                    >
                      <Icon size={13} className={isActive ? 'text-blue-500' : 'text-gray-400'} />
                      <span className="hidden sm:inline">{tab.label}</span>
                      <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
                    </button>
                  );
                })}
              </div>

              {/* Right controls */}
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
                <div className="relative min-w-0 flex-1 sm:max-w-xs sm:flex-initial">
                  <Search size={14} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Patient, ID, service…"
                    value={search}
                    onChange={e => applySearch(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-9 text-[13px] text-gray-800 shadow-inner shadow-gray-100/50 placeholder:text-gray-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                  {search && (
                    <button
                      type="button"
                      onClick={() => applySearch('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-lg p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                      aria-label="Effacer la recherche"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {hasFilter && (
                    <button
                      type="button"
                      onClick={clearFilters}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[12px] font-semibold text-red-700 transition-colors hover:bg-red-100"
                    >
                      <X size={12} />
                      Effacer
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowFilters(v => !v)}
                    className={cn(
                      'inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-[13px] font-medium transition-all',
                      showFilters || hasFilter
                        ? 'border-blue-200 bg-blue-50 text-blue-800 shadow-sm shadow-blue-100/50 ring-1 ring-blue-100/60'
                        : 'border-gray-200 bg-white text-gray-600 shadow-sm hover:border-gray-300 hover:bg-gray-50',
                    )}
                  >
                    <Filter size={14} />
                    Filtres
                    {hasFilter && <span className="h-2 w-2 shrink-0 rounded-full bg-blue-600" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Filter panel */}
            {showFilters && (
              <div className="rounded-2xl border border-gray-100 bg-gray-50/90 p-4 ring-1 ring-gray-100/80 sm:p-5">
                <div className="flex flex-wrap items-end gap-6">
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Statut</p>
                    <div className="flex gap-1.5 flex-wrap">
                      {STATUT_OPTIONS.map(opt => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => applyStatut(opt.value)}
                          className={cn(
                            'rounded-xl border px-3 py-1.5 text-[12px] font-semibold transition-all',
                            statut === opt.value
                              ? 'border-blue-600 bg-blue-600 text-white shadow-md shadow-blue-500/25'
                              : 'border-gray-200 bg-white text-gray-600 hover:border-blue-200 hover:text-blue-700',
                          )}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="w-px h-10 bg-gray-200 self-center hidden sm:block" />

                  <div className="space-y-2">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Période</p>
                    <div className="flex gap-1 bg-white border border-gray-200 p-1 rounded-xl">
                      {(['single', 'range'] as DateMode[]).map(m => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => applyDateMode(m)}
                        className={cn(
                          'rounded-lg px-3 py-1.5 text-[12px] font-semibold transition-all',
                          dateMode === m
                            ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                            : 'text-gray-500 hover:bg-gray-50',
                        )}
                        >
                          {m === 'single' ? 'Date exacte' : 'Intervalle'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {dateMode === 'single' ? (
                    <div className="space-y-2">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Date</p>
                      <input
                        type="date"
                        value={dateSingle}
                        onChange={e => applyDateSingle(e.target.value)}
                        className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-[13px] text-gray-700 shadow-sm transition-colors focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/15"
                      />
                    </div>
                  ) : (
                    <div className="flex items-end gap-2">
                      <div className="space-y-2">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Du</p>
                        <input type="date" value={dateFrom} onChange={e => applyDateFrom(e.target.value)}
                          className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-[13px] text-gray-700 shadow-sm transition-colors focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/15" />
                      </div>
                      <span className="pb-2.5 text-gray-400 text-sm">→</span>
                      <div className="space-y-2">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Au</p>
                        <input type="date" value={dateTo} onChange={e => applyDateTo(e.target.value)}
                          className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-[13px] text-gray-700 shadow-sm transition-colors focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/15" />
                      </div>
                    </div>
                  )}

                  <div className="ml-auto self-end">
                    <span
                      className={cn(
                        'rounded-xl border px-3 py-2 text-[12px] font-semibold',
                        filtered.length === 0
                          ? 'border-red-100 bg-red-50 text-red-700'
                          : 'border-blue-100 bg-blue-50 text-blue-800',
                      )}
                    >
                      {filtered.length} résultat{filtered.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-left">
              <thead>
                <tr className="border-b border-gray-200 bg-gradient-to-b from-gray-50 to-gray-50/30">
                  {[
                    { key: 'id',      label: 'ID RDV',            right: false },
                    { key: 'patient', label: 'Patient',           right: false },
                    { key: 'service', label: 'Service & Médecin', right: false },
                    { key: 'date',    label: 'Date & Heure',      right: false },
                    { key: 'statut',  label: 'Statut',            right: false },
                    { key: 'actions', label: 'Actions',           right: true  },
                  ].map(h => (
                    <th
                      key={h.key}
                      className={cn(
                        'whitespace-nowrap px-4 py-3.5 text-[10px] font-bold uppercase tracking-widest text-gray-500 sm:px-6',
                        h.right ? 'text-right' : 'text-left',
                      )}
                    >
                      {h.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100/90">
                {pageData.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-20 text-center sm:px-6">
                      <div className="mx-auto flex max-w-sm flex-col items-center gap-3">
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-gray-100 to-gray-50 ring-1 ring-gray-200/80">
                          <Search className="h-6 w-6 text-gray-400" />
                        </div>
                        <p className="text-base font-semibold text-gray-700">Aucun résultat trouvé</p>
                        <p className="text-sm leading-relaxed text-gray-500">
                          Modifiez votre recherche ou vos filtres pour afficher des rendez-vous.
                        </p>
                        <button
                          type="button"
                          onClick={clearFilters}
                          className="mt-1 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-md shadow-blue-500/25 transition-colors hover:bg-blue-700"
                        >
                          Tout réinitialiser
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : pageData.map((rdv, i) => {
                  const cfg   = STATUT_CONFIG[rdv.statut];
                  const color = patientColor(rdv.patientId);
                  return (
                    <tr
                      key={rdv.id + i}
                      className="group border-b border-gray-100/80 bg-white transition-colors hover:bg-gradient-to-r hover:from-blue-50/40 hover:to-transparent"
                    >

                      {/* ID */}
                      <td className="px-4 py-4 sm:px-6 sm:py-[1.125rem]">
                        <span className="inline-block rounded-lg border border-blue-100 bg-blue-50/90 px-2.5 py-1 font-mono text-[11px] font-bold tracking-wide text-blue-700 shadow-sm ring-1 ring-blue-100/60">
                          {rdv.id}
                        </span>
                      </td>

                      {/* Patient */}
                      <td className="px-4 py-4 sm:px-6 sm:py-[1.125rem]">
                        <div className="flex items-center gap-3">
                          <div
                            className={cn(
                              'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[12px] font-bold shadow-sm ring-1 ring-black/5',
                              color.bg,
                              color.text,
                            )}
                          >
                            {rdv.initials}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-[13px] font-semibold leading-tight text-gray-900">
                              {rdvDisplayName(rdv)}
                            </p>
                            <span
                              className={cn(
                                'mt-1 inline-block rounded-md px-1.5 py-0.5 text-[10px] font-semibold ring-1 ring-black/5',
                                color.bg,
                                color.text,
                              )}
                            >
                              {rdv.patientId}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Service */}
                      <td className="px-4 py-4 sm:px-6 sm:py-[1.125rem]">
                        <p className="text-[13px] font-medium text-gray-900">{rdv.service}</p>
                        <p className="mt-0.5 text-[11px] text-gray-500">{rdv.medecin}</p>
                      </td>

                      {/* Date */}
                      <td className="px-4 py-4 sm:px-6 sm:py-[1.125rem]">
                        <p className="text-[13px] font-medium text-gray-900">{dayLabel(rdv.date)}</p>
                        <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-gray-500">
                          <Clock size={12} className="shrink-0 text-gray-400" />
                          {rdv.heure}
                        </p>
                      </td>

                      {/* Statut */}
                      <td className="px-4 py-4 sm:px-6 sm:py-[1.125rem]">
                        <span
                          className={cn(
                            'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold tracking-wide shadow-sm ring-1 ring-black/[0.04]',
                            cfg.cls,
                          )}
                        >
                          <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', cfg.dot)} />
                          {cfg.label}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-4 sm:px-6 sm:py-[1.125rem]">
                        <div className="flex flex-wrap items-center justify-end gap-2">
                          <Link
                            href={`/modules/accueil/rendez-vous/${encodeURIComponent(rdv.id)}`}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-blue-200/90 bg-blue-50 px-3 py-1.5 text-[12px] font-medium text-blue-700 shadow-sm transition-all hover:border-blue-300 hover:bg-blue-100 hover:shadow-md"
                          >
                            <Eye size={13} />
                            Voir détails
                          </Link>
                          {rdv.statut === 'PLANIFIÉ' && (
                            <button
                              type="button"
                              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-b from-emerald-600 to-emerald-700 px-3 py-1.5 text-[12px] font-semibold text-white shadow-md shadow-emerald-600/25 transition-all hover:from-emerald-500 hover:to-emerald-600 active:scale-[0.98]"
                            >
                              <CheckCircle size={13} />
                              Confirmer l&apos;arrivée
                            </button>
                          )}
                          {rdv.statut === 'TERMINÉ' && (
                            <button
                              type="button"
                              className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-[12px] font-medium text-gray-700 shadow-sm transition-all hover:border-gray-300 hover:bg-gray-50"
                            >
                              <FileText size={13} />
                              Compte-rendu
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex flex-col gap-4 border-t border-gray-100 bg-gradient-to-r from-gray-50/90 via-white to-gray-50/50 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-4">
            <p className="text-center text-[12px] text-gray-500 sm:text-left">
              {filtered.length === 0
                ? 'Aucun résultat'
                : `${Math.min((page - 1) * PER_PAGE + 1, filtered.length)}–${Math.min(page * PER_PAGE, filtered.length)} sur ${filtered.length} rendez-vous`}
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
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                <button
                  type="button"
                  key={p}
                  onClick={() => setPage(p)}
                  className={cn(
                    'flex h-9 min-w-[2.25rem] items-center justify-center rounded-xl text-[12px] font-semibold transition-all',
                    page === p
                      ? 'bg-gradient-to-b from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/30 ring-1 ring-blue-500/20'
                      : 'border border-gray-200 bg-white text-gray-600 shadow-sm hover:border-gray-300 hover:bg-gray-50',
                  )}
                >
                  {p}
                </button>
              ))}
              <button
                type="button"
                disabled={page === totalPages}
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