"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Lock, ShieldCheck, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/context/AuthContext";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, isAuthenticated, isLoading } = useAuth();
  const [email, setEmail] = useState("admin@chu.mg");
  const [password, setPassword] = useState("password123");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const from = searchParams.get("from") || "/modules/consultation-externe";

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      window.location.assign(from);
    }
  }, [isAuthenticated, isLoading, from]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!email.trim() || !password.trim()) {
      setError("Renseignez votre email et votre mot de passe.");
      return;
    }

    setIsSubmitting(true);
    try {
      await login(email.trim(), password);
      if (typeof window !== "undefined") {
        window.location.assign(from);
      }
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "Connexion impossible");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_#f4fbff,_#eef4f8_60%,_#e8eef3)] p-4 sm:p-6">
      <Card className="w-full max-w-5xl overflow-hidden border border-slate-200 shadow-2xl">
        <div className="grid lg:grid-cols-[1.05fr_0.95fr]">
          <div className="flex flex-col justify-between bg-[#005b82] p-8 text-white sm:p-10">
            <div>
              <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-sm font-medium backdrop-blur">
                <ShieldCheck className="h-4 w-4" />
                Accès temporaire au SIH CHU
              </div>
              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                Bienvenue dans la consultation externe
              </h1>
              <p className="mt-4 max-w-lg text-sm leading-6 text-slate-100 sm:text-base">
                Connectez-vous avec un compte de démonstration pour tester le parcours complet, selon votre profil métier.
              </p>
            </div>

            <div className="mt-8 rounded-2xl border border-white/20 bg-white/10 p-5 backdrop-blur">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-200">Comptes de démonstration</p>
              <ul className="mt-3 space-y-2 text-sm text-slate-100">
                <li>• admin@chu.mg / password123</li>
                <li>• medecin1@chu.mg / password123</li>
                <li>• infirmier@chu.mg / password123</li>
                <li>• pharmacien@chu.mg / password123</li>
              </ul>
            </div>
          </div>

          <div className="bg-white p-8 sm:p-10">
            <div className="mb-6 flex items-center gap-3">
              <div className="rounded-2xl bg-[#EAF3FA] p-3 text-[#005b82]">
                <Lock className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Connexion</h2>
                <p className="text-sm text-slate-500">Accédez à votre espace métier</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium text-slate-700">Email</label>
                <div className="relative">
                  <UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="prenom.nom@chu.mg"
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm outline-none focus:border-[#005b82] focus:ring-2 focus:ring-[#005b82]/20"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium text-slate-700">Mot de passe</label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="••••••••"
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#005b82] focus:ring-2 focus:ring-[#005b82]/20"
                />
              </div>

              {error ? <p className="text-sm text-red-600">{error}</p> : null}

              <Button type="submit" disabled={isSubmitting || isLoading} className="h-11 w-full rounded-xl">
                {isSubmitting || isLoading ? "Connexion..." : "Se connecter"}
              </Button>
            </form>

            <CardDescription className="mt-6 text-center text-xs text-slate-500">
              Interface temporaire de connexion — les comptes sont gérés directement depuis la base de données.
            </CardDescription>
          </div>
        </div>
      </Card>
    </main>
  );
}
