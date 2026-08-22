"use client";

import { useEffect, useState } from "react";
import { getConsultationExterneServiceId } from "@/lib/api/identity";

// undefined tant que la résolution (GET /identity côté backend) n'a pas
// répondu — les appelants qui l'utilisent dans un payload envoyé plus tard
// (ex. création de prescription, sur action utilisateur) ont largement le
// temps que la valeur arrive avant la première utilisation réelle.
export function useConsultationExterneServiceId(): string | undefined {
  const [serviceId, setServiceId] = useState<string | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    getConsultationExterneServiceId().then((value) => {
      if (!cancelled) setServiceId(value);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return serviceId;
}
