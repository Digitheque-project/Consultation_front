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
 */
export const AUTH_CLIENT_URL = checkPublicEnv("NEXT_PUBLIC_AUTH_CLIENT_URL", process.env.NEXT_PUBLIC_AUTH_CLIENT_URL);

/**
 * Identifiant du service hospitalier utilisé pour le module clinique.
 * Vient de NEXT_PUBLIC_CLINICAL_DEFAULT_SERVICE_ID (UUID attendu par l'API
 * hospitalisation) — jamais figé en dur.
 */
export const DEFAULT_CLINICAL_SERVICE_ID = checkPublicEnv("NEXT_PUBLIC_CLINICAL_DEFAULT_SERVICE_ID", process.env.NEXT_PUBLIC_CLINICAL_DEFAULT_SERVICE_ID);
