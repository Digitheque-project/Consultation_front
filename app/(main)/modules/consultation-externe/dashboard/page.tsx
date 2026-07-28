"use client";

import { useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Calendar, CheckCircle2, Clock, AlertTriangle, ClipboardList, Archive, BarChart2, ArrowRight, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAllConsultations, useConsultationEventsSubscription } from '@/hooks/use-consultations';
import { useAuth } from '@/context/AuthContext';
import { consultationApi, getVisiteLabel, type ConsultationApi } from '@/lib/api/consultation';
import { Badge } from '@/components/ui/badge';
import { SwitchServiceButton } from '@/components/switch-service-button';

const formatDateKey = (value: string | Date) => {
  const d = value instanceof Date ? value : new Date(value);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const today = formatDateKey(new Date());

const todayLabel = new Date().toLocaleDateString('fr-FR', {
  weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
});

function KpiCard({ icon: Icon, label, value, sub, color }: { icon: React.ElementType; label: string; value: number; sub?: string; color: string }) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-[0px_4px_16px_rgba(17,17,26,0.05)] border border-gray-100 flex items-center gap-4">
      <div className={cn('flex h-11 w-11 items-center justify-center rounded-xl shrink-0', color)}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{label}</p>
        <p className="text-2xl font-black text-slate-800 leading-tight">{value < 10 ? `0${value}` : value}</p>
        {sub && <p className="text-[10px] text-slate-400 font-medium mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const { medecin } = useAuth();
  useConsultationEventsSubscription();

  // Toutes les consultations actives (non terminées)
  const { data: allActive = [], isLoading } = useAllConsultations();
  // Toutes les consultations terminées (archive)
  const { data: allArchived = [] } = useAllConsultations({ archived: true });

  const stats = useMemo(() => {
    const total = allActive.length;
    const todayCount = allActive.filter((c) => formatDateKey(c.date) === today).length;
    const enAttente = allActive.filter((c) => c.statut === 'EN_ATTENTE').length;
    const enCours = allActive.filter((c) => c.statut === 'EN_COURS').length;
    const urgences = allActive.filter((c) => c.urgence).length;
    const effectuees = allArchived.length;
    return { total, todayCount, enAttente, enCours, urgences, effectuees };
  }, [allActive, allArchived]);

  // Prochaines consultations : urgences toujours en tête, le reste trié de la
  // plus récente à la plus ancienne (création de la consultation).
  const upcomingPatients = useMemo(() => {
    return [...allActive]
      .sort((a, b) => {
        const aUrgent = a.urgence ? 0 : 1;
        const bUrgent = b.urgence ? 0 : 1;
        if (aUrgent !== bUrgent) return aUrgent - bUrgent;
        const aTime = new Date(a.createdAt ?? `${a.date}T${a.heure}`).getTime();
        const bTime = new Date(b.createdAt ?? `${b.date}T${b.heure}`).getTime();
        return bTime - aTime;
      })
      .slice(0, 6);
  }, [allActive]);

  const doctorName = medecin ? `Dr. ${medecin.prenom} ${medecin.nom}` : '';

  // Marque la consultation comme démarrée puis redirige vers la page traitement —
  // même comportement que le bouton "Ouvrir" du fil de travail.
  const handleStart = async (c: ConsultationApi) => {
    const isControl =
      c.typeVisite?.toUpperCase() === 'CONTROLE' ||
      (c.ordreControle !== null && c.ordreControle !== undefined) ||
      (c.consultationParenteId !== null && c.consultationParenteId !== undefined);

    try {
      await consultationApi.traiterConsultation(c.id, 'ouvrir');
    } catch (error) {
      console.error('Impossible de marquer la consultation comme en cours:', error);
    }

    try {
      const consultationDetails = await consultationApi.getConsultationById(c.id);
      const redirectResponse = await fetch('/api/redirect/traitement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          consultationId: c.id,
          patientId: consultationDetails.patientId,
          from: isControl ? 'controle' : 'prescription',
          origin: 'dashboard',
        }),
      });

      if (redirectResponse.ok) {
        const data = await redirectResponse.json();
        router.push(data.redirectUrl);
      } else {
        const mode = isControl ? '&mode=controle' : '';
        router.push(`/modules/consultation-externe/traitement?id=${c.id}${mode}&origin=dashboard`);
      }
    } catch (error) {
      console.error('Erreur réseau:', error);
      const mode = isControl ? '&mode=controle' : '';
      router.push(`/modules/consultation-externe/traitement?id=${c.id}${mode}&origin=dashboard`);
    }
  };

  return (
    <div className="min-h-full bg-slate-50">
      <div className="max-w-[1400px] mx-auto p-4 sm:p-6 lg:p-8 space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h1 className="text-[22px] font-extrabold text-gray-900 leading-tight">Tableau de bord</h1>
            <p className="text-[13px] text-slate-500 mt-0.5 capitalize">{doctorName} · {todayLabel}</p>
          </div>
          <SwitchServiceButton />
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          <KpiCard
            icon={Calendar}
            label="Total planifiées"
            value={stats.total}
            sub={stats.todayCount > 0 ? `dont ${stats.todayCount} aujourd'hui` : 'aucune aujourd\'hui'}
            color="bg-blue-50 text-blue-600"
          />
          <KpiCard icon={CheckCircle2} label="Effectuées" value={stats.effectuees} color="bg-emerald-50 text-emerald-600" />
          <KpiCard icon={Clock} label="En attente" value={stats.enAttente} color="bg-amber-50 text-amber-600" />
          <KpiCard icon={AlertTriangle} label="Urgences actives" value={stats.urgences} color="bg-red-50 text-red-600" />
        </div>

        {/* Main content */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

          {/* Prochaines consultations */}
          <div className="xl:col-span-2 bg-white rounded-2xl shadow-[0px_4px_16px_rgba(17,17,26,0.05)] border border-gray-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="text-[14px] font-extrabold text-slate-800">Prochaines consultations</h2>
                {stats.todayCount > 0 && (
                  <p className="text-[11px] text-[#005b82] font-semibold mt-0.5">{stats.todayCount} prévue{stats.todayCount > 1 ? 's' : ''} aujourd'hui</p>
                )}
              </div>
              <Link href="/modules/consultation-externe" className="text-[12px] font-bold text-[#005b82] hover:underline flex items-center gap-1">
                Voir tout <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            {isLoading ? (
              <div className="p-6 space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-12 rounded-xl bg-slate-100 animate-pulse" />
                ))}
              </div>
            ) : upcomingPatients.length === 0 ? (
              <div className="p-10 text-center text-[13px] text-slate-400 font-medium">
                Aucune consultation planifiée.
              </div>
            ) : (
              <div className="p-3 space-y-1">
                {upcomingPatients.map((c) => {
                  const name = c.patient?.displayName ?? ([c.patient?.prenom, c.patient?.nom].filter(Boolean).join(' ') || 'Patient inconnu');
                  const visitLabel = getVisiteLabel(c);
                  const isToday = formatDateKey(c.date) === today;
                  const dateLabel = isToday
                    ? "Aujourd'hui"
                    : new Date(c.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
                  const priseEnCharge = c.patient?.priseEnCharge;
                  return (
                    <div
                      key={c.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => handleStart(c)}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleStart(c); } }}
                      className={cn(
                        "flex items-center gap-4 rounded-xl px-3 py-3 border-l-[6px] transition-colors cursor-pointer",
                        priseEnCharge
                          ? (priseEnCharge.isActive ? "bg-[#EAF3FA] hover:bg-[#daeaf5] border-[#005b82]" : "bg-amber-50 hover:bg-amber-100 border-amber-500")
                          : "hover:bg-slate-50 border-transparent"
                      )}
                    >
                      <div className="flex flex-col items-center min-w-[52px]">
                        <span className={cn('text-[11px] font-bold uppercase', isToday ? 'text-[#005b82]' : 'text-slate-400')}>
                          {dateLabel}
                        </span>
                        <span className={cn('text-[14px] font-bold', c.urgence ? 'text-red-600' : 'text-slate-700')}>{c.heure}</span>
                      </div>
                      <div className="h-9 w-9 rounded-xl bg-slate-50 flex items-center justify-center shrink-0">
                        <User className="w-4 h-4 text-slate-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold text-slate-800 truncate">{name}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-1.5">
                          <Badge className="border-none px-2 py-0.5 rounded-full font-semibold text-[9px] uppercase tracking-wider bg-slate-100 text-slate-700">
                            {visitLabel}
                          </Badge>
                          {c.motif && <span className="text-[11px] text-slate-400 truncate max-w-[180px]">{c.motif}</span>}
                        </div>
                        {priseEnCharge && (
                          <p
                            title={priseEnCharge.isActive ? `Pris en charge — ${priseEnCharge.companyName}` : `Prise en charge inactive — ${priseEnCharge.companyName}`}
                            className={cn(
                              "mt-0.5 text-[10px] font-bold truncate",
                              priseEnCharge.isActive ? "text-[#005b82]" : "text-amber-600"
                            )}
                          >
                            {priseEnCharge.companyName}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        {c.urgence && (
                          <Badge className="border-none px-2.5 py-1 rounded-full font-bold text-[9px] uppercase tracking-wider bg-red-50 text-red-700">
                            Urgence
                          </Badge>
                        )}
                        <Badge className={cn(
                          'border-none px-2.5 py-1 rounded-full font-bold text-[10px] uppercase tracking-wider',
                          c.statut === 'EN_COURS' ? 'bg-amber-50 text-amber-700' :
                          c.arriveeAccueil ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                        )}>
                          {c.statut === 'EN_COURS' ? 'En cours' : c.arriveeAccueil ? 'Arrivé' : 'En attente'}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Quick Access */}
          <div className="space-y-4">
            <div className="bg-white rounded-2xl shadow-[0px_4px_16px_rgba(17,17,26,0.05)] border border-gray-100 p-5">
              <h3 className="text-[11px] font-extrabold text-[#005b82] uppercase tracking-[0.1em] mb-4">Navigation rapide</h3>
              <div className="space-y-2">
                <Link href="/modules/consultation-externe" className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[#EAF3FA] hover:bg-[#daeaf5] transition-colors group">
                  <ClipboardList className="w-4 h-4 text-[#005b82]" />
                  <span className="text-[13px] font-bold text-[#005b82]">Fil de travail</span>
                  <ArrowRight className="w-3.5 h-3.5 text-[#005b82] ml-auto opacity-60 group-hover:opacity-100" />
                </Link>
                <Link href="/modules/consultation-externe/planning-complet" className="flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors group">
                  <Calendar className="w-4 h-4 text-slate-500" />
                  <span className="text-[13px] font-bold text-slate-700">Planning complet</span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400 ml-auto opacity-60 group-hover:opacity-100" />
                </Link>
                <Link href="/modules/consultation-externe/archive" className="flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors group">
                  <Archive className="w-4 h-4 text-slate-500" />
                  <span className="text-[13px] font-bold text-slate-700">Archive</span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400 ml-auto opacity-60 group-hover:opacity-100" />
                </Link>
                <Link href="/modules/consultation-externe/rapport" className="flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors group">
                  <BarChart2 className="w-4 h-4 text-slate-500" />
                  <span className="text-[13px] font-bold text-slate-700">Rapport</span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400 ml-auto opacity-60 group-hover:opacity-100" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
