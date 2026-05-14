import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { consultationApi } from '@/lib/api/consultation';

export const consultationsKeys = {
  all: ['consultations'] as const,
  waiting: () => [...consultationsKeys.all, 'waiting'] as const,
  list: () => [...consultationsKeys.all, 'list'] as const,
  detail: (id: string | number) => [...consultationsKeys.all, 'detail', id] as const,
};

export function useWaitingConsultations() {
  return useQuery({
    queryKey: consultationsKeys.waiting(),
    queryFn: () => consultationApi.getWaitingConsultations(),
  });
}

export function useAllConsultations() {
  return useQuery({
    queryKey: consultationsKeys.list(),
    queryFn: () => consultationApi.getAllConsultations(),
  });
}

export function useConsultation(id: string | number | null) {
  return useQuery({
    queryKey: consultationsKeys.detail(id!),
    queryFn: () => consultationApi.getConsultationById(id!),
    enabled: !!id,
  });
}

export function useFinalizeConsultation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string | number; payload: any }) => 
      consultationApi.finalizeConsultation(id, payload),
    onSuccess: (_, variables) => {
      // Invalider les requêtes pour forcer un rafraîchissement des données
      queryClient.invalidateQueries({ queryKey: consultationsKeys.all });
    },
  });
}
