type PatientDetailPageProps = Readonly<{
	params: Promise<{ patientId: string }>;
}>;

export default async function PatientDetailPage({ params }: PatientDetailPageProps) {
	const { patientId } = await params;

	return (
		<main className="mx-auto w-full max-w-4xl p-6">
			<h1 className="text-2xl font-semibold tracking-tight">Fiche Patient</h1>
			<p className="mt-2 text-sm text-muted-foreground">
				Patient courant: <span className="font-medium">{patientId}</span>
			</p>
		</main>
	);
}
