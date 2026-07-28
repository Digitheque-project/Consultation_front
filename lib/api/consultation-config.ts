// Filet de secours pour le dev local uniquement (correspond au port par défaut du
// backend, cf. BACKEND_PORT). En production, l'absence de configuration doit être
// visible immédiatement — voir l'avertissement ci-dessous — pas silencieuse.
const DEFAULT_CONSULTATION_EXTERNE_BASE_URL = 'http://localhost:3333';
const DEFAULT_API_PREFIX = 'consultation/api';

const normalizeBaseUrl = (value: string) => value.replace(/\/+$/, '');

let warnedMissingConfig = false;

export const getConsultationExterneBaseUrl = () => {
  // Accès statique littéral obligatoire : Next.js/webpack ne peut pas substituer process.env[key] dynamique
  const configuredUrl = (
    process.env.NEXT_PUBLIC_CONSULTATION_EXTERNE_URL ||
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    process.env.NEXT_PUBLIC_API_URL
  )?.trim();

  if (!configuredUrl && !warnedMissingConfig) {
    warnedMissingConfig = true;
    console.error(
      "[config] Aucune de NEXT_PUBLIC_CONSULTATION_EXTERNE_URL / NEXT_PUBLIC_BACKEND_URL / NEXT_PUBLIC_API_URL n'est définie — repli sur localhost, à corriger en production.",
    );
  }

  const baseUrl = normalizeBaseUrl(configuredUrl || DEFAULT_CONSULTATION_EXTERNE_BASE_URL);

  if (baseUrl.includes(`/${DEFAULT_API_PREFIX}`)) {
    return baseUrl;
  }

  return `${baseUrl}/${DEFAULT_API_PREFIX}`;
};

export const getConsultationExterneApiUrl = (path: string) => {
  const baseUrl = getConsultationExterneBaseUrl();
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${baseUrl}${normalizedPath}`;
};
