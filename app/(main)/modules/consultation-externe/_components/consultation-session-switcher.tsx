'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { LogOut, RefreshCw, UserRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/context/AuthContext';

type ConsultationSessionSwitcherProps = {
  className?: string;
};

export function ConsultationSessionSwitcher({ className }: ConsultationSessionSwitcherProps) {
  const router = useRouter();
  const { medecin, login, logout, isLoading } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [email, setEmail] = useState(medecin?.email ?? '');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const displayName = medecin ? `${medecin.prenom} ${medecin.nom}` : 'Aucun médecin connecté';
  const specialtyLabel = medecin?.specialite?.trim() || 'Consultation externe';

  const handleSwitchUser = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    try {
      await login(email.trim(), password);
      setPassword('');
      setIsEditing(false);
      router.refresh();
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : 'Connexion impossible');
    }
  };

  const handleLogout = () => {
    logout();
    setEmail('');
    setPassword('');
    setIsEditing(false);
    router.push('/login?from=/modules/consultation-externe');
    router.refresh();
  };

  return (
    <Card className={className}>
      <div className="rounded-[28px] border border-[#D1E5F5] bg-[#EAF3FA] p-4 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="rounded-2xl bg-white p-2.5 text-[#006A8C] shadow-sm">
            <UserRound className="h-4 w-4" strokeWidth={2.5} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#64748B]">Utilisateur connecté</p>
            <p className="mt-1 break-words text-[13px] font-extrabold text-gray-900">
              {displayName}
            </p>
            <p className="mt-1 text-[11px] font-medium text-[#006A8C]">
              {specialtyLabel}
            </p>
          </div>
        </div>

        {isEditing ? (
          <form onSubmit={handleSwitchUser} className="mt-4 space-y-3">
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#64748B]">Email du médecin</label>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="medecin@chu.mg"
                className="w-full rounded-xl border border-[#C9E2F1] bg-white px-3 py-2 text-sm outline-none focus:border-[#006A8C] focus:ring-2 focus:ring-[#006A8C]/20"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#64748B]">Mot de passe</label>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Mot de passe du médecin"
                className="w-full rounded-xl border border-[#C9E2F1] bg-white px-3 py-2 text-sm outline-none focus:border-[#006A8C] focus:ring-2 focus:ring-[#006A8C]/20"
                required
              />
            </div>
            {error ? <p className="text-sm font-medium text-red-600">{error}</p> : null}
            <div className="grid gap-2 sm:grid-cols-2">
              <Button
                type="submit"
                disabled={isLoading}
                variant="outline"
                className="h-10 rounded-xl border-[#C9E2F1] bg-white text-[#006A8C] hover:bg-[#F8FBFD] font-bold text-[12px] gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                {isLoading ? 'Connexion...' : 'Changer de médecin'}
              </Button>
              <Button
                type="button"
                onClick={() => setIsEditing(false)}
                variant="outline"
                className="h-10 rounded-xl border-gray-200 bg-white text-gray-600 hover:bg-gray-50 font-bold text-[12px]"
              >
                Annuler
              </Button>
            </div>
          </form>
        ) : (
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <Button
              type="button"
              onClick={() => {
                setEmail(medecin?.email ?? '');
                setPassword('');
                setIsEditing(true);
              }}
              variant="outline"
              className="h-10 rounded-xl border-[#C9E2F1] bg-white text-[#006A8C] hover:bg-[#F8FBFD] font-bold text-[12px] gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Changer de médecin
            </Button>
            <Button
              type="button"
              onClick={handleLogout}
              variant="outline"
              className="h-10 rounded-xl border-red-100 bg-white text-red-600 hover:bg-red-50 font-bold text-[12px] gap-2"
            >
              <LogOut className="h-4 w-4" />
              Se déconnecter
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}