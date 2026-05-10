import Link from "next/link";

export default function AuthModulePage() {
	return (
		<main className="mx-auto w-full max-w-3xl p-6">
			<h1 className="text-2xl font-semibold tracking-tight">Module Auth</h1>
			<p className="mt-2 text-sm text-muted-foreground">
				Espace pour la gestion des roles et des utilisateurs.
			</p>

			<div className="mt-6">
				<Link className="text-sm underline" href="/login">
					Aller a la page de connexion
				</Link>
			</div>
		</main>
	);
}
