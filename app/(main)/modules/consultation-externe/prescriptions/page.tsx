"use client";
import { useSearchParams, useRouter } from "next/navigation";
import { Suspense } from "react";
import { useAuth } from "@/context/AuthContext";
import PrescriptionLayout from "@/components/prescription/PrescriptionLayout";
import { checkPublicEnv } from "@/lib/env";

const CE_SERVICE_ID = checkPublicEnv('NEXT_PUBLIC_CONSULTATION_EXTERNE_SERVICE_ID', process.env.NEXT_PUBLIC_CONSULTATION_EXTERNE_SERVICE_ID);

function PrescriptionPageInner() {
  const params = useSearchParams();
  const router = useRouter();
  const { medecin } = useAuth();

  const patientId     = params.get("patientId") ?? "";
  const patientNom    = params.get("patientNom") ?? undefined;
  const patientPrenom = params.get("patientPrenom") ?? undefined;
  const patientSexe   = params.get("patientSexe") ?? undefined;
  const patientDN     = params.get("patientDateNaissance") ?? undefined;
  const patientGS     = params.get("patientGroupeSanguin") ?? undefined;
  const rawAllergies  = params.get("patientAllergies");
  const patientAllergies = rawAllergies ? rawAllergies.split(",").filter(Boolean) : undefined;
  const consultationId = params.get("consultationId") ?? null;
  const origin = params.get("origin");

  const patient = {
    id: patientId,
    nom: patientNom,
    prenom: patientPrenom,
    sexe: patientSexe,
    dateNaissance: patientDN,
    groupeSanguin: patientGS,
    allergies: patientAllergies,
  };
  const prescripteur = {
    id: medecin?.id,
    nom: medecin?.nom,
    prenom: medecin?.prenom,
    service: medecin?.specialite,
    chuId: medecin?.chuId,
    serviceId: CE_SERVICE_ID,
  };

  function handleBack() {
    if (consultationId) {
      const suffix = origin ? `&origin=${encodeURIComponent(origin)}` : '';
      router.push(`/modules/consultation-externe/traitement?id=${consultationId}${suffix}`);
    } else {
      router.push("/modules/consultation-externe");
    }
  }

  return (
    <PrescriptionLayout
      patient={patient}
      prescripteur={prescripteur}
      onBack={handleBack}
    />
  );
}

export default function PrescriptionPage() {
  return (
    <Suspense fallback={
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh", fontSize: 14, color: "#5c6575" }}>
        Chargement...
      </div>
    }>
      <PrescriptionPageInner />
    </Suspense>
  );
}
