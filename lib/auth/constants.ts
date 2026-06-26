/** Cookie + localStorage key for the mock session (swap for real auth later). */
export const MOCK_AUTH_COOKIE_NAME = "chu_mock_session";
export const AUTH_COOKIE_NAME = "chu_auth_token";

/** JSON payload version for forward-compatible parsing. */
export const MOCK_SESSION_VERSION = 1 as const;

/**
 * Identifiant du service hospitalier utilisé pour le module clinique (mock / démo).
 * Surcharge via NEXT_PUBLIC_CLINICAL_DEFAULT_SERVICE_ID (UUID attendu par l’API hospitalisation).
 */
export const DEFAULT_CLINICAL_SERVICE_ID =
  (typeof process !== "undefined" &&
    process.env.NEXT_PUBLIC_CLINICAL_DEFAULT_SERVICE_ID?.trim()) ||
  "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";
