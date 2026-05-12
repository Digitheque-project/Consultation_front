'use client';

import {
	AlertCircle,
	Calendar,
	CheckCircle2,
	Clock,
	Hourglass,
	Phone,
	UserCheck,
} from 'lucide-react';
import {
	type RdvStatut,
	type RendezVousMock,
	patientColor,
	rdvDisplayName,
	STATUT_CONFIG,
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

function prioriteFromMotif(motif: string): { label: string; dot: string; pill: string } {
	if (/fièvre|avc|douleur|urgence|choc/i.test(motif)) {
		return {
			label: 'Élevée',
			dot: 'bg-rose-500',
			pill: 'border border-rose-200 bg-rose-50 text-rose-800',
		};
	}
	return {
		label: 'Standard',
		dot: 'bg-gray-400',
		pill: 'bg-gray-100 text-gray-700',
	};
}

function headerSessionBadge(statut: RdvStatut): {
	label: string;
	pulse: boolean;
	dot: string;
	wrap: string;
} {
	switch (statut) {
		case 'PLANIFIÉ':
			return {
				label: 'RDV planifié',
				pulse: true,
				dot: 'bg-blue-500',
				wrap: 'bg-white shadow-sm ring-1 ring-gray-100',
			};
		case 'EN ATTENTE':
			return {
				label: 'Patient en salle',
				pulse: true,
				dot: 'bg-amber-500',
				wrap: 'bg-white shadow-sm ring-1 ring-amber-100/80',
			};
		case 'EN COURS':
			return {
				label: 'Consultation en cours',
				pulse: true,
				dot: 'bg-blue-600',
				wrap: 'bg-white shadow-sm ring-1 ring-blue-100',
			};
		case 'TERMINÉ':
			return {
				label: 'Séance terminée',
				pulse: false,
				dot: 'bg-emerald-500',
				wrap: 'bg-white shadow-sm ring-1 ring-emerald-100',
			};
	}
}

function journeyIndex(statut: RdvStatut): number {
	switch (statut) {
		case 'PLANIFIÉ':
			return -1;
		case 'EN ATTENTE':
			return 1;
		case 'EN COURS':
			return 2;
		case 'TERMINÉ':
			return 3;
		default:
			return -1;
	}
}

function lineWidthClass(statut: RdvStatut): string {
	switch (statut) {
		case 'PLANIFIÉ':
			return 'w-0';
		case 'EN ATTENTE':
			return 'w-[28%]';
		case 'EN COURS':
			return 'w-[62%]';
		case 'TERMINÉ':
			return 'w-full';
		default:
			return 'w-0';
	}
}

type StepKey = 'arrivee' | 'attente' | 'consult' | 'termine';

const STEPS: { key: StepKey; label: string; Icon: typeof CheckCircle2 }[] = [
	{ key: 'arrivee', label: 'ARRIVÉ', Icon: CheckCircle2 },
	{ key: 'attente', label: 'EN ATTENTE', Icon: Hourglass },
	{ key: 'consult', label: 'EN CONSULTATION', Icon: UserCheck },
	{ key: 'termine', label: 'TERMINÉ', Icon: CheckCircle2 },
];

export function RendezVousDetailView({ rdv }: RendezVousDetailViewProps) {
	const cfg = STATUT_CONFIG[rdv.statut];
	const color = patientColor(rdv.patientId);
	const extras = demoCoordonnees(rdv.patientId);
	const priorite = prioriteFromMotif(rdv.motif);
	const session = headerSessionBadge(rdv.statut);
	const active = journeyIndex(rdv.statut);
	const heureArrivee =
		rdv.statut === 'PLANIFIÉ' ? null : heureMinutesAvant(rdv.heure, 15);

	const dateCourt = new Date(rdv.date).toLocaleDateString('fr-FR', {
		day: 'numeric',
		month: 'long',
		year: 'numeric',
	});
	const dateAvecHeure = `${dateCourt} • ${rdv.heure}`;

	const dossierBadge =
		rdv.statut === 'TERMINÉ'
			? { label: 'Clôturé', cls: 'bg-gray-100 text-gray-700 ring-1 ring-gray-200/80' }
			: { label: 'ACTIF', cls: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/80' };

	return (
		<div className="flex-1 overflow-auto bg-gradient-to-b from-gray-50 to-gray-100/90 p-4 sm:p-6 lg:p-8">
			<div className="mx-auto max-w-7xl">
				{/* En-tête */}
				<div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-center sm:justify-between">
					<div className="flex min-w-0 items-center gap-2 sm:gap-3">
						<RendezVousBackButton variant="icon" />
						<h1 className="truncate text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
							Dossier de consultation
						</h1>
					</div>
					<div
						className={cn(
							'inline-flex w-fit items-center gap-2 rounded-2xl px-4 py-2.5',
							session.wrap,
						)}
					>
						<div
							className={cn(
								'h-2 w-2 shrink-0 rounded-full',
								session.dot,
								session.pulse && 'animate-pulse',
							)}
						/>
						<span className="text-sm font-medium text-gray-800">{session.label}</span>
					</div>
				</div>

				<div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:gap-8">
					{/* Colonne identité */}
					<div className="space-y-6 lg:col-span-4">
						<div className="rounded-2xl border border-gray-100/80 bg-white p-6 shadow-sm shadow-gray-200/40 ring-1 ring-gray-100">
							<div className="mb-6 flex items-start justify-between gap-3">
								<div className="flex min-w-0 items-center gap-3">
									<div
										className={cn(
											'flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-sm font-bold',
											color.bg,
											color.text,
										)}
									>
										{rdv.initials}
									</div>
									<div className="min-w-0">
										<div className="flex flex-wrap items-center gap-2">
											<span className="truncate text-lg font-semibold text-gray-900 sm:text-xl">
												{rdvDisplayName(rdv)}
											</span>
											<span
												className={cn(
													'shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold',
													dossierBadge.cls,
												)}
											>
												{dossierBadge.label}
											</span>
										</div>
										<p className="mt-0.5 truncate text-sm text-gray-500">
											ID : {rdv.patientId}
										</p>
										<p className="mt-1 font-mono text-xs text-gray-400">{rdv.id}</p>
									</div>
								</div>
							</div>

							<div className="grid grid-cols-2 gap-6 text-sm">
								<div>
									<p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
										Âge
									</p>
									<p className="font-semibold text-gray-900">{extras.age} ans</p>
								</div>
								<div>
									<p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
										Genre
									</p>
									<p className="font-semibold text-gray-900">{extras.genre}</p>
								</div>
							</div>

							<div className="mt-6 border-t border-gray-100 pt-6">
								<p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
									Coordonnées
								</p>
								<div className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50/80 p-4">
									<Phone className="h-5 w-5 shrink-0 text-gray-400" />
									<span className="font-medium text-gray-800">{extras.telephone}</span>
								</div>
							</div>
						</div>
					</div>

					{/* Colonne principale */}
					<div className="space-y-6 lg:col-span-8">
						<div className="flex flex-col justify-between gap-4 rounded-2xl border border-gray-100/80 bg-white p-5 shadow-sm shadow-gray-200/40 ring-1 ring-gray-100 sm:flex-row sm:items-center sm:p-6">
							<div className="flex items-center gap-4">
								<div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 ring-1 ring-blue-100">
									<Calendar className="h-6 w-6" />
								</div>
								<div>
									<p className="text-sm text-gray-500">Statut du rendez-vous</p>
									<p className="text-lg font-semibold text-gray-900">{cfg.label}</p>
								</div>
							</div>
							<div className="text-left sm:text-right">
								<p className="text-sm text-gray-500">Créneau</p>
								<p className="text-sm font-medium capitalize text-gray-800">
									{dateAvecHeure}
								</p>
							</div>
						</div>

						<div className="grid grid-cols-1 gap-6 md:grid-cols-2">
							<div className="rounded-2xl border border-gray-100/80 bg-white p-6 shadow-sm shadow-gray-200/40 ring-1 ring-gray-100">
								<div className="mb-4 flex items-center gap-2">
									<AlertCircle className="h-5 w-5 text-amber-500" />
									<h3 className="font-semibold text-gray-900">Contexte clinique</h3>
								</div>
								<div className="mb-4 rounded-xl border border-blue-100 bg-gradient-to-br from-blue-50 to-indigo-50/50 p-4">
									<p className="mb-1 text-sm text-gray-500">Motif principal</p>
									<p className="font-medium leading-snug text-gray-900">{rdv.motif}</p>
								</div>
								<div>
									<p className="mb-2 text-sm text-gray-500">Niveau de priorité</p>
									<span
										className={cn(
											'inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium',
											priorite.pill,
										)}
									>
										<span className={cn('h-2 w-2 rounded-full', priorite.dot)} />
										{priorite.label}
									</span>
								</div>
							</div>

							<div className="rounded-2xl border border-gray-100/80 bg-white p-6 shadow-sm shadow-gray-200/40 ring-1 ring-gray-100">
								<div className="mb-4 flex items-center gap-2">
									<Clock className="h-5 w-5 text-blue-600" />
									<h3 className="font-semibold text-gray-900">Programmation</h3>
								</div>
								<div className="space-y-4">
									<div className="flex flex-wrap items-end justify-between gap-4">
										<div>
											<p className="text-sm text-gray-500">Date</p>
											<p className="font-semibold capitalize text-gray-900">{dateCourt}</p>
										</div>
										<div>
											<p className="text-sm text-gray-500">Heure</p>
											<p className="font-semibold text-gray-900">{rdv.heure}</p>
										</div>
									</div>
									<div className="border-t border-gray-100 pt-4">
										<p className="mb-1 text-sm text-gray-500">Praticien</p>
										<p className="font-semibold text-gray-900">{rdv.medecin}</p>
										<p className="text-sm text-gray-600">{rdv.service}</p>
									</div>
								</div>
							</div>
						</div>

						{/* Parcours */}
						<div className="rounded-2xl border border-gray-100/80 bg-white p-6 shadow-sm shadow-gray-200/40 ring-1 ring-gray-100 sm:p-8">
							<h3 className="mb-6 font-semibold text-gray-900">Parcours du patient</h3>
							<div className="relative flex items-start justify-between gap-1 sm:gap-2">
								<div className="absolute left-0 right-0 top-6 z-0 h-[3px] bg-gray-200" />
								<div
									className={cn(
										'absolute left-0 top-6 z-0 h-[3px] bg-gradient-to-r from-blue-600 to-indigo-600 transition-all duration-500',
										lineWidthClass(rdv.statut),
									)}
								/>

								{STEPS.map((step, i) => {
									const allDone = rdv.statut === 'TERMINÉ';
									const done = allDone || active > i;
									const current = !allDone && active === i;
									const DisplayIcon = done ? CheckCircle2 : step.Icon;

									const circle = done
										? 'bg-blue-600 text-white shadow-md shadow-blue-200/50 ring-2 ring-white'
										: current
											? step.key === 'attente'
												? 'border-2 border-white bg-amber-100 text-amber-600 shadow-md ring-2 ring-amber-100/50'
												: 'border-2 border-white bg-blue-100 text-blue-700 shadow-md ring-2 ring-blue-100/80'
											: 'border border-gray-100 bg-gray-100 text-gray-400';

									const labelCls = done
										? 'text-gray-900'
										: current
											? step.key === 'attente'
												? 'text-amber-700'
												: 'text-blue-800'
											: 'text-gray-400';

									const sub =
										step.key === 'arrivee' && heureArrivee
											? heureArrivee
											: step.key === 'arrivee' && !heureArrivee
												? '—'
												: '';

									return (
										<div
											key={step.key}
											className="relative z-10 flex max-w-[24%] flex-1 flex-col items-center"
										>
											<div
												className={cn(
													'mb-2 flex h-11 w-11 items-center justify-center rounded-full sm:h-12 sm:w-12',
													circle,
												)}
											>
												<DisplayIcon className="h-5 w-5 sm:h-6 sm:w-6" />
											</div>
											<p
												className={cn(
													'text-center text-[10px] font-semibold leading-tight sm:text-xs',
													labelCls,
												)}
											>
												{step.label}
												{sub && (
													<>
														<br />
														<span className="font-normal text-gray-500">{sub}</span>
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

				{/* Actions */}
				<div className="mt-6 rounded-2xl border border-gray-100/80 bg-white p-6 shadow-sm shadow-gray-200/40 ring-1 ring-gray-100 sm:mt-8">
					<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
						<div>
							<h3 className="text-lg font-semibold text-gray-900">Actions de suivi rapide</h3>
							<p className="mt-1 text-sm text-gray-500">
								{
									"Gérez le dossier patient ou naviguez vers d'autres sections clés."
								}
							</p>
						</div>
						<button
							type="button"
							className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-medium text-white shadow-md shadow-blue-200/50 transition-colors hover:bg-blue-700"
						>
							Ouvrir le dossier patient
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}
