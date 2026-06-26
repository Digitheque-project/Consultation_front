const DEFAULT_CONSULTATION_EXTERNE_BASE_URL = 'http://localhost:3333';
const DEFAULT_API_PREFIX = 'consultation/api';

const getFirstDefinedEnv = (...keys: string[]) =>
  keys.map((key) => process.env[key]?.trim()).find(Boolean);

const normalizeBaseUrl = (value: string) => value.replace(/\/+$/, '');

export const getConsultationExterneBaseUrl = () => {
  const configuredUrl = getFirstDefinedEnv(
    'NEXT_PUBLIC_CONSULTATION_EXTERNE_URL',
    'NEXT_PUBLIC_BACKEND_URL',
    'NEXT_PUBLIC_API_URL'
  );

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
