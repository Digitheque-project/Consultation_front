import axios from "axios";

function resolveDossierApiBase(): string | null {
  const fromEnv = process.env.NEXT_PUBLIC_DOSSIER_API_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  return null;
}

export function isDossierPatientApiConfigured(): boolean {
  return resolveDossierApiBase() != null;
}

/**
 * Client HTTP pour l’API « dossier patient » (Nest / dossier_back).
 * Définir `NEXT_PUBLIC_DOSSIER_API_URL` pour activer chargement / sauvegarde des observations.
 */
export const dossierPatientApi = axios.create({
  timeout: 30_000,
  headers: { "Content-Type": "application/json" },
});

dossierPatientApi.interceptors.request.use((config) => {
  const base = resolveDossierApiBase();
  if (!base) {
    return Promise.reject(
      Object.assign(new Error("NEXT_PUBLIC_DOSSIER_API_URL non défini"), {
        code: "NO_DOSSIER_API",
      }),
    );
  }
  config.baseURL = base;
  return config;
});
