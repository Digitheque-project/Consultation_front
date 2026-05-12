'use client';

import { useState } from 'react';
import {
	Bell,
	Heart,
	Activity,
	Brain,
	FlaskConical,
	CheckCircle2,
	XCircle,
	Clock,
	ChevronDown,
	Filter,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type Status = 'REFUSÉ' | 'CONFIRMÉ';
type Category = 'Tous' | 'Hospitalisation' | 'Paraclinique';
type FluxType = "Demande d'hospitalisation" | 'Examen & détails';

interface Notification {
	id: string;
	patient: string;
	patientId: string;
	service: string;
	flux: FluxType;
	fluxDetail?: string;
	status: Status;
	timeLabel: string;
	timeAgo: string;
	category: 'Hospitalisation' | 'Paraclinique';
	icon: 'cardio' | 'neuro' | 'brain' | 'flask';
	read: boolean;
}

const notificationsSeed: Notification[] = [
	{
		id: '1',
		patient: 'Jean-Pierre MARCEL',
		patientId: 'ID: #CHUA-0641',
		service: 'Cardiologie',
		flux: "Demande d'hospitalisation",
		status: 'REFUSÉ',
		timeLabel: 'Il y a 12 min',
		timeAgo: 'Il y a 12 min',
		category: 'Hospitalisation',
		icon: 'cardio',
		read: false,
	},
	{
		id: '2',
		patient: 'Marie-Claire DUBOIS',
		patientId: 'ID: #CHUA-0641',
		service: 'IRM Cérébrale',
		flux: 'Examen & détails',
		fluxDetail: 'Prévu demain à 09:30',
		status: 'CONFIRMÉ',
		timeLabel: 'Il y a 1 heure',
		timeAgo: 'Il y a 1 heure',
		category: 'Paraclinique',
		icon: 'brain',
		read: false,
	},
	{
		id: '3',
		patient: 'Thomas LAURENT',
		patientId: 'ID: #CHUA-0641',
		service: 'Neurologie',
		flux: "Demande d'hospitalisation",
		status: 'CONFIRMÉ',
		timeLabel: 'Il y a 3 heures',
		timeAgo: 'Il y a 3 heures',
		category: 'Hospitalisation',
		icon: 'neuro',
		read: false,
	},
	{
		id: '4',
		patient: 'Sophie VASSEUR',
		patientId: 'ID: #CHUA-0641',
		service: 'Bilan Hépatique',
		flux: 'Examen & détails',
		fluxDetail: "Reçu aujourd'hui à 14:00",
		status: 'REFUSÉ',
		timeLabel: 'Il y a 4 heures',
		timeAgo: 'Il y a 4 heures',
		category: 'Paraclinique',
		icon: 'flask',
		read: false,
	},
];

function ServiceIcon({ type }: { type: Notification['icon'] }) {
	const base =
		'flex h-10 w-10 shrink-0 items-center justify-center rounded-full';
	switch (type) {
		case 'cardio':
			return (
				<div className={cn(base, 'bg-red-50')}>
					<Heart className="h-5 w-5 text-red-500" />
				</div>
			);
		case 'neuro':
			return (
				<div className={cn(base, 'bg-blue-50')}>
					<Activity className="h-5 w-5 text-blue-500" />
				</div>
			);
		case 'brain':
			return (
				<div className={cn(base, 'bg-purple-50')}>
					<Brain className="h-5 w-5 text-purple-500" />
				</div>
			);
		case 'flask':
			return (
				<div className={cn(base, 'bg-amber-50')}>
					<FlaskConical className="h-5 w-5 text-amber-500" />
				</div>
			);
	}
}

function StatusBadge({ status }: { status: Status }) {
	if (status === 'REFUSÉ') {
		return (
			<span className="inline-flex items-center gap-1 text-xs font-semibold tracking-wide text-red-500">
				<XCircle className="h-3.5 w-3.5" />
				REFUSÉ
			</span>
		);
	}
	return (
		<span className="inline-flex items-center gap-1 text-xs font-semibold tracking-wide text-emerald-500">
			<CheckCircle2 className="h-3.5 w-3.5" />
			CONFIRMÉ
		</span>
	);
}

const CATEGORIES: Category[] = ['Tous', 'Hospitalisation', 'Paraclinique'];

export default function NotificationCenterPage() {
	const [activeCategory, setActiveCategory] = useState<Category>('Tous');
	const [notifs, setNotifs] = useState<Notification[]>(notificationsSeed);

	const counts: Record<Category, number> = {
		Tous: notifs.length,
		Hospitalisation: notifs.filter(n => n.category === 'Hospitalisation').length,
		Paraclinique: notifs.filter(n => n.category === 'Paraclinique').length,
	};

	const filtered =
		activeCategory === 'Tous' ? notifs : notifs.filter(n => n.category === activeCategory);

	const markRead = (id: string) => {
		setNotifs(prev => prev.map(n => (n.id === id ? { ...n, read: true } : n)));
	};

	return (
		<div className="min-h-full bg-gradient-to-b from-slate-50 to-slate-100/80 p-4 font-sans sm:p-6 lg:p-8">
			<div className="mx-auto max-w-4xl">
				<div className="mb-6">
					<div className="mb-1 flex items-center gap-2">
						<Bell className="h-6 w-6 text-slate-800" />
						<h1 className="text-2xl font-bold text-slate-900">Centre de Notifications</h1>
					</div>
					<p className="text-sm text-slate-500">
						Gérez les flux d&apos;admission et les confirmations de soins en temps réel.
					</p>
				</div>

				<div className="mb-4 flex flex-wrap items-center justify-between gap-3">
					<div className="flex flex-wrap items-center gap-2">
						{CATEGORIES.map(cat => (
							<button
								type="button"
								key={cat}
								onClick={() => setActiveCategory(cat)}
								className={cn(
									'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-all',
									activeCategory === cat
										? 'bg-slate-900 text-white shadow-md shadow-slate-900/20'
										: 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-100',
								)}
							>
								{cat}
								<span
									className={cn(
										'rounded-full px-1.5 py-0.5 text-xs',
										activeCategory === cat
											? 'bg-white/20 text-white'
											: 'bg-slate-100 text-slate-500',
									)}
								>
									{counts[cat]}
								</span>
							</button>
						))}
					</div>

					<div className="flex flex-wrap items-center gap-2">
						<button
							type="button"
							className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-600 transition-colors hover:bg-slate-50"
						>
							<Filter className="h-3.5 w-3.5" />
							Tous les statuts
							<ChevronDown className="h-3.5 w-3.5" />
						</button>
						<button
							type="button"
							className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-600 transition-colors hover:bg-slate-50"
						>
							<Filter className="h-3.5 w-3.5" />
							Plus récents
							<ChevronDown className="h-3.5 w-3.5" />
						</button>
					</div>
				</div>

				<div className="space-y-2">
					{filtered.map(notif => (
						<div
							key={notif.id}
							className={cn(
								'rounded-xl border transition-all',
								notif.read
									? 'border-slate-100 opacity-70'
									: 'border-slate-200 bg-white shadow-sm',
							)}
						>
							<div className="flex flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:gap-4 sm:px-5">
								<ServiceIcon type={notif.icon} />

								<div className="w-full shrink-0 sm:w-44">
									<p className="mb-0.5 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
										Patient
									</p>
									<p className="text-sm font-semibold leading-tight text-slate-800">{notif.patient}</p>
									<p className="text-xs text-slate-400">{notif.patientId}</p>
								</div>

								<div className="min-w-0 flex-1">
									<p className="mb-0.5 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
										{notif.flux === "Demande d'hospitalisation"
											? 'Service & Flux'
											: 'Examen & Détails'}
									</p>
									<p className="text-sm font-semibold text-slate-800">{notif.service}</p>
									<p className="text-xs text-slate-500">{notif.fluxDetail ?? notif.flux}</p>
								</div>

								<div className="w-full shrink-0 sm:w-36">
									<p className="mb-0.5 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
										Statut & Heure
									</p>
									<StatusBadge status={notif.status} />
									<p className="mt-0.5 flex items-center gap-1 text-xs text-slate-400">
										<Clock className="h-3 w-3" />
										{notif.timeAgo}
									</p>
								</div>

								<div className="flex shrink-0 flex-wrap items-center gap-2 sm:flex-col sm:items-stretch lg:flex-row">
									<button
										type="button"
										onClick={() => markRead(notif.id)}
										className="whitespace-nowrap text-xs font-medium text-slate-500 transition-colors hover:text-slate-800"
									>
										{notif.read ? 'Lu' : 'Marquer lu'}
									</button>
									<button
										type="button"
										className="whitespace-nowrap rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-slate-700"
									>
										Détails
									</button>
								</div>
							</div>
						</div>
					))}
				</div>

				{filtered.length === 0 && (
					<div className="py-16 text-center text-slate-400">
						<Bell className="mx-auto mb-3 h-10 w-10 opacity-30" />
						<p className="text-sm">Aucune notification dans cette catégorie.</p>
					</div>
				)}
			</div>
		</div>
	);
}
