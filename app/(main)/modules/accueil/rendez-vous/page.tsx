'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useMemo } from 'react';
import {
  CheckCircle,
  CheckCircle2,
  Eye,
  FileText,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Clock,
  Activity,
  Stethoscope,
  FlaskConical,
  RefreshCcw,
  RefreshCw,
  X,
  Filter,
  Users,
  Search,
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
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
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

  const hasFilter =
    statut !== 'Tous' ||
    search.trim() !== '' ||
    (dateMode === 'single' && !!dateSingle) ||
    (dateMode === 'range' && (!!dateFrom || !!dateTo));

  const clearFilters = () => {
    setStatut('Tous');
    setDateSingle('');
    setDateFrom('');
    setDateTo('');
    setSearch('');
    setPage(1);
  };

  const handleRefresh = () => {
    setRefreshing(true);
    router.refresh();
    window.setTimeout(() => setRefreshing(false), 600);
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <div className="mx-auto max-w-6xl space-y-6 p-6 lg:p-8">

        {/* ── Header (aligné liste / hospitalisation) ── */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-xl font-medium tracking-tight text-gray-900">
              Liste des rendez-vous
            </h1>
            <p className="mt-1 text-xs text-gray-500">
              Gérez les flux de patients et les plannings cliniques.
            </p>
          </div>
          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            className={cn(
              'inline-flex items-center gap-2 self-start rounded-xl border border-blue-100 bg-blue-50 px-4 py-2.5 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-100',
              refreshing && 'cursor-not-allowed opacity-60',
            )}
          >
            <RefreshCw size={14} className={cn(refreshing && 'animate-spin')} />
            Actualiser
          </button>
        </div>

        {/* Synthèse — total mis en avant (même logique que hospitalisation / liste patients) */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <div className="rounded-xl border-2 border-blue-200 bg-gradient-to-br from-blue-50/90 via-white to-white p-5 shadow-md ring-1 ring-blue-100/80 sm:col-span-2 lg:col-span-2">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-blue-600">
              Total RDV
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
                <Calendar className="h-6 w-6" aria-hidden />
              </div>
              <div>
                <p className="text-4xl font-semibold tabular-nums leading-none tracking-tight text-blue-950">
                  {counts.total}
                </p>
                <p className="mt-1.5 text-xs text-gray-600">Vue filtrée actuelle</p>
              </div>
            </div>
          </div>

          {[
            {
              key: 'planifie',
              label: 'Planifiés',
              hint: 'À venir',
              value: counts.planifie,
              Icon: Activity,
              iconWrap: 'bg-blue-50 text-blue-600',
              card: 'border border-gray-100 bg-white',
            },
            {
              key: 'attente',
              label: 'En attente',
              hint: 'En salle',
              value: counts.attente,
              Icon: Users,
              iconWrap: 'bg-violet-50 text-violet-600',
              card: 'border border-gray-100 bg-white',
            },
            {
              key: 'encours',
              label: 'En cours',
              hint: 'Actifs',
              value: counts.enCours,
              Icon: Clock,
              iconWrap: 'bg-orange-50 text-orange-600',
              card: 'border border-gray-100 bg-white',
            },
            {
              key: 'termine',
              label: 'Terminés',
              hint: 'Complétés',
              value: counts.termine,
              Icon: CheckCircle2,
              iconWrap: 'bg-emerald-50 text-emerald-600',
              card: 'border border-gray-100 bg-white',
            },
          ].map(s => {
            const Icon = s.Icon;
            return (
              <div
                key={s.key}
                className={cn(
                  'flex min-h-[5rem] items-center gap-3 rounded-xl p-4 shadow-sm lg:col-span-1',
                  s.card,
                )}
              >
                <div
                  className={cn(
                    'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
                    s.iconWrap,
                  )}
                >
                  <Icon className="h-[1.125rem] w-[1.125rem]" aria-hidden />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-500">{s.label}</p>
                  <p className="mt-0.5 text-xl font-medium tabular-nums leading-none text-gray-800">
                    {s.value}
                  </p>
                  <p className="mt-1 text-[11px] text-gray-400">{s.hint}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Main card ── */}
        <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">

          {/* Toolbar */}
          <div className="space-y-3 border-b border-gray-100 bg-white px-4 py-4 sm:px-6 sm:py-5">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">

              {/* Tabs */}
              <div className="flex flex-wrap gap-1 rounded-xl border border-gray-200 bg-gray-50 p-1">
                {TABS.map(tab => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      type="button"
                      key={tab.id}
                      onClick={() => switchTab(tab.id)}
                      className={cn(
                        'flex items-center gap-2 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors sm:px-4',
                        isActive
                          ? 'bg-blue-600 font-semibold text-white shadow-sm'
                          : 'text-gray-600 hover:bg-white hover:text-gray-900',
                      )}
                    >
                      <Icon size={13} className={isActive ? 'text-white' : 'text-gray-400'} />
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
                    className="w-full rounded-xl border border-gray-100 bg-gray-50 py-2.5 pl-10 pr-9 text-sm text-gray-800 placeholder:text-gray-400 transition-colors focus:border-blue-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/15"
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
                      'inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-[13px] font-medium transition-colors',
                      showFilters || hasFilter
                        ? 'border-blue-600 bg-blue-600 text-white shadow-sm shadow-blue-500/20'
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
              <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 sm:p-5">
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
                              ? 'border-blue-600 bg-blue-600 text-white shadow-sm'
                              : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:text-gray-900',
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
                    <div className="flex gap-1 rounded-xl border border-gray-200 bg-white p-1">
                      {(['single', 'range'] as DateMode[]).map(m => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => applyDateMode(m)}
                        className={cn(
                          'rounded-lg px-3 py-1.5 text-[12px] font-semibold transition-colors',
                          dateMode === m
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800',
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
                        className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-2 text-sm text-gray-700 transition-colors focus:border-blue-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/15"
                      />
                    </div>
                  ) : (
                    <div className="flex items-end gap-2">
                      <div className="space-y-2">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Du</p>
                        <input type="date" value={dateFrom} onChange={e => applyDateFrom(e.target.value)}
                          className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-2 text-sm text-gray-700 transition-colors focus:border-blue-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/15" />
                      </div>
                      <span className="pb-2.5 text-gray-400 text-sm">→</span>
                      <div className="space-y-2">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Au</p>
                        <input type="date" value={dateTo} onChange={e => applyDateTo(e.target.value)}
                          className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-2 text-sm text-gray-700 transition-colors focus:border-blue-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/15" />
                      </div>
                    </div>
                  )}

                  <div className="ml-auto self-end">
                    <span
                      className={cn(
                        'rounded-xl border px-3 py-2 text-[12px] font-semibold',
                        filtered.length === 0
                          ? 'border-red-100 bg-red-50 text-red-700'
                          : 'border-gray-200 bg-gray-50 text-gray-700',
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
                <tr className="border-b border-gray-200 bg-gray-100/95">
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
                        'whitespace-nowrap px-4 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-700 sm:px-6',
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
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100">
                          <Search className="h-6 w-6 text-gray-400" />
                        </div>
                        <p className="text-base font-semibold text-gray-700">Aucun résultat trouvé</p>
                        <p className="text-sm leading-relaxed text-gray-500">
                          Modifiez votre recherche ou vos filtres pour afficher des rendez-vous.
                        </p>
                        <button
                          type="button"
                          onClick={clearFilters}
                          className="mt-1 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700"
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
                      className="group border-b border-gray-50 bg-white transition-colors hover:bg-gray-50"
                    >

                      {/* ID */}
                      <td className="px-4 py-4 sm:px-6 sm:py-5">
                        <span className="inline-block rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1 font-mono text-xs font-semibold text-gray-700">
                          {rdv.id}
                        </span>
                      </td>

                      {/* Patient */}
                      <td className="px-4 py-4 sm:px-6 sm:py-5">
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
                      <td className="px-4 py-4 sm:px-6 sm:py-5">
                        <p className="text-[13px] font-medium text-gray-900">{rdv.service}</p>
                        <p className="mt-0.5 text-[11px] text-gray-500">{rdv.medecin}</p>
                      </td>

                      {/* Date */}
                      <td className="px-4 py-4 sm:px-6 sm:py-5">
                        <p className="text-[13px] font-medium text-gray-900">{dayLabel(rdv.date)}</p>
                        <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-gray-500">
                          <Clock size={12} className="shrink-0 text-gray-400" />
                          {rdv.heure}
                        </p>
                      </td>

                      {/* Statut */}
                      <td className="px-4 py-4 sm:px-6 sm:py-5">
                        <span
                          className={cn(
                            'inline-flex max-w-full items-center rounded-lg px-2.5 py-1 text-xs font-semibold leading-snug',
                            cfg.cls,
                          )}
                        >
                          {cfg.label}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-4 sm:px-6 sm:py-5">
                        <div className="flex flex-wrap items-center justify-end gap-2">
                          <Link
                            href={`/modules/accueil/rendez-vous/${encodeURIComponent(rdv.id)}`}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3 py-1.5 text-[12px] font-medium text-blue-800 shadow-sm transition-colors hover:border-blue-300 hover:bg-blue-100"
                          >
                            <Eye size={13} />
                            Voir détails
                          </Link>
                          {rdv.statut === 'PLANIFIÉ' && (
                            <button
                              type="button"
                              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-1.5 text-[12px] font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700"
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
          <div className="flex flex-col gap-3 border-t border-gray-100 bg-gray-50 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
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
                      ? 'bg-blue-600 text-white shadow-sm'
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