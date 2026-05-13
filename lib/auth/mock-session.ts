import {
  DEFAULT_CLINICAL_SERVICE_ID,
  MOCK_SESSION_VERSION,
} from "@/lib/auth/constants";

export type MockAuthModule = "accueil" | "admin" | "clinical" | "billing";

export type MockSessionPayload = {
  v: typeof MOCK_SESSION_VERSION;
  sub: string;
  module: MockAuthModule;
  iat: number;
  /** Présent lorsque l’accueil clinique est choisi à la connexion (ou déduit pour les anciennes sessions). */
  serviceId?: string;
};

const MODULE_HOME: Record<MockAuthModule, string> = {
  accueil: "/modules/accueil",
  admin: "/modules/auth",
  clinical: "/modules/clinical",
  billing: "/modules/billing",
};

const isMockAuthModule = (value: unknown): value is MockAuthModule =>
  value === "accueil" ||
  value === "admin" ||
  value === "clinical" ||
  value === "billing";

export function getModuleHomePath(module: MockAuthModule): string {
  return MODULE_HOME[module];
}

export function createMockSessionPayload(
  identifier: string,
  module: MockAuthModule
): MockSessionPayload {
  const sub = identifier.trim() || "anonymous";
  return {
    v: MOCK_SESSION_VERSION,
    sub,
    module,
    iat: Date.now(),
    ...(module === "clinical"
      ? { serviceId: DEFAULT_CLINICAL_SERVICE_ID }
      : {}),
  };
}

/** Service courant pour l’UI clinique à partir de la session mock (null si autre module). */
export function resolveClinicalServiceId(
  session: MockSessionPayload | null
): string | null {
  if (!session || session.module !== "clinical") {
    return null;
  }
  const id = session.serviceId?.trim();
  return id && id.length > 0 ? id : DEFAULT_CLINICAL_SERVICE_ID;
}

/**
 * Encodes the mock session for storage (cookie / localStorage).
 * Replace with JWT verification when integrating a real backend.
 */
export function encodeMockSession(payload: MockSessionPayload): string {
  return encodeURIComponent(JSON.stringify(payload));
}

export function decodeMockSession(
  raw: string | undefined | null
): MockSessionPayload | null {
  if (raw == null || raw === "") {
    return null;
  }

  try {
    const json = decodeURIComponent(raw);
    const data: unknown = JSON.parse(json);
    if (!data || typeof data !== "object") {
      return null;
    }
    const o = data as Record<string, unknown>;
    if (o.v !== MOCK_SESSION_VERSION) {
      return null;
    }
    if (typeof o.sub !== "string" || o.sub.length === 0) {
      return null;
    }
    if (!isMockAuthModule(o.module)) {
      return null;
    }
    if (typeof o.iat !== "number" || !Number.isFinite(o.iat)) {
      return null;
    }
    const serviceIdFromJson =
      typeof o.serviceId === "string" && o.serviceId.trim().length > 0
        ? o.serviceId.trim()
        : undefined;

    return {
      v: MOCK_SESSION_VERSION,
      sub: o.sub,
      module: o.module,
      iat: o.iat,
      serviceId:
        serviceIdFromJson ??
        (o.module === "clinical" ? DEFAULT_CLINICAL_SERVICE_ID : undefined),
    };
  } catch {
    return null;
  }
}

/** Reads module from a valid mock token (simulates JWT claims). */
export function getModuleFromMockToken(
  raw: string | undefined | null
): MockAuthModule | null {
  return decodeMockSession(raw)?.module ?? null;
}
