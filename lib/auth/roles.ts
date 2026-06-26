export type AppRole = 'admin' | 'medecin' | 'autre';

const normalizeRole = (role?: string | null): AppRole => {
  const normalized = role?.toUpperCase();
  if (normalized === 'ADMIN') return 'admin';
  if (normalized === 'MEDECIN') return 'medecin';
  return 'autre';
};

export type UserProfile = {
  id?: number;
  email?: string;
  nom?: string;
  prenom?: string;
  specialite?: string;
  role: AppRole;
  source: 'local-mapping' | 'backend';
};

const ROLE_RULES: Array<{ pattern: RegExp; role: AppRole }> = [
  { pattern: /admin/i, role: 'admin' },
  { pattern: /medecin/i, role: 'medecin' },
];

export const inferRoleFromEmail = (email?: string): AppRole => {
  if (!email) return 'autre';
  const match = ROLE_RULES.find((rule) => rule.pattern.test(email));
  return match?.role ?? 'autre';
};

export const buildUserProfile = (medecin: any): UserProfile => ({
  id: medecin?.id,
  email: medecin?.email,
  nom: medecin?.nom,
  prenom: medecin?.prenom,
  specialite: medecin?.specialite,
  role: normalizeRole(medecin?.role) || inferRoleFromEmail(medecin?.email),
  source: 'backend',
});
