import { ShieldCheck, ShieldOff } from 'lucide-react';
import { cn } from '@/lib/utils';

export type PriseEnChargeInfo = { companyName: string; isActive: boolean } | null | undefined;

/**
 * Affiche si un patient est pris en charge par une entreprise partenaire, et par qui.
 * A utiliser partout où un patient est affiché (fil de travail, traitement, archive...).
 */
export function PriseEnChargeBadge({ priseEnCharge, className }: { priseEnCharge: PriseEnChargeInfo; className?: string }) {
  if (!priseEnCharge) {
    return (
      <span className={cn('inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-500', className)}>
        <ShieldOff className="h-3 w-3" />
        Non pris en charge
      </span>
    );
  }

  if (!priseEnCharge.isActive) {
    return (
      <span className={cn('inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-700', className)}>
        <ShieldOff className="h-3 w-3" />
        PEC inactive — {priseEnCharge.companyName}
      </span>
    );
  }

  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-700', className)}>
      <ShieldCheck className="h-3 w-3" />
      Pris en charge — {priseEnCharge.companyName}
    </span>
  );
}
