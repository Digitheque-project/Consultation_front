'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Search,
  XCircle,
  Filter,
  X,
  RefreshCw,
  Activity,
  AlertCircle,
  Stethoscope,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { fetchHospitalisationNotifications } from '@/lib/api/services/hospitalisations';
import { fetchPatientById } from '@/lib/api/services/patients';

// ── Utils ─────────────────────────────────────────────────────────
const formatDate = (dateStr: string) => {
  if (!dateStr || dateStr === '—') return '—';
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
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

const STATUT_CONFIG: Record<Statut, {
  badge: string;
  dot: string;
  label: string;
  icon: React.ElementType;
}> = {
  'EN ATTENTE': {
    badge: 'bg-amber-50 text-amber-800 border border-amber-200 ring-1 ring-amber-100/50',
    dot: 'bg-amber-400',
    label: 'En attente',
    icon: Clock,
  },
  ACCEPTÉE: {
    badge: 'bg-emerald-50 text-emerald-800 border border-emerald-200 ring-1 ring-emerald-100/50',
    dot: 'bg-emerald-500',
    label: 'Acceptée',
    icon: CheckCircle2,
  },
  REFUSÉE: {
    badge: 'bg-red-50 text-red-800 border border-red-200 ring-1 ring-red-100/50',
    dot: 'bg-red-400',
    label: 'Refusée',
    icon: XCircle,
  },
};

const SERVICE_COLOR: Record<string, string> = {
  Cardiologie: 'text-rose-600 bg-rose-50 border-rose-100',
  Neurologie: 'text-violet-600 bg-violet-50 border-violet-100',
  Urgences: 'text-orange-600 bg-orange-50 border-orange-100',
  Chirurgie: 'text-blue-600 bg-blue-50 border-blue-100',
  Gériatrie: 'text-teal-600 bg-teal-50 border-teal-100',
};

const STATUT_OPTIONS = [
  { value: 'Tous', label: 'Tous' },
  { value: 'EN ATTENTE', label: 'En attente' },
  { value: 'ACCEPTÉE', label: 'Acceptée' },
  { value: 'REFUSÉE', label: 'Refusée' },
];

const SERVICE_OPTIONS = [
  { value: 'Tous', label: 'Tous les services' },
  { value: 'Cardiologie', label: 'Cardiologie' },
  { value: 'Neurologie', label: 'Neurologie' },
  { value: 'Urgences', label: 'Urgences' },
  { value: 'Chirurgie', label: 'Chirurgie' },
  { value: 'Gériatrie', label: 'Gériatrie' },
];

const PER_PAGE = 6;

// ── Avatar initials ────────────────────────────────────────────────
function PatientAvatar({ nom, sexe }: { nom: string; sexe: string }) {
  const parts = nom.split(' ').filter(Boolean);
  const initials = parts.length >= 2
    ? `${parts[0][0]}${parts[parts.length - 1][0]}`
    : nom.slice(0, 2);
  const isFemale = sexe.startsWith('F');
  return (
    <div className={cn(
      'flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[11px] font-bold uppercase tracking-widest',
      isFemale ? 'bg-pink-100 text-pink-700' : 'bg-blue-100 text-blue-700'
    )}>
      {initials.toUpperCase()}
    </div>
  );
}

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
            const patientName = [patientInfo?.nom, patientInfo?.prenom, item.nom, item.patientName]
              .filter(Boolean).join(' ').trim() || '—';
            const ipp = item.ipp || item.ippNumber || patientInfo?.patientId || patientInfo?.id || patientId || '—';
            const sexe = patientInfo?.sexe || item.sexe || item.sex || 'H';
            const age = patientInfo?.dateNaissance
              ? (() => {
                const birth = new Date(patientInfo.dateNaissance);
                if (!Number.isNaN(birth.getTime())) {
                  const now = new Date();
                  let years = now.getFullYear() - birth.getFullYear();
                  const monthDiff = now.getMonth() - birth.getMonth();
                  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) years -= 1;
                  return `${years} ans`;
                }
                return undefined;
              })()
              : undefined;
            const sexeAge = [sexe, age].filter(Boolean).join(', ') || '—';
            const statusRaw = item.statut || item.status || item.statusDemande || item.statutHospitalisation || 'EN ATTENTE';
            const statutValue =
              statusRaw === 'ACCEPTE' || statusRaw === 'ACCEPTÉE' || statusRaw === 'ACCEPTEE' ? 'ACCEPTÉE'
                : statusRaw === 'REFUSÉE' || statusRaw === 'REFUSEE' ? 'REFUSÉE'
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

  useEffect(() => { loadNotifications(); }, []);

  const setSearchQ = (v: string) => { setSearch(v); setPage(1); };
  const setStatutF = (v: string) => { setStatut(v); setPage(1); };
  const setServiceF = (v: string) => { setService(v); setPage(1); };
  const setDateModeF = (v: DateMode) => { setDateMode(v); setPage(1); };
  const setDateSingleF = (v: string) => { setDateSingle(v); setPage(1); };
  const setDateFromF = (v: string) => { setDateFrom(v); setPage(1); };
  const setDateToF = (v: string) => { setDateTo(v); setPage(1); };

  const toggleSort = (field: 'date') => {
    if (sortBy === field) setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    else { setSortBy(field); setSortOrder('desc'); }
    setPage(1);
  };

  const filtered = useMemo(() => {
    let data = demandes.filter(d => {
      const q = search.toLowerCase();
      const matchSearch = d.nom.toLowerCase().includes(q) || d.id.toLowerCase().includes(q) || d.ipp.includes(search);
      const matchStatut = statut === 'Tous' || d.statut === statut;
      const matchService = service === 'Tous' || d.service === service;
      let matchDate = true;
      if (dateMode === 'single' && dateSingle) matchDate = d.date === dateSingle;
      else if (dateMode === 'range') {
        if (dateFrom && dateTo) matchDate = d.date >= dateFrom && d.date <= dateTo;
        else if (dateFrom) matchDate = d.date >= dateFrom;
        else if (dateTo) matchDate = d.date <= dateTo;
      }
      return matchSearch && matchStatut && matchService && matchDate;
    });
    if (sortBy === 'date') {
      data = data.sort((a, b) => {
        const aDate = getSortableDate(a.date);
        const bDate = getSortableDate(b.date);
        return sortOrder === 'asc' ? aDate - bDate : bDate - aDate;
      });
    }
    return data;
  }, [search, statut, service, demandes, dateMode, dateSingle, dateFrom, dateTo, sortBy, sortOrder]);

  const counts = useMemo(() => ({
    total: demandes.length,
    attente: demandes.filter(d => d.statut === 'EN ATTENTE').length,
    acceptee: demandes.filter(d => d.statut === 'ACCEPTÉE').length,
    refusee: demandes.filter(d => d.statut === 'REFUSÉE').length,
  }), [demandes]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const pageData = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const hasFilters = statut !== 'Tous' || service !== 'Tous' || search.trim() !== '' ||
    (dateMode === 'single' && !!dateSingle) || (dateMode === 'range' && (!!dateFrom || !!dateTo));

  const clearFilters = () => {
    setSearch(''); setStatut('Tous'); setService('Tous');
    setDateSingle(''); setDateFrom(''); setDateTo('');
    setSortBy(null); setSortOrder('desc'); setPage(1);
  };

  // Occupancy bar for visual flair
  const occupancyPct = counts.total > 0 ? Math.round((counts.acceptee / counts.total) * 100) : 0;

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <div className="mx-auto max-w-6xl space-y-6 p-6 lg:p-8">

        {/* ── En-tête (aligné inscription / dashboard) ── */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-xl font-medium tracking-tight text-gray-900">
              Demandes d&apos;hospitalisation
            </h1>
            <p className="mt-1 text-xs text-gray-500">
              Suivi des admissions — même vue que le tableau de bord accueil
            </p>
          </div>
          <button
            type="button"
            onClick={loadNotifications}
            disabled={loading}
            className={cn(
              'inline-flex items-center gap-2 self-start rounded-xl border border-blue-100 bg-blue-50 px-4 py-2.5 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-100',
              loading && 'cursor-not-allowed opacity-60',
            )}
          >
            <RefreshCw size={14} className={cn(loading && 'animate-spin')} />
            Actualiser
          </button>
        </div>

        {/* ── KPI : total mis en avant ── */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <div className="rounded-xl border-2 border-blue-200 bg-gradient-to-br from-blue-50/90 via-white to-white p-5 shadow-md ring-1 ring-blue-100/80 sm:col-span-2 lg:col-span-3">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-blue-600">
              Total demandes
            </p>
            <div className="mt-2 flex flex-wrap items-end gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
                <Activity size={22} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-4xl font-semibold tabular-nums leading-none tracking-tight text-blue-950">
                  {counts.total}
                </p>
                <p className="mt-1.5 text-xs text-gray-600">Toutes les demandes chargées</p>
              </div>
            </div>
            
          </div>

          <div className="rounded-xl border border-gray-100 bg-white p-4 lg:col-span-1">
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-amber-500">
              En attente
            </p>
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-500">
                <Clock size={17} />
              </div>
              <div>
                <p className="text-xl font-medium tabular-nums leading-none text-gray-800">{counts.attente}</p>
                <p className="mt-1 text-[11px] text-gray-400">À traiter</p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-gray-100 bg-white p-4 lg:col-span-1">
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-emerald-500">
              Acceptées
            </p>
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-500">
                <CheckCircle2 size={17} />
              </div>
              <div>
                <p className="text-xl font-medium tabular-nums leading-none text-gray-800">{counts.acceptee}</p>
                <p className="mt-1 text-[11px] text-gray-400">Validées</p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-gray-100 bg-white p-4 lg:col-span-1">
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-red-500">
              Refusées
            </p>
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-400">
                <XCircle size={17} />
              </div>
              <div>
                <p className="text-xl font-medium tabular-nums leading-none text-gray-800">{counts.refusee}</p>
                <p className="mt-1 text-[11px] text-gray-400">Rejetées</p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Error banner ── */}
        {error && (
          <div className="flex items-center gap-3 rounded-xl border border-red-100 bg-red-50 px-4 py-3">
            <AlertCircle size={15} className="shrink-0 text-red-500" />
            <p className="text-[13px] text-red-700">{error} · Données de démonstration affichées.</p>
            <button type="button" onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-600">
              <X size={14} />
            </button>
          </div>
        )}

        {/* ── Main panel ── */}
        <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">

          {/* Toolbar */}
          <div className="border-b border-gray-100 bg-white px-5 py-4 sm:px-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              {/* Search */}
              <div className="relative flex-1 sm:max-w-xs">
                <Search size={14} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Patient, IPP, dossier…"
                  value={search}
                  onChange={e => setSearchQ(e.target.value)}
                  className="w-full rounded-xl border border-gray-100 bg-gray-50 py-2.5 pl-10 pr-9 text-sm text-gray-800 placeholder:text-gray-400 transition-colors focus:border-blue-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/15"
                />
                {search && (
                  <button type="button" onClick={() => setSearchQ('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-0.5 text-gray-400 hover:text-gray-600 transition-colors">
                    <X size={13} />
                  </button>
                )}
              </div>

              {/* Service select + filter toggle */}
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Stethoscope size={13} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <select
                    value={service}
                    onChange={e => setServiceF(e.target.value)}
                    className="cursor-pointer appearance-none rounded-xl border border-gray-100 bg-gray-50 py-2.5 pl-8 pr-8 text-sm text-gray-700 transition-colors focus:border-blue-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/15"
                  >
                    {SERVICE_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                  <ChevronDown size={12} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                </div>

                <button type="button" onClick={() => setShowFilters(v => !v)}
                  className={cn(
                    'flex items-center gap-2 rounded-xl border px-3.5 py-2.5 text-[13px] font-medium transition-all',
                    showFilters
                      ? 'border-blue-600 bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                      : 'border-gray-200 bg-white text-gray-600 shadow-sm hover:bg-gray-50'
                  )}>
                  <Filter size={13} />
                  Filtres
                </button>
              </div>
            </div>

            {/* Expandable filter panel */}
            {showFilters && (
              <div className="mt-3 rounded-xl border border-gray-100 bg-gray-50/80 p-4">
                <div className="flex flex-wrap items-end gap-5">
                  {/* Statut pills */}
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-gray-400">Statut</p>
                    <div className="flex gap-1.5 flex-wrap">
                      {STATUT_OPTIONS.map(opt => (
                        <button key={opt.value} type="button" onClick={() => setStatutF(opt.value)}
                          className={cn(
                            'rounded-lg border px-3 py-1.5 text-[12px] font-semibold transition-all',
                            statut === opt.value
                              ? 'border-blue-600 bg-blue-600 text-white shadow-sm'
                              : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:text-gray-900'
                          )}>
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="hidden h-8 w-px bg-gray-200 self-center sm:block" />

                  {/* Date mode */}
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-gray-400">Période</p>
                    <div className="flex gap-1 rounded-xl border border-gray-200 bg-white p-1">
                      {(['single', 'range'] as DateMode[]).map(m => (
                        <button key={m} type="button" onClick={() => setDateModeF(m)}
                          className={cn(
                            'rounded-lg px-3 py-1.5 text-[12px] font-semibold transition-all',
                            dateMode === m
                              ? 'bg-blue-600 text-white shadow-sm'
                              : 'text-gray-500 hover:text-gray-800'
                          )}>
                          {m === 'single' ? 'Date exacte' : 'Intervalle'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Date inputs */}
                  {dateMode === 'single' ? (
                    <div className="space-y-2">
                      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-gray-400">Date</p>
                      <input type="date" value={dateSingle} onChange={e => setDateSingleF(e.target.value)}
                        className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-2 text-sm text-gray-700 transition-colors focus:border-blue-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/15" />
                    </div>
                  ) : (
                    <div className="flex items-end gap-2">
                      <div className="space-y-2">
                        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-gray-400">Du</p>
                        <input type="date" value={dateFrom} onChange={e => setDateFromF(e.target.value)}
                          className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-2 text-sm text-gray-700 transition-colors focus:border-blue-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/15" />
                      </div>
                      <span className="pb-2 text-gray-400">→</span>
                      <div className="space-y-2">
                        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-gray-400">Au</p>
                        <input type="date" value={dateTo} onChange={e => setDateToF(e.target.value)}
                          className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-2 text-sm text-gray-700 transition-colors focus:border-blue-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/15" />
                      </div>
                    </div>
                  )}

                  {/* Result count */}
                  <div className="ml-auto self-end">
                    <span className={cn(
                      'rounded-xl px-3 py-2 text-[12px] font-semibold border',
                      filtered.length === 0
                        ? 'border-red-100 bg-red-50 text-red-700'
                        : 'border-gray-200 bg-gray-50 text-gray-700'
                    )}>
                      {filtered.length} résultat{filtered.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ── Table ── */}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] border-collapse">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-100/95">
                  {[
                    { key: 'patient', label: 'Patient' },
                    { key: 'patientId', label: 'ID · IPP' },
                    { key: 'sexeAge', label: 'Profil' },
                    { key: 'service', label: 'Service' },
                    { key: 'statut', label: 'Statut' },
                    { key: 'date', label: "Date d'entrée", sortable: true },
                  ].map(col => (
                    <th
                      key={col.key}
                      onClick={col.sortable ? () => toggleSort('date') : undefined}
                      className={cn(
                        'px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-700 sm:px-6',
                        col.sortable && 'cursor-pointer select-none transition-colors hover:bg-gray-200/80 hover:text-gray-900',
                      )}
                    >
                      <div className="flex items-center gap-1">
                        {col.label}
                        {col.sortable && sortBy === 'date' && (
                          <ChevronDown size={12} className={cn('ml-0.5 inline transition-transform text-blue-700', sortOrder === 'asc' && 'rotate-180')} />
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  Array.from({ length: PER_PAGE }).map((_, i) => (
                    <tr key={`sk-${i}`} className="bg-white">
                      <td className="px-5 py-4 sm:px-6">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 shrink-0 animate-pulse rounded-full bg-gray-200" />
                          <div className="min-w-0 flex-1 space-y-2">
                            <div className="h-4 max-w-[10rem] animate-pulse rounded bg-gray-200" />
                            <div className="h-3 w-16 animate-pulse rounded bg-gray-100" />
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 sm:px-6">
                        <div className="h-7 w-28 animate-pulse rounded-lg bg-gray-200" />
                      </td>
                      <td className="px-5 py-4 sm:px-6">
                        <div className="h-4 w-20 animate-pulse rounded bg-gray-200" />
                      </td>
                      <td className="px-5 py-4 sm:px-6">
                        <div className="h-7 w-24 animate-pulse rounded-lg bg-gray-200" />
                      </td>
                      <td className="px-5 py-4 sm:px-6">
                        <div className="h-7 w-24 animate-pulse rounded-lg bg-gray-200" />
                      </td>
                      <td className="px-5 py-4 sm:px-6">
                        <div className="h-4 w-32 animate-pulse rounded bg-gray-200" />
                      </td>
                    </tr>
                  ))
                ) : pageData.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-16 text-center sm:px-6">
                      <div className="mx-auto flex max-w-xs flex-col items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-100">
                          <Search size={20} className="text-gray-400" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-700">Aucune demande trouvée</p>
                          <p className="mt-1 text-sm text-gray-400">Ajustez la recherche ou les filtres.</p>
                        </div>
                        {hasFilters && (
                          <button type="button" onClick={clearFilters}
                            className="mt-1 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700">
                            Tout réinitialiser
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  pageData.map((d, i) => {
                    const cfg = STATUT_CONFIG[d.statut];
                    const svcColor = SERVICE_COLOR[d.service] || 'text-gray-600 bg-gray-50 border-gray-200';
                    const [sexePart] = d.sexeAge.split(',');
                    return (
                      <tr key={d.id + i}
                        className="group bg-white transition-colors hover:bg-gray-50">
                        {/* Patient */}
                        <td className="px-5 py-4 sm:px-6">
                          <div className="flex items-center gap-3">
                            <PatientAvatar nom={d.nom} sexe={sexePart?.trim() || 'H'} />
                            <div>
                              <p className="text-[13px] font-semibold text-gray-900 leading-tight">{d.nom}</p>
                            </div>
                          </div>
                        </td>
                        {/* ID */}
                        <td className="px-5 py-4 sm:px-6">
                          <span className="inline-block rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1 font-mono text-[11px] font-semibold text-gray-700">
                            {d.patientId}
                          </span>
                        </td>
                        {/* Profil */}
                        <td className="whitespace-nowrap px-5 py-4 text-[13px] text-gray-500 sm:px-6">
                          {d.sexeAge}
                        </td>
                        {/* Service */}
                        <td className="px-5 py-4 sm:px-6">
                          <span className={cn(
                            'inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[12px] font-semibold',
                            svcColor
                          )}>
                            <Stethoscope size={10} />
                            {d.service}
                          </span>
                        </td>
                        {/* Statut */}
                        <td className="px-5 py-4 sm:px-6">
                          <span className={cn(
                            'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[12px] font-semibold',
                            cfg.badge
                          )}>
                            <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', cfg.dot)} />
                            {cfg.label}
                          </span>
                        </td>
                        {/* Date */}
                        <td className="whitespace-nowrap px-5 py-4 text-[12px] text-gray-400 sm:px-6">
                          {formatDate(d.date)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* ── Pagination ── */}
          <div className="flex flex-col gap-3 border-t border-gray-100 bg-gray-50/40 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <p className="text-center text-[12px] text-gray-400 sm:text-left">
              {filtered.length === 0 ? 'Aucun résultat'
                : `${Math.min((page - 1) * PER_PAGE + 1, filtered.length)}–${Math.min(page * PER_PAGE, filtered.length)} sur ${filtered.length} demande${filtered.length > 1 ? 's' : ''}`}
            </p>
            <div className="flex items-center justify-center gap-1 sm:justify-end">
              <button type="button" disabled={page === 1} onClick={() => setPage(p => Math.max(1, p - 1))}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 shadow-sm transition-all hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40">
                <ChevronLeft size={14} />
              </button>
              {Array.from({ length: totalPages }, (_, idx) => idx + 1).map(p => (
                <button type="button" key={p} onClick={() => setPage(p)}
                  className={cn(
                    'flex h-8 min-w-[2rem] items-center justify-center rounded-lg text-[12px] font-semibold transition-all',
                    page === p
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'border border-gray-200 bg-white text-gray-600 shadow-sm hover:bg-gray-50'
                  )}>
                  {p}
                </button>
              ))}
              <button type="button" disabled={page === totalPages || filtered.length === 0}
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 shadow-sm transition-all hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40">
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}