import type {
  DashboardStats,
  ExternalConsultation,
  HospitalizedPatient,
} from "@/types/api";

const DEFAULT_LIMIT = 6;

export async function getDashboardStats(): Promise<DashboardStats> {
  const response = await fetch("/api/dashboard/stats", { cache: "no-store" });

  if (!response.ok) {
    throw new Error("Failed to load dashboard stats.");
  }

  return (await response.json()) as DashboardStats;
}

export async function getHospitalizedPatients(
  limit: number = DEFAULT_LIMIT
): Promise<HospitalizedPatient[]> {
  const response = await fetch(
    `/api/dashboard/hospitalisations?limit=${encodeURIComponent(String(limit))}`,
    {
      cache: "no-store",
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
  const response = await fetch(
    `/api/dashboard/external-consultations?limit=${encodeURIComponent(String(limit))}`,
    {
      cache: "no-store",
    }
  );

  if (!response.ok) {
    throw new Error("Failed to load external consultations.");
  }

  return (await response.json()) as ExternalConsultation[];
}
