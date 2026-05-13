'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  BedDouble,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Search,
  SlidersHorizontal,
  XCircle,
  Filter,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { fetchHospitalisationNotifications } from '@/lib/api/services/hospitalisations';
import { fetchPatientById } from '@/lib/api/services/patients';

// ── Utils ─────────────────────────────────────────────────────────
const formatDate = (dateStr: string) => {
  if (!dateStr || dateStr === '—') return '—';
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr; // If not a valid date, return as is
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
};

const getSortableDate = (dateStr: string) => {
  if (!dateStr || dateStr === '—') return 0;
  try {
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? 0 : date.getTime();
  } catch {
    return 0;
  }
};

// ── Types ─────────────────────────────────────────────────────────
type Statut = 'EN ATTENTE' | 'ACCEPTÉE' | 'REFUSÉE';
type DateMode = 'single' | 'range';

interface Demande {
  id: string;
  patientId: string;
  nom: string;
  ipp: string;
  sexeAge: string;
  service: string;
  statut: Statut;
  date: string;
}

// ── Data ──────────────────────────────────────────────────────────
const DEMANDES: Demande[] = [
  { id: '#ADM-8842', patientId: 'CHU-2026-00001', nom: 'Jean-Marc DUBOIS', ipp: '4402931', sexeAge: 'H, 64 ans', service: 'Cardiologie', statut: 'EN ATTENTE', date: "Aujourd'hui, 08:14" },
  { id: '#ADM-8839', patientId: 'CHU-2026-00002', nom: 'Marie-Claire LEROY', ipp: '9021485', sexeAge: 'F, 42 ans', service: 'Neurologie', statut: 'ACCEPTÉE', date: "Aujourd'hui, 07:50" },
  { id: '#ADM-8835', patientId: 'CHU-2026-00003', nom: 'Thomas BERNARD', ipp: '1128374', sexeAge: 'H, 29 ans', service: 'Urgences', statut: 'REFUSÉE', date: 'Hier, 22:33' },
  { id: '#ADM-8831', patientId: 'CHU-2026-00004', nom: 'Fatou DIALLO', ipp: '3389201', sexeAge: 'F, 55 ans', service: 'Chirurgie', statut: 'EN ATTENTE', date: 'Hier, 20:10' },
  { id: '#ADM-8828', patientId: 'CHU-2026-00005', nom: 'Paul RICHARD', ipp: '7712043', sexeAge: 'H, 71 ans', service: 'Gériatrie', statut: 'ACCEPTÉE', date: 'Hier, 17:45' },
];

const STATUT_STYLE: Record<Statut, string> = {
  'EN ATTENTE': 'text-amber-700 bg-amber-50 border border-amber-200/90 ring-amber-100/50',
  ACCEPTÉE: 'text-emerald-700 bg-emerald-50 border border-emerald-200/90 ring-emerald-100/50',
  REFUSÉE: 'text-red-700 bg-red-50 border border-red-200/90 ring-red-100/50',
};

const STATUT_LABEL: Record<Statut, string> = {
  'EN ATTENTE': 'En attente',
  ACCEPTÉE: 'Acceptée',
  REFUSÉE: 'Refusée',
};

const STATUT_OPTIONS = [
  { value: 'Tous', label: 'Tous' },
  { value: 'EN ATTENTE', label: 'En attente' },
  { value: 'ACCEPTÉE', label: 'Acceptée' },
  { value: 'REFUSÉE', label: 'Refusée' },
];

const SERVICE_OPTIONS = [
  { value: 'Tous', label: 'Tous' },
  { value: 'Cardiologie', label: 'Cardiologie' },
  { value: 'Neurologie', label: 'Neurologie' },
  { value: 'Urgences', label: 'Urgences' },
  { value: 'Chirurgie', label: 'Chirurgie' },
  { value: 'Gériatrie', label: 'Gériatrie' },
];

const PER_PAGE = 6;

export default function HospitalisationMain() {
  const [demandes, setDemandes] = useState<Demande[]>(DEMANDES);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statut, setStatut] = useState('Tous');
  const [service, setService] = useState('Tous');
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<'date' | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [dateMode, setDateMode] = useState<DateMode>('single');
  const [dateSingle, setDateSingle] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const loadNotifications = async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await fetchHospitalisationNotifications();
      const patientsCache: Record<string, any> = {};

      const normalized = await Promise.all(
        (data || [])
          .filter((item: any) => item && typeof item === 'object')
          .map(async (item: any) => {
            const patientId = item.patientId || item.patient?.patientId || item.patient?.id || '—';
            let patientInfo = item.patient && typeof item.patient === 'object' ? item.patient : null;

            if (!patientInfo && patientId && patientId !== '—') {
              if (!patientsCache[patientId]) {
                patientsCache[patientId] = await fetchPatientById(patientId);
              }
              patientInfo = patientsCache[patientId];
            }

            const patientName = [
              patientInfo?.nom,
              patientInfo?.prenom,
              item.nom,
              item.patientName,
            ]
              .filter(Boolean)
              .join(' ')
              .trim() || '—';

            const ipp =
              item.ipp ||
              item.ippNumber ||
              patientInfo?.patientId ||
              patientInfo?.id ||
              patientId ||
              '—';

            const sexe = patientInfo?.sexe || item.sexe || item.sex || 'H';
            const age = patientInfo?.dateNaissance
              ? (() => {
                  const birth = new Date(patientInfo.dateNaissance);
                  if (!Number.isNaN(birth.getTime())) {
                    const now = new Date();
                    let years = now.getFullYear() - birth.getFullYear();
                    const monthDiff = now.getMonth() - birth.getMonth();
                    if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) {
                      years -= 1;
                    }
                    return `${years} ans`;
                  }
                  return undefined;
                })()
              : undefined;

            const sexeAge = [sexe, age].filter(Boolean).join(', ') || '—';

            const statusRaw = item.statut || item.status || item.statusDemande || item.statutHospitalisation || 'EN ATTENTE';
            const statutValue =
              statusRaw === 'ACCEPTE' || statusRaw === 'ACCEPTÉE' || statusRaw === 'ACCEPTEE'
                ? 'ACCEPTÉE'
                : statusRaw === 'REFUSÉE' || statusRaw === 'REFUSEE'
                ? 'REFUSÉE'
                : 'EN ATTENTE';

            return {
              id: item.id || item._id || `#ADM-${Math.random().toString(36).substr(2, 9)}`,
              patientId,
              nom: patientName,
              ipp,
              sexeAge,
              service: item.service || item.serviceId || item.serviceName || '—',
              statut: statutValue as Statut,
              date: item.dateEntrer || item.date || item.dateCreated || item.createdAt || '—',
            } as Demande;
          }),
      );

      const cleaned = normalized.filter(Boolean) as Demande[];
      setDemandes(cleaned.length > 0 ? cleaned : DEMANDES);
    } catch (err) {
      console.error('Erreur lors du chargement des notifications:', err);
      setError(err instanceof Error ? err.message : 'Impossible de charger les notifications');
      setDemandes(DEMANDES);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

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
  const setDateModeF = (v: DateMode) => {
    setDateMode(v);
    setPage(1);
  };
  const setDateSingleF = (v: string) => {
    setDateSingle(v);
    setPage(1);
  };
  const setDateFromF = (v: string) => {
    setDateFrom(v);
    setPage(1);
  };
  const setDateToF = (v: string) => {
    setDateTo(v);
    setPage(1);
  };
  const toggleSort = (field: 'date') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
    setPage(1);
  };

  const filtered = useMemo(() => {
    let filteredData = demandes.filter(d => {
      const q = search.toLowerCase();
      const matchSearch =
        d.nom.toLowerCase().includes(q) ||
        d.id.toLowerCase().includes(q) ||
        d.ipp.includes(search);
      const matchStatut = statut === 'Tous' || d.statut === statut;
      const matchService = service === 'Tous' || d.service === service;

      // Date filtering
      let matchDate = true;
      if (dateMode === 'single' && dateSingle) {
        matchDate = d.date === dateSingle;
      } else if (dateMode === 'range') {
        if (dateFrom && dateTo) matchDate = d.date >= dateFrom && d.date <= dateTo;
        else if (dateFrom) matchDate = d.date >= dateFrom;
        else if (dateTo) matchDate = d.date <= dateTo;
      }

      return matchSearch && matchStatut && matchService && matchDate;
    });

    // Sorting
    if (sortBy === 'date') {
      filteredData = filteredData.sort((a, b) => {
        const aDate = getSortableDate(a.date);
        const bDate = getSortableDate(b.date);
        if (sortOrder === 'asc') {
          return aDate - bDate;
        } else {
          return bDate - aDate;
        }
      });
    }

    return filteredData;
  }, [search, statut, service, demandes, dateMode, dateSingle, dateFrom, dateTo, sortBy, sortOrder]);

  const counts = useMemo(
    () => ({
      total: demandes.length,
      attente: demandes.filter(d => d.statut === 'EN ATTENTE').length,
      acceptee: demandes.filter(d => d.statut === 'ACCEPTÉE').length,
      refusee: demandes.filter(d => d.statut === 'REFUSÉE').length,
    }),
    [demandes],
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const pageData = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const hasFilters = statut !== 'Tous' || service !== 'Tous' || search.trim() !== '' ||
    (dateMode === 'single' && !!dateSingle) || (dateMode === 'range' && (!!dateFrom || !!dateTo));

  const clearFilters = () => {
    setSearch('');
    setStatut('Tous');
    setService('Tous');
    setDateSingle('');
    setDateFrom('');
    setDateTo('');
    setSortBy(null);
    setSortOrder('desc');
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

        {/* Main card */}
        <div className="overflow-hidden rounded-2xl border border-gray-100/90 bg-white shadow-md shadow-gray-200/50 ring-1 ring-gray-100/80">

          {/* Toolbar */}
          <div className="space-y-3 border-b border-gray-100 bg-gradient-to-b from-white to-gray-50/30 px-4 py-4 sm:px-6 sm:py-5">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-3">
                <div className="relative min-w-0 sm:w-[220px]">
                  <Building2 size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <select
                    value={service}
                    onChange={e => setServiceF(e.target.value)}
                    className="w-full cursor-pointer appearance-none rounded-xl border border-gray-200 bg-white py-2.5 pl-9 pr-9 text-[13px] text-gray-800 shadow-sm transition-colors focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    {SERVICE_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                </div>

                <div className="relative min-w-0 flex-1">
                  <Search size={14} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Rechercher un patient, IPP ou dossier…"
                    value={search}
                    onChange={e => setSearchQ(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-9 text-[13px] text-gray-800 shadow-inner shadow-gray-100/50 placeholder:text-gray-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                  {search && (
                    <button
                      type="button"
                      onClick={() => setSearchQ('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-lg p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                      aria-label="Effacer la recherche"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
                <div className="flex items-center gap-2">
                  {hasFilters && (
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
                      showFilters || hasFilters
                        ? 'border-blue-200 bg-blue-50 text-blue-800 shadow-sm shadow-blue-100/50 ring-1 ring-blue-100/60'
                        : 'border-gray-200 bg-white text-gray-600 shadow-sm hover:border-gray-300 hover:bg-gray-50',
                    )}
                  >
                    <Filter size={14} />
                    Filtres
                    {hasFilters && <span className="h-2 w-2 shrink-0 rounded-full bg-blue-600" />}
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
                          onClick={() => setStatutF(opt.value)}
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
                          onClick={() => setDateModeF(m)}
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
                        onChange={e => setDateSingleF(e.target.value)}
                        className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-[13px] text-gray-700 shadow-sm transition-colors focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/15"
                      />
                    </div>
                  ) : (
                    <div className="flex items-end gap-2">
                      <div className="space-y-2">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Du</p>
                        <input type="date" value={dateFrom} onChange={e => setDateFromF(e.target.value)}
                          className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-[13px] text-gray-700 shadow-sm transition-colors focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/15" />
                      </div>
                      <span className="pb-2.5 text-gray-400 text-sm">→</span>
                      <div className="space-y-2">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Au</p>
                        <input type="date" value={dateTo} onChange={e => setDateToF(e.target.value)}
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
            <table className="w-full min-w-[900px] border-collapse text-left">
              <thead>
                <tr className="border-b border-gray-200 bg-gradient-to-b from-gray-50 to-gray-50/30">
                  {[
                    { key: 'patientId', label: 'ID patient' },
                    { key: 'patient', label: 'Patient' },
                    { key: 'sexeAge', label: 'Sexe / âge' },
                    { key: 'service', label: 'Service' },
                    { key: 'statut', label: 'Statut' },
                    { key: 'date', label: "Date d'entrée" },
                  ].map(col => (
                    <th
                      key={col.key}
                      className={cn(
                        "whitespace-nowrap px-4 py-3.5 text-left text-[10px] font-bold uppercase tracking-widest text-gray-500 sm:px-6",
                        col.key === 'date' && "cursor-pointer hover:text-gray-700"
                      )}
                      onClick={col.key === 'date' ? () => toggleSort('date') : undefined}
                    >
                      <div className="flex items-center gap-1">
                        {col.label}
                        {col.key === 'date' && sortBy === 'date' && (
                          <ChevronDown
                            size={12}
                            className={cn(
                              "transition-transform",
                              sortOrder === 'asc' ? "rotate-180" : ""
                            )}
                          />
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100/90">
                {pageData.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-16 text-center sm:px-6">
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
                          {d.patientId}
                        </span>
                      </td>
                      <td className="px-4 py-4 sm:px-6 sm:py-5">
                        <p className="text-sm font-semibold leading-tight text-gray-900">{d.nom}</p>
                        <p className="mt-0.5 text-xs text-gray-500">IPP {d.ipp}</p>
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-600 sm:px-6 sm:py-5">{d.sexeAge}</td>
                      <td className="px-4 py-4 text-sm font-medium text-gray-900 sm:px-6 sm:py-5">{d.service}</td>
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
                      <td className="whitespace-nowrap px-4 py-4 text-xs leading-snug text-gray-500 sm:px-6 sm:py-5">{formatDate(d.date)}</td>
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
