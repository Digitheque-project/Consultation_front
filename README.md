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

- `NEXT_PUBLIC_CONSULTATION_EXTERNE_URL`: origine du backend consultation externe. **La seule réellement indispensable.** En local : toujours en direct (`localhost:3333`). En production cloud : via la passerelle API du CHU (voir plus bas) — sur le réseau local du CHU (déploiement Docker sur site), reste en direct vers le backend du réseau local, la passerelle cloud n'étant pas pertinente pour cette cible.
- `NEXT_PUBLIC_API_URL`: origine du backend SIH/hospitalisation (routes `/cpa`, `/vpa`, `/patients`, websocket `/hospitalisations`) — **pas** le backend consultation externe. Optionnelle pour un déploiement consultation externe seul.
- `NEXT_PUBLIC_BACKEND_URL` (repli, rarement nécessaire): nom alternatif lu en dernier recours si ni `NEXT_PUBLIC_CONSULTATION_EXTERNE_URL` ni `NEXT_PUBLIC_API_URL` ne sont définies.
- `SERVICE_API_TOKEN` (optionnel, **pas** `NEXT_PUBLIC_*`): token de service utilisé par les Route Handlers serveur (`app/api/...`) pour appeler le backend consultation externe en son propre nom — lu au runtime, jamais inliné dans le bundle client.

**Important**: toutes les variables `NEXT_PUBLIC_*` sont figées dans le bundle JS pendant `next build` — jamais lues au runtime. En Docker, elles doivent être fournies en `--build-arg`, pas via un fichier `.env` monté au démarrage du conteneur.

### Passerelle API du CHU (gateway-bwm4.onrender.com)

Le CHU dispose d'une passerelle qui expose la documentation Swagger de tous
ses services derrière une seule origine (`https://gateway-bwm4.onrender.com/<service>/api/docs`)
— pratique pour ne plus avoir à retenir l'URL Swagger de chacun des ~20
services. Elle proxy aussi les vrais appels API, **mais uniquement pour les
services dont le préfixe de route interne correspond déjà à leur segment
dans la passerelle** (elle ne réécrit pas les chemins) :

| Service | Utilisable via la passerelle ? | Vérifié |
|---|---|---|
| `consultation` (nous) | Oui | `gateway/consultation/api/health` → 200 |
| `accueil` | Oui | `gateway/accueil/patients?chuId=...` → 200 |
| `dossier-patient` | Oui — **en cours d'adoption** (`NEXT_PUBLIC_DOSSIER_PATIENT_API_URL`) | `gateway/dossier-patient/patients/{id}/historique` → 200 |
| `prescriptions` | **Non applicable** — plus de lien direct du tout | relayé par **notre propre backend** (`/consultation/api/prescription/...`, voir plus bas) |
| `pharmacie` | **Non applicable** — plus de lien direct du tout | relayé par **notre propre backend** (`/consultation/api/pharmacie/...`, voir plus bas) : contourne à la fois le bug de préfixe et l'absence de CORS côté pharmacie |
| `notification` | **Non** — même cause + c'est aussi un WebSocket, pas seulement du REST | route directe conservée (`NEXT_PUBLIC_NOTIFICATION_URL`) |

### Pharmacie et prescription : plus de `NEXT_PUBLIC_PHARMACIE_URL` ni `NEXT_PUBLIC_PRESCRIPTION_URL`

Ces deux services sont indisponibles via la passerelle (bug de préfixe
ci-dessus), et pharmacie n'a en plus aucun en-tête CORS
(`Access-Control-Allow-Origin` absent, confirmé) : tout appel direct depuis
le navigateur y est bloqué silencieusement. Les deux sont désormais
**relayés par notre propre backend** :

- Pharmacie (`src/pharmacie/` côté `backend/`, variable `PHARMACIE_URL` —
  optionnelle, dégrade en liste vide si absente) : `GET /consultation/api/pharmacie/articles/stock-sale-prices`.
- Prescription (`src/prescription/` côté `backend/`, variable
  `PRESCRIPTION_URL` — optionnelle au démarrage, mais chaque appel relayé
  échoue en 503 tant qu'elle n'est pas définie) : relais générique
  `ALL /consultation/api/prescription/*` — les 21 endpoints du service
  prescription (création par type paraclinique, ordonnance, historique...)
  passent par cette seule route, sans réplique côté backend à maintenir à
  jour.

Le navigateur n'appelle plus jamais ces deux services directement — aucun
CORS possible sur un appel serveur-à-serveur, et deux variables
`NEXT_PUBLIC_*` de moins côté frontend.

Toutes les routes derrière la passerelle exigent un JWT valide, **y compris
celles normalement publiques en direct** (ex. `/health`) — sans impact pour
nous puisque le frontend n'appelle ces services que depuis un médecin déjà
connecté. En revanche le token de service statique (`SERVICE_API_TOKEN`)
n'est pas reconnu par la passerelle : les appels serveur-à-serveur (backend
consultation-externe → autres services) restent donc en direct, jamais via
la passerelle.

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

