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
- `NEXT_PUBLIC_GATEWAY_URL`: origine de la passerelle unique du CHU, pour tout service tiers appelé directement par le frontend (aujourd'hui : dossier patient). Contrairement à `NEXT_PUBLIC_CONSULTATION_EXTERNE_URL`, toujours la même valeur en local et en production (la passerelle cloud n'est jamais "nous").
- `NEXT_PUBLIC_API_URL`: origine du backend SIH/hospitalisation (websocket `/hospitalisations`, alertes d'admission) — **pas** le backend consultation externe. Fonctionnalité héritée du monorepo SIH, toujours montée dans l'app mais dégradable : optionnelle pour un déploiement consultation externe seul.
- `NEXT_PUBLIC_BACKEND_URL` (repli, rarement nécessaire): nom alternatif lu en dernier recours si ni `NEXT_PUBLIC_CONSULTATION_EXTERNE_URL` ni `NEXT_PUBLIC_API_URL` ne sont définies.
- `SERVICE_API_TOKEN` (optionnel, **pas** `NEXT_PUBLIC_*`): token de service utilisé par les Route Handlers serveur (`app/api/...`) pour appeler le backend consultation externe en son propre nom — lu au runtime, jamais inliné dans le bundle client.

**Important**: toutes les variables `NEXT_PUBLIC_*` sont figées dans le bundle JS pendant `next build` — jamais lues au runtime. En Docker, elles doivent être fournies en `--build-arg`, pas via un fichier `.env` monté au démarrage du conteneur.

### Passerelle API du CHU (gateway-bwm4.onrender.com)

Le CHU dispose d'une passerelle qui expose la documentation Swagger de tous
ses services derrière une seule origine (`https://gateway-bwm4.onrender.com/<service>/api/docs`)
— pratique pour ne plus avoir à retenir l'URL Swagger de chacun des ~20
services. Elle proxy aussi les vrais appels API. Elle **ne réécrit pas les
chemins** : chaque service du registre de la passerelle déclare la liste de
ses préfixes de route **réels** (ex. CHU : `/chu` et `/prise-en-charge` —
ce dernier sans le préfixe `/chu`), donc le chemin à appeler via la
passerelle est toujours identique à celui qu'on appellerait en direct, tant
qu'on utilise le bon chemin du service (pas une hypothèse de préfixage
uniforme). Une passe de vérification route par route (login réel + JWT)
a confirmé que tous les services listés ci-dessous fonctionnent via la
passerelle :

| Service | Utilisable via la passerelle ? | Vérifié |
|---|---|---|
| `consultation` (nous) | Oui | `gateway/consultation/api/health` → 200 |
| `accueil`, `clinique`, `notification`, `pharmacie`, `prescriptions` | Oui — **côté backend**, fusionnées dans une seule variable `GATEWAY_URL` (voir `backend/.env.example`) | 200 sur chaque route testée avec un JWT réel |
| `dossier-patient` | Oui — **adopté côté frontend** (`NEXT_PUBLIC_GATEWAY_URL`) | `gateway/dossier-patient/patients/{id}/historique` → 200 |
| `auth`, `users`, `chu`, `services` | Oui — **côté backend**, même variable `GATEWAY_URL` | `/auth/login`, `/roles`, `/chu`, `/prise-en-charge`, `/services`, `/users/{id}` → 200 |

### Plus aucune variable NEXT_PUBLIC_* de service externe (hors passerelle)

Pharmacie n'a aucun en-tête CORS (`Access-Control-Allow-Origin` absent,
confirmé) : tout appel direct depuis le navigateur y est bloqué
silencieusement. Prescription et notification, elles, sont joignables
depuis un navigateur, mais chacune ajoutait sa propre variable
`NEXT_PUBLIC_*` de service externe — contraire à l'objectif de tout
centraliser derrière une seule passerelle. Les trois sont donc **relayées
par notre propre backend** (`src/pharmacie/`, `src/prescription/`,
`src/notification/` côté `backend/`) : le navigateur n'appelle plus que
notre API. Côté sortant, ces trois relais appellent désormais la passerelle
comme le reste (`GATEWAY_URL`), plus un service tiers en direct :

- Pharmacie : `GET /consultation/api/pharmacie/articles/stock-sale-prices`.
- Prescription : relais générique `ALL /consultation/api/prescription/*` —
  les 21 endpoints du service prescription (création par type
  paraclinique, ordonnance, historique...) passent par cette seule route,
  sans réplique côté backend à maintenir à jour.
- Notification : historique REST
  (`GET /consultation/api/notification/notifications/user/{id}`) **et**
  flux temps réel WebSocket (`ws(s)://.../notifications`, une connexion
  amont dédiée ouverte par le backend pour chaque client connecté). Le
  relais WebSocket passe aussi par la passerelle : elle proxifie désormais
  les requêtes d'upgrade HTTP en plus du REST classique (`ws: true` +
  chemin `/socket.io` ajouté à son registre — socket.io n'utilise jamais le
  nom du namespace comme chemin HTTP réel).

Le navigateur n'appelle plus jamais ces trois services directement — aucun
CORS possible sur un appel serveur-à-serveur, et trois variables
`NEXT_PUBLIC_*` de moins côté frontend. Le seul lien externe restant côté
frontend (hors `NEXT_PUBLIC_API_URL`, fonctionnalité SIH héritée, voir plus
haut) est `NEXT_PUBLIC_AUTH_CLIENT_URL` (la page de connexion SSO — un
site, pas une API du CHU, hors périmètre de la passerelle).

Seuls certains services marqués `requiresAuth` dans le registre de la
passerelle (accueil, clinique, dossier-patient, notification, pharmacie,
prescriptions, etc.) exigent un JWT **à la passerelle elle-même** — sans
impact pour nous puisque le frontend n'appelle ces services que depuis un
médecin déjà connecté. `auth`, `users`, `chu` et `services` n'ont pas cette
exigence côté passerelle : c'est le service d'origine qui gère sa propre
authentification, exactement comme en appel direct. La passerelle reconnaît
aussi le token de service statique (`SERVICE_API_TOKEN`) comme alternative à
un JWT sur les routes `requiresAuth` (utile pour les appels serveur-à-serveur
sans utilisateur connecté) — à condition que la même valeur soit configurée
côté Render pour **et** le backend **et** la passerelle.

### Identité du déploiement résolue dynamiquement, pas figée dans le bundle

`CONSULTATION_EXTERNE_SERVICE_ID` (utilisé côté frontend dans les payloads
de prescription et le handshake WebSocket de notification) n'est plus une
variable `NEXT_PUBLIC_*` figée au build. Le backend la résout lui-même au
démarrage (voir `backend/src/config/resolve-identity.ts`) et l'expose via
`GET /consultation/api/identity` (public, sans authentification) ; le
frontend la récupère au runtime via `lib/api/identity.ts` (un seul fetch,
mis en cache en mémoire pour toute la session de l'onglet) plutôt que de
dupliquer le même UUID dans deux dépôts avec le risque de désynchronisation
que ça implique — même logique que la fusion `GATEWAY_URL` côté backend.
Utiliser `getConsultationExterneServiceId()` (contexte asynchrone : effet,
gestionnaire d'événement) ou le hook `useConsultationExterneServiceId()`
(rendu synchrone d'un composant client, retourne `undefined` le temps de la
résolution).

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

