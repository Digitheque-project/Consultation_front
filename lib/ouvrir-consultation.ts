import { consultationApi } from "@/lib/api/consultation";

export type OuvertureResultat =
  | { ok: true }
  | { ok: false; message: string; consultationEnCoursId?: number };

/**
 * Passe une consultation "en cours". Refusé (409) si le médecin en a déjà une
 * autre en cours : l'appelant ne doit alors pas naviguer vers la nouvelle.
 * Toute autre erreur reste non bloquante (comportement historique : la page
 * traitement se charge quand même, la consultation restant "en attente").
 */
export async function ouvrirConsultation(id: string | number): Promise<OuvertureResultat> {
  try {
    await consultationApi.traiterConsultation(id, "ouvrir");
    return { ok: true };
  } catch (error) {
    const e = error as Error & { status?: number; data?: { consultationEnCoursId?: number } };
    if (e.status === 409) {
      return { ok: false, message: e.message, consultationEnCoursId: e.data?.consultationEnCoursId };
    }
    console.error("Impossible de marquer la consultation comme en cours:", error);
    return { ok: true };
  }
}

/**
 * Message affiché quand une autre consultation est déjà en cours ; renvoie
 * l'adresse de celle-ci si le médecin choisit de la reprendre.
 */
export function proposerReprise(resultat: Extract<OuvertureResultat, { ok: false }>, origin: string): string | null {
  if (!resultat.consultationEnCoursId) {
    window.alert(resultat.message);
    return null;
  }
  const reprendre = window.confirm(`${resultat.message}\n\nReprendre la consultation en cours ?`);
  return reprendre
    ? `/modules/consultation-externe/traitement?id=${resultat.consultationEnCoursId}&origin=${origin}`
    : null;
}
