"use client";

export type DonutSegment = {
  label: string;
  value: number;
  // Les deux classes doivent être des littéraux Tailwind complets (pas de
  // template/replace au runtime) : le scanner JIT de Tailwind ne génère le CSS
  // que pour les noms de classe qu'il trouve tels quels dans le code source.
  strokeClass: string; // ex. "stroke-emerald-500"
  dotClass: string; // ex. "bg-emerald-500"
};

/**
 * Donut chart en SVG pur (pas de librairie externe) : un cercle par segment,
 * découpé via stroke-dasharray/offset. Choisi plutôt qu'une lib de charts pour
 * rester dans le bundle "standalone" léger du frontend (voir Dockerfile) sans
 * dépendance supplémentaire à maintenir pour 2 graphiques simples.
 */
export function DonutChart({
  segments,
  size = 132,
  strokeWidth = 18,
  centerLabel,
  centerValue,
}: {
  segments: DonutSegment[];
  size?: number;
  strokeWidth?: number;
  centerLabel?: string;
  centerValue?: string | number;
}) {
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  let cumulative = 0;

  return (
    <div className="flex items-center gap-5">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
          {/* Piste de fond : rend visibles les segments à 0% et les bords arrondis */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            strokeWidth={strokeWidth}
            className="stroke-slate-100"
          />
          {total > 0 &&
            segments
              .filter((s) => s.value > 0)
              .map((s) => {
                const fraction = s.value / total;
                const dash = fraction * circumference;
                const offset = -cumulative;
                cumulative += dash;
                return (
                  <circle
                    key={s.label}
                    cx={center}
                    cy={center}
                    r={radius}
                    fill="none"
                    strokeWidth={strokeWidth}
                    strokeDasharray={`${dash} ${circumference - dash}`}
                    strokeDashoffset={offset}
                    strokeLinecap={segments.filter((x) => x.value > 0).length > 1 ? "butt" : "round"}
                    className={cn2(s.strokeClass, "transition-all duration-500")}
                  />
                );
              })}
        </svg>
        {(centerLabel || centerValue !== undefined) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-xl font-black text-slate-800 leading-none">{centerValue}</span>
            {centerLabel && <span className="text-[10px] font-semibold text-slate-400 mt-0.5">{centerLabel}</span>}
          </div>
        )}
      </div>

      <div className="flex-1 space-y-2 min-w-0">
        {segments.map((s) => {
          const pct = total > 0 ? Math.round((s.value / total) * 100) : 0;
          return (
            <div key={s.label} className="flex items-center gap-2 text-[12px]">
              <span className={cn2("h-2.5 w-2.5 rounded-full shrink-0", s.dotClass)} />
              <span className="font-medium text-slate-600 truncate flex-1">{s.label}</span>
              <span className="font-bold text-slate-800 shrink-0">{s.value}</span>
              <span className="text-slate-400 w-10 text-right shrink-0">{pct}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function cn2(...classes: (string | undefined | false)[]) {
  return classes.filter(Boolean).join(" ");
}
