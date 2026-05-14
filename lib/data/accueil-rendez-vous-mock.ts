export type RdvStatut = 'PLANIFIÉ' | 'EN COURS' | 'EN ATTENTE' | 'TERMINÉ';

export type RendezVousMock = Readonly<{
	id: string;
	prenom: string;
	nom: string;
	initials: string;
	patientId: string;
	service: string;
	medecin: string;
	date: string;
	heure: string;
	statut: RdvStatut;
	motif: string;
}>;

export const ALL_RDV: RendezVousMock[] = [
	{
		id: 'RDV-2023-001',
		prenom: 'Marc',
		nom: 'Lemoine',
		initials: 'ML',
		patientId: '#CHUA-00441',
		service: 'Cardiologie',
		medecin: 'Dr. Sarah Koulibaly',
		date: '2023-10-12',
		heure: '09:30',
		statut: 'PLANIFIÉ',
		motif: 'Bilan cardiologique de suivi',
	},
	{
		id: 'RDV-2023-004',
		prenom: 'Sophie',
		nom: 'Girard',
		initials: 'SG',
		patientId: '#CHUA-00219',
		service: 'Neurologie',
		medecin: 'Dr. Pierre Morel',
		date: '2023-10-12',
		heure: '10:15',
		statut: 'EN COURS',
		motif: 'Céphalées persistantes',
	},
	{
		id: 'RDV-2023-012',
		prenom: 'Julien',
		nom: 'Masson',
		initials: 'JM',
		patientId: '#CHUA-00874',
		service: 'Ophtalmologie',
		medecin: 'Dr. Claire Tardieu',
		date: '2023-10-12',
		heure: '11:00',
		statut: 'EN ATTENTE',
		motif: 'Contrôle tension oculaire',
	},
	{
		id: 'RDV-2022-872',
		prenom: 'Alain',
		nom: 'Bernard',
		initials: 'AB',
		patientId: '#CHUA-00331',
		service: 'Radiologie',
		medecin: 'Équipe B',
		date: '2023-10-11',
		heure: '08:00',
		statut: 'TERMINÉ',
		motif: 'IRM genou droit',
	},
	{
		id: 'RDV-2023-009',
		prenom: 'Isabelle',
		nom: 'Perez',
		initials: 'IP',
		patientId: '#CHUA-00562',
		service: 'Cardiologie',
		medecin: 'Dr. Sarah Koulibaly',
		date: '2023-10-12',
		heure: '14:30',
		statut: 'PLANIFIÉ',
		motif: 'Holter ECG',
	},
	{
		id: 'RDV-2023-017',
		prenom: 'Thomas',
		nom: 'Dupuis',
		initials: 'TD',
		patientId: '#CHUA-00712',
		service: 'Neurologie',
		medecin: 'Dr. Pierre Morel',
		date: '2023-10-13',
		heure: '09:00',
		statut: 'PLANIFIÉ',
		motif: 'Première consultation AVC léger',
	},
	{
		id: 'RDV-2023-021',
		prenom: 'Claire',
		nom: 'Martin',
		initials: 'CM',
		patientId: '#CHUA-00095',
		service: 'Pédiatrie',
		medecin: 'Dr. Lucie Rabe',
		date: '2023-10-13',
		heure: '15:00',
		statut: 'TERMINÉ',
		motif: 'Vaccination et bilan de croissance',
	},
	{
		id: 'RDV-2023-025',
		prenom: 'Jean',
		nom: 'Rakoto',
		initials: 'JR',
		patientId: '#CHUA-00788',
		service: 'Chirurgie',
		medecin: 'Dr. Michel Rabe',
		date: '2023-10-11',
		heure: '10:00',
		statut: 'EN ATTENTE',
		motif: 'Consultation pré-opératoire',
	},
	{
		id: 'RDV-2023-030',
		prenom: 'Hanta',
		nom: 'Rasoa',
		initials: 'HR',
		patientId: '#CHUA-00102',
		service: 'Pédiatrie',
		medecin: 'Dr. Lucie Rabe',
		date: '2023-10-12',
		heure: '16:00',
		statut: 'EN ATTENTE',
		motif: 'Fièvre et douleurs abdominales',
	},
];

export function rdvDisplayName(rdv: RendezVousMock): string {
	return `${rdv.prenom} ${rdv.nom}`;
}

export function getRendezVousById(id: string): RendezVousMock | undefined {
	const decoded = decodeURIComponent(id);
	return ALL_RDV.find((r) => r.id === decoded);
}

export const STATUT_CONFIG: Record<
	RdvStatut,
	{ label: string; dot: string; cls: string }
> = {
	PLANIFIÉ: {
		label: 'Planifié',
		dot: 'bg-blue-500',
		cls: 'border border-blue-200/90 bg-blue-50 text-blue-900 shadow-sm shadow-blue-100/40 ring-1 ring-blue-100/30',
	},
	'EN COURS': {
		label: 'En cours',
		dot: 'bg-orange-500',
		cls: 'border border-orange-200/90 bg-orange-50 text-orange-900 shadow-sm shadow-orange-100/40 ring-1 ring-orange-100/30',
	},
	'EN ATTENTE': {
		label: 'En attente',
		dot: 'bg-violet-500',
		cls: 'border border-violet-200/90 bg-violet-50 text-violet-900 shadow-sm shadow-violet-100/40 ring-1 ring-violet-100/30',
	},
	TERMINÉ: {
		label: 'Terminé',
		dot: 'bg-emerald-500',
		cls: 'border border-emerald-200/90 bg-emerald-50 text-emerald-900 shadow-sm shadow-emerald-100/40 ring-1 ring-emerald-100/30',
	},
};

export function patientColor(patientId: string): { bg: string; text: string } {
	const PALETTES = [
		{ bg: 'bg-blue-100', text: 'text-blue-700' },
		{ bg: 'bg-violet-100', text: 'text-violet-700' },
		{ bg: 'bg-teal-100', text: 'text-teal-700' },
		{ bg: 'bg-amber-100', text: 'text-amber-700' },
		{ bg: 'bg-pink-100', text: 'text-pink-700' },
		{ bg: 'bg-green-100', text: 'text-green-700' },
		{ bg: 'bg-sky-100', text: 'text-sky-700' },
		{ bg: 'bg-rose-100', text: 'text-rose-700' },
		{ bg: 'bg-indigo-100', text: 'text-indigo-700' },
		{ bg: 'bg-orange-100', text: 'text-orange-700' },
	];
	const num = patientId.replace(/\D/g, '');
	return PALETTES[parseInt(num || '0', 10) % PALETTES.length];
}

export function dayLabel(date: string): string {
	const TODAY = '2023-10-12';
	const YESTERDAY = '2023-10-11';
	if (date === TODAY) return "Aujourd'hui";
	if (date === YESTERDAY) return 'Hier';
	return new Date(date).toLocaleDateString('fr-FR', {
		day: '2-digit',
		month: 'short',
		year: 'numeric',
	});
}
