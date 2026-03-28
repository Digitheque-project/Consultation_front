export interface ApiSuccess<T> {
  data: T;
  message?: string;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface PatientSearchFilters {
  gender?: "M" | "F";
  minAge?: number;
  maxAge?: number;
  city?: string;
}

export interface LinkGlobalIdentityPayload {
  patientId: string;
  mpiId: string;
}
