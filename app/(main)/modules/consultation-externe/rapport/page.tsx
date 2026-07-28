"use client";

import { useMemo, useState } from 'react';
import { CalendarRange } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAllConsultations } from '@/hooks/use-consultations';
import { useAuth } from '@/context/AuthContext';

const formatDateKey = (value: string | Date) => {
  const d = value instanceof Date ? value : new Date(value);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const today = formatDateKey(new Date());

const subtractDays = (days: number) => formatDateKey(new Date(Date.now() - days * 24 * 60 * 60 * 1000));

type Period = 'semaine' | 'mois' | 'annee' | 'custom';

function BarRow({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="text-[12px] font-medium text-slate-600 w-36 shrink-0">{label}</span>
      <div className="flex-1 h-2.5 rounded-full bg-slate-100 overflow-hidden">
        <div className={cn('h-full rounded-full transition-all', color)} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[12px] font-bold text-slate-700 w-16 text-right shrink-0">{count} ({pct}%)</span>
    </div>
  );
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-[0px_4px_16px_rgba(17,17,26,0.05)]">
      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">{label}</p>
      <p className="text-3xl font-black text-[#005b82] leading-none">{value}</p>
      {sub && <p className="text-[11px] text-slate-400 mt-1">{sub}</p>}
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

  const { data: consultations = [], isLoading } = useAllConsultations({ dateFrom, dateTo });

  const stats = useMemo(() => {
    const total = consultations.length;
    const effectuees = consultations.filter((c) => c.termine || c.statut === 'TERMINE').length;
    const enAttente = consultations.filter((c) => !c.termine && c.statut === 'EN_ATTENTE').length;
    const urgences = consultations.filter((c) => c.urgence).length;
    const initiaux = consultations.filter((c) => !c.typeVisite || c.typeVisite.toUpperCase() !== 'CONTROLE').length;
    const controles = consultations.filter((c) => c.typeVisite?.toUpperCase() === 'CONTROLE' || !!c.ordreControle).length;
    const tauxCompletion = total > 0 ? Math.round((effectuees / total) * 100) : 0;

    const days = Math.max(
      Math.round((new Date(dateTo).getTime() - new Date(dateFrom).getTime()) / (24 * 60 * 60 * 1000)) + 1,
      1
    );
    const moyParJour = (total / days).toFixed(1);

    return { total, effectuees, enAttente, urgences, initiaux, controles, tauxCompletion, moyParJour };
  }, [consultations, dateFrom, dateTo]);

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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-[22px] font-extrabold text-gray-900 leading-tight">Rapport & Statistiques</h1>
            <p className="text-[13px] text-slate-500 mt-0.5">{doctorName} · {periodLabel}</p>
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
              <StatCard label="Total consultations" value={stats.total} sub={`Moy. ${stats.moyParJour}/jour`} />
              <StatCard label="Taux de complétion" value={`${stats.tauxCompletion}%`} sub={`${stats.effectuees} effectuées`} />
              <StatCard label="En attente / reportées" value={stats.enAttente} />
              <StatCard label="Urgences" value={stats.urgences} sub={`sur ${stats.total} consultations`} />
            </div>

            {/* Charts section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

              {/* Par type */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-[0px_4px_16px_rgba(17,17,26,0.05)] p-5 space-y-4">
                <h3 className="text-[13px] font-extrabold text-slate-800">Répartition par type</h3>
                <div className="space-y-3">
                  <BarRow label="Consultation initiale" count={stats.initiaux} total={stats.total} color="bg-[#005b82]" />
                  <BarRow label="Contrôle / Suivi" count={stats.controles} total={stats.total} color="bg-amber-400" />
                </div>
              </div>

              {/* Par statut */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-[0px_4px_16px_rgba(17,17,26,0.05)] p-5 space-y-4">
                <h3 className="text-[13px] font-extrabold text-slate-800">Répartition par statut</h3>
                <div className="space-y-3">
                  <BarRow label="Effectuées" count={stats.effectuees} total={stats.total} color="bg-emerald-500" />
                  <BarRow label="En attente" count={stats.enAttente} total={stats.total} color="bg-amber-400" />
                  <BarRow label="Urgences" count={stats.urgences} total={stats.total} color="bg-red-500" />
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
