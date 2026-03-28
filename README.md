# SIH Frontend - CHU

Frontend Next.js 16 (App Router) du Systeme d'Information Hospitalier.

## Prerequis

- Node.js 20+
- npm 10+

## Installation

```bash
git clone https://github.com/Digitheque-project/CHU-Front.git
cd CHU-Front
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

Variables utilisees par la couche API:

- `NEXT_PUBLIC_API_URL`: URL de base du backend.
- `SERVICE_API_TOKEN` (optionnel): token service utilise cote serveur.

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
├─ app/
│  ├─ layout.tsx
│  ├─ providers.tsx
│  ├─ (auth)/login/page.tsx
│  ├─ (main)/layout.tsx
│  ├─ (main)/globals.css
│  ├─ (main)/page.tsx
│  ├─ api/route.ts
│  └─ modules/
│     ├─ auth/page.tsx
│     ├─ patient/page.tsx
│     ├─ patient/search/page.tsx
│     └─ patient/[patientId]/
│        ├─ page.tsx
│        └─ appointments/page.tsx
├─ components/
│  └─ ui/button.tsx
├─ hooks/
│  └─ use-tenant.ts
├─ lib/
│  ├─ utils.ts
│  └─ api/
│     ├─ server.ts
│     ├─ index.ts
│     └─ instances/patient.ts
├─ stores/
│  └─ session-store.ts
├─ types/
│  └─ api.ts
├─ public/
├─ components.json
└─ package.json
```

## Role des dossiers

- `app/`: routes App Router, layouts et pages.
- `app/(auth)/`: zone d'authentification.
- `app/(main)/`: shell principal de l'application.
- `app/api/`: route handlers Next.js.
- `app/modules/`: pages par domaine metier.
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

