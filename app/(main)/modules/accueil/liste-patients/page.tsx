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
} from 'lucide-react';
import { fetchPatients, Patient } from '@/lib/api/services/patients';

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
  { label: 'Service clinique',  value: '15' },
  { label: 'Paraclinique',      value: '20' },
  { label: 'Consultation ext.', value: '18' },
  { label: 'Pharmacie',         value: '32' },
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
  const [search, setSearch]             = useState('');
  const [dateRange, setDateRange]       = useState<DateRange>({ from: '', to: '', col: 'createdAt' });
  const [dateOpen, setDateOpen]         = useState(false);

  // Sort states
  const [sortKey, setSortKey] = useState<SortKey>('createdAt');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  // Pagination
  const [page, setPage] = useState(1);

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
          if (dateRange.to   && d > new Date(dateRange.to).getTime())   return false;
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
  const safePage   = Math.min(page, totalPages);
  const slice      = filtered.slice((safePage - 1) * PER_PAGE, safePage * PER_PAGE);

  // ── Handlers ────────────────────────────────────────────────────────────

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('asc'); }
    setPage(1);
  };

  const handleGender = (f: GenderFilter) => { setGenderFilter(f); setPage(1); };
  const handleSearch = (v: string)        => { setSearch(v);       setPage(1); };

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
    <div className="min-h-screen bg-gray-50">
      <div className="p-6 max-w-7xl mx-auto space-y-4">

        {/* Title */}
        <h1 className="text-xl font-semibold text-gray-900">Liste des patients</h1>

        {/* ── Main card ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

          {/* ── Toolbar ── */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 gap-3 flex-wrap">

            {/* Gender pills */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                Filtrer :
              </span>
              <div className="flex gap-1">
                {GENDER_FILTERS.map(f => (
                  <button
                    type="button"
                    key={f}
                    onClick={() => handleGender(f)}
                    className={`px-3 py-1.5 rounded-lg text-[13px] font-medium transition-all ${
                      genderFilter === f
                        ? 'text-blue-600 font-semibold border-b-2 border-blue-600 rounded-b-none'
                        : 'text-gray-500 hover:text-gray-800'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            {/* Right controls */}
            <div className="flex items-center gap-2 flex-wrap">

              {/* Search */}
              <div className="relative">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input
                  type="text"
                  value={search}
                  onChange={e => handleSearch(e.target.value)}
                  placeholder="Rechercher…"
                  className="w-52 pl-8 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-[13px] focus:outline-none focus:border-blue-400 focus:bg-white transition-colors placeholder:text-gray-400"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => handleSearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>

              {/* Date filter toggle */}
              <button
                type="button"
                onClick={() => setDateOpen(o => !o)}
                className={`flex items-center gap-1.5 px-3 py-2 border rounded-xl text-[13px] transition-colors ${
                  dateActive
                    ? 'bg-blue-50 border-blue-200 text-blue-600'
                    : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Calendar size={13} />
                Filtrer par date
                {dateActive && (
                  <span className="ml-0.5 bg-blue-600 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                    1
                  </span>
                )}
                <ChevronDown size={12} className={`transition-transform ${dateOpen ? 'rotate-180' : ''}`} />
              </button>
            </div>
          </div>

          {/* ── Date filter panel ── */}
          {dateOpen && (
            <div className="flex items-end gap-3 px-5 py-3 border-b border-gray-100 bg-blue-50/40 flex-wrap">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                  Colonne
                </label>
                <select
                  value={dateRange.col}
                  onChange={e => applyDate({ col: e.target.value as DateCol })}
                  className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-[13px] text-gray-700 focus:outline-none focus:border-blue-400 cursor-pointer"
                >
                  <option value="createdAt">Date d'ajout</option>
                  <option value="dateNaissance">Date de naissance</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                  Du
                </label>
                <input
                  type="date"
                  value={dateRange.from}
                  onChange={e => applyDate({ from: e.target.value })}
                  className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-[13px] text-gray-700 focus:outline-none focus:border-blue-400"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                  Au
                </label>
                <input
                  type="date"
                  value={dateRange.to}
                  onChange={e => applyDate({ to: e.target.value })}
                  min={dateRange.from || undefined}
                  className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-[13px] text-gray-700 focus:outline-none focus:border-blue-400"
                />
              </div>

              {dateActive && (
                <button
                  type="button"
                  onClick={resetDate}
                  className="flex items-center gap-1.5 px-3 py-2 text-[13px] text-gray-500 hover:text-gray-700 border border-gray-200 bg-white rounded-xl transition-colors"
                >
                  <X size={12} />
                  Réinitialiser
                </button>
              )}
            </div>
          )}

          {/* ── Active filter chips ── */}
          {(dateActive || genderFilter !== 'Tous' || search) && (
            <div className="flex items-center gap-2 px-5 py-2 border-b border-gray-100 bg-gray-50/60 flex-wrap">
              <SlidersHorizontal size={12} className="text-gray-400" />
              <span className="text-[11px] text-gray-400 font-medium">Filtres actifs :</span>

              {genderFilter !== 'Tous' && (
                <span className="flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100">
                  {genderFilter}
                  <button type="button" onClick={() => handleGender('Tous')}><X size={10} /></button>
                </span>
              )}

              {search && (
                <span className="flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100">
                  "{search}"
                  <button type="button" onClick={() => handleSearch('')}><X size={10} /></button>
                </span>
              )}

              {dateActive && (
                <span className="flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100">
                  {dateRange.col === 'createdAt' ? "Date d'ajout" : 'Date naissance'}
                  {dateRange.from && ` ≥ ${formatDate(dateRange.from)}`}
                  {dateRange.to   && ` ≤ ${formatDate(dateRange.to)}`}
                  <button type="button" onClick={resetDate}><X size={10} /></button>
                </span>
              )}

              <button
                type="button"
                onClick={() => { handleGender('Tous'); handleSearch(''); resetDate(); }}
                className="ml-auto text-[11px] text-gray-400 hover:text-gray-600 underline"
              >
                Tout effacer
              </button>
            </div>
          )}

          {/* ── Table ── */}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead>
                <tr className="border-b border-gray-100">
                  {(
                    [
                      { key: 'id',            label: 'ID' },
                      { key: 'nom',           label: 'Nom complet' },
                      { key: 'dateNaissance', label: 'Date de naissance' },
                      { key: 'sexe',          label: 'Sexe' },
                      { key: null,            label: 'Téléphone' },
                      { key: 'createdAt',     label: "Date d'ajout" },
                    ] as { key: SortKey | null; label: string }[]
                  ).map(col => (
                    <th
                      key={col.label}
                      onClick={() => col.key && handleSort(col.key)}
                      className={`px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400 select-none whitespace-nowrap ${
                        col.key ? 'cursor-pointer hover:text-gray-600 transition-colors' : ''
                      } ${col.key === sortKey ? 'text-blue-500' : ''}`}
                    >
                      {col.label}
                      {col.key && <SortIcon col={col.key} sortKey={sortKey} sortDir={sortDir} />}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center text-sm text-gray-400">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                        Chargement des patients…
                      </div>
                    </td>
                  </tr>
                ) : isError ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center text-sm text-red-500">
                      Erreur de chargement : {error?.message}
                    </td>
                  </tr>
                ) : slice.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center text-sm text-gray-400">
                      Aucun patient ne correspond aux critères.
                    </td>
                  </tr>
                ) : (
                  slice.map((patient, i) => (
                    <tr
                      key={`${patient.id}-${i}`}
                      className="border-b border-gray-50 hover:bg-blue-50/30 transition-colors cursor-pointer group"
                    >
                      <td className="px-5 py-3.5">
                        <span className="text-[11px] font-semibold text-blue-600 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-md">
                          {patient.id}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <p className="text-[13px] font-semibold text-gray-800 group-hover:text-blue-700 transition-colors">
                          {patient.nom} {patient.prenom ?? ''}
                        </p>
                      </td>
                      <td className="px-5 py-3.5 text-[13px] text-gray-500">
                        {formatDate(patient.dateNaissance)}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${
                          formatSexe(patient.sexe) === 'Masculin'
                            ? 'bg-sky-50 text-sky-600 border-sky-100'
                            : 'bg-pink-50 text-pink-600 border-pink-100'
                        }`}>
                          {formatSexe(patient.sexe)}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-[13px] text-gray-500">
                        {patient.telephone ?? '-'}
                      </td>
                      <td className="px-5 py-3.5 text-[13px] text-gray-500">
                        {formatDate(patient.createdAt)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* ── Pagination ── */}
          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100">
            <p className="text-[12px] text-gray-400">
              {filtered.length === 0
                ? 'Aucun résultat'
                : `${(safePage - 1) * PER_PAGE + 1}–${Math.min(safePage * PER_PAGE, filtered.length)} sur ${filtered.length} patient(s)`}
            </p>

            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={safePage <= 1}
                onClick={() => setPage(p => p - 1)}
                className="w-7 h-7 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-100 text-gray-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={13} />
              </button>

              {pageNumbers.map((p, idx) =>
                p === '…' ? (
                  <span key={`ellipsis-${idx}`} className="w-7 h-7 flex items-center justify-center text-[12px] text-gray-400">
                    …
                  </span>
                ) : (
                  <button
                    type="button"
                    key={p}
                    onClick={() => setPage(p as number)}
                    className={`w-7 h-7 flex items-center justify-center rounded-lg text-[12px] font-semibold transition-colors ${
                      safePage === p
                        ? 'bg-blue-600 text-white'
                        : 'border border-gray-200 text-gray-500 hover:bg-gray-100'
                    }`}
                  >
                    {p}
                  </button>
                )
              )}

              <button
                type="button"
                disabled={safePage >= totalPages}
                onClick={() => setPage(p => p + 1)}
                className="w-7 h-7 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-100 text-gray-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight size={13} />
              </button>
            </div>
          </div>
        </div>

        {/* ── Stats ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[13px] font-semibold text-gray-800">
              Résumé des admissions quotidiennes
            </h3>
            <BarChart2 size={16} className="text-gray-300" />
          </div>
          <div className="grid grid-cols-5 gap-4">
            {STATS.map((item) => (
              <div key={item.label} className="bg-gray-50 rounded-xl p-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1.5 leading-tight">
                  {item.label}
                </p>
                <p className="text-2xl font-bold text-blue-600">{item.value}</p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}