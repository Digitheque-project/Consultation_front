'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { getConsultationExterneApiUrl } from '@/lib/api/consultation-config';
import { AppRole, buildUserProfile, UserProfile } from '@/lib/auth/roles';
import { AUTH_CLIENT_URL, AUTH_COOKIE_NAME, MOCK_AUTH_COOKIE_NAME } from '@/lib/auth/constants';

interface OtherService {
  serviceId: string;
  serviceName?: string;
  baseUrl?: string;
  roleName?: string;
}

interface Medecin {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  specialite?: string;
  chuId?: string;
  chuNom?: string;
  chuLogoUrl?: string;
  otherServices?: OtherService[];
}

interface AuthContextType {
  medecin: Medecin | null;
  token: string | null;
  userProfile: UserProfile | null;
  role: AppRole;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [medecin, setMedecin] = useState<Medecin | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedToken =
      localStorage.getItem('auth_token') ||
      localStorage.getItem('access_token') ||
      document.cookie.match(new RegExp(`(?:^|; )${AUTH_COOKIE_NAME}=([^;]*)`))?.[1];

    if (!storedToken) {
      setIsLoading(false);
      return;
    }

    // Re-set the cookie in case it expired — middleware needs it
    document.cookie = `${AUTH_COOKIE_NAME}=${storedToken}; Path=/; Max-Age=${60 * 60 * 24 * 7}; SameSite=lax`;

    const restoreFromCache = () => {
      setToken(storedToken);
      try {
        const cached = localStorage.getItem('medecin');
        if (cached) {
          const m = JSON.parse(cached);
          setMedecin(m);
          setUserProfile(buildUserProfile(m));
        }
      } catch {}
    };

    // Valide le token via notre backend et récupère le profil médecin à jour.
    // 35s comme les autres appels vers ce backend (cold start Render) — un
    // timeout trop court faisait retomber sur le cache localStorage périmé
    // (ex: ancien nom) alors que le token avait déjà la bonne valeur.
    fetch(getConsultationExterneApiUrl('/auth/profile'), {
      headers: { Authorization: `Bearer ${storedToken}` },
      signal: AbortSignal.timeout(35000),
    })
      .then((res) => {
        if (res.status === 401 || res.status === 403) {
          // Token expiré ou invalide → nettoyage complet
          localStorage.removeItem('auth_token');
          localStorage.removeItem('access_token');
          localStorage.removeItem('medecin');
          document.cookie = `${AUTH_COOKIE_NAME}=; Path=/; Max-Age=0`;
          return null;
        }
        if (!res.ok) {
          // Erreur serveur (5xx) — backend indisponible
          // On considère l'utilisateur comme authentifié avec les données en cache
          restoreFromCache();
          return null;
        }
        return res.json();
      })
      .then((profile) => {
        if (!profile) return;
        setToken(storedToken);
        const medecinData = {
          id: profile.medecinId,
          nom: profile.nom,
          prenom: profile.prenom,
          email: profile.email,
          specialite: profile.specialite,
          role: profile.role,
          chuId: profile.chuId ?? undefined,
          chuNom: profile.chuNom ?? undefined,
          chuLogoUrl: profile.chuLogoUrl ?? undefined,
          otherServices: profile.otherServices ?? [],
        };
        setMedecin(medecinData);
        setUserProfile(buildUserProfile(medecinData));
        localStorage.setItem('auth_token', storedToken);
        localStorage.setItem('medecin', JSON.stringify(medecinData));
      })
      .catch(() => {
        // Réseau indisponible → authentifié avec données en cache
        restoreFromCache();
      })
      .finally(() => setIsLoading(false));
  }, []);

  const login = async (_email: string, _password: string) => {
    // L'authentification passe désormais par le service auth externe.
    // Cette fonction redirige vers auth-client qui retournera ?accesstoken=JWT.
    window.location.href = AUTH_CLIENT_URL;
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('auth_token');
    localStorage.removeItem('medecin');
    localStorage.removeItem(MOCK_AUTH_COOKIE_NAME);
    document.cookie = `${AUTH_COOKIE_NAME}=; Path=/; Max-Age=0`;
    document.cookie = `auth_token=; Path=/; Max-Age=0`;
    document.cookie = `access_token=; Path=/; Max-Age=0`;
    document.cookie = `${MOCK_AUTH_COOKIE_NAME}=; Path=/; Max-Age=0`;
    setToken(null);
    setMedecin(null);
    setUserProfile(null);
  };

  return (
    <AuthContext.Provider
      value={{
        medecin,
        token,
        userProfile,
        role: userProfile?.role || 'autre',
        isLoading,
        login,
        logout,
        isAuthenticated: !!token,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth doit être utilisé dans un AuthProvider');
  }
  return context;
}
