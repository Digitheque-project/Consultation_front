import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { planningApi, DoctorPlanning } from '@/lib/api/planning';

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

export const useDeletePlanning = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => planningApi.deletePlanning(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planning'] });
    },
  });
};
