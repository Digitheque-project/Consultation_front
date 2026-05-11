"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  getPostLoginRedirect,
  mockLogin,
  readMockSessionFromBrowser,
} from "@/lib/auth/mock-auth-browser";
import type { MockAuthModule } from "@/lib/auth/mock-session";

const MODULE_OPTIONS: { value: MockAuthModule; label: string }[] = [
  { value: "clinical", label: "Clinique" },
  { value: "admin", label: "Administration" },
  { value: "billing", label: "Facturation" },
];

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [identifier, setIdentifier] = useState("");
  const [module, setModule] = useState<MockAuthModule>("clinical");
  const [error, setError] = useState<string | null>(null);

  const redirectIfSession = useCallback(() => {
    const existing = readMockSessionFromBrowser();
    if (existing) {
      const from = searchParams.get("from");
      const target = getPostLoginRedirect(existing.module, from);
      router.replace(target);
    }
  }, [router, searchParams]);

  useEffect(() => {
    redirectIfSession();
  }, [redirectIfSession]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const trimmed = identifier.trim();
    if (!trimmed) {
      setError("Saisissez un identifiant (toute valeur acceptée en démo).");
      return;
    }
    mockLogin(trimmed, module);
    const from = searchParams.get("from");
    const target = getPostLoginRedirect(module, from);
    router.replace(target);
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F8F9FB] p-6">
      <Card className="w-full max-w-md border-[#E2E8F0] shadow-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-xl text-[#004A66]">Connexion</CardTitle>
          <CardDescription>
            Authentification simulée : tout identifiant est accepté. Choisissez un
            module pour la redirection initiale.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label
                htmlFor="identifier"
                className="text-sm font-medium text-gray-900"
              >
                Identifiant
              </label>
              <input
                id="identifier"
                name="identifier"
                autoComplete="username"
                value={identifier}
                onChange={(ev) => setIdentifier(ev.target.value)}
                placeholder="ex. dupont.marie"
                className="flex h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm outline-none ring-[#006A8C]/30 placeholder:text-gray-400 focus:border-[#006A8C] focus:ring-2"
              />
            </div>
            <div className="space-y-2">
              <label
                htmlFor="module"
                className="text-sm font-medium text-gray-900"
              >
                Module / rôle (démo)
              </label>
              <select
                id="module"
                name="module"
                value={module}
                onChange={(ev) => setModule(ev.target.value as MockAuthModule)}
                className="flex h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm outline-none focus:border-[#006A8C] focus:ring-2 focus:ring-[#006A8C]/30"
              >
                {MODULE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            {error ? (
              <p className="text-sm text-red-600" role="alert">
                {error}
              </p>
            ) : null}
          </CardContent>
          <CardFooter className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <Button type="submit" className="w-full sm:w-auto min-w-[120px]">
              Se connecter
            </Button>
          </CardFooter>
        </form>
      </Card>
    </main>
  );
}
