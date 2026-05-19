'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

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
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [medecin, setMedecin] = useState<Medecin | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedToken =
      localStorage.getItem('auth_token') || localStorage.getItem('access_token');
    const storedMedecin = localStorage.getItem('medecin');

    if (storedToken) {
      setToken(storedToken);
      if (storedMedecin) {
        try {
          setMedecin(JSON.parse(storedMedecin));
        } catch {
          setMedecin(null);
        }
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    const backendUrl = process.env.NEXT_PUBLIC_CONSULTATION_EXTERNE_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3333';

    const response = await fetch(`${backendUrl}/auth/login`, {
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
    if (data.medecin) {
      localStorage.setItem('medecin', JSON.stringify(data.medecin));
      setMedecin(data.medecin);
    }

    setToken(tokenValue);
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('auth_token');
    localStorage.removeItem('medecin');
    setToken(null);
    setMedecin(null);
  };

  return (
    <AuthContext.Provider
      value={{
        medecin,
        token,
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
