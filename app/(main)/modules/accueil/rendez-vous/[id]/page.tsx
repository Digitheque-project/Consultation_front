import { notFound } from 'next/navigation';
import { getRendezVousById } from '@/lib/data/accueil-rendez-vous-mock';
import { RendezVousDetailView } from '../rendez-vous-detail-view';

type RendezVousDetailPageProps = Readonly<{
	params: Promise<{ id: string }>;
}>;

export default async function RendezVousDetailPage({
	params,
}: RendezVousDetailPageProps) {
	const { id } = await params;
	const rdv = getRendezVousById(id);
	if (!rdv) notFound();

	return <RendezVousDetailView rdv={rdv} />;
}
