"use client";

import { useMemo, useState } from 'react';
import { Search, CalendarRange, X, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAllConsultations } from '@/hooks/use-consultations';
import { getVisiteLabel, type ConsultationApi } from '@/lib/api/consultation';
import { PriseEnChargeBadge } from '@/components/patient-prise-en-charge-badge';

const formatDateKey = (value: string | Date) => {
  const d = value instanceof Date ? value : new Date(value);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const today = formatDateKey(new Date());
const thirtyDaysAgo = formatDateKey(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));

export default function ArchivePage() {
  const [dateFrom, setDateFrom] = useState(thirtyDaysAgo);
  const [dateTo, setDateTo] = useState(today);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<ConsultationApi | null>(null);

  const { data: consultations = [], isLoading } = useAllConsultations({ dateFrom, dateTo, archived: true });

  const archived = useMemo(() => {
    const q = search.trim().toLowerCase();
    return consultations
      .filter((c) => {
        if (!q) return true;
        const name = c.patient?.displayName ?? ([c.patient?.prenom, c.patient?.nom].filter(Boolean).join(' ') || 'Patient inconnu');
        const motif = c.motif ?? c.observation?.diagnostic ?? '';
        const dossier = c.patient?.dossier ?? c.patientId ?? '';
        const diagnostic = c.observation?.diagnosticRetenu ?? '';
        return (name + motif + diagnostic + dossier + c.heure + c.date).toLowerCase().includes(q);
      })
      .sort((a, b) => b.date.localeCompare(a.date) || b.heure.localeCompare(a.heure));
  }, [consultations, search]);

  return (
    <div className="min-h-full bg-slate-50">
      <div className="max-w-[1400px] mx-auto p-4 sm:p-6 lg:p-8 space-y-5">

        {/* Header */}
        <div>
          <h1 className="text-[22px] font-extrabold text-gray-900 leading-tight">Archive</h1>
          <p className="text-[13px] text-slate-500 mt-0.5">Historique des consultations terminées</p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-[0px_4px_16px_rgba(17,17,26,0.04)] p-3 space-y-2.5">
          <div className="flex flex-nowrap items-center gap-2 overflow-x-auto">
            <div className={cn(
              'flex h-9 items-center gap-1.5 rounded-xl border px-2.5 min-w-[200px] flex-1',
              (dateFrom || dateTo) ? 'border-[#005b82]/40 bg-[#EAF3FA]' : 'border-slate-200 bg-slate-50'
            )}>
              <CalendarRange className="h-3.5 w-3.5 shrink-0 text-slate-400" />
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="h-full min-w-0 flex-1 bg-transparent text-[12px] font-semibold text-slate-600 focus:outline-none"
              />
              <span className="shrink-0 text-slate-300">→</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="h-full min-w-0 flex-1 bg-transparent text-[12px] font-semibold text-slate-600 focus:outline-none"
              />
            </div>
            <div className="relative min-w-[180px] flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher..."
                className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-8 text-[12px] font-medium text-slate-700 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#005b82]/30"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-[0px_4px_16px_rgba(17,17,26,0.05)] overflow-hidden">
          <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
            <span className="text-[13px] font-extrabold text-slate-800">Consultations terminées</span>
            <span className="text-[12px] font-bold text-slate-400">{archived.length} résultat{archived.length !== 1 ? 's' : ''}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-gray-500">
                <tr>
                  <th className="px-4 py-3 font-semibold text-[12px] whitespace-nowrap">Date</th>
                  <th className="px-4 py-3 font-semibold text-[12px] whitespace-nowrap">Heure</th>
                  <th className="px-4 py-3 font-semibold text-[12px]">Patient</th>
                  <th className="px-4 py-3 font-semibold text-[12px] whitespace-nowrap">Type</th>
                  <th className="px-4 py-3 font-semibold text-[12px]">Motif / Diagnostic</th>
                  <th className="px-4 py-3 font-semibold text-[12px] whitespace-nowrap">Urgence</th>
                  <th className="px-4 py-3 font-semibold text-[12px] whitespace-nowrap"></th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-[13px] text-slate-400">Chargement…</td>
                  </tr>
                ) : archived.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-[13px] text-slate-400">
                      Aucune consultation terminée sur cette période.
                    </td>
                  </tr>
                ) : archived.map((c) => {
                  const dateLabel = new Date(c.date).toLocaleDateString('fr-FR');
                  const name = c.patient?.displayName ?? ([c.patient?.prenom, c.patient?.nom].filter(Boolean).join(' ') || 'Patient inconnu');
                  const visitLabel = getVisiteLabel(c);
                  const motif = c.motif ?? c.observation?.diagnosticRetenu ?? c.observation?.diagnostic ?? '—';
                  return (
                    <tr
                      key={c.id}
                      onClick={() => setSelected(c)}
                      className="border-t border-gray-100 hover:bg-slate-50 align-middle cursor-pointer"
                    >
                      <td className="px-4 py-3 whitespace-nowrap text-[12px] font-medium text-slate-600">{dateLabel}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-[12px] font-bold text-[#005b82]">{c.heure}</td>
                      <td className="px-4 py-3 max-w-[200px]">
                        <p className="text-[13px] font-semibold text-slate-800 truncate">{name}</p>
                        <p className="text-[11px] text-slate-400">{c.motif ?? '—'}</p>
                        <div className="mt-1"><PriseEnChargeBadge priseEnCharge={c.patient?.priseEnCharge} /></div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={cn(
                          'px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider',
                          c.typeVisite?.toUpperCase() === 'CONTROLE' || c.ordreControle
                            ? 'bg-amber-50 text-amber-700'
                            : 'bg-slate-100 text-slate-600'
                        )}>
                          {visitLabel}
                        </span>
                      </td>
                      <td className="px-4 py-3 max-w-[220px]">
                        <p className="text-[12px] text-slate-600 line-clamp-2">{motif}</p>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={cn(
                          'px-2.5 py-1 rounded-full text-[10px] font-bold uppercase',
                          c.urgence ? 'bg-red-50 text-red-700' : 'bg-slate-100 text-slate-500'
                        )}>
                          {c.urgence ? 'Urgence' : 'Normal'}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right">
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setSelected(c); }}
                          className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1.5 text-[11px] font-bold text-[#005b82] hover:bg-[#EAF3FA] transition-colors"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          Détail
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4 py-6"
          onClick={(e) => { if (e.target === e.currentTarget) setSelected(null); }}
        >
          <div className="w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-3xl bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-slate-100 bg-white px-6 py-5">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">
                  {new Date(selected.date).toLocaleDateString('fr-FR')} — {selected.heure}
                </p>
                <h2 className="mt-1 text-[17px] font-extrabold text-slate-900">
                  {selected.patient?.displayName ?? ([selected.patient?.prenom, selected.patient?.nom].filter(Boolean).join(' ') || 'Patient inconnu')}
                </h2>
                <div className="mt-2"><PriseEnChargeBadge priseEnCharge={selected.patient?.priseEnCharge} /></div>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-500 hover:bg-slate-50"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-5 px-6 py-6">
              {/* Infos patient */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {selected.patient?.sexe && (
                  <div className="rounded-2xl bg-slate-50 p-3">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Sexe</p>
                    <p className="mt-1 text-[13px] font-semibold text-slate-800">{selected.patient.sexe === 'M' ? 'Masculin' : selected.patient.sexe === 'F' ? 'Féminin' : selected.patient.sexe}</p>
                  </div>
                )}
                {selected.patient?.dateNaissance && (
                  <div className="rounded-2xl bg-slate-50 p-3">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Naissance</p>
                    <p className="mt-1 text-[13px] font-semibold text-slate-800">{new Date(selected.patient.dateNaissance).toLocaleDateString('fr-FR')}</p>
                  </div>
                )}
                <div className="rounded-2xl bg-slate-50 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Type de visite</p>
                  <p className="mt-1 text-[13px] font-semibold text-slate-800">{getVisiteLabel(selected)}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Urgence</p>
                  <p className={cn('mt-1 text-[13px] font-semibold', selected.urgence ? 'text-red-600' : 'text-slate-800')}>{selected.urgence ? 'Oui' : 'Non'}</p>
                </div>
              </div>

              {/* Motif */}
              {selected.motif && (
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">Motif de consultation</p>
                  <p className="rounded-2xl bg-slate-50 p-4 text-[13px] text-slate-700">{selected.motif}</p>
                </div>
              )}

              {/* Observation */}
              {(selected.observation?.diagnosticSuspicion || selected.observation?.diagnosticRetenu || selected.observation?.notes) && (
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">Observation clinique</p>
                  <div className="space-y-2">
                    {selected.observation?.diagnosticSuspicion && (
                      <div className="rounded-2xl bg-slate-50 p-4">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Suspicion diagnostique</p>
                        <p className="text-[13px] text-slate-700">{selected.observation.diagnosticSuspicion}</p>
                      </div>
                    )}
                    {selected.observation?.diagnosticRetenu && (
                      <div className="rounded-2xl bg-slate-50 p-4">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Diagnostic retenu</p>
                        <p className="text-[13px] text-slate-700">{selected.observation.diagnosticRetenu}</p>
                      </div>
                    )}
                    {selected.observation?.notes && (
                      <div className="rounded-2xl bg-slate-50 p-4">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Notes</p>
                        <p className="text-[13px] text-slate-700 whitespace-pre-wrap">{selected.observation.notes}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Paramètres cliniques */}
              {selected.parametresCliniques && selected.parametresCliniques.length > 0 && (
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">Paramètres cliniques</p>
                  <div className="flex flex-wrap gap-2">
                    {selected.parametresCliniques.map((p, i) => (
                      <span key={p.id ?? i} className="rounded-full bg-[#EAF3FA] px-3 py-1.5 text-[12px] font-semibold text-[#005b82]">
                        {p.nom} : {p.valeur} {p.unite ?? ''}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Prescriptions non médicamenteuses */}
              {selected.nonMedicamentPrescriptions && selected.nonMedicamentPrescriptions.length > 0 && (
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">Prescriptions non médicamenteuses</p>
                  <div className="space-y-2">
                    {selected.nonMedicamentPrescriptions.map((nm, i) => (
                      <div key={nm.id ?? i} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm space-y-1.5">
                        {nm.recommandationsNotes && <p className="text-[13px] text-slate-700"><span className="font-bold">Recommandations : </span>{nm.recommandationsNotes}</p>}
                        {nm.rdvMotif && (
                          <p className="text-[13px] text-slate-700">
                            <span className="font-bold">Contrôle : </span>{nm.rdvMotif}
                            {nm.rdvDate && ` — ${new Date(nm.rdvDate).toLocaleDateString('fr-FR')}`}
                            {nm.rdvNiveau && ` (${nm.rdvNiveau})`}
                          </p>
                        )}
                        {(nm.examenService || nm.examenMotif) && (
                          <p className="text-[13px] text-slate-700">
                            <span className="font-bold">Examen paraclinique : </span>
                            {[nm.examenService, nm.examenMotif].filter(Boolean).join(' — ')}
                            {nm.examenPriorite && ` (${nm.examenPriorite})`}
                          </p>
                        )}
                        {nm.hospitalisationMotif && (
                          <p className="text-[13px] text-slate-700">
                            <span className="font-bold">Hospitalisation : </span>
                            {nm.hospitalisationMotif}
                            {nm.hospitalisationService && ` — ${nm.hospitalisationService}`}
                            {nm.hospitalisationStatus && ` (${nm.hospitalisationStatus})`}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
