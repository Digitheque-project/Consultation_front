// Aucune valeur de secours codée en dur pour les URLs de services externes : une
// URL périmée utilisée silencieusement a déjà causé une perte de données côté
// backend. Ici on ne peut pas stopper le process (navigateur), donc on log une
// erreur bien visible une seule fois par variable manquante, et on laisse
// l'appelant décider s'il doit échouer immédiatement ou se dégrader (ex: []).
const warnedVars = new Set<string>();

export function checkPublicEnv(name: string, value: string | undefined): string {
  const trimmed = value?.trim();
  if (!trimmed && !warnedVars.has(name)) {
    warnedVars.add(name);
    console.error(`[config] Variable d'environnement manquante : ${name} — les fonctionnalités qui en dépendent vont échouer.`);
  }
  return trimmed ?? '';
}
