# SIH Frontend - CHU

Frontend Next.js 16 (App Router) du Systeme d'Information Hospitalier.

## Prerequis

- Node.js 20+
- npm 10+

## Installation

```bash
git clone https://github.com/Digitheque-project/Consultation_front.git
cd Consultation_front
npm install
```

Creer le fichier d'environnement local:

```bash
cp .env.example .env.local
```

Sur Windows PowerShell, si `cp` ne fonctionne pas:

```powershell
Copy-Item .env.example .env.local
```

## Variables d'environnement

Voir `.env.example` pour la liste complète (noms seulement, sans valeur — les
vraies valeurs dépendent du CHU/environnement où l'app est déployée).

**Règle : chaque variable ne contient que l'origine d'un service** (schéma +
hôte + port, ex. `http://consultation-back.local`), jamais de chemin/préfixe
comme `/consultation/api` ou `/login` — c'est le code applicatif qui connaît
et ajoute le chemin de chaque route (voir `lib/api/consultation-config.ts` et
`lib/auth/constants.ts`).

Les plus importantes:

- `NEXT_PUBLIC_CONSULTATION_EXTERNE_URL`: origine du backend consultation externe.
- `NEXT_PUBLIC_API_URL`: même origine, requise séparément par le websocket hospitalisations et plusieurs services clients.
- `NEXT_PUBLIC_BACKEND_URL` (repli, rarement nécessaire): nom alternatif lu en dernier recours si ni `NEXT_PUBLIC_CONSULTATION_EXTERNE_URL` ni `NEXT_PUBLIC_API_URL` ne sont définies.
- `SERVICE_API_TOKEN` (optionnel, **pas** `NEXT_PUBLIC_*`): token de service utilisé par les Route Handlers serveur (`app/api/...`) pour appeler le backend consultation externe en son propre nom — lu au runtime, jamais inliné dans le bundle client.

**Important**: toutes les variables `NEXT_PUBLIC_*` sont figées dans le bundle JS pendant `next build` — jamais lues au runtime. En Docker, elles doivent être fournies en `--build-arg`, pas via un fichier `.env` monté au démarrage du conteneur.

## Docker

Voir les commentaires en tête du `Dockerfile` pour la commande `docker build` complète avec tous les `--build-arg` nécessaires.

```bash
docker build --build-arg NEXT_PUBLIC_CONSULTATION_EXTERNE_URL=... [...] -t chu-front .
docker run -p 3000:3000 chu-front
```

## Scripts

```bash
npm run dev
npm run lint
npm run build
npm run start
```

## Structure du projet

```text
.
├─ .env.example
├─ .env.local
├─ AGENTS.md
├─ CLAUDE.md
├─ app/
│  ├─ (auth)/login/page.tsx
│  ├─ (main)/layout.tsx
│  ├─ (main)/globals.css
│  ├─ (main)/page.tsx
│  ├─ (main)/modules/
│  │  ├─ appointment/.gitkeep
│  │  ├─ auth/
│  │  │  ├─ page.tsx
│  │  │  ├─ roles/.gitkeep
│  │  │  └─ users/.gitkeep
│  │  ├─ billing/.gitkeep
│  │  ├─ blood-bank/.gitkeep
│  │  ├─ clinical/.gitkeep
│  │  ├─ cross-facility/.gitkeep
│  │  ├─ encounter/.gitkeep
│  │  ├─ notification/.gitkeep
│  │  ├─ paraclinical/.gitkeep
│  │  ├─ patient/
│  │  │  ├─ page.tsx
│  │  │  ├─ search/page.tsx
│  │  │  └─ [patientId]/
│  │  │     ├─ page.tsx
│  │  │     └─ appointments/page.tsx
│  │  └─ pharmacy/.gitkeep
│  ├─ api/route.ts
│  ├─ favicon.ico
│  ├─ layout.tsx
│  └─ providers.tsx
├─ components/
│  └─ ui/button.tsx
├─ components.json
├─ eslint.config.mjs
├─ hooks/
│  └─ use-tenant.ts
├─ lib/
│  ├─ utils.ts
│  └─ api/
│     ├─ index.ts
│     ├─ server.ts
│     └─ instances/patient.ts
├─ next-env.d.ts
├─ next.config.mjs
├─ package-lock.json
├─ package.json
├─ postcss.config.mjs
├─ public/
├─ stores/
│  └─ session-store.ts
├─ tailwind.config.ts
├─ tsconfig.json
├─ types/
│  └─ api.ts
└─ README.md
```

## Role des dossiers

- `app/`: routes App Router, layouts et pages.
- `app/(auth)/`: zone d'authentification.
- `app/(main)/`: shell principal de l'application.
- `app/api/`: route handlers Next.js.
- `app/(main)/modules/`: pages par domaine metier.
- `components/ui/`: composants UI reutilisables.
- `hooks/`: hooks React partages.
- `lib/`: utilitaires transverses.
- `lib/api/`: couche d'acces backend (config + instances metier).
- `stores/`: etat global client (Zustand).
- `types/`: types TypeScript partages.
- `public/`: assets statiques.

## Connexion backend (pattern recommande)

Le projet utilise une couche API centralisee:

1. `lib/api/server.ts`: creation de `serverApi` et `clientApi` avec interceptors.
2. `lib/api/instances/*.ts`: un fichier par domaine/microservice.
3. `lib/api/index.ts`: point d'export unique.

Exemple simplifie:

```ts
// lib/api/instances/patient.ts
import { clientApi, serverApi } from "@/lib/api/server";

export const patientApi = {
  getById: (id: string, tenantId: string) =>
    serverApi.get(`/patient/${id}`, {
      headers: { "X-Tenant-ID": tenantId },
    }),

  search: (query: string, filters: unknown) =>
    clientApi.post("/search/patient", { query, filters }),
};
```

## Demarrage rapide

```bash
npm run dev
```

Application disponible sur http://localhost:3000

## Verification avant livraison

```bash
npm run lint
npm run build
```

Si PowerShell bloque les scripts npm sur Windows:

```powershell
cmd /c npm run lint
cmd /c npm run build
```

