import type {
  DashboardStats,
  ExternalConsultation,
  HospitalizedPatient,
} from "@/types/api";

const DEFAULT_LIMIT = 6;

function resolveAuthHeader() {
  if (globalThis.window === undefined) {
    return null;
  }

  const token = globalThis.localStorage?.getItem("auth_token");
  if (!token) {
    return null;
  }

  return `Bearer ${token}`;
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const authorization = resolveAuthHeader();
  const response = await fetch("/api/dashboard/stats", {
    cache: "no-store",
    headers: authorization ? { Authorization: authorization } : undefined,
  });

  if (!response.ok) {
    throw new Error("Failed to load dashboard stats.");
  }

  return (await response.json()) as DashboardStats;
}

export async function getHospitalizedPatients(
  limit: number = DEFAULT_LIMIT
): Promise<HospitalizedPatient[]> {
  const authorization = resolveAuthHeader();
  const response = await fetch(
    `/api/dashboard/hospitalisations?limit=${encodeURIComponent(String(limit))}`,
    {
      cache: "no-store",
      headers: authorization ? { Authorization: authorization } : undefined,
    }
  );

  if (!response.ok) {
    throw new Error("Failed to load hospitalisations.");
  }

  return (await response.json()) as HospitalizedPatient[];
}

export async function getExternalConsultations(
  limit: number = DEFAULT_LIMIT
): Promise<ExternalConsultation[]> {
  const authorization = resolveAuthHeader();
  const response = await fetch(
    `/api/dashboard/external-consultations?limit=${encodeURIComponent(String(limit))}`,
    {
      cache: "no-store",
      headers: authorization ? { Authorization: authorization } : undefined,
    }
  );

  if (!response.ok) {
    throw new Error("Failed to load external consultations.");
  }

  return (await response.json()) as ExternalConsultation[];
}
