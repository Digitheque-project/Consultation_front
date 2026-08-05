"use client";

import { useMemo, useState } from 'react';
import { CalendarRange, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAllConsultations } from '@/hooks/use-consultations';
import { useAuth } from '@/context/AuthContext';
import { DonutChart, type DonutSegment } from '@/components/charts/DonutChart';

const formatDateKey = (value: string | Date) => {
  const d = value instanceof Date ? value : new Date(value);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const today = formatDateKey(new Date());

const subtractDays = (days: number) => formatDateKey(new Date(Date.now() - days * 24 * 60 * 60 * 1000));

type Period = 'semaine' | 'mois' | 'annee' | 'custom';

function StatCard({ label, value, sub, accent }: { label: string; value: string | number; sub?: string; accent?: string }) {
  return (
    <div className="relative overflow-hidden bg-white rounded-2xl p-5 border border-gray-100 shadow-[0px_4px_16px_rgba(17,17,26,0.05)]">
      <div className={cn('absolute inset-x-0 top-0 h-1', accent ?? 'bg-[#005b82]')} />
      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">{label}</p>
      <p className="text-3xl font-black text-[#005b82] leading-none">{value}</p>
      {sub && <p className="text-[11px] text-slate-400 mt-1">{sub}</p>}
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-[0px_4px_16px_rgba(17,17,26,0.05)] p-5 space-y-4">
      <h3 className="text-[13px] font-extrabold text-slate-800">{title}</h3>
      {children}
    </div>
  );
}

export default function RapportPage() {
  const { medecin } = useAuth();
  // Hebdomadaire par défaut (uniformisation inter-services), avec option mois/année.
  const [period, setPeriod] = useState<Period>('semaine');
  const [customFrom, setCustomFrom] = useState(subtractDays(30));
  const [customTo, setCustomTo] = useState(today);

  const dateFrom =
    period === 'semaine' ? subtractDays(7)
    : period === 'mois' ? subtractDays(30)
    : period === 'annee' ? subtractDays(365)
    : customFrom;
  const dateTo = period === 'custom' ? customTo : today;

  // Le rapport doit refléter le travail réellement effectué sur la période, pas
  // seulement les consultations encore actives : GET /consultations exclut par
  // défaut les consultations archivées (termine=true), donc sans ce deuxième
  // appel le "taux de complétion" restait figé à 0% quel que soit le nombre de
  // consultations réellement terminées. Les deux appels sont scopés au médecin
  // connecté côté serveur (même filtre que le fil de travail et les notifications).
  const { data: actives = [], isLoading: loadingActives } = useAllConsultations({ dateFrom, dateTo, archived: false });
  const { data: archivees = [], isLoading: loadingArchivees } = useAllConsultations({ dateFrom, dateTo, archived: true });
  const isLoading = loadingActives || loadingArchivees;

  const consultations = useMemo(() => [...actives, ...archivees], [actives, archivees]);

  const stats = useMemo(() => {
    const total = consultations.length;
    const effectuees = consultations.filter((c) => c.statut === 'TERMINE').length;
    const enAttente = consultations.filter((c) => c.statut === 'EN_ATTENTE').length;
    const enCours = consultations.filter((c) => c.statut === 'EN_COURS').length;
    const enAttenteControle = consultations.filter((c) => c.statut === 'EN_ATTENTE_CONTROLE').length;
    const autres = total - effectuees - enAttente - enCours - enAttenteControle;
    const urgences = consultations.filter((c) => c.urgence).length;
    const initiaux = consultations.filter((c) => !c.typeVisite || c.typeVisite.toUpperCase() !== 'CONTROLE').length;
    const controles = total - initiaux;
    const tauxCompletion = total > 0 ? Math.round((effectuees / total) * 100) : 0;

    const days = Math.max(
      Math.round((new Date(dateTo).getTime() - new Date(dateFrom).getTime()) / (24 * 60 * 60 * 1000)) + 1,
      1
    );
    const moyParJour = (total / days).toFixed(1);

    return { total, effectuees, enAttente, enCours, enAttenteControle, autres, urgences, initiaux, controles, tauxCompletion, moyParJour };
  }, [consultations, dateFrom, dateTo]);

  const typeSegments: DonutSegment[] = [
    { label: 'Consultation initiale', value: stats.initiaux, strokeClass: 'stroke-[#005b82]', dotClass: 'bg-[#005b82]' },
    { label: 'Contrôle / Suivi', value: stats.controles, strokeClass: 'stroke-amber-400', dotClass: 'bg-amber-400' },
  ];

  const statutSegments: DonutSegment[] = [
    { label: 'Effectuées', value: stats.effectuees, strokeClass: 'stroke-emerald-500', dotClass: 'bg-emerald-500' },
    { label: 'En attente', value: stats.enAttente, strokeClass: 'stroke-amber-400', dotClass: 'bg-amber-400' },
    { label: 'En cours', value: stats.enCours, strokeClass: 'stroke-sky-500', dotClass: 'bg-sky-500' },
    { label: 'Contrôle en attente', value: stats.enAttenteControle, strokeClass: 'stroke-violet-500', dotClass: 'bg-violet-500' },
    { label: 'Autres (reportées…)', value: stats.autres, strokeClass: 'stroke-slate-300', dotClass: 'bg-slate-300' },
  ].filter((s) => s.value > 0);

  const doctorName = medecin ? `Dr. ${medecin.prenom} ${medecin.nom}` : '';

  const periodLabel =
    period === 'semaine' ? '7 derniers jours'
    : period === 'mois' ? '30 derniers jours'
    : period === 'annee' ? '365 derniers jours'
    : `Du ${customFrom} au ${customTo}`;

  return (
    <div className="min-h-full bg-slate-50">
      <div className="max-w-[1400px] mx-auto p-4 sm:p-6 lg:p-8 space-y-5">

        {/* Header */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#005b82] to-[#00415f] p-5 sm:p-6 text-white shadow-[0px_8px_24px_rgba(0,91,130,0.25)]">
          <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10" />
          <div className="absolute -right-2 bottom-0 h-16 w-16 rounded-full bg-white/10" />
          <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-white/80" />
                <h1 className="text-[22px] font-extrabold leading-tight">Rapport & Statistiques</h1>
              </div>
              <p className="text-[13px] text-white/70 mt-1">{doctorName} · Vos propres consultations uniquement · {periodLabel}</p>
            </div>
          </div>
        </div>

        {/* Period selector */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-[0px_4px_16px_rgba(17,17,26,0.04)] p-3 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1">
            {(['semaine', 'mois', 'annee', 'custom'] as Period[]).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPeriod(p)}
                className={cn(
                  'h-7 rounded-lg px-3 text-[12px] font-semibold transition-colors whitespace-nowrap',
                  period === p ? 'bg-white text-[#005b82] shadow-sm' : 'text-slate-500 hover:text-slate-700'
                )}
              >
                {p === 'semaine' ? 'Semaine' : p === 'mois' ? 'Mois' : p === 'annee' ? 'Année' : 'Personnalisé'}
              </button>
            ))}
          </div>

          {period === 'custom' && (
            <div className={cn(
              'flex h-9 items-center gap-1.5 rounded-xl border px-2.5 min-w-[220px]',
              'border-[#005b82]/40 bg-[#EAF3FA]'
            )}>
              <CalendarRange className="h-3.5 w-3.5 shrink-0 text-slate-400" />
              <input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="h-full min-w-0 flex-1 bg-transparent text-[12px] font-semibold text-slate-600 focus:outline-none"
              />
              <span className="shrink-0 text-slate-300">→</span>
              <input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="h-full min-w-0 flex-1 bg-transparent text-[12px] font-semibold text-slate-600 focus:outline-none"
              />
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 rounded-2xl bg-slate-200 animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            {/* KPI row */}
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
              <StatCard label="Total consultations" value={stats.total} sub={`Moy. ${stats.moyParJour}/jour`} accent="bg-[#005b82]" />
              <StatCard label="Taux de complétion" value={`${stats.tauxCompletion}%`} sub={`${stats.effectuees} effectuées`} accent="bg-emerald-500" />
              <StatCard label="En attente / reportées" value={stats.enAttente + stats.autres} accent="bg-amber-400" />
              <StatCard label="Urgences" value={stats.urgences} sub={`sur ${stats.total} consultations`} accent="bg-red-500" />
            </div>

            {/* Charts section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <ChartCard title="Répartition par type">
                {stats.total > 0 ? (
                  <DonutChart segments={typeSegments} centerValue={stats.total} centerLabel="total" />
                ) : (
                  <p className="text-[12px] text-slate-400 py-6 text-center">Aucune consultation sur cette période.</p>
                )}
              </ChartCard>

              <ChartCard title="Répartition par statut">
                {stats.total > 0 ? (
                  <DonutChart segments={statutSegments} centerValue={`${stats.tauxCompletion}%`} centerLabel="terminées" />
                ) : (
                  <p className="text-[12px] text-slate-400 py-6 text-center">Aucune consultation sur cette période.</p>
                )}
              </ChartCard>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
