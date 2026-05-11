"use client";

import { MOCK_AUTH_COOKIE_NAME } from "@/lib/auth/constants";
import {
  createMockSessionPayload,
  decodeMockSession,
  encodeMockSession,
  getModuleHomePath,
  type MockAuthModule,
  type MockSessionPayload,
} from "@/lib/auth/mock-session";

const MOCK_COOKIE_MAX_AGE_SEC = 60 * 60 * 24 * 7;

function persistMockSessionCookie(encoded: string) {
  document.cookie = `${MOCK_AUTH_COOKIE_NAME}=${encoded}; Path=/; Max-Age=${MOCK_COOKIE_MAX_AGE_SEC}; SameSite=Lax`;
}

function persistMockSessionStorage(encoded: string) {
  try {
    localStorage.setItem(MOCK_AUTH_COOKIE_NAME, encoded);
  } catch {
    /* ignore quota / private mode */
  }
}

/**
 * Mock login: accepts any non-empty identifier (trimmed).
 * Persists a session cookie (middleware) + localStorage mirror for client reads.
 */
export function mockLogin(identifier: string, module: MockAuthModule): void {
  const payload = createMockSessionPayload(identifier, module);
  const encoded = encodeMockSession(payload);
  persistMockSessionCookie(encoded);
  persistMockSessionStorage(encoded);
}

export function mockLogout(): void {
  document.cookie = `${MOCK_AUTH_COOKIE_NAME}=; Path=/; Max-Age=0`;
  try {
    localStorage.removeItem(MOCK_AUTH_COOKIE_NAME);
  } catch {
    /* ignore */
  }
}

export function readMockSessionFromBrowser(): MockSessionPayload | null {
  if (typeof document === "undefined") {
    return null;
  }
  const match = document.cookie.match(
    new RegExp(`(?:^|; )${MOCK_AUTH_COOKIE_NAME.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}=([^;]*)`)
  );
  const fromCookie = match?.[1] ? decodeMockSession(match[1]) : null;
  if (fromCookie) {
    return fromCookie;
  }
  try {
    const stored = localStorage.getItem(MOCK_AUTH_COOKIE_NAME);
    return decodeMockSession(stored);
  } catch {
    return null;
  }
}

export function getPostLoginRedirect(
  module: MockAuthModule,
  fromParam: string | null
): string {
  const fallback = getModuleHomePath(module);
  if (!fromParam || !fromParam.startsWith("/") || fromParam.startsWith("//")) {
    return fallback;
  }
  if (fromParam.startsWith("/login")) {
    return fallback;
  }
  return fromParam;
}
