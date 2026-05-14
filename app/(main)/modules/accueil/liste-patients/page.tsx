'use client';

import { useState, useMemo, type ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Search,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Calendar,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  X,
  SlidersHorizontal,
  RefreshCw,
  AlertCircle,
  ClipboardList,
  Filter,
  User,
  Users,
} from 'lucide-react';
import { fetchPatients, Patient } from '@/lib/api/services/patients';
import { fetchPriseEnCharge, type PriseEnCharge } from '@/lib/api/services/prise-en-charge';
import {
  buildRegisterPayloadFromPatient,
  updateRegisteredPatient,
} from '@/lib/api/services/patient-registration';
import { readMockSessionFromBrowser } from '@/lib/auth/mock-auth-browser';
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

/** Jour calendaire local (YYYY-MM-DD) pour comparaison avec un champ date ISO du patient. */
function toLocalYmd(isoOrDate: string | undefined): string | null {
  if (!isoOrDate) return null;
  const d = new Date(isoOrDate);
  if (Number.isNaN(d.getTime())) return null;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function resolvePatientPecCode(p: Patient, opts: PriseEnCharge[]): string | null {
  const fromApi = p.priseEnChargeCode?.trim();
  if (fromApi) return fromApi;
  return opts.find((o) => o.id === p.priseEnChargeId)?.code ?? null;
}

function sortPecForSelect(opts: PriseEnCharge[]): PriseEnCharge[] {
  return [...opts].filter((o) => o.actif).sort((a, b) => {
    if (a.code === 'NORMAL') return -1;
    if (b.code === 'NORMAL') return 1;
    return a.libelle.localeCompare(b.libelle, 'fr');
  });
}

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

const PER_PAGE = 10;

const filterFieldClass =
  'h-10 w-full rounded-xl border border-gray-100 bg-gray-50 text-sm text-gray-800 transition-colors placeholder:text-gray-400 focus:border-blue-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/15';

/** Libellés du panneau dates : même hauteur pour aligner les inputs sur une ligne (desktop). */
const dateFilterPanelLabelClass =
  'flex min-h-[2.125rem] items-end text-[10px] font-bold uppercase tracking-widest text-gray-500 leading-tight';

function ActiveFilterChip({
  icon,
  label,
  children,
  onRemove,
  removeLabel,
}: {
  icon: ReactNode;
  label: string;
  children: ReactNode;
  onRemove: () => void;
  removeLabel: string;
}) {
  return (
    <span className="inline-flex max-w-[min(100%,22rem)] items-stretch overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-sm ring-1 ring-slate-900/[0.04]">
      <span
        className="flex shrink-0 items-center justify-center bg-gradient-to-b from-slate-50 to-slate-100/90 px-2.5 text-blue-600 sm:px-3"
        aria-hidden
      >
        {icon}
      </span>
      <span className="flex min-w-0 flex-1 flex-col justify-center gap-0.5 px-2.5 py-1.5 sm:py-2">
        <span className="text-[9px] font-bold uppercase tracking-wider text-gray-400">{label}</span>
        <span className="truncate text-[11px] font-semibold leading-snug text-gray-900 sm:text-xs">{children}</span>
      </span>
      <button
        type="button"
        onClick={onRemove}
        className="flex shrink-0 items-center border-l border-slate-100 bg-white px-2 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
        aria-label={removeLabel}
      >
        <X size={14} strokeWidth={2.25} />
      </button>
    </span>
  );
}

function SortIcon({ col, sortKey, sortDir }: { col: SortKey; sortKey: SortKey; sortDir: SortDir }) {
  if (col !== sortKey) return <ArrowUpDown size={12} className="text-gray-300 ml-1 inline" />;
  return sortDir === 'asc'
    ? <ArrowUp size={12} className="text-blue-500 ml-1 inline" />
    : <ArrowDown size={12} className="text-blue-500 ml-1 inline" />;
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function ListePatients() {
  const queryClient = useQueryClient();
  // Filter states
  const [genderFilter, setGenderFilter] = useState<GenderFilter>('Tous');
  const [search, setSearch] = useState('');
  const [dateRange, setDateRange] = useState<DateRange>({ from: '', to: '', col: 'createdAt' });
  const [exactDay, setExactDay] = useState('');
  const [pecCodeFilter, setPecCodeFilter] = useState('');
  const [dateOpen, setDateOpen] = useState(false);

  // Sort states
  const [sortKey, setSortKey] = useState<SortKey>('createdAt');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  // Pagination
  const [page, setPage] = useState(1);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

  // Data
  const { data, isLoading, isFetching, isError, error, refetch } = useQuery<Patient[], Error>({
    queryKey: ['patients'],
    queryFn: fetchPatients,
    staleTime: 30_000,
    retry: false,
  });

  const { data: pecRaw = [] } = useQuery({
    queryKey: ['prise-en-charge'],
    queryFn: fetchPriseEnCharge,
    staleTime: 60_000,
  });
  const pecOptions = useMemo(() => sortPecForSelect(pecRaw), [pecRaw]);
  const pecSelectedOption = useMemo(
    () => (pecCodeFilter ? pecRaw.find((o) => o.code === pecCodeFilter) : undefined),
    [pecCodeFilter, pecRaw],
  );

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
        // Prise en charge (code)
        if (pecCodeFilter) {
          const code = resolvePatientPecCode(p, pecRaw);
          if (code !== pecCodeFilter) return false;
        }
        // Date : jour exact prioritaire sur l’intervalle Du / Au
        const rawDate = p[dateRange.col as keyof Patient] as string | undefined;
        if (exactDay) {
          const ymd = toLocalYmd(rawDate);
          if (ymd !== exactDay) return false;
        } else if (dateRange.from || dateRange.to) {
          if (!rawDate) return false;
          const d = new Date(rawDate).getTime();
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
  }, [patients, genderFilter, search, dateRange, exactDay, pecCodeFilter, pecRaw, sortKey, sortDir]);

  const todayRef = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const accueilStats = useMemo(
    () => ({
      total: patients.length,
      filtered: filtered.length,
      today: patients.filter((p) => p.createdAt?.slice(0, 10) === todayRef).length,
      femmes: patients.filter((p) => formatSexe(p.sexe) === 'Féminin').length,
      masculins: patients.filter((p) => formatSexe(p.sexe) === 'Masculin').length,
    }),
    [patients, filtered, todayRef],
  );

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
    if (next.from !== undefined || next.to !== undefined) {
      setExactDay('');
    }
    setPage(1);
  };

  const resetDate = () => {
    setDateRange({ from: '', to: '', col: 'createdAt' });
    setExactDay('');
    setPage(1);
  };

  const setPecFilter = (code: string) => {
    setPecCodeFilter(code);
    setPage(1);
  };

  const applyExactDay = (value: string) => {
    setExactDay(value);
    if (value) {
      setDateRange(prev => ({ ...prev, from: '', to: '' }));
    }
    setPage(1);
  };

  const handleSavePatient = async (updated: Patient) => {
    const createdBy = readMockSessionFromBrowser()?.sub ?? 'unknown';
    const payload = buildRegisterPayloadFromPatient(updated, createdBy);
    if (!payload) {
      throw new Error('Vérifiez le nom, le sexe et la date de naissance avant d’enregistrer.');
    }
    await updateRegisteredPatient(updated.id, payload);
    await queryClient.invalidateQueries({ queryKey: ['patients'] });
    setSelectedPatient(updated);
  };

  const dateActive = !!(dateRange.from || dateRange.to);
  const exactDayActive = !!exactDay;
  const dateFilterActive = dateActive || exactDayActive;
  const pecFilterActive = !!pecCodeFilter;
  const activeFilterCount =
    (genderFilter !== 'Tous' ? 1 : 0) +
    (search ? 1 : 0) +
    (pecFilterActive ? 1 : 0) +
    (dateFilterActive ? 1 : 0);
  const dateColShortLabel = dateRange.col === 'createdAt' ? "Date d'ajout" : 'Date naissance';

  const pageNumbers = (() => {
    if (totalPages <= 5) return Array.from({ length: totalPages }, (_, i) => i + 1);
    if (safePage <= 3) return [1, 2, 3, 4, '…', totalPages];
    if (safePage >= totalPages - 2) return [1, '…', totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    return [1, '…', safePage - 1, safePage, safePage + 1, '…', totalPages];
  })();

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <div className="mx-auto max-w-6xl p-6 lg:p-8">

        {/* En-tête (même rythme que inscription patient / dashboard) */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-xl font-medium tracking-tight text-gray-900">
              Liste des patients
            </h1>
            <p className="mt-1 text-xs text-gray-500">
              Consultez les dossiers, recherchez et ouvrez le détail d&apos;un patient en un clic.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void refetch()}
            disabled={isFetching}
            className={cn(
              'inline-flex items-center gap-2 self-start rounded-xl border border-blue-100 bg-blue-50 px-4 py-2.5 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-100',
              isFetching && 'cursor-not-allowed opacity-60',
            )}
          >
            <RefreshCw size={14} className={cn(isFetching && 'animate-spin')} />
            Actualiser
          </button>
        </div>

        {/* Statistiques rapides — total mis en avant */}
        <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <div className="rounded-xl border-2 border-blue-200 bg-gradient-to-br from-blue-50/90 via-white to-white p-5 shadow-md ring-1 ring-blue-100/80 sm:col-span-2 lg:col-span-3">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-blue-600">
              Total dossiers
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
                <Users size={22} />
              </div>
              <div>
                <p className="text-4xl font-semibold tabular-nums leading-none tracking-tight text-blue-950">
                  {accueilStats.total}
                </p>
                <p className="mt-1.5 text-xs text-gray-600">Patients enregistrés dans le système</p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-gray-100 bg-white p-4 lg:col-span-1">
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-gray-500">
              Liste actuelle
            </p>
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-600">
                <Filter size={17} />
              </div>
              <div>
                <p className="text-xl font-medium leading-none text-gray-800">{accueilStats.filtered}</p>
                <p className="mt-1 text-[11px] text-gray-400">Après filtres</p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-gray-100 bg-white p-4 lg:col-span-1">
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-blue-500">
              Aujourd&apos;hui
            </p>
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-500">
                <Calendar size={17} />
              </div>
              <div>
                <p className="text-xl font-medium leading-none text-gray-800">{accueilStats.today}</p>
                <p className="mt-1 text-[11px] text-gray-400">Créés aujourd&apos;hui</p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-gray-100 bg-white p-4 lg:col-span-1">
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-violet-500">
              Répartition
            </p>
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-500">
                <User size={17} />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-gray-800">
                  {accueilStats.masculins} M · {accueilStats.femmes} F
                </p>
                <p className="mt-1 text-[11px] text-gray-400">Sexe (tous dossiers)</p>
              </div>
            </div>
          </div>
        </div>

        {/* Carte principale */}
        <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
          <div className="border-b border-gray-100 bg-white px-4 pb-5 pt-4 sm:px-6 sm:pb-6 sm:pt-5">

            <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
              <span className="flex shrink-0 items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-gray-500 sm:w-[7.5rem]">
                <User size={14} className="shrink-0 text-blue-500" aria-hidden />
                Sexe
              </span>
              <div className="flex flex-wrap gap-2">
                {GENDER_FILTERS.map(f => (
                  <button
                    type="button"
                    key={f}
                    onClick={() => handleGender(f)}
                    className={cn(
                      'h-9 rounded-full px-4 text-[13px] font-medium transition-colors',
                      genderFilter === f
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'border border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50',
                    )}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-5 hidden h-px w-full bg-gray-100 sm:block" aria-hidden />

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-12 lg:items-end">
              <div className="flex flex-col gap-1.5 lg:col-span-4">
                <label htmlFor="liste-patients-search" className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-gray-500">
                  <Search size={12} className="text-gray-400" aria-hidden />
                  Recherche
                </label>
                <div className="relative">
                  <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    id="liste-patients-search"
                    type="text"
                    value={search}
                    onChange={e => handleSearch(e.target.value)}
                    placeholder="Nom, prénom, ID…"
                    className={cn(filterFieldClass, 'pl-10 pr-9')}
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
              </div>

              <div className="flex flex-col gap-1.5 lg:col-span-4">
                <label htmlFor="liste-patients-pec" className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-gray-500">
                  <ClipboardList size={12} className="text-gray-400" aria-hidden />
                  Prise en charge
                </label>
                <div className="relative">
                  <ClipboardList size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <select
                    id="liste-patients-pec"
                    value={pecCodeFilter}
                    onChange={e => setPecFilter(e.target.value)}
                    className={cn(
                      filterFieldClass,
                      'h-10 cursor-pointer appearance-none pl-10 pr-9',
                      pecFilterActive && 'border-blue-200 bg-blue-50/80',
                    )}
                    aria-label="Filtrer par prise en charge"
                  >
                    <option value="">Toutes les prises en charge</option>
                    {pecOptions.map(opt => (
                      <option key={opt.id} value={opt.code}>
                        {opt.code} — {opt.libelle}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                </div>
              </div>

              <div className="flex flex-col gap-1.5 lg:col-span-4">
                <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-gray-500">
                  <Calendar size={12} className="text-gray-400" aria-hidden />
                  Dates
                </span>
                <button
                  type="button"
                  onClick={() => setDateOpen(o => !o)}
                  className={cn(
                    filterFieldClass,
                    'inline-flex h-10 items-center justify-between gap-2 px-3 font-medium',
                    dateFilterActive
                      ? 'border-blue-200 bg-blue-50/80 text-blue-900'
                      : 'text-gray-700',
                  )}
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <Calendar size={15} className="shrink-0 text-gray-400" />
                    <span className="truncate">Période ou jour exact</span>
                  </span>
                  <span className="flex shrink-0 items-center gap-1.5">
                    {dateFilterActive && (
                      <span className="flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-blue-600 px-1 text-[10px] font-bold text-white">
                        1
                      </span>
                    )}
                    <ChevronDown size={14} className={cn('text-gray-400 transition-transform', dateOpen && 'rotate-180')} />
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* Panneau dates */}
          {dateOpen && (
            <div className="border-b border-gray-100 bg-gray-50 px-4 py-5 sm:px-6">
              

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-[minmax(0,11.5rem)_minmax(0,11.5rem)_minmax(0,10.25rem)_minmax(0,10.25rem)_minmax(0,10.5rem)] lg:items-end lg:gap-x-3 lg:gap-y-0">
                <div className="flex min-w-0 flex-col gap-1.5">
                  <label htmlFor="liste-patients-date-col" className={dateFilterPanelLabelClass}>
                    Champ filtré
                  </label>
                  <select
                    id="liste-patients-date-col"
                    value={dateRange.col}
                    onChange={e => applyDate({ col: e.target.value as DateCol })}
                    className={cn(filterFieldClass, 'cursor-pointer px-3')}
                  >
                    <option value="createdAt">Date d&apos;ajout</option>
                    <option value="dateNaissance">Date de naissance</option>
                  </select>
                </div>

                <div className="flex min-w-0 flex-col gap-1.5">
                  <label htmlFor="liste-patients-exact-day" className={dateFilterPanelLabelClass}>
                    Jour exact
                  </label>
                  <input
                    id="liste-patients-exact-day"
                    type="date"
                    value={exactDay}
                    onChange={e => applyExactDay(e.target.value)}
                    className={cn(
                      filterFieldClass,
                      'px-3',
                      exactDayActive && 'border-indigo-200 bg-indigo-50/40 ring-1 ring-indigo-100',
                    )}
                    aria-label="Filtrer sur un jour précis"
                  />
                </div>

                <div className="flex min-w-0 flex-col gap-1.5 sm:col-span-1 lg:border-l lg:border-slate-200/90 lg:pl-3">
                  <label htmlFor="liste-patients-date-from" className={dateFilterPanelLabelClass}>
                    Du
                  </label>
                  <input
                    id="liste-patients-date-from"
                    type="date"
                    value={dateRange.from}
                    onChange={e => applyDate({ from: e.target.value })}
                    disabled={exactDayActive}
                    className={cn(filterFieldClass, 'px-3 disabled:cursor-not-allowed disabled:opacity-45')}
                  />
                </div>

                <div className="flex min-w-0 flex-col gap-1.5">
                  <label htmlFor="liste-patients-date-to" className={dateFilterPanelLabelClass}>
                    Au
                  </label>
                  <input
                    id="liste-patients-date-to"
                    type="date"
                    value={dateRange.to}
                    onChange={e => applyDate({ to: e.target.value })}
                    min={dateRange.from || undefined}
                    disabled={exactDayActive}
                    className={cn(filterFieldClass, 'px-3 disabled:cursor-not-allowed disabled:opacity-45')}
                  />
                </div>

                <div className="flex min-w-0 flex-col gap-1.5 sm:col-span-2 lg:col-span-1 lg:max-w-[10.5rem]">
                  <div className={dateFilterPanelLabelClass} aria-hidden />
                  <button
                    type="button"
                    onClick={resetDate}
                    disabled={!dateFilterActive}
                    className={cn(
                      'inline-flex h-10 w-full shrink-0 items-center justify-center gap-2 rounded-xl border px-3 text-[13px] font-medium shadow-sm transition-colors',
                      dateFilterActive
                        ? 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                        : 'cursor-not-allowed border-gray-100 bg-gray-50/80 text-gray-400',
                    )}
                  >
                    <X size={14} />
                    Réinitialiser
                  </button>
                </div>
              </div>

            </div>
          )}

          {/* Résumé filtres actifs */}
          {(dateFilterActive || pecFilterActive || genderFilter !== 'Tous' || search) && (
            <div className="border-b border-gray-100 bg-gray-50 px-4 py-3.5 sm:px-6">
              <div className="flex flex-col gap-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-800 shadow-sm">
                      <SlidersHorizontal size={14} className="text-blue-600" aria-hidden />
                      {activeFilterCount} critère{activeFilterCount > 1 ? 's' : ''}
                    </span>
                    <span className="text-[11px] text-gray-500">Résumé des filtres appliqués</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => { handleGender('Tous'); handleSearch(''); resetDate(); setPecFilter(''); }}
                    className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-gray-600 shadow-sm transition-colors hover:border-gray-300 hover:bg-gray-50 hover:text-gray-900"
                  >
                    Tout effacer
                  </button>
                </div>

                <div className="flex flex-wrap gap-2">
                  {genderFilter !== 'Tous' && (
                    <ActiveFilterChip
                      icon={<User size={14} />}
                      label="Sexe"
                      onRemove={() => handleGender('Tous')}
                      removeLabel="Retirer le filtre sexe"
                    >
                      {genderFilter}
                    </ActiveFilterChip>
                  )}

                  {search && (
                    <ActiveFilterChip
                      icon={<Search size={14} />}
                      label="Recherche"
                      onRemove={() => handleSearch('')}
                      removeLabel="Retirer la recherche"
                    >
                      « {search} »
                    </ActiveFilterChip>
                  )}

                  {pecFilterActive && (
                    <ActiveFilterChip
                      icon={<ClipboardList size={14} />}
                      label="Prise en charge"
                      onRemove={() => setPecFilter('')}
                      removeLabel="Retirer le filtre prise en charge"
                    >
                      {pecSelectedOption ? `${pecSelectedOption.code} — ${pecSelectedOption.libelle}` : pecCodeFilter}
                    </ActiveFilterChip>
                  )}

                  {exactDayActive && (
                    <ActiveFilterChip
                      icon={<Calendar size={14} />}
                      label={dateColShortLabel}
                      onRemove={() => { setExactDay(''); setPage(1); }}
                      removeLabel="Retirer le filtre jour exact"
                    >
                      Jour {formatDate(exactDay)}
                    </ActiveFilterChip>
                  )}

                  {!exactDayActive && dateActive && (
                    <ActiveFilterChip
                      icon={<Calendar size={14} />}
                      label={dateColShortLabel}
                      onRemove={resetDate}
                      removeLabel="Retirer le filtre période"
                    >
                      {dateRange.from && `≥ ${formatDate(dateRange.from)}`}
                      {dateRange.from && dateRange.to && ' '}
                      {dateRange.to && `≤ ${formatDate(dateRange.to)}`}
                      {!dateRange.from && !dateRange.to ? '—' : ''}
                    </ActiveFilterChip>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Tableau */}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-left">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-100/95">
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
                        'whitespace-nowrap px-4 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-700 sm:px-6',
                        col.key ? 'cursor-pointer transition-colors hover:bg-gray-200/80 hover:text-gray-900' : '',
                        col.key === sortKey && 'text-blue-700',
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
                  Array.from({ length: PER_PAGE }).map((_, i) => (
                    <tr key={`sk-${i}`} className="bg-white">
                      <td className="px-4 py-4 sm:px-6 sm:py-[1.125rem]">
                        <div className="h-7 w-24 animate-pulse rounded-lg bg-gray-200" />
                      </td>
                      <td className="px-4 py-4 sm:px-6 sm:py-[1.125rem]">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 shrink-0 animate-pulse rounded-full bg-gray-200" />
                          <div className="min-w-0 flex-1 space-y-2">
                            <div className="h-4 max-w-xs w-full animate-pulse rounded bg-gray-200" />
                            <div className="h-3 w-20 animate-pulse rounded bg-gray-100" />
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 sm:px-6 sm:py-[1.125rem]">
                        <div className="h-4 w-24 animate-pulse rounded bg-gray-200" />
                      </td>
                      <td className="px-4 py-4 sm:px-6 sm:py-[1.125rem]">
                        <div className="h-7 w-20 animate-pulse rounded-full bg-gray-200" />
                      </td>
                      <td className="px-4 py-4 sm:px-6 sm:py-[1.125rem]">
                        <div className="h-4 w-28 animate-pulse rounded bg-gray-200" />
                      </td>
                      <td className="px-4 py-4 sm:px-6 sm:py-[1.125rem]">
                        <div className="h-4 w-24 animate-pulse rounded bg-gray-200" />
                      </td>
                    </tr>
                  ))
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
                        className="group cursor-pointer border-b border-gray-50 bg-white transition-colors hover:bg-gray-50"
                      >
                        <td className="px-4 py-4 sm:px-6 sm:py-[1.125rem]">
                          <span className="inline-block rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1 font-mono text-[11px] font-semibold text-gray-700">
                            {patient.id}
                          </span>
                        </td>
                        <td className="px-4 py-4 sm:px-6 sm:py-[1.125rem]">
                          <p className="text-[13px] font-medium text-gray-900 transition-colors group-hover:text-blue-600">
                            {patient.nom} {patient.prenom ?? ''}
                          </p>
                        </td>
                        <td className="px-4 py-4 text-[13px] text-gray-600 sm:px-6 sm:py-[1.125rem]">{formatDate(patient.dateNaissance)}</td>
                        <td className="px-4 py-4 sm:px-6 sm:py-[1.125rem]">
                          <span className={cn('inline-flex rounded-full border px-2.5 py-1 text-[11px] font-medium', sexeCls)}>
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
          <div className="flex flex-col gap-3 border-t border-gray-100 bg-gray-50 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
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
                        ? 'bg-blue-600 text-white shadow-sm'
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

      </div>
      <PatientDetailsModal
        open={Boolean(selectedPatient)}
        patient={selectedPatient}
        onClose={() => setSelectedPatient(null)}
        onSave={handleSavePatient}
      />
    </div>
  );
}