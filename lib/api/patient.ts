export type PatientEnrichment = {
  id?: number | string;
  firstName?: string;
  lastName?: string;
  email?: string;
  telephone?: string;
};

const fallbackPatients: Record<number, { firstName: string; lastName: string }> = {
  101: { firstName: 'Ari', lastName: 'Rakoto' },
  102: { firstName: 'Lova', lastName: 'Rabe' },
  103: { firstName: 'Miora', lastName: 'Andriamifidy' },
  104: { firstName: 'Tiana', lastName: 'Rasolonjatovo' },
  105: { firstName: 'Jean', lastName: 'Andrianarivo' },
  106: { firstName: 'Solo', lastName: 'Rajaonarison' },
  107: { firstName: 'Hanitra', lastName: 'Ramanitra' },
  108: { firstName: 'Nirina', lastName: 'Ravalitera' },
};

export function getPatientDisplayLabel(
  patient?: PatientEnrichment | null,
  patientId?: number | string,
) {
  const fallback = patientId != null ? fallbackPatients[Number(patientId)] : null;

  if (patient?.lastName) {
    const first = patient.firstName?.trim() || '';
    const last = patient.lastName.trim();
    return `${first} ${last}`.trim();
  }

  if (fallback) {
    return `${fallback.firstName} ${fallback.lastName}`;
  }

  return patientId != null ? `Patient #${patientId}` : 'Patient';
}

export function resolvePatientReference(
  patient?: PatientEnrichment | null,
  patientId?: number | string,
) {
  return {
    id: patientId ?? patient?.id ?? null,
    displayName: getPatientDisplayLabel(patient, patientId),
  };
}
