import { checkPublicEnv } from "@/lib/env";

/** Cookie + localStorage key for the mock session (swap for real auth later). */
export const MOCK_AUTH_COOKIE_NAME = "chu_mock_session";
export const AUTH_COOKIE_NAME = "chu_auth_token";

/** JSON payload version for forward-compatible parsing. */
export const MOCK_SESSION_VERSION = 1 as const;

/**
 * URL du service d'authentification SSO (page de login).
 * Pas de valeur de secours codée en dur : une URL périmée utilisée
 * silencieusement a déjà causé une perte de données ailleurs dans ce projet.
 *
 * NEXT_PUBLIC_AUTH_CLIENT_URL ne doit contenir que l'origine (ex.
 * https://auth-client.example.com, jamais .../login) — c'est ce fichier,
 * pas la variable d'environnement, qui connaît le chemin de la page de
 * connexion.
 */
const AUTH_CLIENT_BASE_URL = checkPublicEnv("NEXT_PUBLIC_AUTH_CLIENT_URL", process.env.NEXT_PUBLIC_AUTH_CLIENT_URL);

/**
 * Tolère volontairement l'ancien format ".../login" en plus de l'origine
 * seule : les déploiements existants (Render) ont encore l'ancienne valeur,
 * et concaténer aveuglément donnerait ".../login/login" — donc une page de
 * connexion introuvable pour TOUS les utilisateurs, y compris via le
 * middleware qui redirige chaque requête non authentifiée.
 */
export const AUTH_CLIENT_URL = AUTH_CLIENT_BASE_URL
  ? `${AUTH_CLIENT_BASE_URL.replace(/\/+$/, "").replace(/\/login$/i, "")}/login`
  : "";

/**
 * Identifiant du service hospitalier utilisé pour le module clinique.
 * Vient de NEXT_PUBLIC_CLINICAL_DEFAULT_SERVICE_ID (UUID attendu par l'API
 * hospitalisation) — jamais figé en dur.
 */
export const DEFAULT_CLINICAL_SERVICE_ID = checkPublicEnv("NEXT_PUBLIC_CLINICAL_DEFAULT_SERVICE_ID", process.env.NEXT_PUBLIC_CLINICAL_DEFAULT_SERVICE_ID);
