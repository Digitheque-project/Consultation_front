"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/context/AuthContext";

const PROFILE_OPTIONS = [
  { value: "medecin", label: "Médecin", description: "Accès à la consultation externe" },
  { value: "admin", label: "Administrateur", description: "Gestion du planning et des créneaux" },
];

function SelectProfilePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { medecin, login, isAuthenticated } = useAuth();
  const [selectedProfile, setSelectedProfile] = useState<string>("medecin");
  const [email, setEmail] = useState(medecin?.email ?? "medecin1@chu.mg");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const from = searchParams.get("from") || "/modules/consultation-externe";

  useEffect(() => {
    if (isAuthenticated && medecin) {
      window.location.assign(from);
    }
  }, [isAuthenticated, medecin, from]);

  const canSubmit = useMemo(() => email.trim().length > 0 && password.trim().length > 0, [email, password]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!canSubmit) {
      setError("Renseignez l’email et le mot de passe.");
      return;
    }

    setIsSubmitting(true);
    try {
      await login(email.trim(), password);
      window.location.assign(from);
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "Connexion impossible");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <Card className="w-full max-w-xl border border-slate-200 shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl text-[#005b82]">Choisir votre profil</CardTitle>
          <p className="text-sm text-slate-600">
            Avant d’entrer dans l’interface, sélectionnez le profil avec lequel vous souhaitez travailler.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid gap-3 md:grid-cols-2">
              {PROFILE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setSelectedProfile(option.value)}
                  className={`rounded-2xl border p-4 text-left ${selectedProfile === option.value ? "border-[#005b82] bg-[#EAF3FA]" : "border-slate-200 bg-white"}`}
                >
                  <div className="font-semibold text-slate-900">{option.label}</div>
                  <div className="text-sm text-slate-600">{option.description}</div>
                </button>
              ))}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Email</label>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2"
                placeholder="medecin1@chu.mg"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Mot de passe</label>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2"
                placeholder="password123"
              />
            </div>

            {error ? <p className="text-sm text-red-600">{error}</p> : null}

            <Button type="submit" disabled={isSubmitting} className="w-full">
              {isSubmitting ? "Connexion..." : "Entrer dans l’interface"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}

export default function SelectProfilePage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-slate-50 p-6"><div className="h-10 w-full max-w-md animate-pulse rounded-lg bg-gray-200" /></div>}>
      <SelectProfilePageContent />
    </Suspense>
  );
}
