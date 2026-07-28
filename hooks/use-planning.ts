import { useMemo } from 'react';
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  planningApi,
  DoctorPlanning,
  PlanningServiceOption,
  ServiceDoctorOption,
  CreateRecurringPlanningPayload,
  UpdatePlanningSeriesPayload,
  CreateUnavailabilityPayload,
} from '@/lib/api/planning';

export const usePlanning = () => {
  return useQuery({
    queryKey: ['planning'],
    queryFn: planningApi.getMyPlanning,
  });
};

export const useMedecins = () => {
  return useQuery({
    queryKey: ['medecins'],
    queryFn: planningApi.getMedecins,
    staleTime: 5 * 60 * 1000,
  });
};

export const useCreatePlanning = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: Omit<DoctorPlanning, 'id' | 'medecin'>) => planningApi.createPlanning(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planning'] });
    },
  });
};

export const useUpdatePlanning = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<DoctorPlanning> }) =>
      planningApi.updatePlanning(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planning'] });
    },
  });
};

// Départements médicaux pour la Vue par service — n'interroge le backend que
// quand l'onglet est effectivement affiché (enabled), admin uniquement.
export const usePlanningServices = (enabled: boolean) => {
  return useQuery({
    queryKey: ['planning-services'],
    queryFn: planningApi.getServices,
    enabled,
    staleTime: 60_000,
  });
};

// Une requête indépendante par service (nombre variable) — useQueries est le
// seul outil adapté ici, un useQuery dans une boucle violerait les règles des hooks.
export const useServiceDoctorsMap = (services: PlanningServiceOption[], enabled: boolean) => {
  const results = useQueries({
    queries: services.map((s) => ({
      queryKey: ['planning-service-doctors', s.id],
      queryFn: () => planningApi.getServiceDoctors(s.id),
      enabled,
      staleTime: 60_000,
    })),
  });

  return useMemo(() => {
    const map: Record<string, ServiceDoctorOption[]> = {};
    services.forEach((s, i) => {
      map[s.id] = results[i]?.data ?? [];
    });
    return { map, isLoading: results.some((r) => r.isLoading) };
  }, [services, results]);
};

export const useDeletePlanning = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => planningApi.deletePlanning(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planning'] });
    },
  });
};

export const useCreateRecurringPlanning = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateRecurringPlanningPayload) => planningApi.createRecurringPlanning(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planning'] });
    },
  });
};

export const useCreateUnavailability = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateUnavailabilityPayload) => planningApi.createUnavailability(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planning'] });
    },
  });
};

export const useUpdatePlanningSeries = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ seriesId, payload }: { seriesId: string; payload: UpdatePlanningSeriesPayload }) =>
      planningApi.updatePlanningSeries(seriesId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planning'] });
    },
  });
};
