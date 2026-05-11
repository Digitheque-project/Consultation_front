import Link from "next/link";
import {
  Archive,
  CheckSquare,
  FileText,
  Hospital,
  Search,
} from "lucide-react";

type AccueilModule = {
  title: string;
  description: string;
  href: string;
  icon: typeof Search;
};

const ACCUEIL_MODULES: AccueilModule[] = [
  {
    title: "Recherche patient",
    description: "Retrouver un dossier par identifiants ou critères de recherche.",
    href: "/modules/patient/search",
    icon: Search,
  },
  {
    title: "Patients hospitalisés",
    description: "Accès aux parcours et dossiers des patients en hospitalisation.",
    href: "/modules/patient",
    icon: Hospital,
  },
  {
    title: "Consultation externe",
    description: "Prise en charge et suivi des consultations ambulatoires.",
    href: "/consultation",
    icon: FileText,
  },
  {
    title: "Contrôle",
    description: "Vérifications et circuits de contrôle liés à l’accueil.",
    href: "/control",
    icon: CheckSquare,
  },
  {
    title: "Archives",
    description: "Consultation des dossiers et pièces archivées.",
    href: "/archive",
    icon: Archive,
  },
];

export default function AccueilModuleHomePage() {
  return (
    <main className="mx-auto w-full max-w-5xl p-6 lg:p-8">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-[#004A66]">
          Accueil — Réception
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Choisissez un module pour accéder aux écrans métier de l’interface
          d’accueil.
        </p>
      </header>

      <section aria-labelledby="accueil-modules-heading">
        <h2
          id="accueil-modules-heading"
          className="mb-4 text-xs font-extrabold uppercase tracking-[0.12em] text-[#006A8C]"
        >
          Modules
        </h2>
        <ul className="grid gap-4 sm:grid-cols-2">
          {ACCUEIL_MODULES.map(
            ({ title, description, href, icon: Icon }) => (
              <li key={href}>
                <Link
                  href={href}
                  className="group flex h-full flex-col rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-[0px_4px_16px_rgba(17,17,26,0.05)] transition-colors hover:border-[#006A8C]/30 hover:bg-[#F8FAFC]"
                >
                  <span className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[#F0F7FF] text-[#006A8C] transition-colors group-hover:bg-[#E0EFFE]">
                    <Icon className="h-5 w-5" strokeWidth={2.25} />
                  </span>
                  <span className="text-[15px] font-bold text-gray-900">
                    {title}
                  </span>
                  <span className="mt-1.5 flex-1 text-[13px] leading-snug text-muted-foreground">
                    {description}
                  </span>
                  <span className="mt-4 text-[12px] font-bold text-[#006A8C] group-hover:underline">
                    Ouvrir
                  </span>
                </Link>
              </li>
            )
          )}
        </ul>
      </section>
    </main>
  );
}
