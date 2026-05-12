'use client';

import { useState, useMemo } from 'react';
import {
  CheckCircle, Eye, FileText, MoreVertical,
  ChevronLeft, ChevronRight, Calendar, Clock,
  Activity, TrendingUp, Stethoscope, FlaskConical,
  RefreshCcw, X, Filter, Users,
} from 'lucide-react';

type Statut = 'PLANIFIÉ' | 'EN COURS' | 'EN ATTENTE' | 'TERMINÉ';
type TabId  = 'consultation' | 'paraclinique' | 'controle';
type DateMode = 'single' | 'range';

const ALL_RDV = [
  { id: 'RDV-2023-001', nom: 'Marc Lemoine',   initials: 'ML', patientId: '#CHUA-00441', service: 'Cardiologie',   medecin: 'Dr. Sarah Koulibaly', date: '2023-10-12', heure: '09:30', statut: 'PLANIFIÉ'   as Statut },
  { id: 'RDV-2023-004', nom: 'Sophie Girard',  initials: 'SG', patientId: '#CHUA-00219', service: 'Neurologie',    medecin: 'Dr. Pierre Morel',    date: '2023-10-12', heure: '10:15', statut: 'EN COURS'   as Statut },
  { id: 'RDV-2023-012', nom: 'Julien Masson',  initials: 'JM', patientId: '#CHUA-00874', service: 'Ophtalmologie', medecin: 'Dr. Claire Tardieu',  date: '2023-10-12', heure: '11:00', statut: 'EN ATTENTE' as Statut },
  { id: 'RDV-2022-872', nom: 'Alain Bernard',  initials: 'AB', patientId: '#CHUA-00331', service: 'Radiologie',    medecin: 'Équipe B',            date: '2023-10-11', heure: '08:00', statut: 'TERMINÉ'    as Statut },
  { id: 'RDV-2023-009', nom: 'Isabelle Perez', initials: 'IP', patientId: '#CHUA-00562', service: 'Cardiologie',   medecin: 'Dr. Sarah Koulibaly', date: '2023-10-12', heure: '14:30', statut: 'PLANIFIÉ'   as Statut },
  { id: 'RDV-2023-017', nom: 'Thomas Dupuis',  initials: 'TD', patientId: '#CHUA-00712', service: 'Neurologie',    medecin: 'Dr. Pierre Morel',    date: '2023-10-13', heure: '09:00', statut: 'PLANIFIÉ'   as Statut },
  { id: 'RDV-2023-021', nom: 'Claire Martin',  initials: 'CM', patientId: '#CHUA-00095', service: 'Pédiatrie',     medecin: 'Dr. Lucie Rabe',      date: '2023-10-13', heure: '15:00', statut: 'TERMINÉ'    as Statut },
  { id: 'RDV-2023-025', nom: 'Jean Rakoto',    initials: 'JR', patientId: '#CHUA-00788', service: 'Chirurgie',     medecin: 'Dr. Michel Rabe',     date: '2023-10-11', heure: '10:00', statut: 'EN ATTENTE' as Statut },
  { id: 'RDV-2023-030', nom: 'Hanta Rasoa',    initials: 'HR', patientId: '#CHUA-00102', service: 'Pédiatrie',     medecin: 'Dr. Lucie Rabe',      date: '2023-10-12', heure: '16:00', statut: 'EN ATTENTE' as Statut },
];

// Couleur stable basée sur le patientId (hash simple)
function patientColor(patientId: string): string {
  const PALETTES = [
    { bg: 'bg-blue-100',   text: 'text-blue-700'   },
    { bg: 'bg-violet-100', text: 'text-violet-700'  },
    { bg: 'bg-teal-100',   text: 'text-teal-700'    },
    { bg: 'bg-amber-100',  text: 'text-amber-700'   },
    { bg: 'bg-pink-100',   text: 'text-pink-700'    },
    { bg: 'bg-green-100',  text: 'text-green-700'   },
    { bg: 'bg-sky-100',    text: 'text-sky-700'     },
    { bg: 'bg-rose-100',   text: 'text-rose-700'    },
    { bg: 'bg-indigo-100', text: 'text-indigo-700'  },
    { bg: 'bg-orange-100', text: 'text-orange-700'  },
  ];
  const num = patientId.replace(/\D/g, '');
  const idx = parseInt(num || '0', 10) % PALETTES.length;
  const p = PALETTES[idx];
  return `${p.bg} ${p.text}`;
}

const STATUT_CONFIG: Record<Statut, { label: string; dot: string; cls: string }> = {
  'PLANIFIÉ':   { label: 'Planifié',   dot: 'bg-blue-500',   cls: 'text-blue-700 bg-blue-50 border border-blue-200' },
  'EN COURS':   { label: 'En cours',   dot: 'bg-orange-500', cls: 'text-orange-700 bg-orange-50 border border-orange-200' },
  'EN ATTENTE': { label: 'En attente', dot: 'bg-purple-500', cls: 'text-purple-700 bg-purple-50 border border-purple-200' },
  'TERMINÉ':    { label: 'Terminé',    dot: 'bg-green-500',  cls: 'text-green-700 bg-green-50 border border-green-200' },
};

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

function dayLabel(date: string) {
  const TODAY = '2023-10-12';
  const YESTERDAY = '2023-10-11';
  if (date === TODAY)     return "Aujourd'hui";
  if (date === YESTERDAY) return 'Hier';
  const d = new Date(date);
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function RendezVousMain() {
  const [activeTab, setActiveTab]     = useState<TabId>('consultation');
  const [statut, setStatut]           = useState('Tous');
  const [dateMode, setDateMode]       = useState<DateMode>('single');
  // Par défaut : pas de filtre date → tous les RDV visibles
  const [dateSingle, setDateSingle]   = useState('');
  const [dateFrom, setDateFrom]       = useState('');
  const [dateTo, setDateTo]           = useState('');
  const [page, setPage]               = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const PER_PAGE = 6;

  // Filtre sans fermer le panneau (page seule réinitialisée)
  const applyStatut = (v: string) => { setStatut(v); setPage(1); };
  const applyDateSingle = (v: string) => { setDateSingle(v); setPage(1); };
  const applyDateFrom   = (v: string) => { setDateFrom(v); setPage(1); };
  const applyDateTo     = (v: string) => { setDateTo(v); setPage(1); };
  const applyDateMode   = (v: DateMode) => { setDateMode(v); setPage(1); };

  // Basculer d'onglet : ne touche PAS showFilters
  const switchTab = (tab: TabId) => { setActiveTab(tab); setPage(1); };

  const filtered = useMemo(() => {
    return ALL_RDV.filter(rdv => {
      const matchStatut = statut === 'Tous' || rdv.statut === statut;
      let matchDate = true;
      if (dateMode === 'single' && dateSingle) {
        matchDate = rdv.date === dateSingle;
      } else if (dateMode === 'range') {
        if (dateFrom && dateTo)   matchDate = rdv.date >= dateFrom && rdv.date <= dateTo;
        else if (dateFrom)        matchDate = rdv.date >= dateFrom;
        else if (dateTo)          matchDate = rdv.date <= dateTo;
      }
      return matchStatut && matchDate;
    });
  }, [statut, dateMode, dateSingle, dateFrom, dateTo]);

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
    setPage(1);
  };

  const STATS = [
    { label: 'Total RDV',      value: counts.total,    sub: 'tous',         accent: 'text-gray-900',   iconBg: 'bg-gray-100',   icon: Calendar, border: '' },
    { label: 'Planifiés',      value: counts.planifie, sub: 'à venir',      accent: 'text-blue-700',   iconBg: 'bg-blue-50',    icon: Activity, border: 'border-l-[3px] border-l-blue-600' },
    { label: 'En attente',     value: counts.attente,  sub: 'en salle',     accent: 'text-purple-700', iconBg: 'bg-purple-50',  icon: Users,    border: '' },
    { label: 'En cours',       value: counts.enCours,  sub: 'actifs',       accent: 'text-orange-600', iconBg: 'bg-orange-50',  icon: Clock,    border: '' },
    { label: 'Terminés',       value: counts.termine,  sub: 'complétés',    accent: 'text-green-700',  iconBg: 'bg-green-50',   icon: TrendingUp, border: '' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-8 max-w-7xl mx-auto space-y-6">

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
        <div className="grid grid-cols-5 gap-4">
          {STATS.map((s, i) => {
            const Icon = s.icon;
            return (
              <div key={i} className={`bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4 flex items-center gap-3 ${s.border}`}>
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${s.iconBg}`}>
                  <Icon size={16} className={s.accent} />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-0.5">{s.label}</p>
                  <div className="flex items-baseline gap-1.5">
                    <span className={`text-2xl font-bold leading-none ${s.accent}`}>{s.value}</span>
                    <span className="text-[11px] text-gray-400">{s.sub}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Main card ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

          {/* Toolbar */}
          <div className="px-6 py-4 border-b border-gray-100 space-y-3">
            <div className="flex items-center justify-between gap-4">

              {/* Tabs */}
              <div className="flex gap-1 bg-gray-50 p-1 rounded-xl border border-gray-100">
                {TABS.map(tab => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      type="button"
                      key={tab.id}
                      onClick={() => switchTab(tab.id)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-medium transition-all ${
                        isActive
                          ? 'bg-white text-blue-700 font-semibold shadow-sm border border-gray-100'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      <Icon size={13} className={isActive ? 'text-blue-500' : 'text-gray-400'} />
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              {/* Right controls */}
              <div className="flex items-center gap-2">
                {hasFilter && (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="flex items-center gap-1.5 text-[12px] font-semibold text-red-600 border border-red-200 bg-red-50 hover:bg-red-100 px-3 py-2 rounded-xl transition-colors"
                  >
                    <X size={12} />
                    Effacer les filtres
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowFilters(v => !v)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-[13px] font-medium transition-all ${
                    showFilters || hasFilter
                      ? 'border-blue-300 bg-blue-50 text-blue-700'
                      : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  <Filter size={13} />
                  Filtres
                  {hasFilter && (
                    <span className="w-2 h-2 rounded-full bg-blue-600 flex-shrink-0" />
                  )}
                </button>
              </div>
            </div>

            {/* ── Filter panel — s'affiche/masque indépendamment des onglets ── */}
            {showFilters && (
              <div className="bg-gray-50/80 rounded-2xl border border-gray-100 p-5 space-y-4">
                <div className="flex flex-wrap items-end gap-6">

                  {/* Statut */}
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Statut</p>
                    <div className="flex gap-1.5 flex-wrap">
                      {STATUT_OPTIONS.map(opt => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => applyStatut(opt.value)}
                          className={`px-3 py-1.5 rounded-xl text-[12px] font-semibold border transition-all ${
                            statut === opt.value
                              ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                              : 'bg-white text-gray-600 border-gray-200 hover:border-blue-200 hover:text-blue-600'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="w-px h-10 bg-gray-200 self-center hidden sm:block" />

                  {/* Date mode toggle */}
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Période</p>
                    <div className="flex gap-1 bg-white border border-gray-200 p-1 rounded-xl">
                      {(['single', 'range'] as DateMode[]).map(m => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => applyDateMode(m)}
                          className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all ${
                            dateMode === m ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-50'
                          }`}
                        >
                          {m === 'single' ? 'Date exacte' : 'Intervalle'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Date inputs */}
                  {dateMode === 'single' ? (
                    <div className="space-y-2">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Date</p>
                      <input
                        type="date"
                        value={dateSingle}
                        onChange={e => applyDateSingle(e.target.value)}
                        className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-[13px] text-gray-700 focus:outline-none focus:border-blue-400 transition-colors"
                      />
                    </div>
                  ) : (
                    <div className="flex items-end gap-2">
                      <div className="space-y-2">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Du</p>
                        <input
                          type="date"
                          value={dateFrom}
                          onChange={e => applyDateFrom(e.target.value)}
                          className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-[13px] text-gray-700 focus:outline-none focus:border-blue-400 transition-colors"
                        />
                      </div>
                      <span className="pb-2.5 text-gray-400 text-sm">→</span>
                      <div className="space-y-2">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Au</p>
                        <input
                          type="date"
                          value={dateTo}
                          onChange={e => applyDateTo(e.target.value)}
                          className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-[13px] text-gray-700 focus:outline-none focus:border-blue-400 transition-colors"
                        />
                      </div>
                    </div>
                  )}

                  <div className="ml-auto self-end">
                    <span className={`text-[12px] font-semibold px-3 py-2 rounded-xl border ${
                      filtered.length === 0
                        ? 'text-red-600 bg-red-50 border-red-100'
                        : 'text-blue-700 bg-blue-50 border-blue-100'
                    }`}>
                      {filtered.length} résultat{filtered.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Table */}
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
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
                    className={`px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-400 ${h.right ? 'text-right' : 'text-left'}`}
                  >
                    {h.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pageData.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <Calendar size={28} className="text-gray-300" />
                      <p className="text-[14px] font-semibold text-gray-500">Aucun rendez-vous trouvé</p>
                      <p className="text-[12px] text-gray-400">Modifiez vos filtres pour afficher des résultats.</p>
                      <button type="button" onClick={clearFilters} className="mt-1 text-[12px] text-blue-600 font-medium underline underline-offset-2">
                        Effacer les filtres
                      </button>
                    </div>
                  </td>
                </tr>
              ) : pageData.map((rdv, i) => {
                const cfg   = STATUT_CONFIG[rdv.statut];
                const color = patientColor(rdv.patientId);
                return (
                  <tr key={rdv.id + i} className="border-b border-gray-50 hover:bg-blue-50/20 transition-colors">

                    {/* ID */}
                    <td className="px-6 py-4">
                      <span className="inline-block text-[11px] font-bold text-blue-600 bg-blue-50 border border-blue-100 px-2.5 py-1 rounded-lg tracking-wide font-mono">
                        {rdv.id}
                      </span>
                    </td>

                    {/* Patient — couleur déterministe par patientId */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-[11px] font-bold flex-shrink-0 ${color}`}>
                          {rdv.initials}
                        </div>
                        <div>
                          <p className="text-[13px] font-semibold text-gray-900 leading-tight">{rdv.nom}</p>
                          <p className="text-[11px] text-gray-400 mt-0.5">{rdv.patientId}</p>
                        </div>
                      </div>
                    </td>

                    {/* Service */}
                    <td className="px-6 py-4">
                      <p className="text-[13px] font-medium text-gray-800">{rdv.service}</p>
                      <p className="text-[11px] text-gray-400 mt-0.5">{rdv.medecin}</p>
                    </td>

                    {/* Date */}
                    <td className="px-6 py-4">
                      <p className="text-[13px] font-medium text-gray-800">{dayLabel(rdv.date)}</p>
                      <p className="text-[11px] text-gray-400 mt-0.5 flex items-center gap-1">
                        <Clock size={10} className="flex-shrink-0" />{rdv.heure}
                      </p>
                    </td>

                    {/* Statut */}
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-xl tracking-wide ${cfg.cls}`}>
                        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
                        {cfg.label}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4 text-right">
                      {rdv.statut === 'PLANIFIÉ' && (
                        <button type="button" className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 active:scale-[0.98] text-white text-[12px] font-semibold px-4 py-2 rounded-xl transition-all shadow-sm shadow-green-100">
                          <CheckCircle size={13} />
                          Confirmer l'arrivée
                        </button>
                      )}
                      {(rdv.statut === 'EN COURS' || rdv.statut === 'EN ATTENTE') && (
                        <button type="button" className="inline-flex items-center gap-2 text-[12px] font-medium text-gray-600 border border-gray-200 hover:bg-gray-50 px-4 py-2 rounded-xl transition-colors">
                          <Eye size={13} className="text-gray-400" />
                          Voir détails
                        </button>
                      )}
                      {rdv.statut === 'TERMINÉ' && (
                        <div className="flex items-center justify-end gap-1.5">
                          <button type="button" className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors border border-gray-200" title="Compte-rendu">
                            <FileText size={14} />
                          </button>
                          {/* <button type="button" className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors border border-gray-200" title="Plus d'actions">
                            <MoreVertical size={14} />
                          </button> */}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Pagination */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50/40">
            <p className="text-[12px] text-gray-400">
              {filtered.length === 0
                ? 'Aucun résultat'
                : `${Math.min((page - 1) * PER_PAGE + 1, filtered.length)}–${Math.min(page * PER_PAGE, filtered.length)} sur ${filtered.length} rendez-vous`}
            </p>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={page === 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
                className="w-8 h-8 flex items-center justify-center rounded-xl border border-gray-200 hover:bg-gray-100 text-gray-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={14} />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                <button
                  type="button"
                  key={p}
                  onClick={() => setPage(p)}
                  className={`w-8 h-8 flex items-center justify-center rounded-xl text-[12px] font-semibold transition-colors ${
                    page === p
                      ? 'bg-blue-600 text-white shadow-sm shadow-blue-200'
                      : 'border border-gray-200 text-gray-500 hover:bg-gray-100'
                  }`}
                >
                  {p}
                </button>
              ))}
              <button
                type="button"
                disabled={page === totalPages}
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                className="w-8 h-8 flex items-center justify-center rounded-xl border border-gray-200 hover:bg-gray-100 text-gray-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
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