"use client";

import { QueryCache, QueryClient, QueryClientProvider, MutationCache } from "@tanstack/react-query";
import { useState } from "react";
import { SocketNotificationProvider } from "@/components/socket-notification-provider";
import { PrescriptionNotificationProvider } from "@/components/prescription-notification-provider";
import { useBackendStatusStore } from "@/stores/backend-status-store";

type ProvidersProps = Readonly<{
  children: React.ReactNode;
}>;

export function Providers({ children }: ProvidersProps) {
  const [queryClient] = useState(() => {
    // Pas de ping dédié : le statut "backend prêt" se déduit des vraies requêtes
    // de l'appli (React Query), qu'elles réussissent ou échouent.
    const markReady = () => useBackendStatusStore.getState().setStatus("ready");
    const markNotReady = () => useBackendStatusStore.getState().setStatus("not-ready");

    return new QueryClient({
      queryCache: new QueryCache({ onSuccess: markReady, onError: markNotReady }),
      mutationCache: new MutationCache({ onSuccess: markReady, onError: markNotReady }),
      defaultOptions: {
        queries: {
          staleTime: 30_000,
          gcTime: 5 * 60_000,
          refetchOnWindowFocus: false,
          retry: 1,
        },
      },
    });
  });

  return (
    <QueryClientProvider client={queryClient}>
      <SocketNotificationProvider />
      <PrescriptionNotificationProvider />
      {children}
    </QueryClientProvider>
  );
}
