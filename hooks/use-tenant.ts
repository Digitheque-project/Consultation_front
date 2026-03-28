"use client";

import { useMemo } from "react";
import { useSessionStore } from "@/stores/session-store";

export function useTenant() {
  const tenantId = useSessionStore((state) => state.tenantId);

  return useMemo(
    () => ({
      tenantId,
      hasTenant: Boolean(tenantId),
    }),
    [tenantId]
  );
}
