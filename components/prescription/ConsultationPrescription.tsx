"use client";

import { useEffect, useState } from "react";
import PrescriptionModule from "@/features/prescription/PrescriptionModule";
import { setSelectedServiceId } from "@/features/prescription/platform/session-store";
import { getConsultationExterneServiceId } from "@/lib/api/identity";

/**
 * Module de prescription commun (celui du service Prescription, aussi utilisé
 * par la Clinique), en mode consultation externe. Le service actif du module
 * est aligné sur celui de la Consultation externe (résolu par le backend) :
 * un médecin qui a plusieurs services dans son jeton prescrit bien au nom de
 * la Consultation externe.
 */
export default function ConsultationPrescription({ patientId }: { patientId: string }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getConsultationExterneServiceId()
      .then((serviceId) => {
        if (serviceId) setSelectedServiceId(serviceId);
      })
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!ready || !patientId) return null;
  return <PrescriptionModule patientId={patientId} patientType="consultation_externe" />;
}
