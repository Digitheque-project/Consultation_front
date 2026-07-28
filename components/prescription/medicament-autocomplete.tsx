"use client";

import { useEffect, useRef, useState } from "react";
import { fetchAllPharmacieArticles, getStockLevel, type PharmacieArticle, type StockLevel } from "@/lib/prescription-api";

type Props = {
  value: string;
  onChangeText: (text: string) => void;
  onSelectArticle: (article: PharmacieArticle) => void;
  chuId?: string;
  placeholder?: string;
  className?: string;
};

const STOCK_LEVEL_CLASS: Record<StockLevel, string> = {
  ok: 'text-gray-800',
  low: 'text-amber-600',
  critical: 'text-red-500',
  out: 'text-red-600',
};

/**
 * Champ "nom du médicament" : liste déroulante du catalogue pharmacie complet
 * (chargé une seule fois), comme un <select> — filtrable en tapant. N'affiche
 * que le nom, coloré selon l'état du stock (jamais de chiffre ni de seuil).
 */
export function MedicamentAutocomplete({ value, onChangeText, onSelectArticle, chuId, placeholder, className }: Props) {
  const [allArticles, setAllArticles] = useState<PharmacieArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchAllPharmacieArticles(chuId).then((articles) => {
      if (!cancelled) {
        setAllArticles(articles);
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [chuId]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const normalized = value.trim().toLowerCase();
  const results = normalized
    ? allArticles.filter((a) => a.dci?.toLowerCase().includes(normalized))
    : allArticles;

  return (
    <div ref={containerRef} className="relative">
      <input
        type="text"
        value={value}
        onChange={(e) => { onChangeText(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        className={className}
        placeholder={placeholder}
        autoComplete="off"
      />
      {open && (
        <div className="absolute z-20 mt-1 w-max min-w-full max-w-[26rem] max-h-64 overflow-y-auto rounded-xl border border-gray-100 bg-white shadow-lg">
          {loading ? (
            <div className="px-4 py-3 text-[12px] text-gray-400">Chargement du catalogue…</div>
          ) : results.length === 0 ? (
            <div className="px-4 py-3 text-[12px] text-gray-400">Aucun article trouvé dans la pharmacie.</div>
          ) : (
            results.map((article) => {
              const level = getStockLevel(article);
              return (
                <button
                  key={article.id}
                  type="button"
                  onClick={() => { onSelectArticle(article); setOpen(false); }}
                  className="flex w-full items-center px-4 py-2 text-left hover:bg-[#F8FAFC] transition-colors border-b border-gray-50 last:border-b-0"
                >
                  <p className={`text-[13px] font-bold whitespace-normal break-words ${STOCK_LEVEL_CLASS[level]}`}>
                    {article.dci}
                  </p>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
