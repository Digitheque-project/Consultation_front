'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { AUTH_CLIENT_URL } from '@/lib/auth/constants';

export function useAuthGuard() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      window.location.href = AUTH_CLIENT_URL;
    }
  }, [isAuthenticated, isLoading, router]);

  return { isAuthenticated, isLoading };
}
