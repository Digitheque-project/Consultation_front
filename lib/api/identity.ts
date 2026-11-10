// Identité de ce déploiement (CONSULTATION_EXTERNE_SERVICE_ID), résolue
// dynamiquement par le backend au démarrage (voir resolve-identity.ts côté
// Consultation_back) et exposée via GET /identity — plutôt qu'une copie figée
// en NEXT_PUBLIC_CONSULTATION_EXTERNE_SERVICE_ID ici, qui dupliquerait la même
// donnée dans deux dépôts avec le même risque de désynchronisation qu'une URL
// codée en dur (cf. la migration GATEWAY_URL côté backend).
//
// Cache en mémoire (le process du navigateur, pas localStorage) : la valeur
// ne change jamais pendant la durée de vie d'un onglet — un seul fetch réseau
// suffit pour toute la session, tous les appelants partagent la même Promise.
import { getConsultationExterneApiUrl } from './consultation-config';

type Identity = { chuId?: string; consultationExterneServiceId?: string };

let cached: Promise<Identity> | null = null;

function fetchIdentity(): Promise<Identity> {
  if (!cached) {
    let token: string | null = null;
    try {
      token = localStorage.getItem('auth_token') || localStorage.getItem('access_token');
    } catch {
      /* stockage inaccessible */
    }
    cached = fetch(getConsultationExterneApiUrl('/identity'), {
      signal: AbortSignal.timeout(15000),
      // La passerelle exige le jeton, même pour cette route publique du backend.
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    })
      .then((res) => {
        if (res.ok) return res.json();
        cached = null; // un refus (ex. 401 avant connexion) ne doit pas rester en cache
        return {};
      })
      .catch((err) => {
        console.error('[identity] GET /identity a échoué :', err instanceof Error ? err.message : err);
        // Ne garde pas un échec en cache : un prochain appelant doit pouvoir réessayer
        // (ex. backend pas encore réveillé après un cold start Render).
        cached = null;
        return {};
      });
  }
  return cached;
}

export async function getConsultationExterneServiceId(): Promise<string | undefined> {
  const identity = await fetchIdentity();
  return identity.consultationExterneServiceId;
}

export async function getChuId(): Promise<string | undefined> {
  const identity = await fetchIdentity();
  return identity.chuId;
}
