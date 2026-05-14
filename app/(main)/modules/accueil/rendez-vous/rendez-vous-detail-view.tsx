'use client';

import {
	AlertCircle,
	CheckCircle2,
	Clock,
	Hourglass,
	Phone,
	Stethoscope,
} from 'lucide-react';
import {
	type RdvStatut,
	type RendezVousMock,
	patientColor,
	rdvDisplayName,
} from '@/lib/data/accueil-rendez-vous-mock';
import { RendezVousBackButton } from './rendez-vous-back-button';
import { cn } from '@/lib/utils';

type RendezVousDetailViewProps = Readonly<{
	rdv: RendezVousMock;
}>;

function heureMinutesAvant(heure: string, minutes: number): string {
	const [h, m] = heure.split(':').map(Number);
	let total = h * 60 + m - minutes;
	if (total < 0) total += 24 * 60;
	const hh = Math.floor(total / 60) % 24;
	const mm = total % 60;
	return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

function demoCoordonnees(patientId: string): { age: number; genre: string; telephone: string } {
	const n = parseInt(patientId.replace(/\D/g, '') || '0', 10);
	const age = 22 + (n % 55);
	const genre = n % 3 === 0 ? 'Masculin' : n % 3 === 1 ? 'Féminin' : 'Autre';
	const a = (n % 80) + 10;
	const b = (n % 900) + 100;
	const c = (n % 90) + 10;
	const telephone = `+261 34 ${String(a).padStart(2, '0')} ${String(b).padStart(3, '0')} ${String(c).padStart(2, '0')}`;
	return { age, genre, telephone };
}

function prioriteFromMotif(motif: string): { label: string; dotCls: string; pillCls: string } {
	if (/fièvre|avc|douleur|urgence|choc/i.test(motif)) {
		return {
			label: 'Élevée',
			dotCls: 'bg-red-500',
			pillCls: 'bg-red-50 text-red-700',
		};
	}
	return {
		label: 'Standard',
		dotCls: 'bg-gray-400',
		pillCls: 'bg-gray-100 text-gray-600',
	};
}

function journeyIndex(statut: RdvStatut): number {
	switch (statut) {
		case 'PLANIFIÉ': return -1;
		case 'EN ATTENTE': return 1;
		case 'EN COURS': return 2;
		case 'TERMINÉ': return 3;
		default: return -1;
	}
}

function trackWidthClass(statut: RdvStatut): string {
	switch (statut) {
		case 'PLANIFIÉ': return 'w-0';
		case 'EN ATTENTE': return 'w-[28%]';
		case 'EN COURS': return 'w-[62%]';
		case 'TERMINÉ': return 'w-full';
		default: return 'w-0';
	}
}

type StepKey = 'arrivee' | 'attente' | 'consult' | 'termine';

const STEPS: { key: StepKey; label: string; Icon: typeof CheckCircle2 }[] = [
	{ key: 'arrivee',  label: 'Arrivé',           Icon: CheckCircle2 },
	{ key: 'attente',  label: 'En attente',        Icon: Hourglass },
	{ key: 'consult',  label: 'En consultation',   Icon: Stethoscope },
	{ key: 'termine',  label: 'Terminé',           Icon: CheckCircle2 },
];

export function RendezVousDetailView({ rdv }: RendezVousDetailViewProps) {
	const color   = patientColor(rdv.patientId);
	const extras  = demoCoordonnees(rdv.patientId);
	const priorite = prioriteFromMotif(rdv.motif);
	const active   = journeyIndex(rdv.statut);

	const heureArrivee =
		rdv.statut === 'PLANIFIÉ' ? null : heureMinutesAvant(rdv.heure, 15);

	const dateCourt = new Date(rdv.date).toLocaleDateString('fr-FR', {
		day: 'numeric',
		month: 'long',
		year: 'numeric',
	});

	const dossierBadge =
		rdv.statut === 'TERMINÉ'
			? { label: 'Clôturé', cls: 'bg-gray-100 text-gray-600' }
			: { label: 'Actif',   cls: 'bg-emerald-50 text-emerald-700' };

	return (
		<div className="flex-1 overflow-auto bg-gray-50 p-4 sm:p-6 lg:p-8">
			<div className="mx-auto max-w-5xl space-y-5">

				{/* ── En-tête ── */}
				<div className="flex items-center gap-3">
					<RendezVousBackButton variant="icon" />
					<h1 className="text-xl font-medium text-gray-900">
						Dossier de consultation
					</h1>
				</div>

				{/* ── Grille principale ── */}
				<div className="grid grid-cols-1 gap-5 lg:grid-cols-12">

					{/* ── Identité ── */}
					<div className="lg:col-span-4">
						<div className="h-full rounded-2xl border border-gray-100 bg-white p-6">

							{/* Avatar + nom */}
							<div className="mb-5 flex items-start gap-3">
								<div
									className={cn(
										'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sm font-medium',
										color.bg,
										color.text,
									)}
								>
									{rdv.initials}
								</div>
								<div className="min-w-0">
									<div className="flex flex-wrap items-center gap-2">
										<span className="text-base font-medium text-gray-900">
											{rdvDisplayName(rdv)}
										</span>
										<span className={cn('rounded-full px-2.5 py-0.5 text-xs font-medium', dossierBadge.cls)}>
											{dossierBadge.label}
										</span>
									</div>
									<p className="mt-0.5 font-mono text-xs text-gray-400">{rdv.patientId}</p>
									<p className="font-mono text-[10px] text-gray-300">{rdv.id}</p>
								</div>
							</div>

							{/* Âge / Genre */}
							<div className="mb-5 grid grid-cols-2 gap-4">
								<div>
									<p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-gray-400">Âge</p>
									<p className="text-sm font-medium text-gray-900">{extras.age} ans</p>
								</div>
								<div>
									<p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-gray-400">Genre</p>
									<p className="text-sm font-medium text-gray-900">{extras.genre}</p>
								</div>
							</div>

							{/* Séparateur */}
							<div className="mb-5 h-px bg-gray-100" />

							{/* Téléphone */}
							<p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-gray-400">Coordonnées</p>
							<div className="flex items-center gap-3 rounded-xl bg-gray-50 px-4 py-3">
								<Phone className="h-4 w-4 shrink-0 text-gray-400" />
								<span className="text-sm font-medium text-gray-700">{extras.telephone}</span>
							</div>
						</div>
					</div>

					{/* ── Colonne droite ── */}
					<div className="space-y-5 lg:col-span-8">

						{/* Contexte clinique + Programmation */}
						<div className="grid grid-cols-1 gap-5 md:grid-cols-2">

							{/* Contexte clinique */}
							<div className="rounded-2xl border border-gray-100 bg-white p-6">
								<div className="mb-4 flex items-center gap-2">
									<AlertCircle className="h-4 w-4 text-amber-500" />
									<h3 className="text-sm font-medium text-gray-900">Contexte clinique</h3>
								</div>

								<div className="mb-4 rounded-xl bg-gray-50 p-4">
									<p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-gray-400">
										Motif principal
									</p>
									<p className="text-sm font-medium leading-snug text-gray-900">{rdv.motif}</p>
								</div>

								<p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-gray-400">
									Priorité
								</p>
								<span className={cn('inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium', priorite.pillCls)}>
									<span className={cn('h-1.5 w-1.5 rounded-full', priorite.dotCls)} />
									{priorite.label}
								</span>
							</div>

							{/* Programmation */}
							<div className="rounded-2xl border border-gray-100 bg-white p-6">
								<div className="mb-4 flex items-center gap-2">
									<Clock className="h-4 w-4 text-blue-500" />
									<h3 className="text-sm font-medium text-gray-900">Programmation</h3>
								</div>

								<div className="mb-4 flex items-end justify-between gap-4">
									<div>
										<p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-gray-400">Date</p>
										<p className="text-sm font-medium capitalize text-gray-900">{dateCourt}</p>
									</div>
									<div className="text-right">
										<p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-gray-400">Heure</p>
										<p className="text-sm font-medium text-gray-900">{rdv.heure}</p>
									</div>
								</div>

								<div className="h-px bg-gray-100" />
								<div className="pt-4">
									<p className="text-sm font-medium text-gray-900">{rdv.medecin}</p>
									<p className="mt-0.5 text-xs text-gray-500">{rdv.service}</p>
								</div>
							</div>
						</div>
					</div>
				</div>

				{/* ── Parcours patient ── */}
				<div className="rounded-2xl border border-gray-100 bg-white p-6 sm:p-8">
					<h3 className="mb-7 text-sm font-medium text-gray-900">Parcours du patient</h3>

					<div className="relative flex items-start justify-between gap-1">
						{/* Ligne de fond */}
						<div className="absolute left-0 right-0 top-5 h-0.5 bg-gray-100" />
						{/* Ligne de progression */}
						<div
							className={cn(
								'absolute left-0 top-5 h-0.5 bg-blue-500 transition-all duration-500',
								trackWidthClass(rdv.statut),
							)}
						/>

						{STEPS.map((step, i) => {
							const allDone  = rdv.statut === 'TERMINÉ';
							const done     = allDone || active > i;
							const current  = !allDone && active === i;
							const isAmber  = step.key === 'attente';
							const StepIcon = done ? CheckCircle2 : step.Icon;

							const circleCls = done
								? 'bg-blue-500 text-white'
								: current
									? isAmber
										? 'bg-amber-50 text-amber-500 ring-2 ring-amber-200'
										: 'bg-blue-50 text-blue-600 ring-2 ring-blue-100'
									: 'bg-gray-100 text-gray-400';

							const labelCls = done
								? 'text-gray-700'
								: current
									? isAmber ? 'text-amber-600' : 'text-blue-600'
									: 'text-gray-400';

							const sub =
								step.key === 'arrivee' && heureArrivee ? heureArrivee :
								step.key === 'arrivee' && !heureArrivee ? '—' :
								'';

							return (
								<div
									key={step.key}
									className="relative z-10 flex max-w-[24%] flex-1 flex-col items-center"
								>
									<div
										className={cn(
											'mb-2.5 flex h-10 w-10 items-center justify-center rounded-full',
											circleCls,
										)}
									>
										<StepIcon className="h-4 w-4 sm:h-5 sm:w-5" />
									</div>
									<p className={cn('text-center text-[10px] font-medium leading-tight', labelCls)}>
										{step.label}
										{sub && (
											<>
												<br />
												<span className="font-normal text-gray-400">{sub}</span>
											</>
										)}
									</p>
								</div>
							);
						})}
					</div>
				</div>

			</div>
		</div>
	);
}