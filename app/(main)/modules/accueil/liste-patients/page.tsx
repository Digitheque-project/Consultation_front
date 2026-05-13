'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Search,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  BarChart2,
  Calendar,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  X,
  SlidersHorizontal,
  Users,
  Activity,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { fetchPatients, Patient } from '@/lib/api/services/patients';
import { PatientDetailsModal } from '@/components/patient-details-modal';
import { cn } from '@/lib/utils';

// ─── Helpers ────────────────────────────────────────────────────────────────

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

// ─── Types ───────────────────────────────────────────────────────────────────

type GenderFilter = 'Tous' | 'Masculin' | 'Féminin';
type SortKey = 'id' | 'nom' | 'dateNaissance' | 'sexe' | 'createdAt';
type SortDir = 'asc' | 'desc';
type DateCol = 'dateNaissance' | 'createdAt';

interface DateRange {
  from: string;
  to: string;
  col: DateCol;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const GENDER_FILTERS: GenderFilter[] = ['Tous', 'Masculin', 'Féminin'];

const STATS = [
  { label: "Total aujourd'hui", value: '85' },
  { label: 'Service clinique', value: '15' },
  { label: 'Paraclinique', value: '20' },
  { label: 'Consultation ext.', value: '18' },
  { label: 'Pharmacie', value: '32' },
];

const PER_PAGE = 10;

// ─── Sub-components ──────────────────────────────────────────────────────────

function SortIcon({ col, sortKey, sortDir }: { col: SortKey; sortKey: SortKey; sortDir: SortDir }) {
  if (col !== sortKey) return <ArrowUpDown size={12} className="text-gray-300 ml-1 inline" />;
  return sortDir === 'asc'
    ? <ArrowUp size={12} className="text-blue-500 ml-1 inline" />
    : <ArrowDown size={12} className="text-blue-500 ml-1 inline" />;
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function ListePatients() {
  // Filter states
  const [genderFilter, setGenderFilter] = useState<GenderFilter>('Tous');
  const [search, setSearch] = useState('');
  const [dateRange, setDateRange] = useState<DateRange>({ from: '', to: '', col: 'createdAt' });
  const [dateOpen, setDateOpen] = useState(false);

  // Sort states
  const [sortKey, setSortKey] = useState<SortKey>('createdAt');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  // Pagination
  const [page, setPage] = useState(1);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

  // Data
  const { data, isLoading, isError, error } = useQuery<Patient[], Error>({
    queryKey: ['patients'],
    queryFn: fetchPatients,
    staleTime: 30_000,
    retry: false,
  });

  const patients = data ?? [];

  // ── Derived: filtered + sorted ──────────────────────────────────────────

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return patients
      .filter(p => {
        // Gender
        if (genderFilter !== 'Tous' && formatSexe(p.sexe) !== genderFilter) return false;
        // Search
        if (q && ![p.nom, p.prenom, p.id].some(v => (v ?? '').toLowerCase().includes(q))) return false;
        // Date range
        if (dateRange.from || dateRange.to) {
          const raw = p[dateRange.col as keyof Patient] as string | undefined;
          if (!raw) return false;
          const d = new Date(raw).getTime();
          if (dateRange.from && d < new Date(dateRange.from).getTime()) return false;
          if (dateRange.to && d > new Date(dateRange.to).getTime()) return false;
        }
        return true;
      })
      .sort((a, b) => {
        const av = (a[sortKey as keyof Patient] as string) ?? '';
        const bv = (b[sortKey as keyof Patient] as string) ?? '';
        const cmp = av < bv ? -1 : av > bv ? 1 : 0;
        return sortDir === 'asc' ? cmp : -cmp;
      });
  }, [patients, genderFilter, search, dateRange, sortKey, sortDir]);

  // ── Pagination ──────────────────────────────────────────────────────────

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const slice = filtered.slice((safePage - 1) * PER_PAGE, safePage * PER_PAGE);

  // ── Handlers ────────────────────────────────────────────────────────────

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('asc'); }
    setPage(1);
  };

  const handleGender = (f: GenderFilter) => { setGenderFilter(f); setPage(1); };
  const handleSearch = (v: string) => { setSearch(v); setPage(1); };

  const applyDate = (next: Partial<DateRange>) => {
    setDateRange(prev => ({ ...prev, ...next }));
    setPage(1);
  };

  const resetDate = () => {
    setDateRange({ from: '', to: '', col: 'createdAt' });
    setPage(1);
  };

  const dateActive = !!(dateRange.from || dateRange.to);

  // ── Pagination helpers ───────────────────────────────────────────────────

  const pageNumbers = (() => {
    if (totalPages <= 5) return Array.from({ length: totalPages }, (_, i) => i + 1);
    if (safePage <= 3) return [1, 2, 3, 4, '…', totalPages];
    if (safePage >= totalPages - 2) return [1, '…', totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    return [1, '…', safePage - 1, safePage, safePage + 1, '…', totalPages];
  })();

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-full bg-gradient-to-b from-slate-50 via-gray-50 to-slate-100/80">
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:space-y-8 sm:px-6 sm:py-8 lg:px-8">

        {/* En-tête */}
      
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-[22px] font-semibold text-gray-900 tracking-tight">
              Liste des patients
            </h1>
            <p className="text-[13px] text-gray-400 mt-1">
              Consultez les dossiers, recherchez et ouvrez le détail d&apos;un patient en un clic.
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

        {/* Carte principale */}
        <div className="overflow-hidden rounded-2xl border border-gray-100/90 bg-white shadow-md shadow-gray-200/50 ring-1 ring-gray-100/80">

          {/* Toolbar */}
          <div className="border-b border-gray-100 bg-gradient-to-b from-white to-gray-50/40 px-4 py-4 sm:px-6 sm:py-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Sexe</span>
                <div className="flex flex-wrap gap-2">
                  {GENDER_FILTERS.map(f => (
                    <button
                      type="button"
                      key={f}
                      onClick={() => handleGender(f)}
                      className={cn(
                        'rounded-full px-4 py-2 text-[13px] font-medium transition-all',
                        genderFilter === f
                          ? 'bg-gradient-to-b from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/25 ring-1 ring-blue-500/20'
                          : 'border border-gray-200 bg-white text-gray-600 shadow-sm hover:border-gray-300 hover:bg-gray-50',
                      )}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                <div className="relative min-w-0 flex-1 sm:max-w-xs">
                  <Search size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={search}
                    onChange={e => handleSearch(e.target.value)}
                    placeholder="Nom, prénom, ID…"
                    className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-9 text-[13px] text-gray-800 shadow-inner shadow-gray-100/50 placeholder:text-gray-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                  {search && (
                    <button
                      type="button"
                      onClick={() => handleSearch('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-lg p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                      aria-label="Effacer la recherche"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setDateOpen(o => !o)}
                  className={cn(
                    'inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-[13px] font-medium transition-all',
                    dateActive
                      ? 'border-blue-200 bg-blue-50 text-blue-800 shadow-sm shadow-blue-100/50 ring-1 ring-blue-100/60'
                      : 'border-gray-200 bg-white text-gray-600 shadow-sm hover:border-gray-300 hover:bg-gray-50',
                  )}
                >
                  <Calendar size={15} />
                  Filtrer par date
                  {dateActive && (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white">
                      1
                    </span>
                  )}
                  <ChevronDown size={14} className={cn('transition-transform', dateOpen && 'rotate-180')} />
                </button>
              </div>
            </div>
          </div>

          {/* Panneau dates */}
          {dateOpen && (
            <div className="flex flex-wrap items-end gap-4 border-b border-gray-100 bg-gradient-to-r from-blue-50/80 via-indigo-50/40 to-transparent px-4 py-4 sm:px-6">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Colonne</label>
                <select
                  value={dateRange.col}
                  onChange={e => applyDate({ col: e.target.value as DateCol })}
                  className="cursor-pointer rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-[13px] text-gray-700 shadow-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/15"
                >
                  <option value="createdAt">Date d&apos;ajout</option>
                  <option value="dateNaissance">Date de naissance</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Du</label>
                <input
                  type="date"
                  value={dateRange.from}
                  onChange={e => applyDate({ from: e.target.value })}
                  className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-[13px] text-gray-700 shadow-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/15"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Au</label>
                <input
                  type="date"
                  value={dateRange.to}
                  onChange={e => applyDate({ to: e.target.value })}
                  min={dateRange.from || undefined}
                  className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-[13px] text-gray-700 shadow-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/15"
                />
              </div>

              {dateActive && (
                <button
                  type="button"
                  onClick={resetDate}
                  className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-[13px] font-medium text-gray-600 shadow-sm transition-colors hover:bg-gray-50"
                >
                  <X size={14} />
                  Réinitialiser
                </button>
              )}
            </div>
          )}

          {/* Chips filtres actifs */}
          {(dateActive || genderFilter !== 'Tous' || search) && (
            <div className="flex flex-wrap items-center gap-2 border-b border-gray-100 bg-gray-50/70 px-4 py-2.5 sm:px-6">
              <SlidersHorizontal size={14} className="shrink-0 text-gray-400" />
              <span className="text-[11px] font-medium text-gray-500">Filtres actifs</span>

              {genderFilter !== 'Tous' && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700">
                  {genderFilter}
                  <button type="button" className="rounded p-0.5 hover:bg-blue-100" onClick={() => handleGender('Tous')} aria-label="Retirer le filtre sexe">
                    <X size={10} />
                  </button>
                </span>
              )}

              {search && (
                <span className="inline-flex max-w-[200px] items-center gap-1.5 truncate rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700 sm:max-w-xs">
                  <span className="truncate">« {search} »</span>
                  <button type="button" className="shrink-0 rounded p-0.5 hover:bg-blue-100" onClick={() => handleSearch('')} aria-label="Retirer la recherche">
                    <X size={10} />
                  </button>
                </span>
              )}

              {dateActive && (
                <span className="inline-flex max-w-full flex-wrap items-center gap-1.5 rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700">
                  {dateRange.col === 'createdAt' ? "Date d'ajout" : 'Date naissance'}
                  {dateRange.from && ` ≥ ${formatDate(dateRange.from)}`}
                  {dateRange.to && ` ≤ ${formatDate(dateRange.to)}`}
                  <button type="button" className="rounded p-0.5 hover:bg-blue-100" onClick={resetDate} aria-label="Retirer le filtre date">
                    <X size={10} />
                  </button>
                </span>
              )}

              <button
                type="button"
                onClick={() => { handleGender('Tous'); handleSearch(''); resetDate(); }}
                className="ml-auto text-[11px] font-semibold text-gray-500 underline-offset-2 hover:text-gray-800 hover:underline"
              >
                Tout effacer
              </button>
            </div>
          )}

          {/* Tableau */}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-left">
              <thead>
                <tr className="border-b border-gray-200 bg-gradient-to-b from-gray-50 to-gray-50/30">
                  {(
                    [
                      { key: 'id', label: 'ID' },
                      { key: 'nom', label: 'Nom complet' },
                      { key: 'dateNaissance', label: 'Date de naissance' },
                      { key: 'sexe', label: 'Sexe' },
                      { key: null, label: 'Téléphone' },
                      { key: 'createdAt', label: "Date d'ajout" },
                    ] as { key: SortKey | null; label: string }[]
                  ).map(col => (
                    <th
                      key={col.label}
                      onClick={() => col.key && handleSort(col.key)}
                      className={cn(
                        'whitespace-nowrap px-4 py-3.5 text-left text-[10px] font-bold uppercase tracking-widest sm:px-6',
                        col.key ? 'cursor-pointer text-gray-500 transition-colors hover:text-gray-800' : 'text-gray-500',
                        col.key === sortKey && 'text-blue-600',
                      )}
                    >
                      {col.label}
                      {col.key && <SortIcon col={col.key} sortKey={sortKey} sortDir={sortDir} />}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100/90">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-16 text-center sm:px-6">
                      <div className="flex flex-col items-center justify-center gap-3 text-gray-500">
                        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                        <p className="text-sm font-medium">Chargement des patients…</p>
                      </div>
                    </td>
                  </tr>
                ) : isError ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-14 text-center sm:px-6">
                      <div className="mx-auto flex max-w-md flex-col items-center gap-2 rounded-2xl border border-red-100 bg-red-50/80 px-6 py-5 text-red-800 ring-1 ring-red-100/60">
                        <AlertCircle className="h-8 w-8 text-red-500" />
                        <p className="text-sm font-semibold">Erreur de chargement</p>
                        <p className="text-xs text-red-700/90">{error?.message}</p>
                      </div>
                    </td>
                  </tr>
                ) : slice.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-16 text-center sm:px-6">
                      <div className="mx-auto flex max-w-sm flex-col items-center gap-2">
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-gray-100 to-gray-50 ring-1 ring-gray-200/80">
                          <Search className="h-6 w-6 text-gray-400" />
                        </div>
                        <p className="text-base font-semibold text-gray-700">Aucun patient ne correspond aux critères.</p>
                        <p className="text-sm text-gray-500">Modifiez les filtres ou la recherche.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  slice.map((patient, i) => {
                    const sexeLabel = formatSexe(patient.sexe);
                    const sexeCls =
                      sexeLabel === 'Masculin'
                        ? 'border-sky-100 bg-sky-50 text-sky-700 ring-sky-100/50'
                        : sexeLabel === 'Féminin'
                          ? 'border-pink-100 bg-pink-50 text-pink-700 ring-pink-100/50'
                          : 'border-gray-200 bg-gray-50 text-gray-600 ring-gray-100';
                    return (
                      <tr
                        key={`${patient.id}-${i}`}
                        onClick={() => setSelectedPatient(patient)}
                        className="group cursor-pointer border-b border-gray-100/80 bg-white transition-colors hover:bg-gradient-to-r hover:from-blue-50/40 hover:to-transparent"
                      >
                        <td className="px-4 py-4 sm:px-6 sm:py-[1.125rem]">
                          <span className="inline-block rounded-lg border border-blue-100 bg-blue-50/90 px-2.5 py-1 font-mono text-[11px] font-bold tracking-wide text-blue-700 shadow-sm ring-1 ring-blue-100/60">
                            {patient.id}
                          </span>
                        </td>
                        <td className="px-4 py-4 sm:px-6 sm:py-[1.125rem]">
                          <p className="text-[13px] font-semibold text-gray-900 transition-colors group-hover:text-blue-700">
                            {patient.nom} {patient.prenom ?? ''}
                          </p>
                        </td>
                        <td className="px-4 py-4 text-[13px] text-gray-600 sm:px-6 sm:py-[1.125rem]">{formatDate(patient.dateNaissance)}</td>
                        <td className="px-4 py-4 sm:px-6 sm:py-[1.125rem]">
                          <span className={cn('inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold shadow-sm ring-1 ring-black/[0.03]', sexeCls)}>
                            {sexeLabel}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-[13px] text-gray-600 sm:px-6 sm:py-[1.125rem]">{patient.telephone ?? '—'}</td>
                        <td className="px-4 py-4 text-[13px] text-gray-600 sm:px-6 sm:py-[1.125rem]">{formatDate(patient.createdAt)}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex flex-col gap-4 border-t border-gray-100 bg-gradient-to-r from-gray-50/90 via-white to-gray-50/50 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <p className="text-center text-[12px] text-gray-500 sm:text-left">
              {filtered.length === 0
                ? 'Aucun résultat'
                : `${(safePage - 1) * PER_PAGE + 1}–${Math.min(safePage * PER_PAGE, filtered.length)} sur ${filtered.length} patient(s)`}
            </p>

            <div className="flex items-center justify-center gap-1 sm:justify-end">
              <button
                type="button"
                disabled={safePage <= 1}
                onClick={() => setPage(p => p - 1)}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500 shadow-sm transition-all hover:border-gray-300 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft size={16} />
              </button>

              {pageNumbers.map((p, idx) =>
                p === '…' ? (
                  <span key={`ellipsis-${idx}`} className="flex h-9 w-9 items-center justify-center text-sm text-gray-400">
                    …
                  </span>
                ) : (
                  <button
                    type="button"
                    key={p}
                    onClick={() => setPage(p as number)}
                    className={cn(
                      'flex h-9 min-w-[2.25rem] items-center justify-center rounded-xl text-xs font-semibold transition-all',
                      safePage === p
                        ? 'bg-gradient-to-b from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/30 ring-1 ring-blue-500/20'
                        : 'border border-gray-200 bg-white text-gray-600 shadow-sm hover:border-gray-300 hover:bg-gray-50',
                    )}
                  >
                    {p}
                  </button>
                ),
              )}

              <button
                type="button"
                disabled={safePage >= totalPages}
                onClick={() => setPage(p => p + 1)}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500 shadow-sm transition-all hover:border-gray-300 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Résumé admissions (démo) */}
        <div className="rounded-2xl border border-gray-100/90 bg-white p-5 shadow-md shadow-gray-200/50 ring-1 ring-gray-100/80 sm:p-6">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-gray-900 sm:text-base">Résumé des admissions quotidiennes</h3>
              <p className="mt-0.5 text-xs text-gray-500">Indicateurs démo — à relier au SI lorsque disponible.</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 text-gray-500 ring-1 ring-gray-200/80">
              <BarChart2 size={18} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 sm:gap-4">
            {STATS.map(item => (
              <div
                key={item.label}
                className="rounded-2xl border border-gray-100 bg-gradient-to-b from-gray-50/90 to-white p-4 shadow-sm ring-1 ring-gray-100/60 transition-shadow hover:shadow-md"
              >
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{item.label}</p>
                <p className="mt-2 text-2xl font-bold tabular-nums text-blue-600">{item.value}</p>
              </div>
            ))}
          </div>
        </div>

      </div>
      <PatientDetailsModal
        open={Boolean(selectedPatient)}
        patient={selectedPatient}
        onClose={() => setSelectedPatient(null)}
      />
    </div>
  );
}