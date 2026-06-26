'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getConsultationExterneApiUrl } from '@/lib/api/consultation-config';
import { AppRole, buildUserProfile, UserProfile } from '@/lib/auth/roles';
import { encodeMockSession, type MockAuthModule } from '@/lib/auth/mock-session';
import { AUTH_COOKIE_NAME, MOCK_AUTH_COOKIE_NAME } from '@/lib/auth/constants';

interface Medecin {
  id: number;
  nom: string;
  prenom: string;
  email: string;
  specialite?: string;
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
  const queryClient = useQueryClient();
  const [medecin, setMedecin] = useState<Medecin | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedToken =
      localStorage.getItem('auth_token') || localStorage.getItem('access_token');
    const storedMedecin = localStorage.getItem('medecin');

    if (storedToken) {
      setToken(storedToken);
      document.cookie = `${AUTH_COOKIE_NAME}=${storedToken}; Path=/; Max-Age=${60 * 60 * 24 * 7}; SameSite=Lax`;
      document.cookie = `auth_token=${storedToken}; Path=/; Max-Age=${60 * 60 * 24 * 7}; SameSite=Lax`;
      document.cookie = `access_token=${storedToken}; Path=/; Max-Age=${60 * 60 * 24 * 7}; SameSite=Lax`;

      const storedMockSession = localStorage.getItem(MOCK_AUTH_COOKIE_NAME);
      if (storedMockSession) {
        document.cookie = `${MOCK_AUTH_COOKIE_NAME}=${storedMockSession}; Path=/; Max-Age=${60 * 60 * 24 * 7}; SameSite=Lax`;
      }

      if (storedMedecin) {
        try {
          const parsedMedecin = JSON.parse(storedMedecin);
          setMedecin(parsedMedecin);
          setUserProfile(buildUserProfile(parsedMedecin));
        } catch {
          setMedecin(null);
          setUserProfile(null);
        }
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    const response = await fetch(getConsultationExterneApiUrl('/auth/login'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      throw new Error('Email ou mot de passe incorrect');
    }

    const data = await response.json();
    const tokenValue = data.access_token ?? data.auth_token ?? data.token;

    if (!tokenValue) {
      throw new Error('Impossible de récupérer le jeton d’authentification');
    }

    localStorage.setItem('access_token', tokenValue);
    localStorage.setItem('auth_token', tokenValue);

    const authCookieValue = tokenValue;
    document.cookie = `${AUTH_COOKIE_NAME}=${authCookieValue}; Path=/; Max-Age=${60 * 60 * 24 * 7}; SameSite=Lax`;
    document.cookie = `auth_token=${authCookieValue}; Path=/; Max-Age=${60 * 60 * 24 * 7}; SameSite=Lax`;
    document.cookie = `access_token=${authCookieValue}; Path=/; Max-Age=${60 * 60 * 24 * 7}; SameSite=Lax`;

    const module: MockAuthModule = (data.role === 'ADMIN' ? 'admin' : 'clinical');
    const mockSessionPayload = {
      v: 1,
      sub: data.medecin?.email ?? email,
      module,
      iat: Date.now(),
    };
    const encodedMockSession = encodeMockSession(mockSessionPayload as any);
    document.cookie = `${MOCK_AUTH_COOKIE_NAME}=${encodedMockSession}; Path=/; Max-Age=${60 * 60 * 24 * 7}; SameSite=Lax`;
    localStorage.setItem(MOCK_AUTH_COOKIE_NAME, encodedMockSession);

    if (data.medecin) {
      const profileData = {
        ...data.medecin,
        role: data.role ?? data.medecin.role,
      };
      localStorage.setItem('medecin', JSON.stringify(profileData));
      setMedecin(profileData);
      setUserProfile(buildUserProfile(profileData));
    }

    setToken(tokenValue);
    queryClient.invalidateQueries({ queryKey: ['consultations'] });
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
