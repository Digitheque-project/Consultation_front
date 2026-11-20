'use client';

import { useEffect, useRef, useCallback } from 'react';
import { contientSaisie, enregistrerFormulaire } from '../platform/fin-consultation';

export const DRAFT_MAX_AGE_MS = 24 * 60 * 60 * 1000;

interface DraftEnvelope<T> {
  data: T;
  savedAt: number;
}

export function loadDraft<T>(key: string, maxAgeMs: number = DRAFT_MAX_AGE_MS): T | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const envelope: DraftEnvelope<T> = JSON.parse(raw);
    if (!envelope || typeof envelope.savedAt !== 'number') return null;
    if (Date.now() - envelope.savedAt > maxAgeMs) {
      localStorage.removeItem(key);
      return null;
    }
    return envelope.data;
  } catch {
    localStorage.removeItem(key);
    return null;
  }
}

export function clearDraftByKey(key: string): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(key);
}

export function clearAllDrafts(): void {
  if (typeof window === 'undefined') return;
  const keys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith('draft:')) keys.push(k);
  }
  keys.forEach(k => localStorage.removeItem(k));
}

const DEBOUNCE_MS = 500;

export function useDraftPersistence<T>(
  key: string,
  value: T,
  options?: {
    skip?: boolean;
    /**
     * Bouton « Valider » du formulaire : appelé à la fin de la consultation si
     * le formulaire contient une saisie (platform/fin-consultation.ts).
     */
    valider?: () => unknown;
    /**
     * Panneau de saisie ouvert (médicament, examen… pas encore ajouté) : le
     * formulaire compte comme incomplet, il ne peut pas être validé à la place
     * du médecin.
     */
    saisieEnCours?: boolean;
    /**
     * Condition qui rend le bouton « Valider » actif (champs obligatoires
     * remplis) : un formulaire commencé mais non valide bloque la fin de la
     * consultation, il n'est jamais validé de force.
     */
    peutValider?: boolean | (() => boolean);
    /** Ce qui compte comme saisie, quand le brouillon contient des valeurs pré-remplies. */
    contenu?: unknown;
  }
): { clearDraft: () => void } {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skip = options?.skip ?? false;

  // Toujours la dernière saisie et la dernière version de « Valider ».
  const valeurRef = useRef<unknown>(value);
  valeurRef.current = options && 'contenu' in options ? options.contenu : value;
  // Évaluée à la fin de la consultation (la condition peut être déclarée après le hook).
  const peutValiderRef = useRef<boolean | (() => boolean)>(options?.peutValider ?? true);
  peutValiderRef.current = options?.peutValider ?? true;
  const estValide = () =>
    typeof peutValiderRef.current === 'function' ? peutValiderRef.current() : peutValiderRef.current;
  const validerRef = useRef(options?.valider);
  validerRef.current = options?.valider;
  const saisieEnCoursRef = useRef(Boolean(options?.saisieEnCours));
  saisieEnCoursRef.current = Boolean(options?.saisieEnCours);
  const avecValidation = Boolean(options?.valider);
  const type = key.split(':')[1] ?? '';
  useEffect(() => {
    if (skip || !avecValidation || !type) return;
    return enregistrerFormulaire({
      type,
      aDuContenu: () => saisieEnCoursRef.current || contientSaisie(valeurRef.current),
      valider: () =>
        saisieEnCoursRef.current || !estValide() ? undefined : validerRef.current?.(),
    });
  }, [type, skip, avecValidation]);

  const clearDraft = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (typeof window !== 'undefined') {
      localStorage.removeItem(key);
    }
  }, [key]);

  useEffect(() => {
    if (skip) return;

    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(() => {
      try {
        const envelope: DraftEnvelope<T> = { data: value, savedAt: Date.now() };
        localStorage.setItem(key, JSON.stringify(envelope));
      } catch {}
    }, DEBOUNCE_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [key, value, skip]);

  return { clearDraft };
}
