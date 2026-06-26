import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { consultationApi, type ConsultationListFilters } from '@/lib/api/consultation';
import { getConsultationExterneApiUrl } from '@/lib/api/consultation-config';

export const consultationsKeys = {
  all: ['consultations'] as const,
  waiting: () => [...consultationsKeys.all, 'waiting'] as const,
  list: () => [...consultationsKeys.all, 'list'] as const,
  controls: () => [...consultationsKeys.all, 'controls'] as const,
  detail: (id: string | number) => [...consultationsKeys.all, 'detail', id] as const,
};

export function useWaitingConsultations() {
  return useQuery({
    queryKey: consultationsKeys.waiting(),
    queryFn: () => consultationApi.getWaitingConsultations(),
  });
}

export function useAllConsultations(filters?: ConsultationListFilters) {
  return useQuery({
    queryKey: [...consultationsKeys.list(), filters?.arrived ?? 'all', filters?.date ?? 'all'],
    queryFn: () => consultationApi.getAllConsultations(filters),
    staleTime: 1000,
  });
}

/** S'abonne au flux SSE backend et invalide les listes de consultations en temps réel (sans polling). */
export function useConsultationEventsSubscription() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const source = new EventSource(getConsultationExterneApiUrl('/consultations/events'));

    const handleEvent = () => {
      queryClient.invalidateQueries({ queryKey: consultationsKeys.all });
    };

    source.addEventListener('message', handleEvent);
    source.onerror = () => {
      // EventSource se reconnecte automatiquement ; rien à faire ici.
    };

    return () => {
      source.removeEventListener('message', handleEvent);
      source.close();
    };
  }, [queryClient]);
}

export function useControlConsultations() {
  return useQuery({
    queryKey: consultationsKeys.controls(),
    queryFn: () => consultationApi.getControlConsultations(),
  });
}

export function useConsultation(id: string | number | null) {
  return useQuery({
    queryKey: consultationsKeys.detail(id!),
    queryFn: () => consultationApi.getConsultationById(id!),
    enabled: !!id,
  });
}

export function usePatientConsultationHistory(patientId: string | number | null) {
  return useQuery({
    queryKey: ['consultations', 'history', patientId],
    queryFn: () => consultationApi.getPatientConsultationHistory(patientId!),
    enabled: !!patientId,
  });
}

export function useMarkConsultationArrival() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string | number; payload: { arriveeAccueil?: boolean; arriveeAccueilAt?: string | Date | null } }) =>
      consultationApi.markConsultationArrival(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: consultationsKeys.all });
    },
  });
}

export function useFinalizeConsultation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string | number; payload: any }) =>
      consultationApi.finalizeConsultation(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: consultationsKeys.all });
    },
  });
}

export function useSaveControlNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, note }: { id: string | number; note: string }) =>
      consultationApi.saveControlNote(id, note),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: consultationsKeys.all });
    },
  });
}

export function useTraiterConsultation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, action, extra }: { id: string | number; action: 'ouvrir' | 'annuler' | 'terminer' | 'controle' | 'examen' | 'hospitalisation'; extra?: Record<string, any> }) =>
      consultationApi.traiterConsultation(id, action, extra),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: consultationsKeys.all });
    },
  });
}

export function useSaveControlPrescriptions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string | number; payload: any }) =>
      consultationApi.saveControlPrescriptions(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: consultationsKeys.all });
    },
  });
}
