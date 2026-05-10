import { clientApi, serverApi } from "@/lib/api/server";
import type {
  LinkGlobalIdentityPayload,
  PaginatedResult,
  PatientSearchFilters,
} from "@/types/api";

export interface PatientSummary {
  id: string;
  firstName: string;
  lastName: string;
  birthDate?: string;
}

export const patientApi = {
  // Server side call for secure fetches.
  getById: async (id: string, tenantId: string) => {
    return serverApi.get<PatientSummary>(`/patient/${id}`, {
      headers: { "X-Tenant-ID": tenantId },
    });
  },

  // Dedicated search endpoint through search service.
  search: async (query: string, filters: PatientSearchFilters) => {
    return clientApi.post<PaginatedResult<PatientSummary>>("/search/patient", {
      query,
      filters,
    });
  },

  // Example mutation consumed by client components with TanStack Query.
  linkToGlobalIdentity: async (payload: LinkGlobalIdentityPayload) => {
    return clientApi.post("/patient/link-mpi", payload);
  },
};
