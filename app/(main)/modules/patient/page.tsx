import Link from "next/link";

export default function PatientModulePage() {
	return (
		<main className="mx-auto w-full max-w-4xl p-6">
			<h1 className="text-2xl font-semibold tracking-tight">Module Patient</h1>
			<p className="mt-2 text-sm text-muted-foreground">
				Point d&apos;entree des parcours patient: recherche, fiche et rendez-vous.
			</p>

			<ul className="mt-6 space-y-2 text-sm">
				<li>
					<Link className="underline" href="/modules/patient/search">
						Ouvrir la recherche patient
					</Link>
				</li>
				<li>
					<Link className="underline" href="/modules/patient/sample-patient-id">
						Voir une fiche patient exemple
					</Link>
				</li>
			</ul>
		</main>
	);
}
