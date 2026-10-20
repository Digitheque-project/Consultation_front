import { checkPublicEnv } from '@/lib/env';

const DEFAULT_API_PREFIX = 'consultation/api';

// Passerelle unique du CHU (NEXT_PUBLIC_GATEWAY_URL, origine seule) : le
// backend Consultation y est servi sous /consultation/api, comme tous les
// autres services sous leur propre préfixe. Aucune adresse de repli.
export const getConsultationExterneBaseUrl = () => {
  const gateway = checkPublicEnv('NEXT_PUBLIC_GATEWAY_URL', process.env.NEXT_PUBLIC_GATEWAY_URL).replace(/\/+$/, '');
  return `${gateway}/${DEFAULT_API_PREFIX}`;
};

export const getConsultationExterneApiUrl = (path: string) => {
  const baseUrl = getConsultationExterneBaseUrl();
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${baseUrl}${normalizedPath}`;
};

// Origine SANS le préfixe /consultation/api — nécessaire pour les connexions
// WebSocket (Socket.IO), qui ne sont jamais montées sous ce préfixe REST
// (setGlobalPrefix ne s'applique qu'aux routes HTTP côté NestJS, jamais aux
// gateways WebSocket). Utiliser getConsultationExterneApiUrl pour du REST.
export const getConsultationExterneOrigin = () =>
  getConsultationExterneBaseUrl().replace(new RegExp(`/${DEFAULT_API_PREFIX}$`), '');
